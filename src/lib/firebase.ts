
import { initializeApp, getApps, getApp } from 'firebase/app';
// import { getAuth } from 'firebase/auth'; // Firebase Auth is no longer used directly for login
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWK3lGZYnugzakCiceZ1o5j2HM-yHyjmo",
  authDomain: "insertfetch-663ca.firebaseapp.com",
  databaseURL: "https://insertfetch-663ca-default-rtdb.firebaseio.com",
  projectId: "insertfetch-663ca",
  storageBucket: "insertfetch-663ca.appspot.com", // Corrected from .firebasestorage.app
  messagingSenderId: "1038684449062",
  appId: "1:1038684449062:web:e61d52c6325b0027a9b9e7",
  measurementId: "G-TSV3YRCHJD"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const auth = getAuth(app); // Firebase Auth instance is no longer central to this insecure login mechanism
const db = getFirestore(app);

// Export only 'app' and 'db' as 'auth' is not used in the new direct login mechanism
export { app, db };
