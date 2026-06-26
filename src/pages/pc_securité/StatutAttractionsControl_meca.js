import React, { useEffect, useState } from "react";
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
  writeBatch,
} from "firebase/firestore";
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

const toDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
};

export default function StatutAttractionsControlMeca() {
  const navigate = useNavigate();

  const [statuses, setStatuses] = useState({});
  const [validatedToday, setValidatedToday] = useState(new Set());
  const [nonSignedToday, setNonSignedToday] = useState(new Set());

  // 🔐 Interventions en cours (locks actifs)
  const [interventionLocks, setInterventionLocks] = useState({}); // attractionKey → {techId, techName}
  const [technicianNames, setTechnicianNames] = useState({}); // technicienId → {prenom, nom}
  const [rapportOuvertModal, setRapportOuvertModal] = useState(null); // { name, techName }

  const [incidentModal, setIncidentModal] = useState(null);
// { key, name, statut }

const [incidentReason, setIncidentReason] = useState("");

// ⏱ Incidents actifs (chrono panne)
const [incidentsActifs, setIncidentsActifs] = useState({});

const [serverTimeOffset, setServerTimeOffset] = useState(0);

// 🔄 Tick minute pour forcer recalcul jour (ANTI FREEZE)
const [dayTick, setDayTick] = useState(0);

useEffect(() => {
  const t = setInterval(() => {
    setDayTick((x) => x + 1);
  }, 60000); // 1 min

  return () => clearInterval(t);
}, []);

// ⏱ tick UI pour chrono (local, fluide)
const [, forceTick] = useState(0);

useEffect(() => {
  const t = setInterval(() => {
    forceTick((x) => x + 1);
  }, 1000);

  return () => clearInterval(t);
}, []);

useEffect(() => {
  const syncServerClock = async () => {
    try {
      const ref = doc(collection(db, "_server_time_sync"));

      await setDoc(ref, {
        now: serverTimestamp(),
      });

      const unsub = onSnapshot(ref, (snap) => {
        const data = snap.data();

        if (!data?.now) return;

        const serverNow =
          data.now.toMillis?.() ??
          toDate(data.now)?.getTime?.();

        if (!serverNow) return;

        const localNow = Date.now();

        const offset = serverNow - localNow;

        console.log("🕒 SERVER OFFSET =", offset, "ms");

        setServerTimeOffset(offset);

        unsub();
      });
    } catch (e) {
      console.error("❌ syncServerClock", e);
    }
  };

  syncServerClock();
}, []);


  /* 🔥 Statuts */
  useEffect(() => {
  return onSnapshot(collection(db, "attractionStatus"), (snap) => {
    const out = {};
    console.group("📥 [PC] SNAPSHOT attractionStatus");

    snap.forEach((d) => {
      const normalized = normalizeAttraction(d.id);
      const data = d.data();

      console.log("• Doc Firestore :", {
        firestoreId: d.id,
        normalizedKey: normalized,
        status: data.status,
        manual: data.manual,
        source: data.source,
        parc: data.parc,
      });

      out[normalized] = data;
    });

    console.log("➡️ Map finale statuses =", out);
    console.groupEnd();

    setStatuses(out);
  });
}, []);

  /* 🔥 Incidents actifs (pannes en cours) */
useEffect(() => {
  const q = query(
    collection(db, "incidents"),
    where("actif", "==", true),
    where("zone", "==", "meca")
  );

  return onSnapshot(q, (snap) => {
    const map = {};

    snap.forEach((d) => {
      const data = d.data();

      // 🔥 sécurité anti vieux incidents
      if (data.actif !== true) return;

      // ✅ utilise UNIQUEMENT le timestamp serveur Firestore
      const startMs =
        data.startTime?.toMillis?.() ??
        toDate(data.startTime)?.getTime?.() ??
        null;

      const key = normalizeAttraction(data.attractionKey);

      // 🔥 garder UNIQUEMENT le plus récent
      if (
        !map[key] ||
        (startMs ?? 0) > (map[key].startMs ?? 0)
      ) {
        map[key] = {
          id: d.id,
          ...data,
          startMs,
        };
      }
    });

    setIncidentsActifs(map);
  });
}, []);

  /* 🔐 Intervention locks — "intervention en cours" */
/* 🔐 Intervention locks — "intervention en cours" */
useEffect(() => {
  const knownKeys = attractionsList.map((a) => normalizeAttraction(a.nom));

  return onSnapshot(
    query(collection(db, "intervention_locks"), where("status", "==", "active")),
    (snap) => {
      const locks = {};

      snap.forEach((d) => {
        const data = d.data();

        let matchedKey = null;

        if (data.attractionKey) {
          matchedKey = normalizeAttraction(data.attractionKey);
        } else {
          matchedKey =
            knownKeys.find((k) => d.id.startsWith(k + "_")) || null;
        }

        if (matchedKey) {
          locks[matchedKey] = {
            techId: data.technicien_id || null,
            techName: data.technicien_nom || null,
            provisional: data.provisional === true,
          };
        }
      });

      setInterventionLocks(locks);
    }
  );
}, []);

/* 👤 Techniciens — noms pour affichage */
useEffect(() => {
  return onSnapshot(collection(db, "technicians"), (snap) => {
    const names = {};
    snap.forEach((d) => {
      const data = d.data();
      if (data.active !== false) {
        names[d.id] = { prenom: data.prenom || "", nom: data.nom || "" };
      }
    });
    setTechnicianNames(names);
  });
}, []);

  /* 🔥 Checklists journalières MÉCA */
  /* 🔥 CHECKLISTS MÉCA — RESET ROBUSTE À MINUIT */
useEffect(() => {
  return onSnapshot(collection(db, "checklists"), (snap) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.group("📋 [PC] CHECKLISTS JOUR");

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

      attractions.forEach((a) => {
        const key = normalizeAttraction(a);

        console.log("• Checklist attraction :", {
          raw: a,
          key,
          signed: d.signed,
        });

        validated.add(key);
        d.signed ? signed.add(key) : nonSigned.add(key);
      });
    });

    signed.forEach((k) => nonSigned.delete(k));

    console.log("✅ validated =", [...validated]);
    console.log("❌ nonSigned =", [...nonSigned]);
    console.groupEnd();

    setValidatedToday(validated);
    setNonSignedToday(nonSigned);
  });
}, [dayTick]);

