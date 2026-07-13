import { normalizePrefabGround } from "./prefab-ground-overrides.js";

export const PREFAB_CONTENT_LAYERS = Object.freeze([
  "objects",
  "foliage",
  "decals",
  "monsters",
  "npcs",
  "chests",
]);

const LEGEND_SELECTOR_FIELDS = new Set(["type", "object", "foliage", "decal", "monster", "npc", "npcId", "chest", "x", "y"]);

function legendInstanceFields(entry) {
  return Object.fromEntries(Object.entries(entry ?? {}).filter(([key]) => !LEGEND_SELECTOR_FIELDS.has(key)));
}

export function prefabContentFromLegend(prefab) {
  const result = Object.fromEntries(PREFAB_CONTENT_LAYERS.map((layer) => [layer, []]));
  const tiles = Array.isArray(prefab?.tiles) ? prefab.tiles : [];
  const legend = prefab?.legend && typeof prefab.legend === "object" && !Array.isArray(prefab.legend) ? prefab.legend : null;
  if (!tiles.length || !legend) return result;

  for (let y = 0; y < tiles.length; y += 1) {
    const row = String(tiles[y] ?? "");
    for (let x = 0; x < row.length; x += 1) {
      const entry = legend[row[x]];
      if (!entry || entry.type === "keep") continue;
      addLegendEntry(result, entry, x, y);
    }
  }
  return result;
}

function addLegendEntry(result, entry, x, y) {
  const base = { x, y };
  const extra = legendInstanceFields(entry);
  if (entry.object) result.objects.push({
    ...base,
    id: entry.object,
    blocking: entry.blocking,
    destructible: entry.destructible,
    size: entry.size,
    radius: entry.radius,
    rotation: entry.rotation,
    visualScale: entry.visualScale,
    variant: entry.variant,
    variantCount: entry.variantCount,
    spawnDamage: entry.spawnDamage ?? entry.damageState ?? entry.damageSpawn,
    spawnTags: entry.spawnTags,
    avoidSpawnTags: entry.avoidSpawnTags,
    spawnAvoidRadius: entry.spawnAvoidRadius,
    foregroundFade: entry.foregroundFade,
    foregroundFadeAlpha: entry.foregroundFadeAlpha,
    actionId: entry.actionId,
    actions: entry.actions,
    questTargetKey: entry.questTargetKey,
    ...extra,
  });
  if (entry.foliage) {
    const foliage = typeof entry.foliage === "object" && entry.foliage !== null ? entry.foliage : { id: entry.foliage };
    result.foliage.push({ ...base, ...foliage, id: foliage.id, variant: entry.variant ?? foliage.variant, cell: entry.cell ?? foliage.cell, size: entry.size ?? foliage.size, scale: entry.scale ?? foliage.scale, rotation: entry.rotation ?? foliage.rotation, visualScale: entry.visualScale ?? foliage.visualScale, ...extra });
  }
  if (entry.decal) result.decals.push({ ...base, type: entry.decal, decayId: entry.decayId, variant: entry.variant, cell: entry.cell, size: entry.size, rotation: entry.rotation, alpha: entry.alpha, renderScale: entry.renderScale, particles: entry.particles, ...extra });
  if (entry.monster) result.monsters.push({ ...base, type: entry.monster, levelOffset: entry.levelOffset, ...extra });
  if (entry.chest) result.chests.push({ ...base, id: entry.chest, blocking: entry.blocking, ...extra });
  if (entry.npc || entry.npcId) {
    const value = entry.npc ?? entry.npcId;
    const npc = typeof value === "object" && value !== null ? value : { npcId: value };
    result.npcs.push({ ...base, ...npc, npcId: npc.npcId ?? npc.id, facing: entry.facing ?? npc.facing, actionId: entry.actionId ?? npc.actionId, actions: entry.actions ?? npc.actions, conditions: entry.conditions ?? npc.conditions, ...extra });
  }
}

export function normalizePrefabContent(prefab) {
  const fromLegend = prefabContentFromLegend(prefab);
  return Object.fromEntries(PREFAB_CONTENT_LAYERS.map((layer) => [
    layer,
    [...fromLegend[layer], ...(Array.isArray(prefab?.[layer]) ? prefab[layer] : [])],
  ]));
}

export function resolvePrefabMetadata(prefab) {
  return {
    schemaVersion: prefab?.schemaVersion ?? null,
    editor: prefab?.editor && typeof prefab.editor === "object" && !Array.isArray(prefab.editor)
      ? { ...prefab.editor }
      : null,
  };
}

export function normalizePrefabDocument(prefab) {
  const content = normalizePrefabContent(prefab);
  return {
    ...prefab,
    ...resolvePrefabMetadata(prefab),
    ...content,
    ground: normalizePrefabGround(prefab?.ground),
  };
}

export function resolvePrefabMonsterLevel(proceduralLevel, monsterEntry = {}) {
  const baseLevel = Math.max(1, Math.round(Number(proceduralLevel) || 1));
  const levelOffset = Number.isFinite(Number(monsterEntry.levelOffset))
    ? Math.round(Number(monsterEntry.levelOffset))
    : 0;
  return Math.max(1, baseLevel + levelOffset);
}
