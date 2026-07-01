export const DEFAULT_CLASS_ID = "adventurer";

export const CLASS_DEFS = {
  adventurer: {
    id: "adventurer",
    name: "Adventurer",
    description: "A flexible wanderer without a specialized class path.",
    i18n: { da: { name: "Eventyrer", description: "En fleksibel omvandrende helt uden specialiseret class-vej." } },
    nodes: {},
  },
  warrior: {
    id: "warrior",
    name: "Warrior",
    description: "Armor, shields, and physical pressure.",
    i18n: { da: { name: "Kriger", description: "Armor, skjolde og fysisk pres." } },
    nodes: {
      "warrior.base": {
        id: "warrior.base",
        title: "Warrior Training",
        i18n: { da: { title: "Krigertræning" } },
        bonuses: { maxHp: 18, armorFlat: 3, physicalDamageBonus: 0.04 },
      },
      "warrior.shield_wall": {
        id: "warrior.shield_wall",
        title: "Shield Wall",
        i18n: { da: { title: "Skjoldmur" } },
        requires: ["warrior.base"],
        requiresBuilding: "armory",
        requiresAddon: "melee_training",
        bonuses: { blockChance: 0.03, blockAmount: 3, physicalResist: 5 },
      },
    },
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    description: "Range, critical hits, and toxins.",
    i18n: { da: { name: "Ranger", description: "Rækkevidde, kritiske træf og toksiner." } },
    nodes: {
      "ranger.base": {
        id: "ranger.base",
        title: "Ranger Training",
        i18n: { da: { title: "Rangertræning" } },
        bonuses: { range: 0.2, critChance: 0.02, poisonDamageBonus: 0.04 },
      },
      "ranger.ranged_training": {
        id: "ranger.ranged_training",
        title: "Ranged Training",
        i18n: { da: { title: "Ranged-træning" } },
        requires: ["ranger.base"],
        requiresAddon: "ranged_training",
        bonuses: { range: 0.15, directDamageBonus: 0.03 },
      },
    },
  },
  mage: {
    id: "mage",
    name: "Mage",
    description: "Spell power and elemental control.",
    i18n: { da: { name: "Magiker", description: "Spellkraft og elementær kontrol." } },
    nodes: {
      "mage.base": {
        id: "mage.base",
        title: "Mage Training",
        i18n: { da: { title: "Magikertræning" } },
        bonuses: { magic: 4, maxMana: 18, spellDamageBonus: 0.04 },
      },
      "mage.frost_adept": {
        id: "mage.frost_adept",
        title: "Frost Adept",
        i18n: { da: { title: "Frostadept" } },
        requires: ["mage.base"],
        requiresBuilding: "mage_tower",
        bonuses: { iceDamageBonus: 0.06, iceResist: 8, areaDamageBonus: 0.03 },
      },
      "mage.arcane_study": {
        id: "mage.arcane_study",
        title: "Arcane Study",
        i18n: { da: { title: "Arkanstudie" } },
        requires: ["mage.base"],
        requiresAddon: "arcane_archive",
        bonuses: { arcaneDamageBonus: 0.05, spellDamageBonus: 0.02 },
      },
    },
  },
  cleric: {
    id: "cleric",
    name: "Cleric",
    description: "Resilience and holy force.",
    i18n: { da: { name: "Kleriker", description: "Robusthed og hellig kraft." } },
    nodes: {
      "cleric.base": {
        id: "cleric.base",
        title: "Cleric Training",
        i18n: { da: { title: "Klerikertræning" } },
        bonuses: { allResist: 3, holyDamageBonus: 0.05, maxMana: 10 },
      },
      "cleric.holy_training": {
        id: "cleric.holy_training",
        title: "Holy Training",
        i18n: { da: { title: "Hellig træning" } },
        requires: ["cleric.base"],
        requiresBuilding: "sanctuary",
        bonuses: { holyDamageBonus: 0.05, allResist: 2 },
      },
    },
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    description: "Avoidance, speed, and critical bursts.",
    i18n: { da: { name: "Slyngel", description: "Undvigelse, fart og kritiske udbrud." } },
    nodes: {
      "rogue.base": {
        id: "rogue.base",
        title: "Rogue Training",
        i18n: { da: { title: "Slyngeltræning" } },
        bonuses: { dodgeChance: 0.02, critDamage: 0.12, attackSpeed: 0.03 },
      },
      "rogue.shadow_training": {
        id: "rogue.shadow_training",
        title: "Shadow Training",
        i18n: { da: { title: "Skyggetræning" } },
        requires: ["rogue.base"],
        requiresBuilding: "library",
        bonuses: { shadowDamageBonus: 0.05, dodgeChance: 0.01 },
      },
    },
  },
  warden: {
    id: "warden",
    name: "Warden",
    description: "Nature magic and durable survival.",
    i18n: { da: { name: "Skovvogter", description: "Naturmagi og robust overlevelse." } },
    nodes: {
      "warden.base": {
        id: "warden.base",
        title: "Warden Training",
        i18n: { da: { title: "Skovvogtertræning" } },
        bonuses: { natureDamageBonus: 0.05, poisonResist: 8, natureResist: 5, maxHp: 10 },
      },
      "warden.nature_training": {
        id: "warden.nature_training",
        title: "Nature Training",
        i18n: { da: { title: "Naturtræning" } },
        requires: ["warden.base"],
        requiresBuilding: "farm",
        bonuses: { natureDamageBonus: 0.05, natureResist: 5 },
      },
    },
  },
};

