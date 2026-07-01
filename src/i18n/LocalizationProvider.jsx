import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
} from "./language-config.js";
import { localize as localizeEntity, renderTemplate, translateUi } from "./localization.js";
import { EN_UI_LOCALE, UI_LOCALES } from "./ui/index.js";

const LocalizationContext = createContext(null);
const EMPTY_LOCALE_PACKS = Object.freeze({});

function readStoredLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    return normalizeLanguage(window.localStorage?.getItem?.(STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function LocalizationProvider({ children, localePacks = EMPTY_LOCALE_PACKS }) {
  const [language, setLanguageState] = useState(readStoredLanguage);

  const setLanguage = useCallback((nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLanguageState(normalized);
    try {
      window.localStorage?.setItem?.(STORAGE_KEY, normalized);
    } catch {
      // Language still updates for this session when storage is unavailable.
    }
  }, []);

  const localize = useCallback((entity, field, options = {}) => {
    const selectedLanguage = options.language ?? language;
    const loadedLocalePack = options.loadedLocalePack
      ?? localePacks?.[selectedLanguage];
    return localizeEntity(entity, field, {
      ...options,
      language: selectedLanguage,
      loadedLocalePack,
    });
  }, [language, localePacks]);

  const t = useCallback((key, params = {}) => translateUi(key, {
    selectedUiLocale: UI_LOCALES[language],
    enUiLocale: EN_UI_LOCALE,
    params,
  }), [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    localize,
    renderTemplate,
    t,
    translateUi: t,
  }), [language, localize, setLanguage, t]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used within LocalizationProvider");
  }
  return context;
}
