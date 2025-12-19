// src/App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

/* PAGES */
import Login from "./pages/Login";
import Dashboard from "./pages/pages_meca/Dashboard";
import DashboardAquatique from "./pages/pages_aqua/DashboardAquatique";

import GlobalViewMeca from "./pages/pages_meca/GlobalViewMeca";
import GlobalViewAqua from "./pages/pages_aqua/GlobalViewAqua";

import StatutAttractionsControlMeca from "./pages/pc_securité/StatutAttractionsControl_meca";
import StatutAttractionsControlAqua from "./pages/pc_securité/StatutAttractionsControl_aqua";

import AdminInit from "./pages/AdminInit";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* 📅 Date partagée Dashboard ↔ GlobalView */
  const [selectedDateGlobal, setSelectedDateGlobal] = useState(null);

  /* 🔐 Auth listener */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* 📅 Initialisation unique de la date */
  useEffect(() => {
    if (selectedDateGlobal) return;

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
  }, [selectedDateGlobal]);

  /* ⏳ Chargement auth */
  if (loading) return <div>Chargement…</div>;

  /* 🔒 Non connecté */
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <Routes>

        {/* ======================
            DASHBOARDS
           ====================== */}

        {/* ⚙️ Dashboard MÉCANIQUE (par défaut) */}
        <Route
          path="/"
          element={<Dashboard setSelectedDateGlobal={setSelectedDateGlobal} />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard setSelectedDateGlobal={setSelectedDateGlobal} />}
        />

        {/* 💧 Dashboard AQUATIQUE */}
        <Route
          path="/dashboard-aqua"
          element={
            <DashboardAquatique
              setSelectedDateGlobal={setSelectedDateGlobal}
            />
          }
        />

        {/* ======================
            VUES GLOBALES
           ====================== */}

        {/* 🌍 Vue globale MÉCANIQUE */}
        <Route
          path="/global"
          element={
            <GlobalViewMeca
              selectedDate={selectedDateGlobal}
              setSelectedDateGlobal={setSelectedDateGlobal}
            />
          }
        />

        {/* 🌊 Vue globale AQUATIQUE */}
        <Route
          path="/global-aqua"
          element={
            <GlobalViewAqua
              selectedDate={selectedDateGlobal}
              setSelectedDateGlobal={setSelectedDateGlobal}
            />
          }
        />

        {/* ======================
            PC SÉCURITÉ
           ====================== */}

        {/* 🚨 PC Sécurité MÉCANIQUE */}
        <Route
          path="/pc-securite"
          element={<StatutAttractionsControlMeca />}
        />

        {/* 🚨 PC Sécurité AQUATIQUE */}
        <Route
          path="/pc-securite-aqua"
          element={<StatutAttractionsControlAqua />}
        />

        {/* ======================
            ADMIN
           ====================== */}
        <Route path="/adminInit" element={<AdminInit />} />

        {/* 🔁 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
