
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-content-improvements.ts';
import '@/ai/flows/fetch-youtube-details-flow.ts';
import '@/ai/flows/fetch-youtube-comments-flow.ts';
import '@/ai/flows/analyze-video-text-flow.ts';
import '@/ai/flows/generate-channel-analytics-report-flow.ts'; // Added new channel report flow
