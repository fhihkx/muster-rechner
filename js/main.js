import { RATE_LIMIT, DEMO_MESSAGES } from "./config.js";

import {
  calculateRate,
  formatPriceInputValue,
  getSafeResidualForDuration,
} from "./calculator.js";

import { validateContactForm } from "./validation.js";
import { canGeneratePdf, generateOfferPdf } from "./pdf.js";

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

const state = {
  calculation: null,
};

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  bindEvents();

  switchTab("calculator");
  initTabKeyboardNavigation();
  initResizeObserver();

  updateResidualSelection();
  adjustContainerHeight("calculator");
}

function bindEvents() {
  document
    .getElementById("contact-demo-btn")
    ?.addEventListener("click", showDemoContactAlert);

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab);
    });
  });

  document.getElementById("price")?.addEventListener("input", (event) => {
    event.target.value = formatPriceInputValue(event.target.value);
    resetCalculationIfNeeded();
  });

  document.getElementById("duration")?.addEventListener("change", () => {
    updateResidualSelection();
    resetCalculationIfNeeded();
  });

  document.getElementById("residual")?.addEventListener("change", () => {
    resetCalculationIfNeeded();
  });

  document
    .getElementById("calculate-btn")
    ?.addEventListener("click", handleCalculate);

  document.getElementById("btn-next")?.addEventListener("click", () => {
    if (!state.calculation?.valid) {
      showUiError(DEMO_MESSAGES.invalidCalculation);
      return;
    }

    renderSummary(state.calculation);
    goToStep(2);
  });

  document.getElementById("back-btn")?.addEventListener("click", () => {
    goToStep(1);
  });

  document.getElementById("contact-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleFormSubmit();
  });

  document.querySelectorAll("#contact-form input, #contact-form select").forEach((field) => {
    field.addEventListener("input", clearFormErrors);
    field.addEventListener("change", clearFormErrors);
  });

  window.addEventListener("resize", () => {
    adjustContainerHeight();
  });
}

function updateResidualSelection() {
  const duration = getValue("duration");
  const residual = getValue("residual");

  const safeResidual = getSafeResidualForDuration(duration, residual);
  updateResidualOptions(duration, safeResidual);
}

function handleCalculate() {
  const calculation = calculateRate({
    price: getValue("price"),
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

  try {
    setSubmitLoading(true);
    setRateLimitTimestamp();

    generateOfferPdf({
      customer: formValidation.values,
      calculation: state.calculation,
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    showUiError(error?.message || DEMO_MESSAGES.pdfGenerationError);
  } finally {
    setSubmitLoading(false);
  }
}

function readContactFormValues() {
  return {
    financingType: getValue("form-finanzierungsart"),
    salutation: getValue("form-anrede"),
    firstName: getValue("form-vorname"),
    lastName: getValue("form-nachname"),
    company: getValue("form-firma"),
    street: getValue("form-strasse"),
    postalCode: getValue("form-plz"),
    city: getValue("form-ort"),
  };
}

function resetCalculationIfNeeded() {
  const nextButton = document.getElementById("btn-next");

  state.calculation = null;

  if (nextButton) {
    nextButton.disabled = true;
  }

  const resultDisplay = document.getElementById("result-display");
  if (resultDisplay) {
    resultDisplay.textContent = "0,00";
  }
}

function getRateLimitStatus() {
  const lastSubmit = Number.parseInt(
    localStorage.getItem(RATE_LIMIT.storageKey) || "",
    10
  );

  if (!Number.isFinite(lastSubmit)) {
    return {
      active: false,
      timeLeftMs: 0,
    };
  }

  const elapsed = Date.now() - lastSubmit;
  const timeLeftMs = RATE_LIMIT.cooldownMs - elapsed;

  return {
    active: timeLeftMs > 0,
    timeLeftMs: Math.max(timeLeftMs, 0),
  };
}

function setRateLimitTimestamp() {
  localStorage.setItem(RATE_LIMIT.storageKey, String(Date.now()));
}

function getValue(id) {
  return document.getElementById(id)?.value?.trim() ?? "";
}
