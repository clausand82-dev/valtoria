// Durability configuration for buildings and areas
export const DURABILITY_DEFAULT = 100;
// Chance (0-1) that a given building/area degrades on a city visit
export const DURABILITY_DEGRADE_CHANCE = 0.4;
// Minimum percent degraded when degradation happens
export const DURABILITY_DEGRADE_MIN_PCT = 0;
// Maximum percent degraded when degradation happens
export const DURABILITY_DEGRADE_MAX_PCT = 1;

// ─── Item / Equipment Durability ─────────────────────────────────────────────

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

// ─── Blacksmith repair costs per 1 % durability restored ─────────────────────
// Each entry: [resourceId, amountPer1Pct]
// Applied to both weapons and armor.
// Higher-rarity items additionally require magic_essence (see ITEM_REPAIR_MAGIC_ESSENCE_PER_PCT).
export const ITEM_REPAIR_BASE_COSTS_PER_PCT = {
  iron_bar:   0.15,
  wood_plank: 0.10,
  coal:       0.10,
  crystal:    0.05,
};

// magic_essence required per 1 % repaired for each rarity above "upgraded"
export const ITEM_REPAIR_MAGIC_ESSENCE_PER_PCT = {
  rare:      0.2,
  epic:      0.4,
  legendary: 0.8,
  unique:    1.5,
};

// hide required per 1 % for armor slots (weapon = no hide cost)
export const ITEM_REPAIR_HIDE_PER_PCT = 0.10;
