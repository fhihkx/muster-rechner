import { BRAND, PDF_COMPANY, PDF_TEXT } from "./config.js";
import { formatCurrency } from "./calculator.js";
import { cleanText, makeSafeFilenamePart } from "./validation.js";

function getJsPdfConstructor() {
  return window.jspdf?.jsPDF ?? null;
}

function formatDateDE(date = new Date()) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function makeSalutation({ salutation, firstName, lastName }) {
  if (salutation === "Frau") return `Sehr geehrte Frau ${lastName},`;
  if (salutation === "Herr") return `Sehr geehrter Herr ${lastName},`;
  return `Guten Tag ${firstName} ${lastName},`;
}

function addVectorLogo(doc) {
  doc.setFillColor(BRAND.primary);
  doc.roundedRect(145, 20, 10, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("●", 150, 27, { align: "center" });
  doc.setTextColor(BRAND.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MUSTER", 158, 28);
  doc.setTextColor(BRAND.secondary);
  doc.setFont("helvetica", "normal");
  doc.text("LOGO", 182, 28);
  doc.setTextColor(0, 0, 0);
}

function textLines(doc, text, maxWidth) {
  return doc.splitTextToSize(cleanText(text, 500), maxWidth);
}

function addRecipientAddress(doc, customer) {
  const lines = [
    customer.company,
    `${customer.salutation} ${customer.firstName} ${customer.lastName}`,
    customer.street,
    `${customer.postalCode} ${customer.city}`,
  ].map((line) => cleanText(line, 150));
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(lines, 20, 45);
}

function drawRow(doc, y, label, value, unit = "") {
  doc.setFont("helvetica", "normal");
  doc.text(label, 40, y);
  doc.setFont("helvetica", "bold");
  doc.text(String(value), 110, y, { align: "right" });
  if (unit) {
    doc.setFont("helvetica", "normal");
    doc.text(unit, 112, y);
  }
}

function addFooter(doc) {
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(20, 270, 190, 270);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text([PDF_COMPANY.name, PDF_COMPANY.street, PDF_COMPANY.postalCity], 20, 274);
  doc.text([PDF_COMPANY.managingDirector, PDF_COMPANY.registry, PDF_COMPANY.vatId], 46, 274);
  doc.text([PDF_COMPANY.phone, PDF_COMPANY.email, PDF_COMPANY.website], 86, 274);
  doc.text(PDF_COMPANY.bankNames, 118, 274);
  doc.text(PDF_COMPANY.ibans, 136, 274);
  doc.text(PDF_COMPANY.bics, 190, 274, { align: "right" });
}

function buildRows(calculation) {
  const factor = Number.isFinite(Number(calculation.factor)) ? String(calculation.factor).replace(".", ",") : "-";
  return [
    ["Anschaffungspreis:", formatCurrency(calculation.price), "€"],
    ["Laufzeit:", calculation.duration, "Monate"],
    ["Mietsonderzahlung:", "0,00", "€"],
    ["Monatliche Rate:", formatCurrency(calculation.rate), "€"],
    ["Rate in %:", factor, "%"],
    ["kalk. Restwert:", formatCurrency(calculation.residualValue), "€"],
  ];
}

function buildFilename(customer, financingType) {
  return `MusterAngebot_${makeSafeFilenamePart(financingType, "Finanzierung")}_${makeSafeFilenamePart(customer.company, "Kunde")}.pdf`;
}

export function generateOfferPdf({ customer, calculation, date = new Date() }) {
  const JsPDF = getJsPdfConstructor();
  if (!JsPDF) throw new Error("jsPDF wurde nicht geladen.");
  if (!customer || !calculation?.valid) throw new Error("Ungültige Daten für PDF-Erzeugung.");

  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setProperties({ title: "Finanzierungsangebot", subject: "Unverbindliches Finanzierungsangebot", author: PDF_COMPANY.name, creator: "Finanzierungsrechner Demo" });

  addVectorLogo(doc);
  addRecipientAddress(doc, customer);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Datum: ${formatDateDE(date)}`, 190, 60, { align: "right" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${PDF_TEXT.subjectPrefix}: ${customer.financingType}`, 20, 80);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(makeSalutation(customer), 20, 95);
  doc.text(textLines(doc, PDF_TEXT.intro, 170), 20, 105);

  let y = 120;
  for (const [label, value, unit] of buildRows(calculation)) {
    drawRow(doc, y, label, value, unit);
    y += 7;
  }

  y += 10;
  if (customer.financingType === "Mietkauf") {
    doc.setFont("helvetica", "bold");
    doc.text(textLines(doc, PDF_TEXT.mietkaufVatNotice, 170), 20, y);
    y += 10;
  }

  doc.setFont("helvetica", "normal");
  doc.text(textLines(doc, PDF_TEXT.netPriceNotice, 170), 20, y);
  y += 15;
  doc.text(PDF_TEXT.closing, 20, y);
  y += 20;
  doc.text(PDF_TEXT.greeting, 20, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text(PDF_COMPANY.name, 20, y);

  addFooter(doc);

  const filename = buildFilename(customer, customer.financingType);
  doc.save(filename);
  return filename;
}
