// Elite monster variants.
// Each variant is randomly assigned to a monster on spawn via assignEliteVariant().
//
// Fields:
// - id:       Unique identifier for the variant.
// - label:    Display label shown in game UI.
// - weight:   Relative spawn weight. Higher = more common. Null entry (no elite) has weight 10 by default.
// - levelPct: Bonus level added = floor(playerLevel * levelPct). Also affects loot quality.
// - color:    Tint color applied to the monster sprite.
// - tintAlpha: Opacity of the tint (0–1).
// - sizeMult: Visual scale multiplier applied on top of base monster size.
export const ELITE_VARIANTS = [
  null,
  { id: "enforced", label: "Enforced", weight: 4, levelPct: 0.40, color: "#58d96d", tintAlpha: 0.22, sizeMult: 1.025 },
  { id: "rage", label: "Rage", weight: 3, levelPct: 0.75, color: "#ffd85d", tintAlpha: 0.24, sizeMult: 1.045 },
  { id: "lieutenant", label: "Loejtnant", weight: 2, levelPct: 1.25, color: "#b579ff", tintAlpha: 0.26, sizeMult: 1.065 },
];

// Weight of the "no elite" outcome in the roll.
export const ELITE_NO_VARIANT_WEIGHT = 10;
