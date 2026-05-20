/**
 * main.js — Application entry point.
 * Owns app state and wires all event listeners.
 */

import { RATE_LIMIT, DEMO_MESSAGES } from "./config.js";

import {
  calculateRate,
  formatPriceInputValue,
  getSafeResidualForDuration,
} from "./calculator.js";

import { validateContactForm } from "./validation.js";
import { canGeneratePdf, generateOfferPdf } from "./pdf.js";
import { canSendEmail, initEmailJs, sendTrackingEmail } from "./email.js?v=20260520-emailfix2";

import {
  adjustContainerHeight,
  clearFormErrors,
  goToStep,
  hideRateLimitMessage,
  initResizeObserver,
  initTabKeyboardNavigation,
  markFormErrors,
  renderCalculationResult,
  renderSummary,
  setSubmitLoading,
  showDemoContactAlert,
  showRateLimitMessage,
  showUiError,
  switchTab,
  updateResidualOptions,
} from "./ui.js";

// ─── App state ────────────────────────────────────────────────

const state = { calculation: null };

// ─── Bootstrap ────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  bindEvents();
  switchTab("calculator");
  initTabKeyboardNavigation();
  initResizeObserver();
  updateResidualSelection();
  initializeEmailService();
  adjustContainerHeight("calculator");
}

// ─── Events ───────────────────────────────────────────────────

function bindEvents() {
  document
    .getElementById("contact-demo-btn")
    ?.addEventListener("click", showDemoContactAlert);

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.getElementById("price")?.addEventListener("input", (e) => {
    e.target.value = formatPriceInputValue(e.target.value);
    resetCalculationIfNeeded();
  });

  document.getElementById("duration")?.addEventListener("change", () => {
    updateResidualSelection();
    resetCalculationIfNeeded();
  });

  document.getElementById("residual")?.addEventListener("change", resetCalculationIfNeeded);

  document.getElementById("calculate-btn")?.addEventListener("click", handleCalculate);

  document.getElementById("btn-next")?.addEventListener("click", () => {
    if (!state.calculation?.valid) {
      showUiError(DEMO_MESSAGES.invalidCalculation);
      return;
    }
    renderSummary(state.calculation);
    goToStep(2);
  });

  document.getElementById("back-btn")?.addEventListener("click", () => goToStep(1));

  document.getElementById("contact-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleFormSubmit();
  });

  document.querySelectorAll("#contact-form input, #contact-form select").forEach((field) => {
    field.addEventListener("input",  clearFormErrors);
    field.addEventListener("change", clearFormErrors);
  });

  window.addEventListener("resize", () => adjustContainerHeight(), { passive: true });
}

// ─── Handlers ─────────────────────────────────────────────────

function handleCalculate() {
  const calculation = calculateRate({
    price:    getValue("price"),
    duration: getValue("duration"),
    residual: getValue("residual"),
  });
  state.calculation = calculation;
  renderCalculationResult(calculation);
}

async function handleFormSubmit() {
  if (!state.calculation?.valid) {
    showUiError(DEMO_MESSAGES.invalidCalculation);
    goToStep(1);
    return;
  }

  const rateLimit = getRateLimitStatus();
  if (rateLimit.active) {
    showRateLimitMessage(rateLimit.timeLeftMs);
    return;
  }

  hideRateLimitMessage();

  const formValidation = validateContactForm(readContactFormValues());
  if (!formValidation.valid) {
    markFormErrors(formValidation.errors);
    showUiError(DEMO_MESSAGES.invalidForm);
    return;
  }

  if (!canGeneratePdf()) {
    showUiError(DEMO_MESSAGES.missingPdfLibrary);
    return;
  }

  setSubmitLoading(true);

  let pdfMeta = null;

  try {
    pdfMeta = generateOfferPdf({
      customer: formValidation.values,
      calculation: state.calculation,
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    showUiError(error?.message || DEMO_MESSAGES.pdfGenerationError);
    setSubmitLoading(false);
    return;
  }

  try {
    if (!canSendEmail()) {
      throw new Error(DEMO_MESSAGES.missingEmailLibrary);
    }

    await sendTrackingEmail({
      customer: formValidation.values,
      calculation: state.calculation,
      filename: pdfMeta.filename,
      datum: pdfMeta.datum,
      uhrzeit: pdfMeta.uhrzeit,
    });

    setRateLimitTimestamp();
  } catch (error) {
    console.error("Email notification failed. PDF was still generated:", error);
    showUiError(`Das PDF wurde erstellt, aber die E-Mail konnte nicht versendet werden. Technischer Fehler: ${error?.message || "unbekannt"}`);
  } finally {
    setSubmitLoading(false);
  }
}

// ─── Utilities ────────────────────────────────────────────────

function initializeEmailService() {
  try {
    if (canSendEmail()) initEmailJs();
  } catch (error) {
    console.warn("[main] EmailJS initialization failed:", error);
  }
}

function updateResidualSelection() {
  const duration = getValue("duration");
  const residual = getValue("residual");
  const safe     = getSafeResidualForDuration(duration, residual);
  updateResidualOptions(duration, safe);
}

function readContactFormValues() {
  return {
    financingType: getValue("form-finanzierungsart"),
    salutation:    getValue("form-anrede"),
    firstName:     getValue("form-vorname"),
    lastName:      getValue("form-nachname"),
    company:       getValue("form-firma"),
    street:        getValue("form-strasse"),
    postalCode:    getValue("form-plz"),
    city:          getValue("form-ort"),
  };
}

function resetCalculationIfNeeded() {
  state.calculation = null;
  const nextBtn  = document.getElementById("btn-next");
  const resultEl = document.getElementById("result-display");
  if (nextBtn)  nextBtn.disabled = true;
  if (resultEl) resultEl.textContent = "0,00";
}

function getRateLimitStatus() {
  try {
    const stored = Number.parseInt(localStorage.getItem(RATE_LIMIT.storageKey) || "", 10);
    if (!Number.isFinite(stored)) return { active: false, timeLeftMs: 0 };
    const timeLeftMs = RATE_LIMIT.cooldownMs - (Date.now() - stored);
    return { active: timeLeftMs > 0, timeLeftMs: Math.max(timeLeftMs, 0) };
  } catch {
    return { active: false, timeLeftMs: 0 };
  }
}

function setRateLimitTimestamp() {
  try {
    localStorage.setItem(RATE_LIMIT.storageKey, String(Date.now()));
  } catch { /* Storage unavailable — no-op */ }
}

function getValue(id) {
  return document.getElementById(id)?.value?.trim() ?? "";
}
