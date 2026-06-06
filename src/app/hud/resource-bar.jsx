import React, { useState } from "react";
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

export function CityStatsTopBar({ stats }) {
  const [hoveredStatId, setHoveredStatId] = useState(null);
  return (
    <div className="city-top-stat-bar" aria-label="City stats">
      {stats.map((stat) => (
        <div
          className={`city-top-stat city-top-stat-${stat.classId}`}
          key={stat.id}
          onMouseEnter={() => setHoveredStatId(stat.id)}
          onMouseLeave={() => setHoveredStatId((current) => current === stat.id ? null : current)}
          onFocus={() => setHoveredStatId(stat.id)}
          onBlur={() => setHoveredStatId((current) => current === stat.id ? null : current)}
          tabIndex={0}
        >
          <img src={CITY_STAT_ICON_URLS[stat.id]} alt="" draggable="false" />
          <div>
            <span>{cityTopStatLabel(stat)}</span>
            <b>{cityTopStatValue(stat)}</b>
          </div>
          {hoveredStatId === stat.id && <CityStatTooltip stat={stat} />}
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
            <span key={event.id} title={event.detail}>{event.label}</span>
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

function CityStatTooltip({ stat }) {
  const entries = Array.isArray(stat.breakdown) ? stat.breakdown : [];
  const rules = CITY_STAT_RULE_TEXT[stat.id] ?? [];
  return (
    <div className="city-stat-tooltip" role="tooltip">
      <b>{stat.label}</b>
      <span>Current: {cityTopStatValue(stat)}</span>
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
  if (stat.id === "popularity" || stat.id === "happiness" || stat.id === "health" || stat.id === "safety" || stat.id === "maintenance") return `${Math.round(stat.value)}%`;
  return String(stat.value);
}
