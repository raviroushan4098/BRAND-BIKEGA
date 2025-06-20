
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3, Youtube, Instagram as InstagramIcon, AlertTriangle, Package, MessageSquare, ThumbsUp, Eye, PlayCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { StoredYouTubeVideo } from '@/lib/youtubeVideoAnalyticsService';
import { getAllVideoAnalyticsForUser } from '@/lib/youtubeVideoAnalyticsService';
import type { StoredInstagramPost } from '@/lib/instagramPostAnalyticsService';
import { getAllInstagramPostAnalyticsForUser } from '@/lib/instagramPostAnalyticsService';
import { toast } from '@/hooks/use-toast';

interface CombinedStats {
  totalContentPieces: number;
  totalCombinedLikes: number;
  totalCombinedComments: number;
  totalCombinedViewsPlays: number;
}

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

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`${titleSizeClass} font-semibold`}>{title}</CardTitle>
          <Icon className={`${iconSizeClass} ${platformColor || 'text-primary'}`} />
        </div>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <p className={`${valueSizeClass} font-bold`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </CardContent>
    </Card>
  );
};


export default function OverallAnalyticsPage() {
  const { user, isLoading: isAuthLoading } = useAuth(); 

  const [youtubeVideos, setYoutubeVideos] = useState<StoredYouTubeVideo[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<StoredInstagramPost[]>([]);

  const [combinedStats, setCombinedStats] = useState<CombinedStats | null>(null);
  const [youtubeSummary, setYoutubeSummary] = useState<YouTubeSummaryStats | null>(null);
  const [instagramSummary, setInstagramSummary] = useState<InstagramSummaryStats | null>(null);

  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

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

      setCombinedStats({
        totalContentPieces: youtubeVideos.length + instagramPosts.length,
        totalCombinedLikes: ytLikes + igLikes,
        totalCombinedComments: ytComments + igComments,
        totalCombinedViewsPlays: ytViews + igPlays,
      });
    } else {
        setYoutubeSummary(null);
        setInstagramSummary(null);
        setCombinedStats(null);
    }
  }, [youtubeVideos, instagramPosts]);

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

        {!combinedStats && !youtubeSummary && !instagramSummary && (
             <div className="text-center py-10">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-xl text-muted-foreground">No data found.</p>
                <p className="text-sm text-muted-foreground">Please ensure you have content tracked on YouTube and/or Instagram pages.</p>
            </div>
        )}

        {combinedStats && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Combined Totals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatDisplayCard title="Content Pieces" value={combinedStats.totalContentPieces} icon={Package} description="Videos + Reels" />
              <StatDisplayCard title="Views & Plays" value={combinedStats.totalCombinedViewsPlays} icon={Eye} description="YT Views + IG Plays" />
              <StatDisplayCard title="Likes" value={combinedStats.totalCombinedLikes} icon={ThumbsUp} description="YT Likes + IG Likes" />
              <StatDisplayCard title="Comments" value={combinedStats.totalCombinedComments} icon={MessageSquare} description="YT Comments + IG Comments" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {youtubeSummary && (
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Youtube className="h-7 w-7 text-red-600" />
                  <CardTitle className="text-2xl font-semibold">YouTube Summary</CardTitle>
                </div>
                <CardDescription>{youtubeSummary.totalVideos} video(s) analyzed.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
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
                  <CardTitle className="text-2xl font-semibold">Instagram Reels Summary</CardTitle>
                </div>
                <CardDescription>{instagramSummary.totalReels} reel(s) analyzed.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                 <StatDisplayCard title="Total Reels" value={instagramSummary.totalReels} icon={InstagramIcon} platformColor="text-pink-500" size="compact" />
                <StatDisplayCard title="Total Plays" value={instagramSummary.totalPlays} icon={PlayCircle} platformColor="text-pink-500" size="compact" />
                <StatDisplayCard title="Total Likes" value={instagramSummary.totalLikes} icon={ThumbsUp} platformColor="text-pink-500" size="compact" />
                <StatDisplayCard title="Total Comments" value={instagramSummary.totalComments} icon={MessageSquare} platformColor="text-pink-500" size="compact" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
