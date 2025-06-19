
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';

// User type for the application, extending with Firebase UID
export interface User {
  id: string; // Firebase UID
  email: string;
  role: 'user' | 'admin';
  name: string;
  lastLogin: string; // ISO string
  trackedChannels?: { youtube?: string[]; instagram?: string[] };
}

// Store user profile in Firestore
const storeUserProfile = async (firebaseUser: FirebaseUser, additionalData: Partial<User> = {}) => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const data: Partial<User> = {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: additionalData.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous',
    role: additionalData.role || 'user', // Default role
    lastLogin: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
    trackedChannels: additionalData.trackedChannels || { youtube: [], instagram: [] },
  };
  await setDoc(userRef, data, { merge: true });
  return data as User;
};

export const fetchUserProfile = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    // User profile exists, update lastLogin time
    const userData = userSnap.data() as User;
    const lastLoginTime = firebaseUser.metadata.lastSignInTime || new Date().toISOString();
    if (userData.lastLogin !== lastLoginTime) {
      await setDoc(userRef, { lastLogin: lastLoginTime }, { merge: true });
      return { ...userData, lastLogin: lastLoginTime };
    }
    return userData;
  } else {
    // If profile doesn't exist in Firestore (e.g., first login for an Auth user), create a basic one.
    console.warn(`User profile for ${firebaseUser.uid} not found in Firestore. Creating one.`);
    return storeUserProfile(firebaseUser, { name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] });
  }
};


export const loginWithEmailPassword = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // After successful Firebase Authentication, fetch/create the user's profile from Firestore.
    const userProfile = await fetchUserProfile(firebaseUser);
    
    if (userProfile) {
      // Ensure lastLogin is updated in Firestore if it was fetched (fetchUserProfile handles this)
      // and return the comprehensive user profile.
      return { ...userProfile, lastLogin: firebaseUser.metadata.lastSignInTime || new Date().toISOString() };
    }
    return null; 
  } catch (error) {
    console.error("Error logging in with email/password:", error);
    // Ensure the error is re-thrown or handled appropriately if needed by the caller
    // For now, returning null indicates failure to the caller (useAuth hook)
    throw error; // Re-throwing allows the caller to catch Firebase specific errors if needed
  }
};

export const signUpWithEmailPassword = async (name: string, email: string, password: string, role: 'user' | 'admin' = 'user', trackedChannels?: { youtube?: string[]; instagram?: string[] }): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    // Store additional profile information in Firestore
    return storeUserProfile(firebaseUser, { name, email, role, trackedChannels });
  } catch (error) {
    console.error("Error signing up with email/password:", error);
    return null;
  }
};

export const getCurrentUser = (callback: (user: User | null) => void): (() => void) => {
  // Observes Firebase Auth state changes
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // If a Firebase user is authenticated, fetch their profile from Firestore
      const userProfile = await fetchUserProfile(firebaseUser);
      callback(userProfile);
    } else {
      // No Firebase user authenticated
      callback(null);
    }
  });
};

export const logoutService = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
  }
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

// Admin creates a user profile in Firestore.
// IMPORTANT: This function DOES NOT create a Firebase Authentication user.
// The admin must create the auth user in the Firebase Console for them to be able to log in.
export const adminCreateUser = async (userData: Omit<User, 'id' | 'lastLogin' > & {password?: string}): Promise<User | null> => {
  try {
    // This ID will be for the Firestore document. For this prototype, we ensure it's unique.
    // A more robust system might require the admin to provide the Firebase Auth UID if the Auth user is created first.
    const newUserId = doc(collection(db, 'users')).id; 
    
    const newUserProfile: User = {
      id: newUserId, 
      email: userData.email,
      name: userData.name,
      role: userData.role,
      lastLogin: new Date(0).toISOString(), // Indicates never logged in or unknown default
      trackedChannels: userData.trackedChannels || { youtube: [], instagram: [] },
    };
    await setDoc(doc(db, 'users', newUserId), newUserProfile);
    // The userData.password is from the form but NOT used here to create an Auth record.
    return newUserProfile;
  } catch (error) {
    console.error('Error creating user profile in Firestore (admin):', error);
    return null;
  }
};

export const adminUpdateUser = async (userId: string, userData: Partial<Omit<User, 'id' | 'email'>>): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, userData);
    return true;
  } catch (error) {
    console.error("Error updating user profile (admin):", error);
    return false;
  }
};

export const adminDeleteUser = async (userId: string): Promise<boolean> => {
  // This function only deletes the Firestore user profile.
  // Firebase Auth user record is NOT deleted here. Admin must do this manually in Firebase Console.
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    console.warn(`User profile ${userId} deleted from Firestore. Auth user NOT deleted.`);
    return true;
  } catch (error) {
    console.error("Error deleting user profile (admin):", error);
    return false;
  }
};

// Deprecated OTP functions (can be removed if no longer needed)
export const requestOtp = async (email: string): Promise<boolean> => {
  console.warn("requestOtp is deprecated. Use email/password authentication.");
  return false;
};

export const verifyOtp = async (email: string, otp: string): Promise<User | null> => {
  console.warn("verifyOtp is deprecated. Use email/password authentication.");
  return null;
};
