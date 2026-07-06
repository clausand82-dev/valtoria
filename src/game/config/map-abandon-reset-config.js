// Controls what is rolled back when the player leaves a battle/area map early
// with the city/world-map icon instead of completing the map via the exit.
//
// true  = reset this part to the forced save from when the map was entered.
// false = keep the current value earned/changed during the abandoned map run.
//
// Runtime-only map state such as spawned monsters, ground loot, projectiles,
// particles, and the active battle map itself is always cleared when leaving.
export const MAP_ABANDON_RESET_CONFIG = {
  player: {
    // Position and facing from before the map run. Keep this true unless you
    // explicitly want to preserve wilderness coordinates after returning to city.
    position: false,

    // Hero level and current XP. Set false to keep XP earned before abandoning.
    levelAndXp: false,

    // Gold and popularity. Set false to keep gold/popularity changes.
    economy: false,

    // HP, mana, active cooldowns, movement/attack animation state and death timer.
    vitalsAndCooldowns: false,

    // Health/mana potion counters.
    potions: false,

    // Permanent readable-book stat bonuses gained during the run.
    readableBonuses: false,

    // Permanent stat bonuses granted by quests completed during the run.
    questStatBonuses: false,

    // Skill tree ranks bought during the run.
    skillTree: false,

    // Spells unlocked or active spell changed during the run.
    spells: false,

    // Hero statistics counters such as kills, gold earned, items picked, etc.
    stats: false,

    // Backpack contents. Set false to keep items/resources picked up during the run.
    inventory: false,

    // Equipped gear, including durability damage and gear swaps.
    equipment: false,
  },

  quests: {
    // Active quest list and quest progress, including kill/clear counters.
    active: false,

    // Completed quest ids.
    completed: false,
  },

  world: {
    // Ly'dra'thot / Net'dra'thot raw points gained or changed during the map run.
    // true resets spell netdra, mob killNetdra/killLydra, destroyRewards lydra/netdra,
    // and quest reward lydra/netdra if the quest completion is also rolled back.
    // Set false to keep world-energy changes even when abandoning the map early.
    worldEnergy: false,

    // Generic world flags/counters/values changed during the map run.
    // This covers worldState-driven systems such as region flags, mob seen flags,
    // visit counters, conditional unlock state, and future shorthand-condition state.
    worldState: false,
  },
};
