import { formatCurrency } from "./calculator.js";

const EMAILJS_CONFIG = Object.freeze({
  publicKey: "y0ANsvoTYHNRXCf5R",
  serviceId: "service_lg831md",
  templateId: "template_62lwu6b",
  minSdkMajor: 4,
});

let initialized = false;

function getEmailJs() {
  return window.emailjs ?? null;
}

function assertEmailConfig() {
  const missing = Object.entries(EMAILJS_CONFIG)
    .filter(([key, value]) => key !== "minSdkMajor" && (!value || String(value).startsWith("YOUR_")))
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`EmailJS ist nicht vollständig konfiguriert: ${missing.join(", ")}.`);
  }
}

export function canSendEmail() {
  return Boolean(getEmailJs());
}

export function initEmailJs() {
  assertEmailConfig();

  if (initialized) return true;

  const emailjs = getEmailJs();
  if (!emailjs) {
    throw new Error("EmailJS SDK wurde nicht geladen. Prüfen Sie CDN, CSP und Netzwerkzugriff.");
  }

  if (typeof emailjs.init !== "function" || typeof emailjs.send !== "function") {
    throw new Error("EmailJS SDK ist geladen, aber nicht in der erwarteten Browser-Version verfügbar.");
  }

  emailjs.init({
    publicKey: EMAILJS_CONFIG.publicKey,
    blockHeadless: true,
    limitRate: {
      id: "finanzierungsrechner-demo",
      throttle: 3000,
    },
  });

  initialized = true;
  return true;
}

export async function sendTrackingEmail({ customer, calculation, filename, datum, uhrzeit }) {
  initEmailJs();

  if (!customer || !calculation?.valid) {
    throw new Error("Mailversand abgebrochen: Kundendaten oder Berechnung sind ungültig.");
  }

  const faktor = Number.isFinite(Number(calculation.factor))
    ? `${String(calculation.factor).replace(".", ",")} %`
    : "-";

  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const address = `${customer.street}, ${customer.postalCode} ${customer.city}`;
  const price = `${formatCurrency(calculation.price)} €`;
  const residualValue = `${formatCurrency(calculation.residualValue)} €`;
  const rate = `${formatCurrency(calculation.rate)} €`;
  const duration = `${calculation.duration} Monate`;

  const templateParams = {
    // German template variables
    subject: `Neues Angebot: ${customer.financingType} – ${customer.company}`,
    datum,
    uhrzeit,
    finanzierungsart: customer.financingType,
    anrede: customer.salutation,
    vorname: customer.firstName,
    nachname: customer.lastName,
    name: fullName,
    firma: customer.company,
    strasse: customer.street,
    plz: customer.postalCode,
    ort: customer.city,
    plz_ort: `${customer.postalCode} ${customer.city}`,
    adresse: address,
    preis,
    laufzeit: duration,
    restwert: residualValue,
    faktor,
    rate,
    dateiname: filename,

    // Common EmailJS/English aliases, so existing templates are less fragile
    title: `Neues Angebot: ${customer.financingType} – ${customer.company}`,
    financing_type: customer.financingType,
    salutation: customer.salutation,
    first_name: customer.firstName,
    last_name: customer.lastName,
    full_name: fullName,
    company: customer.company,
    street: customer.street,
    postal_code: customer.postalCode,
    city: customer.city,
    address,
    price,
    duration,
    residual_value: residualValue,
    factor: faktor,
    monthly_rate: rate,
    filename,
    generated_date: datum,
    generated_time: uhrzeit,
  };

  const emailjs = getEmailJs();
  const response = await emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    templateParams,
    { publicKey: EMAILJS_CONFIG.publicKey }
  );

  if (!response || response.status < 200 || response.status >= 300) {
    throw new Error(`EmailJS konnte die Mail nicht senden: ${response?.status ?? "?"} ${response?.text ?? ""}`.trim());
  }

  return response;
}
