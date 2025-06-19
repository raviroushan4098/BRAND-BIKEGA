
'use server';
/**
 * @fileOverview A Genkit flow to fetch comments for a YouTube video.
 *
 * - fetchYouTubeComments - An exported function to invoke the flow.
 * - FetchYouTubeCommentsInput - The Zod schema for the input (videoId).
 * - FetchYouTubeCommentsOutput - The Zod schema for the output (array of comments).
 * - YouTubeComment - Interface for a single comment structure.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

// Define the structure for a single comment
export interface YouTubeComment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  publishedAt: string; // ISO string
  likeCount: number;
  totalReplyCount: number;
}

// Zod schema for individual comments, matching the YouTubeComment interface
const YouTubeCommentSchema = z.object({
  id: z.string(),
  authorDisplayName: z.string(),
  authorProfileImageUrl: z.string().url(),
  textDisplay: z.string(),
  publishedAt: z.string(), 
  likeCount: z.number(),
  totalReplyCount: z.number(),
});

// Zod schema for the flow input
const FetchYouTubeCommentsInputSchema = z.object({
  videoId: z.string().min(1, "Video ID is required."),
});
export type FetchYouTubeCommentsInput = z.infer<typeof FetchYouTubeCommentsInputSchema>;

// Zod schema for the flow output
const FetchYouTubeCommentsOutputSchema = z.object({
  comments: z.array(YouTubeCommentSchema),
});
export type FetchYouTubeCommentsOutput = z.infer<typeof FetchYouTubeCommentsOutputSchema>;


// Helper function to get API key from Firestore (copied from fetch-youtube-details-flow.ts)
async function getYouTubeApiKeyFromFirestore(): Promise<string | null> {
  try {
    const keysRef = collection(db, 'apiKeys');
    const q = query(keysRef, where('serviceName', '==', 'youtube'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.warn("YouTube API key not found in Firestore for comment fetching.");
      return null;
    }
    const apiKeyData = snapshot.docs[0].data();
    if (!apiKeyData.keyValue) {
        console.warn("YouTube API key value is missing in Firestore document for comment fetching.");
        return null;
    }
    return apiKeyData.keyValue as string;
  } catch (error) {
    console.error("Error fetching YouTube API key from Firestore for comment fetching:", error);
    return null;
  }
}

// Main exported function to call the flow
export async function fetchYouTubeComments(input: FetchYouTubeCommentsInput): Promise<FetchYouTubeCommentsOutput> {
  return fetchYouTubeCommentsFlow(input);
}

interface YouTubeCommentThreadSnippet {
  topLevelComment: {
    kind: string;
    etag: string;
    id: string;
    snippet: {
      authorDisplayName: string;
      authorProfileImageUrl: string;
      authorChannelUrl: string;
      authorChannelId: { value: string };
      videoId: string;
      textDisplay: string;
      textOriginal: string;
      parentId?: string;
      canRate: boolean;
      viewerRating: string;
      likeCount: number;
      moderationStatus?: string;
      publishedAt: string; // "2024-03-09T06:02:03Z"
      updatedAt: string;   // "2024-03-09T06:02:03Z"
    };
  };
  canReply: boolean;
  totalReplyCount: number;
  isPublic: boolean;
}

interface YouTubeCommentThreadItem {
  kind: string;
  etag: string;
  id: string; // CommentThread ID
  snippet: YouTubeCommentThreadSnippet;
}

interface YouTubeCommentThreadApiResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeCommentThreadItem[];
}

// The Genkit flow definition
const fetchYouTubeCommentsFlow = ai.defineFlow(
  {
    name: 'fetchYouTubeCommentsFlow',
    inputSchema: FetchYouTubeCommentsInputSchema,
    outputSchema: FetchYouTubeCommentsOutputSchema,
  },
  async ({ videoId }) => {
    const apiKey = await getYouTubeApiKeyFromFirestore();
    if (!apiKey) {
      throw new Error('YouTube API key is not configured or could not be retrieved for comment fetching.');
    }

    // Max 10 comments, ordered by relevance
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${apiKey}&maxResults=10&order=relevance`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('YouTube API Error (CommentThreads):', errorData);
        throw new Error(`YouTube API request for comments failed with status ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const data = (await response.json()) as YouTubeCommentThreadApiResponse;
      
      const comments: YouTubeComment[] = data.items.map(item => ({
        id: item.snippet.topLevelComment.id,
        authorDisplayName: item.snippet.topLevelComment.snippet.authorDisplayName,
        authorProfileImageUrl: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
        textDisplay: item.snippet.topLevelComment.snippet.textDisplay,
        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
        likeCount: item.snippet.topLevelComment.snippet.likeCount,
        totalReplyCount: item.snippet.totalReplyCount,
      }));
      
      return { comments };

    } catch (error: any) {
      console.error('Error fetching/processing comments from YouTube API:', error);
      throw new Error(`Failed to fetch comments: ${error.message || 'Unknown API error'}`);
    }
  }
);
