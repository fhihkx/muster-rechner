import { DEMO_MESSAGES } from "./config.js";
import { formatCurrency } from "./calculator.js";

let resizeObserver = null;

const VIEW_TRANSITION_MS = 400;

export function initResizeObserver() {
  const container = getElement("content-container");
  if (!container || resizeObserver) return;

  resizeObserver = new ResizeObserver(() => {
    adjustContainerHeight();
  });

  getAll(".view-content").forEach((view) => {
    resizeObserver.observe(view);
  });

  adjustContainerHeight();
}

export function adjustContainerHeight(tabId = null) {
  const container = getElement("content-container");
  const activeView = tabId
    ? getElement(`view-${tabId}`)
    : document.querySelector(".view-content.active-view");

  if (!container || !activeView) return;

  requestAnimationFrame(() => {
    container.style.height = `${activeView.scrollHeight}px`;
  });
}

export function switchTab(tabId) {
  const targetView = getElement(`view-${tabId}`);
  const targetTab = getElement(`tab-${tabId}`);

  if (!targetView || !targetTab) return;

  getAll(".tab-btn").forEach((tab) => {
    const isActive = tab === targetTab;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  getAll(".view-content").forEach((view) => {
    const isActive = view === targetView;

    view.classList.toggle("active-view", isActive);
    view.classList.toggle("hidden-view", !isActive);

    view.hidden = !isActive;
    view.setAttribute("aria-hidden", String(!isActive));

    if (isActive) {
      view.removeAttribute("inert");
    } else {
      view.setAttribute("inert", "");
    }
  });

  requestAnimationFrame(() => adjustContainerHeight(tabId));
}

export function initTabKeyboardNavigation() {
  const tabs = getAll(".tab-btn");

  tabs.forEach((tab, index) => {
    tab.addEventListener("keydown", (event) => {
      const nextIndex = getNextTabIndex(event.key, index, tabs.length);

      if (nextIndex === null) return;

      event.preventDefault();
      tabs[nextIndex].focus();
      switchTab(tabs[nextIndex].dataset.tab);
    });
  });
}

function getNextTabIndex(key, currentIndex, count) {
  if (key === "ArrowRight") return (currentIndex + 1) % count;
  if (key === "ArrowLeft") return (currentIndex - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;

  return null;
}

export function goToStep(step) {
  const step1 = getElement("calc-step-1");
  const step2 = getElement("calc-step-2");

  if (!step1 || !step2) return;

  const showStep2 = Number(step) === 2;

  step1.classList.toggle("active-step", !showStep2);
  step1.classList.toggle("hidden-step", showStep2);

  step2.classList.toggle("hidden-step", !showStep2);
  step2.classList.toggle("active-step", showStep2);

  requestAnimationFrame(() => adjustContainerHeight("calculator"));

  setTimeout(() => adjustContainerHeight("calculator"), VIEW_TRANSITION_MS);

  if (showStep2) {
    scrollCalculatorIntoView();
  }
}

function scrollCalculatorIntoView() {
  const container = getElement("content-container");
  if (!container) return;

  window.scrollTo({
    top: Math.max(container.offsetTop - 100, 0),
    behavior: "smooth",
  });
}

export function renderCalculationResult(calculation) {
  const resultDisplay = getElement("result-display");
  const nextButton = getElement("btn-next");

  if (!resultDisplay || !nextButton) return;

  if (!calculation.valid) {
    if (calculation.reason === "unavailable_combination") {
      resultDisplay.textContent = "—";
      showError(
        `Diese Kombination (${calculation.duration} Monate / ${calculation.residual}%) ist aktuell nicht verfügbar.`
      );
    } else {
      resultDisplay.textContent = "0,00";
      hideError();
    }

    nextButton.disabled = true;
    adjustContainerHeight("calculator");
    return;
  }

  hideError();

  const currentValue = parseDisplayedCurrency(resultDisplay.textContent);
  animateNumber(resultDisplay, currentValue, calculation.rate, 400);

  nextButton.disabled = false;
  adjustContainerHeight("calculator");
}

export function renderSummary(calculation) {
  setText("summary-price", `${formatCurrency(calculation.price)} €`);
  setText("summary-duration", calculation.duration);
  setText("summary-residual-euro", `${formatCurrency(calculation.residualValue)} €`);
  setText(
    "summary-leasing-factor",
    Number.isFinite(Number(calculation.factor))
      ? `${String(calculation.factor).replace(".", ",")} %`
      : "- %"
  );
  setText("summary-rate", formatCurrency(calculation.rate));
}

export function showError(message = DEMO_MESSAGES.unavailableCombination) {
  setText("error-text", message);

  const errorBox = getElement("error-msg");
  if (errorBox) errorBox.classList.remove("hidden");
}

export function hideError() {
  const errorBox = getElement("error-msg");
  if (errorBox) errorBox.classList.add("hidden");
}

export function showRateLimitMessage(timeLeftMs) {
  const message = getElement("rate-limit-msg");
  const submitButton = getElement("submit-btn");

  if (!message || !submitButton) return;

  message.classList.remove("hidden");
  setButtonDisabled(submitButton, true);
  adjustContainerHeight("calculator");

  window.setTimeout(() => {
    message.classList.add("hidden");
    setButtonDisabled(submitButton, false);
    adjustContainerHeight("calculator");
  }, Math.max(Number(timeLeftMs) || 0, 0));
}

export function hideRateLimitMessage() {
  const message = getElement("rate-limit-msg");
  if (message) message.classList.add("hidden");
}

export function setSubmitLoading(isLoading) {
  const submitButton = getElement("submit-btn");
  if (!submitButton) return;

  if (isLoading) {
    submitButton.dataset.originalHtml = submitButton.innerHTML;
    submitButton.innerHTML =
      '<span>Angebot wird erstellt...</span> <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>';
    setButtonDisabled(submitButton, true);
    return;
  }

  submitButton.innerHTML =
    submitButton.dataset.originalHtml ||
    '<span>PDF-Angebot generieren</span><i class="fa-solid fa-file-pdf" aria-hidden="true"></i>';

  delete submitButton.dataset.originalHtml;
  setButtonDisabled(submitButton, false);
}

export function setButtonDisabled(button, disabled) {
  if (!button) return;

  button.disabled = Boolean(disabled);
  button.classList.toggle("opacity-50", Boolean(disabled));
  button.classList.toggle("cursor-not-allowed", Boolean(disabled));
}

export function markFormErrors(errors = {}) {
  clearFormErrors();

  const fieldIdMap = {
    financingType: "form-finanzierungsart",
    salutation: "form-anrede",
    firstName: "form-vorname",
    lastName: "form-nachname",
    company: "form-firma",
    street: "form-strasse",
    postalCode: "form-plz",
    city: "form-ort",
  };

  for (const [fieldName] of Object.entries(errors)) {
    const input = getElement(fieldIdMap[fieldName]);
    if (!input) continue;

    input.classList.add("input-error");
    input.setAttribute("aria-invalid", "true");
  }

  const firstInvalid = document.querySelector(".input-error");
  if (firstInvalid) firstInvalid.focus();
}

export function clearFormErrors() {
  getAll(".input-error").forEach((input) => {
    input.classList.remove("input-error");
    input.removeAttribute("aria-invalid");
  });
}

export function updateResidualOptions(duration, selectedResidual) {
  const select = getElement("residual");
  if (!select) return "";

  const allowed = getAllowedResidualValues(duration);

  getAll("#residual option").forEach((option) => {
    if (!option.value) return;

    const isAllowed = allowed.includes(option.value);

    option.hidden = !isAllowed;
    option.disabled = !isAllowed;
    option.style.display = isAllowed ? "" : "none";
  });

  const safeResidual = allowed.includes(selectedResidual)
    ? selectedResidual
    : allowed[0] ?? "";

  select.value = safeResidual;
  return safeResidual;
}

function getAllowedResidualValues(duration) {
  const rules = {
    36: ["10", "15"],
    48: ["5", "10", "15"],
    54: ["5", "10"],
    60: ["5"],
  };

  return rules[String(duration)] ?? ["5", "10", "15"];
}

export function showDemoContactAlert() {
  window.alert(DEMO_MESSAGES.contactButton);
}

export function showUiError(message) {
  window.alert(message || DEMO_MESSAGES.pdfGenerationError);
}

export function animateNumber(element, start, end, duration = 400) {
  let startTimestamp = null;

  const safeStart = Number.isFinite(Number(start)) ? Number(start) : 0;
  const safeEnd = Number.isFinite(Number(end)) ? Number(end) : 0;
  const safeDuration = Math.max(Number(duration) || 0, 1);

  element.classList.remove("animate-number-pop");
  void element.offsetWidth;
  element.classList.add("animate-number-pop");

  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;

    const progress = Math.min((timestamp - startTimestamp) / safeDuration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = safeStart + (safeEnd - safeStart) * eased;

    element.textContent = formatCurrency(current);

    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = formatCurrency(safeEnd);
    }
  };

  window.requestAnimationFrame(step);
}

function parseDisplayedCurrency(value) {
  const normalized = String(value ?? "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : 0;
}

function setText(id, value) {
  const element = getElement(id);
  if (element) element.textContent = String(value ?? "");
}

function getElement(id) {
  return document.getElementById(id);
}

function getAll(selector) {
  return Array.from(document.querySelectorAll(selector));
}
