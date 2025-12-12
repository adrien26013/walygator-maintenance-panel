// src/pages/Dashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "../components/Calendar";
import ChecklistList from "../components/ChecklistList";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc
} from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function Dashboard({ setSelectedDateGlobal }) {
  const [selectedDate, setSelectedDate] = useState(null);

  // 🔥 Ajout de la checklist trimestrielle
  const [lists, setLists] = useState({
    journaliere: [],
    hebdomadaire: [],
    mensuelle: [],
    trimestrielle: [],
  });

  // MODALE suppression
  const [modal, setModal] = useState({
    open: false,
    checklist: null,
  });

  const navigate = useNavigate();

  const formatDisplayed = (d) => {
    if (!d || !d.raw) return "";
    return d.raw.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  // Sélection automatique du jour
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const obj = {
      raw: now,
      label: now.toLocaleDateString("fr-FR"),
      label_complet: formatDisplayed({ raw: now })
    };

    setSelectedDate(obj);
    setSelectedDateGlobal?.(obj);
  }, []);

  // Listener Firestore
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
        data.attraction = String(data.attraction || "").trim();

        if (data.type === "journaliere") journ.push(data);
        if (data.type === "hebdomadaire") hebdo.push(data);
        if (data.type === "mensuelle") mens.push(data);
        if (data.type === "trimestrielle") trimes.push(data);
      });

      setLists({
        journaliere: journ,
        hebdomadaire: hebdo,
        mensuelle: mens,
        trimestrielle: trimes,
      });
    });
  }, [selectedDate]);

  const handleLogout = async () => await signOut(auth);

  // OUVERTURE MODALE SUPPRESSION
  const handleDelete = (checklist) => {
    setModal({
      open: true,
      checklist
    });
  };

  const confirmDelete = async () => {
    await deleteDoc(doc(db, "checklists", modal.checklist.id));
    setModal({ open: false, checklist: null });
  };

  const cancelDelete = () => setModal({ open: false, checklist: null });

  const onDateSelect = (d) => {
    const clean = new Date(d.raw);
    clean.setHours(0, 0, 0, 0);

    const obj = {
      raw: clean,
      label: clean.toLocaleDateString("fr-FR"),
      label_complet: formatDisplayed({ raw: clean }),
    };

    setSelectedDate(obj);
    setSelectedDateGlobal?.(obj);
  };

  return (
    <div style={{ padding: 0 }}>

      {/* --- MODALE SUPPRESSION --- */}
      {modal.open && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: "white",
              padding: 30,
              borderRadius: 12,
              width: 380,
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
            }}
          >
            <h3>Confirmation</h3>
            <p style={{ marginBottom: 20 }}>
              <strong>{modal.checklist.type}</strong> —{" "}
              <strong>{modal.checklist.attraction}</strong><br /><br />
              Voulez-vous vraiment supprimer cette checklist ?
            </p>

            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 20 }}>
              <button
                onClick={cancelDelete}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid #999",
                  background: "#eaeaea",
                  cursor: "pointer"
                }}
              >
                Annuler
              </button>

              <button
                onClick={confirmDelete}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#d9534f",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
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
        <button
          onClick={() => navigate("/pc-securite")}
          style={{
            position: "absolute", left: 20,
            backgroundColor: "#2f6f3a",
            border: "3px solid #f5c400",
            padding: "8px 18px",
            borderRadius: 10,
            color: "white",
            fontWeight: "bold",
          }}
        >
          PC Sécurité
        </button>

        <img
          src="/logo_walygator_maintenance.png"
          alt="logo"
          style={{ height: 80 }}
        />

        <button
          onClick={() => navigate("/global")}
          style={{
            position: "absolute",
            right: 90,
            backgroundColor: "#2f6f3a",
            border: "3px solid #f5c400",
            padding: "8px 18px",
            borderRadius: 10,
            color: "white",
            fontWeight: "bold",
          }}
        >
          Vue globale
        </button>

        <button
          onClick={handleLogout}
          style={{
            position: "absolute",
            right: 20,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <img
            src="/logout_door.png"
            alt=""
            style={{ height: 32, filter: "invert(1)" }}
          />
        </button>
      </div>

      {/* --- CONTENU --- */}
      <div style={{ display: "flex", padding: 20, gap: 40 }}>
        <div style={{ width: "40%" }}>
          <h2>Calendrier</h2>
          <Calendar onDateSelect={onDateSelect} selectedDate={selectedDate} />
        </div>

        <div style={{ width: "60%" }}>
          <h2>Checklists du {selectedDate?.label_complet}</h2>

          <ChecklistList
            title="Checklist journalière"
            checklists={lists.journaliere}
            onDelete={handleDelete}
          />

          <ChecklistList
            title="Checklist hebdomadaire"
            checklists={lists.hebdomadaire}
            onDelete={handleDelete}
          />

          <ChecklistList
            title="Checklist mensuelle"
            checklists={lists.mensuelle}
            onDelete={handleDelete}
          />

          <ChecklistList
            title="Checklist trimestrielle"
            checklists={lists.trimestrielle}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
