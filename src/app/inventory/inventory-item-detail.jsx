import React from "react";
import { ITEM_DURABILITY_PENALTY_THRESHOLD } from "../../game/config/durability-config.js";
import { localizeItemField, localizeItemSummary, useLocalization } from "../../i18n/index.js";

const EFFECTIVE_STAT_ROWS = [
  { key: "damageMin", labelKey: "inventory.stat.damageMin", decimals: 0 },
  { key: "damageMax", labelKey: "inventory.stat.damageMax", decimals: 0 },
  { key: "armor", labelKey: "inventory.stat.armor", decimals: 0 },
  { key: "maxHp", labelKey: "inventory.stat.health", decimals: 0 },
  { key: "maxMana", labelKey: "inventory.stat.mana", decimals: 0 },
  { key: "magic", labelKey: "inventory.stat.magic", decimals: 0 },
  { key: "speed", labelKey: "inventory.stat.speed", decimals: 2 },
  { key: "range", labelKey: "inventory.stat.range", decimals: 2 },
  { key: "cooldown", labelKey: "inventory.stat.cooldown", decimals: 2, lowerIsBetter: true },
];

function durabilityMultiplier(item) {
  if (!item || item.mode === "resource" || item.mode === "potion" || item.mode === "readable") return 1;
  const durability = Math.max(0, Math.min(100, Number(item.durability ?? 100)));
  if (durability <= 0) return 0;
  if (durability >= ITEM_DURABILITY_PENALTY_THRESHOLD) return 1;
  return durability / ITEM_DURABILITY_PENALTY_THRESHOLD;
}

function durabilityAdjustedStat(item, key) {
  const multiplier = durabilityMultiplier(item);
  return Number(item?.[key] || 0) * multiplier;
}

function formatScaledSummaryNumber(rawToken, scaledValue, suffix) {
  const isPercent = suffix.includes("%");
  const hadDecimals = String(rawToken).includes(".");
  const decimals = hadDecimals ? (String(rawToken).split(".")[1]?.length ?? 0) : (isPercent ? 1 : 0);
  const rounded = Number(scaledValue.toFixed(decimals));
  const absoluteText = decimals > 0 ? Math.abs(rounded).toFixed(decimals) : String(Math.round(Math.abs(rounded)));
  const sign = rounded < 0 ? "-" : "+";
  return `${sign}${absoluteText}`;
}

function effectiveSummaryText(item) {
  const baseSummary = String(item?.summary ?? "").trim();
  if (!baseSummary) return "";
  const multiplier = durabilityMultiplier(item);
  if (multiplier >= 1 || multiplier <= 0) return baseSummary;

  const segments = baseSummary.split("|").map((part) => part.trim()).filter(Boolean);
  const scaledSegments = segments.map((segment) => {
    if (/\bg\s*$/i.test(segment)) return segment;
    const match = segment.match(/^([+-]?\d+(?:\.\d+)?)(\s*.*)$/);
    if (!match) return segment;
    const rawNumber = Number(match[1]);
    if (!Number.isFinite(rawNumber)) return segment;
    const scaledNumber = rawNumber * multiplier;
    const suffix = match[2] ?? "";
    return `${formatScaledSummaryNumber(match[1], scaledNumber, suffix)}${suffix}`.trim();
  });

  return scaledSegments.join(" | ");
}

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

function getItemDiffs(item, equipped, t) {
  const rows = EFFECTIVE_STAT_ROWS.map((entry) => diffNumber(
    t(entry.labelKey),
    durabilityAdjustedStat(item, entry.key),
    durabilityAdjustedStat(equipped, entry.key),
    { decimals: entry.decimals, lowerIsBetter: entry.lowerIsBetter }
  ));
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

export function InventoryItemDetail({ selectedItem, equipment, showSummary = true }) {
  const { language, localize, t } = useLocalization();
  if (!selectedItem) return null;

  const comparisonItem = findEquippedComparison(selectedItem, equipment);
  const diffs = comparisonItem ? getItemDiffs(selectedItem, comparisonItem, t) : [];
  const itemNameColor = selectedItem.rarityColor ?? undefined;
  const displaySummary = localizeItemSummary(selectedItem, effectiveSummaryText(selectedItem), language, localize);
  const showDurability = selectedItem.mode !== "resource" && selectedItem.mode !== "potion" && selectedItem.mode !== "readable";
  const durPct = showDurability ? Math.max(0, Math.min(100, Number(selectedItem.durability ?? 100))) : null;
  const durColor = durPct === null ? null : durPct >= 75 ? "#58d96d" : durPct >= 40 ? "#ffd85d" : "#ff6b5f";

  return (
    <div className="item-detail">
      <b className={selectedItem.mode === "resource" ? "resource-rarity" : selectedItem.rarity} style={{ color: itemNameColor }}>{localizeItemField(selectedItem, "name", localize)}</b>
      {localizeItemField(selectedItem, "description", localize) && <p className="item-detail-description">{localizeItemField(selectedItem, "description", localize)}</p>}
      {selectedItem.mode === "resource" && <em>{t("inventory.stack")}: {selectedItem.count ?? 1} / {selectedItem.stackMax ?? "?"}</em>}
      {selectedItem.mode === "potion" && selectedItem.count > 1 && <em>{t("inventory.stack")}: {selectedItem.count}</em>}
      {selectedItem.mode === "quest" && (selectedItem.flags?.stackable || selectedItem.stackMax > 1) && <em>{t("inventory.stack")}: {selectedItem.count ?? 1} / {selectedItem.stackMax ?? "?"}</em>}
      {showDurability && (
        <div className="item-detail-durability">
          <span style={{ color: durColor }}>
            {t("inventory.durability")}: {Math.round(durPct)}%{durPct < 75 && durPct > 0 ? ` - ${t("inventory.statsReduced")}` : ""}{durPct <= 0 ? ` - ${t("inventory.unusable")}` : ""}
          </span>
          <span className="item-detail-dur-bar-wrap">
            <span className="item-detail-dur-bar-fill" style={{ width: String(durPct) + "%", background: durColor }} />
          </span>
        </div>
      )}
      {comparisonItem && diffs.length > 0 && (
        <>
          <span className="item-detail-section-label">{t("inventory.comparedWithEquipped")}</span>
          <div className="comparison-list">
            {diffs.map((diff) => (
              <span className={diff.good ? "diff-good" : "diff-bad"} key={diff.label}>
                {diff.good ? "+" : "-"} {diff.label} {diff.text}
              </span>
            ))}
          </div>
        </>
      )}
      {showSummary && <span>{displaySummary}</span>}
    </div>
  );
}
