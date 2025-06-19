
"use client";

import type { YouTubeVideo } from '@/lib/mockData';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { ThumbsUp, MessageSquare, Eye, CalendarDays, Link as LinkIcon, FileText, Wand2, Loader2 as SpinnerIcon } from 'lucide-react'; // Added FileText/Wand2, SpinnerIcon
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'; // Added Dialog components
import React, { useState } from 'react';
import { fetchYouTubeComments, type YouTubeComment } from '@/ai/flows/fetch-youtube-comments-flow';
import { analyzeVideoText, type VideoTextAnalysisOutput } from '@/ai/flows/analyze-video-text-flow'; // Added NLP flow
import CommentDisplay from './CommentDisplay';
import NLPReportDisplay from './NLPReportDisplay'; // Added NLP Report Display
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast'; // For error notifications

interface YouTubeCardProps {
  video: YouTubeVideo;
}

const YouTubeCard: React.FC<YouTubeCardProps> = ({ video }) => {
  const [isCommentsPopoverOpen, setIsCommentsPopoverOpen] = useState(false);
  const [commentsData, setCommentsData] = useState<YouTubeComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [nlpAnalysisResult, setNlpAnalysisResult] = useState<VideoTextAnalysisOutput | null>(null);
  const [isNlpLoading, setIsNlpLoading] = useState(false);
  const [nlpError, setNlpError] = useState<string | null>(null);
  const { toast } = useToast();

  const ensureCommentsFetched = async (): Promise<YouTubeComment[]> => {
    if (commentsData.length > 0 && !commentsError) {
      return commentsData;
    }
    if (!video.id) {
      setCommentsError("Video ID is missing for fetching comments.");
      throw new Error("Video ID is missing for fetching comments.");
    }
    setIsCommentsLoading(true);
    setCommentsError(null);
    try {
      const result = await fetchYouTubeComments({ videoId: video.id });
      setCommentsData(result.comments);
      setIsCommentsLoading(false);
      return result.comments;
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      const newError = error.message || "Failed to load comments.";
      setCommentsError(newError);
      setCommentsData([]);
      setIsCommentsLoading(false);
      throw new Error(newError); // Re-throw for NLP flow to catch
    }
  };


  const handleFetchCommentsForPopover = async () => {
    if (!video.id) {
      setCommentsError("Video ID is missing.");
      return;
    }
    // Only fetch if not already loading and no data/error yet
    if (!isCommentsLoading && (commentsData.length === 0 || commentsError)) {
      await ensureCommentsFetched().catch(() => { /* Error handled by ensureCommentsFetched */ });
    }
  };
  
  const handleAnalyzeText = async () => {
    if (!video.id || !video.title) {
      setNlpError("Video details (ID, Title) are missing.");
      toast({ title: "Analysis Error", description: "Video details are incomplete.", variant: "destructive" });
      return;
    }
    setIsNlpLoading(true);
    setNlpError(null);
    setNlpAnalysisResult(null);

    try {
      // Ensure comments are fetched first
      const currentComments = await ensureCommentsFetched();
      
      const analysisInput = {
        videoId: video.id,
        title: video.title,
        description: video.description || "", // Assuming video might have a description field
        comments: currentComments,
      };
      const result = await analyzeVideoText(analysisInput);
      setNlpAnalysisResult(result);
    } catch (error: any) {
      console.error("Error analyzing video text:", error);
      const analysisError = error.message || "Failed to analyze video content.";
      setNlpError(analysisError);
      toast({ title: "NLP Analysis Failed", description: analysisError, variant: "destructive" });
    } finally {
      setIsNlpLoading(false);
    }
  };


  const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl hover:scale-105 transition-shadow transition-transform duration-300 flex flex-col">
      <CardHeader className="p-0">
        <div className="aspect-video relative">
          <Image
            src={video.thumbnailUrl || `https://placehold.co/320x180.png?text=${video.id || 'Video'}`}
            alt={video.title || 'YouTube video'}
            layout="fill"
            objectFit="cover"
            data-ai-hint="video thumbnail"
            unoptimized={!!video.thumbnailUrl?.includes('i.ytimg.com')}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
          aria-label={`Watch video: ${video.title || 'Untitled Video'}`}
        >
          <CardTitle className="text-base font-semibold mb-1 leading-tight line-clamp-2">
            {video.title || "Untitled Video"}
          </CardTitle>
        </a>
        <div className="flex items-center text-xs text-muted-foreground mt-1 mb-2">
          <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-accent" />
          <span>
            {video.publishedAt && new Date(video.publishedAt).getFullYear() > 1970
              ? formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })
              : 'Date N/A'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mt-2">
          <div className="flex items-center">
            <Eye className="h-4 w-4 mr-1.5 text-primary" />
            {video.views?.toLocaleString() || '0'}
          </div>
          <div className="flex items-center">
            <ThumbsUp className="h-4 w-4 mr-1.5 text-green-500" />
            {video.likes?.toLocaleString() || '0'}
          </div>

          <Popover open={isCommentsPopoverOpen} onOpenChange={(open) => {
            setIsCommentsPopoverOpen(open);
            if (open) {
              handleFetchCommentsForPopover();
            }
          }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="flex items-center p-0 h-auto justify-start hover:bg-transparent text-muted-foreground hover:text-blue-600 focus-visible:ring-offset-0 focus-visible:ring-0">
                <MessageSquare className="h-4 w-4 mr-1.5 text-blue-500" />
                {video.comments?.toLocaleString() || '0'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-96" side="bottom" align="start">
              <CommentDisplay
                comments={commentsData}
                isLoading={isCommentsLoading}
                error={commentsError}
                onRetry={handleFetchCommentsForPopover}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
      <CardFooter className="p-3 border-t bg-muted/30 flex items-center justify-between">
         <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-xs text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-ring rounded-sm"
          aria-label={`Open video on YouTube: ${video.title || 'Untitled Video'}`}
        >
          <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
          Watch on YouTube
        </a>
        
        <Dialog open={isAnalysisDialogOpen} onOpenChange={(open) => {
          setIsAnalysisDialogOpen(open);
          if (open && !nlpAnalysisResult && !isNlpLoading && !nlpError) { // Auto-fetch on open if not already loaded/loading
             handleAnalyzeText();
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              Analyze Text
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>NLP Analysis Report</DialogTitle>
              <DialogDescription>
                Insights for video: "{video.title || 'Untitled Video'}"
              </DialogDescription>
            </DialogHeader>
            <NLPReportDisplay 
              analysisResult={nlpAnalysisResult}
              isLoading={isNlpLoading}
              error={nlpError}
            />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

export default YouTubeCard;

