// src/App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import GlobalView from "./pages/GlobalView";
import StatutAttractions from "./pages/StatutAttractions";
import AdminInit from "./pages/AdminInit";

function App() {
  const [user, setUser] = useState(undefined);

  // Date partagée Dashboard ↔ GlobalView
  const [selectedDateGlobal, setSelectedDateGlobal] = useState(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // 🔥 Correctif MAJEUR : initialisation de la date du jour
  useEffect(() => {
    if (!selectedDateGlobal) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      setSelectedDateGlobal({
        raw: now,
        label: now.toLocaleDateString("fr-FR"),
        label_complet: now.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
      });
    }
  }, [selectedDateGlobal]); // ← Correction essentielle

  if (user === undefined) return <div>Chargement…</div>;
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <Routes>

        {/* Dashboard */}
        <Route
          path="/"
          element={<Dashboard setSelectedDateGlobal={setSelectedDateGlobal} />}
        />

        {/* Vue globale */}
        <Route
          path="/global"
          element={
            <GlobalView
              selectedDate={selectedDateGlobal}
              setSelectedDateGlobal={setSelectedDateGlobal}
            />
          }
        />

        {/* PC Sécurité */}
        <Route path="/pc-securite" element={<StatutAttractions />} />

        {/* Admin */}
        <Route path="/adminInit" element={<AdminInit />} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
