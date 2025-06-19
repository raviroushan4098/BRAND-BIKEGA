
'use server';

import type { YouTubeVideo } from './mockData';

interface YouTubeApiItemSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
    standard?: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
  channelTitle: string;
  tags?: string[];
  categoryId: string;
  liveBroadcastContent: string;
  localized?: {
    title: string;
    description: string;
  };
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
}

interface YouTubeApiItemStatistics {
  viewCount: string;
  likeCount?: string; // likeCount can be hidden by the creator
  favoriteCount: string; // Generally 0, as "favorite" was removed
  commentCount?: string; // commentCount can be disabled
}

interface YouTubeApiItem {
  kind: string;
  etag: string;
  id: string;
  snippet: YouTubeApiItemSnippet;
  statistics: YouTubeApiItemStatistics;
}

interface YouTubeApiResponse {
  kind: string;
  etag: string;
  items: YouTubeApiItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export async function getVideoStatistics(videoIds: string[], apiKey: string): Promise<Partial<YouTubeVideo>[]> {
  if (!videoIds || videoIds.length === 0) {
    return [];
  }
  if (!apiKey) {
    console.error("YouTube API key is required.");
    throw new Error("YouTube API key is required.");
  }

  const idsString = videoIds.join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${idsString}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API Error:', errorData);
      throw new Error(`YouTube API request failed with status ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = (await response.json()) as YouTubeApiResponse;

    return data.items.map((item) => ({
      id: item.id,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
      views: parseInt(item.statistics.viewCount, 10) || 0,
      likes: parseInt(item.statistics.likeCount || "0", 10) || 0,
      comments: parseInt(item.statistics.commentCount || "0", 10) || 0,
      // Shares are not available directly, so we omit it or set to a default if the interface requires it.
      // The YouTubeVideo interface will be updated to reflect this.
    }));
  } catch (error) {
    console.error('Error fetching video statistics:', error);
    // Return partial data or empty for resilience, or re-throw
    // For now, let's return an empty object for failed items or filter them out
    // To make it simple, if the whole request fails, we re-throw.
    // Individual video errors are not handled here, API returns what it can.
    throw error;
  }
}
