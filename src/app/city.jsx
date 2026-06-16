import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_INVENTORY,
  RARITIES,
  TILE_H,
  TILE_W,
  inventorySlotRequiredLevel,
  inventoryUnlockedSlotCount,
} from "../game/data.js";
import { drawGroundTile, drawShadow, loadGeneratedAtlas } from "../game/assets-ground.js";
import { GameEngine } from "../game/GameEngine.js";
import { makeItem, itemValue, makePotion } from "../game/world.js";
import { consumePotionInputs, inventoryCanAccept, isQuestComplete, makeResourceItem, questItemCanStack, questItemsCanStack, questItemStackMax, resourceStackMax } from "../game/GameEngine/helpers.js";
import { ATLAS_FRAMES } from "../game/assets.js";
import { screenToWorld, worldToIso, worldToScreen } from "../game/iso.js";
import { RESOURCE_DEFS, RESOURCE_MERGE_RECIPES } from "../game/config/resource-config.js";
import { normalizePotionId, potionDefById } from "../game/config/potion-config.js";
import { READABLE_DEF_BY_ID, READABLE_ITEM_DEFS } from "../game/config/readable-config.js";
import { CITY_AREAS, CITY_AREA_LABEL_OPTIONS, CITY_MAP_IMAGE, CITY_NPC_AREA, CITY_NPC_POINTS } from "../game/config/city-areas-config.js";
import { CITY_BUILDINGS } from "../game/config/city-buildings-config.js";
import { armyTrainingRecipesForAddon } from "../game/config/city-army-recipe-config.js";
import { CITY_ARMY_UNIT_DEFS, normalizeArmyUnits } from "../game/config/city-army-unit-config.js";
import { DURABILITY_DEFAULT, DURABILITY_DEGRADE_CHANCE, DURABILITY_DEGRADE_MIN_PCT, DURABILITY_DEGRADE_MAX_PCT } from "../game/config/durability-config.js";
import { CITY_STATS_RULES } from "../game/config/city-stats-rules-config.js";
import {
  getArmoryConversion,
  getArmoryItemQuantity,
  getArmoryPointTarget,
  getArmoryPointValue,
  canConvertItemToArmory,
} from "../game/config/armory-config.js";
import { SPELL_DEFS } from "../game/config/spell-config.js";
import { GEM_SOCKET_BONUSES, MAX_ITEM_SOCKETS, itemCanHaveSockets, normalizeSockets } from "../game/config/socket-config.js";
import {
  SKILL_TREE_BRANCHES,
  skillTreeAvailablePoints,
  skillTreeBranchSpentPoints,
  normalizeSkillTree,
} from "../game/config/skill-tree-config.js";
import { AREA_MAPS, MAP_REGION_SETS, WORLD_MAP } from "../game/config/map-region-config.js";
import { cityEventEntries } from "../game/config/city-config.js";
import { blacksmithDurabilityModifiers, cityRuntimeModifiers } from "../game/config/city-consequence-resolver.js";
import { QUEST_BOARD_CONFIG, QUEST_DEFS, QUEST_ITEM_DEFS } from "../game/config/quest-config.js";
import { QUEST_NPCS } from "../game/config/npc-config.js";
import { MAX_POTION_STACK, SAVE_STORAGE_KEY, SAVE_VERSION, SHOW_INACTIVE_CITY_NPCS } from "../game/config/game-engine-config.js";
import { SAVE_PERSIST_CONFIG } from "../game/config/save-persist-config.js";
import { getKnownFactions, normalizeFactionRep } from "../game/config/faction-config.js";
import {
  CITY_MOB_DAMAGE_PER_LEVEL_PCT,
  CITY_MOB_LEVELS,
  CITY_MOB_LEVEL_UP_CHANCE,
  CITY_MOB_MAX_LEVEL,
  CITY_SPAWN_AREA_BUILDING_TARGETS,
  CITY_SPAWN_AREA_RULES,
  CITY_SPAWN_PATHS,
  CITY_SPAWN_SPREAD_TARGETS,
  CITY_THREAT_SPAWN_THRESHOLD,
  calcCitySpawnChance,
  pickCityMobType,
} from "../game/config/city-mobs-attack-config.js";
import {
  deriveIconKey,
  iconUrlFromKey,
  isEquippableItem,
  isPotionItem,
  isQuestItem,
  isReadableItem,
  isResourceItem,
} from "../game/item-system.js";

import {
  ImageIcon,
  InventoryIcon,
  ITEM_GOLD_ICON_URL,
  ITEM_MONEY_ICON_URL,
} from "./ui/icons.jsx";
import {
  CITY_CITIZEN_CONDITION_DEFS,
  CITY_STAT_ALIASES,
  CITY_STAT_ICON_URLS,
} from "./hud/resource-bar.jsx";
import { CITY_STORAGE_KEY, regionStatusKey } from "./save/save-keys.js";
import { ReadableDialog } from "./inventory/readable-dialog.jsx";
import { InventorySortSelect } from "./inventory/inventory-sort-select.jsx";
import { BestiaryViewer } from "./bestiary-viewer.jsx";
import { QuestDetailCard, QuestObjectiveMeta } from "./quests/quest-dialogs.jsx";
import { mapRegionColor } from "./map/map-dialogs.jsx";
import { emptySnapshot } from "./app-snapshot.js";
import {
  CITY_BUILDING_CHIPS_ALWAYS_VISIBLE,
} from "./city-constants.js";
import { sortInventorySlots } from "../game/inventory-sort.js";
import {
  CityArcaneExtractorPanel,
  CityBlacksmithPanel,
  CityFarmAlePanel,
  CityFarmPanel,
  CityGoldBarPanel,
  CityInnAlePanel,
  CityMerchantPanel,
  CityPotionLabPanel,
  CitySanctuaryDonationPanel,
  CityClassPanel,
  CityReadableMergePanel,
  CityResearchPanel,
  CitySkillTreePanel,
  CitySocketPanel,
} from "./city-panels.jsx";

import {
  addCityPermanentStatBonus,
  addCityStatAdjustment,
  addCityArmoryPoints,
  cityArmoryPoints,
  applyCityMobProgressForVisit,
  updateRegionCorruptionFromMapReturn,
  calculateCityStats,
  calculateCityStatBreakdown,
  normalizeRegionCorruptionEntry,
  getRegionCorruptionLevel,
  setRegionCorruptionLevel,
  cityAreaActiveStatEffects,
  cityAreaBuildingRefs,
  cityAreaCanUnlock,
  cityAreaCenter,
  cityAreaCostEntries,
  cityAreaGateEntries,
  cityAreaGeometry,
  cityAreaLayerUrls,
  cityAreaNextLevel,
  cityAreaPathD,
  cityAreaPreviewLayerUrls,
  isCityBuildingOwned,
  imageSourceWidth,
  imageSourceHeight,
  getCityQuestOffset,
  getCityBuildingState,
  cityImageForBuilding,
  cityImageForAddon,
  cityBuildingImageKey,
  cityBuildingFromHouse,
  cityAddonImageKey,
  cityAssetCache,
  cityAttackableMobIds,
  cityBuildingActiveStatEffects,
  cityBuildingIconText,
  cityBuildingLayerUrls,
  cityBuildingNextLevel,
  cityBuildingRuinImageKey,
  cityCostAvailable,
  cityCostLabel,
  cityArmyCanTrainUnit,
  cityArmyUnitCount,
  cityUsableSoldierCapacity,
  availablePopulationForRecruitment,
  cityLevelCostEntries,
  cityMapMobRefs,
  cityMapPositionStyle,
  cityReachedLevels,
  cityStatLabel,
  cityStatRequirementEntries,
  cityStatsMeetRequirements,
  computeRepairCostEntries,
  buildCityTerrainLayer,
  getCityAreaState,
  getCityLayout,
  getCityMapQuestNpcs,
  isCityAreaUnlocked,
  addCityArmyUnit,
  loadCityAssets,
  loadCityAssetsOnce,
  loadCityProgress,
  loadImage,
  mergeCityStatEffects,
  normalizeCityMobs,
  payCityCostEntries,
  pickCityBattleRegion,
  removeCityArmyUnits,
  resolveCityArmyBattle,
  saveCityProgress,
} from "./city-systems.jsx";

import {
  CityItemName,
  CityItemSlot,
  applyDurabilityDegradationForVisit,
  cityResourceCount,
  foodBarrelCost,
  generateMerchantStock,
  goldBarUnitCost,
  merchantBuyPrice,
  merchantCloneItem,
  merchantItemCanTrade,
  merchantSellPrice,
  merchantTradeQuantity,
  parseCityDragPayload,
  readableDialogFromItem,
  rerollMerchantStockForCityVisit,
  researchRecipeByKey,
  researchRecipeCost,
  researchRecipeKey,
} from "./city-panel-helpers.jsx";

const CITY_DAMAGE_SMOKE_TEXTURES = [
  "/assets/generated/particles/chimney_smoke.png",
  "/assets/generated/particles/smoke_puff.png",
  "/assets/generated/particles/smokey_explosion.png",
];
const CITY_DAMAGE_FIRE_TEXTURES = [
  //"/assets/generated/particles/flame_01.png",
  //"/assets/generated/particles/flame_02.png",
  //"/assets/generated/particles/flame_03.png",
  //"/assets/generated/particles/flame_04.png",
  "/assets/generated/particles/flame_09.png",
  "/assets/generated/particles/flame_10.png",
  "/assets/generated/particles/flame_11.png",
  "/assets/generated/particles/flame_12.png",
];

