// src/pages/Login.js
import React, { useState } from "react";
import { auth } from "../firebase";
import { 
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
} from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
const [resetEmail, setResetEmail] = useState("");
const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  const login = async () => {
  try {

    // 🔐 Choix de la persistance
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    await signInWithEmailAndPassword(auth, email, password);

  } catch (e) {
    alert("Erreur : " + e.message);
  }
};

const handleResetPassword = async () => {
  if (!resetEmail) return;

  try {
    await sendPasswordResetEmail(auth, resetEmail, {
  url: "http://localhost:3000/reset-password",
  handleCodeInApp: true,
});

    setShowResetModal(false);
    setShowConfirmPopup(true);

  } catch (error) {
    setShowResetModal(false);
    setShowConfirmPopup(true);
  }
};

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const modalStyle = {
  background: "white",
  padding: 30,
  borderRadius: 12,
  width: 350,
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
};

const inputStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 15,
  borderRadius: 6,
  border: "1px solid #ccc",
};

const buttonStyle = {
  backgroundColor: "#235630",
  color: "white",
  padding: 10,
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  width: "100%",
  fontWeight: "bold",
};

const cancelStyle = {
  marginTop: 10,
  background: "transparent",
  border: "none",
  color: "#777",
  cursor: "pointer",
};

  return (
    <div
  style={{
    width: "100vw",
    height: "100vh",
    backgroundImage: "url('/acceuil/acceuil.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    gap: 30,
    fontFamily: "Segoe UI, sans-serif",
  }}
>
      
      {/* FORMULAIRE */}
      <div
        style={{
          background: "white",
          padding: "30px 40px",
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          width: 300,
          display: "flex",
          flexDirection: "column",
          gap: 15,
        }}
      >
        <h2 style={{ textAlign: "center", margin: 0, color: "#235630" }}>
          Connexion au panel
        </h2>

        <input
          placeholder="Email"
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />

        <input
          placeholder="Mot de passe"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <input
    type="checkbox"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
  />
  Se souvenir de moi
</label>

        <button
          onClick={login}
          style={{
            backgroundColor: "#235630",
            color: "white",
            padding: 10,
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          Connexion
        </button>
        <span
  onClick={() => setShowResetModal(true)}
  style={{
    fontSize: 13,
    color: "#235630",
    cursor: "pointer",
    textAlign: "right"
  }}
>
  Mot de passe oublié ?
</span>
      </div>
      {showResetModal && (
  <div style={overlayStyle}>
    <div style={modalStyle}>
      <h3 style={{ color: "#235630", marginTop: 0 }}>
        Réinitialisation
      </h3>

      <input
        placeholder="Entrez votre email"
        type="email"
        value={resetEmail}
        onChange={(e) => setResetEmail(e.target.value)}
        style={inputStyle}
      />

      <button onClick={handleResetPassword} style={buttonStyle}>
        Envoyer le lien
      </button>

      <button
        onClick={() => setShowResetModal(false)}
        style={cancelStyle}
      >
        Annuler
      </button>
    </div>
  </div>
)}
{showConfirmPopup && (
  <div style={overlayStyle}>
    <div style={modalStyle}>
      <h3 style={{ color: "#235630", marginTop: 0 }}>
        📧 Réinitialisation envoyée
      </h3>

      <p style={{ fontSize: 14, marginBottom: 20 }}>
        Si votre mail appartient à un compte,
        veuillez vérifier vos spams ou votre boîte mail.
        Nous vous avons envoyé un lien de réinitialisation
        de mot de passe.
      </p>

      <button
        onClick={() => setShowConfirmPopup(false)}
        style={buttonStyle}
      >
        OK
      </button>
    </div>
  </div>
)}
    </div>
  );
}
