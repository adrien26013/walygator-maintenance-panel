// src/pages/ChecklistViewer.js
import React from "react";

export default function ChecklistViewer({ checklist, onClose }) {
  if (!checklist) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "white",
          padding: 20,
          borderRadius: 10,
          width: "600px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h2>
          Checklist {checklist.type} — {checklist.attraction}
        </h2>

        <p>Date : {checklist.date}</p>
        <p>Technicien : {checklist.technicienPrenom} {checklist.technicienNom}</p>

        <h3>Points</h3>
        <ul>
          {checklist.items?.map((item, index) => (
            <li key={index}>{item.label} — {item.value ? "OK" : "❌"}</li>
          ))}
        </ul>

        <button onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}
