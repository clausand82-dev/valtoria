import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAX_INVENTORY, RARITIES, TILE_H, TILE_W } from "../game/data.js";
import { drawGroundTile, drawShadow, loadGeneratedAtlas } from "../game/assets-ground.js";
import { GameEngine } from "../game/GameEngine.js";
import { makeItem, itemValue } from "../game/world.js";
import { makeResourceItem } from "../game/GameEngine/helpers.js";
import { ATLAS_FRAMES } from "../game/assets.js";
import { screenToWorld, worldToIso, worldToScreen } from "../game/iso.js";
import { RESOURCE_DEFS, RESOURCE_MERGE_RECIPES } from "../game/config/resource-config.js";
import { CITY_TONIC_RECIPES, normalizePotionId, potionDefById, potionRecipesForStation } from "../game/config/potion-config.js";
import { READABLE_DEF_BY_ID, READABLE_ITEM_DEFS } from "../game/config/readable-config.js";
import { READABLE_SALVAGE_CONFIG } from "../game/config/readable-salvage-config.js";
import { CITY_AREAS, CITY_AREA_LABEL_OPTIONS, CITY_MAP_IMAGE, CITY_NPC_AREA, CITY_NPC_POINTS } from "../game/config/city-areas-config.js";
import { CITY_BUILDINGS } from "../game/config/city-buildings-config.js";
import { CITY_ARTIFACTS } from "../game/config/city-artifact-config.js";
import { CITY_POLICIES } from "../game/config/city-policy-config.js";
import { CITY_ACHIEVEMENTS } from "../game/config/city-achievement-config.js";
import { DURABILITY_DEFAULT, DURABILITY_DEGRADE_CHANCE, DURABILITY_DEGRADE_MIN_PCT, DURABILITY_DEGRADE_MAX_PCT, ITEM_REPAIR_GOLD_PER_PCT, ITEM_REPAIR_JUNK_PER_PCT } from "../game/config/durability-config.js";
import { CITY_STATS_RULES } from "../game/config/city-stats-rules-config.js";
import { SPELL_DEFS } from "../game/config/spell-config.js";
import { GEM_SOCKET_BONUSES, MAX_ITEM_SOCKETS, itemCanHaveSockets, normalizeSockets } from "../game/config/socket-config.js";
import {
  SKILL_TREE_BRANCHES,
  skillTreeAvailablePoints,
  skillTreeBranchSpentPoints,
  normalizeSkillTree,
} from "../game/config/skill-tree-config.js";
import {
  CLASS_DEFS,
  CLASS_NODE_BY_ID,
  DEFAULT_CLASS_ID,
  classPointsAvailable,
  canUnlockClassNode as canUnlockClassNodeForPlayer,
  getClassConfig,
  normalizeClassId,
} from "../game/config/class-config.js";
import {
  cityAddonName,
  cityBuildingName,
  cityRequirementContext,
  getCityAreaStateForId,
  hasCityBuilding,
} from "../game/config/city-state-helpers.js";
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

import {
  CityItemName,
  CityItemSlot,
  blacksmithItemCanEnterMergeSlot,
  canExtractArcaneEssence,
  canBlacksmithMergeItem,
  cityResearchRecipes,
  cityResourceCount,
  foodBarrelCost,
  goldBarUnitCost,
  merchantBuyPrice,
  merchantItemCanTrade,
  merchantSellPrice,
  merchantTradeMax,
  merchantTradeQuantity,
  parseCityDragPayload,
  popularityBonusStep,
  researchRecipeCost,
  researchRecipeKey,
  socketBonusText,
  socketText,
} from "./city-panel-helpers.jsx";

function CityBlacksmithPanel({ engineRef, snapshot, snapshotRef, activeAddonId, purchasedAddons, resourceCount, cityEventModifiers = {}, blacksmithModifiers = {}, onRepairEquippedItem, onRepairInventoryItem }) {
  const hasWeaponAnvil = purchasedAddons.has("weapon_anvil");
  const hasArmorAnvil = purchasedAddons.has("armor_anvil");
  const hasForge = purchasedAddons.has("forge");
  const forgeGear = useMemo(() => (
    (snapshot.inventory ?? []).filter((item) => isForgeGear(item))
  ), [snapshot.inventory]);

  return (
    <section className="blacksmith-panel">
      {!activeAddonId && (
        <BlacksmithRepairStation
          engineRef={engineRef}
          snapshot={snapshot}
          snapshotRef={snapshotRef}
          resourceCount={resourceCount}
          cityEventModifiers={cityEventModifiers}
          blacksmithModifiers={blacksmithModifiers}
          onRepairEquippedItem={onRepairEquippedItem}
          onRepairInventoryItem={onRepairInventoryItem}
        />
      )}
      {activeAddonId === "weapon_anvil" && (
        <BlacksmithMergeStation
          title="Weapon Anvil"
          enabled={hasWeaponAnvil}
          lockedText="Build Weapon Anvil to merge weapons."
          inventory={snapshot.inventory}
          category="weapon"
          onMerge={(indices) => engineRef.current?.mergeInventoryGearAtBlacksmith?.(indices[0], "weapon", indices)}
        />
      )}
      {activeAddonId === "armor_anvil" && (
        <BlacksmithMergeStation
          title="Armor Anvil"
          enabled={hasArmorAnvil}
          lockedText="Build Armor Anvil to merge armor."
          inventory={snapshot.inventory}
          category="armor"
          onMerge={(indices) => engineRef.current?.mergeInventoryGearAtBlacksmith?.(indices[0], "armor", indices)}
        />
      )}
      {activeAddonId === "forge" && (
        <BlacksmithForgeStation
          enabled={hasForge}
          gear={forgeGear}
          blacksmithModifiers={blacksmithModifiers}
          onDestroy={(index) => engineRef.current?.forgeDestroyInventoryWeapon?.(index)}
        />
      )}
    </section>
  );
}

// ── Repair Station ─────────────────────────────────────────────────────────────
const ITEM_DURABILITY_PENALTY_THRESHOLD_UI = 75;

function durabilityColor(dur) {
  if (dur >= 75) return "#58d96d";
  if (dur >= 40) return "#ffd85d";
  return "#ff6b5f";
}

function BlacksmithRepairStation({ engineRef, snapshot, snapshotRef, resourceCount, cityEventModifiers = {}, blacksmithModifiers = {}, onRepairEquippedItem, onRepairInventoryItem }) {
  const equipment = snapshot.equipment ?? [];
  const equippedItems = equipment
    .filter((slot) => slot.item != null)
    .map((slot) => ({
      id: `equipped-${slot.id}`,
      source: "equipped",
      sourceLabel: "Equipped",
      slotId: slot.id,
      label: slot.label,
      item: slot.item,
    }));
  const backpackItems = (snapshot.inventory ?? [])
    .filter((item) => isEquippableItem(item))
    .map((item) => ({
      id: `backpack-${item.id}`,
      source: "backpack",
      sourceLabel: "Backpack",
      inventoryIndex: item.index,
      label: item.slot === "weapon" ? "Weapon" : item.slot === "ring" ? "Ring" : item.slot,
      item,
    }));
  const repairItems = [...equippedItems, ...backpackItems];

  if (repairItems.length === 0) {
    return (
      <section className="blacksmith-station">
        <header><h4>Reparation</h4><span>Ingen udstyr udrustet</span></header>
        <p style={{ color: "#aaa", fontSize: "0.82em" }}>Rust udstyr på for at reparere det her.</p>
      </section>
    );
  }

  return (
    <section className="blacksmith-station">
      <header>
        <h4>Reparation</h4>
        <span>Klik på et item for at reparere det</span>
      </header>
      <div className="repair-slot-list">
        {repairItems.map((slot) => (
          <BlacksmithRepairSlot
            key={slot.id}
            slot={slot}
            snapshot={snapshot}
            engineRef={engineRef}
            snapshotRef={snapshotRef}
            resourceCount={resourceCount}
            cityEventModifiers={cityEventModifiers}
            blacksmithModifiers={blacksmithModifiers}
            onRepairEquippedItem={onRepairEquippedItem}
            onRepairInventoryItem={onRepairInventoryItem}
          />
        ))}
      </div>
    </section>
  );
}

