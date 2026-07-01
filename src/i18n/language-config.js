export const SUPPORTED_LANGUAGES = Object.freeze({
  en: Object.freeze({ id: "en", label: "English" }),
  da: Object.freeze({ id: "da", label: "Dansk" }),
});

export const DEFAULT_LANGUAGE = "en";
export const STORAGE_KEY = "valtoria_language";

export function normalizeLanguage(language) {
  return Object.hasOwn(SUPPORTED_LANGUAGES, language)
    ? language
    : DEFAULT_LANGUAGE;
}
