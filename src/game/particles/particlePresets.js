const tiny = (value) => [value, value];

export const PARTICLE_LAYERS = [
  "backgroundParticles",
  "aboveGround",
  "belowUnits",
  "aboveObjects",
  "aboveUnits",
  "effects",
  "weatherOverlay",
  "screenOverlay",
];

export const LEGACY_LAYER_MAP = {
  screen: "weatherOverlay",
  world: "aboveGround",
  belowEntities: "belowUnits",
  aboveEntities: "aboveUnits",
  anchor: "aboveObjects",
};

export const PARTICLE_PRESETS = {
  flies: { maxParticles: 24, spawnRate: 5, lifetime: [1.5, 4], speed: [10, 32], size: [1, 2], endSize: [1, 2], alpha: [0.45, 0.9], colors: ["#15110d"], movement: "buzz", radius: 22, layer: "aboveObjects", visual: "dot" },
  dust_motes: { maxParticles: 36, spawnRate: 6, lifetime: [2, 5], speed: [4, 16], size: [2, 5], endSize: [3, 7], alpha: [0.08, 0.28], colors: ["#d1b98b"], movement: "drift", radius: 28, layer: "aboveGround", visual: "softCircle" },
  falling_leaves: { maxParticles: 36, spawnRate: 3, lifetime: [2, 6], speed: [30, 100], size: [2, 5], endSize: [2, 5], alpha: [0.35, 0.8], colors: ["#8a5a24", "#b6762d"], movement: "fall", wind: -18, layer: "weatherOverlay" },
  fireflies: { maxParticles: 24, spawnRate: 2, lifetime: [2, 6], speed: [5, 18], size: [2, 4], endSize: [2, 5], alpha: [0.25, 0.75], colors: ["#d8ff9a"], movement: "orbit", glow: true, radius: 48, layer: "aboveObjects", visual: "softDot" },
  pollen: { maxParticles: 34, spawnRate: 5, lifetime: [2, 5], speed: [6, 18], size: [1.5, 3.5], alpha: [0.15, 0.45], colors: ["#f2df91"], movement: "drift", radius: 32, layer: "aboveGround", visual: "softDot" },
  ground_fog: { maxParticles: 26, spawnRate: 2, lifetime: [4, 10], speed: [2, 8], size: [20, 52], endSize: [38, 80], alpha: [0.03, 0.13], colors: ["#9bb6aa"], movement: "staticFade", radius: 78, layer: "aboveGround", visual: "softCircle" },

  green_miasma: { maxParticles: 30, spawnRate: 4, lifetime: [2.2, 6], speed: [4, 14], size: [8, 22], endSize: [18, 40], alpha: [0.08, 0.28], colors: ["#80d45f", "#b7e86a"], movement: "riseWobble", glow: true, radius: 28, layer: "aboveGround", visual: "softCircle" },
  black_smoke: { maxParticles: 30, spawnRate: 4, lifetime: [2, 5], speed: [5, 16], size: [9, 22], endSize: [24, 56], alpha: [0.08, 0.24], colors: ["#222222", "#4a4540"], movement: "riseWobble", radius: 18, layer: "effects", visual: "softCircle" },
  ash_fall: { maxParticles: 160, spawnRate: 34, lifetime: [3, 8], speed: [20, 80], size: [2, 5], alpha: [0.15, 0.45], colors: ["#6f6f6f"], movement: "fall", wind: -12, layer: "weatherOverlay", visual: "softDot" },
  corruption_spores: { maxParticles: 28, spawnRate: 5, lifetime: [2, 5], speed: [5, 18], size: [2, 5], alpha: [0.2, 0.6], colors: ["#b7e86a", "#6ef08a"], movement: "riseWobble", glow: true, radius: 24, layer: "aboveObjects", visual: "softDot" },
  dark_orbs: { maxParticles: 18, spawnRate: 2, lifetime: [1.6, 4], speed: [8, 20], size: [3, 8], alpha: [0.2, 0.65], colors: ["#4b2c70", "#111018"], movement: "orbit", glow: true, radius: 30, layer: "effects", visual: "softDot" },

  smoke: { maxParticles: 30, spawnRate: 4, lifetime: [2, 5], speed: [5, 18], size: [10, 26], endSize: [28, 64], alpha: [0.06, 0.25], colors: ["#777777"], texture: "/assets/generated/particles/smoke_puff.png", movement: "riseWobble", fadeIn: 0.3, fadeOut: 1.2, radius: 16, layer: "aboveObjects", visual: "softCircle" },
  chimney_smoke: { maxParticles: 18, spawnRate: 2.5, lifetime: [1.8, 4.2], speed: [2, 7], size: [8, 18], endSize: [20, 44], alpha: [0.045, 0.16], colors: ["#777777"], texture: "/assets/generated/particles/chimney_smoke.png", movement: "riseWobble", layer: "aboveObjects", radius: 5, visual: "softCircle", velocityScale: 0.012 },
  lantern_glow: { maxParticles: 8, spawnRate: 1.6, lifetime: [1.1, 2.2], speed: [0, 2], size: [8, 15], endSize: [14, 24], alpha: [0.07, 0.18], endAlpha: [0, 0.035], colors: ["#ffd977", "#ffb24a"], movement: "staticFade", glow: true, blendMode: "lighter", radius: 2.5, layer: "effects", visual: "softCircle", velocityScale: 0.008 },
  window_glow: { maxParticles: 8, spawnRate: 1.4, lifetime: [1.8, 3.4], speed: [0, 2], size: [18, 32], endSize: [30, 48], alpha: [0.04, 0.13], endAlpha: [0, 0.025], colors: ["#ffd68a", "#ffb85f"], movement: "staticFade", glow: true, blendMode: "lighter", radius: 8, layer: "effects", visual: "softCircle" },
  fireplace_glow: { maxParticles: 12, spawnRate: 3.2, lifetime: [0.45, 1], speed: [1, 5], size: [6, 13], endSize: [10, 20], alpha: [0.1, 0.26], endAlpha: [0, 0.035], colors: ["#ffcf5c", "#ff7b38", "#d94b2f"], movement: "riseWobble", glow: true, blendMode: "lighter", radius: 3, layer: "effects", visual: "softCircle", velocityScale: 0.01 },
  fireplace_smoke: { maxParticles: 12, spawnRate: 1.4, lifetime: [1.4, 3.2], speed: [1.5, 5], size: [6, 14], endSize: [16, 34], alpha: [0.025, 0.09], colors: ["#777777", "#5f5b55"], texture: "/assets/generated/particles/smoke_puff.png", movement: "riseWobble", fadeIn: 0.25, fadeOut: 1, radius: 4, layer: "aboveObjects", visual: "softCircle", velocityScale: 0.012 },
  embers: { maxParticles: 26, spawnRate: 5, lifetime: [0.8, 2], speed: [12, 42], size: [2, 6], endSize: [1, 3], alpha: [0.4, 1], colors: ["#ff9b3d", "#ffd85d"], textures: ["/assets/particles/ember_01.png", "/assets/particles/ember_02.png", "/assets/particles/ember_03.png"], movement: "riseWobble", glow: true, radius: 12, layer: "effects" },
  forge_sparks: { maxParticles: 36, spawnRate: 10, lifetime: [0.35, 1.1], speed: [55, 130], size: [1, 3], alpha: [0.55, 1], colors: ["#ffd85d", "#ff7b38"], movement: "spark", glow: true, radius: 14, layer: "effects" },
  torch_flame: { maxParticles: 24, spawnRate: 8, lifetime: [0.35, 0.9], speed: [10, 32], size: [3, 10], endSize: [2, 5], alpha: [0.35, 0.85], colors: ["#ffcf5c", "#ff7b38"], movement: "rise", glow: true, radius: 8, layer: "effects" },
  campfire_embers: { maxParticles: 34, spawnRate: 8, lifetime: [0.8, 2.2], speed: [12, 48], size: [2, 7], alpha: [0.4, 1], colors: ["#ff9b3d", "#ffd85d"], movement: "riseWobble", glow: true, radius: 18, layer: "effects" },
  well_mist: { maxParticles: 18, spawnRate: 2, lifetime: [2.5, 6], speed: [2, 8], size: [10, 26], endSize: [24, 48], alpha: [0.04, 0.15], colors: ["#b5ced8"], movement: "riseWobble", radius: 18, layer: "aboveObjects", visual: "softCircle" },

  rain: { maxParticles: 320, spawnRate: 90, lifetime: [0.4, 0.9], speed: [500, 800], size: [8, 16], alpha: [0.25, 0.55], colors: ["#9db9cc"], movement: "fall", layer: "weatherOverlay", area: "screen", visual: "line", wind: -120 },
  snow: { maxParticles: 220, spawnRate: 34, lifetime: [3, 8], speed: [40, 120], size: [2, 5], alpha: [0.35, 0.8], colors: ["#ffffff"], movement: "drift", layer: "weatherOverlay", area: "screen", visual: "softDot", wind: -20 },
  fog: { maxParticles: 44, spawnRate: 4, lifetime: [5, 12], speed: [8, 22], size: [42, 110], endSize: [90, 180], alpha: [0.03, 0.14], colors: ["#9bb6aa"], movement: "drift", layer: "weatherOverlay", area: "screen", visual: "softCircle" },
  storm_rain: { maxParticles: 380, spawnRate: 120, lifetime: [0.35, 0.8], speed: [650, 980], size: [12, 22], alpha: [0.28, 0.62], colors: ["#9db9cc"], movement: "fall", layer: "weatherOverlay", area: "screen", visual: "line", wind: -230 },
  lightning_flash: { maxParticles: 1, spawnRate: 0, lifetime: [0.08, 0.18], size: [1, 1], alpha: [0.35, 0.75], colors: ["#dbe9ff"], movement: "screenFlash", layer: "screenOverlay", area: "screen", burst: true, oneShotCount: 1 },
  wind_leaves: { maxParticles: 90, spawnRate: 14, lifetime: [2, 5], speed: [90, 180], size: [2, 6], alpha: [0.35, 0.8], colors: ["#8a5a24", "#b6762d"], movement: "fall", layer: "weatherOverlay", area: "screen", wind: -180 },
  ash_weather: { maxParticles: 180, spawnRate: 30, lifetime: [3, 8], speed: [20, 80], size: [2, 5], alpha: [0.15, 0.45], colors: ["#6f6f6f"], movement: "drift", layer: "weatherOverlay", area: "screen", visual: "softDot" },

  fire_blast: texturedBurst("/assets/generated/particles/fire_blast.png", "#ff7b38", [54, 86], [0.55, 0.95], [0.22, 0.42]),
  impact_flash: texturedBurst("/assets/generated/particles/impact_flash.png", "#ffd85d", [46, 74], [0.45, 0.9], [0.14, 0.26]),
  smokey_explosion: texturedBurst("/assets/generated/particles/smokey_explosion.png", "#ff9b3d", [96, 150], [0.55, 0.95], [0.45, 0.9]),
  hero_healing_beam: texturedBurst("/assets/generated/particles/healing_beam.png", "#8fffc0", [28, 38], [0.26, 0.42], [0.42, 0.62]),
  object_break_cold_mist: texturedBurst("/assets/generated/particles/cold_mist.png", "#cbd8d8", [44, 72], [0.045, 0.12], [0.42, 0.85]),
  cast_fire: magic("#ff7b38", "burst", "effects", 18), cast_ice: magic("#8bdfff", "burst", "effects", 18), cast_poison: magic("#87d65a", "burst", "effects", 18), cast_shadow: magic("#6b4aa8", "burst", "effects", 18), cast_arcane: magic("#b8a4ff", "burst", "effects", 18), cast_heal: magic("#8fffc0", "burst", "effects", 18),
  trail_fire: trail("#ff7b38"), trail_ice: trail("#8bdfff"), trail_poison: trail("#87d65a"), trail_shadow: trail("#6b4aa8"), trail_arcane: trail("#b8a4ff"), trail_heal: trail("#8fffc0"),
  impact_fire: impact("#ff7b38", 30), impact_ice: impact("#8bdfff", 26), impact_poison: impact("#87d65a", 26), impact_shadow: impact("#6b4aa8", 28), impact_arcane: impact("#b8a4ff", 30), impact_heal: impact("#8fffc0", 24), hit_sparks: { ...impact("#f1d08d", 18), movement: "spark" },
  poison_cloud_lingering: lingering("#87d65a"), burning_ground: lingering("#ff7b38"), frost_ground: lingering("#8bdfff"), corruption_pool: lingering("#5b2c68"), healing_mist: lingering("#8fffc0"), storm_zone: lingering("#9db9cc"),
  status_burning: status("#ff7b38"), status_poisoned: status("#87d65a"), status_frozen: status("#8bdfff"), status_blessed: status("#8fffc0"), status_cursed: status("#6b4aa8"), status_stunned: status("#ffd85d"),

  spores: null, fogWisps: null, ash: null, leaves: null, dust: null,
};

