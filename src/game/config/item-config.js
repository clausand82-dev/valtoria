export const PREFIXES = {
  poor: [
    "Cracked",
    "Bent",
    "Frayed",
    "Defective",
    "Rusted",
    "Splintered",
    "Dented",
    "Worn",
    "Chipped",
    "Torn",
    "Moldy",
    "Loose",
    "Crooked",
    "Faded",
    "Weathered",
    "Shabby",
  ],

  normal: [
    "Iron",
    "Oaken",
    "Plain",
    "Common",
    "Bronze",
    "Leather",
    "Sturdy",
    "Hardened",
    "Field",
    "Village",
    "Militia",
    "Traveling",
    "Huntsman",
    "Roadworn",
    "Wellmade",
    "Practical",
  ],

  upgraded: [
    "Tempered",
    "Verdant",
    "Hunter",
    "Reinforced",
    "Polished",
    "Balanced",
    "Sharpened",
    "Guarded",
    "Runed",
    "Blessed",
    "Steady",
    "Steelbound",
    "Oakheart",
    "Wolfhide",
    "Fieldwarden",
    "Emberlit",
  ],

  rare: [
    "Sunforged",
    "Kingsguard",
    "Storm",
    "Frostbitten",
    "Ashen",
    "Silvered",
    "Thornbound",
    "Moonsteel",
    "Dawnkeeper",
    "Wolfsbane",
    "Ironroot",
    "Starfall",
    "Battleworn",
    "Oathbound",
    "Ravenmarked",
    "Glimmering",
  ],

  epic: [
    "Voidmarked",
    "Moonlit",
    "Warborn",
    "Shadowforged",
    "Stormcarved",
    "Bloodoath",
    "Spiritbound",
    "Nightfallen",
    "Frostveined",
    "Sunblessed",
    "Eldergrove",
    "Arcane",
    "Ghostwrought",
    "Trollscarred",
    "Duskfang",
    "Soulguard",
  ],

  legendary: [
    "Dragonwake",
    "Bloodstar",
    "Eternal",
    "Worldroot",
    "Doomforged",
    "Starcrowned",
    "Fatebound",
    "Godscarred",
    "Ancient",
    "Mythborn",
    "Stormheart",
    "Sunbreaker",
    "Moonshard",
    "Kingsbane",
    "Lightforged",
    "Netherwrought",
  ],
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
  //#region Item Unique: treasure_of_the_fenris
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
    description: "A heavy, ancient Fenris treasure fit to become the heart of a city artifact.",
    i18n: { da: { name: "Fenris' skat", description: "En tung, gammel Fenris-skat, egnet som centrum for et byartefakt." } },
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
  //#endregion: Item Unique: treasure_of_the_fenris
  //#region Item Unique: old_walking_staff
  {
    id: "old_walking_staff",
    name: "Old Walking Staff",
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
    description: "An old staff with poor striking power, but every hit has a 60% chance to unleash a brutal arcane burst around the target.",
    i18n: { da: { name: "Gammel vandrestok", description: "En gammel vandrestok med dårlig slagkraft, men hvert slag har 60% chance for at udløse brutal arcane area damage omkring målet." } },
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
  //#endregion: Item Unique: old_walking_staff
  //#region Item Unique: blade_of_the_pulse
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
    description: "A swift enchanted blade that releases a magic energy ring around its target with every hit.",
    i18n: { da: { name: "Pulsens klinge", description: "En hurtig fortryllet klinge, der udløser en magisk energiring omkring målet ved hvert slag." } },
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
  //#endregion: Item Unique: blade_of_the_pulse
  //#region Item Unique: frostheart
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
    description: "A devastating frost blade with immense damage, rapid attacks, magic power, and additional mana.",
    i18n: { da: { name: "Frosthjerte", description: "En ødelæggende frostklinge med enorm skade, hurtige angreb, magic power og ekstra mana." } },
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
  //#endregion: Item Unique: frostheart
  //#region Item Unique: frostguard_aegis
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
    description: "A sturdy shield with armor, improved blocking, and strong ice resistance, but a weakness to fire.",
    i18n: { da: { name: "Frostvagtens aegis", description: "Et solidt skjold med armor, forbedret block og stærk ice resistance, men med svaghed over for ild." } },
    scaleWithLevel: true,
    stats: {
      armor: 18,
      blockChance: 0.07,
      blockAmount: 6,
      iceResist: 14,
      fireResist: -5,
    },
  },
  //#endregion: Item Unique: frostguard_aegis
  //#region Item Unique: lordkealand_chestplate
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
    description: "Lord Kealand's heavy chestplate combines exceptional armor with magic, mana, and a small chance to dodge.",
    i18n: { da: { name: "Lord Kealands brystplade", description: "Lord Kealands tunge brystplade kombinerer fremragende armor med magic, mana og en lille chance for dodge." } },
    scaleWithLevel: true,
    stats: {
      armor: 48,
      magic: 24,
      maxMana: 30,
      dodgeChance: 0.03,
    },
  },
  //#endregion: Item Unique: lordkealand_chestplate
  //#region Item Unique: lordkealand_shoulders
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
    description: "Arcane pauldrons that reinforce armor while granting substantial magic and mana.",
    i18n: { da: { name: "Lord Kealands skulderplader", description: "Arcane skulderplader, der styrker armor og giver betydelig magic og mana." } },
    scaleWithLevel: true,
    stats: {
      armor: 14,
      magic: 24,
      maxMana: 30,
      dodgeChance: 0.01,
    },
  },
  //#endregion: Item Unique: lordkealand_shoulders
  //#region Item Unique: lordkealand_arms
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
    description: "Battle-worn vambraces that add armor, magic, mana, and extra weapon damage.",
    i18n: { da: { name: "Lord Kealands armskinner", description: "Kampslidte armskinner, der giver armor, magic, mana og ekstra våbenskade." } },
    scaleWithLevel: true,
    stats: { armor: 18, magic: 16, damageMin: 4, damageMax: 7, maxMana: 18 },
  },
  //#endregion: Item Unique: lordkealand_arms
  //#region Item Unique: lordkealand_cape
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
    description: "A light enchanted cape that grants armor, magic, mana, movement speed, and dodge chance.",
    i18n: { da: { name: "Lord Kealands kappe", description: "En let fortryllet kappe, der giver armor, magic, mana, movement speed og dodge chance." } },
    scaleWithLevel: true,
    stats: { armor: 8, magic: 18, maxMana: 22, speedPct: 0.05, dodgeChance: 0.02 },
  },
  //#endregion: Item Unique: lordkealand_cape
  //#region Item Unique: lordkealand_sword
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
    description: "A fast, hard-hitting sword infused with Lord Kealand's lingering magic.",
    i18n: { da: { name: "Lord Kealands sværd", description: "Et hurtigt og kraftfuldt sværd gennemtrængt af Lord Kealands tilbageværende magi." } },
    scaleWithLevel: true,
    stats: { damageMin: 34, damageMax: 52, range: 1.34, cooldown: 0.46, magic: 16 },
  },
  //#endregion: Item Unique: lordkealand_sword
  //#region Item Unique: ladylirian_arms
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
    description: "Elegant vambraces that balance armor, magic, mana, and increased spell damage.",
    i18n: { da: { name: "Lady Lirians armskinner", description: "Elegante armskinner, der kombinerer armor, magic, mana og øget spell damage." } },
    scaleWithLevel: true,
    stats: { armor: 16, magic: 18, maxMana: 14, spellDamageBonus: 0.04 },
  },
  //#endregion: Item Unique: ladylirian_arms
  //#region Item Unique: ladylirian_cape
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
    description: "A swift arcane cape with magic, mana, movement speed, armor, and resistance to every element.",
    i18n: { da: { name: "Lady Lirians kappe", description: "En hurtig arcane kappe med magic, mana, movement speed, armor og resistance mod alle elementer." } },
    scaleWithLevel: true,
    stats: { armor: 7, magic: 22, maxMana: 26, speedPct: 0.06, allResist: 3 },
  },
  //#endregion: Item Unique: ladylirian_cape
  //#region Item Unique: ladylirian_chestplate
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
    description: "A powerful enchanted chestplate with high armor, magic, mana, and resistance to every element.",
    i18n: { da: { name: "Lady Lirians brystplade", description: "En kraftfuld fortryllet brystplade med høj armor, magic, mana og resistance mod alle elementer." } },
    scaleWithLevel: true,
    stats: { armor: 42, magic: 26, maxMana: 34, allResist: 4 },
  },
  //#endregion: Item Unique: ladylirian_chestplate
  //#region Item Unique: ladylirian_legs
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
    description: "Enchanted greaves that provide armor, magic, mana, and improved movement speed.",
    i18n: { da: { name: "Lady Lirians benskinner", description: "Fortryllede benskinner, der giver armor, magic, mana og forbedret movement speed." } },
    scaleWithLevel: true,
    stats: { armor: 22, magic: 14, maxMana: 16, speedPct: 0.04 },
  },
  //#endregion: Item Unique: ladylirian_legs
  //#region Item Unique: ladylirian_shoulders
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
    description: "Arcane pauldrons that grant armor, magic, mana, and increased spell damage.",
    i18n: { da: { name: "Lady Lirians skulderplader", description: "Arcane skulderplader, der giver armor, magic, mana og øget spell damage." } },
    scaleWithLevel: true,
    stats: { armor: 15, magic: 20, maxMana: 20, spellDamageBonus: 0.03 },
  },
  //#endregion: Item Unique: ladylirian_shoulders
  //#region Item Unique: ladylirian_sword
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
    description: "A graceful arcane sword with fast attacks, powerful magic, and increased arcane damage.",
    i18n: { da: { name: "Lady Lirians sværd", description: "Et elegant arcane sværd med hurtige angreb, kraftfuld magic og øget arcane damage." } },
    scaleWithLevel: true,
    stats: { damageMin: 30, damageMax: 48, range: 1.36, cooldown: 0.44, magic: 24, arcaneDamageBonus: 0.08 },
  },
  //#endregion: Item Unique: ladylirian_sword
];

