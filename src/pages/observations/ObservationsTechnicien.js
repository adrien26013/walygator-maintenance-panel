import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const toDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
};

const formatLabel = (str) =>
  str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateFr = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const sanitizeFileName = (s) =>
  String(s || "fichier")
    .replace(/[àâä]/g, "a").replace(/[éèêë]/g, "e")
    .replace(/[îï]/g, "i").replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u").replace(/[^a-zA-Z0-9._-]/g, "_");

export default function ObservationsTechnicien() {
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [dateFrom, setDateFrom] = useState(formatDateKey(today));
  const [dateTo, setDateTo] = useState(formatDateKey(today));
  const [parc, setParc] = useState("meca");
  const [loading, setLoading] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [grouped, setGrouped] = useState({});
  const [allDocs, setAllDocs] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [notification, setNotification] = useState({ show: false, msg: "", type: "success" });

  const showPopup = (msg, type = "success") => {
    setNotification({ show: true, msg, type });
    setTimeout(() => setNotification({ show: false, msg: "", type: "success" }), 3500);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const fetchObservations = async () => {
    setLoading(true);
    try {
      const from = Timestamp.fromDate(new Date(dateFrom + "T00:00:00"));
      const to = Timestamp.fromDate(new Date(dateTo + "T23:59:59"));

      const q = query(
        collection(db, "checklists"),
        where("parc", "==", parc),
        where("timestamp", ">=", from),
        where("timestamp", "<=", to),
        orderBy("timestamp", "desc")
      );

      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const withObs = docs.filter(
        (d) =>
          (d.observation && d.observation.trim() !== "") ||
          (Array.isArray(d.photos_urls) && d.photos_urls.length > 0)
      );

      setAllDocs(withObs);

      const result = {};
      for (const doc of withObs) {
        const attraction = doc.attraction || doc.groupe || "inconnu";
        const date = toDate(doc.timestamp);
        const dateKey = date ? formatDateKey(date) : "inconnu";
        if (!result[attraction]) result[attraction] = {};
        if (!result[attraction][dateKey]) result[attraction][dateKey] = [];
        result[attraction][dateKey].push(doc);
      }
      setGrouped(result);
    } catch (e) {
      console.error("Erreur fetch observations:", e);
      showPopup("Erreur lors du chargement", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchObservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadZip = async () => {
    const photoDocs = allDocs.filter(
      (d) => Array.isArray(d.photos_urls) && d.photos_urls.length > 0
    );

    if (photoDocs.length === 0) {
      showPopup("Aucune photo à télécharger dans cette période", "error");
      return;
    }

    setZipping(true);
    try {
      const zip = new JSZip();
      const rootFolder = `observations_du_${dateFrom}_au_${dateTo}`;
      let notesContent = `Observations techniciens — du ${dateFrom} au ${dateTo}\nParc: ${parc}\n${"=".repeat(60)}\n\n`;

      for (const doc of allDocs) {
        const attraction = sanitizeFileName(doc.attraction || doc.groupe || "inconnu");
        const date = toDate(doc.timestamp);
        const dateKey = date ? formatDateKey(date) : "inconnu";
        const tech = sanitizeFileName(doc.technicien || "inconnu");
        const folder = zip.folder(`${rootFolder}/${attraction}/${dateKey}`);

        if (doc.observation && doc.observation.trim() !== "") {
          notesContent += `[${attraction}] ${dateKey} — ${doc.technicien || "?"}\n`;
          notesContent += `  ${doc.observation.trim()}\n\n`;
        }

        if (Array.isArray(doc.photos_urls)) {
          for (let i = 0; i < doc.photos_urls.length; i++) {
            try {
              const resp = await fetch(doc.photos_urls[i]);
              if (!resp.ok) continue;
              const blob = await resp.blob();
              const ext = blob.type.includes("png") ? "png" : "jpg";
              folder.file(`${tech}_photo_${i + 1}.${ext}`, blob);
            } catch {
              // skip failed photo
            }
          }
        }
      }

      zip.file(`${rootFolder}/observations.txt`, notesContent);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${rootFolder}.zip`);
      showPopup("ZIP téléchargé !");
    } catch (e) {
      console.error("Erreur ZIP:", e);
      showPopup("Erreur lors de la création du ZIP", "error");
    }
    setZipping(false);
  };

  const totalCount = Object.values(grouped).reduce(
    (acc, byDate) => acc + Object.values(byDate).reduce((a2, arr) => a2 + arr.length, 0),
    0
  );

  const totalPhotos = allDocs.reduce(
    (acc, d) => acc + (Array.isArray(d.photos_urls) ? d.photos_urls.length : 0),
    0
  );

  return (
    <div style={{ position: "relative", minHeight: "100vh", backgroundColor: "#f4f6f9", fontFamily: "'Segoe UI', sans-serif" }}>

      {/* NOTIFICATION */}
      {notification.show && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          backgroundColor: notification.type === "success" ? "#235630" : "#d32f2f",
          color: "white", padding: "14px 22px", borderRadius: 10,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)", border: "3px solid #f5c400",
          fontWeight: "bold", display: "flex", alignItems: "center", gap: 10,
        }}>
          {notification.type === "success" ? "✅" : "❌"} {notification.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{
        height: 80,
        backgroundColor: "#235630",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "relative",
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ backgroundColor: "#2f6f3a", border: "3px solid #f5c400", padding: "8px 16px", borderRadius: 10, color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 14 }}
        >
          ← Retour
        </button>

        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <h1 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 700 }}>
            📝 Observations des Techniciens
          </h1>
        </div>

        <button
          onClick={handleLogout}
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <img src="/logout_door.png" alt="logout" style={{ height: 30, filter: "invert(1)" }} />
        </button>
      </div>

      {/* BARRE DE FILTRES */}
      <div style={{
        backgroundColor: "#ffffff",
        borderBottom: "3px solid #f5c400",
        padding: "16px 24px",
        display: "flex",
        alignItems: "flex-end",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#235630", textTransform: "uppercase", letterSpacing: 0.5 }}>Parc</label>
          <select
            value={parc}
            onChange={(e) => setParc(e.target.value)}
            style={{ border: "2px solid #2f6f3a", borderRadius: 8, padding: "8px 12px", fontSize: 14, color: "#1a1a1a", outline: "none" }}
          >
            <option value="meca">Parc Mécanique</option>
            <option value="aqua">Parc Aquatique</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#235630", textTransform: "uppercase", letterSpacing: 0.5 }}>Du</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ border: "2px solid #2f6f3a", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#235630", textTransform: "uppercase", letterSpacing: 0.5 }}>Au</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ border: "2px solid #2f6f3a", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" }}
          />
        </div>

        <button
          onClick={fetchObservations}
          style={{ backgroundColor: "#235630", border: "none", color: "white", borderRadius: 8, padding: "9px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          🔍 Rechercher
        </button>

        <button
          onClick={handleDownloadZip}
          disabled={zipping || totalPhotos === 0}
          style={{
            backgroundColor: zipping ? "#aaa" : (totalPhotos === 0 ? "#ccc" : "#f5c400"),
            border: "none",
            color: totalPhotos === 0 ? "#888" : "#1a1a1a",
            borderRadius: 8, padding: "9px 22px", fontSize: 14, fontWeight: 700,
            cursor: totalPhotos === 0 ? "not-allowed" : "pointer",
          }}
        >
          {zipping ? "⏳ ZIP en cours..." : `⬇ Télécharger ZIP${totalPhotos > 0 ? ` (${totalPhotos} photo${totalPhotos > 1 ? "s" : ""})` : ""}`}
        </button>
      </div>

      {/* CONTENU */}
      <div style={{ padding: "24px", maxWidth: 960, margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#666", fontSize: 18 }}>Chargement…</div>
        ) : totalCount === 0 ? (
          <div style={{
            textAlign: "center", padding: 50, backgroundColor: "#fff",
            border: "2px solid #e0e0e0", borderRadius: 12, color: "#888"
          }}>
            <p style={{ fontSize: 16, margin: 0 }}>Aucune observation trouvée pour cette période.</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>
              Les observations apparaissent quand un technicien remplit le champ "Observation" ou ajoute des photos lors d'une checklist.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
              {totalCount} observation(s) — {totalPhotos} photo(s)
            </p>

            {Object.keys(grouped).sort().map((attraction) => (
              <div key={attraction} style={{ marginBottom: 32 }}>
                {/* TITRE ATTRACTION */}
                <div style={{
                  backgroundColor: "#235630",
                  color: "#fff",
                  borderRadius: "10px 10px 0 0",
                  padding: "10px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>🎡</span>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{formatLabel(attraction)}</h2>
                </div>

                <div style={{ border: "2px solid #235630", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                  {Object.keys(grouped[attraction]).sort().reverse().map((dateKey, di) => (
                    <div key={dateKey} style={{ borderTop: di > 0 ? "2px solid #f5c400" : "none" }}>
                      {/* DATE */}
                      <div style={{
                        backgroundColor: "#fffbea",
                        padding: "8px 18px",
                        borderBottom: "1px solid #f5c400",
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#235630", textTransform: "capitalize" }}>
                          📅 {formatDateFr(dateKey)}
                        </span>
                      </div>

                      {/* CARTES */}
                      <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 12, backgroundColor: "#fff" }}>
                        {grouped[attraction][dateKey].map((entry) => (
                          <ObservationCard
                            key={entry.id}
                            entry={entry}
                            onPhotoClick={(url) => setLightbox(url)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, cursor: "pointer",
          }}
        >
          <img
            src={lightbox}
            alt="Photo agrandie"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 10, objectFit: "contain", cursor: "default", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute", top: 20, right: 24,
              background: "#235630", border: "3px solid #f5c400",
              color: "#fff", fontSize: 18, width: 42, height: 42,
              borderRadius: "50%", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function ObservationCard({ entry, onPhotoClick }) {
  const date = toDate(entry.timestamp);
  const timeStr = date
    ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div style={{
      border: "1.5px solid #e0e0e0",
      borderRadius: 10,
      padding: "12px 16px",
      backgroundColor: "#fafafa",
    }}>
      {/* EN-TÊTE CARTE */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", flex: 1 }}>
          👤 {entry.technicien || "Inconnu"}
        </span>
        {timeStr && (
          <span style={{ fontSize: 12, color: "#888" }}>{timeStr}</span>
        )}
        <span style={{
          background: "#e8f5e9", color: "#235630", borderRadius: 20,
          padding: "2px 10px", fontSize: 12, fontWeight: 600, textTransform: "capitalize",
          border: "1px solid #2f6f3a",
        }}>
          {entry.type || ""}
        </span>
        {entry.signed === false && (
          <span style={{
            background: "#fdecea", color: "#c62828", borderRadius: 20,
            padding: "2px 10px", fontSize: 12, fontWeight: 600,
            border: "1px solid #c62828",
          }}>
            Refusé
          </span>
        )}
      </div>

      {/* OBSERVATION TEXTE */}
      {entry.observation && entry.observation.trim() !== "" && (
        <div style={{
          background: "#f1f8e9", border: "1px solid #aed581", borderRadius: 8,
          padding: "10px 14px", marginBottom: 10, display: "flex", gap: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>📝</span>
          <p style={{ margin: 0, fontSize: 14, color: "#2e3d2e", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {entry.observation}
          </p>
        </div>
      )}

      {/* PHOTOS */}
      {Array.isArray(entry.photos_urls) && entry.photos_urls.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {entry.photos_urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Photo ${i + 1}`}
              title="Cliquer pour agrandir"
              onClick={() => onPhotoClick(url)}
              style={{
                width: 90, height: 90, objectFit: "cover", borderRadius: 8,
                cursor: "pointer", border: "2px solid #2f6f3a",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            />
          ))}
        </div>
      )}

      {/* LIEN PDF */}
      {entry.pdf_url && (
        <a
          href={entry.pdf_url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 13, color: "#235630", fontWeight: 600, textDecoration: "underline" }}
        >
          📄 Voir la checklist PDF
        </a>
      )}
    </div>
  );
}
