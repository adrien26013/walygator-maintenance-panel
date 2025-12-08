// src/components/Calendar.js
import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";

export default function Calendar({ onDateSelect }) {
  const [highlightEvent, setHighlightEvent] = useState([]);

  const handleDateClick = (info) => {
    // Définir une date JS correcte
    const dateObj = new Date(info.dateStr);

    // Format JJ/MM/YYYY
    const formatted =
      ("0" + dateObj.getDate()).slice(2) +
      "/" +
      ("0" + (dateObj.getMonth() + 1)).slice(2) +
      "/" +
      dateObj.getFullYear();

    // Envoi vers Dashboard
    onDateSelect({
      raw: dateObj,
      label: formatted,
    });

    // Ajoute la surbrillance du jour sélectionné
    setHighlightEvent([
      {
        id: "selected-day",
        title: "",
        start: info.dateStr,
        allDay: true,
        display: "background",
        backgroundColor: "#23563055", // Vert Walygator transparent
      },
    ]);
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      locale={frLocale}                 // 🇫🇷 Calendrier en français
      firstDay={1}                      // 📅 Lundi = début de semaine
      dateClick={handleDateClick}       // 🔥 Sélection du jour
      events={highlightEvent}           // 🎨 Surbrillance
      height={500}
      dayMaxEventRows={true}
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "",
      }}
    />
  );
}