export const CLASS_NODE_BY_ID = Object.fromEntries(
  Object.values(CLASS_DEFS).flatMap((classDef) => Object.values(classDef.nodes ?? {}).map((node) => [node.id, node])),
);

export function normalizeClassId(classId) {
  const id = String(classId ?? DEFAULT_CLASS_ID);
  return CLASS_DEFS[id] ? id : DEFAULT_CLASS_ID;
}

export function normalizeClassNodes(nodes) {
  if (!Array.isArray(nodes)) return [];
  return [...new Set(nodes.map(String).filter((nodeId) => CLASS_NODE_BY_ID[nodeId]))];
}

export function getClassConfig(classId) {
  return CLASS_DEFS[normalizeClassId(classId)];
}

export function getUnlockedClassNodes(player) {
  return normalizeClassNodes(player?.classNodes);
}

export function getClassNodeBonuses(player) {
  const bonuses = {};
  for (const nodeId of getUnlockedClassNodes(player)) {
    const nodeBonuses = CLASS_NODE_BY_ID[nodeId]?.bonuses ?? {};
    for (const [key, value] of Object.entries(nodeBonuses)) {
      bonuses[key] = (bonuses[key] ?? 0) + (Number(value) || 0);
    }
  }
  return bonuses;
}

function classNodeCostsPoint(node) {
  return node?.free !== true && !String(node?.id ?? "").endsWith(".base");
}

export function classNodeSpentPoints(player) {
  return getUnlockedClassNodes(player).reduce((sum, nodeId) => (
    sum + (classNodeCostsPoint(CLASS_NODE_BY_ID[nodeId]) ? 1 : 0)
  ), 0);
}

export function classPointsAvailable(player) {
  const levelPoints = Math.max(0, Math.floor(Number(player?.level) || 1) - 1 - classNodeSpentPoints(player));
  const savedPoints = Math.max(0, Math.floor(Number(player?.classPoints) || 0));
  return Math.max(savedPoints, levelPoints);
}

export function canUnlockClassNode(player, nodeId, context = {}) {
  const node = CLASS_NODE_BY_ID[String(nodeId ?? "")];
  if (!node) return { ok: false, reason: "Unknown class node" };
  const classId = normalizeClassId(player?.classId);
  const nodeClassId = String(node.id).split(".")[0];
  if (nodeClassId !== classId) return { ok: false, reason: "Wrong class" };
  const unlocked = new Set(getUnlockedClassNodes(player));
  if (unlocked.has(node.id)) return { ok: false, reason: "Already unlocked" };
  for (const req of node.requires ?? []) {
    if (!unlocked.has(req)) return { ok: false, reason: `Requires ${req}` };
  }
  if (node.requiresBuilding && !context.hasBuilding?.(node.requiresBuilding)) {
    const label = context.buildingName?.(node.requiresBuilding) ?? node.requiresBuilding;
    return { ok: false, reason: `Requires building: ${label}` };
  }
  if (node.requiresAddon && !context.hasAddon?.(node.requiresAddon)) {
    const label = context.addonName?.(node.requiresAddon) ?? node.requiresAddon;
    return { ok: false, reason: `Requires addon: ${label}` };
  }
  if (node.requiresResearch && !context.hasResearch?.(node.requiresResearch)) {
    const label = context.researchName?.(node.requiresResearch) ?? node.requiresResearch;
    return { ok: false, reason: `Requires research: ${label}` };
  }
  if (classNodeCostsPoint(node) && classPointsAvailable(player) <= 0) return { ok: false, reason: "No class points" };
  return { ok: true, reason: "" };
}

export function unlockClassNode(player, nodeId, context = {}) {
  const check = canUnlockClassNode(player, nodeId, context);
  if (!check.ok) return check;
  player.classNodes = [...getUnlockedClassNodes(player), String(nodeId)];
  if (classNodeCostsPoint(CLASS_NODE_BY_ID[String(nodeId)])) {
    player.classPoints = Math.max(0, classPointsAvailable(player) - 1);
  }
  return { ok: true, reason: "" };
}
