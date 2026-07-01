// Readable item system.
//
// status values:
// - readable: can be read for story/lore
// - consumable: can be consumed/used for permanent effects
// - mergeable: fragment/part used to assemble another readable item
//
// Drop rules for readables live in loot-tables-config.js.

export const READABLE_ITEM_DEFS = [
  {
    id: "demon_note_1",
    title: "Demon Note Fragment I",
    i18n: { da: { title: "Daemonnotat fragment I", summary: "En revet seddel med aske i kanterne.", story: "Fragment I af III." } },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "lorenote",
    status: "mergeable",
    mergeLocation: "library",
    rarity: "unique",
    value: 6,
    xp: 0,
    summary: "A torn note with ash along the edges.",
    story: "Fragment I of III."
  },
  {
    id: "demon_note_2",
    title: "Demon Note Fragment II",
    i18n: { da: { title: "Daemonnotat fragment II", summary: "Skriftlinjer om ritualer i de sydlige ruiner.", story: "Fragment II af III." } },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "lorenote",
    status: "mergeable",
    mergeLocation: "library",
    rarity: "unique",
    value: 6,
    xp: 0,
    summary: "Written lines about rituals in the southern ruins.",
    story: "Fragment II of III."
  },
  {
    id: "demon_note_3",
    title: "Demon Note Fragment III",
    i18n: { da: { title: "Daemonnotat fragment III", summary: "Den sidste del mangler stadig et par ord.", story: "Fragment III af III." } },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "lorenote",
    status: "mergeable",
    mergeLocation: "library",
    rarity: "unique",
    value: 6,
    xp: 0,
    summary: "The final part is still missing a few words.",
    story: "Fragment III of III."
  },
  {
    id: "demon_notes_compiled",
    title: "Demon Notes",
    i18n: { da: { title: "Daemonnoter", summary: "Samlede noter om daemondyrkelse og rituelle spor.", story: "De samlede noter beskriver en gammel orden, som brugte tre sejl for at aabne en port under Nethrendor. Den sidste side peger mod ruiner i nord." } },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "lorebook",
    status: "readable",
    rarity: "unique",
    value: 70,
    xp: 120,
    mergeLocation: "library",
    parts: [
      "demon_note_1",
      "demon_note_2",
      "demon_note_3"
    ],
    summary: "Collected notes on demon worship and ritual traces.",
    story: "The compiled notes describe an old order that used three seals to open a gate beneath Nethrendor. The last page points toward ruins in the north."
  },
  {
    id: "ember_spell_fragment_1",
    title: "Ember Spell Fragment I",
    i18n: { da: { title: "Ember-besvaergelse fragment I", summary: "Runeudklip med instrukser til ildkanalisering.", story: "Fragment I af II." } },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "mergeable",
    mergeLocation: "mage_tower",
    rarity: "unique",
    value: 12,
    xp: 0,
    summary: "Rune clippings with instructions for channeling fire.",
    story: "Fragment I of II."
  },
  {
    id: "ember_spell_fragment_2",
    title: "Ember Spell Fragment II",
    i18n: { da: { title: "Ember-besvaergelse fragment II", summary: "En side med maalinger for mana-flow.", story: "Fragment II af II." } },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "mergeable",
    mergeLocation: "mage_tower",
    rarity: "unique",
    value: 12,
    xp: 0,
    summary: "A page with measurements for mana flow.",
    story: "Fragment II of II."
  },
  {
    id: "ember_spellbook",
    title: "Spellbook: Ember Rite",
    i18n: {
      da: {
        title: "Stavbog: Ember-ritualet",
        summary: "En komplet spellbook der styrker magisk skade.",
        story: "Denne bog samler to fragmenter af Ember Rite. Brug den ved mage tower for sikker afkodning.",
      },
    },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "consumable",
    rarity: "legendary",
    value: 180,
    xp: 220,
    mergeLocation: "mage_tower",
    parts: [
      "ember_spell_fragment_1",
      "ember_spell_fragment_2"
    ],
    summary: "A complete spellbook that boosts magic damage.",
    story: "This book combines two fragments of Ember Rite. Use it at the mage tower for safe decoding.",
    spellUnlock: "fireball",
    consumable: {
      label: "+2 magic permanent",
      i18n: { da: { label: "+2 magi permanent" } },
      statBonuses: {
        magic: 2
      }
    }
  },
  {
    id: "explosion_spellbook",
    title: "Spellbook: Shatterflare",
    i18n: {
      da: {
        title: "Stavbog: Shatterflare",
        summary: "En spellbook, der beskriver en kompakt eksplosionsrune.",
        story: "Shatterflare lagrer tryk i en flydende gloed og udloeser det som en omraadeeksplosion.",
      },
    },
    iconUrl: "/assets/generated/item/item_res_paper.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 210,
    xp: 260,
    mergeLocation: "mage_tower",
    spellUnlock: "explosion",
    summary: "A spellbook describing a compact blast rune.",
    story: "Shatterflare stores pressure in a moving ember and releases it as an area explosion."
  },
  {
    id: "ice_bolt_spellbook",
    title: "Spellbook: Rime Needle",
    i18n: {
      da: {
        title: "Stavbog: Rimnaal",
        summary: "En spellbook om at fryse mana til et bremsende projektil.",
        story: "Rimnaal gennemborer ved traef og efterlader et kort frostspor, der saenker naerliggende fjender.",
      },
    },
    iconUrl: "/assets/generated/item/item_quest_scroll.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 190,
    xp: 240,
    mergeLocation: "mage_tower",
    spellUnlock: "ice_bolt",
    summary: "A spellbook about freezing mana into a slowing bolt.",
    story: "Rime Needle pierces on impact and leaves a short frost pattern that slows nearby enemies."
  },
  {
    id: "blizzard_spellbook",
    title: "Spellbook: Blizzard",
    i18n: {
      da: {
        title: "Stavbog: Snestorm",
        summary: "En spellbook om at kalde isskaar ned over et stort omraade.",
        story: "Snestorm aabner en kold stroem over slagmarken og lader takkede isskaar falde ned, som splintrer i frost ved traef.",
      },
    },
    iconUrl: "/assets/generated/item/item_book_lore_moonlight.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 260,
    xp: 320,
    mergeLocation: "mage_tower",
    spellUnlock: "blizzard",
    summary: "A spellbook about calling ice shards down over a wide area.",
    story: "Blizzard opens a cold current above the battlefield, dropping jagged shards of ice that burst into frost on impact."
  },
  {
    id: "firerain_spell_fragment_1",
    title: "Fire Rain Fragment I",
    i18n: { da: { title: "Ildregn-fragment I", summary: "En sveden side med himmelfaldsruner.", story: "Fragment I af II." } },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "mergeable",
    mergeLocation: "mage_tower",
    rarity: "unique",
    value: 14,
    xp: 0,
    summary: "A scorched page with skyfall rune marks.",
    story: "Fragment I of II."
  },
  {
    id: "firerain_spell_fragment_2",
    title: "Fire Rain Fragment II",
    i18n: { da: { title: "Ildregn-fragment II", summary: "En varmeforvredet side, der beskriver moenstre for gloedespredning.", story: "Fragment II af II." } },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "mergeable",
    mergeLocation: "mage_tower",
    rarity: "unique",
    value: 14,
    xp: 0,
    summary: "A heat-warped page describing ember spread patterns.",
    story: "Fragment II of II."
  },
  {
    id: "energy_beam_spellbook",
    title: "Spellbook: Luminous Lance",
    i18n: {
      da: {
        title: "Stavbog: Lysende lanse",
        summary: "En spellbook til en hoej-skade straale med lang nedkoeling.",
        story: "Lysende lanse komprimerer mana til en enkelt voldsom kraftlinje.",
      },
    },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 240,
    xp: 300,
    mergeLocation: "mage_tower",
    spellUnlock: "energy_beam",
    summary: "A spellbook for a high-damage beam with a long cooldown.",
    story: "Luminous Lance compresses mana into a single violent line of force."
  },
  {
    id: "poison_cloud_spellbook",
    title: "Spellbook: Venom Script",
    i18n: {
      da: {
        title: "Stavbog: Giftmanuskript",
        summary: "En spellbook om at binde gift til vedvarende mana.",
        story: "Giftmanuskript efterlader et giftigt spor i maalets krop og i luften omkring traefpunktet.",
      },
    },
    iconUrl: "/assets/generated/item/item_res_paper.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 200,
    xp: 250,
    mergeLocation: "mage_tower",
    spellUnlock: "poison_cloud",
    summary: "A spellbook about binding poison to lingering mana.",
    story: "Venom Script leaves a poisonous trace in the target's body and in the air around impact."
  },
  {
    id: "lightning_spellbook",
    title: "Spellbook: Storm Chain",
    i18n: {
      da: {
        title: "Stavbog: Stormkaede",
        summary: "En spellbook om at forme stormenergi til en lammende bolt.",
        story: "Stormkaede flaaner gennem luften og giver naerliggende fjender stoed, sa laenge at deres bevaegelse og angreb afbrydes.",
      },
    },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 230,
    xp: 290,
    mergeLocation: "mage_tower",
    spellUnlock: "lightning",
    summary: "A spellbook about shaping storm energy into a stunning bolt.",
    story: "Storm Chain cracks through the air, jolting nearby enemies long enough to interrupt their movement and attacks."
  },
  {
    id: "firerain_spellbook",
    title: "Spellbook: Fire Rain",
    i18n: {
      da: {
        title: "Stavbog: Ildregn",
        summary: "En spellbook om at lade braendende skaer falde over et stort omraade.",
        story: "Ildregn river en ophedet stroem op over slagmarken og lader gloedende ember falde, som svider nedslagzoner og saetter fjender i brand.",
      },
    },
    iconUrl: "/assets/generated/item/item_book_lore_moonlight.png",
    kind: "spellbook",
    status: "readable",
    rarity: "legendary",
    value: 280,
    xp: 340,
    mergeLocation: "mage_tower",
    parts: [
      "firerain_spell_fragment_1",
      "firerain_spell_fragment_2"
    ],
    spellUnlock: "firerain",
    summary: "A spellbook about raining burning shards over a wide area.",
    story: "Fire Rain tears open a heated draft above the field, dropping blazing embers that scorch impact zones and leave enemies burning."
  },
  {
    id: "sam_tylion_lion_gold_idol_note",
    title: "Sam Tylions Note",
    i18n: { da: { title: "Sam Tylions note", summary: "En note om en forsvunden kasse med sjaeldne lion gold idols.", story: "Til den, der finder dette: Jeg er Sam Tylion, og jeg har mistet en kasse med 24 sjaeldne lion gold idols. Vaesnerne rev kassen op og spredte dem gennem regionerne. Hvis du finder alle 24, saa aflever dem til min faetter Himus i byen. Han ved, hvordan de kommer sikkert hjem." } },
    iconUrl: "/assets/generated/item/item_res_scroll.png",
    kind: "lorenote",
    status: "readable",
    rarity: "unique",
    value: 35,
    xp: 0,
    mergeLocation: "library",
    questId: "sam_tylion_lion_gold_idols",
    summary: "A note about a missing crate of rare lion gold idols.",
    story: "To whoever finds this: I am Sam Tylion, and I have lost a crate containing 24 rare lion gold idols. Creatures tore the crate apart and scattered them across the regions. If you find all 24, deliver them to my cousin Himus in town. He knows how to get them safely home."
  },
  {
    id: "lord_kealands_missing_daughter",
    title: "Lord Kealand's Missing Daughter",
    i18n: { da: { title: "Lord Kealands forsvundne datter", summary: "Historien om Lord Kealands forsvundne datter.", story: "Lord Kealand mistede sin datter i Den Store Trolde krig, hvor hans kone blev draebt og hans datter bortfoert. \n\nHan soegte desperat efter hende i aarevis, men uden held. Rygtet siger, at han til sidst blev saa desperat, at han begyndte at opsoege fare, og at hans soegen foerte ham til en by i udkanten af Elvindalen. Der hoerte han om en quest, om troldenes skat, som vil goere ham rig. \n\nKort efter han begav sig afsted, moedte han Elverdronning Eldiria, som han reddede. Hun fortalte om den frygtelige elverkonge Nethrendor, der var ond og grusom. I et desperat forsoeg paa at konfronterer ham, endte Lord Kealand i Nethrendes faengsel, hvor han moedte Lady Lirian. \n\nDe flygtede sammen og naaede til Troldenoeen, hvor et mystisk smykke Lady Lirian bar, afsloerede at hun var Lord Kealands forsvunde datter. Hendes foerste 'far' ord, smeltede hans hjerte. Sammen drog de paa flere eventyr." } },
    iconUrl: "/assets/generated/item/item_book_lore.png",
    kind: "lorebook",
    status: "readable",
    rarity: "legendary",
    value: 200,
    xp: 250,
    mergeLocation: "library",
    summary: "The story of Lord Kealand's missing daughter.",
    story: "Lord Kealand lost his daughter in the Great Troll War, where his wife was killed and his daughter abducted. \n\nHe searched desperately for her for years, but without success. Rumor says he eventually grew so desperate that he began seeking danger, and that his search led him to a town on the edge of Elvindale. There he heard of a quest about the trolls' treasure, which would make him rich. \n\nShortly after setting out, he met Elven Queen Eldiria, whom he rescued. She told him of the dreadful elven king Nethrendor, who was cruel and ruthless. In a desperate attempt to confront him, Lord Kealand ended up in Nethrendor's prison, where he met Lady Lirian. \n\nThey escaped together and reached Troll Island, where a mysterious necklace worn by Lady Lirian revealed that she was Lord Kealand's long-lost daughter. Her first word, 'father', melted his heart. Together they set out on many more adventures."
  }
];

export const READABLE_DEF_BY_ID = Object.fromEntries(READABLE_ITEM_DEFS.map((entry) => [entry.id, entry]));
