import { normalizeParticleConfigs } from "./particle-presets.js";

export const WEATHER_PRESETS = {
  none: {
    id: "none",
    label: "No weather",
    particles: [],
  },

  light_rain: {
    id: "light_rain",
    label: "Light rain",
    particles: [
      { type: "rain", layer: "screen", density: 0.35 },
    ],
    ambience: {
      lightTint: "#7f8f95",
      fogAmount: 0.08,
    },
  },

  heavy_rain: {
    id: "heavy_rain",
    label: "Heavy rain",
    particles: [
      { type: "rain", layer: "screen", density: 0.75 },
      { type: "fogWisps", layer: "screen", density: 0.12 },
    ],
    ambience: {
      lightTint: "#6f7f86",
      fogAmount: 0.18,
    },
  },

  fog: {
    id: "fog",
    label: "Fog",
    particles: [
      { type: "fogWisps", layer: "screen", density: 0.25 },
    ],
    ambience: {
      lightTint: "#8f9992",
      fogAmount: 0.35,
    },
  },

  ashfall: {
    id: "ashfall",
    label: "Ashfall",
    particles: [
      { type: "ash", layer: "screen", density: 0.25 },
    ],
    ambience: {
      lightTint: "#a27b6a",
      fogAmount: 0.12,
    },
  },

  snow: {
    id: "snow",
    label: "Snow",
    particles: [
      { type: "snow", layer: "screen", density: 0.35 },
    ],
    ambience: {
      lightTint: "#b8c9d6",
      fogAmount: 0.1,
    },
  },

  leaves: {
    id: "leaves",
    label: "Leaves",
    particles: [
      { type: "leaves", layer: "screen", density: 0.35 },
    ],
    ambience: {
      lightTint: "#8a5a24",
      fogAmount: 0.1,
    },
  },

  thunderstorm: {
    id: "thunderstorm",
    label: "Thunderstorm",
    particles: [
      { type: "rain", layer: "screen", density: 0.8, angle: 14 },
      { type: "fogWisps", layer: "screen", density: 0.12 },
    ],
    ambience: {
      lightTint: "#59636d",
      fogAmount: 0.2,
      darkness: 0.25,
    },
    events: [
      {
        type: "lightning_flash",
        chancePerSecond: 0.035,
        flashColor: "#dbe9ff",
        flashAlpha: [0.35, 0.75],
        durationMs: [80, 180],
        thunderDelayMs: [300, 1800],
        sound: "thunder",
      },
    ],
  },
};

const warnedWeatherIds = new Set();

function warnUnknownWeatherId(id) {
  if (warnedWeatherIds.has(id)) return;
  warnedWeatherIds.add(id);
  if (typeof console !== "undefined") {
    console.warn(`[weather] Unknown weather preset "${id}". Falling back to "none".`);
  }
}

function seeded01(seed, salt = 0) {
  let n = Math.imul(Math.floor(Number(seed) || 0) + salt, 374761393) ^ Math.imul(668265263, salt + 1013904223);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function pickWeightedWeather(possible, seed) {
  const entries = Array.isArray(possible) ? possible : [];
  const valid = entries
    .map((entry) => ({
      id: String(entry?.id ?? entry?.weather ?? "").trim(),
      weight: Math.max(0, Number(entry?.weight) || 0),
    }))
    .filter((entry) => entry.id && entry.weight > 0);
  if (!valid.length) return "none";
  const total = valid.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = seeded01(seed, 4207) * total;
  for (const entry of valid) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.id;
  }
  return valid[valid.length - 1].id;
}

function mergeWeatherOverrides(preset, overrides) {
  if (!overrides || typeof overrides !== "object") return preset;
  return {
    ...preset,
    particles: overrides.particles ?? preset.particles,
    events: overrides.events ?? preset.events,
    ambience: {
      ...(preset.ambience ?? {}),
      ...((overrides.ambience && typeof overrides.ambience === "object") ? overrides.ambience : {}),
    },
    gameplay: {
      ...(preset.gameplay ?? {}),
      ...((overrides.gameplay && typeof overrides.gameplay === "object") ? overrides.gameplay : {}),
    },
  };
}

function normalizeRange(value, fallback, minValue = 0) {
  const fallbackRange = Array.isArray(fallback) ? fallback : [fallback, fallback];
  const raw = Array.isArray(value) ? value : [value, value];
  const a = Number(raw[0]);
  const b = Number(raw.length > 1 ? raw[1] : raw[0]);
  const min = Number.isFinite(a) ? Math.max(minValue, a) : fallbackRange[0];
  const max = Number.isFinite(b) ? Math.max(min, b) : Math.max(min, fallbackRange[1]);
  return [min, max];
}

function normalizeWeatherEvents(rawEvents) {
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  return events
    .map((event) => {
      if (!event || typeof event !== "object") return null;
      const type = String(event.type ?? "").trim();
      if (type !== "lightning_flash" && type !== "lightning_bolt" && type !== "wind_gust") return null;
      return {
        ...event,
        type,
        chancePerSecond: Math.max(0, Number(event.chancePerSecond) || 0),
        flashColor: event.flashColor ?? "#dbe9ff",
        flashAlpha: normalizeRange(event.flashAlpha, [0.35, 0.75], 0).map((value) => Math.min(1, value)),
        durationMs: normalizeRange(event.durationMs, [80, 180], 1),
        thunderDelayMs: normalizeRange(event.thunderDelayMs, [300, 1800], 0),
        sound: event.sound ? String(event.sound) : null,
      };
    })
    .filter(Boolean);
}

export function resolveWeatherForRegion(regionConfig = {}, mapSeed = 0) {
  const raw = regionConfig.weather;
  if (!raw || typeof raw !== "object") {
    const none = WEATHER_PRESETS.none ?? { id: "none", label: "No weather", particles: [] };
    return { ...none, particles: [] };
  }

  const weatherId = raw.active
    ? String(raw.active).trim()
    : pickWeightedWeather(raw.possible, mapSeed);
  const preset = WEATHER_PRESETS[weatherId] ?? WEATHER_PRESETS.none ?? { id: "none", label: "No weather", particles: [] };
  if (!WEATHER_PRESETS[weatherId] && weatherId !== "none") warnUnknownWeatherId(weatherId);

  const merged = mergeWeatherOverrides(preset, raw.overrides);
  return {
    id: merged.id ?? weatherId ?? "none",
    label: merged.label ?? merged.id ?? "Weather",
    particles: normalizeParticleConfigs(merged.particles).map((entry) => ({ ...entry })),
    events: normalizeWeatherEvents(merged.events).map((entry) => ({ ...entry })),
    ambience: { ...(merged.ambience ?? {}) },
    // Reserved for future gameplay rules. It is intentionally unused by runtime systems.
    gameplay: { ...(merged.gameplay ?? {}) },
  };
}
