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
// slot styrer equipment-slot: "weapon", armor slots, "offhand" eller "relic".
// offhand er ting spilleren holder/bruger i anden haand: shield, orb, tome, quiver, dagger, focus, totem.
// relic er passivt/magisk/helligt artefakt-slot: relic, idol, charm, emblem, talisman, corrupted shard.
// type kan bruges til subtype, fx "shield" paa offhand eller "relic" paa relic items.
// hands paa weapons er 1 eller 2. Mangler hands, behandles weapon som 1H.
// Two-handed weapons blokerer kun offhand, aldrig relic.
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
// armorPct: multiplies total armor.
// damagePct: multiplies min and max damage.
// speedPct: multiplies movement speed.
// attackSpeed: reduces cooldown; 0.10 = 10% faster attacks.
// critChance: chance to critically hit.
// critDamage: extra critical multiplier added to the base 150%; 0.10 = 160%.
// blockChance: chance to block incoming hits, reducing their damage.
// blockAmount: flat damage reduction when a block succeeds. Hvis 0 bruges gammel 50% block-reduktion.
// dodgeChance: chance to fully avoid incoming hits.
// lifeSteal: heals for this part of damage dealt.
// magicFind: increases unique/named item drop chances.
// goldFind: increases gold drops.
// resourceFind: increases resource drop chance and amount.
// xpGain: increases XP gained.
// Elemental resist er procentpoint: fireResist 25 = 25% mindre fire damage, -25 = 25% mere.
// allResist laegges oveni alle elementers resist. magicResist laegges oveni alle ikke-fysiske elementer.
// Resist stats: physicalResist, fireResist, iceResist, lightningResist, poisonResist,
// arcaneResist, holyResist, shadowResist, natureResist, allResist, magicResist.
// Elemental damage bonuses er decimaler: fireDamageBonus 0.05 = 5% mere fire damage.
// Damage bonus stats: physicalDamageBonus, fireDamageBonus, iceDamageBonus,
// lightningDamageBonus, poisonDamageBonus, arcaneDamageBonus, holyDamageBonus,
// shadowDamageBonus, natureDamageBonus.
// Damage form bonuses er decimaler: spellDamageBonus, directDamageBonus,
// areaDamageBonus, dotDamageBonus, hazardDamageBonus.
// Duration/status bonuses er decimaler: dotDurationBonus, statusDurationBonus.
// slowImmune: ignores movement slow effects while the item is equipped.
// Item levels:
// level er det konkrete runtime item-level. For normalt gear styrer det stat-skalering, rarity-roll,
// item value og socket chance. Named/unique items faar level fra loot/reward-kilden og skalerer kun
// deres flade combat-tal med det, hvis scaleWithLevel er true.
// levelMin er named/unique-definitionens minimum for generisk pool-drop og minimum for det genererede
// item.level. Det er ikke et equip-krav.
// levelReq er minimum player level for at equippe itemet. Det er uafhaengigt af item.level/levelMin.
// scaleWithLevel: true skalerer flade combat-tal med item.level; procent-stats skaleres ikke.
//
// Drop-pool filtre for named/unique items:
// sources: ["chest", "boss", "monster"] filtrerer hvilke items der kan vaelges, efter en loot table
// har startet et generisk named/unique-roll. Et loot-table entry med et fast itemId omgaer poolfilteret.
// biomes bliver stadig laest, men runtime sender aktuelt region id som biomeId. Gamle biome-navne som
// "snow", "mainland" og "rock" matcher derfor ikke de nuvaerende region ids og boer betragtes som legacy.
//
// Requirements er optional:
// classReq: ["warrior", "cleric"] kraever en af disse classes.
// requiresClassNode: "mage.frost_adept" kraever unlocked class node.
// Brug maxHp/maxMana her, ikke ARMOR_BASES-felterne life/mana.
// nonRepairable: true forhindrer reparation hos smeden.
// destroyWhenDurabilityDepleted: true fjerner automatisk itemet fra equipment, naar durability rammer 0%.
// durabilityLossOnEvents kan give ekstra durability-tab ved bestemte events, fx { criticalHit: 5 }.
// Named items skalerer de flade combat-tal med den rarity, der bliver rullet.
// Procent-stats ovenfor skalerer ikke med level eller rarity.
// Unique items kan bruge weight til relativ drop-vaegt blandt matchende uniques.
// Eksempel: weight 3 er tre gange saa sandsynlig som weight 1, naar begge matcher.
// UNIQUE_ITEMS og NAMED_ITEM_TEMPLATES kan bruge requires/conditions/blockedBy og shorthand conditions
// som questCompleted, questActive, worldBalanceNetdra, playerStat, cityStat osv.
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
    id: "treasure_of_the_fenris",
    name: "Treasure of the Fenris",
    baseName: "Treasure",
    rarity: "unique",
    slot: "quest",
    mode: "quest",
    type: "artifact_material",
    levelMin: 1,
    sources: ["fenris_wolf"],
    iconUrl: "/assets/generated/item/item_treasure_of_the_fenris.png",
    description: "En tung, gammel Fenris-skat, egnet som centrum for et byartefakt.",
    scaleWithLevel: false,
    blockedBy: {
      any: [
        { inventory: { uniqueId: "treasure_of_the_fenris" } },
        { cityStorage: { uniqueId: "treasure_of_the_fenris" } },
        { cityInventory: { uniqueId: "treasure_of_the_fenris" } },
        { flag: "artifact.treasure_of_the_fenris.built" },
      ],
    },
  },
  {
    id: "old_walking_staff",
    name: "Gammel Vandrestok",
    baseName: "Rune Staff",
    rarity: "unique",
    slot: "weapon",
    mode: "melee",
    type: "staff",
    hands: 1,
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    //biomes: ["snow", "mainland", "jungle", "rock", "desert", "lava"],
    iconUrl: "/assets/generated/item/item_unique_wanderingstick.png",
    description: "En gammel vandrestok med dårlig slagkraft, men hvert slag har 60% chance for at udløse brutal magisk area damage.",
    scaleWithLevel: true,
    stats: {
      damageMin: 4,
      damageMax: 8,
      range: 1.32,
      cooldown: 0.58,
      magic: 8,
    },
    effects: {
      onHit: [
        {
          type: "areaDamage",
          id: "old_walking_staff_brutal_arcane_burst",
          chance: 0.6,
          radius: 1.55,
          damage: 26,
          damageScale: "magic",
          damageScaleAmount: 0.65,
          damageType: "magic",
          element: "arcane",
          visual: "expandingEnergyRing",
          color: "#b88cff",
          durationMs: 420,
          center: "target",
        },
      ],
    },
  },
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
    id: "frostguard_aegis",
    name: "Frostguard Aegis",
    baseName: "Frostguard Shield",
    rarity: "unique",
    slot: "offhand",
    mode: "shield",
    type: "shield",
    levelMin: 4,
    levelReq: 4,
    classReq: ["warrior", "cleric", "warden"],
    sources: ["chest", "boss", "monster"],
    biomes: ["snow", "mainland", "rock"],
    iconUrl: "/assets/generated/item/item_common_shield.png",
    scaleWithLevel: true,
    stats: {
      armor: 18,
      blockChance: 0.07,
      blockAmount: 6,
      iceResist: 14,
      fireResist: -5,
    },
  },
  {
    id: "lordkealand_chestplate",
    name: "Lord Kealand's Chestplate",
    baseName: "Chestplate",
    rarity: "unique",
    slot: "chest",
    mode: "armor",
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
    mode: "armor",
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
  {
    id: "lordkealand_arms",
    name: "Lord Kealand's Vambraces",
    baseName: "Vambraces",
    rarity: "unique",
    slot: "arms",
    mode: "armor",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_lordkealand_arms.png",
    scaleWithLevel: true,
    stats: { armor: 18, magic: 16, damageMin: 4, damageMax: 7, maxMana: 18 },
  },
  {
    id: "lordkealand_cape",
    name: "Lord Kealand's Cape",
    baseName: "Cape",
    rarity: "unique",
    slot: "cape",
    mode: "armor",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_lordkealand_cape.png",
    scaleWithLevel: true,
    stats: { armor: 8, magic: 18, maxMana: 22, speedPct: 0.05, dodgeChance: 0.02 },
  },
  {
    id: "lordkealand_sword",
    name: "Lord Kealand's Sword",
    baseName: "Sword",
    rarity: "unique",
    slot: "weapon",
    mode: "melee",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_lordkealand_sword.png",
    scaleWithLevel: true,
    stats: { damageMin: 34, damageMax: 52, range: 1.34, cooldown: 0.46, magic: 16 },
  },
  {
    id: "ladylirian_arms",
    name: "Lady Lirian's Vambraces",
    baseName: "Vambraces",
    rarity: "unique",
    slot: "arms",
    mode: "armor",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_ladylirien_arms.png",
    scaleWithLevel: true,
    stats: { armor: 16, magic: 18, maxMana: 14, spellDamageBonus: 0.04 },
  },
  {
    id: "ladylirian_cape",
    name: "Lady Lirian's Cape",
    baseName: "Cape",
    rarity: "unique",
    slot: "cape",
    mode: "armor",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_ladylirien_cape.png",
    scaleWithLevel: true,
    stats: { armor: 7, magic: 22, maxMana: 26, speedPct: 0.06, allResist: 3 },
  },
  {
    id: "ladylirian_chestplate",
    name: "Lady Lirian's Chestplate",
    baseName: "Chestplate",
    rarity: "unique",
    slot: "chest",
    mode: "armor",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_ladylirien_chestplate.png",
    scaleWithLevel: true,
    stats: { armor: 42, magic: 26, maxMana: 34, allResist: 4 },
  },
  {
    id: "ladylirian_legs",
    name: "Lady Lirian's Greaves",
    baseName: "Greaves",
    rarity: "unique",
    slot: "legs",
    mode: "armor",
    levelMin: 1,
    levelReq: 15,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_ladylirien_legs.png",
    scaleWithLevel: true,
    stats: { armor: 22, magic: 14, maxMana: 16, speedPct: 0.04 },
  },
  {
    id: "ladylirian_shoulders",
    name: "Lady Lirian's Pauldrons",
    baseName: "Pauldrons",
    rarity: "unique",
    slot: "shoulder",
    mode: "armor",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_ladylirien_shoulders.png",
    scaleWithLevel: true,
    stats: { armor: 15, magic: 20, maxMana: 20, spellDamageBonus: 0.03 },
  },
  {
    id: "ladylirian_sword",
    name: "Lady Lirian's Sword",
    baseName: "Sword",
    rarity: "unique",
    slot: "weapon",
    mode: "melee",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    iconUrl: "/assets/generated/item/item_unique_ladylirien_sword.png",
    scaleWithLevel: true,
    stats: { damageMin: 30, damageMax: 48, range: 1.36, cooldown: 0.44, magic: 24, arcaneDamageBonus: 0.08 },
  },
];

