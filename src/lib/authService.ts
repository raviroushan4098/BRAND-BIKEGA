
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

// Fetch user profile from Firestore by email (for direct login)
const fetchUserProfileByEmail = async (email: string): Promise<User | null> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1)); // Query with lowercase email
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log(`[AuthService-Debug] fetchUserProfileByEmail: No user found for email '${email.toLowerCase()}'`);
    return null;
  }
  const userDoc = querySnapshot.docs[0];
  console.log(`[AuthService-Debug] fetchUserProfileByEmail: User found for email '${email.toLowerCase()}', ID: ${userDoc.id}`);
  return { id: userDoc.id, ...userDoc.data() } as User;
};


// INSECURE LOGIN METHOD: Checks credentials directly against Firestore
export const loginWithEmailPassword = async (email: string, passwordInput: string): Promise<User | null> => {
  console.log(`[AuthService-Debug] Attempting direct Firestore login for email: '${email}' with input password: '${passwordInput}' (INSECURE)`);
  try {
    const userProfile = await fetchUserProfileByEmail(email); // Email is already lowercased by fetchUserProfileByEmail

    if (userProfile) {
      console.log(`[AuthService-Debug] User profile found in Firestore for '${userProfile.email}'. Stored password: '${userProfile.password}'`);
      console.log(`[AuthService-Debug] Comparing input password '${passwordInput}' with stored password '${userProfile.password}'`);

      if (userProfile.password === passwordInput) { // Plaintext password comparison - HIGHLY INSECURE
        console.log("[AuthService-Debug] Passwords match. Updating lastLogin.");
        const userRef = doc(db, 'users', userProfile.id);
        const lastLoginTime = new Date().toISOString();
        await updateDoc(userRef, { lastLogin: lastLoginTime });
        return { ...userProfile, lastLogin: lastLoginTime };
      } else {
        console.error("[AuthService] Login failed: Passwords do not match. (Direct Firestore check)");
        return null;
      }
    } else {
      console.error(`[AuthService] Login failed: No user profile found in Firestore for email '${email}'. (Direct Firestore check)`);
      return null;
    }
  } catch (error) {
    console.error("[AuthService] Error during direct Firestore login attempt:", error);
    throw error;
  }
};

export const logoutService = async (): Promise<void> => {
  localStorage.removeItem('currentUser');
  console.log("[AuthService] User logged out, currentUser removed from localStorage.");
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
  console.warn("[AuthService-Admin] CRITICAL SECURITY WARNING: Creating user profile with password stored in PLAINTEXT in Firestore. This is highly insecure.");
  try {
    const emailToStore = userData.email.toLowerCase(); // Store email in lowercase
    const existingUser = await fetchUserProfileByEmail(emailToStore);
    if (existingUser) {
      console.error(`[AuthService] Error creating user profile: Email '${emailToStore}' already exists in Firestore.`);
      throw new Error('Email already exists.');
    }

    const newUserId = doc(collection(db, 'users')).id;
    const newUserProfile: User = {
      id: newUserId,
      email: emailToStore, // Save lowercase email
      password: userData.password, // Storing plaintext password from form
      name: userData.name,
      role: userData.role,
      lastLogin: new Date(0).toISOString(),
      trackedChannels: userData.trackedChannels || { youtube: [], instagram: [] },
    };

    // Log the object that will be saved to Firestore for debugging
    console.log("[AuthService-Admin] Saving new user profile to Firestore:", JSON.stringify(newUserProfile, null, 2));

    await setDoc(doc(db, 'users', newUserId), newUserProfile);
    console.log(`[ADMIN ACTION] Created user PROFILE in Firestore for ${emailToStore} (ID: ${newUserId}). Password stored in plaintext. This is INSECURE.`);
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
  console.warn(`[AuthService-Admin] Attempting to update user profile ${userId}. If password is changed, it will be stored in PLAINTEXT.`);
  try {
    const userRef = doc(db, 'users', userId);
    const updateData = { ...userData };

    if ('password' in updateData && updateData.password && updateData.password.length > 0) {
      console.warn(`[ADMIN ACTION] Updating password for user ${userId} in plaintext (INSECURE).`);
    } else {
      // If password is not provided or is an empty string, remove it from updateData to avoid overwriting with empty.
      delete updateData.password;
    }
    // Log the object that will be used for updating Firestore for debugging
    console.log(`[AuthService-Admin] Updating user profile ${userId} in Firestore with:`, JSON.stringify(updateData, null, 2));

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
