export const PREFIXES = {
  poor: ["Cracked", "Bent", "Frayed", "Defect"],
  normal: ["Iron", "Oaken", "Plain", "Common"],
  upgraded: ["Tempered", "Verdant", "Hunter"],
  rare: ["Sunforged", "Kingsguard", "Storm"],
  epic: ["Voidmarked", "Moonlit", "Warborn"],
  legendary: ["Dragonwake", "Bloodstar", "Eternal"],
};

// Stats i UNIQUE_ITEMS og NAMED_ITEM_TEMPLATES:
// Alle procent-stats skrives som decimaler: 0.05 = 5%, 0.20 = 20%.
// damageMin: minimum weapon/bonus damage.
// damageMax: maximum weapon/bonus damage.
// range: attack/cast range for weapons.
// cooldown: attack/cast cooldown for weapons; lower is faster.
// armor: flat armor.
// maxHp: flat maximum health.
// maxMana: flat maximum mana.
// speed: flat movement speed.
// magic: flat magic power.
// maxHpPct: multiplies maximum health.
// maxManaPct: multiplies maximum mana.
// armorFlat: flat armor bonus for bonus-style configs; same effect as armor.
// damagePct: multiplies min and max damage.
// speedPct: multiplies movement speed.
// attackSpeed: reduces cooldown; 0.10 = 10% faster attacks.
// critChance: chance to critically hit.
// critDamage: extra critical multiplier added to the base 150%; 0.10 = 160%.
// blockChance: chance to block incoming hits, reducing their damage.
// dodgeChance: chance to fully avoid incoming hits.
// lifeSteal: heals for this part of damage dealt.
// magicFind: increases unique/named item drop chances.
// goldFind: increases gold drops.
// resourceFind: increases resource drop chance and amount.
// xpGain: increases XP gained.
// Brug maxHp/maxMana her, ikke ARMOR_BASES-felterne life/mana.
// Hvis scaleWithLevel er true, skalerer de flade combat-tal med item level.
// Named items skalerer de flade combat-tal med den rarity, der bliver rullet.
// Procent-stats ovenfor skalerer ikke med level eller rarity.
// Unique items kan bruge weight til relativ drop-vaegt blandt matchende uniques.
// Eksempel: weight 3 er tre gange saa sandsynlig som weight 1, naar begge matcher.
//
// Weapon effects:
// effects er optional ekstra adfaerd paa et item. Lige nu understoettes:
// effects: {
//   onHit: [
//     {
//       type: "areaDamage",       // effekt-type. "areaDamage" giver skade til flere monstre i radius.
//       id: "unique_effect_id",   // stabilt effekt-id til debugging/fremtidige hooks.
//       chance: 1,                // proc chance: 1 = 100%, 0.25 = 25%.
//       radius: 1.35,             // world radius omkring center-positionen.
//       damage: 18,               // base damage for area-effekten. Kommer oveni normalt weapon hit.
//       damageScale: "magic",     // optional stat-navn fra calcStats(), fx "magic".
//       damageScaleAmount: 0.4,   // hvor meget af damageScale-statten der laegges til damage.
//       damageType: "magic",      // sendes videre til damageMonster som sourceType; styrer bl.a. floater-farve.
//       visual: "expandingEnergyRing", // optional visual. Ukendt visual falder tilbage til particles.
//       color: "#8feaff",        // visual/particle farve.
//       durationMs: 350,          // visual duration i millisekunder.
//       center: "target",         // "target" eller "player". Default opfoerer sig som target.
//     },
//   ],
// }
//
// onHit effects trigger kun fra weapon hits hvor combat-flowet eksplicit kalder
// triggerWeaponOnHitEffects(). For melee sker det efter normal damage, saa effekten
// erstatter ikke det almindelige slag og koster ikke mana.
export const UNIQUE_ITEMS = [
  {
    id: "blade_of_the_pulse",
    name: "Blade of the Pulse",
    baseName: "Sword",
    rarity: "unique",
    slot: "weapon",
    mode: "melee",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    biomes: ["snow", "mainland", "jungle", "rock", "desert", "lava"],
    iconUrl: "/assets/generated/item/item_common_sword.png",
    scaleWithLevel: true,
    stats: {
      damageMin: 18,
      damageMax: 29,
      range: 1.28,
      cooldown: 0.5,
      magic: 10,
    },
    effects: {
      onHit: [
        {
          type: "areaDamage",
          id: "blade_energy_ring",
          chance: 1,
          radius: 1.35,
          damage: 18,
          damageScale: "magic",
          damageScaleAmount: 0.4,
          damageType: "magic",
          visual: "expandingEnergyRing",
          color: "#8feaff",
          durationMs: 350,
          center: "target",
        },
      ],
    },
  },
  {
    id: "frostheart",
    name: "Frostheart",
    baseName: "Sword",
    rarity: "unique",
    slot: "weapon",
    mode: "melee",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    biomes: ["snow", "mainland", "jungle", "rock", "desert", "lava"],
    iconUrl: "/assets/generated/item/item_unique_frostheart.png",
    scaleWithLevel: true,
    stats: {
      damageMin: 72,
      damageMax: 112,
      range: 1.38,
      cooldown: 0.42,
      magic: 24,
      maxMana: 30,
    },
  },
    {
    id: "lordkealand_chestplate",
    name: "Lord Kealand's Chestplate",
    baseName: "Chestplate",
    rarity: "unique",
    slot: "chest",
    mode: "melee",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_lordkealand_chestplate.png",
    scaleWithLevel: true,
    stats: {
      armor: 48,
      magic: 24,
      maxMana: 30,
      dodgeChance: 0.03,
    },
  },
      {
    id: "lordkealand_shoulders",
    name: "Lord Kealand's Pauldrons",
    baseName: "Pauldrons",
    rarity: "unique",
    slot: "shoulder",
    mode: "melee",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_lordkealand_shoulders.png",
    scaleWithLevel: true,
    stats: {
      armor: 14,
      magic: 24,
      maxMana: 30,
      dodgeChance: 0.01,
    },
  },
];

