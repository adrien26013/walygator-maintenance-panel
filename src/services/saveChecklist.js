// src/services/saveChecklist.js
import { db } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export async function saveChecklist({ type, technicien, zone, attractions }) {
  try {
    const docRef = await addDoc(collection(db, "checklists"), {
      type,
      technicien,
      zone,
      attractions,                // ✅ TOUJOURS un tableau
      timestamp: Timestamp.now(), // ✅ Firestore Timestamp
    });

    return docRef.id;
  } catch (error) {
    console.error("Erreur Firestore :", error);
    throw error;
  }
}
