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
  orderBy,
  Timestamp,
} from 'firebase/firestore';

export interface UtmLink {
  id: string;
  userId: string;
  baseUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  generatedUrl: string;
  createdAt: string; // ISO string
}

// Function to add a new UTM link
export const addUtmLink = async (linkData: Omit<UtmLink, 'id' | 'createdAt'>): Promise<UtmLink | null> => {
  try {
    const dataToSave = {
      ...linkData,
      createdAt: new Date().toISOString(), // Use a consistent ISO string
    };
    const docRef = await addDoc(collection(db, 'utmLinks'), dataToSave);
    // Return the exact data that was saved, plus the new ID from the doc reference
    return { ...dataToSave, id: docRef.id };
  } catch (error) {
    console.error("Error adding UTM link: ", error);
    return null;
  }
};

// Function to get all UTM links for a user
export const getUtmLinksForUser = async (userId: string): Promise<UtmLink[]> => {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, 'utmLinks'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UtmLink));
  } catch (error) {
    console.error("Error fetching UTM links: ", error);
    throw error; // Re-throw the error to be caught by the calling component
  }
};

// Function to delete a UTM link
export const deleteUtmLink = async (linkId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'utmLinks', linkId));
    return true;
  } catch (error) {
    console.error("Error deleting UTM link: ", error);
    return false;
  }
};
