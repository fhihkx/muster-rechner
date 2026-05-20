import {
  ALLOWED_FINANCING_TYPES,
  ALLOWED_SALUTATIONS,
  INPUT_LIMITS,
} from "./config.js";

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const MULTIPLE_SPACES = /\s{2,}/g;

const FIELD_RULES = Object.freeze({
  financingType: {
    required: true,
    allowedValues: ALLOWED_FINANCING_TYPES,
  },
  salutation: {
    required: true,
    allowedValues: ALLOWED_SALUTATIONS,
  },
  firstName: {
    required: true,
    maxLength: INPUT_LIMITS.nameMaxLength,
    pattern: /^[\p{L}][\p{L}\p{M}\s.'’-]{0,49}$/u,
  },
  lastName: {
    required: true,
    maxLength: INPUT_LIMITS.nameMaxLength,
    pattern: /^[\p{L}][\p{L}\p{M}\s.'’-]{0,49}$/u,
  },
  company: {
    required: true,
    maxLength: INPUT_LIMITS.companyMaxLength,
    pattern: /^[\p{L}\p{N}][\p{L}\p{N}\p{M}\s.,&()+'’\-\/]{0,99}$/u,
  },
  street: {
    required: true,
    maxLength: INPUT_LIMITS.streetMaxLength,
    pattern: /^[\p{L}\p{N}][\p{L}\p{N}\p{M}\s.,'’\-\/]{0,149}$/u,
  },
  postalCode: {
    required: true,
    maxLength: INPUT_LIMITS.postalCodeMaxLength,
    pattern: /^[A-Za-z0-9][A-Za-z0-9\s-]{2,9}$/,
  },
  city: {
    required: true,
    maxLength: INPUT_LIMITS.cityMaxLength,
    pattern: /^[\p{L}][\p{L}\p{M}\s.'’\-]{0,99}$/u,
  },
});

export function cleanText(value, maxLength = 250) {
  return String(value ?? "")
    .replace(CONTROL_CHARS, "")
    .replace(MULTIPLE_SPACES, " ")
    .trim()
    .slice(0, maxLength);
}

export function validateField(fieldName, rawValue) {
  const rule = FIELD_RULES[fieldName];

  if (!rule) {
    return {
      valid: false,
      value: "",
      reason: "unknown_field",
    };
  }

  const value = cleanText(rawValue, rule.maxLength ?? 250);

  if (rule.required && value.length === 0) {
    return {
      valid: false,
      value,
      reason: "required",
    };
  }

  if (rule.allowedValues && !rule.allowedValues.includes(value)) {
    return {
      valid: false,
      value,
      reason: "invalid_option",
    };
  }

  if (rule.maxLength && value.length > rule.maxLength) {
    return {
      valid: false,
      value,
      reason: "too_long",
    };
  }

  if (rule.pattern && !rule.pattern.test(value)) {
    return {
      valid: false,
      value,
      reason: "invalid_format",
    };
  }

  return {
    valid: true,
    value,
    reason: null,
  };
}

export function validateContactForm(rawValues) {
  const result = {
    valid: true,
    values: {},
    errors: {},
  };

  for (const fieldName of Object.keys(FIELD_RULES)) {
    const fieldResult = validateField(fieldName, rawValues?.[fieldName]);

    result.values[fieldName] = fieldResult.value;

    if (!fieldResult.valid) {
      result.valid = false;
      result.errors[fieldName] = fieldResult.reason;
    }
  }

  return result;
}

export function getValidationMessage(reason) {
  const messages = {
    required: "Dieses Feld ist erforderlich.",
    invalid_option: "Bitte wählen Sie eine gültige Option.",
    invalid_format: "Bitte prüfen Sie das Format dieser Eingabe.",
    too_long: "Die Eingabe ist zu lang.",
    unknown_field: "Unbekanntes Formularfeld.",
  };

  return messages[reason] ?? "Bitte prüfen Sie diese Eingabe.";
}

export function hasOnlySafePdfText(value) {
  const cleaned = cleanText(value);
  return cleaned.length > 0 && !/[<>]/.test(cleaned);
}

export function makeSafeFilenamePart(value, fallback = "Kunde") {
  const cleaned = cleanText(value, 80)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || fallback;
}
