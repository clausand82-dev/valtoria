import React from "react";

function findEquippedComparison(item, equipment) {
  if (!item || item.index === undefined) return null;
  let slotId = item.slot;
  if (slotId === "ring") {
    const ring1 = equipment.find((slot) => slot.id === "ring1")?.item;
    const ring2 = equipment.find((slot) => slot.id === "ring2")?.item;
    return ring1 || ring2 || null;
  }
  return equipment.find((slot) => slot.id === slotId)?.item ?? null;
}

function getItemDiffs(item, equipped) {
  const rows = [
    diffNumber("Skade min", item.damageMin, equipped.damageMin),
    diffNumber("Skade max", item.damageMax, equipped.damageMax),
    diffNumber("Armor", item.armor, equipped.armor),
    diffNumber("Liv", item.maxHp, equipped.maxHp),
    diffNumber("Mana", item.maxMana, equipped.maxMana),
    diffNumber("Magi", item.magic, equipped.magic),
    diffNumber("Fart", item.speed, equipped.speed, { decimals: 2 }),
    diffNumber("Range", item.range, equipped.range, { decimals: 2 }),
    diffNumber("Cooldown", item.cooldown, equipped.cooldown, { decimals: 2, lowerIsBetter: true }),
  ];
  return rows.filter(Boolean);
}

function diffNumber(label, next, current, options = {}) {
  const decimals = options.decimals ?? 0;
  const diff = Number(next || 0) - Number(current || 0);
  if (Math.abs(diff) < 0.005) return null;
  const good = options.lowerIsBetter ? diff < 0 : diff > 0;
  return {
    label,
    good,
    text: Math.abs(diff).toFixed(decimals),
  };
}

export function InventoryItemDetail({ selectedItem, equipment }) {
  if (!selectedItem) return null;

  const comparisonItem = findEquippedComparison(selectedItem, equipment);
  const diffs = comparisonItem ? getItemDiffs(selectedItem, comparisonItem) : [];
  const showDurability = selectedItem.mode !== "resource" && selectedItem.mode !== "potion" && selectedItem.mode !== "readable" && selectedItem.durability !== undefined;
  const durPct = showDurability ? Math.max(0, Math.min(100, Number(selectedItem.durability ?? 100))) : null;
  const durColor = durPct === null ? null : durPct >= 75 ? "#58d96d" : durPct >= 40 ? "#ffd85d" : "#ff6b5f";

  return (
    <div className="item-detail">
      <b className={selectedItem.mode === "resource" ? "resource-rarity" : selectedItem.rarity}>{selectedItem.name}</b>
      {selectedItem.mode === "resource" && <em>Stack: {selectedItem.count ?? 1} / {selectedItem.stackMax ?? "?"}</em>}
      {selectedItem.mode === "potion" && selectedItem.count > 1 && <em>Stack: {selectedItem.count}</em>}
      {showDurability && (
        <div className="item-detail-durability">
          <span style={{ color: durColor }}>
            Durability: {Math.round(durPct)}%{durPct < 75 && durPct > 0 ? " - Stats reduceret" : ""}{durPct <= 0 ? " - Ubrugeligt" : ""}
          </span>
          <span className="item-detail-dur-bar-wrap">
            <span className="item-detail-dur-bar-fill" style={{ width: String(durPct) + "%", background: durColor }} />
          </span>
        </div>
      )}
      <span>{selectedItem.summary}</span>
      {comparisonItem && diffs.length > 0 && (
        <div className="comparison-list">
          {diffs.map((diff) => (
            <span className={diff.good ? "diff-good" : "diff-bad"} key={diff.label}>
              {diff.good ? "+" : "-"} {diff.label} {diff.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
