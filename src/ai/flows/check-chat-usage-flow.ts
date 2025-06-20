'use server';
/**
 * @fileOverview A Genkit flow to check and increment user's chat message count against a daily limit.
 *
 * - checkAndIncrementChatUsage - An exported function to invoke the flow.
 * - CheckChatUsageInput - The Zod schema for the input.
 * - CheckChatUsageOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { z } from 'zod';
import { doc, getDoc, setDoc, Timestamp, runTransaction } from 'firebase/firestore';

const MAX_CHAT_LIMIT = 10; // Daily chat limit

const CheckChatUsageInputSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
});
export type CheckChatUsageInput = z.infer<typeof CheckChatUsageInputSchema>;

const CheckChatUsageOutputSchema = z.object({
  allowed: z.boolean().describe("Whether the user is allowed to send another message."),
  messagesRemaining: z.number().int().min(0).describe("Number of messages remaining in the current 24-hour window. 0 if limit reached."),
  limitReached: z.boolean().describe("True if the user has reached their daily limit."),
  dailyLimit: z.number().int().describe("The daily limit that was applied for this check."),
  error: z.string().optional().describe("Error message if something went wrong."),
});
export type CheckChatUsageOutput = z.infer<typeof CheckChatUsageOutputSchema>;

export async function checkAndIncrementChatUsage(input: CheckChatUsageInput): Promise<CheckChatUsageOutput> {
  return checkAndIncrementChatUsageFlow(input);
}

const checkAndIncrementChatUsageFlow = ai.defineFlow(
  {
    name: 'checkAndIncrementChatUsageFlow',
    inputSchema: CheckChatUsageInputSchema,
    outputSchema: CheckChatUsageOutputSchema,
  },
  async ({ userId }) => {
    const usageDocRef = doc(db, 'chatUsage', userId);

    try {
      const output = await runTransaction(db, async (transaction) => {
        const usageDoc = await transaction.get(usageDocRef);
        const now = Timestamp.now();
        const twentyFourHoursAgo = Timestamp.fromMillis(now.toMillis() - (24 * 60 * 60 * 1000));

        let currentCount = 0;
        let limitStartDate = now;

        if (usageDoc.exists()) {
          const data = usageDoc.data();
          limitStartDate = data.limitStartDate instanceof Timestamp ? data.limitStartDate : now;
          currentCount = typeof data.messageCount === 'number' ? data.messageCount : 0;

          if (limitStartDate.toMillis() < twentyFourHoursAgo.toMillis()) {
            currentCount = 0; 
            limitStartDate = now; 
          }
        } else {
          limitStartDate = now;
          currentCount = 0;
        }

        if (currentCount >= MAX_CHAT_LIMIT) {
          return {
            allowed: false,
            messagesRemaining: 0,
            limitReached: true,
            dailyLimit: MAX_CHAT_LIMIT,
          };
        }

        const newCount = currentCount + 1;
        
        if (usageDoc.exists()) {
          transaction.update(usageDocRef, {
            messageCount: newCount,
            limitStartDate: limitStartDate,
          });
        } else {
          transaction.set(usageDocRef, {
            messageCount: newCount,
            limitStartDate: limitStartDate,
            userId: userId, 
          });
        }
        
        return {
          allowed: true,
          messagesRemaining: MAX_CHAT_LIMIT - newCount,
          limitReached: newCount >= MAX_CHAT_LIMIT,
          dailyLimit: MAX_CHAT_LIMIT,
        };
      });
      return output;

    } catch (error: any) {
      console.error(`[checkAndIncrementChatUsageFlow] Error for user ${userId}:`, error);
      return {
        allowed: false, 
        messagesRemaining: 0,
        limitReached: true, 
        dailyLimit: MAX_CHAT_LIMIT,
        error: error.message || "An unexpected error occurred while checking chat usage.",
      };
    }
  }
);
