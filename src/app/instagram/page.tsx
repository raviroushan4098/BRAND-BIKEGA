
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import InstagramCard from '@/components/analytics/InstagramCard';
import type { StoredInstagramPost } from '@/lib/instagramPostAnalyticsService';
import {
  saveInstagramPostAnalytics,
  getAllInstagramPostAnalyticsForUser,
} from '@/lib/instagramPostAnalyticsService';
import { fetchInstagramReelStats, type FetchInstagramReelStatsInput, type InstagramReelStatsOutput } from '@/ai/flows/fetch-instagram-reel-stats-flow';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/lib/authService';
import { getAllUsers as apiGetAllUsers } from '@/lib/authService';
import { assignInstagramLinksToUser, getInstagramLinksForUser } from '@/lib/instagramLinkService';
import { toast } from '@/hooks/use-toast';
import {
  BarChart3, UserPlus, LinkIcon, FileText, UploadCloud, Users, DownloadCloud, Loader2, Instagram as InstagramUIIcon, Eye, Heart, MessageSquare, ListFilter,
  CalendarIcon, ArrowUpDown, XCircle, FilterX, RefreshCw, PlayCircle, Share2, FileSpreadsheet as CsvIcon, FileBarChart2 as PptIcon, ChevronDown, Loader2 as ReportLoaderIcon
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { format, isValid as isValidDate, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  generateInstagramAnalyticsReport, 
  type InstagramAnalyticsReportOutput, 
  type InstagramReelForReport 
} from '@/ai/flows/generate-instagram-analytics-report-flow';
import PptxGenJS from 'pptxgenjs';

interface SummaryStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalPlays: number;
  totalReshares: number; 
  averageLikesPerPost: number;
  averageCommentsPerPost: number;
  averagePlaysPerPost: number;
  averageResharesPerPost: number; 
}

type SortablePostKey = 'postedAt' | 'likes' | 'comments' | 'playCount' | 'reshareCount';

