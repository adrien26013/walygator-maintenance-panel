// src/pages/AdminInit.js
import React, { useState } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc
} from "firebase/firestore";
import attractionsList from "../data/attractionsList";

export default function AdminInit() {
  const [log, setLog] = useState([]);

  const addLog = (t) => setLog((prev) => [...prev, t]);

  // -------------------------------------------------
  // NORMALISATION NOM ATTRACTION (checklists)
  // -------------------------------------------------
  const cleanName = (str) =>
    String(str || "")
      .replace(/"/g, "")
      .replace(/“|”/g, "")
      .replace(/\u00A0/g, " ")
      .trim();

  // -------------------------------------------------
  // 0) RESET DES MANUAL = FALSE  (CORRECTION CRUCIALE)
  // -------------------------------------------------
  const resetManuals = async () => {
    addLog("🔄 Réinitialisation des champs manual dans attractionStatus…");

    const snap = await getDocs(collection(db, "attractionStatus"));
    let count = 0;

    for (let d of snap.docs) {
      await updateDoc(doc(db, "attractionStatus", d.id), {
        manual: false,
      });
      count++;
      addLog(`✔ manual=false → ${d.id}`);
    }

    addLog(`➡ ${count} documents mis à jour.`);
  };

  // -------------------------------------------------
  // 1) Correction des noms dans CHECKLISTS
  // -------------------------------------------------
  const fixChecklists = async () => {
    addLog("\n🔧 Correction des noms d’attractions dans checklists…");

    const snap = await getDocs(collection(db, "checklists"));
    let corrected = 0;

    for (let d of snap.docs) {
      const data = d.data();
      const original = data.attraction;
      if (!original) continue;

      const cleaned = cleanName(original);

      if (cleaned !== original) {
        await updateDoc(doc(db, "checklists", d.id), {
          attraction: cleaned,
        });

        addLog(`✔ ${original}  →  ${cleaned}`);
        corrected++;
      }
    }

    addLog(`➡ Correction terminée : ${corrected} documents mis à jour.`);
  };

  // -------------------------------------------------
  // 2) Création des statuts dans attractionStatus
  // -------------------------------------------------
  const initAttractionStatus = async () => {
    addLog("\n🚀 Initialisation des documents statut attractions…");

    for (const a of attractionsList) {
      const ref = doc(db, "attractionStatus", a.nom);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        addLog(`✔ Existe déjà : ${a.nom}`);
        continue;
      }

      await setDoc(ref, {
        status: "fermee",
        manual: false,
        auto: false,
        updated_at: new Date(),
      });

      addLog(`➕ Créé : ${a.nom}`);
    }

    addLog("✨ Terminé !");
  };

  // -------------------------------------------------
  // 3) EXECUTION COMPLÈTE
  // -------------------------------------------------
  const runInit = async () => {
    setLog(["🏁 Début de maintenance BDD…"]);

    // FIX QUI RÈGLE TON BUG PRINCIPAL
    await resetManuals();

    // Nettoyage des checklists
    await fixChecklists();

    // Création des statuts manquants
    await initAttractionStatus();

    addLog("\n🎉 TOUT EST TERMINÉ !");
  };

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  return (
    <div style={{ padding: 20 }}>
      <h1>AdminInit – Maintenance et Normalisation</h1>

      <button
        onClick={runInit}
        style={{
          padding: 12,
          background: "#235630",
          color: "white",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        🚀 Lancer la maintenance complète
      </button>

      <pre
        style={{
          marginTop: 20,
          background: "#eee",
          padding: 10,
          borderRadius: 8,
          height: 400,
          overflowY: "auto",
        }}
      >
        {log.join("\n")}
      </pre>
    </div>
  );
}
