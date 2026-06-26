import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";

export default function Calendar({ onDateSelect }) {
  const [highlightEvent, setHighlightEvent] = useState([]);

  const handleDateClick = (info) => {
    const [year, month, day] = info.dateStr.split("-").map(Number);

    const dateObj = new Date(year, month - 1, day);
    dateObj.setHours(0, 0, 0, 0);

    const formatted =
      ("0" + dateObj.getDate()).slice(-2) +
      "/" +
      ("0" + (dateObj.getMonth() + 1)).slice(-2) +
      "/" +
      dateObj.getFullYear();

    onDateSelect({
      raw: dateObj,
      label: formatted,
    });

    setHighlightEvent([
      {
        id: "selected-day",
        start: info.dateStr,
        allDay: true,
        display: "background",
        backgroundColor: "#23563055",
      },
    ]);
  };

  return (
    <>
      {/* 🎨 UI — centrage parfait du numéro aujourd’hui */}
      <style>{`
  /* 🔥 CENTRAGE GLOBAL DE TOUS LES JOURS */
  .fc-daygrid-day-frame {
    display: grid;
    place-items: center;
  }

  /* Supprimer l’alignement par défaut */
  .fc-daygrid-day-top {
    position: static;
  }

  /* Numéro standard (tous les jours) */
  .fc-daygrid-day-number {
    font-weight: 600;
    color: #000;
  }

  /* Fond léger aujourd’hui */
  .fc-daygrid-day.fc-day-today {
    background-color: #23563022 !important;
  }

  /* Badge du jour J */
  .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
    background-color: #235630;
    color: white !important;
    font-weight: 900;
    border-radius: 50%;
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`}</style>

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
    </>
  );
}
