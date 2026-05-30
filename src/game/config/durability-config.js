// City area/building durability
export const DURABILITY_DEFAULT = 100;
// Chance (0-1) that a given building/area degrades on a city visit
export const DURABILITY_DEGRADE_CHANCE = 0.1;
// Minimum percent degraded when degradation happens
export const DURABILITY_DEGRADE_MIN_PCT = 0;
// Maximum percent degraded when degradation happens
export const DURABILITY_DEGRADE_MAX_PCT = 1;

// Item/equipment durability

// Random durability range for new drops (%)
export const ITEM_DURABILITY_RANDOM_MIN = 55;
export const ITEM_DURABILITY_RANDOM_MAX = 100;

// Below this percent, stats start degrading gradually (0% = unusable)
export const ITEM_DURABILITY_PENALTY_THRESHOLD = 75;

// Durability drained from the equipped weapon per hero attack (%)
export const ITEM_DURABILITY_WEAPON_PER_ATTACK = 0.08;

// Durability drained from each equipped armor piece per damage-hit taken (%)
export const ITEM_DURABILITY_ARMOR_PER_HIT = 0.05;

// On hero death: each equipped armor piece loses this much extra durability (%)
// Only applied when current durability is above ITEM_DURABILITY_DEATH_THRESHOLD
export const ITEM_DURABILITY_DEATH_MIN_PCT = 0;
export const ITEM_DURABILITY_DEATH_MAX_PCT = 15;
// Only armor/weapons above this durability take death penalty
export const ITEM_DURABILITY_DEATH_THRESHOLD = 50;

// Fraction of hero gold lost on death (0 = none, 0.05 = max 5 %)
export const ITEM_GOLD_DEATH_LOSS_MAX = 0.05;

// Blacksmith item repair costs
// Repair cost is calculated as: gold per 1% * missing durability + junk per 1% * missing durability
export const ITEM_REPAIR_GOLD_PER_PCT = 5;
export const ITEM_REPAIR_JUNK_PER_PCT = 1;
