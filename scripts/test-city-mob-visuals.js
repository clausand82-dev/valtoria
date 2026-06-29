import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});

try {
  const { calculateCityStats, cityMobOccupationStatusText, cityMobVisualDiagnostics, pickCityBattleRegion } = await server.ssrLoadModule("/src/app/city-systems.jsx");
  const { questsMethods } = await server.ssrLoadModule("/src/game/GameEngine/methods/quests.js");
  const { CITY_MOB_BATTLE_PROFILES } = await server.ssrLoadModule("/src/game/config/city-mobs-battle-config.js");
  const { REGION_OBJECT_DEFS } = await server.ssrLoadModule("/src/game/config/region-object-config.js");
  const { resolveMapRegionConfig } = await server.ssrLoadModule("/src/game/world-state.js");
  const mob = (id, areaId, extra = {}) => ({
    id,
    areaId,
    mobType: "Skeleton",
    level: 3,
    count: 2,
    ...extra,
  });
  const diagnostic = (entry) => cityMobVisualDiagnostics([entry])[0];

  const legacy = diagnostic(mob("legacy", "NW_SPAWN_CLOSE"));
  const occupiedArea = diagnostic(mob("area", "NW_SPAWN_CLOSE", {
    breachState: "inside",
    occupiedAreaId: "market",
  }));
  const occupiedBuilding = diagnostic(mob("building", "NW_SPAWN_CLOSE", {
    breachState: "inside",
    occupiedBuildingId: "blacksmith",
  }));
  const occupiedBuildingPriority = diagnostic(mob("building-priority", "NW_SPAWN_CLOSE", {
    breachState: "inside",
    occupiedAreaId: "market",
    occupiedBuildingId: "blacksmith",
  }));
  const invalidTarget = diagnostic(mob("invalid", "NW_SPAWN_CLOSE", {
    breachState: "inside",
    occupiedAreaId: "missing_area",
    occupiedBuildingId: "missing_building",
  }));
  const invalidBaseline = diagnostic(mob("invalid", "NW_SPAWN_CLOSE"));
  const overlapInput = [
    mob("overlap-b", "SW_SPAWN_CLOSE", { breachState: "inside", occupiedBuildingId: "blacksmith" }),
    mob("overlap-a", "NW_SPAWN_CLOSE", { breachState: "inside", occupiedBuildingId: "blacksmith" }),
  ];
  const overlap = cityMobVisualDiagnostics(overlapInput);
  const overlapRepeat = cityMobVisualDiagnostics([...overlapInput].reverse());
  const innStats = calculateCityStats({
    cityMobs: [mob("inn-occupier", "NW_SPAWN_CLOSE", {
      breachState: "inside",
      occupiedBuildingId: "inn",
      occupationProfileId: "inn_disruption",
    })],
  });
  const bankRaidStats = calculateCityStats({
    cityMobs: [mob("bank-occupier", "NE_SPAWN_CLOSE", {
      breachState: "inside",
      occupiedBuildingId: "bank",
      occupationProfileId: "storage_raid",
    })],
  });
  const bankBattle = pickCityBattleRegion("Wolf", "small", "NE_SPAWN_CLOSE", { occupiedBuildingId: "bank" });
  const innBattle = pickCityBattleRegion("Skeleton", "small", "NW_SPAWN_CLOSE", { occupiedBuildingId: "inn" });
  const marketBattle = pickCityBattleRegion("Peasant", "small", "NW_SPAWN_CLOSE", { occupiedAreaId: "market" });
  const outerBattle = pickCityBattleRegion("Skeleton", "small", "NW_SPAWN_CLOSE");
  const lowWealthBankBattle = resolveMapRegionConfig(bankBattle.region, {}, { cityStats: { ratios: { wealth: 0.74 } } });
  const sufficientWealthBankBattle = resolveMapRegionConfig(bankBattle.region, {}, { cityStats: { ratios: { wealth: 0.75 } } });
  const missingBattleObjectIds = [...new Set(CITY_MOB_BATTLE_PROFILES
    .flatMap((profile) => profile.objects ?? [])
    .map((entry) => String(entry?.id ?? entry))
    .filter((id) => id && !REGION_OBJECT_DEFS[id]))];
  const conditionalBattleRegion = resolveMapRegionConfig({
    ...bankBattle.region,
    objects: [
      { id: "object_metalchest", weight: 1, conditions: { flag: "cityBattle.test" } },
      { id: "object_sacks_ground", weight: 1, questActive: "city_battle_test" },
      { id: "object_barrels_ground", weight: 1, blockedBy: { flag: "cityBattle.test" } },
    ],
    mobs: [
      { type: "Wolf", weight: 90 },
      { type: "Skeleton", weight: 5, conditions: { flag: "cityBattle.test" } },
      { type: "Spider", weight: 5, questActive: "city_battle_test" },
    ],
  }, {
    flags: { "cityBattle.test": true },
    counters: {},
    values: {},
  }, {
    questState: { active: [{ questId: "city_battle_test" }], completed: [] },
  });
  let disabledBoardRolled = false;
  const disabledBoard = questsMethods.rollQuestBoard.call({
    cityStats: innStats,
    questBoardDef: () => ({ id: "inn", source: "inn" }),
    questBoardState: () => {
      disabledBoardRolled = true;
      return { availableQuestIds: [], completedCooldowns: {} };
    },
    questBoardSnapshot: () => ({ disabled: true }),
  }, "inn", { cityStats: innStats });
  let disabledBoardToast = "";
  const disabledBoardAccepted = questsMethods.acceptBoardQuest.call({
    cityStats: innStats,
    questBoardDef: () => ({ id: "inn", source: "inn" }),
    addToast: (message) => {
      disabledBoardToast = message;
    },
  }, "inn", { questId: "blocked-quest" }, { cityStats: innStats });
  const positionsById = (entries) => entries
    .map((entry) => [entry.id, entry.x, entry.y])
    .sort(([a], [b]) => a.localeCompare(b));

  const checks = {
    legacyArea: legacy.visualTargetId === "NW_SPAWN_CLOSE",
    occupiedArea: occupiedArea.visualTargetId === "market"
      && occupiedArea.visualAreaId === "market"
      && cityMobOccupationStatusText(occupiedArea) === "Occupying: Market",
    occupiedBuilding: occupiedBuilding.visualTargetId === "blacksmith"
      && occupiedBuilding.x === 1010
      && occupiedBuilding.y === 548,
    occupiedBuildingPriority: occupiedBuildingPriority.visualTargetId === "blacksmith",
    invalidFallback: invalidTarget.visualTargetId === "NW_SPAWN_CLOSE"
      && invalidTarget.x === invalidBaseline.x
      && invalidTarget.y === invalidBaseline.y,
    overlapDistinct: overlap[0].x !== overlap[1].x || overlap[0].y !== overlap[1].y,
    overlapStable: JSON.stringify(positionsById(overlap)) === JSON.stringify(positionsById(overlapRepeat)),
    innRuntimeLocks: innStats.runtimeModifiers?.innRumorBoardDisabled === true
      && innStats.runtimeModifiers?.innMainChestDisabled === true,
    bankStorageLock: bankRaidStats.runtimeModifiers?.buildingStorageDisabled === true,
    occupiedBattleProfiles: bankBattle?.region?.id === "citymob:city-bank-vault"
      && innBattle?.region?.id === "citymob:city-inn-taproom"
      && marketBattle?.region?.id === "citymob:city-area-market"
      && outerBattle?.region?.id === "citymob:city-nw-ruins",
    bankVaultWealthGate: !lowWealthBankBattle.objects.some((entry) => entry.id === "object_vault")
      && sufficientWealthBankBattle.objects.some((entry) => entry.id === "object_vault" && !entry.cityStat),
    battleObjectIdsValid: missingBattleObjectIds.length === 0,
    battleEntryConditions: conditionalBattleRegion.objects.length === 2
      && conditionalBattleRegion.objects.every((entry) => !entry.conditions && !entry.questActive && !entry.blockedBy)
      && conditionalBattleRegion.mobs.length === 3
      && conditionalBattleRegion.mobs.every((entry) => !entry.conditions && !entry.questActive),
    innBoardRollBlocked: disabledBoard?.disabled === true && disabledBoardRolled === false,
    innBoardAcceptBlocked: disabledBoardAccepted === false && disabledBoardToast.includes("disabled"),
  };

  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error(JSON.stringify({ checks, legacy, occupiedArea, occupiedBuilding, occupiedBuildingPriority, invalidTarget, overlap }, null, 2));
  }
  console.log("[city-mob-visuals] OK", checks);
} finally {
  await server.close();
}
