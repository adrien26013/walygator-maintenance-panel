// src/components/ChecklistList.js
import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Zoom,
} from "@mui/material";

export default function ChecklistList({
  title,
  checklists,
  onDelete, // handleDelete() vient du Dashboard
}) {
  const [open, setOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);

  // 🔥 Ouvre le popup animé
  const handleAskDelete = (c) => {
    setSelectedChecklist(c);
    setOpen(true);
  };

  // 🔥 Confirme la suppression
  const handleConfirmDelete = () => {
    if (onDelete && selectedChecklist) {
      onDelete(selectedChecklist);
    }
    setOpen(false);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3>{title}</h3>

      {checklists.length === 0 && <p>Aucune liste de contrôle</p>}

      {checklists.map((c) => {
        const dateObj = c.timestamp?.toDate
          ? c.timestamp.toDate()
          : new Date(c.timestamp);

        const formattedDate = dateObj.toLocaleDateString("fr-FR");

        const attr = Array.isArray(c.attractions)
          ? c.attractions.join(", ")
          : c.attraction || "—";

        return (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: 8,
              borderBottom: "1px solid #eee",
            }}
          >
            <span>Checklist_{c.type}_{attr}_{formattedDate}</span>

            {/* Voir */}
            {c.pdf_url && (
              <Button
                variant="outlined"
                onClick={() => window.open(c.pdf_url, "_blank")}
              >
                Voir
              </Button>
            )}

            {/* Télécharger */}
            {c.pdf_url && (
              <Button
                variant="outlined"
                onClick={async () => {
                  const response = await fetch(c.pdf_url);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Checklist_${c.type}_${attr}.pdf`;
                  a.click();
                }}
              >
                Télécharger
              </Button>
            )}

            {/* Imprimer */}
            {c.pdf_url && (
              <Button
                variant="outlined"
                onClick={() => {
                  const win = window.open(c.pdf_url, "_blank");
                  win.onload = () => {
                    win.focus();
                    win.print();
                  };
                }}
              >
                Imprimer
              </Button>
            )}

            {/* 🔥 Bouton SUPPRIMER */}
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleAskDelete(c)}
            >
              Supprimer
            </Button>
          </div>
        );
      })}

      {/* **************************************************************** */}
      {/* 🔥 POPUP MATERIAL UI STYLISÉ + ANIMATION + CENTRAGE */}
      {/* **************************************************************** */}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        TransitionComponent={Zoom} // 🔥 Animation Zoom-In très propre
        PaperProps={{
          sx: {
            borderRadius: 3, // 🔥 Bords arrondis
            paddingBottom: 1,
            minWidth: 400,
            backgroundColor: "#ffffff",
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: 22,
            color: "#235630",
          }}
        >
          Confirmation
        </DialogTitle>

        <DialogContent sx={{ textAlign: "center" }}>
          {/* 🔥 TITRE AU CENTRE : journalière – Coccinelle */}
          <h2
            style={{
              marginTop: 0,
              fontSize: 20,
              color: "#000",
            }}
          >
            {selectedChecklist
              ? `${selectedChecklist.type} – ${selectedChecklist.attraction}`
              : ""}
          </h2>

          <DialogContentText sx={{ fontSize: 16, marginTop: 1 }}>
            Voulez-vous vraiment supprimer cette checklist ?
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", paddingBottom: 2 }}>
          <Button
            onClick={() => setOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Annuler
          </Button>

          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
