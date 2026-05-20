import { calculateRate, formatPriceInputValue } from './calculator.js';
import { validateContactForm } from './validation.js';
import { generateOfferPdf } from './pdf.js';
import { initEmailService, sendOfferEmail } from './email.js';

import {
  switchTab,
  renderCalculationResult,
  renderSummary,
  goToStep,
  markFormErrors,
  clearFormErrors,
  showDemoContactAlert,
} from './ui.js';

const state = {
  calculation: null,
};

window.addEventListener('DOMContentLoaded', init);

function init() {
  initEmailService();

  bindTabs();
  bindCalculator();
  bindForm();

  document
    .getElementById('contact-demo-btn')
    ?.addEventListener('click', showDemoContactAlert);
}

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });
}

function bindCalculator() {
  const priceInput = document.getElementById('price');
  const calculateBtn = document.getElementById('calculate-btn');
  const nextBtn = document.getElementById('btn-next');

  priceInput?.addEventListener('input', (event) => {
    event.target.value = formatPriceInputValue(event.target.value);
  });

  calculateBtn?.addEventListener('click', () => {
    const calculation = calculateRate({
      price: document.getElementById('price')?.value,
      duration: document.getElementById('duration')?.value,
      residual: document.getElementById('residual')?.value,
    });

    state.calculation = calculation;

    renderCalculationResult(calculation);
  });

  nextBtn?.addEventListener('click', () => {
    if (!state.calculation?.valid) return;

    renderSummary(state.calculation);
    goToStep(2);
  });

  document
    .getElementById('back-btn')
    ?.addEventListener('click', () => {
      goToStep(1);
    });
}

function bindForm() {
  const form = document.getElementById('contact-form');

  document.querySelectorAll('#contact-form input, #contact-form select')
    .forEach((field) => {
      field.addEventListener('input', clearFormErrors);
      field.addEventListener('change', clearFormErrors);
    });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!state.calculation?.valid) return;

    const honeypot = form.querySelector('[name="website"]')?.value;

    if (honeypot) {
      console.warn('Bot erkannt.');
      return;
    }

    const formValues = {
      financingType: value('form-finanzierungsart'),
      salutation: value('form-anrede'),
      firstName: value('form-vorname'),
      lastName: value('form-nachname'),
      company: value('form-firma'),
      street: value('form-strasse'),
      postalCode: value('form-plz'),
      city: value('form-ort'),
    };

    const validation = validateContactForm(formValues);

    if (!validation.valid) {
      markFormErrors(validation.errors);
      return;
    }

    try {
      generateOfferPdf({
        customer: validation.values,
        calculation: state.calculation,
      });

      try {
        await sendOfferEmail({
          customer: validation.values,
          calculation: state.calculation,
        });
      } catch (emailError) {
        console.warn('[EmailJS] Mailversand fehlgeschlagen:', emailError);
      }

    } catch (error) {
      console.error('PDF Fehler:', error);
    }
  });
}

function value(id) {
  return document.getElementById(id)?.value?.trim() || '';
}
