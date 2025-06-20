
import type { StoredInstagramPost } from '@/lib/instagramPostAnalyticsService'; // Updated import
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Heart, MessageCircle, CalendarDays, PlayCircle } from 'lucide-react'; // Added PlayCircle
import { formatDistanceToNow, parseISO, isValid as isValidDate } from 'date-fns';
import Link from 'next/link';

interface InstagramCardProps {
  post: StoredInstagramPost;
}

const InstagramCard: React.FC<InstagramCardProps> = ({ post }) => {
  
  let timeAgo = 'Date N/A';
  if (post.postedAt) {
    const parsedDate = parseISO(post.postedAt);
    if (isValidDate(parsedDate)) {
      timeAgo = formatDistanceToNow(parsedDate, { addSuffix: true });
    }
  } else if (post.lastFetched) {
     const parsedDate = parseISO(post.lastFetched);
    if (isValidDate(parsedDate)) {
      timeAgo = `Fetched ${formatDistanceToNow(parsedDate, { addSuffix: true })}`;
    }
  }
  
  const placeholderImage = `https://placehold.co/300x300.png?text=Reel+${post.id.substring(0,5)}`;

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl hover:scale-105 transition-shadow transition-transform duration-300 flex flex-col">
      <CardHeader className="p-0">
        <Link href={post.reelUrl || '#'} target="_blank" rel="noopener noreferrer" className="block aspect-square relative focus:outline-none focus:ring-2 focus:ring-ring rounded-t-lg">
          <Image
            src={post.thumbnailUrl || placeholderImage}
            alt={post.caption || `Instagram post ${post.id}`}
            layout="fill"
            data-ai-hint="social media post"
            className="rounded-t-lg object-cover"
            unoptimized={!!post.thumbnailUrl?.includes('cdninstagram')} // Consider if RapidAPI URLs need unoptimization
          />
        </Link>
      </CardHeader>
      <CardContent className="p-3 flex-grow">
        <p className="text-xs text-muted-foreground mb-1.5 h-10 overflow-hidden line-clamp-2" title={post.caption || "No caption available"}>
          {post.caption || <span className="italic">No caption available</span>}
        </p>
        {post.username && <p className="text-xs font-medium text-primary truncate mb-1.5">@{post.username}</p>}
        
        <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
          <div className="flex items-center" title="Likes">
            <Heart className="h-3.5 w-3.5 mr-1 text-red-500" />
            {(post.likes || 0).toLocaleString()}
          </div>
          <div className="flex items-center" title="Comments">
            <MessageCircle className="h-3.5 w-3.5 mr-1 text-blue-500" />
            {(post.comments || 0).toLocaleString()}
          </div>
          <div className="flex items-center" title="Plays">
            <PlayCircle className="h-3.5 w-3.5 mr-1 text-green-500" />
            {(post.playCount || 0).toLocaleString()}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3 border-t bg-muted/30">
        <div className="flex items-center text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3 mr-1.5 text-accent" />
          {timeAgo}
        </div>
      </CardFooter>
       {post.errorMessage && (
        <CardFooter className="p-2 border-t bg-destructive/10 text-destructive text-xs">
            Error: {post.errorMessage.length > 50 ? post.errorMessage.substring(0,47) + '...' : post.errorMessage}
        </CardFooter>
      )}
    </Card>
  );
};

export default InstagramCard;
