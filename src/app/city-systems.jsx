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
import { cityConfigEntryOwnedFromStart } from "../game/config/city-state-helpers.js";
import { CITY_ARTIFACTS } from "../game/config/city-artifact-config.js";
import { CITY_POLICIES } from "../game/config/city-policy-config.js";
import { CITY_ACHIEVEMENTS } from "../game/config/city-achievement-config.js";
import { DURABILITY_DEFAULT, DURABILITY_DEGRADE_CHANCE, DURABILITY_DEGRADE_MIN_PCT, DURABILITY_DEGRADE_MAX_PCT } from "../game/config/durability-config.js";
import {
  CITY_STATS_RULES,
  calculateCityStatNeeds,
  calculateCityStatRatios,
  calculateCityStatStatuses,
} from "../game/config/city-stats-rules-config.js";
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
  cityMobBattleProfilesForTarget,
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
  CITY_MOB_BALANCE,
  CITY_ATTACK_AREA_RULES,
  CITY_MOB_DAMAGE_PER_LEVEL_PCT,
  CITY_MOB_LEVELS,
  CITY_MOB_LEVEL_UP_CHANCE,
  CITY_MOB_MAX_LEVEL,
  CITY_MOB_OCCUPATION_PROFILES,
  CITY_MOB_OCCUPATION_TARGETS,
  CITY_MOB_POOL,
  CITY_MOB_THEFT_CONFIG,
  CITY_MOB_THEFT_PROFILES,
  CITY_MOB_TYPE_EFFECTS,
  CITY_SPAWN_AREA_BUILDING_TARGETS,
  CITY_SPAWN_AREA_RULES,
  CITY_SPAWN_PATHS,
  CITY_SPAWN_SPREAD_TARGETS,
  CITY_THREAT_SPAWN_THRESHOLD,
  calcCitySpawnChance,
  getMaxNewCityMobsPerVisit,
  pickCityMobType,
} from "../game/config/city-mobs-attack-config.js";
import { CITY_EVENT_RULES } from "../game/config/city-config.js";
import { cityDurabilityConsequenceFor, cityEventFlags, cityRuntimeModifiers } from "../game/config/city-consequence-resolver.js";
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
  if ((state.level ?? 0) <= 0) return [];
  return [
    area?.builtLayer,
    ...(Array.isArray(area?.builtLayers) ? area.builtLayers : []),
    ...cityReachedLevels(area, state.level).flatMap((level) => [
      level?.builtLayer,
      ...(Array.isArray(level?.builtLayers) ? level.builtLayers : []),
    ]),
  ].filter(Boolean);
}

function cityAreaRawLockedLayerUrls(area) {
  return [
    area?.lockedLayer,
    area?.level0Layer,
    area?.ruinLayer,
    ...(Array.isArray(area?.lockedLayers) ? area.lockedLayers : []),
    ...(Array.isArray(area?.level0Layers) ? area.level0Layers : []),
    ...(Array.isArray(area?.ruinLayers) ? area.ruinLayers : []),
  ].filter(Boolean);
}

function cityAreaClearCostEntries(area) {
  const cost = area?.unlock?.clearCost
    ?? area?.unlock?.ruinClearCost
    ?? area?.clearCost
    ?? area?.ruinClearCost
    ?? {};
  return cityCostResourceEntries(cost);
}

function cityAreaUsesLevelZeroUnlock(area) {
  return cityAreaRawLockedLayerUrls(area).length > 0 && cityAreaClearCostEntries(area).length > 0;
}

function cityAreaLockedLayerUrls(area) {
  return cityAreaUsesLevelZeroUnlock(area) ? cityAreaRawLockedLayerUrls(area) : [];
}

