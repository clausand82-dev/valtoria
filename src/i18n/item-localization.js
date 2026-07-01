import { NAMED_ITEM_TEMPLATES, UNIQUE_ITEMS } from "../game/config/item-config.js";
import { RESOURCE_DEFS } from "../game/config/resource-config.js";
import { potionDefById } from "../game/config/potion-config.js";

const UNIQUE_ITEM_BY_ID = new Map(UNIQUE_ITEMS.map((item) => [String(item.id), item]));
const NAMED_ITEM_BY_ID = new Map(NAMED_ITEM_TEMPLATES.map((item) => [String(item.id), item]));

export function itemLocalizationEntity(item) {
  if (item?.resourceId) return RESOURCE_DEFS[String(item.resourceId)] ?? item;
  if (item?.potionId || item?.potionType) return potionDefById(item.potionId ?? item.potionType) ?? item;
  if (item?.uniqueId) return UNIQUE_ITEM_BY_ID.get(String(item.uniqueId)) ?? item;
  if (item?.namedId) return NAMED_ITEM_BY_ID.get(String(item.namedId)) ?? item;
  return item;
}

export function localizeItemField(item, field, localize) {
  const entity = itemLocalizationEntity(item);
  return localize?.(entity, field) || item?.[field] || "";
}

const SUMMARY_REPLACEMENTS = {
  en: [
    ["skade", "damage"], ["liv", "health"], ["magi", "magic"], ["fart", "speed"],
    ["Kan ikke repareres", "Cannot be repaired"], ["Kræver level", "Requires level"],
  ],
  da: [
    ["damage", "skade"], ["health", "liv"], ["magic", "magi"], ["speed", "fart"],
    ["crit chance", "chance for critical hit"], ["crit damage", "critical skade"],
    ["block amount", "block-værdi"], ["life steal", "life steal"], ["magic find", "magic find"],
    ["gold find", "gold find"], ["resource find", "resource find"], ["XP gain", "XP gain"],
    ["physical resist", "fysisk resistance"], ["fire resist", "ild-resistance"], ["ice resist", "is-resistance"],
    ["lightning resist", "lyn-resistance"], ["poison resist", "gift-resistance"], ["arcane resist", "arcane resistance"],
    ["holy resist", "holy resistance"], ["shadow resist", "shadow resistance"], ["nature resist", "natur-resistance"],
    ["all resist", "alle resistances"], ["magic resist", "magisk resistance"],
    ["physical damage", "fysisk skade"], ["fire damage", "ildskade"], ["ice damage", "isskade"],
    ["lightning damage", "lynskade"], ["poison damage", "giftskade"], ["arcane damage", "arcane skade"],
    ["holy damage", "holy skade"], ["shadow damage", "shadow-skade"], ["nature damage", "naturskade"],
    ["spell damage", "spell-skade"], ["direct damage", "direkte skade"], ["area damage", "area-skade"],
    ["DoT damage", "DoT-skade"], ["hazard damage", "hazard-skade"],
    ["Immune to slow", "Immun over for slow"], ["Cannot be repaired", "Kan ikke repareres"],
    ["Requires level", "Kræver level"], ["Requires ", "Kræver "], ["Resource stack", "Ressourcestack"],
    ["Consumable", "Kan bruges"], ["Readable", "Læsbar"], ["Quest item", "Quest item"],
    ["parts", "dele"], ["Starts quest when read", "Starter quest ved læsning"],
  ],
};

function replaceSummaryPhrase(text, from, to) {
  if (text === from) return to;
  if (text.startsWith(`${from} `)) return `${to}${text.slice(from.length)}`;
  if (text.endsWith(` ${from}`)) return `${text.slice(0, -from.length)}${to}`;
  return text.replace(` ${from} `, ` ${to} `);
}

export function localizeItemSummary(item, summary, language, localize) {
  const entity = itemLocalizationEntity(item);
  const descriptions = new Set([
    item?.description,
    entity?.description,
    entity?.i18n?.da?.description,
    localize?.(entity, "description"),
  ].filter(Boolean).map((value) => String(value).trim()));

  return String(summary ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && !descriptions.has(part))
    .map((part) => [...(SUMMARY_REPLACEMENTS[language] ?? SUMMARY_REPLACEMENTS.en)]
      .sort(([left], [right]) => right.length - left.length)
      .reduce((text, [from, to]) => replaceSummaryPhrase(text, from, to), part))
    .join(" | ");
}
