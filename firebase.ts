// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDIqkfE2PYcL1J6phjtIwTGUX1uslz-6Dg",
  authDomain: "expo3-418f0.firebaseapp.com",
  projectId: "expo3-418f0",
  storageBucket: "expo3-418f0.firebasestorage.app",
  messagingSenderId: "698234167437",
  appId: "1:698234167437:web:095f2163d76ae8984802c4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);
