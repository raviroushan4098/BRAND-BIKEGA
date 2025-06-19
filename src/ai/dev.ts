
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-content-improvements.ts';
import '@/ai/flows/fetch-youtube-details-flow.ts';
import '@/ai/flows/fetch-youtube-comments-flow.ts'; // Added new flow
