import { formatCurrency } from "./calculator.js";

const EMAILJS_CONFIG = Object.freeze({
  publicKey: "y0ANsvoTYHNRXCf5R",
  serviceId: "service_lg831md",
  templateId: "template_62lwu6b",
});

let initialized = false;

function getEmailJs() {
  return window.emailjs ?? null;
}

function assertEmailConfig() {
  const missing = Object.entries(EMAILJS_CONFIG)
    .filter(([, value]) => !value || String(value).startsWith("YOUR_"))
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`EmailJS ist nicht vollständig konfiguriert: ${missing.join(", ")}.`);
  }
}

export function canSendEmail() {
  const emailjs = getEmailJs();
  return Boolean(emailjs && typeof emailjs.init === "function" && typeof emailjs.send === "function");
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

  emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
  initialized = true;
  return true;
}

function buildTemplateParams({ customer, calculation, filename, datum, uhrzeit }) {
  const financingType = String(customer.financingType ?? "");
  const salutation = String(customer.salutation ?? "");
  const firstName = String(customer.firstName ?? "");
  const lastName = String(customer.lastName ?? "");
  const fullName = `${firstName} ${lastName}`.trim();
  const company = String(customer.company ?? "");
  const street = String(customer.street ?? "");
  const postalCode = String(customer.postalCode ?? "");
  const city = String(customer.city ?? "");
  const address = `${street}, ${postalCode} ${city}`.trim();

  const priceText = `${formatCurrency(calculation.price)} €`;
  const residualText = `${formatCurrency(calculation.residualValue)} €`;
  const rateText = `${formatCurrency(calculation.rate)} €`;
  const durationText = `${calculation.duration} Monate`;
  const factorText = Number.isFinite(Number(calculation.factor))
    ? `${String(calculation.factor).replace(".", ",")} %`
    : "-";

  const subjectText = `Neues Angebot: ${financingType} – ${company}`;

  return {
    // German variables used by the current EmailJS template
    subject: subjectText,
    betreff: subjectText,
    datum: String(datum ?? ""),
    uhrzeit: String(uhrzeit ?? ""),
    finanzierungsart: financingType,
    anrede: salutation,
    vorname: firstName,
    nachname: lastName,
    name: fullName,
    firma: company,
    strasse: street,
    plz: postalCode,
    ort: city,
    plz_ort: `${postalCode} ${city}`.trim(),
    adresse: address,
    preis: priceText,
    anschaffungspreis: priceText,
    laufzeit: durationText,
    restwert: residualText,
    leasingfaktor: factorText,
    faktor: factorText,
    rate: rateText,
    monatliche_rate: rateText,
    dateiname: String(filename ?? ""),

    // Common EmailJS aliases
    title: subjectText,
    message: `${subjectText}\n${fullName}\n${company}\n${address}\nPreis: ${priceText}\nRate: ${rateText}`,
    financing_type: financingType,
    salutation,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    company,
    street,
    postal_code: postalCode,
    city,
    address,
    price: priceText,
    duration: durationText,
    residual_value: residualText,
    factor: factorText,
    monthly_rate: rateText,
    filename: String(filename ?? ""),
    generated_date: String(datum ?? ""),
    generated_time: String(uhrzeit ?? ""),
    reply_to: "noreply@example.com",
    from_name: fullName || company || "Finanzierungsrechner",
  };
}

export async function sendTrackingEmail(payload) {
  initEmailJs();

  const { customer, calculation } = payload ?? {};
  if (!customer || !calculation?.valid) {
    throw new Error("Mailversand abgebrochen: Kundendaten oder Berechnung sind ungültig.");
  }

  const templateParams = buildTemplateParams(payload);
  try {
    const response = await getEmailJs().send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );


    if (!response || response.status < 200 || response.status >= 300) {
      throw new Error(`${response?.status ?? "?"} ${response?.text ?? ""}`.trim());
    }

    return response;
  } catch (error) {
    const text = error?.text || error?.message || String(error);
    throw new Error(`EmailJS konnte die Mail nicht senden: ${text}`);
  }
}
