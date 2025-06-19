
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import YouTubeCard from '@/components/analytics/YouTubeCard';
import { type YouTubeVideo } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/lib/authService';
import { getAllUsers as apiGetAllUsers } from '@/lib/authService';
import { assignYouTubeLinksToUser, getYouTubeLinksForUser } from '@/lib/youtubeLinkService';
import { fetchYouTubeDetails } from '@/ai/flows/fetch-youtube-details-flow';
import {
  saveVideoAnalytics,
  getAllVideoAnalyticsForUser,
  type StoredYouTubeVideo,
} from '@/lib/youtubeVideoAnalyticsService';
import { toast } from '@/hooks/use-toast';
import {
  BarChart3, UserPlus, LinkIcon, FileText, UploadCloud, Users, DownloadCloud, Loader2, YoutubeIcon, Eye, ThumbsUp, MessageSquare, ListVideo,
  CalendarIcon, ArrowUpDown, XCircle, FilterX, RefreshCw
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { format, isValid as isValidDate } from 'date-fns';

interface SummaryStats {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

type SortableVideoKey = 'publishedAt' | 'views' | 'likes' | 'comments' | 'title';

export default function YouTubeManagementPage() {
  const { user } = useAuth();
  
  const [usersForAdminSelect, setUsersForAdminSelect] = useState<User[]>([]);
  const [selectedUserIdForAdmin, setSelectedUserIdForAdmin] = useState<string>('');
  
  const [singleLink, setSingleLink] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [allFetchedVideos, setAllFetchedVideos] = useState<Partial<YouTubeVideo>[]>([]);
  const [videosToDisplay, setVideosToDisplay] = useState<Partial<YouTubeVideo>[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true); // Start true for initial load
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [sortConfig, setSortConfig] = useState<{ key: SortableVideoKey; order: 'asc' | 'desc' }>({ key: 'publishedAt', order: 'desc' });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);

  const fetchUsersForAdmin = useCallback(async () => {
    if (user?.role === 'admin') {
      setIsLoadingUsers(true);
      try {
        const fetchedUsers = await apiGetAllUsers();
        setUsersForAdminSelect(fetchedUsers.filter(u => u.id !== user.id)); 
      } catch (error) {
        // Error toast handled by API service
      }
      setIsLoadingUsers(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchUsersForAdmin();
  }, [fetchUsersForAdmin]);

  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    let videoId = null;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1).split(/[?&]/)[0];
      } else if (urlObj.hostname.includes('youtube.com')) {
        if (urlObj.pathname.startsWith('/embed/')) {
          videoId = urlObj.pathname.split('/embed/')[1].split(/[?&]/)[0];
        } else if (urlObj.pathname.startsWith('/watch')) {
          videoId = urlObj.searchParams.get('v');
        } else if (urlObj.pathname.startsWith('/shorts/')) {
          videoId = urlObj.pathname.split('/shorts/')[1].split(/[?&]/)[0];
        }
      }
      if (videoId && videoId.includes('&')) videoId = videoId.split('&')[0];
      if (videoId && videoId.includes('?')) videoId = videoId.split('?')[0];
    } catch (e) { return null; }
    return videoId;
  };
  
  const loadInitialUserVideos = useCallback(async (userIdToFetch: string) => {
    if (!userIdToFetch) {
      setAllFetchedVideos([]);
      setFetchError(null);
      setIsLoadingVideos(false);
      return;
    }
    setIsLoadingVideos(true);
    setFetchError(null);
    try {
      const storedVideos = await getAllVideoAnalyticsForUser(userIdToFetch);
      if (storedVideos.length > 0) {
        setAllFetchedVideos(storedVideos);
      } else {
        setAllFetchedVideos([]);
        // Optionally, you could auto-trigger handleRefreshFeed here if no data,
        // or inform the user to click refresh.
        // For now, we'll let the user initiate the first fetch if Firestore is empty.
      }
    } catch (error: any) {
      console.error("Error loading videos from Firestore:", error);
      setFetchError("Could not load video data from storage. Please try refreshing.");
      setAllFetchedVideos([]);
      toast({ title: "Storage Error", description: "Failed to load cached video data.", variant: "destructive" });
    }
    setIsLoadingVideos(false);
  }, []);

  // Effect for initial load from Firestore
  useEffect(() => {
    const targetUserId = user?.role === 'admin' && selectedUserIdForAdmin ? selectedUserIdForAdmin : user?.id;
    if (targetUserId) {
      loadInitialUserVideos(targetUserId);
    } else {
      setAllFetchedVideos([]);
      setFetchError(null);
      setIsLoadingVideos(false); // Ensure loading stops if no target user
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedUserIdForAdmin]); // loadInitialUserVideos is stable due to useCallback

  // Effect for filtering and sorting based on allFetchedVideos
  useEffect(() => {
    let processedVideos = [...allFetchedVideos];
    if (dateRange.from || dateRange.to) {
      processedVideos = processedVideos.filter(video => {
        if (!video.publishedAt) return false;
        const publishedDate = new Date(video.publishedAt);
        if (dateRange.from && publishedDate < dateRange.from) return false;
        if (dateRange.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            if (publishedDate > toDate) return false;
        }
        return true;
      });
    }

    if (sortConfig.key) {
      processedVideos.sort((a, b) => {
        const valA = a[sortConfig.key as keyof YouTubeVideo];
        const valB = b[sortConfig.key as keyof YouTubeVideo];
        if (valA === undefined || valA === null) return sortConfig.order === 'asc' ? -1 : 1;
        if (valB === undefined || valB === null) return sortConfig.order === 'asc' ? 1 : -1;
        if (sortConfig.key === 'publishedAt') {
          const dateA = new Date(valA as string).getTime();
          const dateB = new Date(valB as string).getTime();
          return sortConfig.order === 'asc' ? dateA - dateB : dateB - dateA;
        } else if (['views', 'likes', 'comments'].includes(sortConfig.key)) {
          return sortConfig.order === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        } else if (sortConfig.key === 'title') {
           return sortConfig.order === 'asc' 
             ? (valA as string).localeCompare(valB as string) 
             : (valB as string).localeCompare(valA as string);
        }
        return 0;
      });
    }
    setVideosToDisplay(processedVideos);
  }, [allFetchedVideos, dateRange, sortConfig]);

  // Effect for summary stats
  useEffect(() => {
    if (videosToDisplay.length > 0) {
      const newSummaryStats: SummaryStats = videosToDisplay.reduce(
        (acc, video) => {
          acc.totalViews += video.views || 0;
          acc.totalLikes += video.likes || 0;
          acc.totalComments += video.comments || 0;
          return acc;
        },
        { totalVideos: videosToDisplay.length, totalViews: 0, totalLikes: 0, totalComments: 0 }
      );
      setSummaryStats(newSummaryStats);
    } else {
      setSummaryStats(null);
    }
  }, [videosToDisplay]);


  const handleRefreshFeed = async () => {
    const targetUserId = user?.role === 'admin' && selectedUserIdForAdmin ? selectedUserIdForAdmin : user?.id;
    if (!targetUserId) {
      toast({ title: "Cannot Refresh", description: "No user context to refresh videos for.", variant: "destructive" });
      return;
    }

    setIsRefreshing(true);
    setRefreshProgress(0);
    setFetchError(null);

    try {
      const links = await getYouTubeLinksForUser(targetUserId);
      if (links.length === 0) {
        setAllFetchedVideos([]); // Clear videos if no links assigned
        toast({ title: "No Links", description: "No YouTube links are assigned to this user.", variant: "default" });
        setIsRefreshing(false);
        return;
      }
      const videoIds = Array.from(new Set(links.map(extractYouTubeVideoId).filter(id => id !== null) as string[]));

      if (videoIds.length === 0) {
        setAllFetchedVideos([]);
        toast({ title: "No Valid Video IDs", description: "Could not extract valid video IDs from assigned links.", variant: "default" });
        setIsRefreshing(false);
        return;
      }

      // Step 1: Fetch all video details from YouTube API
      const apiResult = await fetchYouTubeDetails({ videoIds });
      const fetchedVideosFromAPI = apiResult.videos;

      if (!fetchedVideosFromAPI || fetchedVideosFromAPI.length === 0) {
        toast({ title: "API Fetch Failed", description: "Could not fetch video details from YouTube.", variant: "destructive" });
        setIsRefreshing(false);
        return;
      }
      
      // Step 2: Save/Update each video in Firestore sequentially and update progress
      const updatedVideosForState: Partial<YouTubeVideo>[] = [];
      for (let i = 0; i < fetchedVideosFromAPI.length; i++) {
        const videoData = fetchedVideosFromAPI[i];
        if (videoData && videoData.id) {
          await saveVideoAnalytics(targetUserId, videoData);
          updatedVideosForState.push(videoData);
        }
        setRefreshProgress(((i + 1) / fetchedVideosFromAPI.length) * 100);
      }

      setAllFetchedVideos(updatedVideosForState); // Update main video list with fresh data
      toast({ title: "Feed Refreshed", description: `Successfully updated ${updatedVideosForState.length} videos.` });

    } catch (error: any) {
      console.error("Error refreshing feed:", error);
      const errorMessage = error.message || "An unknown error occurred during refresh.";
      setFetchError(`Refresh failed: ${errorMessage}`);
      toast({ title: "Refresh Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };


  const handleDownloadCsvTemplate = () => {
    const csvContent = "link\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "youtube_links_template.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleAssignLinks = async () => {
    if (!selectedUserIdForAdmin) {
      toast({ title: "No User Selected", description: "Please select a user to assign links to.", variant: "destructive" });
      return;
    }
    if (!singleLink && !csvFile) {
      toast({ title: "No Links Provided", description: "Please enter a link or upload a CSV file.", variant: "destructive" });
      return;
    }
    setIsAssigning(true);
    let linksFromInput: string[] = [];
    if (singleLink.trim()) {
      if (isValidHttpUrl(singleLink.trim())) linksFromInput.push(singleLink.trim());
      else {
        toast({ title: "Invalid URL", description: "The single link provided is not a valid URL.", variant: "destructive" });
        setIsAssigning(false); return;
      }
    }
    if (csvFile) {
      try {
        const parsedLinksFromCsv = await parseCsvFile(csvFile);
        const validCsvLinks = parsedLinksFromCsv.filter(isValidHttpUrl);
        linksFromInput = linksFromInput.concat(validCsvLinks);
        if (parsedLinksFromCsv.length !== validCsvLinks.length) {
          toast({ title: "CSV Processed with Exclusions", description: "Some entries in the CSV were not valid URLs and were excluded." });
        }
      } catch (error) {
        toast({ title: "CSV Parsing Error", description: "Could not parse the CSV file.", variant: "destructive" });
        setIsAssigning(false); return;
      }
    }
    const uniqueLinksFromInput = Array.from(new Set(linksFromInput.map(link => link.trim()).filter(Boolean)));
    if (uniqueLinksFromInput.length === 0) {
      toast({ title: "No Valid Links", description: "No valid YouTube links were found in your input.", variant: "destructive" });
      setIsAssigning(false); return;
    }
    const result = await assignYouTubeLinksToUser(selectedUserIdForAdmin, uniqueLinksFromInput);
    if (result.success) {
      const targetUser = usersForAdminSelect.find(u => u.id === selectedUserIdForAdmin);
      toast({ title: "Links Assigned", description: `Successfully assigned ${result.actuallyAddedCount} new unique link(s) to ${targetUser?.name || 'the user'}. Triggering feed refresh.` });
      setSingleLink(''); setCsvFile(null);
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await handleRefreshFeed(); // Refresh feed for the user whose links were just updated
    } else {
      toast({ title: "Assignment Failed", description: "Could not assign links.", variant: "destructive" });
    }
    setIsAssigning(false);
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
        resolve(lines.map(line => line.split(',')[0].trim()).filter(Boolean));
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const handleSortChange = (value: string) => setSortConfig(prev => ({ ...prev, key: value as SortableVideoKey }));
  const toggleSortOrder = () => setSortConfig(prev => ({ ...prev, order: prev.order === 'asc' ? 'desc' : 'asc' }));
  const handleClearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setSortConfig({ key: 'publishedAt', order: 'desc' });
  };

  const StatCard: React.FC<{icon: React.ElementType, label: string, value: string | number}> = ({ icon: Icon, label, value }) => (
    <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg shadow hover:shadow-md transition-shadow">
      <Icon className="h-8 w-8 text-primary mb-2" />
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">YouTube Management</CardTitle>
              </div>
              <Button onClick={handleRefreshFeed} disabled={isRefreshing || isLoadingVideos} variant="outline" size="lg">
                <RefreshCw className={`mr-2 h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Feed'}
              </Button>
            </div>
            <CardDescription>
              {user?.role === 'admin' 
                ? "Assign YouTube links, view tracked videos, and manage data." 
                : "Overview of your YouTube video performance. Refresh to get latest data."
              }
            </CardDescription>
             {isRefreshing && (
              <div className="mt-4">
                <Progress value={refreshProgress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-1 text-center">Updating video data: {Math.round(refreshProgress)}%</p>
              </div>
            )}
          </CardHeader>
        </Card>

        {user?.role === 'admin' && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <UserPlus className="h-6 w-6 text-accent" />
                <CardTitle className="text-2xl font-semibold">Assign YouTube Links to User</CardTitle>
              </div>
              <CardDescription>Select a user and provide YouTube links to track for them. Data will be stored in Firestore.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="user-select" className="flex items-center mb-2">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" /> Select User
                </Label>
                <Select value={selectedUserIdForAdmin} onValueChange={setSelectedUserIdForAdmin} disabled={isLoadingUsers || isAssigning || isRefreshing}>
                  <SelectTrigger id="user-select" className="w-full md:w-1/2">
                    <SelectValue placeholder="Select a user to manage their videos..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingUsers ? ( <SelectItem value="loading" disabled>Loading users...</SelectItem> ) 
                    : usersForAdminSelect.length > 0 ? ( usersForAdminSelect.map(u => (<SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)) ) 
                    : ( <SelectItem value="no-users" disabled>No other users available</SelectItem> )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="single-link" className="flex items-center mb-2"> <LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Add Single YouTube Link </Label>
                <Input id="single-link" type="url" placeholder="https://www.youtube.com/watch?v=example" value={singleLink} onChange={(e) => setSingleLink(e.target.value)} className="w-full md:w-1/2" disabled={isAssigning || isRefreshing} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="csv-upload" className="flex items-center"> <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Or Upload CSV with Links </Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Input id="csv-upload" type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)} className="w-full md:w-1/2 pt-2" disabled={isAssigning || isRefreshing} />
                    <Button variant="outline" onClick={handleDownloadCsvTemplate} disabled={isAssigning || isRefreshing} className="w-full sm:w-auto"> <DownloadCloud className="mr-2 h-4 w-4" /> Download Template </Button>
                </div>
                <p className="text-xs text-muted-foreground">CSV should contain one YouTube URL per line, in a column with the header "link".</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAssignLinks} disabled={isAssigning || isRefreshing || !selectedUserIdForAdmin || (!singleLink && !csvFile)}>
                {isAssigning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                {isAssigning ? 'Assigning...' : 'Assign Links & Refresh'}
              </Button>
            </CardFooter>
          </Card>
        )}

        <Card className="mb-6 shadow-md">
          <CardHeader> <CardTitle className="text-xl font-semibold">Filter & Sort Videos</CardTitle> </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date-from">Published Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date-from" variant={"outline"} className={`w-full justify-start text-left font-normal ${!dateRange.from && "text-muted-foreground"}`} disabled={isRefreshing}>
                    <CalendarIcon className="mr-2 h-4 w-4" /> {dateRange.from ? format(dateRange.from, "PPP") : <span>Pick a start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))} disabled={(date) => (dateRange.to ? date > dateRange.to : false) || date > new Date() || isRefreshing} initialFocus /> </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">Published Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date-to" variant={"outline"} className={`w-full justify-start text-left font-normal ${!dateRange.to && "text-muted-foreground"}`} disabled={isRefreshing}>
                    <CalendarIcon className="mr-2 h-4 w-4" /> {dateRange.to ? format(dateRange.to, "PPP") : <span>Pick an end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={dateRange.to} onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))} disabled={(date) => (dateRange.from ? date < dateRange.from : false) || date > new Date() || isRefreshing} initialFocus /> </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort-by">Sort By</Label>
              <div className="flex gap-2">
                <Select value={sortConfig.key} onValueChange={(value) => handleSortChange(value as SortableVideoKey)} disabled={isRefreshing}>
                  <SelectTrigger id="sort-by" className="flex-grow"> <SelectValue placeholder="Select sort field" /> </SelectTrigger>
                  <SelectContent> <SelectItem value="publishedAt">Published Date</SelectItem> <SelectItem value="views">Views</SelectItem> <SelectItem value="likes">Likes</SelectItem> <SelectItem value="comments">Comments</SelectItem> <SelectItem value="title">Title</SelectItem> </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={toggleSortOrder} title={`Sort ${sortConfig.order === 'asc' ? 'Descending' : 'Ascending'}`} disabled={isRefreshing}> <ArrowUpDown className="h-4 w-4" /> </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter> <Button variant="outline" onClick={handleClearFilters} disabled={isRefreshing}> <FilterX className="mr-2 h-4 w-4" /> Clear Filters & Sort </Button> </CardFooter>
        </Card>

        {(isLoadingVideos && !summaryStats && !isRefreshing) && (
          <Card className="mb-6">
            <CardHeader> <Skeleton className="h-6 w-2/5 mb-2" /> <Skeleton className="h-4 w-1/3" /> </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4"> <Skeleton className="h-28 w-full rounded-lg" /> <Skeleton className="h-28 w-full rounded-lg" /> <Skeleton className="h-28 w-full rounded-lg" /> <Skeleton className="h-28 w-full rounded-lg" /> </CardContent>
          </Card>
        )}

        {(!isLoadingVideos || isRefreshing) && summaryStats && (
          <Card className="mb-6 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Performance Overview</CardTitle>
              <CardDescription> Summary for {user?.role === 'admin' && selectedUserIdForAdmin ? `${usersForAdminSelect.find(u=>u.id === selectedUserIdForAdmin)?.name || 'the selected user'}'s` : "your"} {summaryStats.totalVideos} video(s) { (dateRange.from || dateRange.to) ? "(filtered)" : ""}. </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={ListVideo} label="Total Videos" value={summaryStats.totalVideos} />
              <StatCard icon={Eye} label="Total Views" value={summaryStats.totalViews} />
              <StatCard icon={ThumbsUp} label="Total Likes" value={summaryStats.totalLikes} />
              <StatCard icon={MessageSquare} label="Total Comments" value={summaryStats.totalComments} />
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {user?.role === 'admin' ? (selectedUserIdForAdmin ? `${usersForAdminSelect.find(u=>u.id === selectedUserIdForAdmin)?.name || 'Selected User'}'s Videos` : 'Select a User to View Videos') : "Your YouTube Videos" }
            </CardTitle>
            <CardDescription>
              {user?.role === 'admin' && !selectedUserIdForAdmin ? 'Please select a user from the dropdown above to see their videos.'
                : isLoadingVideos && !isRefreshing ? 'Loading video information from storage...' 
                : fetchError ? `Error: ${fetchError}`
                : videosToDisplay.length > 0 ? `Displaying ${videosToDisplay.length} of ${allFetchedVideos.length} video(s). Sorted by ${sortConfig.key} (${sortConfig.order}).`
                : (user?.role !== 'admin' ? 'You have no YouTube videos stored. Try refreshing the feed.' : 'This user has no YouTube videos stored, or links provided are invalid, or they are filtered out. Try refreshing the feed.')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isLoadingVideos && !isRefreshing) ? ( <div className="flex justify-center items-center py-10"> <Loader2 className="h-12 w-12 animate-spin text-primary" /> </div> ) 
            : videosToDisplay.length > 0 ? ( <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> {videosToDisplay.map((video) => (<YouTubeCard key={video.id} video={video as YouTubeVideo} />))} </div> ) 
            : ( <div className="text-center py-10 text-muted-foreground"> <YoutubeIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                {fetchError && !isLoadingVideos && !isRefreshing && <p className="text-destructive mb-2">{fetchError}</p>}
                {user?.role === 'admin' && !selectedUserIdForAdmin ? <p>Select a user above to see their tracked YouTube videos.</p> : <p>No YouTube videos to display with current filters. Try the "Refresh Feed" button.</p> }
                 {user?.role !== 'admin' && !isLoadingVideos && !isRefreshing && allFetchedVideos.length === 0 && !fetchError && <p>You can request your admin to assign YouTube videos to your account, or click "Refresh Feed" if links are already assigned.</p> }
                {user?.role === 'admin' && selectedUserIdForAdmin && !isLoadingVideos && !isRefreshing && allFetchedVideos.length === 0 && !fetchError && <p>Assign YouTube videos to this user or click "Refresh Feed".</p> }
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
