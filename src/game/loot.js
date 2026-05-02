import { DEFAULT_LOOT_PROFILE, LOOT_PROFILES, MONSTER_RESOURCE_DROPS } from "./config/loot-config.js";

export function monsterLootProfile(typeName) {
  return LOOT_PROFILES[typeName] ?? DEFAULT_LOOT_PROFILE;
}

export function rollLootCategory(weights) {
  const entries = Object.entries(weights ?? {});
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return "none";
  let roll = Math.random() * total;
  for (const [category, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return category;
  }
  return "none";
}

export function monsterResourceDrops(monster) {
  const specific = MONSTER_RESOURCE_DROPS[monster?.typeName];
  // Mob-specific entries inherit default loot unless explicitly disabled in loot-config.js.
  const inheritDefaultLoot = specific?.inheritDefaultLoot !== false;
  const inheritDefaultRareLoot = specific?.inheritDefaultRareLoot !== false;

  return [
    ...(inheritDefaultLoot ? MONSTER_RESOURCE_DROPS.default?.loot ?? [] : []),
    ...(inheritDefaultRareLoot ? MONSTER_RESOURCE_DROPS.default?.rareLoot ?? [] : []),
    ...(specific?.loot ?? []),
    ...(specific?.rareLoot ?? []),
  ];
}
