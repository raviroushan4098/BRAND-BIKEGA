
import type { InstagramPost } from '@/lib/mockData';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Heart, MessageCircle, CalendarDays } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InstagramCardProps {
  post: InstagramPost;
}

const InstagramCard: React.FC<InstagramCardProps> = ({ post }) => {
  const timeAgo = formatDistanceToNow(new Date(post.timestamp), { addSuffix: true });

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl hover:scale-105 transition-shadow transition-transform duration-300">
      <CardHeader className="p-0">
        <div className="aspect-square relative">
          <Image
            src={post.thumbnailUrl}
            alt={`Instagram post ${post.id}`}
            layout="fill"
            objectFit="cover"
            data-ai-hint="social media post"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-2 h-10 overflow-hidden line-clamp-2" title={post.caption}>
          {post.caption || "No caption"}
        </p>
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex items-center">
            <Heart className="h-4 w-4 mr-1.5 text-red-500" />
            {post.likes.toLocaleString()}
          </div>
          <div className="flex items-center">
            <MessageCircle className="h-4 w-4 mr-1.5 text-blue-500" />
            {post.comments.toLocaleString()}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="flex items-center text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-accent" />
          {timeAgo}
        </div>
      </CardFooter>
    </Card>
  );
};

export default InstagramCard;
