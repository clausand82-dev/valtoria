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
import { localizeItemField, useLocalization } from "../i18n/index.js";

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
  const { t } = useLocalization();
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
          title={t("city.blacksmith.weaponAnvil")}
          enabled={hasWeaponAnvil}
          lockedText={t("city.blacksmith.weaponAnvilLocked")}
          inventory={snapshot.inventory}
          category="weapon"
          onMerge={(indices) => engineRef.current?.mergeInventoryGearAtBlacksmith?.(indices[0], "weapon", indices)}
        />
      )}
      {activeAddonId === "armor_anvil" && (
        <BlacksmithMergeStation
          title={t("city.blacksmith.armorAnvil")}
          enabled={hasArmorAnvil}
          lockedText={t("city.blacksmith.armorAnvilLocked")}
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
  const { t } = useLocalization();
  const equipment = snapshot.equipment ?? [];
  const equippedItems = equipment
    .filter((slot) => slot.item != null)
    .map((slot) => ({
      id: `equipped-${slot.id}`,
      source: "equipped",
      sourceLabel: t("inventory.equippedItem"),
      slotId: slot.id,
      label: slot.label,
      item: slot.item,
    }));
  const backpackItems = (snapshot.inventory ?? [])
    .filter((item) => isEquippableItem(item))
    .map((item) => ({
      id: `backpack-${item.id}`,
      source: "backpack",
      sourceLabel: t("hud.backpack"),
      inventoryIndex: item.index,
      label: item.slot === "weapon" ? t("inventory.slot.weapon") : item.slot === "ring" ? t("inventory.type.ring") : item.slot,
      item,
    }));
  const repairItems = [...equippedItems, ...backpackItems];

  if (repairItems.length === 0) {
    return (
      <section className="blacksmith-station">
        <header><h4>{t("city.blacksmith.repair")}</h4><span>{t("city.blacksmith.noEquippedGear")}</span></header>
        <p style={{ color: "#aaa", fontSize: "0.82em" }}>{t("city.blacksmith.equipGearToRepair")}</p>
      </section>
    );
  }

  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.blacksmith.repair")}</h4>
        <span>{t("city.blacksmith.clickItemToRepair")}</span>
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
  const { localize, t } = useLocalization();
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
          <span className="repair-slot-name" style={{ color: item.rarityColor ?? "#f5f3ea" }}>{localizeItemField(item, "name", localize)}</span>
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
          {dur <= 0 && ` - ${t("inventory.unusable")}`}
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
            {t("action.repair")}
          </button>
        </div>
      )}
      {!isFullyRepaired && isNonRepairable && (
        <span className="repair-done">{t("city.blacksmith.cannotRepair")}</span>
      )}
      {isFullyRepaired && (
        <span className="repair-done">{t("ui.ok")}</span>
      )}
    </div>
  );
}

function BlacksmithMergeStation({ title, enabled, lockedText, inventory, category, onMerge }) {
  const { t } = useLocalization();
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
        <span>{enabled ? t("city.blacksmith.dragThreeMatching") : lockedText}</span>
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
            {t("inventory.merge")}
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
  const { t } = useLocalization();
  const junkYieldMultiplier = blacksmithModifiers.forgeJunkYieldMultiplier ?? 1;
  return (
    <section className={`blacksmith-station ${enabled ? "" : "locked"}`}>
      <header>
        <h4>{t("city.blacksmith.forge.title")}</h4>
        <span>{enabled ? t("city.blacksmith.forge.description", { bonus: junkYieldMultiplier !== 1 ? t("city.blacksmith.forge.junkYield", { value: Math.round(junkYieldMultiplier * 100) }) : "" }) : t("city.blacksmith.forge.locked")}</span>
      </header>
      {!enabled && <p>{t("city.blacksmith.forge.lockedBody")}</p>}
      {enabled && gear.length === 0 && <p>{t("city.blacksmith.noGearInBackpack")}</p>}
      {enabled && gear.map((item) => (
        <div className="blacksmith-row" key={item.id}>
          <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
          <div>
            <CityItemName item={item} />
            <span>{item.rarityLabel} | L{item.level} | {item.slot ?? item.mode}</span>
          </div>
          <button type="button" className="danger-action" onClick={() => onDestroy(item.index)}>
            {t("action.destroy")}
          </button>
        </div>
      ))}
    </section>
  );
}