function CityPage({
  engineRef,
  snapshot,
  setSnapshot,
  cityStorageKey = CITY_STORAGE_KEY,
  cityProgressRefreshToken = 0,
  skipMobProgressForVisit = false,
  regionCorruption = {},
  onMobProgressSkipConsumed,
  onClose,
  onQuestCompleted,
  onProgressChange,
  onStartCityMobBattle,
  storageOpen = false,
  onCloseStorage,
}) {
  const backpackCapacity = inventoryUnlockedSlotCount(snapshot?.player?.level);
  const snapshotRef = useRef(snapshot);
  const cityStorageKeyRef = useRef(cityStorageKey);
  const [loadingCity, setLoadingCity] = useState(!cityAssetCache.assets);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [selectedQuestNpcId, setSelectedQuestNpcId] = useState(null);
  const [hoveredAreaId, setHoveredAreaId] = useState(null);
  const [hoveredBuildingId, setHoveredBuildingId] = useState(null);
  const [clickedAreaId, setClickedAreaId] = useState(null);
  const [selectedCityMobId, setSelectedCityMobId] = useState(null);
  const [armyBattleResult, setArmyBattleResult] = useState(null);
  const [globalStorageDrag, setGlobalStorageDrag] = useState(null);
  const [cityProgress, setCityProgress] = useState(() => loadCityProgress(cityStorageKey));
  const [cityAssets, setCityAssets] = useState(() => cityAssetCache.assets ?? { houseImages: {}, npcImages: {} });
  const cityProgressRef = useRef(cityProgress);
  const npcPlacementSeedRef = useRef(Math.floor(Math.random() * 1000000));
  const skippedMobProgressForVisitRef = useRef(false);
  const interactiveAreas = useMemo(() => CITY_AREAS.filter((area) => area.interactive !== false), []);
  const hoveredArea = useMemo(
    () => interactiveAreas.find((area) => area.id === hoveredAreaId) ?? null,
    [hoveredAreaId, interactiveAreas],
  );
  const clickedArea = useMemo(
    () => interactiveAreas.find((area) => area.id === clickedAreaId) ?? null,
    [clickedAreaId, interactiveAreas],
  );
  const activeAreaPanel = clickedArea ?? hoveredArea;
  const hoveredBuilding = useMemo(
    () => CITY_BUILDINGS.find((building) => building.id === hoveredBuildingId) ?? null,
    [hoveredBuildingId],
  );
  const unlockedLayerUrls = useMemo(() => (
    interactiveAreas
      .filter((area) => isCityAreaUnlocked(cityProgress, area))
      .flatMap((area) => cityAreaLayerUrls(area, cityProgress))
      .concat(cityBuildingLayerUrls(cityProgress))
  ), [cityProgress, interactiveAreas]);
  const previewLayerUrls = useMemo(() => {
    const previewAreas = [hoveredArea, clickedArea]
      .filter(Boolean)
      .filter((area, index, list) => list.findIndex((candidate) => candidate.id === area.id) === index)
      .filter((area) => !isCityAreaUnlocked(cityProgress, area));
    return previewAreas.flatMap((area) => cityAreaPreviewLayerUrls(area));
  }, [hoveredArea, clickedArea, cityProgress]);
  const hoverAreaBuildings = useMemo(() => (
    hoveredArea && isCityAreaUnlocked(cityProgress, hoveredArea)
      ? cityAreaBuildingRefs(hoveredArea)
      : []
  ), [hoveredArea, cityProgress]);
  const visibleAreaBuildingGroups = useMemo(() => {
    return interactiveAreas
      .filter((area) => isCityAreaUnlocked(cityProgress, area))
      .map((area) => ({
        area,
        buildingRefs: cityAreaBuildingRefs(area),
      }))
      .filter((group) => group.buildingRefs.length > 0);
  }, [interactiveAreas, cityProgress]);
  const visibleDamageAreas = useMemo(() => (
    interactiveAreas.filter((area) => isCityAreaUnlocked(cityProgress, area))
  ), [interactiveAreas, cityProgress]);
  const activeAreaPanelBuildings = useMemo(() => (
    activeAreaPanel && isCityAreaUnlocked(cityProgress, activeAreaPanel)
      ? cityAreaBuildingRefs(activeAreaPanel)
      : []
  ), [activeAreaPanel, cityProgress]);
  const cityMapNpcs = useMemo(() => (
    getCityMapQuestNpcs(snapshot.quests?.cityNpcStates ?? [], SHOW_INACTIVE_CITY_NPCS, npcPlacementSeedRef.current)
  ), [snapshot.quests?.cityNpcStates]);
  const cityStats = useMemo(() => calculateCityStats(cityProgress, snapshot, regionCorruption), [cityProgress, snapshot, regionCorruption]);
  const cityEventModifiers = useMemo(() => cityRuntimeModifiers(cityStats), [cityStats]);
  const cityMobs = useMemo(() => normalizeCityMobs(cityProgress?.cityMobs), [cityProgress?.cityMobs]);
  const attackableCityMobIds = useMemo(() => cityAttackableMobIds(cityMobs), [cityMobs]);
  const cityMobRefs = useMemo(() => cityMapMobRefs(cityMobs), [cityMobs]);
  const cityNpcImageUrls = useMemo(() => {
    const entries = Object.entries(cityAssets.npcImages ?? {}).map(([npcId, image]) => {
      if (!image || typeof image.toDataURL !== "function") return [npcId, QUEST_NPCS[npcId]?.imageUrl ?? ""];
      try {
        return [npcId, image.toDataURL("image/png")];
      } catch {
        return [npcId, QUEST_NPCS[npcId]?.imageUrl ?? ""];
      }
    });
    return Object.fromEntries(entries);
  }, [cityAssets.npcImages]);
  const cityBuildingImageUrls = useMemo(() => {
    const entries = Object.entries(cityAssets.houseImages ?? {}).map(([key, image]) => {
      if (!image || typeof image.toDataURL !== "function") return [key, ""];
      try {
        return [key, image.toDataURL("image/png")];
      } catch {
        return [key, ""];
      }
    });
    return Object.fromEntries(entries);
  }, [cityAssets.houseImages]);

  useEffect(() => {
    cityStorageKeyRef.current = cityStorageKey;
    setCityProgress(loadCityProgress(cityStorageKey));
    setHoveredAreaId(null);
    setHoveredBuildingId(null);
    setClickedAreaId(null);
  }, [cityStorageKey]);

  useEffect(() => {
    setCityProgress(loadCityProgress(cityStorageKey));
  }, [cityProgressRefreshToken, cityStorageKey]);

  useEffect(() => {
    setCityProgress((current) => rerollMerchantStockForCityVisit(
      current,
      snapshotRef.current.player?.level ?? 1,
      calculateCityStats(current, snapshotRef.current, regionCorruption),
    ));
  }, [cityStorageKey]);

  // Apply durability degradation on each city visit
  useEffect(() => {
    setCityProgress((current) => applyDurabilityDegradationForVisit(
      current,
      calculateCityStats(current, snapshotRef.current, regionCorruption),
    ));
  }, [cityStorageKey]);

  // Spawn and progress city mobs on each city visit.
  useEffect(() => {
    if (skipMobProgressForVisit) {
      skippedMobProgressForVisitRef.current = true;
      return () => onMobProgressSkipConsumed?.();
    }
    if (skippedMobProgressForVisitRef.current) {
      return;
    }
    setCityProgress((current) => applyCityMobProgressForVisit(
      current,
      calculateCityStats(current, snapshotRef.current, regionCorruption),
    ));
  }, [cityStorageKey]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.cityStats = cityStats;
    engineRef.current.cityProgress = cityProgress;
  }, [engineRef, cityStats, cityProgress]);

  useEffect(() => {
    if (!engineRef.current) return;
    const context = { cityStats, cityProgress };
    engineRef.current.rollQuestBoard?.("townHall", context);
    engineRef.current.rollQuestBoard?.("inn", context);
  }, [engineRef, cityStats, cityProgress]);

  useEffect(() => {
    const selectedBuilding = CITY_BUILDINGS.find((building) => building.id === selectedBuildingId);
    const readableFeature = cityBuildingOwnedAddons(cityProgress, selectedBuilding).find((addon) => addon.panel === "readableMerge");
    const station = readableFeature?.config?.kind === "spellbook"
      ? "mage_tower"
      : readableFeature?.config?.kind === "lorenote"
        ? "library"
        : "backpack";
    engineRef.current?.setReadableMergeStation?.(station);
  }, [selectedBuildingId, cityProgress, engineRef]);

  useEffect(() => {
    if (cityStorageKeyRef.current !== cityStorageKey) return;
    cityProgressRef.current = cityProgress;
    onProgressChange?.(cityProgress);
    saveCityProgress(cityProgress, cityStorageKey);
    engineRef.current?.saveProgress?.({ force: true });
  }, [cityProgress, cityStorageKey, engineRef, onProgressChange]);

  useEffect(() => {
    let cancelled = false;
    loadCityAssets().then((assets) => {
      if (cancelled) return;
      setCityAssets(assets ?? { houseImages: {}, npcImages: {} });
      setLoadingCity(false);
    }).catch(() => {
      if (cancelled) return;
      setLoadingCity(false);
    });

    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        onClose();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelled = true;
      engineRef.current?.setReadableMergeStation?.("backpack");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const unlockArea = (area) => {
    if (!area || isCityAreaUnlocked(cityProgressRef.current, area)) return;
    const stats = calculateCityStats(cityProgressRef.current, snapshotRef.current, regionCorruption);
    if (!cityAreaCanUnlock(area, snapshotRef.current, stats, cityProgressRef.current)) return;
    const paid = payCityEntries(cityAreaCostEntries(area));
    if (!paid) return;
    setCityProgress((current) => ({
      ...current,
      areas: {
        ...(current.areas ?? {}),
        [area.id]: { unlocked: true, level: 1, unlockedAt: Date.now(), durability: DURABILITY_DEFAULT },
      },
    }));
  };

  const upgradeArea = (area) => {
    if (!area || !isCityAreaUnlocked(cityProgressRef.current, area)) return;
    const stats = calculateCityStats(cityProgressRef.current, snapshotRef.current, regionCorruption);
    const state = getCityAreaState(cityProgressRef.current, area);
    const nextLevel = cityAreaNextLevel(area, state.level);
    if (!nextLevel) return;
    if (!cityStatsMeetRequirements(nextLevel.statRequirements ?? nextLevel.unlock?.statRequirements, stats)) return;
    if (!payCityEntries(cityLevelCostEntries(nextLevel))) return;
    setCityProgress((current) => ({
      ...current,
      areas: {
        ...(current.areas ?? {}),
        [area.id]: {
          ...(typeof current.areas?.[area.id] === "object" ? current.areas[area.id] : {}),
          unlocked: true,
          level: nextLevel.level,
          upgradedAt: Date.now(),
        },
      },
    }));
  };

  const repairArea = (area, percent = null) => {
    if (!area) return;
    const progressState = cityProgressRef.current ?? {};
    const areaState = (progressState.areas ?? {})[area.id] ?? (area.prebuilt ? { unlocked: true, level: 1, durability: DURABILITY_DEFAULT } : null);
    if (!areaState) return;
    const currentDur = Math.max(0, Math.min(100, Number(areaState.durability ?? DURABILITY_DEFAULT)));
    const missing = Math.max(0, Math.ceil((percent === null ? 100 - currentDur : percent)));
    if (missing <= 0) return;
    const baseCost = area.unlock?.cost ?? area.cost ?? {};
    const repairEntries = computeRepairCostEntries(baseCost, missing);

    const deficits = repairEntries
      .map(([resourceId, amount]) => ({ resourceId, amount, available: cityCostAvailable(snapshotRef.current, resourceId, progressState) }))
      .filter((entry) => entry.available < entry.amount);
    if (deficits.length > 0) {
      const parts = deficits.map((d) => `${cityCostLabel(d.resourceId)} ${d.amount} (du har ${d.available})`);
      engineRef.current?.addToast?.(`Kan ikke reparere: mangler ${parts.join(", ")}`);
      return;
    }

    const paid = payCityEntries(repairEntries, progressState);
    if (!paid) {
      engineRef.current?.addToast?.("Betaling mislykkedes ved reparation af område.");
      return;
    }

    setCityProgress((current) => ({
      ...current,
      areas: {
        ...(current.areas ?? {}),
        [area.id]: {
          ...(current.areas?.[area.id] ?? {}),
          durability: Math.min(100, Math.max(0, Number((current.areas?.[area.id]?.durability ?? DURABILITY_DEFAULT))) + missing),
        },
      },
    }));

    engineRef.current?.addToast?.(`Område repareret: +${missing}%`);
  };

  const hoverArea = (area) => {
    setHoveredAreaId(area.id);
  };

  const selectArea = (area) => {
    setClickedAreaId(area.id);
    setHoveredAreaId(area.id);
  };

  const openBuilding = (buildingId) => {
    setSelectedQuestNpcId(null);
    setSelectedBuildingId(buildingId);
  };

  const payCityEntries = (entries, progressOverride = cityProgressRef.current) => (
    payCityCostEntries(entries, engineRef.current, snapshotRef.current, progressOverride, setCityProgress)
  );

  const cityResourceAvailable = (resourceId, progressOverride = cityProgressRef.current) => (
    cityCostAvailable(snapshotRef.current, resourceId, progressOverride)
  );

  const storageEntries = useMemo(() => {
    const entries = [];
    for (const building of CITY_BUILDINGS) {
      const owned = isCityBuildingOwned(cityProgress, building);
      if (!owned) continue;
      const state = getCityBuildingState(cityProgress, building);
      const sections = cityInventorySections(building, state, owned);
      const inventories = normalizeCityInventories(state, building);
      for (const section of sections) {
        entries.push({
          building,
          buildingId: building.id,
          section,
          items: inventories[section.key] ?? [],
        });
      }
    }
    return entries;
  }, [cityProgress]);

  const findStorageEntry = (progress, buildingId, sectionKey) => {
    const building = CITY_BUILDINGS.find((entry) => entry.id === buildingId);
    if (!building || !isCityBuildingOwned(progress, building)) return null;
    const state = getCityBuildingState(progress, building);
    const section = cityInventorySections(building, state, true).find((entry) => entry.key === sectionKey);
    if (!section) return null;
    return { building, state, section };
  };

  const depositInventoryItemToStorage = (inventoryIndex, buildingId, sectionKey, slotIndex) => {
    const item = snapshotRef.current.inventory?.[inventoryIndex];
    const liveItem = engineRef.current?.player?.inventory?.[inventoryIndex] ?? item;
    if (!cityInventoryItemsSameTransferIdentity(item, liveItem)) {
      engineRef.current?.addToast?.("Backpack ændrede sig. Prøv igen.");
      return;
    }
    const target = findStorageEntry(cityProgressRef.current, buildingId, sectionKey);
    if (!target || target.section.fixedDefs?.[slotIndex]) return;
    if (slotIndex >= target.section.slots || !itemMatchesCityInventorySlot(liveItem, target.section, slotIndex)) return;
    const inventories = normalizeCityInventories(target.state, target.building);
    const depositPlan = planCityInventoryDeposit(liveItem, target.section, slotIndex, inventories[sectionKey] ?? []);
    if (!depositPlan || depositPlan.movedCount <= 0) return;
    const taken = engineRef.current?.takeInventoryItemCount?.(inventoryIndex, depositPlan.movedCount)
      ?? engineRef.current?.takeInventoryItem?.(inventoryIndex);
    if (!taken) return;
    if (!cityInventoryItemsSameTransferIdentity(liveItem, taken)) {
      engineRef.current?.returnInventoryItem?.(normalizeCityStoredItem(taken));
      engineRef.current?.addToast?.("Storage transfer blev afbrudt.");
      return;
    }
    setCityProgress((current) => {
      const currentTarget = findStorageEntry(current, buildingId, sectionKey);
      if (!currentTarget) return current;
      const nextInventories = normalizeCityInventories(currentTarget.state, currentTarget.building);
      const items = [...(nextInventories[sectionKey] ?? [])];
      const takenWithSnapshotIcon = normalizeCityStoredItem({
        ...taken,
        iconKey: item?.iconKey ?? taken.iconKey,
        iconUrl: item?.iconUrl ?? taken.iconUrl,
        iconSheet: item?.iconSheet ?? taken.iconSheet,
        iconIndex: item?.iconIndex ?? taken.iconIndex,
      });
      applyCityInventoryDepositPlan(items, takenWithSnapshotIcon, depositPlan);
      return {
        ...current,
        [buildingId]: {
          ...(current[buildingId] ?? {}),
          inventories: {
            ...nextInventories,
            [sectionKey]: items,
          },
        },
      };
    });
  };

  const withdrawStoredItemToBackpack = (buildingId, sectionKey, slotIndex) => {
    const source = findStorageEntry(cityProgressRef.current, buildingId, sectionKey);
    if (!source || source.section.fixedDefs?.[slotIndex]) return;
    const inventories = normalizeCityInventories(source.state, source.building);
    const item = inventories[sectionKey]?.[slotIndex];
    if (!item || !engineRef.current?.returnInventoryItem?.(normalizeCityStoredItem(item))) return;
    setCityProgress((current) => {
      const currentSource = findStorageEntry(current, buildingId, sectionKey);
      if (!currentSource) return current;
      const nextInventories = normalizeCityInventories(currentSource.state, currentSource.building);
      const items = [...(nextInventories[sectionKey] ?? [])];
      items[slotIndex] = null;
      return {
        ...current,
        [buildingId]: {
          ...(current[buildingId] ?? {}),
          inventories: {
            ...nextInventories,
            [sectionKey]: items,
          },
        },
      };
    });
  };

  const moveStoredItemBetweenStorage = (fromBuildingId, fromSectionKey, fromSlotIndex, toBuildingId, toSectionKey, toSlotIndex) => {
    setCityProgress((current) => {
      const fromEntry = findStorageEntry(current, fromBuildingId, fromSectionKey);
      const toEntry = findStorageEntry(current, toBuildingId, toSectionKey);
      if (!fromEntry || !toEntry) return current;
      if (fromEntry.section.fixedDefs?.[fromSlotIndex] || toEntry.section.fixedDefs?.[toSlotIndex]) return current;
      if (fromSlotIndex >= fromEntry.section.slots || toSlotIndex >= toEntry.section.slots) return current;

      const fromInventories = normalizeCityInventories(fromEntry.state, fromEntry.building);
      const toInventories = fromBuildingId === toBuildingId
        ? fromInventories
        : normalizeCityInventories(toEntry.state, toEntry.building);
      const fromItems = [...(fromInventories[fromSectionKey] ?? [])];
      const toItems = fromBuildingId === toBuildingId && fromSectionKey === toSectionKey
        ? fromItems
        : [...(toInventories[toSectionKey] ?? [])];
      const moving = fromItems[fromSlotIndex];
      const target = toItems[toSlotIndex];
      if (!moving || !itemMatchesCityInventorySlot(moving, toEntry.section, toSlotIndex)) return current;
      if (target && !itemMatchesCityInventorySlot(target, fromEntry.section, fromSlotIndex)) return current;

      if (cityInventoryItemsCanStack(moving, target)) {
        const stackMax = cityInventoryStackMax(moving);
        const movingCount = Math.max(1, Math.floor(Number(moving.count) || 1));
        const targetCount = Math.max(1, Math.floor(Number(target.count) || 1));
        const moved = Math.min(stackMax - targetCount, movingCount);
        if (moved <= 0) return current;
        toItems[toSlotIndex] = { ...target, count: targetCount + moved };
        fromItems[fromSlotIndex] = movingCount > moved ? { ...moving, count: movingCount - moved } : null;
      } else {
        fromItems[fromSlotIndex] = target ?? null;
        toItems[toSlotIndex] = moving;
      }

      const next = { ...current };
      next[fromBuildingId] = {
        ...(current[fromBuildingId] ?? {}),
        inventories: {
          ...fromInventories,
          [fromSectionKey]: fromItems,
        },
      };
      if (fromBuildingId === toBuildingId) {
        next[toBuildingId] = {
          ...next[toBuildingId],
          inventories: {
            ...next[toBuildingId].inventories,
            [toSectionKey]: toItems,
          },
        };
      } else {
        next[toBuildingId] = {
          ...(current[toBuildingId] ?? {}),
          inventories: {
            ...toInventories,
            [toSectionKey]: toItems,
          },
        };
      }
      return next;
    });
  };

  const sortStoredItems = (buildingId, sectionKey, sortId) => {
    setCityProgress((current) => sortCityStorageSection(current, buildingId, sectionKey, sortId));
  };

  const backpackResourceCanAccept = (resourceId, count = 1, paidEntries = []) => {
    const output = makeResourceItem(resourceId, count);
    if (!output) return false;
    const stackMax = Math.max(1, Math.floor(Number(output.stackMax ?? resourceStackMax(resourceId)) || 1));
    const inventory = (snapshotRef.current?.inventory ?? []).map((item) => item ? { ...item } : item);
    for (const [paidResourceId, paidAmount] of paidEntries) {
      let remaining = Math.max(0, Math.floor(Number(paidAmount) || 0));
      for (let index = inventory.length - 1; index >= 0 && remaining > 0; index -= 1) {
        const item = inventory[index];
        if (item?.mode !== "resource" || String(item.resourceId) !== String(paidResourceId)) continue;
        const itemCount = Math.max(1, Math.floor(Number(item.count) || 1));
        const used = Math.min(itemCount, remaining);
        remaining -= used;
        if (itemCount > used) item.count = itemCount - used;
        else inventory.splice(index, 1);
      }
    }
    if (inventory.some((item) => (
      item?.mode === "resource"
      && String(item.resourceId) === String(resourceId)
      && Math.max(1, Math.floor(Number(item.count) || 1)) < stackMax
    ))) return true;
    return inventory.length < backpackCapacity;
  };

  const convertCityResourceToResource = (inputResourceId, inputCount, outputResourceId, outputCount = 1) => {
    const cost = Math.max(1, Math.floor(Number(inputCount) || 1));
    const outCount = Math.max(1, Math.floor(Number(outputCount) || 1));
    const outputId = String(outputResourceId ?? "").trim();
    const output = makeResourceItem(outputId, outCount);
    if (!output) {
      engineRef.current?.addToast?.(`Ugyldig output resource: ${String(outputResourceId)}`);
      return false;
    }
    if (cityResourceAvailable(inputResourceId) < cost) {
      engineRef.current?.addToast?.(`Kraever ${cost}x ${RESOURCE_DEFS[inputResourceId]?.name ?? inputResourceId}`);
      return false;
    }
    if (!backpackResourceCanAccept(outputId, outCount, [[inputResourceId, cost]])) {
      engineRef.current?.addToast?.("Rygsaekken er fuld");
      return false;
    }
    const paid = payCityEntries([[inputResourceId, cost]]);
    if (!paid) return false;
    if (!engineRef.current?.addInventoryItem?.(output)) {
      engineRef.current?.addToast?.("Kunne ikke tilfoeje item til rygsaekken.");
      return false;
    }
    // Opdater snapshot.player.inventory så UI re-rendrer og viser det nye item
    if (typeof setSnapshot === "function") {
      setSnapshot((prev) => ({
        ...prev,
        player: {
          ...prev.player,
          inventory: [...engineRef.current.player.inventory],
        },
      }));
    }
    engineRef.current?.addToast?.(`Created ${outCount}x ${output.name}`);
    engineRef.current?.saveProgress?.({ force: true });
    return true;
  };

  const openNpc = (npcId) => {
    const completedTalkQuests = engineRef.current?.advanceTalkToNpcQuests?.(npcId) ?? [];
    if (completedTalkQuests.length > 0) onQuestCompleted?.(completedTalkQuests[0]);
    setSelectedBuildingId(null);
    setSelectedQuestNpcId(npcId);
  };

  const openCityMobActions = (mobId) => {
    const mob = cityMobs.find((entry) => entry.id === mobId);
    if (!mob) return;
    if (!attackableCityMobIds.has(mob.id)) {
      engineRef.current?.addToast?.("Du skal angribe den inderste mob i stien foerst.");
      return;
    }
    setSelectedCityMobId(mob.id);
  };

  const attackCityMobWithHero = async (mobId) => {
    const mob = cityMobs.find((entry) => entry.id === mobId);
    if (!mob) return;
    const levelDef = CITY_MOB_LEVELS[Math.max(1, Math.min(CITY_MOB_MAX_LEVEL, mob.level))] ?? CITY_MOB_LEVELS[1];
    const target = pickCityBattleRegion(mob.mobType, levelDef.mapSize, mob.areaId);
    if (!target) {
      engineRef.current?.addToast?.("Kunne ikke finde et egnet map til city-kamp.");
      return;
    }
    const started = await onStartCityMobBattle?.({
      areaMapId: target.areaMapId,
      region: target.region,
      cityMobId: mob.id,
      cityMobType: mob.mobType,
      cityMobLevel: mob.level,
    });
    if (!started) {
      engineRef.current?.addToast?.("Kampen kunne ikke startes.");
    } else {
      setSelectedCityMobId(null);
    }
  };

  const attackCityMobWithArmy = (mobId, sentUnits) => {
    const mob = cityMobs.find((entry) => entry.id === mobId);
    if (!mob) return;
    const result = resolveCityArmyBattle({
      progress: cityProgress,
      cityStats,
      mob,
      sentUnits,
    });
    if (Object.keys(result.usedUnits ?? {}).length === 0) return;
    setCityProgress((current) => {
      let next = removeCityArmyUnits(current, result.losses);
      if (result.won) {
        next = {
          ...next,
          cityMobs: normalizeCityMobs(next.cityMobs).filter((entry) => entry.id !== mob.id),
        };
      }
      return next;
    });
    setSelectedCityMobId(null);
    setArmyBattleResult({ ...result, mob });
  };

  return (
    <section className="city-page city-mode-page" role="dialog" aria-modal="true" aria-label="City page">
      <header className="city-page-header">
        <h2>City</h2>
      </header>
      <div className="city-map-stage">
        <div
          className="city-map-frame"
          style={{ "--city-map-aspect": `${CITY_MAP_IMAGE.width} / ${CITY_MAP_IMAGE.height}` }}
          onPointerLeave={() => setHoveredAreaId(null)}
          onClick={(event) => {
            if (event.target.closest?.(".city-map-area, .city-area-popover, .city-map-action-icon")) return;
            setClickedAreaId(null);
          }}
        >
          <img className="city-map-background" src={CITY_MAP_IMAGE.src} alt="" draggable="false" />
          {unlockedLayerUrls.map((layerUrl) => (
            <img className="city-built-layer" src={layerUrl} alt="" draggable="false" key={layerUrl} />
          ))}
          {previewLayerUrls.map((layerUrl) => (
            <img className="city-built-layer city-built-layer-preview" src={layerUrl} alt="" draggable="false" key={`preview-${layerUrl}`} />
          ))}
          <svg
            className="city-area-layer"
            viewBox={`0 0 ${CITY_MAP_IMAGE.width} ${CITY_MAP_IMAGE.height}`}
            aria-label="City districts"
          >
            {interactiveAreas.map((area) => {
              const unlocked = isCityAreaUnlocked(cityProgress, area);
              const hovered = hoveredAreaId === area.id;
              const clicked = clickedAreaId === area.id;
              return (
                <CityAreaShape
                  key={area.id}
                  area={area}
                  className={`city-map-area city-map-area-${area.category ?? "district"} ${unlocked ? "unlocked" : "locked"} ${hovered ? "hovered" : ""} ${clicked ? "selected" : ""}`}
                  aria-label={`${area.title}${unlocked ? "" : " locked"}`}
                  onPointerEnter={() => hoverArea(area)}
                  onFocus={() => hoverArea(area)}
                  onClick={() => selectArea(area)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    selectArea(area);
                  }}
                />
              );
            })}
          </svg>
          {interactiveAreas.flatMap((area) => {
            const unlocked = isCityAreaUnlocked(cityProgress, area);
            if (!area.showLabel || (unlocked && !CITY_AREA_LABEL_OPTIONS.showLabelWhenBuilt)) return [];
            return [(
              <CityAreaLabel
                area={area}
                unlocked={unlocked}
                key={area.id}
              />
            )];
          })}
          <CityBuildingDamageEffects
            areas={visibleDamageAreas}
            buildingGroups={visibleAreaBuildingGroups}
            progress={cityProgress}
          />
          {CITY_BUILDING_CHIPS_ALWAYS_VISIBLE && visibleAreaBuildingGroups.map(({ area, buildingRefs }) => (
            <CityMapHoverIcons
              area={area}
              buildingRefs={buildingRefs}
              progress={cityProgress}
              npcRefs={[]}
              buildingImageUrls={cityBuildingImageUrls}
              quests={snapshot.quests}
              onOpenBuilding={openBuilding}
              onHoverBuilding={setHoveredBuildingId}
              onOpenNpc={openNpc}
              key={area.id}
            />
          ))}
          {!CITY_BUILDING_CHIPS_ALWAYS_VISIBLE && hoveredArea && isCityAreaUnlocked(cityProgress, hoveredArea) && (
            <CityMapHoverIcons
              area={hoveredArea}
              buildingRefs={hoverAreaBuildings}
              progress={cityProgress}
              npcRefs={[]}
              buildingImageUrls={cityBuildingImageUrls}
              quests={snapshot.quests}
              onOpenBuilding={openBuilding}
              onHoverBuilding={setHoveredBuildingId}
              onOpenNpc={openNpc}
            />
          )}
          <CityMapHoverIcons
            area={{ id: "city_npcs", title: "City NPCs" }}
            buildingRefs={[]}
            npcRefs={cityMapNpcs}
            npcImageUrls={cityNpcImageUrls}
            onOpenBuilding={openBuilding}
            onHoverBuilding={setHoveredBuildingId}
            onOpenNpc={openNpc}
          />
          <CityMapMobIcons
            mobRefs={cityMobRefs}
            attackableMobIds={attackableCityMobIds}
            onAttack={openCityMobActions}
          />
          {selectedCityMobId && (
            <CityMobActionPopup
              mob={cityMobs.find((entry) => entry.id === selectedCityMobId)}
              cityProgress={cityProgress}
              cityStats={cityStats}
              onHeroBattle={() => attackCityMobWithHero(selectedCityMobId)}
              onArmyBattle={(sentUnits) => attackCityMobWithArmy(selectedCityMobId, sentUnits)}
              onClose={() => setSelectedCityMobId(null)}
            />
          )}
        </div>
        <div className={`city-area-panel-slot ${hoveredBuilding || activeAreaPanel ? "has-content" : ""}`}>
        {hoveredBuilding ? (
          <CityBuildingHoverPopover
            building={hoveredBuilding}
            snapshot={snapshot}
            progress={cityProgress}
            cityStats={cityStats}
          />
        ) : activeAreaPanel ? (
          <CityAreaPopover
            area={activeAreaPanel}
            snapshot={snapshot}
            progress={cityProgress}
            cityStats={cityStats}
            buildingRefs={activeAreaPanelBuildings}
            buildingImageUrls={cityBuildingImageUrls}
            onUnlock={() => unlockArea(activeAreaPanel)}
            onUpgrade={() => upgradeArea(activeAreaPanel)}
            onRepair={(area, percent) => repairArea(area, percent)}
          />
        ) : (
          <aside className="city-area-popover city-area-popover-empty" aria-hidden="true" />
        )}
        </div>
      </div>
      {loadingCity && (
        <div className="city-loading" role="status">
          <b>Loading city</b>
          <span>Preparing map assets...</span>
        </div>
      )}
      {!loadingCity && selectedBuildingId && (
        <CityBuildingPopup
          buildingId={selectedBuildingId}
          engineRef={engineRef}
          snapshot={snapshot}
          snapshotRef={snapshotRef}
          progress={cityProgress}
          houseImages={cityAssets.houseImages ?? {}}
          cityStats={cityStats}
          regionCorruption={regionCorruption}
          onConvertResourceToResource={convertCityResourceToResource}
          onChangeProgress={setCityProgress}
          onClose={() => setSelectedBuildingId(null)}
        />
      )}
      {!loadingCity && selectedQuestNpcId && (
        <CityQuestPopup
          npcId={selectedQuestNpcId}
          engineRef={engineRef}
          snapshotRef={snapshotRef}
          progress={cityProgress}
          npcStates={snapshot.quests?.cityNpcStates ?? []}
          onChangeProgress={setCityProgress}
          onQuestCompleted={onQuestCompleted}
          onClose={() => setSelectedQuestNpcId(null)}
        />
      )}
      {armyBattleResult && (
        <CityArmyBattleResultModal
          result={armyBattleResult}
          onClose={() => setArmyBattleResult(null)}
        />
      )}
      {storageOpen && (
        <CityStorageOverviewModal
          inventory={snapshot.inventory}
          equipment={snapshot.equipment}
          backpackUnlockedSlots={backpackCapacity}
          storageEntries={storageEntries}
          draggedCityItem={globalStorageDrag}
          onDragCityItem={setGlobalStorageDrag}
          onDepositInventoryItem={depositInventoryItemToStorage}
          onWithdrawStoredItem={withdrawStoredItemToBackpack}
          onMoveStoredItem={moveStoredItemBetweenStorage}
          onSortBackpack={(sortId) => engineRef.current?.sortInventory?.(sortId)}
          onSortStoredItems={sortStoredItems}
          onClose={onCloseStorage}
        />
      )}
      <p className="city-help">ESC: aaben kort.</p>
    </section>
  );
}

function CityAreaShape({ area, className, ...props }) {
  const shared = {
    className,
    tabIndex: "0",
    role: "button",
    ...props,
  };
  if (Array.isArray(area.rings) && area.rings.length > 0) {
    return (
      <path
        {...shared}
        d={cityAreaPathD(area)}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    );
  }
  return <polygon {...shared} points={area.points} />;
}

function CityAreaLabel({ area, unlocked }) {
  const center = cityAreaCenter(area);
  return (
    <button
      type="button"
      className={`city-area-label ${unlocked ? "unlocked" : "locked"}`}
      style={cityMapPositionStyle(center.x, center.y)}
      tabIndex={-1}
      aria-hidden="true"
    >
      {area.title}
    </button>
  );
}

function CityAreaPopover({ area, snapshot, progress, cityStats, buildingRefs, buildingImageUrls = {}, onUnlock, onUpgrade, onRepair }) {
  const unlocked = isCityAreaUnlocked(progress, area);
  const areaState = getCityAreaState(progress, area);
  const nextLevel = unlocked ? cityAreaNextLevel(area, areaState.level) : null;
  const nextLevelCostEntries = cityLevelCostEntries(nextLevel);
  const nextLevelRequirementEntries = cityStatRequirementEntries(nextLevel?.statRequirements ?? nextLevel?.unlock?.statRequirements, cityStats);
  const canUpgrade = Boolean(nextLevel)
    && nextLevelRequirementEntries.every((entry) => entry.met)
    && nextLevelCostEntries.every(([resourceId, amount]) => cityCostAvailable(snapshot, resourceId, progress) >= amount);
  const canUnlock = cityAreaCanUnlock(area, snapshot, cityStats, progress);
  const gates = cityAreaGateEntries(area, snapshot, cityStats);
  const costEntries = cityAreaCostEntries(area);
  const activeEffects = cityAreaActiveStatEffects(area, areaState.level);
  const panelImageUrl = buildingRefs[0]?.building
    ? cityBuildingMapImageUrl(buildingImageUrls, buildingRefs[0].building, progress)
    : CITY_MAP_IMAGE.src;
  const durabilityValue = Math.max(0, Math.min(100, Number(areaState.durability ?? DURABILITY_DEFAULT) || 0));
  const repairPct = Math.max(0, Math.ceil(100 - durabilityValue));
  const repairCostEntries = computeRepairCostEntries(area.unlock?.cost ?? area.cost ?? {}, repairPct);
  return (
    <aside
      className={`city-area-popover ${unlocked ? "unlocked" : "locked"}`}
    >
      <header style={{ "--city-area-panel-image": `url("${panelImageUrl}")` }}>
        <div className="city-area-panel-heading">
          <div className="city-area-panel-titleline">
            <b>{area.title}</b>
            <span>{unlocked ? `Level ${areaState.level}` : "Locked"}</span>
          </div>
          <p>{area.description ?? "No area description configured yet."}</p>
        </div>
      </header>
      {unlocked ? (
        <div className="city-area-popover-body">
          <CityPanelSection title="Stats">
            <CityStatEffectsSummary effects={activeEffects} />
          </CityPanelSection>
          {buildingRefs.length > 0 && (
            <CityPanelSection title="Buildings">
              <CityBuildingIconList buildingRefs={buildingRefs} buildingImageUrls={buildingImageUrls} progress={progress} />
            </CityPanelSection>
          )}
          {area.id === "town_center" && <CityCampStats cityStats={cityStats} />}
          <CityPanelSection title="Durability">
            <div className="city-durability-meter" style={{ "--city-durability": `${durabilityValue}%` }}>
              <div className="city-durability-meter-head">
                <div>
                  <b>{durabilityValue.toFixed(2)}%</b>
                  <span>{repairPct > 0 ? `${repairPct}% repair needed` : "Fully repaired"}</span>
                </div>
                <button
                  type="button"
                  disabled={durabilityValue >= 100}
                  onClick={() => onRepair?.(area, repairPct)}
                >
                  Repair
                </button>
              </div>
              <div className="city-durability-track" aria-label={`Durability ${durabilityValue.toFixed(2)} percent`}>
                <span />
              </div>
              <CityCostGrid entries={repairCostEntries} snapshot={snapshot} progress={progress} emptyText="Ingen resources kraeves." />
            </div>
          </CityPanelSection>
          {buildingRefs.length === 0 && <p>Empty area.</p>}
          {nextLevel && (
            <CityPanelSection title="Upgrade">
              <div className="city-area-work-card no-top-border">
                <div className="city-area-work-head">
                  <div>
                    <span>Level {nextLevel.level}{nextLevel.title ? ` - ${nextLevel.title}` : ""}</span>
                  </div>
                  <button type="button" disabled={!canUpgrade} onClick={onUpgrade}>Upgrade area</button>
                </div>
                <CityStatEffectsSummary effects={nextLevel.statEffects} />
                <CityRequirementGrid entries={nextLevelRequirementEntries} />
                <CityCostGrid entries={nextLevelCostEntries} snapshot={snapshot} progress={progress} emptyText="No price configured" />
              </div>
            </CityPanelSection>
          )}
        </div>
      ) : (
        <div className="city-area-popover-body">
          <CityPanelSection title="Stats">
            <CityStatEffectsSummary effects={area.statEffects} />
          </CityPanelSection>
          {buildingRefs.length > 0 && (
            <CityPanelSection title="Buildings">
              <CityBuildingIconList buildingRefs={buildingRefs} buildingImageUrls={buildingImageUrls} progress={progress} />
            </CityPanelSection>
          )}
          <CityPanelSection title="Unlock">
            <div className="city-area-work-card no-top-border">
              <div className="city-area-work-head">
                <span>Level 1</span>
                <button type="button" disabled={!canUnlock} onClick={onUnlock}>
                  Unlock area
                </button>
              </div>
              <CityRequirementGrid entries={gates} />
              <CityCostGrid entries={costEntries} snapshot={snapshot} progress={progress} emptyText="No price configured" />
            </div>
          </CityPanelSection>
        </div>
      )}
    </aside>
  );
}

