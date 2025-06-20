
'use server';
/**
 * @fileOverview A Genkit flow to generate an analytics report for a list of Instagram Reels.
 *
 * - generateInstagramAnalyticsReport - An exported function to invoke the flow.
 * - GenerateInstagramAnalyticsReportInput - The Zod schema for the input.
 * - InstagramAnalyticsReportOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Schema for a single Instagram Reel, ensuring all necessary fields are present.
const InstagramReelSchemaForReport = z.object({
  id: z.string(),
  reelUrl: z.string().url().optional().default(''),
  caption: z.string().optional().default(''),
  username: z.string().optional().default(''),
  likes: z.number().default(0),
  comments: z.number().default(0),
  playCount: z.number().default(0),
  reshareCount: z.number().optional().default(0),
  postedAt: z.string().describe("ISO date string when the reel was posted."),
});
export type InstagramReelForReport = z.infer<typeof InstagramReelSchemaForReport>;

const GenerateInstagramAnalyticsReportInputSchema = z.object({
  reels: z.array(InstagramReelSchemaForReport).min(1, "At least one reel is required for analysis."),
  filterContext: z.string().optional().describe("Context about how the reel list was filtered or sorted, e.g., 'Filtered by date: Jan 1 - Mar 31, 2024. Sorted by play count descending.'"),
});
export type GenerateInstagramAnalyticsReportInput = z.infer<typeof GenerateInstagramAnalyticsReportInputSchema>;

// Similar to ChannelAnalyticsReportOutput, but tailored for Instagram
const InstagramAnalyticsReportOutputSchema = z.object({
  reportTitle: z.string().describe("A suitable title for this Instagram analytics report."),
  overallPerformanceSummary: z.string().describe("A 2-4 sentence summary of the overall performance based on the provided reels and filter context."),
  keyObservations: z.array(z.string()).max(5).describe("Up to 5 bullet-point key observations or notable trends derived from the reel data (likes, comments, plays, reshares)."),
  topPerformingReels: z.array(
    z.object({
      id: z.string(),
      reelUrl: z.string().optional().describe("The URL of the Instagram reel."), // Removed .url() validation here
      caption: z.string().optional(),
      username: z.string().optional(),
      playCount: z.number(),
      likes: z.number(),
      comments: z.number(),
      reshareCount: z.number().optional(),
      reason: z.string().optional().describe("A brief explanation of why this reel is considered top-performing."),
    })
  ).max(3).describe("Up to 3 top-performing reels from the list, including their relevant stats."),
  areasForImprovement: z.array(z.string()).max(3).describe("Up to 3 potential areas where content or strategy could be improved, based on the data analysis."),
  actionableSuggestions: z.array(z.string()).max(3).describe("Up to 3 concrete, actionable suggestions for future content or channel strategy based on the insights gained."),
});
export type InstagramAnalyticsReportOutput = z.infer<typeof InstagramAnalyticsReportOutputSchema>;

export async function generateInstagramAnalyticsReport(input: GenerateInstagramAnalyticsReportInput): Promise<InstagramAnalyticsReportOutput> {
  return generateInstagramAnalyticsReportFlow(input);
}

const reportPrompt = ai.definePrompt({
  name: 'generateInstagramAnalyticsReportPrompt',
  input: { schema: GenerateInstagramAnalyticsReportInputSchema },
  output: { schema: InstagramAnalyticsReportOutputSchema },
  prompt: `You are an expert Instagram Analyst. Your task is to analyze the provided list of Instagram Reels and generate a concise analytics report.

Current Filter/Sort Context: {{#if filterContext}}{{filterContext}}{{else}}No specific filters applied.{{/if}}

Reel Data:
{{#each reels}}
- Caption: "{{#if caption}}{{caption}}{{else}}N/A{{/if}}" (ID: {{id}}, User: @{{#if username}}{{username}}{{else}}unknown{{/if}})
  Posted: {{postedAt}}
  Plays: {{playCount}}
  Likes: {{likes}}
  Comments: {{comments}}
  Reshares: {{#if reshareCount}}{{reshareCount}}{{else}}0{{/if}}
  URL: {{reelUrl}}
{{/each}}

Based on the provided reel data and context, please generate the following:
1.  'reportTitle': A concise and informative title for this Instagram analytics report (e.g., "Instagram Reels Performance Review: [Date Range/Filter Context]").
2.  'overallPerformanceSummary': A 2-4 sentence summary highlighting overall performance, considering plays, likes, comments, reshares, and any apparent trends.
3.  'keyObservations': Up to 5 bullet-point key observations. These could be about content themes, engagement patterns (e.g., play-to-like ratio, comment rate), reel age vs. performance, effectiveness of captions, etc.
4.  'topPerformingReels': Identify up to 3 top-performing reels. For each, include its ID, reelUrl, caption, username, playCount, likes, comments, reshareCount, and optionally a brief 'reason' if you can discern one (e.g., "High engagement ratio," "Popular topic," "Effective call to action"). Select based on a holistic view of metrics, not just one.
5.  'areasForImprovement': Suggest up to 3 areas where the channel could focus on improving, based on underperforming reels or missed opportunities evident in the data (e.g., "Low reshare rate on reels about X," "Captions could be more engaging").
6.  'actionableSuggestions': Provide up to 3 specific, actionable suggestions for future content, promotion, or engagement strategies (e.g., "Experiment with shorter, fast-paced reels on topic Y," "Include a clear call to action for comments in captions," "Analyze captions of top performing reels for common themes.").

Ensure your output strictly adheres to the JSON schema provided for InstagramAnalyticsReportOutput. Be insightful and data-driven in your analysis. If the data is limited, acknowledge that in your summary.
`,
});

const generateInstagramAnalyticsReportFlow = ai.defineFlow(
  {
    name: 'generateInstagramAnalyticsReportFlow',
    inputSchema: GenerateInstagramAnalyticsReportInputSchema,
    outputSchema: InstagramAnalyticsReportOutputSchema,
  },
  async (input) => {
    if (!input.reels || input.reels.length === 0) {
      throw new Error("Cannot generate an Instagram report without reel data.");
    }
    const { output } = await reportPrompt(input);
    if (!output) {
      throw new Error("The AI model did not return an output for the Instagram report. Please try again.");
    }
    return {
        ...output,
        keyObservations: output.keyObservations || [],
        topPerformingReels: output.topPerformingReels || [],
        areasForImprovement: output.areasForImprovement || [],
        actionableSuggestions: output.actionableSuggestions || [],
    };
  }
);

