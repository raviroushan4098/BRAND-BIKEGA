
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import YouTubeCard from '@/components/analytics/YouTubeCard';
import { type YouTubeVideo } from '@/lib/mockData'; // Keep type, remove mockYouTubeData
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/lib/authService';
import { getAllUsers as apiGetAllUsers } from '@/lib/authService';
import { assignYouTubeLinksToUser, getYouTubeLinksForUser } from '@/lib/youtubeLinkService';
import { toast } from '@/hooks/use-toast';
import { BarChart3, UserPlus, LinkIcon, FileText, UploadCloud, Users, DownloadCloud, Loader2, YoutubeIcon } from 'lucide-react';

export default function YouTubeManagementPage() {
  const { user } = useAuth();
  
  const [usersForAdminSelect, setUsersForAdminSelect] = useState<User[]>([]);
  const [selectedUserIdForAdmin, setSelectedUserIdForAdmin] = useState<string>('');
  
  const [singleLink, setSingleLink] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [assignedLinks, setAssignedLinks] = useState<string[]>([]);
  const [videosToDisplay, setVideosToDisplay] = useState<YouTubeVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  const fetchUsersForAdmin = useCallback(async () => {
    if (user?.role === 'admin') {
      setIsLoadingUsers(true);
      try {
        const fetchedUsers = await apiGetAllUsers();
        setUsersForAdminSelect(fetchedUsers.filter(u => u.id !== user.id)); 
      } catch (error) {
        // Error toast already removed
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
        videoId = urlObj.pathname.slice(1).split('?')[0];
      } else if (urlObj.hostname.includes('youtube.com')) {
        if (urlObj.pathname.startsWith('/embed/')) {
          videoId = urlObj.pathname.split('/embed/')[1].split('?')[0];
        } else if (urlObj.pathname.startsWith('/watch')) {
          videoId = urlObj.searchParams.get('v');
        }
      }
      if (videoId && videoId.includes('&')) {
        videoId = videoId.split('&')[0];
      }
    } catch (e) { return null; }
    return videoId;
  };

  const transformLinksToVideos = useCallback((links: string[]): YouTubeVideo[] => {
    return links.map((link, index) => {
      const videoId = extractYouTubeVideoId(link);
      return {
        id: videoId || `link-${index}-${Date.now()}`,
        title: videoId ? `Video: ${videoId}` : new URL(link).pathname.slice(1,20) || "Untitled Video",
        thumbnailUrl: `https://placehold.co/320x180.png?text=${videoId || 'Video'}`,
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 50),
        shares: Math.floor(Math.random() * 20),
        views: Math.floor(Math.random() * 1000) + 50,
      };
    });
  }, []);

  const fetchAndDisplayUserVideos = useCallback(async (userIdToFetch: string) => {
    if (!userIdToFetch) {
      setAssignedLinks([]);
      return;
    }
    setIsLoadingVideos(true);
    try {
      const links = await getYouTubeLinksForUser(userIdToFetch);
      setAssignedLinks(links);
    } catch (error) {
      // Error handling, perhaps a toast if needed, but keep UI clean
      setAssignedLinks([]);
    }
    setIsLoadingVideos(false);
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      if (selectedUserIdForAdmin) {
        fetchAndDisplayUserVideos(selectedUserIdForAdmin);
      } else {
        setVideosToDisplay([]); // Clear videos if no user selected by admin
        setAssignedLinks([]);
      }
    } else if (user) { // Non-admin user
      fetchAndDisplayUserVideos(user.id);
    }
  }, [user, selectedUserIdForAdmin, fetchAndDisplayUserVideos]);
  
  useEffect(() => {
    if (assignedLinks.length > 0) {
      setVideosToDisplay(transformLinksToVideos(assignedLinks));
    } else {
      setVideosToDisplay([]);
    }
  }, [assignedLinks, transformLinksToVideos]);


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
      if (isValidHttpUrl(singleLink.trim())) {
        linksFromInput.push(singleLink.trim());
      } else {
        toast({ title: "Invalid URL", description: "The single link provided is not a valid URL.", variant: "destructive" });
        setIsAssigning(false);
        return;
      }
    }

    if (csvFile) {
      try {
        const parsedLinksFromCsv = await parseCsvFile(csvFile);
        const validCsvLinks = parsedLinksFromCsv.filter(isValidHttpUrl);
        linksFromInput = linksFromInput.concat(validCsvLinks);
        if (parsedLinksFromCsv.length !== validCsvLinks.length) {
          toast({ title: "CSV Processed with Exclusions", description: "Some entries in the CSV were not valid URLs and were excluded.", variant: "default" });
        }
      } catch (error) {
        toast({ title: "CSV Parsing Error", description: "Could not parse the CSV file.", variant: "destructive" });
        setIsAssigning(false);
        return;
      }
    }
    
    const uniqueLinksFromInput = Array.from(new Set(linksFromInput));

    if (uniqueLinksFromInput.length === 0) {
      toast({ title: "No Valid Links", description: "No valid YouTube links were found in your input to assign.", variant: "destructive" });
      setIsAssigning(false);
      return;
    }
    
    const result = await assignYouTubeLinksToUser(selectedUserIdForAdmin, uniqueLinksFromInput);

    if (result.success) {
      const targetUser = usersForAdminSelect.find(u => u.id === selectedUserIdForAdmin);
      if (result.actuallyAddedCount > 0) {
        toast({ title: "Links Assigned", description: `Successfully assigned ${result.actuallyAddedCount} new unique link(s) to ${targetUser?.name || 'the selected user'}.` });
      } else {
        toast({ title: "Links Updated", description: `No new unique links were added to ${targetUser?.name || 'the selected user'}. The list may have already contained these links.` });
      }
      setSingleLink('');
      setCsvFile(null);
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      // Refresh videos for the currently selected user
      if (selectedUserIdForAdmin) {
        fetchAndDisplayUserVideos(selectedUserIdForAdmin);
      }
    } else {
      toast({ title: "Assignment Failed", description: "Could not assign links to the user in the 'youtube' collection.", variant: "destructive" });
    }
    setIsAssigning(false);
  };

  const isValidHttpUrl = (string: string) => {
    let url;
    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  };

  const parseCsvFile = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) {
          resolve([]);
          return;
        }
        let lines = text.split(/\r\n|\n/).map(line => line.trim()).filter(Boolean); 
        
        if (lines.length > 0 && lines[0].trim().toLowerCase() === 'link') {
          lines = lines.slice(1);
        }
        
        const urls = lines.map(line => line.split(',')[0].trim()).filter(Boolean);
        resolve(urls);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

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
            </div>
            <CardDescription>
              {user?.role === 'admin' 
                ? "Assign YouTube links to users and view their tracked videos." 
                : "Overview of your assigned YouTube video performance."
              }
            </CardDescription>
          </CardHeader>
        </Card>

        {user?.role === 'admin' && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <UserPlus className="h-6 w-6 text-accent" />
                <CardTitle className="text-2xl font-semibold">Assign YouTube Links to User</CardTitle>
              </div>
              <CardDescription>Select a user and provide YouTube links to track for them. Links will be stored under 'youtube/{'{userId}'}/links'.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="user-select" className="flex items-center mb-2">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" /> Select User
                </Label>
                <Select value={selectedUserIdForAdmin} onValueChange={setSelectedUserIdForAdmin} disabled={isLoadingUsers || isAssigning}>
                  <SelectTrigger id="user-select" className="w-full md:w-1/2">
                    <SelectValue placeholder="Select a user to manage their videos..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingUsers ? (
                      <SelectItem value="loading" disabled>Loading users...</SelectItem>
                    ) : usersForAdminSelect.length > 0 ? (
                      usersForAdminSelect.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-users" disabled>No other users available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="single-link" className="flex items-center mb-2">
                  <LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Add Single YouTube Link
                </Label>
                <Input
                  id="single-link"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=example"
                  value={singleLink}
                  onChange={(e) => setSingleLink(e.target.value)}
                  className="w-full md:w-1/2"
                  disabled={isAssigning}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="csv-upload" className="flex items-center">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Or Upload CSV with Links
                </Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full md:w-1/2 pt-2"
                    disabled={isAssigning}
                    />
                    <Button variant="outline" onClick={handleDownloadCsvTemplate} disabled={isAssigning} className="w-full sm:w-auto">
                        <DownloadCloud className="mr-2 h-4 w-4" />
                        Download Template
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">CSV should contain one YouTube URL per line, in a column with the header "link".</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAssignLinks} disabled={isAssigning || !selectedUserIdForAdmin || (!singleLink && !csvFile)}>
                <UploadCloud className="mr-2 h-5 w-5" />
                {isAssigning ? 'Assigning...' : 'Assign Links'}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {/* Display Area for Video Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {user?.role === 'admin' 
                ? (selectedUserIdForAdmin ? `${usersForAdminSelect.find(u=>u.id === selectedUserIdForAdmin)?.name || 'Selected User'}'s Assigned Videos` : 'Select a User to View Videos')
                : "Your Assigned YouTube Videos"
              }
            </CardTitle>
            <CardDescription>
              {user?.role === 'admin' && !selectedUserIdForAdmin 
                ? 'Please select a user from the dropdown above to see their assigned videos.'
                : isLoadingVideos 
                  ? 'Loading video information...' 
                  : videosToDisplay.length > 0 
                    ? `Displaying ${videosToDisplay.length} video(s). Data shown is placeholder.`
                    : (user?.role !== 'admin' ? 'You have no YouTube videos assigned yet.' : 'This user has no YouTube videos assigned.')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingVideos ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : videosToDisplay.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videosToDisplay.map((video) => (
                  <YouTubeCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <YoutubeIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                {user?.role === 'admin' && !selectedUserIdForAdmin
                  ? <p>Select a user above to see their tracked YouTube videos.</p>
                  : <p>No YouTube videos to display.</p>
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

