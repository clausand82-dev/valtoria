export const PARTICLE_PRESETS = {
  flies: {
    visual: "dot",
    color: "#15110d",
    movement: "swarm",
    count: [3, 8],
    radius: 22,
    size: [1, 2],
    alpha: [0.45, 0.9],
    lifetime: [1.5, 4],
    speed: [0.2, 0.7],
  },

  spores: {
    visual: "softDot",
    color: "#b7e86a",
    movement: "floatUp",
    count: [1, 4],
    radius: 18,
    size: [2, 4],
    alpha: [0.2, 0.55],
    lifetime: [2, 5],
    speed: [0.1, 0.35],
  },

  smoke: {
    visual: "softCircle",
    color: "#777777",
    movement: "riseFade",
    count: [2, 5],
    radius: 16,
    size: [6, 14],
    alpha: [0.06, 0.25],
    lifetime: [2, 5],
    speed: [0.05, 0.18],
  },

  embers: {
    visual: "dot",
    color: "#ff9b3d",
    movement: "rise",
    count: [1, 4],
    radius: 12,
    size: [1, 3],
    alpha: [0.4, 0.85],
    lifetime: [0.8, 2],
    speed: [0.15, 0.45],
  },

  dust: {
    visual: "softCircle",
    color: "#9b8060",
    movement: "drift",
    count: [1, 5],
    radius: 20,
    size: [2, 6],
    alpha: [0.08, 0.25],
    lifetime: [1, 3],
    speed: [0.05, 0.25],
  },

  fireflies: {
    visual: "softDot",
    color: "#d8ff9a",
    movement: "float",
    count: [1, 3],
    radius: 48,
    size: [2, 4],
    alpha: [0.25, 0.75],
    lifetime: [2, 6],
    speed: [0.05, 0.25],
  },

  fogWisps: {
    visual: "softCircle",
    color: "#9bb6aa",
    movement: "drift",
    count: [1, 3],
    radius: 64,
    size: [12, 32],
    alpha: [0.03, 0.12],
    lifetime: [4, 10],
    speed: [0.02, 0.08],
  },

  rain: {
    visual: "line",
    color: "#9db9cc",
    movement: "fall",
    count: [1, 1],
    radius: 0,
    size: [8, 16],
    alpha: [0.25, 0.55],
    lifetime: [0.4, 0.9],
    speed: [500, 800],
  },

  snow: {
    visual: "softDot",
    color: "#ffffff",
    movement: "fallDrift",
    count: [1, 1],
    radius: 0,
    size: [2, 5],
    alpha: [0.35, 0.8],
    lifetime: [3, 8],
    speed: [40, 120],
  },

  ash: {
    visual: "softDot",
    color: "#6f6f6f",
    movement: "fallDrift",
    count: [1, 1],
    radius: 0,
    size: [2, 5],
    alpha: [0.15, 0.45],
    lifetime: [3, 8],
    speed: [20, 80],
  },

  leaves: {
    visual: "dot",
    color: "#8a5a24",
    movement: "fallDrift",
    count: [1, 1],
    radius: 0,
    size: [2, 4],
    alpha: [0.35, 0.8],
    lifetime: [2, 6],
    speed: [30, 100],
  },
};

const warnedParticleTypes = new Set();

function warnUnknownParticleType(type) {
  if (warnedParticleTypes.has(type)) return;
  warnedParticleTypes.add(type);
  if (typeof console !== "undefined") {
    console.warn(`[particles] Unknown particle preset "${type}". Effect skipped.`);
  }
}

function toParticleArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeRange(value, fallback, minValue = -Infinity) {
  const fallbackRange = Array.isArray(fallback) ? fallback : [fallback, fallback];
  const raw = Array.isArray(value) ? value : [value, value];
  const a = Number(raw[0]);
  const b = Number(raw.length > 1 ? raw[1] : raw[0]);
  const min = Number.isFinite(a) ? Math.max(minValue, a) : fallbackRange[0];
  const max = Number.isFinite(b) ? Math.max(min, b) : Math.max(min, fallbackRange[1]);
  return [min, max];
}

export function normalizeParticleConfig(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = String(raw.type ?? "").trim();
  if (!type) return null;
  const preset = PARTICLE_PRESETS[type];
  if (!preset) {
    warnUnknownParticleType(type);
    return null;
  }

  const merged = { ...preset, ...raw, type };
  const chance = Number(merged.chance);
  const density = Number(merged.density);
  return {
    ...merged,
    count: normalizeRange(merged.count, preset.count, 0).map((value) => Math.max(0, Math.floor(value))),
    radius: Math.max(0, Number.isFinite(Number(merged.radius)) ? Number(merged.radius) : Number(preset.radius) || 16),
    size: normalizeRange(merged.size, preset.size, 0.25),
    alpha: normalizeRange(merged.alpha, preset.alpha, 0).map((value) => Math.min(1, value)),
    lifetime: normalizeRange(merged.lifetime, preset.lifetime, 0.1),
    speed: normalizeRange(merged.speed, preset.speed, 0),
    ambientScale: Number.isFinite(Number(merged.ambientScale)) ? Math.max(0.1, Number(merged.ambientScale)) : undefined,
    ambientAlphaScale: Number.isFinite(Number(merged.ambientAlphaScale)) ? Math.max(0.1, Number(merged.ambientAlphaScale)) : undefined,
    renderLayer: merged.renderLayer ?? undefined,
    layer: merged.layer ?? undefined,
    avoidPlayerRadius: Number.isFinite(Number(merged.avoidPlayerRadius)) ? Math.max(0, Number(merged.avoidPlayerRadius)) : undefined,
    avoidPlayerMinAlpha: Number.isFinite(Number(merged.avoidPlayerMinAlpha)) ? Math.max(0, Math.min(1, Number(merged.avoidPlayerMinAlpha))) : undefined,
    heightOffset: Number.isFinite(Number(merged.heightOffset)) ? Number(merged.heightOffset) : 0,
    chance: Number.isFinite(chance) ? Math.max(0, Math.min(1, chance)) : 1,
    density: Number.isFinite(density) ? Math.max(0, density) : undefined,
    onlyWhenOnScreen: merged.onlyWhenOnScreen !== false,
    area: merged.area ?? "anchor",
  };
}

export function normalizeParticleConfigs(raw) {
  return toParticleArray(raw)
    .map((entry) => normalizeParticleConfig(entry))
    .filter(Boolean);
}

export function rollParticleConfigs(raw, rand = Math.random) {
  return normalizeParticleConfigs(raw).filter((config) => rand() <= config.chance);
}

export function randomInRange(range, rand = Math.random) {
  if (!Array.isArray(range)) return Number(range) || 0;
  return range[0] + rand() * (range[1] - range[0]);
}

export function randomIntInRange(range, rand = Math.random) {
  if (!Array.isArray(range)) return Math.max(0, Math.floor(Number(range) || 0));
  const min = Math.max(0, Math.floor(Number(range[0]) || 0));
  const max = Math.max(min, Math.floor(Number(range[1]) || min));
  return min + Math.floor(rand() * (max - min + 1));
}
