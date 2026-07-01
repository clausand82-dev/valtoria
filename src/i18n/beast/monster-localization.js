import { MONSTER_DEFS } from "../../game/config/monster-config.js";
import { BEAST_LOCALES, EN_BEAST_LOCALE } from "./index.js";

const REQUIRED_FIELDS = ["title", "text", "strengths", "weaknesses", "habitatText"];

function generatedEntry(typeName) {
  const title = String(typeName ?? "Unknown creature").trim() || "Unknown creature";
  return { title, text: "", strengths: [], weaknesses: [], habitatText: "" };
}

function normalizedEntry(entry, fallback) {
  const result = {};
  for (const field of REQUIRED_FIELDS) {
    const value = entry?.[field] ?? fallback?.[field];
    result[field] = field === "strengths" || field === "weaknesses"
      ? (Array.isArray(value) ? value : [])
      : String(value ?? "");
  }
  return result;
}

export function getMonsterCatalogEntry(typeName, language = "en") {
  const def = MONSTER_DEFS?.[typeName];
  const generated = generatedEntry(typeName);
  if (!def) return generated;
  const catalogId = String(def.catalogId ?? "").trim();
  const selected = BEAST_LOCALES?.[language]?.[catalogId];
  const english = EN_BEAST_LOCALE?.[catalogId];
  return normalizedEntry(selected, normalizedEntry(english, normalizedEntry(def.library, generated)));
}

export function getMonsterDisplayName(typeName, language = "en") {
  return getMonsterCatalogEntry(typeName, language).title || generatedEntry(typeName).title;
}

export function validateBeastLocalization({ warn = (message) => console.warn(message) } = {}) {
  const warnings = [];
  const report = (message) => {
    const fullMessage = `[beast-i18n] ${message}`;
    warnings.push(fullMessage);
    warn(fullMessage);
  };
  const catalogOwners = new Map();

  for (const [typeName, def] of Object.entries(MONSTER_DEFS ?? {})) {
    const catalogId = String(def?.catalogId ?? "").trim();
    if (!catalogId) {
      report(`MONSTER_DEFS.${typeName} is missing catalogId`);
      continue;
    }
    if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(catalogId)) report(`${typeName} has invalid catalogId "${catalogId}"`);
    if (catalogOwners.has(catalogId)) report(`duplicate catalogId "${catalogId}" used by ${catalogOwners.get(catalogId)} and ${typeName}`);
    else catalogOwners.set(catalogId, typeName);

    for (const language of ["da", "en"]) {
      const entry = BEAST_LOCALES?.[language]?.[catalogId];
      if (!entry) {
        report(`${catalogId} is missing in ${language}.js`);
        continue;
      }
      for (const field of REQUIRED_FIELDS) {
        if (entry[field] === undefined || entry[field] === null || entry[field] === "") report(`${language}.${catalogId} is missing ${field}`);
      }
      for (const field of ["strengths", "weaknesses"]) {
        if (!Array.isArray(entry[field])) report(`${language}.${catalogId}.${field} must be an array`);
        else if (entry[field].length === 0) report(`${language}.${catalogId}.${field} must not be empty`);
      }
    }
  }

  for (const [language, locale] of Object.entries(BEAST_LOCALES)) {
    for (const catalogId of Object.keys(locale ?? {})) {
      if (!catalogOwners.has(catalogId)) report(`${language}.${catalogId} does not match any MONSTER_DEFS catalogId`);
    }
  }
  return warnings;
}

if (import.meta.env?.DEV) validateBeastLocalization();
