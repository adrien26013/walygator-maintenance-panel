import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "../../components/Calendar";
import ChecklistList from "../../components/ChecklistList";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function DashboardAqua({ setSelectedDateGlobal }) {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(null);
  const [journaliere, setJournaliere] = useState([]);
  const [analyseEaux, setAnalyseEaux] = useState([]);
  const [backwashData, setBackwashData] = useState([]);

  // ✅ AJOUT POUR LE ZIP (COMME MECA)
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const lastDayRef = useRef(null);

  useEffect(() => {
  const t = setInterval(() => {
    if (!selectedDate) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // seulement si on était sur "aujourd’hui"
    if (
      selectedDate.raw.getTime() ===
      (lastDayRef.current?.getTime() ?? selectedDate.raw.getTime())
    ) {
      if (today.getTime() !== selectedDate.raw.getTime()) {
        const obj = {
          raw: today,
          label: today.toLocaleDateString("fr-FR"),
          label_complet: today.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
        };

        setSelectedDate(obj);
        setSelectedDateGlobal?.(obj);
        lastDayRef.current = today;
      }
    }
  }, 60000);

  return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedDate]);

  const formatDisplayed = (d) =>
    d.raw.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  /* 📅 Date du jour */
  useEffect(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const obj = {
    raw: now,
    label: now.toLocaleDateString("fr-FR"),
    label_complet: formatDisplayed({ raw: now }),
  };

  lastDayRef.current = now;

  setSelectedDate(obj);
  setSelectedDateGlobal?.(obj);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  /* 📅 Sélection calendrier */
  const handleDateSelect = (obj) => {
  const full = {
    ...obj,
    label_complet: formatDisplayed(obj),
  };

  lastDayRef.current = full.raw;

  setSelectedDate(full);
  setSelectedDateGlobal?.(full);
};

  /* 🔥 Firestore — AQUA / journalière */
  useEffect(() => {
    if (!selectedDate) return;

    const start = new Date(selectedDate.raw);
    start.setHours(0, 0, 0, 0);

    const end = new Date(selectedDate.raw);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "checklists"),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end),
      where("parc", "==", "aqua"),
      where("type", "==", "journaliere")
    );

    return onSnapshot(q, (snap) => {
      const out = [];
      snap.forEach((docSnap) => {
        out.push({ id: docSnap.id, ...docSnap.data() });
      });
      setJournaliere(out);
      console.log(
  "[AQUA DASHBOARD] checklists du jour =",
  out.map((c) => ({
    id: c.id,
    signed: c.signed,
    attraction: c.attraction,
    groupId: c.groupId,
  }))
);
    });
  }, [selectedDate]);

  /* 🔥 Firestore — Analyse des eaux */
  useEffect(() => {
    if (!selectedDate) return;
    const start = new Date(selectedDate.raw);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate.raw);
    end.setHours(23, 59, 59, 999);
    const q = query(
      collection(db, "analyse_eaux"),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end)
    );
    return onSnapshot(q, (snap) => {
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      setAnalyseEaux(out);
    });
  }, [selectedDate]);

  /* 🔥 Firestore — Backwash */
  useEffect(() => {
    if (!selectedDate) return;
    const start = new Date(selectedDate.raw);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate.raw);
    end.setHours(23, 59, 59, 999);
    const q = query(
      collection(db, "backwash"),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end)
    );
    return onSnapshot(q, (snap) => {
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      setBackwashData(out);
    });
  }, [selectedDate]);

  /* 🗑 suppression */
  const handleDeleteChecklist = async (checklist) => {
    if (!checklist?.id) return;
    await deleteDoc(doc(db, "checklists", checklist.id));
  };

  const handleLogout = async () => await signOut(auth);

  /* ⬇️ ZIP AQUA */
  const handleDownloadZip = async () => {
    if (!dateFrom || !dateTo) return;
    setIsDownloading(true);
    try {
      const url =
        "https://downloadchecklistszip-siuqyxtfpq-ew.a.run.app" +
        `?dateFrom=${dateFrom}&dateTo=${dateTo}&parc=aqua`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `checklists_du_${dateFrom}_au_${dateTo}.zip`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Erreur ZIP:", e);
      alert("Erreur lors du téléchargement du ZIP");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div>
      {/* 🔝 HEADER AQUA — INCHANGÉ */}
      <div
        className="ph-header"
        style={{
          backgroundColor: "#0b4fa3",
        }}
      >
        <div className="ph-left" style={{ gap: 8 }}>
          <button
  onClick={() => navigate("/codes-secrets")}
  style={{
    backgroundColor: "#1e90ff",
    border: "3px solid #f5c400",
    padding: "8px 14px",
    borderRadius: 10,
    color: "white",
    fontWeight: "bold",
  }}
>
  Codes secrets
</button>
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
              backgroundColor: "#ffffff33",
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

        <img
          src="/logo_walygator_aquatique_maintenance.png"
          alt="logo"
          className="ph-logo"
          style={{ height: 70 }}
        />

        <div className="ph-right" style={{ gap: 14 }}>
          <button
            onClick={() => navigate("/global")}
            style={{
              backgroundColor: "#ffffff33",
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
  onClick={() => navigate("/operations-aqua")}
  style={{
    backgroundColor: "#1e90ff",
    border: "3px solid #f5c400",
    padding: "8px 14px",
    borderRadius: 10,
    color: "white",
    fontWeight: "bold"
  }}
>
  Opérations
</button>

          <button
            onClick={handleLogout}
            style={{ background: "transparent", border: "none" }}
          >
            <img
              src="/logout_door.png"
              alt="logout"
              style={{ height: 32, filter: "invert(1)" }}
            />
          </button>
        </div>
      </div>

      {/* CONTENU */}
      <div className="ph-content">
        <div className="ph-col-left">
          <Calendar onDateSelect={handleDateSelect} />
        </div>

        <div className="ph-col-right">
          {/* ✅ BLOC ZIP (AJOUTÉ, UI SIMPLE, IDENTIQUE MECA) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>
              Checklists du {selectedDate?.label_complet} — Parc aquatique
            </h2>

            <div style={{ display: "flex", gap: 6 }}>
              <input type="date" onChange={(e) => setDateFrom(e.target.value)} />
              <input type="date" onChange={(e) => setDateTo(e.target.value)} />
              <button
                onClick={handleDownloadZip}
                disabled={!dateFrom || !dateTo || isDownloading}
              >
                {isDownloading ? "ZIP..." : "⬇ ZIP"}
              </button>
            </div>
          </div>

          <ChecklistList
            title="Checklist journalière"
            checklists={journaliere}
            onDelete={handleDeleteChecklist}
          />

          {/* ANALYSE DES EAUX */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ color: "#00838F", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🧪</span> Analyse des eaux
              <span style={{ background: "#00838F", color: "white", borderRadius: 12, padding: "2px 10px", fontSize: 13 }}>
                {analyseEaux.length}
              </span>
            </h3>
            {analyseEaux.length === 0 ? (
              <p style={{ color: "#888", fontStyle: "italic" }}>Aucune analyse enregistrée pour ce jour.</p>
            ) : (
              analyseEaux.map((a) => (
                <div key={a.id} style={{ border: "1.5px solid #00838F", borderRadius: 10, padding: "10px 14px", marginBottom: 8, backgroundColor: "#f0fdfd" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "#00838F" }}>
                      {a.prenom} {a.nom}{a.periode ? ` — ${a.periode}` : ""}
                    </strong>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      {a.heureReleve || (a.timestamp?.toDate ? a.timestamp.toDate().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "")}
                    </span>
                  </div>
                  {a.observations && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#444" }}>{a.observations}</p>}
                  {a.pdf_url && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <a href={a.pdf_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #00838F", borderRadius: 6, color: "#00838F", textDecoration: "none" }}>👁 Voir</a>
                      <a href={a.pdf_url} download style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #00838F", borderRadius: 6, color: "#00838F", textDecoration: "none" }}>⬇ Télécharger</a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* BACKWASH */}
          <div style={{ marginTop: 16 }}>
            <h3 style={{ color: "#1565C0", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>💧</span> Backwash / Pré-filtre
              <span style={{ background: "#1565C0", color: "white", borderRadius: 12, padding: "2px 10px", fontSize: 13 }}>
                {backwashData.length}
              </span>
            </h3>
            {backwashData.length === 0 ? (
              <p style={{ color: "#888", fontStyle: "italic" }}>Aucun backwash enregistré pour ce jour.</p>
            ) : (
              backwashData.map((b) => (
                <div key={b.id} style={{ border: "1.5px solid #1565C0", borderRadius: 10, padding: "10px 14px", marginBottom: 8, backgroundColor: "#f0f4ff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "#1565C0" }}>
                      {b.lt || "LT non précisé"}
                      {b.nom && ` — ${b.prenom || ""} ${b.nom}`}
                    </strong>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      {b.timestamp?.toDate ? b.timestamp.toDate().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  {b.observations && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#444" }}>{b.observations}</p>}
                  {b.pdf_url && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <a href={b.pdf_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #1565C0", borderRadius: 6, color: "#1565C0", textDecoration: "none" }}>👁 Voir</a>
                      <a href={b.pdf_url} download style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #1565C0", borderRadius: 6, color: "#1565C0", textDecoration: "none" }}>⬇ Télécharger</a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* RAPPORT D’INTERVENTION */}
<div
  style={{
    marginTop: 24,
    padding: "14px 18px",
    border: "1.5px solid #0b4fa3",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <span style={{ fontSize: 20 }}>📄</span>
    <h3
      style={{
        margin: 0,
        fontSize: 16,
        fontWeight: 600,
        color: "#0b4fa3",
      }}
    >
      Rapport d’intervention en temps réel
    </h3>
  </div>

  <button onClick={async () => {
    try {
      const r = await fetch("https://exportinterventionsexcel-siuqyxtfpq-ew.a.run.app");
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const now = new Date();
      const d = `${String(now.getDate()).padStart(2,"0")}_${String(now.getMonth()+1).padStart(2,"0")}_${now.getFullYear()}`;
      a.download = `rapport_intervention_${d}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { alert("Erreur téléchargement Excel"); }
  }} style={{ backgroundColor: "#0b4fa3", color: "white", padding: "8px 14px", borderRadius: 8, fontWeight: "bold", fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
    ⬇ Télécharger
  </button>
</div>

          {/* --- OBSERVATIONS TECHNICIENS --- */}
          <div style={{ marginTop: 12, padding: "14px 18px", border: "1.5px solid #0b4fa3", borderRadius: 10, backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📝</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0b4fa3" }}>Observations & photos des techniciens</h3>
            </div>
            <button onClick={() => navigate("/observations")} style={{ backgroundColor: "#0b4fa3", color: "white", padding: "8px 14px", borderRadius: 8, fontWeight: "bold", fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              Voir les observations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
