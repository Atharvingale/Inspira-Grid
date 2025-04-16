// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLdxGyWXPxNFwOvvWdUCpIKSWkpOjM0YA",
  authDomain: "inspira-grid-23894.firebaseapp.com",
  projectId: "inspira-grid-23894",
  storageBucket: "inspira-grid-23894.firebasestorage.app",
  messagingSenderId: "125420320679",
  appId: "1:125420320679:web:5d79e5fa9dd80ec9912882",
  measurementId: "G-YZGG27852P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };