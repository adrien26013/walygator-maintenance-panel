import { db } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export async function saveChecklist({ type, technicien, zone, attractions }) {
  try {
    const docRef = await addDoc(collection(db, "checklists"), {
      type,                       // journaliere / hebdomadaire / mensuelle
      technicien,
      zone,
      attractions,                // tableau de strings
      timestamp: Timestamp.now(), // Firestore Timestamp
    });

    console.log("Checklist envoyée :", docRef.id);
    return docRef.id;

  } catch (error) {
    console.error("Erreur Firestore :", error);
    throw error;
  }
}