function CityGoldBarPanel({ gold, inventory, popularity, resourceCount, blacksmithModifiers = {}, onSmelt, onSmeltIron }) {
  const { t } = useLocalization();
  const unitCost = Math.max(1, Math.ceil(goldBarUnitCost(popularity) * (blacksmithModifiers.goldBarCostMultiplier ?? 1)));
  const ironPieceCost = 3 + Math.max(0, Math.floor(Number(blacksmithModifiers.metalBarInputCostBonus) || 0));
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(inventory, resourceId));
  const ironPieces = countResource("iron_piece");
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.minting.title")}</h4>
        <span>{t("city.minting.description")}</span>
      </header>
      <div className="blacksmith-row">
        <InventoryIcon iconSheet="items" iconUrl="/assets/generated/item/item_res_goldbar.png" />
        <div>
          <b>{t("city.minting.goldBar")}</b>
          <span>{t("city.minting.goldBarRecipe", { cost: unitCost, popularity: Math.round(popularity ?? 0), available: gold })}</span>
        </div>
        <button type="button" disabled={gold < unitCost} onClick={onSmelt}>{t("city.minting.smelt")}</button>
      </div>
      <div className="blacksmith-row">
        <InventoryIcon iconSheet="resources" iconIndex={RESOURCE_DEFS.iron_bar?.iconIndex} iconUrl={RESOURCE_DEFS.iron_bar?.iconUrl} />
        <div>
          <b>{t("city.minting.ironBar")}</b>
          <span>{t("city.minting.ironBarRecipe", { cost: ironPieceCost, available: ironPieces })}</span>
        </div>
        <button type="button" disabled={ironPieces < ironPieceCost} onClick={() => onSmeltIron?.(ironPieceCost)}>{t("city.minting.smelt")}</button>
      </div>
    </section>
  );
}

function CityFarmPanel({ inventory, popularity, resourceCount, onProduceFoodBarrel, onProduceProvision }) {
  const { localize, t } = useLocalization();
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(inventory, resourceId));
  const foodBarrelRecipe = CITY_STATS_RULES.farmFoodBarrelRecipe ?? {};
  const foodBarrelOutputId = String(foodBarrelRecipe.outputResourceId ?? "food");
  const foodBarrelOutputCount = Math.max(1, Math.floor(Number(foodBarrelRecipe.outputCount) || 1));
  const foodBarrelOptions = (foodBarrelRecipe.inputOptions ?? []).map((option) => ({
    id: String(option?.resourceId ?? ""),
    label: localize(option, "label") || String(option?.resourceId ?? "Unknown"),
    baseCost: option?.baseCost,
    minCost: option?.minCost,
  })).filter((option) => option.id);
  const provisionOptions = CITY_STATS_RULES.farmProvisionRecipes ?? [];
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.farm.foodBarrels")}</h4>
        <span>{t("city.farm.foodBarrelsDescription")}</span>
      </header>
      {foodBarrelOptions.map((option) => {
        const available = countResource(option.id);
        const def = RESOURCE_DEFS[option.id];
        const foodBarrelCostValue = foodBarrelCost(popularity, option);
        return (
          <div className="blacksmith-row" key={`barrel-${option.id}`}>
            <InventoryIcon iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: option.id }))} />
            <div>
              <b>{localize(option, "label")}</b>
              <span>{t("city.farm.foodBarrelRecipe", { needed: foodBarrelCostValue, available, popularity: Math.round(popularity ?? 0) })}</span>
            </div>
            <button
              type="button"
              disabled={available < foodBarrelCostValue}
              onClick={() => onProduceFoodBarrel(option.id, foodBarrelCostValue, foodBarrelOutputId, foodBarrelOutputCount)}
            >
              {t("city.farm.make")}
            </button>
          </div>
        );
      })}
      <header>
        <h4>{t("city.farm.provision")}</h4>
        <span>{t("city.farm.provisionDescription")}</span>
      </header>
      {provisionOptions.map((option) => {
        const available = countResource(option.resourceId);
        const def = RESOURCE_DEFS[option.resourceId];
        return (
          <div className="blacksmith-row" key={`provision-${option.resourceId}`}>
            <InventoryIcon iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: option.resourceId }))} />
            <div>
              <b>{option.label}</b>
              <span>{t("city.farm.provisionRecipe", { cost: option.cost, provision: option.provision, available })}</span>
            </div>
            <button type="button" disabled={available < option.cost} onClick={() => onProduceProvision(option.resourceId, option.cost, option.provision)}>{t("city.farm.convert")}</button>
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
  const { localize, t } = useLocalization();
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(inventory, resourceId));
  const countPotion = potionCount ?? (() => 0);
  const trades = CITY_STATS_RULES.sanctuaryDonationTrades ?? [];
  const multiplier = Math.max(0, Number(effectMultiplier) || 1);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.sanctuary.donation")}</h4>
        <span>{t("city.sanctuary.donationDescription")}</span>
        {multiplier !== 1 && <p>{t("city.sanctuary.donationMultiplier", { value: multiplier.toFixed(2) })}</p>}
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
              <b>{localize(trade, "label") || item.def?.name || item.id}</b>
              <span>{t("city.recipe.availableLine", { input: `${cost} ${item.def?.name ?? item.id}`, output: cityRuleEffectsText(scaleCityRuleEffects(trade.effects, multiplier)), available })}</span>
            </div>
            <button type="button" disabled={available < cost} onClick={() => onDonate(trade)}>{t("city.sanctuary.donate")}</button>
          </div>
        );
      })}
    </section>
  );
}

