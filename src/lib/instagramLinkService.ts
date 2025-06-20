
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayRemove } from 'firebase/firestore';

interface AssignLinksResult {
  success: boolean;
  actuallyAddedCount: number;
}

export interface UserInstagramData {
  links: string[];
  lastRefreshedAt?: string; // ISO string
}

/**
 * Assigns or updates Instagram Reel links for a specific user.
 * Links are stored in an array field named 'links' within a document identified by the userId in the 'instagramReelLinks' collection.
 * Also sets the lastRefreshedAt timestamp.
 * @param userId The ID of the user.
 * @param linksToAdd An array of new Instagram Reel links to add.
 * @returns An object indicating success and the count of links actually added.
 */
export const assignInstagramLinksToUser = async (userId: string, linksToAdd: string[]): Promise<AssignLinksResult> => {
  if (!userId || !linksToAdd) {
    console.error("User ID and links to add must be provided.");
    return { success: false, actuallyAddedCount: 0 };
  }

  try {
    const userLinksRef = doc(db, 'instagramReelLinks', userId);
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
      lastRefreshedAt: new Date().toISOString() 
    }, { merge: true });
    return { success: true, actuallyAddedCount };
  } catch (error) {
    console.error("Error assigning Instagram Reel links to user:", error);
    return { success: false, actuallyAddedCount: 0 };
  }
};

/**
 * Retrieves the list of Instagram Reel links and the last refresh timestamp for a specific user.
 * @param userId The ID of the user.
 * @returns An object containing links and lastRefreshedAt, or default values if not found/error.
 */
export const getInstagramLinksForUser = async (userId: string): Promise<UserInstagramData> => {
  if (!userId) {
    return { links: [] };
  }
  try {
    const userLinksRef = doc(db, 'instagramReelLinks', userId);
    const docSnap = await getDoc(userLinksRef);

    if (docSnap.exists() && docSnap.data()) {
      const data = docSnap.data();
      return {
        links: (data.links as string[] | undefined) || [], // Ensure links is always an array
        lastRefreshedAt: data.lastRefreshedAt as string | undefined
      };
    }
    return { links: [] };
  } catch (error) {
    console.error("Error getting Instagram links for user:", error);
    return { links: [] };
  }
};

/**
 * Deletes a specific Instagram Reel link for a user.
 * @param userId The ID of the user.
 * @param linkToDelete The specific link URL to delete.
 * @returns True if deletion was successful or link wasn't found, false on error.
 */
export const deleteInstagramLinkForUser = async (userId: string, linkToDelete: string): Promise<boolean> => {
  if (!userId || !linkToDelete) {
    console.error("User ID and link to delete must be provided.");
    return false;
  }
  try {
    const userLinksRef = doc(db, 'instagramReelLinks', userId);
    const docSnap = await getDoc(userLinksRef);

    if (docSnap.exists() && docSnap.data()?.links) {
      const existingLinks = docSnap.data().links as string[];
      const updatedLinks = existingLinks.filter(link => link !== linkToDelete);

      if (updatedLinks.length === existingLinks.length) {
        return true;
      }
      // Also update lastRefreshedAt if we consider link deletion a "refresh" of the list
      await updateDoc(userLinksRef, { links: updatedLinks /*, lastRefreshedAt: new Date().toISOString() */ });
      return true;
    } else {
      return true;
    }
  } catch (error) {
    console.error(`Error deleting Instagram Reel link ${linkToDelete} for user ${userId}:`, error);
    return false;
  }
};

/**
 * Updates the lastRefreshedAt timestamp for a user's Instagram feed.
 * @param userId The ID of the user.
 * @returns True if the timestamp was updated successfully, false otherwise.
 */
export const updateInstagramLastRefreshTimestamp = async (userId: string): Promise<boolean> => {
  if (!userId) {
    console.error("User ID must be provided to update Instagram refresh timestamp.");
    return false;
  }
  try {
    const userLinksRef = doc(db, 'instagramReelLinks', userId);
    await updateDoc(userLinksRef, {
      lastRefreshedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    try {
      await setDoc(userLinksRef, { lastRefreshedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (setError) {
      console.error("Error setting Instagram last refresh timestamp after update failed:", setError);
      return false;
    }
  }
};
