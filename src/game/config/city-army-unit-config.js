export const CITY_ARMY_UNIT_DEFS = {
  peasant: {
    label: "Peasant",
    imageUrl: "",
    category: "melee",
    populationCost: 1,
    armyValue: 1,
    attack: 1,
    armor: 1,
    hp: 2,
    range: 1,
  },
  
  sword_soldier: {
    label: "Sword Soldier",
    imageUrl: "",
    category: "melee",
    populationCost: 1,
    armyValue: 5,
    attack: 5,
    armor: 4,
    hp: 10,
    range: 1,
  },
  spear_soldier: {
    label: "Spear Soldier",
    imageUrl: "",
    category: "melee",
    populationCost: 1,
    armyValue: 5,
    attack: 4,
    armor: 3,
    hp: 10,
    range: 2,
  },
  archer_soldier: {
    label: "Archer Soldier",
    imageUrl: "",
    category: "ranged",
    populationCost: 1,
    armyValue: 4,
    attack: 4,
    armor: 1,
    hp: 8,
    range: 5,
  },
  crossbow_soldier: {
    label: "Crossbow Soldier",
    imageUrl: "",
    category: "ranged",
    populationCost: 1,
    armyValue: 6,
    attack: 6,
    armor: 2,
    hp: 8,
    range: 4,
  },
    james_gray: {
    label: "Legendary James Gray",
    imageUrl: "",
    category: "melee",
    populationCost: 1,
    armyValue: 20,
    attack: 14,
    armor: 10,
    hp: 20,
    range: 1,
  },
};

const CITY_ARMY_UNIT_ALIASES = {
  peasent: "peasant",
};

export function normalizeArmyUnits(armyUnits = {}) {
  const result = {};
  if (!armyUnits || typeof armyUnits !== "object") return result;
  for (const [unitId, count] of Object.entries(armyUnits)) {
    const normalizedUnitId = CITY_ARMY_UNIT_ALIASES[unitId] ?? unitId;
    if (!CITY_ARMY_UNIT_DEFS[normalizedUnitId]) continue;
    const value = Math.max(0, Math.floor(Number(count) || 0));
    if (value > 0) result[normalizedUnitId] = (result[normalizedUnitId] ?? 0) + value;
  }
  return result;
}

export function armyUnitCount(armyUnits = {}) {
  return Object.values(normalizeArmyUnits(armyUnits)).reduce((sum, count) => sum + count, 0);
}

export function armyUnitPower(unitId, count = 1) {
  const def = CITY_ARMY_UNIT_DEFS[unitId];
  if (!def) return 0;
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return n * Math.max(0, Number(def.armyValue) || 0);
}

export function armyTotalPower(armyUnits = {}) {
  return Object.entries(normalizeArmyUnits(armyUnits))
    .reduce((sum, [unitId, count]) => sum + armyUnitPower(unitId, count), 0);
}
