import { ACTION_CONFIG } from "../../game/config/action-config.js";
import { DECAY_SET_DEFS, normalizeDecayRenderConfig } from "../../game/config/decay-config.js";
import { LOOT_TABLES } from "../../game/config/loot-tables-config.js";
import { MONSTER_DEFS } from "../../game/config/monster-config.js";
import { QUEST_NPCS } from "../../game/config/npc-config.js";
import { QUEST_DEFS } from "../../game/config/quest-config.js";
import { REGION_OBJECT_DEFS, resolveRegionObjectDestructibleDef, resolveRegionObjectVariantCount } from "../../game/config/region-object-config.js";

export const SHARED_CONDITION_FIELDS = Object.freeze([
  "flag", "notFlag", "all", "any", "blockedBy", "questActive", "questCompleted", "questStepActive", "questStepCompleted", "worldBalanceLydra", "worldBalanceNetdra",
]);

const number = (key, label, description, options = {}) => ({ key, label, description, type: "number", ...options });
const text = (key, label, description) => ({ key, label, description, type: "text" });
const check = (key, label, description, options = {}) => ({ key, label, description, type: "checkbox", ...options });
const select = (key, label, description, options, config = {}) => ({ key, label, description, type: "select", options, ...config });
const multi = (key, label, description, options, config = {}) => ({ key, label, description, type: "multiselect", options, ...config });

const optionEntries = (registry, labelFor = (id) => id) => Object.keys(registry ?? {}).sort().map((id) => ({ value: id, label: labelFor(id) }));
const ACTION_OPTIONS = optionEntries(ACTION_CONFIG);
const DECAY_OPTIONS = optionEntries(DECAY_SET_DEFS);
const LOOT_TABLE_OPTIONS = optionEntries(LOOT_TABLES);
const MONSTER_OPTIONS = optionEntries(MONSTER_DEFS);
const NPC_OPTIONS = optionEntries(QUEST_NPCS, (id) => `${id} - ${QUEST_NPCS[id]?.name ?? id}`);
const OBJECT_OPTIONS = optionEntries(REGION_OBJECT_DEFS);
const QUEST_OPTIONS = optionEntries(QUEST_DEFS);
const FACING_OPTIONS = ["north", "east", "south", "west"];
const DEPTH_OPTIONS = ["ground", "dynamic", "alwaysBehind", "alwaysFront"];
const SPAWN_DAMAGE_OPTIONS = ["all", "damaged", "destroyed", "damaged_destroyed"];
const DECAY_PROJECTION_OPTIONS = ["topdown", "iso"];
const DECAY_BLEND_OPTIONS = ["source-over", "multiply", "overlay", "soft-light", "darken", "screen", "lighter"];

export const PREFAB_PROPERTY_SCHEMA = Object.freeze([
  text("id", "ID", "Runtime-id for dokumentet. Skal begynde med et lille bogstav og må kun indeholde små bogstaver, tal og underscore."),
  text("label", "Label", "Det læsbare navn, som vises i editoren og relevante runtime-visninger."),
  number("w", "Width", "Bredden i felter. Formindskelse kan beskære placeret indhold.", { min: 1, step: 1 }),
  number("h", "Height", "Højden i felter. Formindskelse kan beskære placeret indhold.", { min: 1, step: 1 }),
  select("anchor", "Anchor", "Hvor procedural runtime må forsøge at placere prefabben: room, clearing eller ved siden af en path.", ["room", "clearing", "pathSide"]),
  check("rotate", "Allow rotation", "Tillader runtime at rotere prefabben, når den placeres proceduralt.", { defaultValue: false }),
  check("mirror", "Allow mirroring", "Tillader runtime at spejle prefabben, når den placeres proceduralt.", { defaultValue: false }),
  check("clearArea", "Clear area", "Udvider regionens playable mask til hele prefab-området og reserverer området til prefabben.", { defaultValue: true }),
  number("avoidStart", "Avoid start", "Mindste afstand i felter mellem prefabbens centrum og regionens start.", { min: 0, step: 0.5 }),
  number("avoidExit", "Avoid exit", "Mindste afstand i felter mellem prefabbens centrum og regionens exit.", { min: 0, step: 0.5 }),
]);

function objectDef(entry) {
  return REGION_OBJECT_DEFS[entry?.id] ?? null;
}

function objectDestructibleDefault(entry) {
  const def = objectDef(entry);
  const type = def?.spawnTypes?.[0]?.type;
  return def?.defaultDestructible !== false && Boolean(resolveRegionObjectDestructibleDef(type));
}

