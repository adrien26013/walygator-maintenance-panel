import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "../../components/Calendar";
import ChecklistList from "../../components/ChecklistList";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
  Timestamp
} from "firebase/firestore";

import { signOut } from "firebase/auth";
import MobileNavDrawer from "../../components/MobileNavDrawer";

export default function Dashboard({ setSelectedDateGlobal }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedAttrMaintenance, setSelectedAttrMaintenance] = useState("");
  const [selectedTypeMaintenance, setSelectedTypeMaintenance] = useState("hebdomadaire");
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [attractionsList, setAttractionsList] = useState([]);
  // --- ÉTAT POUR LES NOTIFICATIONS ---
  const [notification, setNotification] = useState({ show: false, msg: "", type: "success" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
const [itemToDelete, setItemToDelete] = useState(null);
const [showEditModal, setShowEditModal] = useState(false);
const [itemToEdit, setItemToEdit] = useState(null);
const [newEditDate, setNewEditDate] = useState("");
const [showPlanifModal, setShowPlanifModal] = useState(false);

  const showPopup = (msg, type = "success") => {
    setNotification({ show: true, msg, type });
    setTimeout(() => setNotification({ show: false, msg: "", type: "success" }), 3000);
  };

  const [lists, setLists] = useState({
    journaliere: [],
    hebdomadaire: [],
    mensuelle: [],
    trimestrielle: [],
  });

  const lastDayRef = useRef(null);

  useEffect(() => {
    const attractionsMeca = [
      { id: "aquachutes", nom: "Aquachutes", types: ["journaliere", "mensuelle"] },
      { id: "bateau_pirates", nom: "Bateau Pirates", types: ["journaliere", "mensuelle"] },
      { id: "boomerang", nom: "Boomerang", types: ["journaliere", "hebdomadaire", "mensuelle", "trimestrielle"] },
      { id: "bubbles_up", nom: "Bubbles Up", types: ["journaliere", "hebdomadaire", "mensuelle"] },
      { id: "chaises_volantes", nom: "Chaises Volantes", types: ["journaliere", "mensuelle"] },
      { id: "coccinelle", nom: "Coccinelle", types: ["journaliere", "hebdomadaire", "mensuelle"] },
      { id: "crazy_bus", nom: "Crazy Bus", types: ["journaliere", "hebdomadaire", "mensuelle"] },
      { id: "dark_tower", nom: "Dark Tower", types: ["journaliere", "hebdomadaire"] },
      { id: "drakkar", nom: "Drakkar", types: ["journaliere", "mensuelle"] },
      { id: "express_tour", nom: "Express Tour", types: ["journaliere", "hebdomadaire", "mensuelle"] },
      { id: "galopant", nom: "Galopant", types: ["journaliere", "mensuelle"] },
      { id: "ile_aux_pirates", nom: "Ile aux Pirates", types: ["journaliere"] },
      { id: "melody_road", nom: "Melody Road", types: ["journaliere", "hebdomadaire", "mensuelle"] },
      { id: "midgard", nom: "Midgard", types: ["journaliere", "hebdomadaire", "mensuelle"] },
      { id: "mine_de_thor", nom: "Mine de Thor", types: ["journaliere", "hebdomadaire", "mensuelle"] },
      { id: "mission_apollo", nom: "Mission Apollo", types: ["journaliere", "mensuelle"] },
      { id: "radja_river", nom: "Radja River", types: ["journaliere"] },
      { id: "splash_battle", nom: "Splash Battle", types: ["journaliere", "hebdomadaire", "mensuelle"] },
      { id: "tapis_magique", nom: "Tapis Magique", types: ["journaliere"] },
      { id: "tchou_tchou_aventure", nom: "Tchou Tchou Aventure", types: ["journaliere", "mensuelle"] },
      { id: "tea_cup", nom: "Tea Cup", types: ["journaliere", "hebdomadaire", "mensuelle"] }
    ];

    // 🔍 ON FILTRE : on ne garde que celles qui ont PLUS que juste "journaliere"
    const filteredList = attractionsMeca.filter(attr => 
      attr.types.some(t => t !== "journaliere")
    );

    setAttractionsList(filteredList);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (!selectedDate) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate.raw.getTime() === (lastDayRef.current?.getTime() ?? selectedDate.raw.getTime())) {
        if (today.getTime() !== selectedDate.raw.getTime()) {
          const obj = {
            raw: today,
            label: today.toLocaleDateString("fr-FR"),
            label_complet: today.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
          };
          setSelectedDate(obj);
          setSelectedDateGlobal?.(obj);
          lastDayRef.current = today;
        }
      }
    }, 60000);

    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const [schedules, setSchedules] = useState([]);

useEffect(() => {
  const q = collection(db, "maintenance_schedule");
  return onSnapshot(q, (snapshot) => {
    const docs = [];
    snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
    setSchedules(docs);
  });
}, []);

// --- SUPPRESSION ---
const confirmDelete = (id) => { 
  setItemToDelete(id); 
  setShowDeleteModal(true); 
};

const handleDeleteSchedule = async () => {
  if (!itemToDelete) return; // Sécurité pour éviter l'erreur "null"

  try {
    await deleteDoc(doc(db, "maintenance_schedule", itemToDelete));
    setShowDeleteModal(false);
    setItemToDelete(null); // On remet à zéro
    showPopup("Échéance supprimée !");
  } catch (error) {
    console.error("Erreur suppression:", error);
    showPopup("Erreur lors de la suppression", "error");
  }
};

// --- MODIFICATION VIA POPUP ---
const openEditModal = (s) => {
  setItemToEdit(s);
  if (s.prochaineDate) {
    const d = s.prochaineDate.toDate();
    setNewEditDate(d.toISOString().split('T')[0]);
  }
  setShowEditModal(true);
};

const handleUpdateDate = async () => {
  try {
    await updateDoc(doc(db, "maintenance_schedule", itemToEdit.id), {
      prochaineDate: Timestamp.fromDate(new Date(newEditDate)),
      lastUpdated: Timestamp.now()
    });
    setShowEditModal(false);
    showPopup("Date mise à jour !");
  } catch (e) {
    showPopup("Erreur de mise à jour", "error");
  }
};

// --- SAUVEGARDE VIA FORMULAIRE ---
const handleSaveMaintenance = async () => {
  if (!selectedAttrMaintenance || !selectedTypeMaintenance || !maintenanceDate) {
    showPopup("Veuillez remplir tous les champs", "error");
    return;
  }

  // 1. Création d'un ID unique incluant la date pour permettre d'autres checklists à des dates différentes
  // Format : Boomerang_hebdomadaire_2026-03-31
  const docId = `${selectedAttrMaintenance.replace(/\s+/g, '_')}_${selectedTypeMaintenance}_${maintenanceDate}`;

  // 2. Vérification si CETTE checklist précise existe déjà (Doublon)
  const existingDoc = schedules.find(s => 
    s.attraction === selectedAttrMaintenance && 
    s.type === selectedTypeMaintenance && 
    s.prochaineDate?.toDate().toISOString().split('T')[0] === maintenanceDate
  );

  if (existingDoc) {
    showPopup("Vous ne pouvez pas créer deux checklists sur une même date pour cette attraction", "error");
    return; // On arrête tout ici
  }

  try {
    // 3. Enregistrement de la nouvelle checklist
    await setDoc(doc(db, "maintenance_schedule", docId), {
      attraction: selectedAttrMaintenance,
      type: selectedTypeMaintenance,
      prochaineDate: Timestamp.fromDate(new Date(maintenanceDate)),
      lastUpdated: Timestamp.now()
    });

    setMaintenanceDate("");
    showPopup("Échéance enregistrée !");
  } catch (error) {
    console.error("Erreur lors de l'enregistrement:", error);
    showPopup("Erreur lors de l'enregistrement", "error");
  }
};

  const formatDisplayed = (d) =>
    d.raw.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  /* 📅 Date du jour par défaut */
  useEffect(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const obj = {
    raw: now,
    label: now.toLocaleDateString("fr-FR"),
    label_complet: formatDisplayed({ raw: now }),
  };

  lastDayRef.current = now;

  setSelectedDate(obj);
  setSelectedDateGlobal?.(obj);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  /* 📅 Sélection calendrier */
  const handleDateSelect = (obj) => {
  const full = {
    ...obj,
    label_complet: formatDisplayed(obj),
  };

  lastDayRef.current = full.raw;

  setSelectedDate(full);
  setSelectedDateGlobal?.(full);
};

  /* 🔥 ÉCOUTE FIRESTORE — AFFICHAGE (INCHANGÉ) */
  useEffect(() => {
    if (!selectedDate) return;

    const start = new Date(selectedDate.raw);
    start.setHours(0, 0, 0, 0);

    const end = new Date(selectedDate.raw);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "checklists"),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end)
    );

    return onSnapshot(q, (snap) => {
      const journ = [];
      const hebdo = [];
      const mens = [];
      const trimes = [];

      snap.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };
        if (data.parc !== "meca") return;

        if (data.type === "journaliere") journ.push(data);
        if (data.type === "hebdomadaire") hebdo.push(data);
        if (data.type === "mensuelle") mens.push(data);
        if (data.type === "trimestrielle") trimes.push(data);
      });

      setLists({
        journaliere: journ,
        hebdomadaire: hebdo,
        mensuelle: mens,
        trimestrielle: trimes,
      });
    });
  }, [selectedDate]);

  /* 🗑️ Suppression */
  const handleDeleteChecklist = async (checklist) => {
    if (!checklist?.id) return;
    await deleteDoc(doc(db, "checklists", checklist.id));
  };

  const handleLogout = async () => await signOut(auth);

  /* ⬇️ EXPORT ZIP — PDF EXISTANTS UNIQUEMENT */
  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const url =
        "https://downloadchecklistszip-siuqyxtfpq-ew.a.run.app" +
        `?dateFrom=${dateFrom}&dateTo=${dateTo}&parc=meca`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `checklists_du_${dateFrom}_au_${dateTo}.zip`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Erreur ZIP:", e);
      alert("Erreur lors du téléchargement du ZIP");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {mobileMenuOpen && (
        <MobileNavDrawer
          onClose={() => setMobileMenuOpen(false)}
          items={[
            { label: "Codes secrets", onClick: () => navigate("/codes-secrets") },
            { label: "Parc mécanique", onClick: () => {}, active: true },
            { label: "Parc aquatique", onClick: () => navigate("/dashboard-aqua") },
            { label: "PC Sécurité", onClick: () => navigate("/pc-securite") },
            "separator",
            { label: "Vue globale", onClick: () => navigate("/global") },
            { label: "Opérations", onClick: () => navigate("/operations-meca") },
            "separator",
            { label: "Déconnexion", onClick: handleLogout, danger: true },
          ]}
        />
      )}

      {/* POPUP NOTIFICATION STYLE WALYGATOR */}
      {notification.show && (
        <div style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 9999,
          backgroundColor: notification.type === "success" ? "#235630" : "#d32f2f",
          color: "white",
          padding: "15px 25px",
          borderRadius: 10,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          border: "3px solid #f5c400",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          gap: 10,
          animation: "fadeIn 0.5s"
        }}>
          {notification.type === "success" ? "✅" : "❌"} {notification.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="ph-header" style={{ backgroundColor: "#235630" }}>
        <div className="ph-left">
          <button
            onClick={() => navigate("/codes-secrets")}
            style={{ backgroundColor: "#2f6f3a", border: "3px solid #f5c400", padding: "8px 14px", borderRadius: 10, color: "white", fontWeight: "bold" }}
          >
            Codes secrets
          </button>
          <button
            style={{ backgroundColor: "#2f6f3a", border: "3px solid #f5c400", padding: "8px 14px", borderRadius: 10, color: "white", fontWeight: "bold" }}
          >
            Parc mécanique
          </button>
          <button
            onClick={() => navigate("/dashboard-aqua")}
            style={{ backgroundColor: "#ffffff33", border: "3px solid #f5c400", padding: "8px 14px", borderRadius: 10, color: "white", fontWeight: "bold" }}
          >
            Parc aquatique
          </button>
          <button
            onClick={() => navigate("/pc-securite")}
            style={{ backgroundColor: "#2f6f3a", border: "3px solid #f5c400", padding: "8px 14px", borderRadius: 10, color: "white", fontWeight: "bold" }}
          >
            PC Sécurité
          </button>
        </div>

        <img src="/logo_walygator_maintenance.png" alt="logo" className="ph-logo" style={{ height: 70 }} />

        {/* Hamburger mobile */}
        <button className="ph-hamburger" onClick={() => setMobileMenuOpen(true)}>
          <span /><span /><span />
        </button>

        <div className="ph-right">
          <button
            onClick={() => navigate("/global")}
            style={{ backgroundColor: "#2f6f3a", border: "3px solid #f5c400", padding: "8px 14px", borderRadius: 10, color: "white", fontWeight: "bold" }}
          >
            Vue globale
          </button>
          <button
  onClick={() => navigate("/operations-meca")}
  style={{
    backgroundColor: "#2f6f3a",
    border: "3px solid #f5c400",
    padding: "8px 14px",
    borderRadius: 10,
    color: "white",
    fontWeight: "bold"
  }}
>
  Opérations
</button>
          <button onClick={handleLogout} style={{ background: "transparent", border: "none" }}>
            <img src="/logout_door.png" alt="logout" style={{ height: 32, filter: "invert(1)" }} />
          </button>
        </div>
      </div>

      {/* CONTENU principal */}
      <div className="ph-content">
        {/* COLONNE GAUCHE */}
        <div className="ph-col-left">
          <Calendar onDateSelect={handleDateSelect} />
        </div>

        {/* COLONNE DROITE */}
        <div className="ph-col-right">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h2 style={{ margin: 0 }}>
              Checklists du {selectedDate?.label_complet} — Parc mécanique
            </h2>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="date" onChange={(e) => setDateFrom(e.target.value)} />
              <input type="date" onChange={(e) => setDateTo(e.target.value)} />
              <button onClick={handleDownloadZip} disabled={!dateFrom || !dateTo || isDownloading}>
                {isDownloading ? "ZIP..." : "⬇ ZIP"}
              </button>
            </div>
          </div>

          <ChecklistList title="Checklist journalière" checklists={lists.journaliere} onDelete={handleDeleteChecklist} />
          <ChecklistList title="Checklist hebdomadaire" checklists={lists.hebdomadaire} onDelete={handleDeleteChecklist} />
          <ChecklistList title="Checklist mensuelle" checklists={lists.mensuelle} onDelete={handleDeleteChecklist} />
          <ChecklistList title="Checklist trimestrielle" checklists={lists.trimestrielle} onDelete={handleDeleteChecklist} />

          {/* --- 1. RAPPORT D’INTERVENTION --- */}
          <div style={{ marginTop: 30, padding: "14px 18px", border: "1.5px solid #2f6f3a", borderRadius: 10, backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1f4d29" }}>Rapport d’intervention en temps réel</h3>
            </div>
            <button onClick={async () => {
              try {
                const r = await fetch("https://exportinterventionsexcel-siuqyxtfpq-ew.a.run.app");
                if (!r.ok) throw new Error();
                const blob = await r.blob();
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                const now = new Date();
                const d = `${String(now.getDate()).padStart(2,"0")}_${String(now.getMonth()+1).padStart(2,"0")}_${now.getFullYear()}`;
                a.download = `rapport_intervention_${d}.xlsx`;
                a.click();
                URL.revokeObjectURL(a.href);
              } catch { alert("Erreur téléchargement Excel"); }
            }} style={{ backgroundColor: "#2f6f3a", color: "white", padding: "8px 14px", borderRadius: 8, fontWeight: "bold", fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              ⬇ Télécharger Excel
            </button>
          </div>

          {/* --- OBSERVATIONS TECHNICIENS --- */}
          <div style={{ marginTop: 12, padding: "14px 18px", border: "1.5px solid #2f6f3a", borderRadius: 10, backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📝</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1f4d29" }}>Observations & photos des techniciens</h3>
            </div>
            <button onClick={() => navigate("/observations")} style={{ backgroundColor: "#2f6f3a", color: "white", padding: "8px 14px", borderRadius: 8, fontWeight: "bold", fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              Voir les observations
            </button>
          </div>

          {/* --- 2. SECTION PLANIFICATION DES ÉCHÉANCES --- */}
          <div style={{ marginTop: 24, padding: "20px", border: "2px solid #f5c400", borderRadius: 12, backgroundColor: "#f9f9f9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h3 style={{ margin: 0, color: "#235630" }}>Planification des échéances</h3>
                    <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#666" }}>Hebdomadaires, mensuelles et trimestrielles</p>
                </div>
                <button 
                    onClick={() => setShowPlanifModal(true)}
                    style={{ backgroundColor: "#235630", color: "white", border: "none", padding: "12px 20px", borderRadius: 10, fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}
                >
                    ➕ Programmer une tâche
                </button>
            </div>

            <div style={{ display: "flex", gap: 20, justifyContent: "space-between" }}>
              {["hebdomadaire", "mensuelle", "trimestrielle"].map((type) => (
                <div key={type} style={{ flex: 1, backgroundColor: "white", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: "#235630", borderBottom: "2px solid #f5c400", textTransform: "capitalize" }}>{type}</h4>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {schedules.filter(s => s.type === type).map(s => (
                      <div key={s.id} style={{ padding: "8px 0", fontSize: 13, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div><b>{s.attraction}</b> : {s.prochaineDate?.toDate().toLocaleDateString("fr-FR")}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openEditModal(s)} style={{ border: "none", background: "none", cursor: "pointer" }}>✏️</button>
                          <button onClick={() => confirmDelete(s.id)} style={{ border: "none", background: "none", cursor: "pointer" }}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALE DE PROGRAMMATION --- */}
      {showPlanifModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10001 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", width: "400px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", border: "3px solid #235630" }}>
            <h3 style={{ marginTop: 0, color: "#235630", textAlign: "center" }}>Nouvelle Échéance</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 15, marginTop: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 13, fontWeight: "bold" }}>Attraction</label>
                    <select 
                        value={selectedAttrMaintenance} 
                        onChange={(e) => setSelectedAttrMaintenance(e.target.value)}
                        style={{ padding: "12px", borderRadius: 10, border: "2px solid #eee", outline: "none" }}
                    >
                        <option value="">-- Sélectionner --</option>
                        {attractionsList.map(attr => (
                            <option key={attr.id} value={attr.nom}>{attr.nom}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 13, fontWeight: "bold" }}>Type d'échéance</label>
                    <select 
                        value={selectedTypeMaintenance} 
                        onChange={(e) => setSelectedTypeMaintenance(e.target.value)}
                        style={{ padding: "12px", borderRadius: 10, border: "2px solid #eee", outline: "none" }}
                    >
                        <option value="">-- Sélectionner --</option>
                        {attractionsList.find(a => a.nom === selectedAttrMaintenance)?.types
                            ?.filter(t => t !== "journaliere")
                            .map(type => (
                                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                            ))
                        }
                    </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 13, fontWeight: "bold" }}>Date prévue</label>
                    <input 
                        type="date" 
                        value={maintenanceDate} 
                        onChange={(e) => setMaintenanceDate(e.target.value)} 
                        style={{ padding: "12px", borderRadius: 10, border: "2px solid #eee", outline: "none" }} 
                    />
                </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
                <button onClick={() => setShowPlanifModal(false)} style={{ flex: 1, backgroundColor: "#eee", padding: "12px", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer" }}>Annuler</button>
                <button 
                  onClick={() => { handleSaveMaintenance(); setShowPlanifModal(false); }} 
                  style={{ flex: 1, backgroundColor: "#235630", color: "white", padding: "12px", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer" }}
                >
                  Enregistrer
                </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE SUPPRESSION --- */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10001 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", textAlign: "center", width: "350px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", border: "3px solid #d32f2f" }}>
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 10px 0", color: "#d32f2f" }}>Suppression</h3>
            <p style={{ fontWeight: "bold", color: "#666" }}>Voulez-vous vraiment supprimer cette échéance ?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 25 }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, backgroundColor: "#eee", padding: "12px", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer" }}>Annuler</button>
              <button onClick={handleDeleteSchedule} style={{ flex: 1, backgroundColor: "#d32f2f", color: "white", padding: "12px", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer" }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE MODIFICATION --- */}
      {showEditModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10001 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", width: "350px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", border: "3px solid #235630" }}>
            <h3 style={{ marginTop: 0, color: "#235630", textAlign: "center" }}>Modifier la date</h3>
            <div style={{ marginTop: 20 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: "bold" }}>Nouvelle date prévue</label>
                <input 
                    type="date" 
                    value={newEditDate} 
                    onChange={(e) => setNewEditDate(e.target.value)} 
                    style={{ width: "100%", padding: "12px", borderRadius: 10, border: "2px solid #eee", fontSize: 16, boxSizing: "border-box" }} 
                />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
              <button onClick={() => setShowEditModal(false)} style={{ flex: 1, backgroundColor: "#eee", padding: "12px", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer" }}>Annuler</button>
              <button onClick={handleUpdateDate} style={{ flex: 1, backgroundColor: "#235630", color: "white", padding: "12px", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer" }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}