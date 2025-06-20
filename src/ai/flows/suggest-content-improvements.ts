
'use server';

/**
 * @fileOverview Provides AI-powered suggestions on how to improve content, engagement, and reach for social media accounts.
 * THIS FLOW IS BEING DEPRECATED for the main suggestions UI in favor of general-query-flow.ts,
 * but kept for potential other uses or as a reference.
 *
 * - suggestContentImprovements - A function that returns content improvement suggestions.
 * - SuggestContentImprovementsInput - The input type for the suggestContentImprovements function.
 * - SuggestContentImprovementsOutput - The return type for the suggestContentImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const SuggestContentImprovementsInputSchema = z.object({
  youtubeData: z.array(
    z.object({
      title: z.string(),
      likes: z.number(),
      comments: z.number(),
      views: z.number(), // Changed from shares to views
    })
  ).describe('Array of YouTube video data including title, likes, comments, and views.'),
  instagramData: z.array(
    z.object({
      thumbnail: z.string(),
      likes: z.number(),
      comments: z.number(),
      timestamp: z.string(),
      caption: z.string().optional(), // Added caption
    })
  ).describe('Array of Instagram post data including thumbnails, likes, comments, and timestamps.'),
  userRole: z.string().describe('The role of the user.'),
});
export type SuggestContentImprovementsInput = z.infer<typeof SuggestContentImprovementsInputSchema>;

const SuggestContentImprovementsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      platform: z.enum(['youtube', 'instagram']),
      type: z.string().describe("Type of suggestion (e.g., 'Content Idea', 'Engagement Tip', 'Title Improvement')."),
      description: z.string().describe("Detailed description of the suggestion."),
      priority: z.enum(['high', 'medium', 'low']).optional().describe("Priority of the suggestion."),
      examples: z.array(z.string()).optional().describe("Examples to illustrate the suggestion.")
    })
  ).describe('Array of content improvement suggestions for YouTube and Instagram.'),
  overallSummary: z.string().optional().describe("A brief summary of the key areas for improvement based on the data.")
});
export type SuggestContentImprovementsOutput = z.infer<typeof SuggestContentImprovementsOutputSchema>;

export async function suggestContentImprovements(input: SuggestContentImprovementsInput): Promise<SuggestContentImprovementsOutput> {
  return suggestContentImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestContentImprovementsPrompt',
  input: {schema: SuggestContentImprovementsInputSchema},
  output: {schema: SuggestContentImprovementsOutputSchema},
  prompt: `You are a social media expert providing suggestions to improve content, engagement, and reach.
Your goal is to provide specific, actionable, and prioritized advice.

Analyze the provided YouTube and Instagram data. Consider the user's role.

User Role: {{{userRole}}}

YouTube Data:
{{#if youtubeData.length}}
  {{#each youtubeData}}
  - Title: "{{{title}}}", Views: {{{views}}}, Likes: {{{likes}}}, Comments: {{{comments}}}
  {{/each}}
{{else}}
  No YouTube data provided.
{{/if}}

Instagram Data:
{{#if instagramData.length}}
  {{#each instagramData}}
  - Caption: "{{#if caption}}{{caption}}{{else}}N/A{{/if}}", Likes: {{{likes}}}, Comments: {{{comments}}}, Timestamp: {{{timestamp}}}
  {{/each}}
{{else}}
  No Instagram data provided.
{{/if}}

Based on this data, generate a list of 'suggestions'. Each suggestion should have:
- 'platform': "youtube" or "instagram".
- 'type': A category for the suggestion (e.g., "Content Idea", "Engagement Tip", "Title Optimization", "Thumbnail Improvement", "Posting Frequency", "Collaboration Idea").
- 'description': A clear, detailed explanation of the suggestion and why it's beneficial.
- 'priority': (Optional) "high", "medium", or "low" based on potential impact.
- 'examples': (Optional) Provide 1-2 concrete examples if applicable.

Also, provide an 'overallSummary' (1-2 sentences) highlighting the most critical areas to focus on.

Focus on common patterns. If data is sparse, provide more general advice for the specified platforms.
Ensure your output strictly adheres to the JSON schema.
  `,
});

const suggestContentImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestContentImprovementsFlow',
    inputSchema: SuggestContentImprovementsInputSchema,
    outputSchema: SuggestContentImprovementsOutputSchema,
  },
  async (input: SuggestContentImprovementsInput) => {
    const {output} = await prompt(input);
    if (!output) {
      // Provide a default or error structure if the model fails
      return {
        suggestions: [{
          platform: 'youtube', // Or a generic platform
          type: "General Advice",
          description: "Consider diversifying your content topics or experimenting with new formats.",
          priority: "medium"
        }],
        overallSummary: "Unable to generate specific suggestions at this time. Please review your content strategy."
      };
    }
    // Ensure suggestions is always an array, even if the model omits it.
    return {
      ...output,
      suggestions: output.suggestions || [],
    };
  }
);
