import React from "react";
import { useLocalization } from "../../i18n/index.js";
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
  const { localize } = useLocalization();
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
            <span>{localize(CITY_STAT_DEFS.find((entry) => entry.id === stat.id), "label") || cityTopStatLabel(stat)}</span>
            <b>{cityTopStatValue(stat)}</b>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CitySideStats({ gold = 0, threatLevel = 0, popularity = 0, events = {} }) {
  const { localize } = useLocalization();
  const activeEvents = cityEventEntries(events);
  return (
    <div className="city-side-stats" aria-label="City summary stats">
      <CitySideStat icon={CITY_STAT_ICON_URLS.gold} label="Gold" value={Math.max(0, Math.floor(Number(gold) || 0))} />
      <CitySideStat icon="/assets/generated/icon/icon_threat.png" label="Threat" value={`${Math.max(0, Math.min(100, Math.floor(Number(threatLevel) || 0)))}%`} />
      <CitySideStat icon={CITY_STAT_ICON_URLS.popularity} label="Popularity" value={`${Math.max(0, Math.min(100, Math.floor(Number(popularity) || 0)))}%`} />
      {activeEvents.length > 0 && (
        <div className="city-side-events" aria-label="Active city events">
          <b>EVENT</b>
          {activeEvents.map((event) => (
            <span className="city-side-event-entry" key={event.id} tabIndex={0}>
              {localize(event, "label")}
              <span className="city-side-event-tooltip" role="tooltip">
                <strong>{localize(event, "label")}</strong>
                {event.detail ? <small>{localize(event, "detail")}</small> : null}
                {event.solution ? <small>{localize(event, "solution")}</small> : null}
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
  const { localize, t } = useLocalization();
  const entries = Array.isArray(stat.breakdown) ? stat.breakdown : [];
  const rules = localize(CITY_STAT_RULE_TEXT, stat.id) || CITY_STAT_RULE_TEXT[stat.id] || [];
  const ratio = Number(stat.ratio);
  const hasNeed = Math.max(0, Math.floor(Number(stat.need) || 0)) > 0;
  const statusClass = stat.status ? `city-stat-status-${stat.status}` : "";
  return (
    <div className={compact ? "city-stat-tooltip" : "city-stat-detail-panel"} role={compact ? "tooltip" : "group"}>
      <b>{stat.label}</b>
      <span>
        {stat.id === "maintenance"
          ? t("city.stat.averageDurability", { value: Math.round(stat.value) })
          : hasNeed
            ? t("city.stat.effectiveValue", { value: stat.value, need: stat.need })
            : t("city.stat.currentValue", { value: cityTopStatValue(stat) })}
      </span>
      {hasNeed && (
        <div className={`city-stat-status-line ${statusClass}`}>
          <strong>{stat.statusLabel || t("city.stat.status")}</strong>
          <span>{Number.isFinite(ratio) ? t("city.stat.ofNeed", { percent: Math.round(ratio * 100) }) : t("city.stat.noRatio")}</span>
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
        <p>{t("city.stat.noActiveModifiers")}</p>
      )}
      {rules.length > 0 && (
        <div className="city-stat-rules">
          <b>{t("city.stat.rulesTitle")}</b>
          {rules.map((rule) => <p key={rule}>{rule}</p>)}
        </div>
      )}
    </div>
  );
}

export function CityCitizenConditions({ stats }) {
  const { localize } = useLocalization();
  return (
    <div className="city-citizen-conditions" aria-label="Citizen conditions">
      {CITY_CITIZEN_CONDITION_DEFS.map((entry) => {
        const value = Math.max(0, Math.floor(Number(stats?.[entry.id]) || 0));
        return (
          <div className={value > 0 ? "warning" : ""} title={localize(entry, "label")} key={entry.id}>
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
