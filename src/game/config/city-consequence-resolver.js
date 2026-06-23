import { CITY_DURABILITY_CONSEQUENCE_RULES, CITY_EVENT_DEFS, CITY_EVENT_IDS, CITY_EVENT_RULES } from "./city-config.js";

const MULTIPLICATIVE_MODIFIER_KEYS = new Set([
  "goldDropMultiplier",
  "potionDropMultiplier",
  "heroMaxHpMultiplier",
  "cityMobSpawnChanceMultiplier",
  "cityDurabilityDegradeChanceMultiplier",
  "cityDurabilityDamageMultiplier",
  "repairCostMultiplier",
  "craftingCostMultiplier",
  "merchantBuyPriceMultiplier",
  "merchantSellPriceMultiplier",
  "merchantStockMultiplier",
  "healthPotionHealMultiplier",
  "questGoldRewardMultiplier",
]);

export const CITY_EVENT_MODIFIER_DEFAULTS = {
  resourceDropMultiplierById: {},
  goldDropMultiplier: 1,
  potionDropMultiplier: 1,
  heroMaxHpMultiplier: 1,
  cityMobSpawnChanceMultiplier: 1,
  cityDurabilityDegradeChanceMultiplier: 1,
  cityDurabilityDamageMultiplier: 1,
  repairCostMultiplier: 1,
  craftingCostMultiplier: 1,
  merchantBuyPriceMultiplier: 1,
  merchantSellPriceMultiplier: 1,
  merchantStockMultiplier: 1,
  healthPotionHealMultiplier: 1,
  questGoldRewardMultiplier: 1,
};

function statNumber(cityStats, statId, fallback = 0) {
  const value = Number(cityStats?.[statId]);
  return Number.isFinite(value) ? value : fallback;
}

function population(cityStats) {
  return Math.max(0, Math.floor(statNumber(cityStats, "population", 0)));
}

function fireRisk(cityStats) {
  const safety = Math.max(0, Math.min(100, statNumber(cityStats, "safety", 0)));
  const waterShortage = statNumber(cityStats, "water", 0) < population(cityStats);
  return Math.max(0, Math.min(100, (100 - safety) + (waterShortage ? CITY_EVENT_RULES.fireRiskWaterShortageBonus : 0)));
}

function conditionActive(conditions = {}, cityStats = {}) {
  if (conditions.statBelowPopulation) {
    if (statNumber(cityStats, conditions.statBelowPopulation, 0) >= population(cityStats)) return false;
  }
  for (const [statId, threshold] of Object.entries(conditions.statBelow ?? {})) {
    if (statNumber(cityStats, statId, 0) >= Number(threshold)) return false;
  }
  for (const [statId, threshold] of Object.entries(conditions.statsAtLeast ?? {})) {
    if (statNumber(cityStats, statId, 0) < Number(threshold)) return false;
  }
  if (conditions.statPopulationRatioBelow) {
    const stat = conditions.statPopulationRatioBelow.stat;
    const threshold = Number(conditions.statPopulationRatioBelow.threshold);
    if ((statNumber(cityStats, stat, 0) / Math.max(1, population(cityStats))) >= threshold) return false;
  }
  if (conditions.fireRiskAtLeast !== undefined && fireRisk(cityStats) < Number(conditions.fireRiskAtLeast)) return false;
  return true;
}

export function cityEventFlags(cityStats = {}) {
  const risk = fireRisk(cityStats);
  return Object.fromEntries(CITY_EVENT_IDS.map((id) => {
    const def = CITY_EVENT_DEFS[id];
    const active = conditionActive(def.conditions, cityStats);
    const entry = {
      active,
      modifiers: def.modifiers ?? {},
    };
    if (id === "famine") entry.unavailablePopulationPct = CITY_EVENT_RULES.famineUnavailablePopulationPct;
    if (id === "water_shortage") entry.unavailablePopulationPct = CITY_EVENT_RULES.waterShortageUnavailablePopulationPct;
    if (id === "uprising_poorness") {
      entry.risk = active ? "high" : "low";
      entry.wealthRatio = statNumber(cityStats, "wealth", 0) / Math.max(1, population(cityStats));
    }
    if (id === "fire") {
      entry.risk = risk;
      entry.waterShortage = statNumber(cityStats, "water", 0) < population(cityStats);
    }
    return [id, entry];
  }));
}

export function activeCityEventEntries(cityStatsOrEvents = {}, options = {}) {
  const events = cityStatsOrEvents?.events ? cityStatsOrEvents.events : cityStatsOrEvents;
  const includeRisk = Boolean(options.includeRisk);
  return CITY_EVENT_IDS
    .filter((id) => events?.[id]?.active || (includeRisk && Number(events?.[id]?.risk) > 0))
    .map((id) => ({
      ...CITY_EVENT_DEFS[id],
      ...(events?.[id] ?? {}),
    }));
}

export function resolveCityEventModifiers(cityStatsOrEvents = {}) {
  const events = cityStatsOrEvents?.events ? cityStatsOrEvents.events : cityStatsOrEvents;
  const modifiers = {
    ...CITY_EVENT_MODIFIER_DEFAULTS,
    resourceDropMultiplierById: {},
  };
  for (const event of activeCityEventEntries(events)) {
    for (const [key, value] of Object.entries(event.modifiers ?? {})) {
      if (key === "resourceDropMultiplierById") {
        for (const [resourceId, multiplier] of Object.entries(value ?? {})) {
          modifiers.resourceDropMultiplierById[resourceId] = (modifiers.resourceDropMultiplierById[resourceId] ?? 1) * (Number(multiplier) || 1);
        }
      } else if (MULTIPLICATIVE_MODIFIER_KEYS.has(key)) {
        modifiers[key] = (Number(modifiers[key]) || 1) * (Number(value) || 1);
      } else {
        modifiers[key] = value;
      }
    }
  }
  return modifiers;
}

export function cityRuntimeModifiers(cityStats = {}) {
  const stats = cityStats?.events ? cityStats : { ...cityStats, events: cityEventFlags(cityStats) };
  const modifiers = resolveCityEventModifiers(stats);
  const goldFindBonusPct = statNumber(stats, "gold_find_bonus_pct", statNumber(stats, "goldFindBonusPct", 0));
  if (goldFindBonusPct) {
    modifiers.goldDropMultiplier *= Math.max(0, 1 + goldFindBonusPct / 100);
  }
  return modifiers;
}

export function cityDurabilityConsequenceFor(durability) {
  const pct = Math.max(0, Math.min(100, Number(durability) || 0));
  return [...CITY_DURABILITY_CONSEQUENCE_RULES]
    .sort((a, b) => Number(a.belowPct) - Number(b.belowPct))
    .find((rule) => pct < Number(rule.belowPct)) ?? null;
}

export function cityBuildingDurabilityConsequence(progress = {}, buildingId) {
  if (!buildingId) return null;
  const durability = progress?.[buildingId]?.durability;
  return cityDurabilityConsequenceFor(durability ?? 100);
}

export function blacksmithDurabilityModifiers(progress = {}) {
  const consequence = cityBuildingDurabilityConsequence(progress, "blacksmith");
  return {
    repairCostMultiplier: consequence?.blacksmithRepairCostMultiplier ?? 1,
    metalBarInputCostBonus: Math.max(0, Math.floor(Number(consequence?.blacksmithMetalBarInputCostBonus) || 0)),
    goldBarCostMultiplier: consequence?.blacksmithGoldBarCostMultiplier ?? 1,
    forgeJunkYieldMultiplier: consequence?.blacksmithForgeJunkYieldMultiplier ?? 1,
  };
}
