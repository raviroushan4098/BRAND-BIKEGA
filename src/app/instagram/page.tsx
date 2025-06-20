
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import InstagramCard from '@/components/analytics/InstagramCard';
import { mockInstagramData, type InstagramPost } from '@/lib/mockData'; // Keep mock data for now
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/lib/authService';
import { getAllUsers as apiGetAllUsers } from '@/lib/authService';
import { assignInstagramLinksToUser, getInstagramLinksForUser } from '@/lib/instagramLinkService'; // New service
import { toast } from '@/hooks/use-toast';
import {
  BarChart3, UserPlus, LinkIcon, FileText, UploadCloud, Users, DownloadCloud, Loader2, Instagram as InstagramUIIcon, Eye, Heart, MessageSquare, ListFilter,
  CalendarIcon, ArrowUpDown, XCircle, FilterX, RefreshCw
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { format, isValid as isValidDate } from 'date-fns';

interface SummaryStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  averageLikesPerPost: number;
  averageCommentsPerPost: number;
}

type SortablePostKey = 'timestamp' | 'likes' | 'comments';

export default function InstagramAnalyticsPage() {
  const { user } = useAuth();
  
  const [usersForAdminSelect, setUsersForAdminSelect] = useState<User[]>([]);
  const [selectedUserIdForAdmin, setSelectedUserIdForAdmin] = useState<string>('');
  
  const [singleLink, setSingleLink] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Using mockInstagramData as the initial source for allFetchedPosts for now
  const [allFetchedPosts, setAllFetchedPosts] = useState<InstagramPost[]>(mockInstagramData);
  const [postsToDisplay, setPostsToDisplay] = useState<InstagramPost[]>(mockInstagramData);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false); // Initially false, true when fetching
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [sortConfig, setSortConfig] = useState<{ key: SortablePostKey; order: 'asc' | 'desc' }>({ key: 'timestamp', order: 'desc' });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);

  const fetchUsersForAdmin = useCallback(async () => {
    if (user?.role === 'admin') {
      setIsLoadingUsers(true);
      try {
        const fetchedUsers = await apiGetAllUsers();
        setUsersForAdminSelect(fetchedUsers.filter(u => u.id !== user.id)); 
      } catch (error) {
        toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
      }
      setIsLoadingUsers(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchUsersForAdmin();
  }, [fetchUsersForAdmin]);

  // Placeholder for loading actual user posts - for now, uses mock or clears
  const loadInitialUserPosts = useCallback(async (userIdToFetch: string) => {
    if (!userIdToFetch) {
      // If no user is selected, display all mock data (or could be empty array)
      setAllFetchedPosts(mockInstagramData);
      setFetchError(null);
      setIsLoadingPosts(false);
      return;
    }
    setIsLoadingPosts(true);
    setFetchError(null);
    // In a real scenario, you'd fetch posts for userIdToFetch from your Firestore storage here.
    // For now, simulate no stored data for a selected user to test empty states.
    setAllFetchedPosts([]); 
    // Simulating a delay for fetching
    await new Promise(resolve => setTimeout(resolve, 500)); 
    setIsLoadingPosts(false);
    // If you had a service like `getAllInstagramPostsForUser(userIdToFetch)`:
    // try {
    //   const storedPosts = await getAllInstagramPostsForUser(userIdToFetch);
    //   setAllFetchedPosts(storedPosts);
    // } catch (error) {
    //   setFetchError("Could not load stored Instagram posts.");
    //   setAllFetchedPosts([]);
    // } finally {
    //  setIsLoadingPosts(false);
    // }
  }, []);

  useEffect(() => {
    const targetUserId = user?.role === 'admin' && selectedUserIdForAdmin ? selectedUserIdForAdmin : user?.id;
    if (targetUserId) {
      // loadInitialUserPosts(targetUserId); // Will show empty for selected users by default
      // For demo purposes, let's continue showing mock data for the current user, and empty for selected admin users
      if (user?.role === 'admin' && selectedUserIdForAdmin) {
        setAllFetchedPosts([]); // Admin viewing specific user: show empty / fetched
      } else {
        setAllFetchedPosts(mockInstagramData); // Non-admin or admin viewing own: show mock
      }
    } else {
       // No user context at all, show all mock data
      setAllFetchedPosts(mockInstagramData);
    }
    setIsLoadingPosts(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedUserIdForAdmin]);


  useEffect(() => {
    let processedPosts = [...allFetchedPosts];
    if (dateRange.from || dateRange.to) {
      processedPosts = processedPosts.filter(post => {
        const postDate = new Date(post.timestamp);
        if (dateRange.from && postDate < dateRange.from) return false;
        if (dateRange.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999); // Include the whole 'to' day
            if (postDate > toDate) return false;
        }
        return true;
      });
    }

    if (sortConfig.key) {
      processedPosts.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (sortConfig.key === 'timestamp') {
          return sortConfig.order === 'asc' ? new Date(valA).getTime() - new Date(valB).getTime() : new Date(valB).getTime() - new Date(valA).getTime();
        } else { // likes, comments
          return sortConfig.order === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        }
      });
    }
    setPostsToDisplay(processedPosts);
  }, [allFetchedPosts, dateRange, sortConfig]);

  useEffect(() => {
    if (postsToDisplay.length > 0) {
      const totalLikes = postsToDisplay.reduce((sum, post) => sum + post.likes, 0);
      const totalComments = postsToDisplay.reduce((sum, post) => sum + post.comments, 0);
      setSummaryStats({
        totalPosts: postsToDisplay.length,
        totalLikes,
        totalComments,
        averageLikesPerPost: parseFloat((totalLikes / postsToDisplay.length).toFixed(1)) || 0,
        averageCommentsPerPost: parseFloat((totalComments / postsToDisplay.length).toFixed(1)) || 0,
      });
    } else {
      setSummaryStats(null);
    }
  }, [postsToDisplay]);


  const handleRefreshFeed = async () => {
    const targetUserId = user?.role === 'admin' && selectedUserIdForAdmin ? selectedUserIdForAdmin : user?.id;
    if (!targetUserId) {
      toast({ title: "Cannot Refresh", description: "No user context.", variant: "destructive" });
      return;
    }
    setIsRefreshing(true);
    setRefreshProgress(0);
    setFetchError(null);

    try {
      const links = await getInstagramLinksForUser(targetUserId);
      if (links.length === 0) {
        setAllFetchedPosts([]); 
        toast({ title: "No Links", description: "No Instagram links assigned.", variant: "default" });
        setIsRefreshing(false);
        return;
      }
      
      // Placeholder: Simulate fetching and saving for each link
      // In a real app, you'd call your Instagram API fetching flow here for each link/profile
      // then save the results to Firestore using an instagramPostAnalyticsService.
      toast({ title: "Refresh Started (Simulated)", description: `Simulating fetch for ${links.length} Instagram link(s).` });
      for (let i = 0; i < links.length; i++) {
        // Simulate API call and save
        await new Promise(resolve => setTimeout(resolve, 300)); 
        setRefreshProgress(((i + 1) / links.length) * 100);
      }
      // After "fetching", you might update `allFetchedPosts` with new data.
      // For now, we can just reload mock data to show something.
      setAllFetchedPosts(mockInstagramData); 
      toast({ title: "Feed Refreshed (Simulated)", description: "Instagram feed has been 'updated'." });

    } catch (error: any) {
      const errorMessage = error.message || "Unknown error during refresh simulation.";
      setFetchError("Refresh failed: " + errorMessage);
      toast({ title: "Refresh Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };


  const handleDownloadCsvTemplate = () => {
    const csvContent = "link\n"; // Instagram links
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const linkEl = document.createElement("a");
    const url = URL.createObjectURL(blob);
    linkEl.setAttribute("href", url);
    linkEl.setAttribute("download", "instagram_links_template.csv");
    linkEl.style.visibility = 'hidden';
    document.body.appendChild(linkEl);
    linkEl.click();
    document.body.removeChild(linkEl);
    URL.revokeObjectURL(url);
  };

  const isValidHttpUrl = (string: string) => {
    try { new URL(string); return (string.startsWith("http:") || string.startsWith("https:")); } catch (_) { return false; }
  };

  const parseCsvFile = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) { resolve([]); return; }
        let lines = text.split(/\r\n|\n|\r/).map(line => line.trim()).filter(Boolean); 
        if (lines.length > 0 && lines[0].trim().toLowerCase() === 'link') lines = lines.slice(1);
        resolve(lines.map(line => line.split(',')[0].trim()).filter(Boolean)); // Get first column
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const handleAssignLinks = async () => {
    if (!selectedUserIdForAdmin) {
      toast({ title: "No User Selected", description: "Please select a user.", variant: "destructive" });
      return;
    }
    if (!singleLink && !csvFile) {
      toast({ title: "No Links Provided", description: "Enter a link or upload CSV.", variant: "destructive" });
      return;
    }
    setIsAssigning(true);
    let linksFromInput: string[] = [];
    if (singleLink.trim()) {
      if (isValidHttpUrl(singleLink.trim())) linksFromInput.push(singleLink.trim());
      else {
        toast({ title: "Invalid URL", description: "Single link is not a valid URL.", variant: "destructive" });
        setIsAssigning(false); return;
      }
    }
    if (csvFile) {
      try {
        const parsedLinks = await parseCsvFile(csvFile);
        const validCsvLinks = parsedLinks.filter(isValidHttpUrl);
        linksFromInput = linksFromInput.concat(validCsvLinks);
        if (parsedLinks.length !== validCsvLinks.length) {
          toast({ title: "CSV Processed", description: "Some CSV entries were not valid URLs and were excluded." });
        }
      } catch (error) {
        toast({ title: "CSV Error", description: "Could not parse CSV.", variant: "destructive" });
        setIsAssigning(false); return;
      }
    }
    
    const uniqueLinks = Array.from(new Set(linksFromInput));
    if (uniqueLinks.length === 0) {
      toast({ title: "No Valid Links", description: "No valid Instagram links found.", variant: "destructive" });
      setIsAssigning(false); return;
    }

    const result = await assignInstagramLinksToUser(selectedUserIdForAdmin, uniqueLinks);
    if (result.success) {
      const targetUser = usersForAdminSelect.find(u => u.id === selectedUserIdForAdmin);
      toast({ title: "Links Assigned", description: `Assigned ${result.actuallyAddedCount} new link(s) to ${targetUser?.name || 'user'}. Refreshing feed.` });
      setSingleLink(''); setCsvFile(null);
      const fileInput = document.getElementById('instagram-csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      // Placeholder: Trigger a simulated refresh for the selected user.
      // In a real scenario, this might set `allFetchedPosts` to empty and let `handleRefreshFeed` populate it.
      await loadInitialUserPosts(selectedUserIdForAdmin); // To clear current view for this user
      // handleRefreshFeed(); // Optionally auto-trigger refresh
    } else {
      toast({ title: "Assignment Failed", description: "Could not assign links.", variant: "destructive" });
    }
    setIsAssigning(false);
  };

  const handleSortChange = (value: string) => setSortConfig(prev => ({ ...prev, key: value as SortablePostKey }));
  const toggleSortOrder = () => setSortConfig(prev => ({ ...prev, order: prev.order === 'asc' ? 'desc' : 'asc' }));
  const handleClearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setSortConfig({ key: 'timestamp', order: 'desc' });
  };

  const StatCard: React.FC<{icon: React.ElementType, label: string, value: string | number}> = ({ icon: Icon, label, value }) => (
    <div className="flex flex-col items-center justify-center p-3 bg-card rounded-lg shadow hover:shadow-md transition-shadow">
      <Icon className="h-7 w-7 text-primary mb-1.5" />
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <InstagramUIIcon className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-bold">Instagram Analytics</CardTitle>
            </div>
            <CardDescription>
              {user?.role === 'admin' 
                ? "Assign Instagram links, view tracked posts, and manage data." 
                : "Overview of Instagram post performance. Refresh to get latest data (simulated)."
              }
            </CardDescription>
             {isRefreshing && (
              <div className="mt-4">
                <Progress value={refreshProgress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-1 text-center">Updating post data: {Math.round(refreshProgress)}%</p>
              </div>
            )}
          </CardHeader>
        </Card>

        {user?.role === 'admin' && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3"><UserPlus className="h-6 w-6 text-accent" /> <CardTitle className="text-2xl font-semibold">Assign Instagram Links</CardTitle></div>
              <CardDescription>Select a user and provide Instagram links (profiles, reels, etc.) to track.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="user-select-instagram" className="flex items-center mb-2"><Users className="mr-2 h-4 w-4" /> Select User</Label>
                <Select value={selectedUserIdForAdmin} onValueChange={setSelectedUserIdForAdmin} disabled={isLoadingUsers || isAssigning || isRefreshing}>
                  <SelectTrigger id="user-select-instagram" className="w-full md:w-1/2"><SelectValue placeholder="Select user..." /></SelectTrigger>
                  <SelectContent>{isLoadingUsers ? <SelectItem value="loading" disabled>Loading...</SelectItem> : usersForAdminSelect.length > 0 ? usersForAdminSelect.map(u => (<SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)) : <SelectItem value="no-users" disabled>No other users</SelectItem>}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="single-link-instagram" className="flex items-center mb-2"><LinkIcon className="mr-2 h-4 w-4" /> Add Single Instagram Link</Label>
                <Input id="single-link-instagram" type="url" placeholder="e.g., https://www.instagram.com/username or /reel/..." value={singleLink} onChange={(e) => setSingleLink(e.target.value)} className="w-full md:w-1/2" disabled={isAssigning || isRefreshing} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram-csv-upload" className="flex items-center"><FileText className="mr-2 h-4 w-4" /> Or Upload CSV</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Input id="instagram-csv-upload" type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)} className="w-full md:w-1/2 pt-2" disabled={isAssigning || isRefreshing} />
                  <Button variant="outline" onClick={handleDownloadCsvTemplate} disabled={isAssigning || isRefreshing} className="w-full sm:w-auto"><DownloadCloud className="mr-2 h-4 w-4" /> Template</Button>
                </div>
                <p className="text-xs text-muted-foreground">CSV: one Instagram link (profile, reel, etc.) per line, column header "link".</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAssignLinks} disabled={isAssigning || isRefreshing || !selectedUserIdForAdmin || (!singleLink && !csvFile)}>
                {isAssigning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                {isAssigning ? 'Assigning...' : 'Assign Links'}
              </Button>
            </CardFooter>
          </Card>
        )}

        <Card className="mb-6 shadow-md">
          <CardHeader><CardTitle className="text-xl font-semibold">Filter & Sort Posts</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date-from-insta">Post Date From</Label>
              <Popover>
                <PopoverTrigger asChild><Button id="date-from-insta" variant="outline" className={`w-full justify-start text-left font-normal ${!dateRange.from && "text-muted-foreground"}`} disabled={isRefreshing}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange.from ? format(dateRange.from, "PPP") : <span>Pick start</span>}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange(prev => ({ ...prev, from: d }))} disabled={(d)=>(dateRange.to?d>dateRange.to:false)||d>new Date()||isRefreshing} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to-insta">Post Date To</Label>
              <Popover>
                <PopoverTrigger asChild><Button id="date-to-insta" variant="outline" className={`w-full justify-start text-left font-normal ${!dateRange.to && "text-muted-foreground"}`} disabled={isRefreshing}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange.to ? format(dateRange.to, "PPP") : <span>Pick end</span>}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange(prev => ({ ...prev, to: d }))} disabled={(d)=>(dateRange.from?d<dateRange.from:false)||d>new Date()||isRefreshing} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort-by-insta">Sort By</Label>
              <div className="flex gap-2">
                <Select value={sortConfig.key} onValueChange={handleSortChange} disabled={isRefreshing}>
                  <SelectTrigger id="sort-by-insta" className="flex-grow"><SelectValue placeholder="Sort field" /></SelectTrigger>
                  <SelectContent><SelectItem value="timestamp">Date</SelectItem><SelectItem value="likes">Likes</SelectItem><SelectItem value="comments">Comments</SelectItem></SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={toggleSortOrder} title={`Sort ${sortConfig.order === 'asc'?'Desc':'Asc'}`} disabled={isRefreshing}><ArrowUpDown className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
          <CardFooter><Button variant="outline" onClick={handleClearFilters} disabled={isRefreshing}><FilterX className="mr-2 h-4 w-4" /> Clear</Button></CardFooter>
        </Card>

        {(isLoadingPosts && !summaryStats && !isRefreshing) && (
          <Card className="mb-6"><CardHeader><Skeleton className="h-6 w-2/5 mb-2" /><Skeleton className="h-4 w-1/3" /></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></CardContent></Card>
        )}

        {(!isLoadingPosts || isRefreshing) && summaryStats && (
          <Card className="mb-6 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">Performance Overview</CardTitle>
                  <CardDescription>Summary for {user?.role === 'admin' && selectedUserIdForAdmin ? `${usersForAdminSelect.find(u=>u.id === selectedUserIdForAdmin)?.name || 'selected user'}'s` : "your"} {summaryStats.totalPosts} post(s) {(dateRange.from||dateRange.to)?"(filtered)":""}.</CardDescription>
                </div>
                <Button onClick={handleRefreshFeed} disabled={isRefreshing || isLoadingPosts} variant="outline" size="sm">
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin':''}`} /> {isRefreshing ? 'Refreshing...':'Refresh Feed'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <StatCard icon={ListFilter} label="Total Posts" value={summaryStats.totalPosts} />
              <StatCard icon={Heart} label="Total Likes" value={summaryStats.totalLikes} />
              <StatCard icon={MessageSquare} label="Total Comments" value={summaryStats.totalComments} />
              <StatCard icon={Eye} label="Avg Likes" value={summaryStats.averageLikesPerPost} />
              <StatCard icon={Eye} label="Avg Comments" value={summaryStats.averageCommentsPerPost} />
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {user?.role === 'admin' ? (selectedUserIdForAdmin ? `${usersForAdminSelect.find(u=>u.id === selectedUserIdForAdmin)?.name || 'Selected User'}'s Posts` : 'Select User to View Posts') : "Your Instagram Posts"}
            </CardTitle>
            <CardDescription>
              {user?.role === 'admin' && !selectedUserIdForAdmin ? 'Select a user above to see their tracked Instagram posts.'
                : isLoadingPosts && !isRefreshing ? 'Loading post information...' 
                : fetchError ? `Error: ${fetchError}`
                : postsToDisplay.length > 0 ? `Displaying ${postsToDisplay.length} of ${allFetchedPosts.length} post(s). Sorted by ${sortConfig.key} (${sortConfig.order}). (Current data is mock)`
                : 'No Instagram posts to display. Assign links or try "Refresh Feed" (simulated).'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isLoadingPosts && !isRefreshing) ? (<div className="flex justify-center items-center py-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>) 
            : postsToDisplay.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">{postsToDisplay.map((post) => (<InstagramCard key={post.id} post={post} />))}</div>) 
            : (<div className="text-center py-10 text-muted-foreground"><InstagramUIIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                {fetchError && !isLoadingPosts && !isRefreshing && <p className="text-destructive mb-2">{fetchError}</p>}
                <p>No Instagram posts to display. Try assigning links (admin) or "Refresh Feed" (simulated).</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
