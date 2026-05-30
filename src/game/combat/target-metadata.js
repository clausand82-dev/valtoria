import { FACTIONS } from "../config/faction-config.js";
import { normalizeTags } from "../config/tag-config.js";

const warnedFactionIds = new Set();

function devWarnUnknownFaction(factionId) {
  const id = String(factionId ?? "").trim();
  if (!id || FACTIONS[id] || warnedFactionIds.has(id)) return;
  warnedFactionIds.add(id);
  console.warn(`[target-metadata] Unknown factionId '${id}'. Factions are central config and should be added to faction-config.js.`);
}

function hasTag(target, tag) {
  return normalizeTags(target?.tags).includes(String(tag ?? "").trim());
}

export function targetMetadata(target, targetType = null) {
  const inferredType = targetType
    ?? (target?.runtimeType === "critter" || target?.type === "critter" ? "critter" : null)
    ?? (target?.npcId ? "npc" : null)
    ?? (target?.destructible !== undefined || target?.objectDefId ? "object" : null)
    ?? "monster";
  const factionId = target?.factionId ? String(target.factionId) : undefined;
  if (factionId) devWarnUnknownFaction(factionId);
  return {
    targetType: inferredType,
    id: target?.typeName ?? target?.objectDefId ?? target?.type ?? target?.npcId ?? target?.id ?? null,
    factionId,
    speciesId: target?.speciesId ? String(target.speciesId) : undefined,
    tags: normalizeTags(target?.tags),
  };
}

export function playerTargetMetadata(player) {
  return {
    targetType: "player",
    id: player?.id ?? "player",
    factionId: player?.factionId ? String(player.factionId) : undefined,
    speciesId: player?.speciesId ? String(player.speciesId) : undefined,
    tags: normalizeTags(player?.tags),
  };
}

function targetRuleMatches(rule, meta, target) {
  const value = String(rule ?? "").trim();
  if (!value) return false;
  if (value === meta.targetType) return true;
  if (value === "type:any") return true;
  if (value.startsWith("type:")) return meta.targetType === value.slice(5);
  if (value.startsWith("species:")) return meta.speciesId === value.slice(8);
  if (value.startsWith("faction:")) return meta.factionId === value.slice(8);
  if (value.startsWith("tag:")) return hasTag(meta, value.slice(4));
  if (value === "object:any") return meta.targetType === "object" && target?.destructible !== false;
  if (value.startsWith("object:")) {
    return meta.targetType === "object" && target?.destructible !== false && hasTag(meta, value.slice(7));
  }
  return false;
}

export function canDamageTargetWithSource(sourceConfig, sourceKind = "weapon", target) {
  const meta = target?.targetType ? target : targetMetadata(target);
  if (meta.targetType === "object" && target?.destructible === false) return false;
  const rules = Array.isArray(sourceConfig?.target) ? sourceConfig.target : null;
  if (!rules) {
    if (sourceKind === "spell") return meta.targetType === "monster" || meta.targetType === "critter" || meta.targetType === "player";
    if (sourceKind === "weaponEffect") return meta.targetType === "monster" || meta.targetType === "critter";
    return meta.targetType === "monster" || meta.targetType === "critter" || meta.targetType === "object";
  }
  if (meta.targetType === "object" && target?.destructible === false) return false;
  return rules.some((rule) => targetRuleMatches(rule, meta, target));
}

function bonusMatches(selector, meta) {
  const value = String(selector ?? "").trim();
  if (!value) return false;
  if (value.startsWith("type:")) return meta.targetType === value.slice(5);
  if (value.startsWith("species:")) return meta.speciesId === value.slice(8);
  if (value.startsWith("tag:")) return hasTag(meta, value.slice(4));
  if (value.startsWith("faction:")) return meta.factionId === value.slice(8);
  return false;
}

function parseBonusAmount(amount) {
  if (typeof amount === "number") return { flat: amount, multiplier: 1 };
  const raw = String(amount ?? "").trim();
  if (raw.endsWith("%")) {
    const pct = Number(raw.slice(0, -1));
    if (Number.isFinite(pct)) return { flat: 0, multiplier: 1 + pct / 100 };
  }
  const flat = Number(amount);
  return Number.isFinite(flat) ? { flat, multiplier: 1 } : { flat: 0, multiplier: 1 };
}

export function targetDamageBonus(sourceConfig, target) {
  const meta = target?.targetType ? target : targetMetadata(target);
  const entries = Array.isArray(sourceConfig?.bonus) ? sourceConfig.bonus : [];
  let flat = 0;
  let multiplier = 1;
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    if (!bonusMatches(entry[0], meta)) continue;
    const parsed = parseBonusAmount(entry[1]);
    flat += parsed.flat;
    multiplier *= parsed.multiplier;
  }
  return { flat, multiplier };
}
