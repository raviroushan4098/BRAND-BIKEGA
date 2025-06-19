
'use server';
/**
 * @fileOverview A Genkit flow to generate an analytics report for a list of YouTube videos.
 *
 * - generateChannelAnalyticsReport - An exported function to invoke the flow.
 * - GenerateChannelAnalyticsReportInput - The Zod schema for the input.
 * - ChannelAnalyticsReportOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Schema for a single YouTube video, ensuring all necessary fields are present.
const YouTubeVideoSchemaForReport = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().default(''),
  thumbnailUrl: z.string().url().optional().default('https://placehold.co/320x180.png'),
  views: z.number().default(0),
  likes: z.number().default(0),
  comments: z.number().default(0),
  publishedAt: z.string().describe("ISO date string when the video was published."),
});
export type YouTubeVideoForReport = z.infer<typeof YouTubeVideoSchemaForReport>;


const GenerateChannelAnalyticsReportInputSchema = z.object({
  videos: z.array(YouTubeVideoSchemaForReport).min(1, "At least one video is required for analysis."),
  filterContext: z.string().optional().describe("Context about how the video list was filtered or sorted, e.g., 'Filtered by date: Jan 1 - Mar 31, 2024. Sorted by views descending.'"),
});
export type GenerateChannelAnalyticsReportInput = z.infer<typeof GenerateChannelAnalyticsReportInputSchema>;

const ChannelAnalyticsReportOutputSchema = z.object({
  reportTitle: z.string().describe("A suitable title for this analytics report."),
  overallPerformanceSummary: z.string().describe("A 2-4 sentence summary of the overall channel performance based on the provided videos and filter context."),
  keyObservations: z.array(z.string()).max(5).describe("Up to 5 bullet-point key observations or notable trends derived from the video data."),
  topPerformingVideos: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      views: z.number(),
      likes: z.number(),
      comments: z.number(),
      reason: z.string().optional().describe("A brief explanation of why this video is considered top-performing."),
    })
  ).max(3).describe("Up to 3 top-performing videos from the list, including their relevant stats."),
  areasForImprovement: z.array(z.string()).max(3).describe("Up to 3 potential areas where content or strategy could be improved, based on the data analysis."),
  actionableSuggestions: z.array(z.string()).max(3).describe("Up to 3 concrete, actionable suggestions for future content or channel strategy based on the insights gained."),
});
export type ChannelAnalyticsReportOutput = z.infer<typeof ChannelAnalyticsReportOutputSchema>;

export async function generateChannelAnalyticsReport(input: GenerateChannelAnalyticsReportInput): Promise<ChannelAnalyticsReportOutput> {
  return generateChannelAnalyticsReportFlow(input);
}

const reportPrompt = ai.definePrompt({
  name: 'generateChannelAnalyticsReportPrompt',
  input: { schema: GenerateChannelAnalyticsReportInputSchema },
  output: { schema: ChannelAnalyticsReportOutputSchema },
  prompt: `You are an expert YouTube Channel Analyst. Your task is to analyze the provided list of YouTube videos and generate a concise analytics report.

Current Filter/Sort Context: {{#if filterContext}}{{filterContext}}{{else}}No specific filters applied.{{/if}}

Video Data:
{{#each videos}}
- Title: "{{title}}" (ID: {{id}})
  Published: {{publishedAt}}
  Views: {{views}}
  Likes: {{likes}}
  Comments: {{comments}}
  Description: {{#if description}}{{description}}{{else}}N/A{{/if}}
{{/each}}

Based on the provided video data and context, please generate the following:
1.  'reportTitle': A concise and informative title for this analytics report.
2.  'overallPerformanceSummary': A 2-4 sentence summary highlighting overall performance, considering views, likes, comments, and any apparent trends.
3.  'keyObservations': Up to 5 bullet-point key observations. These could be about content themes, engagement patterns, video age vs. performance, etc.
4.  'topPerformingVideos': Identify up to 3 top-performing videos. For each, include its ID, title, views, likes, comments, and optionally a brief 'reason' if you can discern one (e.g., "High engagement ratio," "Popular topic"). Select based on a combination of high views, likes, and comments.
5.  'areasForImprovement': Suggest up to 3 areas where the channel could focus on improving, based on underperforming videos or missed opportunities evident in the data.
6.  'actionableSuggestions': Provide up to 3 specific, actionable suggestions for future content, promotion, or engagement strategies.

Ensure your output strictly adheres to the JSON schema provided for ChannelAnalyticsReportOutput. Be insightful and data-driven in your analysis. If the data is limited, acknowledge that in your summary.
`,
});

const generateChannelAnalyticsReportFlow = ai.defineFlow(
  {
    name: 'generateChannelAnalyticsReportFlow',
    inputSchema: GenerateChannelAnalyticsReportInputSchema,
    outputSchema: ChannelAnalyticsReportOutputSchema,
  },
  async (input) => {
    // Validate that video data is not empty, though schema also checks
    if (!input.videos || input.videos.length === 0) {
      throw new Error("Cannot generate a report without video data.");
    }
    const { output } = await reportPrompt(input);
    if (!output) {
      throw new Error("The AI model did not return an output for the channel report. Please try again.");
    }
    // Ensure arrays are returned even if empty, as per schema
    return {
        ...output,
        keyObservations: output.keyObservations || [],
        topPerformingVideos: output.topPerformingVideos || [],
        areasForImprovement: output.areasForImprovement || [],
        actionableSuggestions: output.actionableSuggestions || [],
    };
  }
);
