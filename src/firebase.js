import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC67Ge8taCDko7dNY22sGHT1ko6EjV2WNg",
  authDomain: "walygator-maintenance-6a19d.firebaseapp.com",
  projectId: "walygator-maintenance-6a19d",
  storageBucket: "walygator-maintenance-6a19d.firebasestorage.app",
  messagingSenderId: "1029091041183",
  appId: "1:1029091041183:web:b45f1ecdb22b4b6f4467aa"
};

const app = initializeApp(firebaseConfig);

// ✅ EXPORTS IMPORTANTS
export const auth = getAuth(app);
export const db = getFirestore(app);