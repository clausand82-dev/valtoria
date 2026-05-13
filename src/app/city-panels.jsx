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
  socketBonusText,
  socketText,
} from "./city-panel-helpers.jsx";

function CityBlacksmithPanel({ engineRef, snapshot, snapshotRef, activeAddonId, purchasedAddons }) {
  const hasWeaponAnvil = purchasedAddons.has("weapon_anvil");
  const hasArmorAnvil = purchasedAddons.has("armor_anvil");
  const hasForge = purchasedAddons.has("forge");
  const forgeWeapons = useMemo(() => (
    (snapshot.inventory ?? []).filter((item) => item?.slot === "weapon")
  ), [snapshot.inventory]);

  return (
    <section className="blacksmith-panel">
      {!activeAddonId && (
        <BlacksmithRepairStation engineRef={engineRef} snapshot={snapshot} snapshotRef={snapshotRef} />
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
          weapons={forgeWeapons}
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

function BlacksmithRepairStation({ engineRef, snapshot, snapshotRef }) {
  const equipment = snapshot.equipment ?? [];
  const equippedItems = equipment.filter((slot) => slot.item != null);

  if (equippedItems.length === 0) {
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
        {equippedItems.map((slot) => (
          <BlacksmithRepairSlot
            key={slot.id}
            slot={slot}
            engineRef={engineRef}
            snapshotRef={snapshotRef}
          />
        ))}
      </div>
    </section>
  );
}

function BlacksmithRepairSlot({ slot, engineRef, snapshotRef }) {
  const item = slot.item;
  const dur = Number(item.durability ?? 100);
  const missing = Math.ceil(100 - dur);
  const isFullyRepaired = missing <= 0;
  const color = durabilityColor(dur);

  return (
    <div className={`repair-slot${isFullyRepaired ? " repaired" : ""}`}>
      <div className="repair-slot-info">
        <span className="repair-slot-name" style={{ color: item.rarityColor ?? "#f5f3ea" }}>{item.name}</span>
        <span className="repair-slot-label" style={{ color: "#aaa" }}>{slot.label}</span>
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
      {!isFullyRepaired && (
        <button
          className="repair-btn"
          onClick={() => engineRef.current?.repairEquippedItem?.(slot.id)}
        >
          Reparer
        </button>
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

function BlacksmithForgeStation({ enabled, weapons, onDestroy }) {
  return (
    <section className={`blacksmith-station ${enabled ? "" : "locked"}`}>
      <header>
        <h4>Forge Addon</h4>
        <span>{enabled ? "Destroy weapons for resources" : "Build Forge Addon to extract weapon resources."}</span>
      </header>
      {!enabled && <p>Build Forge Addon to destroy weapons here.</p>}
      {enabled && weapons.length === 0 && <p>No weapons in backpack.</p>}
      {enabled && weapons.map((item) => (
        <div className="blacksmith-row" key={item.id}>
          <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
          <div>
            <CityItemName item={item} />
            <span>{item.rarityLabel} | L{item.level} | {item.damageMin}-{item.damageMax} damage</span>
          </div>
          <button type="button" className="danger-action" onClick={() => onDestroy(item.index)}>
            Destroy
          </button>
        </div>
      ))}
    </section>
  );
}

function CityGoldBarPanel({ gold, popularity, onSmelt }) {
  const unitCost = goldBarUnitCost(popularity);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Minting Furnace</h4>
        <span>{unitCost} gold {"->"} 1 Gold Bar</span>
      </header>
      <div className="blacksmith-row">
        <InventoryIcon iconSheet="items" iconUrl="/assets/generated/item/item_res_goldbar.png" />
        <div>
          <b>Gold Bar</b>
          <span>Popularity {Math.round(popularity ?? 0)}% | Available gold: {gold}</span>
        </div>
        <button type="button" disabled={gold < unitCost} onClick={onSmelt}>Smelt</button>
      </div>
    </section>
  );
}

function CityFarmPanel({ inventory, popularity, onProduceFoodBarrel, onProduceProvision }) {
  const foodBarrelCostValue = foodBarrelCost(popularity);
  const foodBarrelOptions = [
    { id: "meat", label: "Meat" },
    { id: "fruit", label: "Fruit" },
    { id: "wheat", label: "Wheat" },
  ];
  const provisionOptions = CITY_STATS_RULES.farmProvisionRecipes ?? [];
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Food Barrels</h4>
        <span>{foodBarrelCostValue} raw food {"->"} 1 Food Barrel</span>
      </header>
      {foodBarrelOptions.map((option) => {
        const available = cityResourceCount(inventory, option.id);
        const def = RESOURCE_DEFS[option.id];
        return (
          <div className="blacksmith-row" key={`barrel-${option.id}`}>
            <InventoryIcon iconSheet={def?.sheet ?? "resources"} iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: option.id }))} />
            <div>
              <b>{option.label}</b>
              <span>Available: {available} | Popularity {Math.round(popularity ?? 0)}%</span>
            </div>
            <button type="button" disabled={available < foodBarrelCostValue} onClick={() => onProduceFoodBarrel(option.id, foodBarrelCostValue)}>Make</button>
          </div>
        );
      })}
      <header>
        <h4>Provision</h4>
        <span>Convert food resources into city provision.</span>
      </header>
      {provisionOptions.map((option) => {
        const available = cityResourceCount(inventory, option.resourceId);
        const def = RESOURCE_DEFS[option.resourceId];
        return (
          <div className="blacksmith-row" key={`provision-${option.resourceId}`}>
            <InventoryIcon iconSheet={def?.sheet ?? "resources"} iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: option.resourceId }))} />
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

function CityTownHallPanel({ inventory, army, population, popularity, onContribute }) {
  const bonus = popularityBonusStep(popularity);
  const armyRoom = Math.max(0, Math.floor(Number(population) || 0) - Math.max(0, Math.floor(Number(army) || 0)));
  const options = [
    { id: "gold_bar", cost: 1, army: 10 + bonus, label: "Gold Bar" },
    { id: "food", cost: 1, army: 8 + bonus, label: "Food Barrel" },
    { id: "magic_essence", cost: 10, army: 1 + bonus, label: "Magic Essence" },
  ];
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Army Muster</h4>
        <span>Army: {army} / Population {population} | Nethrendor target: 1000</span>
      </header>
      {options.map((option) => {
        const available = cityResourceCount(inventory, option.id);
        const def = RESOURCE_DEFS[option.id];
        return (
          <div className="blacksmith-row" key={option.id}>
            <InventoryIcon iconSheet={def?.sheet ?? "resources"} iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: option.id }))} />
            <div>
              <b>{option.label}</b>
              <span>{option.cost} {"->"} {Math.min(option.army, armyRoom)} army | Available: {available}</span>
            </div>
            <button type="button" disabled={available < option.cost || armyRoom <= 0} onClick={() => onContribute(option.id, option.cost, option.army)}>Contribute</button>
          </div>
        );
      })}
    </section>
  );
}

