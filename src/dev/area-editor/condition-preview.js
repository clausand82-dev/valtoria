import {
  normalizeWorldState,
  regionWorldStateKey,
  setWorldFlag,
  setWorldValue,
} from "../../game/world-state.js";

function commaList(value) {
  return String(value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function buildRegionConditionPreview(preview = {}, common = {}, regionConfig = null) {
  let worldState = normalizeWorldState(preview.worldState);
  for (const flag of commaList(common.flags)) worldState = setWorldFlag(worldState, flag, true);
  if (common.corruption !== "" && common.corruption !== undefined && common.corruption !== null) {
    worldState = setWorldValue(
      worldState,
      regionWorldStateKey(regionConfig?.id ?? "preview", "corruptionLevel"),
      Number(common.corruption),
    );
  }
  const context = {
    ...preview,
    worldState,
    questState: {
      ...(preview.questState ?? {}),
      active: commaList(common.activeQuests),
      completed: commaList(common.completedQuests),
    },
    cityStats: {
      ...(preview.cityStats ?? {}),
      ...(common.cityThreat === "" || common.cityThreat === undefined || common.cityThreat === null
        ? {}
        : { cityThreat: Number(common.cityThreat) }),
    },
    regionConfig,
    regionId: regionConfig?.id,
  };
  return { worldState, context };
}