export default function InstagramAnalyticsPage() {
  const { user } = useAuth();
  
  const [usersForAdminSelect, setUsersForAdminSelect] = useState<User[]>([]);
  const [selectedUserIdForAdmin, setSelectedUserIdForAdmin] = useState<string>('');
  
  const [singleLink, setSingleLink] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [allFetchedPosts, setAllFetchedPosts] = useState<StoredInstagramPost[]>([]);
  const [postsToDisplay, setPostsToDisplay] = useState<StoredInstagramPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false); 
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [sortConfig, setSortConfig] = useState<{ key: SortablePostKey; order: 'asc' | 'desc' }>({ key: 'postedAt', order: 'desc' });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [isGeneratingPptReport, setIsGeneratingPptReport] = useState(false);


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
  }, [user?.id, user?.role, toast]);

  useEffect(() => {
    fetchUsersForAdmin();
  }, [fetchUsersForAdmin]);

  const loadInitialUserPosts = useCallback(async (userIdToFetch: string) => {
    if (!userIdToFetch) {
      setAllFetchedPosts([]);
      setPostsToDisplay([]);
      setFetchError(null);
      setIsLoadingPosts(false);
      return;
    }
    setIsLoadingPosts(true);
    setFetchError(null);
    try {
      const storedPosts = await getAllInstagramPostAnalyticsForUser(userIdToFetch);
      setAllFetchedPosts(storedPosts);
    } catch (error: any) {
      console.error("Error loading Instagram posts from Firestore:", error);
      setFetchError("Could not load post data from storage. Please try refreshing.");
      setAllFetchedPosts([]);
      toast({ title: "Storage Error", description: "Failed to load cached post data.", variant: "destructive" });
    }
    setIsLoadingPosts(false);
  }, [toast]);

  useEffect(() => {
    const targetUserId = user?.role === 'admin' && selectedUserIdForAdmin ? selectedUserIdForAdmin : user?.id;
    if (targetUserId) {
      loadInitialUserPosts(targetUserId);
    } else {
      setAllFetchedPosts([]);
      setPostsToDisplay([]);
      setFetchError(null); 
      setIsLoadingPosts(false);
    }
  }, [user, selectedUserIdForAdmin, loadInitialUserPosts]);


  useEffect(() => {
    let processedPosts = [...allFetchedPosts];
    if (dateRange.from || dateRange.to) {
      processedPosts = processedPosts.filter(post => {
        if (!post.postedAt) return false; 
        const postDate = parseISO(post.postedAt);
        if (!isValidDate(postDate)) return false;
        if (dateRange.from && postDate < dateRange.from) return false;
        if (dateRange.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999); 
            if (postDate > toDate) return false;
        }
        return true;
      });
    }

    if (sortConfig.key) {
      processedPosts.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA === undefined || valA === null) return sortConfig.order === 'asc' ? -1 : 1;
        if (valB === undefined || valB === null) return sortConfig.order === 'asc' ? 1 : -1;

        if (sortConfig.key === 'postedAt') {
          const dateA = parseISO(valA as string).getTime();
          const dateB = parseISO(valB as string).getTime();
          if (isNaN(dateA)) return sortConfig.order === 'asc' ? -1 : 1;
          if (isNaN(dateB)) return sortConfig.order === 'asc' ? 1 : -1;
          return sortConfig.order === 'asc' ? dateA - dateB : dateB - dateA;
        } else { 
          return sortConfig.order === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        }
      });
    }
    setPostsToDisplay(processedPosts);
  }, [allFetchedPosts, dateRange, sortConfig]);

  useEffect(() => {
    if (postsToDisplay.length > 0) {
      const totalLikes = postsToDisplay.reduce((sum, post) => sum + (post.likes || 0), 0);
      const totalComments = postsToDisplay.reduce((sum, post) => sum + (post.comments || 0), 0);
      const totalPlays = postsToDisplay.reduce((sum, post) => sum + (post.playCount || 0), 0);
      const totalReshares = postsToDisplay.reduce((sum, post) => sum + (post.reshareCount || 0), 0);
      setSummaryStats({
        totalPosts: postsToDisplay.length,
        totalLikes,
        totalComments,
        totalPlays,
        totalReshares,
        averageLikesPerPost: parseFloat((totalLikes / postsToDisplay.length).toFixed(1)) || 0,
        averageCommentsPerPost: parseFloat((totalComments / postsToDisplay.length).toFixed(1)) || 0,
        averagePlaysPerPost: parseFloat((totalPlays / postsToDisplay.length).toFixed(1)) || 0,
        averageResharesPerPost: parseFloat((totalReshares / postsToDisplay.length).toFixed(1)) || 0,
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
    let updatedCount = 0;
    let errorCount = 0;

    try {
      const links = await getInstagramLinksForUser(targetUserId);
      if (links.length === 0) {
        setAllFetchedPosts([]); 
        setPostsToDisplay([]);
        toast({ title: "No Reel Links", description: "No Instagram Reel links assigned to this user.", variant: "default" });
        setIsRefreshing(false);
        return;
      }
      
      toast({ title: "Refresh Started", description: `Fetching stats for ${links.length} Instagram Reel link(s). This may take a while due to delays between requests.` });

      for (let i = 0; i < links.length; i++) {
        const reelUrl = links[i];
        try {
          const flowInput: FetchInstagramReelStatsInput = { reelUrl };
          const statsOutput: InstagramReelStatsOutput = await fetchInstagramReelStats(flowInput);

          if (statsOutput.fetchedSuccessfully && statsOutput.shortcode) {
            const postToStore: StoredInstagramPost = {
              id: statsOutput.shortcode, 
              reelUrl: statsOutput.originalUrl,
              likes: statsOutput.likeCount || 0,
              comments: statsOutput.commentCount || 0,
              playCount: statsOutput.playCount || 0,
              reshareCount: statsOutput.reshareCount || 0,
              caption: statsOutput.caption,
              thumbnailUrl: statsOutput.thumbnailUrl,
              username: statsOutput.username,
              postedAt: statsOutput.postedAt || new Date(0).toISOString(), 
              lastFetched: new Date().toISOString(),
            };
            await saveInstagramPostAnalytics(targetUserId, postToStore);
            updatedCount++;
          } else {
            console.warn(`Failed to fetch stats for ${reelUrl}: ${statsOutput.errorMessage}`);
            if (statsOutput.shortcode) { 
                 await saveInstagramPostAnalytics(targetUserId, {
                    id: statsOutput.shortcode,
                    reelUrl: reelUrl,
                    likes:0, comments:0, playCount:0, reshareCount:0,
                    postedAt: statsOutput.postedAt || new Date(0).toISOString(), 
                    lastFetched: new Date().toISOString(),
                    errorMessage: statsOutput.errorMessage || "Failed to fetch details."
                 });
            }
            errorCount++;
          }
        } catch (flowError: any) {
          console.error(`Error processing link ${reelUrl}:`, flowError);
          errorCount++;
        }
        
        setRefreshProgress(((i + 1) / links.length) * 100);
        
        if (i < links.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      await loadInitialUserPosts(targetUserId); 
      toast({ title: "Feed Refreshed", description: `Updated ${updatedCount} reels. ${errorCount > 0 ? `${errorCount} failed.` : ''}` });

    } catch (error: any) {
      const errorMessage = error.message || "Unknown error during refresh.";
      setFetchError("Refresh failed: " + errorMessage);
      toast({ title: "Refresh Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };


  const handleDownloadCsvTemplate = () => {
    const csvContent = "link\n"; 
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const linkEl = document.createElement("a");
    const url = URL.createObjectURL(blob);
    linkEl.setAttribute("href", url);
    linkEl.setAttribute("download", "instagram_reel_links_template.csv");
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
        resolve(lines.map(line => line.split(',')[0].trim()).filter(Boolean)); 
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
      toast({ title: "No Reel Links Provided", description: "Enter a Reel link or upload CSV.", variant: "destructive" });
      return;
    }
    setIsAssigning(true);
    let linksFromInput: string[] = [];
    if (singleLink.trim()) {
      if (isValidHttpUrl(singleLink.trim())) linksFromInput.push(singleLink.trim());
      else {
        toast({ title: "Invalid URL", description: "Single Reel link is not a valid URL.", variant: "destructive" });
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
      toast({ title: "No Valid Reel Links", description: "No valid Instagram Reel links found.", variant: "destructive" });
      setIsAssigning(false); return;
    }

    const result = await assignInstagramLinksToUser(selectedUserIdForAdmin, uniqueLinks);
    if (result.success) {
      const targetUser = usersForAdminSelect.find(u => u.id === selectedUserIdForAdmin);
      toast({ title: "Reel Links Assigned", description: `Assigned ${result.actuallyAddedCount} new Reel link(s) to ${targetUser?.name || 'user'}. Starting to fetch stats...` });
      setSingleLink(''); setCsvFile(null);
      const fileInput = document.getElementById('instagram-csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await handleRefreshFeed(); 
    } else {
      toast({ title: "Assignment Failed", description: "Could not assign Reel links.", variant: "destructive" });
    }
    setIsAssigning(false);
  };

  const handleSortChange = (value: string) => setSortConfig(prev => ({ ...prev, key: value as SortablePostKey }));
  const toggleSortOrder = () => setSortConfig(prev => ({ ...prev, order: prev.order === 'asc' ? 'desc' : 'asc' }));
  const handleClearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setSortConfig({ key: 'postedAt', order: 'desc' });
  };

  const StatCard: React.FC<{icon: React.ElementType, label: string, value: string | number}> = ({ icon: Icon, label, value }) => (
    <div className="flex flex-col items-center justify-center p-3 bg-card rounded-lg shadow hover:shadow-md transition-shadow">
      <Icon className="h-7 w-7 text-primary mb-1.5" />
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );

  const currentTargetUserId = user?.role === 'admin' ? selectedUserIdForAdmin : user?.id;

  const handleDownloadInstagramReportCsv = () => {
    if (postsToDisplay.length === 0) {
      toast({ title: "No Data", description: "No reels to include in the report.", variant: "default" });
      return;
    }
  
    const escapeCsvCell = (cellData: any): string => {
      const stringVal = String(cellData === undefined || cellData === null ? '' : cellData);
      return `"${stringVal.replace(/"/g, '""')}"`;
    };
  
    const headers = ["Publish Date", "Title", "Like Count", "Comment Count", "Share Count", "Link"];
    const csvRows = [headers.join(',')];
  
    postsToDisplay.forEach(post => {
      const postedDate = post.postedAt ? (isValidDate(parseISO(post.postedAt)) ? format(parseISO(post.postedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A') : 'N/A';
      const title = post.caption || (post.username ? `@${post.username}'s Reel` : `Reel ID: ${post.id}`);
      
      const row = [
        escapeCsvCell(postedDate),
        escapeCsvCell(title),
        post.likes || 0,
        post.comments || 0,
        post.reshareCount || 0,
        escapeCsvCell(post.reelUrl),
      ];
      csvRows.push(row.join(','));
    });
  
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const linkEl = document.createElement("a");
    const url = URL.createObjectURL(blob);
    linkEl.setAttribute("href", url);
    linkEl.setAttribute("download", "instagram_reels_report.csv");
    linkEl.style.visibility = 'hidden';
    document.body.appendChild(linkEl);
    linkEl.click();
    document.body.removeChild(linkEl);
    URL.revokeObjectURL(url);
  
    toast({ title: "CSV Report Downloaded", description: "Instagram reels report generated successfully." });
  };

  const handleDownloadInstagramReportPpt = async () => {
    if (postsToDisplay.length === 0) {
      toast({ title: "No Data", description: "No reels to include in the PPT report.", variant: "default" });
      return;
    }
    setIsGeneratingPptReport(true);
    toast({ title: "Generating PPT Report", description: "AI is preparing your Instagram report. This may take a moment..." });

    try {
      const reelsForReport: InstagramReelForReport[] = postsToDisplay.map(p => ({
        id: p.id,
        reelUrl: p.reelUrl,
        caption: p.caption || '',
        username: p.username || '',
        likes: p.likes || 0,
        comments: p.comments || 0,
        playCount: p.playCount || 0,
        reshareCount: p.reshareCount || 0,
        postedAt: p.postedAt || new Date(0).toISOString(),
      }));

      let filterContextString = "Reels shown: " + (postsToDisplay.length === allFetchedPosts.length ? "All" : "Filtered list");
      if (dateRange.from || dateRange.to) {
        filterContextString += `. Filtered by date: ${dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : 'Any'} - ${dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'Any'}`;
      }
      filterContextString += `. Sorted by ${sortConfig.key} (${sortConfig.order}).`;

      const reportOutput: InstagramAnalyticsReportOutput = await generateInstagramAnalyticsReport({ 
        reels: reelsForReport, 
        filterContext: filterContextString 
      });

      if (!reportOutput) {
        throw new Error("AI model did not return a report for Instagram.");
      }
      
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      const primaryColor = "3F51B5"; 
      const accentColor = "E91E63"; 
      const textColor = "212121";
      const slideBackgroundColor = "FFFFFF";

      pptx.defineSlideMaster({
        title: "INSTA_MASTER_SLIDE",
        background: { color: slideBackgroundColor },
        objects: [
          { rect: { x: 0, y: 0, w: "100%", h: 0.75, fill: { color: primaryColor } } },
          { text: { text: "Insight Stream - Instagram Analytics", options: { x: 0.5, y: 0.15, w: 6, h: 0.5, color: "FFFFFF", fontSize: 18 } } },
        ],
      });
      
      const addContentSlide = (slideTitle: string, content?: PptxGenJS.TextProps[] | string) => {
        const slide = pptx.addSlide({ masterName: "INSTA_MASTER_SLIDE" });
        slide.addText(slideTitle, { x: 0.5, y: 1.0, w: "90%", h: 0.5, fontSize: 28, bold: true, color: primaryColor });
        if (content && Array.isArray(content) && content.length > 0) {
           slide.addText(content, { x: 0.5, y: 1.75, w: "90%", h: 4.5, fontSize: 12, color: textColor, bullet: {type: 'bullet'} });
        } else if (typeof content === 'string') {
           slide.addText(content, { x: 0.5, y: 1.75, w: "90%", h: 4.5, fontSize: 12, color: textColor });
        }
        return slide;
      };

      const titleSlide = pptx.addSlide({ masterName: "INSTA_MASTER_SLIDE" });
      titleSlide.addText(reportOutput.reportTitle || "Instagram Reel Analytics Report", { x: 0.5, y: 2.5, w: '90%', h: 1.5, fontSize: 44, bold: true, color: primaryColor, align: 'center' });
      titleSlide.addText(`Generated on: ${new Date().toLocaleDateString()}`, { x: 0.5, y: 4.0, w: '90%', h: 0.5, fontSize: 16, color: textColor, align: 'center' });

      addContentSlide("Overall Performance Summary", [{text: reportOutput.overallPerformanceSummary, options: {fontSize: 16}}]);
      if (reportOutput.keyObservations && reportOutput.keyObservations.length > 0) addContentSlide("Key Observations", reportOutput.keyObservations.map(obs => ({ text: obs, options: { breakLine: true, fontSize: 14 } })));
      
      if (reportOutput.topPerformingReels && reportOutput.topPerformingReels.length > 0) {
        const topReelsSlide = pptx.addSlide({ masterName: "INSTA_MASTER_SLIDE" });
        topReelsSlide.addText("Top Performing Reels", { x: 0.5, y: 1.0, w: "90%", h: 0.5, fontSize: 28, bold: true, color: primaryColor });
        let yPos = 1.75;
        reportOutput.topPerformingReels.forEach((reel, index) => {
          const reelTitle = reel.caption ? (reel.caption.length > 50 ? reel.caption.substring(0,47)+'...' : reel.caption) : (reel.username ? `@${reel.username}'s Reel` : `Reel ID: ${reel.id}`);
          topReelsSlide.addText(`${index + 1}. ${reelTitle}`, { x: 0.5, y: yPos, w: "90%", h: 0.3, fontSize: 16, bold: true, color: accentColor, hyperlink: { url: reel.reelUrl || '#', tooltip: "View Reel" } }); yPos += 0.35;
          topReelsSlide.addText(`Plays: ${reel.playCount.toLocaleString()} | Likes: ${reel.likes.toLocaleString()} | Comments: ${reel.comments.toLocaleString()} | Reshares: ${(reel.reshareCount || 0).toLocaleString()}`, { x: 0.7, y: yPos, w: "85%", h: 0.25, fontSize: 12, color: textColor }); yPos += 0.25;
          if (reel.reason) { topReelsSlide.addText(`Reason: ${reel.reason}`, { x: 0.7, y: yPos, w: "85%", h: 0.25, fontSize: 12, italic: true, color: textColor }); yPos += 0.25; }
          yPos += 0.2;
        });
      }
      if (reportOutput.areasForImprovement && reportOutput.areasForImprovement.length > 0) addContentSlide("Areas for Improvement", reportOutput.areasForImprovement.map(area => ({ text: area, options: { breakLine: true, fontSize: 14 } })));
      if (reportOutput.actionableSuggestions && reportOutput.actionableSuggestions.length > 0) addContentSlide("Actionable Suggestions", reportOutput.actionableSuggestions.map(suggestion => ({ text: suggestion, options: { breakLine: true, fontSize: 14 } })));

      const endSlide = pptx.addSlide({ masterName: "INSTA_MASTER_SLIDE" });
      endSlide.addText("Thank You", { x:0.5, y:2.5, w:'90%', h:1, fontSize:40, bold:true, color:primaryColor, align:'center'});
      endSlide.addText("Report generated by Insight Stream", { x:0.5, y:3.5, w:'90%', h:0.5, fontSize:14, color:textColor, align:'center'});

      const reportTitleForFile = reportOutput.reportTitle ? reportOutput.reportTitle.replace(/[^a-z0-9_]/gi, '_').toLowerCase() : 'instagram_reels_report';
      pptx.writeFile({ fileName: `${reportTitleForFile}.pptx` });
      toast({ title: "PPT Report Downloaded", description: "Instagram Reels PPT report generated successfully." });

    } catch (err: any) {
      console.error("Error generating or downloading Instagram PPT report:", err);
      toast({ title: "PPT Report Generation Failed", description: err.message || "Could not generate the PPT report for Instagram.", variant: "destructive" });
    } finally {
      setIsGeneratingPptReport(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <InstagramUIIcon className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">Instagram Reel Analytics</CardTitle>
              </div>
            </div>
            <CardDescription className="mt-2">
              {user?.role === 'admin' 
                ? "Assign Instagram Reel links, view tracked posts, and manage data." 
                : "Overview of Instagram Reel performance. Refresh to get latest data."
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
              <div className="flex items-center gap-3"><UserPlus className="mr-2 h-6 w-6 text-accent" /> <CardTitle className="text-2xl font-semibold">Assign Instagram Reel Links</CardTitle></div>
              <CardDescription>Select a user and provide Instagram Reel links to track. Stats will be fetched automatically.</CardDescription>
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
                <Label htmlFor="single-link-instagram" className="flex items-center mb-2"><LinkIcon className="mr-2 h-4 w-4" /> Add Single Instagram Reel Link</Label>
                <Input id="single-link-instagram" type="url" placeholder="e.g., https://www.instagram.com/reel/..." value={singleLink} onChange={(e) => setSingleLink(e.target.value)} className="w-full md:w-1/2" disabled={isAssigning || isRefreshing} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram-csv-upload" className="flex items-center"><FileText className="mr-2 h-4 w-4" /> Or Upload CSV</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Input id="instagram-csv-upload" type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)} className="w-full md:w-1/2 pt-2" disabled={isAssigning || isRefreshing} />
                  <Button variant="outline" onClick={handleDownloadCsvTemplate} disabled={isAssigning || isRefreshing} className="w-full sm:w-auto"><DownloadCloud className="mr-2 h-4 w-4" /> Template</Button>
                </div>
                <p className="text-xs text-muted-foreground">CSV: one Instagram Reel link per line, column header "link".</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAssignLinks} disabled={isAssigning || isRefreshing || !selectedUserIdForAdmin || (!singleLink && !csvFile)}>
                {isAssigning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                {isAssigning ? 'Assigning & Fetching...' : 'Assign Reel Links & Fetch Stats'}
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
                  <SelectContent>
                    <SelectItem value="postedAt">Date</SelectItem>
                    <SelectItem value="likes">Likes</SelectItem>
                    <SelectItem value="comments">Comments</SelectItem>
                    <SelectItem value="playCount">Plays</SelectItem>
                    <SelectItem value="reshareCount">Reshares</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={toggleSortOrder} title={`Sort ${sortConfig.order === 'asc'?'Desc':'Asc'}`} disabled={isRefreshing}><ArrowUpDown className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
          <CardFooter><Button variant="outline" onClick={handleClearFilters} disabled={isRefreshing}><FilterX className="mr-2 h-4 w-4" /> Clear</Button></CardFooter>
        </Card>

        {(!isLoadingPosts && currentTargetUserId) && (
             <Card className="mb-6 shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold">Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button 
                        onClick={handleRefreshFeed} 
                        disabled={isRefreshing || isLoadingPosts || !currentTargetUserId || isGeneratingPptReport}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin':''}`} /> 
                        {isRefreshing ? 'Refreshing Feed...':'Refresh Feed'}
                    </Button>
                </CardContent>
            </Card>
        )}

        {(isLoadingPosts && !summaryStats && !isRefreshing) && (
          <Card className="mb-6"><CardHeader><Skeleton className="h-6 w-2/5 mb-2" /><Skeleton className="h-4 w-1/3" /></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></CardContent></Card>
        )}

        {(!isLoadingPosts || isRefreshing) && summaryStats && (
          <Card className="mb-6 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-semibold">Performance Overview</CardTitle>
                    <CardDescription>Summary for {user?.role === 'admin' && selectedUserIdForAdmin ? `${usersForAdminSelect.find(u=>u.id === selectedUserIdForAdmin)?.name || 'selected user'}'s` : "your"} {summaryStats.totalPosts} reel(s) {(dateRange.from||dateRange.to)?"(filtered)":""}.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon={ListFilter} label="Total Reels" value={summaryStats.totalPosts} />
              <StatCard icon={Heart} label="Total Likes" value={summaryStats.totalLikes} />
              <StatCard icon={MessageSquare} label="Total Comments" value={summaryStats.totalComments} />
              <StatCard icon={PlayCircle} label="Total Plays" value={summaryStats.totalPlays} />
              <StatCard icon={Share2} label="Total Reshares" value={summaryStats.totalReshares} />
              <StatCard icon={Eye} label="Avg Plays" value={summaryStats.averagePlaysPerPost} />
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {user?.role === 'admin' ? (selectedUserIdForAdmin ? `${usersForAdminSelect.find(u=>u.id === selectedUserIdForAdmin)?.name || 'Selected User'}'s Reels` : 'Select User to View Reels') : "Your Instagram Reels"}
              </CardTitle>
              <CardDescription>
                {user?.role === 'admin' && !selectedUserIdForAdmin ? 'Select a user above to see their tracked Instagram Reels.'
                  : isLoadingPosts && !isRefreshing ? 'Loading Reel information from storage...' 
                  : fetchError ? `Error: ${fetchError}`
                  : postsToDisplay.length > 0 ? `Displaying ${postsToDisplay.length} of ${allFetchedPosts.length} reel(s). Sorted by ${sortConfig.key} (${sortConfig.order}).`
                  : 'No Instagram Reels to display. Assign Reel links or try "Refresh Feed".'
                }
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={postsToDisplay.length === 0 || isGeneratingPptReport || isRefreshing}
                >
                  {(isGeneratingPptReport) && <ReportLoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
                  Download Report
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={handleDownloadInstagramReportCsv}
                  disabled={isGeneratingPptReport || isRefreshing}
                >
                  <CsvIcon className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDownloadInstagramReportPpt}
                  disabled={isGeneratingPptReport || isRefreshing}
                >
                  <PptIcon className="mr-2 h-4 w-4" />
                  Export as PPT (AI Analysis)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {(isLoadingPosts && !isRefreshing) ? (<div className="flex justify-center items-center py-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>) 
            : postsToDisplay.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">{postsToDisplay.map((post) => (<InstagramCard key={post.id} post={post} />))}</div>) 
            : (<div className="text-center py-10 text-muted-foreground"><InstagramUIIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                {fetchError && !isLoadingPosts && !isRefreshing && <p className="text-destructive mb-2">{fetchError}</p>}
                <p>No Instagram Reels to display. Try assigning Reel links (admin) or use the "Refresh Feed" button above.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

