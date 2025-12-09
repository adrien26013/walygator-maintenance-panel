// src/components/Calendar.js
import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";

export default function Calendar({ onDateSelect }) {
  const [highlightEvent, setHighlightEvent] = useState([]);

  const handleDateClick = (info) => {
    // ⚠️ FullCalendar renvoie une date en UTC → on reconstruit en LOCAL
    const parts = info.dateStr.split("-"); // "2025-12-09"
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS = 0 → janvier
    const day = parseInt(parts[2], 10);

    const dateObj = new Date(year, month, day);
    dateObj.setHours(0, 0, 0, 0); // 🔥 Normalisation

    // Format JJ/MM/YYYY
    const formatted =
      ("0" + dateObj.getDate()).slice(-2) +
      "/" +
      ("0" + (dateObj.getMonth() + 1)).slice(-2) +
      "/" +
      dateObj.getFullYear();

    // Envoi vers Dashboard → 100% propre, pas d’UTC
    onDateSelect({
      raw: dateObj,
      label: formatted,
    });

    // Surbrillance du jour choisi
    setHighlightEvent([
      {
        id: "selected-day",
        title: "",
        start: info.dateStr,
        allDay: true,
        display: "background",
        backgroundColor: "#23563055",
      },
    ]);
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      locale={frLocale}
      firstDay={1}
      dateClick={handleDateClick}
      events={highlightEvent}
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