PARTICLE_PRESETS.spores = PARTICLE_PRESETS.corruption_spores;
PARTICLE_PRESETS.fogWisps = PARTICLE_PRESETS.ground_fog;
PARTICLE_PRESETS.ash = PARTICLE_PRESETS.ash_weather;
PARTICLE_PRESETS.leaves = PARTICLE_PRESETS.falling_leaves;
PARTICLE_PRESETS.dust = PARTICLE_PRESETS.dust_motes;

function magic(color, movement, layer, count) {
  return { maxParticles: count, spawnRate: 0, lifetime: [0.35, 0.9], speed: [35, 90], size: [3, 10], endSize: tiny(1), alpha: [0.4, 1], colors: [color], movement, glow: true, blendMode: "lighter", layer, radius: 18, burst: true, oneShotCount: count };
}

function trail(color) {
  return { maxParticles: 42, spawnRate: 30, lifetime: [0.25, 0.65], speed: [4, 16], size: [2, 6], endSize: tiny(1), alpha: [0.3, 0.85], colors: [color], movement: "projectileTrail", glow: true, blendMode: "lighter", layer: "effects", radius: 6 };
}

function impact(color, count) {
  return { maxParticles: count, spawnRate: 0, lifetime: [0.3, 0.85], speed: [55, 150], size: [3, 10], endSize: tiny(1), alpha: [0.45, 1], colors: [color], movement: "burst", glow: true, blendMode: "lighter", layer: "effects", radius: 20, burst: true, oneShotCount: count };
}

function lingering(color) {
  return { maxParticles: 54, spawnRate: 8, lifetime: [1.6, 4.5], speed: [4, 18], size: [10, 28], endSize: [24, 54], alpha: [0.06, 0.24], colors: [color], movement: "staticFade", glow: true, layer: "belowUnits", radius: 42, visual: "softCircle" };
}

function status(color) {
  return { maxParticles: 22, spawnRate: 8, lifetime: [0.5, 1.4], speed: [8, 28], size: [2, 7], endSize: [1, 4], alpha: [0.25, 0.75], colors: [color], movement: "orbit", glow: true, layer: "aboveUnits", radius: 18 };
}

function texturedBurst(texture, color, size, alpha, lifetime) {
  return {
    maxParticles: 1,
    spawnRate: 0,
    lifetime,
    speed: [0, 0],
    size,
    endSize: [size[1] * 1.08, size[1] * 1.28],
    alpha,
    endAlpha: [0, 0],
    colors: [color],
    texture,
    movement: "staticFade",
    fadeIn: 0.02,
    fadeOut: lifetime[1],
    glow: true,
    blendMode: "lighter",
    layer: "effects",
    radius: 0,
    rotation: false,
    burst: true,
    oneShotCount: 1,
  };
}
