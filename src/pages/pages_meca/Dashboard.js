import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "../../components/Calendar";
import ChecklistList from "../../components/ChecklistList";
import { db, auth } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";

/* 🔒 NORMALISATION */
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

const extractAttractionIds = (d) => {
  if (Array.isArray(d?.attractions)) return d.attractions.map(normalizeAttraction);
  if (typeof d?.attraction === "string") return [normalizeAttraction(d.attraction)];
  return [];
};

export default function Dashboard({ setSelectedDateGlobal }) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);

  const [lists, setLists] = useState({
    journaliere: [],
    hebdomadaire: [],
    mensuelle: [],
    trimestrielle: [],
  });

  const formatDisplayed = (d) =>
    d.raw.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const obj = {
      raw: now,
      label: now.toLocaleDateString("fr-FR"),
      label_complet: formatDisplayed({ raw: now }),
    };
    setSelectedDate(obj);
    setSelectedDateGlobal?.(obj);
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    const start = new Date(selectedDate.raw);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate.raw);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "checklists"),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end)
    );

    return onSnapshot(q, (snap) => {
      const journ = [];
      const hebdo = [];
      const mens = [];
      const trimes = [];


snap.forEach((docSnap) => {
  const data = { id: docSnap.id, ...docSnap.data() };

  if (data.parc !== "meca") return;

  if (data.type === "journaliere") journ.push(data);
  if (data.type === "hebdomadaire") hebdo.push(data);
  if (data.type === "mensuelle") mens.push(data);
  if (data.type === "trimestrielle") trimes.push(data);
});


      setLists({ journaliere: journ, hebdomadaire: hebdo, mensuelle: mens, trimestrielle: trimes });
    });
  }, [selectedDate]);

  const handleLogout = async () => await signOut(auth);

  return (
    <div>

      {/* 🔥 KEYFRAMES */}
      <style>{`
        @keyframes fadeInHeader { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInLogo { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* HEADER MÉCANIQUE */}
      <div
        style={{
          height: 95,
          backgroundColor: "#235630",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          animation: "fadeInHeader 0.45s ease",
        }}
      >
        {/* GAUCHE */}
        <div style={{ position: "absolute", left: 20, display: "flex", gap: 8 }}>
          <button type="button" style={{
            backgroundColor: "#2f6f3a",
            border: "3px solid #f5c400",
            padding: "8px 14px",
            borderRadius: 10,
            color: "white",
            fontWeight: "bold",
            cursor: "default",
          }}>
            Parc mécanique
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard-aqua")}
            style={{
              backgroundColor: "#ffffff33",
              border: "3px solid #f5c400",
              padding: "8px 14px",
              borderRadius: 10,
              color: "white",
              fontWeight: "bold",
            }}
          >
            Parc aquatique
          </button>

          <button
            type="button"
            onClick={() => navigate("/pc-securite")}
            style={{
              backgroundColor: "#2f6f3a",
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
          src="/logo_walygator_maintenance.png"
          alt="logo"
          style={{ height: 70, animation: "fadeInLogo 0.45s ease" }}
        />

        {/* DROITE */}
        <div style={{ position: "absolute", right: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate("/global")}
            style={{
              backgroundColor: "#2f6f3a",
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
            type="button"
            onClick={handleLogout}
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <img src="/logout_door.png" alt="logout" style={{ height: 32, filter: "invert(1)" }} />
          </button>
        </div>
      </div>

      {/* CONTENU */}
      <div style={{ display: "flex", padding: 20, gap: 40 }}>
        <div style={{ width: "40%" }}>
          <Calendar selectedDate={selectedDate} />
        </div>
        <div style={{ width: "60%" }}>
          <h2>Checklists du {selectedDate?.label_complet} — Parc mécanique</h2>
          <ChecklistList title="Checklist journalière" checklists={lists.journaliere} parc="mecanique" />
<ChecklistList title="Checklist hebdomadaire" checklists={lists.hebdomadaire} parc="mecanique" />
<ChecklistList title="Checklist mensuelle" checklists={lists.mensuelle} parc="mecanique" />
<ChecklistList title="Checklist trimestrielle" checklists={lists.trimestrielle} parc="mecanique" />
        </div>
      </div>
    </div>
  );
}
