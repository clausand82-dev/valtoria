// Readable item system.
//
// status values:
// - readable: can be read for story/lore
// - consumable: can be consumed/used for permanent effects
// - mergeable: fragment/part used to assemble another readable item
//
// mergeLocation values are optional content-gating hints:
// - backpack (default)
// - library
// - mage_tower
// - barracks
//
// dropTable format (optional):
// dropTable: {
//   chance: 0.02, // default chance for listed mobs
//   monsters: [
//     "Demon", // uses default chance
//     { type: "Gate Warden", chance: 0.04 }, // per-mob override
//   ],
// }
//
// questId/readableQuestId (optional): starts a QUEST_DEFS quest when the item is read.
// The quest itself must use source: "readable"; its npcIds are still used for turn-in.

export const READABLE_ITEM_DEFS = [
  {
    id: "demon_note_1",
    title: "Demon Note Fragment I",
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "lorenote",
    status: "mergeable",
    mergeLocation: "library",
    rarity: "unique",
    value: 6,
    xp: 0,
    dropTable: {
      monsters: [
        { type: "Demon", chance: 0.055 },
        { type: "Gate Warden", chance: 0.055 },
      ],
      chance: 0.055,
    },
    summary: "En revet seddel med aske i kanterne.",
    story: "Fragment I af III.",
  },
  {
    id: "demon_note_2",
    title: "Demon Note Fragment II",
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "lorenote",
    status: "mergeable",
    mergeLocation: "library",
    rarity: "unique",
    value: 6,
    xp: 0,
    dropTable: {
      monsters: [
        { type: "Demon", chance: 0.045 },
        { type: "Gate Warden", chance: 0.045 },
      ],
      chance: 0.045,
    },
    summary: "Skriftlinjer om ritualer i de sydlige ruiner.",
    story: "Fragment II af III.",
  },
  {
    id: "demon_note_3",
    title: "Demon Note Fragment III",
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "lorenote",
    status: "mergeable",
    mergeLocation: "library",
    rarity: "unique",
    value: 6,
    xp: 0,
    dropTable: {
      monsters: [
        { type: "Demon", chance: 0.035 },
        { type: "Gate Warden", chance: 0.035 },
      ],
      chance: 0.035,
    },
    summary: "Den sidste del mangler stadig et par ord.",
    story: "Fragment III af III.",
  },
  {
    id: "demon_notes_compiled",
    title: "Demon Notes",
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "lorebook",
    status: "readable",
    rarity: "unique",
    value: 70,
    xp: 120,
    mergeLocation: "library",
    parts: ["demon_note_1", "demon_note_2", "demon_note_3"],
    summary: "Samlede noter om daemondyrkelse og rituelle spor.",
    story: "De samlede noter beskriver en gammel orden, som brugte tre sejl for at aabne en port under Nethrendor. Den sidste side peger mod ruiner i nord.",
  },
  {
    id: "ember_spell_fragment_1",
    title: "Ember Spell Fragment I",
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "mergeable",
    mergeLocation: "mage_tower",
    rarity: "unique",
    value: 12,
    xp: 0,
    dropTable: {
      monsters: [
        { type: "Ghost", chance: 0.02 },
        { type: "Rune Shade", chance: 0.02 },
      ],
      chance: 0.02,
    },
    summary: "Runeudklip med instrukser til ildkanalisering.",
    story: "Fragment I af II.",
  },
  {
    id: "ember_spell_fragment_2",
    title: "Ember Spell Fragment II",
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "mergeable",
    mergeLocation: "mage_tower",
    rarity: "unique",
    value: 12,
    xp: 0,
    dropTable: {
      monsters: [
        { type: "Ghost", chance: 0.015 },
        { type: "Rune Shade", chance: 0.015 },
      ],
      chance: 0.015,
    },
    summary: "En side med maalinger for mana-flow.",
    story: "Fragment II af II.",
  },
  {
    id: "ember_spellbook",
    title: "Spellbook: Ember Rite",
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "consumable",
    rarity: "legendary",
    value: 180,
    xp: 220,
    mergeLocation: "mage_tower",
    parts: ["ember_spell_fragment_1", "ember_spell_fragment_2"],
    summary: "En komplet spellbook der styrker magisk skade.",
    story: "Denne bog samler to fragmenter af Ember Rite. Brug den ved mage tower for sikker afkodning.",
    spellUnlock: "fireball",
    consumable: {
      label: "+2 magic permanent",
      statBonuses: { magic: 2 },
    },
  },
  {
    id: "explosion_spellbook",
    title: "Spellbook: Shatterflare",
    iconUrl: "/assets/generated/item/item_res_paper.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 210,
    xp: 260,
    mergeLocation: "mage_tower",
    spellUnlock: "explosion",
    dropTable: { monsters: [{ type: "Demon", chance: 0.01 }, { type: "Gate Warden", chance: 0.012 }], chance: 0.008 },
    summary: "A spellbook describing a compact blast rune.",
    story: "Shatterflare stores pressure in a moving ember and releases it as an area explosion.",
  },
  {
    id: "ice_bolt_spellbook",
    title: "Spellbook: Rime Needle",
    iconUrl: "/assets/generated/item/item_quest_scroll.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 190,
    xp: 240,
    mergeLocation: "mage_tower",
    spellUnlock: "ice_bolt",
    dropTable: { monsters: [{ type: "Spider", chance: 0.012 }, { type: "Rune Shade", chance: 0.012 }], chance: 0.008 },
    summary: "A spellbook about freezing mana into a slowing bolt.",
    story: "Rime Needle pierces on impact and leaves a short frost pattern that slows nearby enemies.",
  },
  {
    id: "energy_beam_spellbook",
    title: "Spellbook: Luminous Lance",
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 240,
    xp: 300,
    mergeLocation: "mage_tower",
    spellUnlock: "energy_beam",
    dropTable: { monsters: [{ type: "Ghost", chance: 0.01 }, { type: "Rune Shade", chance: 0.014 }], chance: 0.007 },
    summary: "A spellbook for a high-damage beam with a long cooldown.",
    story: "Luminous Lance compresses mana into a single violent line of force.",
  },
  {
    id: "poison_cloud_spellbook",
    title: "Spellbook: Venom Script",
    iconUrl: "/assets/generated/item/item_res_paper.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 200,
    xp: 250,
    mergeLocation: "mage_tower",
    spellUnlock: "poison_cloud",
    dropTable: { monsters: [{ type: "Skeleton", chance: 0.01 }, { type: "Snake", chance: 0.012 }], chance: 0.008 },
    summary: "A spellbook about binding poison to lingering mana.",
    story: "Venom Script leaves a poisonous trace in the target's body and in the air around impact.",
  },
  {
    id: "sam_tylion_lion_gold_idol_note",
    title: "Sam Tylions Note",
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "lorenote",
    status: "readable",
    rarity: "unique",
    value: 35,
    xp: 0,
    mergeLocation: "library",
    questId: "sam_tylion_lion_gold_idols",
    summary: "En note om en forsvunden kasse med sjældne lion gold idols.",
    story: "Til den, der finder dette: Jeg er Sam Tylion, og jeg har mistet en kasse med 24 sjældne lion gold idols. Væsnerne rev kassen op og spredte dem gennem regionerne. Hvis du finder alle 24, så aflever dem til min fætter Himus i byen. Han ved, hvordan de kommer sikkert hjem.",
  },
    {
    id: "lord_kealands_missing_daughter",
    title: "Lord Kealand's Missing Daughter",
    iconUrl: "/assets/generated/item/item_book_lore.png",
    kind: "lorebook",
    status: "readable",
    rarity: "legendary",
    value: 200,
    xp: 250,
    mergeLocation: "library",
    dropTable: { monsters: [{ type: "Skeleton", chance: 0.01 }, { type: "Snake", chance: 0.012 }], chance: 0.008 },
    summary: "Historien om Lord Kealands forsvundne datter.",
    story: "Lord Kealand mistede sin datter i Den Store Trolde krig, hvor hans kone blev dræbt og hans datter bortført. Han søgte desperat efter hende i årevis, men uden held. Rygtet siger, at han til sidst blev så desperat, at han begyndte at opsøge fare, og at hans søgen førte ham til en by i udkanten af Elvindalen. Der hørte han om en quest, om troldenes skat, som vil gøre ham rig. Kort efter han begav sig afsted, mødte han Eelverdronning Eldiria, som han reddede. Hun fortalte om den frygtelige elverkonge Nethrendor, der var ond og grusom. I et desperat forsøg på at konfronterer ham, endte Lord Kealand i Nethrendes fængsel, hvor han mødte Lady Lirian. De flygtede sammen og nåede til Troldenøen, hvor et mystisk smykke Lady Lirian bar, afslørede at hun var Lord Kealands forsvunde datter. Hendes første 'far' ord, smeltede hans hjerte. Sammen drog de på flere eventyr.",
  },
];

export const READABLE_DEF_BY_ID = Object.fromEntries(READABLE_ITEM_DEFS.map((entry) => [entry.id, entry]));