export const NAMED_ITEM_TEMPLATES = [
  //#region Item Named: maras_keepsake
  {
    id: "maras_keepsake",
    name: "Mara's Keepsake",
    baseName: "Keepsake",
    slot: "relic",
    mode: "relic",
    type: "relic",
    levelMin: 1,
    sources: [],
    dropChance: 0,
    rarityIds: ["epic"],
    iconUrl: "/assets/generated/item/item_quest_silverring.png",
    description: "A family keepsake entrusted to you by Mara. It grants steady protection and helps you endure disabling effects.",
    i18n: { da: { name: "Maras minde", description: "Et familieminde, som Mara betroede dig. Det giver stabil beskyttelse og hjælper dig med at modstå hæmmende effekter." } },
    scaleWithLevel: false,
    stats: { armorFlat: 6, maxHp: 30, statusDurationBonus: -0.08 },
  },
  //#endregion: Item Named: maras_keepsake
  //#region Item Named: worn_sandals
  {
    id: "worn_sandals",
    name: "Worn Sandals",
    baseName: "Boots",
    slot: "feet",
    mode: "armor",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    //biomes: ["snow", "mainland", "jungle", "rock", "desert", "lava"],
    dropChance: 0.001,
    rarityIds: ["epic"],
    iconUrl: "/assets/generated/item/item_named_wornsandal.png",
    description: "They offer almost no protection, but feel lighter than air and greatly increase movement speed.",
    i18n: { da: { name: "Slidte sandaler", description: "De giver næsten ingen beskyttelse, men føles lettere end luft og øger movement speed markant." } },
    scaleWithLevel: false,
    stats: { armor: 1, speedPct: 0.15 },
  },
  //#endregion: Item Named: worn_sandals
  //#region Item Named: luck_cigar
  {
    id: "luck_cigar",
    name: "Lucky Cigar",
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
    description: "Grants 10% critical chance. Every critical hit burns away 5% durability. It cannot be repaired and is destroyed at 0%.",
    i18n: { da: { name: "Lykkecigaren", description: "Giver 10% critical chance. Hvert critical hit brænder 5% durability væk. Den kan ikke repareres og forsvinder ved 0%." } },
    scaleWithLevel: false,
    nonRepairable: true,
    destroyWhenDurabilityDepleted: true,
    durabilityLossOnEvents: { criticalHit: 5 },
    stats: { critChance: 0.1 },
  },
  //#endregion: Item Named: luck_cigar
  //#region Item Named: screaming_red_necklace
  {
    id: "screaming_red_necklace",
    name: "Screaming Red Necklace",
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
    description: "A red necklace that whispers and screams at anything trying to harm its wearer, granting 10 resistance to every element.",
    i18n: { da: { name: "Skrigende rød halskæde", description: "En rød halskæde, der hvisker og skriger mod alt, der prøver at skade bæreren. Giver 10 resistance mod alle elementer." } },
    scaleWithLevel: false,
    stats: { allResist: 10 },
  },
  //#endregion: Item Named: screaming_red_necklace
  //#region Item Named: poor_mans_belt
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
    description: "A worn leather belt that inexplicably holds a vast reserve of 50 additional mana.",
    i18n: { da: { name: "Den fattige mands bælte", description: "Et slidt læderbælte, der på uforklarlig vis rummer 50 ekstra mana." } },
    scaleWithLevel: false,
    stats: { maxMana: 50 },
  },
  //#endregion: Item Named: poor_mans_belt
  //#region Item Named: devils_judge
  {
    id: "devils_judge",
    name: "Devil's Judge",
    baseName: "Sword",
    slot: "weapon",
    mode: "melee",
    rarityIds: ["legendary"],
    iconUrl: "/assets/generated/item/item_named_devils_judge.png",
    description: "A legendary sword that deals solid melee damage and burns beasts for an additional 10% target damage on every hit.",
    i18n: { da: { name: "Djævlens dommer", description: "Et legendary sværd med solid melee damage, som brænder beasts for yderligere 10% target damage ved hvert slag." } },
    scaleWithLevel: true,
    stats: { damageMin: 9, damageMax: 16, range: 1.25, cooldown: 0.52 },
    effects: {
      onHit: [{ type: "targetDamage", id: "devils_judge_beast_burn", target: ["tag:beast"], damagePct: 0.1, element: "fire", damageType: "magic", color: "#ff7b38" }],
    },
  },
  //#endregion: Item Named: devils_judge
  //#region Item Named: devils_protector
  {
    id: "devils_protector",
    name: "Devil's Protector",
    baseName: "Iron Shield",
    slot: "offhand",
    mode: "shield",
    type: "shield",
    rarityIds: ["legendary"],
    iconUrl: "/assets/generated/item/item_named_devils_protector.png",
    description: "A legendary shield with armor, stronger blocking, fire resistance, increased total armor, and immunity to slowing effects.",
    i18n: { da: { name: "Djævlens beskytter", description: "Et legendary skjold med armor, stærkere block, fire resistance, øget samlet armor og immunitet mod slow-effekter." } },
    scaleWithLevel: true,
    stats: { armor: 9, blockChance: 0.05, blockAmount: 4, fireResist: 10, armorPct: 0.1, slowImmune: true },
  },
  //#endregion: Item Named: devils_protector
  //#region Item Named: devils_boots
  {
    id: "devils_boots",
    name: "Devil's Boots",
    baseName: "Boots",
    slot: "feet",
    mode: "armor",
    rarityIds: ["legendary"],
    iconUrl: "/assets/generated/item/item_named_devils_boots.png",
    description: "Legendary boots that combine armor and magic resistance with 10% increased movement speed.",
    i18n: { da: { name: "Djævlens støvler", description: "Legendary støvler, der kombinerer armor og magic resistance med 10% øget movement speed." } },
    scaleWithLevel: true,
    stats: { armor: 5, magicResist: 5, speedPct: 0.1 },
  },
  //#endregion: Item Named: devils_boots
  //#region Item Named: devils_touch
  {
    id: "devils_touch",
    name: "Devil's Touch",
    baseName: "Gloves",
    slot: "hands",
    mode: "armor",
    rarityIds: ["legendary"],
    iconUrl: "/assets/generated/item/item_named_devils_touch.png",
    description: "Legendary gloves with armor and magic resistance that increase both gold find and resource find by 5%.",
    i18n: { da: { name: "Djævlens berøring", description: "Legendary handsker med armor og magic resistance, som øger både gold find og resource find med 5%." } },
    scaleWithLevel: true,
    stats: { armor: 4, magicResist: 5, goldFind: 0.05, resourceFind: 0.05 },
  },
  //#endregion: Item Named: devils_touch
  //#region Item Named: nethrendor_soldier_sword
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
    description: "A dependable soldier's sword with balanced melee damage, attack speed, reach, and a small armor bonus.",
    i18n: { da: { name: "Nethrendor-soldatens sværd", description: "Et pålideligt soldatsværd med balanceret melee damage, attack speed, range og en lille armor-bonus." } },
    scaleWithLevel: true,
    stats: {
      damageMin: 9,
      damageMax: 16,
      range: 1.22,
      cooldown: 0.54,
      armor: 2,
    },
  },
  //#endregion: Item Named: nethrendor_soldier_sword
  //#region Item Named: nethrendor_soldier_bow
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
    description: "A military bow with strong ranged damage, long reach, steady attack speed, and a small armor bonus.",
    i18n: { da: { name: "Nethrendor-soldatens bue", description: "En militærbue med stærk ranged damage, lang range, stabil attack speed og en lille armor-bonus." } },
    scaleWithLevel: true,
    stats: {
      damageMin: 12,
      damageMax: 22,
      range: 5.8,
      cooldown: 0.62,
      armor: 2,
    },
  },
  //#endregion: Item Named: nethrendor_soldier_bow
    //#region Item Named: mayors_oath_chain
    {
    id: "mayors_oath_chain",
    name: "Mayor's Oath Chain",
    baseName: "Amulet",
    slot: "amulet",
    mode: "armor",
    type: "amulet",
    levelMin: 8,
    levelReq: 8,
    sources: ["chest", "boss", "monster"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_mayors_oath_chain.png",
    description:
      "A heavy village chain worn during old oaths of protection. It strengthens resolve when the outskirts fall into danger.",
    i18n: {
      da: {
        name: "Borgmesterens edskæde",
        description:
          "En tung landsbykæde båret under gamle beskyttelseseder. Den styrker viljen, når udkanten falder i fare.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 3,
      maxHp: 18,
      magic: 2,
      allResist: 2,
      factionRep: 1,
    },
  },
    //#endregion: Item Named: mayors_oath_chain
  //#region Item Named: roofmenders_buckle
  {
    id: "roofmenders_buckle",
    name: "Roofmender's Buckle",
    baseName: "Belt",
    slot: "belt",
    mode: "armor",
    type: "belt",
    levelMin: 6,
    levelReq: 6,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_roofmenders_buckle.png",
    description:
      "A sturdy tool-belt buckle from a villager who patched roofs after the war. Practical, ugly, and dependable.",
    i18n: {
      da: {
        name: "Taglapperens bæltespænde",
        description:
          "Et solidt værktøjs-bæltespænde fra en landsbyboer, der lappede tage efter krigen. Praktisk, grimt og pålideligt.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 5,
      maxHp: 12,
      resourceFind: 0.04,
      armorPct: 0.03,
    },
  },
  //#endregion: Item Named: roofmenders_buckle
  //#region Item Named: wintertile_charm
  {
    id: "wintertile_charm",
    name: "Wintertile Charm",
    baseName: "Relic",
    slot: "relic",
    mode: "relic",
    type: "charm",
    levelMin: 10,
    levelReq: 10,
    sources: ["chest", "boss", "monster"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_wintertile_charm.png",
    description:
      "A cracked roof tile tied with old twine. Villagers believed it kept winter spirits outside the door.",
    i18n: {
      da: {
        name: "Vintertagstenens amulet",
        description:
          "En revnet tagsten bundet med gammelt sejlgarn. Landsbyboere troede, den holdt vinterånder ude af døren.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 2,
      maxMana: 14,
      magic: 4,
      iceResist: 6,
      arcaneDamageBonus: 0.03,
    },
  },
  //#endregion: Item Named: wintertile_charm
  //#region Item Named: fieldwardens_quiver
  {
    id: "fieldwardens_quiver",
    name: "Fieldwarden's Quiver",
    baseName: "Quiver",
    slot: "offhand",
    mode: "offhand",
    type: "quiver",
    levelMin: 7,
    levelReq: 7,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_fieldwardens_quiver.png",
    description:
      "A patched quiver once carried by the watcher of the northern fields. It is still filled with dry straw and sharp memories.",
    i18n: {
      da: {
        name: "Markvogterens pilekogger",
        description:
          "Et lappet pilekogger båret af nordmarkens gamle vogter. Det er stadig fyldt med tørt halm og skarpe minder.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 2,
      damageMin: 2,
      damageMax: 5,
      critChance: 0.03,
      resourceFind: 0.03,
    },
  },
  //#endregion: Item Named: fieldwardens_quiver
  //#region Item Named: old_mill_sickle
  {
    id: "old_mill_sickle",
    name: "Old Mill Sickle",
    baseName: "Dagger",
    slot: "weapon",
    mode: "melee",
    type: "sickle",
    hands: 1,
    levelMin: 5,
    levelReq: 5,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_old_mill_sickle.png",
    description:
      "A farmer's sickle sharpened after too many hungry beasts wandered into the fields.",
    i18n: {
      da: {
        name: "Den gamle mølles segl",
        description:
          "En bondes segl slebet skarp, efter alt for mange sultne bæster vandrede ind på markerne.",
      },
    },
    scaleWithLevel: true,
    stats: {
      damageMin: 8,
      damageMax: 15,
      range: 1.08,
      cooldown: 0.37,
      critChance: 0.04,
      natureDamageBonus: 0.04,
    },
  },
  //#endregion: Item Named: old_mill_sickle
  //#region Item Named: rusk_miner_pick
  {
    id: "rusk_miner_pick",
    name: "Rusk's Miner Pick",
    baseName: "Spear",
    slot: "weapon",
    mode: "melee",
    type: "pickaxe",
    hands: 2,
    levelMin: 12,
    levelReq: 12,
    sources: ["chest", "boss", "monster"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_rusk_miner_pick.png",
    description:
      "A heavy miner's pick associated with Rusk and the dark stories beneath the village well.",
    i18n: {
      da: {
        name: "Rusks minehakke",
        description:
          "En tung minehakke forbundet med Rusk og de mørke historier under landsbyens brønd.",
      },
    },
    scaleWithLevel: true,
    stats: {
      damageMin: 15,
      damageMax: 28,
      range: 1.42,
      cooldown: 0.78,
      armorFlat: 3,
      physicalDamageBonus: 0.05,
    },
  },
  //#endregion: Item Named: rusk_miner_pick
  //#region Item Named: miris_lantern_focus
  {
    id: "miris_lantern_focus",
    name: "Miri's Lantern Focus",
    baseName: "Focus",
    slot: "offhand",
    mode: "offhand",
    type: "focus",
    levelMin: 12,
    levelReq: 12,
    sources: ["chest", "boss", "monster"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_miris_lantern_focus.png",
    description:
      "A small lantern-focus said to have guided a frightened child through the mine-dark.",
    i18n: {
      da: {
        name: "Miris lygtefokus",
        description:
          "Et lille lygtefokus, der siges at have ledt et bange barn gennem minens mørke.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 1,
      magic: 8,
      maxMana: 18,
      spellDamageBonus: 0.04,
      arcaneDamageBonus: 0.04,
    },
  },
  //#endregion: Item Named: miris_lantern_focus
  //#region Item Named: wellkeepers_gorget
  {
    id: "wellkeepers_gorget",
    name: "Wellkeeper's Gorget",
    baseName: "Gorget",
    slot: "neck",
    mode: "armor",
    type: "gorget",
    levelMin: 9,
    levelReq: 9,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_wellkeepers_gorget.png",
    description:
      "A damp iron gorget from the old well path. It hums faintly when underground magic is near.",
    i18n: {
      da: {
        name: "Brøndvogterens halskrave",
        description:
          "En fugtig jernhalskrave fra den gamle brøndsti. Den summer svagt, når underjordisk magi er nær.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 5,
      maxMana: 16,
      magicResist: 4,
      poisonResist: 5,
    },
  },
  //#endregion: Item Named: wellkeepers_gorget
  //#region Item Named: boarhide_pathfinders
  {
    id: "boarhide_pathfinders",
    name: "Boarhide Pathfinders",
    baseName: "Boots",
    slot: "feet",
    mode: "armor",
    type: "boots",
    levelMin: 4,
    levelReq: 4,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_boarhide_pathfinders.png",
    description:
      "Tough boots stitched from boarhide. They were made for muddy paths, thorny fields, and quick retreats.",
    i18n: {
      da: {
        name: "Vildsvineskinds stifindere",
        description:
          "Seje støvler syet af vildsvineskind. De er lavet til mudrede stier, tornede marker og hurtige tilbagetog.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 6,
      speedPct: 0.06,
      dodgeChance: 0.02,
      physicalResist: 3,
    },
  },
  //#endregion: Item Named: boarhide_pathfinders
  //#region Item Named: fenris_tail_talisman
  {
    id: "fenris_tail_talisman",
    name: "Fenris Tail Talisman",
    baseName: "Relic",
    slot: "relic",
    mode: "relic",
    type: "talisman",
    levelMin: 14,
    levelReq: 14,
    sources: ["chest", "boss", "monster"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_fenris_tail_talisman.png",
    description:
      "A wolf-tail talisman made by hunters who feared the old Fenris stories but followed the tracks anyway.",
    i18n: {
      da: {
        name: "Fenrishalens talisman",
        description:
          "En ulvehale-talisman lavet af jægere, der frygtede de gamle Fenris-sagn, men fulgte sporene alligevel.",
      },
    },
    scaleWithLevel: true,
    stats: {
      magic: 5,
      maxHp: 10,
      speedPct: 0.03,
      critChance: 0.03,
      goldFind: 0.05,
    },
  },
  //#endregion: Item Named: fenris_tail_talisman
  //#region Item Named: ashen_hearth_gloves
  {
    id: "ashen_hearth_gloves",
    name: "Ashen Hearth Gloves",
    baseName: "Gloves",
    slot: "hands",
    mode: "armor",
    type: "gloves",
    levelMin: 6,
    levelReq: 6,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_ashen_hearth_gloves.png",
    description:
      "Soot-dark gloves rescued from a ruined home. They still remember the warmth of a village hearth.",
    i18n: {
      da: {
        name: "Askeildens handsker",
        description:
          "Sodmørke handsker reddet fra et ødelagt hjem. De husker stadig varmen fra et landsbyildsted.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 5,
      damageMin: 2,
      damageMax: 4,
      fireResist: 5,
      resourceFind: 0.03,
    },
  },
  //#endregion: Item Named: ashen_hearth_gloves
  //#region Item Named: broken_watch_shield
  {
    id: "broken_watch_shield",
    name: "Broken Watch Shield",
    baseName: "Wooden Shield",
    slot: "offhand",
    mode: "shield",
    type: "shield",
    levelMin: 8,
    levelReq: 8,
    sources: ["chest", "boss", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_broken_watch_shield.png",
    description:
      "A repaired village watch shield. The old cracks were filled with resin, iron nails, and stubborn hope.",
    i18n: {
      da: {
        name: "Den brudte vagtpostens skjold",
        description:
          "Et repareret landsbyvagtskjold. De gamle revner er fyldt med harpiks, jernsøm og stædigt håb.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 11,
      blockChance: 0.06,
      blockAmount: 5,
      maxHp: 14,
    },
  },
  //#endregion: Item Named: broken_watch_shield
  //#region Item Named: tavernkeepers_token
  {
    id: "tavernkeepers_token",
    name: "Tavernkeeper's Token",
    baseName: "Relic",
    slot: "relic",
    mode: "relic",
    type: "token",
    levelMin: 3,
    levelReq: 3,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_tavernkeepers_token.png",
    description:
      "A worn tavern token traded for warm stew, rumours, and one more chance at tomorrow.",
    i18n: {
      da: {
        name: "Kromandens mønttegn",
        description:
          "Et slidt kromønttegn byttet for varm stuvning, rygter og endnu en chance i morgen.",
      },
    },
    scaleWithLevel: true,
    stats: {
      maxHp: 8,
      maxMana: 8,
      xpGain: 0.04,
      goldFind: 0.04,
    },
  },
  //#endregion: Item Named: tavernkeepers_token
  //#region Item Named: young_boys_tin_soldier
  {
    id: "young_boys_tin_soldier",
    name: "Young Boy's Tin Soldier",
    baseName: "Relic",
    slot: "relic",
    mode: "relic",
    type: "charm",
    levelMin: 11,
    levelReq: 11,
    sources: ["chest", "boss", "monster"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_young_boys_tin_soldier.png",
    description:
      "A tiny battered soldier carried by a village child. It feels far heavier than it should.",
    i18n: {
      da: {
        name: "Den unge drengs tinsoldat",
        description:
          "En lille medtaget soldat båret af et landsbybarn. Den føles langt tungere, end den burde.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 2,
      maxHp: 20,
      holyResist: 4,
      shadowResist: 4,
      statusDurationBonus: 0.04,
    },
  },
  //#endregion: Item Named: young_boys_tin_soldier
  //#region Item Named: haybound_wristwrap
  {
    id: "haybound_wristwrap",
    name: "Haybound Wristwrap",
    baseName: "Bracelet",
    slot: "bracelet",
    mode: "armor",
    type: "bracelet",
    levelMin: 5,
    levelReq: 5,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_haybound_wristwrap.png",
    description:
      "A leather wristwrap bound with field straw. It carries the rhythm of harvest work and tired hands.",
    i18n: {
      da: {
        name: "Høbundne håndledsrem",
        description:
          "En læderrem bundet med markhalm. Den bærer rytmen fra høstarbejde og trætte hænder.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 4,
      damageMin: 2,
      damageMax: 3,
      resourceFind: 0.05,
      natureDamageBonus: 0.03,
    },
  },
  //#endregion: Item Named: haybound_wristwrap
  //#region Item Named: outskirt_scout_ring
  {
    id: "outskirt_scout_ring",
    name: "Outskirt Scout Ring",
    baseName: "Ring",
    slot: "ring",
    mode: "armor",
    type: "ring",
    levelMin: 9,
    levelReq: 9,
    sources: ["chest", "boss", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_outskirt_scout_ring.png",
    description:
      "A plain scout ring marked with tiny scratches showing safe paths around the village outskirts.",
    i18n: {
      da: {
        name: "Udkantsspejderens ring",
        description:
          "En simpel spejderring mærket med små ridser, der viser sikre stier omkring landsbyens udkant.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 2,
      magic: 3,
      speedPct: 0.03,
      dodgeChance: 0.02,
      magicFind: 0.04,
    },
  },
  //#endregion: Item Named: outskirt_scout_ring
    //#region Item Named: militia_watchblade
    {
    id: "militia_watchblade",
    name: "Militia Watchblade",
    baseName: "Sword",
    slot: "weapon",
    mode: "melee",
    type: "sword",
    hands: 1,
    levelMin: 5,
    levelReq: 5,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_militia_watchblade.png",
    description:
      "A village militia blade once carried on the outer watch paths. Plain, sturdy, and sharpened through years of unease.",
    i18n: {
      da: {
        name: "Militsens vagtklinge",
        description:
          "En landsbymilitsklinge båret på de ydre vagtstier. Enkel, solid og slebet gennem mange års uro.",
      },
    },
    scaleWithLevel: true,
    stats: {
      damageMin: 9,
      damageMax: 16,
      cooldown: 0.34,
      critChance: 0.03,
      physicalDamageBonus: 0.03,
    },
  },
    //#endregion: Item Named: militia_watchblade
  //#region Item Named: briarthorn_longbow
  {
    id: "briarthorn_longbow",
    name: "Briarthorn Longbow",
    baseName: "Bow",
    slot: "weapon",
    mode: "ranged",
    type: "bow",
    hands: 2,
    levelMin: 6,
    levelReq: 6,
    sources: ["chest", "monster", "boss"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_briarthorn_longbow.png",
    description:
      "A hunter's longbow wrapped in living briars. It was favored by those who guarded the fields from wolves and raiders.",
    i18n: {
      da: {
        name: "Briarthorn-langbuen",
        description:
          "En jægerlangbue omviklet af levende torne. Den var foretrukket af dem, der bevogtede markerne mod ulve og røvere.",
      },
    },
    scaleWithLevel: true,
    stats: {
      damageMin: 10,
      damageMax: 18,
      critChance: 0.05,
      range: 0.08,
      cooldown: 0.28,
      natureDamageBonus: 0.04,
    },
  },
  //#endregion: Item Named: briarthorn_longbow
  //#region Item Named: wintergate_bulwark
  {
    id: "wintergate_bulwark",
    name: "Wintergate Bulwark",
    baseName: "Wooden Shield",
    slot: "offhand",
    mode: "shield",
    type: "shield",
    levelMin: 7,
    levelReq: 7,
    sources: ["chest", "monster", "boss"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_wintergate_bulwark.png",
    description:
      "A battered shield from the gate watch, marked by winter storms and desperate last stands.",
    i18n: {
      da: {
        name: "Vinterportens bolværk",
        description:
          "Et medtaget skjold fra portvagten, mærket af vinterstorme og desperate sidste stande.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 11,
      blockChance: 0.07,
      blockAmount: 6,
      maxHp: 16,
      physicalResist: 4,
    },
  },
  //#endregion: Item Named: wintergate_bulwark
  //#region Item Named: stonefield_maul
  {
    id: "stonefield_maul",
    name: "Stonefield Maul",
    baseName: "Hammer",
    slot: "weapon",
    mode: "melee",
    type: "hammer",
    hands: 2,
    levelMin: 8,
    levelReq: 8,
    sources: ["chest", "monster", "boss"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_stonefield_maul.png",
    description:
      "A crushing field-maul once used to break stone and skull alike when the outskirts were overrun.",
    i18n: {
      da: {
        name: "Stenmarkens stridshammer",
        description:
          "En knusende markhammer, engang brugt til at bryde både sten og kranier, da udkanten blev overrendt.",
      },
    },
    scaleWithLevel: true,
    stats: {
      damageMin: 16,
      damageMax: 30,
      cooldown: 0.8,
      armorFlat: 3,
      physicalDamageBonus: 0.05,
      stunChance: 0.03,
    },
  },
  //#endregion: Item Named: stonefield_maul
  //#region Item Named: frostwatch_helm
  {
    id: "frostwatch_helm",
    name: "Frostwatch Helm",
    baseName: "Helmet",
    slot: "head",
    mode: "armor",
    type: "helmet",
    levelMin: 6,
    levelReq: 6,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_frostwatch_helm.png",
    description:
      "A dark iron helm worn during the cold watches around the village outskirts.",
    i18n: {
      da: {
        name: "Frostvagtens hjelm",
        description:
          "En mørk jernhjelm båret under de kolde vagter omkring landsbyens udkant.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 8,
      maxHp: 10,
      iceResist: 6,
      allResist: 2,
    },
  },
  //#endregion: Item Named: frostwatch_helm
  //#region Item Named: fieldwarden_brigandine
  {
    id: "fieldwarden_brigandine",
    name: "Fieldwarden Brigandine",
    baseName: "Chestplate",
    slot: "chest",
    mode: "armor",
    type: "chestplate",
    levelMin: 9,
    levelReq: 9,
    sources: ["chest", "monster", "boss"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_fieldwarden_brigandine.png",
    description:
      "A reinforced brigandine worn by the wardens of the northern fields. Built for long marches and sudden violence.",
    i18n: {
      da: {
        name: "Markvogterens brigandine",
        description:
          "En forstærket brigandine båret af nordmarkens vogtere. Bygget til lange marcher og pludselig vold.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 16,
      maxHp: 28,
      armorPct: 0.04,
      physicalResist: 5,
    },
  },
  //#endregion: Item Named: fieldwarden_brigandine
  //#region Item Named: duskfang_blade
  {
    id: "duskfang_blade",
    name: "Duskfang Blade",
    baseName: "Sword",
    slot: "weapon",
    mode: "melee",
    type: "sword",
    hands: 1,
    levelMin: 11,
    levelReq: 11,
    sources: ["chest", "monster", "boss"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_duskfang_blade.png",
    description:
      "A shadow-dark blade whispered to have been drawn against creatures that prowled after sunset.",
    i18n: {
      da: {
        name: "Skumringshugstanden",
        description:
          "En skyggemørk klinge, som siges at være trukket mod væsner, der strejfede omkring efter solnedgang.",
      },
    },
    scaleWithLevel: true,
    stats: {
      damageMin: 13,
      damageMax: 24,
      critChance: 0.04,
      cooldown: 0.33,
      shadowDamageBonus: 0.05,
    },
  },
  //#endregion: Item Named: duskfang_blade
  //#region Item Named: northfield_pike
  {
    id: "northfield_pike",
    name: "Northfield Pike",
    baseName: "Spear",
    slot: "weapon",
    mode: "melee",
    type: "spear",
    hands: 2,
    levelMin: 7,
    levelReq: 7,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_northfield_pike.png",
    description:
      "A long village pike used to hold the line against beasts charging across open farmland.",
    i18n: {
      da: {
        name: "Nordmarkens pike",
        description:
          "En lang landsbypike brugt til at holde linjen mod bæster, der stormede ind over åbne marker.",
      },
    },
    scaleWithLevel: true,
    stats: {
      damageMin: 12,
      damageMax: 22,
      range: 0.18,
      cooldown: 0.42,
      critChance: 0.02,
      physicalDamageBonus: 0.03,
    },
  },
  //#endregion: Item Named: northfield_pike
  //#region Item Named: boartrail_boots
  {
    id: "boartrail_boots",
    name: "Boartrail Boots",
    baseName: "Boots",
    slot: "feet",
    mode: "armor",
    type: "boots",
    levelMin: 4,
    levelReq: 4,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_boartrail_boots.png",
    description:
      "Heavy boots hardened by mud, tusks, and hard ground near the village trails.",
    i18n: {
      da: {
        name: "Vildsvinestiens støvler",
        description:
          "Tunge støvler hærdet af mudder, stødtænder og hård jord ved landsbyens stier.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 7,
      speedPct: 0.05,
      dodgeChance: 0.02,
      physicalResist: 3,
    },
  },
  //#endregion: Item Named: boartrail_boots
  //#region Item Named: emberhearth_gauntlets
  {
    id: "emberhearth_gauntlets",
    name: "Emberhearth Gauntlets",
    baseName: "Gloves",
    slot: "hands",
    mode: "armor",
    type: "gauntlets",
    levelMin: 7,
    levelReq: 7,
    sources: ["chest", "monster", "boss"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_emberhearth_gauntlets.png",
    description:
      "Gauntlets blackened by hearthfire and battle. Warm to the touch even in bitter weather.",
    i18n: {
      da: {
        name: "Glødesmedens handsker",
        description:
          "Handsker svedet af ildsted og kamp. De føles varme at røre ved, selv i bidende kulde.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 7,
      damageMin: 2,
      damageMax: 5,
      fireResist: 6,
      fireDamageBonus: 0.04,
    },
  },
  //#endregion: Item Named: emberhearth_gauntlets
  //#region Item Named: rusks_tunnel_pick
  {
    id: "rusks_tunnel_pick",
    name: "Rusk's Tunnel Pick",
    baseName: "Pickaxe",
    slot: "weapon",
    mode: "melee",
    type: "pickaxe",
    hands: 2,
    levelMin: 12,
    levelReq: 12,
    sources: ["chest", "boss", "monster"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_rusks_tunnel_pick.png",
    description:
      "A brutal tunnel pick tied to the mine below the well and to the name Rusk.",
    i18n: {
      da: {
        name: "Rusks tunnelhakke",
        description:
          "En brutal tunnelhakke knyttet til minen under brønden og til navnet Rusk.",
      },
    },
    scaleWithLevel: true,
    stats: {
      damageMin: 17,
      damageMax: 31,
      cooldown: 0.76,
      armorFlat: 3,
      physicalDamageBonus: 0.05,
    },
  },
  //#endregion: Item Named: rusks_tunnel_pick
  //#region Item Named: roadwardens_sabre
  {
    id: "roadwardens_sabre",
    name: "Roadwarden's Sabre",
    baseName: "Sabre",
    slot: "weapon",
    mode: "melee",
    type: "sabre",
    hands: 1,
    levelMin: 8,
    levelReq: 8,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_roadwardens_sabre.png",
    description:
      "A curved sabre carried by those who kept the roads around the village barely safe.",
    i18n: {
      da: {
        name: "Vejvogterens sabel",
        description:
          "En buet sabel båret af dem, der holdt vejene omkring landsbyen nogenlunde sikre.",
      },
    },
    scaleWithLevel: true,
    stats: {
      damageMin: 11,
      damageMax: 20,
      cooldown: 0.31,
      critChance: 0.05,
      speedPct: 0.03,
    },
  },
  //#endregion: Item Named: roadwardens_sabre
  //#region Item Named: ruinwatch_pauldrons
  {
    id: "ruinwatch_pauldrons",
    name: "Ruinwatch Pauldrons",
    baseName: "Shoulder Guard",
    slot: "shoulder",
    mode: "armor",
    type: "pauldrons",
    levelMin: 9,
    levelReq: 9,
    sources: ["chest", "monster", "boss"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_ruinwatch_pauldrons.png",
    description:
      "Scarred pauldrons taken from a sentry who watched the ruined edges of the settlement.",
    i18n: {
      da: {
        name: "Ruinvagtens skulderplader",
        description:
          "Arrede skulderplader taget fra en skildvagt, der overvågede bebyggelsens ødelagte udkant.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 9,
      maxHp: 12,
      allResist: 2,
      armorPct: 0.03,
    },
  },
  //#endregion: Item Named: ruinwatch_pauldrons
  //#region Item Named: crowfeather_mantle
  {
    id: "crowfeather_mantle",
    name: "Crowfeather Mantle",
    baseName: "Cloak",
    slot: "cape",
    mode: "armor",
    type: "cloak",
    levelMin: 8,
    levelReq: 8,
    sources: ["chest", "monster"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_crowfeather_mantle.png",
    description:
      "A scout's mantle of feathered cloth, suited for silent movement through brush and broken ground.",
    i18n: {
      da: {
        name: "Krågefjerkappen",
        description:
          "En spejderkappe af fjerklædt stof, skabt til lydløs bevægelse gennem krat og ujævnt terræn.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 7,
      speedPct: 0.05,
      dodgeChance: 0.03,
      magicFind: 0.03,
    },
  },
  //#endregion: Item Named: crowfeather_mantle
  //#region Item Named: bridgeguard_greaves
  {
    id: "bridgeguard_greaves",
    name: "Bridgeguard Greaves",
    baseName: "Greaves",
    slot: "legs",
    mode: "armor",
    type: "greaves",
    levelMin: 10,
    levelReq: 10,
    sources: ["chest", "monster", "boss"],
    rarityIds: ["rare", "epic"],
    iconUrl: "/assets/generated/item/item_named_bridgeguard_greaves.png",
    description:
      "Solid greaves worn by the bridge guards when the outskirts still had enough defenders to station there.",
    i18n: {
      da: {
        name: "Brovagtens benskinner",
        description:
          "Solide benskinner båret af brovagterne, dengang udkanten stadig havde nok forsvarere til at bemande stedet.",
      },
    },
    scaleWithLevel: true,
    stats: {
      armor: 13,
      maxHp: 18,
      physicalResist: 5,
      speedPct: 0.02,
    },
  },
  //#endregion: Item Named: bridgeguard_greaves
  //#region Item Named: trollsplitter_axe
  {
    id: "trollsplitter_axe",
    name: "Trollsplitter Axe",
    baseName: "Axe",
    slot: "weapon",
    mode: "melee",
    type: "axe",
    hands: 1,
    levelMin: 10,
    levelReq: 10,
    sources: ["chest", "monster", "boss"],
    rarityIds: ["rare", "epic", "legendary"],
    iconUrl: "/assets/generated/item/item_named_trollsplitter_axe.png",
    description:
      "A brutal one-handed axe forged to bite deep into hide, bone, and trollflesh.",
    i18n: {
      da: {
        name: "Troldekløveren",
        description:
          "En brutal enhåndsøks fremstillet til at bide dybt i skind, knogle og troldekød.",
      },
    },
    scaleWithLevel: true,
    stats: {
      damageMin: 14,
      damageMax: 25,
      cooldown: 0.38,
      critChance: 0.03,
      physicalDamageBonus: 0.05,
    },
  },
  //#endregion: Item Named: trollsplitter_axe
  //#region Item Named: hunters_wolf_cape
  {
    id: "hunters_wolf_cape",
    name: "Hunter's Wolf Cape",
    baseName: "Cape",
    slot: "cape",
    mode: "armor",
    type: "cloak",
    levelMin: 5,
    levelReq: 5,
    sources: [],
    dropChance: 0,
    rarityIds: ["rare"],
    iconUrl: "/assets/generated/item/item_named_hunters_wolf_cape.png",
    description: "A warm wolfskin cape sewn by Y'atho from the tails recovered during the village hunt.",
    i18n: { da: { name: "Jægerens ulvekappe", description: "En varm ulveskindskappe syet af Y'atho af halerne fra jagten omkring landsbyen." } },
    scaleWithLevel: true,
    stats: { armor: 7, maxHp: 12, speedPct: 0.03, coldResist: 5 },
  },
  //#endregion: Item Named: hunters_wolf_cape
  //#region Item Named: hunters_boar_tusk_necklace
  {
    id: "hunters_boar_tusk_necklace",
    name: "Hunter's Boar-Tusk Necklace",
    baseName: "Amulet",
    slot: "amulet",
    mode: "armor",
    type: "necklace",
    levelMin: 7,
    levelReq: 7,
    sources: [],
    dropChance: 0,
    rarityIds: ["rare"],
    iconUrl: "/assets/generated/item/item_named_hunters_boar_neckless.png",
    description: "A necklace of perfect boar tusks, polished and bound by the hunter as a token of trust.",
    i18n: { da: { name: "Jægerens vildsvinetandshalskæde", description: "En halskæde af perfekte vildsvinetænder, poleret og bundet af jægeren som tegn på tillid." } },
    scaleWithLevel: true,
    stats: { armor: 3, maxHp: 18, physicalResist: 4, critChance: 0.02 },
  },
  //#endregion: Item Named: hunters_boar_tusk_necklace
  //#region Item Named: hunters_bow
  {
    id: "hunters_bow",
    name: "Y'atho's Hunter Bow",
    baseName: "Bow",
    slot: "weapon",
    mode: "ranged",
    type: "bow",
    hands: 2,
    levelMin: 9,
    levelReq: 9,
    sources: [],
    dropChance: 0,
    rarityIds: ["epic"],
    iconUrl: "/assets/generated/item/item_named_huntersbow.png",
    description: "Y'atho's finest bow, given only to a hunter who has earned his complete trust.",
    i18n: { da: { name: "Y'athos jægerbue", description: "Y'athos fineste bue, kun givet til en jæger, der har vundet hans fulde tillid." } },
    scaleWithLevel: true,
    stats: { damageMin: 13, damageMax: 23, range: 5.9, cooldown: 0.58, critChance: 0.05, physicalDamageBonus: 0.04 },
  },
  //#endregion: Item Named: hunters_bow
];

// forslag til nye named items
// elver-archer bow (ranged, found in elvindale, maybe with a chance to drop in shadow-thicket)
// nethrendor-soldier spear (melee, found in nethrendor, maybe with a chance to drop in shadow-thicket)
// nethrendor-soldier javelin (ranged, found in nethrendor, maybe with a chance to drop in shadow-thicket)
// nethrendor-soldier armor (armor, found in nethrendor, maybe with a chance to drop in shadow-thicket)
// elver-mage staff (magic, found in elvindale, maybe with a chance to drop in shadow-thicket)
// dagger (leg from Archnogrim - en edderkop)
