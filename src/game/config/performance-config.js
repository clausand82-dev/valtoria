export const PERFORMANCE_PROFILES = {
  quality: {
    id: "quality",
    targetFps: 60,
    maxDpr: 1.5,
    fogRenderScale: 0.5,
    particleQuality: "high",
    maxParticles: 900,
  },
  balanced: {
    id: "balanced",
    targetFps: 50,
    maxDpr: 1.25,
    fogRenderScale: 0.45,
    particleQuality: "medium",
    maxParticles: 650,
  },
  cool: {
    id: "cool",
    targetFps: 40,
    maxDpr: 1,
    fogRenderScale: 0.4,
    particleQuality: "low",
    maxParticles: 420,
  },
};

export function resolvePerformanceProfile(mode = "balanced") {
  const key = String(mode ?? "balanced").trim().toLowerCase();
  return PERFORMANCE_PROFILES[key] ?? PERFORMANCE_PROFILES.balanced;
}
