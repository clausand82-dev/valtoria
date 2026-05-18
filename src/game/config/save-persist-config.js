// Controls what is written to the player save payload.
// Load logic already handles missing fields with defaults/fallbacks.
export const SAVE_PERSIST_CONFIG = {
  storage: {
    playerSave: true,
    saveIndex: true,
    cityProgress: true,
    regionCorruption: true,
    regionMapLastId: true,
  },
  player: {
    core: true,
    vitals: true,
    cooldownsAndAnim: true,
    economy: true,
    potions: true,
    readableBonuses: true,
    skillTree: true,
    spells: true,
    stats: true,
    inventory: true,
    equipment: true,
  },
  items: {
    durability: true,
    sockets: true,
    iconData: true,
    value: true,
  },
  quests: {
    active: true,
    completed: true,
  },
  worldState: true,
  cityProgress: {
    areas: true,
    buildingStates: true,
    statBonuses: true,
    armoryPoints: true,
    armyUnits: true,
    threatLevel: true,
    cityMobs: true,
  },
};
