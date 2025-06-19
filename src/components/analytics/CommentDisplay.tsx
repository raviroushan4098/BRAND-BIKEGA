
"use client";

import type { YouTubeComment } from '@/ai/flows/fetch-youtube-comments-flow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MessageCircleWarning, RefreshCw } from 'lucide-react';

interface CommentDisplayProps {
  comments: YouTubeComment[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

const CommentDisplay: React.FC<CommentDisplayProps> = ({ comments, isLoading, error, onRetry }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-4 h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center h-48">
        <MessageCircleWarning className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-destructive mb-1">Error loading comments</p>
        <p className="text-xs text-muted-foreground mb-3">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-3 w-3" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground h-48 flex items-center justify-center">
        No comments yet, or comments are disabled for this video.
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1]?.[0] || names[0][1] || ''}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };


  return (
    <div className="p-1">
      <h4 className="text-md font-semibold mb-3 px-1">Comments</h4>
      <ScrollArea className="h-[280px] pr-3"> {/* Max height for scroll */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start space-x-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.authorProfileImageUrl} alt={comment.authorDisplayName} data-ai-hint="profile avatar"/>
                <AvatarFallback>{getInitials(comment.authorDisplayName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">
                    {comment.authorDisplayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.publishedAt), { addSuffix: true })}
                  </p>
                </div>
                {/* Using dangerouslySetInnerHTML for YouTube's HTML formatted comments. Ensure this is safe if source changes. */}
                <p
                  className="text-xs text-muted-foreground mt-0.5"
                  dangerouslySetInnerHTML={{ __html: comment.textDisplay }}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Likes: {comment.likeCount} | Replies: {comment.totalReplyCount}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CommentDisplay;
