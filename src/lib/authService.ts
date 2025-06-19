
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
  // Firestore queries are case-sensitive. Ensure email in DB matches query.
  const q = query(usersRef, where("email", "==", email), limit(1));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log(`[AuthService-Debug] fetchUserProfileByEmail: No user found for email '${email}'`);
    return null;
  }
  const userDoc = querySnapshot.docs[0];
  console.log(`[AuthService-Debug] fetchUserProfileByEmail: User found for email '${email}', ID: ${userDoc.id}`);
  return { id: userDoc.id, ...userDoc.data() } as User;
};


// INSECURE LOGIN METHOD: Checks credentials directly against Firestore
export const loginWithEmailPassword = async (email: string, passwordInput: string): Promise<User | null> => {
  console.log(`[AuthService-Debug] Attempting direct Firestore login for email: '${email}' with input password: '${passwordInput}' (INSECURE)`);
  try {
    const userProfile = await fetchUserProfileByEmail(email);

    if (userProfile) {
      // SECURITY WARNING: Logging stored password to console. REMOVE AFTER DEBUGGING.
      console.log(`[AuthService-Debug] User profile found in Firestore for '${email}'. Stored password: '${userProfile.password}'`);
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
    throw error; // Re-throw to be caught by useAuth and then the login page
  }
};

// This function is no longer for Firebase Auth based current user,
// but will be used by useAuth hook to check localStorage
export const getCurrentUser = (callback: (user: User | null) => void): (() => void) => {
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
  // Return a no-op unsubscribe function as there's no persistent listener
  return () => {};
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
  console.warn("[AuthService-Admin] CRITICAL SECURITY WARNING: Creating user profile with password stored in PLAINTEXT in Firestore. This is highly insecure.");
  try {
    // Check if user already exists by email to prevent duplicates
    const existingUser = await fetchUserProfileByEmail(userData.email);
    if (existingUser) {
      console.error('[AuthService] Error creating user profile: Email already exists in Firestore.');
      throw new Error('Email already exists.');
    }

    const newUserId = doc(collection(db, 'users')).id; // Generate a new ID for Firestore
    const newUserProfile: User = {
      id: newUserId, // Use the generated Firestore ID
      email: userData.email,
      password: userData.password, // Storing plaintext password - HIGHLY INSECURE
      name: userData.name,
      role: userData.role,
      lastLogin: new Date(0).toISOString(), // Indicates never logged in
      trackedChannels: userData.trackedChannels || { youtube: [], instagram: [] },
    };
    // Store the new user profile in Firestore using the generated ID
    await setDoc(doc(db, 'users', newUserId), newUserProfile);
    console.log(`[ADMIN ACTION] Created user PROFILE in Firestore for ${userData.email} (ID: ${newUserId}). Password stored in plaintext. This is INSECURE.`);
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

    // Handle password update: if password field is present and not empty, it's updated.
    // If password field is present but empty string, it means admin wants to clear it (which is bad, but allowed by this logic).
    // If password field is not in userData, it's not changed.
    if ('password' in updateData && updateData.password) {
      console.warn(`[ADMIN ACTION] Updating password for user ${userId} in plaintext (INSECURE).`);
    } else if ('password' in updateData && updateData.password === '') {
      // This case means the admin explicitly cleared the password field in the form.
      // We should retain the old password if no new one is provided or explicitly cleared.
      // For this insecure model, if they submit an empty password, it will be stored as empty.
      // A better approach for "keep old password" would be to not include 'password' in updateData if field is empty.
      // The form logic in CreateUserForm.tsx handles this by not sending password if blank on edit.
       delete updateData.password; // If password is empty string, don't update it.
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


// Deprecated OTP functions (were never fully implemented for OTP, now further irrelevant)
export const requestOtp = async (email: string): Promise<boolean> => {
  console.warn("requestOtp is deprecated. Login is direct via Firestore (insecure).");
  return false;
};

export const verifyOtp = async (email: string, otp: string): Promise<User | null> => {
  console.warn("verifyOtp is deprecated. Login is direct via Firestore (insecure).");
  return null;
};
