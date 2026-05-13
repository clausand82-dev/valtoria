import React from "react";
import { ITEM_MONEY_ICON_URL } from "../ui/icons.jsx";

export const CITY_STAT_ALIASES = {
  defence: "city_defence",
  cityDefence: "city_defence",
  city_defence: "city_defence",
  citizensHealth: "citizens_health",
  citizens_health: "citizens_health",
  food: "provision",
};

export const CITY_STAT_DEFS = [
  { id: "city_defence", classId: "defence", label: "CITY DEFENCE" },
  { id: "population", label: "POPULATION" },
  { id: "housing", label: "HOUSING" },
  { id: "provision", label: "PROVISION" },
  { id: "water", label: "WATER" },
  { id: "army", label: "ARMY" },
  { id: "happiness", label: "HAPPINESS" },
  { id: "citizens_health", classId: "citizens-health", label: "CITIZENS HEALTH" },
  { id: "xp", label: "XP", max: (snapshot) => snapshot.player?.nextXp ?? 1 },
  { id: "popularity", label: "POPULARITY", max: 100 },
  { id: "gold", label: "GOLD", max: 999999 },
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
  population: "/assets/generated/icon/icon_population.png",
  housing: "/assets/generated/icon/icon_housing.png",
  provision: "/assets/generated/icon/icon_provision.png",
  water: "/assets/generated/icon/icon_water.png",
  army: "/assets/generated/icon/icon_army.png",
  happiness: "/assets/generated/icon/icon_happiness.png",
  citizens_health: "/assets/generated/icon/icon_health.png",
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
  return (
    <div className="city-top-stat-bar" aria-label="City stats">
      {stats.map((stat) => (
        <div className={`city-top-stat city-top-stat-${stat.classId}`} key={stat.id} title={stat.label}>
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
  if (stat.id === "popularity" || stat.id === "happiness") return `${Math.round(stat.value)}%`;
  return String(stat.value);
}
