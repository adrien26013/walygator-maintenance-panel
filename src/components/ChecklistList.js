import React, { useState } from "react";

/* =========================
   🎨 STYLES
   ========================= */

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const modalStyle = {
  backgroundColor: "white",
  borderRadius: 14,
  padding: 24,
  width: 420,
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  fontFamily: "inherit",
};

const modalTitle = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 10,
  color: "#235630",
};

const modalText = {
  fontSize: 14,
  marginBottom: 20,
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const btnBase = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "2px solid #235630",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 14,
};

const btnPrimary = {
  ...btnBase,
  backgroundColor: "#2f6f3a",
  color: "white",
};

const btnOutline = {
  ...btnBase,
  backgroundColor: "white",
  color: "#235630",
};

const btnDanger = {
  ...btnBase,
  backgroundColor: "#d9534f",
  borderColor: "#b52b27",
  color: "white",
};

/* =========================
   🧾 COMPONENT
   ========================= */

export default function ChecklistList({
  title,
  checklists = [],
  onDelete,
}) {
  const [toDelete, setToDelete] = useState(null);

  /* =========================
     🔧 HELPERS
     ========================= */

  const formatAttraction = (name) => {
    if (!name) return "Attraction inconnue";
    return String(name)
      .trim()
      .replace(/_/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getAttractionName = (c) => {
  // ✅ PRIORITÉ AU GROUPE (nouvelle logique Aqua)
  if (typeof c.groupe === "string" && c.groupe.trim() !== "") {
    return c.groupe;
  }

  // 🔁 fallback ancien système
  if (Array.isArray(c.attractions) && c.attractions.length > 0) {
    return c.attractions[0];
  }

  if (typeof c.attraction === "string" && c.attraction.trim() !== "") {
    return c.attraction;
  }

  return null;
};


  const formatDate = (timestamp) => {
    const dateObj = timestamp?.toDate
      ? timestamp.toDate()
      : new Date(timestamp);
    return dateObj.toLocaleDateString("fr-FR");
  };

  /* =========================
     🧩 RENDER
     ========================= */

  return (
    <div style={{ marginTop: 20 }}>
      <h3>{title}</h3>

      {checklists.length === 0 && <p>Aucune liste de contrôle</p>}

      {checklists.map((c) => {
        const attraction = formatAttraction(getAttractionName(c));
        const date = formatDate(c.timestamp);
        const baseLabel = `Checklist_${c.type}_${attraction}_${date}`;

const label = c.signed === false
  ? `NON SIGNEE_${baseLabel}`
  : baseLabel;

        return (
          <div key={c.id} className="cl-item">
            <span className="cl-label">{label}</span>

            <div className="cl-actions">
              {/* 👁 VOIR */}
              {c.pdf_url && (
                <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                  <button style={btnOutline}>👁 Voir</button>
                </a>
              )}

              {/* ⬇ TÉLÉCHARGER */}
              {c.pdf_url && (
                <a href={c.pdf_url} download={`${label}.pdf`}>
                  <button style={btnPrimary}>⬇ Télécharger</button>
                </a>
              )}

              {/* 🖨 IMPRIMER */}
              {c.pdf_url && (
                <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                  <button style={btnOutline}>🖨 Imprimer</button>
                </a>
              )}

              {/* 🗑 SUPPRIMER */}
              <button
                style={btnDanger}
                onClick={() => setToDelete({ checklist: c, label })}
              >
                🗑 Supprimer
              </button>
            </div>
          </div>
        );
      })}

      {/* =========================
          🟥 MODAL CONFIRMATION
          ========================= */}

      {toDelete && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalTitle}>Suppression définitive</div>

            <div style={modalText}>
              Êtes-vous sûr de vouloir supprimer cette checklist ?
              <br />
              <strong>{toDelete.label}</strong>
            </div>

            <div style={modalActions}>
              <button
                style={btnOutline}
                onClick={() => setToDelete(null)}
              >
                Annuler
              </button>

              <button
                style={btnDanger}
                onClick={() => {
                  onDelete?.(toDelete.checklist);
                  setToDelete(null);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
