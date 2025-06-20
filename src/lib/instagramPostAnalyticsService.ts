
'use server';

import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  orderBy
} from 'firebase/firestore';

// Interface for stored Instagram post analytics
export interface StoredInstagramPost {
  id: string; // Reel shortcode, used as Firestore document ID
  reelUrl: string; // Original URL assigned by admin
  thumbnailUrl?: string; 
  caption?: string; 
  username?: string; // Author's username
  postedAt?: string; // ISO string when the reel was posted
  likes: number;
  comments: number;
  playCount: number;
  reshareCount?: number; // Added reshareCount
  lastFetched: string; // ISO string, timestamp of when data was last fetched from API
  errorMessage?: string; // If fetching stats for this reel failed
}

/**
 * Saves or updates a single Instagram post's analytics data in Firestore for a specific user.
 * Path: userInstagramPostAnalytics/{userId}/posts/{postId (shortcode)}
 * @param userId The ID of the user.
 * @param postData The post data to save. Must include 'id' (shortcode).
 */
export const saveInstagramPostAnalytics = async (userId: string, postData: StoredInstagramPost): Promise<void> => {
  if (!userId || !postData || !postData.id) {
    console.error("[InstagramService] User ID and post data with post ID (shortcode) are required to save analytics.");
    throw new Error("User ID and post data with post ID (shortcode) are required.");
  }
  try {
    const postDocRef = doc(db, 'userInstagramPostAnalytics', userId, 'posts', postData.id);
    const dataToSave: StoredInstagramPost = {
      ...postData,
      lastFetched: new Date().toISOString(), 
    };
    await setDoc(postDocRef, dataToSave, { merge: true });
    console.log(`[InstagramService] Successfully saved/updated post ${postData.id} for user ${userId} in Firestore. Data:`, JSON.stringify(dataToSave, null, 2).substring(0,500) + "...");
  } catch (error) {
    console.error(`[InstagramService] Error saving Instagram post analytics for post ${postData.id} of user ${userId}:`, error);
    throw error;
  }
};

/**
 * Retrieves all stored Instagram post analytics data for a specific user from Firestore.
 * Ordered by 'postedAt' descending by default, if available, otherwise by 'lastFetched'.
 * @param userId The ID of the user.
 * @returns An array of StoredInstagramPost objects.
 */
export const getAllInstagramPostAnalyticsForUser = async (userId: string): Promise<StoredInstagramPost[]> => {
  if (!userId) {
    console.warn("[InstagramService] User ID is required to fetch Instagram post analytics.");
    return [];
  }
  let posts: StoredInstagramPost[] = [];
  try {
    const postsCollectionRef = collection(db, 'userInstagramPostAnalytics', userId, 'posts');
    const q = query(postsCollectionRef, orderBy('postedAt', 'desc'), orderBy('lastFetched', 'desc')); 
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      posts.push({ ...docSnap.data(), id: docSnap.id } as StoredInstagramPost);
    });
    console.log(`[InstagramService] Fetched ${posts.length} posts for user ${userId} from Firestore (primary query).`);
    return posts;
  } catch (error) {
    console.error(`[InstagramService] Error fetching all Instagram post analytics for user ${userId} (primary query):`, error, "Attempting fallback query...");
    try {
        posts = []; 
        const postsCollectionRef = collection(db, 'userInstagramPostAnalytics', userId, 'posts');
        const fallbackQuery = query(postsCollectionRef, orderBy('lastFetched', 'desc'));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        fallbackSnapshot.forEach((docSnap) => {
          posts.push({ ...docSnap.data(), id: docSnap.id } as StoredInstagramPost);
        });
        console.log(`[InstagramService] Fetched ${posts.length} posts for user ${userId} from Firestore (fallback query).`);
        return posts;
    } catch (fallbackError) {
        console.error(`[InstagramService] Error fetching all Instagram post analytics for user ${userId} (fallback query):`, fallbackError);
        return []; 
    }
  }
};

/**
 * Retrieves a single Instagram post's analytics data from Firestore.
 * @param userId The ID of the user.
 * @param postId The ID of the post (shortcode).
 * @returns The StoredInstagramPost object or null if not found.
 */
export const getInstagramPostAnalytics = async (userId: string, postId: string): Promise<StoredInstagramPost | null> => {
  if (!userId || !postId) {
    console.warn("[InstagramService] User ID and Post ID (shortcode) are required.");
    return null;
  }
  try {
    const postDocRef = doc(db, 'userInstagramPostAnalytics', userId, 'posts', postId);
    const docSnap = await getDoc(postDocRef);
    if (docSnap.exists()) {
      const post = { ...docSnap.data(), id: docSnap.id } as StoredInstagramPost;
      console.log(`[InstagramService] Fetched post ${postId} for user ${userId}:`, JSON.stringify(post,null,2).substring(0,500)+"...");
      return post;
    }
    console.log(`[InstagramService] No post found with ID ${postId} for user ${userId}.`);
    return null;
  } catch (error) {
    console.error(`[InstagramService] Error fetching Instagram post analytics for post ${postId} of user ${userId}:`, error);
    return null;
  }
};

/**
 * Batch saves multiple Instagram post analytics data to Firestore for a specific user.
 * @param userId The ID of the user.
 * @param postsData An array of post data to save. Each must include 'id' (shortcode).
 */
export const batchSaveInstagramPostAnalytics = async (userId: string, postsData: StoredInstagramPost[]): Promise<void> => {
  if (!userId || !postsData || postsData.length === 0) {
    console.error("[InstagramService] User ID and posts data are required for batch save.");
    return;
  }
  try {
    const batch = writeBatch(db);
    const currentTime = new Date().toISOString();
    postsData.forEach(postData => {
      if (postData.id) {
        const postDocRef = doc(db, 'userInstagramPostAnalytics', userId, 'posts', postData.id);
        const dataToSave: StoredInstagramPost = {
          ...postData,
          lastFetched: currentTime, 
        };
        batch.set(postDocRef, dataToSave, { merge: true });
      }
    });
    await batch.commit();
    console.log(`[InstagramService] Batch saved ${postsData.length} posts for user ${userId}.`);
  } catch (error) {
    console.error(`[InstagramService] Error batch saving Instagram post analytics for user ${userId}:`, error);
    throw error;
  }
};