function CityFarmAlePanel({ inventory, cityStats, resourceCount, onBrewAle }) {
  const { localize } = useLocalization();
  const { t } = useLocalization();
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
    .map(([resourceId, amount]) => `${Math.max(1, Math.floor(Number(amount) || 1))} ${localize(RESOURCE_DEFS[resourceId], "name") || resourceId}`)
    .concat(statCosts.map(([statId, amount]) => `${Math.max(1, Math.floor(Number(amount) || 1))} ${cityRuleStatLabel(statId)}`))
    .join(" + ");
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.ale.brewing")}</h4>
        <span>{inputText} {"->"} {outputCount} {localize(outputDef, "name") || outputResourceId}</span>
      </header>
      <div className="blacksmith-row">
        <InventoryIcon iconUrl={outputDef?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: outputResourceId }))} />
        <div>
          <b>{localize(outputDef, "name") || outputResourceId}</b>
          <span>{t("city.ale.inputsStatus", { water: Math.max(0, Math.floor(Number(cityStats?.water) || 0)), wheat: countResource("wheat"), wood: countResource("wood_plank") })}</span>
        </div>
        <button type="button" disabled={!hasResources || !hasStats} onClick={() => onBrewAle(recipe)}>{t("city.ale.brew")}</button>
      </div>
    </section>
  );
}

function CityInnAlePanel({ inventory, resourceCount, onServeAle }) {
  const { localize, t } = useLocalization();
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(inventory, resourceId));
  const trades = CITY_STATS_RULES.innAleTrades ?? [];
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.ale.sales")}</h4>
        <span>{t("city.ale.salesDescription")}</span>
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
              <b>{localize(trade, "label") || def?.name || resourceId}</b>
              <span>{t("city.recipe.availableLine", { input: `${cost} ${def?.name ?? resourceId}`, output: cityRuleEffectsText(trade.effects), available })}</span>
            </div>
            <button type="button" disabled={available < cost} onClick={() => onServeAle(trade)}>{t("action.sell")}</button>
          </div>
        );
      })}
    </section>
  );
}

function CityResearchPanel({ buildingState, snapshot, resourceCount, onBuyRecipe, onMerge }) {
  const { localize } = useLocalization();
  const { t } = useLocalization();
  const bought = new Set(buildingState.recipes ?? []);
  const recipes = cityResearchRecipes();
  const countResource = resourceCount ?? ((resourceId) => cityResourceCount(snapshot.inventory, resourceId));
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.research.title")}</h4>
        <span>{t("city.research.description")}</span>
      </header>
      {recipes.map((recipe) => {
        const key = researchRecipeKey(recipe);
        const unlocked = bought.has(key);
        const cost = researchRecipeCost(recipe);
        const hasInputs = Object.entries(recipe.inputs ?? {}).every(([resourceId, count]) => countResource(resourceId) >= count);
        const outputDef = RESOURCE_DEFS[recipe.output];
        const inputText = Object.entries(recipe.inputs ?? {})
          .map(([resourceId, count]) => `${count} ${localize(RESOURCE_DEFS[resourceId], "name") || resourceId}`)
          .join(" + ");
        return (
          <div className="blacksmith-row" key={key}>
            <InventoryIcon iconUrl={outputDef?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: recipe.output }))} />
            <div>
              <b>{localize(outputDef, "name") || recipe.output}</b>
              <span>{inputText} {"->"} {recipe.count ?? 1} {localize(outputDef, "name") || recipe.output}</span>
            </div>
            {unlocked ? (
              <button type="button" disabled={!hasInputs} onClick={() => onMerge(recipe)}>{t("inventory.merge")}</button>
            ) : (
              <button type="button" disabled={(snapshot.player?.gold ?? 0) < cost} onClick={() => onBuyRecipe(key)}>
                {t("city.research.buy", { cost })}
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

function CityPotionLabPanel({ countIngredient, onMix }) {
  const { localize } = useLocalization();
  const { t } = useLocalization();
  const recipes = potionRecipesForStation("alchemy_bench");
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.alchemy.title")}</h4>
        <span>{t("city.alchemy.description")}</span>
      </header>
      {recipes.map((recipe) => {
        const outputDef = potionDefById(recipe.output);
        const outputName = localize(outputDef, "name") || recipe.output;
        const inputEntries = Object.entries(recipe.inputs ?? {});
        const hasInputs = inputEntries.every(([inputId, count]) => (
          (countIngredient?.(inputId) ?? 0) >= Math.max(1, Math.floor(Number(count) || 1))
        ));
        const inputText = inputEntries
          .map(([inputId, count]) => {
            const inputDef = potionDefById(inputId) ?? RESOURCE_DEFS[inputId];
            const name = localize(inputDef, "name") || inputId;
            const available = countIngredient?.(inputId) ?? 0;
            return `${count} ${name} (${available})`;
          })
          .join(" + ");
        return (
          <div className="blacksmith-row" key={`${recipe.output}-${inputText}`}>
            <InventoryIcon iconUrl={outputDef?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "potion", potionId: recipe.output }))} />
            <div>
              <b>{outputName}</b>
              <span>{inputText} {"->"} {recipe.count ?? 1} {outputName} | {hasInputs ? t("ui.ready") : t("status.missingInputs")}</span>
            </div>
            <button type="button" disabled={!hasInputs} onClick={() => onMix?.(recipe)}>
              {t("city.alchemy.mix")}
            </button>
          </div>
        );
      })}
    </section>
  );
}

