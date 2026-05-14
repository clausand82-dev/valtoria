import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY, RARITIES, TILE_H, TILE_W } from "../game/data.js";
import { drawGroundTile, drawShadow, loadGeneratedAtlas } from "../game/assets-ground.js";
import { GameEngine } from "../game/GameEngine.js";
import { makeItem, itemValue } from "../game/world.js";
import { makeResourceItem } from "../game/GameEngine/helpers.js";
import { ATLAS_FRAMES } from "../game/assets.js";
import { screenToWorld, worldToIso, worldToScreen } from "../game/iso.js";
import { RESOURCE_DEFS, RESOURCE_MERGE_RECIPES } from "../game/config/resource-config.js";
import { READABLE_DEF_BY_ID, READABLE_ITEM_DEFS } from "../game/config/readable-config.js";
import { CITY_AREAS, CITY_AREA_LABEL_OPTIONS, CITY_MAP_IMAGE, CITY_NPC_AREA, CITY_NPC_POINTS } from "../game/config/city-areas-config.js";
import { CITY_BUILDINGS } from "../game/config/city-buildings-config.js";
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
const cityAssetCache = {
  promise: null,
  assets: null,
};

const cityPrebuildCache = {
  layout: null,
};

import {
  CITY_CITIZEN_CONDITION_DEFS,
  CITY_STAT_ALIASES,
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


function CityItemName({ item }) {
  if (!item) return null;
  const className = item.mode === "resource" ? "resource-rarity" : item.rarity ?? "";
  return <b className={className} style={{ color: cityItemQualityColor(item) ?? undefined }}>{item.name}</b>;
}

function CityItemSlot({ item, placeholder, locked, draggable, accepted, muted, onClick, onDoubleClick, onDragStart, onDrop }) {
  const rarityClass = cityItemRarityClass(item);
  const qualityColor = cityItemQualityColor(item);
  return (
    <button
      type="button"
      className={`city-item-slot ${locked ? "locked" : ""} ${item ? "filled" : ""} ${rarityClass} ${accepted ? "accepted" : ""} ${muted ? "muted" : ""}`}
      style={qualityColor ? { "--city-item-quality": qualityColor } : undefined}
      draggable={draggable}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        if (onDrop) event.preventDefault();
      }}
      onDrop={onDrop}
      title={locked ? "Locked" : item?.name ?? placeholder?.title ?? "Empty"}
    >
      {locked ? <span>LOCK</span> : item ? (
        <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
      ) : placeholder ? (
        <img className="city-slot-placeholder" src={placeholder.iconUrl} alt="" draggable="false" />
      ) : null}
      {!locked && item?.count > 1 && <b>{item.count}</b>}
    </button>
  );
}

function cityItemRarityClass(item) {
  if (!item) return "";
  if (item.mode === "resource") return "resource-rarity";
  return item.rarity ? `rarity-${item.rarity}` : "";
}

function cityItemQualityColor(item) {
  if (!item) return null;
  if (item.rarityColor) return item.rarityColor;
  if (item.mode === "resource") return RESOURCE_DEFS[item.resourceId]?.rarityColor ?? "#8be9ff";
  return RARITIES.find((rarity) => rarity.id === item.rarity)?.color ?? null;
}

function blacksmithItemCanEnterMergeSlot(item, category, firstItem = null) {
  if (!canBlacksmithMergeItem(item, category)) return false;
  if (!firstItem) return true;
  return item.baseName === firstItem.baseName
    && item.rarity === firstItem.rarity
    && item.slot === firstItem.slot
    && item.mode === firstItem.mode;
}

