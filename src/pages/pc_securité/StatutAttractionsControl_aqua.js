import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { deleteField } from "firebase/firestore";
import attractionsListAqua from "../../data/attractionsListAqua";

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

const getGroupChildren = (groupKey) => {
  return AQUA_GROUPS[groupKey] || [];
};


const toDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
};

export default function StatutAttractionsControlAqua() {
  const navigate = useNavigate();

  const [statuses, setStatuses] = useState({});
  const [validatedToday, setValidatedToday] = useState(new Set());
  const [nonSignedToday, setNonSignedToday] = useState(new Set());
  const [panneModal, setPanneModal] = useState(null);
  const lastDayRef = useRef(null);
// { key, name }

const getActiveGroupIncident = (key) => {
  const groupKey = resolveAquaGroup(key);
  return incidentsActifs[groupKey]?.scope === "group"
    ? groupKey
    : null;
};

const [panneReason, setPanneReason] = useState("");

const [panneScope, setPanneScope] = useState("single"); 
// "single" | "group"

// ⏱ Incidents actifs (chrono panne)
const [incidentsActifs, setIncidentsActifs] = useState({});

// ⏱ tick UI pour chrono (fluide, identique méca)
const [, forceTick] = useState(0);

useEffect(() => {
  const t = setInterval(() => {
    forceTick((x) => x + 1);
  }, 1000);
  return () => clearInterval(t);
}, []);

  /* 🔄 Tick minute (IDENTIQUE MÉCA) */
  const [dayTick, setDayTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDayTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  /* 🔥 Statuts PC sécurité */
  useEffect(() => {
  return onSnapshot(collection(db, "attractionStatus"), (snap) => {
    const map = {};
    snap.forEach((d) => {
      map[d.id] = d.data();
    });
    setStatuses(map);
  });
}, []);

  /* 🔥 CHECKLISTS — LOGIQUE CORRECTE */
  /* 🔥 CHECKLISTS AQUA — RESET ROBUSTE À MINUIT */
useEffect(() => {
  return onSnapshot(collection(db, "checklists"), (snap) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (
      !lastDayRef.current ||
      lastDayRef.current.getTime() !== today.getTime()
    ) {
      console.info("🔄 [PC] Nouveau jour détecté");

      lastDayRef.current = today;
      setValidatedToday(new Set());
      setNonSignedToday(new Set());
    }

    const validated = new Set();
    const signed = new Set();
    const nonSigned = new Set();

    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d?.type !== "journaliere") return;

      const ts = toDate(d.timestamp);
      if (!ts) return;

      const t0 = new Date(ts);
      t0.setHours(0, 0, 0, 0);
      if (t0.getTime() !== today.getTime()) return;

      const attractions = Array.isArray(d.attractions)
        ? d.attractions
        : d.attraction
        ? [d.attraction]
        : [];

      const refused = Array.isArray(d.refusedAttractions)
  ? d.refusedAttractions.map(normalizeAttraction)
  : [];

attractions.forEach((raw) => {
  const key = normalizeAttraction(raw);
  validated.add(key);

  if (d.signed === true) {
    signed.add(key);
  } else {
    if (refused.length > 0) {
      if (refused.includes(key)) {
        nonSigned.add(key); // 🔥 refus explicite
      } else {
        signed.add(key); // 🔥 non refusée → OK
      }
    } else {
      nonSigned.add(key); // 🔥 non signé sans détail
    }
  }
});
    });

    signed.forEach((k) => nonSigned.delete(k));

    setValidatedToday(validated);
    setNonSignedToday(nonSigned);
  });
}, [dayTick]);

  /* 🔥 Incidents actifs AQUA */
useEffect(() => {
  const q = query(
    collection(db, "incidents"),
    where("actif", "==", true),
    where("zone", "==", "aqua")
  );

  return onSnapshot(q, (snap) => {
    const map = {};
    snap.forEach((d) => {
      const data = d.data();
      const startMs =
        data.startMs ??
        (data.startTime ? toDate(data.startTime)?.getTime() : null);
      const key = normalizeAttraction(data.attractionKey);
      // Si plusieurs incidents actifs pour la même attraction, garder le plus récent
      if (!map[key] || (startMs ?? 0) > (map[key].startMs ?? 0)) {
        map[key] = { id: d.id, ...data, startMs };
      }
    });
    setIncidentsActifs(map);
  });
}, []);

