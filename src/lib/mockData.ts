
export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  likes: number;
  comments: number;
  views: number;
  publishedAt: string; // Added
}

export interface InstagramPost {
  id: string;
  thumbnailUrl: string;
  likes: number;
  comments: number;
  timestamp: string; // ISO string
  caption: string;
}

export const mockYouTubeData: YouTubeVideo[] = [
  {
    id: 'vid1',
    title: 'My Awesome Gaming Montage',
    thumbnailUrl: 'https://placehold.co/320x180.png?text=Gaming+Montage',
    likes: 1200,
    comments: 345,
    views: 25000,
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  },
  {
    id: 'vid2',
    title: 'Ultimate Cooking Fails Compilation',
    thumbnailUrl: 'https://placehold.co/320x180.png?text=Cooking+Fails',
    likes: 850,
    comments: 210,
    views: 15000,
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  },
  {
    id: 'vid3',
    title: 'Travel Vlog: Exploring the Mountains',
    thumbnailUrl: 'https://placehold.co/320x180.png?text=Travel+Vlog',
    likes: 2500,
    comments: 500,
    views: 50000,
    publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
  },
  {
    id: 'vid4',
    title: 'Tech Review: Latest Smartphone',
    thumbnailUrl: 'https://placehold.co/320x180.png?text=Tech+Review',
    likes: 980,
    comments: 180,
    views: 18000,
    publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days ago
  },
];

export const mockInstagramData: InstagramPost[] = [
  {
    id: 'post1',
    thumbnailUrl: 'https://placehold.co/300x300.png?text=Insta+Post+1',
    likes: 560,
    comments: 85,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    caption: 'Beautiful sunset! #nature #travel #sunset',
  },
  {
    id: 'post2',
    thumbnailUrl: 'https://placehold.co/300x300.png?text=Insta+Post+2',
    likes: 720,
    comments: 120,
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    caption: 'Delicious food from my favorite cafe. #foodie #yum #instafood',
  },
  {
    id: 'post3',
    thumbnailUrl: 'https://placehold.co/300x300.png?text=Insta+Post+3',
    likes: 340,
    comments: 50,
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    caption: 'Workout session done! #fitness #healthylifestyle',
  },
  {
    id: 'post4',
    thumbnailUrl: 'https://placehold.co/300x300.png?text=Insta+Post+4',
    likes: 910,
    comments: 200,
    timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
    caption: 'Exploring new places. #adventure #wanderlust',
  },
];