function CityTonicLabPanel({ cityStats, progress, countInput, onMix }) {
  const { localize } = useLocalization();
  const { t } = useLocalization();
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
        <h4>{t("city.tonic.title")}</h4>
        <span>{t("city.tonic.description")}</span>
      </header>
      <div className="city-area-costs city-chip-grid">
        <b>{t("city.tonic.currentBoosts")}</b>
        {boostEntries.length === 0 ? (
          <span>{t("city.tonic.noneYet")}</span>
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
            const name = localize(RESOURCE_DEFS[inputId], "name") || cityRuleStatLabel(inputId);
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
              <span>{inputText} {"->"} {effectText} | {hasInputs ? t("ui.ready") : t("status.missingInputs")}</span>
            </div>
            <button type="button" disabled={!hasInputs} onClick={() => onMix?.(recipe)}>
              {t("city.alchemy.mix")}
            </button>
          </div>
        );
      })}
    </section>
  );
}

function CityArtifactPanel({ progress = {}, countResource, countItem, canBuyArtifact, onBuy }) {
  const { localize, t } = useLocalization();
  const bought = new Set(progress?.artifacts?.boughtIds ?? []);
  const hoverState = useFloatingProgressionHover();
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.artifacts.title")}</h4>
        <span>{t("city.artifacts.description")}</span>
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
                {imageUrl ? <img src={imageUrl} alt="" draggable="false" /> : <span>{localize(artifact, "title")?.slice(0, 2) ?? "?"}</span>}
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
                <b>{localize(artifact, "title")}</b>
                <span>{owned ? t("ui.active") : buyCheck.canBuy ? t("ui.ready") : t("ui.locked")}</span>
              </header>
              <p>{localize(artifact, "description")}</p>
              <div className="city-effect-list">
                <span>{cityRuleEffectsText(artifact.effects?.cityStats)}</span>
                {artifact.effects?.worldEnergy && (
                  <span>{Object.entries(artifact.effects.worldEnergy).map(([id, amount]) => `${Number(amount) > 0 ? "+" : ""}${amount} ${id}`).join(" | ")}</span>
                )}
              </div>
              <CityArtifactCostList artifact={artifact} countResource={countResource} countItem={countItem} />
              <button type="button" disabled={owned || !buyCheck.canBuy} onClick={() => onBuy?.(artifact)}>
                {owned ? t("status.owned") : t("action.buy")}
              </button>
            </>
          );
        }}
      </FloatingProgressionHover>
    </section>
  );
}

