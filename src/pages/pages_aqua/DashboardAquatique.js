import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "../../components/Calendar";
import ChecklistList from "../../components/ChecklistList";
import { db, auth } from "../../firebase";
import {
  collectionGroup,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function DashboardAquatique({ setSelectedDateGlobal }) {
  console.log("🔥 DASHBOARD AQUATIQUE MONTÉ");

  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);
  const [journaliere, setJournaliere] = useState([]);

  /* =========================
     📅 DATE INIT
     ========================= */
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const obj = {
      raw: now,
      label: now.toLocaleDateString("fr-FR"),
      label_complet: now.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    };

    setSelectedDate(obj);
    setSelectedDateGlobal?.(obj);
  }, []);

  /* =========================
     🔥 FIRESTORE (LA VRAIE)
     ========================= */
  useEffect(() => {
    if (!selectedDate) return;

    const q = query(
      collectionGroup(db, "checklists"),
      where("type", "==", "journaliere"),
      where("zone", "==", "Parc aquatique")
    );

    return onSnapshot(q, (snap) => {
      const result = [];

      snap.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };

        const ts = data.timestamp?.toDate?.();
        if (!ts) return;

        const sameDay =
          ts.getFullYear() === selectedDate.raw.getFullYear() &&
          ts.getMonth() === selectedDate.raw.getMonth() &&
          ts.getDate() === selectedDate.raw.getDate();

        if (!sameDay) return;

        result.push(data);
      });

      console.log("✅ CHECKLISTS AQUA :", result);
      setJournaliere(result);
    });
  }, [selectedDate]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div>
      {/* 🔥 KEYFRAMES */}
      <style>{`
        @keyframes fadeInHeader { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInLogo { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1.12); } }
      `}</style>

      {/* =========================
          HEADER AQUATIQUE
         ========================= */}
      <div
        style={{
          height: 95,
          backgroundColor: "#0b4fa3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          animation: "fadeInHeader 0.45s ease",
        }}
      >
        {/* GAUCHE */}
        <div style={{ position: "absolute", left: 20, display: "flex", gap: 8 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              backgroundColor: "#ffffff33",
              border: "3px solid #f5c400",
              padding: "8px 14px",
              borderRadius: 10,
              color: "white",
              fontWeight: "bold",
            }}
          >
            Parc mécanique
          </button>

          <button
            style={{
              backgroundColor: "#1e90ff",
              border: "3px solid #f5c400",
              padding: "8px 14px",
              borderRadius: 10,
              color: "white",
              fontWeight: "bold",
              cursor: "default",
            }}
          >
            Parc aquatique
          </button>

          <button
            onClick={() => navigate("/pc-securite")}
            style={{
              backgroundColor: "#1e90ff",
              border: "3px solid #f5c400",
              padding: "8px 14px",
              borderRadius: 10,
              color: "white",
              fontWeight: "bold",
            }}
          >
            PC Sécurité
          </button>
        </div>

        {/* LOGO */}
        <img
          src="/logo_walygator_aquatique_maintenance.png"
          alt="logo"
          style={{ height: 70, animation: "fadeInLogo 0.45s ease" }}
        />

        {/* DROITE */}
        <div style={{ position: "absolute", right: 20, display: "flex", gap: 14 }}>
          <button
            onClick={() => navigate("/global-aqua")}
            style={{
              backgroundColor: "#1e90ff",
              border: "3px solid #f5c400",
              padding: "8px 14px",
              borderRadius: 10,
              color: "white",
              fontWeight: "bold",
            }}
          >
            Vue globale
          </button>

          <button
            onClick={handleLogout}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <img
              src="/logout_door.png"
              alt="logout"
              style={{ height: 32, filter: "invert(1)" }}
            />
          </button>
        </div>
      </div>

      {/* =========================
          CONTENU
         ========================= */}
      <div style={{ display: "flex", padding: 20, gap: 40 }}>
        <div style={{ width: "40%" }}>
          <Calendar
  selectedDate={selectedDate}
  onDateSelect={(dateObj) => {
    setSelectedDate(dateObj);
    setSelectedDateGlobal?.(dateObj);
  }}
/>

        </div>

        <div style={{ width: "60%" }}>
          <h2>
            Checklists du {selectedDate?.label_complet} — Parc aquatique
          </h2>

          <ChecklistList
            title="Checklist journalière"
            checklists={journaliere}
          />
        </div>
      </div>
    </div>
  );
}
