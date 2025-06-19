
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
    // Update lastLogin time on fetch if it's different (or simply upon login success)
    const userData = userSnap.data() as User;
    const lastLoginTime = firebaseUser.metadata.lastSignInTime || new Date().toISOString();
    if (userData.lastLogin !== lastLoginTime) {
      await setDoc(userRef, { lastLogin: lastLoginTime }, { merge: true });
      return { ...userData, lastLogin: lastLoginTime };
    }
    return userData;
  } else {
    // If profile doesn't exist, create a basic one
    console.warn(`User profile for ${firebaseUser.uid} not found in Firestore. Creating one.`);
    return storeUserProfile(firebaseUser, { name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] });
  }
};


export const loginWithEmailPassword = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    const userProfile = await fetchUserProfile(firebaseUser);
    if (userProfile) {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const newLastLogin = new Date().toISOString();
      await setDoc(userRef, { lastLogin: newLastLogin }, { merge: true });
      return { ...userProfile, lastLogin: newLastLogin };
    }
    return null; 
  } catch (error) {
    console.error("Error logging in with email/password:", error);
    return null;
  }
};

export const signUpWithEmailPassword = async (name: string, email: string, password: string, role: 'user' | 'admin' = 'user', trackedChannels?: { youtube?: string[]; instagram?: string[] }): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    return storeUserProfile(firebaseUser, { name, email, role, trackedChannels });
  } catch (error) {
    console.error("Error signing up with email/password:", error);
    return null;
  }
};

export const getCurrentUser = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userProfile = await fetchUserProfile(firebaseUser);
      callback(userProfile);
    } else {
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
// The 'password' field in userData is for the form but not used here for Auth creation.
export const adminCreateUser = async (userData: Omit<User, 'id' | 'lastLogin' > & {password: string}): Promise<User | null> => {
  try {
    // This ID will be for the Firestore document. The actual Firebase Auth UID will be different
    // and needs to be associated if/when the auth user is created by an admin.
    // For simplicity, we generate a new ID here. If an admin creates an Auth user, they'd ideally
    // use that UID as the document ID here. This current flow is a simplified prototype approach.
    const newUserId = doc(collection(db, 'users')).id; 
    
    const newUserProfile: User = {
      id: newUserId, // This is the Firestore document ID, not necessarily the Auth UID.
      email: userData.email,
      name: userData.name,
      role: userData.role,
      lastLogin: new Date(0).toISOString(), // Indicates never logged in or unknown
      trackedChannels: userData.trackedChannels || { youtube: [], instagram: [] },
    };
    await setDoc(doc(db, 'users', newUserId), newUserProfile);
    console.log('Created new user profile in Firestore:', newUserProfile);
    // Note: The userData.password is collected by the form but NOT used here to create an Auth record.
    // This is a critical distinction for the admin to understand.
    return newUserProfile;
  } catch (error) {
    console.error('Error creating user profile in Firestore (admin):', error);
    return null;
  }
};

export const adminUpdateUser = async (userId: string, userData: Partial<Omit<User, 'id'>>): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    // Ensure email is not part of the update data if it's not allowed to be changed
    const { email, ...updateData } = userData;
    await updateDoc(userRef, updateData);
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
