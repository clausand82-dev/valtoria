export const SHARED_CONDITION_FIELDS = Object.freeze([
  "flag", "notFlag", "all", "any", "blockedBy", "questActive", "questCompleted", "questStepActive", "questStepCompleted", "worldBalanceLydra", "worldBalanceNetdra",
]);

const number = (key, label = key, options = {}) => ({ key, label, type: "number", ...options });
const text = (key, label = key) => ({ key, label, type: "text" });
const check = (key, label = key) => ({ key, label, type: "checkbox" });

export const PREFAB_PROPERTY_SCHEMA = Object.freeze([
  text("id", "ID"), text("label", "Label"), number("w", "Width", { min: 1 }), number("h", "Height", { min: 1 }),
  { key: "anchor", label: "Anchor", type: "select", options: ["room", "clearing", "pathSide"] },
  check("rotate", "Allow rotation"), check("mirror", "Allow mirroring"), check("clearArea", "Clear area"),
  number("avoidStart", "Avoid start", { min: 0 }), number("avoidExit", "Avoid exit", { min: 0 }),
]);

export const ENTITY_PROPERTY_SCHEMAS = Object.freeze({
  objects: [text("id", "Object ID"), number("x"), number("y"), number("variant", "Variant", { min: 0 }), number("size", "Size", { step: 0.05 }), number("scale", "Scale", { step: 0.05 }), number("rotation", "Rotation", { step: 0.1 }), check("blocking"), check("destructible"), text("spawnDamage", "Spawn damage"), text("actionId", "Action ID"), text("questTargetKey", "Quest target"), number("spawnAvoidRadius", "Avoid radius", { min: 0 }), check("foregroundFade", "Foreground fade")],
  foliage: [text("id", "Definition ID"), text("fileName", "File"), number("x"), number("y"), number("cell", "Cell", { min: 0 }), number("variant", "Variant", { min: 0 }), number("size", "Size", { step: 0.05 }), number("scale", "Scale", { step: 0.05 }), number("rotation", "Rotation", { step: 0.1 }), text("actionId", "Action ID"), text("questTargetKey", "Quest target"), text("depthMode", "Depth mode")],
  decals: [text("decayId", "Decay ID"), number("x"), number("y"), number("cell", "Cell", { min: 0 }), number("variant", "Variant", { min: 0 }), number("size", "Size", { step: 0.05 }), number("rotation", "Rotation", { step: 0.1 }), number("alpha", "Alpha", { min: 0, max: 1, step: 0.05 }), number("renderScale", "Render scale", { step: 0.05 })],
  monsters: [text("type", "Monster type"), number("x"), number("y"), number("levelOffset", "Level offset"), text("facing", "Facing")],
  npcs: [text("npcId", "NPC ID"), number("x"), number("y"), text("facing", "Facing"), text("actionId", "Action ID")],
  chests: [text("id", "Chest ID"), number("x"), number("y"), check("blocking"), number("rotation", "Rotation", { step: 0.1 }), text("actionId", "Action ID")],
});

const CONDITION_PROPERTY_SCHEMA = Object.freeze([
  text("flag", "Required world flag"), text("notFlag", "Forbidden world flag"),
  text("questActive", "Active quest"), text("questCompleted", "Completed quest"),
]);

export function schemaForLayer(layer) {
  return [...(ENTITY_PROPERTY_SCHEMAS[layer] ?? []), ...CONDITION_PROPERTY_SCHEMA];
}
