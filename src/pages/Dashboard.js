// src/pages/Dashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "../components/Calendar";
import ChecklistList from "../components/ChecklistList";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function Dashboard({ setSelectedDateGlobal }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [lists, setLists] = useState({
    journaliere: [],
    hebdomadaire: [],
    mensuelle: [],
  });

  const navigate = useNavigate();

  const formatDisplayedDate = (dateObj) => {
    if (!dateObj || !dateObj.raw) return "";

    const jours = [
      "dimanche", "lundi", "mardi",
      "mercredi", "jeudi", "vendredi", "samedi"
    ];

    const mois = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ];

    const d = dateObj.raw;
    return `${jours[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${
      mois[d.getMonth()]
    } ${d.getFullYear()}`;
  };

  // ⚡ au montage : se positionner automatiquement sur AUJOURD'HUI
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const jours = [
      "dimanche", "lundi", "mardi",
      "mercredi", "jeudi", "vendredi", "samedi"
    ];
    const mois = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ];

    const jourNom = jours[now.getDay()];
    const jourNum = String(now.getDate()).padStart(2, "0");
    const moisNom = mois[now.getMonth()];
    const annee = now.getFullYear();

    const todayObj = {
      raw: now,
      label: now.toLocaleDateString("fr-FR"),
      label_complet: `${jourNom} ${jourNum} ${moisNom} ${annee}`,
    };

    setSelectedDate(todayObj);
    if (setSelectedDateGlobal) setSelectedDateGlobal(todayObj);
  }, []);

  // ACTIONS PDF
  const handleView = (c) => {
    if (!c.pdf_url) return;
    window.open(c.pdf_url, "_blank");
  };

  const handleDownload = async (c) => {
    try {
      const response = await fetch(c.pdf_url);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const dateStr = c.timestamp?.toDate
        ? c.timestamp.toDate().toLocaleDateString("fr-FR")
        : "";

      const a = document.createElement("a");
      a.href = url;
      a.download = `Checklist_${c.type}_${c.attraction}_${dateStr}.pdf`;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Impossible de télécharger le fichier.");
    }
  };

  const handlePrint = (c) => {
    if (!c.pdf_url) return;

    const win = window.open("", "_blank");
    if (!win) {
      alert("Veuillez autoriser les pop-ups.");
      return;
    }

    win.document.write(`
      <html>
        <body style="margin:0">
          <iframe src="${c.pdf_url}" style="width:100vw;height:100vh;" frameborder="0"></iframe>
        </body>
      </html>
    `);

    setTimeout(() => {
      win.focus();
      win.print();
    }, 700);
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Supprimer la checklist pour ${c.attraction} ?`)) return;

    try {
      await deleteDoc(doc(db, "checklists", c.id));
      alert("Checklist supprimée.");
    } catch {
      alert("Impossible de supprimer cette checklist.");
    }
  };

  // 🔥 LISTES PAR DATE (live)
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

    const unsub = onSnapshot(q, (snapshot) => {
      const journ = [];
      const hebdo = [];
      const mens = [];

      snapshot.forEach((docSnapshot) => {
        const data = { id: docSnapshot.id, ...docSnapshot.data() };
        data.attraction = data.attraction || "Attraction";

        if (data.type === "journaliere") journ.push(data);
        if (data.type === "hebdomadaire") hebdo.push(data);
        if (data.type === "mensuelle") mens.push(data);
      });

      setLists({
        journaliere: journ,
        hebdomadaire: hebdo,
        mensuelle: mens,
      });
    });

    return () => unsub();
  }, [selectedDate]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div style={{ padding: 0 }}>
      {/* BANNIÈRE VERTE */}
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
        {/* Bouton Vue globale */}
        <button
          onClick={() => navigate("/global")}
          style={{
            position: "absolute",
            left: 20,
            backgroundColor: "#2f6f3a",
            border: "3px solid #f5c400",
            padding: "8px 18px",
            borderRadius: 10,
            color: "white",
            fontSize: 17,
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
          Vue globale
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
          <img src="/logout_door.png" alt="logout" style={{ height: 32, filter: "invert(1)" }} />
          <span style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>Déconnexion</span>
        </button>
      </div>

      {/* CONTENU */}
      <div style={{ display: "flex", padding: 20, gap: 40 }}>
        <div style={{ width: "40%" }}>
          <h2 style={{ marginTop: 10 }}>Calendrier</h2>

          <Calendar
            onDateSelect={(d) => {
              setSelectedDate(d);
              if (setSelectedDateGlobal) setSelectedDateGlobal(d);
            }}
            selectedDate={selectedDate}
          />
        </div>

        <div style={{ width: "60%" }}>
          <h2 style={{ marginTop: 10 }}>
            {selectedDate
              ? `Checklists du ${formatDisplayedDate(selectedDate)}`
              : "Sélectionnez un jour dans le calendrier"}
          </h2>

          <ChecklistList
            title="Checklist journalière"
            checklists={lists.journaliere}
            onView={handleView}
            onDownload={handleDownload}
            onPrint={handlePrint}
            onDelete={handleDelete}
          />

          <ChecklistList
            title="Checklist hebdomadaire"
            checklists={lists.hebdomadaire}
            onView={handleView}
            onDownload={handleDownload}
            onPrint={handlePrint}
            onDelete={handleDelete}
          />

          <ChecklistList
            title="Checklist mensuelle"
            checklists={lists.mensuelle}
            onView={handleView}
            onDownload={handleDownload}
            onPrint={handlePrint}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