function CityArtifactCostList({ artifact, countResource, countItem }) {
  const { localize } = useLocalization();
  const { t } = useLocalization();
  const resourceEntries = [
    ...(artifact.cost?.gold ? [["gold", artifact.cost.gold]] : []),
    ...Object.entries(artifact.cost?.resources ?? {}),
  ];
  const itemEntries = artifact.cost?.items ?? [];
  return (
    <div className="city-area-costs city-chip-grid city-artifact-costs">
      {resourceEntries.length === 0 && itemEntries.length === 0 && <span>{t("city.free")}</span>}
      {resourceEntries.map(([resourceId, amount]) => {
        const available = countResource?.(resourceId) ?? 0;
        return (
          <span className={available >= amount ? "met" : "missing"} key={resourceId}>
            <InventoryIcon iconUrl={resourceId === "gold" ? ITEM_GOLD_ICON_URL : RESOURCE_DEFS[resourceId]?.iconUrl} />
            <b>{available}/{amount} {localize(RESOURCE_DEFS[resourceId], "name") || resourceId}</b>
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
  const { localize, t } = useLocalization();
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
        <h4>{t("city.policy.title")}</h4>
        <span>{t("city.policy.description")}</span>
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
                      {imageUrl ? <img src={imageUrl} alt="" draggable="false" /> : <span>{localize(policy, "title")?.slice(0, 2) ?? "?"}</span>}
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
                <b>{localize(policy, "title")}</b>
                <span>{category} | {blocked ? t("status.blocked") : locked ? t("status.missingRequirements") : enabled ? t("ui.active") : t("ui.inactive")}</span>
              </header>
              <p>{localize(policy, "description")}</p>
              {blocked && (
                <div className="city-policy-requirements">
                  {exclusives.map((entry) => (
                    <span className="missing" key={entry.key}>{t("city.policy.blockedByActive", { policy: localize(entry, "title") || entry.label })}</span>
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
              <small>{blocked ? t("city.policy.disableToEnable", { list: exclusives.map((entry) => localize(entry, "title") || entry.label).join(", ") }) : locked && !enabled ? t("status.missingRequirements") : t(enabled ? "city.policy.clickDisable" : "city.policy.clickEnable")}</small>
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
  const { localize, t } = useLocalization();
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.achievements.title")}</h4>
        <span>{t("city.achievements.description")}</span>
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
                {imageUrl ? <img src={imageUrl} alt="" draggable="false" /> : <span>{localize(achievement, "title")?.slice(0, 2) ?? "?"}</span>}
              </div>
              <div className="city-progression-hover">
                <header>
                  <b>{localize(achievement, "title")}</b>
                  <span>{achievement.category} | {unlocked}/{levels.length}</span>
                </header>
                <p>{localize(achievement, "description")}</p>
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
  const { t } = useLocalization();
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const socketItems = (inventory ?? []).filter((item) => itemCanHaveSockets(item));
  const gems = (inventory ?? []).filter((item) => item?.mode === "resource" && GEM_SOCKET_BONUSES[item.resourceId]);
  const selectedItem = inventory?.[selectedItemIndex] ?? null;
  const selectedSockets = normalizeSockets(selectedItem?.sockets);
  const addCost = selectedItem ? 500 * (selectedSockets.length + 1) : 0;
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.socket.title")}</h4>
        <span>{t("city.socket.description", { max: MAX_ITEM_SOCKETS })}</span>
      </header>
      <div className="city-bank-panel">
        <div className="city-bank-column">
          <h4>{t("city.socket.gear")}</h4>
          {socketItems.length === 0 && <p>{t("city.socket.noGear")}</p>}
          {socketItems.map((item) => (
            <div className={`blacksmith-row ${selectedItemIndex === item.index ? "selected-row" : ""}`} key={item.id}>
              <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
              <div>
                <CityItemName item={item} />
                <span>{socketText(item)}</span>
              </div>
              <button type="button" onClick={() => setSelectedItemIndex(item.index)}>{t("ui.select")}</button>
            </div>
          ))}
        </div>
        <div className="city-bank-column">
          <h4>{t("city.socket.selected")}</h4>
          {!selectedItem && <p>{t("city.socket.selectFirst")}</p>}
          {selectedItem && (
            <>
              <div className="blacksmith-row">
                <InventoryIcon iconIndex={selectedItem.iconIndex} iconSheet={selectedItem.iconSheet} iconUrl={selectedItem.iconUrl} />
                <div>
                  <CityItemName item={selectedItem} />
                  <span>{socketText(selectedItem)}</span>
                </div>
                <button type="button" disabled={selectedSockets.length >= MAX_ITEM_SOCKETS || gold < addCost} onClick={() => onAddSocket(selectedItemIndex)}>
                  {t("city.socket.addSocket", { cost: addCost })}
                </button>
              </div>
              {gems.length === 0 && <p>{t("city.socket.noGems")}</p>}
              {gems.map((gem) => (
                <div className="blacksmith-row" key={gem.id}>
                  <InventoryIcon iconIndex={gem.iconIndex} iconSheet={gem.iconSheet} iconUrl={gem.iconUrl} />
                  <div>
                    <CityItemName item={gem} />
                    <span>{socketBonusText(gem.resourceId)} | x{gem.count ?? 1}</span>
                  </div>
                  <button type="button" disabled={!selectedSockets.some((socket) => !socket)} onClick={() => onSocketGem(selectedItemIndex, gem.index)}>
                    {t("city.socket.insert")}
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
  const { localize, t } = useLocalization();
  const [tradeDraft, setTradeDraft] = useState(null);
  const sellable = (inventory ?? []).filter(merchantItemCanTrade);
  const openTrade = (mode, item, index) => {
    const max = merchantTradeMax(item);
    if (mode === "sell" && max === 1) {
      onSell(index, 1);
      return;
    }
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
        <h4>{t("city.merchant.title")}</h4>
        <span>{t("city.merchant.summary", { gold, popularity: Math.round(popularity ?? 0) })}</span>
      </header>
      <div className="city-bank-panel">
        <div className="city-bank-column">
          <h4>{t("city.merchant.sell")}</h4>
          {sellable.length === 0 && <p>{t("city.merchant.noSellable")}</p>}
          {sellable.map((item) => (
            <div className="blacksmith-row" key={item.id}>
              <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
              <div>
                <CityItemName item={item} />
                <span>{t("city.merchant.sellLine", { price: merchantSellPrice(item, popularity, cityEventModifiers), have: merchantTradeMax(item), value: item.value ?? itemValue(item) })}</span>
              </div>
              <button type="button" onClick={() => openTrade("sell", item, item.index)}>{t("city.merchant.sell")}</button>
            </div>
          ))}
        </div>
        <div className="city-bank-column">
          <h4>{t("city.merchant.buy")} <span>{t("city.merchant.soldItemsStay")}</span></h4>
          {(stock ?? []).length === 0 && <p>{t("city.merchant.noStock")}</p>}
          {(stock ?? []).map((item, index) => {
            const price = merchantBuyPrice(item, popularity, cityEventModifiers);
            return (
              <div className="blacksmith-row" key={`${item.id}-${index}`}>
                <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
                <div>
                  <CityItemName item={item} />
                  <span>{t("city.merchant.buyLine", { price, stock: merchantTradeMax(item), type: item.mode === "resource" ? t("inventory.type.resource") : item.rarityLabel })}</span>
                </div>
                <button type="button" disabled={gold < price} onClick={() => openTrade("buy", item, index)}>{t("city.merchant.buy")}</button>
              </div>
            );
          })}
        </div>
      </div>
      {tradeDraft && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setTradeDraft(null)}>
          <section className="confirm-card merchant-trade-modal" role="dialog" aria-modal="true" aria-label={t("city.merchant.confirmTrade")} onClick={(event) => event.stopPropagation()}>
            <h3>{tradeDraft.mode === "buy" ? t("city.merchant.buy") : t("city.merchant.sell")} {localizeItemField(tradeDraft.item, "name", localize)}</h3>
            <p>{t("city.merchant.unitPriceMax", { price: tradeDraft.unitPrice, max: tradeDraft.max })}</p>
            <label>
              {t("city.merchant.quantity")}
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
                {t("inventory.all")}
              </button>
            </div>
            <b>{t("city.merchant.total", { total: tradeDraft.unitPrice * tradeDraft.quantity })}</b>
            <div>
              <button type="button" onClick={() => setTradeDraft(null)}>{t("ui.cancel")}</button>
              <button type="button" disabled={tradeDraft.mode === "buy" && gold < tradeDraft.unitPrice * tradeDraft.quantity} onClick={confirmTrade}>
                {t("action.accept")}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function CitySkillTreePanel({ player, onBuyRank }) {
  const { localize, t } = useLocalization();
  const tree = normalizeSkillTree(player?.skillTree);
  const points = skillTreeAvailablePoints(player?.level ?? 1, tree);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.skillTree.panelTitle")}</h4>
        <span>{points === 1 ? t("city.skillTree.pointsAvailable.one", { count: points }) : t("city.skillTree.pointsAvailable.many", { count: points })}</span>
      </header>
      {SKILL_TREE_BRANCHES.map((branch) => {
        const branchPoints = skillTreeBranchSpentPoints(tree, branch.id);
        return (
          <div className="skill-branch" key={branch.id}>
            <header>
              <h5>{localize(branch, "title") || branch.title}</h5>
              <span>{t("city.skillTree.branchPoints", { count: branchPoints })}</span>
            </header>
            <p>{localize(branch, "description") || branch.description}</p>
            {branch.nodes.map((node) => {
              const rank = tree[node.id] ?? 0;
              const locked = branchPoints < (node.requiresBranchPoints ?? 0);
              const capped = rank >= node.maxRank;
              const nodeTitle = localize(node, "title") || node.title;
              const nodeDescription = localize(node, "description") || node.description;
              return (
                <div className={`blacksmith-row ${locked ? "locked" : ""}`} key={node.id}>
                  <div>
                    <b>{nodeTitle} {rank}/{node.maxRank}</b>
                    <span>{locked ? t("city.skillTree.requiresBranchPoints", { required: node.requiresBranchPoints, branch: localize(branch, "title") || branch.title }) : ""}{nodeDescription}</span>
                  </div>
                  <button
                    type="button"
                    disabled={points <= 0 || locked || capped}
                    onClick={() => onBuyRank(node.id)}
                  >
                    {t("city.skillTree.rankButton")}
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

function classNodeTitle(nodeId, localize) {
  const node = CLASS_NODE_BY_ID[nodeId];
  return localize(node, "title") || node?.title || nodeId;
}

function classNodeRequirementText(node, localize, t) {
  const entries = [];
  for (const nodeId of node?.requires ?? []) {
    entries.push(t("city.class.requirements.requires", { requirement: classNodeTitle(nodeId, localize) }));
  }
  if (node?.requiresBuilding) entries.push(t("city.class.requirements.building", { building: cityBuildingName(node.requiresBuilding) }));
  if (node?.requiresAddon) entries.push(t("city.class.requirements.addon", { addon: cityAddonName(node.requiresAddon) }));
  if (node?.requiresResearch) entries.push(t("city.class.requirements.research", { research: node.requiresResearch }));
  return entries.length ? entries.join(" | ") : t("city.class.requirements.none");
}

function classUnlockReasonText(reason, t) {
  const raw = String(reason ?? "").trim();
  if (!raw) return "";
  if (raw === "Unknown class node") return t("city.class.reason.unknownNode");
  if (raw === "Wrong class") return t("city.class.reason.wrongClass");
  if (raw === "Already unlocked") return t("city.class.reason.alreadyUnlocked");
  if (raw === "No class points") return t("city.class.reason.noClassPoints");
  if (raw.startsWith("Requires building: ")) {
    return t("city.class.requirements.building", { building: raw.slice("Requires building: ".length) });
  }
  if (raw.startsWith("Requires addon: ")) {
    return t("city.class.requirements.addon", { addon: raw.slice("Requires addon: ".length) });
  }
  if (raw.startsWith("Requires research: ")) {
    return t("city.class.requirements.research", { research: raw.slice("Requires research: ".length) });
  }
  if (raw.startsWith("Requires ")) {
    return t("city.class.requirements.requires", { requirement: raw.slice("Requires ".length) });
  }
  return raw;
}

function CityClassPanel({ player, progress, onChooseClass, onResetClass, onUnlockNode }) {
  const { localize, t } = useLocalization();
  const sanctuaryBuilt = hasCityBuilding(progress, "sanctuary");
  const classId = normalizeClassId(player?.classId);
  const classChosen = classId !== DEFAULT_CLASS_ID;
  const classConfig = getClassConfig(classId);
  const className = localize(classConfig, "name") || classConfig?.name || "Class";
  const classPoints = classPointsAvailable(player);
  const context = cityRequirementContext(progress);
  const baseNodeId = `${classId}.base`;
  const unlockedNodeIds = (player?.classNodes ?? []).map(String);
  const canResetClass = classChosen && unlockedNodeIds.every((nodeId) => nodeId === baseNodeId);

  if (!sanctuaryBuilt && !classChosen) {
    return (
      <section className="blacksmith-station class-panel" aria-label={t("city.class.aria.training")}>
        <header>
          <h4>{t("city.class.panelTitle")}</h4>
          <span>{className}</span>
        </header>
        <p>{t("city.class.buildSanctuaryHint")}</p>
      </section>
    );
  }

  if (!classChosen) {
    const classOptions = Object.values(CLASS_DEFS).filter((entry) => entry.id !== DEFAULT_CLASS_ID);
    return (
      <section className="blacksmith-station class-panel" aria-label={t("city.class.aria.choose")}>
        <header>
          <h4>{t("city.class.chooseTitle")}</h4>
          <span>{t("city.class.baseTrainingFree")}</span>
        </header>
        <div className="class-choice-grid">
          {classOptions.map((option) => (
            <button type="button" className="class-choice-card" key={option.id} onClick={() => onChooseClass?.(option.id)}>
              <b>{localize(option, "name") || option.name}</b>
              <span>{localize(option, "description") || option.description}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const classNodes = Object.values(classConfig?.nodes ?? {});
  const unlocked = new Set(player?.classNodes ?? []);
  return (
    <section className="blacksmith-station class-panel" aria-label={t("city.class.aria.progression")}>
      <header>
        <h4>{t("city.class.progressTitle", { name: className })}</h4>
        <span>{classPoints === 1 ? t("city.class.pointsAvailable.one", { count: classPoints }) : t("city.class.pointsAvailable.many", { count: classPoints })}</span>
      </header>
      {canResetClass && (
        <button
          type="button"
          className="class-reset-button"
          title={t("city.class.reset.title")}
          onClick={() => {
            if (window.confirm(t("city.class.reset.confirm"))) onResetClass?.();
          }}
        >
          {t("city.class.reset.button")}
        </button>
      )}
      <div className="class-node-list">
        {classNodes.length === 0 ? (
          <span className="class-empty">{t("city.class.noNodes")}</span>
        ) : classNodes.map((node) => {
          const unlockedNode = unlocked.has(node.id);
          const unlockCheck = canUnlockClassNodeForPlayer(player, node.id, context);
          const bonuses = Object.entries(node.bonuses ?? {});
          const lockReason = classUnlockReasonText(unlockCheck.reason, t);
          return (
            <article className={`class-node ${unlockedNode ? "unlocked" : ""}`} key={node.id}>
              <div>
                <b>{localize(node, "title") || node.title}</b>
                <span>{classNodeRequirementText(node, localize, t)}</span>
              </div>
              <div className="class-node-bonuses">
                {bonuses.map(([key, value]) => (
                  <em key={key}>{formatClassBonusValue(key, value)}</em>
                ))}
              </div>
              <button
                type="button"
                disabled={unlockedNode || !unlockCheck.ok}
                title={unlockedNode ? t("city.class.unlockedButton") : unlockCheck.ok ? t("city.class.unlockNodeTitle") : lockReason}
                onClick={() => onUnlockNode?.(node.id)}
              >
                {unlockedNode ? t("city.class.unlockedButton") : t("city.class.unlockButton")}
              </button>
            </article>
          );
        })}
      </div>
      <span className="class-unlocked">
        {t("city.class.unlockedList", { nodes: (player?.classNodes ?? []).map((nodeId) => classNodeTitle(nodeId, localize)).join(", ") || t("city.class.none") })}
      </span>
    </section>
  );
}

function CityArcaneExtractorPanel({ inventory, onExtract }) {
  const { t } = useLocalization();
  const candidates = (inventory ?? []).filter(canExtractArcaneEssence);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{t("city.arcaneExtractor.title")}</h4>
        <span>{t("city.arcaneExtractor.description")}</span>
      </header>
      {candidates.length === 0 && <p>{t("city.arcaneExtractor.noGear")}</p>}
      {candidates.map((item) => (
        <div className="blacksmith-row" key={item.id}>
          <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
          <div>
            <CityItemName item={item} />
            <span>{t("city.arcaneExtractor.resultLine", { rarity: item.rarityLabel })}</span>
          </div>
          <button type="button" onClick={() => onExtract(item.index)}>{t("city.arcaneExtractor.extract")}</button>
        </div>
      ))}
    </section>
  );
}

function CityReadableMergePanel({ inventory, kind, salvageEntries = [], paperCount = 0, salvageRecipes = READABLE_SALVAGE_CONFIG.craftRecipes, onMerge, onRecycleReadable, onCraftReadableRecipe }) {
  const { t } = useLocalization();
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
          <h4>{kind === "spellbook" ? t("city.readable.spellbookAssembly") : t("city.readable.lorebookAssembly")}</h4>
          <span>{kind === "spellbook" ? t("city.readable.spellbookDescription") : t("city.readable.lorebookDescription")}</span>
        </header>
        {parts.length === 0 && <p>{t("city.readable.noFragments")}</p>}
        {parts.map((item) => (
          <div className="blacksmith-row" key={item.id}>
            <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
            <div>
              <CityItemName item={item} />
              <span>{item.summaryText ?? item.readableStatus}</span>
            </div>
            <button type="button" onClick={() => onMerge(item.index)}>{t("inventory.merge")}</button>
          </div>
        ))}
      </section>
      <section className="blacksmith-station">
        <header>
          <h4>{t("city.readable.recycleTitle")}</h4>
          <span>{t("city.readable.recycleDescription", { paper: paperDef?.name ?? t("city.readable.paper") })}</span>
        </header>
        {salvageEntries.length === 0 && <p>{t("city.readable.noRecycle")}</p>}
        {salvageEntries.map((entry) => (
          <div className="blacksmith-row" key={entry.key}>
            <InventoryIcon iconIndex={entry.item.iconIndex} iconSheet={entry.item.iconSheet} iconUrl={entry.item.iconUrl} />
            <div>
              <CityItemName item={entry.item} />
              <span>{t("city.readable.givesPaper", { source: entry.sourceLabel, count: entry.paperValue, paper: paperDef?.name ?? t("city.readable.paper") })}</span>
            </div>
            <button type="button" onClick={() => onRecycleReadable?.(entry)}>{t("city.readable.recycle")}</button>
          </div>
        ))}
      </section>
      <section className="blacksmith-station">
        <header>
          <h4>{t("city.readable.craftScrolls")}</h4>
          <span>{t("city.readable.paperOwned", { count: paperCount })}</span>
        </header>
        <div className="blacksmith-row">
          <InventoryIcon iconUrl={outputDef?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: scrollRecipe?.output?.itemId ?? "scroll" }))} />
          <div>
            <b>{scrollRecipe?.label ?? t("city.readable.craftScroll")}</b>
            <span>{inputCount} {paperDef?.name ?? t("city.readable.paper")} {"->"} {outputCount} {outputDef?.name ?? t("city.readable.scroll")}</span>
          </div>
          <button type="button" disabled={paperCount < inputCount} onClick={() => onCraftReadableRecipe?.(scrollRecipe)}>
            {t("action.craft")}
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
