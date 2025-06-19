
'use server';
/**
 * @fileOverview A Genkit flow to fetch detailed information for a list of YouTube video IDs.
 *
 * - fetchYouTubeDetails - An exported function to invoke the flow.
 * - FetchYouTubeDetailsInput - The Zod schema for the input (array of video IDs).
 * - FetchYouTubeDetailsOutput - The Zod schema for the output (array of video details).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod'; 
import { getVideoStatistics } from '@/lib/youtubeApiService';
import type { YouTubeVideo } from '@/lib/mockData'; 
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

const YouTubeVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  thumbnailUrl: z.string(),
  views: z.number().optional().default(0),
  likes: z.number().optional().default(0),
  comments: z.number().optional().default(0),
  publishedAt: z.string(), // Added publishedAt, made required
});

const FetchYouTubeDetailsInputSchema = z.object({
  videoIds: z.array(z.string()).min(1, "At least one video ID is required."),
});
export type FetchYouTubeDetailsInput = z.infer<typeof FetchYouTubeDetailsInputSchema>;

const FetchYouTubeDetailsOutputSchema = z.object({
  videos: z.array(YouTubeVideoSchema),
});
export type FetchYouTubeDetailsOutput = z.infer<typeof FetchYouTubeDetailsOutputSchema>;


async function getYouTubeApiKeyFromFirestore(): Promise<string | null> {
  try {
    const keysRef = collection(db, 'apiKeys');
    const q = query(keysRef, where('serviceName', '==', 'youtube'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.warn("YouTube API key not found in Firestore.");
      return null;
    }
    const apiKeyData = snapshot.docs[0].data();
    if (!apiKeyData.keyValue) {
        console.warn("YouTube API key value is missing in Firestore document.");
        return null;
    }
    return apiKeyData.keyValue as string;
  } catch (error) {
    console.error("Error fetching YouTube API key from Firestore:", error);
    return null;
  }
}

export async function fetchYouTubeDetails(input: FetchYouTubeDetailsInput): Promise<FetchYouTubeDetailsOutput> {
  return fetchYouTubeDetailsFlow(input);
}

const fetchYouTubeDetailsFlow = ai.defineFlow(
  {
    name: 'fetchYouTubeDetailsFlow',
    inputSchema: FetchYouTubeDetailsInputSchema,
    outputSchema: FetchYouTubeDetailsOutputSchema,
  },
  async ({ videoIds }) => {
    const apiKey = await getYouTubeApiKeyFromFirestore();
    if (!apiKey) {
      throw new Error('YouTube API key is not configured or could not be retrieved.');
    }

    const fetchedVideosData = await getVideoStatistics(videoIds, apiKey);
    
    const validatedVideos: z.infer<typeof YouTubeVideoSchema>[] = [];
    for (const videoData of fetchedVideosData) {
        const video: z.infer<typeof YouTubeVideoSchema> = {
            id: videoData.id || 'unknown_id', 
            title: videoData.title || 'Untitled Video',
            thumbnailUrl: videoData.thumbnailUrl || 'https://placehold.co/320x180.png?text=No+Thumbnail',
            views: videoData.views || 0,
            likes: videoData.likes || 0,
            comments: videoData.comments || 0,
            publishedAt: videoData.publishedAt || new Date(0).toISOString(), // Default to epoch if missing
        };
        validatedVideos.push(video);
    }
    
    return { videos: validatedVideos };
  }
);
