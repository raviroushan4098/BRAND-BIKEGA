
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// --- Type Definitions ---
// We define types here to ensure data consistency within the function.
interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name: string;
  lastLogin: string;
}

// YouTube-specific types
interface YouTubeVideo {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
}
interface StoredYouTubeVideo extends Partial<YouTubeVideo> {
  id: string; // videoId is the document ID
  lastFetched?: string; // ISO string timestamp
}

// Instagram-specific types
interface StoredInstagramPost {
  id: string; // Reel shortcode
  reelUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  username?: string;
  postedAt?: string; // ISO string
  likes: number;
  comments: number;
  playCount: number;
  reshareCount?: number;
  lastFetched: string; // ISO string
  errorMessage?: string;
}

// Type for YouTube API video item
interface YouTubeApiItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
}


// --- Firestore & API Helper Functions ---

/**
 * Fetches API keys for required services from the 'apiKeys' collection in Firestore.
 * @returns {Promise<{youtube: string | null; instagram: string | null}>} A promise that resolves to an object containing the API keys.
 */
async function getApiKeys(): Promise<{ youtube: string | null; instagram: string | null }> {
  const apiKeys: { youtube: string | null; instagram: string | null } = {
    youtube: null,
    instagram: null,
  };
  try {
    const youtubeSnapshot = await db.collection('apiKeys').where('serviceName', '==', 'youtube').limit(1).get();
    if (!youtubeSnapshot.empty) {
      apiKeys.youtube = youtubeSnapshot.docs[0].data().keyValue;
    } else {
      console.warn("YouTube API key not found in Firestore.");
    }

    const instagramSnapshot = await db.collection('apiKeys').where('serviceName', '==', 'RapidAPI-Instagram-Scraper').limit(1).get();
    if (!instagramSnapshot.empty) {
      apiKeys.instagram = instagramSnapshot.docs[0].data().keyValue;
    } else {
        console.warn("RapidAPI-Instagram-Scraper key not found in Firestore.");
    }
  } catch (error) {
    console.error("Error fetching API keys:", error);
  }
  return apiKeys;
}

/**
 * Fetches all user profiles from the 'users' collection.
 * @returns {Promise<User[]>} A promise that resolves to an array of User objects.
 */
async function getAllUsers(): Promise<User[]> {
  const users: User[] = [];
  try {
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });
  } catch (error) {
    console.error("Error fetching users:", error);
  }
  return users;
}

/**
 * Fetches the list of YouTube links assigned to a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<string[]>} A promise that resolves to an array of YouTube link strings.
 */
async function getYouTubeLinks(userId: string): Promise<string[]> {
    try {
        const docRef = db.collection('youtube').doc(userId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return docSnap.data()?.links || [];
        }
    } catch(error) {
        console.error(`Error fetching YouTube links for user ${userId}:`, error);
    }
    return [];
}

/**
 * Fetches the list of Instagram links assigned to a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<string[]>} A promise that resolves to an array of Instagram link strings.
 */
async function getInstagramLinks(userId: string): Promise<string[]> {
    try {
        const docRef = db.collection('instagramReelLinks').doc(userId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return docSnap.data()?.links || [];
        }
    } catch(error) {
        console.error(`Error fetching Instagram links for user ${userId}:`, error);
    }
    return [];
}


/**
 * Extracts a YouTube video ID from various URL formats.
 * @param {string} url - The YouTube URL.
 * @returns {string | null} The extracted video ID or null if not found.
 */
function extractYouTubeVideoId(url: string): string | null {
    if (!url) return null;
    let videoId: string | null = null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1).split(/[?&]/)[0];
        } else if (urlObj.hostname.includes('youtube.com')) {
            if (urlObj.pathname.startsWith('/embed/')) {
                videoId = urlObj.pathname.split('/embed/')[1].split(/[?&]/)[0];
            } else if (urlObj.pathname.startsWith('/watch')) {
                videoId = urlObj.searchParams.get('v');
            } else if (urlObj.pathname.startsWith('/shorts/')) {
                videoId = urlObj.pathname.split('/shorts/')[1].split(/[?&]/)[0];
            }
        }
        if (videoId && videoId.includes('&')) videoId = videoId.split('&')[0];
        if (videoId && videoId.includes('?')) videoId = videoId.split('?')[0];
    } catch (e) {
        console.error("Could not parse YouTube URL:", url, e);
        return null;
    }
    return videoId;
}

