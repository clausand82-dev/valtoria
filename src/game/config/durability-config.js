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
export const ITEM_DURABILITY_RANDOM_MIN = 85;
export const ITEM_DURABILITY_RANDOM_MAX = 100;

// Below this percent, stats start degrading gradually (0% = unusable)
export const ITEM_DURABILITY_PENALTY_THRESHOLD = 60;

// Durability drained from the equipped weapon per hero attack (%)
export const ITEM_DURABILITY_WEAPON_PER_ATTACK = 0.02;

// Durability drained from an armor piece when its per-hit damage roll succeeds (%)
export const ITEM_DURABILITY_ARMOR_PER_HIT = 0.01;

// A hit randomly selects this many equipped normal armor pieces, without replacement.
export const ITEM_DURABILITY_ARMOR_HIT_SLOT_MIN = 1;
export const ITEM_DURABILITY_ARMOR_HIT_SLOT_MAX = 3;

// Each selected normal armor piece has this chance (0-1) to lose durability.
export const ITEM_DURABILITY_ARMOR_HIT_CHANCE = 0.5;

// These logical item slots do not use the normal 1-3 piece selection rule.
// Each equipped item in these slots instead rolls the special chance below on every hit.
export const ITEM_DURABILITY_SPECIAL_ARMOR_SLOTS = ["ring", "relic", "amulet", "bracelet"];
export const ITEM_DURABILITY_SPECIAL_ARMOR_HIT_CHANCE = 0.01;

// On hero death: each equipped armor piece loses this much extra durability (%)
// Only applied when current durability is above ITEM_DURABILITY_DEATH_THRESHOLD
export const ITEM_DURABILITY_DEATH_MIN_PCT = 0;
export const ITEM_DURABILITY_DEATH_MAX_PCT = 5;
// Only armor/weapons above this durability take death penalty
export const ITEM_DURABILITY_DEATH_THRESHOLD = 50;

// Fraction of hero gold lost on death (0 = none, 0.05 = max 5 %)
export const ITEM_GOLD_DEATH_LOSS_MAX = 0.05;

// Blacksmith item repair costs
// Repair cost is calculated as: gold per 1% * missing durability + junk per 1% * missing durability
export const ITEM_REPAIR_GOLD_PER_PCT = 5;
export const ITEM_REPAIR_JUNK_PER_PCT = 1;
