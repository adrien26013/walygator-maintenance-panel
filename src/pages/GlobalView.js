// src/pages/GlobalView.js
import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import attractionsList from "../data/attractionsList";

export default function GlobalView({ selectedDate, setSelectedDateGlobal }) {
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [validatedAttractions, setValidatedAttractions] = useState([]);

  // -------------------------------------------------------
  // 🧱 Utilitaire : construire l'objet date comme dans Dashboard
  // -------------------------------------------------------
  const buildDateObj = (baseDate) => {
    const d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);

    const jours = [
      "dimanche", "lundi", "mardi",
      "mercredi", "jeudi", "vendredi", "samedi"
    ];
    const mois = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ];

    const jourNom = jours[d.getDay()];
    const jourNum = String(d.getDate()).padStart(2, "0");
    const moisNom = mois[d.getMonth()];
    const annee = d.getFullYear();

    return {
      raw: d,
      label: d.toLocaleDateString("fr-FR"),
      label_complet: `${jourNom} ${jourNum} ${moisNom} ${annee}`,
    };
  };

  // -------------------------------------------------------
  // 🔥 Choisir la date que la vue globale doit utiliser
  //    - si le Dashboard en a donnée une → on l'utilise
  //    - sinon → on se cale sur aujourd'hui (jour J)
  // -------------------------------------------------------
  useEffect(() => {
    if (selectedDate && selectedDate.raw) {
      setEffectiveDate(selectedDate);
    } else {
      const todayObj = buildDateObj(new Date());
      setEffectiveDate(todayObj);
      if (setSelectedDateGlobal) setSelectedDateGlobal(todayObj);
    }
  }, [selectedDate, setSelectedDateGlobal]);

  // -------------------------------------------------------
  // 🔥 Abonnement Firestore EN DIRECT
  //    On écoute TOUTES les journalières,
  //    puis on filtre en JS pour ne garder que celles
  //    du même jour que "effectiveDate".
  // -------------------------------------------------------
  useEffect(() => {
    if (!effectiveDate || !effectiveDate.raw) return;

    const q = query(
      collection(db, "checklists"),
      where("type", "==", "journaliere")
    );

    const unsub = onSnapshot(q, (snap) => {
      const doneForDay = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const attractionName = data.attraction || "—";

        const ts = data.timestamp;
        if (!ts) return;

        const t = ts.toDate ? ts.toDate() : new Date(ts);

        const sameDay =
          t.getFullYear() === effectiveDate.raw.getFullYear() &&
          t.getMonth() === effectiveDate.raw.getMonth() &&
          t.getDate() === effectiveDate.raw.getDate();

        if (sameDay) {
          doneForDay.push(attractionName);
        }
      });

      setValidatedAttractions(doneForDay);
    });

    return () => unsub();
  }, [effectiveDate]);

  // -------------------------------------------------------
  // 🔐 Déconnexion
  // -------------------------------------------------------
  const handleLogout = async () => {
    await signOut(auth);
  };

  // -------------------------------------------------------
  // 🖼️ Rendu
  // -------------------------------------------------------
  return (
    <div style={{ padding: 0 }}>
      {/* BANNIÈRE VERTE WALYGATOR */}
      <div
        style={{
          width: "100%",
          height: 95,
          backgroundColor: "#235630",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* ← Retour Panel */}
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
            fontSize: 16,
            fontWeight: "bold",
            boxShadow: "0 3px 0 #b48d00",
            cursor: "pointer",
            transition: "0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.backgroundColor = "#398845";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.backgroundColor = "#2f6f3a";
          }}
        >
          ← Retour Panel
        </button>

        {/* Logo */}
        <img
          src="/logo_walygator_maintenance.png"
          alt="logo"
          style={{ height: 80 }}
        />

        {/* Déconnexion */}
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
            gap: 8,
          }}
        >
          <img
            src="/logout_door.png"
            alt="logout"
            style={{ height: 32, filter: "invert(1)" }}
          />
          <span style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
            Déconnexion
          </span>
        </button>
      </div>

      {/* CONTENU VUE GLOBALE */}
      <div style={{ padding: 20 }}>
        <h1 style={{ marginBottom: 10 }}>Vue globale des attractions</h1>

        <p style={{ fontSize: 18, marginBottom: 25 }}>
          Journée du :{" "}
          <strong>
            {effectiveDate ? effectiveDate.label_complet : "Aucune date"}
          </strong>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 25,
            marginTop: 20,
          }}
        >
          {attractionsList.map((a) => {
            const isDone = validatedAttractions.includes(a.nom);

            return (
              <div
                key={a.nom}
                style={{
                  position: "relative",
                  textAlign: "center",
                  padding: 12,
                  borderRadius: 14,
                  background: isDone ? "#d4ffd4" : "#f7f7f7",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  transition: "0.2s",
                  height: 200,
                }}
              >
                <img
                  src={`/attractions/${a.image}`}
                  alt={a.nom}
                  style={{
                    width: "100%",
                    height: 150,
                    objectFit: "cover",
                    borderRadius: 10,
                    opacity: isDone ? 0.65 : 1,
                  }}
                />

                {isDone && (
                  <img
                    src="/ok.png"
                    alt=""
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 60,
                      transform: "translate(-50%, -50%)",
                      opacity: 0.9,
                    }}
                  />
                )}

                <p style={{ marginTop: 10, fontWeight: "bold", fontSize: 16 }}>
                  {a.nom}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
