import { DEFAULT_LANGUAGE } from "./language-config.js";

const warnedMissingPlaceholders = new Set();
const warnedMissingUiKeys = new Set();

function isDevelopment() {
  return Boolean(import.meta.env?.DEV);
}

function fieldValue(source, field) {
  const value = source?.[field];
  return value == null ? undefined : value;
}

export function localize(entity, field, options = {}) {
  if (!entity || !field) return "";

  const language = options.language ?? DEFAULT_LANGUAGE;
  const externalValue = entity.id == null
    ? undefined
    : fieldValue(options.loadedLocalePack?.[entity.id], field);
  const inlineValue = fieldValue(entity.i18n?.[language], field);
  const baseValue = fieldValue(entity, field);

  return externalValue ?? inlineValue ?? baseValue ?? "";
}

export function renderTemplate(template, params = {}) {
  if (template == null) return "";
  const values = params && typeof params === "object" ? params : {};

  return String(template).replace(/\{([^{}]+)\}/g, (placeholder, name) => {
    if (Object.hasOwn(values, name) && values[name] != null) {
      return String(values[name]);
    }

    if (isDevelopment() && !warnedMissingPlaceholders.has(name)) {
      warnedMissingPlaceholders.add(name);
      console.warn(`[i18n] Missing template parameter: ${name}`);
    }
    return placeholder;
  });
}

export function translateUi(key, options = {}) {
  const normalizedKey = String(key ?? "");
  if (!normalizedKey) return "";
  const selectedValue = options.selectedUiLocale?.[normalizedKey];
  const englishValue = options.enUiLocale?.[normalizedKey];
  const template = selectedValue ?? englishValue;

  if (template == null) {
    if (isDevelopment() && !warnedMissingUiKeys.has(normalizedKey)) {
      warnedMissingUiKeys.add(normalizedKey);
      console.warn(`[i18n] Missing UI translation key: ${normalizedKey}`);
    }
    return normalizedKey;
  }

  return renderTemplate(template, options.params);
}
