// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAQ9IvVqGItzL601CpdsZrDtRab0-o2arg",
  authDomain: "walygator-maintenance.firebaseapp.com",
  projectId: "walygator-maintenance",
  storageBucket: "walygator-maintenance.appspot.com",
  messagingSenderId: "582768149805",
  appId: "1:582768149805:web:a294215ea2aa189506ffa4"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
