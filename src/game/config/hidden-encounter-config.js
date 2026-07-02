import { normalizeWorldState, setWorldValue, worldConditionMet } from "../world-state.js";

export const HIDDEN_REGION_ENCOUNTERS = [
  {
    id: "young_boys_body",
    regionValue: "young_boys_body_region",
    eligibleRegionIds: ["old-shrine", "southern-fields", "river-creek"],
    prefabId: "young_boys_body_site",
    requires: {
      all: [
        { questCompleted: "confront_veldor_with_truth" },
        { not: { questCompleted: "the_young_boys_letter" } },
        { notFlag: "young_boys_letter_taken" },
      ],
    },
    blockedBy: { flag: "young_boys_letter_taken" },
  },
];

export function lockHiddenEncountersForRegion(worldState, regionId, context = {}) {
  let next = normalizeWorldState(worldState);
  let changed = false;
  for (const encounter of HIDDEN_REGION_ENCOUNTERS) {
    if (!encounter.eligibleRegionIds.includes(String(regionId))) continue;
    if (next.values[encounter.regionValue] != null) continue;
    if (!worldConditionMet(encounter.requires, next, context)) continue;
    if (encounter.blockedBy && worldConditionMet(encounter.blockedBy, next, context)) continue;
    next = setWorldValue(next, encounter.regionValue, String(regionId));
    changed = true;
  }
  return { worldState: next, changed };
}

export function addHiddenEncounterPrefabs(regionConfig, worldState, context = {}) {
  const pool = [...(regionConfig?.prefabRules?.pool ?? [])];
  let changed = false;
  for (const encounter of HIDDEN_REGION_ENCOUNTERS) {
    if (worldState?.values?.[encounter.regionValue] !== String(regionConfig?.id)) continue;
    if (!worldConditionMet(encounter.requires, worldState, context)) continue;
    if (encounter.blockedBy && worldConditionMet(encounter.blockedBy, worldState, context)) continue;
    pool.push({ id: encounter.prefabId, weight: 1000, max: 1, required: true });
    changed = true;
  }
  if (!changed) return regionConfig;
  return {
    ...regionConfig,
    prefabRules: {
      maxTotal: Math.max(1, Number(regionConfig.prefabRules?.maxTotal) || 0),
      minDistanceBetweenPrefabs: 8,
      anchors: ["clearing", "room", "pathSide"],
      ...(regionConfig.prefabRules ?? {}),
      pool,
    },
  };
}
