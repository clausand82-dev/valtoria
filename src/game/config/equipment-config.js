export const EQUIPMENT_SLOTS = [
  { id: "head", label: "Head" },
  { id: "neck", label: "Neck" },
  { id: "chest", label: "Chest" },
  { id: "arms", label: "Arms" },
  { id: "legs", label: "Legs" },
  { id: "ring1", label: "Ring" },
  { id: "ring2", label: "Ring" },
  { id: "amulet", label: "Amulet" },
  { id: "bracelet", label: "Bracelet" },
  { id: "feet", label: "Feet" },
  { id: "hands", label: "Hands" },
  { id: "weapon", label: "Weapon" },
];

export const ARMOR_BASES = [
  { slot: "head", name: "Helm", armor: 5, life: 9 },
  { slot: "neck", name: "Gorget", armor: 2, mana: 10 },
  { slot: "chest", name: "Chestplate", armor: 12, life: 18 },
  { slot: "arms", name: "Vambraces", armor: 7, damage: 1 },
  { slot: "legs", name: "Greaves", armor: 8, speed: 0.08 },
  { slot: "ring", name: "Ring", armor: 1, magic: 3 },
  { slot: "amulet", name: "Amulet", armor: 1, mana: 15 },
  { slot: "bracelet", name: "Bracelet", armor: 3, damage: 2 },
  { slot: "feet", name: "Boots", armor: 5, speed: 0.14 },
  { slot: "hands", name: "Gloves", armor: 4, damage: 2 },
];

export const WEAPON_BASES = [
  { name: "Sword", mode: "melee", min: 7, max: 13, range: 1.25, cooldown: 0.52 },
  { name: "Spear", mode: "melee", min: 8, max: 16, range: 1.65, cooldown: 0.72 },
  { name: "Dagger", mode: "melee", min: 5, max: 10, range: 1.05, cooldown: 0.35 },
  { name: "Crossbow", mode: "ranged", min: 9, max: 17, range: 5.3, cooldown: 0.86 },
  { name: "Bow", mode: "ranged", min: 7, max: 14, range: 5.8, cooldown: 0.62 },
  { name: "Javelin", mode: "ranged", min: 10, max: 20, range: 4.7, cooldown: 0.95 },
  { name: "Rune Staff", mode: "magic", min: 8, max: 15, range: 5.2, cooldown: 0.74 },
  { name: "Spell Mask", mode: "magic", min: 6, max: 12, range: 4.6, cooldown: 0.48 },
];
