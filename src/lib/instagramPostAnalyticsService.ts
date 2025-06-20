
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
  orderBy // Added orderBy
} from 'firebase/firestore';

// Interface for stored Instagram post analytics
export interface StoredInstagramPost {
  id: string; // Reel shortcode, used as Firestore document ID
  reelUrl: string; // Original URL assigned by admin
  thumbnailUrl?: string; // Optional, can be a placeholder initially
  caption?: string; // Optional, can be a placeholder
  likes: number;
  comments: number;
  views: number; // Mapped from playCount
  timestamp?: string; // ISO string, could be post creation or last fetched
  lastFetched: string; // ISO string, timestamp of when data was last fetched
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
    console.error("User ID and post data with post ID (shortcode) are required to save analytics.");
    throw new Error("User ID and post data with post ID (shortcode) are required.");
  }
  try {
    const postDocRef = doc(db, 'userInstagramPostAnalytics', userId, 'posts', postData.id);
    const dataToSave: StoredInstagramPost = {
      ...postData,
      lastFetched: new Date().toISOString(), // Ensure lastFetched is always updated
    };
    await setDoc(postDocRef, dataToSave, { merge: true });
  } catch (error) {
    console.error(`Error saving Instagram post analytics for post ${postData.id} of user ${userId}:`, error);
    throw error;
  }
};

/**
 * Retrieves all stored Instagram post analytics data for a specific user from Firestore.
 * @param userId The ID of the user.
 * @returns An array of StoredInstagramPost objects.
 */
export const getAllInstagramPostAnalyticsForUser = async (userId: string): Promise<StoredInstagramPost[]> => {
  if (!userId) {
    console.warn("User ID is required to fetch Instagram post analytics.");
    return [];
  }
  try {
    const postsCollectionRef = collection(db, 'userInstagramPostAnalytics', userId, 'posts');
    // Order by lastFetched descending to get newest first, or another field like 'timestamp' if available
    const q = query(postsCollectionRef, orderBy('lastFetched', 'desc')); 
    
    const querySnapshot = await getDocs(q);
    const posts: StoredInstagramPost[] = [];
    querySnapshot.forEach((docSnap) => {
      posts.push({ ...docSnap.data(), id: docSnap.id } as StoredInstagramPost);
    });
    return posts;
  } catch (error) {
    console.error(`Error fetching all Instagram post analytics for user ${userId}:`, error);
    return [];
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
    console.warn("User ID and Post ID (shortcode) are required.");
    return null;
  }
  try {
    const postDocRef = doc(db, 'userInstagramPostAnalytics', userId, 'posts', postId);
    const docSnap = await getDoc(postDocRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as StoredInstagramPost;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching Instagram post analytics for post ${postId} of user ${userId}:`, error);
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
    console.error("User ID and posts data are required for batch save.");
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
          lastFetched: currentTime, // Ensure lastFetched is consistent for the batch
        };
        batch.set(postDocRef, dataToSave, { merge: true });
      }
    });
    await batch.commit();
  } catch (error) {
    console.error(`Error batch saving Instagram post analytics for user ${userId}:`, error);
    throw error;
  }
};