function parseCityDragPayload(event) {
  try {
    const raw = event.dataTransfer.getData("application/x-city-item");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function canExtractArcaneEssence(item) {
  if (!item || item.unique || item.named) return false;
  if (item.mode === "resource" || item.mode === "potion" || item.mode === "readable") return false;
  const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
  const normalIndex = RARITIES.findIndex((rarity) => rarity.id === "normal");
  return rarityIndex > normalIndex;
}

function goldBarUnitCost(popularity) {
  const value = Math.max(0, Math.min(100, Number(popularity) || 0));
  return Math.max(1, Math.round(1000 * Math.max(0.75, Math.min(1.25, 1.25 - (value / 100) * 0.5))));
}

function cityResourceCount(inventory = [], resourceId) {
  return (inventory ?? []).reduce((total, item) => {
    if (item?.mode !== "resource" || item.resourceId !== resourceId) return total;
    return total + Math.max(1, Math.floor(Number(item.count) || 1));
  }, 0);
}

function popularityBonusStep(popularity) {
  return Math.max(0, Math.floor((Math.max(0, Number(popularity) || 0) - 50) / 10));
}

function foodBarrelCost(popularity) {
  const recipe = CITY_STATS_RULES.farmFoodBarrelRecipe ?? {};
  const baseCost = Math.max(1, Math.floor(Number(recipe.baseCost) || 100));
  const minCost = Math.max(1, Math.floor(Number(recipe.minCost) || 50));
  const popularityStart = Math.max(0, Math.floor(Number(recipe.popularityStart) || 50));
  const popularityStep = Math.max(1, Math.floor(Number(recipe.popularityStep) || 10));
  const discountPerStep = Math.max(0, Math.floor(Number(recipe.discountPerStep) || 5));
  const steps = Math.max(0, Math.floor((Math.max(0, Number(popularity) || 0) - popularityStart) / popularityStep));
  return Math.max(minCost, baseCost - (steps * discountPerStep));
}

function socketText(item) {
  const sockets = normalizeSockets(item?.sockets);
  if (!sockets.length) return "No sockets";
  return sockets.map((socket) => socket ? RESOURCE_DEFS[socket.resourceId]?.name ?? socket.resourceId : "Empty").join(" | ");
}

function socketBonusText(resourceId) {
  const bonuses = GEM_SOCKET_BONUSES[resourceId]?.bonuses ?? {};
  return Object.entries(bonuses).map(([key, value]) => {
    const pct = ["damagePct", "maxHpPct", "maxManaPct", "speedPct", "critChance", "dodgeChance", "goldFind", "magicFind", "xpGain", "lifeSteal"].includes(key);
    return `${key} ${pct ? `${Math.round(value * 100)}%` : `+${value}`}`;
  }).join(", ");
}

function cityResearchRecipes() {
  return RESOURCE_MERGE_RECIPES.filter((recipe) => cityRecipeRequiresResearchLab(recipe));
}

function cityRecipeRequiresResearchLab(recipe) {
  const ids = [...Object.keys(recipe?.inputs ?? {}), recipe?.output].map(String);
  return ids.some((id) => RESOURCE_DEFS[id]?.researchLabOnly || RESOURCE_DEFS[id]?.requiresResearchLab);
}

function researchRecipeKey(recipe) {
  const inputs = Object.entries(recipe?.inputs ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, count]) => `${id}:${count}`)
    .join("|");
  return `${inputs}->${recipe?.output}`;
}

function researchRecipeByKey(recipeKey) {
  return cityResearchRecipes().find((recipe) => researchRecipeKey(recipe) === recipeKey) ?? null;
}

function researchRecipeCost(recipe) {
  const inputTotal = Object.values(recipe?.inputs ?? {}).reduce((sum, count) => sum + Math.max(1, Number(count) || 1), 0);
  return Math.max(250, Math.min(5000, Math.round(inputTotal)));
}

function merchantItemCanTrade(item) {
  if (!item || isQuestItem(item)) return false;
  if (item.unique || item.uniqueId || item.rarity === "unique") return false;
  if (item.mode === "readable" || item.mode === "quest") return false;
  return true;
}

function merchantTradeMax(item) {
  return isResourceItem(item) || isPotionItem(item) ? Math.max(1, Math.floor(Number(item.count) || 1)) : 1;
}

function merchantTradeQuantity(item, quantity) {
  return Math.max(1, Math.min(merchantTradeMax(item), Math.floor(Number(quantity) || 1)));
}

function merchantSellPrice(item, popularity) {
  const value = Math.max(1, Math.floor(Number(item?.value) || itemValue(item)));
  const pop = Math.max(0, Math.min(100, Number(popularity) || 0));
  return Math.max(1, Math.floor(value * (0.35 + pop * 0.004)));
}

function merchantBuyPrice(item, popularity) {
  const value = Math.max(1, Math.floor(Number(item?.value) || itemValue(item)));
  const pop = Math.max(0, Math.min(100, Number(popularity) || 0));
  return Math.max(1, Math.ceil(value * (1.25 - pop * 0.004)));
}

