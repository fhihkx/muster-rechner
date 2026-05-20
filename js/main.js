import { calculateRate, formatPriceInputValue, getSafeResidualForDuration } from "./calculator.js";
import { validateContactForm } from "./validation.js";
import { generateOfferPdf } from "./pdf.js";
import { initEmailService, sendOfferEmail } from "./email.js";
import {
  switchTab,
  initTabKeyboardNavigation,
  goToStep,
  renderCalculationResult,
  renderSummary,
  updateResidualOptions,
  markFormErrors,
  clearFormErrors,
  setSubmitLoading,
  showDemoContactAlert,
  showPdfError,
} from "./ui.js";

const state = {
  calculation: null,
};

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  initEmailService();
  bindTabs();
  bindCalculator();
  bindForm();

  document.getElementById("contact-demo-btn")?.addEventListener("click", showDemoContactAlert);

  updateResidualSelection();
  initTabKeyboardNavigation();
  switchTab("calculator");
}

function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.tab;
      if (tabId) switchTab(tabId);
    });
  });
}

function bindCalculator() {
  const priceInput = document.getElementById("price");
  const calculateButton = document.getElementById("calculate-btn");
  const nextButton = document.getElementById("btn-next");
  const backButton = document.getElementById("back-btn");

  priceInput?.addEventListener("input", (event) => {
    event.target.value = formatPriceInputValue(event.target.value);
    resetCalculation();
  });

  document.getElementById("duration")?.addEventListener("change", () => {
    updateResidualSelection();
    resetCalculation();
  });

  document.getElementById("residual")?.addEventListener("change", resetCalculation);

  calculateButton?.addEventListener("click", () => {
    const calculation = calculateRate({
      price: getValue("price"),
      duration: getValue("duration"),
      residual: getValue("residual"),
    });
    state.calculation = calculation;
    renderCalculationResult(calculation);
  });

  nextButton?.addEventListener("click", () => {
    if (!state.calculation?.valid) return;
    renderSummary(state.calculation);
    goToStep(2);
  });

  backButton?.addEventListener("click", () => goToStep(1));
}

function bindForm() {
  const form = document.getElementById("contact-form");

  document.querySelectorAll("#contact-form input, #contact-form select").forEach((field) => {
    field.addEventListener("input", clearFormErrors);
    field.addEventListener("change", clearFormErrors);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.calculation?.valid) return;

    const honeypot = form.querySelector('[name="website"]')?.value?.trim();
    if (honeypot) return;

    const validation = validateContactForm({
      financingType: getValue("form-finanzierungsart"),
      salutation: getValue("form-anrede"),
      firstName: getValue("form-vorname"),
      lastName: getValue("form-nachname"),
      company: getValue("form-firma"),
      street: getValue("form-strasse"),
      postalCode: getValue("form-plz"),
      city: getValue("form-ort"),
    });

    if (!validation.valid) {
      markFormErrors(validation.errors);
      return;
    }

    setSubmitLoading(true);
    try {
      generateOfferPdf({ customer: validation.values, calculation: state.calculation });

      // Mailversand läuft unsichtbar für den Nutzer. Fehler werden nur intern geloggt.
      try {
        await sendOfferEmail({ customer: validation.values, calculation: state.calculation });
      } catch (emailError) {
        console.warn("[EmailJS] Mailversand fehlgeschlagen:", emailError);
      }
    } catch (pdfError) {
      console.error("[PDF] Erstellung fehlgeschlagen:", pdfError);
      showPdfError();
    } finally {
      setSubmitLoading(false);
    }
  });
}

function updateResidualSelection() {
  const duration = getValue("duration");
  const residual = getValue("residual");
  const safeResidual = getSafeResidualForDuration(duration, residual);
  updateResidualOptions(duration, safeResidual);
}

function resetCalculation() {
  state.calculation = null;
  const result = document.getElementById("result-display");
  const next = document.getElementById("btn-next");
  const errorBox = document.getElementById("error-msg");
  if (result) result.textContent = "0,00";
  if (next) next.disabled = true;
  if (errorBox) errorBox.classList.add("hidden");
}

function getValue(id) {
  return document.getElementById(id)?.value?.trim() ?? "";
}