function BlacksmithRepairSlot({ slot, snapshot, engineRef, snapshotRef, resourceCount, cityEventModifiers = {}, blacksmithModifiers = {}, onRepairEquippedItem, onRepairInventoryItem }) {
  const item = slot.item;
  const dur = Number(item.durability ?? 100);
  const missing = Math.ceil(100 - dur);
  const isFullyRepaired = missing <= 0;
  const isNonRepairable = Boolean(item.nonRepairable);
  const color = durabilityColor(dur);

  // Calculate repair costs
  const repairCostMultiplier = (cityEventModifiers.repairCostMultiplier ?? 1) * (blacksmithModifiers.repairCostMultiplier ?? 1);
  const goldCost = Math.max(1, Math.ceil(ITEM_REPAIR_GOLD_PER_PCT * missing * repairCostMultiplier));
  const junkCost = Math.max(1, Math.ceil(ITEM_REPAIR_JUNK_PER_PCT * missing * repairCostMultiplier));

  // Check if player has enough resources
  const goldHave = Math.max(0, Math.floor(Number(snapshot.player?.gold) || 0));
  const junkHave = resourceCount ? resourceCount("junk") : cityResourceCount(snapshot.inventory, "junk");
  const canAfford = !isNonRepairable && goldHave >= goldCost && junkHave >= junkCost;

  return (
    <div className={`repair-slot repair-source-${slot.source}${isFullyRepaired ? " repaired" : ""}`}>
      <div className="repair-slot-info">
        <div className="repair-slot-header">
          <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
          <span className="repair-slot-name" style={{ color: item.rarityColor ?? "#f5f3ea" }}>{item.name}</span>
          <span className={`repair-source-badge ${slot.source}`}>{slot.sourceLabel}</span>
          <span className="repair-slot-label" style={{ color: "#aaa" }}>{slot.label}</span>
        </div>
        <span className="repair-durability-bar-wrap">
          <span
            className="repair-durability-bar-fill"
            style={{
              width: `${Math.max(0, Math.min(100, dur))}%`,
              background: color,
            }}
          />
        </span>
        <span className="repair-durability-pct" style={{ color }}>
          {Math.round(dur)}%{dur < ITEM_DURABILITY_PENALTY_THRESHOLD_UI && dur > 0 && " ⚠"}
          {dur <= 0 && " ✕ Ubrugeligt"}
        </span>
      </div>
      {!isFullyRepaired && !isNonRepairable && (
        <div className="repair-slot-action">
          <div className={`repair-cost-display${canAfford ? " affordable" : " unaffordable"}`}>
            <span className="cost-item">
              <InventoryIcon iconSheet="items" iconUrl={ITEM_GOLD_ICON_URL} />
              <span>{goldCost}</span>
            </span>
            <span className="cost-item">
              <InventoryIcon iconSheet="resources" iconUrl={iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: "junk" }))} />
              <span>{junkCost}</span>
            </span>
          </div>
          <button
            className="repair-btn"
            disabled={!canAfford}
            onClick={() => (
              onRepairEquippedItem
                ? slot.source === "backpack"
                  ? onRepairInventoryItem?.(slot.inventoryIndex, { gold: goldCost, junk: junkCost })
                  : onRepairEquippedItem(slot.slotId, { gold: goldCost, junk: junkCost })
                : slot.source === "backpack"
                  ? engineRef.current?.repairInventoryItem?.(slot.inventoryIndex)
                  : engineRef.current?.repairEquippedItem?.(slot.slotId)
            )}
          >
            Reparer
          </button>
        </div>
      )}
      {!isFullyRepaired && isNonRepairable && (
        <span className="repair-done">Kan ikke repareres</span>
      )}
      {isFullyRepaired && (
        <span className="repair-done">OK</span>
      )}
    </div>
  );
}

function BlacksmithMergeStation({ title, enabled, lockedText, inventory, category, onMerge }) {
  const [selectedIndices, setSelectedIndices] = useState([]);
  const relevantInventory = (inventory ?? []).filter((item) => canBlacksmithMergeItem(item, category));
  const selectedItems = selectedIndices.map((index) => inventory?.[index]).filter(Boolean);
  const firstItem = selectedItems[0] ?? null;
  const matchingInventory = new Set((inventory ?? [])
    .filter((item) => blacksmithItemCanEnterMergeSlot(item, category, firstItem))
    .map((item) => item.index));
  const canMerge = selectedItems.length === 3 && selectedItems.every((item) => blacksmithItemCanEnterMergeSlot(item, category, firstItem));

  useEffect(() => {
    setSelectedIndices((current) => current.filter((index) => inventory?.[index]));
  }, [inventory]);

  const addIndex = (index) => {
    const item = inventory?.[index];
    if (!blacksmithItemCanEnterMergeSlot(item, category, firstItem)) return;
    setSelectedIndices((current) => {
      if (current.includes(index) || current.length >= 3) return current;
      return [...current, index];
    });
  };

  const removeSlot = (slotIndex) => {
    setSelectedIndices((current) => current.filter((_, index) => index !== slotIndex));
  };

  return (
    <section className={`blacksmith-station ${enabled ? "" : "locked"}`}>
      <header>
        <h4>{title}</h4>
        <span>{enabled ? "Traek 3 matchende items ind" : lockedText}</span>
      </header>
      {!enabled && <p>{lockedText}</p>}
      {enabled && (
        <div className="blacksmith-merge-workspace">
          <div className="blacksmith-merge-slots">
            {Array.from({ length: 3 }, (_, slotIndex) => {
              const item = selectedItems[slotIndex] ?? null;
              return (
                <CityItemSlot
                  key={`merge-${slotIndex}`}
                  item={item}
                  locked={false}
                  draggable={false}
                  accepted={Boolean(item)}
                  onClick={() => removeSlot(slotIndex)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const payload = parseCityDragPayload(event);
                    if (payload?.source === "inventory") addIndex(payload.index);
                  }}
                />
              );
            })}
          </div>
          <button type="button" disabled={!canMerge} onClick={() => {
            if (!canMerge) return;
            const merged = onMerge(selectedIndices);
            if (merged !== false) setSelectedIndices([]);
          }}>
            Merge
          </button>
          <div className="blacksmith-backpack">
            {relevantInventory.map((item) => {
              const index = item.index;
              return (
              <CityItemSlot
                key={`smith-${index}`}
                item={item}
                locked={false}
                draggable={Boolean(item) && blacksmithItemCanEnterMergeSlot(item, category, firstItem) && !selectedIndices.includes(index)}
                accepted={Boolean(item) && matchingInventory.has(index)}
                muted={Boolean(item) && !matchingInventory.has(index)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/x-city-item", JSON.stringify({ source: "inventory", index }));
                  event.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => addIndex(index)}
                onDoubleClick={() => addIndex(index)}
              />
            );})}
          </div>
        </div>
      )}
    </section>
  );
}

function isForgeGear(item) {
  if (!item) return false;
  if (item.flags?.equippable) return true;
  return item.slot === "weapon"
    || item.mode === "armor"
    || item.mode === "shield"
    || item.mode === "relic"
    || item.mode === "melee"
    || item.mode === "ranged"
    || item.mode === "magic";
}

function BlacksmithForgeStation({ enabled, gear, blacksmithModifiers = {}, onDestroy }) {
  const junkYieldMultiplier = blacksmithModifiers.forgeJunkYieldMultiplier ?? 1;
  return (
    <section className={`blacksmith-station ${enabled ? "" : "locked"}`}>
      <header>
        <h4>Forge Addon</h4>
        <span>{enabled ? `Destroy gear for resources${junkYieldMultiplier !== 1 ? ` | Junk yield ${Math.round(junkYieldMultiplier * 100)}%` : ""}` : "Build Forge Addon to extract gear resources."}</span>
      </header>
      {!enabled && <p>Build Forge Addon to destroy gear here.</p>}
      {enabled && gear.length === 0 && <p>No gear in backpack.</p>}
      {enabled && gear.map((item) => (
        <div className="blacksmith-row" key={item.id}>
          <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
          <div>
            <CityItemName item={item} />
            <span>{item.rarityLabel} | L{item.level} | {item.slot ?? item.mode}</span>
          </div>
          <button type="button" className="danger-action" onClick={() => onDestroy(item.index)}>
            Destroy
          </button>
        </div>
      ))}
    </section>
  );
}

