
import { db } from './firebase';
import {
  doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, Timestamp, query, orderBy
} from 'firebase/firestore';

export interface ApiKey {
  id: string;
  serviceName: string;
  keyValue: string;
  description?: string;
  createdAt: string; // ISO string
  userId?: string; // Optional: ID of the user/admin who created it
}

export const addApiKey = async (apiKeyData: Omit<ApiKey, 'id' | 'createdAt'>): Promise<ApiKey | null> => {
  try {
    const newApiKeyId = doc(collection(db, 'apiKeys')).id;
    const newApiKey: ApiKey = {
      ...apiKeyData,
      id: newApiKeyId,
      createdAt: Timestamp.now().toDate().toISOString(),
    };
    await setDoc(doc(db, 'apiKeys', newApiKeyId), newApiKey);
    return newApiKey;
  } catch (error) {
    console.error("Error adding API key:", error);
    return null;
  }
};

export const getAllApiKeys = async (): Promise<ApiKey[]> => {
  try {
    const apiKeysCollectionRef = collection(db, 'apiKeys');
    const q = query(apiKeysCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const apiKeys: ApiKey[] = [];
    querySnapshot.forEach((docSnap) => {
      apiKeys.push({ id: docSnap.id, ...docSnap.data() } as ApiKey);
    });
    return apiKeys;
  } catch (error) {
    console.error("Error fetching all API keys:", error);
    return [];
  }
};

export const updateApiKey = async (apiKeyId: string, apiKeyData: Partial<Omit<ApiKey, 'id' | 'createdAt'>>): Promise<boolean> => {
  try {
    const apiKeyRef = doc(db, 'apiKeys', apiKeyId);
    await updateDoc(apiKeyRef, apiKeyData);
    return true;
  } catch (error) {
    console.error("Error updating API key:", error);
    return false;
  }
};

export const deleteApiKey = async (apiKeyId: string): Promise<boolean> => {
  try {
    const apiKeyRef = doc(db, 'apiKeys', apiKeyId);
    await deleteDoc(apiKeyRef);
    return true;
  } catch (error) {
    console.error("Error deleting API key:", error);
    return false;
  }
};
