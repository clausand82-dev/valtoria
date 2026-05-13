import React from "react";
import { MAX_INVENTORY } from "../../game/data.js";
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
import { InventoryItemDetail } from "../shared.jsx";

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
  return (
    <>
      <aside className="inventory-panel" onMouseLeave={() => setSelectedItem(null)}>
        <header>
          <div>
            <h1>Rygsaek</h1>
            <span>
              {snapshot.inventory.length} / {MAX_INVENTORY}
            </span>
          </div>
          <button type="button" className="close-button" onClick={() => setInventoryOpen(false)} title="Luk">
            x
          </button>
        </header>

        <div className="equipment-grid">
          {snapshot.equipment.map((slot) => (
            <button
              type="button"
              className={`equipment-slot equipment-${slot.id} ${slot.item ? "equipped" : "empty"}`}
              style={{ "--item-quality": slot.item?.rarityColor ?? "rgba(255,255,255,0.16)" }}
              key={slot.id}
              onMouseEnter={() => setSelectedItem(slot.item)}
              onFocus={() => setSelectedItem(slot.item)}
            >
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
          ))}
        </div>

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
              <span>{filter.text}</span>
            </button>
          ))}
        </div>

        <div className="item-grid">
          {inventorySlots.map((item, slotIndex) => {
            if (!item) {
              return <article className="item-card empty-slot" key={`empty-${slotIndex}`} aria-hidden="true" />;
            }
            const dimmed = inventoryFilter !== "all" && !itemMatchesInventoryFilter(item, inventoryFilter);
            return (
              <article
                className={`item-card ${item.rarity} ${item.mode === "resource" ? "resource-item" : ""} ${dimmed ? "filter-dimmed" : ""} ${isItemRequiredByActiveQuests(item, snapshot.quests?.active) ? "quest-related" : ""}`}
                style={{ "--item-quality": item.rarityColor ?? "rgba(255,255,255,0.16)" }}
                key={item.id}
                onMouseEnter={() => setSelectedItem(item)}
                onFocus={() => setSelectedItem(item)}
                onClick={() => {
                  if (isEquippableItem(item)) engineRef.current?.equipItem(item.index);
                }}
                tabIndex={0}
              >
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
                {(item.mode === "potion" || item.mode === "resource") && item.count > 1 && <b className="stack-count">{item.count}</b>}
                {item.durability !== undefined && item.mode !== "resource" && item.mode !== "potion" && (() => {
                  const dp = Math.max(0, Math.min(100, Number(item.durability ?? 100)));
                  const dc = dp >= 75 ? "#58d96d" : dp >= 40 ? "#ffd85d" : "#ff6b5f";
                  return (
                    <span className="item-card-dur-bar-wrap" title={`Durability: ${Math.round(dp)}%`}>
                      <span className="item-card-dur-bar-fill" style={{ width: `${dp}%`, background: dc }} />
                    </span>
                  );
                })()}
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
                      if (result?.type === "resource-choice" || result?.type === "readable-choice") setMergeChoice(result);
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
                    className="corner-action merge-action"
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
      </aside>

      {selectedItem && (
        <aside className="item-hover-panel" aria-live="polite">
          <InventoryItemDetail selectedItem={selectedItem} equipment={snapshot.equipment} />
        </aside>
      )}
    </>
  );
}
