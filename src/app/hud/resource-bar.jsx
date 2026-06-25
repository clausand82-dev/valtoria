import React from "react";
import { cityEventEntries } from "../../game/config/city-config.js";
import {
  CITY_CITIZEN_CONDITION_DEFS,
  CITY_STAT_ALIASES,
  CITY_STAT_DEFS,
  CITY_STAT_ICON_URLS,
  CITY_STAT_RULE_TEXT,
} from "../../game/config/city-config.js";

export {
  CITY_CITIZEN_CONDITION_DEFS,
  CITY_STAT_ALIASES,
  CITY_STAT_DEFS,
  CITY_STAT_ICON_URLS,
};

export function ResourceBar({ type, value, label }) {
  return (
    <div className={`resource ${type}`}>
      <span style={{ width: `${value}%` }} />
      <b>{label}</b>
    </div>
  );
}

export function CityStatsTopBar({ stats, onHoverStat = null, onSelectStat = null }) {
  return (
    <div className="city-top-stat-bar" aria-label="City stats">
      {stats.map((stat) => (
        <div
          className={`city-top-stat city-top-stat-${stat.classId}`}
          key={stat.id}
          onMouseEnter={() => onHoverStat?.(stat.id)}
          onMouseLeave={() => onHoverStat?.(null)}
          onFocus={() => onHoverStat?.(stat.id)}
          onBlur={() => onHoverStat?.(null)}
          onClick={() => onSelectStat?.(stat.id)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onSelectStat?.(stat.id);
          }}
          role="button"
          tabIndex={0}
        >
          <img src={CITY_STAT_ICON_URLS[stat.id]} alt="" draggable="false" />
          <div>
            <span>{cityTopStatLabel(stat)}</span>
            <b>{cityTopStatValue(stat)}</b>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CitySideStats({ gold = 0, threatLevel = 0, popularity = 0, events = {} }) {
  const activeEvents = cityEventEntries(events);
  return (
    <div className="city-side-stats" aria-label="City summary stats">
      <CitySideStat icon={CITY_STAT_ICON_URLS.gold} label="Gold" value={Math.max(0, Math.floor(Number(gold) || 0))} />
      <CitySideStat icon="/assets/generated/mini/mini_demon.png" label="Threat" value={`${Math.max(0, Math.min(100, Math.floor(Number(threatLevel) || 0)))}%`} />
      <CitySideStat icon={CITY_STAT_ICON_URLS.popularity} label="Popularity" value={`${Math.max(0, Math.min(100, Math.floor(Number(popularity) || 0)))}%`} />
      {activeEvents.length > 0 && (
        <div className="city-side-events" aria-label="Active city events">
          <b>EVENT</b>
          {activeEvents.map((event) => (
            <span className="city-side-event-entry" key={event.id} tabIndex={0}>
              {event.label}
              <span className="city-side-event-tooltip" role="tooltip">
                <strong>{event.label}</strong>
                {event.detail ? <small>{event.detail}</small> : null}
                {event.solution ? <small>{event.solution}</small> : null}
                {citySideEventModifierText(event.modifiers) ? <em>{citySideEventModifierText(event.modifiers)}</em> : null}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CitySideStat({ icon = null, label, value }) {
  return (
    <div className={`city-side-stat ${icon ? "" : "no-icon"}`}>
      {icon && <img src={icon} alt="" draggable="false" />}
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function citySideEventModifierText(modifiers = {}) {
  const parts = [];
  const pct = (value) => `${Math.round((Number(value) || 1) * 100)}%`;
  if (modifiers.heroMaxHpMultiplier !== undefined) parts.push(`Max HP ${pct(modifiers.heroMaxHpMultiplier)}`);
  if (modifiers.goldDropMultiplier !== undefined) parts.push(`Gold drops ${pct(modifiers.goldDropMultiplier)}`);
  if (modifiers.potionDropMultiplier !== undefined) parts.push(`Potion drops ${pct(modifiers.potionDropMultiplier)}`);
  if (modifiers.healthPotionHealMultiplier !== undefined) parts.push(`Health potions ${pct(modifiers.healthPotionHealMultiplier)}`);
  if (modifiers.cityMobSpawnChanceMultiplier !== undefined) parts.push(`City mob spawn ${pct(modifiers.cityMobSpawnChanceMultiplier)}`);
  if (modifiers.repairCostMultiplier !== undefined) parts.push(`Repair cost ${pct(modifiers.repairCostMultiplier)}`);
  if (modifiers.craftingCostMultiplier !== undefined) parts.push(`Crafting cost ${pct(modifiers.craftingCostMultiplier)}`);
  if (modifiers.merchantBuyPriceMultiplier !== undefined) parts.push(`Buy prices ${pct(modifiers.merchantBuyPriceMultiplier)}`);
  if (modifiers.merchantSellPriceMultiplier !== undefined) parts.push(`Sell prices ${pct(modifiers.merchantSellPriceMultiplier)}`);
  if (modifiers.merchantStockMultiplier !== undefined) parts.push(`Merchant stock ${pct(modifiers.merchantStockMultiplier)}`);
  if (modifiers.questGoldRewardMultiplier !== undefined) parts.push(`Quest gold ${pct(modifiers.questGoldRewardMultiplier)}`);
  if (modifiers.cityDurabilityDegradeChanceMultiplier !== undefined) parts.push(`City decay chance ${pct(modifiers.cityDurabilityDegradeChanceMultiplier)}`);
  if (modifiers.cityDurabilityDamageMultiplier !== undefined) parts.push(`City damage ${pct(modifiers.cityDurabilityDamageMultiplier)}`);
  return parts.join(" | ");
}

export function CityStatDetailPanel({ stat, compact = false }) {
  const entries = Array.isArray(stat.breakdown) ? stat.breakdown : [];
  const rules = CITY_STAT_RULE_TEXT[stat.id] ?? [];
  const ratio = Number(stat.ratio);
  const hasNeed = Math.max(0, Math.floor(Number(stat.need) || 0)) > 0;
  const statusClass = stat.status ? `city-stat-status-${stat.status}` : "";
  return (
    <div className={compact ? "city-stat-tooltip" : "city-stat-detail-panel"} role={compact ? "tooltip" : "group"}>
      <b>{stat.label}</b>
      <span>
        {stat.id === "maintenance"
          ? `Average durability: ${Math.round(stat.value)}%`
          : hasNeed
            ? `Effective: ${stat.value} / ${stat.need}`
            : `Current: ${cityTopStatValue(stat)}`}
      </span>
      {hasNeed && (
        <div className={`city-stat-status-line ${statusClass}`}>
          <strong>{stat.statusLabel || "Status"}</strong>
          <span>{Number.isFinite(ratio) ? `${Math.round(ratio * 100)}% of need` : "No ratio"}</span>
        </div>
      )}
      {hasNeed && stat.actionHint ? <p className="city-stat-action-hint">{stat.actionHint}</p> : null}
      {entries.length > 0 ? (
        <dl>
          {entries.map((entry, index) => (
            <React.Fragment key={`${entry.label}-${index}`}>
              <dt>{entry.label}</dt>
              <dd>
                {entry.amount > 0 ? "+" : ""}{entry.amount}
                {entry.detail ? <small>{entry.detail}</small> : null}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      ) : (
        <p>No active modifiers.</p>
      )}
      {rules.length > 0 && (
        <div className="city-stat-rules">
          <b>Rules</b>
          {rules.map((rule) => <p key={rule}>{rule}</p>)}
        </div>
      )}
    </div>
  );
}

export function CityCitizenConditions({ stats }) {
  return (
    <div className="city-citizen-conditions" aria-label="Citizen conditions">
      {CITY_CITIZEN_CONDITION_DEFS.map((entry) => {
        const value = Math.max(0, Math.floor(Number(stats?.[entry.id]) || 0));
        return (
          <div className={value > 0 ? "warning" : ""} title={entry.label} key={entry.id}>
            <img src={CITY_STAT_ICON_URLS[entry.id]} alt="" draggable="false" />
            <span>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function cityTopStatLabel(stat) {
  return stat.label.replace(/\s+-?\d+%?(\s*\/\s*\d+)?$/, "");
}

function cityTopStatValue(stat) {
  if (stat.id === "xp") return `${stat.value} / ${stat.max}`;
  if (stat.id === "popularity" || stat.id === "happiness" || stat.id === "maintenance") return `${Math.round(stat.value)}%`;
  if (stat.need) return `${Math.round(stat.value)} / ${Math.round(stat.need)}`;
  return String(stat.value);
}