function CityPanelSection({ title, children }) {
  return (
    <section className="city-panel-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function CityBuildingHoverPopover({ building, snapshot, progress, cityStats }) {
  const summary = cityBuildingHoverSummary(building, progress, snapshot, cityStats);
  const costEntries = Object.entries(building.cost ?? {});
  const statRequirementEntries = cityStatRequirementEntries(building.statRequirements ?? building.unlock?.statRequirements ?? building.unlock?.stats, cityStats);
  const durabilityValue = Math.max(0, Math.min(100, Number(summary.state.durability ?? DURABILITY_DEFAULT) || 0));
  return (
    <aside className={`city-area-popover city-building-hover-popover ${summary.owned ? "unlocked" : "locked"}`}>
      <header style={{ "--city-area-panel-image": `url("${building.imageUrl ?? CITY_MAP_IMAGE.src}")` }}>
        <div className="city-area-panel-heading">
          <div className="city-area-panel-titleline">
            <b>{building.title}</b>
            <span>{summary.owned ? `${building.prebuilt ? "Prebuilt" : "Built"} | Level ${summary.state.level}` : "Locked"}</span>
          </div>
          <p>{building.help ?? building.functionText ?? "No building description configured yet."}</p>
          {building.functionText && <p>{building.functionText}</p>}
        </div>
      </header>
      <div className="city-area-popover-body">
        <CityPanelSection title="Status">
          <div className="city-area-work-card no-top-border">
            <div className="city-area-work-head">
              <span>{summary.owned ? `Durability ${durabilityValue.toFixed(2)}%` : "Not owned"}</span>
              <span>{building.prebuilt ? "Prebuilt building" : "Buildable building"}</span>
            </div>
            {!summary.owned && <CityCostGrid entries={costEntries} snapshot={snapshot} progress={progress} emptyText="No price configured" />}
            {!summary.owned && statRequirementEntries.length > 0 && <CityRequirementGrid entries={statRequirementEntries} />}
          </div>
        </CityPanelSection>
        <CityPanelSection title="Inventory">
          <div className="city-area-costs city-chip-grid">
            <span>Total slots: {summary.inventory.totalSlots}</span>
            {Object.entries(summary.inventory.byType).map(([type, slots]) => (
              <span key={type}>{cityInventoryTypeLabel(type)}: {slots}</span>
            ))}
          </div>
        </CityPanelSection>
        <CityPanelSection title="Stats">
          <CityStatEffectsSummary effects={summary.activeEffects} />
        </CityPanelSection>
        <CityPanelSection title="Features">
          <div className="city-area-building-icons city-building-feature-list">
            {[...summary.ownedAddons, ...summary.lockedAddons].map(({ addon, owned, unlocked }) => {
              const inventory = normalizeInventoryType(addon.inventoryType);
              const fixedSlots = fixedReadableDefsForInventoryType(inventory.type).length;
              const slots = fixedSlots || inventory.slots;
              const cost = cityBuildingAddonCostEntries(addon);
              const reqs = cityStatRequirementEntries(addon.statRequirements ?? addon.unlock?.statRequirements ?? addon.unlock?.stats, cityStats);
              return (
                <article className={`city-area-building-chip ${owned ? "owned" : "locked"}`} title={addon.help ?? addon.title} key={addon.id}>
                  <b>{addon.title}</b>
                  <span>{owned ? "Owned" : unlocked ? "Can buy" : "Locked"} | {cityBuildingFeatureLabel(addon.panel)}</span>
                  {addon.help && <span>{addon.help}</span>}
                  {slots > 0 && <span>{cityInventoryTypeLabel(inventory.type)}: {slots} slots</span>}
                  {cost.length > 0 && <span>{cost.map(([id, amount]) => `${amount} ${cityCostLabel(id)}`).join(", ")}</span>}
                  {reqs.length > 0 && <span>{reqs.map((entry) => entry.label).join(", ")}</span>}
                  {Object.keys(addon.statEffects ?? {}).length > 0 && (
                    <span>{Object.entries(addon.statEffects).map(([id, amount]) => `${cityStatLabel(id)} ${amount}`).join(", ")}</span>
                  )}
                </article>
              );
            })}
          </div>
        </CityPanelSection>
      </div>
    </aside>
  );
}

function CityBuildingIconList({ buildingRefs, buildingImageUrls = {}, progress }) {
  if (!buildingRefs?.length) return null;
  return (
    <div className="city-area-building-icons">
      {buildingRefs.map(({ building }) => {
        const imageUrl = cityBuildingMapImageUrl(buildingImageUrls, building, progress);
        return (
          <span className="city-area-building-chip" title={building.title} key={building.id}>
            {imageUrl ? <img src={imageUrl} alt="" draggable="false" /> : <i>{cityBuildingIconText(building)}</i>}
            <b>{building.title}</b>
          </span>
        );
      })}
    </div>
  );
}

function CityStatIcon({ statId }) {
  const iconUrl = CITY_STAT_ICON_URLS[statId];
  if (!iconUrl) return null;
  return <img className="city-stat-chip-icon" src={iconUrl} alt="" draggable="false" />;
}

function CityRequirementGrid({ entries, emptyText = "No requirements" }) {
  if (!entries?.length) {
    return <div className="city-area-requirements city-chip-grid"><span>{emptyText}</span></div>;
  }
  return (
    <div className="city-area-requirements city-chip-grid">
      {entries.map((entry) => (
        <span className={entry.met ? "met" : "missing"} key={entry.key} title={entry.label}>
          {entry.type === "stat" && <CityStatIcon statId={entry.statId} />}
          {entry.type === "stat" ? <b>{entry.current}/{entry.needed}</b> : entry.label}
        </span>
      ))}
    </div>
  );
}

function CityCostGrid({ entries, snapshot, progress, emptyText = "No price configured" }) {
  if (!entries?.length) {
    return <div className="city-area-costs city-chip-grid"><span>{emptyText}</span></div>;
  }
  return (
    <div className="city-area-costs city-chip-grid">
      {entries.map(([resourceId, amount]) => {
        const available = cityCostAvailable(snapshot, resourceId, progress);
        return (
          <span
            className={available >= amount ? "met" : "missing"}
            key={resourceId}
            title={`${cityCostLabel(resourceId)} ${amount}/${available}`}
          >
            <CityCostIcon resourceId={resourceId} />
            <b>{amount}/{available}</b>
          </span>
        );
      })}
    </div>
  );
}

function CityBuildingDamageEffects({ areas, buildingGroups, progress }) {
  const [flameFrameTick, setFlameFrameTick] = useState(0);
  const areaEffects = (areas ?? []).flatMap((area) => {
    const effect = cityAreaDamageEffect(progress, area);
    if (!effect) return [];
    const center = cityAreaCenter(area);
    return [{
      ...effect,
      key: `${area.id}-area`,
      title: area.title,
      x: center.x,
      y: center.y,
    }];
  });
  const buildingEffects = (buildingGroups ?? []).flatMap(({ area, buildingRefs }) => (
    (buildingRefs ?? []).flatMap(({ building, x, y }) => {
      const effect = cityBuildingDamageEffect(progress, building);
      if (!effect) return [];
      return [{
        ...effect,
        key: `${area?.id ?? "city"}-${building.id}`,
        title: building.title,
        x,
        y,
      }];
    })
  ));
  const effects = [...areaEffects, ...buildingEffects];
  useEffect(() => {
    if (effects.length === 0 || CITY_DAMAGE_FIRE_TEXTURES.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setFlameFrameTick((current) => (current + 1) % Math.max(1, CITY_DAMAGE_FIRE_TEXTURES.length * 24));
    }, 135);
    return () => window.clearInterval(timer);
  }, [effects.length]);
  if (effects.length === 0) return null;
  return (
    <div className="city-building-damage-effects" aria-hidden="true">
      {effects.map((effect) => (
        <span
          className={`city-building-damage-effect ${effect.burning ? "burning" : "smoking"}`}
          style={cityBuildingDamageEffectStyle(effect)}
          title={`${effect.title} durability ${Math.round(effect.durability)}%`}
          key={effect.key}
        >
          <img className="city-building-smoke smoke-a" src={CITY_DAMAGE_SMOKE_TEXTURES[0]} alt="" draggable="false" />
          <img className="city-building-smoke smoke-b" src={CITY_DAMAGE_SMOKE_TEXTURES[1]} alt="" draggable="false" />
          <img className="city-building-smoke smoke-c" src={CITY_DAMAGE_SMOKE_TEXTURES[2]} alt="" draggable="false" />
          {effect.burning && (
            <>
              <CityDamageFlame className="fire-main" frameTick={flameFrameTick} seed={effect.key} offset={0} />
              <CityDamageFlame className="fire-left" frameTick={flameFrameTick} seed={effect.key} offset={1} />
              <CityDamageFlame className="fire-right" frameTick={flameFrameTick} seed={effect.key} offset={2} />
              <CityDamageFlame className="fire-back" frameTick={flameFrameTick} seed={effect.key} offset={3} />
              <CityDamageFlame className="fire-top-left" frameTick={flameFrameTick} seed={effect.key} offset={4} />
              <CityDamageFlame className="fire-top-right" frameTick={flameFrameTick} seed={effect.key} offset={5} />
              <CityDamageFlame className="fire-low" frameTick={flameFrameTick} seed={effect.key} offset={6} />
            </>
          )}
          {effect.burning && (
            <>
              <i className="city-building-ember ember-a" />
              <i className="city-building-ember ember-b" />
              <i className="city-building-ember ember-c" />
            </>
          )}
        </span>
      ))}
    </div>
  );
}

function CityDamageFlame({ className, frameTick, seed, offset = 0 }) {
  const frameCount = CITY_DAMAGE_FIRE_TEXTURES.length;
  if (frameCount <= 0) return null;
  const seedOffset = Math.floor(cityEffectRange(seed, `${className}-frame`, 0, frameCount));
  const frameIndex = (frameTick + seedOffset + offset) % frameCount;
  return (
    <img
      className={`city-building-fire-sprite ${className}`}
      src={CITY_DAMAGE_FIRE_TEXTURES[frameIndex]}
      alt=""
      draggable="false"
      aria-hidden="true"
    />
  );
}

function cityAreaDamageEffect(progress, area) {
  if (!area?.id) return null;
  const state = getCityAreaState(progress, area);
  if (!state.unlocked) return null;
  const rawDurability = Number(state.durability ?? DURABILITY_DEFAULT);
  const durability = Math.max(0, Math.min(100, Number.isFinite(rawDurability) ? rawDurability : DURABILITY_DEFAULT));
  if (durability > 75) return null;
  return {
    durability,
    burning: durability <= 50,
  };
}

function cityBuildingDamageEffect(progress, building) {
  if (!building?.id) return null;
  const state = getCityBuildingState(progress, building);
  if ((Number(state.level) || 0) <= 0) return null;
  const rawDurability = Number(state.durability ?? DURABILITY_DEFAULT);
  const durability = Math.max(0, Math.min(100, Number.isFinite(rawDurability) ? rawDurability : DURABILITY_DEFAULT));
  if (durability > 75) return null;
  return {
    durability,
    burning: durability <= 50,
  };
}

function cityBuildingDamageEffectStyle(effect) {
  const seedKey = effect.key ?? `${effect.x}:${effect.y}`;
  return {
    ...cityMapPositionStyle(effect.x, effect.y),
    "--damage-scale": cityEffectRange(seedKey, "scale", 0.86, 1.18).toFixed(2),
    "--smoke-a-delay": `${-cityEffectRange(seedKey, "smoke-a-delay", 0.1, 3.1).toFixed(2)}s`,
    "--smoke-b-delay": `${-cityEffectRange(seedKey, "smoke-b-delay", 0.4, 3.6).toFixed(2)}s`,
    "--smoke-c-delay": `${-cityEffectRange(seedKey, "smoke-c-delay", 0.2, 2.8).toFixed(2)}s`,
    "--smoke-a-duration": `${cityEffectRange(seedKey, "smoke-a-duration", 2.6, 4.1).toFixed(2)}s`,
    "--smoke-b-duration": `${cityEffectRange(seedKey, "smoke-b-duration", 3.2, 4.8).toFixed(2)}s`,
    "--smoke-c-duration": `${cityEffectRange(seedKey, "smoke-c-duration", 2.3, 3.6).toFixed(2)}s`,
    "--smoke-a-drift": `${cityEffectRange(seedKey, "smoke-a-drift", -18, 8).toFixed(1)}px`,
    "--smoke-b-drift": `${cityEffectRange(seedKey, "smoke-b-drift", -10, 18).toFixed(1)}px`,
    "--smoke-c-drift": `${cityEffectRange(seedKey, "smoke-c-drift", -22, 12).toFixed(1)}px`,
    "--fire-delay": `${-cityEffectRange(seedKey, "fire-delay", 0, 0.7).toFixed(2)}s`,
    "--ember-delay": `${-cityEffectRange(seedKey, "ember-delay", 0, 1.8).toFixed(2)}s`,
  };
}

function cityEffectRange(key, salt, min, max) {
  return min + (max - min) * cityEffectUnit(`${key}:${salt}`);
}

