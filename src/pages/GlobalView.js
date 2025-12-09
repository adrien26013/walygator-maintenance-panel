// src/pages/GlobalView.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import attractionsList from "../data/attractionsList";

export default function GlobalView({ selectedDate }) {
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [validatedAttractions, setValidatedAttractions] = useState([]);
  const [securityStatus, setSecurityStatus] = useState({});

  const clean = (s) => String(s || "").trim().toLowerCase();

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // 🔥 Traduction affichage humain
  const translateStatus = (s) => {
    if (s === "panne") return "En panne";
    if (s === "evacuation") return "Evacuation en cours...";
    if (s === "ouverte") return "Ouverte";
    if (s === "fermee") return "Fermée";
    return s;
  };

  // 🔥 Listener PC Sécurité
  useEffect(() => {
    return onSnapshot(collection(db, "attractionStatus"), (snap) => {
      const map = {};
      snap.forEach((d) => (map[d.id] = d.data()));
      setSecurityStatus(map);
    });
  }, []);

  // 🔥 Mise à jour date affichée
  useEffect(() => {
    if (!selectedDate || !selectedDate.raw) return;

    const d = new Date(selectedDate.raw);
    d.setHours(0, 0, 0, 0);

    const jours = [
      "dimanche", "lundi", "mardi", "mercredi",
      "jeudi", "vendredi", "samedi"
    ];

    const mois = [
      "janvier","février","mars","avril","mai","juin",
      "juillet","août","septembre","octobre","novembre","décembre"
    ];

    setEffectiveDate({
      raw: d,
      label_complet: `${jours[d.getDay()]} ${String(d.getDate()).padStart(2,"0")} ${
        mois[d.getMonth()]
      } ${d.getFullYear()}`
    });
  }, [selectedDate]);

  // 🔥 Écoute temps réel des checklists journalières
  useEffect(() => {
    if (!effectiveDate) return;

    return onSnapshot(collection(db, "checklists"), (snap) => {
      const validated = new Set();

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.type !== "journaliere") return;
        if (!d.timestamp) return;

        const ts = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
        ts.setHours(0, 0, 0, 0);

        if (!isSameDay(ts, effectiveDate.raw)) return;

        validated.add(clean(d.attraction));
      });

      setValidatedAttractions([...validated]);
    });
  }, [effectiveDate]);

  const handleLogout = async () => await signOut(auth);

  const colors = {
    fermee: "#ffb5b5",
    panne: "#fff3b0",
    evacuation: "#c3d9ff",
    ouverte: "#d4ffd4"
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
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
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
            fontWeight: "bold",
          }}
        >
          ← Retour Panel
        </button>

        <img src="/logo_walygator_maintenance.png" style={{ height: 80 }} alt="" />

        <button
          onClick={handleLogout}
          style={{
            position: "absolute",
            right: 20,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <img src="/logout_door.png" style={{ height: 32, filter: "invert(1)" }} alt="" />
          <span style={{ color: "white", fontWeight: "bold" }}>Déconnexion</span>
        </button>
      </div>

      {/* CONTENU */}
      <div style={{ padding: 20 }}>
        <h1>Vue globale des attractions</h1>
        <p style={{ fontSize: 18 }}>
          Journée du : <strong>{effectiveDate?.label_complet}</strong>
        </p>

        {/* LÉGENDE */}
        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <span style={{ padding: "6px 12px", background: "#ffb5b5", borderRadius: 6 }}>Fermée</span>
          <span style={{ padding: "6px 12px", background: "#b6ffb6", borderRadius: 6 }}>Ouverte</span>
          <span style={{ padding: "6px 12px", background: "#fff3b0", borderRadius: 6 }}>En panne</span>
          <span style={{ padding: "6px 12px", background: "#c3d9ff", borderRadius: 6 }}>Evacuation en cours...</span>
        </div>

        {/* GRILLE */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 25,
          }}
        >
          {attractionsList.map((a) => {
            const key = clean(a.nom);
            const hasChecklist = validatedAttractions.includes(key);

            const s = securityStatus[key] || {};
            const pcStatus = s.status || "fermee";
            const manual = s.manual === true;

            let final;
            if (!hasChecklist) {
              final = "fermee";
            } else {
              if (manual && pcStatus !== "ouverte") final = pcStatus;
              else final = "ouverte";
            }

            const isDisabled = !hasChecklist;

            const bg =
              final === "ouverte" && hasChecklist ? "#9aff9a" : colors[final];

            return (
              <div
                key={a.nom}
                style={{
                  background: isDisabled ? "#d9d9d9" : bg, // 🔥 VRAI GRIS comme PC Sécurité
                  borderRadius: 14,
                  padding: 12,
                  height: 230,
                  textAlign: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  opacity: isDisabled ? 0.55 : 1,
                }}
              >
                <img
                  src={`/attractions/${a.image}`}
                  alt=""
                  style={{
                    width: "100%",
                    height: 150,
                    objectFit: "cover",
                    borderRadius: 10,
                    opacity: isDisabled ? 0.45 : 1,
                  }}
                />

                <p style={{ marginTop: 10, fontWeight: "bold" }}>{a.nom}</p>

                <p style={{ marginTop: 4 }}>
                  {isDisabled
                    ? "En attente de checklist…"
                    : `Statut : ${translateStatus(final)}`}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
