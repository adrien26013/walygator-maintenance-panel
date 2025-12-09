// src/pages/GlobalView.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import attractionsList from "../data/attractionsList";

export default function GlobalView({ selectedDate, setSelectedDateGlobal }) {
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [validatedAttractions, setValidatedAttractions] = useState([]);
  const [securityStatus, setSecurityStatus] = useState({});

  const clean = (s) => String(s || "").trim().toLowerCase();

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // ---------------------------------------
  // 🔥 Normalisation des statuts FR & EN
  // ---------------------------------------
  const normalizeStatus = (raw) => {
    if (!raw) return "fermee";

    const s = raw.toLowerCase().trim();

    if (s.includes("panne")) return "panne";
    if (s.includes("evac")) return "evacuation";
    if (s.includes("ouv")) return "ouverte";
    if (s.includes("ferm")) return "fermee";

    return "fermee";
  };

  const labels = {
    fermee: "Fermée",
    ouverte: "Ouverte",
    panne: "En panne",
    evacuation: "Evacuation en cours..."
  };

  const colors = {
    fermee: "#ffb5b5",
    ouverte: "#d4ffd4",
    panne: "#fff3b0",
    evacuation: "#c3d9ff"
  };

  // 🔥 Listener PC Sécurité
  useEffect(() => {
    return onSnapshot(collection(db, "attractionStatus"), (snap) => {
      const out = {};
      snap.forEach((d) => out[d.id] = d.data());
      setSecurityStatus(out);
    });
  }, []);

  // 🔥 Gestion de la date reçue
  useEffect(() => {
    if (!selectedDate || !selectedDate.raw) return;

    const d = new Date(selectedDate.raw);
    d.setHours(0, 0, 0, 0);

    const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
    const mois = ["janvier","février","mars","avril","mai","juin",
                  "juillet","août","septembre","octobre","novembre","décembre"];

    const obj = {
      raw: d,
      label_complet:
        `${jours[d.getDay()]} ${String(d.getDate()).padStart(2,"0")} ${
          mois[d.getMonth()]
        } ${d.getFullYear()}`
    };

    setEffectiveDate(obj);
    setSelectedDateGlobal?.({ raw: d, ...obj });
  }, [selectedDate]);

  // 🔥 Listener checklists journalières
  useEffect(() => {
    if (!effectiveDate) return;

    return onSnapshot(collection(db, "checklists"), (snap) => {
      const set = new Set();

      snap.forEach((doc) => {
        const d = doc.data();
        if (d.type !== "journaliere") return;
        if (!d.timestamp) return;

        const ts = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);

        if (!isSameDay(ts, effectiveDate.raw)) return;

        set.add(clean(d.attraction));
      });

      setValidatedAttractions([...set]);
    });
  }, [effectiveDate]);

  const handleLogout = async () => await signOut(auth);

  return (
    <div style={{ padding: 0 }}>
      
      {/* BANNIÈRE */}
      <div
        style={{
          width: "100%", height: 95, backgroundColor: "#235630",
          display: "flex", justifyContent: "center",
          alignItems: "center", position: "relative"
        }}
      >
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            position: "absolute", left: 20,
            backgroundColor: "#2f6f3a", border: "3px solid #f5c400",
            padding: "8px 18px", borderRadius: 10,
            color: "white", fontWeight: "bold"
          }}
        >
          ← Retour Panel
        </button>

        <img src="/logo_walygator_maintenance.png" alt="" style={{ height: 80 }} />

        <button
          onClick={handleLogout}
          style={{
            position: "absolute", right: 20,
            background: "transparent", border: "none",
            cursor: "pointer", display: "flex", gap: 8, alignItems: "center"
          }}
        >
          <img src="/logout_door.png" alt="" style={{ height: 32, filter: "invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold" }}>Déconnexion</span>
        </button>
      </div>

      {/* CONTENU */}
      <div style={{ padding: 20 }}>
        <h1>Vue globale des attractions</h1>
        <p style={{ fontSize: 18 }}>
          Journée du : <strong>{effectiveDate?.label_complet}</strong>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 25
          }}
        >
          {attractionsList.map((a) => {
            const key = clean(a.nom);
            const hasChecklist = validatedAttractions.includes(key);

            const s =
              securityStatus[a.nom] ||
              securityStatus[key] ||
              null;

            const pcStatus = normalizeStatus(s?.status);
            const manual = s?.manual === true;

            // -----------------------------------------
            // 🔥 LOGIQUE FINALE 100% FIABLE
            // -----------------------------------------
            let final;

            if (!hasChecklist) {
              final = "fermee";
            } else if (manual && pcStatus !== "ouverte") {
              final = pcStatus;
            } else {
              final = "ouverte";
            }

            return (
              <div
                key={a.nom}
                style={{
                  background: colors[final],
                  borderRadius: 14,
                  padding: 12,
                  height: 230,
                  textAlign: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  opacity: hasChecklist ? 1 : 0.55
                }}
              >
                <img
                  src={`/attractions/${a.image}`}
                  alt=""
                  style={{
                    width: "100%", height: 150,
                    objectFit: "cover", borderRadius: 10,
                    opacity: hasChecklist ? 1 : 0.45
                  }}
                />

                <p style={{ marginTop: 10, fontWeight: "bold" }}>{a.nom}</p>

                <p style={{ fontSize: 14, marginTop: 4 }}>
                  {!hasChecklist
                    ? "En attente de checklist…"
                    : `Statut : ${labels[final]}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