const closeLocksIfAny = async (key) => {
  const snap = await getDocs(
    query(collection(db, "intervention_locks"), where("status", "==", "active"))
  );
  for (const d of snap.docs) {
    if (d.id.startsWith(key + "_")) {
      await setDoc(d.ref, {
        status: "cancelled_by_pc",
        cancelled_by_pc: true,
        updated_at: serverTimestamp(),
      }, { merge: true });
    }
  }
};

const closeIncidentIfAny = async (incidentKey) => {
  const q = query(
    collection(db, "incidents"),
    where("actif", "==", true),
    where("attractionKey", "==", incidentKey)
  );

  const snap = await getDocs(q);

  for (const d of snap.docs) {
    await setDoc(
      d.ref,
      {
        actif: false,
        closedAt: serverTimestamp(),
        resetToken: Date.now(), // 🔥 RESET CHRONO
      },
      { merge: true }
    );
  }
};

const updateStatusRespectingGroup = async (key, statut) => {
  const groupKey = resolveAquaGroup(key);

  const attractionRecord = statuses[key];
  const groupRecord = statuses[groupKey];

  const hasChecklistAttraction = validatedToday.has(key);
  const hasChecklistGroup = validatedToday.has(groupKey);

  const hasChecklist =
    hasChecklistAttraction ||
    (!hasChecklistAttraction && hasChecklistGroup);

  const checklistReallyInProgress =
    !hasChecklist &&
    (
      attractionRecord?.status === "checklist_en_cours" ||
      groupRecord?.status === "checklist_en_cours"
    );

  if (checklistReallyInProgress) {
    console.warn("⛔ Action PC bloquée : checklist réellement en cours");
    return;
  }

  const activeGroupKey = getActiveGroupIncident(key);
  const isGroupAction = Boolean(activeGroupKey);

  const targets = isGroupAction
  ? [activeGroupKey, ...getGroupChildren(activeGroupKey)]
  : [key];

  for (const attractionKey of targets) {
    await setDoc(
  doc(db, "attractionStatus", attractionKey),
  {
    status: statut,
    parc: "aqua",
    manual: true,
    manual_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    source: "pc_securite",

    checklistSession: deleteField(),
  },
  { merge: true } // ✅ OBLIGATOIRE
);
  }

  for (const attractionKey of targets) {
    await closeLocksIfAny(attractionKey);
  }

  if (isGroupAction && statut === "ouverte") {
    await closeIncidentIfAny(activeGroupKey);
  }
};

const triggerPanneWithIncident = async ({ key, name, reason, scope }) => {
  const groupKey = resolveAquaGroup(key);
  const isGroup = scope === "group" && groupKey !== key;

  const incidentKey = isGroup ? groupKey : key;
  const incidentName = isGroup ? `Groupe ${groupKey}` : name;

  const affectedAttractions = isGroup
    ? getGroupChildren(groupKey)
    : [key];

  const leaderKey = isGroup ? affectedAttractions[0] : null;

  // 1️⃣ Clôturer incidents existants
  const qExisting = query(
    collection(db, "incidents"),
    where("attractionKey", "==", incidentKey),
    where("actif", "==", true)
  );
  const snapExisting = await getDocs(qExisting);
  for (const d of snapExisting.docs) {
    await setDoc(d.ref, {
      actif: false,
      closedAt: serverTimestamp(),
    }, { merge: true });
  }

  // 2️⃣ Créer NOUVEL incident
  await addDoc(collection(db, "incidents"), {
    attraction: incidentName,
    attractionKey: incidentKey,
    scope: isGroup ? "group" : "attraction",
    groupKey: isGroup ? groupKey : null,
    zone: "aqua",
    sessionId: Date.now().toString(),
    startTime: serverTimestamp(),
    resetToken: Date.now(),
    actif: true,
    source: "pc_securite",
    dateJour: new Date().toISOString().slice(0, 10),
    raisonPanne: reason,
    raisonPc: reason,
    raison_pc_securite: reason,
  });

  // 3️⃣ Mettre à jour attractionStatus pour chaque attraction
  for (const attractionKey of affectedAttractions) {
    await setDoc(
      doc(db, "attractionStatus", attractionKey),
      {
        status: "panne",
        parc: "aqua",
        manual: true,
        source: "pc_securite",
        updated_at: serverTimestamp(),
        group: isGroup ? groupKey : null,
        groupLeader: isGroup && attractionKey === leaderKey,
        raisonPc: reason,
        raison_pc_securite: reason,
      },
      { merge: true }
    );
    await closeLocksIfAny(attractionKey);
  }
};

  // ⏱ Format durée arrêt attraction
