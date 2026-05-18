import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY, RARITIES, TILE_H, TILE_W } from "../game/data.js";
import { drawGroundTile, drawShadow, loadGeneratedAtlas } from "../game/assets-ground.js";
import { GameEngine } from "../game/GameEngine.js";
import { makeItem, itemValue } from "../game/world.js";
import { makeResourceItem, resourceStackMax } from "../game/GameEngine/helpers.js";
import { ATLAS_FRAMES } from "../game/assets.js";
import { screenToWorld, worldToIso, worldToScreen } from "../game/iso.js";
import { RESOURCE_DEFS, RESOURCE_MERGE_RECIPES } from "../game/config/resource-config.js";
import { READABLE_DEF_BY_ID, READABLE_ITEM_DEFS } from "../game/config/readable-config.js";
import { CITY_AREAS, CITY_AREA_LABEL_OPTIONS, CITY_MAP_IMAGE, CITY_NPC_AREA, CITY_NPC_POINTS } from "../game/config/city-areas-config.js";
import { CITY_BUILDINGS } from "../game/config/city-buildings-config.js";
import { armyTrainingRecipesForAddon } from "../game/config/city-army-recipe-config.js";
import { CITY_ARMY_UNIT_DEFS, normalizeArmyUnits } from "../game/config/city-army-unit-config.js";
import { DURABILITY_DEFAULT, DURABILITY_DEGRADE_CHANCE, DURABILITY_DEGRADE_MIN_PCT, DURABILITY_DEGRADE_MAX_PCT } from "../game/config/durability-config.js";
import { CITY_STATS_RULES } from "../game/config/city-stats-rules-config.js";
import { SPELL_DEFS } from "../game/config/spell-config.js";
import { GEM_SOCKET_BONUSES, MAX_ITEM_SOCKETS, itemCanHaveSockets, normalizeSockets } from "../game/config/socket-config.js";
import {
  SKILL_TREE_BRANCHES,
  skillTreeAvailablePoints,
  skillTreeBranchSpentPoints,
  normalizeSkillTree,
} from "../game/config/skill-tree-config.js";
import { AREA_MAPS, MAP_REGION_SETS, WORLD_MAP } from "../game/config/map-region-config.js";
import { QUEST_DEFS, QUEST_ITEM_DEFS } from "../game/config/quest-config.js";
import { QUEST_NPCS } from "../game/config/npc-config.js";
import { SAVE_STORAGE_KEY, SAVE_VERSION, SHOW_INACTIVE_CITY_NPCS } from "../game/config/game-engine-config.js";
import { SAVE_PERSIST_CONFIG } from "../game/config/save-persist-config.js";
import {
  CITY_MOB_DAMAGE_PER_LEVEL_PCT,
  CITY_MOB_LEVELS,
  CITY_MOB_LEVEL_UP_CHANCE,
  CITY_MOB_MAX_LEVEL,
  CITY_MOB_POOL,
  CITY_SPAWN_AREA_BUILDING_TARGETS,
  CITY_SPAWN_AREA_RULES,
  CITY_SPAWN_PATHS,
  CITY_SPAWN_SPREAD_TARGETS,
  CITY_THREAT_SPAWN_THRESHOLD,
  calcCitySpawnChance,
  calcThreatFallOnMapExit,
  calcThreatRiseOnDeath,
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
import { QuestObjectiveMeta } from "./quests/quest-dialogs.jsx";
import { mapRegionColor } from "./map/map-dialogs.jsx";
import { emptySnapshot } from "./app-snapshot.js";
import {
  CITY_BUILDING_CHIPS_ALWAYS_VISIBLE,
} from "./city-constants.js";
import {
  CityArcaneExtractorPanel,
  CityBlacksmithPanel,
  CityFarmPanel,
  CityGoldBarPanel,
  CityMerchantPanel,
  CityReadableMergePanel,
  CityResearchPanel,
  CitySkillTreePanel,
  CitySocketPanel,
  CityTownHallPanel,
} from "./city-panels.jsx";

import {
  addCityPermanentStatBonus,
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
  addCityPopulationLoss,
  loadCityAssets,
  loadCityAssetsOnce,
  loadCityProgress,
  loadImage,
  mergeCityStatEffects,
  normalizeCityMobs,
  payCityCostEntries,
  pickCityBattleRegion,
  removeGreenScreen,
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


function CityPage({
  engineRef,
  snapshot,
  setSnapshot,
  cityStorageKey = CITY_STORAGE_KEY,
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
  const snapshotRef = useRef(snapshot);
  const cityStorageKeyRef = useRef(cityStorageKey);
  const [loadingCity, setLoadingCity] = useState(!cityAssetCache.assets);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [selectedQuestNpcId, setSelectedQuestNpcId] = useState(null);
  const [hoveredAreaId, setHoveredAreaId] = useState(null);
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
    if (!CITY_BUILDING_CHIPS_ALWAYS_VISIBLE) return [];
    return interactiveAreas
      .filter((area) => isCityAreaUnlocked(cityProgress, area))
      .map((area) => ({
        area,
        buildingRefs: cityAreaBuildingRefs(area),
      }))
      .filter((group) => group.buildingRefs.length > 0);
  }, [interactiveAreas, cityProgress]);
  const activeAreaPanelBuildings = useMemo(() => (
    activeAreaPanel && isCityAreaUnlocked(cityProgress, activeAreaPanel)
      ? cityAreaBuildingRefs(activeAreaPanel)
      : []
  ), [activeAreaPanel, cityProgress]);
  const cityMapNpcs = useMemo(() => (
    getCityMapQuestNpcs(snapshot.quests?.cityNpcStates ?? [], SHOW_INACTIVE_CITY_NPCS, npcPlacementSeedRef.current)
  ), [snapshot.quests?.cityNpcStates]);
  const cityStats = useMemo(() => calculateCityStats(cityProgress, snapshot, regionCorruption), [cityProgress, snapshot, regionCorruption]);
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
    setClickedAreaId(null);
  }, [cityStorageKey]);

  useEffect(() => {
    setCityProgress((current) => rerollMerchantStockForCityVisit(current, snapshotRef.current.player?.level ?? 1));
  }, [cityStorageKey]);

  // Apply durability degradation on each city visit
  useEffect(() => {
    setCityProgress((current) => applyDurabilityDegradationForVisit(current));
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
    setCityProgress((current) => applyCityMobProgressForVisit(current));
  }, [cityStorageKey]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const station = selectedBuildingId === "library"
      ? "library"
      : selectedBuildingId === "mage_tower"
        ? "mage_tower"
        : "backpack";
    engineRef.current?.setReadableMergeStation?.(station);
  }, [selectedBuildingId, engineRef]);

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
    const target = findStorageEntry(cityProgressRef.current, buildingId, sectionKey);
    if (!target || target.section.fixedDefs?.[slotIndex]) return;
    if (slotIndex >= target.section.slots || !itemMatchesCityInventorySlot(item, target.section, slotIndex)) return;
    const inventories = normalizeCityInventories(target.state, target.building);
    const depositPlan = planCityInventoryDeposit(item, target.section, slotIndex, inventories[sectionKey] ?? []);
    if (!depositPlan || depositPlan.movedCount <= 0) return;
    const taken = engineRef.current?.takeInventoryItemCount?.(inventoryIndex, depositPlan.movedCount)
      ?? engineRef.current?.takeInventoryItem?.(inventoryIndex);
    if (!taken) return;
    setCityProgress((current) => {
      const currentTarget = findStorageEntry(current, buildingId, sectionKey);
      if (!currentTarget) return current;
      const nextInventories = normalizeCityInventories(currentTarget.state, currentTarget.building);
      const items = [...(nextInventories[sectionKey] ?? [])];
      applyCityInventoryDepositPlan(items, taken, depositPlan);
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
    if (!item || !engineRef.current?.returnInventoryItem?.(item)) return;
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
    return inventory.length < MAX_INVENTORY;
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
      if (result.populationLoss > 0) next = addCityPopulationLoss(next, result.populationLoss);
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
          {CITY_BUILDING_CHIPS_ALWAYS_VISIBLE && visibleAreaBuildingGroups.map(({ area, buildingRefs }) => (
            <CityMapHoverIcons
              area={area}
              buildingRefs={buildingRefs}
              npcRefs={[]}
              buildingImageUrls={cityBuildingImageUrls}
              onOpenBuilding={openBuilding}
              onOpenNpc={openNpc}
              key={area.id}
            />
          ))}
          {!CITY_BUILDING_CHIPS_ALWAYS_VISIBLE && hoveredArea && isCityAreaUnlocked(cityProgress, hoveredArea) && (
            <CityMapHoverIcons
              area={hoveredArea}
              buildingRefs={hoverAreaBuildings}
              npcRefs={[]}
              buildingImageUrls={cityBuildingImageUrls}
              onOpenBuilding={openBuilding}
              onOpenNpc={openNpc}
            />
          )}
          <CityMapHoverIcons
            area={{ id: "city_npcs", title: "City NPCs" }}
            buildingRefs={[]}
            npcRefs={cityMapNpcs}
            npcImageUrls={cityNpcImageUrls}
            onOpenBuilding={openBuilding}
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
        <div className={`city-area-panel-slot ${activeAreaPanel ? "has-content" : ""}`}>
        {activeAreaPanel ? (
          <CityAreaPopover
            area={activeAreaPanel}
            snapshot={snapshot}
            progress={cityProgress}
            cityStats={cityStats}
            buildingRefs={activeAreaPanelBuildings}
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
          onConvertResourceToResource={convertCityResourceToResource}
          onChangeProgress={setCityProgress}
          onClose={() => setSelectedBuildingId(null)}
        />
      )}
      {!loadingCity && selectedQuestNpcId && (
        <CityQuestPopup
          npcId={selectedQuestNpcId}
          engineRef={engineRef}
          npcStates={snapshot.quests?.cityNpcStates ?? []}
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
          storageEntries={storageEntries}
          draggedCityItem={globalStorageDrag}
          onDragCityItem={setGlobalStorageDrag}
          onDepositInventoryItem={depositInventoryItemToStorage}
          onWithdrawStoredItem={withdrawStoredItemToBackpack}
          onMoveStoredItem={moveStoredItemBetweenStorage}
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

function CityAreaPopover({ area, snapshot, progress, cityStats, buildingRefs, onUnlock, onUpgrade, onRepair }) {
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
  const panelImageUrl = buildingRefs[0]?.building?.imageUrl ?? CITY_MAP_IMAGE.src;
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
              <CityBuildingIconList buildingRefs={buildingRefs} />
            </CityPanelSection>
          )}
          {area.id === "outer_5" && <CityCampStats cityStats={cityStats} />}
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
              <CityBuildingIconList buildingRefs={buildingRefs} />
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

function CityBuildingIconList({ buildingRefs }) {
  if (!buildingRefs?.length) return null;
  return (
    <div className="city-area-building-icons">
      {buildingRefs.map(({ building }) => (
        <span className="city-area-building-chip" title={building.title} key={building.id}>
          {building.imageUrl ? <img src={building.imageUrl} alt="" draggable="false" /> : <i>{cityBuildingIconText(building)}</i>}
          <b>{building.title}</b>
        </span>
      ))}
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

function CityMapHoverIcons({ area, buildingRefs, npcRefs, npcImageUrls = {}, buildingImageUrls = {}, onOpenBuilding, onOpenNpc }) {
  return (
    <div className="city-map-hover-icons" aria-label={`${area.title} actions`}>
      {buildingRefs.map(({ building, x, y }) => {
        const imageUrl = buildingImageUrls[cityBuildingImageKey(building)] || building.imageUrl || "";
        return (
          <button
            type="button"
            className="city-map-action-icon building"
            style={cityMapPositionStyle(x, y)}
            title={building.title}
            aria-label={building.title}
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
            <p>Population lost: {result.populationLoss ?? 0}</p>
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
}

function getActiveCityQuestNpcs(layout, cityNpcStates = [], showInactive = SHOW_INACTIVE_CITY_NPCS) {
  const allNpcIds = Object.keys(QUEST_NPCS);
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

function CityQuestPopup({ npcId, engineRef, npcStates, onClose, onQuestCompleted }) {
  const npc = QUEST_NPCS[npcId];
  const state = (npcStates ?? []).find((entry) => entry.npcId === npcId) ?? { active: [], offers: [] };
  const npcQuests = state.active ?? [];
  const npcOffers = state.offers ?? [];
  if (!npc) return null;

  const turnIn = (quest) => {
    const result = engineRef.current?.completeQuest?.(quest.id, npcId);
    if (result?.ok) {
      onQuestCompleted?.(result);
    }
  };

  const acceptQuest = (quest) => {
    const accepted = engineRef.current?.acceptQuestOffer?.(quest, "city");
    if (accepted) onClose();
  };

  return (
    <div className="city-popup-backdrop">
      <section className="city-popup quest-popup" role="dialog" aria-modal="true" aria-label={npc.name}>
        <header className="city-popup-header">
          <div>
            <h3>{npc.name}</h3>
            <span>{npc.title}</span>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>
        <div className="quest-npc-summary">
          <img src={npc.imageUrl} alt="" />
          <p>{npc.cityHint}</p>
        </div>
        <main className="quest-list">
          {npcOffers.map((quest) => (
            <article className="quest-card" key={`offer-${quest.id}`}>
              <header>
                <b>{quest.title}</b>
                <span>Ny quest</span>
              </header>
              <p>{quest.story}</p>
              <QuestObjectiveMeta quest={quest} />
              <button type="button" onClick={() => acceptQuest(quest)}>
                Tag quest
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
              <button type="button" disabled={!quest.complete} onClick={() => turnIn(quest)}>
                Indlever quest
              </button>
            </article>
          ))}
          {!npcOffers.length && !npcQuests.length && <p>Ingen quests tilgaengelige lige nu.</p>}
        </main>
      </section>
    </div>
  );
}

function CityBuildingPopup({ buildingId, engineRef, snapshot, snapshotRef, progress, houseImages, cityStats = {}, onConvertResourceToResource, onChangeProgress, onClose }) {
  const building = CITY_BUILDINGS.find((entry) => entry.id === buildingId);
  const [draggedCityItem, setDraggedCityItem] = useState(null);
  const [activeAddonId, setActiveAddonId] = useState(null);
  const [buildPaymentOpen, setBuildPaymentOpen] = useState(false);
  const [storedReadable, setStoredReadable] = useState(null);
  const [confirmStoreItem, setConfirmStoreItem] = useState(null);
  if (!building) return null;

  const buildingState = getCityBuildingState(progress, building);
  const owned = buildingState.level > 0;
  const prebuilt = Boolean(building.prebuilt);
  const payBuildingEntries = (entries, progressOverride = progress) => (
    payCityCostEntries(entries, engineRef.current, snapshotRef?.current ?? snapshot, progressOverride, onChangeProgress)
  );
  const buildingResourceAvailable = (resourceId, progressOverride = progress) => (
    cityCostAvailable(snapshotRef?.current ?? snapshot, resourceId, progressOverride)
  );
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
  const sprite = cityImageForBuilding(houseImages, building);
  const purchasedAddons = new Set(buildingState.addons ?? []);
  const activeAddon = (building.addons ?? []).find((addon) => addon.id === activeAddonId && purchasedAddons.has(addon.id)) ?? null;
  const storageSections = cityInventorySections(building, buildingState, owned);
  const activeStorageSection = activeAddon
    ? storageSections.find((section) => section.key === cityInventorySectionKey(activeAddon)) ?? null
    : storageSections.find((section) => section.key === "base") ?? storageSections[0] ?? null;

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
    if (!owned || purchasedAddons.has(addon.id)) return;
    if (!cityAddonIsUnlocked(addon, snapshot)) return;
    const goldCost = addon.cost?.gold ?? 0;
    if (goldCost > 0 && (snapshot?.player?.gold ?? 0) < goldCost) return;
    const paidGold = goldCost > 0 ? engineRef.current?.consumeGold?.(goldCost) ?? 0 : 0;
    if (paidGold < goldCost) return;
    onChangeProgress((current) => ({
      ...current,
      [building.id]: {
        ...(current[building.id] ?? {}),
        addons: [...new Set([...(Array.isArray(current[building.id]?.addons) ? current[building.id].addons : []), addon.id])],
      },
    }));
  };

  const depositInventoryItem = (inventoryIndex, sectionKey, slotIndex, confirmed = false) => {
    if (!owned) return;
    const item = snapshot.inventory?.[inventoryIndex];
    const section = cityInventorySections(building, buildingState, owned).find((entry) => entry.key === sectionKey);
    if (!section || slotIndex >= section.slots || !itemMatchesCityInventorySlot(item, section, slotIndex)) return;
    if (section.fixedDefs?.[slotIndex] && !confirmed) {
      setConfirmStoreItem({ inventoryIndex, sectionKey, slotIndex, itemName: item.name });
      return;
    }
    const inventories = normalizeCityInventories(buildingState, building);
    const depositPlan = planCityInventoryDeposit(item, section, slotIndex, inventories[sectionKey] ?? []);
    if (!depositPlan || depositPlan.movedCount <= 0) return;
    const taken = engineRef.current?.takeInventoryItemCount?.(inventoryIndex, depositPlan.movedCount)
      ?? engineRef.current?.takeInventoryItem?.(inventoryIndex);
    if (!taken) return;
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
      applyCityInventoryDepositPlan(items, taken, depositPlan);
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
    if (!engineRef.current?.returnInventoryItem?.(item)) return;
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
    const resources = (snapshot.inventory ?? [])
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => isResourceItem(item))
      .sort((a, b) => (a.item.resourceId ?? "").localeCompare(b.item.resourceId ?? ""));
    let transferred = 0;
    for (const { item, index } of resources) {
      if (transferred >= (snapshot.inventory ?? []).length) break;
      const remainingAttempts = 10;
      for (let attempt = 0; attempt < remainingAttempts; attempt++) {
        const currentItem = snapshot.inventory?.[index];
        if (!currentItem) break;
        const section = cityInventorySections(building, buildingState, owned).find((entry) => entry.key === sectionKey);
        if (!section) break;
        const inventories = normalizeCityInventories(buildingState, building);
        const slotIndex = firstCityInventorySlotForItem(currentItem, section, inventories[sectionKey] ?? []);
        if (slotIndex < 0) break;
        depositInventoryItem(index, sectionKey, slotIndex, true);
        transferred += 1;
      }
    }
    if (transferred > 0) engineRef.current?.addToast?.(`Overførte ${transferred} resource item til ${section.label}`);
  };

  const repairBuilding = (percent = null) => {
    if (!building) return;
    const state = progress?.[building.id] ?? {};
    const currentDur = Math.max(0, Math.min(100, Number(state.durability ?? DURABILITY_DEFAULT)));
    const missing = Math.max(0, Math.ceil((percent !== null && typeof percent === "number" ? percent : (100 - currentDur))));
    if (missing <= 0) return;
    const repairEntries = computeRepairCostEntries(building.cost ?? {}, missing);

    // Check availability and show informative toast if missing
    const deficits = repairEntries
      .map(([resourceId, amount]) => {
        const available = buildingResourceAvailable(resourceId, progress);
        return { resourceId, amount, available };
      })
      .filter((entry) => entry.available < entry.amount);
    if (deficits.length > 0) {
      const parts = deficits.map((d) => `${cityCostLabel(d.resourceId)} ${d.amount} (du har ${d.available})`);
      engineRef.current?.addToast?.(`Kan ikke reparere: mangler ${parts.join(", ")}`);
      return;
    }

    const paid = payBuildingEntries(repairEntries, progress);
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

  const contributeTownHallResource = (resourceId, cost, armyGain) => {
    const population = Math.max(0, Math.floor(Number(cityStats.population) || 0));
    const army = Math.max(0, Math.floor(Number(snapshot.player?.stats?.army) || 0));
    if (army >= population) return;
    const consumed = engineRef.current?.consumeResource?.(resourceId, cost) ?? 0;
    if (consumed >= cost) engineRef.current?.addArmy?.(Math.min(armyGain, population - army), RESOURCE_DEFS[resourceId]?.name ?? resourceId);
  };

  const trainArmyUnit = (recipe) => {
    if (!recipe?.unitId || !cityArmyCanTrainUnit(progress, cityStats, recipe.unitId, recipe.count ?? 1)) return;
    const entries = Object.entries(recipe.cost ?? {});
    if (!payBuildingEntries(entries)) return;
    onChangeProgress((current) => addCityArmyUnit(current, recipe.unitId, recipe.count ?? 1));
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
    )) || (snapshotRef?.current?.inventory ?? []).length < MAX_INVENTORY;
    if (!canFit) {
      engineRef.current?.addToast?.("Rygsaekken er fuld");
      return;
    }
    if (!payBuildingEntries(inputs)) return;
    if (!engineRef.current?.addInventoryItem?.(output)) return;
    engineRef.current?.addToast?.(`Merged: ${output.name}`);
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
    const gold = merchantSellPrice(sold, snapshot.player?.popularity ?? 0) * qty;
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
    const price = merchantBuyPrice(item, snapshot.player?.popularity ?? 0) * qty;
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

  return (
    <div className="city-popup-backdrop">
      <section className="city-popup" role="dialog" aria-modal="true" aria-label={building.title}>
        <header className="city-popup-header">
          <div>
            <h3>{building.title}</h3>
            <span>{owned ? `${prebuilt ? "Prebuilt | " : ""}Lvl ${buildingState.level}` : "Not owned"}</span>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>

        <div className="city-popup-summary">
          <div className="city-building-thumb">
            {building.imageUrl && <img src={building.imageUrl} alt="" draggable="false" />}
          </div>
          <div>
            <p>{building.help}</p>
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
          </div>
        </div>

        <div className="city-popup-actions">
          <button type="button" onClick={() => setBuildPaymentOpen(true)} disabled={owned || !statRequirementsMet}>
            Buy
          </button>
          <button type="button" onClick={upgradeBuilding} disabled={!owned || !nextBuildingLevel || !canUpgradeBuilding}>
            Upgrade
          </button>
            <button type="button" onClick={() => repairBuilding()} disabled={(buildingState.durability ?? 100) >= 100}>Repair</button>
        </div>

        <main className="city-popup-main">
          <p>{building.functionText}</p>
          {building.addons?.length > 0 && (
            <div className="city-addon-list">
              {owned && building.id === "blacksmith" && (
                <button
                  type="button"
                  className={`city-addon ${activeAddonId ? "" : "active"}`}
                  onClick={() => setActiveAddonId(null)}
                  title="Repair equipped gear"
                >
                  {building.imageUrl && <img src={building.imageUrl} alt="" draggable="false" />}
                  <span>Repair</span>
                  <b>Base</b>
                </button>
              )}
              {owned && normalizeInventoryType(building.inventoryType).slots > 0 && (
                <button
                  type="button"
                  className={`city-addon ${activeAddonId ? "" : "active"}`}
                  onClick={() => setActiveAddonId(null)}
                  title={`${building.title} storage`}
                >
                  {building.imageUrl && <img src={building.imageUrl} alt="" draggable="false" />}
                  <span>{building.title}</span>
                  <b>{cityInventorySlotCount(building.inventoryType)} slots</b>
                </button>
              )}
              {building.addons.map((addon) => {
                const bought = purchasedAddons.has(addon.id);
                const prebuiltAddon = Boolean(addon.prebuilt);
                const unlocked = cityAddonIsUnlocked(addon, snapshot);
                  const affordable = (snapshot?.player?.gold ?? 0) >= (addon.cost?.gold ?? 0);
                  const iconSprite = cityImageForAddon(houseImages, building, addon);
                  const addonIconUrl = addon.imageUrl ?? building.imageUrl;
                  return (
                    <button
                      type="button"
                      className={`city-addon ${bought ? "bought" : ""} ${activeAddonId === addon.id ? "active" : ""} ${!unlocked ? "locked" : ""}`}
                      key={addon.id}
                      disabled={!owned || (!bought && (!affordable || !unlocked))}
                      title={!unlocked ? cityAddonLockText(addon, snapshot) : addon.help}
                      onClick={() => {
                        if (bought) {
                          setActiveAddonId((current) => current === addon.id ? null : addon.id);
                          return;
                        }
                        buyAddon(addon);
                      }}
                    >
                    {addonIconUrl && <img src={addonIconUrl} alt="" draggable="false" />}
                    <span>{addon.title}</span>
                    <b>{bought ? (prebuiltAddon ? "Prebuilt" : "Built") : !unlocked ? "Locked" : `${addon.cost?.gold ?? 0} G`}</b>
                  </button>
                );
              })}
            </div>
          )}
          {owned && activeStorageSection && (
            <CityStoragePanel
              building={building}
              buildingState={buildingState}
              owned={owned}
              inventory={snapshot.inventory}
              activeSectionKey={activeStorageSection.key}
              draggedCityItem={draggedCityItem}
              onDragCityItem={setDraggedCityItem}
              onDepositInventoryItem={depositInventoryItem}
              onWithdrawStoredItem={withdrawStoredItem}
              onMoveStoredItem={moveStoredItem}
              onReadStoredItem={(item) => setStoredReadable(readableDialogFromItem(item))}
              onTransferAllResources={transferAllResources}
            />
          )}
          {building.id === "mage_tower" && owned && activeAddonId === "arcane_extractor" && purchasedAddons.has("arcane_extractor") && (
            <CityArcaneExtractorPanel
              inventory={snapshot.inventory}
              onExtract={(index) => engineRef.current?.extractArcaneEssence?.(index)}
            />
          )}
          {owned && (building.id === "library" || (building.id === "mage_tower" && activeAddonId === "arcane_archive" && purchasedAddons.has("arcane_archive"))) && (
            <CityReadableMergePanel
              inventory={snapshot.inventory}
              kind={building.id === "library" ? "lorenote" : "spellbook"}
              onMerge={(index) => engineRef.current?.mergeInventoryItem?.(index)}
            />
          )}
          {building.id === "blacksmith" && owned && activeAddonId === "minting_furnace" && purchasedAddons.has("minting_furnace") && (
            <CityGoldBarPanel
              gold={snapshot.player?.gold ?? 0}
              inventory={snapshot.inventory}
              popularity={snapshot.player?.popularity ?? 0}
              resourceCount={buildingResourceAvailable}
              onSmelt={() => engineRef.current?.smeltGoldToBar?.(1)}
              onSmeltIron={() => onConvertResourceToResource?.("iron_piece", 3, "iron_bar", 1)}
            />
          )}
          {building.id === "farm" && owned && (
            <CityFarmPanel
              inventory={snapshot.inventory}
              popularity={snapshot.player?.popularity ?? 0}
              resourceCount={buildingResourceAvailable}
              onProduceFoodBarrel={produceFoodBarrel}
              onProduceProvision={addFarmProvision}
            />
          )}
          {building.id === "town_hall" && owned && (
            <section className="blacksmith-station">
              <header>
                <h4>Army Muster disabled</h4>
                <span>Army is now trained as units in the Barracks.</span>
              </header>
            </section>
          )}
          {building.id === "barracks" && owned && activeAddon && (
            <CityBarracksTrainingPanel
              addon={activeAddon}
              progress={progress}
              cityStats={cityStats}
              snapshot={snapshot}
              onTrain={trainArmyUnit}
            />
          )}
          {building.id === "research_lab" && owned && !activeAddonId && (
            <CityResearchPanel
              buildingState={buildingState}
              snapshot={snapshot}
              resourceCount={buildingResourceAvailable}
              onBuyRecipe={(recipeKey) => buyResearchRecipe(recipeKey)}
              onMerge={(recipe) => mergeResearchRecipe(recipe)}
            />
          )}
          {building.id === "research_lab" && owned && activeAddonId === "socket_workbench" && purchasedAddons.has("socket_workbench") && (
            <CitySocketPanel
              inventory={snapshot.inventory}
              gold={snapshot.player?.gold ?? 0}
              onAddSocket={(index) => engineRef.current?.addSocketToInventoryItem?.(index)}
              onSocketGem={(itemIndex, gemIndex) => engineRef.current?.socketGemIntoInventoryItem?.(itemIndex, gemIndex)}
            />
          )}
          {building.id === "merchant" && owned && (
            <CityMerchantPanel
              inventory={snapshot.inventory}
              stock={buildingState.merchant?.stock ?? []}
              gold={snapshot.player?.gold ?? 0}
              popularity={snapshot.player?.popularity ?? 0}
              onSell={sellMerchantItem}
              onBuy={buyMerchantItem}
            />
          )}
          {building.id === "sanctuary" && owned && (
            <CitySkillTreePanel
              player={snapshot.player}
              onBuyRank={(nodeId) => engineRef.current?.buySkillTreeRank?.(nodeId)}
            />
          )}
          {building.id === "blacksmith" && owned && (
            <CityBlacksmithPanel
              engineRef={engineRef}
              snapshot={snapshot}
              snapshotRef={snapshotRef}
              activeAddonId={activeAddonId}
              purchasedAddons={purchasedAddons}
              resourceCount={buildingResourceAvailable}
              onRepairEquippedItem={repairEquippedItem}
              onRepairInventoryItem={repairInventoryItem}
            />
          )}
        </main>
      </section>
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

function cityAddonIsUnlocked(addon, snapshot) {
  if (addon?.prebuilt) return true;
  const required = addon?.unlock?.completedQuests ?? [];
  if (!required.length) return true;
  const completed = new Set((snapshot?.quests?.completed ?? []).map(String));
  return required.every((questId) => completed.has(String(questId)));
}

function cityAddonLockText(addon, snapshot) {
  if (cityAddonIsUnlocked(addon, snapshot)) return "";
  if (addon?.unlock?.text) return addon.unlock.text;
  const required = addon?.unlock?.completedQuests ?? [];
  const completed = new Set((snapshot?.quests?.completed ?? []).map(String));
  const missing = required.filter((questId) => !completed.has(String(questId)));
  if (!missing.length) return "Locked";
  return `Requires ${missing.map((questId) => QUEST_DEFS[questId]?.title ?? questId).join(", ")}`;
}

function normalizeInventoryType(value) {
  if (!value || value === "none") return { type: "none", slots: 0 };
  if (typeof value === "number") return { type: "all", slots: Math.max(0, Math.floor(value)) };
  if (typeof value === "string") return { type: value, slots: 0 };
  return {
    type: String(value.type ?? value.accepts ?? "none"),
    slots: Math.max(0, Math.floor(Number(value.slots ?? value.size ?? 0) || 0)),
  };
}

function cityInventorySectionKey(source) {
  return source?.id ? `addon:${source.id}` : "base";
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
    });
  }
  const bought = new Set(state.addons ?? []);
  for (const addon of building.addons ?? []) {
    if (!bought.has(addon.id)) continue;
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
    });
  }
  return sections;
}

function normalizeCityInventories(state, building) {
  const source = state?.inventories && typeof state.inventories === "object" ? state.inventories : {};
  const next = { ...source };
  if (!next.base && Array.isArray(state?.items)) next.base = state.items;
  for (const section of cityInventorySections(building, state, true)) {
    next[section.key] = Array.from({ length: section.slots }, (_, index) => next[section.key]?.[index] ?? null);
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

function cityInventoryStackMax(item) {
  if (!isResourceItem(item)) return 1;
  return Math.max(1, Math.floor(Number(item.stackMax ?? resourceStackMax(item.resourceId)) || 1));
}

function cityInventoryItemsCanStack(incoming, target) {
  if (!isResourceItem(incoming) || !isResourceItem(target)) return false;
  if (String(incoming.resourceId ?? "") !== String(target.resourceId ?? "")) return false;
  return Math.max(1, Math.floor(Number(target.count) || 1)) < cityInventoryStackMax(target);
}

function planCityInventoryDeposit(item, section, slotIndex, storedItems = []) {
  if (!item || !section) return null;
  const target = storedItems[slotIndex] ?? null;
  if (!isResourceItem(item)) {
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
      items[step.slotIndex] = { ...item, count: moved };
    }
    remaining -= moved;
  }
}

function itemMatchesCityInventoryType(item, type) {
  if (!item || !type || type === "none") return false;
  if (type === "all") return true;
  if (type === "gemstone") return item.mode === "resource" && (RESOURCE_DEFS[item.resourceId]?.sheet === "gemstones" || String(item.resourceId ?? "").includes("gemstone") || item.resourceId === "diamond");
  if (type === "potion") return isPotionItem(item);
  if (type === "resource") return isResourceItem(item);
  if (type === "weapon") return item.slot === "weapon";
  if (type === "armor") return item.mode === "armor";
  if (type === "quest") return isQuestItem(item);
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
  const activeEntries = [
    ["famine", "Famine"],
    ["water_shortage", "Water shortage"],
    ["disease_outbreak", "Disease outbreak"],
    ["uprising_poorness", "Uprising risk"],
    ["fire", "Fire risk"],
  ].filter(([id]) => events[id]?.active || Number(events[id]?.risk) > 0);
  return (
    <div className="city-stat-effects">
      <b>City events</b>
      <div>
        {activeEntries.length ? activeEntries.map(([id, label]) => (
          <span title={label} key={id}><b>{label}</b></span>
        )) : <span><b>Stable</b></span>}
      </div>
      <p>Events are derived from current city stats and can be used by later combat, loot, and quest logic.</p>
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
  const def = RESOURCE_DEFS[resourceId];
  if (!def) return <i className="city-cost-missing-icon" aria-hidden="true" />;
  const iconUrl = iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId }));
  return (
    <InventoryIcon
      iconIndex={def.iconIndex}
      iconSheet={def.sheet ?? "resources"}
      iconUrl={def.iconUrl ?? iconUrl}
    />
  );
}

function CityStorageOverviewModal({
  inventory,
  storageEntries,
  draggedCityItem,
  onDragCityItem,
  onDepositInventoryItem,
  onWithdrawStoredItem,
  onMoveStoredItem,
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
            <h4>Back pack <span>{backpackSlots.filter(({ item }) => item).length} / {MAX_INVENTORY}</span></h4>
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
                const target = firstTargetForItem(item);
                return (
                  <CityItemSlot
                    key={`overview-inv-${index}`}
                    item={item}
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
                <h4>
                  {entry.section.label}
                  <span>{entry.building.title} | {entry.section.typeLabel} | {entry.items.filter(Boolean).length}/{entry.section.slots}</span>
                </h4>
                <div className="city-storage-overview-grid">
                  {Array.from({ length: entry.section.slots }, (_, slotIndex) => {
                    const item = entry.items[slotIndex] ?? null;
                    return (
                      <CityItemSlot
                        key={`${entry.buildingId}-${entry.section.key}-${slotIndex}`}
                        item={item}
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
  activeSectionKey,
  draggedCityItem,
  onDragCityItem,
  onDepositInventoryItem,
  onWithdrawStoredItem,
  onMoveStoredItem,
  onReadStoredItem,
  onTransferAllResources,
}) {
  const sections = cityInventorySections(building, buildingState, owned);
  const activeSection = sections.find((section) => section.key === activeSectionKey) ?? sections[0];
  const inventories = normalizeCityInventories(buildingState, building);
  const storedItems = inventories[activeSection?.key] ?? [];
  const inventorySlots = Array.from({ length: MAX_INVENTORY }, (_, index) => ({ item: inventory[index] ?? null, index }))
    .filter(({ item }) => (
      !activeSection?.fixedDefs?.length
      || (Boolean(item) && itemCanEnterAnyCityInventorySlot(item, activeSection, storedItems))
    ));

  if (!activeSection) return null;

  return (
    <section className="city-bank-panel">
      <div className="city-bank-column">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h4>Backpack</h4>
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
            const canEnter = itemCanEnterAnyCityInventorySlot(item, activeSection, storedItems);
            return (
            <CityItemSlot
              key={`inv-${index}`}
              item={item}
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
        <h4>{activeSection.label} <span>{activeSection.typeLabel}</span></h4>
        <div className="city-bank-grid">
          {Array.from({ length: activeSection.slots }, (_, index) => {
            const locked = !owned;
            return (
              <CityItemSlot
                key={`${activeSection.key}-${index}`}
                item={storedItems[index]}
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
