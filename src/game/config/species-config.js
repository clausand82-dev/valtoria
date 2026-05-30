export const SPECIES = {
  human: { id: "human", label: "Human" },
  elf: { id: "elf", label: "Elf" },
  troll: { id: "troll", label: "Troll" },
  spider: { id: "spider", label: "Spider" },
  rat: { id: "rat", label: "Rat" },
  wolf: { id: "wolf", label: "Wolf" },
  boar: { id: "boar", label: "Boar" },
  goat: { id: "goat", label: "Goat" },
  dragon: { id: "dragon", label: "Dragon" },
  demon: { id: "demon", label: "Demon" },
  spirit: { id: "spirit", label: "Spirit" },
  undead: { id: "undead", label: "Undead" },
  plant: { id: "plant", label: "Plant" },
  fungus: { id: "fungus", label: "Fungus" },
  crab: { id: "crab", label: "Crab" },
  fish: { id: "fish", label: "Fish" },
  sea_folk: { id: "sea_folk", label: "Sea Folk" },
  goblin: { id: "goblin", label: "Goblin" },
  construct: { id: "construct", label: "Construct" },
};

const warnedSpeciesIds = new Set();

export function speciesLabel(speciesId) {
  const id = String(speciesId ?? "").trim();
  if (!id) return "";
  if (!SPECIES[id] && !warnedSpeciesIds.has(id)) {
    warnedSpeciesIds.add(id);
    console.warn(`[species] Unknown speciesId '${id}'. This is allowed, but add a label to species-config.js if it should be shown in UI.`);
  }
  return SPECIES[id]?.label ?? id.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
