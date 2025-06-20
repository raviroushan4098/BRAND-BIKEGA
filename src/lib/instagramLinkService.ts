
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AssignLinksResult {
  success: boolean;
  actuallyAddedCount: number;
}

/**
 * Assigns or updates Instagram Reel links for a specific user.
 * Links are stored in an array field named 'links' within a document identified by the userId in the 'instagramReelLinks' collection.
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
    const userLinksRef = doc(db, 'instagramReelLinks', userId); // Changed collection name
    const docSnap = await getDoc(userLinksRef);

    let existingLinks: string[] = [];
    if (docSnap.exists() && docSnap.data()?.links) {
      existingLinks = docSnap.data().links as string[];
    }

    const initialExistingLinksCount = existingLinks.length;
    const updatedLinks = Array.from(new Set([...existingLinks, ...linksToAdd.map(link => link.trim()).filter(Boolean)]));
    const actuallyAddedCount = updatedLinks.length - initialExistingLinksCount;

    await setDoc(userLinksRef, { links: updatedLinks });
    return { success: true, actuallyAddedCount };
  } catch (error) {
    console.error("Error assigning Instagram Reel links to user:", error);
    return { success: false, actuallyAddedCount: 0 };
  }
};

/**
 * Retrieves the list of Instagram Reel links for a specific user.
 * @param userId The ID of the user.
 * @returns An array of Instagram Reel links, or an empty array if none are found or an error occurs.
 */
export const getInstagramLinksForUser = async (userId: string): Promise<string[]> => {
  if (!userId) {
    return [];
  }
  try {
    const userLinksRef = doc(db, 'instagramReelLinks', userId); // Changed collection name
    const docSnap = await getDoc(userLinksRef);

    if (docSnap.exists() && docSnap.data()?.links) {
      return docSnap.data().links as string[];
    }
    return [];
  } catch (error) {
    return [];
  }
};

