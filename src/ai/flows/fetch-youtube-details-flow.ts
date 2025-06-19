
'use server';
/**
 * @fileOverview A Genkit flow to fetch detailed information for a list of YouTube video IDs.
 *
 * - fetchYouTubeDetails - An exported function to invoke the flow.
 * - FetchYouTubeDetailsInput - The Zod schema for the input (array of video IDs).
 * - FetchYouTubeDetailsOutput - The Zod schema for the output (array of video details).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod'; // Changed from 'genkit/zod'
import { getVideoStatistics } from '@/lib/youtubeApiService';
import type { YouTubeVideo } from '@/lib/mockData'; // Using for structure
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

const YouTubeVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  thumbnailUrl: z.string(),
  views: z.number().optional().default(0), // Made optional with default for robustness
  likes: z.number().optional().default(0),
  comments: z.number().optional().default(0),
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
    // Do not throw here, let the flow handle the null key
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
      // If API key is critical and not found, throw an error or return empty videos
      // For now, let's throw an error so the calling function knows.
      throw new Error('YouTube API key is not configured or could not be retrieved.');
    }

    // The getVideoStatistics function from youtubeApiService returns Partial<YouTubeVideo>[]
    // We need to ensure the objects conform to YouTubeVideoSchema for the output.
    const fetchedVideosData = await getVideoStatistics(videoIds, apiKey);
    
    const validatedVideos: z.infer<typeof YouTubeVideoSchema>[] = [];
    for (const videoData of fetchedVideosData) {
        // Ensure data conforms to schema, providing defaults for missing optional fields
        const video: z.infer<typeof YouTubeVideoSchema> = {
            id: videoData.id || 'unknown_id', // Provide fallback for zod validation
            title: videoData.title || 'Untitled Video',
            thumbnailUrl: videoData.thumbnailUrl || 'https://placehold.co/320x180.png?text=No+Thumbnail',
            views: videoData.views || 0,
            likes: videoData.likes || 0,
            comments: videoData.comments || 0,
        };
        validatedVideos.push(video);
    }
    
    return { videos: validatedVideos };
  }
);