export const NAMED_ITEM_TEMPLATES = [
  {
    id: "nethrendor_soldier_sword",
    name: "Nethrendor Soldier Sword",
    baseName: "Sword",
    slot: "weapon",
    mode: "melee",
    levelMin: 3,
    sources: ["monster", "chest"],
    biomes: ["mainland", "rock", "snow"],
    dropChance: 0.012,
    rarityIds: ["poor", "normal", "upgraded", "rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_nethrendor_soldier_sword.png",
    scaleWithLevel: true,
    stats: {
      damageMin: 9,
      damageMax: 16,
      range: 1.22,
      cooldown: 0.54,
      armor: 2,
    },
  },
  {
    id: "nethrendor_soldier_bow",
    name: "Nethrendor Soldier Bow",
    baseName: "Bow",
    slot: "weapon",
    mode: "ranged",
    levelMin: 3,
    sources: ["monster", "chest"],
    biomes: ["mainland", "rock", "snow"],
    dropChance: 0.012,
    rarityIds: ["poor", "normal", "upgraded", "rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_nethrendor_soldier_bow.png",
    scaleWithLevel: true,
    stats: {
      damageMin: 12,
      damageMax: 22,
      range: 5.8,
      cooldown: 0.62,
      armor: 2,
    },
  },
];

// forslag til nye named items
// elver-archer bow (ranged, found in elvindale, maybe with a chance to drop in shadow-thicket)
// nethrendor-soldier spear (melee, found in nethrendor, maybe with a chance to drop in shadow-thicket)
// nethrendor-soldier javelin (ranged, found in nethrendor, maybe with a chance to drop in shadow-thicket)
// nethrendor-soldier armor (armor, found in nethrendor, maybe with a chance to drop in shadow-thicket)
// elver-mage staff (magic, found in elvindale, maybe with a chance to drop in shadow-thicket)
// dagger (leg from Archnogrim - en edderkop)
