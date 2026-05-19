export const DEFAULT_CLASS_ID = "adventurer";

export const CLASS_DEFS = {
  adventurer: {
    id: "adventurer",
    name: "Adventurer",
    description: "A flexible wanderer without a specialized class path.",
    nodes: {},
  },
  warrior: {
    id: "warrior",
    name: "Warrior",
    description: "Armor, shields, and physical pressure.",
    nodes: {
      "warrior.base": {
        id: "warrior.base",
        title: "Warrior Training",
        bonuses: { maxHp: 18, armorFlat: 3, physicalDamageBonus: 0.04 },
      },
      "warrior.shield_wall": {
        id: "warrior.shield_wall",
        title: "Shield Wall",
        requires: ["warrior.base"],
        bonuses: { blockChance: 0.03, blockAmount: 3, physicalResist: 5 },
      },
    },
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    description: "Range, critical hits, and toxins.",
    nodes: {
      "ranger.base": {
        id: "ranger.base",
        title: "Ranger Training",
        bonuses: { range: 0.2, critChance: 0.02, poisonDamageBonus: 0.04 },
      },
    },
  },
  mage: {
    id: "mage",
    name: "Mage",
    description: "Spell power and elemental control.",
    nodes: {
      "mage.base": {
        id: "mage.base",
        title: "Mage Training",
        bonuses: { magic: 4, maxMana: 18, spellDamageBonus: 0.04 },
      },
      "mage.frost_adept": {
        id: "mage.frost_adept",
        title: "Frost Adept",
        requires: ["mage.base"],
        bonuses: { iceDamageBonus: 0.06, iceResist: 8, areaDamageBonus: 0.03 },
      },
    },
  },
  cleric: {
    id: "cleric",
    name: "Cleric",
    description: "Resilience and holy force.",
    nodes: {
      "cleric.base": {
        id: "cleric.base",
        title: "Cleric Training",
        bonuses: { allResist: 3, holyDamageBonus: 0.05, maxMana: 10 },
      },
    },
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    description: "Avoidance, speed, and critical bursts.",
    nodes: {
      "rogue.base": {
        id: "rogue.base",
        title: "Rogue Training",
        bonuses: { dodgeChance: 0.02, critDamage: 0.12, attackSpeed: 0.03 },
      },
    },
  },
  warden: {
    id: "warden",
    name: "Warden",
    description: "Nature magic and durable survival.",
    nodes: {
      "warden.base": {
        id: "warden.base",
        title: "Warden Training",
        bonuses: { natureDamageBonus: 0.05, poisonResist: 8, natureResist: 5, maxHp: 10 },
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

export function canUnlockClassNode(player, nodeId) {
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
  if ((Number(player?.classPoints) || 0) <= 0) return { ok: false, reason: "No class points" };
  return { ok: true, reason: "" };
}

export function unlockClassNode(player, nodeId) {
  const check = canUnlockClassNode(player, nodeId);
  if (!check.ok) return check;
  player.classNodes = [...getUnlockedClassNodes(player), String(nodeId)];
  player.classPoints = Math.max(0, Math.floor(Number(player.classPoints) || 0) - 1);
  return { ok: true, reason: "" };
}
