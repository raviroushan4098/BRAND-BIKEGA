
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayRemove, Timestamp } from 'firebase/firestore';

interface AssignLinksResult {
  success: boolean;
  actuallyAddedCount: number;
}

export interface UserYouTubeData {
  links: string[];
  lastRefreshedAt?: string; // ISO string
}

/**
 * Assigns or updates YouTube links for a specific user in the 'youtube' collection.
 * Also sets the lastRefreshedAt timestamp.
 * @param userId The ID of the user.
 * @param linksToAdd An array of new YouTube links to add.
 * @returns An object indicating success and the count of links actually added.
 */
export const assignYouTubeLinksToUser = async (userId: string, linksToAdd: string[]): Promise<AssignLinksResult> => {
  if (!userId || !linksToAdd) {
    console.error("User ID and links to add must be provided.");
    return { success: false, actuallyAddedCount: 0 };
  }

  try {
    const userLinksRef = doc(db, 'youtube', userId);
    const docSnap = await getDoc(userLinksRef);

    let existingLinks: string[] = [];
    if (docSnap.exists() && docSnap.data()?.links) {
      existingLinks = docSnap.data().links as string[];
    }

    const initialExistingLinksCount = existingLinks.length;
    const updatedLinks = Array.from(new Set([...existingLinks, ...linksToAdd.map(link => link.trim()).filter(Boolean)]));
    const actuallyAddedCount = updatedLinks.length - initialExistingLinksCount;

    await setDoc(userLinksRef, { 
      links: updatedLinks,
      lastRefreshedAt: new Date().toISOString() // Set/update timestamp on assignment
    }, { merge: true }); // Use merge to ensure other fields aren't overwritten
    return { success: true, actuallyAddedCount };
  } catch (error) {
    console.error("Error assigning YouTube links to user:", error);
    return { success: false, actuallyAddedCount: 0 };
  }
};

/**
 * Retrieves the list of YouTube links and the last refresh timestamp for a specific user.
 * @param userId The ID of the user.
 * @returns An object containing links and lastRefreshedAt, or default values if not found/error.
 */
export const getYouTubeLinksForUser = async (userId: string): Promise<UserYouTubeData> => {
  if (!userId) {
    return { links: [] };
  }
  try {
    const userLinksRef = doc(db, 'youtube', userId);
    const docSnap = await getDoc(userLinksRef);

    if (docSnap.exists() && docSnap.data()) {
      const data = docSnap.data();
      return { 
        links: data.links as string[] || [],
        lastRefreshedAt: data.lastRefreshedAt as string | undefined
      };
    }
    return { links: [] }; 
  } catch (error) {
    console.error("Error getting YouTube links for user:", error);
    return { links: [] };
  }
};

/**
 * Deletes a specific YouTube link for a user.
 * @param userId The ID of the user.
 * @param linkToDelete The specific link URL to delete.
 * @returns True if deletion was successful or link wasn't found, false on error.
 */
export const deleteYouTubeLinkForUser = async (userId: string, linkToDelete: string): Promise<boolean> => {
  if (!userId || !linkToDelete) {
    console.error("User ID and link to delete must be provided for YouTube link deletion.");
    return false;
  }
  try {
    const userLinksRef = doc(db, 'youtube', userId);
    // Firestore's arrayRemove doesn't error if the element isn't found.
    // It simply removes it if it exists.
    await updateDoc(userLinksRef, {
      links: arrayRemove(linkToDelete)
    });
    // We might also want to update lastRefreshedAt here if the list changes significantly,
    // or leave it to be updated by a full refresh action. For now, just removing the link.
    return true;
  } catch (error) {
    console.error(`Error deleting YouTube link ${linkToDelete} for user ${userId}:`, error);
    return false;
  }
};

/**
 * Updates the lastRefreshedAt timestamp for a user's YouTube feed.
 * @param userId The ID of the user.
 * @returns True if the timestamp was updated successfully, false otherwise.
 */
export const updateYouTubeLastRefreshTimestamp = async (userId: string): Promise<boolean> => {
  if (!userId) {
    console.error("User ID must be provided to update refresh timestamp.");
    return false;
  }
  try {
    const userLinksRef = doc(db, 'youtube', userId);
    await updateDoc(userLinksRef, {
      lastRefreshedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    // If the document doesn't exist, updateDoc will fail.
    // We could use setDoc with merge:true, but updateDoc is fine if doc is expected to exist.
    console.error("Error updating YouTube last refresh timestamp for user:", error);
    // Attempt to create if it doesn't exist (e.g., if links were added but timestamp failed)
    try {
      await setDoc(userLinksRef, { lastRefreshedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (setError) {
      console.error("Error setting YouTube last refresh timestamp after update failed:", setError);
      return false;
    }
  }
};
