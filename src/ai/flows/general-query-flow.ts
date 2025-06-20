
'use server';

/**
 * @fileOverview Provides AI-powered responses to general user queries about social media strategy,
 * content, engagement, and reach, using provided YouTube and Instagram data as context.
 *
 * - generalQuery - A function that returns AI-generated text responses.
 * - GeneralQueryInput - The input type for the generalQuery function.
 * - GeneralQueryOutput - The return type for the generalQuery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for individual YouTube video data (consistent with other flows)
const YouTubeVideoDataSchema = z.object({
  title: z.string(),
  likes: z.number(),
  comments: z.number(),
  views: z.number(),
});

// Schema for individual Instagram post data (consistent with other flows)
const InstagramPostDataSchema = z.object({
  thumbnail: z.string().describe("URL or placeholder for the thumbnail image."), // Retaining 'thumbnail' as per original flow for consistency, though caption might be more useful for text analysis.
  likes: z.number(),
  comments: z.number(),
  timestamp: z.string().describe("ISO date string of when the post was made."),
  caption: z.string().optional().describe("The caption of the Instagram post."), // Added caption
});


const GeneralQueryInputSchema = z.object({
  userQuery: z.string().min(1, "User query cannot be empty.").describe('The user\'s question or request related to social media strategy, content, etc.'),
  userRole: z.string().describe('The role of the user (e.g., "content creator", "admin").'),
  youtubeData: z.array(YouTubeVideoDataSchema)
    .optional()
    .describe('Optional: Array of YouTube video data including title, likes, comments, and views.'),
  instagramData: z.array(InstagramPostDataSchema)
    .optional()
    .describe('Optional: Array of Instagram post data including thumbnails/captions, likes, comments, and timestamps.'),
});
export type GeneralQueryInput = z.infer<typeof GeneralQueryInputSchema>;

const GeneralQueryOutputSchema = z.object({
  aiResponse: z.string().describe('The AI-generated textual response to the user\'s query.'),
});
export type GeneralQueryOutput = z.infer<typeof GeneralQueryOutputSchema>;

export async function generalQuery(input: GeneralQueryInput): Promise<GeneralQueryOutput> {
  return generalQueryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generalQueryPrompt',
  input: {schema: GeneralQueryInputSchema},
  output: {schema: GeneralQueryOutputSchema},
  prompt: `You are InsightStreamBot, a highly intelligent and helpful AI assistant specialized in social media strategy and content optimization.
The user's role is: {{{userRole}}}.

The user's question or request is:
"{{{userQuery}}}"

To help you answer, here's some context about their recent YouTube performance (if their query seems related to it, otherwise you can ignore this data):
{{#if youtubeData.length}}
  YouTube Data:
  {{#each youtubeData}}
  - Title: "{{{title}}}", Views: {{{views}}}, Likes: {{{likes}}}, Comments: {{{comments}}}
  {{/each}}
{{else}}
  (No specific YouTube data was provided for this query, or it might not be relevant.)
{{/if}}

Here's some context about their recent Instagram performance (if their query seems related to it, otherwise you can ignore this data):
{{#if instagramData.length}}
  Instagram Data:
  {{#each instagramData}}
  - Caption: "{{{caption}}}", Likes: {{{likes}}}, Comments: {{{comments}}}, Timestamp: {{{timestamp}}}
  {{/each}}
{{else}}
  (No specific Instagram data was provided for this query, or it might not be relevant.)
{{/if}}

Please provide a comprehensive, insightful, and actionable response to the user's query.
If they ask for suggestions, try to analyze any provided data to give specific advice.
If they ask a general question, answer it to the best of your ability.
Be friendly, professional, and encouraging.
Structure your response clearly. If providing multiple points or suggestions, consider using bullet points or numbered lists for readability.
Your response should directly answer the userQuery.
Focus on providing value and helping the user improve their social media presence.
Output only the 'aiResponse' field as a single string.
`,
});

const generalQueryFlow = ai.defineFlow(
  {
    name: 'generalQueryFlow',
    inputSchema: GeneralQueryInputSchema,
    outputSchema: GeneralQueryOutputSchema,
  },
  async (input: GeneralQueryInput) => {
    // Ensure caption is passed for Instagram data if not already present
    const processedInstagramData = input.instagramData?.map(p => ({
        ...p,
        caption: p.caption || "Instagram Post (caption not available)",
    }));

    const {output} = await prompt({...input, instagramData: processedInstagramData});
    if (!output || !output.aiResponse) {
      // Fallback response if the model returns empty or malformed output
      return { aiResponse: "I'm sorry, I couldn't generate a response for that query. Could you please try rephrasing it?" };
    }
    return output;
  }
);

// Remove the old suggestContentImprovements flow to avoid conflicts if it's not being used elsewhere.
// If it IS used elsewhere, this line should be removed.
// For this specific request, we are replacing its functionality on the suggestions page.
// --- No, let's keep it for now, just in case it was scaffolded for other reasons or future use.
// --- The UI will stop calling it from the suggestions page.
// import './suggest-content-improvements';
// export * from './suggest-content-improvements';
// This also means we might need to update src/ai/dev.ts if suggest-content-improvements.ts is no longer the primary export/focus for suggestions.
// For now, we just add the new flow.
