
'use server';
/**
 * @fileOverview A Genkit flow to fetch statistics for an Instagram Reel using a third-party API.
 *
 * - fetchInstagramReelStats - An exported function to invoke the flow.
 * - FetchInstagramReelStatsInput - The Zod schema for the input.
 * - InstagramReelStatsOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

// Helper to get API key from Firestore
async function getRapidApiInstagramKey(): Promise<string | null> {
  try {
    const keysRef = collection(db, 'apiKeys');
    const q = query(keysRef, where('serviceName', '==', 'RapidAPI-Instagram-Scraper'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.warn("RapidAPI-Instagram-Scraper API key not found in Firestore.");
      return null;
    }
    const apiKeyData = snapshot.docs[0].data();
    if (!apiKeyData.keyValue) {
        console.warn("RapidAPI-Instagram-Scraper API key value is missing in Firestore document.");
        return null;
    }
    return apiKeyData.keyValue as string;
  } catch (error) {
    console.error("Error fetching RapidAPI-Instagram-Scraper API key from Firestore:", error);
    return null;
  }
}

// Input Schema
const FetchInstagramReelStatsInputSchema = z.object({
  reelUrl: z.string().url("Must be a valid URL for the Instagram Reel."),
});
export type FetchInstagramReelStatsInput = z.infer<typeof FetchInstagramReelStatsInputSchema>;

// Output Schema
const InstagramReelStatsOutputSchema = z.object({
  shortcode: z.string(),
  commentCount: z.number().optional().default(0),
  likeCount: z.number().optional().default(0),
  playCount: z.number().optional().default(0), // Assuming 'views' maps to 'playCount'
  fetchedSuccessfully: z.boolean(),
  errorMessage: z.string().optional(),
  originalUrl: z.string().url(),
});
export type InstagramReelStatsOutput = z.infer<typeof InstagramReelStatsOutputSchema>;

// Helper function to extract shortcode
function extractShortcodeFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean); // Filter out empty strings

    const reelKeywords = ['reel', 'reels', 'p'];
    for (let i = 0; i < pathSegments.length; i++) {
      if (reelKeywords.includes(pathSegments[i]) && pathSegments[i+1]) {
        // The shortcode is usually the segment after "reel", "reels", or "p"
        // And it should not contain query parameters
        return pathSegments[i+1].split(/[?&]/)[0];
      }
    }
  } catch (e) {
    console.error("Error parsing URL for shortcode:", e);
    return null;
  }
  return null;
}

export async function fetchInstagramReelStats(input: FetchInstagramReelStatsInput): Promise<InstagramReelStatsOutput> {
  return fetchInstagramReelStatsFlow(input);
}

const fetchInstagramReelStatsFlow = ai.defineFlow(
  {
    name: 'fetchInstagramReelStatsFlow',
    inputSchema: FetchInstagramReelStatsInputSchema,
    outputSchema: InstagramReelStatsOutputSchema,
  },
  async ({ reelUrl }) => {
    const apiKey = await getRapidApiInstagramKey();
    if (!apiKey) {
      return {
        shortcode: '',
        originalUrl: reelUrl,
        fetchedSuccessfully: false,
        errorMessage: 'RapidAPI key for Instagram scraper is not configured.',
        commentCount: 0, likeCount: 0, playCount: 0,
      };
    }

    const shortcode = extractShortcodeFromUrl(reelUrl);
    if (!shortcode) {
      return {
        shortcode: '',
        originalUrl: reelUrl,
        fetchedSuccessfully: false,
        errorMessage: `Could not extract shortcode from URL: ${reelUrl}`,
        commentCount: 0, likeCount: 0, playCount: 0,
      };
    }

    const apiUrl = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/post?shortcode=${shortcode}`;
    const headers = {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
      'Host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com' // Explicitly adding Host header as per snippet
    };

    try {
      const response = await fetch(apiUrl, { method: 'GET', headers });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`RapidAPI Error for ${shortcode} (${response.status}): ${errorBody}`);
        return {
          shortcode,
          originalUrl: reelUrl,
          fetchedSuccessfully: false,
          errorMessage: `API request failed with status ${response.status}. Details: ${errorBody.substring(0, 200)}`,
          commentCount: 0, likeCount: 0, playCount: 0,
        };
      }

      // The API response seems to wrap the actual data in a "data" object
      // And the main data for the post is in the first element of an array `data[0]`
      // This structure is based on typical RapidAPI Instagram scraper responses.
      // Adjust if the actual API response structure is different.
      const responseData = await response.json();
      const postData = responseData?.data?.[0]; // Access the first post item if data is an array

      if (!postData) {
         console.error(`Unexpected API response structure for ${shortcode}:`, responseData);
         return {
            shortcode,
            originalUrl: reelUrl,
            fetchedSuccessfully: false,
            errorMessage: 'Unexpected API response structure. Post data not found.',
            commentCount: 0, likeCount: 0, playCount: 0,
         }
      }
      
      return {
        shortcode,
        originalUrl: reelUrl,
        commentCount: Number(postData.comment_count) || 0,
        likeCount: Number(postData.like_count) || 0,
        playCount: Number(postData.play_count) || Number(postData.video_view_count) || 0, // video_view_count is another common field for views
        fetchedSuccessfully: true,
      };

    } catch (error: any) {
      console.error(`Error fetching stats for shortcode ${shortcode}:`, error);
      return {
        shortcode,
        originalUrl: reelUrl,
        fetchedSuccessfully: false,
        errorMessage: error.message || 'An unknown error occurred while fetching reel stats.',
        commentCount: 0, likeCount: 0, playCount: 0,
      };
    }
  }
);
