
"use client";

import type { YouTubeVideo } from '@/lib/mockData';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { ThumbsUp, MessageSquare, Eye, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import React, { useState } from 'react';
import { fetchYouTubeComments, type YouTubeComment } from '@/ai/flows/fetch-youtube-comments-flow';
import CommentDisplay from './CommentDisplay';
import { Button } from '@/components/ui/button';

interface YouTubeCardProps {
  video: YouTubeVideo;
}

const YouTubeCard: React.FC<YouTubeCardProps> = ({ video }) => {
  const [isCommentsPopoverOpen, setIsCommentsPopoverOpen] = useState(false);
  const [commentsData, setCommentsData] = useState<YouTubeComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const handleFetchComments = async () => {
    if (!video.id) {
      setCommentsError("Video ID is missing.");
      return;
    }
    setIsCommentsLoading(true);
    setCommentsError(null);
    try {
      const result = await fetchYouTubeComments({ videoId: video.id });
      setCommentsData(result.comments);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      setCommentsError(error.message || "Failed to load comments.");
      setCommentsData([]);
    } finally {
      setIsCommentsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
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
        <CardTitle className="text-base font-semibold mb-1 leading-tight" title={video.title}>
          {video.title || "Untitled Video"}
        </CardTitle>
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
            if (open && commentsData.length === 0 && !isCommentsLoading && !commentsError) { // Fetch only if opening and no data/error yet
              handleFetchComments();
            }
          }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="flex items-center p-0 h-auto justify-start hover:bg-transparent text-muted-foreground hover:text-blue-600">
                <MessageSquare className="h-4 w-4 mr-1.5 text-blue-500" />
                {video.comments?.toLocaleString() || '0'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-96 overflow-y-auto" side="bottom" align="start">
              <CommentDisplay
                comments={commentsData}
                isLoading={isCommentsLoading}
                error={commentsError}
                onRetry={handleFetchComments}
              />
            </PopoverContent>
          </Popover>

        </div>
      </CardContent>
    </Card>
  );
};

export default YouTubeCard;
