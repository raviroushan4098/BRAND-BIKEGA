
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
      console.warn("[fetchInstagramReelStatsFlow] RapidAPI-Instagram-Scraper API key not found in Firestore.");
      return null;
    }
    const apiKeyData = snapshot.docs[0].data();
    if (!apiKeyData.keyValue) {
        console.warn("[fetchInstagramReelStatsFlow] RapidAPI-Instagram-Scraper API key value is missing in Firestore document.");
        return null;
    }
    console.log("[fetchInstagramReelStatsFlow] Successfully fetched RapidAPI-Instagram-Scraper API key.");
    return apiKeyData.keyValue as string;
  } catch (error) {
    console.error("[fetchInstagramReelStatsFlow] Error fetching RapidAPI-Instagram-Scraper API key from Firestore:", error);
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
  if (!url) {
    console.warn("[fetchInstagramReelStatsFlow] extractShortcodeFromUrl: Input URL is empty.");
    return null;
  }
  try {
    const urlObj = new URL(url);
    // Regex to find shortcode after /p/, /reel/, or /reels/
    const regex = /\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/;
    const match = urlObj.pathname.match(regex);
    if (match && match[1]) {
      console.log(`[fetchInstagramReelStatsFlow] Extracted shortcode: ${match[1]} from URL: ${url}`);
      return match[1];
    }
    console.warn(`[fetchInstagramReelStatsFlow] Could not extract shortcode from URL: ${url} using regex.`);
  } catch (e) {
    console.error(`[fetchInstagramReelStatsFlow] Error parsing URL for shortcode: ${url}`, e);
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
    console.log(`[fetchInstagramReelStatsFlow] Starting flow for URL: ${reelUrl}`);

    const apiKey = await getRapidApiInstagramKey();
    if (!apiKey) {
      console.error("[fetchInstagramReelStatsFlow] RapidAPI key is not configured. Aborting.");
      return {
        shortcode: '',
        originalUrl: reelUrl,
        fetchedSuccessfully: false,
        errorMessage: 'RapidAPI key for Instagram scraper is not configured.',
      };
    }

    const shortcode = extractShortcodeFromUrl(reelUrl);
    if (!shortcode) {
      console.error(`[fetchInstagramReelStatsFlow] Could not extract shortcode from URL: ${reelUrl}. Aborting.`);
      return {
        shortcode: '',
        originalUrl: reelUrl,
        fetchedSuccessfully: false,
        errorMessage: `Could not extract shortcode from URL: ${reelUrl}`,
      };
    }

    const apiUrl = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/post?shortcode=${shortcode}`;
    console.log(`[fetchInstagramReelStatsFlow] Constructed API URL for shortcode ${shortcode}: ${apiUrl}`);
    const headers = {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
      'Host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com'
    };
    console.log("[fetchInstagramReelStatsFlow] Request Headers:", headers);

    try {
      console.log(`[fetchInstagramReelStatsFlow] Making API request for shortcode ${shortcode}...`);
      const response = await fetch(apiUrl, { method: 'GET', headers });
      console.log(`[fetchInstagramReelStatsFlow] API response status for ${shortcode}: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[fetchInstagramReelStatsFlow] RapidAPI Error for ${shortcode} (${response.status}): ${errorBody.substring(0, 500)}...`);
        return {
          shortcode,
          originalUrl: reelUrl,
          fetchedSuccessfully: false,
          errorMessage: `API request failed with status ${response.status}. Details: ${errorBody.substring(0, 200)}`,
        };
      }

      const responseData = await response.json();
      console.log(`[fetchInstagramReelStatsFlow] Parsed API response data for ${shortcode}:`, JSON.stringify(responseData, null, 2).substring(0,1000) + '...'); // Log a snippet
      
      const postData = responseData?.data?.[0]; 
      console.log(`[fetchInstagramReelStatsFlow] Extracted postData for ${shortcode}:`, postData ? JSON.stringify(postData, null, 2).substring(0,1000) + '...' : 'postData is undefined/null');


      if (!postData) {
         console.error(`[fetchInstagramReelStatsFlow] Unexpected API response structure for ${shortcode}. Post data not found.`);
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
      console.log(`[fetchInstagramReelStatsFlow] Extracted caption for ${shortcode}:`, captionText);

      let postedAtISO: string | undefined = undefined;
      if (postData.taken_at_timestamp) {
        try {
          postedAtISO = new Date(postData.taken_at_timestamp * 1000).toISOString();
        } catch (e) {
          console.warn(`[fetchInstagramReelStatsFlow] Could not parse timestamp for ${shortcode}: ${postData.taken_at_timestamp}`);
        }
      }
      console.log(`[fetchInstagramReelStatsFlow] Extracted postedAt (ISO) for ${shortcode}:`, postedAtISO);

      const commentCount = Number(postData.comment_count) || 0;
      const likeCount = Number(postData.like_count) || 0;
      const playCount = Number(postData.play_count) || Number(postData.video_view_count) || 0;
      const thumbnailUrl = postData.display_url;
      const username = postData.owner?.username;

      console.log(`[fetchInstagramReelStatsFlow] Final extracted stats for ${shortcode}:
        - Comment Count: ${commentCount}
        - Like Count: ${likeCount}
        - Play Count: ${playCount}
        - Thumbnail URL: ${thumbnailUrl}
        - Username: ${username}`);
      
      return {
        shortcode,
        originalUrl: reelUrl,
        commentCount,
        likeCount,
        playCount,
        caption: captionText,
        thumbnailUrl,
        username,
        postedAt: postedAtISO,
        fetchedSuccessfully: true,
      };

    } catch (error: any) {
      console.error(`[fetchInstagramReelStatsFlow] Error fetching stats for shortcode ${shortcode}:`, error);
      return {
        shortcode,
        originalUrl: reelUrl,
        fetchedSuccessfully: false,
        errorMessage: error.message || 'An unknown error occurred while fetching reel stats.',
      };
    }
  }
);