function CityGoldBarPanel({ gold, inventory, popularity, resourceCount, blacksmithModifiers = {}, onSmelt, onSmeltIron }) {
  const unitCost = Math.max(1, Math.ceil(goldBarUnitCost(popularity) * (blacksmithModifiers.goldBarCostMultiplier ?? 1)));
  const ironPieceCost = 3 + Math.max(0, Math.floor(Number(blacksmithModifiers.metalBarInputCostBonus) || 0));
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(inventory, resourceId));
  const ironPieces = countResource("iron_piece");
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Minting Furnace</h4>
        <span>Smelt metals and mint bars.</span>
      </header>
      <div className="blacksmith-row">
        <InventoryIcon iconSheet="items" iconUrl="/assets/generated/item/item_res_goldbar.png" />
        <div>
          <b>Gold Bar</b>
          <span>{unitCost} Gold {"->"} 1 Gold Bar | Popularity {Math.round(popularity ?? 0)}% | Available: {gold}</span>
        </div>
        <button type="button" disabled={gold < unitCost} onClick={onSmelt}>Smelt</button>
      </div>
      <div className="blacksmith-row">
        <InventoryIcon iconSheet="resources" iconIndex={RESOURCE_DEFS.iron_bar?.iconIndex} iconUrl={RESOURCE_DEFS.iron_bar?.iconUrl} />
        <div>
          <b>Iron Bar</b>
          <span>{ironPieceCost} Iron Piece {"->"} 1 Iron Bar | Available: {ironPieces}</span>
        </div>
        <button type="button" disabled={ironPieces < ironPieceCost} onClick={() => onSmeltIron?.(ironPieceCost)}>Smelt</button>
      </div>
    </section>
  );
}

function CityFarmPanel({ inventory, popularity, resourceCount, onProduceFoodBarrel, onProduceProvision }) {
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(inventory, resourceId));
  const foodBarrelRecipe = CITY_STATS_RULES.farmFoodBarrelRecipe ?? {};
  const foodBarrelOutputId = String(foodBarrelRecipe.outputResourceId ?? "food");
  const foodBarrelOutputCount = Math.max(1, Math.floor(Number(foodBarrelRecipe.outputCount) || 1));
  const foodBarrelOptions = (foodBarrelRecipe.inputOptions ?? []).map((option) => ({
    id: String(option?.resourceId ?? ""),
    label: option?.label ?? String(option?.resourceId ?? "Unknown"),
    baseCost: option?.baseCost,
    minCost: option?.minCost,
  })).filter((option) => option.id);
  const provisionOptions = CITY_STATS_RULES.farmProvisionRecipes ?? [];
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Food Barrels</h4>
        <span>Raw food {"->"} 1 Food Barrel</span>
      </header>
      {foodBarrelOptions.map((option) => {
        const available = countResource(option.id);
        const def = RESOURCE_DEFS[option.id];
        const foodBarrelCostValue = foodBarrelCost(popularity, option);
        return (
          <div className="blacksmith-row" key={`barrel-${option.id}`}>
            <InventoryIcon iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: option.id }))} />
            <div>
              <b>{option.label}</b>
              <span>{foodBarrelCostValue} needed | Available: {available} | Popularity {Math.round(popularity ?? 0)}%</span>
            </div>
            <button
              type="button"
              disabled={available < foodBarrelCostValue}
              onClick={() => onProduceFoodBarrel(option.id, foodBarrelCostValue, foodBarrelOutputId, foodBarrelOutputCount)}
            >
              Make
            </button>
          </div>
        );
      })}
      <header>
        <h4>Provision</h4>
        <span>Convert food resources into city provision.</span>
      </header>
      {provisionOptions.map((option) => {
        const available = countResource(option.resourceId);
        const def = RESOURCE_DEFS[option.resourceId];
        return (
          <div className="blacksmith-row" key={`provision-${option.resourceId}`}>
            <InventoryIcon iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: option.resourceId }))} />
            <div>
              <b>{option.label}</b>
              <span>{option.cost} {"->"} +{option.provision} provision | Available: {available}</span>
            </div>
            <button type="button" disabled={available < option.cost} onClick={() => onProduceProvision(option.resourceId, option.cost, option.provision)}>Convert</button>
          </div>
        );
      })}
    </section>
  );
}

function cityRuleStatLabel(statId) {
  const normalized = CITY_STAT_ALIASES[statId] ?? statId;
  return String(normalized ?? "").replaceAll("_", " ");
}

function cityRuleEffectsText(effects = {}) {
  return Object.entries(effects ?? {})
    .map(([statId, amount]) => `${Number(amount) > 0 ? "+" : ""}${Math.floor(Number(amount) || 0)} ${cityRuleStatLabel(statId)}`)
    .join(" | ");
}

function scaleCityRuleEffects(effects = {}, multiplier = 1) {
  const scale = Number(multiplier);
  if (!Number.isFinite(scale) || scale === 1) return effects ?? {};
  return Object.fromEntries(Object.entries(effects ?? {}).map(([statId, amount]) => [
    statId,
    Math.floor((Number(amount) || 0) * scale),
  ]));
}

function CityEffectChips({ effects = {} }) {
  return (
    <div className="city-policy-effects">
      {Object.entries(effects ?? {}).map(([statId, amount]) => (
        <span className={Number(amount) >= 0 ? "positive" : "negative"} key={statId}>
          {Number(amount) > 0 ? "+" : ""}{Math.floor(Number(amount) || 0)} {cityRuleStatLabel(statId)}
        </span>
      ))}
    </div>
  );
}

function sanctuaryDonationItem(trade) {
  const configuredType = String(trade?.itemType ?? "");
  const potionId = normalizePotionId(trade?.potionId ?? trade?.resourceId);
  if (configuredType === "potion" || (potionId && potionDefById(potionId))) {
    return { type: "potion", id: potionId, def: potionDefById(potionId) };
  }
  const resourceId = String(trade?.resourceId ?? "");
  return { type: "resource", id: resourceId, def: RESOURCE_DEFS[resourceId] };
}

function CitySanctuaryDonationPanel({ inventory, resourceCount, potionCount, effectMultiplier = 1, onDonate }) {
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(inventory, resourceId));
  const countPotion = potionCount ?? (() => 0);
  const trades = CITY_STATS_RULES.sanctuaryDonationTrades ?? [];
  const multiplier = Math.max(0, Number(effectMultiplier) || 1);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Donation</h4>
        <span>Donate one resource and choose one city benefit.</span>
        {multiplier !== 1 && <p>Donation effects x{multiplier.toFixed(2)} while Sanctuary is disrupted.</p>}
      </header>
      {trades.map((trade) => {
        const item = sanctuaryDonationItem(trade);
        const cost = Math.max(1, Math.floor(Number(trade.cost) || 1));
        const available = item.type === "potion" ? countPotion(item.id) : countResource(item.id);
        const iconUrl = item.def?.iconUrl ?? iconUrlFromKey(deriveIconKey(item.type === "potion"
          ? { mode: "potion", potionId: item.id }
          : { mode: "resource", resourceId: item.id }));
        return (
          <div className="blacksmith-row" key={trade.id ?? `${item.id}-${cityRuleEffectsText(trade.effects)}`}>
            <InventoryIcon iconUrl={iconUrl} />
            <div>
              <b>{trade.label ?? item.def?.name ?? item.id}</b>
              <span>{cost} {item.def?.name ?? item.id} {"->"} {cityRuleEffectsText(scaleCityRuleEffects(trade.effects, multiplier))} | Available: {available}</span>
            </div>
            <button type="button" disabled={available < cost} onClick={() => onDonate(trade)}>Donate</button>
          </div>
        );
      })}
    </section>
  );
}

function CityFarmAlePanel({ inventory, cityStats, resourceCount, onBrewAle }) {
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(inventory, resourceId));
  const recipe = CITY_STATS_RULES.farmAleRecipe ?? {};
  const inputs = Object.entries(recipe.inputs ?? {});
  const statCosts = Object.entries(recipe.statCosts ?? {});
  const outputResourceId = String(recipe.outputResourceId ?? "ale");
  const outputCount = Math.max(1, Math.floor(Number(recipe.outputCount) || 1));
  const outputDef = RESOURCE_DEFS[outputResourceId];
  const hasResources = inputs.every(([resourceId, amount]) => countResource(resourceId) >= Math.max(1, Math.floor(Number(amount) || 1)));
  const hasStats = statCosts.every(([statId, amount]) => Math.max(0, Math.floor(Number(cityStats?.[statId]) || 0)) >= Math.max(1, Math.floor(Number(amount) || 1)));
  const inputText = inputs
    .map(([resourceId, amount]) => `${Math.max(1, Math.floor(Number(amount) || 1))} ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`)
    .concat(statCosts.map(([statId, amount]) => `${Math.max(1, Math.floor(Number(amount) || 1))} ${cityRuleStatLabel(statId)}`))
    .join(" + ");
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Ale Brewing</h4>
        <span>{inputText} {"->"} {outputCount} {outputDef?.name ?? outputResourceId}</span>
      </header>
      <div className="blacksmith-row">
        <InventoryIcon iconUrl={outputDef?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: outputResourceId }))} />
        <div>
          <b>{outputDef?.name ?? outputResourceId}</b>
          <span>Water: {Math.max(0, Math.floor(Number(cityStats?.water) || 0))} | Wheat: {countResource("wheat")} | Wood Plank: {countResource("wood_plank")}</span>
        </div>
        <button type="button" disabled={!hasResources || !hasStats} onClick={() => onBrewAle(recipe)}>Brew</button>
      </div>
    </section>
  );
}

