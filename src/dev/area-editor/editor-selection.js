import { PREFAB_CONTENT_LAYERS } from "../../game/world/prefabs/prefab-normalization.js";

export function entitiesAtCell(document, x, y, visibility = {}) {
  return PREFAB_CONTENT_LAYERS.flatMap((layer) => visibility[layer] === false ? [] : (document[layer] ?? [])
    .map((entry, index) => ({ layer, index, entry }))
    .filter(({ entry }) => Number(entry.x) === x && Number(entry.y) === y));
}

export function cycleCellSelection(candidates, current) {
  if (!candidates.length) return null;
  const currentIndex = candidates.findIndex((candidate) => candidate.layer === current?.layer && candidate.index === current?.index);
  if (currentIndex < 0) return candidates[candidates.length - 1];
  return candidates[(currentIndex + 1) % candidates.length];
}