/**
 * Fetches statistics for a batch of YouTube videos.
 * @param {string[]} videoIds - An array of YouTube video IDs.
 * @param {string} apiKey - The YouTube Data API key.
 * @returns {Promise<Partial<YouTubeVideo>[]>} A promise that resolves to an array of video data objects.
 */
async function getVideoStatistics(videoIds: string[], apiKey: string): Promise<Partial<YouTubeVideo>[]> {
    if (!videoIds || videoIds.length === 0) return [];
    const idsString = videoIds.join(',');
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${idsString}&key=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('YouTube API Error:', errorData.error?.message || response.statusText);
            return []; // Return empty on API error to not halt the entire process
        }
        const data = await response.json();
        return data.items.map((item: YouTubeApiItem) => ({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
            views: parseInt(item.statistics.viewCount, 10) || 0,
            likes: parseInt(item.statistics.likeCount || "0", 10) || 0,
            comments: parseInt(item.statistics.commentCount || "0", 10) || 0,
            publishedAt: item.snippet.publishedAt,
        }));
    } catch (error) {
        console.error('Error fetching video statistics:', error);
        return [];
    }
}

/**
 * Saves a single YouTube video's analytics data to Firestore for a specific user.
 * @param {string} userId - The ID of the user.
 * @param {Partial<YouTubeVideo>} videoData - The video data to save.
 */
async function saveVideoAnalytics(userId: string, videoData: Partial<YouTubeVideo>): Promise<void> {
    if (!userId || !videoData || !videoData.id) return;
    const videoDocRef = db.collection('userVideoAnalytics').doc(userId).collection('videos').doc(videoData.id);
    const dataToSave: StoredYouTubeVideo = {
        ...videoData,
        id: videoData.id,
        lastFetched: new Date().toISOString(),
    };
    await videoDocRef.set(dataToSave, { merge: true });
}

/**
 * Extracts an Instagram shortcode from a Reel URL.
 * @param {string} url - The Instagram Reel URL.
 * @returns {string | null} The extracted shortcode or null.
 */
function extractInstagramShortcode(url: string): string | null {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        const regex = /\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/;
        const match = urlObj.pathname.match(regex);
        return match && match[1] ? match[1] : null;
    } catch (e) {
        console.error("Could not parse Instagram URL:", url, e);
        return null;
    }
}

/**
 * Fetches statistics for a single Instagram Reel.
 * @param {string} shortcode - The shortcode of the Instagram Reel.
 * @param {string} apiKey - The RapidAPI key for the Instagram scraper.
 * @returns {Promise<Partial<StoredInstagramPost> | null>} A promise that resolves to the post data or null.
 */
