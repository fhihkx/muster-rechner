import { DEMO_MESSAGES } from "./config.js";
import { formatCurrency } from "./calculator.js";

export function switchTab(tabId) {
  const targetView = document.getElementById(`view-${tabId}`);
  const targetTab = document.getElementById(`tab-${tabId}`);

  if (!targetView || !targetTab) return;

  document.querySelectorAll(".tab-btn").forEach((tab) => {
    const active = tab === targetTab;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  document.querySelectorAll(".view-content").forEach((view) => {
    const active = view === targetView;

    view.classList.toggle("active-view", active);
    view.classList.toggle("hidden-view", !active);

    view.hidden = !active;
    view.setAttribute("aria-hidden", String(!active));

    if (active) {
      view.removeAttribute("inert");
    } else {
      view.setAttribute("inert", "");
    }
  });
}

export function goToStep(step) {
  const step1 = document.getElementById("calc-step-1");
  const step2 = document.getElementById("calc-step-2");

  const showStep2 = Number(step) === 2;

  step1.classList.toggle("active-step", !showStep2);
  step1.classList.toggle("hidden-step", showStep2);

  step2.classList.toggle("active-step", showStep2);
  step2.classList.toggle("hidden-step", !showStep2);

  if (showStep2) {
    window.scrollTo({
      top: Math.max(document.getElementById("content-container").offsetTop - 100, 0),
      behavior: "smooth",
    });
  }
}

export function renderCalculationResult(calculation) {
  const result = document.getElementById("result-display");
  const next = document.getElementById("btn-next");
  const errorBox = document.getElementById("error-msg");
  const errorText = document.getElementById("error-text");

  if (!result || !next) return;

  if (!calculation.valid) {
    result.textContent = calculation.reason === "unavailable_combination" ? "—" : "0,00";
    next.disabled = true;

    if (calculation.reason === "unavailable_combination") {
      errorText.textContent = `Diese Kombination (${calculation.duration} Monate / ${calculation.residual}%) ist aktuell nicht verfügbar.`;
      errorBox.classList.remove("hidden");
    } else {
      errorBox.classList.add("hidden");
    }

    return;
  }

  errorBox.classList.add("hidden");
  result.textContent = formatCurrency(calculation.rate);
  next.disabled = false;
}

export function renderSummary(calculation) {
  setText("summary-price", `${formatCurrency(calculation.price)} €`);
  setText("summary-duration", calculation.duration);
  setText("summary-residual-euro", `${formatCurrency(calculation.residualValue)} €`);
  setText(
    "summary-leasing-factor",
    `${String(calculation.factor).replace(".", ",")} %`
  );
  setText("summary-rate", formatCurrency(calculation.rate));
}

export function markFormErrors(errors = {}) {
  clearFormErrors();

  const ids = {
    financingType: "form-finanzierungsart",
    salutation: "form-anrede",
    firstName: "form-vorname",
    lastName: "form-nachname",
    company: "form-firma",
    street: "form-strasse",
    postalCode: "form-plz",
    city: "form-ort",
  };

  Object.keys(errors).forEach((key) => {
    const el = document.getElementById(ids[key]);
    if (el) el.classList.add("input-error");
  });
}

export function clearFormErrors() {
  document.querySelectorAll(".input-error").forEach((el) => {
    el.classList.remove("input-error");
  });
}

export function showDemoContactAlert() {
  alert(DEMO_MESSAGES.contactButton);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
