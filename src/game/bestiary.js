import { MONSTER_DEFS, MONSTER_SHEETS, MONSTER_STATS, monsterSpriteId } from "./config/monster-config.js";
import { getMonsterDiscovery } from "./world-state.js";
import { FACTIONS } from "./config/faction-config.js";
import { speciesLabel } from "./config/species-config.js";
import { tagLabel } from "./config/tag-config.js";

const STAT_LABELS = {
  hp: "HP",
  damage: "Damage",
  speed: "Speed",
  range: "Range",
  radius: "Radius",
  xp: "XP",
  magic: "Magic",
  blockChance: "Block",
  dodgeChance: "Dodge",
  critChance: "Crit",
  fireResist: "Fire resist",
  iceResist: "Ice resist",
  poisonResist: "Poison resist",
  physicalResist: "Physical resist",
  arcaneResist: "Arcane resist",
  shadowResist: "Shadow resist",
  natureResist: "Nature resist",
};

export function monsterLibraryTitle(monsterId, def = MONSTER_DEFS[monsterId]) {
  return String(def?.library?.title ?? def?.displayName ?? def?.name ?? monsterId ?? "Ukendt vaesen");
}

export function monsterDiscoveryStage(entry = {}) {
  if (entry.killed) return "killed";
  if (entry.fought) return "fought";
  if (entry.seen) return "seen";
  return "unknown";
}

export function getBestiaryEntries(worldState) {
  const discovery = getMonsterDiscovery(worldState);
  return Object.entries(MONSTER_DEFS)
    .map(([monsterId, def]) => {
      const entry = discovery[monsterId] ?? {};
      const stage = monsterDiscoveryStage(entry);
      return {
        id: monsterId,
        def,
        stats: MONSTER_STATS[monsterId] ?? def.stats ?? {},
        discovery: entry,
        stage,
        title: stage === "unknown" ? "Ukendt vaesen" : monsterLibraryTitle(monsterId, def),
        sortTitle: monsterLibraryTitle(monsterId, def).toLocaleLowerCase("da-DK"),
      };
    })
    .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle, "da-DK"));
}

export function bestiarySpriteSheet(monsterId) {
  const spriteId = monsterSpriteId(monsterId);
  return MONSTER_SHEETS.find((sheet) => sheet.id === spriteId) ?? null;
}

export function bestiaryStatRows(stats = {}) {
  return Object.entries(STAT_LABELS)
    .filter(([key]) => stats[key] !== undefined && stats[key] !== null && Number.isFinite(Number(stats[key])))
    .map(([key, label]) => ({
      key,
      label,
      value: key.endsWith("Chance") || key.endsWith("Resist")
        ? `${Math.round(Number(stats[key]) * (Math.abs(Number(stats[key])) <= 1 ? 100 : 1))}%`
        : Number(stats[key]).toLocaleString("da-DK", { maximumFractionDigits: 2 }),
    }));
}

export function bestiaryRegionRows(entry = {}) {
  const seenRegions = entry.seenRegions && typeof entry.seenRegions === "object" ? entry.seenRegions : {};
  return Object.entries(seenRegions)
    .map(([regionId, count]) => ({ regionId, count: Math.max(0, Math.floor(Number(count) || 0)) }))
    .filter((row) => row.regionId && row.count > 0)
    .sort((a, b) => a.regionId.localeCompare(b.regionId, "da-DK"));
}

export function bestiaryMetadataRows(entry = {}) {
  const { stage, stats = {} } = entry;
  const fought = stage === "fought" || stage === "killed";
  const killed = stage === "killed";
  const rows = [];
  if (fought && stats.speciesId) rows.push({ key: "species", label: "Species", value: speciesLabel(stats.speciesId) });
  if (killed && stats.factionId) rows.push({ key: "faction", label: "Faction", value: FACTIONS[stats.factionId]?.label ?? stats.factionId });
  if (fought && Array.isArray(stats.tags) && stats.tags.length) {
    rows.push({ key: "tags", label: "Tags", value: stats.tags.map(tagLabel).join(", ") });
  }
  return rows;
}
