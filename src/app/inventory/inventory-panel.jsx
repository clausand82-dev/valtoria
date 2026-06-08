import React from "react";
import { MAX_INVENTORY, inventorySlotRequiredLevel, inventoryUnlockedSlotCount } from "../../game/data.js";
import {
  iconUrlFromKey,
  isEquippableItem,
  isQuestItem,
} from "../../game/item-system.js";
import {
  INVENTORY_FILTERS,
  isItemRequiredByActiveQuests,
  itemMatchesInventoryFilter,
} from "./inventory-filters.js";
import { InventoryIcon } from "../ui/icons.jsx";
import { InventoryItemDetail } from "./inventory-item-detail.jsx";
import { SPELL_DEFS } from "../../game/config/spell-config.js";
import { InventorySortSelect } from "./inventory-sort-select.jsx";

function gearDurability(item) {
  if (!item || item.mode === "resource" || item.mode === "potion" || item.mode === "readable") return null;
  const value = Number.isFinite(Number(item.durability)) ? Number(item.durability) : 100;
  return Math.max(0, Math.min(100, value));
}

function DurabilityBar({ item, className = "" }) {
  const dp = gearDurability(item);
  if (dp === null) return null;
  const dc = dp >= 75 ? "#58d96d" : dp >= 40 ? "#ffd85d" : "#ff6b5f";
  return (
    <span className={`item-card-dur-bar-wrap ${className}`} title={`Durability: ${Math.round(dp)}%`}>
      <span className="item-card-dur-bar-fill" style={{ width: `${dp}%`, background: dc }} />
    </span>
  );
}

function itemFitsEquipmentSlot(item, slotId) {
  if (!item || !slotId || item.mode === "resource" || item.mode === "potion" || item.mode === "readable") return false;
  if (slotId === "ring1" || slotId === "ring2") return item.slot === "ring";
  return item.slot === slotId;
}

