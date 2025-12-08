// src/pages/Login.js
import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      alert("Erreur : " + e.message);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#235630",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 30,
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      {/* LOGO */}
      <img
        src="/logo_walygator_maintenance.png"
        alt="Walygator Maintenance"
        style={{ height: 120 }}
      />

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
      </div>
    </div>
  );
}
