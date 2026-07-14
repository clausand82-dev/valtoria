import { GENERATED_AREA_BLUEPRINTS } from "./generated-blueprints/index.js";
import { mergeBlueprintRegistries } from "./blueprint-registry.js";

export const HANDWRITTEN_AREA_BLUEPRINTS = {};
export const AREA_BLUEPRINTS = mergeBlueprintRegistries(HANDWRITTEN_AREA_BLUEPRINTS, GENERATED_AREA_BLUEPRINTS);