function CityResearchPanel({ buildingState, snapshot, onBuyRecipe, onMerge }) {
  const bought = new Set(buildingState.recipes ?? []);
  const recipes = cityResearchRecipes();
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
        const hasInputs = Object.entries(recipe.inputs ?? {}).every(([resourceId, count]) => cityResourceCount(snapshot.inventory, resourceId) >= count);
        const outputDef = RESOURCE_DEFS[recipe.output];
        const inputText = Object.entries(recipe.inputs ?? {})
          .map(([resourceId, count]) => `${count} ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`)
          .join(" + ");
        return (
          <div className="blacksmith-row" key={key}>
            <InventoryIcon iconSheet={outputDef?.sheet ?? "resources"} iconUrl={outputDef?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: recipe.output }))} />
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

function CityMerchantPanel({ inventory, stock, gold, popularity, onSell, onBuy }) {
  const [tradeDraft, setTradeDraft] = useState(null);
  const sellable = (inventory ?? []).filter(merchantItemCanTrade);
  const openTrade = (mode, item, index) => {
    const max = mode === "buy"
      ? merchantTradeMax(item)
      : merchantTradeMax(item);
    const unitPrice = mode === "buy" ? merchantBuyPrice(item, popularity) : merchantSellPrice(item, popularity);
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
                <span>{merchantSellPrice(item, popularity)} G each | have {merchantTradeMax(item)} | value {item.value ?? itemValue(item)}</span>
              </div>
              <button type="button" onClick={() => openTrade("sell", item, item.index)}>Sell</button>
            </div>
          ))}
        </div>
        <div className="city-bank-column">
          <h4>Buy <span>sold items stay here</span></h4>
          {(stock ?? []).length === 0 && <p>No stock this visit.</p>}
          {(stock ?? []).map((item, index) => {
            const price = merchantBuyPrice(item, popularity);
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

function CityReadableMergePanel({ inventory, kind, onMerge }) {
  const parts = (inventory ?? []).filter((item) => (
    isReadableItem(item)
    && item.readableStatus === "mergeable"
    && item.readableKind === kind
  ));
  return (
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
  );
}

export {
  CityBlacksmithPanel,
  CityGoldBarPanel,
  CityFarmPanel,
  CityTownHallPanel,
  CityResearchPanel,
  CitySocketPanel,
  CityMerchantPanel,
  CitySkillTreePanel,
  CityArcaneExtractorPanel,
  CityReadableMergePanel,
};
