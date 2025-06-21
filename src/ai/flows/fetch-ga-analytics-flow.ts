
'use server';
/**
 * @fileOverview A Genkit flow to fetch campaign analytics from the Google Analytics Data API
 * and provide an AI-powered summary of the performance.
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

// Expanded Output Schema with more metrics and AI analysis
const CampaignAnalyticsOutputSchema = z.object({
  sessions: z.number().default(0).describe("Total number of sessions initiated by users from this campaign."),
  engagedSessions: z.number().default(0).describe("Number of sessions that lasted longer than 10 seconds, had a conversion event, or had 2+ pageviews."),
  engagementRate: z.number().default(0).describe("The percentage of engaged sessions (engagedSessions / sessions)."),
  conversions: z.number().default(0).describe("Total number of conversion events attributed to this campaign."),
  newUsers: z.number().default(0).describe("Number of users who interacted with the site for the first time via this campaign."),
  aiSummary: z.string().default("").describe("An AI-generated summary interpreting these analytics numbers."),
  error: z.string().optional(),
});
export type CampaignAnalyticsOutput = z.infer<typeof CampaignAnalyticsOutputSchema>;

// Main exported function to call the flow
export async function fetchCampaignAnalytics(input: FetchCampaignAnalyticsInput): Promise<CampaignAnalyticsOutput> {
  return fetchCampaignAnalyticsFlow(input);
}

// AI Prompt for analyzing the analytics data
const analysisPrompt = ai.definePrompt({
    name: 'gaAnalysisPrompt',
    input: { schema: CampaignAnalyticsOutputSchema.omit({ aiSummary: true, error: true }) },
    output: { schema: z.object({ aiSummary: CampaignAnalyticsOutputSchema.shape.aiSummary }) },
    prompt: `You are a data analyst. Based on the following Google Analytics data for a specific campaign over the last 90 days, provide a concise, 2-3 sentence summary.
        
- Sessions: {{{sessions}}}
- Engaged Sessions: {{{engagedSessions}}}
- Engagement Rate: {{{engagementRate}}} (This is a decimal, e.g., 0.65 means 65%)
- Conversions: {{{conversions}}}
- New Users: {{{newUsers}}}
    
Your summary should interpret these numbers for a non-expert. For example, comment on whether the engagement rate is healthy (typically > 0.60 is good), if the campaign is effectively bringing in new users, and how well it is converting.
If all numbers are zero, state that the campaign had no activity in the period.
`,
});

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
      console.error(`[fetchGaAnalyticsFlow] ${errorMsg}`);
      return {
        ...CampaignAnalyticsOutputSchema.parse({}),
        aiSummary: 'Configuration error: Could not load Google Analytics credentials.',
        error: errorMsg,
      };
    }

    const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
    
    let analyticsData: Omit<CampaignAnalyticsOutput, 'aiSummary' | 'error'> = {
        sessions: 0,
        engagedSessions: 0,
        engagementRate: 0,
        conversions: 0,
        newUsers: 0,
    };

    try {
      const [response] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'campaignName' }],
        metrics: [
          { name: 'sessions' },
          { name: 'engagedSessions' },
          { name: 'engagementRate' },
          { name: 'conversions' },
          { name: 'newUsers' },
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'campaignName',
            stringFilter: { value: campaignName, matchType: 'EXACT' },
          },
        },
      });

      console.log(`[fetchCampaignAnalyticsFlow] GA API Response received for campaign ${campaignName}.`);

      if (response.rows && response.rows.length > 0) {
        console.log(`[fetchCampaignAnalyticsFlow] Raw row data:`, JSON.stringify(response.rows[0], null, 2));
        const row = response.rows[0];
        const getMetricValue = (index: number) => (row.metricValues?.[index]?.value ? parseFloat(row.metricValues[index].value!) : 0);
        
        analyticsData = {
          sessions: getMetricValue(0),
          engagedSessions: getMetricValue(1),
          engagementRate: getMetricValue(2),
          conversions: getMetricValue(3),
          newUsers: getMetricValue(4),
        };
      } else {
         console.log(`[fetchCampaignAnalyticsFlow] No data returned from GA for campaign: ${campaignName}.`);
      }

      // Always generate an AI summary, even for zero data
      const { output: analysisOutput } = await analysisPrompt(analyticsData);
      const aiSummary = analysisOutput?.aiSummary || "AI analysis could not be generated.";
      
      console.log(`[fetchCampaignAnalyticsFlow] Parsed data for ${campaignName}:`, analyticsData);
      console.log(`[fetchCampaignAnalyticsFlow] AI summary:`, aiSummary);

      return { ...analyticsData, aiSummary };

    } catch (error: any) {
      console.error(`[fetchCampaignAnalyticsFlow] Error calling Google Analytics API:`, error);
      const detail = error.errorDetails?.[0]?.errorInfo?.metadata?.detail || error.message || "An unknown error occurred.";
      const errorMsg = `Failed to fetch from Google Analytics: ${detail}`;
      return {
        ...CampaignAnalyticsOutputSchema.parse({}),
        aiSummary: 'API Error: Could not retrieve analytics data.',
        error: errorMsg,
      };
    }
  }
);
