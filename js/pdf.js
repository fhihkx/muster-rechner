import {
  BRAND,
  DEMO_MESSAGES,
  PDF_COMPANY,
  PDF_LAYOUT,
  PDF_TEXT,
} from "./config.js";

import { formatCurrency } from "./calculator.js";
import { cleanText, makeSafeFilenamePart } from "./validation.js";

function getJsPdfConstructor() {
  return window.jspdf?.jsPDF ?? null;
}

function formatDateDE(date = new Date()) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTimeDE(date = new Date()) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function makeSalutation({ salutation, firstName, lastName }) {
  if (salutation === "Frau") return `Sehr geehrte Frau ${lastName},`;
  if (salutation === "Herr") return `Sehr geehrter Herr ${lastName},`;
  return `Guten Tag ${firstName} ${lastName},`;
}

function generateLogoDataUrl() {
  const canvas = document.createElement("canvas");
  const { pdfWidth, pdfHeight, companyBold, companyLight } = BRAND.logo;

  canvas.width = pdfWidth;
  canvas.height = pdfHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable.");

  ctx.fillStyle = BRAND.primary;
  ctx.beginPath();
  ctx.roundRect(0, 15, 50, 50, 12);
  ctx.fill();

  ctx.fillStyle = BRAND.white;
  ctx.beginPath();
  ctx.arc(25, 40, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = BRAND.primary;
  ctx.font = "900 34px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(companyBold, 65, 43);

  ctx.fillStyle = BRAND.secondary;
  ctx.font = "300 34px Helvetica, Arial, sans-serif";
  ctx.fillText(companyLight, 215, 43);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: pdfWidth,
    height: pdfHeight,
  };
}

function addLogo(doc) {
  const logo = generateLogoDataUrl();
  const { xRight, y, maxWidth } = PDF_LAYOUT.logo;

  const width = maxWidth;
  const height = (logo.height * width) / logo.width;

  doc.addImage(logo.dataUrl, "PNG", xRight - width, y, width, height);
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
  doc.text(lines, PDF_LAYOUT.page.left, PDF_LAYOUT.addressY);
}

function addFooter(doc) {
  const { left, right, footerY } = PDF_LAYOUT.page;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(left, footerY, right, footerY);

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");

  doc.text(
    [PDF_COMPANY.name, PDF_COMPANY.street, PDF_COMPANY.postalCity],
    20,
    274
  );

  doc.text(
    [PDF_COMPANY.managingDirector, PDF_COMPANY.registry, PDF_COMPANY.vatId],
    46,
    274
  );

  doc.text(
    [PDF_COMPANY.phone, PDF_COMPANY.email, PDF_COMPANY.website],
    86,
    274
  );

  doc.text(PDF_COMPANY.bankNames, 118, 274);
  doc.text(PDF_COMPANY.ibans, 136, 274);
  doc.text(PDF_COMPANY.bics, 190, 274, { align: "right" });
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

function buildRows(calculation) {
  const factor = Number.isFinite(Number(calculation.factor))
    ? String(calculation.factor).replace(".", ",")
    : "-";

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
  const type = makeSafeFilenamePart(financingType, "Finanzierung");
  const company = makeSafeFilenamePart(customer.company, "Kunde");

  return `MusterAngebot_${type}_${company}.pdf`;
}

export function canGeneratePdf() {
  return Boolean(getJsPdfConstructor());
}

export function generateOfferPdf({ customer, calculation, date = new Date() }) {
  const JsPDF = getJsPdfConstructor();

  if (!JsPDF) {
    throw new Error(DEMO_MESSAGES.missingPdfLibrary);
  }

  if (!customer || !calculation?.valid) {
    throw new Error(DEMO_MESSAGES.invalidCalculation);
  }

  const doc = new JsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { left, right } = PDF_LAYOUT.page;

  addLogo(doc);
  addRecipientAddress(doc, customer);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Datum: ${formatDateDE(date)}`, right, PDF_LAYOUT.dateY, {
    align: "right",
  });

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${PDF_TEXT.subjectPrefix}: ${customer.financingType}`,
    left,
    PDF_LAYOUT.subjectY
  );

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(makeSalutation(customer), left, PDF_LAYOUT.salutationY);
  doc.text(PDF_TEXT.intro, left, PDF_LAYOUT.introY);

  let y = PDF_LAYOUT.tableStartY;
  for (const [label, value, unit] of buildRows(calculation)) {
    drawRow(doc, y, label, value, unit);
    y += PDF_LAYOUT.rowHeight;
  }

  y += 10;

  if (customer.financingType === "Mietkauf") {
    doc.setFont("helvetica", "bold");
    doc.text(PDF_TEXT.mietkaufVatNotice, left, y);
    y += 10;
  }

  doc.setFont("helvetica", "normal");
  doc.text(PDF_TEXT.netPriceNotice, left, y);

  y += 15;
  doc.text(PDF_TEXT.closing, left, y);

  y += 20;
  doc.text(PDF_TEXT.greeting, left, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text(PDF_COMPANY.name, left, y);

  addFooter(doc);

  const filename = buildFilename(customer, customer.financingType);
  const datum    = formatDateDE(date);
  const uhrzeit  = formatTimeDE(date);

  doc.save(filename);

  // Return metadata so main.js can pass it to the email notification
  // without regenerating the PDF or recalculating dates.
  return { filename, datum, uhrzeit };
}