function merchantCloneItem(item) {
  return {
    ...item,
    id: `${item.id ?? item.name ?? "trade"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
}

function generateMerchantStock(level, soldItems = []) {
  const stock = [...(soldItems ?? []).slice(0, 10).map(merchantCloneItem)];
  const resourceIds = Object.keys(RESOURCE_DEFS).filter((id) => id !== "diamond");
  for (let i = 0; i < Math.min(10, resourceIds.length); i += 1) {
    const resourceId = resourceIds[(i + Math.max(0, level - 1)) % resourceIds.length];
    stock.push(makeResourceItem(resourceId, 2 + ((level + i) % 5)));
  }
  stock.push(makeItem({ level: Math.max(1, level), rarity: "normal" }));
  if (level >= 3) stock.push(makeItem({ level, rarity: "upgraded" }));
  if (level >= 6) stock.push(makeItem({ level, rarity: "rare" }));
  return stock.slice(0, 22);
}

function rerollMerchantStockForCityVisit(progress, level) {
  const merchantBuilding = CITY_BUILDINGS.find((building) => building.id === "merchant");
  if (!merchantBuilding) return progress;
  const state = progress?.merchant ?? {};
  const merchant = state.merchant ?? {};
  return {
    ...progress,
    merchant: {
      ...state,
      merchant: {
        ...merchant,
        stock: generateMerchantStock(level, merchant.soldItems ?? []),
      },
    },
  };
}

function applyDurabilityDegradationForVisit(progress) {
  if (!progress) return progress;
  const next = { ...progress };
  const degradeState = (state) => {
    const current = Math.max(0, Math.min(100, Number(state?.durability ?? DURABILITY_DEFAULT)));
    if (Math.random() > DURABILITY_DEGRADE_CHANCE) return state;
    const pct = DURABILITY_DEGRADE_MIN_PCT + Math.random() * (DURABILITY_DEGRADE_MAX_PCT - DURABILITY_DEGRADE_MIN_PCT);
    return {
      ...state,
      durability: Math.max(0, current - pct),
    };
  };

  for (const area of CITY_AREAS) {
    if (!area?.id || !next[area.id]) continue;
    next[area.id] = degradeState(next[area.id]);
  }
  for (const building of CITY_BUILDINGS) {
    if (!building?.id || !next[building.id]) continue;
    next[building.id] = degradeState(next[building.id]);
  }
  return next;
}

function readableDialogFromItem(item) {
  if (!item || !isReadableItem(item)) return null;
  return {
    type: "readable-text",
    title: item.name,
    body: item.readableText,
    item,
  };
}

function buildGearMergeGroups(inventory = [], category = "weapon") {
  const groups = new Map();
  for (const item of inventory) {
    if (!canBlacksmithMergeItem(item, category)) continue;
    const key = `${category}:${item.baseName}:${item.rarity}:${item.slot}:${item.mode}`;
    const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
    const nextRarity = RARITIES[rarityIndex + 1];
    const group = groups.get(key) ?? {
      key,
      item,
      firstIndex: item.index,
      count: 0,
      nextRarity,
    };
    group.count += 1;
    if (item.index < group.firstIndex) {
      group.firstIndex = item.index;
      group.item = item;
    }
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (
    a.item.baseName.localeCompare(b.item.baseName) || a.item.rarityLabel.localeCompare(b.item.rarityLabel)
  ));
}

function canBlacksmithMergeItem(item, category) {
  if (!item || item.unique || item.named) return false;
  if (category === "weapon" && item.slot !== "weapon") return false;
  if (category === "armor" && item.mode !== "armor") return false;
  const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
  return rarityIndex >= 0 && rarityIndex < RARITIES.length - 1;
}

export {
  CityItemName,
  CityItemSlot,
  cityItemRarityClass,
  cityItemQualityColor,
  blacksmithItemCanEnterMergeSlot,
  parseCityDragPayload,
  canExtractArcaneEssence,
  goldBarUnitCost,
  cityResourceCount,
  popularityBonusStep,
  foodBarrelCost,
  socketText,
  socketBonusText,
  cityResearchRecipes,
  cityRecipeRequiresResearchLab,
  researchRecipeKey,
  researchRecipeByKey,
  researchRecipeCost,
  merchantItemCanTrade,
  merchantTradeMax,
  merchantTradeQuantity,
  merchantSellPrice,
  merchantBuyPrice,
  merchantCloneItem,
  generateMerchantStock,
  rerollMerchantStockForCityVisit,
  applyDurabilityDegradationForVisit,
  readableDialogFromItem,
  buildGearMergeGroups,
  canBlacksmithMergeItem
};
