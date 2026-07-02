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
];

export const NAMED_ITEM_TEMPLATES = [
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
];

// forslag til nye named items
// elver-archer bow (ranged, found in elvindale, maybe with a chance to drop in shadow-thicket)
// nethrendor-soldier spear (melee, found in nethrendor, maybe with a chance to drop in shadow-thicket)
// nethrendor-soldier javelin (ranged, found in nethrendor, maybe with a chance to drop in shadow-thicket)
// nethrendor-soldier armor (armor, found in nethrendor, maybe with a chance to drop in shadow-thicket)
// elver-mage staff (magic, found in elvindale, maybe with a chance to drop in shadow-thicket)
// dagger (leg from Archnogrim - en edderkop)
