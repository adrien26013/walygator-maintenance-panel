import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import attractionsList from "../../data/attractionsList";

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

export default function StatutAttractionsControlMeca() {
  const navigate = useNavigate();

  const [statuses, setStatuses] = useState({});
  const [validatedToday, setValidatedToday] = useState(new Set());
  const [lastChecklistAt, setLastChecklistAt] = useState(null);

  /* 🔄 Tick minute */
  const [dayTick, setDayTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDayTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const today0 = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dayTick]);

  /* 🔥 PC Sécurité */
  useEffect(() => {
    return onSnapshot(collection(db, "attractionStatus"), (snap) => {
      const out = {};
      snap.forEach((d) => (out[d.id] = d.data()));
      setStatuses(out);
    });
  }, []);

  /* 🔥 Checklists journalières MÉCA */
  useEffect(() => {
    return onSnapshot(collection(db, "checklists"), (snap) => {
      const set = new Set();
      let latest = null;

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d?.type !== "journaliere") return;

        const ts = toDate(d.timestamp);
        if (!ts) return;

        const t0 = new Date(ts);
        t0.setHours(0, 0, 0, 0);
        if (!isSameDay(t0, today0)) return;

        if (!latest || ts > latest) latest = ts;

        if (Array.isArray(d.attractions)) {
          d.attractions.forEach((a) => set.add(normalizeAttraction(a)));
        }
        if (typeof d.attraction === "string") {
          set.add(normalizeAttraction(d.attraction));
        }
      });

      setValidatedToday(set);
      setLastChecklistAt(latest);
    });
  }, [today0]);

  /* 🎛 Action PC sécurité */
  const updateStatus = async (key, statut) => {
    await setDoc(
      doc(db, "attractionStatus", key),
      {
        status: statut,
        manual: true,
        manual_at: new Date(),
        updated_at: new Date(),
      },
      { merge: true }
    );
  };

  const handleLogout = async () => await signOut(auth);

  const colors = {
    fermee: "#ffb5b5",
    ouverte: "#b6ffb6",
    panne: "#fff3b0",
    evacuation: "#c3d9ff",
  };

  const translateStatus = (s) => {
    if (s === "panne") return "En panne";
    if (s === "evacuation") return "Évacuation en cours...";
    if (s === "ouverte") return "Ouverte";
    if (s === "fermee") return "Fermée";
    return s;
  };

  return (
    <div style={{ padding: 0 }}>
      {/* 🔝 HEADER MÉCANIQUE — DESIGN D’ORIGINE */}
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
        {/* ← RETOUR PANEL */}
        <button
          onClick={() => navigate("/")}
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

        {/* ONGLET PARCS */}
        <div style={{ position: "absolute", left: 200, display: "flex", gap: 8 }}>
          <button
            style={{
              backgroundColor: "#2f6f3a",
              border: "3px solid #f5c400",
              padding: "8px 14px",
              borderRadius: 10,
              color: "white",
              fontWeight: "bold",
              cursor: "default",
            }}
          >
            Parc mécanique
          </button>

          <button
            onClick={() => navigate("/pc-securite-aqua")}
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
        </div>

        {/* LOGO */}
        <img
          src="/logo_walygator_maintenance.png"
          alt=""
          style={{ height: 70 }}
        />

        {/* DÉCONNEXION */}
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

      {/* CONTENU */}
      <div style={{ padding: 20 }}>
        <h1>PC Sécurité — Attractions mécaniques</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 25,
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
                record.manual &&
                manualAt &&
                lastChecklistAt &&
                manualAt > lastChecklistAt &&
                record.status !== "ouverte"
              ) {
                displayStatus = record.status;
              }
            }

            return (
              <div
                key={a.nom}
                style={{
                  padding: 15,
                  borderRadius: 14,
                  background: hasChecklist ? colors[displayStatus] : "#d9d9d9",
                  opacity: hasChecklist ? 1 : 0.5,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                <img
                  src={`/attractions_meca/${a.image}`}
                  alt={a.nom}
                  style={{
                    width: "100%",
                    height: 150,
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />

                <p style={{ marginTop: 10, fontWeight: "bold", textAlign: "center" }}>
                  {a.nom}
                </p>

                <p style={{ textAlign: "center", marginBottom: 10 }}>
                  {hasChecklist
                    ? `Statut : ${translateStatus(displayStatus)}`
                    : "En attente de checklist..."}
                </p>

                {/* 🔘 BOUTONS STATUT — DESIGN ORIGINAL */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 12,
                    pointerEvents: hasChecklist ? "auto" : "none",
                  }}
                >
                  <button onClick={() => updateStatus(key, "fermee")}
                    style={{ background:"#ff4d4d", padding:"6px 10px", color:"white", borderRadius:6, border:"none", fontWeight:"bold" }}>
                    Fermée
                  </button>

                  <button onClick={() => updateStatus(key, "ouverte")}
                    style={{ background:"#34c759", padding:"6px 10px", color:"white", borderRadius:6, border:"none", fontWeight:"bold" }}>
                    Ouverte
                  </button>

                  <button onClick={() => updateStatus(key, "panne")}
                    style={{ background:"#f2c94c", padding:"6px 10px", color:"black", borderRadius:6, border:"none", fontWeight:"bold" }}>
                    En panne
                  </button>

                  <button onClick={() => updateStatus(key, "evacuation")}
                    style={{ background:"#4c88ff", padding:"6px 10px", color:"white", borderRadius:6, border:"none", fontWeight:"bold" }}>
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
