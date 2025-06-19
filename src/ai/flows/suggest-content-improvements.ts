'use server';

/**
 * @fileOverview Provides AI-powered suggestions on how to improve content, engagement, and reach for social media accounts.
 *
 * - suggestContentImprovements - A function that returns content improvement suggestions.
 * - SuggestContentImprovementsInput - The input type for the suggestContentImprovements function.
 * - SuggestContentImprovementsOutput - The return type for the suggestContentImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestContentImprovementsInputSchema = z.object({
  youtubeData: z.array(
    z.object({
      title: z.string(),
      likes: z.number(),
      comments: z.number(),
      shares: z.number(),
    })
  ).describe('Array of YouTube video data including title, likes, comments, and shares.'),
  instagramData: z.array(
    z.object({
      thumbnail: z.string(),
      likes: z.number(),
      comments: z.number(),
      timestamp: z.string(),
    })
  ).describe('Array of Instagram post data including thumbnails, likes, comments, and timestamps.'),
  userRole: z.string().describe('The role of the user.'),
});
export type SuggestContentImprovementsInput = z.infer<typeof SuggestContentImprovementsInputSchema>;

const SuggestContentImprovementsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      platform: z.enum(['youtube', 'instagram']),
      type: z.string(),
      description: z.string(),
    })
  ).describe('Array of content improvement suggestions for YouTube and Instagram.'),
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

  Analyze the provided YouTube and Instagram data to generate actionable suggestions. Recommendations should be specific, clear, and easy to implement.

  Consider the user's role when making suggestions.

  User Role: {{{userRole}}}

  YouTube Data:
  {{#each youtubeData}}
  - Title: {{{title}}}, Likes: {{{likes}}}, Comments: {{{comments}}}, Shares: {{{shares}}}
  {{/each}}

  Instagram Data:
  {{#each instagramData}}
  - Thumbnail: {{{thumbnail}}}, Likes: {{{likes}}}, Comments: {{{comments}}}, Timestamp: {{{timestamp}}}
  {{/each}}
  `,
});

const suggestContentImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestContentImprovementsFlow',
    inputSchema: SuggestContentImprovementsInputSchema,
    outputSchema: SuggestContentImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