export const NAMED_ITEM_TEMPLATES = [
  {
    id: "worn_sandals",
    name: "Slidte Sandaler",
    baseName: "Boots",
    slot: "feet",
    mode: "armor",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    //biomes: ["snow", "mainland", "jungle", "rock", "desert", "lava"],
    dropChance: 0.001,
    rarityIds: ["epic"],
    iconUrl: "/assets/generated/item/item_named_wornsandal.png",
    description: "Næsten ingen beskyttelse, men de føles lettere end luft.",
    scaleWithLevel: false,
    stats: { armor: 1, speedPct: 0.15 },
  },
  {
    id: "luck_cigar",
    name: "Lykkecigaren",
    baseName: "Relic",
    slot: "relic",
    mode: "relic",
    type: "relic",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    //biomes: ["snow", "mainland", "jungle", "rock", "desert", "lava"],
    dropChance: 0.006,
    rarityIds: ["epic"],
    iconUrl: "/assets/generated/item/item_relic_cigar.png",
    description: "Giver held og +10% critical chance. Hver critical hit brænder 5% durability væk. Kan ikke repareres og forsvinder ved 0%.",
    scaleWithLevel: false,
    nonRepairable: true,
    destroyWhenDurabilityDepleted: true,
    durabilityLossOnEvents: { criticalHit: 5 },
    stats: { critChance: 0.1 },
  },
  {
    id: "screaming_red_necklace",
    name: "Skrigende Rød Halskæde",
    baseName: "Amulet",
    slot: "amulet",
    mode: "armor",
    type: "necklace",
    levelMin: 2,
    sources: ["chest", "boss", "monster"],
    //biomes: ["snow", "mainland", "jungle", "rock", "desert", "lava"],
    dropChance: 0.003,
    rarityIds: ["legendary"],
    iconUrl: "/assets/generated/item/item_named_redneckless.png",
    description: "En rød halskæde, der hvisker og skriger mod alt, der prøver at skade bæreren. Giver +10% til alle resistances.",
    scaleWithLevel: false,
    stats: { allResist: 10 },
  },
  {
    id: "poor_mans_belt",
    name: "Poor Man's Belt",
    baseName: "Belt",
    slot: "belt",
    mode: "armor",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    //biomes: ["northern-fields"], // biomes er old code, men kan bruges til at styre drop i regioner
    dropChance: 0.002,
    rarityIds: ["epic"],
    iconUrl: "/assets/generated/item/item_named_poormansbelt.png",
    description: "Et slidt læderbælte, der på uforklarlig vis rummer en stor mængde mana. +50 mana.",
    scaleWithLevel: false,
    stats: { maxMana: 50 },
  },
  {
    id: "devils_judge",
    name: "Devil's Judge",
    baseName: "Sword",
    slot: "weapon",
    mode: "melee",
    rarityIds: ["legendary"],
    iconUrl: "/assets/generated/item/item_named_devils_judge.png",
    scaleWithLevel: true,
    stats: { damageMin: 9, damageMax: 16, range: 1.25, cooldown: 0.52 },
    effects: {
      onHit: [{ type: "targetDamage", id: "devils_judge_beast_burn", target: ["tag:beast"], damagePct: 0.1, element: "fire", damageType: "magic", color: "#ff7b38" }],
    },
  },
  {
    id: "devils_protector",
    name: "Devil's Protector",
    baseName: "Iron Shield",
    slot: "offhand",
    mode: "shield",
    type: "shield",
    rarityIds: ["legendary"],
    iconUrl: "/assets/generated/item/item_named_devils_protector.png",
    scaleWithLevel: true,
    stats: { armor: 9, blockChance: 0.05, blockAmount: 4, fireResist: 10, armorPct: 0.1, slowImmune: true },
  },
  {
    id: "devils_boots",
    name: "Devil's Boots",
    baseName: "Boots",
    slot: "feet",
    mode: "armor",
    rarityIds: ["legendary"],
    iconUrl: "/assets/generated/item/item_named_devils_boots.png",
    scaleWithLevel: true,
    stats: { armor: 5, magicResist: 5, speedPct: 0.1 },
  },
  {
    id: "devils_touch",
    name: "Devil's Touch",
    baseName: "Gloves",
    slot: "hands",
    mode: "armor",
    rarityIds: ["legendary"],
    iconUrl: "/assets/generated/item/item_named_devils_touch.png",
    scaleWithLevel: true,
    stats: { armor: 4, magicResist: 5, goldFind: 0.05, resourceFind: 0.05 },
  },
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
