// Shadow presets are not used right now. Keep this commented out until we
// decide whether shadows should use named presets or direct config values.
// export const SHADOW_PRESETS = {
//   defaultUnitShadow: {
//     type: "softOval",
//     width: 42,
//     height: 16,
//     opacity: 0.25,
//     blur: 2,
//     offsetX: 0,
//     offsetY: 18,
//     skewX: 0,
//   },
//   smallCreatureShadow: {
//     type: "softOval",
//     width: 28,
//     height: 10,
//     opacity: 0.2,
//     blur: 2,
//     offsetX: 0,
//     offsetY: 12,
//     skewX: 0,
//   },
//   largeMonsterShadow: {
//     type: "softOval",
//     width: 64,
//     height: 22,
//     opacity: 0.3,
//     blur: 3,
//     offsetX: 0,
//     offsetY: 24,
//     skewX: 0,
//   },
//   flyingShadow: {
//     type: "softOval",
//     width: 36,
//     height: 10,
//     opacity: 0.14,
//     blur: 4,
//     offsetX: 0,
//     offsetY: 34,
//     skewX: 0,
//   },
// };

export function normalizeShadowConfig(raw, fallback = {}) {
  if (raw === false || raw?.type === "none") return { type: "none" };
  const input = {
    ...fallback,
    ...((raw && typeof raw === "object") ? raw : {}),
  };
  return {
    type: input.type ?? "softOval",
    width: positiveNumber(input.width, fallback.width ?? 42),
    height: positiveNumber(input.height, fallback.height ?? 16),
    opacity: clamp(Number(input.opacity ?? input.alpha ?? fallback.opacity ?? 0.25), 0, 1),
    blur: Math.max(0, Number(input.blur ?? fallback.blur ?? 2) || 0),
    offsetX: Number(input.offsetX ?? fallback.offsetX ?? 0) || 0,
    offsetY: Number(input.offsetY ?? fallback.offsetY ?? 0) || 0,
    skewX: Number(input.skewX ?? fallback.skewX ?? 0) || 0,
  };
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
