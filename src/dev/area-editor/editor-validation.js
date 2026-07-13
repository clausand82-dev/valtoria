import { REGION_OBJECT_DEFS } from "../../game/config/region-object-config.js";
import { DECAY_SET_DEFS } from "../../game/config/decay-config.js";
import { MONSTER_DEFS } from "../../game/config/monster-config.js";
import { QUEST_NPCS } from "../../game/config/npc-config.js";
import { validatePrefab } from "../../game/world/prefabs/prefab-validation.js";
import { editorDocumentToRuntimePrefab } from "./prefab-document-adapter.js";

export const EDITOR_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

export function validateEditorDocument(document, existingIds = [], previousId = null) {
  const runtime = editorDocumentToRuntimePrefab(document);
  const errors = validatePrefab(runtime, { knownIds: {
    objects: new Set(Object.keys(REGION_OBJECT_DEFS)), decals: new Set(Object.keys(DECAY_SET_DEFS)), monsters: new Set(Object.keys(MONSTER_DEFS)), npcs: new Set(Object.keys(QUEST_NPCS)),
  } }).map((message) => {
    const match = message.match(/\.(objects|foliage|decals|monsters|npcs|chests)\[(\d+)\](?:\.(\w+))?/);
    return { severity: "error", message, path: match ? { layer: match[1], index: Number(match[2]), field: match[3] ?? null } : null };
  });
  runtime.chests.forEach((entry, index) => {
    if (entry.id && entry.id !== "basic_chest") errors.push({ severity: "error", path: { layer: "chests", index }, message: `Prefab chest "${entry.id}" is not supported by the current chest runtime.` });
  });
  if (!EDITOR_ID_PATTERN.test(String(runtime.id ?? ""))) errors.push({ severity: "error", path: "id", message: "ID must start with a lowercase letter and contain only lowercase letters, numbers, and underscores." });
  if (existingIds.includes(runtime.id) && runtime.id !== previousId) errors.push({ severity: "error", path: "id", message: `Prefab ID "${runtime.id}" already exists.` });
  if (runtime.editor?.managed !== true) errors.push({ severity: "error", path: "editor.managed", message: "Generated prefabs must be editor-managed." });
  if (runtime.tiles !== undefined || runtime.legend !== undefined) errors.push({ severity: "error", message: "Generated prefabs cannot retain active tiles/legend shorthand." });
  const warnings = [];
  if (!(runtime.objects.length + runtime.foliage.length + runtime.decals.length + runtime.monsters.length + runtime.npcs.length + runtime.chests.length) && !runtime.ground.rows.some((row) => row.some((cell) => cell !== null))) warnings.push({ severity: "warning", message: "Prefab is empty." });
  return { errors, warnings, canSave: errors.length === 0 };
}
