
import { db } from './firebase';
import {
  doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, query, where, limit
} from 'firebase/firestore';

// User type for the application
export interface User {
  id: string; // Firestore document ID
  email: string;
  password: string; // Storing plaintext passwords - HIGHLY INSECURE
  role: 'user' | 'admin';
  name: string;
  lastLogin: string; // ISO string
  trackedChannels?: { youtube?: string[]; instagram?: string[] };
}

// Fetch user profile from Firestore by email
const fetchUserProfileByEmail = async (email: string): Promise<User | null> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where("email", "==", email), limit(1));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }
  const userDoc = querySnapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() } as User;
};


export const loginWithEmailPassword = async (email: string, passwordInput: string): Promise<User | null> => {
  try {
    const userProfile = await fetchUserProfileByEmail(email);

    if (userProfile && userProfile.password === passwordInput) { // Plaintext password comparison - HIGHLY INSECURE
      // Update lastLogin time
      const userRef = doc(db, 'users', userProfile.id);
      const lastLoginTime = new Date().toISOString();
      await updateDoc(userRef, { lastLogin: lastLoginTime });
      return { ...userProfile, lastLogin: lastLoginTime };
    }
    console.error("Login failed: Invalid email or password.");
    return null;
  } catch (error) {
    console.error("Error logging in with email/password:", error);
    throw error;
  }
};

// This function is no longer for Firebase Auth based current user,
// but will be used by useAuth hook to check localStorage
export const getCurrentUser = (callback: (user: User | null) => void): (() => void) => {
  // Placeholder for custom session management if needed beyond useAuth's localStorage
  // For this direct Firestore login, session is managed in useAuth.tsx
  const userString = localStorage.getItem('currentUser');
  if (userString) {
    try {
      const user: User = JSON.parse(userString);
      callback(user);
    } catch (e) {
      localStorage.removeItem('currentUser');
      callback(null);
    }
  } else {
    callback(null);
  }
  // Return an empty unsubscribe function as there's no persistent listener like onAuthStateChanged
  return () => {};
};

export const logoutService = async (): Promise<void> => {
  // No Firebase sign out needed. Session is cleared in useAuth.tsx
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
    // Check if user with this email already exists
    const existingUser = await fetchUserProfileByEmail(userData.email);
    if (existingUser) {
      console.error('Error creating user: Email already exists.');
      throw new Error('Email already exists.');
    }

    const newUserId = doc(collection(db, 'users')).id;
    const newUserProfile: User = {
      id: newUserId,
      email: userData.email,
      password: userData.password, // Storing plaintext password - HIGHLY INSECURE
      name: userData.name,
      role: userData.role,
      lastLogin: new Date(0).toISOString(), // Indicates never logged in
      trackedChannels: userData.trackedChannels || { youtube: [], instagram: [] },
    };
    await setDoc(doc(db, 'users', newUserId), newUserProfile);
    console.warn(`[ADMIN ACTION] Created user PROFILE in Firestore for ${userData.email} (ID: ${newUserId}). Password stored in plaintext.`);
    return newUserProfile;
  } catch (error) {
    console.error('Error creating user profile in Firestore (admin):', error);
    return null;
  }
};

export const adminUpdateUser = async (userId: string, userData: Partial<Omit<User, 'id' | 'email'>>): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    // If password is part of userData and is an empty string, don't update it (means user didn't want to change it)
    // If password is provided and not empty, update it.
    const updateData = { ...userData };
    if ('password' in updateData && updateData.password === '') {
      delete updateData.password; // Don't update password if it's an empty string from the form
    } else if ('password' in updateData && updateData.password) {
      // Password will be updated (plaintext)
      console.warn(`[ADMIN ACTION] Updating password for user ${userId} in plaintext.`);
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
    console.warn(`[ADMIN ACTION] User profile ${userId} deleted from Firestore.`);
    return true;
  } catch (error) {
    console.error("Error deleting user profile (admin):", error);
    return false;
  }
};

// Deprecated OTP functions - kept for completeness but non-functional
export const requestOtp = async (email: string): Promise<boolean> => {
  console.warn("requestOtp is deprecated. Login is direct via Firestore (insecure).");
  return false;
};

export const verifyOtp = async (email: string, otp: string): Promise<User | null> => {
  console.warn("verifyOtp is deprecated. Login is direct via Firestore (insecure).");
  return null;
};
