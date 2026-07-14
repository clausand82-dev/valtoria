import { AREA_BLUEPRINTS } from "../../config/area-blueprint-config.js";
import { worldEntryAllowed } from "../../world-state.js";
import { validateAreaBlueprint } from "./blueprint-validation.js";

const validationCache = new WeakMap();
function validated(blueprint) { if (!validationCache.has(blueprint)) validationCache.set(blueprint, validateAreaBlueprint(blueprint)); return validationCache.get(blueprint); }

export function resolveRegionBlueprint(regionConfig, worldState, context = {}, registry = AREA_BLUEPRINTS) {
  const candidates = regionConfig?.blueprints;
  if (!Array.isArray(candidates) || candidates.length === 0) return { status: candidates === undefined ? "no_candidates" : "empty_candidates", blueprint: null, diagnostics: [] };
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!candidate || typeof candidate !== "object" || !worldEntryAllowed(candidate, worldState, { ...context, regionConfig, regionId: regionConfig?.id })) continue;
    const id = String(candidate.id ?? "").trim(); const blueprint = registry[id];
    if (!blueprint) return { status: "unknown_blueprint", blueprint: null, candidate, index, diagnostics: [`Matched blueprint candidate "${id || "(missing)"}" does not exist; using procedural fallback.`] };
    const result = validated(blueprint);
    if (!result.valid) return { status: "invalid_blueprint", blueprint: null, candidate, index, diagnostics: [`Matched blueprint "${id}" is invalid; using procedural fallback.`, ...result.errors] };
    return { status: "selected", blueprint: result.blueprint, candidate, index, diagnostics: [] };
  }
  return { status: "no_condition_match", blueprint: null, diagnostics: [] };
}
