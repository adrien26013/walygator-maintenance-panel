import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import attractionsList from "../data/attractionsList";

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

const extractAttractionIds = (d) => {
  if (d?.attractions && typeof d.attractions === "object" && !Array.isArray(d.attractions)) {
    return Object.keys(d.attractions).map(normalizeAttraction);
  }
  if (Array.isArray(d?.attractions)) return d.attractions.map(normalizeAttraction);
  if (typeof d?.attraction === "string") return [normalizeAttraction(d.attraction)];
  return [];
};

export default function GlobalView({ selectedDate }) {
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [validatedAttractions, setValidatedAttractions] = useState([]);
  const [securityStatus, setSecurityStatus] = useState({});
  const [lastChecklistAt, setLastChecklistAt] = useState(null);

  /* 🔄 Tick minute */
  const [dayTick, setDayTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDayTick((x) => x + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const translateStatus = (s) => {
    if (s === "panne") return "En panne";
    if (s === "evacuation") return "Evacuation en cours...";
    if (s === "ouverte") return "Ouverte";
    if (s === "fermee") return "Fermée";
    return s;
  };

  const blinkStyle = { animation: "blink 1s infinite" };
  const fadeStyle = { animation: "fadeIn 0.6s ease-out" };

  /* 🔥 Listener PC Sécurité */
  useEffect(() => {
    return onSnapshot(collection(db, "attractionStatus"), (snap) => {
      const map = {};
      snap.forEach((d) => (map[d.id] = d.data()));
      setSecurityStatus(map);
    });
  }, []);

  /* 🔥 Mise à jour date */
  useEffect(() => {
    if (!selectedDate?.raw) return;

    const d = new Date(selectedDate.raw);
    d.setHours(0, 0, 0, 0);

    const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
    const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

    setEffectiveDate({
      raw: d,
      label_complet: `${jours[d.getDay()]} ${String(d.getDate()).padStart(2,"0")} ${mois[d.getMonth()]} ${d.getFullYear()}`
    });
  }, [selectedDate, dayTick]);

  /* 🔥 Listener CHECKLISTS JOURNALIÈRES (mémoire FIXÉE) */
  useEffect(() => {
    if (!effectiveDate) return;

    return onSnapshot(collection(db, "checklists"), (snap) => {
      const validated = new Set();
      let latest = null;

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d?.type !== "journaliere") return;

        const ts = toDate(d.timestamp);
        if (!ts) return;

        const t0 = new Date(ts);
        t0.setHours(0, 0, 0, 0);
        if (!isSameDay(t0, effectiveDate.raw)) return;

        if (!latest || ts > latest) latest = ts;

        extractAttractionIds(d).forEach((id) => validated.add(id));
      });

      setValidatedAttractions([...validated]);
      setLastChecklistAt(latest);
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
      {/* CSS animations */}
      <style>{`
        @keyframes blink { 0%{opacity:1} 50%{opacity:.35} 100%{opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* BANNIÈRE */}
      <div style={{ width:"100%", height:95, background:"#235630", display:"flex", justifyContent:"center", alignItems:"center", position:"relative" }}>
        <button
          onClick={() => (window.location.href = "/")}
          style={{ position:"absolute", left:20, background:"#2f6f3a", border:"3px solid #f5c400", padding:"8px 18px", borderRadius:10, color:"white", fontWeight:"bold" }}
        >
          ← Retour Panel
        </button>

        <img src="/logo_walygator_maintenance.png" style={{ height:80 }} alt="" />

        <button
          onClick={handleLogout}
          style={{ position:"absolute", right:20, background:"transparent", border:"none", cursor:"pointer", display:"flex", gap:8, alignItems:"center" }}
        >
          <img src="/logout_door.png" style={{ height:32, filter:"invert(1)" }} alt="" />
          <span style={{ color:"white", fontWeight:"bold" }}>Déconnexion</span>
        </button>
      </div>

      {/* CONTENU */}
      <div style={{ padding:20 }}>
        <h1>Vue globale des attractions</h1>
        <p style={{ fontSize:18 }}>
          Journée du : <strong>{effectiveDate?.label_complet}</strong>
        </p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:25 }}>
          {attractionsList.map((a) => {
            const key = normalizeAttraction(a.nom);
            const hasChecklist = validatedAttractions.includes(key);

            const record = securityStatus[key] || {};
            const pcStatus = record.status || "fermee";
            const manualAt = toDate(record.manual_at);

            let final = "fermee";

            if (hasChecklist) {
              final = "ouverte";

              if (
                record.manual === true &&
                manualAt &&
                lastChecklistAt &&
                manualAt > lastChecklistAt &&
                pcStatus !== "ouverte"
              ) {
                final = pcStatus;
              }
            }

            const isDisabled = !hasChecklist;
            const bg = final === "ouverte" && hasChecklist ? "#9aff9a" : colors[final];
            const applyBlink = record.manual && (final === "panne" || final === "evacuation");
            const applyFade = final === "ouverte" || final === "fermee";

            return (
              <div
                key={a.nom}
                style={{
                  background: isDisabled ? "#d9d9d9" : bg,
                  borderRadius:14,
                  padding:12,
                  height:230,
                  textAlign:"center",
                  boxShadow:"0 2px 6px rgba(0,0,0,0.15)",
                  opacity:isDisabled ? 0.55 : 1,
                  ...(applyBlink ? blinkStyle : applyFade ? fadeStyle : {})
                }}
              >
                <img
                  src={`/attractions/${a.image}`}
                  alt=""
                  style={{ width:"100%", height:150, objectFit:"cover", borderRadius:10, opacity:isDisabled ? 0.45 : 1 }}
                />

                <p style={{ marginTop:10, fontWeight:"bold" }}>{a.nom}</p>
                <p>{isDisabled ? "En attente de checklist…" : `Statut : ${translateStatus(final)}`}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
