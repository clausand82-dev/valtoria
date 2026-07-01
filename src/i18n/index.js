export {
  DEFAULT_LANGUAGE,
  STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
} from "./language-config.js";
export { localize, renderTemplate, translateUi } from "./localization.js";
export { LocalizationProvider, useLocalization } from "./LocalizationProvider.jsx";
export { DA_UI_LOCALE, EN_UI_LOCALE, UI_LOCALES } from "./ui/index.js";
export { itemLocalizationEntity, localizeItemField, localizeItemSummary } from "./item-localization.js";
export { BEAST_DA, BEAST_EN, BEAST_LOCALES, DA_BEAST_LOCALE, EN_BEAST_LOCALE } from "./beast/index.js";
export { getMonsterCatalogEntry, getMonsterDisplayName, validateBeastLocalization } from "./beast/monster-localization.js";