function cityEffectUnit(value) {
  let hash = 2166136261;
  const text = String(value ?? "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function CityMapHoverIcons({ area, buildingRefs, progress, npcRefs, npcImageUrls = {}, buildingImageUrls = {}, quests = null, onOpenBuilding, onHoverBuilding, onOpenNpc }) {
  return (
    <div className="city-map-hover-icons" aria-label={`${area.title} actions`}>
      {buildingRefs.map(({ building, x, y }) => {
        const imageUrl = cityBuildingMapImageUrl(buildingImageUrls, building, progress);
        const questStatus = cityBuildingQuestStatus(building?.id, quests);
        return (
          <button
            type="button"
            className={`city-map-action-icon building ${questStatus.hasOffer ? "offer" : questStatus.hasComplete ? "complete" : questStatus.hasActive ? "active-quest" : ""}`}
            style={cityMapPositionStyle(x, y)}
            title={building.title}
            aria-label={building.title}
            onMouseEnter={() => onHoverBuilding?.(building.id)}
            onFocus={() => onHoverBuilding?.(building.id)}
            onMouseLeave={() => onHoverBuilding?.(null)}
            onBlur={() => onHoverBuilding?.(null)}
            onClick={(event) => {
              event.stopPropagation();
              onOpenBuilding(building.id);
            }}
            key={building.id}
          >
            <span className="city-building-portrait">
              {imageUrl ? <img src={imageUrl} alt="" draggable="false" /> : cityBuildingIconText(building)}
            </span>
            <b>{building.title}</b>
            {(questStatus.hasComplete || questStatus.hasOffer || questStatus.hasActive) && (
              <i className="city-quest-status" aria-hidden="true">
                {questStatus.hasOffer ? "!" : questStatus.hasComplete ? "?" : "?"}
              </i>
            )}
          </button>
        );
      })}
      {npcRefs.map((npc) => (
        <button
          type="button"
          className={`city-map-action-icon npc ${npc.hasOffer ? "offer" : npc.hasComplete ? "complete" : npc.hasActive ? "active-quest" : ""}`}
          style={cityMapPositionStyle(npc.x, npc.y)}
          title={npc.name}
          aria-label={npc.name}
          onClick={(event) => {
            event.stopPropagation();
            onOpenNpc(npc.npcId);
          }}
          key={npc.npcId}
        >
          <span className="city-npc-portrait">
            {npcImageUrls[npc.npcId] || npc.imageUrl ? <img src={npcImageUrls[npc.npcId] || npc.imageUrl} alt="" draggable="false" /> : "NPC"}
          </span>
          {(npc.hasComplete || npc.hasOffer || npc.hasActive) && (
            <i className="city-npc-quest-marker" aria-hidden="true">
              {npc.hasOffer ? "!" : npc.hasComplete ? "?" : "?"}
            </i>
          )}
          <b>{npc.name}</b>
        </button>
      ))}
    </div>
  );
}

function questBoardIdForBuilding(buildingId) {
  const building = CITY_BUILDINGS.find((entry) => entry.id === buildingId);
  const addon = normalizeCityBuildingAddons(building).find((entry) => ["townHallQuests", "innQuests"].includes(entry.panel));
  return addon?.config?.boardId ?? null;
}

function cityBuildingQuestStatus(buildingId, quests = null) {
  const boardId = questBoardIdForBuilding(buildingId);
  if (!boardId) return { hasOffer: false, hasActive: false, hasComplete: false };
  const board = quests?.boards?.[boardId] ?? null;
  return {
    hasOffer: (board?.offers?.length ?? 0) > 0,
    hasActive: false,
    hasComplete: false,
  };
}

function cityBuildingMapImageUrl(buildingImageUrls, building, progress) {
  if (!building) return "";
  const state = getCityBuildingState(progress, building);
  const rawDurability = Number(state.durability ?? DURABILITY_DEFAULT);
  const durability = Math.max(0, Math.min(100, Number.isFinite(rawDurability) ? rawDurability : DURABILITY_DEFAULT));
  if (durability <= 50) {
    const ruinUrl = buildingImageUrls?.[cityBuildingRuinImageKey(building)];
    if (ruinUrl) return ruinUrl;
  }
  return buildingImageUrls?.[cityBuildingImageKey(building)] || building.imageUrl || "";
}

function cityImageElementSrc(image, fallback = "") {
  if (!image) return fallback || "";
  if (typeof image === "string") return image;
  if (typeof image.toDataURL === "function") {
    try {
      return image.toDataURL("image/png");
    } catch {
      return fallback || "";
    }
  }
  return image.src || fallback || "";
}

function CityThreatMeter({ threatLevel }) {
  const pct = Math.max(0, Math.min(100, Number(threatLevel) || 0));
  const stateClass = pct >= CITY_THREAT_SPAWN_THRESHOLD
    ? "critical"
    : pct >= 65
      ? "high"
      : pct >= 35
        ? "medium"
        : "low";
  return (
    <div className={`city-threat-meter ${stateClass}`} title="Byens trusselsniveau">
      <span>Threat {Math.round(pct)}%</span>
      <div className="city-threat-meter-bar-wrap" aria-hidden="true">
        <div className="city-threat-meter-bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CityMapMobIcons({ mobRefs, attackableMobIds, onAttack }) {
  return (
    <div className="city-map-hover-icons city-map-mob-icons" aria-label="City mobs">
      {mobRefs.map((mob) => {
        const attackable = attackableMobIds.has(mob.id);
        return (
          <button
            type="button"
            className={`city-map-mob-mini ${attackable ? "attackable" : "blocked"}`}
            style={cityMapPositionStyle(mob.x, mob.y)}
            title={`${mob.mobType} Lv.${mob.level}${attackable ? "" : " (blokeret af sti)"}`}
            aria-label={`${mob.mobType} level ${mob.level}`}
            onClick={(event) => {
              event.stopPropagation();
              onAttack(mob.id);
            }}
            key={mob.id}
          >
            {mob.iconUrl ? <img src={mob.iconUrl} alt="" draggable="false" /> : <span>{String(mob.mobType || "M").slice(0, 1)}</span>}
          </button>
        );
      })}
    </div>
  );
}

function CityMobActionPopup({ mob, cityProgress, cityStats, onHeroBattle, onArmyBattle, onClose }) {
  const armyUnits = normalizeArmyUnits(cityProgress?.armyUnits);
  const [sentUnits, setSentUnits] = useState(() => Object.fromEntries(
    Object.entries(armyUnits).map(([unitId, count]) => [unitId, Math.min(1, count)]),
  ));
  if (!mob) return null;
  const unitEntries = Object.entries(CITY_ARMY_UNIT_DEFS);
  const totalSent = Object.values(sentUnits).reduce((sum, count) => sum + Math.max(0, Math.floor(Number(count) || 0)), 0);
  const preview = resolveCityArmyBattle({ progress: cityProgress, cityStats, mob, sentUnits, rng: () => 0.5 });
  return (
    <div className="city-mob-action-popup" style={cityMapPositionStyle(mob.x + 44, mob.y - 22)}>
      <header>
        <div className="city-mob-action-popup-title">
          <div className="city-mob-action-popup-portrait" aria-hidden="true">
            {mob.iconUrl ? <img src={mob.iconUrl} alt="" draggable="false" /> : <span>{String(mob.mobType || "M").slice(0, 1)}</span>}
          </div>
          <b>{mob.mobType} Lv.{mob.level}</b>
        </div>
        <button type="button" onClick={onClose}>X</button>
      </header>
      <button type="button" onClick={onHeroBattle}>Fight with hero</button>
      <div className="city-army-send-box">
        <b>Send army</b>
        {unitEntries.map(([unitId, def]) => {
          const available = armyUnits[unitId] ?? 0;
          return (
            <label key={unitId}>
              <span>{def.label}</span>
              <input
                type="number"
                min="0"
                max={available}
                value={sentUnits[unitId] ?? 0}
                onChange={(event) => {
                  const value = Math.max(0, Math.min(available, Math.floor(Number(event.target.value) || 0)));
                  setSentUnits((current) => ({ ...current, [unitId]: value }));
                }}
              />
              <i>/ {available}</i>
            </label>
          );
        })}
        <span>Win chance: {Math.round((preview.winChance ?? 0) * 100)}% | Morale x{preview.morale.toFixed(2)}</span>
        <button type="button" disabled={totalSent <= 0} onClick={() => onArmyBattle(sentUnits)}>Attack with army</button>
      </div>
    </div>
  );
}

function CityArmyBattleResultModal({ result, onClose }) {
  const lossText = Object.entries(result.losses ?? {})
    .map(([unitId, count]) => `${CITY_ARMY_UNIT_DEFS[unitId]?.label ?? unitId}: ${count}`)
    .join(", ") || "None";
  return (
    <div className="city-popup-backdrop">
      <section className="city-popup city-army-result-modal" role="dialog" aria-modal="true" aria-label="Army battle result">
        <header className="city-popup-header">
          <div>
            <h3>{result.won ? "Army victory" : "Army defeated"}</h3>
            <span>{result.mob?.mobType} Lv.{result.mob?.level}</span>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>
        <div className="city-popup-summary">
          <div>
            <p>{result.won ? "Mob group removed from the city map." : "Mob group remains active."}</p>
            <p>Win chance: {Math.round((result.winChance ?? 0) * 100)}% | Morale x{Number(result.morale || 1).toFixed(2)}</p>
            <p>Army losses: {lossText}</p>
          </div>
        </div>
        <div className="city-popup-actions">
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

function isRoadPassable(layout, gx, gy, radius = 0) {
  const points = [
    [gx, gy],
    [gx + radius, gy],
    [gx - radius, gy],
    [gx, gy + radius],
    [gx, gy - radius],
  ];

  return points.every(([px, py]) => {
    const tx = Math.floor(px);
    const ty = Math.floor(py);
    return tx >= 0 && ty >= 0 && tx < layout.mapWidth && ty < layout.mapHeight && !isHouseBlockingPoint(layout, px, py);
  });
}

function isHouseBlockingPoint(layout, gx, gy) {
  return layout.houses.some((house) => {
    const dx = (gx - house.gx) / 0.88;
    const dy = (gy - house.gy) / 0.78;
    return dx * dx + dy * dy < 1;
  });
}

function updateCityEdgePan(city, width, height, dt) {
  const margin = 130;
  const maxPanX = 360;
  const maxPanY = 210;
  const speed = 460;
  let dx = 0;
  let dy = 0;
  if (Number.isFinite(city.pointerX) && Number.isFinite(city.pointerY)) {
    if (city.pointerX < margin) dx = 1 - city.pointerX / margin;
    else if (city.pointerX > width - margin) dx = -((city.pointerX - (width - margin)) / margin);
    if (city.pointerY < margin) dy = 1 - city.pointerY / margin;
    else if (city.pointerY > height - margin) dy = -((city.pointerY - (height - margin)) / margin);
  }
  city.panX = Math.max(-maxPanX, Math.min(maxPanX, (Number(city.panX) || 0) + dx * speed * dt));
  city.panY = Math.max(-maxPanY, Math.min(maxPanY, (Number(city.panY) || 0) + dy * speed * dt));
}

function drawIsometricCityScene(ctx, width, height, layout, city, progress, quests) {
  drawCityBackdrop(ctx, width, height);
  const camera = getCityCamera(width, height, city);
  const terrain = city.staticLayer ?? buildCityTerrainLayer(layout, city.atlas);
  const terrainOrigin = worldToScreen(0, 0, 0, camera);
  ctx.drawImage(terrain.canvas, terrainOrigin.x - terrain.originX, terrainOrigin.y - terrain.originY);

  const activeNpcs = getActiveCityQuestNpcs(layout, quests?.cityNpcStates ?? []);
  const entities = [
    ...layout.houses.map((house) => ({ type: "house", ...house, depth: house.gx + house.gy })),
    ...activeNpcs.map((npc) => ({ type: "npc", ...npc, depth: npc.gx + npc.gy + 0.18 })),
  ].sort((a, b) => a.depth - b.depth);

  for (const entity of entities) {
    if (entity.type === "house") {
      const building = cityBuildingFromHouse(entity);
      drawIsoHouse(ctx, entity, building, city.houseImages, camera, isCityBuildingOwned(progress, building), city.hoveredBuildingId === building?.id);
      continue;
    }
    if (entity.type === "npc") {
      drawCityQuestNpc(ctx, entity, city.npcImages?.[entity.npcId], camera, city.walkClock);
      continue;
    }
  }
  for (const marker of getActiveCityQuestBuildings(layout, quests)) {
    const offset = getCityQuestOffset(marker.spriteIndex);
    drawCityQuestStatusMarker(ctx, {
      gx: marker.gx + offset.gx,
      gy: marker.gy + offset.gy,
      phase: marker.phase,
      complete: marker.hasComplete,
      hasOffer: marker.hasOffer,
    }, camera, city.walkClock);
  }
}

function getActiveCityQuestBuildings(layout, quests = null) {
  return (layout.houses ?? []).flatMap((house) => {
    const status = cityBuildingQuestStatus(house.buildingId, quests);
    if (!status.hasOffer && !status.hasActive && !status.hasComplete) return [];
    return [{
      ...house,
      phase: house.spriteIndex * 0.37,
      ...status,
    }];
  });
}

function getActiveCityQuestNpcs(layout, cityNpcStates = [], showInactive = SHOW_INACTIVE_CITY_NPCS) {
  const allNpcIds = Object.keys(QUEST_NPCS).filter((npcId) => QUEST_NPCS[npcId]?.citySpawn !== false);
  const stateByNpc = new Map((cityNpcStates ?? []).map((entry) => [entry.npcId, entry]));
  const occupiedSpots = [];
  return allNpcIds.flatMap((npcId, index) => {
    const npc = QUEST_NPCS[npcId];
    const state = stateByNpc.get(npcId) ?? { active: [], offers: [], hasComplete: false };
    const hasQuestActivity = (state.offers?.length ?? 0) > 0 || (state.active?.length ?? 0) > 0;
    if (!showInactive && !hasQuestActivity) return [];
    const preferred = cityNpcLocation(layout, npc?.cityLocation, index);
    const base = resolveCityNpcLocation(layout, preferred, occupiedSpots);
    occupiedSpots.push(base);
    return {
      ...base,
      npcId,
      state,
      alpha: 1,
    };
  });
}

function cityNpcLocation(layout, cityLocation, index = 0) {
  const buildingByLocation = {
    blacksmith: "blacksmith",
    farm: "farm",
    inn: "inn",
    mage_tower: "mage_tower",
    library: "library",
  };
  const buildingNpcOffset = { gx: 1.45, gy: 1.1 };
  const buildingId = buildingByLocation[cityLocation];
  if (buildingId) {
    const house = layout.houses.find((entry) => entry.buildingId === buildingId) ?? layout.houses[0];
    return { gx: house.gx + buildingNpcOffset.gx, gy: house.gy + buildingNpcOffset.gy };
  }
  const openSpots = [
    { gx: 8.2, gy: 8.35 },
    { gx: 4.35, gy: 8.7 },
    { gx: 12.35, gy: 8.2 },
    { gx: 8.0, gy: 4.8 },
    { gx: 8.55, gy: 12.55 },
    { gx: 13.85, gy: 4.85 },
    { gx: 4.25, gy: 13.25 },
    { gx: 13.2, gy: 13.45 },
  ];
  return openSpots[index % openSpots.length];
}

function resolveCityNpcLocation(layout, preferred, occupiedSpots) {
  const candidates = [preferred, ...buildCityNpcSpotRing(preferred, 5, 1.05)];
  for (const candidate of candidates) {
    if (!isCityNpcSpotClear(layout, candidate, occupiedSpots)) continue;
    return candidate;
  }
  return preferred;
}

function isCityNpcSpotClear(layout, candidate, occupiedSpots) {
  if (!isRoadPassable(layout, candidate.gx, candidate.gy, 0.22)) return false;
  if (occupiedSpots.some((spot) => Math.hypot(candidate.gx - spot.gx, candidate.gy - spot.gy) < 1.05)) return false;
  return !isNearCityBuildingMarker(layout, candidate, 1.35);
}

function isNearCityBuildingMarker(layout, candidate, clearance) {
  return layout.houses.some((house) => {
    const offset = getCityQuestOffset(house.spriteIndex);
    return Math.hypot(candidate.gx - (house.gx + offset.gx), candidate.gy - (house.gy + offset.gy)) < clearance;
  });
}

function buildCityNpcSpotRing(origin, maxRadius = 6, step = 0.92) {
  const spots = [];
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        spots.push({
          gx: origin.gx + dx * step,
          gy: origin.gy + dy * step,
        });
      }
    }
  }
  return spots;
}









function drawCityBackdrop(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0a0d10");
  gradient.addColorStop(1, "#151711");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(56, 76, 48, 0.48)";
  ctx.fillRect(0, 0, width, height);
}

function getCityCamera(width, height, city) {
  const layout = city?.layout ?? getCityLayout();
  const heroIso = worldToIso(layout.mapWidth * 0.5, layout.mapHeight * 0.5, 0);
  return {
    offsetX: width * 0.5 - heroIso.x + (Number(city?.panX) || 0),
    offsetY: height * 0.52 - heroIso.y + (Number(city?.panY) || 0),
  };
}

function drawIsoHouse(ctx, house, building, houseImages, camera, owned = false, hovered = false) {
  const sprite = cityImageForBuilding(houseImages, building);
  if (!sprite) return;

  const tile = worldToScreen(house.gx, house.gy, 0, camera);
  const targetH = TILE_W * 1.8;
  const sourceW = imageSourceWidth(sprite);
  const sourceH = imageSourceHeight(sprite);
  const scale = targetH / sourceH;
  const w = sourceW * scale;
  const h = sourceH * scale;
  const baseX = tile.x;
  const baseY = tile.y + TILE_H * 0.56;

  ctx.save();
  if (!owned) {
    ctx.globalAlpha *= 0.46;
    ctx.filter = "grayscale(0.85) brightness(0.75)";
  }
  if (hovered) {
    ctx.filter = owned ? "brightness(1.28) saturate(1.12)" : "grayscale(0.55) brightness(0.95) saturate(0.95)";
    ctx.shadowColor = "rgba(244, 218, 150, 0.62)";
    ctx.shadowBlur = 14;
  }
  ctx.drawImage(sprite, baseX - w * 0.5, baseY - h, w, h);
  ctx.restore();
}

function findCityBuildingAtScreen(layout, city, sx, sy, width, height) {
  const camera = getCityCamera(width, height, city);
  const hits = [];
  for (const house of layout.houses) {
    const building = cityBuildingFromHouse(house);
    if (!building) continue;
    const sprite = cityImageForBuilding(city.houseImages, building);
    const tile = worldToScreen(house.gx, house.gy, 0, camera);
    const targetH = TILE_W * 1.8;
    const sourceW = sprite ? imageSourceWidth(sprite) : TILE_W;
    const sourceH = sprite ? imageSourceHeight(sprite) : TILE_W;
    const scale = targetH / sourceH;
    const w = sourceW * scale;
    const h = sourceH * scale;
    const baseX = tile.x;
    const baseY = tile.y + TILE_H * 0.56;
    const insideSprite = sx >= baseX - w * 0.5 && sx <= baseX + w * 0.5 && sy >= baseY - h && sy <= baseY + 18;
    const world = screenToWorld(sx, sy, camera);
    const nearMarker = Math.hypot(world.x - (house.gx + 0.55), world.y - (house.gy + 0.55)) < 1.35;
    if (insideSprite || nearMarker) hits.push({ building, depth: house.gx + house.gy });
  }
  hits.sort((a, b) => b.depth - a.depth);
  return hits[0]?.building ?? null;
}

function findCityQuestNpcAtScreen(layout, city, cityNpcStates, sx, sy, width, height) {
  const camera = getCityCamera(width, height, city);
  const hits = [];
  for (const npc of getActiveCityQuestNpcs(layout, cityNpcStates)) {
    const screen = worldToScreen(npc.gx, npc.gy, 0, camera);
    const image = city.npcImages?.[npc.npcId];
    const h = 82;
    const w = image ? h * (image.width / image.height) : 42;
    const insideSprite = sx >= screen.x - w * 0.5 && sx <= screen.x + w * 0.5 && sy >= screen.y - h && sy <= screen.y + 22;
    const world = screenToWorld(sx, sy, camera);
    const nearNpc = Math.hypot(world.x - npc.gx, world.y - npc.gy) <= 0.75;
    if (insideSprite || nearNpc) hits.push({ npc, depth: npc.gx + npc.gy });
  }
  hits.sort((a, b) => b.depth - a.depth);
  return hits[0]?.npc ?? null;
}

function drawCityQuestMarker(ctx, marker, camera, time) {
  const screen = worldToScreen(marker.gx, marker.gy, 0, camera);
  const bob = Math.sin(time * 4.5 + marker.phase) * 4;
  const x = screen.x;
  const y = screen.y - 18 + bob;

  drawShadow(ctx, x, screen.y + 12, 17, 6, 0.24);
  ctx.save();
  ctx.shadowColor = "#ffcf32";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "#4a2b05";
  ctx.lineCap = "round";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x, y - 3);
  ctx.stroke();
  ctx.fillStyle = "#4a2b05";
  ctx.beginPath();
  ctx.arc(x, y + 8, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 8;
  ctx.strokeStyle = "#ffd94a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x, y - 3);
  ctx.stroke();
  ctx.fillStyle = "#ffd94a";
  ctx.beginPath();
  ctx.arc(x, y + 8, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCityQuestNpc(ctx, npc, image, camera, time) {
  const screen = worldToScreen(npc.gx, npc.gy, 0, camera);
  const bob = Math.sin(time * 3.2 + npc.gx + npc.gy) * 2;
  const alpha = npc.alpha ?? 1;
  drawShadow(ctx, screen.x, screen.y + 12, 18, 6, 0.22 * alpha);
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (image) {
    const height = 74;
    const width = height * (image.width / image.height);
    ctx.drawImage(image, screen.x - width * 0.5, screen.y - height + 15 + bob, width, height);
  } else {
    ctx.fillStyle = "#d6c18a";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y - 30 + bob, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  drawCityQuestStatusMarker(ctx, {
    gx: npc.gx,
    gy: npc.gy,
    phase: 0.2,
    complete: Boolean(npc.state?.hasComplete),
    hasOffer: (npc.state?.offers?.length ?? 0) > 0,
  }, camera, time);
  ctx.restore();
}

function drawCityQuestStatusMarker(ctx, marker, camera, time) {
  const screen = worldToScreen(marker.gx, marker.gy, 0, camera);
  const bob = Math.sin(time * 4.5 + marker.phase) * 4;
  const x = screen.x;
  const y = screen.y - 64 + bob;
  const complete = Boolean(marker.complete);
  const hasOffer = Boolean(marker.hasOffer);
  const symbol = complete ? "?" : hasOffer ? "!" : "-";
  ctx.save();
  ctx.font = "900 30px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = complete ? "#ffcf32" : hasOffer ? "#ff4d3f" : "#8ba0b8";
  ctx.shadowBlur = 12;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#361b08";
  ctx.fillStyle = complete ? "#ffd94a" : hasOffer ? "#ff4d3f" : "#8ba0b8";
  ctx.strokeText(symbol, x, y);
  ctx.fillText(symbol, x, y);
  ctx.restore();
}

function CityQuestPopup({ npcId, engineRef, snapshotRef, progress, npcStates, onChangeProgress, onClose, onQuestCompleted }) {
  const npc = QUEST_NPCS[npcId];
  const state = (npcStates ?? []).find((entry) => entry.npcId === npcId) ?? { active: [], offers: [] };
  const npcQuests = state.active ?? [];
  const npcOffers = state.offers ?? [];
  const mayorIntroActive = npcId === "mayor" && engineRef.current?.questState?.active?.some((quest) => quest.questId === "mayor_intro_to_valtoria");
  const mayorIntroCompleted = npcId === "mayor" && engineRef.current?.questState?.completed?.includes("mayor_intro_to_valtoria");
  const npcDialogue = mayorIntroCompleted
    ? npc?.dialogue?.completed
    : mayorIntroActive
      ? npc?.dialogue?.active
      : "";
  const lastPointerActionRef = useRef(0);
  const [actionMessage, setActionMessage] = useState("");
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [confirmAbandonQuest, setConfirmAbandonQuest] = useState(null);
  const [questCompletionResult, setQuestCompletionResult] = useState(null);
  if (!npc) return null;

  const questResourceEntries = (quest) => (
    Array.isArray(quest?.target?.resources)
      ? quest.target.resources
        .map((entry) => [String(entry.resource ?? entry.resourceId ?? ""), Math.max(1, Math.floor(Number(entry.count) || 1))])
        .filter(([resourceId]) => resourceId)
      : []
  );

  const cityQuestCompletionInventory = (quest) => {
    const snapshot = snapshotRef?.current ?? {};
    const inventory = (snapshot.inventory ?? engineRef.current?.player?.inventory ?? []).map((item) => (
      item && typeof item === "object" ? { ...item } : item
    ));
    for (const [resourceId] of questResourceEntries(quest)) {
      const backpackCount = cityResourceCount(inventory, resourceId);
      const available = cityCostAvailable(snapshot, resourceId, progress);
      const cityOnlyCount = Math.max(0, available - backpackCount);
      if (cityOnlyCount <= 0) continue;
      const item = makeResourceItem(resourceId, cityOnlyCount);
      if (item) inventory.push(item);
    }
    return inventory;
  };

  const turnIn = (quest) => {
    const engine = engineRef.current;
    const completionInventory = cityQuestCompletionInventory(quest);
    const backpackComplete = isQuestComplete(quest, engine?.player?.inventory ?? []);
    const cityComplete = isQuestComplete(quest, completionInventory);
    if (!backpackComplete && cityComplete) {
      if (!engine?.questRewardsCanFit?.(quest)) {
        setActionMessage("Rygsaekken er fuld. Lav plads foer questen indleveres.");
        engine?.addToast?.("Rygsaekken er fuld");
        engine?.publishSnapshot?.();
        return;
      }
      const resourceEntries = questResourceEntries(quest);
      if (resourceEntries.length > 0 && !payCityCostEntries(resourceEntries, engine, snapshotRef?.current, progress, onChangeProgress)) {
        setActionMessage("Questen kunne ikke indleveres. Tjek city storage eller locked storage.");
        engine?.addToast?.("Quest resources mangler");
        engine?.publishSnapshot?.();
        return;
      }
    }
    const result = engine?.completeQuest?.(quest.id ?? quest.questId, npcId, {
      inventoryOverride: completionInventory,
      resourcesPrepaid: !backpackComplete && cityComplete,
    });
    if (result?.ok) {
      setActionMessage("");
      setSelectedQuest(null);
      setQuestCompletionResult(result);
      engine?.publishSnapshot?.();
    } else {
      setActionMessage("Questen kunne ikke indleveres. Tjek krav, plads i rygsaekken eller om save-state er for gammel.");
      engine?.addToast?.("Quest kunne ikke indleveres");
      engine?.publishSnapshot?.();
    }
  };

  const acceptQuest = (quest) => {
    const engine = engineRef.current;
    const accepted = engine?.acceptQuestOffer?.({ ...quest, npcId: quest.npcId ?? npcId }, "city");
    if (accepted) {
      setActionMessage("");
      engine?.publishSnapshot?.();
      onClose?.();
    } else {
      setActionMessage("Questen kunne ikke tages. Tjek plads i rygsaekken eller om kravene stadig er opfyldt.");
      engine?.addToast?.("Quest kunne ikke tages");
      engine?.publishSnapshot?.();
    }
  };

  const runButtonAction = (event, action, fromPointer = false) => {
    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    if (!fromPointer && now - lastPointerActionRef.current < 450) return;
    if (fromPointer) lastPointerActionRef.current = now;
    action();
  };

  const abandonQuest = () => {
    const quest = confirmAbandonQuest;
    if (!quest) return;
    const abandoned = engineRef.current?.abandonQuest?.(quest.id);
    if (!abandoned) return;
    setConfirmAbandonQuest(null);
    setSelectedQuest(null);
    onClose?.();
  };
  const selectedTurnInNpcIds = selectedQuest?.quest
    ? [
      ...(Array.isArray(selectedQuest.quest.turnInNpcIds) ? selectedQuest.quest.turnInNpcIds : []),
      ...(Array.isArray(selectedQuest.quest.completeNpcIds) ? selectedQuest.quest.completeNpcIds : []),
      ...(selectedQuest.quest.turnInNpcId ? [selectedQuest.quest.turnInNpcId] : []),
      ...(Array.isArray(selectedQuest.quest.npcIds) ? selectedQuest.quest.npcIds : []),
      ...(selectedQuest.quest.npcId ? [selectedQuest.quest.npcId] : []),
    ].map(String).filter(Boolean)
    : [];
  const selectedQuestCanTurnIn = Boolean(selectedQuest?.quest?.complete)
    || Boolean(selectedQuest?.quest && isQuestComplete(selectedQuest.quest, cityQuestCompletionInventory(selectedQuest.quest)));
  const selectedQuestCanTurnInAtNpc = selectedQuestCanTurnIn
    && (selectedTurnInNpcIds.length <= 0 || selectedTurnInNpcIds.includes(String(npcId)));

  return (
    <div className="city-popup-backdrop" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <section className="city-popup quest-popup" role="dialog" aria-modal="true" aria-label={npc.name} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
        <header className="city-popup-header">
          <div>
            <h3>{npc.name}</h3>
            <span>{npc.title}</span>
          </div>
          <button type="button" className="city-popup-close" onPointerUp={(event) => runButtonAction(event, onClose, true)} onClick={(event) => runButtonAction(event, onClose)}>X</button>
        </header>
        <div className="quest-npc-summary">
          <img src={npc.imageUrl} alt="" />
          <p>{npc.cityHint}</p>
        </div>
        <main className="quest-list">
          {actionMessage && <p className="quest-action-message">{actionMessage}</p>}
          {npcOffers.map((quest) => (
            <article className="quest-card" key={`offer-${quest.id}`}>
              <header>
                <b>{quest.title}</b>
                <span>Ny quest</span>
              </header>
              <p>{quest.story}</p>
              <QuestObjectiveMeta quest={quest} />
              <button
                type="button"
                onPointerUp={(event) => runButtonAction(event, () => setSelectedQuest({ mode: "offer", quest }), true)}
                onClick={(event) => runButtonAction(event, () => setSelectedQuest({ mode: "offer", quest }))}
              >
                Aaben quest
              </button>
            </article>
          ))}
          {npcQuests.map((quest) => (
            <article className={`quest-card ${quest.complete ? "complete" : ""}`} key={quest.id}>
              <header>
                <b>{quest.title}</b>
                <span>{quest.progressText}</span>
              </header>
              <p>{quest.complete ? quest.turnInText : quest.story}</p>
              <QuestObjectiveMeta quest={quest} compact />
              <button
                type="button"
                onPointerUp={(event) => runButtonAction(event, () => setSelectedQuest({ mode: "active", quest }), true)}
                onClick={(event) => runButtonAction(event, () => setSelectedQuest({ mode: "active", quest }))}
              >
                Aaben quest
              </button>
            </article>
          ))}
          {!npcOffers.length && !npcQuests.length && <p>{npcDialogue || "Ingen quests tilgaengelige lige nu."}</p>}
        </main>
      </section>
      {selectedQuest && (
        <QuestDetailCard
          quest={selectedQuest.quest}
          npc={npc}
          onClose={() => setSelectedQuest(null)}
          footer={(
            <>
              <button type="button" onClick={() => setSelectedQuest(null)}>Tilbage</button>
              {selectedQuest.mode === "offer" ? (
                <button type="button" onClick={() => acceptQuest(selectedQuest.quest)}>Tag quest</button>
              ) : (
                <>
                  <button type="button" onClick={() => setConfirmAbandonQuest(selectedQuest.quest)}>Opgiv quest</button>
                  <button type="button" disabled={!selectedQuestCanTurnInAtNpc} onClick={() => turnIn(selectedQuest.quest)}>Indlever quest</button>
                </>
              )}
            </>
          )}
        />
      )}
      {confirmAbandonQuest && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-card" role="dialog" aria-modal="true" aria-label="Opgiv quest">
            <h3>Opgiv {confirmAbandonQuest.title}?</h3>
            <p>Questen fjernes fra aktive quests og kan tages igen hos questgiveren. Quest items for denne quest fjernes fra rygsaekken.</p>
            <div className="confirm-actions">
              <button type="button" onClick={() => setConfirmAbandonQuest(null)}>Annuller</button>
              <button type="button" onClick={abandonQuest}>Opgiv quest</button>
            </div>
          </section>
        </div>
      )}
      {questCompletionResult && (
        <QuestDetailCard
          quest={{
            ...(questCompletionResult.questInfo ?? {}),
            title: questCompletionResult.questTitle ?? questCompletionResult.questInfo?.title ?? "Quest reward",
            rewards: questCompletionResult.rewards ?? questCompletionResult.questInfo?.rewards ?? {},
          }}
          npc={QUEST_NPCS[questCompletionResult.questInfo?.turnInNpcId ?? questCompletionResult.questInfo?.npcId]}
          onClose={() => setQuestCompletionResult(null)}
          footer={(
            <button type="button" onClick={() => {
              setQuestCompletionResult(null);
              onClose?.();
            }}>
              OK
            </button>
          )}
        />
      )}
    </div>
  );
}

function CityQuestBoardPanel({ board, fallbackConfig, activeQuests = [], onAcceptQuest, onAbandonQuest }) {
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [confirmAbandonQuest, setConfirmAbandonQuest] = useState(null);
  const offers = board?.offers ?? [];
  const title = board?.title ?? fallbackConfig?.title ?? "Quest Board";
  const subtitle = board?.subtitle ?? fallbackConfig?.subtitle ?? "";
  const emptyText = board?.emptyText ?? fallbackConfig?.emptyText ?? "Ingen quests tilgaengelige lige nu.";
  const acceptSelectedQuest = () => {
    if (!selectedQuest) return;
    const accepted = onAcceptQuest?.(selectedQuest);
    if (accepted !== false) setSelectedQuest(null);
  };
  const selectedNpcId = Array.isArray(selectedQuest?.npcIds)
    ? selectedQuest.npcIds[0]
    : selectedQuest?.turnInNpcId ?? selectedQuest?.npcId;
  const selectedQuestIsActive = selectedQuest
    ? activeQuests.some((quest) => quest.id === selectedQuest.id)
    : false;
  const abandonSelectedQuest = () => {
    if (!confirmAbandonQuest) return;
    onAbandonQuest?.(confirmAbandonQuest);
    setConfirmAbandonQuest(null);
    setSelectedQuest(null);
  };
  return (
    <section className="blacksmith-station quest-board-panel">
      <header>
        <h4>{title}</h4>
        {subtitle && <span>{subtitle}</span>}
      </header>
      <div className="quest-list">
        {offers.map((quest) => (
          <article className="quest-card" key={`board-${quest.questId}`}>
            <header>
              <b>{quest.title}</b>
              <span>{quest.kind ?? quest.category ?? "Quest"}</span>
            </header>
            <p>{quest.story}</p>
            {quest.acceptText && <p>{quest.acceptText}</p>}
            <QuestObjectiveMeta quest={quest} />
            <button type="button" onClick={() => setSelectedQuest(quest)}>Aaben quest</button>
          </article>
        ))}
        {activeQuests.length > 0 && (
          <>
            <p>Aktive quests:</p>
            {activeQuests.map((quest) => (
              <article className={`quest-card ${quest.complete ? "complete" : ""}`} key={`board-active-${quest.id}`}>
                <header>
                  <b>{quest.title}</b>
                  <span>{quest.progressText}</span>
                </header>
                <p>{quest.complete ? quest.turnInText : quest.story}</p>
                <QuestObjectiveMeta quest={quest} />
                <button type="button" onClick={() => setSelectedQuest(quest)}>Aaben quest</button>
              </article>
            ))}
          </>
        )}
        {offers.length === 0 && activeQuests.length === 0 && <p>{emptyText}</p>}
      </div>
      {selectedQuest && (
        <QuestDetailCard
          quest={selectedQuest}
          npc={QUEST_NPCS[selectedNpcId]}
          onClose={() => setSelectedQuest(null)}
          footer={(
            <>
              <button type="button" onClick={() => setSelectedQuest(null)}>Tilbage</button>
              {selectedQuestIsActive ? (
                <button type="button" onClick={() => setConfirmAbandonQuest(selectedQuest)}>Opgiv quest</button>
              ) : (
                <button type="button" onClick={acceptSelectedQuest}>Tag quest</button>
              )}
            </>
          )}
        />
      )}
      {confirmAbandonQuest && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-card" role="dialog" aria-modal="true" aria-label="Opgiv quest">
            <h3>Opgiv {confirmAbandonQuest.title}?</h3>
            <p>Questen fjernes fra aktive quests og kan tages igen hos questgiveren. Quest items for denne quest fjernes fra rygsaekken.</p>
            <div className="confirm-actions">
              <button type="button" onClick={() => setConfirmAbandonQuest(null)}>Annuller</button>
              <button type="button" onClick={abandonSelectedQuest}>Opgiv quest</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

const BUILDING_BASE_TAB_ID = "__base";

const CITY_BUILDING_PANEL_COMPONENTS = {
  merchant: CityMerchantPanel,
  storage: CityStoragePanel,
  townHallQuests: CityQuestBoardPanel,
  innQuests: CityQuestBoardPanel,
  armyTraining: CityBarracksTrainingPanel,
  armory: CityArmoryPanel,
  blacksmith: CityBlacksmithPanel,
  goldBar: CityGoldBarPanel,
  research: CityResearchPanel,
  socket: CitySocketPanel,
  skillTree: CitySkillTreePanel,
  readableMerge: CityReadableMergePanel,
  arcaneExtractor: CityArcaneExtractorPanel,
  farm: CityFarmPanel,
  bestiary: BestiaryViewer,
  classTraining: CityClassPanel,
  sanctuaryDonation: CitySanctuaryDonationPanel,
  farmAle: CityFarmAlePanel,
  innAle: CityInnAlePanel,
};

function normalizeCityBuildingAddons(building) {
  const addons = Array.isArray(building?.addons) ? building.addons : [];
  const normalized = addons.map((addon) => ({
    panel: "custom/noop",
    inventoryType: { type: "none", slots: 0 },
    ...addon,
    id: String(addon.id),
    title: addon.title ?? addon.label ?? String(addon.id),
    help: addon.help ?? addon.description ?? addon.functionText ?? "",
    config: addon.config ?? {},
  }));
  const baseInventory = normalizeInventoryType(building?.inventoryType);
  if (baseInventory.type !== "none" && cityInventorySlotCount(baseInventory) > 0) {
    const hasSameLegacyBase = normalized.some((addon) => cityInventorySectionKey(addon) === "base");
    if (!hasSameLegacyBase) {
      normalized.unshift({
        id: "base_storage",
        title: `${building.title} Storage`,
        help: building.functionText ?? building.help ?? "Building storage.",
        prebuilt: true,
        panel: "storage",
        inventoryType: building.inventoryType,
        config: { legacyBase: true },
      });
    }
  }
  return normalized;
}

function cityBuildingAddonOwned(progress, building, addon) {
  if (!addon?.id) return false;
  if (addon.prebuilt) return true;
  const state = getCityBuildingState(progress, building);
  return new Set(state.addons ?? []).has(addon.id);
}

function cityBuildingOwnedAddons(progress, building) {
  return normalizeCityBuildingAddons(building).filter((addon) => cityBuildingAddonOwned(progress, building, addon));
}

function cityBuildingAvailableAddons(progress, building, snapshot, cityStats = {}) {
  return normalizeCityBuildingAddons(building).filter((addon) => (
    cityAddonIsUnlocked(addon, snapshot, cityStats)
    && cityBuildingAddonCanBuy(progress, building, addon, snapshot, cityStats).canBuy
  ));
}

function cityBuildingLockedAddons(progress, building, snapshot, cityStats = {}) {
  return normalizeCityBuildingAddons(building).filter((addon) => !cityBuildingAddonOwned(progress, building, addon) && !cityAddonIsUnlocked(addon, snapshot, cityStats));
}

function cityBuildingFeaturePanels(building, progress, snapshot, cityStats = {}) {
  const owned = isCityBuildingOwned(progress, building);
  return normalizeCityBuildingAddons(building).map((addon) => ({
    addon,
    owned: owned && cityBuildingAddonOwned(progress, building, addon),
    unlocked: cityAddonIsUnlocked(addon, snapshot, cityStats),
    panel: addon.panel ?? "custom/noop",
  }));
}

function cityBuildingInventorySummary(building, progress) {
  const state = getCityBuildingState(progress, building);
  const sections = cityInventorySections(building, state, state.level > 0);
  const byType = {};
  for (const section of sections) byType[section.type] = (byType[section.type] ?? 0) + section.slots;
  return {
    totalSlots: sections.reduce((sum, section) => sum + section.slots, 0),
    sections,
    byType,
  };
}

function cityBuildingAddonCostEntries(addon) {
  return Object.entries(addon?.cost ?? {}).filter(([, amount]) => Math.max(0, Math.floor(Number(amount) || 0)) > 0);
}

function cityBuildingAddonCanBuy(progress, building, addon, snapshot, cityStats = {}) {
  if (!addon?.id) return { canBuy: false, reasons: ["Missing addon id"] };
  if (!isCityBuildingOwned(progress, building)) return { canBuy: false, reasons: ["Build the building first."] };
  if (cityBuildingAddonOwned(progress, building, addon)) return { canBuy: false, reasons: ["Already owned."] };
  if (!cityAddonIsUnlocked(addon, snapshot, cityStats)) return { canBuy: false, reasons: [cityAddonLockText(addon, snapshot, cityStats)] };
  const requirementEntries = cityStatRequirementEntries(addon.statRequirements ?? addon.unlock?.statRequirements ?? addon.unlock?.stats, cityStats);
  const costEntries = cityBuildingAddonCostEntries(addon);
  const reasons = [
    ...requirementEntries.filter((entry) => !entry.met).map((entry) => entry.label),
    ...costEntries
      .filter(([resourceId, amount]) => cityCostAvailable(snapshot, resourceId, progress) < amount)
      .map(([resourceId, amount]) => `${cityCostLabel(resourceId)} ${cityCostAvailable(snapshot, resourceId, progress)}/${amount}`),
  ];
  return { canBuy: reasons.length === 0, reasons };
}

function buyCityBuildingAddon({ progress, building, addon, snapshot, cityStats = {}, engineRef, onChangeProgress }) {
  const check = cityBuildingAddonCanBuy(progress, building, addon, snapshot, cityStats);
  if (!check.canBuy) return false;
  const entries = cityBuildingAddonCostEntries(addon);
  if (!payCityCostEntries(entries, engineRef.current, snapshot, progress, onChangeProgress)) return false;
  onChangeProgress((current) => ({
    ...current,
    [building.id]: {
      ...(current[building.id] ?? {}),
      purchasedAddons: [...new Set([
        ...(Array.isArray(current[building.id]?.purchasedAddons) ? current[building.id].purchasedAddons : []),
        ...(Array.isArray(current[building.id]?.addons) ? current[building.id].addons : []),
        addon.id,
      ].map(String))],
    },
  }));
  return true;
}

function cityBuildingFeatureLabel(panelKey) {
  const labels = {
    merchant: "Trade",
    storage: "Storage",
    townHallQuests: "Quests",
    innQuests: "Rumors",
    armyTraining: "Training",
    armory: "Armory",
    blacksmith: "Blacksmith",
    goldBar: "Minting",
    research: "Research",
    potionLab: "Alchemy",
    socket: "Sockets",
    skillTree: "Skills",
    readableMerge: "Archive",
    arcaneExtractor: "Extractor",
    farm: "Provision",
    townHallCivic: "Civic",
    bestiary: "Bestiary",
    classTraining: "Class",
    sanctuaryDonation: "Donations",
    farmAle: "Ale",
    innAle: "Ale",
  };
  return labels[panelKey] ?? String(panelKey ?? "Feature");
}

function cityBuildingHoverSummary(building, progress, snapshot, cityStats = {}) {
  const state = getCityBuildingState(progress, building);
  const owned = state.level > 0;
  const addons = cityBuildingFeaturePanels(building, progress, snapshot, cityStats);
  const ownedAddonEffects = addons.filter((entry) => entry.owned).map((entry) => entry.addon.statEffects);
  return {
    building,
    state,
    owned,
    inventory: cityBuildingInventorySummary(building, progress),
    activeEffects: owned ? mergeCityStatEffects([cityBuildingActiveStatEffects(building, state.level), ...ownedAddonEffects]) : {},
    ownedAddons: addons.filter((entry) => entry.owned),
    lockedAddons: addons.filter((entry) => !entry.owned),
  };
}

function CityBuildingPopup({ buildingId, engineRef, snapshot, snapshotRef, progress, houseImages, cityStats = {}, regionCorruption = {}, onConvertResourceToResource, onChangeProgress, onClose }) {
  const building = CITY_BUILDINGS.find((entry) => entry.id === buildingId);
  const [draggedCityItem, setDraggedCityItem] = useState(null);
  const [activeAddonId, setActiveAddonId] = useState(null);
  const [functionModalId, setFunctionModalId] = useState(BUILDING_BASE_TAB_ID);
  const [buildPaymentOpen, setBuildPaymentOpen] = useState(false);
  const [storedReadable, setStoredReadable] = useState(null);
  const [confirmStoreItem, setConfirmStoreItem] = useState(null);
  const [questBoard, setQuestBoard] = useState(null);
  const cityEventModifiers = useMemo(() => cityRuntimeModifiers(cityStats), [cityStats]);
  const blacksmithModifiers = useMemo(() => blacksmithDurabilityModifiers(progress), [progress]);
  if (!building) return null;
  const backpackCapacity = inventoryUnlockedSlotCount(snapshot?.player?.level);

  const buildingState = getCityBuildingState(progress, building);
  const owned = buildingState.level > 0;
  const prebuilt = Boolean(building.prebuilt);
  const payBuildingEntries = (entries, progressOverride = progress) => (
    payCityCostEntries(entries, engineRef.current, snapshotRef?.current ?? snapshot, progressOverride, onChangeProgress)
  );
  const buildingResourceAvailable = (resourceId, progressOverride = progress) => (
    cityCostAvailable(snapshotRef?.current ?? snapshot, resourceId, progressOverride)
  );
  const potionIngredientAvailable = (ingredientId, progressOverride = progress) => {
    const potionId = normalizePotionId(ingredientId);
    if (potionId && potionDefById(potionId)) {
      return backpackPotionCount(snapshotRef?.current ?? snapshot, potionId) + cityStoredPotionCount(progressOverride, potionId);
    }
    return buildingResourceAvailable(ingredientId, progressOverride);
  };
  const nextBuildingLevel = owned ? cityBuildingNextLevel(building, buildingState.level) : null;
  const nextBuildingLevelCostEntries = cityLevelCostEntries(nextBuildingLevel);
  const nextBuildingLevelRequirementEntries = cityStatRequirementEntries(nextBuildingLevel?.statRequirements ?? nextBuildingLevel?.unlock?.statRequirements, cityStats);
  const canUpgradeBuilding = Boolean(nextBuildingLevel)
    && nextBuildingLevelRequirementEntries.every((entry) => entry.met)
    && nextBuildingLevelCostEntries.every(([resourceId, amount]) => buildingResourceAvailable(resourceId) >= amount);
  const costEntries = Object.entries(building.cost ?? {});
  const remainingCostEntries = costEntries.map(([resourceId, needed]) => {
    const paid = Math.max(0, buildingState.paid?.[resourceId] ?? 0);
    return [resourceId, Math.max(0, needed - paid)];
  });
  const buildingStatRequirements = building.statRequirements ?? building.unlock?.statRequirements ?? building.unlock?.stats;
  const statRequirementEntries = cityStatRequirementEntries(buildingStatRequirements, cityStats);
  const statRequirementsMet = cityStatsMeetRequirements(buildingStatRequirements, cityStats);
  const canBuyBuilding = remainingCostEntries.every(([resourceId, remaining]) => (
    remaining <= 0 || buildingResourceAvailable(resourceId) >= remaining
  )) && statRequirementsMet;
  const sprite = cityImageForBuilding(houseImages, building, progress);
  const buildingImageSrc = cityImageElementSrc(sprite, building.imageUrl);
  const featureAddons = normalizeCityBuildingAddons(building);
  const purchasedAddons = new Set([
    ...(buildingState.addons ?? []),
    ...featureAddons.filter((addon) => addon.prebuilt).map((addon) => addon.id),
  ]);
  const savedPurchasedAddons = new Set(buildingState.purchasedAddons ?? []);
  const activeAddon = featureAddons.find((addon) => addon.id === activeAddonId) ?? null;
  const activeAddonOwned = Boolean(activeAddon && purchasedAddons.has(activeAddon.id));
  const activePanel = activeAddon?.panel ?? null;
  const activeQuestBoard = activeAddon && ["townHallQuests", "innQuests"].includes(activePanel);
  const questBoardId = activeQuestBoard ? activeAddon.config?.boardId : null;
  const activeBaseTab = functionModalId === BUILDING_BASE_TAB_ID;
  const functionModalTitle = activeBaseTab
    ? building.title
    : activeQuestBoard
      ? QUEST_BOARD_CONFIG[questBoardId]?.title ?? activeAddon?.title ?? "Quests"
      : activeAddon?.title ?? "Building function";
  const functionModalHelp = activeBaseTab
    ? ""
    : activeQuestBoard
      ? QUEST_BOARD_CONFIG[questBoardId]?.subtitle ?? activeAddon?.help ?? "Available local quests and rumors."
      : activeAddon?.help ?? activeAddon?.functionText ?? "";
  const headerStatus = activeAddon
    ? `${activeAddon.prebuilt ? "Prebuilt addon" : savedPurchasedAddons.has(activeAddon.id) ? "Built addon" : "Available addon"} | ${building.title}`
    : owned
          ? `${prebuilt ? "Prebuilt | " : ""}Lvl ${buildingState.level}`
          : "Not owned";
  const storageSections = cityInventorySections(building, buildingState, owned);
  const activeStorageSection = activeQuestBoard
    ? null
    : activeAddon?.panel === "storage"
      ? storageSections.find((section) => section.key === cityInventorySectionKey(activeAddon)) ?? null
      : null;

  useEffect(() => {
    if (!owned || !questBoardId) {
      setQuestBoard(null);
      return;
    }
    if (!activeQuestBoard) return;
    const context = { cityStats, cityProgress: progress };
    const board = engineRef.current?.rollQuestBoard?.(questBoardId, context)
      ?? engineRef.current?.questBoardSnapshot?.(questBoardId, context)
      ?? null;
    setQuestBoard(board);
  }, [engineRef, owned, questBoardId, activeQuestBoard, cityStats, progress]);

  const refreshQuestBoard = () => {
    if (!questBoardId) return;
    const context = { cityStats, cityProgress: progress };
    setQuestBoard(engineRef.current?.questBoardSnapshot?.(questBoardId, context) ?? null);
  };

  const openBaseTab = () => {
    setActiveAddonId(null);
    setFunctionModalId(BUILDING_BASE_TAB_ID);
  };

  const acceptBoardQuest = (quest) => {
    if (!questBoardId) return false;
    const accepted = engineRef.current?.acceptBoardQuest?.(questBoardId, quest, { cityStats, cityProgress: progress });
    if (accepted) refreshQuestBoard();
    else engineRef.current?.addToast?.("Quest kunne ikke tages");
    return Boolean(accepted);
  };

  const applyBuildResource = (resourceId, amount) => {
    if (owned) return;
    if (!statRequirementsMet) return;
    const paid = Math.max(0, buildingState.paid?.[resourceId] ?? 0);
    const needed = Math.max(0, (building.cost?.[resourceId] ?? 0) - paid);
    const available = buildingResourceAvailable(resourceId);
    const count = Math.min(needed, available, amount);
    if (count <= 0) return;
    const consumed = payBuildingEntries([[resourceId, count]]) ? count : 0;
    if (consumed <= 0) return;
    onChangeProgress((current) => ({
      ...current,
      [building.id]: {
        ...(current[building.id] ?? {}),
        level: current[building.id]?.level ?? 0,
        durability: current[building.id]?.durability ?? 100,
        paid: {
          ...(current[building.id]?.paid ?? {}),
          [resourceId]: Math.min(building.cost[resourceId], (current[building.id]?.paid?.[resourceId] ?? 0) + consumed),
        },
      },
    }));
  };

  const finishBuild = () => {
    if (owned) return;
    if (!statRequirementsMet) return;
    if (!remainingCostEntries.every(([, remaining]) => remaining <= 0)) return;
    onChangeProgress((current) => ({
      ...current,
      [building.id]: {
        ...(current[building.id] ?? {}),
        level: 1,
        durability: 100,
        paid: {},
      },
    }));
    setBuildPaymentOpen(false);
  };

  const upgradeBuilding = () => {
    if (!owned || !nextBuildingLevel || !canUpgradeBuilding) return;
    if (!payBuildingEntries(nextBuildingLevelCostEntries)) return;
    onChangeProgress((current) => ({
      ...current,
      [building.id]: {
        ...(current[building.id] ?? {}),
        level: nextBuildingLevel.level,
        durability: current[building.id]?.durability ?? 100,
        paid: current[building.id]?.paid ?? {},
        upgradedAt: Date.now(),
      },
    }));
  };

  const buyAddon = (addon) => {
    buyCityBuildingAddon({ progress, building, addon, snapshot: snapshotRef?.current ?? snapshot, cityStats, engineRef, onChangeProgress });
  };

  const depositInventoryItem = (inventoryIndex, sectionKey, slotIndex, confirmed = false) => {
    if (!owned) return;
    const item = snapshot.inventory?.[inventoryIndex];
    const liveItem = engineRef.current?.player?.inventory?.[inventoryIndex] ?? item;
    if (!cityInventoryItemsSameTransferIdentity(item, liveItem)) {
      engineRef.current?.addToast?.("Backpack ændrede sig. Prøv igen.");
      return;
    }
    const section = cityInventorySections(building, buildingState, owned).find((entry) => entry.key === sectionKey);
    if (!section || slotIndex >= section.slots || !itemMatchesCityInventorySlot(liveItem, section, slotIndex)) return;
    if (section.fixedDefs?.[slotIndex] && !confirmed) {
      setConfirmStoreItem({ inventoryIndex, sectionKey, slotIndex, itemName: liveItem.name });
      return;
    }
    const inventories = normalizeCityInventories(buildingState, building);
    if (fixedSectionAlreadyHasReadable(liveItem, section, slotIndex, inventories[sectionKey] ?? [])) {
      engineRef.current?.addToast?.("Denne spellbook er allerede afleveret i arkivet.");
      return;
    }
    const depositPlan = planCityInventoryDeposit(liveItem, section, slotIndex, inventories[sectionKey] ?? []);
    if (!depositPlan || depositPlan.movedCount <= 0) return;
    const taken = engineRef.current?.takeInventoryItemCount?.(inventoryIndex, depositPlan.movedCount)
      ?? engineRef.current?.takeInventoryItem?.(inventoryIndex);
    if (!taken) return;
    if (!cityInventoryItemsSameTransferIdentity(liveItem, taken)) {
      engineRef.current?.returnInventoryItem?.(normalizeCityStoredItem(taken));
      engineRef.current?.addToast?.("Storage transfer blev afbrudt.");
      return;
    }
    if (section.fixedDefs?.[slotIndex]) {
      const xp = Math.max(0, Math.floor(Number(taken.readableXp ?? READABLE_DEF_BY_ID[taken.readableId]?.xp) || 0));
      if (xp > 0) engineRef.current?.awardXp?.(xp, taken.name);
      const spellUnlock = READABLE_DEF_BY_ID[taken.readableId]?.spellUnlock;
      if (spellUnlock) engineRef.current?.unlockSpell?.(spellUnlock, taken.name);
    }
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const currentBuildingState = getCityBuildingState(current, building);
      const nextInventories = normalizeCityInventories(currentBuildingState, building);
      const items = [...(nextInventories[sectionKey] ?? [])];
      const takenWithSnapshotIcon = normalizeCityStoredItem({
        ...taken,
        iconKey: item?.iconKey ?? taken.iconKey,
        iconUrl: item?.iconUrl ?? taken.iconUrl,
        iconSheet: item?.iconSheet ?? taken.iconSheet,
        iconIndex: item?.iconIndex ?? taken.iconIndex,
      });
      applyCityInventoryDepositPlan(items, takenWithSnapshotIcon, depositPlan);
      return {
        ...current,
        [building.id]: {
          ...state,
          inventories: {
            ...nextInventories,
            [sectionKey]: items,
          },
        },
      };
    });
  };

  const withdrawStoredItem = (sectionKey, slotIndex) => {
    if (!owned) return;
    const section = cityInventorySections(building, buildingState, owned).find((entry) => entry.key === sectionKey);
    if (section?.fixedDefs?.[slotIndex]) return;
    const inventories = normalizeCityInventories(buildingState, building);
    const item = inventories[sectionKey]?.[slotIndex];
    if (!item) return;
    if (!engineRef.current?.returnInventoryItem?.(normalizeCityStoredItem(item))) return;
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const currentBuildingState = getCityBuildingState(current, building);
      const nextInventories = normalizeCityInventories(currentBuildingState, building);
      const items = [...(nextInventories[sectionKey] ?? [])];
      items[slotIndex] = null;
      return {
        ...current,
        [building.id]: {
          ...state,
          inventories: {
            ...nextInventories,
            [sectionKey]: items,
          },
        },
      };
    });
  };

  const transferAllResources = (sectionKey) => {
    if (!owned) return;
    const section = cityInventorySections(building, buildingState, owned).find((entry) => entry.key === sectionKey);
    if (!section || section.fixedDefs?.length) return; // Don't transfer if section has fixed slots
    const nextInventories = normalizeCityInventories(buildingState, building);
    const items = [...(nextInventories[sectionKey] ?? [])];
    let transferredStacks = 0;
    let transferredCount = 0;
    const maxMoves = Math.max(1, (engineRef.current?.player?.inventory?.length ?? snapshot.inventory?.length ?? 0) * 2);

    for (let move = 0; move < maxMoves; move += 1) {
      const liveResources = (engineRef.current?.player?.inventory ?? [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => isResourceItem(item))
        .sort((a, b) => String(a.item.resourceId ?? "").localeCompare(String(b.item.resourceId ?? "")));
      let movedThisPass = false;

      for (const { item, index } of liveResources) {
        const slotIndex = firstCityInventorySlotForItem(item, section, items);
        if (slotIndex < 0) continue;
        const depositPlan = planCityInventoryDeposit(item, section, slotIndex, items);
        if (!depositPlan || depositPlan.movedCount <= 0) continue;
        const taken = engineRef.current?.takeInventoryItemCount?.(index, depositPlan.movedCount)
          ?? engineRef.current?.takeInventoryItem?.(index);
        if (!taken) continue;
        if (!cityInventoryItemsSameTransferIdentity(item, taken)) {
          engineRef.current?.returnInventoryItem?.(normalizeCityStoredItem(taken));
          engineRef.current?.addToast?.("Storage transfer blev afbrudt.");
          movedThisPass = false;
          break;
        }
        applyCityInventoryDepositPlan(items, taken, depositPlan);
        transferredStacks += 1;
        transferredCount += depositPlan.movedCount;
        movedThisPass = true;
        break;
      }

      if (!movedThisPass) break;
    }

    if (transferredStacks > 0) {
      onChangeProgress((current) => {
        const state = current[building.id] ?? {};
        const currentBuildingState = getCityBuildingState(current, building);
        const currentInventories = normalizeCityInventories(currentBuildingState, building);
        return {
          ...current,
          [building.id]: {
            ...state,
            inventories: {
              ...currentInventories,
              [sectionKey]: items,
            },
          },
        };
      });
      engineRef.current?.addToast?.(`Overforte ${transferredCount} resources til ${section.label}`);
    }
  };

  const sortStoredItems = (sectionKey, sortId) => {
    onChangeProgress((current) => sortCityStorageSection(current, building.id, sectionKey, sortId));
  };

  const repairBuilding = (percent = null) => {
    if (!building) return;
    const progressState = progress ?? {};
    const state = getCityBuildingState(progressState, building);
    const currentDur = Math.max(0, Math.min(100, Number(state.durability ?? DURABILITY_DEFAULT)));
    const missing = Math.max(0, Math.ceil((percent !== null && typeof percent === "number" ? percent : (100 - currentDur))));
    if (missing <= 0) return;
    const repairEntries = computeRepairCostEntries(building.cost ?? {}, missing);

    // Check availability and show informative toast if missing
    const deficits = repairEntries
      .map(([resourceId, amount]) => {
        const available = buildingResourceAvailable(resourceId, progressState);
        return { resourceId, amount, available };
      })
      .filter((entry) => entry.available < entry.amount);
    if (deficits.length > 0) {
      const parts = deficits.map((d) => `${cityCostLabel(d.resourceId)} ${d.amount} (du har ${d.available})`);
      engineRef.current?.addToast?.(`Kan ikke reparere: mangler ${parts.join(", ")}`);
      return;
    }

    const paid = payBuildingEntries(repairEntries, progressState);
    if (!paid) {
      engineRef.current?.addToast?.("Betaling mislykkedes ved reparation.");
      return;
    }

    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const currentDur = Math.max(0, Math.min(100, Number(state.durability ?? DURABILITY_DEFAULT)));
      const nextDur = Math.min(100, currentDur + missing);
      return {
        ...current,
        [building.id]: {
          ...state,
          durability: nextDur,
        },
      };
    });

    engineRef.current?.addToast?.(`Reparation gennemført: +${missing}%`);
  };

  const moveStoredItem = (fromSectionKey, fromSlotIndex, toSectionKey, toSlotIndex) => {
    if (!owned) return;
    const sections = cityInventorySections(building, buildingState, owned);
    const toSection = sections.find((section) => section.key === toSectionKey);
    const fromSection = sections.find((section) => section.key === fromSectionKey);
    if (!fromSection || !toSection || toSlotIndex >= toSection.slots || fromSlotIndex >= fromSection.slots) return;
    if (fromSection.fixedDefs?.[fromSlotIndex]) return;
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const currentBuildingState = getCityBuildingState(current, building);
      const nextInventories = normalizeCityInventories(currentBuildingState, building);
      const fromItems = [...(nextInventories[fromSectionKey] ?? [])];
      const toItems = fromSectionKey === toSectionKey ? fromItems : [...(nextInventories[toSectionKey] ?? [])];
      const moving = fromItems[fromSlotIndex];
      const target = toItems[toSlotIndex];
      if (!moving || !itemMatchesCityInventorySlot(moving, toSection, toSlotIndex)) return current;
      if (cityInventoryItemsCanStack(moving, target)) {
        const stackMax = cityInventoryStackMax(moving);
        const movingCount = Math.max(1, Math.floor(Number(moving.count) || 1));
        const targetCount = Math.max(1, Math.floor(Number(target.count) || 1));
        const moved = Math.min(stackMax - targetCount, movingCount);
        if (moved <= 0) return current;
        toItems[toSlotIndex] = { ...target, count: targetCount + moved };
        fromItems[fromSlotIndex] = movingCount > moved ? { ...moving, count: movingCount - moved } : null;
      } else {
        if (target && !itemMatchesCityInventorySlot(target, fromSection, fromSlotIndex)) return current;
        fromItems[fromSlotIndex] = target ?? null;
        toItems[toSlotIndex] = moving;
      }
      return {
        ...current,
        [building.id]: {
          ...state,
          inventories: {
            ...nextInventories,
            [fromSectionKey]: fromItems,
            [toSectionKey]: toItems,
          },
        },
      };
    });
  };

  const produceFoodBarrel = (resourceId, cost, outputResourceId = "food", outputCount = 1) => {
    onConvertResourceToResource?.(resourceId, cost, outputResourceId, outputCount);
  };

  const addFarmProvision = (resourceId, cost, provision) => {
    if (!payBuildingEntries([[resourceId, cost]])) return;
    onChangeProgress((current) => addCityPermanentStatBonus(current, "provision", provision));
  };

  const applyConfiguredCityEffects = (effects = {}) => {
    const cityEntries = Object.entries(effects ?? {}).filter(([statId]) => String(statId) !== "popularity");
    const popularity = Math.floor(Number(effects.popularity) || 0);
    if (cityEntries.length > 0) {
      onChangeProgress((current) => cityEntries.reduce(
        (next, [statId, amount]) => addCityPermanentStatBonus(next, statId, amount),
        current,
      ));
    }
    if (popularity !== 0) {
      engineRef.current?.changePopularity?.(popularity);
      engineRef.current?.publishSnapshot?.();
      engineRef.current?.saveProgress?.({ force: true });
    }
  };

  const applySanctuaryDonation = (trade) => {
    const resourceId = String(trade?.resourceId ?? "");
    const cost = Math.max(1, Math.floor(Number(trade?.cost) || 1));
    if (!resourceId || !payBuildingEntries([[resourceId, cost]])) return;
    applyConfiguredCityEffects(trade.effects ?? {});
  };

  const brewFarmAle = (recipe) => {
    const currentProgress = progress ?? {};
    const currentSnapshot = snapshotRef?.current ?? snapshot;
    const currentStats = calculateCityStats(currentProgress, currentSnapshot, regionCorruption);
    const inputs = Object.entries(recipe?.inputs ?? {})
      .map(([resourceId, amount]) => [resourceId, Math.max(1, Math.floor(Number(amount) || 1))]);
    const statCosts = Object.entries(recipe?.statCosts ?? {})
      .map(([statId, amount]) => [statId, Math.max(1, Math.floor(Number(amount) || 1))]);
    if (!statCosts.every(([statId, amount]) => Math.max(0, Math.floor(Number(currentStats?.[statId]) || 0)) >= amount)) return;
    const outputResourceId = String(recipe?.outputResourceId ?? "ale");
    const outputCount = Math.max(1, Math.floor(Number(recipe?.outputCount) || 1));
    const output = makeResourceItem(outputResourceId, outputCount);
    if (!output) return;
    const simulatedInventory = (currentSnapshot?.player?.inventory ?? []).map((item) => ({ ...item }));
    if (!inventoryCanAccept(simulatedInventory, output, backpackCapacity)) {
      engineRef.current?.addToast?.("Rygsaekken er fuld");
      return;
    }
    if (!payBuildingEntries(inputs, currentProgress)) return;
    if (statCosts.length > 0) {
      onChangeProgress((current) => statCosts.reduce(
        (next, [statId, amount]) => addCityStatAdjustment(next, statId, -amount),
        current,
      ));
    }
    if (!engineRef.current?.addInventoryItem?.(output)) {
      engineRef.current?.addToast?.("Rygsaekken er fuld");
      return;
    }
    engineRef.current?.addToast?.(`Created ${outputCount}x ${output.name}`);
    engineRef.current?.publishSnapshot?.();
    engineRef.current?.saveProgress?.({ force: true });
  };

  const serveInnAle = (trade) => {
    const resourceId = String(trade?.resourceId ?? "ale");
    const cost = Math.max(1, Math.floor(Number(trade?.cost) || 1));
    if (!payBuildingEntries([[resourceId, cost]], progress ?? {})) return;
    const cityEntries = Object.entries(trade.effects ?? {}).filter(([statId]) => String(statId) !== "popularity");
    const popularity = Math.floor(Number(trade.effects?.popularity) || 0);
    if (cityEntries.length > 0) {
      onChangeProgress((current) => cityEntries.reduce(
        (next, [statId, amount]) => addCityStatAdjustment(next, statId, amount),
        current,
      ));
    }
    if (popularity !== 0) {
      engineRef.current?.changePopularity?.(popularity);
      engineRef.current?.publishSnapshot?.();
      engineRef.current?.saveProgress?.({ force: true });
    }
  };

  const repairEquippedItem = (slotId, cost = {}) => {
    const entries = [
      ["gold", Math.max(0, Math.floor(Number(cost.gold) || 0))],
      ["junk", Math.max(0, Math.floor(Number(cost.junk) || 0))],
    ].filter(([, amount]) => amount > 0);
    if (!payBuildingEntries(entries)) return;
    const repaired = engineRef.current?.repairEquippedItem?.(slotId, { prepaid: true }) ?? false;
    if (!repaired) {
      engineRef.current?.addToast?.("Reparation mislykkedes efter betaling.");
    }
  };

  const repairInventoryItem = (index, cost = {}) => {
    const entries = [
      ["gold", Math.max(0, Math.floor(Number(cost.gold) || 0))],
      ["junk", Math.max(0, Math.floor(Number(cost.junk) || 0))],
    ].filter(([, amount]) => amount > 0);
    if (!payBuildingEntries(entries)) return;
    const repaired = engineRef.current?.repairInventoryItem?.(index, { prepaid: true }) ?? false;
    if (!repaired) {
      engineRef.current?.addToast?.("Reparation mislykkedes efter betaling.");
    }
  };

  const trainArmyUnit = (recipe) => {
    if (!recipe?.unitId || !cityArmyCanTrainUnit(progress, cityStats, recipe.unitId, recipe.count ?? 1)) return;
    const entries = Object.entries(recipe.cost ?? {});
    if (!payBuildingEntries(entries)) return;
    onChangeProgress((current) => addCityArmyUnit(current, recipe.unitId, recipe.count ?? 1));
  };

  const convertInventoryItemToArmory = (inventoryIndex, amount = 1) => {
    if (!owned || building.id !== "armory") return;
    const currentSnapshot = snapshotRef?.current ?? snapshot;
    const item = currentSnapshot.inventory?.[inventoryIndex];
    const conversion = getArmoryConversion(item, amount);
    if (!conversion.ok) {
      engineRef.current?.addToast?.(conversion.error || "Item cannot be converted.");
      return;
    }
    const taken = engineRef.current?.takeInventoryItemCount?.(inventoryIndex, conversion.amount);
    if (!taken) return;
    onChangeProgress((current) => addCityArmoryPoints(current, conversion.target, conversion.points));
    engineRef.current?.addToast?.(`Armory +${conversion.points} ${cityCostLabel(conversion.target)}`);
    engineRef.current?.saveProgress?.({ force: true });
  };

  const buyResearchRecipe = (recipeKey) => {
    const recipe = researchRecipeByKey(recipeKey);
    if (!recipe) return;
    const cost = researchRecipeCost(recipe);
    if ((snapshot?.player?.gold ?? 0) < cost) return;
    const paid = engineRef.current?.consumeGold?.(cost) ?? 0;
    if (paid < cost) return;
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      return {
        ...current,
        [building.id]: {
          ...state,
          recipes: [...new Set([...(Array.isArray(state.recipes) ? state.recipes : []), recipeKey])],
        },
      };
    });
  };

  const mergeResearchRecipe = (recipe) => {
    const key = researchRecipeKey(recipe);
    if (!new Set(buildingState.recipes ?? []).has(key)) return;
    const output = makeResourceItem(recipe.output, recipe.count ?? 1);
    if (!output) return;
    const inputs = Object.entries(recipe.inputs ?? {});
    if (!inputs.every(([resourceId, amount]) => buildingResourceAvailable(resourceId) >= Math.max(1, Math.floor(Number(amount) || 1)))) return;
    const stackMax = Math.max(1, Math.floor(Number(output.stackMax ?? resourceStackMax(recipe.output)) || 1));
    const canFit = (snapshotRef?.current?.inventory ?? []).some((item) => (
      item?.mode === "resource"
      && String(item.resourceId) === String(recipe.output)
      && Math.max(1, Math.floor(Number(item.count) || 1)) < stackMax
    )) || (snapshotRef?.current?.inventory ?? []).length < backpackCapacity;
    if (!canFit) {
      engineRef.current?.addToast?.("Rygsaekken er fuld");
      return;
    }
    if (!payBuildingEntries(inputs)) return;
    if (!engineRef.current?.addInventoryItem?.(output)) return;
    engineRef.current?.addToast?.(`Merged: ${output.name}`);
    engineRef.current?.saveProgress?.({ force: true });
  };

  const mixPotionRecipe = (recipe) => {
    if (!recipe || !potionDefById(recipe.output)) return;
    const inputs = Object.entries(recipe.inputs ?? {});
    if (!inputs.every(([inputId, amount]) => potionIngredientAvailable(inputId) >= Math.max(1, Math.floor(Number(amount) || 1)))) {
      engineRef.current?.addToast?.("Ikke nok potion ingredients");
      return;
    }
    const output = makePotion(recipe.output, snapshotRef.current?.player?.level ?? 1);
    if (!output) return;
    output.count = Math.max(1, Math.floor(Number(recipe.count) || 1));
    const simulatedInventory = (snapshotRef.current?.inventory ?? []).map((item) => ({ ...item }));
    consumePotionInputs(simulatedInventory, recipe.inputs ?? {});
    const outputPotionId = normalizePotionId(output.potionId ?? output.potionType);
    const canStackOutput = simulatedInventory.some((item) => (
      isPotionItem(item)
      && normalizePotionId(item.potionId ?? item.potionType) === outputPotionId
      && Math.max(1, Math.floor(Number(item.count) || 1)) < MAX_POTION_STACK
    ));
    if (!canStackOutput && simulatedInventory.length >= backpackCapacity) {
      engineRef.current?.addToast?.("Rygsaekken er fuld");
      return;
    }

    const resourceInputs = inputs.filter(([inputId]) => !potionDefById(inputId));
    if (resourceInputs.length > 0 && !payBuildingEntries(resourceInputs)) return;

    for (const [inputId, amountRaw] of inputs) {
      const potionId = normalizePotionId(inputId);
      if (!potionId || !potionDefById(potionId)) continue;
      const amount = Math.max(1, Math.floor(Number(amountRaw) || 1));
      const fromBackpack = Math.min(backpackPotionCount(snapshotRef.current, potionId), amount);
      let consumed = 0;
      if (fromBackpack > 0) consumed += engineRef.current?.consumePotion?.(potionId, fromBackpack) ?? 0;
      const remaining = amount - consumed;
      if (remaining > 0) {
        let storageConsumed = 0;
        onChangeProgress((current) => {
          const result = consumeCityStoredPotions(current, potionId, remaining);
          storageConsumed = result.consumed;
          return result.progress;
        });
        if (storageConsumed < remaining) {
          engineRef.current?.addToast?.("Ikke nok potion ingredients");
          return;
        }
        engineRef.current?.addToast?.(`Used ${storageConsumed}x ${potionDefById(potionId)?.name ?? potionId} from city storage`);
      }
    }

    if (!engineRef.current?.addPotionLoot?.(output)) {
      engineRef.current?.addToast?.("Rygsaekken er fuld");
      return;
    }
    engineRef.current?.addToast?.(`Brewed: ${output.name}`);
    engineRef.current?.publishSnapshot?.();
    engineRef.current?.saveProgress?.({ force: true });
  };

  const setMerchantState = (updater) => {
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const merchant = updater(state.merchant ?? {});
      return {
        ...current,
        [building.id]: {
          ...state,
          merchant,
        },
      };
    });
  };

  const sellMerchantItem = (inventoryIndex, quantity = 1) => {
    const item = snapshot.inventory?.[inventoryIndex];
    if (!merchantItemCanTrade(item)) return;
    const qty = merchantTradeQuantity(item, quantity);
    let sold = null;
    if (isResourceItem(item)) {
      const consumed = engineRef.current?.consumeResource?.(item.resourceId, qty) ?? 0;
      if (consumed < qty) return;
      sold = merchantCloneItem({ ...item, count: qty });
    } else {
      sold = engineRef.current?.takeInventoryItem?.(inventoryIndex);
      if (!sold) return;
      sold = merchantCloneItem(sold);
    }
    const gold = merchantSellPrice(sold, cityStats?.popularity ?? snapshot.player?.popularity ?? 0, cityEventModifiers) * qty;
    engineRef.current?.addGold?.(gold, "Merchant");
    setMerchantState((merchant) => {
      const soldItems = [sold, ...(merchant.soldItems ?? [])].slice(0, 10);
      return {
        ...merchant,
        soldItems,
        stock: [...soldItems, ...(merchant.stock ?? []).filter((entry) => !soldItems.some((soldEntry) => soldEntry.id === entry.id))].slice(0, 22),
      };
    });
  };

  const buyMerchantItem = (stockIndex, quantity = 1) => {
    const merchant = buildingState.merchant ?? {};
    const stock = [...(merchant.stock ?? [])];
    const item = stock[stockIndex];
    if (!item) return;
    const qty = merchantTradeQuantity(item, quantity);
    const price = merchantBuyPrice(item, cityStats?.popularity ?? snapshot.player?.popularity ?? 0, cityEventModifiers) * qty;
    if ((snapshot.player?.gold ?? 0) < price) return;
    const bought = merchantCloneItem({ ...item, count: isResourceItem(item) ? qty : item.count });
    if (!engineRef.current?.addInventoryItem?.(bought)) return;
    const paid = engineRef.current?.consumeGold?.(price) ?? 0;
    if (paid < price) return;
    if (isResourceItem(item) && Math.max(1, Math.floor(Number(item.count) || 1)) > qty) {
      stock[stockIndex] = { ...item, count: Math.max(1, Math.floor(Number(item.count) || 1)) - qty };
    } else {
      stock.splice(stockIndex, 1);
    }
    setMerchantState((merchantState) => ({
      ...merchantState,
      stock,
    }));
  };

  const renderActiveFeaturePanel = () => {
    if (!owned || !activeAddon || !activeAddonOwned || activeStorageSection) return null;
    switch (activeAddon.panel) {
      case "townHallQuests":
      case "innQuests":
        return (
          <CityQuestBoardPanel
            board={questBoard}
            fallbackConfig={QUEST_BOARD_CONFIG[activeAddon.config?.boardId]}
            activeQuests={(snapshot.quests?.active ?? []).filter((quest) => String(quest.source ?? "") === String(questBoard?.source ?? QUEST_BOARD_CONFIG[activeAddon.config?.boardId]?.source ?? ""))}
            onAcceptQuest={acceptBoardQuest}
            onAbandonQuest={(quest) => engineRef.current?.abandonQuest?.(quest.id)}
          />
        );
      case "arcaneExtractor":
        return (
          <CityArcaneExtractorPanel
            inventory={snapshot.inventory}
            onExtract={(index) => engineRef.current?.extractArcaneEssence?.(index)}
          />
        );
      case "readableMerge":
        return (
          <CityReadableMergePanel
            inventory={snapshot.inventory}
            kind={activeAddon.config?.kind ?? "lorenote"}
            onMerge={(index) => engineRef.current?.mergeInventoryItem?.(index)}
          />
        );
      case "bestiary":
        return <BestiaryViewer worldState={snapshot.worldState} />;
      case "goldBar":
        return (
          <CityGoldBarPanel
            gold={snapshot.player?.gold ?? 0}
            inventory={snapshot.inventory}
            popularity={cityStats?.popularity ?? snapshot.player?.popularity ?? 0}
            resourceCount={buildingResourceAvailable}
            blacksmithModifiers={blacksmithModifiers}
            onSmelt={() => engineRef.current?.smeltGoldToBar?.(1)}
            onSmeltIron={(ironPieceCost) => onConvertResourceToResource?.("iron_piece", ironPieceCost, "iron_bar", 1)}
          />
        );
      case "farm":
        return (
          <CityFarmPanel
            inventory={snapshot.inventory}
            popularity={cityStats?.popularity ?? snapshot.player?.popularity ?? 0}
            resourceCount={buildingResourceAvailable}
            onProduceFoodBarrel={produceFoodBarrel}
            onProduceProvision={addFarmProvision}
          />
        );
      case "farmAle":
        return (
          <CityFarmAlePanel
            inventory={snapshot.inventory}
            cityStats={cityStats}
            resourceCount={buildingResourceAvailable}
            onBrewAle={brewFarmAle}
          />
        );
      case "innAle":
        return (
          <CityInnAlePanel
            inventory={snapshot.inventory}
            resourceCount={buildingResourceAvailable}
            onServeAle={serveInnAle}
          />
        );
      case "townHallCivic":
        return (
          <section className="blacksmith-station">
            <header>
              <h4>Civic Ledger</h4>
              <span>Faction reputation</span>
            </header>
            <CityFactionPanel factionRep={snapshot.player?.factionRep} />
          </section>
        );
      case "armyTraining":
        return (
          <CityBarracksTrainingPanel
            addon={activeAddon}
            progress={progress}
            cityStats={cityStats}
            snapshot={snapshot}
            onTrain={trainArmyUnit}
          />
        );
      case "armory":
        return (
          <CityArmoryPanel
            inventory={snapshot.inventory}
            progress={progress}
            onConvert={convertInventoryItemToArmory}
          />
        );
      case "research":
        return (
          <CityResearchPanel
            buildingState={buildingState}
            snapshot={snapshot}
            resourceCount={buildingResourceAvailable}
            onBuyRecipe={(recipeKey) => buyResearchRecipe(recipeKey)}
            onMerge={(recipe) => mergeResearchRecipe(recipe)}
          />
        );
      case "potionLab":
        return (
          <CityPotionLabPanel
            countIngredient={(ingredientId) => potionIngredientAvailable(ingredientId)}
            onMix={(recipe) => mixPotionRecipe(recipe)}
          />
        );
      case "socket":
        return (
          <CitySocketPanel
            inventory={snapshot.inventory}
            gold={snapshot.player?.gold ?? 0}
            onAddSocket={(index) => engineRef.current?.addSocketToInventoryItem?.(index)}
            onSocketGem={(itemIndex, gemIndex) => engineRef.current?.socketGemIntoInventoryItem?.(itemIndex, gemIndex)}
          />
        );
      case "merchant":
        return (
          <CityMerchantPanel
            inventory={snapshot.inventory}
            stock={buildingState.merchant?.stock ?? []}
            gold={snapshot.player?.gold ?? 0}
            popularity={cityStats?.popularity ?? snapshot.player?.popularity ?? 0}
            cityEventModifiers={cityEventModifiers}
            onSell={sellMerchantItem}
            onBuy={buyMerchantItem}
          />
        );
      case "classTraining":
        return (
          <CityClassPanel
            player={snapshot.player}
            progress={progress}
            onChooseClass={(classId) => engineRef.current?.chooseClass?.(classId, progress)}
            onResetClass={() => engineRef.current?.resetClassChoice?.()}
            onUnlockNode={(nodeId) => engineRef.current?.unlockClassNode?.(nodeId, progress)}
          />
        );
      case "skillTree":
        return (
          <CitySkillTreePanel
            player={snapshot.player}
            onBuyRank={(nodeId) => engineRef.current?.buySkillTreeRank?.(nodeId)}
          />
        );
      case "sanctuaryDonation":
        return (
          <CitySanctuaryDonationPanel
            inventory={snapshot.inventory}
            resourceCount={buildingResourceAvailable}
            onDonate={applySanctuaryDonation}
          />
        );
      case "blacksmith":
        return (
          <CityBlacksmithPanel
            engineRef={engineRef}
            snapshot={snapshot}
            snapshotRef={snapshotRef}
            activeAddonId={activeAddon.config?.station === "repair" ? null : activeAddon.id}
            purchasedAddons={purchasedAddons}
            resourceCount={buildingResourceAvailable}
            cityEventModifiers={cityEventModifiers}
            blacksmithModifiers={blacksmithModifiers}
            onRepairEquippedItem={repairEquippedItem}
            onRepairInventoryItem={repairInventoryItem}
          />
        );
      case "custom/noop":
      default:
        return (
          <section className="blacksmith-station">
            <header>
              <h4>{activeAddon.title}</h4>
              <span>{activeAddon.help ?? "No separate station content configured yet."}</span>
            </header>
          </section>
        );
    }
  };

  return (
    <div className="city-popup-backdrop">
      <div className="city-building-shell">
        <nav className="city-building-rail" aria-label="Building functions">
          <button type="button" className={`city-building-rail-tab ${activeBaseTab ? "active" : ""}`} onClick={openBaseTab} title={`${building.title} overview`}>
            {buildingImageSrc && <img src={buildingImageSrc} alt="" draggable="false" />}
            <span>{building.title}</span>
          </button>
          {featureAddons.map((addon) => {
            const bought = purchasedAddons.has(addon.id);
            const unlocked = cityAddonIsUnlocked(addon, snapshot, cityStats);
            const buyCheck = cityBuildingAddonCanBuy(progress, building, addon, snapshot, cityStats);
            const iconSprite = cityImageForAddon(houseImages, building, addon, progress);
            const addonIconUrl = cityImageElementSrc(iconSprite, addon.imageUrl ?? buildingImageSrc);
            return (
              <button
                type="button"
                className={`city-building-rail-tab ${bought ? "bought" : "unowned"} ${!bought && !addon.prebuilt ? "not-built" : ""} ${!bought && !buyCheck.canBuy ? "unaffordable" : ""} ${activeAddonId === addon.id ? "active" : ""} ${!unlocked ? "locked" : ""}`}
                key={addon.id}
                disabled={!owned || !unlocked}
                onClick={() => {
                  setActiveAddonId(addon.id);
                  setFunctionModalId(addon.id);
                }}
                title={!unlocked ? cityAddonLockText(addon, snapshot, cityStats) : bought ? addon.title : buyCheck.canBuy ? `Buy ${addon.title}` : buyCheck.reasons.join(", ")}
              >
                {addonIconUrl && <img src={addonIconUrl} alt="" draggable="false" />}
                <span>{addon.title}</span>
              </button>
            );
          })}
        </nav>
      <section className={`city-popup city-building-modal ${activeBaseTab ? "base-tab" : "function-tab"}`} role="dialog" aria-modal="true" aria-label={building.title}>
        <header className="city-popup-header">
          <div>
            <h3>{functionModalTitle}</h3>
            <span>{headerStatus}</span>
            {!activeBaseTab && functionModalHelp && <p className="city-building-tab-help">{functionModalHelp}</p>}
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>

        {activeBaseTab && <div className="city-popup-summary">
          <div className="city-building-thumb">
            {buildingImageSrc && <img src={buildingImageSrc} alt="" draggable="false" />}
          </div>
          <div>
            <p>{building.help}</p>
            {building.functionText && <p>{building.functionText}</p>}
            {owned && <CityStatEffectsSummary title="Building effects" effects={cityBuildingActiveStatEffects(building, buildingState.level)} />}
            {owned && (
              <div style={{ marginTop: 8 }}>
                <b>Durability:</b> {(Math.floor(Number(buildingState.durability ?? DURABILITY_DEFAULT) * 100) / 100).toFixed(2)}%
              </div>
            )}
            {owned && (
              <div style={{ marginTop: 6 }}>
                <b>Repair cost:</b>
                <div className="city-area-costs" style={{ marginTop: 6 }}>
                  {(computeRepairCostEntries(building.cost ?? {}, Math.max(0, Math.ceil(100 - (buildingState.durability ?? DURABILITY_DEFAULT))))).length === 0 && (
                    <span>Ingen resources kræves.</span>
                  )}
                  {computeRepairCostEntries(building.cost ?? {}, Math.max(0, Math.ceil(100 - (buildingState.durability ?? DURABILITY_DEFAULT)))).map(([resourceId, amount]) => (
                    <span key={resourceId} className={buildingResourceAvailable(resourceId) >= amount ? "met" : "missing"}>
                      <CityCostIcon resourceId={resourceId} />
                      {amount} {cityCostLabel(resourceId)} {buildingResourceAvailable(resourceId) !== undefined && `(${buildingResourceAvailable(resourceId)} available)`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {owned && nextBuildingLevel && (
              <div className="city-upgrade-summary">
                <b>Next: Level {nextBuildingLevel.level}{nextBuildingLevel.title ? ` - ${nextBuildingLevel.title}` : ""}</b>
                <CityStatEffectsSummary title="Adds" effects={nextBuildingLevel.statEffects} />
                {nextBuildingLevelRequirementEntries.length > 0 && (
                  <div className="city-area-requirements city-building-requirements">
                    {nextBuildingLevelRequirementEntries.map((entry) => (
                      <span className={entry.met ? "met" : "missing"} key={entry.key}>{entry.label}</span>
                    ))}
                  </div>
                )}
                {nextBuildingLevelCostEntries.length > 0 && (
                  <div className="city-area-costs">
                    {nextBuildingLevelCostEntries.map(([resourceId, amount]) => (
                      <span className={buildingResourceAvailable(resourceId) >= amount ? "met" : "missing"} key={resourceId}>
                        <CityCostIcon resourceId={resourceId} />
                        {amount} {cityCostLabel(resourceId)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!owned && statRequirementEntries.length > 0 && (
              <div className="city-area-requirements city-building-requirements">
                {statRequirementEntries.map((entry) => (
                  <span className={entry.met ? "met" : "missing"} key={entry.key}>
                    {entry.label}
                  </span>
                ))}
              </div>
            )}
            {!owned && costEntries.length > 0 && <CityCostSummary costEntries={costEntries} buildingState={buildingState} snapshot={snapshot} progress={progress} />}
            <div className="city-popup-actions">
              <button type="button" onClick={() => setBuildPaymentOpen(true)} disabled={owned || !statRequirementsMet}>
                Buy
              </button>
              <button type="button" onClick={upgradeBuilding} disabled={!owned || !nextBuildingLevel || !canUpgradeBuilding}>
                Upgrade
              </button>
              <button type="button" onClick={() => repairBuilding()} disabled={(buildingState.durability ?? 100) >= 100}>Repair</button>
            </div>
          </div>
        </div>}

        <main className={`city-popup-main ${activeStorageSection ? "storage-tab" : ""}`}>
          {activeBaseTab && (
            <section className="city-building-base-note">
              <h4>{building.title}</h4>
              <p>{building.functionText ?? building.help}</p>
              {featureAddons.length > 0 && <span>{featureAddons.filter((addon) => purchasedAddons.has(addon.id)).length} / {featureAddons.length} addons active</span>}
            </section>
          )}
          {!activeBaseTab && (
            <>
                  {activeAddon && !activeAddonOwned && (
                    <section className="city-addon-purchase-panel">
                      <header>
                        <h4>{activeAddon.title}</h4>
                        <span>{activeAddon.help}</span>
                      </header>
                      <div className="city-addon-purchase-row">
                        <b>Cost</b>
                        <CityCostGrid entries={cityBuildingAddonCostEntries(activeAddon)} snapshot={snapshot} progress={progress} emptyText="Free" />
                        <button
                          type="button"
                          disabled={!cityBuildingAddonCanBuy(progress, building, activeAddon, snapshot, cityStats).canBuy}
                          onClick={() => buyAddon(activeAddon)}
                        >
                          Buy addon
                        </button>
                      </div>
                    </section>
                  )}
                  {(!activeAddon || activeAddonOwned) && (
                    <>
                  {owned && activeStorageSection && (
                    <CityStoragePanel
                      building={building}
                      buildingState={buildingState}
                      owned={owned}
                      inventory={snapshot.inventory}
                      equipment={snapshot.equipment}
                      backpackUnlockedSlots={backpackCapacity}
                      activeSectionKey={activeStorageSection.key}
                      draggedCityItem={draggedCityItem}
                      onDragCityItem={setDraggedCityItem}
                      onDepositInventoryItem={depositInventoryItem}
                      onWithdrawStoredItem={withdrawStoredItem}
                      onMoveStoredItem={moveStoredItem}
                      onReadStoredItem={(item) => setStoredReadable(readableDialogFromItem(item))}
                      onTransferAllResources={transferAllResources}
                      onSortBackpack={(sortId) => engineRef.current?.sortInventory?.(sortId)}
                      onSortStoredItems={sortStoredItems}
                    />
                  )}
                  {renderActiveFeaturePanel()}
                    </>
                  )}
            </>
          )}
        </main>
      </section>
      </div>
      {buildPaymentOpen && !owned && (
        <CityBuildPaymentModal
          building={building}
          buildingState={buildingState}
          snapshot={snapshot}
          progress={progress}
          costEntries={costEntries}
          canFinish={remainingCostEntries.every(([, remaining]) => remaining <= 0)}
          canPayAll={canBuyBuilding}
          statRequirementsMet={statRequirementsMet}
          onApplyResource={applyBuildResource}
          onPayAll={() => {
            for (const [resourceId, remaining] of remainingCostEntries) {
              if (remaining > 0) applyBuildResource(resourceId, remaining);
            }
          }}
          onFinish={finishBuild}
          onClose={() => setBuildPaymentOpen(false)}
        />
      )}
      {storedReadable && (
        <ReadableDialog
          entry={storedReadable}
          onClose={() => setStoredReadable(null)}
        />
      )}
      {confirmStoreItem && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-label="Confirm storage">
            <h2>Aflever bogen?</h2>
            <p>{confirmStoreItem.itemName} bliver placeret permanent i denne samling.</p>
            <div>
              <button type="button" onClick={() => setConfirmStoreItem(null)}>Cancel</button>
              <button type="button" onClick={() => {
                depositInventoryItem(confirmStoreItem.inventoryIndex, confirmStoreItem.sectionKey, confirmStoreItem.slotIndex, true);
                setConfirmStoreItem(null);
              }}>Confirm</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function cityAddonIsUnlocked(addon, snapshot, cityStats = {}) {
  if (addon?.prebuilt) return true;
  const required = addon?.unlock?.completedQuests ?? [];
  const statRequirements = addon?.statRequirements ?? addon?.unlock?.statRequirements ?? addon?.unlock?.stats;
  if (!cityStatsMeetRequirements(statRequirements, cityStats)) return false;
  if (!required.length) return true;
  const completed = new Set((snapshot?.quests?.completed ?? []).map(String));
  return required.every((questId) => completed.has(String(questId)));
}

function cityAddonLockText(addon, snapshot, cityStats = {}) {
  if (cityAddonIsUnlocked(addon, snapshot, cityStats)) return "";
  if (addon?.unlock?.text) return addon.unlock.text;
  const statRequirementEntries = cityStatRequirementEntries(addon?.statRequirements ?? addon?.unlock?.statRequirements ?? addon?.unlock?.stats, cityStats);
  const missingStats = statRequirementEntries.filter((entry) => !entry.met).map((entry) => entry.label);
  if (missingStats.length) return `Requires ${missingStats.join(", ")}`;
  const required = addon?.unlock?.completedQuests ?? [];
  const completed = new Set((snapshot?.quests?.completed ?? []).map(String));
  const missing = required.filter((questId) => !completed.has(String(questId)));
  if (!missing.length) return "Locked";
  return `Requires ${missing.map((questId) => QUEST_DEFS[questId]?.title ?? questId).join(", ")}`;
}

function normalizeInventoryType(value) {
  if (!value || value === "none") return { type: "none", slots: 0, cityCostAccess: true };
  if (typeof value === "number") return { type: "all", slots: Math.max(0, Math.floor(value)), cityCostAccess: true };
  if (typeof value === "string") return { type: value, slots: 0, cityCostAccess: true };
  return {
    type: String(value.type ?? value.accepts ?? "none"),
    slots: Math.max(0, Math.floor(Number(value.slots ?? value.size ?? 0) || 0)),
    cityCostAccess: value.cityCostAccess !== false,
  };
}

function cityInventorySectionKey(source) {
  if (source?.config?.legacyBase) return "base";
  return source?.id ? `addon:${source.id}` : "base";
}

function cityStorageCanSupplyCityCosts(source, inventoryType = normalizeInventoryType(source?.inventoryType)) {
  return source?.cityCostAccess !== false
    && source?.lockedForCityUse !== true
    && source?.config?.cityCostAccess !== false
    && source?.config?.lockedForCityUse !== true
    && inventoryType.cityCostAccess !== false;
}

function cityInventorySections(building, state, owned) {
  if (!owned) return [];
  const sections = [];
  const baseInventory = normalizeInventoryType(building.inventoryType);
  const baseFixedDefs = fixedReadableDefsForInventoryType(baseInventory.type);
  const baseSlots = baseFixedDefs.length || baseInventory.slots;
  if (baseInventory.type !== "none" && baseSlots > 0) {
    sections.push({
      key: "base",
      label: building.title,
      type: baseInventory.type,
      typeLabel: cityInventoryTypeLabel(baseInventory.type),
      slots: baseSlots,
      fixedDefs: baseFixedDefs,
      cityCostAccess: cityStorageCanSupplyCityCosts(building, baseInventory),
    });
  }
  const bought = new Set(state.addons ?? []);
  for (const addon of normalizeCityBuildingAddons(building)) {
    if (!bought.has(addon.id)) continue;
    if (addon.config?.legacyBase && baseInventory.type !== "none" && baseSlots > 0) continue;
    const addonInventory = normalizeInventoryType(addon.inventoryType);
    const fixedDefs = fixedReadableDefsForInventoryType(addonInventory.type);
    const slots = fixedDefs.length || addonInventory.slots;
    if (addonInventory.type === "none" || slots <= 0) continue;
    sections.push({
      key: cityInventorySectionKey(addon),
      label: addon.title,
      type: addonInventory.type,
      typeLabel: cityInventoryTypeLabel(addonInventory.type),
      slots,
      fixedDefs,
      cityCostAccess: cityStorageCanSupplyCityCosts(addon, addonInventory),
    });
  }
  return sections;
}

function normalizeCityInventories(state, building) {
  const source = state?.inventories && typeof state.inventories === "object" ? state.inventories : {};
  const next = { ...source };
  if (!next.base && Array.isArray(state?.items)) next.base = state.items;
  for (const section of cityInventorySections(building, state, true)) {
    const normalized = Array.from({ length: section.slots }, (_, index) => normalizeCityStoredItem(next[section.key]?.[index] ?? null));
    if (Array.isArray(section.fixedDefs) && section.fixedDefs.length > 0) {
      const seenReadableIds = new Set();
      next[section.key] = normalized.map((item, index) => {
        if (!item) return null;
        const fixedDef = section.fixedDefs[index];
        if (!fixedDef || !isReadableItem(item)) return null;
        const readableId = String(item.readableId ?? "");
        if (readableId !== String(fixedDef.id ?? "")) return null;
        if (seenReadableIds.has(readableId)) return null;
        seenReadableIds.add(readableId);
        return {
          ...item,
          iconUrl: fixedDef.iconUrl ?? item.iconUrl,
          name: fixedDef.title ?? item.name,
          baseName: fixedDef.title ?? item.baseName,
        };
      });
      continue;
    }
    next[section.key] = normalized;
  }
  return next;
}

function backpackPotionCount(snapshot, potionId) {
  const id = normalizePotionId(potionId);
  if (!id) return 0;
  return (snapshot?.inventory ?? []).reduce((sum, item) => (
    isPotionItem(item) && normalizePotionId(item.potionId ?? item.potionType) === id
      ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
      : sum
  ), 0);
}

function cityStoredPotionCount(progress = {}, potionId) {
  const id = normalizePotionId(potionId);
  if (!id) return 0;
  let total = 0;
  for (const building of CITY_BUILDINGS) {
    if (!isCityBuildingOwned(progress, building)) continue;
    const state = getCityBuildingState(progress, building);
    const inventories = normalizeCityInventories(state, building);
    for (const section of cityInventorySections(building, state, true)) {
      if (section.cityCostAccess === false) continue;
      for (const item of inventories[section.key] ?? []) {
        if (!isPotionItem(item) || normalizePotionId(item.potionId ?? item.potionType) !== id) continue;
        total += Math.max(1, Math.floor(Number(item.count) || 1));
      }
    }
  }
  return total;
}

function consumeCityStoredPotions(progress = {}, potionId, amount = 0) {
  const id = normalizePotionId(potionId);
  let remaining = Math.max(0, Math.floor(Number(amount) || 0));
  if (!id || remaining <= 0) return { progress, consumed: 0 };
  let nextProgress = progress;
  let consumed = 0;
  for (const building of CITY_BUILDINGS) {
    if (remaining <= 0 || !isCityBuildingOwned(nextProgress, building)) continue;
    const state = getCityBuildingState(nextProgress, building);
    const sections = cityInventorySections(building, state, true);
    const inventories = normalizeCityInventories(state, building);
    let changed = false;
    const nextInventories = { ...inventories };
    for (const section of sections) {
      if (remaining <= 0) break;
      if (section.cityCostAccess === false) continue;
      const items = [...(nextInventories[section.key] ?? [])];
      for (let index = items.length - 1; index >= 0 && remaining > 0; index -= 1) {
        const item = items[index];
        if (!isPotionItem(item) || normalizePotionId(item.potionId ?? item.potionType) !== id) continue;
        const count = Math.max(1, Math.floor(Number(item.count) || 1));
        const used = Math.min(count, remaining);
        remaining -= used;
        consumed += used;
        const left = count - used;
        items[index] = left > 0 ? { ...item, count: left } : null;
        changed = true;
      }
      nextInventories[section.key] = items;
    }
    if (changed) {
      nextProgress = {
        ...nextProgress,
        [building.id]: {
          ...(nextProgress[building.id] ?? {}),
          inventories: nextInventories,
        },
      };
    }
  }
  return { progress: nextProgress, consumed };
}

function sortCityStorageSection(progress, buildingId, sectionKey, sortId) {
  const building = CITY_BUILDINGS.find((entry) => entry.id === buildingId);
  if (!building || !isCityBuildingOwned(progress, building)) return progress;
  const state = getCityBuildingState(progress, building);
  const section = cityInventorySections(building, state, true).find((entry) => entry.key === sectionKey);
  if (!section || section.fixedDefs?.length) return progress;
  const inventories = normalizeCityInventories(state, building);
  return {
    ...progress,
    [buildingId]: {
      ...(progress[buildingId] ?? {}),
      inventories: {
        ...inventories,
        [sectionKey]: sortInventorySlots((inventories[sectionKey] ?? []).map((item) => (
          item && item.value === undefined ? { ...item, value: itemValue(item) } : item
        )), sortId),
      },
    },
  };
}

function normalizeCityStoredItem(item) {
  if (!item) return null;
  const next = { ...item };
  if (isReadableItem(next)) {
    const readableDef = READABLE_DEF_BY_ID[next.readableId];
    if (!next.iconUrl && readableDef?.iconUrl) next.iconUrl = readableDef.iconUrl;
  }
  if (!next.iconKey) next.iconKey = deriveIconKey(next);
  if (!next.iconUrl && (next.iconIndex === undefined || next.iconIndex === null)) {
    next.iconUrl = iconUrlFromKey(next.iconKey);
  }
  if (isQuestItem(next) && questItemCanStack(next.questItemId)) {
    next.stackMax = questItemStackMax(next.questItemId);
    next.count = Math.max(1, Math.min(next.stackMax, Math.floor(Number(next.count) || 1)));
  } else if (!isResourceItem(next) && !isPotionItem(next) && next.count !== undefined) {
    delete next.count;
  }
  return next;
}

function cityInventoryTypeLabel(type) {
  const labels = {
    all: "All items",
    gemstone: "Gemstones",
    potion: "Potions",
    resource: "Resources",
    weapon: "Weapons",
    armor: "Armor",
    quest: "Quest items",
    readable: "Readables",
    fixed_lorebook: "Lorebooks",
    fixed_spellbook: "Spellbooks",
  };
  return labels[type] ?? type;
}

function fixedReadableDefsForInventoryType(type) {
  if (type === "fixed_lorebook") {
    return READABLE_ITEM_DEFS.filter((def) => def.kind === "lorebook" && def.status !== "mergeable");
  }
  if (type === "fixed_spellbook") {
    return READABLE_ITEM_DEFS.filter((def) => def.kind === "spellbook" && def.status !== "mergeable");
  }
  return [];
}

function cityInventorySlotCount(inventoryType) {
  const normalized = normalizeInventoryType(inventoryType);
  return fixedReadableDefsForInventoryType(normalized.type).length || normalized.slots;
}

function itemMatchesCityInventorySlot(item, section, slotIndex) {
  if (!item || !section) return false;
  const fixedDef = section.fixedDefs?.[slotIndex];
  if (fixedDef) return isReadableItem(item) && String(item.readableId) === String(fixedDef.id);
  return itemMatchesCityInventoryType(item, section.type);
}

function itemCanEnterAnyCityInventorySlot(item, section, storedItems = []) {
  if (!item || !section) return false;
  for (let index = 0; index < section.slots; index += 1) {
    if (cityInventoryItemsCanStack(item, storedItems[index])) return true;
    if (!storedItems[index] && itemMatchesCityInventorySlot(item, section, index)) return true;
  }
  return false;
}

function firstCityInventorySlotForItem(item, section, storedItems = []) {
  if (!item || !section) return -1;
  for (let index = 0; index < section.slots; index += 1) {
    if (cityInventoryItemsCanStack(item, storedItems[index])) return index;
  }
  for (let index = 0; index < section.slots; index += 1) {
    if (!storedItems[index] && itemMatchesCityInventorySlot(item, section, index)) return index;
  }
  return -1;
}

function fixedSectionAlreadyHasReadable(item, section, slotIndex, storedItems = []) {
  if (!item || !section?.fixedDefs?.[slotIndex] || !isReadableItem(item)) return false;
  const readableId = String(item.readableId ?? "");
  if (!readableId) return false;
  return storedItems.some((stored, index) => (
    index !== slotIndex
    && isReadableItem(stored)
    && String(stored.readableId ?? "") === readableId
  ));
}

function cityInventoryStackMax(item) {
  if (isResourceItem(item)) {
    return Math.max(1, Math.floor(Number(item.stackMax ?? resourceStackMax(item.resourceId)) || 1));
  }
  if (isPotionItem(item)) {
    return Math.max(1, Math.floor(Number(item.stackMax ?? MAX_POTION_STACK) || 1));
  }
  if (isQuestItem(item)) {
    return Math.max(1, Math.floor(Number(item.stackMax ?? questItemStackMax(item.questItemId)) || 1));
  }
  return 1;
}

function cityInventoryItemsCanStack(incoming, target) {
  if (isResourceItem(incoming) && isResourceItem(target)) {
    if (String(incoming.resourceId ?? "") !== String(target.resourceId ?? "")) return false;
    return Math.max(1, Math.floor(Number(target.count) || 1)) < cityInventoryStackMax(target);
  }
  if (isPotionItem(incoming) && isPotionItem(target)) {
    const incomingPotionId = String(incoming.potionId ?? incoming.potionType ?? "");
    const targetPotionId = String(target.potionId ?? target.potionType ?? "");
    if (incomingPotionId !== targetPotionId) return false;
    return Math.max(1, Math.floor(Number(target.count) || 1)) < cityInventoryStackMax(target);
  }
  if (isQuestItem(incoming) && isQuestItem(target)) {
    return questItemsCanStack(incoming, target);
  }
  return false;
}

function planCityInventoryDeposit(item, section, slotIndex, storedItems = []) {
  if (!item || !section) return null;
  const target = storedItems[slotIndex] ?? null;
  if (!isResourceItem(item) && !isPotionItem(item) && !isQuestItem(item)) {
    if (target || !itemMatchesCityInventorySlot(item, section, slotIndex)) return null;
    return { movedCount: 1, steps: [{ type: "place", slotIndex, count: 1 }] };
  }
  if (target && !cityInventoryItemsCanStack(item, target)) return null;
  const stackMax = cityInventoryStackMax(item);
  let remaining = Math.max(1, Math.floor(Number(item.count) || 1));
  const steps = [];
  const reserve = new Set();
  const addFillStep = (index) => {
    const stored = storedItems[index];
    if (!cityInventoryItemsCanStack(item, stored)) return;
    const current = Math.max(1, Math.floor(Number(stored.count) || 1));
    const moved = Math.min(stackMax - current, remaining);
    if (moved <= 0) return;
    steps.push({ type: "fill", slotIndex: index, count: moved });
    remaining -= moved;
  };

  if (target) {
    addFillStep(slotIndex);
  } else {
    for (let index = 0; index < section.slots && remaining > 0; index += 1) {
      addFillStep(index);
    }
    if (remaining > 0 && itemMatchesCityInventorySlot(item, section, slotIndex)) {
      const moved = Math.min(stackMax, remaining);
      steps.push({ type: "place", slotIndex, count: moved });
      reserve.add(slotIndex);
      remaining -= moved;
    }
    for (let index = 0; index < section.slots && remaining > 0; index += 1) {
      if (reserve.has(index) || storedItems[index] || !itemMatchesCityInventorySlot(item, section, index)) continue;
      const moved = Math.min(stackMax, remaining);
      steps.push({ type: "place", slotIndex: index, count: moved });
      remaining -= moved;
    }
  }

  const movedCount = steps.reduce((sum, step) => sum + step.count, 0);
  return movedCount > 0 ? { movedCount, steps } : null;
}

function cityInventoryItemsSameTransferIdentity(expected, actual) {
  if (!expected || !actual) return false;
  if (isResourceItem(expected) || isResourceItem(actual)) {
    return isResourceItem(expected)
      && isResourceItem(actual)
      && String(expected.resourceId ?? "") === String(actual.resourceId ?? "");
  }
  const expectedId = expected.id ?? expected.itemId;
  const actualId = actual.id ?? actual.itemId;
  if (expectedId !== undefined || actualId !== undefined) {
    return String(expectedId ?? "") === String(actualId ?? "");
  }
  return String(expected.mode ?? "") === String(actual.mode ?? "")
    && String(expected.slot ?? "") === String(actual.slot ?? "")
    && String(expected.name ?? "") === String(actual.name ?? "");
}

function applyCityInventoryDepositPlan(items, item, plan) {
  let remaining = Math.max(1, Math.floor(Number(item.count) || plan.movedCount || 1));
  for (const step of plan.steps) {
    if (remaining <= 0) break;
    const moved = Math.min(step.count, remaining);
    if (step.type === "fill") {
      const target = items[step.slotIndex];
      if (!target) continue;
      const current = Math.max(1, Math.floor(Number(target.count) || 1));
      items[step.slotIndex] = { ...target, count: current + moved };
    } else {
      const placed = { ...item };
      if (isResourceItem(placed) || isPotionItem(placed) || isQuestItem(placed)) {
        placed.count = moved;
      } else {
        delete placed.count;
      }
      items[step.slotIndex] = placed;
    }
    remaining -= moved;
  }
}

function itemMatchesCityInventoryType(item, type) {
  if (!item || !type || type === "none") return false;
  if (type === "all") return true;
  if (type === "quest") return isQuestItem(item);
  if (isQuestItem(item)) return false;
  if (type === "gemstone") return item.mode === "resource" && (String(item.resourceId ?? "").includes("gemstone") || item.resourceId === "diamond");
  if (type === "potion") return isPotionItem(item);
  if (type === "resource") return isResourceItem(item);
  if (type === "weapon") return item.slot === "weapon";
  if (type === "armor") return item.mode === "armor";
  if (type === "readable") return isReadableItem(item);
  if (type === "fixed_lorebook") return isReadableItem(item) && item.readableKind === "lorebook" && item.readableStatus !== "mergeable";
  if (type === "fixed_spellbook") return isReadableItem(item) && item.readableKind === "spellbook" && item.readableStatus !== "mergeable";
  return item.mode === type || item.slot === type;
}

























function CityCostSummary({ costEntries, buildingState, snapshot, progress }) {
  if (!costEntries.length) return null;
  return (
    <div className="city-cost-summary">
      {costEntries.map(([resourceId, needed]) => {
        const paid = Math.max(0, buildingState.paid?.[resourceId] ?? 0);
        const remaining = Math.max(0, needed - paid);
        return (
          <span key={resourceId}>
            <CityCostIcon resourceId={resourceId} />
            {paid}/{needed} {cityCostLabel(resourceId)}
            {remaining > 0 && ` (${cityCostAvailable(snapshot, resourceId, progress)} available)`}
          </span>
        );
      })}
    </div>
  );
}

function CityBarracksTrainingPanel({ addon, progress, cityStats, snapshot, onTrain }) {
  const recipes = armyTrainingRecipesForAddon(addon?.id);
  const armyUnits = normalizeArmyUnits(progress?.armyUnits);
  const used = cityArmyUnitCount(armyUnits);
  const capacity = cityUsableSoldierCapacity(cityStats);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{addon.title}</h4>
        <span>Soldiers {used} / {capacity} usable citizens</span>
      </header>
      {Object.entries(CITY_ARMY_UNIT_DEFS).map(([unitId, def]) => (
        <div className="blacksmith-row" key={`owned-${unitId}`}>
          {def.imageUrl ? <img src={def.imageUrl} alt="" draggable="false" /> : <InventoryIcon iconSheet="items" iconUrl="/assets/generated/icon/icon_army.png" />}
          <div>
            <b>{def.label}</b>
            <span>Owned: {armyUnits[unitId] ?? 0} | Power: {def.armyValue}</span>
          </div>
        </div>
      ))}
      {recipes.map((recipe) => {
        const def = CITY_ARMY_UNIT_DEFS[recipe.unitId];
        const hasResources = Object.entries(recipe.cost ?? {}).every(([resourceId, count]) => cityCostAvailable(snapshot, resourceId, progress) >= count);
        const hasCapacity = cityArmyCanTrainUnit(progress, cityStats, recipe.unitId, recipe.count ?? 1);
        return (
          <div className="blacksmith-row" key={recipe.id}>
            {def?.imageUrl ? <img src={def.imageUrl} alt="" draggable="false" /> : <InventoryIcon iconSheet="items" iconUrl="/assets/generated/icon/icon_army.png" />}
            <div>
              <b>Train {def?.label ?? recipe.unitId}</b>
              <div className="city-area-costs city-army-training-costs">
                {Object.entries(recipe.cost ?? {}).map(([resourceId, count]) => {
                  const available = cityCostAvailable(snapshot, resourceId, progress);
                  return (
                    <span className={available >= count ? "met" : "missing"} key={resourceId}>
                      <CityCostIcon resourceId={resourceId} />
                      {count} {cityCostLabel(resourceId)} ({available})
                    </span>
                  );
                })}
                <span className={hasCapacity ? "met" : "missing"}>
                  Citizens {used}/{capacity}
                </span>
              </div>
            </div>
            <button type="button" disabled={!hasResources || !hasCapacity} onClick={() => onTrain(recipe)}>Train</button>
          </div>
        );
      })}
    </section>
  );
}

function CityArmoryPanel({ inventory, progress, onConvert }) {
  const points = cityArmoryPoints(progress);
  const convertibleItems = (inventory ?? [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => canConvertItemToArmory(item));
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Armory</h4>
        <span>weaponPoints {points.weaponPoints} | armorPoints {points.armorPoints}</span>
      </header>
      {convertibleItems.length === 0 && (
        <div className="blacksmith-row">
          <InventoryIcon iconSheet="items" iconUrl="/assets/generated/icon/icon_army.png" />
          <div>
            <b>No convertible equipment</b>
            <span>Only weapon and armor loot can be sent to the Armory.</span>
          </div>
        </div>
      )}
      {convertibleItems.map(({ item, index }) => {
        const target = getArmoryPointTarget(item);
        const quantity = getArmoryItemQuantity(item);
        const pointsPerItem = getArmoryPointValue(item);
        const iconUrl = iconUrlFromKey(deriveIconKey(item));
        const rarityColor = item.rarityColor ?? RARITIES.find((rarity) => rarity.id === item.rarity)?.color ?? "#f5f3ea";
        const rarityLabel = item.rarityLabel ?? RARITIES.find((rarity) => rarity.id === item.rarity)?.label ?? item.rarity ?? "normal";
        return (
          <div className="blacksmith-row armory-item-row" style={{ "--item-quality": rarityColor }} key={item.id ?? index}>
            <InventoryIcon iconSheet="items" iconUrl={item.iconUrl ?? iconUrl} />
            <div>
              <b>{item.name ?? "Unnamed item"}</b>
              <span><i>{rarityLabel}</i> | {item.type ?? (target === "weaponPoints" ? "weapon" : "armor")} | +{pointsPerItem} {target}{quantity > 1 ? ` each, ${quantity} available` : ""}</span>
            </div>
            <button type="button" onClick={() => onConvert(index, 1)}>Convert</button>
            {quantity > 1 && <button type="button" onClick={() => onConvert(index, quantity)}>Convert all</button>}
          </div>
        );
      })}
    </section>
  );
}

function CityStatEffectsSummary({ title, effects }) {
  const entries = Object.entries(mergeCityStatEffects([effects]));
  if (!entries.length) return null;
  return (
    <div className="city-stat-effects">
      {title && <b>{title}</b>}
      <div>
        {entries.map(([statId, amount]) => (
          <span className={amount >= 0 ? "positive" : "negative"} key={statId} title={cityStatLabel(statId)}>
            <CityStatIcon statId={statId} />
            <b>{amount >= 0 ? "+" : ""}{amount}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function CityCampStats({ cityStats }) {
  const events = cityStats.events ?? {};
  const activeEntries = cityEventEntries(events, { includeRisk: true });
  return (
    <div className="city-stat-effects">
      <b>City events</b>
      <div>
        {activeEntries.length ? activeEntries.map((event) => (
          <span
            className={event.positive ? "positive" : "negative"}
            title={event.detail ?? event.label}
            key={event.id}
          >
            <b>{event.label}</b>
            {event.positive ? <em>Positive</em> : Number(event.risk) > 0 ? <em>Risk {Math.round(Number(event.risk))}%</em> : null}
            {event.detail ? <small>{event.detail}</small> : null}
          </span>
        )) : <span><b>Stable</b></span>}
      </div>
      <p>Events are derived from current city stats and apply runtime modifiers without changing base values.</p>
    </div>
  );
}

function factionStatusLabel(value) {
  const rep = Number(value) || 0;
  if (rep <= -50) return "Hostile";
  if (rep <= -10) return "Distrust";
  if (rep <= 9) return "Neutral";
  if (rep <= 49) return "Friendly";
  return "Allied";
}

function CityFactionPanel({ factionRep }) {
  const rep = normalizeFactionRep(factionRep);
  return (
    <div className="city-faction-list">
      {getKnownFactions().map((faction) => {
        const value = Number(rep[faction.id]) || 0;
        return (
          <article className="city-faction-row" key={faction.id}>
            <div>
              <b>{faction.label}</b>
              <span>{faction.description}</span>
            </div>
            <strong title={`Reputation ${value}`}>
              {value}
              <em>{factionStatusLabel(value)}</em>
            </strong>
          </article>
        );
      })}
    </div>
  );
}

function CityBuildPaymentModal({ building, buildingState, snapshot, progress, costEntries, canFinish, canPayAll, statRequirementsMet = true, onApplyResource, onPayAll, onFinish, onClose }) {
  return (
    <div className="city-build-payment-backdrop" role="presentation">
      <section className="city-build-payment-modal" role="dialog" aria-modal="true" aria-label={`Build ${building.title}`}>
        <header>
          <div>
            <h4>{building.title}</h4>
            <span>Pay construction cost</span>
          </div>
          <button type="button" onClick={onClose}>X</button>
        </header>
        <div className="city-cost-list">
          {costEntries.length === 0 && <span>No cost configured yet.</span>}
          {costEntries.map(([resourceId, needed]) => {
            const paid = Math.max(0, buildingState.paid?.[resourceId] ?? 0);
            const remaining = Math.max(0, needed - paid);
            const available = cityCostAvailable(snapshot, resourceId, progress);
            const label = cityCostLabel(resourceId);
            return (
              <div className="city-cost-row" key={resourceId}>
                <CityCostIcon resourceId={resourceId} />
                <span>{label}</span>
                <b>{paid} / {needed}</b>
                <em>Available {available}</em>
                <button type="button" disabled={!statRequirementsMet || !remaining || !available} onClick={() => onApplyResource(resourceId, 1)}>+1</button>
                <button type="button" disabled={!statRequirementsMet || !remaining || !available} onClick={() => onApplyResource(resourceId, Math.min(10, remaining))}>+10</button>
                <button type="button" disabled={!statRequirementsMet || !remaining || !available} onClick={() => onApplyResource(resourceId, remaining)}>Max</button>
              </div>
            );
          })}
        </div>
        <footer>
          <button type="button" onClick={onClose}>Close</button>
          <button type="button" disabled={!canPayAll} onClick={onPayAll}>Pay all</button>
          <button type="button" disabled={!statRequirementsMet || !canFinish} onClick={onFinish}>Build</button>
        </footer>
      </section>
    </div>
  );
}

function CityCostIcon({ resourceId }) {
  if (resourceId === "gold") {
    return <InventoryIcon iconSheet="items" iconUrl={ITEM_GOLD_ICON_URL} />;
  }
  if (resourceId === "weaponPoints") {
    return <InventoryIcon iconSheet="items" iconUrl="/assets/generated/item/item_common_sword.png" />;
  }
  if (resourceId === "armorPoints") {
    return <InventoryIcon iconSheet="items" iconUrl="/assets/generated/item/item_common_chestplate.png" />;
  }
  const def = RESOURCE_DEFS[resourceId];
  if (!def) return <i className="city-cost-missing-icon" aria-hidden="true" />;
  const iconUrl = iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId }));
  return (
    <InventoryIcon iconUrl={def.iconUrl ?? iconUrl} />
  );
}

function CityStorageOverviewModal({
  inventory,
  equipment,
  backpackUnlockedSlots,
  storageEntries,
  draggedCityItem,
  onDragCityItem,
  onDepositInventoryItem,
  onWithdrawStoredItem,
  onMoveStoredItem,
  onSortBackpack,
  onSortStoredItems,
  onClose,
}) {
  const backpackSlots = Array.from({ length: MAX_INVENTORY }, (_, index) => ({ item: inventory[index] ?? null, index }));
  const firstTargetForItem = (item) => {
    for (const entry of storageEntries) {
      const slotIndex = firstCityInventorySlotForItem(item, entry.section, entry.items);
      if (slotIndex >= 0) return { buildingId: entry.buildingId, sectionKey: entry.section.key, slotIndex };
    }
    return null;
  };

  return (
    <div className="city-storage-overview-backdrop" role="presentation">
      <section className="city-storage-overview" role="dialog" aria-modal="true" aria-label="Inventory and storage">
        <header>
          <div>
            <h3>Inventory / Storage</h3>
            <span>Traek items mellem backpack og byens inventories.</span>
          </div>
          <button type="button" onClick={onClose}>X</button>
        </header>
        <div className="city-storage-overview-body">
          <section className="city-storage-overview-panel backpack-drop">
            <div className="city-inventory-heading">
              <h4>Back pack <span>{backpackSlots.filter(({ item }) => item).length} / {backpackUnlockedSlots}</span></h4>
              <InventorySortSelect onSort={onSortBackpack} />
            </div>
            <div
              className="city-storage-overview-grid"
              onDragOver={(event) => {
                if (draggedCityItem?.source === "storage") event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const payload = parseCityDragPayload(event) ?? draggedCityItem;
                if (payload?.source === "storage") {
                  onWithdrawStoredItem(payload.buildingId, payload.sectionKey, payload.slotIndex);
                }
                onDragCityItem(null);
              }}
            >
              {backpackSlots.map(({ item, index }) => {
                const locked = !item && index >= backpackUnlockedSlots;
                const requiredLevel = inventorySlotRequiredLevel(index);
                const target = firstTargetForItem(item);
                if (locked) {
                  return (
                    <CityItemSlot
                      key={`overview-inv-${index}`}
                      item={null}
                      equipment={equipment}
                      locked
                      lockLabel={`L${requiredLevel ?? "?"}`}
                      draggable={false}
                    />
                  );
                }
                return (
                  <CityItemSlot
                    key={`overview-inv-${index}`}
                    item={item}
                    equipment={equipment}
                    locked={false}
                    draggable={Boolean(item) && Boolean(target)}
                    accepted={Boolean(item) && Boolean(target)}
                    muted={Boolean(item) && !target}
                    onDoubleClick={() => {
                      if (target) onDepositInventoryItem(index, target.buildingId, target.sectionKey, target.slotIndex);
                    }}
                    onDragStart={(event) => {
                      if (!target) return;
                      const payload = { source: "inventory", index };
                      onDragCityItem(payload);
                      event.dataTransfer.setData("application/x-city-item", JSON.stringify(payload));
                      event.dataTransfer.effectAllowed = "move";
                    }}
                  />
                );
              })}
            </div>
          </section>
          <div className="city-storage-overview-panels">
            {storageEntries.length === 0 && (
              <section className="city-storage-overview-panel empty">
                <h4>No city storage</h4>
                <p>Bygninger skal have en inventoryType med slots for at blive vist her.</p>
              </section>
            )}
            {storageEntries.map((entry) => (
              <section className="city-storage-overview-panel" key={`${entry.buildingId}-${entry.section.key}`}>
                <div className="city-inventory-heading">
                  <h4>
                    {entry.section.label}
                    <span>{entry.building.title} | {entry.section.typeLabel} | {entry.items.filter(Boolean).length}/{entry.section.slots}</span>
                  </h4>
                  {!entry.section.fixedDefs?.length && (
                    <InventorySortSelect onSort={(sortId) => onSortStoredItems?.(entry.buildingId, entry.section.key, sortId)} />
                  )}
                </div>
                <div className="city-storage-overview-grid">
                  {Array.from({ length: entry.section.slots }, (_, slotIndex) => {
                    const item = entry.items[slotIndex] ?? null;
                    return (
                      <CityItemSlot
                        key={`${entry.buildingId}-${entry.section.key}-${slotIndex}`}
                        item={item}
                        equipment={equipment}
                        placeholder={entry.section.fixedDefs?.[slotIndex]}
                        locked={false}
                        draggable={Boolean(item) && !entry.section.fixedDefs?.[slotIndex]}
                        onDoubleClick={() => {
                          if (item && !entry.section.fixedDefs?.[slotIndex]) {
                            onWithdrawStoredItem(entry.buildingId, entry.section.key, slotIndex);
                          }
                        }}
                        onDragStart={(event) => {
                          if (entry.section.fixedDefs?.[slotIndex]) return;
                          const payload = {
                            source: "storage",
                            buildingId: entry.buildingId,
                            sectionKey: entry.section.key,
                            slotIndex,
                          };
                          onDragCityItem(payload);
                          event.dataTransfer.setData("application/x-city-item", JSON.stringify(payload));
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const payload = parseCityDragPayload(event) ?? draggedCityItem;
                          if (payload?.source === "inventory") {
                            onDepositInventoryItem(payload.index, entry.buildingId, entry.section.key, slotIndex);
                          }
                          if (payload?.source === "storage") {
                            onMoveStoredItem(
                              payload.buildingId,
                              payload.sectionKey,
                              payload.slotIndex,
                              entry.buildingId,
                              entry.section.key,
                              slotIndex,
                            );
                          }
                          onDragCityItem(null);
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CityStoragePanel({
  building,
  buildingState,
  owned,
  inventory,
  equipment,
  backpackUnlockedSlots,
  activeSectionKey,
  draggedCityItem,
  onDragCityItem,
  onDepositInventoryItem,
  onWithdrawStoredItem,
  onMoveStoredItem,
  onReadStoredItem,
  onTransferAllResources,
  onSortBackpack,
  onSortStoredItems,
}) {
  const sections = cityInventorySections(building, buildingState, owned);
  const activeSection = sections.find((section) => section.key === activeSectionKey) ?? sections[0];
  const inventories = normalizeCityInventories(buildingState, building);
  const storedItems = inventories[activeSection?.key] ?? [];
  const inventorySlots = Array.from({ length: MAX_INVENTORY }, (_, index) => ({ item: inventory[index] ?? null, index }))
    .filter(({ item, index }) => (
      (!item && index >= backpackUnlockedSlots)
      || (
      !activeSection?.fixedDefs?.length
      || (Boolean(item) && itemCanEnterAnyCityInventorySlot(item, activeSection, storedItems))
      )
    ));

  if (!activeSection) return null;

  return (
    <section className="city-bank-panel">
      <div className="city-bank-column">
        <div className="city-inventory-heading">
          <h4>Backpack <span>{inventory.filter(Boolean).length} / {backpackUnlockedSlots}</span></h4>
          <InventorySortSelect onSort={onSortBackpack} />
          <button 
            type="button" 
            onClick={() => onTransferAllResources?.(activeSection.key)}
            style={{ padding: "4px 8px", fontSize: "12px" }}
          >
            Overfør al
          </button>
        </div>
        <div
          className="city-bank-grid backpack-drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedCityItem?.source === "storage") onWithdrawStoredItem(draggedCityItem.sectionKey, draggedCityItem.slotIndex);
            onDragCityItem(null);
          }}
        >
          {inventorySlots.map(({ item, index }) => {
            const locked = !item && index >= backpackUnlockedSlots;
            const requiredLevel = inventorySlotRequiredLevel(index);
            if (locked) {
              return (
                <CityItemSlot
                  key={`inv-${index}`}
                  item={null}
                  equipment={equipment}
                  locked
                  lockLabel={`L${requiredLevel ?? "?"}`}
                  draggable={false}
                />
              );
            }
            const canEnter = itemCanEnterAnyCityInventorySlot(item, activeSection, storedItems);
            return (
            <CityItemSlot
              key={`inv-${index}`}
              item={item}
              equipment={equipment}
              locked={false}
              draggable={Boolean(item) && canEnter}
              accepted={Boolean(item) && canEnter}
              muted={Boolean(item) && !canEnter}
              onDoubleClick={() => {
                const slotIndex = firstCityInventorySlotForItem(item, activeSection, storedItems);
                if (slotIndex >= 0) onDepositInventoryItem(index, activeSection.key, slotIndex);
              }}
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-city-item", JSON.stringify({ source: "inventory", index }));
                event.dataTransfer.effectAllowed = "move";
              }}
            />
            );
          })}
        </div>
      </div>
      <div className="city-bank-column">
        <div className="city-inventory-heading">
          <h4>{activeSection.label} <span>{activeSection.typeLabel}</span></h4>
          {!activeSection.fixedDefs?.length && <InventorySortSelect onSort={(sortId) => onSortStoredItems?.(activeSection.key, sortId)} />}
        </div>
        <div className="city-bank-grid">
          {Array.from({ length: activeSection.slots }, (_, index) => {
            const locked = !owned;
            return (
              <CityItemSlot
                key={`${activeSection.key}-${index}`}
                item={storedItems[index]}
                equipment={equipment}
                placeholder={activeSection.fixedDefs?.[index]}
                locked={locked}
                draggable={owned && Boolean(storedItems[index]) && !activeSection.fixedDefs?.[index]}
                onClick={() => {
                  if (storedItems[index] && isReadableItem(storedItems[index])) onReadStoredItem(storedItems[index]);
                }}
                onDoubleClick={() => {
                  if (storedItems[index] && !activeSection.fixedDefs?.[index]) onWithdrawStoredItem(activeSection.key, index);
                }}
                onDragStart={(event) => {
                  if (activeSection.fixedDefs?.[index]) return;
                  onDragCityItem({ source: "storage", sectionKey: activeSection.key, slotIndex: index });
                  event.dataTransfer.setData("application/x-city-item", JSON.stringify({ source: "storage", sectionKey: activeSection.key, slotIndex: index }));
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (locked) return;
                  const payload = parseCityDragPayload(event);
                  if (payload?.source === "inventory") onDepositInventoryItem(payload.index, activeSection.key, index);
                  if (payload?.source === "storage") onMoveStoredItem(payload.sectionKey, payload.slotIndex, activeSection.key, index);
                  onDragCityItem(null);
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}





function drawCityPopupThumb(canvas, sprite, muted) {
  if (!canvas || !sprite) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sourceW = imageSourceWidth(sprite);
  const sourceH = imageSourceHeight(sprite);
  const scale = Math.min(canvas.width * 0.9 / sourceW, canvas.height * 0.9 / sourceH);
  const w = sourceW * scale;
  const h = sourceH * scale;
  ctx.save();
  if (muted) {
    ctx.globalAlpha = 0.54;
    ctx.filter = "grayscale(0.85) brightness(0.8)";
  }
  ctx.drawImage(sprite, (canvas.width - w) / 2, canvas.height - h - 4, w, h);
  ctx.restore();
}




export {
  CityPage,
  CityThreatMeter,
  loadCityAssets,
  loadCityAssetsOnce,
  loadCityProgress,
  saveCityProgress,
  normalizeCityMobs,
  updateRegionCorruptionFromMapReturn,
  normalizeRegionCorruptionEntry,
  getRegionCorruptionLevel,
  setRegionCorruptionLevel,
  calculateCityStats,
  calculateCityStatBreakdown,
  availablePopulationForRecruitment
};
