import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY, RARITIES, TILE_H, TILE_W } from "../game/data.js";
import { drawGroundTile, drawShadow } from "../game/assets-ground.js";
import { GameEngine } from "../game/GameEngine.js";
import { makeItem, itemValue } from "../game/world.js";
import { worldEntryAllowed } from "../game/world-state.js";
import { makeResourceItem } from "../game/GameEngine/helpers.js";
import { ATLAS_FRAMES } from "../game/assets.js";
import { screenToWorld, worldToIso, worldToScreen } from "../game/iso.js";
import { RESOURCE_DEFS, RESOURCE_MERGE_RECIPES } from "../game/config/resource-config.js";
import { READABLE_DEF_BY_ID, READABLE_ITEM_DEFS } from "../game/config/readable-config.js";
import { CITY_AREAS, CITY_AREA_LABEL_OPTIONS, CITY_MAP_IMAGE, CITY_NPC_AREA, CITY_NPC_POINTS } from "../game/config/city-areas-config.js";
import { CITY_BUILDINGS } from "../game/config/city-buildings-config.js";
import { DURABILITY_DEFAULT, DURABILITY_DEGRADE_CHANCE, DURABILITY_DEGRADE_MIN_PCT, DURABILITY_DEGRADE_MAX_PCT } from "../game/config/durability-config.js";
import { CITY_STATS_RULES } from "../game/config/city-stats-rules-config.js";
import {
  isArmoryPointId,
  normalizeArmoryPoints,
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
import {
  buildCityMobBattleRegion,
  cityMobBattleProfilesForArea,
} from "../game/config/city-mobs-battle-config.js";
import { QUEST_DEFS, QUEST_ITEM_DEFS } from "../game/config/quest-config.js";
import { QUEST_NPCS } from "../game/config/npc-config.js";
import { SAVE_STORAGE_KEY, SAVE_VERSION, SHOW_INACTIVE_CITY_NPCS } from "../game/config/game-engine-config.js";
import { CITY_ARMY_BATTLE_CONFIG } from "../game/config/city-army-battle-config.js";
import {
  CITY_ARMY_UNIT_DEFS,
  armyTotalPower,
  armyUnitCount,
  normalizeArmyUnits,
} from "../game/config/city-army-unit-config.js";
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

const cityPrebuildCache = {
  layout: null,
};

const MAX_CITY_MOB_GROUPS_PER_SPAWN_AREA = 3;

import {
  CITY_CITIZEN_CONDITION_DEFS,
  CITY_STAT_ALIASES,
  CITY_STAT_DEFS,
  CITY_STAT_ICON_URLS,
} from "./hud/resource-bar.jsx";
import {
  ImageIcon,
  InventoryIcon,
  ITEM_GOLD_ICON_URL,
  ITEM_MONEY_ICON_URL,
} from "./ui/icons.jsx";
import { CITY_STORAGE_KEY, regionStatusKey } from "./save/save-keys.js";
import { QuestObjectiveMeta } from "./quests/quest-dialogs.jsx";
import { ReadableDialog } from "./inventory/readable-dialog.jsx";
import { mapRegionColor } from "./map/map-dialogs.jsx";
import { emptySnapshot } from "./app-snapshot.js";
import { saveRepository } from "../storage/saveRepository.js";


const cityAssetCache = {
  promise: null,
  assets: null,
};

const cityAreaGeometryCache = new Map();

function getCityLayout() {
  if (!cityPrebuildCache.layout) cityPrebuildCache.layout = buildCityLayout();
  return cityPrebuildCache.layout;
}

function buildCityLayout() {
  const mapWidth = 17;
  const mapHeight = 17;
  const rows = Array.from({ length: mapHeight }, () => Array.from({ length: mapWidth }, () => "g"));

  const roadRows = [3, 8, 13];
  const roadCols = [3, 8, 13];
  for (const y of roadRows) {
    for (let x = 1; x < mapWidth - 1; x += 1) rows[y][x] = "r";
  }
  for (const x of roadCols) {
    for (let y = 1; y < mapHeight - 1; y += 1) rows[y][x] = "r";
  }

  const houses = [];
  const housePositions = [
    { gx: 2.35, gy: 2.35 },
    { gx: 7.1, gy: 2.35 },
    { gx: 11.85, gy: 2.35 },
    { gx: 7.1, gy: 6.75 },
    { gx: 2.35, gy: 6.75 },
    { gx: 11.85, gy: 6.75 },
    { gx: 2.35, gy: 11.15 },
    { gx: 7.1, gy: 11.15 },
    { gx: 11.85, gy: 11.15 },
    { gx: 14.65, gy: 8.15 },
    { gx: 14.65, gy: 12.75 },
  ];
  const houseBuildingIds = [
    "town_hall",
    "barracks",
    "armory",
    "blacksmith",
    "research_lab",
    "bank",
    "merchant",
    "library",
    "inn",
    "mage_tower",
    "sanctuary",
  ];
  for (let i = 0; i < housePositions.length; i += 1) {
    houses.push({ ...housePositions[i], spriteIndex: i, buildingId: houseBuildingIds[i] ?? null });
  }

  return {
    mapWidth,
    mapHeight,
    rows,
    houses,
    spawn: { gx: 8.5, gy: 8.5 },
  };
}

function buildCityTerrainLayer(layout, atlas) {
  const padTop = 56;
  const padBottom = 88;
  const originX = (layout.mapWidth * TILE_W) / 2 + TILE_W / 2;
  const originY = padTop;
  const width = layout.mapWidth * TILE_W + TILE_W;
  const height = layout.mapHeight * TILE_H + TILE_H + padTop + padBottom;
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const ctx = layer.getContext("2d");

  for (let gy = 0; gy < layout.mapHeight; gy += 1) {
    for (let gx = 0; gx < layout.mapWidth; gx += 1) {
      const tile = {
        x: originX + (gx - gy) * (TILE_W / 2),
        y: originY + (gx + gy) * (TILE_H / 2),
      };
      const type = layout.rows[gy][gx];
      drawIsoTile(ctx, atlas, gx, gy, tile.x, tile.y, type);
    }
  }

  return { canvas: layer, originX, originY, width, height };
}

function drawIsoTile(ctx, atlas, gx, gy, x, y, type) {
  const variant = Math.abs((gx * 13 + gy * 17) % 16);
  drawGroundTile(ctx, atlas, "desert", variant, x, y, {
    baseColor: "#876241",
    baseAlpha: type === "r" ? 0.22 : 0.12,
    path: type === "r",
    pathColor: "rgba(82, 54, 31, 0.35)",
  });
}

function cityAreaLayerUrls(area, progress) {
  const state = getCityAreaState(progress, area);
  return [
    area?.builtLayer,
    ...(Array.isArray(area?.builtLayers) ? area.builtLayers : []),
    ...cityReachedLevels(area, state.level).flatMap((level) => [
      level?.builtLayer,
      ...(Array.isArray(level?.builtLayers) ? level.builtLayers : []),
    ]),
  ].filter(Boolean);
}

function normalizeCityMobs(cityMobs = []) {
  if (!Array.isArray(cityMobs)) return [];
  const normalized = cityMobs
    .filter((mob) => mob && mob.areaId)
    .map((mob) => {
      const area = CITY_AREAS.find((entry) => entry.id === mob.areaId);
      const center = cityAreaCenter(area);
      const poolEntry = CITY_MOB_POOL.find((entry) => entry.type === mob.mobType);
      return {
        id: String(mob.id || `${mob.areaId}-${mob.mobType}-${Math.round((mob.x ?? center.x) * 10)}-${Math.round((mob.y ?? center.y) * 10)}`),
        areaId: String(mob.areaId),
        mobType: String(mob.mobType || "Skeleton"),
        level: Math.max(1, Math.min(CITY_MOB_MAX_LEVEL, Math.floor(Number(mob.level) || 1))),
        count: Math.max(1, Math.floor(Number(mob.count) || 1)),
        x: Number.isFinite(mob.x) ? mob.x : center.x,
        y: Number.isFinite(mob.y) ? mob.y : center.y,
        iconUrl: mob.iconUrl || poolEntry?.miniIcon || "",
      };
    });
  const capped = [];
  const byArea = new Map();
  for (const mob of normalized) {
    const list = byArea.get(mob.areaId) ?? [];
    list.push(mob);
    byArea.set(mob.areaId, list);
  }
  for (const mobs of byArea.values()) {
    const kept = mobs
      .map((mob, index) => ({ mob, index }))
      .sort((a, b) => (
        b.mob.level - a.mob.level
        || b.mob.count - a.mob.count
        || a.index - b.index
      ))
      .slice(0, MAX_CITY_MOB_GROUPS_PER_SPAWN_AREA)
      .sort((a, b) => a.index - b.index)
      .map((entry) => entry.mob);
    capped.push(...kept);
  }
  const areaTotals = new Map();
  for (const mob of capped) {
    areaTotals.set(mob.areaId, (areaTotals.get(mob.areaId) ?? 0) + 1);
  }
  const areaIndexes = new Map();
  return capped.map((mob) => {
    const index = areaIndexes.get(mob.areaId) ?? 0;
    areaIndexes.set(mob.areaId, index + 1);
    const count = areaTotals.get(mob.areaId) ?? 1;
    const area = CITY_AREAS.find((entry) => entry.id === mob.areaId);
    const position = cityAreaIconFallbackPosition(area, index, count);
    return { ...mob, x: position.x, y: position.y };
  });
}

function cityMapMobRefs(cityMobs = []) {
  return normalizeCityMobs(cityMobs);
}

function cityAttackableMobIds(cityMobs = []) {
  const groupsByArea = new Map();
  for (const mob of normalizeCityMobs(cityMobs)) {
    groupsByArea.set(mob.areaId, [...(groupsByArea.get(mob.areaId) ?? []), mob]);
  }
  const attackableAreaIds = new Set();
  for (const path of CITY_SPAWN_PATHS) {
    for (let i = path.length - 1; i >= 0; i -= 1) {
      const areaId = path[i];
      if ((groupsByArea.get(areaId) ?? []).length > 0) {
        attackableAreaIds.add(areaId);
        break;
      }
    }
  }
  const result = new Set();
  for (const [areaId, mobs] of groupsByArea.entries()) {
    if (!attackableAreaIds.has(areaId)) continue;
    for (const mob of mobs) result.add(mob.id);
  }
  return result;
}

function pickCityBattleRegion(mobType, mapSize = "small", areaId = null) {
  const cityProfiles = areaId ? cityMobBattleProfilesForArea(areaId) : [];
  if (cityProfiles.length > 0) {
    const profile = cityProfiles[Math.floor(Math.random() * cityProfiles.length)];
    const region = buildCityMobBattleRegion(profile, { areaId, mobType, mapSize });
    if (region) return { areaMapId: `citymob:${areaId}`, region };
  }

  const all = Object.entries(MAP_REGION_SETS)
    .filter(([areaMapId]) => areaMapId !== WORLD_MAP.id)
    .flatMap(([areaMapId, regions]) => (regions ?? []).map((region) => ({ areaMapId, region })));

  const bySize = all.filter(({ region }) => String(region.mapSize ?? "medium") === String(mapSize));
  const byMob = bySize.filter(({ region }) => regionHasMobType(region, mobType));
  const fallbackByMob = all.filter(({ region }) => regionHasMobType(region, mobType));
  const pool = byMob.length > 0 ? byMob : bySize.length > 0 ? bySize : fallbackByMob;
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function regionHasMobType(region, mobType) {
  const wanted = String(mobType || "").toLowerCase();
  if (!wanted) return false;
  const entries = Array.isArray(region?.mobs) ? region.mobs : [];
  return entries.some((entry) => {
    if (typeof entry === "string") return entry.toLowerCase() === wanted;
    if (entry && typeof entry === "object") return String(entry.type || "").toLowerCase() === wanted;
    return false;
  });
}

function applyCityMobProgressForVisit(progress = {}) {
  let next = {
    ...progress,
    threatLevel: Math.max(0, Math.min(100, Number(progress.threatLevel) || 0)),
    cityMobs: normalizeCityMobs(progress.cityMobs),
  };

  next = applyCityMobLevelAndSpread(next);
  next = applyCityMobNewSpawns(next);
  next = applyCityMobBuildingDamage(next);
  return next;
}

function applyCityMobLevelAndSpread(progress = {}) {
  const currentMobs = normalizeCityMobs(progress.cityMobs);
  const nextMobs = [...currentMobs];
  const areaCounts = cityMobAreaCounts(currentMobs);

  for (const mob of currentMobs) {
    if (Math.random() < CITY_MOB_LEVEL_UP_CHANCE) {
      mob.level = Math.min(CITY_MOB_MAX_LEVEL, mob.level + 1);
      mob.count = cityMobCountForLevel(mob.level);
    }
    const levelDef = CITY_MOB_LEVELS[mob.level] ?? CITY_MOB_LEVELS[1];
    if (mob.level < 3 || Math.random() >= (levelDef.spreadChance ?? 0)) continue;

    const spreadTargets = CITY_SPAWN_SPREAD_TARGETS[mob.areaId] ?? [];
    const candidates = spreadTargets.filter((areaId) => (
      cityMobAreaHasRoom(areaCounts, areaId)
      && citySpawnAreaEligible(progress, currentMobs, areaId)
    ));
    if (!candidates.length) continue;
    const targetAreaId = candidates[Math.floor(Math.random() * candidates.length)];
    const spawn = createCityMobGroup(targetAreaId, mob.mobType, 1);
    nextMobs.push(spawn);
    areaCounts.set(targetAreaId, (areaCounts.get(targetAreaId) ?? 0) + 1);
  }

  return { ...progress, cityMobs: nextMobs };
}

function applyCityMobNewSpawns(progress = {}) {
  const spawnChance = calcCitySpawnChance(Number(progress.threatLevel) || 0);
  if (spawnChance <= 0) return progress;
  const currentMobs = normalizeCityMobs(progress.cityMobs);
  const nextMobs = [...currentMobs];

  const spawnAreas = citySpawnCandidatesForNewSpawn(progress, currentMobs);

  for (const areaId of spawnAreas) {
    if (Math.random() >= spawnChance) continue;
    const mobType = pickCityMobType();
    const spawn = createCityMobGroup(areaId, mobType, 1);
    nextMobs.push(spawn);
  }
  return { ...progress, cityMobs: nextMobs };
}

function applyCityMobBuildingDamage(progress = {}) {
  const mobs = normalizeCityMobs(progress.cityMobs);
  if (!mobs.length) return progress;
  let next = progress;
  for (const mob of mobs) {
    const targetAreaId = CITY_SPAWN_AREA_BUILDING_TARGETS[mob.areaId];
    if (!targetAreaId) continue;
    const targetArea = CITY_AREAS.find((entry) => entry.id === targetAreaId);
    if (!targetArea) continue;
    const state = getCityAreaState(next, targetArea);
    if (!state.unlocked) continue;
    const currentDurability = Math.max(0, Math.min(100, Number(state.durability) || 100));
    const damage = CITY_MOB_DAMAGE_PER_LEVEL_PCT * mob.level * Math.max(1, mob.count);
    const nextDurability = Math.max(0, parseFloat((currentDurability - damage).toFixed(2)));
    if (nextDurability === currentDurability) continue;
    next = {
      ...next,
      areas: {
        ...(next.areas ?? {}),
        [targetAreaId]: {
          ...(next.areas?.[targetAreaId] ?? {}),
          unlocked: true,
          level: Math.max(1, Number(next.areas?.[targetAreaId]?.level) || 1),
          durability: nextDurability,
        },
      },
    };
  }
  return next;
}

function citySpawnCandidatesForNewSpawn(progress = {}, cityMobs = []) {
  const spawnAreaIds = new Set(CITY_AREAS.filter((area) => area.category === "spawn").map((area) => area.id));
  const areaCounts = cityMobAreaCounts(cityMobs);
  const occupiedAreas = new Set([...areaCounts.entries()].filter(([, count]) => count > 0).map(([areaId]) => areaId));
  const candidates = new Set();
  for (const path of CITY_SPAWN_PATHS) {
    for (let index = 0; index < path.length; index += 1) {
      const areaId = path[index];
      if (!spawnAreaIds.has(areaId)) continue;
      if (!cityMobAreaHasRoom(areaCounts, areaId)) continue;
      const previousAreaIds = path.slice(0, index);
      if (previousAreaIds.some((previousAreaId) => !occupiedAreas.has(previousAreaId))) continue;
      if (!citySpawnAreaEligible(progress, cityMobs, areaId)) continue;
      candidates.add(areaId);
    }
  }
  return [...candidates];
}

function cityMobAreaCounts(cityMobs = []) {
  const counts = new Map();
  for (const mob of normalizeCityMobs(cityMobs)) {
    counts.set(mob.areaId, (counts.get(mob.areaId) ?? 0) + 1);
  }
  return counts;
}

function cityMobAreaHasRoom(areaCounts, areaId) {
  return (areaCounts.get(areaId) ?? 0) < MAX_CITY_MOB_GROUPS_PER_SPAWN_AREA;
}

function citySpawnAreaEligible(progress = {}, cityMobs = [], areaId) {
  const rules = CITY_SPAWN_AREA_RULES[areaId] ?? {};
  if (rules.alwaysAllowed) return true;

  if (rules.requiresNoDefenceTower) {
    const towerId = {
      NW: "defence_tower_nw",
      SW: "defence_tower_sw",
      NE: "defence_tower_ne",
      SE: "defence_tower_se",
    }[rules.requiresNoDefenceTower];
    if (isCityAreaUnlockedById(progress, towerId)) return false;
  }

  if (rules.requiresNoCityWall) {
    if (isCityAreaUnlockedById(progress, "city_wall")) return false;
  }

  const occupiedAreas = new Set(normalizeCityMobs(cityMobs).map((mob) => mob.areaId));
  if (Array.isArray(rules.requiresMobsIn) && rules.requiresMobsIn.some((id) => !occupiedAreas.has(id))) return false;
  if (Array.isArray(rules.requiresMobsAnyIn) && !rules.requiresMobsAnyIn.some((id) => occupiedAreas.has(id))) return false;
  return true;
}

function isCityAreaUnlockedById(progress = {}, areaId) {
  if (!areaId) return false;
  const area = CITY_AREAS.find((entry) => entry.id === areaId);
  if (!area) return false;
  return getCityAreaState(progress, area).unlocked;
}

function createCityMobGroup(areaId, mobType, level = 1) {
  const area = CITY_AREAS.find((entry) => entry.id === areaId);
  const center = cityAreaCenter(area);
  const iconUrl = CITY_MOB_POOL.find((entry) => entry.type === mobType)?.miniIcon || "";
  return {
    id: `citymob-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    areaId,
    mobType,
    level: Math.max(1, Math.min(CITY_MOB_MAX_LEVEL, Math.floor(Number(level) || 1))),
    count: cityMobCountForLevel(level),
    x: center.x,
    y: center.y,
    iconUrl,
  };
}

function cityMobCountForLevel(level = 1) {
  if (level <= 1) return 1;
  if (level === 2) return 2;
  if (level === 3) return 2;
  if (level === 4) return 3;
  return 4;
}

function cityBuildingLayerUrls(progress) {
  return CITY_BUILDINGS.flatMap((building) => {
    const state = getCityBuildingState(progress, building);
    if ((state.level ?? 0) <= 0) return [];
    return cityReachedLevels(building, state.level).flatMap((level) => [
      level?.builtLayer,
      ...(Array.isArray(level?.builtLayers) ? level.builtLayers : []),
    ]);
  }).filter(Boolean);
}

function cityAreaPreviewLayerUrls(area) {
  return [
    area?.builtLayer,
    ...(Array.isArray(area?.builtLayers) ? area.builtLayers : []),
    ...cityReachedLevels(area, 1).flatMap((level) => [
      level?.builtLayer,
      ...(Array.isArray(level?.builtLayers) ? level.builtLayers : []),
    ]),
  ].filter(Boolean);
}

function getCityAreaState(progress, area) {
  if (!area?.id) return { unlocked: false, level: 0, durability: DURABILITY_DEFAULT };
  if (area.prebuilt) {
    const saved = progress?.areas?.[area.id];
    const savedLevel = typeof saved === "object" ? saved.level : 0;
    return {
      ...(typeof saved === "object" ? saved : {}),
      unlocked: true,
      level: Math.max(1, savedLevel ?? 0),
      durability: saved?.durability ?? DURABILITY_DEFAULT,
    };
  }
  const saved = progress?.areas?.[area.id];
  if (saved === true) return { unlocked: true, level: 1, durability: DURABILITY_DEFAULT };
  if (!saved || typeof saved !== "object") return { unlocked: false, level: 0, durability: DURABILITY_DEFAULT };
  return {
    ...saved,
    unlocked: Boolean(saved.unlocked),
    level: saved.unlocked ? Math.max(1, saved.level ?? 1) : 0,
    durability: saved.durability ?? DURABILITY_DEFAULT,
  };
}

function isCityAreaUnlocked(progress, area) {
  if (!area || area.interactive === false) return false;
  return getCityAreaState(progress, area).unlocked;
}

function getCityBuildingState(progress, building) {
  if (!building?.id) return { level: 0, paid: {}, durability: DURABILITY_DEFAULT, addons: [] };
  const saved = progress?.[building.id] ?? {};
  const prebuiltAddons = (building.addons ?? [])
    .filter((addon) => addon.prebuilt)
    .map((addon) => addon.id);
  const savedAddons = Array.isArray(saved.addons) ? saved.addons : [];
  return {
    ...saved,
    level: building.prebuilt ? Math.max(1, saved.level ?? 0) : (saved.level ?? 0),
    paid: saved.paid ?? {},
    durability: saved.durability ?? DURABILITY_DEFAULT,
    addons: [...new Set([...prebuiltAddons, ...savedAddons])],
  };
}

function cityAreaPathD(area) {
  const rings = Array.isArray(area?.rings) ? area.rings : [area?.points];
  return rings
    .map((ring) => parseCityAreaPoints(ring))
    .filter((points) => points.length > 0)
    .map((points) => `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} Z`)
    .join(" ");
}

function cityAreaBuildingRefs(area) {
  const entries = area?.buildings ?? [];
  const count = entries.length;
  return entries.flatMap((entry, index) => {
    const buildingId = typeof entry === "string" ? entry : entry.id;
    const building = CITY_BUILDINGS.find((candidate) => candidate.id === buildingId);
    if (!building) return [];
    const fallback = cityAreaIconFallbackPosition(area, index, count);
    return [{
      building,
      x: Number.isFinite(entry?.x) ? entry.x : fallback.x,
      y: Number.isFinite(entry?.y) ? entry.y : fallback.y,
    }];
  });
}

function getCityMapQuestNpcs(cityNpcStates = [], showInactive = SHOW_INACTIVE_CITY_NPCS, seed = 0) {
  const stateByNpc = new Map((cityNpcStates ?? []).map((entry) => [entry.npcId, entry]));
  const candidates = Object.entries(QUEST_NPCS).flatMap(([npcId, npc]) => {
    const state = stateByNpc.get(npcId) ?? { active: [], offers: [], hasComplete: false };
    const hasOffer = (state.offers?.length ?? 0) > 0;
    const hasActive = (state.active?.length ?? 0) > 0;
    if (!showInactive && !hasOffer && !hasActive && !state.hasComplete) return [];
    return [{ npcId, npc, state, hasOffer, hasActive, hasComplete: Boolean(state.hasComplete) }];
  });
  const positions = cityNpcAreaPositions(candidates.length, seed);

  return candidates.map((entry, index) => {
    const position = positions[index] ?? cityAreaCenter(CITY_NPC_AREA);
    return {
      npcId: entry.npcId,
      name: entry.npc.name,
      title: entry.npc.title,
      imageUrl: entry.npc.imageUrl,
      x: position.x,
      y: position.y,
      hasOffer: entry.hasOffer,
      hasActive: entry.hasActive,
      hasComplete: entry.hasComplete,
    };
  });
}

function cityNpcAreaPositions(count, seed = 0) {
  if (count <= 0) return [];
  const points = cityAreaGeometry(CITY_NPC_AREA).points;
  const center = cityAreaCenter(CITY_NPC_AREA);
  const bounds = cityAreaBounds(points);
  const fixedPoints = shuffleCityPoints(CITY_NPC_POINTS, seed)
    .filter((point) => pointInPolygon(point, points));
  const candidates = [...fixedPoints];
  const step = 36;
  for (let radius = 1; candidates.length < count * 3 && radius < 12; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const point = { x: center.x + dx * step, y: center.y + dy * step };
        if (point.x < bounds.minX || point.x > bounds.maxX || point.y < bounds.minY || point.y > bounds.maxY) continue;
        if (pointInPolygon(point, points)) candidates.push(point);
      }
    }
  }
  if (!candidates.length) candidates.push({ ...center });
  return candidates.slice(0, count);
}

function shuffleCityPoints(points, seed = 0) {
  return [...points]
    .map((point, index) => ({
      point,
      sort: seededCityNoise(index + 1, seed),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => entry.point);
}

function seededCityNoise(index, seed) {
  const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function cityAreaBounds(points) {
  if (!points.length) {
    return { minX: 0, minY: 0, maxX: CITY_MAP_IMAGE.width, maxY: CITY_MAP_IMAGE.height };
  }
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxX: Math.max(bounds.maxX, point.x),
    maxY: Math.max(bounds.maxY, point.y),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects = ((pi.y > point.y) !== (pj.y > point.y))
      && (point.x < ((pj.x - pi.x) * (point.y - pi.y)) / ((pj.y - pi.y) || 1) + pi.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

function cityAreaIdForNpcLocation(cityLocation) {
  const buildingByLocation = {
    blacksmith: "blacksmith",
    farm: "farm",
    inn: "inn",
    mage_tower: "mage_tower",
    library: "library",
  };
  const buildingId = buildingByLocation[cityLocation];
  if (!buildingId) return "town_center";
  return CITY_AREAS.find((area) => (
    area.interactive !== false
    && (area.buildings ?? []).some((entry) => (typeof entry === "string" ? entry : entry.id) === buildingId)
  ))?.id ?? "town_center";
}

function cityNpcPositionForArea(area, npc, index, count, buildingRefs) {
  const buildingByLocation = {
    blacksmith: "blacksmith",
    farm: "farm",
    inn: "inn",
    mage_tower: "mage_tower",
    library: "library",
  };
  const buildingId = buildingByLocation[npc?.cityLocation];
  const buildingRef = buildingRefs.find((entry) => entry.building.id === buildingId);
  if (buildingRef) {
    const direction = index % 2 === 0 ? 1 : -1;
    return { x: buildingRef.x + direction * 26, y: buildingRef.y - 34 };
  }
  const center = cityAreaCenter(area);
  const radius = Math.max(34, Math.min(72, 30 + count * 6));
  const angle = ((Math.PI * 2) / Math.max(1, count)) * index - Math.PI / 2;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function cityAreaIconFallbackPosition(area, index, count) {
  const center = cityAreaCenter(area);
  if (count <= 1) return center;
  const radius = Math.min(30, 18 + count * 3);
  const angle = ((Math.PI * 2) / count) * index - Math.PI / 2;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function cityMapPositionStyle(x, y) {
  return {
    left: `${(x / CITY_MAP_IMAGE.width) * 100}%`,
    top: `${(y / CITY_MAP_IMAGE.height) * 100}%`,
  };
}

function cityBuildingIconText(building) {
  const shortLabels = {
    town_hall: "TH",
    blacksmith: "BS",
    research_lab: "LAB",
    mage_tower: "MT",
    sanctuary: "SAN",
    merchant: "M",
    library: "LIB",
    bank: "BANK",
    inn: "INN",
    farm: "FARM",
    field: "FIELD",
    city_wall: "WALL",
    defence_tower_nw: "T-NW",
    defence_tower_sw: "T-SW",
    defence_tower_ne: "T-NE",
    defence_tower_se: "T-SE",
  };
  if (shortLabels[building?.id]) return shortLabels[building.id];
  return String(building?.title ?? "?")
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

function cityAreaCenter(area) {
  const geometry = cityAreaGeometry(area);
  return geometry.center;
}

function cityAreaGeometry(area) {
  if (!area?.id) return { points: [], center: { x: CITY_MAP_IMAGE.width * 0.5, y: CITY_MAP_IMAGE.height * 0.5 } };
  if (cityAreaGeometryCache.has(area.id)) return cityAreaGeometryCache.get(area.id);
  const points = parseCityAreaPoints(Array.isArray(area.rings) ? area.rings[0] : area.points);
  const center = polygonCentroid(points);
  const geometry = { points, center };
  cityAreaGeometryCache.set(area.id, geometry);
  return geometry;
}

function parseCityAreaPoints(points) {
  return String(points ?? "")
    .trim()
    .split(/\s+/)
    .flatMap((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [];
    });
}

function polygonCentroid(points) {
  if (!points.length) return { x: CITY_MAP_IMAGE.width * 0.5, y: CITY_MAP_IMAGE.height * 0.5 };
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(twiceArea) < 0.001) {
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
  }
  return {
    x: cx / (3 * twiceArea),
    y: cy / (3 * twiceArea),
  };
}

function cityAreaCostEntries(area) {
  const cost = area?.unlock?.cost ?? area?.cost ?? {};
  return Object.entries(cost)
    .map(([resourceId, amount]) => [resourceId, Math.max(0, Math.floor(Number(amount) || 0))])
    .filter(([, amount]) => amount > 0);
}

function cityLevelCostEntries(levelDef) {
  return Object.entries(levelDef?.cost ?? {})
    .map(([resourceId, amount]) => [resourceId, Math.max(0, Math.floor(Number(amount) || 0))])
    .filter(([, amount]) => amount > 0);
}

function computeRepairCostEntries(baseCost = {}, percent = 100) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return Object.entries(baseCost ?? {})
    .map(([resourceId, amount]) => [resourceId, Math.max(0, Math.ceil((Number(amount) || 0) * (pct / 100)))])
    .filter(([, amount]) => amount > 0);
}

function cityAreaGateEntries(area, snapshot, cityStats = {}) {
  const unlock = area?.unlock ?? {};
  const entries = [];
  if (unlock.level) {
    const needed = Math.max(1, Math.floor(Number(unlock.level) || 1));
    entries.push({
      key: "level",
      label: `Level ${needed}`,
      met: (snapshot?.player?.level ?? 1) >= needed,
    });
  }
  const completed = new Set((snapshot?.quests?.completed ?? []).map(String));
  for (const questId of unlock.completedQuests ?? unlock.requiresQuests ?? []) {
    entries.push({
      key: `quest:${questId}`,
      label: QUEST_DEFS[questId]?.title ?? `Quest ${questId}`,
      met: completed.has(String(questId)),
    });
  }
  for (const req of unlock.items ?? []) {
    const count = Math.max(1, Math.floor(Number(req.count) || 1));
    const have = cityAreaRequiredItemCount(snapshot, req);
    entries.push({
      key: `item:${cityAreaItemRequirementLabel(req)}`,
      label: `${cityAreaItemRequirementLabel(req)} ${have}/${count}`,
      met: have >= count,
    });
  }
  entries.push(...cityStatRequirementEntries(unlock.statRequirements ?? unlock.stats, cityStats));
  return entries;
}

function cityAreaCanUnlock(area, snapshot, cityStats = {}, progress = null) {
  if (!area || area.prebuilt) return false;
  const gatesMet = cityAreaGateEntries(area, snapshot, cityStats).every((entry) => entry.met);
  if (!gatesMet) return false;
  return cityAreaCostEntries(area).every(([resourceId, amount]) => cityCostAvailable(snapshot, resourceId, progress) >= amount);
}

function payCityAreaUnlockCost(area, engine, snapshot) {
  return payCityCostEntries(cityAreaCostEntries(area), engine, snapshot);
}

function payCityCostEntries(entries, engine, snapshot, progress = null, onChangeProgress = null) {
  const paymentPlan = buildCityCostPaymentPlan(entries, snapshot, progress);
  if (!paymentPlan) return false;
  if (!engine) return paymentPlan.gold <= 0
    && Object.keys(paymentPlan.backpack).length === 0
    && Object.keys(paymentPlan.storage).length === 0
    && Object.keys(paymentPlan.armory).length === 0;
  const storageEntries = Object.entries(paymentPlan.storage);
  const armoryEntries = Object.entries(paymentPlan.armory);
  if ((storageEntries.length > 0 || armoryEntries.length > 0) && typeof onChangeProgress !== "function") return false;
  if (paymentPlan.gold > 0) {
    const paidGold = engine.consumeGold?.(paymentPlan.gold) ?? 0;
    if (paidGold < paymentPlan.gold) return false;
  }
  for (const [resourceId, amount] of Object.entries(paymentPlan.backpack)) {
    const consumed = engine.consumeResource?.(resourceId, amount) ?? 0;
    if (consumed < amount) return false;
  }
  if (storageEntries.length > 0 || armoryEntries.length > 0) {
    onChangeProgress((current) => {
      let next = current;
      for (const [resourceId, amount] of storageEntries) {
        next = consumeCityStoredResource(next, resourceId, amount).progress;
      }
      for (const [resourceId, amount] of armoryEntries) {
        next = consumeCityArmoryPoints(next, resourceId, amount).progress;
      }
      return next;
    });
    for (const [resourceId, amount] of storageEntries) {
      engine.addToast?.(`Used ${amount}x ${RESOURCE_DEFS[resourceId]?.name ?? resourceId} from city storage`);
    }
    for (const [resourceId, amount] of armoryEntries) {
      engine.addToast?.(`Used ${amount} ${cityCostLabel(resourceId)}`);
    }
  }
  return true;
}

function buildCityCostPaymentPlan(entries, snapshot, progress = null) {
  const normalizedEntries = (entries ?? [])
    .map(([resourceId, amount]) => [String(resourceId ?? ""), Math.max(0, Math.floor(Number(amount) || 0))])
    .filter(([resourceId, amount]) => resourceId && amount > 0);
  const goldAvailable = Math.max(0, Math.floor(Number(snapshot?.player?.gold) || 0));
  let remainingGold = goldAvailable;
  const backpackRemaining = new Map();
  const storageRemaining = new Map();
  const plan = { gold: 0, backpack: {}, storage: {}, armory: {} };
  for (const [resourceId, amount] of normalizedEntries) {
    if (resourceId === "gold") {
      if (remainingGold < amount) return null;
      remainingGold -= amount;
      plan.gold += amount;
      continue;
    }
    if (isArmoryPointId(resourceId)) {
      const available = cityArmoryPointCount(progress, resourceId);
      if (available < amount) return null;
      plan.armory[resourceId] = (plan.armory[resourceId] ?? 0) + amount;
      continue;
    }
    const backpackAvailable = backpackRemaining.has(resourceId)
      ? backpackRemaining.get(resourceId)
      : resourceCountFromSnapshot(snapshot, resourceId);
    const fromBackpack = Math.min(backpackAvailable, amount);
    const remainingAfterBackpack = amount - fromBackpack;
    backpackRemaining.set(resourceId, backpackAvailable - fromBackpack);
    if (fromBackpack > 0) plan.backpack[resourceId] = (plan.backpack[resourceId] ?? 0) + fromBackpack;
    if (remainingAfterBackpack <= 0) continue;
    const storageAvailable = storageRemaining.has(resourceId)
      ? storageRemaining.get(resourceId)
      : cityStoredResourceCount(progress, resourceId);
    if (storageAvailable < remainingAfterBackpack) return null;
    storageRemaining.set(resourceId, storageAvailable - remainingAfterBackpack);
    plan.storage[resourceId] = (plan.storage[resourceId] ?? 0) + remainingAfterBackpack;
  }
  return plan;
}

function consumeCityResourceWithStorage(resourceId, amount, engine, snapshot, progress = null, onChangeProgress = null) {
  const needed = Math.max(0, Math.floor(Number(amount) || 0));
  if (!resourceId || needed <= 0) return 0;
  const backpackAvailable = resourceCountFromSnapshot(snapshot, resourceId);
  const fromBackpack = Math.min(backpackAvailable, needed);
  let consumed = 0;
  if (fromBackpack > 0) consumed += engine.consumeResource?.(resourceId, fromBackpack) ?? 0;
  const remaining = needed - consumed;
  if (remaining <= 0) return consumed;
  if (!progress || typeof onChangeProgress !== "function") return consumed;
  let storageConsumed = 0;
  onChangeProgress((current) => {
    const result = consumeCityStoredResource(current, resourceId, remaining);
    storageConsumed = result.consumed;
    return result.progress;
  });
  if (storageConsumed > 0) engine.addToast?.(`Used ${storageConsumed}x ${RESOURCE_DEFS[resourceId]?.name ?? resourceId} from city storage`);
  return consumed + storageConsumed;
}

function cityAreaRequiredItemCount(snapshot, req) {
  return (snapshot?.inventory ?? []).reduce((sum, item) => (
    itemMatchesCityAreaRequirement(item, req)
      ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
      : sum
  ), 0);
}

function itemMatchesCityAreaRequirement(item, req) {
  if (!item || !req) return false;
  let match = true;
  if (req.mode) match = match && String(item.mode) === String(req.mode);
  if (req.resourceId || req.resource) match = match && item.mode === "resource" && String(item.resourceId) === String(req.resourceId ?? req.resource);
  if (req.questItemId) match = match && item.mode === "quest" && String(item.questItemId) === String(req.questItemId);
  if (req.readableId) match = match && isReadableItem(item) && String(item.readableId) === String(req.readableId);
  if (req.uniqueId) match = match && String(item.uniqueId) === String(req.uniqueId);
  if (req.namedId) match = match && String(item.namedId) === String(req.namedId);
  if (req.rarity) match = match && String(item.rarity) === String(req.rarity);
  if (req.baseName) match = match && String(item.baseName) === String(req.baseName);
  if (req.name) match = match && String(item.name) === String(req.name);
  if (req.slot) match = match && String(item.slot) === String(req.slot);
  return match;
}

function cityAreaItemRequirementLabel(req) {
  if (req.label) return req.label;
  if (req.resourceId || req.resource) return cityCostLabel(req.resourceId ?? req.resource);
  if (req.questItemId) return QUEST_ITEM_DEFS[req.questItemId]?.name ?? req.questItemId;
  if (req.readableId) return READABLE_DEF_BY_ID[req.readableId]?.title ?? req.readableId;
  if (req.uniqueId) return req.uniqueId;
  if (req.namedId) return req.namedId;
  if (req.name) return req.name;
  if (req.baseName) return req.baseName;
  return "Required item";
}

function calculateCityStats(progress = {}, snapshot = emptySnapshot, regionCorruption = {}) {
  const applyNonPopularityEffects = (target, effects) => {
    const filtered = {};
    for (const [rawId, rawAmount] of Object.entries(effects ?? {})) {
      if (normalizeCityStatId(rawId) === "popularity") continue;
      filtered[rawId] = rawAmount;
    }
    applyCityStatEffects(target, filtered);
  };
  const stats = {
    ...CITY_STATS_RULES.baseStats,
    gold: Math.max(0, Math.floor(Number(snapshot?.player?.gold) || 0)),
    xp: Math.max(0, Math.floor(Number(snapshot?.player?.xp) || 0)),
    popularity: Math.max(0, Math.floor(Number(snapshot?.player?.popularity) || 0)),
  };
  const armyPower = armyTotalPower(progress?.armyUnits);
  stats.defense = Math.max(0, Math.floor(Number(stats.defense) || 0)) + armyPower;
  applyNonPopularityEffects(stats, normalizeCityStatBonuses(progress?.statBonuses));
  for (const area of CITY_AREAS) {
    const state = getCityAreaState(progress, area);
    if (!state.unlocked) continue;
    applyNonPopularityEffects(stats, cityAreaActiveStatEffects(area, state.level));
  }
  for (const building of CITY_BUILDINGS) {
    const state = getCityBuildingState(progress, building);
    if ((state.level ?? 0) <= 0) continue;
    applyNonPopularityEffects(stats, cityBuildingActiveStatEffects(building, state.level));
    const purchasedAddons = new Set(state.addons ?? []);
    for (const addon of building.addons ?? []) {
      if (!purchasedAddons.has(addon.id)) continue;
      applyNonPopularityEffects(stats, addon.statEffects ?? addon.effects?.cityStats);
    }
  }
  applyRegionCityStats(stats, regionCorruption, snapshot);
  applyCurrentCityStatEffects(stats, progress);
  stats.army = stats.defense;
  stats.city_defence = stats.defense;
  stats.citizens_health = stats.health;
  stats.happiness = stats.popularity;
  return stats;
}

function calculateCityStatBreakdown(progress = {}, snapshot = emptySnapshot, regionCorruption = {}) {
  const breakdown = {};
  const addEntry = (statId, label, amount, detail = "") => {
    const normalized = normalizeCityStatId(statId);
    if (!normalized) return;
    const value = Math.floor(Number(amount) || 0);
    if (value === 0 && !detail) return;
    if (!breakdown[normalized]) breakdown[normalized] = [];
    breakdown[normalized].push({ label, amount: value, detail });
  };
  for (const [statId, amount] of Object.entries(CITY_STATS_RULES.baseStats ?? {})) {
    addEntry(statId, "Base", amount);
  }
  addEntry("popularity", "Hero popularity", Math.max(0, Math.floor(Number(snapshot?.player?.popularity) || 0)));
  addEntry("defense", "Army units", armyTotalPower(progress?.armyUnits));
  for (const [statId, amount] of Object.entries(normalizeCityStatBonuses(progress?.statBonuses))) {
    if (normalizeCityStatId(statId) === "popularity") continue;
    addEntry(statId, "City progress", amount);
  }
  for (const area of CITY_AREAS) {
    const state = getCityAreaState(progress, area);
    if (!state.unlocked) continue;
    for (const [statId, amount] of Object.entries(cityAreaActiveStatEffects(area, state.level))) {
      if (normalizeCityStatId(statId) === "popularity") continue;
      addEntry(statId, area.title ?? area.id, amount, `Area level ${state.level}`);
    }
  }
  for (const building of CITY_BUILDINGS) {
    const state = getCityBuildingState(progress, building);
    if ((state.level ?? 0) <= 0) continue;
    for (const [statId, amount] of Object.entries(cityBuildingActiveStatEffects(building, state.level))) {
      if (normalizeCityStatId(statId) === "popularity") continue;
      addEntry(statId, building.title ?? building.id, amount, `Building level ${state.level}`);
    }
    const purchasedAddons = new Set(state.addons ?? []);
    for (const addon of building.addons ?? []) {
      if (!purchasedAddons.has(addon.id)) continue;
      const effects = mergeCityStatEffects([addon.statEffects ?? addon.effects?.cityStats]);
      for (const [statId, amount] of Object.entries(effects)) {
        if (normalizeCityStatId(statId) === "popularity") continue;
        addEntry(statId, addon.title ?? addon.id, amount, `${building.title ?? building.id} addon`);
      }
    }
  }
  const regionArmy = Math.max(0, Math.floor(Number(CITY_STATS_RULES.baseStats?.defense) || 0)) + armyTotalPower(progress?.armyUnits);
  for (const [areaMapId, regions] of Object.entries(MAP_REGION_SETS)) {
    if (areaMapId === WORLD_MAP.id) continue;
    for (const region of regions ?? []) {
      if (!cityStatsRegionIsUnlocked(region, snapshot, regionArmy)) continue;
      if (region.cityImpactEnabled === false) continue;
      const regionStats = getRegionCityStats(region);
      const level = getRegionCorruptionLevel(regionCorruption, areaMapId, region.id, region);
      const multiplier = getRegionCityStatMultiplier(level);
      if (multiplier <= 0) continue;
      for (const [rawId, rawAmount] of Object.entries(regionStats)) {
        const statId = rawId === "populationGain" ? "population" : rawId;
        if (normalizeCityStatId(statId) === "popularity") continue;
        const amount = Math.floor((Number(rawAmount) || 0) * multiplier);
        addEntry(statId, region.label ?? region.id, amount, `Corruption ${level}/10`);
      }
    }
  }
  const finalStats = calculateCityStats(progress, snapshot, regionCorruption);
  const cityMobs = normalizeCityMobs(progress?.cityMobs);
  const totalCityMobLevels = cityMobs.reduce((sum, mob) => sum + Math.max(1, Math.floor(Number(mob.level) || 1)), 0);
  if (totalCityMobLevels > 0) addEntry("safety", "City mobs", -(totalCityMobLevels * 2), `${totalCityMobLevels} total mob levels`);
  const population = Math.max(0, Math.floor(Number(finalStats.population) || 0));
  if (Math.max(0, Math.floor(Number(finalStats.provision) || 0)) < population) addEntry("health", "Low provision", -15);
  if (Math.max(0, Math.floor(Number(finalStats.water) || 0)) < population) addEntry("health", "Low water", -15);
  if (population > 0 && Math.max(0, Math.floor(Number(finalStats.knowledge) || 0)) >= population) addEntry("defense", "Knowledge threshold", 0, "+5% defense");
  if (population > 0 && Math.max(0, Math.floor(Number(finalStats.culture) || 0)) >= population) addEntry("popularity", "Culture threshold", 0, "+10% toward cap");
  const basePopularity = Math.max(0, Math.floor(Number(snapshot?.player?.popularity) || 0));
  const cityPopularityModifier = Math.floor(Number(finalStats.popularity) || 0) - basePopularity;
  if (cityPopularityModifier !== 0) addEntry("popularity", "City modifier", cityPopularityModifier, "Effective = base + city modifier");
  addEntry("maintenance", "Average durability", finalStats.maintenance, "Unlocked city areas and buildings");
  return breakdown;
}

function cityEventFlags(cityStats = {}) {
  const population = Math.max(0, Math.floor(Number(cityStats.population) || 0));
  const provision = Math.max(0, Math.floor(Number(cityStats.provision) || 0));
  const water = Math.max(0, Math.floor(Number(cityStats.water) || 0));
  const health = Math.max(0, Math.min(100, Number(cityStats.health) || 0));
  const wealth = Math.max(0, Math.floor(Number(cityStats.wealth) || 0));
  const safety = Math.max(0, Math.min(100, Number(cityStats.safety) || 0));
  const famine = provision < population;
  const waterShortage = water < population;
  const diseaseOutbreak = health < 50;
  const wealthRatio = wealth / Math.max(1, population);
  const uprisingPoorness = wealthRatio < 0.5;
  const fireRisk = Math.max(0, Math.min(100, (100 - safety) + (waterShortage ? 25 : 0)));
  return {
    famine: {
      active: famine,
      unavailablePopulationPct: 25,
      futureEffect: "hero_food_drops_half",
    },
    water_shortage: {
      active: waterShortage,
      unavailablePopulationPct: 45,
      futureEffect: "no_health_or_mana_potion_drops",
    },
    disease_outbreak: {
      active: diseaseOutbreak,
      futureEffect: "hero_max_hp_minus_25_pct",
    },
    uprising_poorness: {
      active: uprisingPoorness,
      risk: uprisingPoorness ? "high" : "low",
      wealthRatio,
      futureEffect: "hero_gold_drops_half",
    },
    fire: {
      active: fireRisk >= 75,
      risk: fireRisk,
      waterShortage,
    },
  };
}

function clampCorruptionLevel(value) {
  return Math.max(0, Math.min(10, Math.floor(Number(value) || 0)));
}

function normalizeRegionCorruptionEntry(value, regionDef = null) {
  if (typeof value === "boolean") return value ? { corruptionLevel: 10 } : { corruptionLevel: 0 };
  if (typeof value === "number") return { corruptionLevel: clampCorruptionLevel(value) };
  if (value && typeof value === "object") {
    if (typeof value.corruptionLevel === "boolean") return { ...value, corruptionLevel: value.corruptionLevel ? 10 : 0 };
    if (value.corruptionLevel !== undefined) return { ...value, corruptionLevel: clampCorruptionLevel(value.corruptionLevel) };
  }
  if (regionDef?.corruptionLevel !== undefined) return { corruptionLevel: clampCorruptionLevel(regionDef.corruptionLevel) };
  if (typeof regionDef?.corrupted === "boolean") return { corruptionLevel: regionDef.corrupted ? 10 : 0 };
  return { corruptionLevel: 10 };
}

function getRegionCorruptionLevel(regionCorruption = {}, areaMapId, regionId, regionDef = null) {
  const key = regionStatusKey(areaMapId, regionId);
  return normalizeRegionCorruptionEntry(regionCorruption?.[key], regionDef).corruptionLevel;
}

function setRegionCorruptionLevel(regionCorruption = {}, areaMapId, regionId, level) {
  if (!areaMapId || !regionId) return regionCorruption;
  return {
    ...(regionCorruption ?? {}),
    [regionStatusKey(areaMapId, regionId)]: { corruptionLevel: clampCorruptionLevel(level) },
  };
}

function getRegionCityStats(region = {}) {
  const stats = region?.cityStats ?? region?.regionStats ?? {};
  const normalized = stats && typeof stats === "object" && !Array.isArray(stats) ? { ...stats } : {};
  if (normalized.population === undefined && normalized.populationGain !== undefined) {
    normalized.population = normalized.populationGain;
    delete normalized.populationGain;
  }
  if (normalized.population === undefined && region?.populationGain !== undefined) {
    normalized.population = region.populationGain;
  }
  return normalized;
}

function getRegionCityStatMultiplier(corruptionLevel) {
  return Math.max(0, Math.min(1, (10 - clampCorruptionLevel(corruptionLevel)) / 10));
}

function regionQuestCompleted(completedQuestSet, questId) {
  const raw = String(questId ?? "");
  if (!raw) return false;
  const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
  return completedQuestSet.has(raw) || completedQuestSet.has(swapped);
}

function cityStatsRegionIsUnlocked(region, snapshot = emptySnapshot, army = 0) {
  if (region?.unlock?.locked) return false;
  const requiredArmy = Math.max(0, Math.floor(Number(region?.unlock?.army ?? region?.unlock?.requiredArmy) || 0));
  if (army < requiredArmy) return false;
  const completedQuestSet = new Set((snapshot?.quests?.completed ?? []).map(String));
  const requiredQuests = region?.unlock?.completedQuests ?? [];
  if (!requiredQuests.every((questId) => regionQuestCompleted(completedQuestSet, questId))) return false;
  const context = {
    regionId: region?.id,
    regionConfig: region,
    questState: snapshot?.quests ?? {},
    worldState: snapshot?.worldState,
  };
  return worldEntryAllowed(region?.unlock ?? {}, snapshot?.worldState, context)
    && worldEntryAllowed(region ?? {}, snapshot?.worldState, context);
}

function applyRegionCityStats(stats, regionCorruption = {}, snapshot = emptySnapshot) {
  const army = Math.max(0, Math.floor(Number(stats.defense) || 0));
  for (const [areaMapId, regions] of Object.entries(MAP_REGION_SETS)) {
    if (areaMapId === WORLD_MAP.id) continue;
    for (const region of regions ?? []) {
      if (!cityStatsRegionIsUnlocked(region, snapshot, army)) continue;
      if (region.cityImpactEnabled === false) continue;
      const regionStats = getRegionCityStats(region);
      if (!Object.keys(regionStats).length) continue;
      const multiplier = getRegionCityStatMultiplier(getRegionCorruptionLevel(regionCorruption, areaMapId, region.id, region));
      if (multiplier <= 0) continue;
      for (const [rawId, rawAmount] of Object.entries(regionStats)) {
        const statId = normalizeCityStatId(rawId === "populationGain" ? "population" : rawId);
        if (!statId) continue;
        if (statId === "popularity") continue;
        const amount = Math.floor((Number(rawAmount) || 0) * multiplier);
        if (amount === 0) continue;
        stats[statId] = Math.max(0, Math.floor(Number(stats[statId]) || 0) + amount);
      }
    }
  }
}

function updateRegionCorruptionFromMapReturn(oldLevel, mapReturn = {}) {
  const current = clampCorruptionLevel(oldLevel);
  if (mapReturn?.cleared || (mapReturn?.reachedExit && !mapReturn?.playerDied && !mapReturn?.abandoned && Number(mapReturn?.remainingMobs) === 0)) return 0;
  const totalMobs = Math.max(0, Math.floor(Number(mapReturn?.totalMobs) || 0));
  if (totalMobs <= 0) return current;
  const killedMobs = Math.max(0, Math.min(totalMobs, Math.floor(Number(mapReturn?.killedMobs) || 0)));
  const remainingMobs = Math.max(0, Math.min(totalMobs, Math.floor(Number(mapReturn?.remainingMobs) || 0)));
  const reduction = Math.floor((killedMobs / totalMobs) * 10);
  const gain = Math.ceil((remainingMobs / totalMobs) * 10);
  return clampCorruptionLevel(current - reduction + gain);
}

function cityUsableSoldierCapacity(cityStats = {}) {
  return availablePopulationForRecruitment(cityStats);
}

function availablePopulationForRecruitment(cityStats = {}) {
  const population = Math.max(0, Math.floor(Number(cityStats.population) || 0));
  const events = cityStats.events ?? cityEventFlags(cityStats);
  const unavailablePct = Math.min(75, (
    (events.famine?.active ? 25 : 0)
    + (events.water_shortage?.active ? 45 : 0)
  ));
  return Math.max(0, Math.floor(population * ((100 - unavailablePct) / 100)));
}

function cityArmyUnitCount(armyUnits = {}) {
  return armyUnitCount(armyUnits);
}

function cityArmyCanTrainUnit(progress = {}, cityStats = {}, unitId, count = 1) {
  const def = CITY_ARMY_UNIT_DEFS[unitId];
  if (!def) return false;
  const current = cityArmyUnitCount(progress.armyUnits);
  const needed = Math.max(1, Math.floor(Number(count) || 1)) * Math.max(1, Math.floor(Number(def.populationCost) || 1));
  return current + needed <= cityUsableSoldierCapacity(cityStats);
}

function addCityArmyUnit(progress = {}, unitId, count = 1) {
  const def = CITY_ARMY_UNIT_DEFS[unitId];
  if (!def) return progress;
  const amount = Math.max(1, Math.floor(Number(count) || 1));
  const armyUnits = normalizeArmyUnits(progress.armyUnits);
  return {
    ...progress,
    armyUnits: {
      ...armyUnits,
      [unitId]: Math.max(0, Math.floor(Number(armyUnits[unitId]) || 0)) + amount,
    },
  };
}

function removeCityArmyUnits(progress = {}, losses = {}) {
  const armyUnits = normalizeArmyUnits(progress.armyUnits);
  for (const [unitId, count] of Object.entries(losses ?? {})) {
    const loss = Math.max(0, Math.floor(Number(count) || 0));
    if (loss <= 0 || !armyUnits[unitId]) continue;
    armyUnits[unitId] = Math.max(0, armyUnits[unitId] - loss);
    if (armyUnits[unitId] <= 0) delete armyUnits[unitId];
  }
  return { ...progress, armyUnits };
}

function resolveCityArmyBattle({ progress = {}, cityStats = {}, mob, sentUnits = {}, rng = Math.random }) {
  const normalizedSent = normalizeArmyUnits(sentUnits);
  const available = normalizeArmyUnits(progress.armyUnits);
  const usedUnits = {};
  for (const [unitId, count] of Object.entries(normalizedSent)) {
    const used = Math.min(Math.max(0, Math.floor(Number(available[unitId]) || 0)), Math.max(0, Math.floor(Number(count) || 0)));
    if (used > 0) usedUnits[unitId] = used;
  }
  const armyPower = armyTotalPower(usedUnits);
  const mobThreat = CITY_ARMY_BATTLE_CONFIG.mobThreatByType[mob?.mobType]
    ?? CITY_ARMY_BATTLE_CONFIG.defaultMobThreat
    ?? 1;
  const mobPower = Math.max(1, (Math.max(1, Number(mob?.level) || 1) * Math.max(1, Number(mob?.count) || 1) * 8 * mobThreat));
  const happiness = Math.max(0, Math.min(100, Number(cityStats.happiness) || 0));
  const moraleCfg = CITY_ARMY_BATTLE_CONFIG.happinessMorale ?? {};
  const morale = Math.max(
    Number(moraleCfg.minMultiplier) || 0.7,
    Math.min(
      Number(moraleCfg.maxMultiplier) || 1.25,
      1 + ((happiness - (Number(moraleCfg.neutral) || 50)) / 100),
    ),
  );
  const effectiveArmyPower = armyPower * morale;
  const rawChance = effectiveArmyPower / Math.max(1, effectiveArmyPower + mobPower);
  const winChance = Math.max(
    CITY_ARMY_BATTLE_CONFIG.minWinChance,
    Math.min(CITY_ARMY_BATTLE_CONFIG.maxWinChance, rawChance),
  );
  const won = armyPower > 0 && rng() <= winChance;
  const lossRange = won ? CITY_ARMY_BATTLE_CONFIG.winLossPct : CITY_ARMY_BATTLE_CONFIG.loseLossPct;
  const lossPct = (Number(lossRange?.min) || 0) + rng() * Math.max(0, (Number(lossRange?.max) || 0) - (Number(lossRange?.min) || 0));
  const losses = {};
  for (const [unitId, count] of Object.entries(usedUnits)) {
    const lost = Math.min(count, Math.max(won ? 0 : 1, Math.round(count * lossPct)));
    if (lost <= 0) continue;
    losses[unitId] = lost;
  }
  return {
    won,
    winChance,
    morale,
    armyPower,
    mobPower,
    usedUnits,
    losses,
  };
}

function applyCurrentCityStatEffects(stats, progress = {}) {
  const population = Math.max(0, Math.floor(Number(stats.population) || 0));
  const provision = Math.max(0, Math.floor(Number(stats.provision) || 0));
  const water = Math.max(0, Math.floor(Number(stats.water) || 0));
  const cityMobs = normalizeCityMobs(progress?.cityMobs);
  const totalCityMobLevels = cityMobs.reduce((sum, mob) => sum + Math.max(1, Math.floor(Number(mob.level) || 1)), 0);
  stats.safety = clampPct((Number(stats.safety) || 0) - totalCityMobLevels * 2);
  let healthPenalty = 0;
  if (provision < population) healthPenalty += 15;
  if (water < population) healthPenalty += 15;
  stats.health = clampPct((Number(stats.health) || 0) - healthPenalty);
  if (Math.max(0, Math.floor(Number(stats.knowledge) || 0)) >= population && population > 0) {
    stats.defense = Math.floor((Number(stats.defense) || 0) * 1.05);
  }
  const basePopularity = clampPct(stats.popularity);
  if (Math.max(0, Math.floor(Number(stats.culture) || 0)) >= population && population > 0) {
    // Keep culture influence without creating a hidden >100 buffer that masks popularity drops.
    stats.popularity = clampPct(basePopularity + (100 - basePopularity) * 0.1);
  } else {
    stats.popularity = basePopularity;
  }
  stats.nonUniqueDropRateBonus = Math.max(0, Math.floor(Number(stats.faith) || 0)) >= population && population > 0 ? 0.05 : 0;
  stats.maintenance = calculateCityMaintenance(progress, stats.maintenance);
  stats.safety = clampPct(stats.safety);
  stats.health = clampPct(stats.health);
  stats.events = cityEventFlags(stats);
}

function clampPct(value) {
  return Math.max(0, Math.min(100, Math.floor(Number(value) || 0)));
}

function calculateCityMaintenance(progress = {}, rawMaintenance = 100) {
  const baseMaintenance = Math.floor(Number(CITY_STATS_RULES.baseStats?.maintenance) || 100);
  const modifier = Math.floor(Number(rawMaintenance) || 0) - baseMaintenance;
  const durabilities = [];
  for (const area of CITY_AREAS) {
    const state = getCityAreaState(progress, area);
    if (!state.unlocked) continue;
    if (state.durability !== undefined) durabilities.push(Math.max(0, Math.min(100, Number(state.durability) || 0)));
  }
  for (const building of CITY_BUILDINGS) {
    const state = getCityBuildingState(progress, building);
    if ((state.level ?? 0) <= 0) continue;
    if (state.durability !== undefined) durabilities.push(Math.max(0, Math.min(100, Number(state.durability) || 0)));
  }
  const average = durabilities.length
    ? Math.floor(durabilities.reduce((sum, value) => sum + value, 0) / durabilities.length)
    : 100;
  return clampPct(average + modifier);
}

function cityAreaActiveStatEffects(area, level = 1) {
  return mergeCityStatEffects([
    area?.statEffects ?? area?.effects?.cityStats,
    ...cityReachedLevels(area, level).map((entry) => entry.statEffects ?? entry.effects?.cityStats),
  ]);
}

function cityBuildingActiveStatEffects(building, level = 1) {
  return mergeCityStatEffects([
    building?.statEffects ?? building?.effects?.cityStats,
    ...cityReachedLevels(building, level).map((entry) => entry.statEffects ?? entry.effects?.cityStats),
  ]);
}

function mergeCityStatEffects(effectList = []) {
  const merged = {};
  for (const effects of effectList) {
    for (const [rawId, rawAmount] of Object.entries(effects ?? {})) {
      const statId = normalizeCityStatId(rawId);
      if (!statId) continue;
      merged[statId] = (merged[statId] ?? 0) + Math.floor(Number(rawAmount) || 0);
    }
  }
  return merged;
}

function cityReachedLevels(config, currentLevel = 1) {
  return (config?.levels ?? [])
    .filter((entry) => Math.floor(Number(entry?.level) || 0) <= currentLevel)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
}

function cityNextLevel(config, currentLevel = 1) {
  return (config?.levels ?? [])
    .filter((entry) => Math.floor(Number(entry?.level) || 0) > currentLevel)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))[0] ?? null;
}

function cityAreaNextLevel(area, currentLevel = 1) {
  return cityNextLevel(area, currentLevel);
}

function cityBuildingNextLevel(building, currentLevel = 1) {
  return cityNextLevel(building, currentLevel);
}

function applyCityStatEffects(stats, effects = {}) {
  for (const [rawId, rawAmount] of Object.entries(effects ?? {})) {
    const statId = normalizeCityStatId(rawId);
    if (!statId) continue;
    stats[statId] = Math.max(0, Math.floor(Number(stats[statId]) || 0) + Math.floor(Number(rawAmount) || 0));
  }
}

function cityStatRequirementEntries(requirements = {}, cityStats = {}) {
  return Object.entries(requirements ?? {}).map(([rawId, rawNeeded]) => {
    const statId = normalizeCityStatId(rawId);
    const needed = Math.max(0, Math.floor(Number(rawNeeded) || 0));
    const current = Math.max(0, Math.floor(Number(cityStats[statId]) || 0));
    return {
      key: `stat:${statId}`,
      type: "stat",
      statId,
      current,
      needed,
      label: `${cityStatLabel(statId)} ${current}/${needed}`,
      met: current >= needed,
    };
  });
}

function cityStatsMeetRequirements(requirements = {}, cityStats = {}) {
  return cityStatRequirementEntries(requirements, cityStats).every((entry) => entry.met);
}

function normalizeCityStatId(id) {
  if (!id) return "";
  const raw = String(id);
  const normalized = raw.replaceAll("-", "_");
  return CITY_STAT_ALIASES[raw] ?? CITY_STAT_ALIASES[normalized] ?? normalized;
}

function cityStatLabel(id) {
  const normalized = normalizeCityStatId(id);
  return CITY_STAT_DEFS.find((stat) => stat.id === normalized)?.label ?? normalized.replaceAll("_", " ").toUpperCase();
}

function loadCityAssets() {
  if (cityAssetCache.assets) return Promise.resolve(cityAssetCache.assets);
  if (!cityAssetCache.promise) {
    cityAssetCache.promise = Promise.all([
      loadCityLayerImages(),
      loadCityHouseImages(),
      Promise.all(Object.entries(QUEST_NPCS).map(([npcId, npc]) => (
        loadImage(npc.imageUrl)
          .then((image) => [npcId, removeGreenScreen(image)])
          .catch(() => [npcId, null])
      ))),
    ]).then(([layerImageEntries, houseImages, npcImageEntries]) => {
      cityAssetCache.assets = {
        layerImages: Object.fromEntries(layerImageEntries),
        houseImages,
        npcImages: Object.fromEntries(npcImageEntries),
      };
      return cityAssetCache.assets;
    }).catch((error) => {
      cityAssetCache.promise = null;
      throw error;
    });
  }
  return cityAssetCache.promise;
}

function loadCityAssetsOnce() {
  return loadCityAssets();
}

function loadCityLayerImages() {
  const urls = new Set([CITY_MAP_IMAGE.src]);
  for (const area of CITY_AREAS) {
    collectCityLayerUrlsFrom(area, urls);
    for (const level of area.levels ?? []) collectCityLayerUrlsFrom(level, urls);
  }
  for (const building of CITY_BUILDINGS) {
    collectCityLayerUrlsFrom(building, urls);
    for (const level of building.levels ?? []) collectCityLayerUrlsFrom(level, urls);
    for (const addon of building.addons ?? []) {
      if (addon.imageUrl) urls.add(addon.imageUrl);
      collectCityLayerUrlsFrom(addon, urls);
      for (const level of addon.levels ?? []) collectCityLayerUrlsFrom(level, urls);
    }
  }
  return Promise.all([...urls].map((src) => (
    loadImage(src)
      .then((image) => [src, image])
      .catch(() => [src, null])
  )));
}

function collectCityLayerUrlsFrom(entry, urls) {
  if (!entry) return;
  if (entry.builtLayer) urls.add(entry.builtLayer);
  for (const url of entry.builtLayers ?? []) urls.add(url);
  if (entry.previewLayer) urls.add(entry.previewLayer);
  for (const url of entry.previewLayers ?? []) urls.add(url);
}

function loadCityHouseImages() {
  const entries = [];
  for (const building of CITY_BUILDINGS) {
    if (building.imageUrl) {
      entries.push([cityBuildingImageKey(building), building.imageUrl]);
      entries.push([cityBuildingRuinImageKey(building), cityRuinImageUrl(building.imageUrl)]);
    }
    for (const addon of building.addons ?? []) {
      if (addon.imageUrl) entries.push([cityAddonImageKey(building, addon), addon.imageUrl]);
    }
  }
  return Promise.all(entries.map(([key, src]) => (
      loadImage(src)
      .then((image) => [key, removeGreenScreen(image)])
      .catch(() => [key, null])
  ))).then((loaded) => Object.fromEntries(loaded));
}

function cityBuildingImageKey(building) {
  return `building:${building.id}`;
}

function cityBuildingRuinImageKey(building) {
  return `building:${building.id}:ruin`;
}

function cityAddonImageKey(building, addon) {
  return `addon:${building.id}:${addon.id}`;
}

function cityRuinImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return "";
  return imageUrl.replace(/(\.[a-z0-9]+)$/i, "_ruin$1");
}

function isCityBuildingOwned(progress, building) {
  return getCityBuildingState(progress, building).level > 0;
}

function cityBuildingFromHouse(house) {
  return CITY_BUILDINGS.find((building) => building.id === house?.buildingId) ?? CITY_BUILDINGS[house?.spriteIndex];
}

function cityImageForBuilding(houseImages, building, progress) {
  if (!building) return null;
  if (progress) {
    const state = getCityBuildingState(progress, building);
    const rawDurability = Number(state.durability ?? DURABILITY_DEFAULT);
    const durability = Math.max(0, Math.min(100, Number.isFinite(rawDurability) ? rawDurability : DURABILITY_DEFAULT));
    if (durability <= 50) {
      const ruinImage = houseImages?.[cityBuildingRuinImageKey(building)];
      if (ruinImage) return ruinImage;
    }
  }
  return houseImages?.[cityBuildingImageKey(building)] ?? null;
}

function cityImageForAddon(houseImages, building, addon, progress) {
  if (!building || !addon) return cityImageForBuilding(houseImages, building, progress);
  return houseImages?.[cityAddonImageKey(building, addon)] ?? cityImageForBuilding(houseImages, building, progress);
}

function imageSourceWidth(image) {
  return image?.naturalWidth || image?.width || 1;
}

function imageSourceHeight(image) {
  return image?.naturalHeight || image?.height || 1;
}

function getCityQuestOffset(spriteIndex) {
  const offsets = [
    { gx: 0.58, gy: 0.58 },
    { gx: 0.56, gy: 0.56 },
    { gx: 0.62, gy: 0.62 },
    { gx: 0.58, gy: 0.58 },
    { gx: 0.56, gy: 0.56 },
    { gx: 0.6, gy: 0.6 },
    { gx: 0.58, gy: 0.58 },
    { gx: 0.58, gy: 0.58 },
    { gx: 0.56, gy: 0.56 },
  ];
  return offsets[Math.abs(spriteIndex ?? 0) % offsets.length];
}

function loadCityProgress(storageKey = CITY_STORAGE_KEY) {
  return normalizeCityProgress(saveRepository.loadCityProgressSync(storageKey));
}

function findMapRegionConfig(areaMapId, regionId) {
  return (MAP_REGION_SETS[areaMapId] ?? []).find((region) => String(region.id) === String(regionId)) ?? null;
}

function addCityPermanentStatBonus(progress = {}, statId, amount) {
  const normalized = normalizeCityStatId(statId);
  const value = Math.floor(Number(amount) || 0);
  if (!normalized || normalized === "population" || value === 0) return progress;
  return {
    ...progress,
    statBonuses: {
      ...(progress.statBonuses ?? {}),
      [normalized]: Math.max(0, Math.floor(Number(progress.statBonuses?.[normalized]) || 0) + value),
    },
  };
}

function saveCityProgress(progress, storageKey = CITY_STORAGE_KEY) {
  saveRepository.saveCityProgressSync(storageKey, serializeCityProgress(progress));
}

function normalizeCityStatBonuses(statBonuses = {}) {
  if (!statBonuses || typeof statBonuses !== "object" || Array.isArray(statBonuses)) return {};
  const normalized = {};
  for (const [rawId, rawAmount] of Object.entries(statBonuses)) {
    const statId = normalizeCityStatId(rawId);
    if (!statId || statId === "population") continue;
    const amount = Math.floor(Number(rawAmount) || 0);
    if (amount === 0) continue;
    normalized[statId] = amount;
  }
  return normalized;
}

function normalizeCityProgress(progress = {}) {
  const raw = progress && typeof progress === "object" && !Array.isArray(progress) ? progress : {};
  const reserved = new Set(["areas", "statBonuses", "armoryPoints", "armyUnits", "threatLevel", "cityMobs"]);
  const normalized = {
    areas: raw.areas && typeof raw.areas === "object" && !Array.isArray(raw.areas) ? { ...raw.areas } : {},
  };
  for (const [key, value] of Object.entries(raw)) {
    if (reserved.has(key)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    normalized[key] = { ...value };
  }
  normalized.statBonuses = normalizeCityStatBonuses(raw.statBonuses);
  normalized.armoryPoints = normalizeArmoryPoints(raw.armoryPoints);
  normalized.armyUnits = normalizeArmyUnits(raw.armyUnits);
  normalized.threatLevel = Math.max(0, Math.min(100, Number(raw.threatLevel) || 0));
  normalized.cityMobs = normalizeCityMobs(raw.cityMobs);
  return normalized;
}

function serializeCityProgress(progress = {}) {
  const normalized = normalizeCityProgress(progress);
  const cfg = SAVE_PERSIST_CONFIG.cityProgress;
  return {
    ...(cfg.areas ? { areas: { ...(normalized.areas ?? {}) } } : {}),
    ...(cfg.buildingStates
      ? Object.fromEntries(
        Object.entries(normalized).filter(([key, value]) => (
          key !== "areas"
          && key !== "statBonuses"
          && key !== "armoryPoints"
          && key !== "armyUnits"
          && key !== "threatLevel"
          && key !== "cityMobs"
          && value
          && typeof value === "object"
          && !Array.isArray(value)
        )),
      )
      : {}),
    ...(cfg.statBonuses ? { statBonuses: { ...(normalized.statBonuses ?? {}) } } : {}),
    ...(cfg.armoryPoints ? { armoryPoints: normalizeArmoryPoints(normalized.armoryPoints) } : {}),
    ...(cfg.armyUnits ? { armyUnits: normalizeArmyUnits(normalized.armyUnits) } : {}),
    ...(cfg.threatLevel ? { threatLevel: Math.max(0, Math.min(100, Number(normalized.threatLevel) || 0)) } : {}),
    ...(cfg.cityMobs ? { cityMobs: normalizeCityMobs(normalized.cityMobs) } : {}),
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (typeof image.decode !== "function") {
        resolve(image);
        return;
      }
      image.decode().then(() => resolve(image)).catch(() => resolve(image));
    };
    image.onerror = reject;
    image.src = src;
  });
}

function removeGreenScreen(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (g > 145 && g > r * 1.5 && g > b * 1.5) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
function resourceCountFromSnapshot(snapshot, resourceId) {
  return (snapshot?.inventory ?? []).reduce((sum, item) => (
    item?.mode === "resource" && item.resourceId === resourceId
      ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
      : sum
  ), 0);
}

function cityStoredResourceCount(progress = {}, resourceId) {
  if (!resourceId) return 0;
  let total = 0;
  for (const building of CITY_BUILDINGS) {
    if (!cityPaymentStorageBuildingIds().has(building.id)) continue;
    const state = getCityBuildingState(progress, building);
    if ((state.level ?? 0) <= 0) continue;
    const inventories = cityPaymentInventoriesForBuilding(state, building);
    for (const items of Object.values(inventories)) {
      for (const item of items ?? []) {
        if (item?.mode !== "resource" || String(item.resourceId) !== String(resourceId)) continue;
        total += Math.max(1, Math.floor(Number(item.count) || 1));
      }
    }
  }
  return total;
}

function cityArmoryPoints(progress = {}) {
  return normalizeArmoryPoints(progress?.armoryPoints);
}

function cityArmoryPointCount(progress = {}, resourceId) {
  if (!isArmoryPointId(resourceId)) return 0;
  return cityArmoryPoints(progress)[resourceId] ?? 0;
}

function addCityArmoryPoints(progress = {}, pointId, amount = 0) {
  if (!isArmoryPointId(pointId)) return progress;
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (value <= 0) return progress;
  const current = cityArmoryPoints(progress);
  return {
    ...progress,
    armoryPoints: {
      ...current,
      [pointId]: current[pointId] + value,
    },
  };
}

function consumeCityArmoryPoints(progress = {}, pointId, amount = 0) {
  if (!isArmoryPointId(pointId)) return { progress, consumed: 0 };
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  if (requested <= 0) return { progress, consumed: 0 };
  const current = cityArmoryPoints(progress);
  const consumed = Math.min(current[pointId] ?? 0, requested);
  if (consumed <= 0) return { progress, consumed: 0 };
  return {
    progress: {
      ...progress,
      armoryPoints: {
        ...current,
        [pointId]: Math.max(0, (current[pointId] ?? 0) - consumed),
      },
    },
    consumed,
  };
}

function consumeCityStoredResource(progress = {}, resourceId, amount = 0) {
  let remaining = Math.max(0, Math.floor(Number(amount) || 0));
  if (!resourceId || remaining <= 0) return { progress, consumed: 0 };
  let nextProgress = progress;
  let consumed = 0;
  for (const building of CITY_BUILDINGS) {
    if (remaining <= 0) break;
    if (!cityPaymentStorageBuildingIds().has(building.id)) continue;
    const state = getCityBuildingState(nextProgress, building);
    if ((state.level ?? 0) <= 0) continue;
    const inventories = cityPaymentInventoriesForBuilding(state, building);
    let changed = false;
    const nextInventories = { ...inventories };
    for (const sectionKey of Object.keys(nextInventories)) {
      if (remaining <= 0) break;
      const items = [...(nextInventories[sectionKey] ?? [])];
      for (let index = 0; index < items.length && remaining > 0; index += 1) {
        const item = items[index];
        if (item?.mode !== "resource" || String(item.resourceId) !== String(resourceId)) continue;
        const count = Math.max(1, Math.floor(Number(item.count) || 1));
        const used = Math.min(count, remaining);
        remaining -= used;
        consumed += used;
        changed = true;
        items[index] = count > used ? { ...item, count: count - used } : null;
      }
      nextInventories[sectionKey] = items;
    }
    if (!changed) continue;
    nextProgress = {
      ...nextProgress,
      [building.id]: {
        ...(nextProgress[building.id] ?? {}),
        inventories: nextInventories,
      },
    };
  }
  return { progress: nextProgress, consumed };
}

function cityPaymentInventoriesForBuilding(state, building) {
  const source = state?.inventories && typeof state.inventories === "object" ? state.inventories : {};
  const next = { ...source };
  if (!next.base && Array.isArray(state?.items)) next.base = state.items;
  const sections = cityPaymentInventorySections(building, state);
  for (const section of sections) {
    next[section.key] = Array.from({ length: section.slots }, (_, index) => next[section.key]?.[index] ?? null);
  }
  return next;
}

function cityPaymentInventorySections(building, state) {
  const sections = [];
  const baseInventory = normalizeCityPaymentInventoryType(building.inventoryType);
  if (baseInventory.type !== "none" && baseInventory.slots > 0) {
    sections.push({ key: "base", slots: baseInventory.slots });
  }
  const bought = new Set(state.addons ?? []);
  for (const addon of building.addons ?? []) {
    if (!bought.has(addon.id)) continue;
    const addonInventory = normalizeCityPaymentInventoryType(addon.inventoryType);
    if (addonInventory.type === "none" || addonInventory.slots <= 0) continue;
    sections.push({ key: `addon:${addon.id}`, slots: addonInventory.slots });
  }
  return sections;
}

function normalizeCityPaymentInventoryType(value) {
  if (!value || value === "none") return { type: "none", slots: 0 };
  if (typeof value === "number") return { type: "all", slots: Math.max(0, Math.floor(value)) };
  if (typeof value === "string") return { type: value, slots: 0 };
  return {
    type: String(value.type ?? value.accepts ?? "none"),
    slots: Math.max(0, Math.floor(Number(value.slots ?? value.size ?? 0) || 0)),
  };
}

function cityPaymentStorageBuildingIds() {
  return new Set(["bank", "inn"]);
}

function cityCostAvailable(snapshot, resourceId, progress = null) {
  if (resourceId === "gold") return Math.max(0, Math.floor(Number(snapshot?.player?.gold) || 0));
  if (isArmoryPointId(resourceId)) return cityArmoryPointCount(progress, resourceId);
  return resourceCountFromSnapshot(snapshot, resourceId) + cityStoredResourceCount(progress, resourceId);
}

function cityCostLabel(resourceId) {
  if (resourceId === "gold") return "Gold";
  if (resourceId === "weaponPoints") return "weaponPoints";
  if (resourceId === "armorPoints") return "armorPoints";
  return RESOURCE_DEFS[resourceId]?.name ?? resourceId;
}


export {
  isCityBuildingOwned,
  imageSourceWidth,
  imageSourceHeight,
  getCityQuestOffset,
  getCityBuildingState,
  getCityLayout,
  buildCityTerrainLayer,
  cityImageForBuilding,
  cityImageForAddon,
  cityBuildingImageKey,
  cityBuildingRuinImageKey,
  cityBuildingFromHouse,
  cityAddonImageKey,
  cityAssetCache,
  cityAreaLayerUrls,
  normalizeCityMobs,
  cityMapMobRefs,
  cityAttackableMobIds,
  pickCityBattleRegion,
  applyCityMobProgressForVisit,
  cityBuildingLayerUrls,
  cityAreaPreviewLayerUrls,
  getCityAreaState,
  isCityAreaUnlocked,
  cityAreaPathD,
  cityAreaBuildingRefs,
  getCityMapQuestNpcs,
  cityMapPositionStyle,
  cityBuildingIconText,
  cityAreaCenter,
  cityAreaGeometry,
  cityAreaCostEntries,
  cityLevelCostEntries,
  computeRepairCostEntries,
  cityAreaGateEntries,
  cityAreaCanUnlock,
  payCityAreaUnlockCost,
  payCityCostEntries,
  calculateCityStats,
  calculateCityStatBreakdown,
  cityEventFlags,
  availablePopulationForRecruitment,
  clampCorruptionLevel,
  normalizeRegionCorruptionEntry,
  getRegionCorruptionLevel,
  setRegionCorruptionLevel,
  getRegionCityStats,
  getRegionCityStatMultiplier,
  updateRegionCorruptionFromMapReturn,
  cityAreaActiveStatEffects,
  cityBuildingActiveStatEffects,
  mergeCityStatEffects,
  cityReachedLevels,
  cityAreaNextLevel,
  cityBuildingNextLevel,
  cityStatRequirementEntries,
  cityStatsMeetRequirements,
  cityStatLabel,
  loadCityAssets,
  loadCityAssetsOnce,
  loadCityProgress,
  saveCityProgress,
  serializeCityProgress,
  addCityPermanentStatBonus,
  cityArmoryPoints,
  addCityArmoryPoints,
  addCityArmyUnit,
  removeCityArmyUnits,
  resolveCityArmyBattle,
  loadImage,
  removeGreenScreen,
  resourceCountFromSnapshot,
  cityStoredResourceCount,
  cityCostAvailable,
  cityCostLabel,
  cityArmyCanTrainUnit,
  cityArmyUnitCount,
  cityUsableSoldierCapacity
};
