
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
  console.log("[fetchInstagramReelStatsFlow] Attempting to fetch RapidAPI-Instagram-Scraper API key...");
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
  console.log(`[fetchInstagramReelStatsFlow] Attempting to extract shortcode from URL: ${url}`);
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
        const errorBodyText = await response.text();
        let detailedErrorMessage = `API request failed with status ${response.status}. Raw: ${errorBodyText.substring(0, 150)}`;
        try {
            const errorJson = JSON.parse(errorBodyText);
            if (errorJson && errorJson.error) {
                detailedErrorMessage = `${errorJson.error} (Status ${response.status})`;
            }
        } catch (e) {
            // JSON parsing failed, stick with the raw message with status
            console.warn(`[fetchInstagramReelStatsFlow] Could not parse error body as JSON for ${shortcode}: ${errorBodyText.substring(0,100)}`);
        }
        console.error(`[fetchInstagramReelStatsFlow] RapidAPI Error for ${shortcode} (${response.status}): ${errorBodyText.substring(0, 500)}...`);
        console.log(`[fetchInstagramReelStatsFlow] Returning error object for shortcode ${shortcode} due to API error.`);
        return {
          shortcode,
          originalUrl: reelUrl,
          fetchedSuccessfully: false,
          errorMessage: detailedErrorMessage,
        };
      }

      const responseData = await response.json();
      console.log(`[fetchInstagramReelStatsFlow] Parsed API response data for ${shortcode}:`, JSON.stringify(responseData, null, 2).substring(0,1000) + '...');
      
      // Directly use responseData as postData based on new sample
      const postData = responseData; 

      if (!postData) { // Should not happen if response.ok and response.json() succeeded
         console.error(`[fetchInstagramReelStatsFlow] API response parsed but was unexpectedly empty for ${shortcode}.`);
         return {
            shortcode,
            originalUrl: reelUrl,
            fetchedSuccessfully: false,
            errorMessage: 'API response parsed but was unexpectedly empty.',
         };
      }
      
      const captionText = postData.caption?.text;
      console.log(`[fetchInstagramReelStatsFlow] Extracted caption for ${shortcode}:`, captionText ? captionText.substring(0,50) + "..." : "undefined");

      let postedAtISO: string | undefined = undefined;
      if (postData.taken_at) { // Unix timestamp in seconds
        try {
          postedAtISO = new Date(postData.taken_at * 1000).toISOString();
        } catch (e) {
          console.warn(`[fetchInstagramReelStatsFlow] Could not parse timestamp for ${shortcode}: ${postData.taken_at}`);
        }
      }
      console.log(`[fetchInstagramReelStatsFlow] Extracted postedAt (ISO) for ${shortcode}:`, postedAtISO);

      const commentCount = Number(postData.comment_count) || 0;
      const likeCount = Number(postData.like_count) || 0;
      const playCount = Number(postData.play_count) || 0;
      const thumbnailUrl = postData.image_versions2?.candidates?.[0]?.url; // Taking the first candidate
      const username = postData.user?.username;

      console.log(`[fetchInstagramReelStatsFlow] Final extracted stats for ${shortcode}:
        - Comment Count: ${commentCount}
        - Like Count: ${likeCount}
        - Play Count: ${playCount}
        - Thumbnail URL: ${thumbnailUrl ? thumbnailUrl.substring(0,50) + "..." : "undefined"}
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

