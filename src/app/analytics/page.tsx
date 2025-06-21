"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3, Youtube, Instagram as InstagramIcon, AlertTriangle, Package, MessageSquare, ThumbsUp, Eye, PlayCircle, CalendarDays, Filter, Share2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { StoredYouTubeVideo } from '@/lib/youtubeVideoAnalyticsService';
import { getAllVideoAnalyticsForUser } from '@/lib/youtubeVideoAnalyticsService';
import type { StoredInstagramPost } from '@/lib/instagramPostAnalyticsService';
import { getAllInstagramPostAnalyticsForUser } from '@/lib/instagramPostAnalyticsService';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, eachDayOfInterval, startOfDay, endOfDay, isValid, parseISO, isWithinInterval } from 'date-fns';
import DailyPerformanceChart from '@/components/analytics/DailyPerformanceChart';

interface YouTubeSummaryStats {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

interface InstagramSummaryStats {
  totalReels: number;
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  totalReshares: number;
}

export interface DailyChartDataPoint {
  date: string; // "YYYY-MM-DD"
  views?: number;
  likes?: number;
  comments?: number;
  plays?: number;
  reshares?: number;
}

interface StatDisplayCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  platformColor?: string;
  size?: 'default' | 'compact';
}

const StatDisplayCard: React.FC<StatDisplayCardProps> = ({ title, value, icon: Icon, description, platformColor, size = 'default' }) => {
  const titleSizeClass = size === 'compact' ? 'text-base' : 'text-lg';
  const valueSizeClass = size === 'compact' ? 'text-2xl' : 'text-3xl';
  const iconSizeClass = size === 'compact' ? 'h-5 w-5' : 'h-6 w-6';
  const cardPadding = size === 'compact' ? 'p-3' : 'p-4';
  const headerPadding = size === 'compact' ? 'pb-1' : 'pb-2';
  const contentPadding = size === 'compact' ? 'pt-1' : 'pt-2';


  return (
    <Card className={`shadow-md hover:shadow-lg transition-shadow ${cardPadding}`}>
      <CardHeader className={`${headerPadding}`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`${titleSizeClass} font-semibold`}>{title}</CardTitle>
          <Icon className={`${iconSizeClass} ${platformColor || 'text-primary'}`} />
        </div>
        {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
      </CardHeader>
      <CardContent className={contentPadding}>
        <p className={`${valueSizeClass} font-bold`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </CardContent>
    </Card>
  );
};


export default function OverallAnalyticsPage() {
  const { user, isLoading: isAuthLoading } = useAuth(); 

  const [youtubeVideos, setYoutubeVideos] = useState<StoredYouTubeVideo[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<StoredInstagramPost[]>([]);

  const [youtubeSummary, setYoutubeSummary] = useState<YouTubeSummaryStats | null>(null);
  const [instagramSummary, setInstagramSummary] = useState<InstagramSummaryStats | null>(null);

  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined, 
    to: undefined,  
  });
  const [dailyYouTubeChartData, setDailyYouTubeChartData] = useState<DailyChartDataPoint[]>([]);
  const [dailyInstagramChartData, setDailyInstagramChartData] = useState<DailyChartDataPoint[]>([]);
  const [isChartDataLoading, setIsChartDataLoading] = useState(false);


  const fetchData = useCallback(async (userId: string) => {
    setIsLoading(true); 
    setError(null);
    try {
      const [ytData, igData] = await Promise.all([
        getAllVideoAnalyticsForUser(userId),
        getAllInstagramPostAnalyticsForUser(userId)
      ]);
      setYoutubeVideos(ytData);
      setInstagramPosts(igData);
       
       if (ytData.length > 0 || igData.length > 0) {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6); 
        setDateRange({ from: startOfDay(sevenDaysAgo), to: endOfDay(today) });
      } else {
        setDateRange({ from: undefined, to: undefined });
      }
    } catch (err: any) {
      console.error("Error fetching analytics data:", err);
      setError("Failed to load analytics data. Please try again later.");
      toast({ title: "Error", description: "Could not load analytics data.", variant: "destructive" });
    } finally {
      setIsLoading(false); 
    }
  }, [toast]);

  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    } else if (!isAuthLoading && !user) {
      setIsLoading(false); 
      setError("Please log in to view analytics.");
    }
  }, [user, isAuthLoading, fetchData]);

  useEffect(() => {
    if (youtubeVideos.length > 0 || instagramPosts.length > 0) {
      const ytViews = youtubeVideos.reduce((sum, v) => sum + (v.views || 0), 0);
      const ytLikes = youtubeVideos.reduce((sum, v) => sum + (v.likes || 0), 0);
      const ytComments = youtubeVideos.reduce((sum, v) => sum + (v.comments || 0), 0);
      setYoutubeSummary({
        totalVideos: youtubeVideos.length,
        totalViews: ytViews,
        totalLikes: ytLikes,
        totalComments: ytComments,
      });

      const igPlays = instagramPosts.reduce((sum, p) => sum + (p.playCount || 0), 0);
      const igLikes = instagramPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
      const igComments = instagramPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
      const igReshares = instagramPosts.reduce((sum, p) => sum + (p.reshareCount || 0), 0);
      setInstagramSummary({
        totalReels: instagramPosts.length,
        totalPlays: igPlays,
        totalLikes: igLikes,
        totalComments: igComments,
        totalReshares: igReshares,
      });

    } else {
        setYoutubeSummary(null);
        setInstagramSummary(null);
    }
  }, [youtubeVideos, instagramPosts]);

  // Process data for charts when dateRange, youtubeVideos, or instagramPosts change
  useEffect(() => {
    if (!dateRange.from || !dateRange.to || (!youtubeVideos.length && !instagramPosts.length)) {
      setDailyYouTubeChartData([]);
      setDailyInstagramChartData([]);
      setIsChartDataLoading(false);
      return;
    }
    setIsChartDataLoading(true);

    const rangeArray = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const dailyYouTubeMap = new Map<string, DailyChartDataPoint>();
    const dailyInstagramMap = new Map<string, DailyChartDataPoint>();

    rangeArray.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        dailyYouTubeMap.set(dayStr, { date: dayStr, views: 0, likes: 0, comments: 0 });
        dailyInstagramMap.set(dayStr, { date: dayStr, plays: 0, likes: 0, comments: 0, reshares: 0 });
    });

    youtubeVideos.forEach(video => {
        if (video.lastFetched && isValid(parseISO(video.lastFetched))) {
            const fetchedDate = startOfDay(parseISO(video.lastFetched));
            if (isWithinInterval(fetchedDate, { start: dateRange.from!, end: dateRange.to! })) {
                 const fetchedDateStr = format(fetchedDate, 'yyyy-MM-dd');
                 const dayData = dailyYouTubeMap.get(fetchedDateStr);
                 if (dayData) {
                    dayData.views = (dayData.views || 0) + (video.views || 0);
                    dayData.likes = (dayData.likes || 0) + (video.likes || 0);
                    dayData.comments = (dayData.comments || 0) + (video.comments || 0);
                 }
            }
        }
    });
    setDailyYouTubeChartData(Array.from(dailyYouTubeMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

    instagramPosts.forEach(post => {
        if (post.lastFetched && isValid(parseISO(post.lastFetched))) {
            const fetchedDate = startOfDay(parseISO(post.lastFetched));
            if (isWithinInterval(fetchedDate, { start: dateRange.from!, end: dateRange.to! })) {
                const fetchedDateStr = format(fetchedDate, 'yyyy-MM-dd');
                const dayData = dailyInstagramMap.get(fetchedDateStr);
                if (dayData) {
                    dayData.plays = (dayData.plays || 0) + (post.playCount || 0);
                    dayData.likes = (dayData.likes || 0) + (post.likes || 0);
                    dayData.comments = (dayData.comments || 0) + (post.comments || 0);
                    dayData.reshares = (dayData.reshares || 0) + (post.reshareCount || 0);
                }
            }
        }
    });
    setDailyInstagramChartData(Array.from(dailyInstagramMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

    setIsChartDataLoading(false);
  }, [dateRange, youtubeVideos, instagramPosts]);


  if (isLoading) { 
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-xl text-muted-foreground">Loading Overall Analytics...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) { 
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <p className="text-xl text-destructive font-semibold mb-2">Failed to Load Analytics</p>
          <p className="text-md text-muted-foreground">{error}</p>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-xl bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <CardHeader>
            <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8" />
                <CardTitle className="text-3xl font-bold">Overall Performance Analytics</CardTitle>
            </div>
            <CardDescription className="text-lg text-primary-foreground/80">
              A combined view of your YouTube and Instagram performance.
            </CardDescription>
          </CardHeader>
        </Card>

        {!youtubeSummary && !instagramSummary && (
             <div className="text-center py-10">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-xl text-muted-foreground">No data found.</p>
                <p className="text-sm text-muted-foreground">Please ensure you have content tracked on YouTube and/or Instagram pages.</p>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {youtubeSummary && (
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Youtube className="h-7 w-7 text-red-600" />
                  <CardTitle className="text-2xl font-semibold">YouTube Summary (All Time)</CardTitle>
                </div>
                <CardDescription>{youtubeSummary.totalVideos} video(s) analyzed.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <StatDisplayCard title="Total Videos" value={youtubeSummary.totalVideos} icon={Youtube} platformColor="text-red-500" size="compact" />
                <StatDisplayCard title="Total Views" value={youtubeSummary.totalViews} icon={Eye} platformColor="text-red-500" size="compact" />
                <StatDisplayCard title="Total Likes" value={youtubeSummary.totalLikes} icon={ThumbsUp} platformColor="text-red-500" size="compact" />
                <StatDisplayCard title="Total Comments" value={youtubeSummary.totalComments} icon={MessageSquare} platformColor="text-red-500" size="compact" />
              </CardContent>
            </Card>
          )}

          {instagramSummary && (
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <InstagramIcon className="h-7 w-7 text-pink-600" />
                  <CardTitle className="text-2xl font-semibold">Instagram Reels Summary (All Time)</CardTitle>
                </div>
                <CardDescription>{instagramSummary.totalReels} reel(s) analyzed.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                 <StatDisplayCard title="Total Reels" value={instagramSummary.totalReels} icon={InstagramIcon} platformColor="text-pink-500" size="compact" />
                <StatDisplayCard title="Total Plays" value={instagramSummary.totalPlays} icon={PlayCircle} platformColor="text-pink-500" size="compact" />
                <StatDisplayCard title="Total Likes" value={instagramSummary.totalLikes} icon={ThumbsUp} platformColor="text-pink-500" size="compact" />
                <StatDisplayCard title="Total Comments" value={instagramSummary.totalComments} icon={MessageSquare} platformColor="text-pink-500" size="compact" />
              </CardContent>
            </Card>
          )}
        </div>

        
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <Filter className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl font-semibold">Daily Performance Trends</CardTitle>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                              <CalendarDays className="mr-2 h-4 w-4" />
                              {dateRange.from ? format(dateRange.from, "PPP") : <span>Pick start date</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                          <Calendar mode="single" selected={dateRange.from} onSelect={(day) => setDateRange(prev => ({...prev, from: day ? startOfDay(day) : undefined}))} disabled={(date) => date > (dateRange.to || new Date()) || date > new Date()} initialFocus />
                      </PopoverContent>
                  </Popover>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                              <CalendarDays className="mr-2 h-4 w-4" />
                              {dateRange.to ? format(dateRange.to, "PPP") : <span>Pick end date</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                          <Calendar mode="single" selected={dateRange.to} onSelect={(day) => setDateRange(prev => ({...prev, to: day ? endOfDay(day) : undefined}))} disabled={(date) => date < (dateRange.from || new Date(0)) || date > new Date()} initialFocus />
                      </PopoverContent>
                  </Popover>
              </div>
            </div>
            <CardDescription>Select a date range to view daily trends for YouTube and Instagram based on when stats were last refreshed.</CardDescription>
          </CardHeader>
          <CardContent>
            {isChartDataLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Processing daily data...</p>
              </div>
            ) : (
              <div className="space-y-8">
                <DailyPerformanceChart
                  data={dailyYouTubeChartData}
                  metrics={[
                    { key: 'views', name: 'Total Views (on refresh date)', color: 'hsl(var(--chart-1))', icon: Eye },
                    { key: 'likes', name: 'Total Likes (on refresh date)', color: 'hsl(var(--chart-2))', icon: ThumbsUp },
                    { key: 'comments', name: 'Total Comments (on refresh date)', color: 'hsl(var(--chart-3))', icon: MessageSquare },
                  ]}
                  xAxisDataKey="date"
                  title="YouTube Daily Aggregated Stats"
                  platformIcon={Youtube}
                  isLoading={isChartDataLoading}
                  error={null} 
                />
                <DailyPerformanceChart
                  data={dailyInstagramChartData}
                  metrics={[
                    { key: 'plays', name: 'Total Plays (on refresh date)', color: 'hsl(var(--chart-1))', icon: PlayCircle },
                    { key: 'likes', name: 'Total Likes (on refresh date)', color: 'hsl(var(--chart-2))', icon: ThumbsUp },
                    { key: 'comments', name: 'Total Comments (on refresh date)', color: 'hsl(var(--chart-3))', icon: MessageSquare },
                    { key: 'reshares', name: 'Total Reshares (on refresh date)', color: 'hsl(var(--chart-4))', icon: Share2 }, 
                  ]}
                  xAxisDataKey="date"
                  title="Instagram Reels Daily Aggregated Stats"
                  platformIcon={InstagramIcon}
                  isLoading={isChartDataLoading}
                  error={null}
                />
              </div>
            )}
             {(!isChartDataLoading && dailyYouTubeChartData.length === 0 && dailyInstagramChartData.length === 0 && dateRange.from && dateRange.to) && (
                <p className="text-center text-muted-foreground py-6">No data available for the selected date range, or no content was refreshed during this period.</p>
            )}
             {(!dateRange.from || !dateRange.to) && (
                <p className="text-center text-muted-foreground py-6">Please select a date range to view daily trends.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
