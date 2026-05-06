export const FINANCING_FACTORS = Object.freeze({
  15: Object.freeze({ 36: 2.93, 48: 2.27, 54: null, 60: null }),
  10: Object.freeze({ 36: 3.06, 48: 2.36, 54: 2.13, 60: null }),
  5: Object.freeze({ 36: null, 48: 2.45, 54: 2.22, 60: 2.02 }),
});

export const ALLOWED_DURATIONS = Object.freeze(["36", "48", "54", "60"]);
export const ALLOWED_RESIDUALS = Object.freeze(["5", "10", "15"]);
export const ALLOWED_FINANCING_TYPES = Object.freeze(["Leasing", "Mietkauf"]);
export const ALLOWED_SALUTATIONS = Object.freeze(["Frau", "Herr"]);

export const INPUT_LIMITS = Object.freeze({
  priceMaxLength: 15,
  priceMin: 1,
  priceMax: 9_999_999.99,

  nameMaxLength: 50,
  companyMaxLength: 100,
  streetMaxLength: 150,
  postalCodeMaxLength: 10,
  cityMaxLength: 100,
});

export const RATE_LIMIT = Object.freeze({
  cooldownMs: 3_000,
  storageKey: "whitelabel_last_submission",
});

export const DEMO_MESSAGES = Object.freeze({
  contactButton:
    "In der Live-Version führt dieser Button zu Ihrer Kontaktseite.",

  unavailableCombination:
    "Diese Kombination ist aktuell nicht verfügbar.",

  pdfGenerationError:
    "Es ist ein Fehler bei der PDF-Generierung aufgetreten. Bitte versuchen Sie es erneut.",

  missingPdfLibrary:
    "Die PDF-Bibliothek konnte nicht geladen werden. Bitte prüfen Sie Ihre Verbindung oder den CDN-Zugriff.",

  invalidCalculation:
    "Bitte berechnen Sie zuerst eine gültige Rate.",

  invalidForm:
    "Bitte prüfen Sie Ihre Eingaben.",
});

export const BRAND = Object.freeze({
  primary: "#032659",
  secondary: "#64748B",
  white: "#FFFFFF",

  logo: Object.freeze({
    companyBold: "MUSTER",
    companyLight: "LOGO",
    pdfWidth: 300,
    pdfHeight: 80,
  }),
});

export const PDF_COMPANY = Object.freeze({
  name: "Musterfirma GmbH",
  street: "Musterstraße 1",
  postalCity: "12345 Musterstadt",

  managingDirector: "Geschäftsführer: Max Mustermann",
  registry: "Amtsgericht Musterstadt HRB 12345",
  vatId: "Ust-IdNr. DE 123456789",

  phone: "Fon (+49) 123 / 456-789",
  email: "info@musterfirma.de",
  website: "www.musterfirma.de",

  bankNames: Object.freeze(["Musterbank 1", "Musterbank 2"]),
  ibans: Object.freeze([
    "IBAN DE55 2151 0800 1000 6859 59",
    "IBAN DE33 2004 0000 0630 1527 00",
  ]),
  bics: Object.freeze(["MBANKDE22", "MBANKDEFF"]),
});

export const PDF_TEXT = Object.freeze({
  subjectPrefix: "Finanzierungsangebot",
  intro:
    "vielen Dank für das entgegengebrachte Vertrauen! Wie folgt bieten wir Ihnen unverbindlich an:",

  netPriceNotice:
    "Die oben genannten Preise verstehen sich netto, zuzüglich der gesetzlichen Mehrwertsteuer.",

  closing: Object.freeze([
    "Wir freuen uns, für Sie tätig werden zu können und sichern Ihnen bereits jetzt eine faire, schnelle",
    "und unbürokratische Abwicklung zu.",
  ]),

  greeting: "Mit freundlichen Grüßen,",

  mietkaufVatNotice:
    "Hinweis: Die gesetzl. Mehrwertsteuer fällt vorab auf die Summe aller Zahlungen an.",
});

export const PDF_LAYOUT = Object.freeze({
  page: Object.freeze({
    left: 20,
    right: 190,
    footerY: 270,
  }),

  logo: Object.freeze({
    xRight: 190,
    y: 20,
    maxWidth: 45,
    maxHeight: 12,
  }),

  addressY: 45,
  dateY: 60,
  subjectY: 80,
  salutationY: 95,
  introY: 105,
  tableStartY: 120,
  rowHeight: 7,
});
