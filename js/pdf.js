import {
  BRAND,
  DEMO_MESSAGES,
  PDF_COMPANY,
  PDF_LAYOUT,
  PDF_TEXT,
} from "./config.js";

import { formatCurrency } from "./calculator.js";
import { cleanText, makeSafeFilenamePart } from "./validation.js";

const FONT_NORMAL = "normal";
const FONT_BOLD = "bold";
const LINE_HEIGHT = 5;

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

function setTextStyle(doc, size = 10, style = FONT_NORMAL) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
}

function writeText(doc, text, x, y, options = {}) {
  const {
    maxWidth = null,
    lineHeight = LINE_HEIGHT,
    cleanLength = 300,
    ...textOptions
  } = options;

  const value = Array.isArray(text)
    ? text.map((line) => cleanText(line, cleanLength))
    : cleanText(text, cleanLength);

  const lines = maxWidth
    ? doc.splitTextToSize(value, maxWidth)
    : value;

  doc.text(lines, x, y, textOptions);

  const lineCount = Array.isArray(lines) ? lines.length : 1;
  return y + lineCount * lineHeight;
}

function addTextLogo(doc) {
  const { xRight, y, maxWidth } = PDF_LAYOUT.logo;
  const logoX = xRight - maxWidth;
  const logoY = y + 3;

  // Deliberately vector/text only: no canvas, no image, no rasterized text.
  doc.setFillColor(BRAND.primary);
  doc.roundedRect(logoX, logoY, 8, 8, 2, 2, "F");
  doc.setFillColor(BRAND.white);
  doc.circle(logoX + 4, logoY + 4, 2, "F");

  setTextStyle(doc, 12, FONT_BOLD);
  doc.setTextColor(BRAND.primary);
  doc.text(BRAND.logo.companyBold, logoX + 11, logoY + 6.2);

  setTextStyle(doc, 12, FONT_NORMAL);
  doc.setTextColor(BRAND.secondary);
  doc.text(BRAND.logo.companyLight, logoX + 32, logoY + 6.2);

  doc.setTextColor(0, 0, 0);
}

function addRecipientAddress(doc, customer) {
  const lines = [
    customer.company,
    `${customer.salutation} ${customer.firstName} ${customer.lastName}`,
    customer.street,
    `${customer.postalCode} ${customer.city}`,
  ];

  setTextStyle(doc, 10, FONT_NORMAL);
  let y = PDF_LAYOUT.addressY;

  for (const line of lines) {
    y = writeText(doc, line, PDF_LAYOUT.page.left, y, {
      maxWidth: 85,
      lineHeight: 4.5,
      cleanLength: 150,
    });
  }
}

function addFooter(doc) {
  const { left, right, footerY } = PDF_LAYOUT.page;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(left, footerY, right, footerY);

  setTextStyle(doc, 5.5, FONT_NORMAL);

  writeText(doc, [PDF_COMPANY.name, PDF_COMPANY.street, PDF_COMPANY.postalCity], 20, 274, {
    cleanLength: 90,
    lineHeight: 3,
  });

  writeText(doc, [PDF_COMPANY.managingDirector, PDF_COMPANY.registry, PDF_COMPANY.vatId], 46, 274, {
    cleanLength: 110,
    lineHeight: 3,
  });

  writeText(doc, [PDF_COMPANY.phone, PDF_COMPANY.email, PDF_COMPANY.website], 86, 274, {
    cleanLength: 90,
    lineHeight: 3,
  });

  writeText(doc, PDF_COMPANY.bankNames, 118, 274, { cleanLength: 90, lineHeight: 3 });
  writeText(doc, PDF_COMPANY.ibans, 136, 274, { cleanLength: 120, lineHeight: 3 });
  writeText(doc, PDF_COMPANY.bics, 190, 274, {
    cleanLength: 40,
    lineHeight: 3,
    align: "right",
  });
}

function drawRow(doc, y, label, value, unit = "") {
  setTextStyle(doc, 10, FONT_NORMAL);
  writeText(doc, label, 40, y, { cleanLength: 60 });

  setTextStyle(doc, 10, FONT_BOLD);
  writeText(doc, String(value), 110, y, {
    cleanLength: 40,
    align: "right",
  });

  if (unit) {
    setTextStyle(doc, 10, FONT_NORMAL);
    writeText(doc, unit, 112, y, { cleanLength: 20 });
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

  if (!JsPDF) throw new Error(DEMO_MESSAGES.missingPdfLibrary);
  if (!customer || !calculation?.valid) throw new Error(DEMO_MESSAGES.invalidCalculation);

  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { left, right } = PDF_LAYOUT.page;

  doc.setProperties({
    title: `Finanzierungsangebot: ${customer.financingType}`,
    subject: "Unverbindliches Finanzierungsangebot",
    author: PDF_COMPANY.name,
    creator: "White-Label Finanzierungsrechner",
  });

  addTextLogo(doc);
  addRecipientAddress(doc, customer);

  setTextStyle(doc, 10, FONT_NORMAL);
  writeText(doc, `Datum: ${formatDateDE(date)}`, right, PDF_LAYOUT.dateY, {
    align: "right",
    cleanLength: 30,
  });

  setTextStyle(doc, 11, FONT_BOLD);
  writeText(doc, `${PDF_TEXT.subjectPrefix}: ${customer.financingType}`, left, PDF_LAYOUT.subjectY, {
    maxWidth: 170,
    lineHeight: 5,
    cleanLength: 120,
  });

  setTextStyle(doc, 10, FONT_NORMAL);
  writeText(doc, makeSalutation(customer), left, PDF_LAYOUT.salutationY, {
    maxWidth: 170,
    cleanLength: 120,
  });

  writeText(doc, PDF_TEXT.intro, left, PDF_LAYOUT.introY, {
    maxWidth: 170,
    lineHeight: 5,
    cleanLength: 300,
  });

  let y = PDF_LAYOUT.tableStartY;
  for (const [label, value, unit] of buildRows(calculation)) {
    drawRow(doc, y, label, value, unit);
    y += PDF_LAYOUT.rowHeight;
  }

  y += 10;

  if (customer.financingType === "Mietkauf") {
    setTextStyle(doc, 10, FONT_BOLD);
    y = writeText(doc, PDF_TEXT.mietkaufVatNotice, left, y, {
      maxWidth: 170,
      lineHeight: 5,
      cleanLength: 240,
    });
    y += 5;
  }

  setTextStyle(doc, 10, FONT_NORMAL);
  y = writeText(doc, PDF_TEXT.netPriceNotice, left, y, {
    maxWidth: 170,
    lineHeight: 5,
    cleanLength: 240,
  });

  y += 10;
  y = writeText(doc, PDF_TEXT.closing, left, y, {
    maxWidth: 170,
    lineHeight: 5,
    cleanLength: 240,
  });

  y += 15;
  y = writeText(doc, PDF_TEXT.greeting, left, y, { cleanLength: 80 });

  y += 5;
  setTextStyle(doc, 10, FONT_BOLD);
  writeText(doc, PDF_COMPANY.name, left, y, { cleanLength: 100 });

  addFooter(doc);

  const filename = buildFilename(customer, customer.financingType);
  const datum = formatDateDE(date);
  const uhrzeit = formatTimeDE(date);

  doc.save(filename);
  return { filename, datum, uhrzeit };
}