function objectForegroundFadeDefault(entry) {
  return Boolean(objectDef(entry)?.foregroundFade);
}

function decayDefault(entry, key) {
  const def = DECAY_SET_DEFS[entry?.decayId ?? entry?.id] ?? {};
  return normalizeDecayRenderConfig(def)[key];
}

function rangeOptions(count, start = 0) {
  return Array.from({ length: Math.max(0, Math.floor(Number(count) || 0)) }, (_, index) => index + start);
}

function foliageCatalogOptions(context, field) {
  const values = new Map();
  for (const asset of context.catalog ?? []) {
    if (asset.layer !== "foliage") continue;
    const value = field === "fileName" ? asset.fileName : asset.id;
    if (value) values.set(String(value), String(value));
  }
  return [...values.keys()].sort();
}

function variantCount(layer, context) {
  const entry = context.entry ?? {};
  if (layer === "objects") return resolveRegionObjectVariantCount(objectDef(entry)?.spawnTypes?.[0]?.type);
  if (layer === "decals") {
    const def = DECAY_SET_DEFS[entry.decayId ?? entry.id];
    return Math.max(1, Number(def?.rows) || 4) * Math.max(1, Number(def?.cols) || 4);
  }
  if (layer === "foliage") {
    const asset = (context.catalog ?? []).find((candidate) => candidate.layer === "foliage"
      && (entry.fileName ? candidate.fileName === entry.fileName : candidate.id === entry.id));
    return Math.max(1, Number(asset?.variantCount) || 64);
  }
  return 1;
}

