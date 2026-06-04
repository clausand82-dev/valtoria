import { RESOURCE_DEFS } from "./config/resource-config.js";

export const ITEM_FLAG_KEYS = [
  "stackable",
  "equippable",
  "consumable",
  "questBound",
  "mergeable",
  "resource",
  "potion",
  "quest",
  "readable",
];

const EMPTY_FLAGS = Object.freeze({
  stackable: false,
  equippable: false,
  consumable: false,
  questBound: false,
  mergeable: false,
  resource: false,
  potion: false,
  quest: false,
  readable: false,
});

const MODE_FLAG_PRESETS = {
  resource: {
    stackable: true,
    mergeable: true,
    resource: true,
  },
  potion: {
    stackable: true,
    consumable: true,
    potion: true,
  },
  quest: {
    questBound: true,
    quest: true,
    stackable: false,
  },
  armor: {
    equippable: true,
    mergeable: true,
  },
  shield: {
    equippable: true,
    mergeable: true,
  },
  relic: {
    equippable: true,
    mergeable: true,
  },
  melee: {
    equippable: true,
    mergeable: true,
  },
  ranged: {
    equippable: true,
    mergeable: true,
  },
  magic: {
    equippable: true,
    mergeable: true,
  },
  book: {
    // Books are non-equippable items that will be consumable in future features.
    equippable: false,
    consumable: true,
    stackable: false,
  },
  readable: {
    equippable: false,
    stackable: false,
    readable: true,
  },
};

const COMMON_BASE_ICON_KEYS = {
  Sword: "common_sword",
  Spear: "common_spear",
  Javelin: "common_spear",
  Dagger: "common_dagger",
  Bow: "common_bow",
  Crossbow: "common_crossbow",
  "Rune Staff": "common_runestaff",
  "Spell Mask": "common_spellmask",
  Helm: "common_helm",
  Gorget: "common_gorget",
  Chestplate: "common_chestplate",
  Vambraces: "common_arms",
  Greaves: "common_legs",
  Ring: "common_ring",
  Amulet: "common_amulet",
  Bracelet: "common_bracelet",
  Boots: "common_feet",
  Gloves: "common_hands",
  Pauldrons: "common_shoulders",
  Cape: "common_cape",
  Belt: "common_belt",
  Relic: "common_relic",
  // TODO: Use common_shield/common_offhand when a dedicated offhand icon asset exists.
  "Wooden Shield": "common_shield",
  "Iron Shield": "common_shield",
  "Frostguard Shield": "common_shield",
};

const RESOURCE_ICON_KEYS = {
  wood_piece: "res_woodpieces",
  iron_piece: "res_ironore",
  rock_piece: "res_stonepiece",
  crystal_piece: "res_crystalpiece",
  wood_plank: "res_woodplank",
  iron_bar: "res_ironbar",
  crystal: "res_crystal",
  stone_brick: "res_stonebrick",
  meat: "res_rawmeat",
  fruit: "res_fruit",
  wheat: "res_wheat",
  food: "res_food",
  coal: "res_coal",
  junk: "res_junk",
  gold_ingot: "gold",
  gold_bar: "res_goldbar",
  magic_essence: "res_magicessens",
  resource_mushroom: "res_magicmushroom",
  paper: "res_paper",
  scroll: "res_scroll",
  red_gemstone: "res_redgemstone",
  yellow_gemstone: "res_yellowgemstone",
  green_gemstone: "res_greengemstone",
  blue_gemstone: "res_bluegemstone",
  black_gemstone: "res_blackgemstone",
  white_gemstone: "res_whitegemstone",
  purple_gemstone: "res_purplegemstone",
  pink_gemstone: "res_pinkgemstone",
  orange_gemstone: "res_orangegemstone",
  turquoise_gemstone: "res_turquoisegemstone",
  diamond: "res_diamond",
  };

export function makeItemFlags(mode, customFlags = {}) {
  const preset = MODE_FLAG_PRESETS[mode] ?? EMPTY_FLAGS;
  const flags = {
    ...EMPTY_FLAGS,
    ...preset,
  };
  for (const key of ITEM_FLAG_KEYS) {
    if (Object.hasOwn(customFlags, key)) {
      flags[key] = Boolean(customFlags[key]);
    }
  }
  return flags;
}

export function withItemFlags(item, customFlags = null) {
  if (!item) return item;
  return {
    ...item,
    flags: makeItemFlags(item.mode, customFlags ?? item.flags ?? {}),
  };
}

export function hasItemFlag(item, key) {
  if (!item || !key) return false;
  return Boolean(item.flags?.[key]);
}

export function isResourceItem(item) {
  return hasItemFlag(item, "resource") || item?.mode === "resource";
}

export function isPotionItem(item) {
  return hasItemFlag(item, "potion") || item?.mode === "potion";
}

export function isQuestItem(item) {
  return hasItemFlag(item, "quest") || item?.mode === "quest";
}

export function isReadableItem(item) {
  return hasItemFlag(item, "readable") || item?.mode === "readable";
}

export function isStackableItem(item) {
  return hasItemFlag(item, "stackable");
}

export function isEquippableItem(item) {
  return hasItemFlag(item, "equippable");
}

export function canMergeItem(item) {
  return hasItemFlag(item, "mergeable");
}

function slugToken(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function deriveIconKey(itemLike = {}) {
  if (itemLike.iconKey) return slugToken(itemLike.iconKey);
  if (itemLike.mode === "potion" || itemLike.potionType) {
    if (itemLike.iconKey) return slugToken(itemLike.iconKey);
    return itemLike.potionType === "mana" ? "potion_mana" : "potion_health";
  }
  if (itemLike.resourceId) {
    const resId = String(itemLike.resourceId);
    const def = RESOURCE_DEFS[resId];
    if (def?.iconUrl && typeof def.iconUrl === "string") {
      const parts = def.iconUrl.split("/");
      const filename = parts[parts.length - 1] ?? def.iconUrl;
      const key = filename.replace(/^item_/, "").replace(/\.[^.]+$/, "");
      return slugToken(key);
    }
    if (RESOURCE_ICON_KEYS[resId]) return RESOURCE_ICON_KEYS[resId];
  }
  if (itemLike.baseName && COMMON_BASE_ICON_KEYS[itemLike.baseName]) {
    return COMMON_BASE_ICON_KEYS[itemLike.baseName];
  }
  if (itemLike.uniqueId) return slugToken(itemLike.uniqueId);
  if (itemLike.readableId) return slugToken(itemLike.readableId);
  if (itemLike.questItemId) return slugToken(itemLike.questItemId);
  const fromBase = slugToken(itemLike.baseName);
  if (fromBase) return fromBase;
  if (itemLike.namedId) return slugToken(itemLike.namedId);
  const fromName = slugToken(itemLike.name);
  if (fromName) return fromName;
  return "unknown";
}

export function iconUrlFromKey(iconKey) {
  const key = slugToken(iconKey);
  return `/assets/generated/item/item_${key || "unknown"}.png`;
}

export function withItemIcon(item, iconKey = null) {
  if (!item) return item;
  if (item.iconUrl && typeof item.iconUrl === "string") {
    return {
      ...item,
      iconKey: item.iconKey ? slugToken(item.iconKey) : deriveIconKey(item),
      iconUrl: item.iconUrl,
    };
  }
  const key = slugToken(iconKey || deriveIconKey(item));
  return {
    ...item,
    iconKey: key,
    iconUrl: iconUrlFromKey(key),
  };
}
