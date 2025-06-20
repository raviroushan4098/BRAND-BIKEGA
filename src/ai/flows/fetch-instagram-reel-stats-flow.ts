
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

// Output Schema - Expanded
const InstagramReelStatsOutputSchema = z.object({
  shortcode: z.string(),
  originalUrl: z.string().url(),
  commentCount: z.number().optional().default(0),
  likeCount: z.number().optional().default(0),
  playCount: z.number().optional().default(0),
  caption: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  username: z.string().optional(),
  postedAt: z.string().optional(), // ISO string
  fetchedSuccessfully: z.boolean(),
  errorMessage: z.string().optional(),
});
export type InstagramReelStatsOutput = z.infer<typeof InstagramReelStatsOutputSchema>;

// Helper function to extract shortcode
function extractShortcodeFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    // Regex to find shortcode after /p/, /reel/, or /reels/
    const regex = /\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/;
    const match = urlObj.pathname.match(regex);
    if (match && match[1]) {
      return match[1];
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
      };
    }

    const shortcode = extractShortcodeFromUrl(reelUrl);
    if (!shortcode) {
      return {
        shortcode: '',
        originalUrl: reelUrl,
        fetchedSuccessfully: false,
        errorMessage: `Could not extract shortcode from URL: ${reelUrl}`,
      };
    }

    const apiUrl = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/post?shortcode=${shortcode}`;
    const headers = {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
      'Host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com' 
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
        };
      }

      const responseData = await response.json();
      const postData = responseData?.data?.[0]; 

      if (!postData) {
         console.error(`Unexpected API response structure for ${shortcode}:`, responseData);
         return {
            shortcode,
            originalUrl: reelUrl,
            fetchedSuccessfully: false,
            errorMessage: 'Unexpected API response structure. Post data not found.',
         };
      }
      
      let captionText: string | undefined = undefined;
      if (postData.edge_media_to_caption?.edges?.length > 0 && postData.edge_media_to_caption.edges[0].node?.text) {
        captionText = postData.edge_media_to_caption.edges[0].node.text;
      }

      let postedAtISO: string | undefined = undefined;
      if (postData.taken_at_timestamp) {
        try {
          postedAtISO = new Date(postData.taken_at_timestamp * 1000).toISOString();
        } catch (e) {
          console.warn(`Could not parse timestamp for ${shortcode}: ${postData.taken_at_timestamp}`);
        }
      }
      
      return {
        shortcode,
        originalUrl: reelUrl,
        commentCount: Number(postData.comment_count) || 0,
        likeCount: Number(postData.like_count) || 0,
        playCount: Number(postData.play_count) || Number(postData.video_view_count) || 0,
        caption: captionText,
        thumbnailUrl: postData.display_url, // Assuming display_url is the direct thumbnail URL
        username: postData.owner?.username,
        postedAt: postedAtISO,
        fetchedSuccessfully: true,
      };

    } catch (error: any) {
      console.error(`Error fetching stats for shortcode ${shortcode}:`, error);
      return {
        shortcode,
        originalUrl: reelUrl,
        fetchedSuccessfully: false,
        errorMessage: error.message || 'An unknown error occurred while fetching reel stats.',
      };
    }
  }
);