function CityInnAlePanel({ inventory, resourceCount, onServeAle }) {
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(inventory, resourceId));
  const trades = CITY_STATS_RULES.innAleTrades ?? [];
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Ale Sales</h4>
        <span>Sell ale to improve city mood and water service.</span>
      </header>
      {trades.map((trade) => {
        const resourceId = String(trade.resourceId ?? "ale");
        const cost = Math.max(1, Math.floor(Number(trade.cost) || 1));
        const available = countResource(resourceId);
        const def = RESOURCE_DEFS[resourceId];
        return (
          <div className="blacksmith-row" key={trade.id ?? resourceId}>
            <InventoryIcon iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId }))} />
            <div>
              <b>{trade.label ?? def?.name ?? resourceId}</b>
              <span>{cost} {def?.name ?? resourceId} {"->"} {cityRuleEffectsText(trade.effects)} | Available: {available}</span>
            </div>
            <button type="button" disabled={available < cost} onClick={() => onServeAle(trade)}>Sell</button>
          </div>
        );
      })}
    </section>
  );
}

function CityResearchPanel({ buildingState, snapshot, resourceCount, onBuyRecipe, onMerge }) {
  const bought = new Set(buildingState.recipes ?? []);
  const recipes = cityResearchRecipes();
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(snapshot.inventory, resourceId));
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Research Lab</h4>
        <span>Gemstone recipes are researched and merged here.</span>
      </header>
      {recipes.map((recipe) => {
        const key = researchRecipeKey(recipe);
        const unlocked = bought.has(key);
        const cost = researchRecipeCost(recipe);
        const hasInputs = Object.entries(recipe.inputs ?? {}).every(([resourceId, count]) => countResource(resourceId) >= count);
        const outputDef = RESOURCE_DEFS[recipe.output];
        const inputText = Object.entries(recipe.inputs ?? {})
          .map(([resourceId, count]) => `${count} ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`)
          .join(" + ");
        return (
          <div className="blacksmith-row" key={key}>
            <InventoryIcon iconUrl={outputDef?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: recipe.output }))} />
            <div>
              <b>{outputDef?.name ?? recipe.output}</b>
              <span>{inputText} {"->"} {recipe.count ?? 1} {outputDef?.name ?? recipe.output}</span>
            </div>
            {unlocked ? (
              <button type="button" disabled={!hasInputs} onClick={() => onMerge(recipe)}>Merge</button>
            ) : (
              <button type="button" disabled={(snapshot.player?.gold ?? 0) < cost} onClick={() => onBuyRecipe(key)}>
                Research {cost} G
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

function CityPotionLabPanel({ countIngredient, onMix }) {
  const recipes = potionRecipesForStation("alchemy_bench");
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Alchemy Bench</h4>
        <span>Mix backpack recipes and rarer bench-only brews.</span>
      </header>
      {recipes.map((recipe) => {
        const outputDef = potionDefById(recipe.output);
        const outputName = outputDef?.name ?? recipe.output;
        const inputEntries = Object.entries(recipe.inputs ?? {});
        const hasInputs = inputEntries.every(([inputId, count]) => (
          (countIngredient?.(inputId) ?? 0) >= Math.max(1, Math.floor(Number(count) || 1))
        ));
        const inputText = inputEntries
          .map(([inputId, count]) => {
            const name = potionDefById(inputId)?.name ?? RESOURCE_DEFS[inputId]?.name ?? inputId;
            const available = countIngredient?.(inputId) ?? 0;
            return `${count} ${name} (${available})`;
          })
          .join(" + ");
        return (
          <div className="blacksmith-row" key={`${recipe.output}-${inputText}`}>
            <InventoryIcon iconUrl={outputDef?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "potion", potionId: recipe.output }))} />
            <div>
              <b>{outputName}</b>
              <span>{inputText} {"->"} {recipe.count ?? 1} {outputName} | {hasInputs ? "Ready" : "Missing inputs"}</span>
            </div>
            <button type="button" disabled={!hasInputs} onClick={() => onMix?.(recipe)}>
              Mix
            </button>
          </div>
        );
      })}
    </section>
  );
}

function CityTonicLabPanel({ cityStats, progress, countInput, onMix }) {
  const tonicBoosts = progress?.cityTonicBoosts ?? {};
  const tonicStatIds = new Set(
    CITY_TONIC_RECIPES.flatMap((recipe) => Object.keys(recipe.cityStatEffects ?? {}))
      .map((statId) => {
        const raw = String(statId ?? "");
        const normalized = raw.replaceAll("-", "_");
        return CITY_STAT_ALIASES[raw] ?? CITY_STAT_ALIASES[normalized] ?? normalized;
      })
      .filter(Boolean),
  );
  const boostEntries = Object.entries(tonicBoosts ?? {}).filter(([statId]) => tonicStatIds.has(statId));
  return (
    <section className="blacksmith-station">
      <header>
        <h4>City Tonic Lab</h4>
        <span>Repeatable recipes for permanent settlement boosts.</span>
      </header>
      <div className="city-area-costs city-chip-grid">
        <b>Current tonic boosts</b>
        {boostEntries.length === 0 ? (
          <span>None yet</span>
        ) : boostEntries.map(([statId, amount]) => (
          <span key={statId}>{cityRuleStatLabel(statId)} +{Math.floor(Number(amount) || 0)}</span>
        ))}
      </div>
      {CITY_TONIC_RECIPES.map((recipe) => {
        const inputEntries = Object.entries(recipe.inputs ?? {});
        const effectEntries = Object.entries(recipe.cityStatEffects ?? {});
        const hasInputs = inputEntries.every(([inputId, count]) => (
          (countInput?.(inputId) ?? 0) >= Math.max(1, Math.floor(Number(count) || 1))
        ));
        const inputText = inputEntries
          .map(([inputId, count]) => {
            const name = RESOURCE_DEFS[inputId]?.name ?? cityRuleStatLabel(inputId);
            const available = countInput?.(inputId) ?? 0;
            return `${count} ${name} (${available})`;
          })
          .join(" + ");
        const effectText = effectEntries
          .map(([statId, amount]) => `${Number(amount) > 0 ? "+" : ""}${Math.floor(Number(amount) || 0)} ${cityRuleStatLabel(statId)}`)
          .join(" | ");
        const firstEffectRawId = String(effectEntries[0]?.[0] ?? "trade");
        const firstEffectNormalizedId = firstEffectRawId.replaceAll("-", "_");
        const firstEffectId = CITY_STAT_ALIASES[firstEffectRawId] ?? CITY_STAT_ALIASES[firstEffectNormalizedId] ?? firstEffectNormalizedId;
        return (
          <div className="blacksmith-row" key={recipe.id}>
            <InventoryIcon iconUrl={CITY_STAT_ICON_URLS[firstEffectId] ?? CITY_STAT_ICON_URLS.trade} />
            <div>
              <b>{recipe.title}</b>
              <span>{recipe.description}</span>
              <span>{inputText} {"->"} {effectText} | {hasInputs ? "Ready" : "Missing inputs"}</span>
            </div>
            <button type="button" disabled={!hasInputs} onClick={() => onMix?.(recipe)}>
              Mix
            </button>
          </div>
        );
      })}
    </section>
  );
}

