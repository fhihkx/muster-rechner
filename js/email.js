import { formatCurrency } from "./calculator.js";

const EMAILJS_PUBLIC_KEY  = "y0ANsvoTYHNRXCf5R";   
const EMAILJS_SERVICE_ID  = "service_lg831md";   
const EMAILJS_TEMPLATE_ID = "template_62lwu6b";    

// ─── Initialisierung ──────────────────────────────────────────

let _ready = false;

function init() {
  if (_ready) return true;

  if (typeof window.emailjs === "undefined") {
    console.error("[email] EmailJS SDK nicht verfügbar.");
    return false;
  }

  if (EMAILJS_PUBLIC_KEY === "y0ANsvoTYHNRXCf5R") {
    console.warn("[email] Bitte PUBLIC_KEY, SERVICE_ID und TEMPLATE_ID in email.js eintragen.");
    return false;
  }

  window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  _ready = true;
  return true;
}

// ─── Benachrichtigung senden ──────────────────────────────────

/**
 * Sendet die Angebotsdaten an die in EmailJS hinterlegte Adresse.
 * Wirft bei Fehler — main.js fängt per .catch() still ab.
 *
 * @param {object} params
 * @param {object} params.customer     — validierte Formularwerte
 * @param {object} params.calculation  — CalculationResult
 * @param {string} params.filename     — PDF-Dateiname
 * @param {string} params.datum        — TT.MM.JJJJ
 * @param {string} params.uhrzeit      — HH:MM
 * @returns {Promise<void>}
 */
export async function sendTrackingEmail({ customer, calculation, filename, datum, uhrzeit }) {
  if (!init()) return;

  const faktor = Number.isFinite(Number(calculation.factor))
    ? `${String(calculation.factor).replace(".", ",")} %`
    : "-";

  // "to_email" wird NICHT übergeben — der Empfänger ist
  // fest im EmailJS-Template eingetragen (nie im Frontend).
  const templateParams = {
    subject:          `Neues Angebot: ${customer.financingType} – ${customer.company}`,
    datum,
    uhrzeit,
    finanzierungsart: customer.financingType,
    anrede:           customer.salutation,
    vorname:          customer.firstName,
    nachname:         customer.lastName,
    firma:            customer.company,
    strasse:          customer.street,
    plz_ort:          `${customer.postalCode} ${customer.city}`,
    preis:            `${formatCurrency(calculation.price)} €`,
    laufzeit:         `${calculation.duration} Monate`,
    restwert:         `${formatCurrency(calculation.residualValue)} €`,
    faktor,
    rate:             `${formatCurrency(calculation.rate)} €`,
    dateiname:        filename,
  };

  await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
}
