import React from "react";

/* =========================
   🎨 STYLES BOUTONS
   ========================= */

const btnBase = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "2px solid #235630",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 13,
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

export default function ChecklistList({
  title,
  checklists = [],
  onDelete,
}) {

  // 🔧 crazy_bus → Crazy Bus
  const formatAttraction = (name) => {
    if (!name) return "Attraction inconnue";

    return String(name)
      .trim()
      .replace(/_/g, " ")
      .split(" ")
      .filter(Boolean)
      .map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");
  };

  const getAttractionName = (c) => {
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

  return (
    <div style={{ marginTop: 20 }}>
      <h3>{title}</h3>

      {checklists.length === 0 && (
        <p>Aucune liste de contrôle</p>
      )}

      {checklists.map((c) => {
        const attractionRaw = getAttractionName(c);
        const attraction = formatAttraction(attractionRaw);
        const date = formatDate(c.timestamp);

        const label = `Checklist_${c.type}_${attraction}_${date}`;

        return (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderBottom: "1px solid #e0e0e0",
            }}
          >
            <span style={{ flex: 1, fontWeight: 800 }}>
              {label}
            </span>

            {c.pdf_url && (
              <button
                style={btnOutline}
                onClick={() => window.open(c.pdf_url, "_blank")}
              >
                👁 Voir
              </button>
            )}

            {c.pdf_url && (
              <button
                style={btnPrimary}
                onClick={async () => {
                  const response = await fetch(c.pdf_url);
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);

                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${label}.pdf`;
                  a.click();

                  URL.revokeObjectURL(url);
                }}
              >
                ⬇ Télécharger
              </button>
            )}

            {c.pdf_url && (
              <button
                style={btnOutline}
                onClick={() => {
                  const win = window.open(c.pdf_url, "_blank");
                  win.onload = () => win.print();
                }}
              >
                🖨 Imprimer
              </button>
            )}

            <button
              style={btnDanger}
              onClick={() => onDelete?.(c)}
            >
              🗑 Supprimer
            </button>
          </div>
        );
      })}
    </div>
  );
}