function normalizeCityMobs(cityMobs = []) {
  if (!Array.isArray(cityMobs)) return [];
  const normalized = cityMobs
    .filter((mob) => mob && mob.areaId)
    .map((mob) => {
      const area = CITY_AREAS.find((entry) => entry.id === mob.areaId);
      const center = cityAreaCenter(area);
      const poolEntry = CITY_MOB_POOL.find((entry) => entry.type === mob.mobType);
      const hasSavedVisits = mob.visitsActive !== undefined || mob.turnsActive !== undefined;
      const breachState = mob.breachState === "inside" || mob.occupiedAreaId || mob.occupiedBuildingId
        ? "inside"
        : "outside";
      return {
        id: String(mob.id || `${mob.areaId}-${mob.mobType}-${Math.round((mob.x ?? center.x) * 10)}-${Math.round((mob.y ?? center.y) * 10)}`),
        areaId: String(mob.areaId),
        mobType: String(mob.mobType || "Skeleton"),
        level: Math.max(1, Math.min(CITY_MOB_MAX_LEVEL, Math.floor(Number(mob.level) || 1))),
        count: Math.max(1, Math.floor(Number(mob.count) || 1)),
        visitsActive: Math.max(0, Math.floor(Number(hasSavedVisits ? (mob.visitsActive ?? mob.turnsActive) : 1) || 0)),
        breachState,
        occupiedAreaId: mob.occupiedAreaId ? String(mob.occupiedAreaId) : null,
        occupiedBuildingId: mob.occupiedBuildingId ? String(mob.occupiedBuildingId) : null,
        occupationVisitsActive: Math.max(0, Math.floor(Number(mob.occupationVisitsActive) || 0)),
        occupationProfileId: mob.occupationProfileId ? String(mob.occupationProfileId) : null,
        raidProfileId: mob.raidProfileId ? String(mob.raidProfileId) : cityMobTypeEffectDef(mob.mobType)?.raidProfileId ?? null,
        lastRaidVisitId: mob.lastRaidVisitId ? String(mob.lastRaidVisitId) : null,
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
  const visualTargets = new Map();
  for (const mob of capped) {
    const target = cityMobVisualTarget(mob);
    const list = visualTargets.get(target.key) ?? [];
    list.push({ mob, target });
    visualTargets.set(target.key, list);
  }
  const positioned = new Map();
  for (const entries of visualTargets.values()) {
    const sorted = entries[0]?.target.occupied
      ? [...entries].sort((a, b) => a.mob.id.localeCompare(b.mob.id))
      : entries;
    sorted.forEach(({ mob, target }, index) => {
      const position = cityMobVisualOffsetPosition(target.position, index, sorted.length);
      positioned.set(mob.id, {
        ...mob,
        visualAreaId: target.areaId,
        visualTargetId: target.id,
        visualTargetType: target.type,
        visualTargetLabel: target.label,
        x: position.x,
        y: position.y,
      });
    });
  }
  return capped.map((mob) => positioned.get(mob.id) ?? mob);
}

function cityMapMobRefs(cityMobs = []) {
  return normalizeCityMobs(cityMobs);
}

function cityMobVisualTarget(mob) {
  const fallbackArea = CITY_AREAS.find((entry) => entry.id === mob?.areaId);
  const fallbackPosition = cityAreaCenter(fallbackArea);
  const fallback = {
    key: `source-area:${mob?.areaId ?? "unknown"}`,
    id: String(mob?.areaId ?? "unknown"),
    type: "area",
    occupied: false,
    areaId: fallbackArea?.id ?? String(mob?.areaId ?? ""),
    label: fallbackArea?.title ?? String(mob?.areaId || "Unknown area"),
    position: fallbackPosition,
  };
  if (mob?.breachState !== "inside") return fallback;

  // An occupied target is where the mob is causing trouble; areaId remains its attack/spawn path.
  if (mob.occupiedBuildingId) {
    const building = CITY_BUILDINGS.find((entry) => entry.id === mob.occupiedBuildingId);
    if (building) {
      const area = CITY_AREAS.find((entry) => (entry.buildings ?? []).some((ref) => (
        (typeof ref === "string" ? ref : ref?.id) === building.id
      )));
      const ref = area?.buildings?.find((entry) => (
        (typeof entry === "string" ? entry : entry?.id) === building.id
      ));
      const position = typeof ref === "object" && Number.isFinite(ref?.x) && Number.isFinite(ref?.y)
        ? { x: ref.x, y: ref.y }
        : area ? cityAreaCenter(area) : null;
      if (position) {
        return {
          key: `building:${building.id}`,
          id: building.id,
          type: "building",
          occupied: true,
          areaId: area?.id ?? null,
          label: building.title ?? building.id,
          position,
        };
      }
    }
  }

  if (mob.occupiedAreaId) {
    const area = CITY_AREAS.find((entry) => entry.id === mob.occupiedAreaId);
    if (area) {
      return {
        key: `occupied-area:${area.id}`,
        id: area.id,
        type: "area",
        occupied: true,
        areaId: area.id,
        label: area.title ?? area.id,
        position: cityAreaCenter(area),
      };
    }
  }
  return fallback;
}

function cityMobVisualOffsetPosition(center, index, count) {
  if (count <= 1) return center;
  const radius = Math.min(30, 18 + count * 3);
  const angle = ((Math.PI * 2) / count) * index - Math.PI / 2;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function cityMobVisualDiagnostics(cityMobs = []) {
  return cityMapMobRefs(cityMobs).map((mob) => ({
    id: mob.id,
    areaId: mob.areaId,
    breachState: mob.breachState,
    occupiedAreaId: mob.occupiedAreaId,
    occupiedBuildingId: mob.occupiedBuildingId,
    visualAreaId: mob.visualAreaId,
    visualTargetId: mob.visualTargetId,
    x: mob.x,
    y: mob.y,
  }));
}

function cityAttackableMobIds(cityMobs = []) {
  const result = new Set();
  const mobsByArea = new Map();
  const normalized = normalizeCityMobs(cityMobs);
  for (const mob of normalized) {
    mobsByArea.set(mob.areaId, [...(mobsByArea.get(mob.areaId) ?? []), mob]);
  }
  for (const path of CITY_SPAWN_PATHS) {
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const areaId = path[index];
      const mobs = mobsByArea.get(areaId) ?? [];
      if (!mobs.length) continue;
      if (cityAttackAreaBlocked(areaId, mobsByArea)) break;
      for (const mob of mobs) result.add(mob.id);
      break;
    }
  }
  return result;
}

function cityAttackAreaBlocked(areaId, mobsByArea) {
  const rules = CITY_ATTACK_AREA_RULES[areaId] ?? {};
  if (Array.isArray(rules.blockedByOccupiedAreas)) {
    return rules.blockedByOccupiedAreas.some((blockedByAreaId) => (mobsByArea.get(blockedByAreaId) ?? []).length > 0);
  }
  return false;
}

function cityMobTypeEffectDef(mobType) {
  return CITY_MOB_TYPE_EFFECTS[mobType] ?? CITY_MOB_TYPE_EFFECTS.default ?? {};
}

function cityMobDisplayName(mob) {
  return cityMobTypeEffectDef(mob?.mobType).label ?? String(mob?.mobType || "City threat");
}

function cityMobAreaLabel(mob) {
  const area = CITY_AREAS.find((entry) => entry.id === mob?.areaId);
  return area?.title ?? String(mob?.areaId || "Unknown area");
}

function cityMobZoneKind(areaId = "") {
  const raw = String(areaId).toLowerCase();
  if (raw.includes("close")) return "close";
  if (raw.includes("bridge")) return "bridge";
  if (raw.includes("corner")) return "corner";
  if (raw.includes("edge")) return "edge";
  if (raw.includes("border")) return "border";
  return "border";
}

function cityMobAgeEffectMultiplier(mob) {
  return Math.max(0, Math.floor(Number(mob?.visitsActive) || 0)) <= 0
    ? Number(CITY_MOB_BALANCE.newMobWarningEffectMultiplier) || 0.35
    : 1;
}

function cityMobLevelEffectMultiplier(mob) {
  const level = Math.max(1, Math.min(CITY_MOB_MAX_LEVEL, Math.floor(Number(mob?.level) || 1)));
  return Number(CITY_MOB_BALANCE.levelEffectMultiplierByLevel?.[level]) || 1;
}

function cityMobStatPenalties(mob) {
  const effects = cityMobTypeEffectDef(mob?.mobType).cityStats ?? {};
  const multiplier = cityMobLevelEffectMultiplier(mob) * cityMobAgeEffectMultiplier(mob);
  const penalties = {};
  for (const [rawId, rawAmount] of Object.entries(effects)) {
    const statId = normalizeCityStatId(rawId);
    if (!statId || statId === "population") continue;
    const amount = Math.round((Number(rawAmount) || 0) * multiplier);
    if (amount === 0) continue;
    penalties[statId] = (penalties[statId] ?? 0) + amount;
  }
  return penalties;
}

function cityMobStatPenaltyEntries(mob) {
  return Object.entries(cityMobStatPenalties(mob)).map(([statId, amount]) => ({
    statId,
    label: cityStatLabel(statId),
    amount,
  }));
}

function cityMobStatPenaltyTotals(progress = {}) {
  return mergeCityStatEffects(normalizeCityMobs(progress?.cityMobs).map(cityMobStatPenalties));
}

function cityMobStatBreakdownGroups(progress = {}) {
  const groups = new Map();
  for (const mob of normalizeCityMobs(progress?.cityMobs)) {
    const areaLabel = cityMobAreaLabel(mob);
    const level = Math.max(1, Math.floor(Number(mob.level) || 1));
    const label = cityMobDisplayName(mob);
    for (const [statId, amount] of Object.entries(cityMobStatPenalties(mob))) {
      const key = `${statId}|${label}|${areaLabel}|${level}`;
      const current = groups.get(key) ?? { statId, label, areaLabel, level, amount: 0, count: 0 };
      current.amount += Math.floor(Number(amount) || 0);
      current.count += 1;
      groups.set(key, current);
    }
  }
  return [...groups.values()];
}

function cityMobSpreadChance(mob) {
  const level = Math.max(1, Math.min(CITY_MOB_MAX_LEVEL, Math.floor(Number(mob?.level) || 1)));
  return Number(CITY_MOB_BALANCE.spreadChanceByLevel?.[level] ?? CITY_MOB_LEVELS[level]?.spreadChance ?? 0) || 0;
}

function cityMobEscalationText(mob) {
  const visitsActive = Math.max(0, Math.floor(Number(mob?.visitsActive) || 0));
  const minLevel = Math.max(0, Math.floor(Number(CITY_MOB_BALANCE.minVisitsBeforeLevelUp) || 0));
  const minSpread = Math.max(0, Math.floor(Number(CITY_MOB_BALANCE.minVisitsBeforeSpread) || 0));
  const levelChance = Math.round((Number(CITY_MOB_BALANCE.levelUpChancePerVisit) || CITY_MOB_LEVEL_UP_CHANCE) * 100);
  const spreadChance = Math.round(cityMobSpreadChance(mob) * 100);
  const levelText = visitsActive < minLevel ? `level-up after ${minLevel - visitsActive} more visit` : `${levelChance}% level-up per visit`;
  const spreadText = Math.max(1, Math.floor(Number(mob?.level) || 1)) < 3
    ? "spread starts at level 3"
    : visitsActive < minSpread
      ? `spread after ${minSpread - visitsActive} more visit`
      : `${spreadChance}% spread per visit`;
  return `${levelText}; ${spreadText}`;
}

function cityMobDurabilityThreatText(mob) {
  const targetAreaId = CITY_SPAWN_AREA_BUILDING_TARGETS[mob?.areaId];
  if (!targetAreaId) return "";
  const target = CITY_AREAS.find((entry) => entry.id === targetAreaId);
  const zone = cityMobZoneKind(mob?.areaId);
  const multiplier = Number(CITY_MOB_BALANCE.zoneDamageMultiplier?.[zone]) || 0;
  if (multiplier <= 0) return "";
  const baseDamage = Number(CITY_MOB_BALANCE.durabilityDamagePerLevelPct ?? CITY_MOB_DAMAGE_PER_LEVEL_PCT) || 0;
  const damage = baseDamage * Math.max(1, Number(mob?.level) || 1) * Math.max(1, Number(mob?.count) || 1) * multiplier;
  return `${target?.title ?? targetAreaId} durability -${damage.toFixed(2)}% per visit`;
}

function cityMobRecoveryText(mob) {
  const durabilityThreat = cityMobDurabilityThreatText(mob);
  const occupation = cityMobOccupationEntry(mob);
  if (occupation) return "Clearing this threat restores the occupied city function. Any storage already lost stays lost.";
  return durabilityThreat
    ? "Clearing this threat removes its stat penalties. Durability damage already done must still be repaired."
    : "Clearing this threat immediately restores its city stat penalties.";
}

function cityMobTags(mobOrType) {
  const type = typeof mobOrType === "string" ? mobOrType : mobOrType?.mobType;
  return new Set((cityMobTypeEffectDef(type).tags ?? []).map(String));
}

function cityMobCanUseOccupationProfile(mob, profile) {
  if (!profile) return false;
  const tags = cityMobTags(mob);
  const allowed = profile.allowedMobTags ?? [];
  if (!allowed.length) return true;
  return allowed.some((tag) => tags.has(String(tag)));
}

function cityMobOccupationProfile(profileId) {
  return CITY_MOB_OCCUPATION_PROFILES?.[profileId] ?? null;
}

function cityMobOccupationEntry(mob) {
  if (!mob || mob.breachState !== "inside") return null;
  const profile = cityMobOccupationProfile(mob.occupationProfileId);
  if (!profile) return null;
  const building = mob.occupiedBuildingId
    ? CITY_BUILDINGS.find((entry) => entry.id === mob.occupiedBuildingId)
    : null;
  const area = mob.occupiedAreaId
    ? CITY_AREAS.find((entry) => entry.id === mob.occupiedAreaId)
    : null;
  return {
    mob,
    profile,
    profileId: mob.occupationProfileId,
    building,
    area,
    targetLabel: building?.title ?? area?.title ?? "Inner city",
  };
}

function cityMobOccupationEntries(progress = {}) {
  return normalizeCityMobs(progress?.cityMobs)
    .map(cityMobOccupationEntry)
    .filter(Boolean);
}

function cityMobOccupationForBuilding(progress = {}, buildingId) {
  const id = String(buildingId ?? "");
  if (!id) return null;
  return cityMobOccupationEntries(progress).find((entry) => String(entry.mob.occupiedBuildingId ?? "") === id) ?? null;
}

function cityMobOccupationForArea(progress = {}, areaId) {
  const id = String(areaId ?? "");
  if (!id) return null;
  return cityMobOccupationEntries(progress).find((entry) => String(entry.mob.occupiedAreaId ?? "") === id) ?? null;
}

function cityMobOccupationConsequences(mob) {
  const entry = cityMobOccupationEntry(mob);
  if (!entry) return [];
  const consequences = Array.isArray(entry.profile.consequences) ? entry.profile.consequences : [];
  const raidText = cityMobTheftRiskText(mob);
  return raidText ? [...consequences, `Theft risk: ${raidText}`] : consequences;
}

function cityMobTheftRiskText(mob) {
  const raidProfileId = mob?.raidProfileId ?? cityMobTypeEffectDef(mob?.mobType).raidProfileId;
  const profile = CITY_MOB_THEFT_PROFILES?.[raidProfileId];
  if (!profile) return "";
  const occupation = cityMobOccupationEntry(mob);
  if (!occupation?.profile?.runtimeModifiers?.storageRaidEnabled && occupation?.profileId !== "storage_raid") return "";
  return profile.label ?? "low";
}

function cityMobOccupationStatPenalties(progress = {}) {
  return mergeCityStatEffects(cityMobOccupationEntries(progress).map((entry) => entry.profile.cityStats ?? {}));
}

function cityMobOccupationRuntimeModifiers(progress = {}) {
  const modifiers = {};
  for (const entry of cityMobOccupationEntries(progress)) {
    mergeRuntimeModifierValues(modifiers, entry.profile.runtimeModifiers ?? {});
  }
  return modifiers;
}

function mergeRuntimeModifierValues(target, source = {}) {
  const multiplicative = new Set([
    "merchantBuyPriceMultiplier",
    "merchantSellPriceMultiplier",
    "merchantStockMultiplier",
    "repairCostMultiplier",
    "craftingCostMultiplier",
    "armyRecruitmentCostMultiplier",
    "sanctuaryDonationMultiplier",
    "innRumorMultiplier",
    "townHallBoardQuestMultiplier",
  ]);
  for (const [key, value] of Object.entries(source ?? {})) {
    if (multiplicative.has(key)) {
      target[key] = (Number(target[key]) || 1) * (Number(value) || 1);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function cityMobOccupationStatusText(mob) {
  const occupation = cityMobOccupationEntry(mob);
  if (occupation) return `Occupying: ${occupation.targetLabel}`;
  if (mob?.breachState === "inside") {
    const building = mob.occupiedBuildingId
      ? CITY_BUILDINGS.find((entry) => entry.id === mob.occupiedBuildingId)
      : null;
    const area = mob.occupiedAreaId
      ? CITY_AREAS.find((entry) => entry.id === mob.occupiedAreaId)
      : null;
    const targetLabel = building?.title ?? area?.title;
    return targetLabel ? `Occupying: ${targetLabel}` : "Inside the city";
  }
  return cityMobZoneKind(mob?.areaId) === "close" ? "At the city wall" : "Outside the city";
}

function pickCityBattleRegion(mobType, mapSize = "small", areaId = null, target = {}) {
  const occupiedBuildingId = target?.occupiedBuildingId ?? null;
  const occupiedAreaId = target?.occupiedAreaId ?? null;
  const cityProfiles = cityMobBattleProfilesForTarget({
    buildingId: occupiedBuildingId,
    areaId: occupiedAreaId,
    spawnZoneId: areaId,
  });
  if (cityProfiles.length > 0) {
    const profile = cityProfiles[Math.floor(Math.random() * cityProfiles.length)];
    const region = buildCityMobBattleRegion(profile, {
      areaId,
      mobType,
      mapSize,
      occupiedAreaId,
      occupiedBuildingId,
    });
    const battleTargetId = occupiedBuildingId ?? occupiedAreaId ?? areaId;
    if (region) return { areaMapId: `citymob:${battleTargetId}`, region };
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

function applyCityMobProgressForVisit(progress = {}, cityStats = {}) {
  let next = {
    ...progress,
    threatLevel: Math.max(0, Math.min(100, Number(progress.threatLevel) || 0)),
    cityMobs: normalizeCityMobs(progress.cityMobs),
  };

  next = applyCityMobLevelAndSpread(next);
  next = applyCityMobNewSpawns(next, cityStats);
  next = applyCityMobInsideMoves(next);
  next = applyCityMobStorageRaids(next);
  next = applyCityMobBuildingDamage(next, cityStats);
  return next;
}

function applyCityMobLevelAndSpread(progress = {}) {
  const currentMobs = normalizeCityMobs(progress.cityMobs);
  const activeMobs = currentMobs.map((mob) => ({
    ...mob,
    visitsActive: Math.max(0, Math.floor(Number(mob.visitsActive) || 0)) + 1,
  }));
  const nextMobs = [...activeMobs];
  const areaCounts = cityMobAreaCounts(activeMobs);
  const maxMobs = Math.max(1, Math.floor(Number(CITY_MOB_BALANCE.maxActiveCityMobs) || 12));

  for (const mob of activeMobs) {
    if (
      mob.visitsActive >= (Number(CITY_MOB_BALANCE.minVisitsBeforeLevelUp) || 0)
      && Math.random() < (Number(CITY_MOB_BALANCE.levelUpChancePerVisit) || CITY_MOB_LEVEL_UP_CHANCE)
    ) {
      mob.level = Math.min(CITY_MOB_MAX_LEVEL, mob.level + 1);
      mob.count = cityMobCountForLevel(mob.level);
    }
    if (nextMobs.length >= maxMobs) continue;
    if (
      mob.level < 3
      || mob.visitsActive < (Number(CITY_MOB_BALANCE.minVisitsBeforeSpread) || 0)
      || Math.random() >= cityMobSpreadChance(mob)
    ) continue;

    const spreadTargets = CITY_SPAWN_SPREAD_TARGETS[mob.areaId] ?? [];
    const candidates = spreadTargets.filter((areaId) => (
      cityMobAreaHasRoom(areaCounts, areaId)
      && citySpawnAreaEligible(progress, activeMobs, areaId)
    ));
    if (!candidates.length) continue;
    const targetAreaId = candidates[Math.floor(Math.random() * candidates.length)];
    const spawn = createCityMobGroup(targetAreaId, mob.mobType, 1);
    nextMobs.push(spawn);
    areaCounts.set(targetAreaId, (areaCounts.get(targetAreaId) ?? 0) + 1);
  }

  return { ...progress, cityMobs: nextMobs };
}

function applyCityMobNewSpawns(progress = {}, cityStats = {}) {
  const threatLevel = Number(progress.threatLevel) || 0;
  const maxNewMobs = Math.max(0, Math.floor(Number(getMaxNewCityMobsPerVisit(threatLevel)) || 0));
  if (maxNewMobs <= 0) return progress;
  const spawnChance = Math.min(1, calcCitySpawnChance(threatLevel) * (cityRuntimeModifiers(cityStats).cityMobSpawnChanceMultiplier ?? 1));
  if (spawnChance <= 0) return progress;
  const currentMobs = normalizeCityMobs(progress.cityMobs);
  const maxMobs = Math.max(1, Math.floor(Number(CITY_MOB_BALANCE.maxActiveCityMobs) || 12));
  if (currentMobs.length >= maxMobs) return progress;
  const nextMobs = [...currentMobs];
  let spawnedThisVisit = 0;

  const spawnAreas = citySpawnCandidatesForNewSpawn(progress, currentMobs);

  for (const areaId of spawnAreas) {
    if (nextMobs.length >= maxMobs) break;
    if (spawnedThisVisit >= maxNewMobs) break;
    if (Math.random() >= spawnChance) continue;
    const mobType = pickCityMobType();
    const spawn = createCityMobGroup(areaId, mobType, 1);
    nextMobs.push(spawn);
    spawnedThisVisit += 1;
  }
  return { ...progress, cityMobs: nextMobs };
}

function applyCityMobInsideMoves(progress = {}) {
  const currentMobs = normalizeCityMobs(progress.cityMobs);
  if (!currentMobs.length || isCityWallBlocking(progress)) return progress;
  let changed = false;
  const nextMobs = currentMobs.map((mob) => {
    if (mob.breachState === "inside") {
      const occupationVisitsActive = Math.max(0, Math.floor(Number(mob.occupationVisitsActive) || 0)) + 1;
      if (occupationVisitsActive === mob.occupationVisitsActive) return mob;
      changed = true;
      return { ...mob, occupationVisitsActive };
    }
    if (cityMobZoneKind(mob.areaId) !== "close") return mob;
    if (Math.max(0, Math.floor(Number(mob.visitsActive) || 0)) < (Number(CITY_MOB_BALANCE.minVisitsBeforeInsideMove) || 0)) return mob;
    const level = Math.max(1, Math.min(CITY_MOB_MAX_LEVEL, Math.floor(Number(mob.level) || 1)));
    const chance = Number(CITY_MOB_BALANCE.insideMoveChanceByLevel?.[level]) || 0;
    if (chance <= 0 || Math.random() >= chance) return mob;
    const target = pickCityMobOccupationTarget(progress, mob);
    if (!target) return mob;
    changed = true;
    return {
      ...mob,
      breachState: "inside",
      occupiedAreaId: target.areaId ?? null,
      occupiedBuildingId: target.buildingId ?? null,
      occupationProfileId: target.profileId,
      raidProfileId: mob.raidProfileId ?? cityMobTypeEffectDef(mob.mobType)?.raidProfileId ?? null,
      occupationVisitsActive: 0,
    };
  });
  return changed ? { ...progress, cityMobs: nextMobs } : progress;
}

function pickCityMobOccupationTarget(progress = {}, mob) {
  const candidates = [];
  for (const target of CITY_MOB_OCCUPATION_TARGETS ?? []) {
    const profileId = String(target.profileId ?? "");
    const profile = cityMobOccupationProfile(profileId);
    if (!profile || !cityMobCanUseOccupationProfile(mob, profile)) continue;
    for (const buildingId of profile.buildingIds ?? []) {
      const building = CITY_BUILDINGS.find((entry) => entry.id === buildingId);
      if (!building || !isCityBuildingOwned(progress, building)) continue;
      if (cityMobOccupationForBuilding(progress, building.id)) continue;
      candidates.push({
        profileId,
        buildingId: building.id,
        weight: Math.max(1, Number(target.weight) || 1),
      });
    }
    for (const areaId of profile.areaIds ?? []) {
      const area = CITY_AREAS.find((entry) => entry.id === areaId);
      if (!area || !isCityAreaUnlockedById(progress, area.id)) continue;
      if (cityMobOccupationForArea(progress, area.id)) continue;
      candidates.push({
        profileId,
        areaId: area.id,
        weight: Math.max(1, Number(target.weight) || 1),
      });
    }
  }
  if (!candidates.length) return null;
  const total = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of candidates) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return candidates[candidates.length - 1];
}

function applyCityMobStorageRaids(progress = {}) {
  if (CITY_MOB_THEFT_CONFIG.enabled === false) return progress;
  const mobs = normalizeCityMobs(progress.cityMobs);
  if (!mobs.length) return progress;
  let next = progress;
  const logs = [];
  for (const mob of mobs) {
    const occupation = cityMobOccupationEntry(mob);
    if (!occupation?.profile?.runtimeModifiers?.storageRaidEnabled && occupation?.profileId !== "storage_raid") continue;
    if (Math.max(0, Math.floor(Number(mob.occupationVisitsActive) || 0)) <= 0) continue;
    const raidProfileId = mob.raidProfileId ?? cityMobTypeEffectDef(mob.mobType)?.raidProfileId;
    const raidProfile = CITY_MOB_THEFT_PROFILES?.[raidProfileId];
    if (!raidProfile) continue;
    const chance = Number(CITY_MOB_THEFT_CONFIG.chancePerOccupiedMobPerVisit) || 0;
    if (chance <= 0 || Math.random() >= chance) continue;
    const result = applyCityMobStorageRaid(next, mob, occupation, raidProfile);
    if (!result.stolen.length) continue;
    next = result.progress;
    logs.push(...result.stolen);
  }
  if (!logs.length) return next;
  const limit = Math.max(1, Math.floor(Number(CITY_MOB_THEFT_CONFIG.logLimit) || 8));
  return {
    ...next,
    cityMobRaidLog: [...logs, ...(Array.isArray(next.cityMobRaidLog) ? next.cityMobRaidLog : [])].slice(0, limit),
  };
}

function applyCityMobStorageRaid(progress = {}, mob, occupation, raidProfile = {}) {
  const maxStacks = Math.max(1, Math.floor(Number(raidProfile.maxStacks ?? CITY_MOB_THEFT_CONFIG.maxStacksPerMobPerVisit) || 1));
  const maxCount = Math.max(1, Math.floor(Number(raidProfile.maxItemCountPerStack ?? CITY_MOB_THEFT_CONFIG.maxItemCountPerStack) || 1));
  let nextProgress = progress;
  const stolen = [];
  for (const building of CITY_BUILDINGS) {
    if (stolen.length >= maxStacks) break;
    const state = getCityBuildingState(nextProgress, building);
    if ((state.level ?? 0) <= 0) continue;
    const sections = cityPaymentInventorySections(building, state);
    if (!sections.length) continue;
    const inventories = cityPaymentInventoriesForBuilding(state, building);
    let changed = false;
    const nextInventories = { ...inventories };
    for (const section of sections) {
      if (stolen.length >= maxStacks) break;
      if (section.cityCostAccess === false) continue;
      const items = [...(nextInventories[section.key] ?? [])];
      for (let index = 0; index < items.length && stolen.length < maxStacks; index += 1) {
        const item = items[index];
        if (!canCityMobStealItem(item, null, raidProfile, CITY_MOB_THEFT_CONFIG)) continue;
        const count = Math.max(1, Math.floor(Number(item.count) || 1));
        const amount = Math.min(count, maxCount);
        const remaining = count - amount;
        items[index] = remaining > 0 ? { ...item, count: remaining } : null;
        changed = true;
        stolen.push({
          id: `raid-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          mobId: mob.id,
          mobName: cityMobDisplayName(mob),
          targetLabel: occupation.targetLabel,
          itemName: item.name ?? item.resourceId ?? item.baseName ?? "stored item",
          amount,
          mode: raidProfile.mode ?? "steal",
        });
      }
      nextInventories[section.key] = items;
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
  return { progress: nextProgress, stolen };
}

function applyCityMobBuildingDamage(progress = {}, cityStats = {}) {
  const mobs = normalizeCityMobs(progress.cityMobs);
  if (!mobs.length) return progress;
  const damageMultiplier = cityRuntimeModifiers(cityStats).cityDurabilityDamageMultiplier ?? 1;
  let next = progress;
  for (const mob of mobs) {
    if (Math.max(0, Math.floor(Number(mob.visitsActive) || 0)) < (Number(CITY_MOB_BALANCE.minVisitsBeforeDurabilityDamage) || 0)) continue;
    const targetAreaId = CITY_SPAWN_AREA_BUILDING_TARGETS[mob.areaId];
    if (!targetAreaId) continue;
    const zoneMultiplier = Number(CITY_MOB_BALANCE.zoneDamageMultiplier?.[cityMobZoneKind(mob.areaId)]) || 0;
    if (zoneMultiplier <= 0) continue;
    const targetArea = CITY_AREAS.find((entry) => entry.id === targetAreaId);
    if (!targetArea) continue;
    const state = getCityAreaState(next, targetArea);
    if (!state.unlocked) continue;
    const rawDurability = Number(state.durability ?? DURABILITY_DEFAULT);
    const currentDurability = Math.max(0, Math.min(100, Number.isFinite(rawDurability) ? rawDurability : DURABILITY_DEFAULT));
    const baseDamage = Number(CITY_MOB_BALANCE.durabilityDamagePerLevelPct ?? CITY_MOB_DAMAGE_PER_LEVEL_PCT) || 0;
    const damage = baseDamage * mob.level * Math.max(1, mob.count) * zoneMultiplier * damageMultiplier;
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
    if (isCityAreaBlockingById(progress, towerId)) return false;
  }

  if (rules.requiresNoCityWall) {
    if (isCityWallBlocking(progress)) return false;
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

function isCityAreaBlockingById(progress = {}, areaId) {
  if (!areaId) return false;
  const area = CITY_AREAS.find((entry) => entry.id === areaId);
  if (!area) return false;
  const state = getCityAreaState(progress, area);
  if (!state.unlocked) return false;
  const durability = Math.max(0, Math.min(100, Number(state.durability ?? DURABILITY_DEFAULT) || 0));
  return durability > 0;
}

function isCityWallBlocking(progress = {}) {
  return isCityAreaBlockingById(progress, "city_wall");
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
    visitsActive: 0,
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
  if (cityAreaLockedLayerUrls(area).length > 0) return [];
  return [
    area?.builtLayer,
    ...(Array.isArray(area?.builtLayers) ? area.builtLayers : []),
    ...cityReachedLevels(area, 1).flatMap((level) => [
      level?.builtLayer,
      ...(Array.isArray(level?.builtLayers) ? level.builtLayers : []),
    ]),
  ].filter(Boolean);
}

function cityAreaNextPreviewLayerUrls(area, progress) {
  const state = getCityAreaState(progress, area);
  if (!state.unlocked) return cityAreaPreviewLayerUrls(area);
  const nextLevel = cityAreaNextLevel(area, state.level);
  if (!nextLevel) return [];
  return [
    nextLevel?.builtLayer,
    ...(Array.isArray(nextLevel?.builtLayers) ? nextLevel.builtLayers : []),
  ].filter(Boolean);
}

function getCityAreaState(progress, area) {
  if (!area?.id) return { unlocked: false, level: 0, durability: DURABILITY_DEFAULT };
  if (cityConfigEntryOwnedFromStart(area)) {
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
  const savedLevel = saved.level === undefined ? 1 : Math.max(0, Math.floor(Number(saved.level) || 0));
  return {
    ...saved,
    unlocked: Boolean(saved.unlocked),
    level: saved.unlocked ? savedLevel : 0,
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
    .filter((addon) => cityConfigEntryOwnedFromStart(addon))
    .map((addon) => addon.id);
  const legacyAddons = Array.isArray(saved.addons) ? saved.addons : [];
  const purchasedAddons = [
    ...(Array.isArray(saved.purchasedAddons) ? saved.purchasedAddons : []),
    ...legacyAddons,
  ];
  return {
    ...saved,
    level: cityConfigEntryOwnedFromStart(building) ? Math.max(1, saved.level ?? 0) : (saved.level ?? 0),
    paid: saved.paid ?? {},
    durability: saved.durability ?? DURABILITY_DEFAULT,
    purchasedAddons: [...new Set(purchasedAddons)],
    addons: [...new Set([...prebuiltAddons, ...purchasedAddons])],
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

function cityAreaForBuilding(buildingId) {
  const id = String(buildingId ?? "");
  if (!id) return null;
  return CITY_AREAS.find((area) => (
    (area?.buildings ?? []).some((entry) => String(typeof entry === "string" ? entry : entry?.id) === id)
  )) ?? null;
}

function getCityMapQuestNpcs(cityNpcStates = [], showInactive = SHOW_INACTIVE_CITY_NPCS, seed = 0) {
  const stateByNpc = new Map((cityNpcStates ?? []).map((entry) => [entry.npcId, entry]));
  const candidates = Object.entries(QUEST_NPCS).flatMap(([npcId, npc]) => {
    if (npc?.citySpawn === false) return [];
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

function cityMapPositionStyle(x, y, edgeInset = 0) {
  const left = `${(x / CITY_MAP_IMAGE.width) * 100}%`;
  const top = `${(y / CITY_MAP_IMAGE.height) * 100}%`;
  if (edgeInset > 0) {
    return {
      left: `clamp(${edgeInset}px, ${left}, calc(100% - ${edgeInset}px))`,
      top: `clamp(${edgeInset}px, ${top}, calc(100% - ${edgeInset}px))`,
    };
  }
  return {
    left,
    top,
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
  return cityCostResourceEntries(cost);
}

function cityAreaUnlockCostEntries(area) {
  return cityAreaUsesLevelZeroUnlock(area) ? cityAreaClearCostEntries(area) : cityAreaCostEntries(area);
}

function cityCostResourceEntries(cost = {}) {
  const resources = {
    ...(cost?.resources ?? {}),
    ...(cost?.gold !== undefined ? { gold: cost.gold } : {}),
  };
  for (const [key, value] of Object.entries(cost ?? {})) {
    if (["resources", "items"].includes(key)) continue;
    if (value && typeof value === "object") continue;
    resources[key] = value;
  }
  return Object.entries(resources)
    .map(([resourceId, amount]) => [resourceId, Math.max(0, Math.floor(Number(amount) || 0))])
    .filter(([, amount]) => amount > 0);
}

function cityCostItemEntries(cost = {}) {
  const items = Array.isArray(cost?.items) ? cost.items : [];
  return items
    .map((entry) => ({ ...entry, count: Math.max(1, Math.floor(Number(entry?.count) || 1)) }))
    .filter((entry) => entry.count > 0);
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
  if (!area || cityConfigEntryOwnedFromStart(area)) return false;
  const gatesMet = cityAreaGateEntries(area, snapshot, cityStats).every((entry) => entry.met);
  if (!gatesMet) return false;
  return cityAreaUnlockCostEntries(area).every(([resourceId, amount]) => cityCostAvailable(snapshot, resourceId, progress) >= amount);
}

function payCityAreaUnlockCost(area, engine, snapshot) {
  return payCityCostEntries(cityAreaUnlockCostEntries(area), engine, snapshot);
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

function cityItemCostAvailable(snapshot, req) {
  return cityAreaRequiredItemCount(snapshot, req);
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

function cityItemCostLabel(req) {
  return cityAreaItemRequirementLabel(req);
}

function consumeCityItemCostEntries(entries = [], engine) {
  if (!engine || !Array.isArray(entries) || entries.length === 0) return entries.length === 0;
  for (const req of entries) {
    const needed = Math.max(1, Math.floor(Number(req?.count) || 1));
    if (cityItemCostAvailable({ inventory: engine.player?.inventory ?? [] }, req) < needed) return false;
  }
  for (const req of entries) {
    let remaining = Math.max(1, Math.floor(Number(req?.count) || 1));
    for (let index = (engine.player?.inventory?.length ?? 0) - 1; index >= 0 && remaining > 0; index -= 1) {
      const item = engine.player.inventory[index];
      if (!itemMatchesCityAreaRequirement(item, req)) continue;
      const count = Math.max(1, Math.floor(Number(item.count) || 1));
      const used = Math.min(count, remaining);
      remaining -= used;
      if (count > used) item.count = count - used;
      else engine.player.inventory.splice(index, 1);
    }
  }
  engine.publishSnapshot?.();
  return true;
}

function normalizeIdListState(value, key = "ids") {
  if (Array.isArray(value)) return { [key]: [...new Set(value.map(String).filter(Boolean))] };
  if (!value || typeof value !== "object") return { [key]: [] };
  return {
    ...value,
    [key]: [...new Set((Array.isArray(value[key]) ? value[key] : []).map(String).filter(Boolean))],
  };
}

function normalizeCityArtifacts(value = {}) {
  return normalizeIdListState(value, "boughtIds");
}

function normalizeCityPolicies(value = {}) {
  const normalized = normalizeIdListState(value, "activeIds");
  return {
    ...normalized,
    // Save/backfill conflict cleanup: keep the first active policy id in save order
    // and drop later active policies that conflict with already-kept policies.
    activeIds: normalizeCityPolicyActiveIds(normalized.activeIds),
  };
}

function normalizeCityPolicyActiveIds(activeIds = []) {
  const kept = [];
  for (const rawId of Array.isArray(activeIds) ? activeIds : []) {
    const policyId = String(rawId || "");
    if (!policyId) continue;
    if (kept.some((activeId) => cityPoliciesConflict(policyId, activeId))) continue;
    kept.push(policyId);
  }
  return kept;
}

function normalizeCityAchievements(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    unlockedLevelById: Object.fromEntries(Object.entries(source.unlockedLevelById ?? {})
      .map(([id, level]) => [String(id), Math.max(0, Math.floor(Number(level) || 0))])),
    counters: Object.fromEntries(Object.entries(source.counters ?? {})
      .map(([id, count]) => [String(id), Math.max(0, Math.floor(Number(count) || 0))])),
  };
}

function cityArtifactBoughtIds(progress = {}) {
  return new Set(normalizeCityArtifacts(progress?.artifacts).boughtIds);
}

function cityPolicyActiveIds(progress = {}) {
  return new Set(normalizeCityPolicies(progress?.policies).activeIds);
}

function cityPolicyById(policyId) {
  const id = String(policyId ?? "");
  return CITY_POLICIES.find((policy) => String(policy.id) === id) ?? null;
}

function cityPolicyExclusiveIds(policy = {}) {
  return normalizeRequirementIds(policy?.exclusiveWith);
}

function cityPoliciesConflict(policyIdA, policyIdB) {
  const idA = String(policyIdA ?? "");
  const idB = String(policyIdB ?? "");
  if (!idA || !idB || idA === idB) return false;
  const policyA = cityPolicyById(idA);
  const policyB = cityPolicyById(idB);
  return cityPolicyExclusiveIds(policyA).includes(idB) || cityPolicyExclusiveIds(policyB).includes(idA);
}

function cityPolicyExclusiveEntries(policy = {}, progress = {}) {
  const active = cityPolicyActiveIds(progress);
  return [...active]
    .filter((activeId) => cityPoliciesConflict(policy.id, activeId))
    .map((activeId) => {
      const activePolicy = cityPolicyById(activeId);
      const policyNamesActive = cityPolicyExclusiveIds(activePolicy).includes(policy.id);
      const currentPolicyNamesActive = cityPolicyExclusiveIds(policy).includes(activeId);
      return {
        key: `exclusive:${activeId}`,
        id: activeId,
        label: activePolicy?.title ?? activeId,
        reason: currentPolicyNamesActive && policyNamesActive
          ? `${policy.title ?? policy.id} og ${activePolicy?.title ?? activeId} udelukker hinanden.`
          : currentPolicyNamesActive
            ? `${policy.title ?? policy.id} kan ikke bruges sammen med ${activePolicy?.title ?? activeId}.`
            : `${activePolicy?.title ?? activeId} udelukker ${policy.title ?? policy.id}.`,
      };
    });
}

function cityPolicyBlockedByExclusive(policy = {}, progress = {}) {
  return cityPolicyExclusiveEntries(policy, progress).length > 0;
}

function normalizeRequirementIds(value) {
  if (value === undefined || value === null) return [];
  return (Array.isArray(value) ? value : [value])
    .map(String)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function cityAreaName(areaId) {
  const id = String(areaId ?? "");
  return CITY_AREAS.find((area) => String(area.id) === id)?.title ?? id;
}

function cityPolicyRequirements(policy = {}) {
  const source = policy.requirements ?? policy.unlock ?? policy.conditions ?? {};
  return {
    buildings: normalizeRequirementIds(source.buildings ?? source.buildingIds ?? source.hasBuildings ?? source.hasBuilding),
    addons: normalizeRequirementIds(source.addons ?? source.addonIds ?? source.hasAddons ?? source.hasAddon),
    areas: normalizeRequirementIds(source.areas ?? source.areaIds ?? source.hasAreas ?? source.hasArea),
  };
}

function cityPolicyRequirementEntries(policy = {}, progress = {}) {
  const requirements = cityPolicyRequirements(policy);
  const entries = [];
  for (const buildingId of requirements.buildings) {
    const building = CITY_BUILDINGS.find((entry) => String(entry.id) === buildingId);
    const met = building ? (getCityBuildingState(progress, building).level ?? 0) > 0 : false;
    entries.push({ key: `building:${buildingId}`, type: "building", id: buildingId, label: building?.title ?? buildingId, met });
  }
  for (const addonId of requirements.addons) {
    let found = null;
    let met = false;
    for (const building of CITY_BUILDINGS) {
      const addon = (building.addons ?? []).find((entry) => String(entry.id) === addonId);
      if (!addon) continue;
      found = addon;
      const state = getCityBuildingState(progress, building);
      met = (state.level ?? 0) > 0 && (state.addons ?? []).map(String).includes(addonId);
      break;
    }
    entries.push({ key: `addon:${addonId}`, type: "addon", id: addonId, label: found?.title ?? addonId, met });
  }
  for (const areaId of requirements.areas) {
    const area = CITY_AREAS.find((entry) => String(entry.id) === areaId);
    const met = area ? getCityAreaState(progress, area).unlocked : false;
    entries.push({ key: `area:${areaId}`, type: "area", id: areaId, label: area?.title ?? areaId, met });
  }
  return entries;
}

function cityPolicyRequirementsMet(policy = {}, progress = {}) {
  return cityPolicyRequirementEntries(policy, progress).every((entry) => entry.met);
}

function cityArtifactEffects(progress = {}) {
  const bought = cityArtifactBoughtIds(progress);
  return mergeCityStatEffects(CITY_ARTIFACTS
    .filter((artifact) => bought.has(artifact.id))
    .map((artifact) => artifact.effects?.cityStats));
}

function cityPolicyEffects(progress = {}) {
  const active = cityPolicyActiveIds(progress);
  return mergeCityStatEffects(CITY_POLICIES
    .filter((policy) => active.has(policy.id) && cityPolicyRequirementsMet(policy, progress))
    .map((policy) => policy.effects?.cityStats));
}

function cityAchievementContext(progress = {}, snapshot = emptySnapshot, cityStats = {}) {
  return {
    player: snapshot?.player ?? {},
    inventory: snapshot?.inventory ?? [],
    questState: snapshot?.quests ?? {},
    worldState: snapshot?.worldState,
    worldEnergy: snapshot?.worldEnergy,
    cityStats,
    cityProgress: progress,
    cityStorage: progress,
  };
}

function cityAchievementUnlockedLevel(achievement, progress = {}, snapshot = emptySnapshot, cityStats = {}) {
  const levels = Array.isArray(achievement?.levels) ? achievement.levels : [];
  const context = cityAchievementContext(progress, snapshot, cityStats);
  let unlocked = 0;
  levels.forEach((level, index) => {
    if (worldEntryAllowed({ conditions: level.condition ?? level.conditions }, snapshot?.worldState, context)) {
      unlocked = index + 1;
    }
  });
  return unlocked;
}

function cityAchievementUnlockedLevels(progress = {}, snapshot = emptySnapshot, cityStats = {}) {
  return Object.fromEntries(CITY_ACHIEVEMENTS.map((achievement) => [
    achievement.id,
    cityAchievementUnlockedLevel(achievement, progress, snapshot, cityStats),
  ]));
}

function cityAchievementEffects(progress = {}, snapshot = emptySnapshot, cityStats = {}) {
  const levelsById = cityAchievementUnlockedLevels(progress, snapshot, cityStats);
  const effects = [];
  for (const achievement of CITY_ACHIEVEMENTS) {
    const unlocked = levelsById[achievement.id] ?? 0;
    if (unlocked <= 0) continue;
    for (const level of (achievement.levels ?? []).slice(0, unlocked)) {
      effects.push(level.effects?.cityStats ?? level.bonus?.cityStats);
    }
  }
  return mergeCityStatEffects(effects);
}

function syncCityAchievementState(progress = {}, snapshot = emptySnapshot, cityStats = {}) {
  const current = normalizeCityAchievements(progress?.achievements);
  const unlockedLevelById = cityAchievementUnlockedLevels(progress, snapshot, cityStats);
  let changed = false;
  for (const [id, level] of Object.entries(unlockedLevelById)) {
    if ((current.unlockedLevelById[id] ?? 0) !== level) changed = true;
  }
  if (!changed) return progress;
  return {
    ...progress,
    achievements: {
      ...current,
      unlockedLevelById,
    },
  };
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
  applyCityStatEffects(stats, normalizeCityTonicBoosts(progress?.cityTonicBoosts));
  applyCityStatEffects(stats, cityArtifactEffects(progress));
  applyCityStatEffects(stats, cityPolicyEffects(progress));
  for (const area of CITY_AREAS) {
    const state = getCityAreaState(progress, area);
    if (!state.unlocked) continue;
    const consequence = cityDurabilityConsequenceFor(state.durability);
    if (consequence?.disabled) continue;
    applyNonPopularityEffects(stats, scaleCityStatEffects(
      cityAreaActiveStatEffects(area, state.level),
      consequence?.buildingEfficiencyMultiplier ?? 1,
    ));
  }
  for (const building of CITY_BUILDINGS) {
    const state = getCityBuildingState(progress, building);
    if ((state.level ?? 0) <= 0) continue;
    const consequence = cityDurabilityConsequenceFor(state.durability);
    if (consequence?.disabled) continue;
    applyNonPopularityEffects(stats, scaleCityStatEffects(
      cityBuildingActiveStatEffects(building, state.level),
      consequence?.buildingEfficiencyMultiplier ?? 1,
    ));
    const purchasedAddons = new Set(state.addons ?? []);
    for (const addon of building.addons ?? []) {
      if (!purchasedAddons.has(addon.id)) continue;
      applyNonPopularityEffects(stats, scaleCityStatEffects(
        addon.statEffects ?? addon.effects?.cityStats,
        consequence?.addonEfficiencyMultiplier ?? 1,
      ));
    }
  }
  applyRegionCityStats(stats, regionCorruption, snapshot);
  applyCityStatEffects(stats, cityAchievementEffects(progress, snapshot, stats));
  applyNonPopularityEffects(stats, normalizeCityStatAdjustments(progress?.statAdjustments));
  applyCityStatEffects(stats, cityMobStatPenaltyTotals(progress));
  applyCityStatEffects(stats, cityMobOccupationStatPenalties(progress));
  stats.runtimeModifiers = cityMobOccupationRuntimeModifiers(progress);
  applyCurrentCityStatEffects(stats, progress);
  stats.runtimeModifiers = cityMobOccupationRuntimeModifiers(progress);
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
  for (const [statId, amount] of Object.entries(normalizeCityTonicBoosts(progress?.cityTonicBoosts))) {
    addEntry(statId, "City Tonics", amount);
  }
  for (const [statId, amount] of Object.entries(cityArtifactEffects(progress))) {
    addEntry(statId, "Monuments", amount);
  }
  for (const [statId, amount] of Object.entries(cityPolicyEffects(progress))) {
    addEntry(statId, "Policies", amount);
  }
  for (const [statId, amount] of Object.entries(cityAchievementEffects(progress, snapshot, {}))) {
    addEntry(statId, "Hall of Deeds", amount);
  }
  for (const [statId, amount] of Object.entries(normalizeCityStatAdjustments(progress?.statAdjustments))) {
    if (normalizeCityStatId(statId) === "popularity") continue;
    addEntry(statId, "City actions", amount);
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
  for (const group of cityMobStatBreakdownGroups(progress)) {
    const detail = `${group.areaLabel} Lv.${group.level}${group.count > 1 ? ` x${group.count}` : ""}`;
    addEntry(group.statId, group.count > 1 ? `${group.label} x${group.count}` : group.label, group.amount, detail);
  }
  for (const entry of cityMobOccupationEntries(progress)) {
    for (const [statId, amount] of Object.entries(entry.profile.cityStats ?? {})) {
      addEntry(statId, entry.profile.label ?? "City occupation", amount, entry.targetLabel);
    }
  }
  const population = Math.max(0, Math.floor(Number(finalStats.population) || 0));
  const healthNeedPenalty = Math.ceil(population * 0.15);
  if ((finalStats.ratios?.provision ?? 1) < 1) addEntry("health", "Low provision", -healthNeedPenalty, "Provision below city need");
  if ((finalStats.ratios?.water ?? 1) < 1) addEntry("health", "Low water", -healthNeedPenalty, "Water below city need");
  if (population > 0 && Math.max(0, Math.floor(Number(finalStats.knowledge) || 0)) >= population) addEntry("defense", "Knowledge threshold", 0, "+5% defense");
  if (population > 0 && Math.max(0, Math.floor(Number(finalStats.culture) || 0)) >= population) addEntry("popularity", "Culture threshold", 0, "+10% toward cap");
  const basePopularity = Math.max(0, Math.floor(Number(snapshot?.player?.popularity) || 0));
  const cityPopularityModifier = Math.floor(Number(finalStats.popularity) || 0) - basePopularity;
  if (cityPopularityModifier !== 0) addEntry("popularity", "City modifier", cityPopularityModifier, "Effective = base + city modifier");
  addEntry("maintenance", "Average durability", finalStats.maintenance, "Unlocked city areas and buildings");
  return breakdown;
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
    (events.famine?.active ? CITY_EVENT_RULES.famineUnavailablePopulationPct : 0)
    + (events.water_shortage?.active ? CITY_EVENT_RULES.waterShortageUnavailablePopulationPct : 0)
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
  const preNeeds = calculateCityStatNeeds(stats);
  const preRatios = calculateCityStatRatios(stats, preNeeds);
  let healthPenalty = 0;
  if ((preRatios.provision ?? 1) < 1) healthPenalty += Math.ceil(population * 0.15);
  if ((preRatios.water ?? 1) < 1) healthPenalty += Math.ceil(population * 0.15);
  stats.health = Math.max(0, Math.floor((Number(stats.health) || 0) - healthPenalty));
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
  stats.maintenance = calculateCityMaintenance(progress);
  stats.safety = Math.max(0, Math.floor(Number(stats.safety) || 0));
  stats.health = Math.max(0, Math.floor(Number(stats.health) || 0));
  stats.needs = calculateCityStatNeeds(stats);
  stats.ratios = calculateCityStatRatios(stats, stats.needs);
  stats.statuses = calculateCityStatStatuses(stats.ratios);
  stats.events = cityEventFlags(stats);
}

function clampPct(value) {
  return Math.max(0, Math.min(100, Math.floor(Number(value) || 0)));
}

function calculateCityMaintenance(progress = {}) {
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
  return clampPct(average);
}

function cityAreaActiveStatEffects(area, level = 1) {
  if (Math.floor(Number(level) || 0) <= 0) return {};
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

function scaleCityStatEffects(effects = {}, multiplier = 1) {
  const scale = Number(multiplier);
  if (!Number.isFinite(scale) || scale === 1) return effects ?? {};
  return Object.fromEntries(Object.entries(effects ?? {}).map(([statId, amount]) => [
    statId,
    Math.floor((Number(amount) || 0) * scale),
  ]));
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
  const level = Math.floor(Number(currentLevel) || 0);
  const hasBaseLayer = Boolean(area?.builtLayer || (Array.isArray(area?.builtLayers) && area.builtLayers.length > 0));
  if (level <= 0) {
    const configuredLevelOne = (area?.levels ?? [])
      .filter((entry) => Math.floor(Number(entry?.level) || 0) === 1)
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))[0] ?? null;
    if (configuredLevelOne) return configuredLevelOne;
  }
  if (level <= 0 && hasBaseLayer) {
    return {
      level: 1,
      title: area?.level1Title ?? area?.builtTitle ?? area?.title,
      cost: area?.level1Cost ?? area?.buildCost ?? area?.unlock?.level1Cost ?? area?.unlock?.buildCost ?? area?.unlock?.cost ?? area?.cost ?? {},
      statEffects: area?.statEffects ?? area?.effects?.cityStats,
      statRequirements: area?.level1StatRequirements ?? area?.buildStatRequirements ?? area?.unlock?.level1StatRequirements ?? area?.unlock?.buildStatRequirements,
      builtLayer: area?.builtLayer,
      builtLayers: area?.builtLayers,
    };
  }
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
          .then((image) => [npcId, imageToCanvas(image)])
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
  for (const url of cityAreaLockedLayerUrls(entry)) urls.add(url);
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
      .then((image) => [key, imageToCanvas(image)])
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
  const current = Math.floor(Number(progress.statBonuses?.[normalized]) || 0);
  const nextValue = current + value;
  const nextBonuses = { ...(progress.statBonuses ?? {}) };
  if (nextValue === 0) delete nextBonuses[normalized];
  else nextBonuses[normalized] = nextValue;
  return {
    ...progress,
    statBonuses: nextBonuses,
  };
}

function addCityTonicBoosts(progress = {}, effects = {}) {
  const normalizedEffects = normalizeCityTonicBoosts(effects);
  if (Object.keys(normalizedEffects).length === 0) return progress;
  const nextBoosts = normalizeCityTonicBoosts(progress.cityTonicBoosts);
  for (const [statId, amount] of Object.entries(normalizedEffects)) {
    const nextValue = Math.floor(Number(nextBoosts[statId]) || 0) + Math.floor(Number(amount) || 0);
    if (nextValue === 0) delete nextBoosts[statId];
    else nextBoosts[statId] = nextValue;
  }
  return {
    ...progress,
    cityTonicBoosts: nextBoosts,
  };
}

function addCityStatAdjustment(progress = {}, statId, amount) {
  const normalized = normalizeCityStatId(statId);
  const value = Math.floor(Number(amount) || 0);
  if (!normalized || normalized === "population" || value === 0) return progress;
  const current = Math.floor(Number(normalizeCityStatAdjustments(progress.statAdjustments)?.[normalized]) || 0);
  const nextValue = current + value;
  const nextAdjustments = normalizeCityStatAdjustments(progress.statAdjustments);
  if (nextValue === 0) delete nextAdjustments[normalized];
  else nextAdjustments[normalized] = nextValue;
  return {
    ...progress,
    statAdjustments: nextAdjustments,
  };
}

function preserveInactiveCityInventories(progress = {}, storedProgress = {}) {
  let next = progress;
  for (const building of CITY_BUILDINGS) {
    if (isCityBuildingOwned(progress, building)) continue;
    const storedState = storedProgress?.[building.id];
    if (!storedState || typeof storedState !== "object" || Array.isArray(storedState)) continue;
    const hasInventories = storedState.inventories
      && typeof storedState.inventories === "object"
      && !Array.isArray(storedState.inventories);
    const hasLegacyItems = Array.isArray(storedState.items);
    if (!hasInventories && !hasLegacyItems) continue;
    const currentState = progress?.[building.id];
    const nextState = currentState && typeof currentState === "object" && !Array.isArray(currentState)
      ? { ...currentState }
      : {};
    if (hasInventories) nextState.inventories = storedState.inventories;
    if (hasLegacyItems) nextState.items = storedState.items;
    next = {
      ...next,
      [building.id]: nextState,
    };
  }
  return next;
}

function saveCityProgress(progress, storageKey = CITY_STORAGE_KEY) {
  const normalized = normalizeCityProgress(progress);
  const stored = normalizeCityProgress(saveRepository.loadCityProgressSync(storageKey));
  const guarded = preserveInactiveCityInventories(normalized, stored);
  saveRepository.saveCityProgressSync(storageKey, serializeCityProgress(guarded));
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

function normalizeCityTonicBoosts(cityTonicBoosts = {}) {
  if (!cityTonicBoosts || typeof cityTonicBoosts !== "object" || Array.isArray(cityTonicBoosts)) return {};
  const normalized = {};
  for (const [rawId, rawAmount] of Object.entries(cityTonicBoosts)) {
    const statId = normalizeCityStatId(rawId);
    if (!statId || statId === "population" || CITY_STATS_RULES.baseStats?.[statId] === undefined) {
      console.warn?.(`Ignoring unknown city tonic stat: ${String(rawId)}`);
      continue;
    }
    const amount = Math.floor(Number(rawAmount) || 0);
    if (amount === 0) continue;
    normalized[statId] = (normalized[statId] ?? 0) + amount;
  }
  return normalized;
}

function normalizeCityStatAdjustments(statAdjustments = {}) {
  if (!statAdjustments || typeof statAdjustments !== "object" || Array.isArray(statAdjustments)) return {};
  const normalized = {};
  for (const [rawId, rawAmount] of Object.entries(statAdjustments)) {
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
  const reserved = new Set(["areas", "statBonuses", "cityTonicBoosts", "statAdjustments", "artifacts", "policies", "achievements", "armoryPoints", "armyUnits", "threatLevel", "cityMobs", "cityMobRaidLog"]);
  const buildingIds = new Set(CITY_BUILDINGS.map((building) => building.id));
  const normalized = {
    areas: raw.areas && typeof raw.areas === "object" && !Array.isArray(raw.areas) ? { ...raw.areas } : {},
  };
  for (const [key, value] of Object.entries(raw)) {
    if (reserved.has(key)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const nextValue = { ...value };
    if (buildingIds.has(key)) {
      const legacyAddons = Array.isArray(value.addons) ? value.addons : [];
      const purchasedAddons = Array.isArray(value.purchasedAddons) ? value.purchasedAddons : [];
      delete nextValue.addons;
      nextValue.purchasedAddons = [...new Set([...purchasedAddons, ...legacyAddons].map(String))];
    }
    normalized[key] = nextValue;
  }
  normalized.statBonuses = normalizeCityStatBonuses(raw.statBonuses);
  normalized.cityTonicBoosts = normalizeCityTonicBoosts(raw.cityTonicBoosts);
  normalized.statAdjustments = normalizeCityStatAdjustments(raw.statAdjustments);
  normalized.artifacts = normalizeCityArtifacts(raw.artifacts);
  normalized.policies = normalizeCityPolicies(raw.policies);
  normalized.achievements = normalizeCityAchievements(raw.achievements);
  normalized.armoryPoints = normalizeArmoryPoints(raw.armoryPoints);
  normalized.armyUnits = normalizeArmyUnits(raw.armyUnits);
  normalized.threatLevel = Math.max(0, Math.min(100, Number(raw.threatLevel) || 0));
  normalized.cityMobs = normalizeCityMobs(raw.cityMobs);
  normalized.cityMobRaidLog = Array.isArray(raw.cityMobRaidLog)
    ? raw.cityMobRaidLog
      .filter((entry) => entry && typeof entry === "object")
      .slice(0, Math.max(1, Math.floor(Number(CITY_MOB_THEFT_CONFIG.logLimit) || 8)))
      .map((entry) => ({
        id: String(entry.id || `raid-${entry.mobId ?? "mob"}-${entry.itemName ?? "item"}`),
        mobId: entry.mobId ? String(entry.mobId) : "",
        mobName: String(entry.mobName ?? "City mob"),
        targetLabel: String(entry.targetLabel ?? "City storage"),
        itemName: String(entry.itemName ?? "stored item"),
        amount: Math.max(1, Math.floor(Number(entry.amount) || 1)),
        mode: String(entry.mode ?? "steal"),
      }))
    : [];
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
          && key !== "cityTonicBoosts"
          && key !== "statAdjustments"
          && key !== "artifacts"
          && key !== "policies"
          && key !== "achievements"
          && key !== "armoryPoints"
          && key !== "armyUnits"
          && key !== "threatLevel"
          && key !== "cityMobs"
          && key !== "cityMobRaidLog"
          && value
          && typeof value === "object"
          && !Array.isArray(value)
        )),
      )
      : {}),
    ...(cfg.statBonuses ? { statBonuses: { ...(normalized.statBonuses ?? {}) } } : {}),
    ...(cfg.cityTonicBoosts ? { cityTonicBoosts: normalizeCityTonicBoosts(normalized.cityTonicBoosts) } : {}),
    ...(cfg.statAdjustments ? { statAdjustments: { ...(normalized.statAdjustments ?? {}) } } : {}),
    ...(cfg.artifacts ? { artifacts: normalizeCityArtifacts(normalized.artifacts) } : {}),
    ...(cfg.policies ? { policies: normalizeCityPolicies(normalized.policies) } : {}),
    ...(cfg.achievements ? { achievements: normalizeCityAchievements(normalized.achievements) } : {}),
    ...(cfg.armoryPoints ? { armoryPoints: normalizeArmoryPoints(normalized.armoryPoints) } : {}),
    ...(cfg.armyUnits ? { armyUnits: normalizeArmyUnits(normalized.armyUnits) } : {}),
    ...(cfg.threatLevel ? { threatLevel: Math.max(0, Math.min(100, Number(normalized.threatLevel) || 0)) } : {}),
    ...(cfg.cityMobs ? { cityMobs: normalizeCityMobs(normalized.cityMobs) } : {}),
    ...(cfg.cityMobRaidLog ? { cityMobRaidLog: normalized.cityMobRaidLog ?? [] } : {}),
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

function imageToCanvas(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  return canvas;
}
function resourceCountFromSnapshot(snapshot, resourceId) {
  return (snapshot?.inventory ?? []).reduce((sum, item) => (
    item?.mode === "resource" && item.resourceId === resourceId
      ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
      : sum
  ), 0);
}

function cityMobStorageItemType(item) {
  if (isResourceItem(item)) return "resource";
  if (isEquippableItem(item)) return "equipment";
  if (isPotionItem(item)) return "potion";
  if (isQuestItem(item)) return "quest";
  if (isReadableItem(item)) return "readable";
  return item?.mode ? String(item.mode) : "";
}

function canCityMobStealItem(item, gameState = null, theftProfile = {}, theftConfig = CITY_MOB_THEFT_CONFIG) {
  if (!item) return false;
  const itemType = cityMobStorageItemType(item);
  if (!itemType) return false;
  if (isQuestItem(item)) {
    if (theftConfig.allowQuestItemTheft !== true) return false;
    const activeQuestIds = new Set((gameState?.quests?.active ?? []).map((quest) => String(quest.id)));
    const completedQuestIds = new Set((gameState?.quests?.completed ?? []).map(String));
    const questId = String(item.questId ?? item.sourceQuestId ?? item.questItemId ?? "");
    if (questId && activeQuestIds.has(questId) && theftConfig.allowActiveQuestItemTheft !== true) return false;
    if (questId && !completedQuestIds.has(questId) && theftConfig.allowIncompleteQuestItemTheft !== true) return false;
  }
  const protectedTypes = new Set((theftConfig.protectedItemTypes ?? []).map(String));
  if (itemType !== "quest" && protectedTypes.has(itemType)) return false;
  const protectedTags = new Set((theftConfig.protectedItemTags ?? []).map(String));
  const itemTags = [
    ...(Array.isArray(item.tags) ? item.tags : []),
    ...(item.unique ? ["unique"] : []),
    ...(item.artifact ? ["artifact"] : []),
    ...(item.keyItem ? ["keyItem"] : []),
    ...(item.progression ? ["progression"] : []),
  ].map(String);
  if (itemTags.some((tag) => protectedTags.has(tag))) return false;
  if (item.unique || item.artifact || item.keyItem || item.progression) return false;
  const allowedTypes = new Set((theftProfile.allowedItemTypes ?? []).map(String));
  if (allowedTypes.size > 0 && !allowedTypes.has(itemType)) return false;
  if (itemType === "resource") {
    const allowedIds = new Set((theftProfile.allowedResourceIds ?? []).map(String));
    if (allowedIds.size > 0 && !allowedIds.has(String(item.resourceId ?? ""))) return false;
  }
  return true;
}

function cityStoredResourceCount(progress = {}, resourceId) {
  if (!resourceId) return 0;
  let total = 0;
  for (const building of CITY_BUILDINGS) {
    const state = getCityBuildingState(progress, building);
    if ((state.level ?? 0) <= 0) continue;
    const inventories = cityPaymentInventoriesForBuilding(state, building);
    for (const section of cityPaymentInventorySections(building, state)) {
      if (section.cityCostAccess === false) continue;
      const items = inventories[section.key] ?? [];
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
    const state = getCityBuildingState(nextProgress, building);
    if ((state.level ?? 0) <= 0) continue;
    const sections = cityPaymentInventorySections(building, state);
    const inventories = cityPaymentInventoriesForBuilding(state, building);
    let changed = false;
    const nextInventories = { ...inventories };
    for (const section of sections) {
      if (remaining <= 0) break;
      if (section.cityCostAccess === false) continue;
      const sectionKey = section.key;
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
  if (baseInventory.type !== "none" && baseInventory.slots > 0 && cityPaymentStorageCanSupplyCosts(building, baseInventory)) {
    sections.push({ key: "base", slots: baseInventory.slots, cityCostAccess: baseInventory.cityCostAccess });
  }
  const bought = new Set(state.addons ?? []);
  for (const addon of building.addons ?? []) {
    if (!bought.has(addon.id)) continue;
    const addonInventory = normalizeCityPaymentInventoryType(addon.inventoryType);
    if (addonInventory.type === "none" || addonInventory.slots <= 0) continue;
    if (!cityPaymentStorageCanSupplyCosts(addon, addonInventory)) continue;
    const key = addon?.config?.legacyBase ? "base" : `addon:${addon.id}`;
    if (sections.some((section) => section.key === key)) continue;
    sections.push({ key, slots: addonInventory.slots, cityCostAccess: addonInventory.cityCostAccess });
  }
  return sections;
}

function normalizeCityPaymentInventoryType(value) {
  if (!value || value === "none") return { type: "none", slots: 0 };
  if (typeof value === "number") return { type: "all", slots: Math.max(0, Math.floor(value)), cityCostAccess: true };
  if (typeof value === "string") return { type: value, slots: 0, cityCostAccess: true };
  return {
    type: String(value.type ?? value.accepts ?? "none"),
    slots: Math.max(0, Math.floor(Number(value.slots ?? value.size ?? 0) || 0)),
    cityCostAccess: value.cityCostAccess !== false,
  };
}

function cityPaymentStorageCanSupplyCosts(source, inventoryType = normalizeCityPaymentInventoryType(source?.inventoryType)) {
  return source?.cityCostAccess !== false
    && source?.lockedForCityUse !== true
    && source?.config?.cityCostAccess !== false
    && source?.config?.lockedForCityUse !== true
    && inventoryType.cityCostAccess !== false;
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
  cityAreaLockedLayerUrls,
  normalizeCityMobs,
  cityMapMobRefs,
  cityMobVisualDiagnostics,
  cityAttackableMobIds,
  cityMobAreaLabel,
  cityMobDisplayName,
  cityMobDurabilityThreatText,
  cityMobEscalationText,
  cityMobOccupationConsequences,
  cityMobOccupationEntry,
  cityMobOccupationEntries,
  cityMobOccupationForArea,
  cityMobOccupationForBuilding,
  cityMobOccupationStatusText,
  cityMobRecoveryText,
  cityMobStatPenaltyEntries,
  cityMobTheftRiskText,
  canCityMobStealItem,
  isCityWallBlocking,
  pickCityBattleRegion,
  applyCityMobProgressForVisit,
  cityBuildingLayerUrls,
  cityAreaPreviewLayerUrls,
  cityAreaNextPreviewLayerUrls,
  getCityAreaState,
  isCityAreaUnlocked,
  cityAreaForBuilding,
  cityAreaPathD,
  cityAreaBuildingRefs,
  getCityMapQuestNpcs,
  cityMapPositionStyle,
  cityBuildingIconText,
  cityAreaCenter,
  cityAreaGeometry,
  cityAreaCostEntries,
  cityAreaUnlockCostEntries,
  cityLevelCostEntries,
  computeRepairCostEntries,
  cityAreaGateEntries,
  cityAreaCanUnlock,
  cityCostResourceEntries,
  cityCostItemEntries,
  cityItemCostAvailable,
  cityItemCostLabel,
  consumeCityItemCostEntries,
  normalizeCityArtifacts,
  normalizeCityPolicies,
  normalizeCityAchievements,
  cityArtifactBoughtIds,
  cityPolicyActiveIds,
  cityPolicyBlockedByExclusive,
  cityPolicyExclusiveEntries,
  cityPolicyRequirementEntries,
  cityPolicyRequirementsMet,
  cityArtifactEffects,
  cityPolicyEffects,
  cityAchievementUnlockedLevels,
  cityAchievementEffects,
  syncCityAchievementState,
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
  addCityTonicBoosts,
  addCityStatAdjustment,
  cityArmoryPoints,
  addCityArmoryPoints,
  addCityArmyUnit,
  removeCityArmyUnits,
  resolveCityArmyBattle,
  loadImage,
  resourceCountFromSnapshot,
  cityStoredResourceCount,
  cityCostAvailable,
  cityCostLabel,
  cityArmyCanTrainUnit,
  cityArmyUnitCount,
  cityUsableSoldierCapacity
};
