const VALID_ROTATIONS = new Set([0, 90, 180, 270]);

export function normalizePrefabRotation(rotation) {
  const normalized = ((Math.round(Number(rotation) || 0) % 360) + 360) % 360;
  return VALID_ROTATIONS.has(normalized) ? normalized : 0;
}

export function transformedPrefabSize(prefab, rotation = 0) {
  const w = Math.floor(Number(prefab?.w)) || 1;
  const h = Math.floor(Number(prefab?.h)) || 1;
  const normalizedRotation = normalizePrefabRotation(rotation);
  return normalizedRotation === 90 || normalizedRotation === 270 ? { w: h, h: w } : { w, h };
}

export function transformPrefabPoint(x, y, w, h, rotation = 0, mirrored = false) {
  const width = Math.floor(Number(w)) || 1;
  const height = Math.floor(Number(h)) || 1;
  const normalizedRotation = normalizePrefabRotation(rotation);
  const px = mirrored ? width - 1 - x : x;
  const py = y;
  if (normalizedRotation === 90) return { x: height - 1 - py, y: px };
  if (normalizedRotation === 180) return { x: width - 1 - px, y: height - 1 - py };
  if (normalizedRotation === 270) return { x: py, y: width - 1 - px };
  return { x: px, y: py };
}

export function transformPrefabEntries(entries, prefab, rotation = 0, mirrored = false) {
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const point = transformPrefabPoint(
      Number(entry?.x) || 0,
      Number(entry?.y) || 0,
      prefab?.w,
      prefab?.h,
      rotation,
      mirrored,
    );
    return { ...entry, x: point.x, y: point.y };
  });
}
