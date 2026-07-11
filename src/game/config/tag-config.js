export const TAGS = {
  small: { label: "Small" },
  medium: { label: "Medium" },
  large: { label: "Large" },
  giant: { label: "Giant" },
  elite: { label: "Elite" },
  boss: { label: "Boss" },
  unique: { label: "Unique" },

  beast: { label: "Beast" },
  wildlife: { label: "Wildlife" },
  humanoid: { label: "Humanoid" },
  magical: { label: "Magical" },
  corrupted: { label: "Corrupted" },
  cursed: { label: "Cursed" },
  undead: { label: "Undead" },
  human: { label: "Human" },
  spirit: { label: "Spirit" },
  dragon: { label: "Dragon" },

  magic: { label: "Magic" },
  melee: { label: "Melee" },
  ranged: { label: "Ranged" },
  projectile: { label: "Projectile" },
  aoe: { label: "Area Damage" },
  dot: { label: "Damage over Time" },

  fire: { label: "Fire" },
  ice: { label: "Ice" },
  lightning: { label: "Lightning" },
  poison: { label: "Poison" },
  holy: { label: "Holy" },
  dark: { label: "Dark" },

  lydra: { label: "Ly'dra'thot" },
  netdra: { label: "Net'dra'thot" },

  object: { label: "Object" },
  destructible: { label: "Destructible" },
  wood: { label: "Wood" },
  stone: { label: "Stone" },
  metal: { label: "Metal" },
  cloth: { label: "Cloth" },
  plant: { label: "Plant" },
  tree: { label: "Tree" },
  web: { label: "Web" },
  bone: { label: "Bone" },
  crystal: { label: "Crystal" },
  ruin: { label: "Ruin" },
  structure: { label: "Structure" },
  banner: { label: "Banner" },
  shrine: { label: "Shrine" },
  symbol: { label: "Symbol" },
  door: { label: "Door" },
  chest: { label: "Chest" },
  barrel: { label: "Barrel" },
  crate: { label: "Crate" },

  forest: { label: "Forest" },
  cave: { label: "Cave" },
  swamp: { label: "Swamp" },
  ancient: { label: "Ancient" },
  elven: { label: "Elven" },
  troll: { label: "Troll" },
  nethrendor: { label: "Nethrendor" },
  eldiria: { label: "Eldiria" },
  tornvalhed: { label: "Tornvalhed" },
  story: { label: "Story" },
};

const warnedTagIds = new Set();

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const result = [];
  for (const tag of tags) {
    const id = String(tag ?? "").trim();
    if (!id || result.includes(id)) continue;
    if (!TAGS[id] && !warnedTagIds.has(id)) {
      warnedTagIds.add(id);
      console.warn(`[tags] Unknown tag '${id}'. This is allowed, but add it to tag-config.js if it is shared metadata.`);
    }
    result.push(id);
  }
  return result;
}

export function tagLabel(tagId) {
  const id = String(tagId ?? "").trim();
  if (!id) return "";
  return TAGS[id]?.label ?? id.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