const ENTITY_PROPERTY_SCHEMAS = Object.freeze({
  objects: [
    select("id", "Object ID", "Runtime object-definitionen. Listen kommer direkte fra REGION_OBJECT_DEFS.", OBJECT_OPTIONS),
    number("x", "X", "Vandret feltkoordinat fra 0 til prefab-bredden minus 1.", { min: 0, step: 1, dynamicMax: "x" }),
    number("y", "Y", "Lodret feltkoordinat fra 0 til prefab-højden minus 1.", { min: 0, step: 1, dynamicMax: "y" }),
    select("variant", "Variant", "Fast nulbaseret frame fra objectets spritesheet. Tom bruger runtime-valget.", (context) => rangeOptions(variantCount("objects", context)), { optional: true, valueType: "number" }),
    number("size", "Size", "Runtime collision- og sprite-størrelse. Tom bruger objectets spawn-tuning.", { min: 0.05, step: 0.05 }),
    number("visualScale", "Visual scale", "Ekstra visuel skalering uden at ændre kollisionsradius.", { min: 0.05, step: 0.05 }),
    number("rotation", "Rotation", "Rotation i radianer. 0 er assetets normale retning.", { step: 0.1 }),
    check("blocking", "Blocking", "Når markeret indgår objectets radius i spillerens kollisionskontrol. Runtime-standard er markeret; fjern markeringen for at kunne gå igennem.", { defaultValue: true }),
    check("destructible", "Destructible", "Om objectet kan beskadiges. Standardværdien kommer fra den valgte object-definition.", { defaultValue: (context) => objectDestructibleDefault(context.entry) }),
    select("spawnDamage", "Spawn damage", "Valgfri starttilstand for destructible objects: alle tilstande, damaged, destroyed eller damaged/destroyed.", SPAWN_DAMAGE_OPTIONS, { optional: true }),
    select("actionId", "Action ID", "Handling der tilbydes ved interaction. Listen kommer fra ACTION_CONFIG.", ACTION_OPTIONS, { optional: true }),
    text("questTargetKey", "Quest target", "Fri nøgle der forbinder objectet med et quest action-target. Skal matche quest-konfigurationens nøgle."),
    number("spawnAvoidRadius", "Avoid radius", "Radius omkring dette object hvor objects med matchende avoid-tags fjernes.", { min: 0, step: 0.1 }),
    check("foregroundFade", "Foreground fade", "Gør objectet gennemsigtigt, når det står foran spilleren. Standard kommer fra object-definitionen.", { defaultValue: (context) => objectForegroundFadeDefault(context.entry) }),
    number("foregroundFadeAlpha", "Fade alpha", "Laveste alpha under foreground fade. Runtime accepterer 0.1 til 1.", { min: 0.1, max: 1, step: 0.05 }),
  ],
  foliage: [
    select("id", "Definition ID", "Legacy/runtime foliage-id. File har prioritet, hvis begge felter er sat.", (context) => foliageCatalogOptions(context, "id"), { optional: true }),
    select("fileName", "File", "Direkte foliage-sheet. File-baserede entries kan også have egne loot tables; file har prioritet over Definition ID.", (context) => foliageCatalogOptions(context, "fileName"), { optional: true }),
    number("x", "X", "Vandret feltkoordinat fra 0 til prefab-bredden minus 1.", { min: 0, step: 1, dynamicMax: "x" }),
    number("y", "Y", "Lodret feltkoordinat fra 0 til prefab-højden minus 1.", { min: 0, step: 1, dynamicMax: "y" }),
    select("cell", "Cell", "Valgfri én-baseret spritesheet-celle. Cell har prioritet over Variant for foliage.", (context) => rangeOptions(variantCount("foliage", context), 1), { optional: true, valueType: "number" }),
    select("variant", "Variant", "Valgfri nulbaseret spritesheet-frame. Bruges når Cell er tom.", (context) => rangeOptions(variantCount("foliage", context)), { optional: true, valueType: "number" }),
    number("size", "Size", "Grundstørrelse; runtime-standard er 0.72, når hverken Size eller fast Scale er sat.", { min: 0.05, step: 0.05 }),
    number("scale", "Fixed scale", "Fast runtime-størrelse. Når den er sat, tilsidesætter den Size og Visual scale.", { min: 0.05, step: 0.05 }),
    number("visualScale", "Visual scale", "Ekstra visuel skalering, når Fixed scale ikke er sat.", { min: 0.05, step: 0.05 }),
    number("rotation", "Rotation", "Rotation i radianer.", { step: 0.1 }),
    select("actionId", "Action ID", "Valgfri interaction fra ACTION_CONFIG.", ACTION_OPTIONS, { optional: true }),
    text("questTargetKey", "Quest target", "Fri nøgle der forbinder foliage med et quest action-target."),
    select("depthMode", "Depth mode", "ground tegnes bag dynamiske actors; dynamic dybdesorteres; alwaysBehind/alwaysFront tvinger laget.", DEPTH_OPTIONS, { optional: true }),
    number("depthOffset", "Depth offset", "Finjusterer sorteringsdybden. Positive værdier flytter elementet længere frem.", { step: 1 }),
    multi("lootTables", "Loot tables", "Loot-tabeller der rulles for denne file-baserede foliage-entry. Feltet vises kun, når File er sat.", LOOT_TABLE_OPTIONS, { when: (context) => Boolean(context.entry?.fileName) }),
  ],
  decals: [
    select("decayId", "Decay ID", "Runtime decay-definitionen fra DECAY_SET_DEFS.", DECAY_OPTIONS),
    number("x", "X", "Vandret feltkoordinat fra 0 til prefab-bredden minus 1.", { min: 0, step: 1, dynamicMax: "x" }),
    number("y", "Y", "Lodret feltkoordinat fra 0 til prefab-højden minus 1.", { min: 0, step: 1, dynamicMax: "y" }),
    select("cell", "Cell", "Valgfri én-baseret frame. Variant har prioritet over Cell for decay.", (context) => rangeOptions(variantCount("decals", context), 1), { optional: true, valueType: "number" }),
    select("variant", "Variant", "Valgfri nulbaseret frame. Har prioritet over Cell.", (context) => rangeOptions(variantCount("decals", context)), { optional: true, valueType: "number" }),
    number("size", "Size", "Decalens grundstørrelse; runtime-standard er 0.9.", { min: 0.05, step: 0.05 }),
    number("rotation", "Rotation", "Rotation i radianer. Kan tilsidesættes af random rotation.", { step: 0.1 }),
    number("alpha", "Alpha", "Gennemsigtighed fra 0 til 1. Tom bruger decay-definitionens standard.", { min: 0, max: 1, step: 0.05 }),
    number("renderScale", "Render scale", "Ekstra skalering af decalens projicerede footprint.", { min: 0.05, step: 0.05 }),
    select("projection", "Projection", "topdown transformeres til isometrisk terræn; iso er allerede malet i isometrisk perspektiv.", DECAY_PROJECTION_OPTIONS, { optional: true }),
    select("blendMode", "Blend mode", "Canvas blend/composite-mode. Tom bruger decay-definitionens standard.", DECAY_BLEND_OPTIONS, { optional: true }),
    check("randomRotation", "Random rotation", "Tillader runtime at variere rotationen. Standard er aktiv for topdown og inaktiv for iso.", { defaultValue: (context) => decayDefault(context.entry, "randomRotation") }),
    number("widthScale", "Width scale", "Skalerer decalens bredde efter projektion.", { min: 0.05, step: 0.05 }),
    number("heightScale", "Height scale", "Skalerer decalens højde efter projektion.", { min: 0.05, step: 0.05 }),
    number("offsetX", "Offset X", "Vandret render-offset i runtime-pixels før editor-zoom.", { step: 1 }),
    number("offsetY", "Offset Y", "Lodret render-offset i runtime-pixels før editor-zoom.", { step: 1 }),
    number("anchorX", "Anchor X", "Vandret anker i normaliseret interval 0..1.", { min: 0, max: 1, step: 0.05 }),
    number("anchorY", "Anchor Y", "Lodret anker i normaliseret interval 0..1.", { min: 0, max: 1, step: 0.05 }),
  ],
  monsters: [
    select("type", "Monster type", "Runtime monster-definitionen fra MONSTER_DEFS.", MONSTER_OPTIONS),
    number("x", "X", "Vandret feltkoordinat fra 0 til prefab-bredden minus 1.", { min: 0, step: 1, dynamicMax: "x" }),
    number("y", "Y", "Lodret feltkoordinat fra 0 til prefab-højden minus 1.", { min: 0, step: 1, dynamicMax: "y" }),
    number("levelOffset", "Level offset", "Heltal der lægges til områdets procedurelle monster-level.", { step: 1 }),
  ],
  npcs: [
    select("npcId", "NPC ID", "Runtime NPC-definitionen fra QUEST_NPCS.", NPC_OPTIONS),
    number("x", "X", "Vandret feltkoordinat fra 0 til prefab-bredden minus 1.", { min: 0, step: 1, dynamicMax: "x" }),
    number("y", "Y", "Lodret feltkoordinat fra 0 til prefab-højden minus 1.", { min: 0, step: 1, dynamicMax: "y" }),
    select("facing", "Facing", "NPC'ens startretning.", FACING_OPTIONS, { optional: true }),
    select("actionId", "Action ID", "Valgfri interaction fra ACTION_CONFIG.", ACTION_OPTIONS, { optional: true }),
  ],
  chests: [
    select("id", "Chest ID", "Den nuværende chest-runtime accepterer basic_chest.", ["basic_chest"]),
    number("x", "X", "Vandret feltkoordinat fra 0 til prefab-bredden minus 1.", { min: 0, step: 1, dynamicMax: "x" }),
    number("y", "Y", "Lodret feltkoordinat fra 0 til prefab-højden minus 1.", { min: 0, step: 1, dynamicMax: "y" }),
    check("blocking", "Blocking", "Når markeret kan spilleren ikke gå gennem chestens kollisionsradius. Runtime-standard er markeret.", { defaultValue: true }),
    number("rotation", "Rotation", "Rotation i radianer.", { step: 0.1 }),
    select("actionId", "Action ID", "Interaction fra ACTION_CONFIG. Tom bruger open_map_chest.", ACTION_OPTIONS, { optional: true }),
  ],
});

