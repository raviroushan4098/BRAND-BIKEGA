
'use server';

import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  limit,
} from 'firebase/firestore';

// Interface for redirect links, replacing the old UtmLink
export interface RedirectLink {
  id: string; // Firestore document ID
  userId: string;
  shortId: string; // The unique part of the short URL, e.g., "abC123"
  destinationUrl: string; // The final URL with UTM parameters
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  shortUrl: string; // The full short URL to be shared, e.g., https://app.com/track/{shortId}
  createdAt: string; // ISO string
}

// Function to generate a short random ID
const generateShortId = (length = 7): string => {
  return Math.random().toString(36).substring(2, 2 + length);
};

// Function to add a new redirect link to the `redirectLinks` collection
export const addRedirectLink = async (
  linkData: Omit<RedirectLink, 'id' | 'createdAt' | 'shortId' | 'shortUrl'> & { origin: string }
): Promise<RedirectLink | null> => {
  try {
    const shortId = generateShortId();
    // In a production app, you would check for collisions here, but it's highly unlikely for this demo.

    const fullDestinationUrl = new URL(linkData.destinationUrl);
    fullDestinationUrl.searchParams.set('utm_source', linkData.utmSource);
    fullDestinationUrl.searchParams.set('utm_medium', linkData.utmMedium);
    fullDestinationUrl.searchParams.set('utm_campaign', linkData.utmCampaign);

    const dataToSave: Omit<RedirectLink, 'id'> = {
      userId: linkData.userId,
      shortId: shortId,
      destinationUrl: fullDestinationUrl.toString(),
      utmSource: linkData.utmSource,
      utmMedium: linkData.utmMedium,
      utmCampaign: linkData.utmCampaign,
      shortUrl: `${linkData.origin}/track/${shortId}`, // Construct the short URL
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'redirectLinks'), dataToSave);
    return { ...dataToSave, id: docRef.id };
  } catch (error) {
    console.error("Error adding redirect link: ", error);
    return null;
  }
};

// Function to get the original URL details from a short ID
export const getRedirectLinkByShortId = async (shortId: string): Promise<RedirectLink | null> => {
    if (!shortId) return null;
    try {
        const q = query(
            collection(db, 'redirectLinks'),
            where('shortId', '==', shortId),
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as RedirectLink;
    } catch (error) {
        console.error("Error fetching redirect link by short ID: ", error);
        return null;
    }
}


// Function to get all redirect links for a user
export const getRedirectLinksForUser = async (userId: string): Promise<RedirectLink[]> => {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, 'redirectLinks'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const links = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedirectLink));

    links.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return links;
  } catch (error) {
    console.error("Error fetching redirect links: ", error);
    throw error;
  }
};

// Function to delete a redirect link
export const deleteRedirectLink = async (linkId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'redirectLinks', linkId));
    return true;
  } catch (error) {
    console.error("Error deleting redirect link: ", error);
    return false;
  }
};