function CityArtifactPanel({ progress = {}, countResource, countItem, canBuyArtifact, onBuy }) {
  const bought = new Set(progress?.artifacts?.boughtIds ?? []);
  const hoverState = useFloatingProgressionHover();
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Monumenter</h4>
        <span>Koebes en gang og giver permanente byeffekter.</span>
      </header>
      <div className="city-progression-grid city-artifact-grid">
        {CITY_ARTIFACTS.map((artifact) => {
          const owned = bought.has(artifact.id);
          const buyCheck = canBuyArtifact?.(artifact) ?? { canBuy: false, reasons: [] };
          const imageUrl = artifact.imageUrl ?? artifact.iconUrl;
          return (
            <article
              className={`city-progression-tile city-artifact-card ${owned ? "active" : ""} ${!owned && !buyCheck.canBuy ? "locked" : ""}`}
              tabIndex="0"
              key={artifact.id}
              onMouseEnter={(event) => hoverState.open(event, { artifact })}
              onMouseLeave={hoverState.scheduleClose}
              onFocus={(event) => hoverState.open(event, { artifact })}
              onBlur={hoverState.scheduleClose}
            >
              <div className="city-progression-image-frame">
                {imageUrl ? <img src={imageUrl} alt="" draggable="false" /> : <span>{artifact.title?.slice(0, 2) ?? "?"}</span>}
              </div>
            </article>
          );
        })}
      </div>
      <FloatingProgressionHover hoverState={hoverState} className="city-artifact-hover" width={430} estimatedHeight={285}>
        {({ artifact }) => {
          const owned = bought.has(artifact.id);
          const buyCheck = canBuyArtifact?.(artifact) ?? { canBuy: false, reasons: [] };
          return (
            <>
              <header>
                <b>{artifact.title}</b>
                <span>{owned ? "Aktiv" : buyCheck.canBuy ? "Klar" : "Laast"}</span>
              </header>
              <p>{artifact.description}</p>
              <div className="city-effect-list">
                <span>{cityRuleEffectsText(artifact.effects?.cityStats)}</span>
                {artifact.effects?.worldEnergy && (
                  <span>{Object.entries(artifact.effects.worldEnergy).map(([id, amount]) => `${Number(amount) > 0 ? "+" : ""}${amount} ${id}`).join(" | ")}</span>
                )}
              </div>
              <CityArtifactCostList artifact={artifact} countResource={countResource} countItem={countItem} />
              <button type="button" disabled={owned || !buyCheck.canBuy} onClick={() => onBuy?.(artifact)}>
                {owned ? "Koebt" : "Koeb"}
              </button>
            </>
          );
        }}
      </FloatingProgressionHover>
    </section>
  );
}

function CityArtifactCostList({ artifact, countResource, countItem }) {
  const resourceEntries = [
    ...(artifact.cost?.gold ? [["gold", artifact.cost.gold]] : []),
    ...Object.entries(artifact.cost?.resources ?? {}),
  ];
  const itemEntries = artifact.cost?.items ?? [];
  return (
    <div className="city-area-costs city-chip-grid city-artifact-costs">
      {resourceEntries.length === 0 && itemEntries.length === 0 && <span>Gratis</span>}
      {resourceEntries.map(([resourceId, amount]) => {
        const available = countResource?.(resourceId) ?? 0;
        return (
          <span className={available >= amount ? "met" : "missing"} key={resourceId}>
            <InventoryIcon iconUrl={resourceId === "gold" ? ITEM_GOLD_ICON_URL : RESOURCE_DEFS[resourceId]?.iconUrl} />
            <b>{available}/{amount} {RESOURCE_DEFS[resourceId]?.name ?? resourceId}</b>
          </span>
        );
      })}
      {itemEntries.map((entry, index) => {
        const amount = Math.max(1, Math.floor(Number(entry.count) || 1));
        const available = countItem?.(entry) ?? 0;
        return (
          <span className={available >= amount ? "met" : "missing"} key={`${entry.questItemId ?? entry.uniqueId ?? entry.namedId ?? index}`}>
            <b>{available}/{amount} {entry.label ?? entry.questItemId ?? entry.uniqueId ?? entry.namedId ?? "item"}</b>
          </span>
        );
      })}
    </div>
  );
}

