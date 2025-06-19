
import type { YouTubeVideo } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { ThumbsUp, MessageSquare, Share2, Eye } from 'lucide-react';

interface YouTubeCardProps {
  video: YouTubeVideo;
}

const YouTubeCard: React.FC<YouTubeCardProps> = ({ video }) => {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0">
        <div className="aspect-video relative">
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint="video thumbnail"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-lg font-semibold mb-1 truncate" title={video.title}>
          {video.title}
        </CardTitle>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Eye className="h-4 w-4 mr-1.5 text-primary" />
            {video.views.toLocaleString()} views
          </div>
          <div className="flex items-center">
            <ThumbsUp className="h-4 w-4 mr-1.5 text-green-500" />
            {video.likes.toLocaleString()} likes
          </div>
          <div className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-1.5 text-blue-500" />
            {video.comments.toLocaleString()} comments
          </div>
          <div className="flex items-center">
            <Share2 className="h-4 w-4 mr-1.5 text-purple-500" />
            {video.shares.toLocaleString()} shares
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default YouTubeCard;
