// src/App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import GlobalView from "./pages/GlobalView";

function App() {
  const [user, setUser] = useState(undefined);

  // date partagée entre Dashboard et GlobalView
  const [selectedDateGlobal, setSelectedDateGlobal] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  if (user === undefined) return <div>Chargement...</div>;
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <Routes>
        {/* PANEL / DASHBOARD */}
        <Route
          path="/"
          element={<Dashboard setSelectedDateGlobal={setSelectedDateGlobal} />}
        />

        {/* VUE GLOBALE ATELIER */}
        <Route
          path="/global"
          element={
            <GlobalView
              selectedDate={selectedDateGlobal}
              setSelectedDateGlobal={setSelectedDateGlobal}
            />
          }
        />

        {/* URL inconnue → retour panel */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
