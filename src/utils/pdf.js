import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function downloadChecklistPDF(checklist) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`Checklist ${checklist.type} - ${checklist.attraction}`, 10, 20);

  doc.setFontSize(12);
  doc.text(`Date : ${checklist.date}`, 10, 30);
  doc.text(`Technicien : ${checklist.technicienPrenom} ${checklist.technicienNom}`, 10, 40);

  doc.text("Points :", 10, 60);

  let y = 70;
  checklist.items?.forEach((item) => {
    doc.text(`- ${item.label} : ${item.value ? "OK" : "Non conforme"}`, 10, y);
    y += 10;
  });

  doc.save(`Checklist_${checklist.type}_${checklist.attraction}_${checklist.date}.pdf`);
}
