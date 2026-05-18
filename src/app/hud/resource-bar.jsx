import React, { useState } from "react";
import { ITEM_MONEY_ICON_URL } from "../ui/icons.jsx";

export const CITY_STAT_ALIASES = {
  defence: "defense",
  cityDefence: "defense",
  city_defence: "defense",
  citizensHealth: "health",
  citizens_health: "health",
  food: "provision",
  army: "defense",
  happiness: "popularity",
};

export const CITY_STAT_DEFS = [
  { id: "population", label: "POPULATION" },
  { id: "housing", label: "HOUSING" },
  { id: "provision", label: "PROVISION" },
  { id: "water", label: "WATER" },
  { id: "supply", label: "SUPPLY" },
  { id: "wealth", label: "WEALTH" },
  { id: "trade", label: "TRADE" },
  { id: "safety", label: "SAFETY", max: 100 },
  { id: "health", label: "HEALTH", max: 100 },
  { id: "defense", classId: "defence", label: "DEFENSE" },
  { id: "popularity", label: "POPULARITY", max: 100 },
  { id: "knowledge", label: "KNOWLEDGE" },
  { id: "culture", label: "CULTURE" },
  { id: "faith", label: "FAITH" },
  { id: "maintenance", label: "MAINTENANCE", max: 100 },
];

export const CITY_CITIZEN_CONDITION_DEFS = [
  { id: "homeless_people", label: "Homeless" },
  { id: "hungry_people", label: "Hungry" },
  { id: "thirsty_people", label: "Thirsty" },
  { id: "sick_people", label: "Sick" },
  { id: "angry_people", label: "Angry" },
];

export const CITY_STAT_ICON_URLS = {
  city_defence: "/assets/generated/icon/icon_citydefence.png",
  defense: "/assets/generated/icon/icon_citydefence.png",
  population: "/assets/generated/icon/icon_population.png",
  housing: "/assets/generated/icon/icon_housing.png",
  provision: "/assets/generated/icon/icon_provision.png",
  water: "/assets/generated/icon/icon_water.png",
  supply: "/assets/generated/icon/icon_provision.png",
  wealth: ITEM_MONEY_ICON_URL,
  trade: ITEM_MONEY_ICON_URL,
  safety: "/assets/generated/icon/icon_citydefence.png",
  army: "/assets/generated/icon/icon_army.png",
  happiness: "/assets/generated/icon/icon_happiness.png",
  health: "/assets/generated/icon/icon_health.png",
  citizens_health: "/assets/generated/icon/icon_health.png",
  knowledge: "/assets/generated/item/item_book_lore.png",
  culture: "/assets/generated/icon/icon_popularity.png",
  faith: "/assets/generated/house/house_sanctury.png",
  maintenance: "/assets/generated/item/item_tools_repairkit.png",
  hungry_people: "/assets/generated/icon/icon_hunger.png",
  homeless_people: "/assets/generated/icon/icon_homeless.png",
  thirsty_people: "/assets/generated/icon/icon_thirst.png",
  sick_people: "/assets/generated/icon/icon_sick.png",
  angry_people: "/assets/generated/icon/icon_angry.png",
  xp: "/assets/generated/icon/icon_xp.png",
  popularity: "/assets/generated/icon/icon_popularity.png",
  gold: ITEM_MONEY_ICON_URL,
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
  const activeEvents = cityActiveEventEntries(events);
  return (
    <div className="city-side-stats" aria-label="City summary stats">
      <CitySideStat icon={CITY_STAT_ICON_URLS.gold} label="Gold" value={Math.max(0, Math.floor(Number(gold) || 0))} />
      <CitySideStat label="Threat" value={`${Math.max(0, Math.min(100, Math.floor(Number(threatLevel) || 0)))}%`} />
      <CitySideStat icon={CITY_STAT_ICON_URLS.popularity} label="Popularity" value={`${Math.max(0, Math.min(100, Math.floor(Number(popularity) || 0)))}%`} />
      {activeEvents.length > 0 && (
        <div className="city-side-events" aria-label="Active city events">
          <b>Events</b>
          {activeEvents.map((event) => (
            <span key={event.id} title={event.detail}>{event.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function cityActiveEventEntries(events = {}) {
  const defs = {
    famine: ["Famine", "Provision is below population. Recruitment capacity and later food drops are affected."],
    water_shortage: ["Water shortage", "Water is below population. Recruitment capacity and later potion drops are affected."],
    disease_outbreak: ["Disease", "Health is below 50%. Later hero max HP effects can use this."],
    uprising_poorness: ["Uprising risk", "Wealth is low compared to population. Later gold drops can be affected."],
    fire: ["Fire risk", "Low safety, especially with water shortage, raises fire risk."],
  };
  return Object.entries(defs)
    .filter(([id]) => events?.[id]?.active)
    .map(([id, [label, detail]]) => ({ id, label, detail }));
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

const CITY_STAT_RULE_TEXT = {
  population: [
    "Controls how many citizens can be used for army recruitment.",
    "Unlocked regions can add current population through their scaled cityStats.population value.",
  ],
  housing: ["If population exceeds housing, later city events can react to overcrowding."],
  provision: ["If provision is below population, famine becomes active and health is reduced by 15."],
  water: ["If water is below population, water shortage becomes active and health is reduced by 15."],
  supply: ["General supply can be improved by regions, buildings, and addons."],
  wealth: ["If wealth/population is below 0.5, uprising risk becomes active."],
  trade: ["Trade can feed later wealth and supply logic."],
  safety: ["Starts at 100. Each city mob level currently present reduces safety by 2 points.", "Low safety raises fire risk."],
  health: ["Health is a 0-100 public-health score.", "If health is below 50, disease outbreak becomes active."],
  defense: ["Uses the old army unit power as defense.", "If knowledge is at least population, defense gains +5%."],
  knowledge: ["If knowledge is at least population, defense gains +5%."],
  culture: ["If culture is at least population, popularity gains +10%."],
  faith: ["If faith is at least population, non-unique drop rate bonus is exposed as 5%."],
  maintenance: ["Average durability percent of unlocked city areas and built buildings."],
};

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
