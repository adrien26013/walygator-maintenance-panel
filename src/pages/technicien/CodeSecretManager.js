import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

//async function migrateTechnicians() {
  //const snap = await getDocs(collection(db, "technicians"));

  //let updated = 0;

  //for (const d of snap.docs) {
    //const data = d.data();

    //if (!data.prenom_norm || !data.nom_norm) {
      //await updateDoc(doc(db, "technicians", d.id), {
        //prenom_norm: data.prenom.trim().toLowerCase(),
        //nom_norm: data.nom.trim().toLowerCase(),
      //});
      //updated++;
    //}
  //}

  //alert(`Migration terminée : ${updated} technicien(s) mis à jour`);
//}

export default function CodeSecretManager() {
  const navigate = useNavigate();

  /* -------------------- STATES -------------------- */
  const [techniciens, setTechniciens] = useState([]);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");

  const [visibleCode, setVisibleCode] = useState(null);
  const [editTech, setEditTech] = useState(null);
  const [editCode, setEditCode] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRegen, setConfirmRegen] = useState(null);

  /* -------------------- UTILS -------------------- */
  const generateCode = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  /* -------------------- FIRESTORE -------------------- */
  useEffect(() => {
    return onSnapshot(collection(db, "technicians"), (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setTechniciens(arr);
    });
  }, []);

  /* -------------------- AUTO HIDE CODE -------------------- */
  useEffect(() => {
    if (!visibleCode) return;
    const t = setTimeout(() => setVisibleCode(null), 20000);
    return () => clearTimeout(t);
  }, [visibleCode]);

  //useEffect(() => {
  //migrateTechnicians();
  //}, 
  //[]);

  /* -------------------- ACTIONS -------------------- */
  const handleAdd = async () => {
    if (!prenom || !nom) return;

    const code = generateCode();

    await addDoc(collection(db, "technicians"), {
  prenom,
  nom,
  prenom_norm: prenom.trim().toLowerCase(),
  nom_norm: nom.trim().toLowerCase(),
  codeSecret: code,
  active: true,
  createdAt: serverTimestamp(),
});

    setVisibleCode(code);
    setPrenom("");
    setNom("");
  };

  const handleViewCode = (tech) => {
    setVisibleCode(tech.codeSecret);
  };

  const handleSaveEdit = async () => {
    if (!/^\d{6}$/.test(editCode)) return;

    await updateDoc(doc(db, "technicians", editTech.id), {
      codeSecret: editCode,
    });

    setVisibleCode(editCode);
    setEditTech(null);
    setEditCode("");
  };

  const handleRegenerate = async (tech) => {
    const code = generateCode();
    await updateDoc(doc(db, "technicians", tech.id), {
      codeSecret: code,
    });
    setVisibleCode(code);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "technicians", id));
  };

  /* -------------------- UI -------------------- */
  return (
    <div>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={{ position: "absolute", left: 20 }}>
          <button style={styles.backBtn} onClick={() => navigate("/dashboard")}>
            ← Retour
          </button>
        </div>
        <img
          src="/logo_walygator_maintenance.png"
          alt="logo"
          style={{ height: 60 }}
        />
      </div>

      {/* CONTENT */}
      <div style={styles.container}>
        <h2 style={{ textAlign: "center" }}>Gestion des codes secrets des techniciens</h2>

        {/* CODE DISPLAY */}
        {visibleCode && (
          <div style={styles.codeBox}>
            Code secret&nbsp;:
            <span style={styles.codeValue}>{visibleCode}</span>
          </div>
        )}

        {/* ADD TECH */}
        <div style={styles.card}>
          <h3>➕ Nouveau technicien</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              placeholder="Prénom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              style={styles.input}
            />
            <input
              placeholder="Nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              style={styles.input}
            />
            <button style={styles.primaryBtn} onClick={handleAdd}>
              Ajouter
            </button>
          </div>
        </div>

        {/* LIST */}
        {techniciens.map((t) => (
          <div key={t.id} style={styles.techCard}>
            <div>
              <div style={styles.techName}>
                {t.prenom} {t.nom}
              </div>
              <div style={styles.techStatus}>Technicien actif</div>
            </div>

            <div style={styles.actions}>
              <button
                style={{ ...styles.btn, ...styles.view }}
                onClick={() => handleViewCode(t)}
              >
                👁 Voir
              </button>
              <button
                style={{ ...styles.btn, ...styles.edit }}
                onClick={() => {
                  setEditTech(t);
                  setEditCode(t.codeSecret);
                }}
              >
                ✏️ Modifier
              </button>
              <button
                style={{ ...styles.btn, ...styles.regen }}
                onClick={() => setConfirmRegen(t)}
              >
                🔁 Régénérer
              </button>
              <button
                style={{ ...styles.btn, ...styles.delete }}
                onClick={() => setConfirmDelete(t)}
              >
                🗑 Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {editTech && (
  <div style={styles.overlay}>
    <div style={styles.editModal}>
      <h3 style={{ marginTop: 0 }}>Modifier le code secret</h3>

      <label style={styles.modalLabel}>
        Nouveau code (6 chiffres)
      </label>

      <input
        value={editCode}
        onChange={(e) =>
          setEditCode(e.target.value.replace(/\D/g, ""))
        }
        maxLength={6}
        autoFocus
        style={styles.pinInput}
      />

      <div style={styles.hint}>
        Le code doit contenir exactement 6 chiffres
      </div>

      <div style={styles.modalActions}>
        <button
          style={styles.secondaryBtn}
          onClick={() => setEditTech(null)}
        >
          Annuler
        </button>

        <button
          style={{
            ...styles.primaryBtn,
            opacity: /^\d{6}$/.test(editCode) ? 1 : 0.5,
          }}
          disabled={!/^\d{6}$/.test(editCode)}
          onClick={handleSaveEdit}
        >
          Enregistrer
        </button>
      </div>
    </div>
  </div>
)}

      {/* CONFIRM REGEN */}
      {confirmRegen && (
        <ConfirmModal
          title="Régénérer le code"
          text={`Générer un nouveau code pour ${confirmRegen.prenom} ${confirmRegen.nom} ?`}
          onCancel={() => setConfirmRegen(null)}
          onConfirm={() => {
            handleRegenerate(confirmRegen);
            setConfirmRegen(null);
          }}
          confirmLabel="Régénérer"
        />
      )}

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <ConfirmModal
          danger
          title="Supprimer le technicien"
          text={`Supprimer définitivement ${confirmDelete.prenom} ${confirmDelete.nom} ?`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            handleDelete(confirmDelete.id);
            setConfirmDelete(null);
          }}
          confirmLabel="Supprimer"
        />
      )}
    </div>
  );
}

