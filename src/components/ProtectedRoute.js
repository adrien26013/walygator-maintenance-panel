import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userRole = userDoc.data().role;
            console.log("Rôle trouvé :", userRole);
            setRole(userRole);
          } else {
            console.error("ERREUR : Aucun document Firestore pour cet UID");
          }
        } catch (error) {
          console.error("Erreur Firestore :", error);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{textAlign: 'center', marginTop: '20%'}}>Vérification des permissions...</div>;

  // Pas de session active
  if (!user) return <Navigate to="/" replace />;

  // Rôle non autorisé ou introuvable
  if (!role || !allowedRoles.includes(role)) {
  console.warn("⛔ Accès refusé pour :", role);

  if (role === "securite") {
    return <Navigate to="/pc-securite" replace />;
  }

  if (role === "operations" || role === "operation") {
    return <Navigate to="/operations-meca" replace />;
  }

  // admin / directeur / responsable
  return <Navigate to="/dashboard" replace />;
}

  return children;
}