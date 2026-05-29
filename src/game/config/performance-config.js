export const PERFORMANCE_PROFILES = {
  quality: {
    id: "quality",
    targetFps: 60,
    maxDpr: 1.5,
    fogRenderScale: 0.5,
    particleQuality: "high",
    maxParticles: 900,
    disableAmbientCritters: false,
  },
  balanced: {
    id: "balanced",
    targetFps: 50,
    maxDpr: 1.25,
    fogRenderScale: 0.45,
    particleQuality: "medium",
    maxParticles: 650,
    disableAmbientCritters: false,
  },
  cool: {
    id: "cool",
    targetFps: 40,
    maxDpr: 1,
    fogRenderScale: 0.4,
    particleQuality: "low",
    maxParticles: 420,
    disableAmbientCritters: false,
  },
};

export const AMBIENT_CRITTER_DEFAULTS = {
  enabled: true,
  maxAlivePerRegion: 20,
  maxPerType: 10,
  collision: false,
  hostile: false,
  canBeTargeted: false,
  givesXp: false,
  dropsLoot: false,
  persist: false,
  offscreenUpdate: false,
  offscreenRender: false,
};

export function resolvePerformanceProfile(mode = "balanced") {
  const key = String(mode ?? "balanced").trim().toLowerCase();
  return PERFORMANCE_PROFILES[key] ?? PERFORMANCE_PROFILES.balanced;
}
