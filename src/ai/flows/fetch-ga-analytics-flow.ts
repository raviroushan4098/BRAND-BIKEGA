
'use server';
/**
 * @fileOverview A Genkit flow to fetch campaign analytics from the Google Analytics Data API.
 *
 * - fetchCampaignAnalytics - An exported function to invoke the flow.
 * - FetchCampaignAnalyticsInput - The Zod schema for the input.
 * - CampaignAnalyticsOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Helper to get Google Analytics JSON credentials from Firestore
async function getGoogleAnalyticsCredentials(): Promise<any | null> {
  console.log("[fetchGaAnalyticsFlow] Attempting to fetch google-analytics API key...");
  try {
    const keysRef = collection(db, 'apiKeys');
    const q = query(keysRef, where('serviceName', '==', 'google-analytics'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.warn("[fetchGaAnalyticsFlow] google-analytics key not found in Firestore.");
      return null;
    }
    const apiKeyData = snapshot.docs[0].data();
    if (!apiKeyData.keyValue) {
        console.warn("[fetchGaAnalyticsFlow] google-analytics key value is missing in Firestore document.");
        return null;
    }
    console.log("[fetchGaAnalyticsFlow] Successfully fetched google-analytics key.");
    return JSON.parse(apiKeyData.keyValue); // Parse the stored JSON string
  } catch (error) {
    console.error("[fetchGaAnalyticsFlow] Error fetching or parsing google-analytics key from Firestore:", error);
    return null;
  }
}

// Input Schema for the flow
const FetchCampaignAnalyticsInputSchema = z.object({
  propertyId: z.string().min(1, "Google Analytics Property ID is required."),
  campaignName: z.string().min(1, "Campaign Name is required to filter analytics."),
});
export type FetchCampaignAnalyticsInput = z.infer<typeof FetchCampaignAnalyticsInputSchema>;

// Output Schema for the flow
const CampaignAnalyticsOutputSchema = z.object({
  totalUsers: z.number().default(0),
  sessions: z.number().default(0),
  conversions: z.number().default(0),
  bounceRate: z.number().default(0),
  averageSessionDuration: z.number().default(0), // in seconds
  error: z.string().optional(),
});
export type CampaignAnalyticsOutput = z.infer<typeof CampaignAnalyticsOutputSchema>;

// Main exported function to call the flow
export async function fetchCampaignAnalytics(input: FetchCampaignAnalyticsInput): Promise<CampaignAnalyticsOutput> {
  return fetchCampaignAnalyticsFlow(input);
}

const fetchCampaignAnalyticsFlow = ai.defineFlow(
  {
    name: 'fetchCampaignAnalyticsFlow',
    inputSchema: FetchCampaignAnalyticsInputSchema,
    outputSchema: CampaignAnalyticsOutputSchema,
  },
  async ({ propertyId, campaignName }) => {
    console.log(`[fetchCampaignAnalyticsFlow] Starting for campaign: ${campaignName}, property: ${propertyId}`);

    const credentials = await getGoogleAnalyticsCredentials();
    if (!credentials) {
      const errorMsg = "Google Analytics credentials are not configured in API Management.";
      console.error(`[fetchCampaignAnalyticsFlow] ${errorMsg}`);
      return {
        ...CampaignAnalyticsOutputSchema.parse({}),
        error: errorMsg,
      };
    }

    const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });

    try {
      const [response] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: '90daysAgo',
            endDate: 'today',
          },
        ],
        dimensions: [
          {
            name: 'campaignName',
          },
        ],
        metrics: [
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'conversions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'campaignName',
            stringFilter: {
              value: campaignName,
              matchType: 'EXACT',
            },
          },
        },
      });

      console.log(`[fetchCampaignAnalyticsFlow] GA API Response received for campaign ${campaignName}.`);

      if (!response.rows || response.rows.length === 0) {
        console.log(`[fetchCampaignAnalyticsFlow] No data returned from GA for campaign: ${campaignName}`);
        return CampaignAnalyticsOutputSchema.parse({}); // Return default zero values
      }

      // We expect only one row since we are filtering by a specific campaign name.
      const row = response.rows[0];
      const getMetricValue = (index: number) => (row.metricValues?.[index]?.value ? parseFloat(row.metricValues[index].value!) : 0);
      
      // The order of metrics matches the request.
      const analyticsData: CampaignAnalyticsOutput = {
        totalUsers: getMetricValue(0),
        sessions: getMetricValue(1),
        conversions: getMetricValue(2),
        bounceRate: getMetricValue(3),
        averageSessionDuration: getMetricValue(4),
      };

      console.log(`[fetchCampaignAnalyticsFlow] Parsed analytics data for ${campaignName}:`, analyticsData);
      return analyticsData;

    } catch (error: any) {
      console.error(`[fetchCampaignAnalyticsFlow] Error calling Google Analytics API:`, error);
      // Try to parse Google's specific error format
      const detail = error.errorDetails?.[0]?.errorInfo?.metadata?.detail || error.message || "An unknown error occurred.";
      return {
        ...CampaignAnalyticsOutputSchema.parse({}),
        error: `Failed to fetch from Google Analytics: ${detail}`,
      };
    }
  }
);
