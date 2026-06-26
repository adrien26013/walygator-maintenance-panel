import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import { signOut } from "firebase/auth";
import attractionsList from "../../data/attractionsList";
import React, { useEffect, useState, useRef } from "react";
import MobileNavDrawer from "../../components/MobileNavDrawer";

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

const extractAttractionIds = (d) => {
  if (d?.attractions && typeof d.attractions === "object" && !Array.isArray(d.attractions)) {
    return Object.keys(d.attractions).map(normalizeAttraction);
  }
  if (Array.isArray(d?.attractions)) return d.attractions.map(normalizeAttraction);
  if (typeof d?.attraction === "string") return [normalizeAttraction(d.attraction)];
  return [];
};

export default function OperationMeca({ selectedDate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [validatedAttractions, setValidatedAttractions] = useState([]);
  const [nonSignedAttractions, setNonSignedAttractions] = useState([]);
  const [securityStatus, setSecurityStatus] = useState({});
  const [nonSignedDetails, setNonSignedDetails] = useState({});
  const [locksData, setLocksData] = useState({});
  const lastDayRef = useRef(null);

  const navigate = useNavigate();

  const [dayTick, setDayTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDayTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const translateStatus = (s) => {
    if (s === "panne") return "En panne";
    if (s === "evacuation") return "Évacuation en cours...";
    if (s === "ouverte") return "Ouverte";
    if (s === "fermee") return "Fermée";
    return s;
  };

  useEffect(() => {
  return onSnapshot(collection(db, "intervention_locks"), (snap) => {
    const map = {};

    snap.forEach((d) => {
      const data = d.data();

      if (data.active === false) return;
      if (data.cancelled_by_pc === true) return;
      if (!data.attractionKey) return;

      const normalizedKey = normalizeAttraction(data.attractionKey);

      map[normalizedKey] = {
        technicien_nom: data.technicien_nom || null,
      };
    });

    setLocksData(map);
  });
}, []);

  useEffect(() => {
  return onSnapshot(collection(db, "attractionStatus"), (snap) => {
    const map = {};
    snap.forEach((d) => {
      const key = normalizeAttraction(d.id);

      console.log("📥 [PC STATUS DOC]", {
        firestoreId: d.id,
        normalizedKey: key,
        data: d.data(),
      });

      map[key] = d.data();
    });

    console.log("🧠 [PC STATUS MAP FINAL]", map);
    setSecurityStatus(map);
  });
}, []);

  useEffect(() => {
  if (!effectiveDate) return;

  return onSnapshot(collection(db, "checklists"), (snap) => {
    // 🔥 JOUR ACTUEL (LOCAL ÉCRAN)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🔄 CHANGEMENT DE JOUR (ANTI CHROME FREEZE)
    if (
      !lastDayRef.current ||
      lastDayRef.current.getTime() !== today.getTime()
    ) {
      console.info("🔄 [GLOBAL MÉCA] Nouveau jour → reset checklists");
      lastDayRef.current = today;

      setValidatedAttractions([]);
      setNonSignedAttractions([]);
    }

    const validated = new Set();
    const signed = new Set();
    const nonSigned = new Set();
    const nonSignedMap = {};

    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d?.type !== "journaliere") return;

      const ts = toDate(d.timestamp);
      if (!ts) return;

      const t0 = new Date(ts);
      t0.setHours(0, 0, 0, 0);

      // 🔥 UNIQUEMENT LES CHECKLISTS DU JOUR
      if (t0.getTime() !== today.getTime()) return;

      extractAttractionIds(d).forEach((id) => {
        validated.add(id);

        if (d.signed === true) {
  signed.add(id);
} else {
  nonSigned.add(id);

  nonSignedMap[id] =
    d.refusalReason || "Aucun motif renseigné";
}
      });
    });

    // 🔥 PRIORITÉ AU SIGNÉ
    signed.forEach((id) => nonSigned.delete(id));

    setValidatedAttractions([...validated]);
    setNonSignedAttractions([...nonSigned]);
    setNonSignedDetails(nonSignedMap);
  });
}, [effectiveDate]);

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

  const handleLogout = async () => await signOut(auth);

  const colors = {
  fermee: "#ffb5b5",
  panne: "#fff3b0",
  evacuation: "#c3d9ff",
  ouverte: "#d4ffd4",

  // 🆕
  checklist_en_cours: "#93c5fd",
  attente_checklist: "#d9d9d9",
};

  return (
    <div style={{ padding: 0 }}>
      <style>{`
        @keyframes blink { 0%{opacity:1} 50%{opacity:.35} 100%{opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* HEADER */}
      <div className="ph-header" style={{ backgroundColor: "#235630" }}>
        <div className="ph-left">
          <button
            onClick={() => navigate("/")}
            style={{ background:"#2f6f3a", border:"3px solid #f5c400", padding:"8px 18px", borderRadius:10, color:"white", fontWeight:"bold" }}
          >
            ← Retour Panel
          </button>
          <button
            onClick={() => navigate("/operations-aqua")}
            style={{ background:"#1e90ff", border:"3px solid #f5c400", padding:"8px 14px", borderRadius:10, color:"white", fontWeight:"bold" }}
          >
            Parc aquatique
          </button>
        </div>

        <img src="/logo_walygator_maintenance.png" className="ph-logo" style={{ height:70 }} alt="" />

        {/* Hamburger mobile */}
        <button className="ph-hamburger" onClick={() => setMobileMenuOpen(true)}>
          <span /><span /><span />
        </button>

        <div className="ph-right">
          <button onClick={handleLogout} style={{ background:"transparent", border:"none", cursor:"pointer", display:"flex", gap:8, alignItems:"center" }}>
            <img src="/logout_door.png" style={{ height:32, filter:"invert(1)" }} alt="" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <MobileNavDrawer
          onClose={() => setMobileMenuOpen(false)}
          items={[
            { label: "← Retour Panel", onClick: () => navigate("/") },
            { label: "Parc aquatique", onClick: () => navigate("/operations-aqua") },
            "separator",
            { label: "Déconnexion", onClick: handleLogout, danger: true },
          ]}
        />
      )}

      {/* CONTENU */}
      <div style={{ padding:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <h1>Vue globale des attractions mécaniques</h1>
          <button
            onClick={() => navigate("/operations-aqua")}
            style={{ background:"#1e90ff", border:"3px solid #f5c400", padding:"6px 14px", borderRadius:10, color:"white", fontWeight:"bold" }}
          >
            Parc aquatique
          </button>
        </div>

        {/* LÉGENDE */}
        <div style={{ display:"flex", gap:20, flexWrap:"wrap", margin:"10px 0 20px" }}>
          <Legend color="#ffb5b5" label="Fermée" />
          <Legend color="#d4ffd4" label="Ouverte" />
          <Legend color="#fff3b0" label="En panne" />
          <Legend color="#c3d9ff" label="Évacuation en cours" />
          <Legend color="#d9d9d9" label="En attente de checklist" />
          <Legend color="#93c5fd" label="Checklist en cours" />
        </div>

        <p style={{ fontSize:18 }}>
          Journée du : <strong>{effectiveDate?.label_complet}</strong>
        </p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:25 }}>
          {attractionsList.map((a) => {
            if (a.comingSoon) return (
              <div key={a.nom} style={{ position: "relative", background: "#d9d9d9", borderRadius: 14, padding: 12, height: 260, textAlign: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", overflow: "hidden", opacity: 0.8 }}>
                <img src={`/attractions_meca/${a.image}`} alt="" style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 10, filter: "grayscale(60%) brightness(0.8)" }} />
                <div style={{ position: "absolute", top: 63, left: "50%", transform: "translateX(-50%) rotate(45deg)", background: "#cc0000", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", zIndex: 5 }}>
                  <span style={{ transform: "rotate(-45deg)", color: "white", fontWeight: "bold", fontSize: 10, textAlign: "center", lineHeight: 1.3 }}>Prochainement</span>
                </div>
                <p style={{ marginTop: 10, fontWeight: "bold", color: "#555" }}>{a.nom}</p>
              </div>
            );

            const key = normalizeAttraction(a.nom);
const hasChecklist = validatedAttractions.includes(key);
const isNonSigned = nonSignedAttractions.includes(key);
const record = securityStatus[key] || {};
const motif = nonSignedDetails[key];

let final = "fermee";
let forcedMessage = null;

// 🟦 CHECKLIST EN COURS = PAS DE CHECKLIST + PC L’A DÉCLARÉ
if (!hasChecklist && record.status === "checklist_en_cours") {
  final = "checklist_en_cours";
}

// 🔴 STATUT PC — UNIQUEMENT SI CHECKLIST EXISTE
else if (hasChecklist && record.manual === true) {
  final = record.status || "fermee";
}


else if (hasChecklist && isNonSigned) {
  final = "fermee";
  forcedMessage = "Fermée : checklist non signée";
}

// ⏳ PAS DE CHECKLIST
else if (!hasChecklist) {
  final = "attente_checklist";
}

// ✅ CHECKLIST SIGNÉE
else {
  final = "ouverte";
}

const isChecklistEnCours = final === "checklist_en_cours";
const lockInfo = locksData[key] || null;

const hasLock = lockInfo !== null;

            const isDisabled =
  final === "attente_checklist";
            const bg = final === "ouverte" && hasChecklist ? "#9aff9a" : colors[final];

            return (
              <div
  key={a.nom}
  style={{
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background:
      final === "checklist_en_cours"
        ? colors.checklist_en_cours
        : final === "attente_checklist"
? "#d9d9d9"
: colors[final] || "#d9d9d9",
    borderRadius: 14,
    padding: 12,
    minHeight: 260, // ⬅️ un peu plus grand
    textAlign: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    overflow: "hidden", // 🔥 IMPORTANT
  }}
>
                <img src={`/attractions_meca/${a.image}`} alt="" style={{ width:"100%", height:150, objectFit:"cover", borderRadius:10, opacity:
  isChecklistEnCours
    ? 0.75
    : final === "attente_checklist"
    ? 0.45
    : 1,
filter: isChecklistEnCours ? "grayscale(15%)" : "none"
 }} />
                <p style={{ marginTop:10, fontWeight:"bold" }}>{a.nom}</p>
               <p
  style={{
    fontWeight: forcedMessage ? "bold" : "normal",
    color: forcedMessage ? "#b00000" : "inherit",
    fontSize: 13,
    lineHeight: "1.2em",
    textAlign: "center",
    marginTop: 6
  }}
>
  {forcedMessage
    ? forcedMessage
    : final === "checklist_en_cours"
    ? "Checklist en cours…"
    : final === "attente_checklist"
    ? "En attente de checklist…"
    : `Statut : ${translateStatus(final)}`}
</p>

{isNonSigned && motif && (
  <p
    style={{
      fontSize: 12,
      color: "#333",
      marginTop: 4,
      fontStyle: "italic"
    }}
  >
    Motif : {motif}
  </p>
)}

{hasLock && (
  <p
    style={{
      fontSize: 11,
      color: "#235630",
      fontWeight: "bold",
      textAlign: "center",
      marginTop: 4,
      lineHeight: "1.3em",
    }}
  >
    🔧 Intervention en cours par le service technique...
  </p>
)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ width:16, height:16, background:color, borderRadius:4, border:"1px solid #999" }} />
      <strong>{label}</strong>
    </div>
  );
}