function parseDraggedInventoryIndex(event) {
  const raw = String(event.dataTransfer.getData("application/x-inventory-index") ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseDraggedEquipmentSlot(event) {
  const raw = String(event.dataTransfer.getData("application/x-equipment-slot") ?? "").trim();
  return raw || null;
}

const CHARACTER_SLOT_LAYOUT = [
  "head",
  "shoulder",
  "neck",
  "amulet",
  "cape",
  "relic",
  "arms",
  "chest",
  "arms",
  "hands",
  "belt",
  "hands",
  "bracelet",
  "legs",
  "bracelet",
  "ring1",
  "feet",
  "ring2",
  "weapon",
  "offhand",
  "magic",
];

const AUTO_LOOT_TYPE_OPTIONS = [
  { id: "gold", label: "Gold" },
  { id: "resource", label: "Resources" },
  { id: "weapon", label: "Weapons" },
  { id: "offhand", label: "Offhand" },
  { id: "head", label: "Head" },
  { id: "shoulder", label: "Shoulder" },
  { id: "neck", label: "Neck" },
  { id: "amulet", label: "Amulet" },
  { id: "cape", label: "Cape" },
  { id: "chest", label: "Chest" },
  { id: "arms", label: "Arms" },
  { id: "hands", label: "Hands" },
  { id: "bracelet", label: "Bracelet" },
  { id: "ring", label: "Ring" },
  { id: "belt", label: "Belt" },
  { id: "legs", label: "Legs" },
  { id: "feet", label: "Feet" },
  { id: "relic", label: "Relic" },
  { id: "potion", label: "Potions" },
  { id: "readable", label: "Readables" },
  { id: "quest", label: "Quest" },
];

const AUTO_LOOT_RARITY_OPTIONS = [
  { id: "poor", label: "Poor", color: "#9a9a9a" },
  { id: "normal", label: "Normal", color: "#f5f3ea" },
  { id: "upgraded", label: "Upgraded", color: "#58d96d" },
  { id: "rare", label: "Rare", color: "#ffd85d" },
  { id: "epic", label: "Epic", color: "#b579ff" },
  { id: "legendary", label: "Legendary", color: "#ff5757" },
  { id: "unique", label: "Unique", color: "#ff9f1c" },
];

const HOVER_PANEL_WIDTH = 360;
const HOVER_PANEL_HEIGHT_ESTIMATE = 260;
const HOVER_PANEL_GAP = 28;

function autoLootEnabled(settings, group, id) {
  return settings?.[group]?.[id] !== false;
}

function findEquippedComparisonItem(item, equipmentSlots = []) {
  if (!item || item.index === undefined) return null;
  const slotId = item.slot;
  if (slotId === "ring") {
    const ring1 = equipmentSlots.find((slot) => slot.id === "ring1")?.item;
    const ring2 = equipmentSlots.find((slot) => slot.id === "ring2")?.item;
    return ring1 || ring2 || null;
  }
  return equipmentSlots.find((slot) => slot.id === slotId)?.item ?? null;
}

function EquipmentSlotButton({
  className = "",
  draggingItem,
  engineRef,
  slot,
  setSelectedItem,
  onHoverMove,
  onHoverLeave,
}) {
  if (!slot) return <span aria-hidden="true" />;
  const acceptsDraggedItem = itemFitsEquipmentSlot(draggingItem, slot.id);
  const canDragFromSlot = Boolean(slot.item);
  const durability = gearDurability(slot.item);
  const durabilityColor = durability === null ? "transparent" : durability >= 75 ? "#58d96d" : durability >= 40 ? "#ffd85d" : "#ff6b5f";
  return (
    <button
      type="button"
      className={`equipment-slot equipment-${slot.id} ${className} ${slot.item ? "equipped has-durability" : "empty"} ${acceptsDraggedItem ? "drag-ready" : ""}`}
      draggable={canDragFromSlot}
      style={{
        "--item-quality": slot.item?.rarityColor ?? "rgba(255,255,255,0.16)",
        "--equipment-durability": `${durability ?? 0}%`,
        "--equipment-durability-color": durabilityColor,
      }}
      onDragStart={(event) => {
        if (!canDragFromSlot) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-equipment-slot", String(slot.id));
        const iconElement = event.currentTarget.querySelector(".equipment-icon");
        if (iconElement) event.dataTransfer.setDragImage(iconElement, 12, 12);
      }}
      onDragOver={(event) => {
        if (!acceptsDraggedItem) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const index = parseDraggedInventoryIndex(event);
        if (index !== null) engineRef.current?.equipInventoryItemToSlot?.(index, slot.id);
      }}
      onDoubleClick={() => {
        if (!slot.item) return;
        engineRef.current?.unequipItemFromSlot?.(slot.id);
      }}
      onMouseEnter={(event) => {
        setSelectedItem(slot.item);
        if (slot.item) onHoverMove?.(event, slot.item);
      }}
      onMouseMove={(event) => {
        if (slot.item) onHoverMove?.(event, slot.item);
      }}
      onMouseLeave={() => onHoverLeave?.()}
      onFocus={() => setSelectedItem(slot.item)}
      onBlur={() => onHoverLeave?.()}
    >
      <span className="equipment-slot-corners" aria-hidden="true" />
      <span className="equipment-icon" aria-hidden="true">
        {slot.item ? (
          <InventoryIcon iconIndex={slot.item.iconIndex} iconSheet={slot.item.iconSheet} iconUrl={slot.item.iconUrl} />
        ) : slot.emptyIconKey ? (
          <InventoryIcon iconSheet="items" iconUrl={iconUrlFromKey(slot.emptyIconKey)} />
        ) : (
          <i />
        )}
      </span>
      <span className="equipment-label">{slot.label}</span>
      <b className={slot.item?.rarity ?? ""}>{slot.item?.name ?? "Empty"}</b>
    </button>
  );
}

function MagicSlotButton({ engineRef, player }) {
  const spellIds = player?.unlockedSpells ?? [];
  const activeSpellId = player?.activeSpellId ?? spellIds[0] ?? "ember_spark";
  const spell = SPELL_DEFS[activeSpellId];
  return (
    <button
      type="button"
      className="equipment-slot equipment-magic equipped"
      style={{ "--item-quality": spell?.color ?? "#b8a4ff" }}
      title="Skift aktiv magi"
      onClick={() => {
        if (!spellIds.length) return;
        const index = spellIds.indexOf(activeSpellId);
        const next = spellIds[(index + 1) % spellIds.length] ?? spellIds[0];
        engineRef.current?.setActiveSpell?.(next);
      }}
    >
      <span className="equipment-slot-corners" aria-hidden="true" />
      <span className="equipment-label">Magic</span>
      <span className="equipment-icon magic-equipment-icon" aria-hidden="true">
        <i />
      </span>
      <b>{spell?.title ?? "No spell"}</b>
      <span className="item-card-dur-bar-wrap equipment-durability" title={spell?.title ?? "No spell"}>
        <span className="item-card-dur-bar-fill" style={{ width: "100%", background: spell?.color ?? "#b8a4ff" }} />
      </span>
    </button>
  );
}

export function InventoryPanel({
  cityOpen,
  engineRef,
  inventoryFilter,
  inventorySlots,
  selectedItem,
  setInventoryFilter,
  setInventoryOpen,
  setMergeChoice,
  setReadableDialog,
  setSelectedItem,
    snapshot,
}) {
  const equipmentById = new Map(snapshot.equipment.map((slot) => [slot.id, slot]));
  const usedSlotCounts = new Map();
  const [autoLootOpen, setAutoLootOpen] = React.useState(false);
  const [draggingItem, setDraggingItem] = React.useState(null);
  const [hoveredItem, setHoveredItem] = React.useState(null);
  const [hoverPointer, setHoverPointer] = React.useState(null);
  const panelRef = React.useRef(null);
  const autoLoot = snapshot.autoLoot ?? {};
  const playerLevel = Math.max(1, Math.floor(Number(snapshot.player?.level) || 1));
  const unlockedInventorySlots = inventoryUnlockedSlotCount(playerLevel);

  const handleHoverMove = React.useCallback((event, item) => {
    if (!item) return;
    setHoveredItem(item);
    setHoverPointer({ x: Number(event.clientX) || 0, y: Number(event.clientY) || 0 });
  }, []);

  const clearHoverPanel = React.useCallback(() => {
    setHoveredItem(null);
    setHoverPointer(null);
  }, []);

  const hoverPanelLayout = React.useMemo(() => {
    if (!hoverPointer) return null;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 720;
    const maxLeft = Math.max(8, viewportWidth - HOVER_PANEL_WIDTH - 8);
    const preferredLeft = hoverPointer.x + HOVER_PANEL_GAP;
    const left = preferredLeft <= maxLeft
      ? preferredLeft
      : Math.max(8, hoverPointer.x - HOVER_PANEL_WIDTH - HOVER_PANEL_GAP);
    const maxTop = Math.max(8, viewportHeight - HOVER_PANEL_HEIGHT_ESTIMATE - 8);
    const top = Math.min(Math.max(8, hoverPointer.y - 120), maxTop);
    return { left, top, viewportWidth, viewportHeight };
  }, [hoverPointer]);

  const hoveredEquippedItem = React.useMemo(() => {
    if (!hoveredItem) return null;
    return findEquippedComparisonItem(hoveredItem, snapshot.equipment);
  }, [hoveredItem, snapshot.equipment]);

  const showEquippedHover = Boolean(
    hoveredItem
    && hoveredEquippedItem
    && String(hoveredEquippedItem.id ?? "") !== String(hoveredItem.id ?? "")
  );

  const hoverPanelStyle = React.useMemo(() => {
    if (!hoverPanelLayout) return null;
    return {
      left: `${hoverPanelLayout.left}px`,
      top: `${hoverPanelLayout.top}px`,
      right: "auto",
      bottom: "auto",
    };
  }, [hoverPanelLayout]);

  React.useEffect(() => {
    if (!draggingItem) return undefined;
    const handleDragOver = (event) => {
      if (cityOpen || isQuestItem(draggingItem)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    };
    const handleDrop = (event) => {
      if (cityOpen || isQuestItem(draggingItem)) return;
      if (panelRef.current?.contains(event.target)) return;
      event.preventDefault();
      engineRef.current?.dropInventoryItem(draggingItem.index);
      setDraggingItem(null);
    };
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [cityOpen, draggingItem, engineRef]);

  const toggleAutoLoot = (group, id) => {
    const next = !autoLootEnabled(autoLoot, group, id);
    engineRef.current?.setAutoLootRule?.(group, id, next);
  };

  return (
    <>
      <aside
        className="inventory-panel"
        ref={panelRef}
        onMouseLeave={() => {
          setSelectedItem(null);
          clearHoverPanel();
        }}
      >
        <header className="inventory-titlebar">
          <span className="inventory-title-flourish" aria-hidden="true" />
          <div>
            <h1>Inventory</h1>
            <strong>Valtoria</strong>
          </div>
          <span className="inventory-capacity">
            {snapshot.inventory.length} / {unlockedInventorySlots}
          </span>
          <button type="button" className="close-button" onClick={() => setInventoryOpen(false)} title="Luk">
            x
          </button>
        </header>

        <div className="inventory-layout">
          <section className="character-sheet" aria-label="Character equipment">
            <div className="character-rune" aria-hidden="true" />
            <img className="character-figure" src="/assets/generated/ui_hero.png" alt="" />
            <div className="equipment-grid">
              {CHARACTER_SLOT_LAYOUT.map((slotId) => {
                if (slotId === "magic") {
                  return <MagicSlotButton engineRef={engineRef} key="magic" player={snapshot.player} />;
                }
                const count = usedSlotCounts.get(slotId) ?? 0;
                usedSlotCounts.set(slotId, count + 1);
                const slot = equipmentById.get(slotId);
                const duplicateClass = slotId === "arms" || slotId === "hands" || slotId === "bracelet"
                  ? `equipment-${slotId}-${count + 1}`
                  : "";
                return (
                  <EquipmentSlotButton
                    className={duplicateClass}
                    draggingItem={draggingItem}
                    engineRef={engineRef}
                    key={`${slotId}-${count}`}
                    slot={slot}
                    setSelectedItem={setSelectedItem}
                    onHoverMove={handleHoverMove}
                    onHoverLeave={clearHoverPanel}
                  />
                );
              })}
            </div>
          </section>

          <section className="backpack-sheet" aria-label="Backpack inventory">
            <div className="inventory-section-title">Inventory</div>
            <div className="inventory-filter-bar" aria-label="Backpack visual filters">
              {INVENTORY_FILTERS.map((filter) => (
                <button
                  type="button"
                  className={`inventory-filter filter-${filter.id} ${inventoryFilter === filter.id ? "active" : ""}`}
                  style={{ "--filter-color": filter.color }}
                  key={filter.id}
                  title={filter.label}
                  onClick={() => setInventoryFilter(filter.id)}
                >
                  <i aria-hidden="true" />
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
            <InventorySortSelect onSort={(sortId) => engineRef.current?.sortInventory?.(sortId)} />

            <div className="item-grid">
              {inventorySlots.map((item, slotIndex) => {
                const requiredLevel = inventorySlotRequiredLevel(slotIndex);
                const lockedSlot = !item && slotIndex >= unlockedInventorySlots;
                if (!item) {
                  if (lockedSlot) {
                    return (
                      <article
                        className="item-card empty-slot locked-slot"
                        key={`locked-${slotIndex}`}
                        aria-hidden="true"
                        title={`Laases op ved level ${requiredLevel ?? "?"}`}
                      >
                        <span className="locked-slot-level">L{requiredLevel ?? "?"}</span>
                      </article>
                    );
                  }
                  return (
                    <article
                      className="item-card empty-slot"
                      key={`empty-${slotIndex}`}
                      aria-hidden="true"
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const from = parseDraggedInventoryIndex(event);
                        if (from !== null) {
                          engineRef.current?.moveInventoryItem?.(from, slotIndex);
                          return;
                        }
                        const fromSlotId = parseDraggedEquipmentSlot(event);
                        if (fromSlotId) engineRef.current?.unequipItemFromSlot?.(fromSlotId, slotIndex);
                      }}
                    />
                  );
                }
                const dimmed = inventoryFilter !== "all" && !itemMatchesInventoryFilter(item, inventoryFilter);
                return (
                  <article
                    className={`item-card ${item.rarity} ${item.mode === "resource" ? "resource-item" : ""} ${dimmed ? "filter-dimmed" : ""} ${isItemRequiredByActiveQuests(item, snapshot.quests?.active) ? "quest-related" : ""}`}
                    style={{ "--item-quality": item.rarityColor ?? "rgba(255,255,255,0.16)" }}
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggingItem(item);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("application/x-inventory-index", String(item.index));
                    }}
                    onDragEnd={(event) => {
                      setDraggingItem(null);
                      if (event.dataTransfer.dropEffect !== "none") return;
                      if (!cityOpen && !isQuestItem(item)) engineRef.current?.dropInventoryItem(item.index);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = parseDraggedInventoryIndex(event);
                      if (from !== null) {
                        engineRef.current?.moveInventoryItem?.(from, slotIndex);
                        return;
                      }
                      const fromSlotId = parseDraggedEquipmentSlot(event);
                      if (fromSlotId) engineRef.current?.unequipItemFromSlot?.(fromSlotId, slotIndex);
                    }}
                    onMouseEnter={(event) => {
                      setSelectedItem(item);
                      handleHoverMove(event, item);
                    }}
                    onMouseMove={(event) => handleHoverMove(event, item)}
                    onMouseLeave={() => clearHoverPanel()}
                    onFocus={() => setSelectedItem(item)}
                    onBlur={() => clearHoverPanel()}
                    onClick={() => {
                      if (isEquippableItem(item)) engineRef.current?.equipItem(item.index);
                    }}
                    tabIndex={0}
                  >
                    <span className="equipment-slot-corners" aria-hidden="true" />
                    <button
                      type="button"
                      className="corner-action drop-action"
                      title={cityOpen ? "Kan ikke droppe i byen" : isQuestItem(item) ? "Kan ikke droppe quest item" : "Drop"}
                      disabled={cityOpen || isQuestItem(item)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!cityOpen && !isQuestItem(item)) {
                          engineRef.current?.dropInventoryItem(item.index);
                        }
                      }}
                    >
                      D
                    </button>
                    <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
                    {(item.flags?.stackable || item.stackMax > 1) && item.count > 1 && <b className="stack-count">{item.count}</b>}
                    <DurabilityBar item={item} />
                    <span>
                      {item.rarityLabel} | L{item.level} | {item.value}g
                    </span>
                    {item.canMerge && (
                      <button
                        type="button"
                        className="corner-action merge-action"
                        title="Merge"
                        onClick={(event) => {
                          event.stopPropagation();
                          const result = engineRef.current?.mergeInventoryItem(item.index);
                          if (result?.type === "resource-choice" || result?.type === "readable-choice" || result?.type === "potion-choice") setMergeChoice(result);
                        }}
                      >
                        M
                      </button>
                    )}
                    {item.canRead && (
                      <button
                        type="button"
                        className="corner-action merge-action"
                        title="Read"
                        onClick={(event) => {
                          event.stopPropagation();
                          const result = engineRef.current?.readInventoryItem?.(item.index);
                          if (result?.type === "readable-text") setReadableDialog(result);
                        }}
                      >
                        R
                      </button>
                    )}
                    {item.canConsume && (
                      <button
                        type="button"
                        className="corner-action consume-action"
                        title="Use"
                        onClick={(event) => {
                          event.stopPropagation();
                          engineRef.current?.consumeInventoryItem?.(item.index);
                        }}
                      >
                        U
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className={`auto-loot-panel ${autoLootOpen ? "open" : ""}`} aria-label="Auto pickup filters">
          <button
            type="button"
            className="auto-loot-tab"
            onClick={() => setAutoLootOpen((value) => !value)}
            title={autoLootOpen ? "Skjul auto pickup" : "Vis auto pickup"}
          >
            {autoLootOpen ? ">" : "<"}
          </button>
          <div className="auto-loot-content">
            <header>
              <b>Auto Pickup</b>
              <div>
                <button type="button" onClick={() => engineRef.current?.resetAutoLootRules?.()}>
                  All
                </button>
                <button type="button" onClick={() => engineRef.current?.clearAutoLootRules?.()}>
                  None
                </button>
              </div>
            </header>
            <span>Types</span>
            <div className="auto-loot-check-grid">
              {AUTO_LOOT_TYPE_OPTIONS.map((option) => (
                <label className={autoLootEnabled(autoLoot, "types", option.id) ? "enabled" : ""} key={option.id}>
                  <input
                    type="checkbox"
                    checked={autoLootEnabled(autoLoot, "types", option.id)}
                    onChange={() => toggleAutoLoot("types", option.id)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <span>Rarity</span>
            <div className="auto-loot-check-grid rarity-grid">
              {AUTO_LOOT_RARITY_OPTIONS.map((option) => (
                <label
                  className={autoLootEnabled(autoLoot, "rarities", option.id) ? "enabled" : ""}
                  style={{ "--rarity-color": option.color }}
                  key={option.id}
                >
                  <input
                    type="checkbox"
                    checked={autoLootEnabled(autoLoot, "rarities", option.id)}
                    onChange={() => toggleAutoLoot("rarities", option.id)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </aside>
      </aside>
      {hoveredItem && hoverPanelStyle && (
        <aside className="item-hover-stack is-floating" style={hoverPanelStyle} aria-hidden="true">
          <section className="item-hover-panel is-floating">
            <span className="item-hover-panel-title">Valgt item</span>
            <InventoryItemDetail selectedItem={hoveredItem} equipment={snapshot.equipment} />
          </section>
          {showEquippedHover && hoveredEquippedItem && (
            <section className="item-hover-panel is-floating equipped">
              <span className="item-hover-panel-title">Udstyret item</span>
              <InventoryItemDetail selectedItem={hoveredEquippedItem} equipment={snapshot.equipment} />
            </section>
          )}
        </aside>
      )}
    </>
  );
}
