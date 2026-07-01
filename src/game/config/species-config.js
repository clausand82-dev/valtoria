export const SPECIES = {
  human: { id: "human", label: "Human", i18n: { da: { label: "Menneske" } } },
  elf: { id: "elf", label: "Elf", i18n: { da: { label: "Elver" } } },
  troll: { id: "troll", label: "Troll", i18n: { da: { label: "Trold" } } },
  spider: { id: "spider", label: "Spider", i18n: { da: { label: "Edderkop" } } },
  rat: { id: "rat", label: "Rat", i18n: { da: { label: "Rotte" } } },
  wolf: { id: "wolf", label: "Wolf", i18n: { da: { label: "Ulv" } } },
  boar: { id: "boar", label: "Boar", i18n: { da: { label: "Vildsvin" } } },
  goat: { id: "goat", label: "Goat", i18n: { da: { label: "Ged" } } },
  dragon: { id: "dragon", label: "Dragon", i18n: { da: { label: "Drage" } } },
  demon: { id: "demon", label: "Demon", i18n: { da: { label: "Dæmon" } } },
  spirit: { id: "spirit", label: "Spirit", i18n: { da: { label: "Ånd" } } },
  undead: { id: "undead", label: "Undead", i18n: { da: { label: "Udød" } } },
  plant: { id: "plant", label: "Plant", i18n: { da: { label: "Plante" } } },
  fungus: { id: "fungus", label: "Fungus", i18n: { da: { label: "Svamp" } } },
  crab: { id: "crab", label: "Crab", i18n: { da: { label: "Krabbe" } } },
  fish: { id: "fish", label: "Fish", i18n: { da: { label: "Fisk" } } },
  sea_folk: { id: "sea_folk", label: "Sea Folk", i18n: { da: { label: "Havfolk" } } },
  goblin: { id: "goblin", label: "Goblin", i18n: { da: { label: "Goblin" } } },
  construct: { id: "construct", label: "Construct", i18n: { da: { label: "Konstrukt" } } },
};

const warnedSpeciesIds = new Set();

export function speciesLabel(speciesId, language = "en") {
  const id = String(speciesId ?? "").trim();
  if (!id) return "";
  if (!SPECIES[id] && !warnedSpeciesIds.has(id)) {
    warnedSpeciesIds.add(id);
    console.warn(`[species] Unknown speciesId '${id}'. This is allowed, but add a label to species-config.js if it should be shown in UI.`);
  }
  return SPECIES[id]?.i18n?.[language]?.label
    ?? SPECIES[id]?.label
    ?? id.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