function useFloatingProgressionHover() {
  const [hover, setHover] = useState(null);
  const hideTimerRef = useRef(null);

  const clearHideTimer = () => {
    if (!hideTimerRef.current) return;
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const open = (event, payload) => {
    clearHideTimer();
    const rect = event.currentTarget.getBoundingClientRect();
    setHover({
      ...payload,
      rect: {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  const close = () => {
    clearHideTimer();
    setHover(null);
  };

  const scheduleClose = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => setHover(null), 80);
  };

  useEffect(() => () => clearHideTimer(), []);

  return { hover, open, close, scheduleClose, keepOpen: clearHideTimer };
}

function floatingProgressionHoverStyle(rect, width = 320, estimatedHeight = 240) {
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 720 : window.innerHeight;
  const margin = 14;
  const actualWidth = Math.min(width, Math.max(220, viewportWidth - margin * 2));
  let left = rect.left;
  if (left + actualWidth > viewportWidth - margin) left = viewportWidth - margin - actualWidth;
  if (left < margin) left = margin;

  let top = rect.bottom + 8;
  if (top + estimatedHeight > viewportHeight - margin) top = rect.top - estimatedHeight - 8;
  if (top < margin) top = margin;

  return {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(actualWidth)}px`,
  };
}

function FloatingProgressionHover({ hoverState, className = "", width = 320, estimatedHeight = 240, children }) {
  const hover = hoverState.hover;
  if (!hover?.rect || typeof document === "undefined") return null;
  return createPortal(
    <div
      className={`city-progression-floating-hover ${className}`}
      style={floatingProgressionHoverStyle(hover.rect, width, estimatedHeight)}
      onMouseEnter={hoverState.keepOpen}
      onMouseLeave={hoverState.scheduleClose}
    >
      {children(hover)}
    </div>,
    document.body,
  );
}

function CityPolicyPanel({ progress = {}, requirementEntries, exclusiveEntries, onToggle }) {
  const active = new Set(progress?.policies?.activeIds ?? []);
  const hoverState = useFloatingProgressionHover();
  const grouped = CITY_POLICIES.reduce((map, policy) => {
    const key = policy.category ?? "general";
    map[key] = [...(map[key] ?? []), policy];
    return map;
  }, {});
  return (
    <section className="blacksmith-station city-policy-panel">
      <header>
        <h4>Politik</h4>
        <span>Aktive regler taeller med i byens stats.</span>
      </header>
      <div className="city-policy-group-grid">
        {Object.entries(grouped).map(([category, policies]) => (
          <div className="city-policy-group" key={category}>
            <h5>{category}</h5>
            <div className="city-progression-grid city-policy-icon-grid">
              {policies.map((policy) => {
                const enabled = active.has(policy.id);
                const reqs = requirementEntries?.(policy) ?? [];
                const locked = reqs.some((entry) => !entry.met);
                const exclusives = enabled ? [] : exclusiveEntries?.(policy) ?? [];
                const blocked = exclusives.length > 0;
                const imageUrl = policy.imageUrl ?? policy.iconUrl ?? policyIconUrl(policy);
                return (
                  <article
                    className={`city-progression-tile city-policy-card ${enabled ? "active" : "inactive"} ${locked || blocked ? "locked" : ""}`}
                    key={policy.id}
                    role="button"
                    tabIndex="0"
                    onMouseEnter={(event) => hoverState.open(event, { policy, category, reqs, exclusives })}
                    onMouseLeave={hoverState.scheduleClose}
                    onFocus={(event) => hoverState.open(event, { policy, category, reqs, exclusives })}
                    onBlur={hoverState.scheduleClose}
                    onClick={() => onToggle?.(policy)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      onToggle?.(policy);
                    }}
                  >
                    <div className="city-progression-image-frame">
                      {imageUrl ? <img src={imageUrl} alt="" draggable="false" /> : <span>{policy.title?.slice(0, 2) ?? "?"}</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <FloatingProgressionHover hoverState={hoverState} className="city-policy-hover" width={285} estimatedHeight={205}>
        {({ policy, category, reqs = [], exclusives = [] }) => {
          const enabled = active.has(policy.id);
          const locked = reqs.some((entry) => !entry.met);
          const blocked = !enabled && exclusives.length > 0;
          return (
            <>
              <header>
                <b>{policy.title}</b>
                <span>{category} | {blocked ? "Blokeret" : locked ? "Krav mangler" : enabled ? "Aktiv" : "Inaktiv"}</span>
              </header>
              <p>{policy.description}</p>
              {blocked && (
                <div className="city-policy-requirements">
                  {exclusives.map((entry) => (
                    <span className="missing" key={entry.key}>Blokeret af aktiv policy: {entry.label}</span>
                  ))}
                </div>
              )}
              {blocked && exclusives.map((entry) => (
                <p className="city-policy-conflict-note" key={`${entry.key}:reason`}>
                  {entry.reason}
                </p>
              ))}
              {reqs.length > 0 && (
                <div className="city-policy-requirements">
                  {reqs.map((entry) => (
                    <span className={entry.met ? "met" : "missing"} key={entry.key}>{entry.label}</span>
                  ))}
                </div>
              )}
              <CityEffectChips effects={policy.effects?.cityStats} />
              <small>{blocked ? `Deaktiver ${exclusives.map((entry) => entry.label).join(", ")} for at aktivere denne policy.` : locked && !enabled ? "Krav mangler." : `Klik for at ${enabled ? "slukke" : "taende"}.`}</small>
            </>
          );
        }}
      </FloatingProgressionHover>
    </section>
  );
}

function policyIconUrl(policy) {
  const firstPositive = Object.entries(policy?.effects?.cityStats ?? {})
    .find(([, amount]) => Number(amount) > 0)?.[0];
  const firstStat = firstPositive ?? Object.keys(policy?.effects?.cityStats ?? {})[0];
  const normalized = CITY_STAT_ALIASES[firstStat] ?? firstStat;
  return CITY_STAT_ICON_URLS[normalized] ?? CITY_STAT_ICON_URLS.culture;
}

function CityAchievementPanel({ progress = {}, snapshot = emptySnapshot, unlockedLevels = {} }) {
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Bedrifter</h4>
        <span>Hall of Deeds</span>
      </header>
      <div className="city-progression-grid city-achievement-list">
        {CITY_ACHIEVEMENTS.map((achievement) => {
          const unlocked = unlockedLevels[achievement.id] ?? progress?.achievements?.unlockedLevelById?.[achievement.id] ?? 0;
          const levels = achievement.levels ?? [];
          const achievedTier = unlocked > 0 ? achievementTierClass(levels[unlocked - 1]?.tier, levels.length, unlocked - 1) : "locked";
          const imageUrl = achievement.imageUrl ?? achievement.iconUrl ?? achievementIconUrl(achievement);
          return (
            <article className={`city-progression-tile city-achievement-card ${unlocked > 0 ? "unlocked" : "locked"} achievement-tier-${achievedTier}`} tabIndex="0" key={achievement.id}>
              <div className="city-progression-image-frame">
                {imageUrl ? <img src={imageUrl} alt="" draggable="false" /> : <span>{achievement.title?.slice(0, 2) ?? "?"}</span>}
              </div>
              <div className="city-progression-hover">
                <header>
                  <b>{achievement.title}</b>
                  <span>{achievement.category} | {unlocked}/{levels.length}</span>
                </header>
                <p>{achievement.description}</p>
                <div className="city-achievement-tiers">
                  {levels.map((level, index) => {
                    const progressText = achievementLevelProgressText(level, snapshot, progress);
                    return (
                      <span className={`${index < unlocked ? "met" : "missing"} tier-${achievementTierClass(level.tier, levels.length, index)}`} key={`${achievement.id}-${index}`}>
                        <b>{achievementTierLabel(level.tier, levels.length, index)}</b>
                        <em>{progressText}</em>
                        {level.effects?.cityStats && <small>{cityRuleEffectsText(level.effects.cityStats)}</small>}
                      </span>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function achievementLevelProgressText(level, snapshot = emptySnapshot, cityProgress = {}) {
  const conditionProgress = achievementConditionProgress(level?.condition ?? level?.conditions, snapshot, cityProgress);
  if (!conditionProgress) return "0/1";
  return `${formatCompactNumber(conditionProgress.current)}/${formatCompactNumber(conditionProgress.target)}${conditionProgress.label ? ` ${conditionProgress.label}` : ""}`;
}

function achievementConditionProgress(condition, snapshot = emptySnapshot, cityProgress = {}) {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) return null;
  if (Array.isArray(condition.all)) {
    const entries = condition.all.map((entry) => achievementConditionProgress(entry, snapshot, cityProgress)).filter(Boolean);
    if (entries.length === 0) return null;
    return {
      current: entries.filter((entry) => Number(entry.current) >= Number(entry.target)).length,
      target: entries.length,
      label: "krav",
    };
  }
  if (Array.isArray(condition.any)) {
    const entries = condition.any.map((entry) => achievementConditionProgress(entry, snapshot, cityProgress)).filter(Boolean);
    if (entries.length === 0) return null;
    return entries.reduce((best, entry) => {
      const bestRatio = Number(best.current) / Math.max(1, Number(best.target));
      const entryRatio = Number(entry.current) / Math.max(1, Number(entry.target));
      return entryRatio > bestRatio ? entry : best;
    }, entries[0]);
  }
  if (condition.player && typeof condition.player === "object") {
    const [path, numberCondition] = Object.entries(condition.player)[0] ?? [];
    const target = conditionTargetNumber(numberCondition);
    return {
      current: clampProgressNumber(readObjectPath(snapshot?.player, path), target),
      target,
      label: achievementConditionLabel(path),
    };
  }
  if (condition.counter !== undefined) {
    const counterId = typeof condition.counter === "object"
      ? condition.counter.id ?? condition.counter.key
      : condition.counter;
    const target = conditionTargetNumber(typeof condition.counter === "object" ? { ...condition.counter, ...condition } : condition);
    return {
      current: clampProgressNumber(snapshot?.worldState?.counters?.[String(counterId)] ?? 0, target),
      target,
      label: achievementConditionLabel(counterId),
    };
  }
  if (condition.cityAreaLevels && typeof condition.cityAreaLevels === "object") {
    const entries = Object.entries(condition.cityAreaLevels);
    return {
      current: entries.filter(([areaId, numberCondition]) => {
        const areaState = getCityAreaStateForId(cityProgress, areaId);
        const currentLevel = areaState.unlocked ? Math.max(0, Math.floor(Number(areaState.level) || 0)) : 0;
        return currentLevel >= conditionTargetNumber(numberCondition);
      }).length,
      target: entries.length,
      label: condition.progressLabel ?? "områder",
    };
  }
  if (condition.tagKills && typeof condition.tagKills === "object") {
    const [tagId, numberCondition] = Object.entries(condition.tagKills)[0] ?? [];
    const target = conditionTargetNumber(numberCondition);
    return {
      current: clampProgressNumber(snapshot?.worldState?.counters?.[`tagKill.${tagId}`] ?? 0, target),
      target,
      label: tagId,
    };
  }
  if (condition.questCompleted) {
    const completed = new Set((snapshot?.quests?.completed ?? []).map(String));
    return {
      current: completed.has(String(condition.questCompleted)) ? 1 : 0,
      target: 1,
      label: "quest",
    };
  }
  if (condition.flag) {
    return {
      current: snapshot?.worldState?.flags?.[String(condition.flag)] ? 1 : 0,
      target: 1,
      label: "flag",
    };
  }
  return null;
}

function conditionTargetNumber(condition) {
  if (typeof condition === "number") return Math.max(1, Number(condition) || 1);
  if (!condition || typeof condition !== "object") return 1;
  if (condition.min !== undefined) return Math.max(1, Number(condition.min) || 1);
  if (condition.gte !== undefined) return Math.max(1, Number(condition.gte) || 1);
  if (condition.gt !== undefined) return Math.max(1, (Number(condition.gt) || 0) + 1);
  if (condition.equals !== undefined) return Math.max(1, Number(condition.equals) || 1);
  return 1;
}

function clampProgressNumber(value, target) {
  return Math.max(0, Math.min(Number(target) || 1, Math.floor(Number(value) || 0)));
}

function readObjectPath(source, path) {
  if (!source || !path) return 0;
  return String(path).split(".").reduce((value, key) => value?.[key], source);
}

function achievementConditionLabel(id) {
  const key = String(id ?? "");
  if (key === "stats.killsTotal") return "kills";
  if (key === "resourceCollected.bonedust") return "bonedust";
  if (key === "questCompleted.faction.village_outskirt") return "quests";
  if (key === "cityMobGroupsDefeated.hero") return "city monster-grupper";
  if (key.startsWith("region.") && key.endsWith(".unlocked")) return "regioner";
  return key.split(".").at(-1) ?? "";
}

function formatCompactNumber(value) {
  return Math.floor(Number(value) || 0).toLocaleString("da-DK");
}

function achievementTierLabel(tier, total, index) {
  if (tier) return String(tier);
  if (total === 1) return "gold";
  if (total === 2) return index === 0 ? "silver" : "gold";
  return ["bronze", "silver", "gold"][index] ?? `tier ${index + 1}`;
}

function achievementTierClass(tier, total, index) {
  return achievementTierLabel(tier, total, index).toLowerCase();
}

function achievementIconUrl(achievement) {
  const fallbacks = {
    monster_slayer: "/assets/generated/mobs/skeleton_animated_sheet.png",
    defender_of_the_city: "/assets/generated/house/house_townhall.png",
    village_outskirt_defender: "/assets/generated/map/map_villageoutskirts_v2.png",
    spiders_bane: "/assets/generated/mobs/spider_animated_sheet.png",
    fenris_bane: "/assets/generated/mini/mini_wolf.png",
    bone_collector: "/assets/generated/item/item_res_bonedust.png",
    savior_of_village_outskirt: "/assets/generated/map/map_villageoutskirts_v2.png",
    farmer: "/assets/generated/house/house_farm.png",
    lord_of_the_moats: "/assets/generated/city/city_water1.png",
    hero_of_the_city: "/assets/generated/achievement/defenderofthecity.png",
  };
  return fallbacks[achievement?.id] ?? "/assets/generated/item/item_goldidol.png";
}

function CitySocketPanel({ inventory, gold, onAddSocket, onSocketGem }) {
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const socketItems = (inventory ?? []).filter((item) => itemCanHaveSockets(item));
  const gems = (inventory ?? []).filter((item) => item?.mode === "resource" && GEM_SOCKET_BONUSES[item.resourceId]);
  const selectedItem = inventory?.[selectedItemIndex] ?? null;
  const selectedSockets = normalizeSockets(selectedItem?.sockets);
  const addCost = selectedItem ? 500 * (selectedSockets.length + 1) : 0;
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Socket Workbench</h4>
        <span>Max {MAX_ITEM_SOCKETS} sockets. Socketed gems are consumed.</span>
      </header>
      <div className="city-bank-panel">
        <div className="city-bank-column">
          <h4>Gear</h4>
          {socketItems.length === 0 && <p>No socketable gear in backpack.</p>}
          {socketItems.map((item) => (
            <div className={`blacksmith-row ${selectedItemIndex === item.index ? "selected-row" : ""}`} key={item.id}>
              <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
              <div>
                <CityItemName item={item} />
                <span>{socketText(item)}</span>
              </div>
              <button type="button" onClick={() => setSelectedItemIndex(item.index)}>Select</button>
            </div>
          ))}
        </div>
        <div className="city-bank-column">
          <h4>Selected</h4>
          {!selectedItem && <p>Select gear first.</p>}
          {selectedItem && (
            <>
              <div className="blacksmith-row">
                <InventoryIcon iconIndex={selectedItem.iconIndex} iconSheet={selectedItem.iconSheet} iconUrl={selectedItem.iconUrl} />
                <div>
                  <CityItemName item={selectedItem} />
                  <span>{socketText(selectedItem)}</span>
                </div>
                <button type="button" disabled={selectedSockets.length >= MAX_ITEM_SOCKETS || gold < addCost} onClick={() => onAddSocket(selectedItemIndex)}>
                  Add {addCost} G
                </button>
              </div>
              {gems.length === 0 && <p>No socket gemstones in backpack.</p>}
              {gems.map((gem) => (
                <div className="blacksmith-row" key={gem.id}>
                  <InventoryIcon iconIndex={gem.iconIndex} iconSheet={gem.iconSheet} iconUrl={gem.iconUrl} />
                  <div>
                    <CityItemName item={gem} />
                    <span>{socketBonusText(gem.resourceId)} | x{gem.count ?? 1}</span>
                  </div>
                  <button type="button" disabled={!selectedSockets.some((socket) => !socket)} onClick={() => onSocketGem(selectedItemIndex, gem.index)}>
                    Insert
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function CityMerchantPanel({ inventory, stock, gold, popularity, cityEventModifiers = {}, onSell, onBuy }) {
  const [tradeDraft, setTradeDraft] = useState(null);
  const sellable = (inventory ?? []).filter(merchantItemCanTrade);
  const openTrade = (mode, item, index) => {
    const max = mode === "buy"
      ? merchantTradeMax(item)
      : merchantTradeMax(item);
    const unitPrice = mode === "buy" ? merchantBuyPrice(item, popularity, cityEventModifiers) : merchantSellPrice(item, popularity, cityEventModifiers);
    setTradeDraft({ mode, item, index, quantity: 1, max, unitPrice });
  };
  const confirmTrade = () => {
    if (!tradeDraft) return;
    if (tradeDraft.mode === "buy") onBuy(tradeDraft.index, tradeDraft.quantity);
    else onSell(tradeDraft.index, tradeDraft.quantity);
    setTradeDraft(null);
  };
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Merchant</h4>
        <span>Gold {gold} | Popularity {Math.round(popularity ?? 0)}%</span>
      </header>
      <div className="city-bank-panel">
        <div className="city-bank-column">
          <h4>Sell</h4>
          {sellable.length === 0 && <p>No sellable items in backpack.</p>}
          {sellable.map((item) => (
            <div className="blacksmith-row" key={item.id}>
              <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
              <div>
                <CityItemName item={item} />
                <span>{merchantSellPrice(item, popularity, cityEventModifiers)} G each | have {merchantTradeMax(item)} | value {item.value ?? itemValue(item)}</span>
              </div>
              <button type="button" onClick={() => openTrade("sell", item, item.index)}>Sell</button>
            </div>
          ))}
        </div>
        <div className="city-bank-column">
          <h4>Buy <span>sold items stay here</span></h4>
          {(stock ?? []).length === 0 && <p>No stock this visit.</p>}
          {(stock ?? []).map((item, index) => {
            const price = merchantBuyPrice(item, popularity, cityEventModifiers);
            return (
              <div className="blacksmith-row" key={`${item.id}-${index}`}>
                <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
                <div>
                  <CityItemName item={item} />
                  <span>{price} G each | stock {merchantTradeMax(item)} | {item.mode === "resource" ? `resource` : item.rarityLabel}</span>
                </div>
                <button type="button" disabled={gold < price} onClick={() => openTrade("buy", item, index)}>Buy</button>
              </div>
            );
          })}
        </div>
      </div>
      {tradeDraft && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setTradeDraft(null)}>
          <section className="confirm-card merchant-trade-modal" role="dialog" aria-modal="true" aria-label="Confirm trade" onClick={(event) => event.stopPropagation()}>
            <h3>{tradeDraft.mode === "buy" ? "Buy" : "Sell"} {tradeDraft.item.name}</h3>
            <p>{tradeDraft.unitPrice} G each | max {tradeDraft.max}</p>
            <label>
              Quantity
              <input
                type="number"
                min="1"
                max={tradeDraft.max}
                value={tradeDraft.quantity}
                onChange={(event) => setTradeDraft((current) => ({
                  ...current,
                  quantity: Math.max(1, Math.min(current.max, Math.floor(Number(event.target.value) || 1))),
                }))}
              />
            </label>
            <div className="merchant-quantity-actions">
              <button
                type="button"
                onClick={() => setTradeDraft((current) => ({
                  ...current,
                  quantity: Math.min(current.max, current.quantity + 5),
                }))}
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => setTradeDraft((current) => ({
                  ...current,
                  quantity: Math.min(current.max, current.quantity + 10),
                }))}
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => setTradeDraft((current) => ({
                  ...current,
                  quantity: current.max,
                }))}
              >
                All
              </button>
            </div>
            <b>Total: {tradeDraft.unitPrice * tradeDraft.quantity} G</b>
            <div>
              <button type="button" onClick={() => setTradeDraft(null)}>Cancel</button>
              <button type="button" disabled={tradeDraft.mode === "buy" && gold < tradeDraft.unitPrice * tradeDraft.quantity} onClick={confirmTrade}>
                Accept
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function CitySkillTreePanel({ player, onBuyRank }) {
  const tree = normalizeSkillTree(player?.skillTree);
  const points = skillTreeAvailablePoints(player?.level ?? 1, tree);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Sanctuary Training</h4>
        <span>{points} skill point{points === 1 ? "" : "s"} available</span>
      </header>
      {SKILL_TREE_BRANCHES.map((branch) => {
        const branchPoints = skillTreeBranchSpentPoints(tree, branch.id);
        return (
          <div className="skill-branch" key={branch.id}>
            <header>
              <h5>{branch.title}</h5>
              <span>{branchPoints} points</span>
            </header>
            <p>{branch.description}</p>
            {branch.nodes.map((node) => {
              const rank = tree[node.id] ?? 0;
              const locked = branchPoints < (node.requiresBranchPoints ?? 0);
              const capped = rank >= node.maxRank;
              return (
                <div className={`blacksmith-row ${locked ? "locked" : ""}`} key={node.id}>
                  <div>
                    <b>{node.title} {rank}/{node.maxRank}</b>
                    <span>{locked ? `Requires ${node.requiresBranchPoints} points in ${branch.title}. ` : ""}{node.description}</span>
                  </div>
                  <button
                    type="button"
                    disabled={points <= 0 || locked || capped}
                    onClick={() => onBuyRank(node.id)}
                  >
                    Rank
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

function formatClassBonusValue(key, value) {
  const amount = Number(value) || 0;
  const pct = key.endsWith("Bonus")
    || ["critChance", "critDamage", "blockChance", "dodgeChance", "attackSpeed", "lifeSteal", "maxHpPct", "maxManaPct", "damagePct", "speedPct"].includes(key);
  if (pct) return `${amount > 0 ? "+" : ""}${Math.round(amount * 100)}% ${key}`;
  return `${amount > 0 ? "+" : ""}${Number.isInteger(amount) ? amount : amount.toFixed(2)} ${key}`;
}

function classNodeRequirementText(node) {
  const entries = [];
  for (const nodeId of node?.requires ?? []) {
    entries.push(`Requires ${CLASS_NODE_BY_ID[nodeId]?.title ?? nodeId}`);
  }
  if (node?.requiresBuilding) entries.push(`Requires building: ${cityBuildingName(node.requiresBuilding)}`);
  if (node?.requiresAddon) entries.push(`Requires addon: ${cityAddonName(node.requiresAddon)}`);
  if (node?.requiresResearch) entries.push(`Requires research: ${node.requiresResearch}`);
  return entries.length ? entries.join(" | ") : "No requirements";
}

function CityClassPanel({ player, progress, onChooseClass, onResetClass, onUnlockNode }) {
  const sanctuaryBuilt = hasCityBuilding(progress, "sanctuary");
  const classId = normalizeClassId(player?.classId);
  const classChosen = classId !== DEFAULT_CLASS_ID;
  const classConfig = getClassConfig(classId);
  const classPoints = classPointsAvailable(player);
  const context = cityRequirementContext(progress);
  const baseNodeId = `${classId}.base`;
  const unlockedNodeIds = (player?.classNodes ?? []).map(String);
  const canResetClass = classChosen && unlockedNodeIds.every((nodeId) => nodeId === baseNodeId);

  if (!sanctuaryBuilt && !classChosen) {
    return (
      <section className="blacksmith-station class-panel" aria-label="Class training">
        <header>
          <h4>Class Training</h4>
          <span>{classConfig?.name ?? "Adventurer"}</span>
        </header>
        <p>Build the Sanctuary to unlock class training.</p>
      </section>
    );
  }

  if (!classChosen) {
    const classOptions = Object.values(CLASS_DEFS).filter((entry) => entry.id !== DEFAULT_CLASS_ID);
    return (
      <section className="blacksmith-station class-panel" aria-label="Choose class">
        <header>
          <h4>Choose Class</h4>
          <span>Base training is unlocked for free.</span>
        </header>
        <div className="class-choice-grid">
          {classOptions.map((option) => (
            <button type="button" className="class-choice-card" key={option.id} onClick={() => onChooseClass?.(option.id)}>
              <b>{option.name}</b>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const classNodes = Object.values(classConfig?.nodes ?? {});
  const unlocked = new Set(player?.classNodes ?? []);
  return (
    <section className="blacksmith-station class-panel" aria-label="Class progression">
      <header>
        <h4>{player?.className ?? classConfig?.name ?? "Class"} Training</h4>
        <span>{classPoints} class point{classPoints === 1 ? "" : "s"} available</span>
      </header>
      {canResetClass && (
        <button
          type="button"
          className="class-reset-button"
          title="Only available before unlocking class nodes beyond the free base node."
          onClick={() => {
            if (window.confirm("Reset class choice? You can choose another class afterwards.")) onResetClass?.();
          }}
        >
          Reset class choice
        </button>
      )}
      <div className="class-node-list">
        {classNodes.length === 0 ? (
          <span className="class-empty">No class nodes available.</span>
        ) : classNodes.map((node) => {
          const unlockedNode = unlocked.has(node.id);
          const unlockCheck = canUnlockClassNodeForPlayer(player, node.id, context);
          const bonuses = Object.entries(node.bonuses ?? {});
          return (
            <article className={`class-node ${unlockedNode ? "unlocked" : ""}`} key={node.id}>
              <div>
                <b>{node.title}</b>
                <span>{classNodeRequirementText(node)}</span>
              </div>
              <div className="class-node-bonuses">
                {bonuses.map(([key, value]) => (
                  <em key={key}>{formatClassBonusValue(key, value)}</em>
                ))}
              </div>
              <button
                type="button"
                disabled={unlockedNode || !unlockCheck.ok}
                title={unlockedNode ? "Unlocked" : unlockCheck.ok ? "Unlock node" : unlockCheck.reason}
                onClick={() => onUnlockNode?.(node.id)}
              >
                {unlockedNode ? "Unlocked" : "Unlock"}
              </button>
            </article>
          );
        })}
      </div>
      <span className="class-unlocked">
        Unlocked: {(player?.classNodes ?? []).map((nodeId) => CLASS_NODE_BY_ID[nodeId]?.title ?? nodeId).join(", ") || "None"}
      </span>
    </section>
  );
}

function CityArcaneExtractorPanel({ inventory, onExtract }) {
  const candidates = (inventory ?? []).filter(canExtractArcaneEssence);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Arcane Extractor</h4>
        <span>Green+ non-unique gear {"->"} Magic Essence</span>
      </header>
      {candidates.length === 0 && <p>No extractable gear in backpack.</p>}
      {candidates.map((item) => (
        <div className="blacksmith-row" key={item.id}>
          <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
          <div>
            <CityItemName item={item} />
            <span>{item.rarityLabel} | becomes normal and loses rarity stats</span>
          </div>
          <button type="button" onClick={() => onExtract(item.index)}>Extract</button>
        </div>
      ))}
    </section>
  );
}

function CityReadableMergePanel({ inventory, kind, salvageEntries = [], paperCount = 0, salvageRecipes = READABLE_SALVAGE_CONFIG.craftRecipes, onMerge, onRecycleReadable, onCraftReadableRecipe }) {
  const parts = (inventory ?? []).filter((item) => (
    isReadableItem(item)
    && item.readableStatus === "mergeable"
    && item.readableKind === kind
  ));
  const paperDef = RESOURCE_DEFS.paper;
  const scrollRecipe = salvageRecipes.find((recipe) => recipe.id === "paper_to_scroll") ?? salvageRecipes[0];
  const inputCount = Math.max(1, Math.floor(Number(scrollRecipe?.input?.count) || 20));
  const outputCount = Math.max(1, Math.floor(Number(scrollRecipe?.output?.count) || 1));
  const outputDef = RESOURCE_DEFS[scrollRecipe?.output?.itemId] ?? null;
  return (
    <>
      <section className="blacksmith-station">
        <header>
          <h4>{kind === "spellbook" ? "Spellbook Assembly" : "Lorebook Assembly"}</h4>
          <span>{kind === "spellbook" ? "Merge spellbook fragments here" : "Merge lore notes here"}</span>
        </header>
        {parts.length === 0 && <p>No matching readable fragments in backpack.</p>}
        {parts.map((item) => (
          <div className="blacksmith-row" key={item.id}>
            <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
            <div>
              <CityItemName item={item} />
              <span>{item.summaryText ?? item.readableStatus}</span>
            </div>
            <button type="button" onClick={() => onMerge(item.index)}>Merge</button>
          </div>
        ))}
      </section>
      <section className="blacksmith-station">
        <header>
          <h4>Recycle Readables</h4>
          <span>Old notes and books {"->"} {paperDef?.name ?? "Paper"}</span>
        </header>
        {salvageEntries.length === 0 && <p>Du har ingen readables, der kan laves om til paper.</p>}
        {salvageEntries.map((entry) => (
          <div className="blacksmith-row" key={entry.key}>
            <InventoryIcon iconIndex={entry.item.iconIndex} iconSheet={entry.item.iconSheet} iconUrl={entry.item.iconUrl} />
            <div>
              <CityItemName item={entry.item} />
              <span>{entry.sourceLabel} | gives {entry.paperValue} {paperDef?.name ?? "Paper"}</span>
            </div>
            <button type="button" onClick={() => onRecycleReadable?.(entry)}>Recycle</button>
          </div>
        ))}
      </section>
      <section className="blacksmith-station">
        <header>
          <h4>Craft Scrolls</h4>
          <span>Paper owned: {paperCount}</span>
        </header>
        <div className="blacksmith-row">
          <InventoryIcon iconUrl={outputDef?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: scrollRecipe?.output?.itemId ?? "scroll" }))} />
          <div>
            <b>{scrollRecipe?.label ?? "Craft Scroll"}</b>
            <span>{inputCount} {paperDef?.name ?? "Paper"} {"->"} {outputCount} {outputDef?.name ?? "Scroll"}</span>
          </div>
          <button type="button" disabled={paperCount < inputCount} onClick={() => onCraftReadableRecipe?.(scrollRecipe)}>
            Craft
          </button>
        </div>
      </section>
    </>
  );
}

export {
  CityBlacksmithPanel,
  CityGoldBarPanel,
  CityFarmAlePanel,
  CityFarmPanel,
  CityInnAlePanel,
  CitySanctuaryDonationPanel,
  CityResearchPanel,
  CitySocketPanel,
  CityMerchantPanel,
  CityClassPanel,
  CitySkillTreePanel,
  CityArcaneExtractorPanel,
  CityReadableMergePanel,
  CityPotionLabPanel,
  CityTonicLabPanel,
  CityArtifactPanel,
  CityPolicyPanel,
  CityAchievementPanel,
};