const CONDITION_PROPERTY_SCHEMA = Object.freeze([
  text("flag", "Required world flag", "Elementet spawner kun, når dette world-state flag er sandt. Flag-navne er frie runtime-nøgler."),
  text("notFlag", "Forbidden world flag", "Elementet spawner kun, når dette world-state flag ikke er sandt."),
  select("questActive", "Active quest", "Elementet spawner kun, mens den valgte quest er aktiv.", QUEST_OPTIONS, { optional: true }),
  select("questCompleted", "Completed quest", "Elementet spawner kun, når den valgte quest er gennemført.", QUEST_OPTIONS, { optional: true }),
]);

function resolveField(field, context) {
  const options = typeof field.options === "function" ? field.options(context) : field.options;
  const defaultValue = typeof field.defaultValue === "function" ? field.defaultValue(context) : field.defaultValue;
  const max = field.dynamicMax === "x" ? Math.max(0, Number(context.document?.w) - 1)
    : field.dynamicMax === "y" ? Math.max(0, Number(context.document?.h) - 1)
      : field.max;
  return { ...field, options, defaultValue, max };
}

export function schemaForLayer(layer, context = {}) {
  const resolvedContext = { ...context, layer };
  return [...(ENTITY_PROPERTY_SCHEMAS[layer] ?? []), ...CONDITION_PROPERTY_SCHEMA]
    .filter((field) => !field.when || field.when(resolvedContext))
    .map((field) => resolveField(field, resolvedContext));
}