async function fetchInstagramReelStats(shortcode: string, apiKey: string): Promise<Partial<StoredInstagramPost>> {
    const apiUrl = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/post?shortcode=${shortcode}`;
    const headers = {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
    };
    try {
        const response = await fetch(apiUrl, { method: 'GET', headers });
        if (!response.ok) {
            console.error(`Instagram API Error for ${shortcode}: Status ${response.status}`);
            return { id: shortcode, errorMessage: `API request failed with status ${response.status}` };
        }
        const postData = await response.json();
        return {
            id: shortcode,
            likes: Number(postData.like_count) || 0,
            comments: Number(postData.comment_count) || 0,
            playCount: Number(postData.play_count) || 0,
            reshareCount: Number(postData.reshare_count) || 0,
            caption: postData.caption?.text,
            thumbnailUrl: postData.image_versions2?.candidates?.[0]?.url,
            username: postData.user?.username,
            postedAt: postData.taken_at ? new Date(postData.taken_at * 1000).toISOString() : undefined,
        };
    } catch (error) {
        console.error(`Error fetching Instagram stats for ${shortcode}:`, error);
        return { id: shortcode, errorMessage: 'Fetch failed.' };
    }
}

/**
 * Saves a single Instagram post's analytics data to Firestore.
 * @param {string} userId - The ID of the user.
 * @param {Partial<StoredInstagramPost>} postData - The post data to save.
 */
async function saveInstagramPostAnalytics(userId: string, postData: Partial<StoredInstagramPost>): Promise<void> {
    if (!userId || !postData || !postData.id) return;
    const postDocRef = db.collection('userInstagramPostAnalytics').doc(userId).collection('posts').doc(postData.id);
    const dataToSave: StoredInstagramPost = {
        reelUrl: '',
        likes: 0,
        comments: 0,
        playCount: 0,
        ...postData,
        id: postData.id,
        lastFetched: new Date().toISOString(),
    };
    await postDocRef.set(dataToSave, { merge: true });
}


// --- Main Scheduled Function ---

/**
 * A scheduled Cloud Function that runs daily to refresh social media analytics data.
 */
export const dailyDataRefresh = functions
    .runWith({timeoutSeconds: 540, memory: "1GB"})
    .pubsub.schedule("every day 03:00")
    .timeZone("America/Los_Angeles")
    .onRun(async (context: functions.EventContext) => {
        console.log("Daily data refresh job started!");

        const apiKeys = await getApiKeys();
        
        const users = await getAllUsers();
        if (users.length === 0) {
            console.log("No users found to refresh data for.");
            return null;
        }

        console.log(`Found ${users.length} user(s) to process.`);

        for (const user of users) {
            console.log(`--- Processing user: ${user.name} (${user.id}) ---`);
            
            // --- Fetch YouTube links and stats ---
            if (apiKeys.youtube) {
                const youtubeLinks = await getYouTubeLinks(user.id);
                if (youtubeLinks.length > 0) {
                    console.log(`Found ${youtubeLinks.length} YouTube links for ${user.name}.`);
                    const videoIds = youtubeLinks.map(extractYouTubeVideoId).filter((id): id is string => id !== null);
                    if (videoIds.length > 0) {
                        const videoStats = await getVideoStatistics(videoIds, apiKeys.youtube);
                        for (const video of videoStats) {
                            await saveVideoAnalytics(user.id, video);
                        }
                        console.log(`Updated stats for ${videoStats.length} YouTube videos for ${user.name}.`);
                    } else {
                        console.log(`No valid YouTube video IDs extracted for ${user.name}.`);
                    }
                } else {
                    console.log(`No YouTube links for ${user.name}.`);
                }
            } else {
                console.log("Skipping YouTube refresh due to missing API key.");
            }

            // --- Fetch Instagram links and stats ---
            if (apiKeys.instagram) {
                const instagramLinks = await getInstagramLinks(user.id);
                if (instagramLinks.length > 0) {
                    console.log(`Found ${instagramLinks.length} Instagram links for ${user.name}.`);
                    let successCount = 0;
                    for (const link of instagramLinks) {
                        const shortcode = extractInstagramShortcode(link);
                        if (shortcode) {
                            const postStats = await fetchInstagramReelStats(shortcode, apiKeys.instagram);
                            await saveInstagramPostAnalytics(user.id, { ...postStats, reelUrl: link });
                            if (!postStats.errorMessage) {
                                successCount++;
                            }
                        }
                        // Optional: Add a small delay between requests to be polite to the API
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    console.log(`Updated stats for ${successCount}/${instagramLinks.length} Instagram reels for ${user.name}.`);
                } else {
                    console.log(`No Instagram links for ${user.name}.`);
                }
            } else {
                console.log("Skipping Instagram refresh due to missing API key.");
            }
        }

        console.log("Daily data refresh job finished.");
        return null;
    });
