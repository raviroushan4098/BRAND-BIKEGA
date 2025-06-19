
'use server';
/**
 * @fileOverview A Genkit flow to analyze YouTube video text (title, description, comments)
 * for sentiment, topics, keywords, and content suggestions.
 *
 * - analyzeVideoText - An exported function to invoke the flow.
 * - AnalyzeVideoTextInput - The Zod schema for the input.
 * - VideoTextAnalysisOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
// Import the existing YouTubeComment schema
import { YouTubeCommentSchema } from './fetch-youtube-comments-flow';
export type { YouTubeComment } from './fetch-youtube-comments-flow';


const AnalyzeVideoTextInputSchema = z.object({
  videoId: z.string().describe("The ID of the video being analyzed."),
  title: z.string().describe("The title of the YouTube video."),
  description: z.string().describe("The description of the YouTube video."),
  comments: z.array(YouTubeCommentSchema).describe("An array of comments for the YouTube video."),
});
export type AnalyzeVideoTextInput = z.infer<typeof AnalyzeVideoTextInputSchema>;

const VideoTextAnalysisOutputSchema = z.object({
  overallSentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).describe("The overall sentiment derived from the comments."),
  sentimentSummary: z.string().describe("A brief summary explaining the overall sentiment and key points from comments."),
  topPositiveKeywords: z.array(z.string()).max(5).describe("Up to 5 keywords strongly associated with positive sentiment in the comments."),
  topNegativeKeywords: z.array(z.string()).max(5).describe("Up to 5 keywords strongly associated with negative sentiment in the comments."),
  identifiedTopics: z.array(z.string()).max(5).describe("Up to 5 key topics or themes derived from the video title, description, and comments."),
  contentSuggestions: z.array(z.string()).max(3).describe("Up to 3 actionable suggestions to improve content based on the analysis."),
});
export type VideoTextAnalysisOutput = z.infer<typeof VideoTextAnalysisOutputSchema>;

export async function analyzeVideoText(input: AnalyzeVideoTextInput): Promise<VideoTextAnalysisOutput> {
  return analyzeVideoTextFlow(input);
}

const analysisPrompt = ai.definePrompt({
  name: 'analyzeVideoTextPrompt',
  input: { schema: AnalyzeVideoTextInputSchema },
  output: { schema: VideoTextAnalysisOutputSchema },
  prompt: `You are an expert YouTube content analyst. Analyze the provided video title, description, and comments.
Provide a concise analysis based on the following structure:

Video Title: {{{title}}}
Video Description: {{{description}}}

Comments:
{{#if comments.length}}
  {{#each comments}}
  - Author: {{authorDisplayName}}, Comment: "{{textDisplay}}" (Likes: {{likeCount}}, Replies: {{totalReplyCount}})
  {{/each}}
{{else}}
  No comments provided for analysis.
{{/if}}

Based on the information above, please perform the following:
1.  Determine the 'overallSentiment' of the comments section (choose one: positive, negative, neutral, mixed).
2.  Write a 'sentimentSummary' (2-3 sentences) explaining the overall sentiment and highlighting key themes or feelings expressed in the comments. If no comments, state that.
3.  Identify 'topPositiveKeywords' (up to 5) from the comments that indicate positive reactions. If no positive comments, return an empty array.
4.  Identify 'topNegativeKeywords' (up to 5) from the comments that indicate negative reactions or criticisms. If no negative comments, return an empty array.
5.  List 'identifiedTopics' (up to 5 distinct topics or themes) that are prominent in the video title, description, and comments combined.
6.  Provide 'contentSuggestions' (up to 3 short, actionable suggestions) for the creator to improve similar future content or engagement, based on your analysis of the provided text.

Ensure your output strictly adheres to the JSON schema provided for VideoTextAnalysisOutput.
Focus on common patterns and themes. If comments are sparse or uninformative, reflect that in your summaries and suggestions.
`,
});

const analyzeVideoTextFlow = ai.defineFlow(
  {
    name: 'analyzeVideoTextFlow',
    inputSchema: AnalyzeVideoTextInputSchema,
    outputSchema: VideoTextAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await analysisPrompt(input);
    if (!output) {
      throw new Error("The AI model did not return an output. Please try again.");
    }
    // Ensure arrays are returned even if empty, as per schema, rather than potentially null/undefined from model
    return {
        ...output,
        topPositiveKeywords: output.topPositiveKeywords || [],
        topNegativeKeywords: output.topNegativeKeywords || [],
        identifiedTopics: output.identifiedTopics || [],
        contentSuggestions: output.contentSuggestions || [],
    };
  }
);