const formatDuration = (incident) => {
  if (!incident) return "00:00:00";

  // 🔥 PRIORITÉ ABSOLUE AU RESET
  const baseMs =
    typeof incident.resetToken === "number"
      ? incident.resetToken
      : incident.startTime?.toDate
      ? incident.startTime.toDate().getTime()
      : null;

  if (!baseMs) return "00:00:00";

  const diff = Math.max(0, Math.floor((Date.now() - baseMs) / 1000));

  const h = String(Math.floor(diff / 3600)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const s = String(diff % 60).padStart(2, "0");

  return `${h}:${m}:${s}`;
};

  const handleLogout = async () => await signOut(auth);

  const colors = {
  fermee: "#ffb5b5",
  ouverte: "#b6ffb6",
  pre_ouverte: "#ffd580",
  panne: "#fff3b0",
  evacuation: "#c3d9ff",
  attente_checklist: "#d9d9d9",

  // 🆕
  checklist_en_cours: "#93c5fd",
};

  const translateStatus = (s) => {
    if (s === "panne") return "En panne";
    if (s === "evacuation") return "Évacuation en cours…";
    if (s === "ouverte") return "Ouverte";
    if (s === "pre_ouverte") return "Technique validée";
    if (s === "fermee") return "Fermée";
    if (s === "checklist_en_cours") return "Checklist en cours";
    return s;
  };

  const isCurrent = (current, button) => current === button;

  /* ================= UI — STRICTEMENT INCHANGÉE ================= */
  return (
    <div style={{ padding: 0 }}>
      <div
        className="ph-header"
        style={{ width: "100%", backgroundColor: "#0b4fa3" }}
      >
        <div className="ph-left" style={{ gap: 10 }}>
  <button
    onClick={() => navigate("/")}
    style={{
      backgroundColor: "#1e90ff",
      border: "3px solid #f5c400",
      padding: "8px 18px",
      borderRadius: 10,
      color: "white",
      fontWeight: "bold",
      cursor: "pointer",
    }}
  >
    ← Retour Panel
  </button>

  <button
    onClick={() => navigate("/pc-securite")}
    style={{
      background: "#235630",
      border: "3px solid #f5c400",
      padding: "6px 14px",
      borderRadius: 10,
      color: "white",
      fontWeight: "bold",
      cursor: "pointer",
    }}
  >
    Parc mécanique
  </button>

  <button
    disabled
    style={{
      background: "#1e90ff",
      border: "3px solid #f5c400",
      padding: "6px 14px",
      borderRadius: 10,
      color: "white",
      fontWeight: "bold",
      opacity: 0.8,
      cursor: "default",
    }}
  >
    Parc aquatique
  </button>
</div>

        <img
          className="ph-logo"
          src="/logo_walygator_aquatique_maintenance.png"
          alt="logo"
          style={{ height: 70 }}
        />

        <div className="ph-right">
          <button
            onClick={handleLogout}
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <img src="/logout_door.png" alt="" style={{ height: 32, filter: "invert(1)" }} />
          </button>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <h1>PC Sécurité — Attractions aquatiques</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 25,
          }}
        >
          {attractionsListAqua.map((a) => {
            const key = normalizeAttraction(a.nom);
            const group = resolveAquaGroup(key);

            const hasChecklistAttraction = validatedToday.has(key);
const hasChecklistGroup = validatedToday.has(group);

const isNonSignedAttraction = nonSignedToday.has(key);
const isNonSignedGroup = nonSignedToday.has(group);

// 🔥 RÈGLE : attraction > groupe
const hasChecklist =
  hasChecklistAttraction || (!hasChecklistAttraction && hasChecklistGroup);

const isNonSigned =
  isNonSignedAttraction ||
  (!hasChecklistAttraction && isNonSignedGroup);

            
const incident =
  incidentsActifs[key] ||
  incidentsActifs[resolveAquaGroup(key)];

const groupKey = resolveAquaGroup(key);

const recordAttraction = statuses[key] || {};
const recordGroup = statuses[groupKey] || {};

const pcStatus =
  recordAttraction.status ||
  recordGroup.status ||
  "fermee";

let final = "fermee";
let forcedMessage = null;

/* 🟦 1. CHECKLIST EN COURS (PRIORITÉ ABSOLUE) */
if (
  !hasChecklist &&
  (
    recordAttraction.status === "checklist_en_cours" ||
    recordGroup.status === "checklist_en_cours"
  )
) {
  final = "checklist_en_cours";
}


/* ⛔ 2. CHECKLIST NON SIGNÉE */
else if (hasChecklist && isNonSigned) {
  final = "fermee";
  forcedMessage = "Fermée : checklist non signée";
}

/* 🔴 3. STATUT PC SÉCURITÉ (attraction OU groupe) */
else if (
  recordAttraction.manual === true ||
  recordGroup.manual === true
) {
  final = pcStatus;
}

/* 🟡 4. TECHNIQUE VALIDÉE (auto-send checklist technique) */
else if (pcStatus === "pre_ouverte") {
  final = "pre_ouverte";
}

/* ⏳ 5. PAS DE CHECKLIST */
else if (!hasChecklist) {
  final = "attente_checklist";
}

else {
  final = "ouverte";
}
            const disableActions =
  isNonSigned ||
  final === "checklist_en_cours" ||
  (!hasChecklist && !recordAttraction?.manual && !recordGroup?.manual)

            return (
              <div
                key={a.nom}
                style={{
                  padding: 15,
                  borderRadius: 14,
                  background: forcedMessage
  ? "#ffb5b5"
  : final === "checklist_en_cours"
  ? colors.checklist_en_cours
  : !hasChecklist
  ? "#d9d9d9"
  : colors[final] || "#d9d9d9",
                  opacity: !hasChecklist ? 0.5 : 1,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                <img
                  src={`/attractions_aqua/${a.image}`}
                  alt={a.nom}
                  style={{
                    width: "100%",
                    height: 150,
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />

                <p
                  style={{
                    marginTop: 10,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  {a.nom}
                </p>

                <p
                  style={{
                    textAlign: "center",
                    marginBottom: 10,
                    fontWeight: forcedMessage ? "bold" : "normal",
                    color: forcedMessage ? "#b00000" : "inherit",
                  }}
                >
                  {forcedMessage
  ? forcedMessage
  : final === "checklist_en_cours"
  ? "Checklist en cours"
  : final === "pre_ouverte"
  ? "Technique validée — attente opérationnel"
  : hasChecklist
  ? `Statut : ${translateStatus(final)}`
  : "En attente de checklist…"}
                </p>

                {incident && final === "panne" && (
  <p
    style={{
      textAlign: "center",
      fontWeight: "bold",
      color: "#b45f00",
      marginTop: -4,
    }}
  >
    ⏱ Arrêt depuis {formatDuration(incident)}
  </p>
)}
                {final === "fermee" && (recordAttraction.raison_fermeture || recordGroup.raison_fermeture) && (
  <p style={{ textAlign: "center", fontSize: 11, color: "#550000", fontStyle: "italic",
               overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginTop: 4 }}>
    Raison : {recordAttraction.raison_fermeture || recordGroup.raison_fermeture}
  </p>
)}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 12,
                    pointerEvents: disableActions ? "none" : "auto",
                    opacity: disableActions ? 0.45 : 1,
                  }}
                >
                  <button
  onClick={() =>
    !disableActions &&
    !isCurrent(final, "fermee") &&
    updateStatusRespectingGroup(key, "fermee")
  }
  disabled={
    disableActions || isCurrent(final, "fermee")
  }
  style={{
    background: "#ff4d4d", // 🔥 couleur originale
    padding: "6px 10px",
    color: "white",
    borderRadius: 6,
    border: "none",
    fontWeight: "bold",
    cursor:
      disableActions || isCurrent(final, "fermee")
        ? "not-allowed"
        : "pointer",
    opacity:
      isCurrent(final, "fermee") ? 0.4 : 1,
  }}
>
  Fermée
</button>
                  <button
  onClick={() =>
    !disableActions &&
    !isCurrent(final, "ouverte") &&
    updateStatusRespectingGroup(key, "ouverte")
  }
  disabled={
    disableActions || isCurrent(final, "ouverte")
  }
  style={{
    background: "#34c759",
    padding: "6px 10px",
    color: "white",
    borderRadius: 6,
    border: "none",
    fontWeight: "bold",
    cursor:
      disableActions || isCurrent(final, "ouverte")
        ? "not-allowed"
        : "pointer",
    opacity:
      isCurrent(final, "ouverte") ? 0.4 : 1,
  }}
>
  Ouverte
</button>

                  <button
  onClick={() =>
    !disableActions &&
    !isCurrent(final, "panne") &&
    final !== "fermee" &&
    setPanneModal({ key, name: a.nom })
  }
  disabled={
    disableActions || isCurrent(final, "panne") || final === "fermee"
  }
  style={{
    background: "#f2c94c",
    padding: "6px 10px",
    color: "black",
    borderRadius: 6,
    border: "none",
    fontWeight: "bold",
    cursor:
      disableActions || isCurrent(final, "panne") || final === "fermee"
        ? "not-allowed"
        : "pointer",
    opacity:
      isCurrent(final, "panne") || final === "fermee" ? 0.4 : 1,
  }}
>
  En panne
</button>
                  <button
  onClick={() =>
    !disableActions &&
    !isCurrent(final, "evacuation") &&
    updateStatusRespectingGroup(key, "evacuation")
  }
  disabled={
    disableActions || isCurrent(final, "evacuation")
  }
  style={{
    background: "#4c88ff",
    padding: "6px 10px",
    color: "white",
    borderRadius: 6,
    border: "none",
    fontWeight: "bold",
    cursor:
      disableActions || isCurrent(final, "evacuation")
        ? "not-allowed"
        : "pointer",
    opacity:
      isCurrent(final, "evacuation") ? 0.4 : 1,
  }}
>
  Évac
</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* 🔴 MODAL PANNE – UI IDENTIQUE CODE SECRET */}
{panneModal && (
  <div style={styles.overlay}>
    <div style={styles.editModal}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
  <div
    style={{
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 6,
    }}
  >
    {panneModal.name}
  </div>

  <div
    style={{
      fontSize: 14,
      color: "#555",
      fontWeight: "bold",
      letterSpacing: 0.5,
    }}
  >
    Raison attraction en panne
  </div>
</div>
{(() => {
  const group = resolveAquaGroup(
    normalizeAttraction(panneModal.key)
  );

  const isGroup = group !== normalizeAttraction(panneModal.key);

  if (!isGroup) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontWeight: "bold", fontSize: 14 }}>
        Portée de la panne
      </label>

      <div style={{ marginTop: 6, display: "flex", gap: 14 }}>
        <label style={{ display: "flex", gap: 6, cursor: "pointer" }}>
          <input
            type="radio"
            value="single"
            checked={panneScope === "single"}
            onChange={() => setPanneScope("single")}
          />
          Attraction uniquement
        </label>

        <label style={{ display: "flex", gap: 6, cursor: "pointer" }}>
          <input
            type="radio"
            value="group"
            checked={panneScope === "group"}
            onChange={() => setPanneScope("group")}
          />
          Tout le groupe
        </label>
      </div>
    </div>
  );
})()}
      <label style={styles.modalLabel}>
        Description de la panne
      </label>

      <textarea
        value={panneReason}
        onChange={(e) => setPanneReason(e.target.value)}
        rows={4}
        placeholder="Décrire la panne constatée..."
        style={{
          ...styles.pinInput,
          resize: "none",
          textAlign: "left",
          fontFamily: "inherit",
          fontSize: 14,
        }}
        autoFocus
      />

      <div style={styles.hint}>
        Ce message sera enregistré dans l’incident
      </div>

      <div style={styles.modalActions}>
        <button
          style={styles.secondaryBtn}
          onClick={() => {
            setPanneModal(null);
            setPanneReason("");
          }}
        >
          Annuler
        </button>

        <button
          style={{
            ...styles.primaryBtn,
            opacity: panneReason.trim() ? 1 : 0.5,
          }}
          disabled={!panneReason.trim()}
          onClick={async () => {
  await triggerPanneWithIncident({
  key: panneModal.key,
  name: panneModal.name,
  reason: panneReason.trim(),
  scope: panneScope,
});
  setPanneModal(null);
  setPanneReason("");
}}
        >
          Valider
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  editModal: {
    backgroundColor: "white",
    padding: 26,
    borderRadius: 16,
    width: 420,
    boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
  },

  modalLabel: {
    display: "block",
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 10,
    fontSize: 14,
  },

  pinInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    fontSize: 14,
    borderRadius: 10,
    border: "2px solid #235630",
    outline: "none",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },

  primaryBtn: {
    backgroundColor: "#235630",
    color: "white",
    borderRadius: 8,
    padding: "8px 16px",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
  },

  secondaryBtn: {
    backgroundColor: "#e0e0e0",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    fontWeight: "bold",
    cursor: "pointer",
  },
};
