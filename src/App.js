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
import CodeSecretManager from "./pages/technicien/CodeSecretManager";
import ResetPassword from "./pages/ResetPassword";
import CreatePassword from "./pages/create-password";
import AdminInit from "./pages/AdminInit";
import ProtectedRoute from "./components/ProtectedRoute";
import OperationsMeca from "./pages/operations/OperationMeca";
import OperationsAqua from "./pages/operations/OperationAqua";
import ObservationsTechnicien from "./pages/observations/ObservationsTechnicien";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateGlobal, setSelectedDateGlobal] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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

  if (loading) return <div>Chargement…</div>;

  return (
  <BrowserRouter>
    <Routes>
      {/* ================= ROUTES PUBLIQUES ================= */}
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/create-password" element={<CreatePassword />} />

      {!user && <Route path="*" element={<Login />} />}

      {/* ================= ROUTES PRIVÉES PROTÉGÉES ================= */}
      {user && (
        <>
          {/* ACCÈS DIRECTION / ADMIN / RESPONSABLE TECHNIQUE */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={["directeur", "admin", "responsabletechnique"]}>
              <Dashboard setSelectedDateGlobal={setSelectedDateGlobal} />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={["directeur", "admin", "responsabletechnique"]}>
              <Dashboard setSelectedDateGlobal={setSelectedDateGlobal} />
            </ProtectedRoute>
          } />
          <Route path="/dashboard-aqua" element={
            <ProtectedRoute allowedRoles={["directeur", "admin", "responsabletechnique"]}>
              <DashboardAquatique setSelectedDateGlobal={setSelectedDateGlobal} />
            </ProtectedRoute>
          } />

          {/* 🔐 CODES SECRETS : Admin et Responsable Technique uniquement (Pas le Directeur) */}
          <Route path="/codes-secrets" element={
            <ProtectedRoute allowedRoles={["admin", "responsabletechnique"]}>
              <CodeSecretManager />
            </ProtectedRoute>
          } />

          {/* ACCÈS PC SÉCURITÉ */}
          <Route path="/pc-securite" element={
            <ProtectedRoute allowedRoles={["directeur", "admin", "securite", "responsabletechnique"]}>
              <StatutAttractionsControlMeca />
            </ProtectedRoute>
          } />
          <Route path="/pc-securite-aqua" element={
            <ProtectedRoute allowedRoles={["directeur", "admin", "securite", "responsabletechnique"]}>
              <StatutAttractionsControlAqua />
            </ProtectedRoute>
          } />

          {/* ACCÈS GLOBAL */}
          <Route path="/global" element={
  <ProtectedRoute allowedRoles={["directeur", "admin", "securite", "responsabletechnique"]}>
    <GlobalViewMeca selectedDate={selectedDateGlobal} setSelectedDateGlobal={setSelectedDateGlobal} />
  </ProtectedRoute>
} />

<Route path="/global-aqua" element={
  <ProtectedRoute allowedRoles={["directeur", "admin", "securite", "responsabletechnique"]}>
    <GlobalViewAqua selectedDate={selectedDateGlobal} setSelectedDateGlobal={setSelectedDateGlobal} />
  </ProtectedRoute>
} />

          <Route
  path="/operations-meca"
  element={
    <ProtectedRoute allowedRoles={["operations", "operation", "directeur", "admin", "responsabletechnique"]}>
      <OperationsMeca selectedDate={selectedDateGlobal} />
    </ProtectedRoute>
  }
/>

<Route
  path="/operations-aqua"
  element={
    <ProtectedRoute allowedRoles={["operations", "operation", "directeur", "admin", "responsabletechnique"]}>
      <OperationsAqua selectedDate={selectedDateGlobal} />
    </ProtectedRoute>
  }
/>

          {/* OBSERVATIONS TECHNICIENS */}
          <Route path="/observations" element={
            <ProtectedRoute allowedRoles={["directeur", "admin", "responsabletechnique"]}>
              <ObservationsTechnicien />
            </ProtectedRoute>
          } />

          {/* 🔐 INITIALISATION ADMIN */}
          <Route path="/adminInit" element={
            <ProtectedRoute allowedRoles={["admin", "responsabletechnique"]}>
              <AdminInit />
            </ProtectedRoute>
          } />
          
          <Route
  path="*"
  element={
    <ProtectedRoute allowedRoles={["directeur", "admin", "securite", "operations", "operation", "responsabletechnique"]}>
      <RoleRedirect />
    </ProtectedRoute>
  }
/>
        </>
      )}
    </Routes>
  </BrowserRouter>
);

function RoleRedirect() {
  const role = localStorage.getItem("role");

  console.log("🔁 Redirect role:", role);

  if (role === "operations" || role === "operation") {
    return <Navigate to="/operations-meca" replace />;
  }

  if (role === "securite") {
    return <Navigate to="/pc-securite" replace />;
  }

  if (role === "admin" || role === "directeur" || role === "responsabletechnique") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
}
}

export default App;
