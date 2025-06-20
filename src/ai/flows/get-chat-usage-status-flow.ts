'use server';
/**
 * @fileOverview A Genkit flow to get the current chat usage status for a user without incrementing.
 * - getChatUsageStatus - An exported function to invoke the flow.
 * - GetChatUsageStatusInput - The Zod schema for the input.
 * - GetChatUsageStatusOutput - The Zod schema for the output.
 */
import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { z } from 'zod';
import { doc, getDoc, Timestamp } from 'firebase/firestore';

const MAX_CHAT_LIMIT_STATUS = 10; // Needs to be consistent with check-chat-usage-flow.ts

export const GetChatUsageStatusInputSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
});
export type GetChatUsageStatusInput = z.infer<typeof GetChatUsageStatusInputSchema>;

export const GetChatUsageStatusOutputSchema = z.object({
  messagesRemaining: z.number().int().min(0),
  dailyLimit: z.number().int(),
  error: z.string().optional(),
});
export type GetChatUsageStatusOutput = z.infer<typeof GetChatUsageStatusOutputSchema>;

export async function getChatUsageStatus(input: GetChatUsageStatusInput): Promise<GetChatUsageStatusOutput> {
  return getChatUsageStatusFlow(input);
}

const getChatUsageStatusFlow = ai.defineFlow(
  {
    name: 'getChatUsageStatusFlow',
    inputSchema: GetChatUsageStatusInputSchema,
    outputSchema: GetChatUsageStatusOutputSchema,
  },
  async ({ userId }) => {
    const usageDocRef = doc(db, 'chatUsage', userId);
    try {
      const usageDoc = await getDoc(usageDocRef);
      const now = Timestamp.now();
      const twentyFourHoursAgo = Timestamp.fromMillis(now.toMillis() - (24 * 60 * 60 * 1000));

      if (!usageDoc.exists()) {
        return { messagesRemaining: MAX_CHAT_LIMIT_STATUS, dailyLimit: MAX_CHAT_LIMIT_STATUS };
      }

      const data = usageDoc.data();
      // Ensure limitStartDate is a Firestore Timestamp before calling toMillis()
      const limitStartDate = data.limitStartDate instanceof Timestamp ? data.limitStartDate : now;
      let currentCount = typeof data.messageCount === 'number' ? data.messageCount : 0;

      if (limitStartDate.toMillis() < twentyFourHoursAgo.toMillis()) {
        currentCount = 0; // Count is effectively reset for calculation
      }

      const remaining = Math.max(0, MAX_CHAT_LIMIT_STATUS - currentCount);
      return { messagesRemaining: remaining, dailyLimit: MAX_CHAT_LIMIT_STATUS };

    } catch (error: any) {
      console.error(`[getChatUsageStatusFlow] Error for user ${userId}:`, error);
      return {
        messagesRemaining: 0, 
        dailyLimit: MAX_CHAT_LIMIT_STATUS,
        error: error.message || "Failed to retrieve chat usage status.",
      };
    }
  }
);
