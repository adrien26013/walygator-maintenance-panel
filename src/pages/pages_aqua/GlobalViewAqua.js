import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { signOut } from "firebase/auth";
import attractionsListAqua from "../../data/attractionsListAqua";
import React, { useEffect, useState, useRef } from "react";

/* 🔒 NORMALISATION IDENTIQUE */
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

/* 🎢 GROUPES AQUA */
const AQUA_GROUPS = {
  kamikaze: ["el_dorado", "vertigo", "niagara", "poseidon"],
  tornado_et_volcano: ["tornado", "volcano"],
  centrale_et_zigzag: ["anaconda", "spirale", "speed_surf", "dragon", "zigzag", "centrale", "zigzag_gauche", "zigzag_centre", "zigzag_droit"],
  adventure_kids_et_children_paradise: ["adventure_kids", "children_paradise", "adventure_kids_cote_boutique", "adventure_kids_multipiste", "adventure_kids_cote_poste_de_secours"],
  piscine_a_vagues_et_riviere: ["piscine_a_vagues", "colorado_river"],
};

const resolveAquaGroup = (id) => {
  for (const [g, list] of Object.entries(AQUA_GROUPS)) {
    if (list.includes(id)) return g;
  }
  return id;
};

const toDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
};

function Legend({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 16,
          height: 16,
          background: color,
          borderRadius: 4,
          border: "1px solid #999"
        }}
      />
      <strong>{label}</strong>
    </div>
  );
}

