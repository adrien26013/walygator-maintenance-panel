import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import attractionsList from "../data/attractionsList";

/* 🔒 NORMALISATION IDENTIQUE À FLUTTER */
const normalizeAttraction = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[àâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

/* Timestamp Firestore -> Date */
const toDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/* Extraction attractions depuis checklist (tous formats) */
const extractAttractionIds = (d) => {
  if (d?.attractions && typeof d.attractions === "object" && !Array.isArray(d.attractions)) {
    return Object.keys(d.attractions).map(normalizeAttraction);
  }

  if (Array.isArray(d?.attractions)) {
    return d.attractions.map(normalizeAttraction);
  }

  if (typeof d?.attraction === "string") {
    return [normalizeAttraction(d.attraction)];
  }

  return [];
};

export default function StatutAttractions() {
  const [statuses, setStatuses] = useState({});
  const [validatedToday, setValidatedToday] = useState(new Set());
  const [lastChecklistAt, setLastChecklistAt] = useState(null);

  /* 🔄 Tick minute pour détecter minuit */
  const [dayTick, setDayTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDayTick((x) => x + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const today0 = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dayTick]);

  /* ==============================
     1️⃣ LISTENER PC SÉCURITÉ
     ============================== */
  useEffect(() => {
    return onSnapshot(collection(db, "attractionStatus"), (snap) => {
      const out = {};
      snap.forEach((d) => (out[d.id] = d.data()));
      setStatuses(out);
    });
  }, []);

  /* ==================================
     2️⃣ LISTENER CHECKLISTS JOURNALIÈRES
     ================================== */
  useEffect(() => {
    return onSnapshot(collection(db, "checklists"), (snap) => {
      const set = new Set();
      let latestChecklist = null;

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d?.type !== "journaliere") return;

        const ts = toDate(d.timestamp);
        if (!ts) return;

        const t0 = new Date(ts);
        t0.setHours(0, 0, 0, 0);
        if (!isSameDay(t0, today0)) return;

        if (!latestChecklist || ts > latestChecklist) {
          latestChecklist = ts;
        }

        extractAttractionIds(d).forEach((id) => set.add(id));
      });

      setValidatedToday(set);
      setLastChecklistAt(latestChecklist);
    });
  }, [today0]);

  /* ==========================
     3️⃣ ACTION PC SÉCURITÉ
     ========================== */
  const updateStatus = async (key, statut) => {
    await setDoc(
      doc(db, "attractionStatus", key),
      {
        status: statut,
        manual: true,
        manual_at: new Date(), // 🔥 clé mémoire
        updated_at: new Date()
      },
      { merge: true }
    );
  };

  const handleLogout = async () => await signOut(auth);

  const colors = {
    fermee: "#ffb5b5",
    ouverte: "#b6ffb6",
    panne: "#fff3b0",
    evacuation: "#c3d9ff"
  };

  const translateStatus = (s) => {
    if (s === "panne") return "En panne";
    if (s === "evacuation") return "Evacuation en cours...";
    if (s === "ouverte") return "Ouverte";
    if (s === "fermee") return "Fermée";
    return s;
  };

  return (
    <div style={{ padding: 0 }}>
      {/* BANNIÈRE */}
      <div
        style={{
          width: "100%",
          height: 95,
          backgroundColor: "#235630",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}
      >
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            position: "absolute",
            left: 20,
            backgroundColor: "#2f6f3a",
            border: "3px solid #f5c400",
            padding: "8px 18px",
            borderRadius: 10,
            color: "white",
            fontWeight: "bold"
          }}
        >
          ← Retour Panel
        </button>

        <img src="/logo_walygator_maintenance.png" style={{ height: 80 }} alt="logo" />

        <button
          onClick={handleLogout}
          style={{
            position: "absolute",
            right: 20,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <img src="/logout_door.png" style={{ height: 32, filter: "invert(1)" }} alt="" />
          <span style={{ color: "white", fontWeight: "bold" }}>Déconnexion</span>
        </button>
      </div>

      {/* CONTENU */}
      <div style={{ padding: 20 }}>
        <h1>PC Sécurité — Gestion des statuts attractions</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 25
          }}
        >
          {attractionsList.map((a) => {
            const key = normalizeAttraction(a.nom);

            const record = statuses[key] || {};
            const hasChecklist = validatedToday.has(key);

            let displayStatus = "fermee";

            if (hasChecklist) {
              displayStatus = "ouverte";

              const manualAt = toDate(record.manual_at);

              if (
                record.manual === true &&
                manualAt &&
                lastChecklistAt &&
                manualAt > lastChecklistAt &&
                record.status !== "ouverte"
              ) {
                displayStatus = record.status;
              }
            }

            const isDisabled = !hasChecklist;

            return (
              <div
                key={a.nom}
                style={{
                  padding: 15,
                  borderRadius: 14,
                  background: isDisabled ? "#d9d9d9" : colors[displayStatus],
                  opacity: isDisabled ? 0.5 : 1,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                }}
              >
                <img
                  src={`/attractions/${a.image}`}
                  alt={a.nom}
                  style={{
                    width: "100%",
                    height: 150,
                    objectFit: "cover",
                    borderRadius: 10
                  }}
                />

                <p style={{ marginTop: 10, fontWeight: "bold", textAlign: "center" }}>
                  {a.nom}
                </p>

                <p style={{ textAlign: "center", marginBottom: 10 }}>
                  {isDisabled
                    ? "En attente de checklist..."
                    : `Statut : ${translateStatus(displayStatus)}`}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 12,
                    pointerEvents: isDisabled ? "none" : "auto"
                  }}
                >
                  <button onClick={() => updateStatus(key, "fermee")} style={{ background: "#ff4d4d", padding: "6px 10px", color: "white", borderRadius: 6, border: "none", fontWeight: "bold" }}>
                    Fermée
                  </button>

                  <button onClick={() => updateStatus(key, "ouverte")} style={{ background: "#34c759", padding: "6px 10px", color: "white", borderRadius: 6, border: "none", fontWeight: "bold" }}>
                    Ouverte
                  </button>

                  <button onClick={() => updateStatus(key, "panne")} style={{ background: "#f2c94c", padding: "6px 10px", color: "black", borderRadius: 6, border: "none", fontWeight: "bold" }}>
                    En panne
                  </button>

                  <button onClick={() => updateStatus(key, "evacuation")} style={{ background: "#4c88ff", padding: "6px 10px", color: "white", borderRadius: 6, border: "none", fontWeight: "bold" }}>
                    Évac
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
