
'use server';

import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  writeBatch,
  Timestamp,
  query,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import type { YouTubeVideo } from './mockData'; // Assuming YouTubeVideo defines the structure

export interface StoredYouTubeVideo extends Partial<YouTubeVideo> {
  id: string; // videoId is the document ID
  lastFetched?: string; // ISO string timestamp
}

/**
 * Saves or updates a single YouTube video's analytics data in Firestore for a specific user.
 * Path: userVideoAnalytics/{userId}/videos/{videoId}
 * @param userId The ID of the user.
 * @param videoData The video data to save. Must include 'id' (videoId).
 */
export const saveVideoAnalytics = async (userId: string, videoData: Partial<YouTubeVideo>): Promise<void> => {
  if (!userId || !videoData || !videoData.id) {
    console.error("User ID and video data with video ID are required to save analytics.");
    throw new Error("User ID and video data with video ID are required.");
  }
  try {
    const videoDocRef = doc(db, 'userVideoAnalytics', userId, 'videos', videoData.id);
    const dataToSave: StoredYouTubeVideo = {
      ...videoData,
      lastFetched: new Date().toISOString(),
    };
    await setDoc(videoDocRef, dataToSave, { merge: true }); // Merge to update existing or create new
  } catch (error) {
    console.error(`Error saving video analytics for video ${videoData.id} of user ${userId}:`, error);
    throw error; // Re-throw to be caught by caller
  }
};

/**
 * Retrieves all stored YouTube video analytics data for a specific user from Firestore.
 * @param userId The ID of the user.
 * @returns An array of StoredYouTubeVideo objects.
 */
export const getAllVideoAnalyticsForUser = async (userId: string): Promise<StoredYouTubeVideo[]> => {
  if (!userId) {
    console.warn("User ID is required to fetch video analytics.");
    return [];
  }
  try {
    const videosCollectionRef = collection(db, 'userVideoAnalytics', userId, 'videos');
    // Optionally, order by a field if needed, e.g., lastFetched or publishedAt
    // For now, no specific order, Firestore's default (by ID) will be used or rely on client-side sort.
    const q = query(videosCollectionRef, orderBy('publishedAt', 'desc')); // Example order
    
    const querySnapshot = await getDocs(q);
    const videos: StoredYouTubeVideo[] = [];
    querySnapshot.forEach((docSnap) => {
      videos.push({ ...docSnap.data(), id: docSnap.id } as StoredYouTubeVideo);
    });
    return videos;
  } catch (error) {
    console.error(`Error fetching all video analytics for user ${userId}:`, error);
    return []; // Return empty on error to allow UI to handle it
  }
};

/**
 * Retrieves a single YouTube video's analytics data from Firestore.
 * @param userId The ID of the user.
 * @param videoId The ID of the video.
 * @returns The StoredYouTubeVideo object or null if not found.
 */
export const getVideoAnalytics = async (userId: string, videoId: string): Promise<StoredYouTubeVideo | null> => {
  if (!userId || !videoId) {
    console.warn("User ID and Video ID are required.");
    return null;
  }
  try {
    const videoDocRef = doc(db, 'userVideoAnalytics', userId, 'videos', videoId);
    const docSnap = await getDoc(videoDocRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as StoredYouTubeVideo;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching video analytics for video ${videoId} of user ${userId}:`, error);
    return null;
  }
};

/**
 * Deletes a single YouTube video's analytics data from Firestore.
 * @param userId The ID of the user.
 * @param videoId The ID of the video to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export const deleteVideoAnalytics = async (userId: string, videoId: string): Promise<boolean> => {
  if (!userId || !videoId) {
    console.error("User ID and Video ID are required for deletion.");
    return false;
  }
  try {
    const videoDocRef = doc(db, 'userVideoAnalytics', userId, 'videos', videoId);
    await deleteDoc(videoDocRef);
    console.log(`Successfully deleted video analytics for video ${videoId} of user ${userId}.`);
    return true;
  } catch (error) {
    console.error(`Error deleting video analytics for video ${videoId} of user ${userId}:`, error);
    return false;
  }
};

/**
 * Batch saves multiple YouTube video analytics data to Firestore for a specific user.
 * This is more efficient for updating many videos at once if not showing per-video progress.
 * @param userId The ID of the user.
 * @param videosData An array of video data to save. Each must include 'id' (videoId).
 */
export const batchSaveVideoAnalytics = async (userId: string, videosData: Partial<YouTubeVideo>[]): Promise<void> => {
  if (!userId || !videosData || videosData.length === 0) {
    console.error("User ID and videos data are required for batch save.");
    return;
  }
  try {
    const batch = writeBatch(db);
    videosData.forEach(videoData => {
      if (videoData.id) {
        const videoDocRef = doc(db, 'userVideoAnalytics', userId, 'videos', videoData.id);
        const dataToSave: StoredYouTubeVideo = {
          ...videoData,
          lastFetched: new Date().toISOString(),
        };
        batch.set(videoDocRef, dataToSave, { merge: true });
      }
    });
    await batch.commit();
  } catch (error) {
    console.error(`Error batch saving video analytics for user ${userId}:`, error);
    throw error;
  }
};
