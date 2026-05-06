import {
  ALLOWED_DURATIONS,
  ALLOWED_RESIDUALS,
  FINANCING_FACTORS,
  INPUT_LIMITS,
} from "./config.js";

const DECIMAL_SEPARATOR = ",";
const THOUSANDS_SEPARATOR = ".";

export function normalizeDecimalInput(value) {
  return String(value ?? "")
    .replace(/\./g, "")
    .replace(/[^\d,]/g, "")
    .replace(/,{2,}/g, ",");
}

export function formatPriceInputValue(value) {
  const normalized = normalizeDecimalInput(value);
  const [rawInteger = "", ...decimalParts] = normalized.split(DECIMAL_SEPARATOR);

  const integerPart = rawInteger.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  const decimalPart = decimalParts.join("").slice(0, 2);

  return decimalParts.length > 0
    ? `${integerPart}${DECIMAL_SEPARATOR}${decimalPart}`
    : integerPart;
}

export function parseGermanNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0,00";
  }

  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

export function isAllowedDuration(duration) {
  return ALLOWED_DURATIONS.includes(String(duration));
}

export function isAllowedResidual(residual) {
  return ALLOWED_RESIDUALS.includes(String(residual));
}

export function getFinancingFactor(residual, duration) {
  const residualKey = String(residual);
  const durationKey = String(duration);

  if (!isAllowedResidual(residualKey) || !isAllowedDuration(durationKey)) {
    return null;
  }

  return FINANCING_FACTORS[residualKey]?.[durationKey] ?? null;
}

export function isCombinationAvailable(residual, duration) {
  return getFinancingFactor(residual, duration) !== null;
}

export function getAvailableResidualsForDuration(duration) {
  const durationKey = String(duration);

  if (!isAllowedDuration(durationKey)) {
    return [];
  }

  return ALLOWED_RESIDUALS.filter((residual) =>
    isCombinationAvailable(residual, durationKey)
  );
}

export function getSafeResidualForDuration(duration, currentResidual) {
  const availableResiduals = getAvailableResidualsForDuration(duration);

  if (availableResiduals.includes(String(currentResidual))) {
    return String(currentResidual);
  }

  return availableResiduals[0] ?? "";
}

export function validatePrice(price) {
  const parsedPrice = parseGermanNumber(price);

  if (parsedPrice === null) {
    return {
      valid: false,
      value: null,
      reason: "invalid_number",
    };
  }

  if (parsedPrice < INPUT_LIMITS.priceMin) {
    return {
      valid: false,
      value: parsedPrice,
      reason: "below_minimum",
    };
  }

  if (parsedPrice > INPUT_LIMITS.priceMax) {
    return {
      valid: false,
      value: parsedPrice,
      reason: "above_maximum",
    };
  }

  return {
    valid: true,
    value: parsedPrice,
    reason: null,
  };
}

export function calculateRate({ price, duration, residual }) {
  const priceValidation = validatePrice(price);
  const durationKey = String(duration ?? "");
  const residualKey = String(residual ?? "");
  const factor = getFinancingFactor(residualKey, durationKey);

  if (!priceValidation.valid) {
    return {
      valid: false,
      reason: priceValidation.reason,
      price: priceValidation.value,
      duration: durationKey,
      residual: residualKey,
      factor,
      rate: null,
      residualValue: null,
    };
  }

  if (!isAllowedDuration(durationKey)) {
    return {
      valid: false,
      reason: "invalid_duration",
      price: priceValidation.value,
      duration: durationKey,
      residual: residualKey,
      factor,
      rate: null,
      residualValue: null,
    };
  }

  if (!isAllowedResidual(residualKey)) {
    return {
      valid: false,
      reason: "invalid_residual",
      price: priceValidation.value,
      duration: durationKey,
      residual: residualKey,
      factor,
      rate: null,
      residualValue: null,
    };
  }

  if (factor === null) {
    return {
      valid: false,
      reason: "unavailable_combination",
      price: priceValidation.value,
      duration: durationKey,
      residual: residualKey,
      factor,
      rate: null,
      residualValue: null,
    };
  }

  const rate = roundMoney(priceValidation.value * (factor / 100));
  const residualValue = roundMoney(priceValidation.value * (Number(residualKey) / 100));

  return {
    valid: true,
    reason: null,
    price: priceValidation.value,
    duration: durationKey,
    residual: residualKey,
    factor,
    rate,
    residualValue,
  };
}

export function formatFactor(factor) {
  if (!Number.isFinite(Number(factor))) {
    return "- %";
  }

  return String(factor).replace(".", ",") + " %";
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