const todayISO = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

// ⏱ Format durée arrêt attraction (UI fiable)
const formatDuration = (incident) => {
  const startMs =
    incident?.startTime?.toMillis?.() ??
    toDate(incident?.startTime)?.getTime?.() ??
    null;

  if (!startMs) return "00:00:00";

  // ✅ heure corrigée avec offset Firebase
  const correctedNow = Date.now() + serverTimeOffset;

  const diff = Math.max(
    0,
    Math.floor((correctedNow - startMs) / 1000)
  );

  const h = String(Math.floor(diff / 3600)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const s = String(diff % 60).padStart(2, "0");

  return `${h}:${m}:${s}`;
};

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

  /* 🎛 Action PC sécurité */
const updateStatus = async (key, statut) => {
  if (nonSignedToday.has(key)) return;

  await setDoc(
  doc(db, "attractionStatus", key),
  {
    status: statut,
    manual: true,
    manual_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    source: "pc_securite",
    parc: "meca",
  },
  { merge: true }
);

  await closeLocksIfAny(key);

  // 🔥 ON CLÔTURE L’INCIDENT SEULEMENT QUAND ON REMET EN OUVERTE
  if (statut === "ouverte") {
    await closeIncidentIfAny(key);
  }
};

const closeIncidentIfAny = async (key) => {
  const q = query(
    collection(db, "incidents"),
    where("attractionKey", "==", key),
    where("actif", "==", true)
  );

  const snap = await getDocs(q);

  for (const d of snap.docs) {
    await setDoc(
      d.ref,
      {
        actif: false,               // 🔥 FIN OFFICIELLE
        closedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
  }
};

  const triggerPanneWithIncident = async ({ key, name, reason }) => {
  if (nonSignedToday.has(key)) return;

  const sessionId = Date.now().toString();

  // 1️⃣ Clôturer incidents existants
  const q = query(
    collection(db, "incidents"),
    where("attractionKey", "==", key),
    where("actif", "==", true)
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
    const closeBatch = writeBatch(db);

    snap.forEach((d) => {
      closeBatch.update(d.ref, {
        actif: false,
        closedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    });

    await closeBatch.commit();
  }

  // 2️⃣ Créer NOUVEL incident
  await addDoc(collection(db, "incidents"), {
    attraction: name,
    attractionKey: key,
    zone: "meca",
    sessionId,
    startTime: serverTimestamp(),
    typeIncident: "panne",
    raisonPanne: reason,
    raisonPc: reason,
    raison_pc_securite: reason,
    actif: true,
    source: "pc_securite",
    dateJour: todayISO(),
  });

  // 3️⃣ Mettre attraction en panne
  await setDoc(
    doc(db, "attractionStatus", key),
    {
      status: "panne",
      manual: true,
      manual_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      source: "pc_securite",
      parc: "meca",
      raisonPc: reason,
      raison_pc_securite: reason,
    },
    { merge: true }
  );

  await closeLocksIfAny(key);
};

  const handleLogout = async () => await signOut(auth);

  const colors = {
  fermee: "#ffb5b5",
  ouverte: "#b6ffb6",
  panne: "#fff3b0",
  evacuation: "#c3d9ff",

  // 🆕
  checklist_en_cours: "#93c5fd",
};

  const translateStatus = (s) => {
    if (s === "panne") return "En panne";
    if (s === "evacuation") return "Évacuation en cours…";
    if (s === "ouverte") return "Ouverte";
    if (s === "fermee") return "Fermée";
    return s;
  };

  const isCurrent = (current, button) => current === button;

  return (
    <div style={{ padding: 0 }}>
      {/* 🔝 HEADER MÉCANIQUE — IDENTIQUE AQUA */}
      <div
        className="ph-header"
        style={{ width: "100%", backgroundColor: "#235630" }}
      >
        <div className="ph-left" style={{ gap: 8 }}>
          <button
            onClick={() => navigate("/")}
            style={{
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

        <img
          className="ph-logo"
          src="/logo_walygator_maintenance.png"
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
            if (a.comingSoon) return (
              <div key={a.nom} style={{ position: "relative", background: "#d9d9d9", borderRadius: 14, padding: 15, textAlign: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", overflow: "hidden", opacity: 0.8 }}>
                <img src={`/attractions_meca/${a.image}`} alt={a.nom} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 10, filter: "grayscale(60%) brightness(0.8)" }} />
                <div style={{ position: "absolute", top: 73, left: "50%", transform: "translateX(-50%) rotate(45deg)", background: "#cc0000", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", zIndex: 5 }}>
                  <span style={{ transform: "rotate(-45deg)", color: "white", fontWeight: "bold", fontSize: 10, textAlign: "center", lineHeight: 1.3 }}>Prochainement</span>
                </div>
                <p style={{ marginTop: 10, fontWeight: "bold", color: "#555" }}>{a.nom}</p>
              </div>
            );

            const key = normalizeAttraction(a.nom);
const record = statuses[key] || {};
const hasChecklist = validatedToday.has(key);
const isNonSigned = nonSignedToday.has(key);
const incident = incidentsActifs[key];
const lockInfo = interventionLocks[key] || null;

const lockTechId = lockInfo?.techId || null;

const lockTechInfo = lockTechId
  ? technicianNames[lockTechId]
  : null;

const lockTechName =
  lockInfo?.techName ||
  (lockTechInfo
    ? `${lockTechInfo.prenom} ${lockTechInfo.nom}`.trim()
    : "");

const interventionLabel = lockTechName
  ? `Intervention en cours par ${lockTechName}`
  : "Intervention en cours par un technicien...";

let displayStatus = "fermee";
let forcedMessage = null;

// 1️⃣ CHECKLIST EN COURS
if (!hasChecklist && record.status === "checklist_en_cours") {
  displayStatus = "checklist_en_cours";
}

// 2️⃣ CHECKLIST NON SIGNÉE
else if (hasChecklist && isNonSigned) {
  displayStatus = "fermee";
  forcedMessage = "Fermée : checklist non signée";
}

// 3️⃣ STATUT MANUEL (PC OU TECHNICIEN)
else if (record.status) {
  displayStatus = record.status;
}

// 4️⃣ INCIDENT ACTIF SANS STATUT
else if (incident) {
  displayStatus = "panne";
}

// 5️⃣ PAS DE CHECKLIST
else if (!hasChecklist) {
  displayStatus = "fermee";
}

// 6️⃣ CHECKLIST SIGNÉE
else {
  displayStatus = "ouverte";
}


const isWaitingChecklist =
  !hasChecklist &&
  record.status !== "checklist_en_cours";

const disableActions =
  displayStatus === "checklist_en_cours" ||
  isWaitingChecklist ||
  isNonSigned;

            return (
              <div
                key={a.nom}
                style={{
                  padding: 15,
                  borderRadius: 14,
                  background: forcedMessage
  ? "#ffb5b5"
  : displayStatus === "checklist_en_cours"
  ? colors.checklist_en_cours
  : !hasChecklist
  ? "#d9d9d9"
  : colors[displayStatus] || "#d9d9d9",

                  opacity: !hasChecklist ? 0.5 : 1,
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
    : displayStatus === "checklist_en_cours"
    ? "Checklist en cours…"
    : hasChecklist
    ? `Statut : ${translateStatus(displayStatus)}`
    : "En attente de checklist…"}
</p>

{incident && (
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

{lockInfo && (
  <p
    style={{
      textAlign: "center",
      fontWeight: "bold",
      color: "#235630",
      background: "#d4f5e0",
      borderRadius: 6,
      padding: "6px 8px",
      marginTop: 6,
      fontSize: 12,
      lineHeight: 1.4,
    }}
  >
    🔧 {interventionLabel}
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
  onClick={() => {
    if (lockInfo) { setRapportOuvertModal({ key, name: a.nom, techName: lockTechName || null }); return; }
    !disableActions && !isCurrent(displayStatus, "fermee") && updateStatus(key, "fermee");
  }}
  disabled={
    disableActions || isCurrent(displayStatus, "fermee")
  }
  style={{
    background: "#ff4d4d", // 🔥 TA COULEUR ORIGINALE
    padding: "6px 10px",
    color: "white",
    borderRadius: 6,
    border: "none",
    fontWeight: "bold",
    cursor:
      disableActions || isCurrent(displayStatus, "fermee")
        ? "not-allowed"
        : "pointer",
    opacity:
      isCurrent(displayStatus, "fermee") ? 0.4 : 1,
  }}
>
  Fermée
</button>
                  <button
  onClick={() => {
    if (lockInfo) { setRapportOuvertModal({ key, name: a.nom, techName: lockTechName || null }); return; }
    !disableActions && !isCurrent(displayStatus, "ouverte") && updateStatus(key, "ouverte");
  }}
  disabled={
    disableActions || isCurrent(displayStatus, "ouverte")
  }
  style={{
    background: "#34c759",
    padding: "6px 10px",
    color: "white",
    borderRadius: 6,
    border: "none",
    fontWeight: "bold",
    cursor:
      disableActions || isCurrent(displayStatus, "ouverte")
        ? "not-allowed"
        : "pointer",
    opacity:
      isCurrent(displayStatus, "ouverte") ? 0.4 : 1,
  }}
>
  Ouverte
</button>
                  <button
  onClick={() => {
    if (lockInfo) { setRapportOuvertModal({ key, name: a.nom, techName: lockTechName || null }); return; }
    !disableActions && !isCurrent(displayStatus, "panne") && displayStatus !== "fermee" && setIncidentModal({ key, name: a.nom, statut: "panne" });
  }}
  disabled={
    disableActions || isCurrent(displayStatus, "panne") || displayStatus === "fermee"
  }
  style={{
    background: "#f2c94c",
    padding: "6px 10px",
    color: "black",
    borderRadius: 6,
    border: "none",
    fontWeight: "bold",
    cursor:
      disableActions || isCurrent(displayStatus, "panne") || displayStatus === "fermee"
        ? "not-allowed"
        : "pointer",
    opacity:
      isCurrent(displayStatus, "panne") || displayStatus === "fermee" ? 0.4 : 1,
  }}
>
  En panne
</button>

                  <button
  onClick={() => {
    if (lockInfo) { setRapportOuvertModal({ key, name: a.nom, techName: lockTechName || null }); return; }
    !disableActions && !isCurrent(displayStatus, "evacuation") && updateStatus(key, "evacuation");
  }}
  disabled={
    disableActions || isCurrent(displayStatus, "evacuation")
  }
  style={{
    background: "#4c88ff",
    padding: "6px 10px",
    color: "white",
    borderRadius: 6,
    border: "none",
    fontWeight: "bold",
    cursor:
      disableActions || isCurrent(displayStatus, "evacuation")
        ? "not-allowed"
        : "pointer",
    opacity:
      isCurrent(displayStatus, "evacuation") ? 0.4 : 1,
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
      {/* 🔧 MODAL RAPPORT OUVERT */}
{rapportOuvertModal && (
  <div style={styles.overlay}>
    <div style={styles.editModal}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔧</div>
        <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 6 }}>
          {rapportOuvertModal.name}
        </div>
        <div style={{ fontSize: 15, color: "#235630", fontWeight: "bold" }}>
          Rapport d'intervention ouvert
        </div>
      </div>

      <div style={{
        background: "#d4f5e0", border: "2px solid #2f6f3a",
        borderRadius: 10, padding: "14px 18px", textAlign: "center",
        marginBottom: 20,
      }}>
        <p style={{ margin: 0, fontSize: 15, color: "#1a1a1a" }}>
          Intervention en cours par :<br />
          <strong style={{ fontSize: 18 }}>
            {rapportOuvertModal.techName || "Technicien inconnu"}
          </strong>
        </p>
      </div>

      <div style={styles.modalActions}>
        <button
          style={{ ...styles.dangerBtn, flex: 1 }}
          onClick={async () => {
            await updateStatus(rapportOuvertModal.key, "ouverte");
            setRapportOuvertModal(null);
          }}
        >
          Annuler l'intervention
        </button>
        <button style={styles.primaryBtn} onClick={() => setRapportOuvertModal(null)}>
          Fermer
        </button>
      </div>
    </div>
  </div>
)}

      {/* 🔴 MODAL PANNE — UI IDENTIQUE AQUA (SANS GROUPE) */}
{incidentModal && (
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
          {incidentModal.name}
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

      <label style={styles.modalLabel}>
        Description de la panne
      </label>

      <textarea
        value={incidentReason}
        onChange={(e) => setIncidentReason(e.target.value)}
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
            setIncidentModal(null);
            setIncidentReason("");
          }}
        >
          Annuler
        </button>

        <button
          style={{
            ...styles.primaryBtn,
            opacity: incidentReason.trim() ? 1 : 0.5,
          }}
          disabled={!incidentReason.trim()}
          onClick={async () => {
            await triggerPanneWithIncident({
              key: incidentModal.key,
              name: incidentModal.name,
              reason: incidentReason.trim(),
            });

            setIncidentModal(null);
            setIncidentReason("");
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

  dangerBtn: {
    backgroundColor: "#cc0000",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    fontWeight: "bold",
    cursor: "pointer",
  },
};