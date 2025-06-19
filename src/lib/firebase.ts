
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAWK3lGZYnugzakCiceZ1o5j2HM-yHyjmo",
  authDomain: "insertfetch-663ca.firebaseapp.com",
  databaseURL: "https://insertfetch-663ca-default-rtdb.firebaseio.com",
  projectId: "insertfetch-663ca",
  storageBucket: "insertfetch-663ca.appspot.com", // Corrected common typo: firebasestorage.app to appspot.com
  messagingSenderId: "1038684449062",
  appId: "1:1038684449062:web:e61d52c6325b0027a9b9e7",
  measurementId: "G-TSV3YRCHJD"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
