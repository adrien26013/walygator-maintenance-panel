// src/pages/StatutAttractions.js
import React, { useEffect, useState } from "react";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import attractionsList from "../data/attractionsList";

export default function StatutAttractions() {
  const [statuses, setStatuses] = useState({});
  const [validatedToday, setValidatedToday] = useState(new Set());

  const clean = (s) => String(s || "").trim().toLowerCase();

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // 🔥 1) Listener temps réel PC Sécurité
  useEffect(() => {
    return onSnapshot(collection(db, "attractionStatus"), (snap) => {
      const out = {};
      snap.forEach((d) => (out[d.id] = d.data()));
      setStatuses(out);
    });
  }, []);

  // 🔥 2) Listener temps réel CHECKLISTS + RESET automatique Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "checklists"), async (snap) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newSet = new Set();

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.type !== "journaliere") return;
        if (!d.timestamp) return;

        const ts = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
        ts.setHours(0, 0, 0, 0);

        if (isSameDay(ts, today)) newSet.add(clean(d.attraction));
      });

      // 🔥 CHECKLIST SUPPRIMÉE → reset du statut (fermé + manual false)
      for (const key of validatedToday) {
        if (!newSet.has(key)) {
          await setDoc(
            doc(db, "attractionStatus", key),
            {
              status: "fermee",
              manual: false,
              updated_at: new Date()
            },
            { merge: true }
          );
        }
      }

      // 🔥 CHECKLIST AJOUTÉE → statut = ouverte (reset mémoire)
      for (const key of newSet) {
        if (!validatedToday.has(key)) {
          await setDoc(
            doc(db, "attractionStatus", key),
            {
              status: "ouverte",
              manual: false,
              updated_at: new Date()
            },
            { merge: true }
          );
        }
      }

      setValidatedToday(newSet); // ⚡ Mise à jour immédiate de l'UI
    });

    return () => unsub();
  }, []); // ← très important : pas de dépendance

  // 🔥 3) Mise à jour manuelle PC Sécurité
  const updateStatus = async (nom, statut) => {
    await setDoc(
      doc(db, "attractionStatus", nom),
      {
        status: statut,
        manual: true,
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
            const key = clean(a.nom);

            const record = statuses[key] || {};
            const hasChecklist = validatedToday.has(key);
            const forced = record.manual === true;

            let displayStatus = record.status || "fermee";

            // 🔥 Checklist = OUVERT sauf si PC force autre
            if (hasChecklist) {
              if (forced && record.status !== "ouverte") {
                displayStatus = record.status;
              } else {
                displayStatus = "ouverte";
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

                {/* BOUTONS */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 12,
                    pointerEvents: isDisabled ? "none" : "auto"
                  }}
                >
                  <button
                    onClick={() => updateStatus(key, "fermee")}
                    style={{
                      background: "#ff4d4d",
                      padding: "6px 10px",
                      color: "white",
                      borderRadius: 6,
                      border: "none",
                      fontWeight: "bold"
                    }}
                  >
                    Fermée
                  </button>

                  <button
                    onClick={() => updateStatus(key, "ouverte")}
                    style={{
                      background: "#34c759",
                      padding: "6px 10px",
                      color: "white",
                      borderRadius: 6,
                      border: "none",
                      fontWeight: "bold"
                    }}
                  >
                    Ouverte
                  </button>

                  <button
                    onClick={() => updateStatus(key, "panne")}
                    style={{
                      background: "#f2c94c",
                      padding: "6px 10px",
                      color: "black",
                      borderRadius: 6,
                      border: "none",
                      fontWeight: "bold"
                    }}
                  >
                    En panne
                  </button>

                  <button
                    onClick={() => updateStatus(key, "evacuation")}
                    style={{
                      background: "#4c88ff",
                      padding: "6px 10px",
                      color: "white",
                      borderRadius: 6,
                      border: "none",
                      fontWeight: "bold"
                    }}
                  >
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
