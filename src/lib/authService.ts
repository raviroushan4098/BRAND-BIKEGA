
import { db } from './firebase';
import {
  doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, query, where, limit
} from 'firebase/firestore';

// User type for the application
export interface User {
  id: string; // Firestore document ID
  email: string;
  password: string; // Storing plaintext passwords
  role: 'user' | 'admin';
  name: string;
  lastLogin: string; // ISO string
  trackedChannels?: { youtube?: string[]; instagram?: string[] };
}

// Fetch user profile from Firestore by email (for direct login)
const fetchUserProfileByEmail = async (email: string): Promise<User | null> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }
  const userDoc = querySnapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() } as User;
};


// LOGIN METHOD: Checks credentials directly against Firestore
export const loginWithEmailPassword = async (email: string, passwordInput: string): Promise<User | null> => {
  try {
    const userProfile = await fetchUserProfileByEmail(email);

    if (userProfile) {
      if (userProfile.password === passwordInput) {
        const userRef = doc(db, 'users', userProfile.id);
        const lastLoginTime = new Date().toISOString();
        await updateDoc(userRef, { lastLogin: lastLoginTime });
        return { ...userProfile, lastLogin: lastLoginTime };
      } else {
        // Passwords do not match
        return null;
      }
    } else {
      // No user profile found
      return null;
    }
  } catch (error) {
    console.error("[AuthService] Error during direct Firestore login attempt:", error);
    throw error;
  }
};

export const logoutService = async (): Promise<void> => {
  localStorage.removeItem('currentUser');
};


// Admin functions
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersCollectionRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollectionRef);
    const users: User[] = [];
    querySnapshot.forEach((docSnap) => {
      users.push({ id: docSnap.id, ...docSnap.data() } as User);
    });
    return users;
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
};

export const adminCreateUser = async (userData: Omit<User, 'id' | 'lastLogin'>): Promise<User | null> => {
  try {
    const emailToStore = userData.email.toLowerCase();
    const existingUser = await fetchUserProfileByEmail(emailToStore);
    if (existingUser) {
      throw new Error('Email already exists.');
    }

    const newUserId = doc(collection(db, 'users')).id;
    const newUserProfile: User = {
      id: newUserId,
      email: emailToStore,
      password: userData.password, // Storing password from form
      name: userData.name,
      role: userData.role,
      lastLogin: new Date(0).toISOString(),
      trackedChannels: userData.trackedChannels || { youtube: [], instagram: [] },
    };

    await setDoc(doc(db, 'users', newUserId), newUserProfile);
    return newUserProfile;
  } catch (error) {
    console.error('[AuthService] Error creating user profile in Firestore (admin):', error);
    if (error instanceof Error && error.message === 'Email already exists.') {
        throw error;
    }
    return null;
  }
};

export const adminUpdateUser = async (userId: string, userData: Partial<Omit<User, 'id' | 'email'>>): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const updateData = { ...userData };

    if ('password' in updateData && updateData.password && updateData.password.length > 0) {
      // Password is being updated
    } else {
      delete updateData.password;
    }
    
    await updateDoc(userRef, updateData);
    return true;
  } catch (error) {
    console.error("Error updating user profile (admin):", error);
    return false;
  }
};

export const adminDeleteUser = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    return true;
  } catch (error) {
    console.error("Error deleting user profile (admin):", error);
    return false;
  }
};