/* -------------------- CONFIRM MODAL -------------------- */
function ConfirmModal({
  title,
  text,
  onCancel,
  onConfirm,
  confirmLabel,
  danger,
}) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>{title}</h3>
        <p>{text}</p>
        <div style={styles.modalActions}>
          <button style={styles.btn} onClick={onCancel}>
            Annuler
          </button>
          <button
            style={danger ? styles.dangerBtn : styles.primaryBtn}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- STYLES -------------------- */
const styles = {
  header: {
    height: 95,
    backgroundColor: "#235630",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  backBtn: {
    backgroundColor: "#2f6f3a",
    border: "3px solid #f5c400",
    padding: "8px 14px",
    borderRadius: 10,
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  container: {
    padding: 30,
    maxWidth: 900,
    margin: "auto",
  },

  /* -------- Code affiché -------- */
  codeBox: {
    backgroundColor: "#235630",
    color: "white",
    border: "3px solid #f5c400",
    borderRadius: 14,
    padding: 18,
    marginBottom: 25,
    textAlign: "center",
    fontSize: 18,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  codeValue: {
    letterSpacing: 6,
    fontWeight: "bold",
    fontSize: 22,
  },

  /* -------- Cards -------- */
  card: {
    backgroundColor: "#f5f5f5",
    padding: 20,
    borderRadius: 14,
    border: "2px solid #235630",
    marginBottom: 30,
  },

  techCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    border: "2px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  techName: {
    fontSize: 18,
    fontWeight: "bold",
  },

  techStatus: {
    fontSize: 13,
    color: "#666",
  },

  actions: {
    display: "flex",
    gap: 8,
  },

  /* -------- Inputs -------- */
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
  },

  codeInput: {
    width: "100%",
    padding: 14,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
    borderRadius: 10,
    border: "2px solid #235630",
  },

  /* -------- Boutons -------- */
  btn: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 13,
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
    backgroundColor: "#d32f2f",
    color: "white",
    borderRadius: 8,
    padding: "8px 16px",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
  },

  view: {
    backgroundColor: "#e0e0e0",
  },

  edit: {
    backgroundColor: "#ffd54f",
  },

  regen: {
    backgroundColor: "#42a5f5",
    color: "white",
  },

  delete: {
    backgroundColor: "#d32f2f",
    color: "white",
  },

  /* -------- Overlay & Modals -------- */
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

  modal: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 14,
    width: 360,
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },

  editModal: {
    backgroundColor: "white",
    padding: 26,
    borderRadius: 16,
    width: 380,
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
  boxSizing: "border-box", // ⭐ FIX IMPORTANT
  padding: "14px 16px",
  fontSize: 22,
  fontFamily: "monospace",
  textAlign: "center",
  borderRadius: 10,
  border: "2px solid #235630",
  outline: "none",
},

  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
};
