
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayRemove } from 'firebase/firestore';

interface AssignLinksResult {
  success: boolean;
  actuallyAddedCount: number;
}

/**
 * Assigns or updates YouTube links for a specific user in the 'youtube' collection.
 * The links are stored in an array field named 'links' within a document identified by the userId.
 * @param userId The ID of the user.
 * @param linksToAdd An array of new YouTube links to add. Existing links and new links will be combined, and duplicates removed.
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

    // Combine new links with existing ones, ensuring uniqueness
    const updatedLinks = Array.from(new Set([...existingLinks, ...linksToAdd]));
    
    const actuallyAddedCount = updatedLinks.length - initialExistingLinksCount;

    await setDoc(userLinksRef, { links: updatedLinks });
    return { success: true, actuallyAddedCount };
  } catch (error) {
    console.error("Error assigning YouTube links to user:", error);
    return { success: false, actuallyAddedCount: 0 };
  }
};

/**
 * Retrieves the list of YouTube links for a specific user.
 * @param userId The ID of the user.
 * @returns An array of YouTube links, or an empty array if none are found or an error occurs.
 */
export const getYouTubeLinksForUser = async (userId: string): Promise<string[]> => {
  if (!userId) {
    return [];
  }
  try {
    const userLinksRef = doc(db, 'youtube', userId);
    const docSnap = await getDoc(userLinksRef);

    if (docSnap.exists() && docSnap.data()?.links) {
      return docSnap.data().links as string[];
    }
    return []; 
  } catch (error) {
    return [];
  }
};

/**
 * Deletes a specific YouTube link for a user from their document in the 'youtube' collection.
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
    await updateDoc(userLinksRef, {
      links: arrayRemove(linkToDelete)
    });
    console.log(`Attempted to delete YouTube link ${linkToDelete} for user ${userId}. If it existed, it's removed.`);
    // Firestore's arrayRemove doesn't error if the element isn't found, it just does nothing.
    // So, we assume success unless updateDoc throws.
    return true;
  } catch (error) {
    console.error(`Error deleting YouTube link ${linkToDelete} for user ${userId}:`, error);
    return false;
  }
};