export default function GlobalViewAqua({ selectedDate }) {
  console.log("🟢 [GLOBAL AQUA] render");
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [validatedAttractions, setValidatedAttractions] = useState([]);
  const [nonSignedAttractions, setNonSignedAttractions] = useState([]);
  const [securityStatus, setSecurityStatus] = useState({});
  const [opDoneGroups, setOpDoneGroups] = useState([]);
  const lastDayRef = useRef(null);

  /* 🔄 Tick identique méca */
  const [dayTick, setDayTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDayTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  /* 🔥 Statuts PC sécurité */
  useEffect(() => {
    console.log("🟡 [ATTRACTION STATUS] useEffect mounted");
  return onSnapshot(collection(db, "attractionStatus"), (snap) => {
    const map = {};
    snap.forEach((d) => {
  console.log(
    "📥 [ATTRACTION STATUS DOC]",
    d.id,
    d.data()
  );
  map[normalizeAttraction(d.id)] = d.data();
});
    console.log("🧠 [SECURITY STATUS STATE]", map);
setSecurityStatus(map);
  });
}, []);

  /* 🔥 CHECKLISTS — LOGIQUE IDENTIQUE MÉCA */
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
      console.info("🔄 [GLOBAL AQUA] Nouveau jour → reset checklists");
      lastDayRef.current = today;

      setValidatedAttractions([]);
      setNonSignedAttractions([]);
    }

    const validated = new Set();
    const signed = new Set();
    const nonSigned = new Set();
    const opDone = new Set();

    snap.forEach((docSnap) => {
      const d = docSnap.data();

      if (d?.type === "operationnelle" && d.signed === true && d.zone?.toLowerCase().includes("aquatique")) {
        const ts = toDate(d.timestamp);
        if (ts) {
          const t0 = new Date(ts); t0.setHours(0, 0, 0, 0);
          if (t0.getTime() === today.getTime()) {
            opDone.add(normalizeAttraction(d.attraction || ""));
          }
        }
      }

      if (d?.type !== "journaliere") return;
      if (!d.zone?.toLowerCase().includes("aquatique")) return;

      const ts = toDate(d.timestamp);
      if (!ts) return;

      const t0 = new Date(ts);
      t0.setHours(0, 0, 0, 0);

      // 🔥 UNIQUEMENT LES CHECKLISTS DU JOUR
      if (t0.getTime() !== today.getTime()) return;

      const attractions = Array.isArray(d.attractions)
        ? d.attractions
        : d.attraction
        ? [d.attraction]
        : [];

      const refused = Array.isArray(d.refusedAttractions)
        ? d.refusedAttractions.map(normalizeAttraction)
        : [];

      attractions.forEach((a) => {
        const id = normalizeAttraction(a);
        validated.add(id);

        if (d.signed === true) {
          signed.add(id);
        } else {
          if (refused.length > 0) {
            if (refused.includes(id)) {
              nonSigned.add(id);
            } else {
              signed.add(id);
            }
          } else {
            nonSigned.add(id);
          }
        }
      });
    });

    // 🔥 PRIORITÉ AU SIGNÉ
    signed.forEach((id) => nonSigned.delete(id));

    // 🔥 LOGIQUE GROUPE AQUA
    Object.entries(AQUA_GROUPS).forEach(([group, children]) => {
      const allValidated = children.every((c) => validated.has(c));
      const allNonSigned = children.every((c) => nonSigned.has(c));

      if (allValidated) validated.add(group);
      if (allNonSigned) nonSigned.add(group);
    });

    setValidatedAttractions([...validated]);
    setNonSignedAttractions([...nonSigned]);
    setOpDoneGroups([...opDone]);
  });
}, [effectiveDate]);

  /* DATE */
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
  ouverte: "#d4ffd4",
  pre_ouverte: "#ffd580",

  // 🆕
  checklist_en_cours: "#93c5fd", // bleu plus marqué
  attente_checklist: "#d9d9d9",

  panne: "#fff3b0",
  evacuation: "#c3d9ff",
};

  const translateStatus = (s) =>
    s === "panne"
      ? "En panne"
      : s === "evacuation"
      ? "Évacuation en cours"
      : s === "ouverte"
      ? "Ouverte"
      : s === "pre_ouverte"
      ? "Technique validée"
      : "Fermée";

  /* 🔥 STYLES CLIGNOTEMENT — IDENTIQUES MÉCA */
  const blinkStyle = { animation: "blink 1s infinite" };
  const fadeStyle = { animation: "fadeIn 0.6s ease-out" };

  return (
  <div style={{ padding: 0 }}>
    <style>{`
      @keyframes blink {
        0% { opacity: 1 }
        50% { opacity: .35 }
        100% { opacity: 1 }
      }
      @keyframes fadeIn {
        from { opacity: 0 }
        to { opacity: 1 }
      }
    `}</style>

    {/* HEADER */}
    <div
      style={{
        width: "100%",
        height: 95,
        background: "#0b4fa3",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative"
      }}
    >
      <button
        onClick={() => (window.location.href = "/")}
        style={{
          position: "absolute",
          left: 20,
          background: "#1e90ff",
          border: "3px solid #f5c400",
          padding: "8px 18px",
          borderRadius: 10,
          color: "white",
          fontWeight: "bold"
        }}
      >
        ← Retour Panel
      </button>

      <img
        src="/logo_walygator_aquatique_maintenance.png"
        style={{ height: 70 }}
        alt=""
      />

      <button
        onClick={handleLogout}
        style={{
          position: "absolute",
          right: 20,
          background: "transparent",
          border: "none",
          cursor: "pointer"
        }}
      >
        <img
          src="/logout_door.png"
          style={{ height: 32, filter: "invert(1)" }}
          alt=""
        />
      </button>
    </div>

    {/* CONTENU */}
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <h1>Vue globale des attractions aquatiques</h1>
        <button
          onClick={() => (window.location.href = "/global")}
          style={{
            background: "#235630",
            border: "3px solid #f5c400",
            padding: "6px 14px",
            borderRadius: 10,
            color: "white",
            fontWeight: "bold"
          }}
        >
          Parc mécanique
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          margin: "10px 0 20px"
        }}
      >
        <Legend color="#ffb5b5" label="Fermée" />
        <Legend color="#d4ffd4" label="Ouverte" />
        <Legend color="#fff3b0" label="En panne" />
        <Legend color="#c3d9ff" label="Évacuation en cours" />
        <Legend color="#ffd580" label="Technique validée" />
        <Legend color="#d9d9d9" label="En attente de checklist" />
        <Legend color="#93c5fd" label="Checklist en cours" />
      </div>

      <p style={{ fontSize: 18 }}>
        Journée du : <strong>{effectiveDate?.label_complet}</strong>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))",
          gap: 25
        }}
      >
        {attractionsListAqua.map((a) => {
          const id = normalizeAttraction(a.nom);
          const group = resolveAquaGroup(id);

          const hasChecklistAttraction = validatedAttractions.includes(id);
          const hasChecklistGroup = validatedAttractions.includes(group);

          const isNonSignedAttraction = nonSignedAttractions.includes(id);
          const isNonSignedGroup = nonSignedAttractions.includes(group);

          const hasChecklist =
            hasChecklistAttraction ||
            (!hasChecklistAttraction && hasChecklistGroup);

          const isNonSigned =
            isNonSignedAttraction ||
            (!hasChecklistAttraction && isNonSignedGroup);

          const attractionRecord = securityStatus[id];
          const groupRecord = securityStatus[group];

          const record =
            groupRecord?.status === "checklist_en_cours"
              ? groupRecord
              : attractionRecord || groupRecord || {};

          const pcStatus = record.status;

          let final = "fermee";
          let forcedMessage = null;

          if (!hasChecklist && pcStatus === "checklist_en_cours") {
  final = "checklist_en_cours";
} else if (!hasChecklist && pcStatus === "pre_ouverte") {
            final = "pre_ouverte";
          } else if (!hasChecklist && record.manual === true) {
            final = pcStatus || "fermee";
          } else if (!hasChecklist) {
            final = "attente_checklist";
          } else if (isNonSigned) {
            final = "fermee";
            forcedMessage = "Fermée : checklist non signée !";
          } else if (pcStatus === "pre_ouverte") {
            final = "pre_ouverte";
          } else if (record.manual === true) {
            final = pcStatus || "fermee";
          } else {
            final = "ouverte";
          }

          let statusLabel;
          if (forcedMessage) {
            statusLabel = forcedMessage;
          } else if (final === "checklist_en_cours") {
            statusLabel = "Checklist en cours…";
          } else if (final === "attente_checklist") {
            statusLabel = "En attente de checklist…";
          } else if (final === "pre_ouverte") {
            statusLabel = "Technique validée — attente opérationnel";
          } else {
            statusLabel = `Statut : ${translateStatus(final)}`;
          }

          const isDisabled = final === "attente_checklist";

          const bg =
            final === "ouverte" && hasChecklist
              ? "#9aff9a"
              : colors[final];

          const applyBlink =
            record.manual &&
            (final === "panne" || final === "evacuation");

          const applyFade = final === "ouverte" || final === "fermee";

          return (
            <div
              key={a.nom}
              style={{
                background:
  final === "checklist_en_cours"
    ? colors.checklist_en_cours
    : isDisabled
    ? "#d9d9d9"
    : bg,
                opacity: isDisabled ? 0.55 : 1,
                borderRadius: 14,
                padding: 12,
                height: 230,
                textAlign: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                ...(applyBlink
                  ? blinkStyle
                  : applyFade
                  ? fadeStyle
                  : {})
              }}
            >
              <img
                src={`/attractions_aqua/${a.image}`}
                alt=""
                style={{
                  width: "100%",
                  height: 150,
                  objectFit: "cover",
                  borderRadius: 10,
                  opacity: isDisabled ? 0.45 : 1
                }}
              />

              <p style={{ marginTop: 10, fontWeight: "bold" }}>
                {a.nom}
              </p>

              <p
                style={{
                  fontWeight: forcedMessage ? "bold" : "normal",
                  color: forcedMessage ? "#b00000" : "inherit",
                  fontSize: 13
                }}
              >
                {statusLabel}
              </p>

              {opDoneGroups.includes(group) && (
                <p style={{ fontSize: 11, color: "#1a7f3c", fontWeight: "bold", margin: "2px 0 0 0" }}>
                  ✓ Opérationnel validé
                </p>
              )}

              {record.manual === true && record.status === "fermee" && record.raison_fermeture && (
                <p style={{
                  fontSize: 11,
                  color: "#333",
                  fontStyle: "italic",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}>
                  Raison : {record.raison_fermeture}
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
