import { LEGACY_LAYER_MAP, PARTICLE_PRESETS } from "./particlePresets.js";

const warnedParticleTypes = new Set();

export function warnUnknownParticleType(type) {
  if (warnedParticleTypes.has(type)) return;
  warnedParticleTypes.add(type);
  if (typeof console !== "undefined" && import.meta.env.DEV) console.warn(`[particles] Unknown particle preset "${type}". Effect skipped.`);
}

export function toParticleArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function normalizeRange(value, fallback, minValue = -Infinity) {
  const fb = Array.isArray(fallback) ? fallback : [fallback, fallback];
  const raw = Array.isArray(value) ? value : [value, value];
  const a = Number(raw[0]);
  const b = Number(raw.length > 1 ? raw[1] : raw[0]);
  const min = Number.isFinite(a) ? Math.max(minValue, a) : fb[0];
  const max = Number.isFinite(b) ? Math.max(min, b) : Math.max(min, fb[1]);
  return [min, max];
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

export function normalizeLayer(value, fallback = "effects") {
  const raw = String(value ?? "").trim();
  return (LEGACY_LAYER_MAP[raw] ?? raw) || fallback;
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
  const density = Number(merged.density);
  const intensity = Number(merged.intensity);
  const legacyCount = normalizeRange(merged.count, [1, 1], 0).map((value) => Math.max(0, Math.floor(value)));
  const layer = normalizeLayer(merged.layer ?? merged.renderLayer, preset.layer ?? "effects");
  return {
    ...merged,
    maxParticles: Math.max(1, Math.floor(Number(merged.maxParticles) || Math.max(legacyCount[1], preset.maxParticles ?? 16))),
    spawnRate: Math.max(0, Number(merged.spawnRate ?? preset.spawnRate ?? legacyCount[1]) || 0),
    oneShotCount: Math.max(1, Math.floor(Number(merged.oneShotCount) || legacyCount[1] || preset.oneShotCount || 8)),
    count: legacyCount,
    lifetime: normalizeRange(merged.lifetime, preset.lifetime ?? [1, 1], 0.05),
    speed: normalizeRange(merged.speed, preset.speed ?? [0, 0], 0),
    size: normalizeRange(merged.size, preset.size ?? [2, 2], 0.1),
    endSize: normalizeRange(merged.endSize, merged.size ?? preset.endSize ?? preset.size ?? [2, 2], 0.1),
    alpha: normalizeRange(merged.alpha, preset.alpha ?? [1, 1], 0).map((value) => Math.min(1, value)),
    endAlpha: normalizeRange(merged.endAlpha, merged.alpha ?? preset.alpha ?? [0, 0], 0).map((value) => Math.min(1, value)),
    rotationSpeed: normalizeRange(merged.rotationSpeed, preset.rotationSpeed ?? [-2.5, 2.5]),
    colors: Array.isArray(raw.colors) && raw.colors.length
      ? raw.colors
      : raw.color
        ? [raw.color]
        : Array.isArray(merged.colors) && merged.colors.length
          ? merged.colors
          : [preset.color ?? "#ffffff"],
    layer,
    renderLayer: layer,
    area: normalizeArea(merged.area ?? (layer === "weatherOverlay" || layer === "screenOverlay" ? "screen" : "point")),
    radius: Math.max(0, Number.isFinite(Number(merged.radius)) ? Number(merged.radius) : Number(preset.radius) || 10),
    width: Math.max(1, Number(merged.width) || Number(merged.w) || 0),
    height: Math.max(1, Number(merged.height) || Number(merged.h) || 0),
    intensity: Number.isFinite(intensity) ? Math.max(0, intensity) : Number.isFinite(density) ? Math.max(0, density / 0.35) : 1,
    density: Number.isFinite(density) ? Math.max(0, density) : undefined,
    chance: Number.isFinite(Number(merged.chance)) ? Math.max(0, Math.min(1, Number(merged.chance))) : 1,
    enabled: merged.enabled !== false,
    onlyWhenOnScreen: merged.onlyWhenOnScreen !== false,
    fadeIn: Math.max(0, Number(merged.fadeIn ?? preset.fadeIn ?? 0.12) || 0),
    fadeOut: Math.max(0, Number(merged.fadeOut ?? preset.fadeOut ?? 0.35) || 0),
    blendMode: merged.blendMode ?? "source-over",
    glow: Boolean(merged.glow),
    worldSpace: merged.worldSpace ?? !["screen", "weatherOverlay", "screenOverlay"].includes(layer),
    texture: typeof merged.texture === "string" ? merged.texture : null,
    textures: Array.isArray(merged.textures) ? merged.textures.filter((entry) => typeof entry === "string") : null,
    spritesheet: merged.spritesheet && typeof merged.spritesheet === "object" ? { ...merged.spritesheet } : null,
    offsetX: Number(merged.offsetX) || 0,
    offsetY: Number(merged.offsetY ?? merged.heightOffset) || 0,
    gravity: Number(merged.gravity) || 0,
    wind: Number(merged.wind) || 0,
  };
}

function normalizeArea(area) {
  const raw = String(area ?? "point");
  if (raw === "anchor" || raw === "wholeMap") return "map";
  if (["point", "circle", "rect", "screen", "map"].includes(raw)) return raw;
  return "point";
}

export function normalizeParticleConfigs(raw) {
  return toParticleArray(raw).map((entry) => normalizeParticleConfig(entry)).filter(Boolean);
}

export function rollParticleConfigs(raw, rand = Math.random) {
  return normalizeParticleConfigs(raw).filter((config) => rand() <= config.chance);
}
