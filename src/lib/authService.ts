
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
    // This case might happen if user was created but Firestore doc creation failed
    // or for users authenticating for the first time via a method that doesn't explicitly call storeUserProfile
    console.warn(`User profile for ${firebaseUser.uid} not found in Firestore. Creating one.`);
    return storeUserProfile(firebaseUser, { name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] });
  }
};


export const loginWithEmailPassword = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    // Fetch/update user profile from Firestore, including role
    const userProfile = await fetchUserProfile(firebaseUser);
    if (userProfile) {
       // Update last login in Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
      return { ...userProfile, lastLogin: new Date().toISOString() };
    }
    return null; // Should not happen if fetchUserProfile creates profile
  } catch (error) {
    console.error("Error logging in with email/password:", error);
    return null;
  }
};

export const signUpWithEmailPassword = async (name: string, email: string, password: string, role: 'user' | 'admin' = 'user', trackedChannels?: { youtube?: string[]; instagram?: string[] }): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    // Store additional user profile information in Firestore
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
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });
    return users;
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
};

// This admin function creates a user in Firebase Auth and then their profile in Firestore.
// Note: For enhanced security, user creation, especially by an admin, is often handled by a backend (e.g., Firebase Cloud Function)
// to manage permissions and roles more securely. This client-side version assumes the admin has appropriate Firestore rules.
export const adminCreateUser = async (userData: Omit<User, 'id' | 'lastLogin' > & {password: string}): Promise<User | null> => {
  // IMPORTANT: Firebase Admin SDK is required to create users without signing them in, or to set initial passwords securely server-side.
  // This client-side approach will attempt to create the user.
  // For a production app, use Firebase Admin SDK in a Cloud Function.
  
  // This is a simplified placeholder. True admin user creation without sign-in requires Admin SDK.
  // For this prototype, we'll rely on the admin being logged in and Firestore rules.
  // The `createUserWithEmailAndPassword` will sign in the new user temporarily on the client creating them. This is not ideal for admin creation.
  // A proper solution would involve a Cloud Function.
  // For this prototype, we'll just create the Firestore document assuming the auth part is handled or simulated.
  // Or, if we must use client SDK, we'd create then sign out, but this has security implications.

  // Let's assume admin uses this to create a Firestore record, and the auth user might be created separately or this is a placeholder.
  // A more robust client-side way an admin could *invite* a user:
  // 1. Admin creates a document in a 'pendingUsers' or similar collection with email, role, etc.
  // 2. A Cloud Function listens to this collection, creates the user in Firebase Auth, sends an invite/password reset.
  // 3. Upon first login, user sets password, and their main user profile is created.

  // For the direct request: "Admin users can create new users"
  // This is highly simplified and has limitations.
  try {
    // Step 1: Create user in Firebase Auth (problematic client-side for admin creation as it signs in the new user)
    // We will skip direct auth creation here and focus on Firestore record for simplicity of prototype.
    // The user would need to be created in Firebase Auth console by the admin, then their profile here.
    // OR, if the admin *is* creating and setting a password:
    // This is NOT ideal from admin panel - temporary workaround for prototyping.
    // const tempAuth = getAuth(app); // Use a temporary auth instance if needed, or rely on current admin's session for Firestore.
    // const newUserCredential = await createUserWithEmailAndPassword(tempAuth, userData.email, userData.password);
    // const newFirebaseUser = newUserCredential.user;

    // For prototype, we'll create the Firestore record. Admin must ensure Auth user exists.
    // Or, if we assume the password field is for the new user:
    // This will create the user in Firebase Auth.
    // It's not standard for an admin panel to create users with passwords client-side this way.
    // This will effectively sign out the admin and sign in the new user during creation.

    // A better mock for "admin creates user":
    // Admin fills form -> data sent to a (mocked or real) backend/Cloud Function that uses Admin SDK.
    // Since we are client-only for now:
    const newUserId = doc(collection(db, 'users')).id; // Generate a new ID for Firestore
    const newUserProfile: User = {
      id: newUserId, // Or use UID from auth if created above
      email: userData.email,
      name: userData.name,
      role: userData.role,
      lastLogin: new Date(0).toISOString(), // Never logged in
      trackedChannels: userData.trackedChannels || { youtube: [], instagram: [] },
    };
    await setDoc(doc(db, 'users', newUserId), newUserProfile);
    console.log('Created new user profile in Firestore (mock - auth user needs separate creation by admin):', newUserProfile);
    // IMPORTANT: The above does NOT create an Auth user. Admin must do this via Firebase Console.
    // If the intention is for admin to create Auth user + Firestore profile:
    // That requires Admin SDK or complex client-side flow with sign-out/sign-in.
    // For now, the `createUser` on `src/app/admin/users/page.tsx` will call this
    // and it primarily manages the Firestore part.
    return newUserProfile;

  } catch (error) {
    console.error('Error creating user (admin mock):', error);
    return null;
  }
};

export const adminUpdateUser = async (userId: string, userData: Partial<Omit<User, 'id'>>): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, userData);
    return true;
  } catch (error) {
    console.error("Error updating user (admin):", error);
    return false;
  }
};


export const adminDeleteUser = async (userId: string): Promise<boolean> => {
  // Deleting a user from Firebase Auth is a sensitive operation, typically done with Admin SDK.
  // This function will only delete the Firestore user profile.
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    // NB: Firebase Auth user is NOT deleted here. Admin must do this manually in Firebase Console.
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
