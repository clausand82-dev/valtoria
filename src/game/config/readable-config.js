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
    id: "young_boys_fathers_letter",
    title: "A Father's Letter",
    iconUrl: "/assets/generated/item/item_quest_letter.png",
    kind: "lorenote",
    status: "readable",
    rarity: "unique",
    value: 0,
    xp: 0,
    summary: "A mud-stained letter carried home by a devoted son.",
    story: "My dearest, the forest is no longer safe. I found a cave beyond the old paths, alive with a brood that should not exist. I have sent our boy home with this account. If he reaches you before I do, hold him close. Tell him his father was proud that he did not leave me until I made him go.",
    i18n: { da: { title: "En fars brev", summary: "Et mudret brev, som en trofast søn forsøgte at bringe hjem.", story: "Min kæreste, skoven er ikke længere sikker. Jeg fandt en grotte bag de gamle stier, levende af en yngel, som ikke burde findes. Jeg har sendt vores dreng hjem med denne beretning. Hvis han når dig før mig, så hold ham tæt. Sig til ham, at hans far var stolt over, at han ikke forlod mig, før jeg tvang ham af sted." } },
  },
  {
    id: "young_boys_fathers_last_page",
    title: "The Father's Last Page",
    iconUrl: "/assets/generated/item/item_res_paper.png",
    kind: "lorenote",
    status: "readable",
    rarity: "unique",
    value: 0,
    xp: 0,
    summary: "The final lines of a man who stayed behind.",
    story: "The young ones are gathering at the mouth. If I run, they follow the boy. So I will make noise and draw them deeper. My love, forgive me for making you wait. Let our son know that every step he took toward home was the bravest thing either of us ever did.",
    i18n: { da: { title: "Faderens sidste side", summary: "De sidste linjer fra en mand, der blev tilbage.", story: "Ynglen samler sig ved indgangen. Hvis jeg løber, følger de efter drengen. Derfor larmer jeg og lokker dem dybere ind. Min elskede, tilgiv mig, at jeg lod dig vente. Lad vores søn vide, at hvert skridt, han tog mod hjemmet, var det modigste, nogen af os gjorde." } },
  },
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
  },
  {
  id: "lore_innkeeper_first_evening",
  title: "When Lord Kealand Walked In",
  i18n: {
    da: {
      title: "Da Lord Kealand Traadte Ind",
      summary: "Krofatterens overdrevne beretning om aftenen, hvor Lord Kealand foerste gang traadte ind paa kroen.",
      story: "Jeg husker aftenen tydeligt, selvom jeg maa indroemme, at jeg ogsaa har fortalt den saa mange gange, at historien maaske er blevet bedre end sandheden. Men hvad goer det? En sandhed uden lidt skum paa toppen er bare gammel oel.\n\nDet var en moerk aften, og vinden slog mod kroens traeskodder, som om selve skoven ville ind og varme sig. Kroen var fuld, selvfoelgelig. Naar maend ikke har penge nok til broed, har de maerkeligt nok altid penge nok til mjoed.\n\nSaa gik doeren op.\n\nIkke som naar en bonde kommer ind. Ikke som naar en handelsmand kommer ind og straks spoerger efter prisen paa suppe. Nej, doeren gik op, som om den selv vidste, at den skulle give plads for en mand, der havde set mere end de fleste konger.\n\nInd traadte Lord Kealand.\n\nHans kappe var moerk af vejstoev. Hans rustning bar ridser, som hver isaer lignede begyndelsen paa en lang historie. Han var ikke ung, men han bar sig som en mand, der stadig kunne loefte et bord med den ene haand og en fjende med den anden. Hans blik gled over krostuen, og i et kort oejeblik blev alle stille.\n\nSelv gamle Oskar holdt op med at lyve, og det siger ikke saa lidt.\n\nLord Kealand bestilte kun en mjoed. En! Det var foerste tegn paa, at han enten var meget klog eller meget farlig. De fleste helte drikker som om de proever at slukke en brand i maven. Kealand drak som en mand, der ville holde hovedet klart, fordi han vidste, at moerket udenfor stadig havde oejne.\n\nJeg spurgte ham, hvad der bragte ham til vores fattige by. Han svarede naesten ikke. Den slags maend fortaeller ikke deres aerinder til krofattere. De baerer dem som sten i brystet.\n\nMen jeg kunne se det. Der var sorg i ham. Den slags sorg, som ikke forsvinder med alder eller sejr. Den slags sorg, der faar en mand til at vandre videre, selv naar han burde saette sig ned og lade verden passe sig selv.\n\nSenere hoerte han maendene tale om skatten paa Tornvalhed. Skatten, som unge svende havde jagtet, men aldrig vendt hjem fra. Han lyttede ikke som en nysgerrig mand. Han lyttede som en mand, der allerede havde besluttet sig.\n\nHan kaldte Oskar over. Gav ham moenter. Fik historien. Og da han gik mod sit kammer den nat, var det som om hele kroen havde faaet et glimt af noget stoerre end sig selv.\n\nJeg siger ikke, at jeg vidste, hvad han ville blive en del af. Jeg siger ikke, at jeg vidste, at han ville moede Eldiria, Nethrendor, Lady Lirien, Foldrik og alle de raedsler, som senere blev fortalt om.\n\nMen jeg vidste en ting.\n\nDen mand var ikke kommet til vores kro for at hvile.\n\nHan var kommet, fordi skaebnen havde brug for et sted at begynde.\n\nOg det sted var min kro.\n\nSaa naeste gang nogen siger, at store eventyr begynder i slotte, templer eller kongelige sale, saa send dem til mig. Jeg vil skaenke dem en mjoed og fortaelle sandheden:\n\nDe stoerste eventyr begynder med en traet kriger, en snavset kro, et mistaenkeligt rent krus og en krofatter, der saa det hele foerst."
    }
  },
  iconUrl: "/assets/generated/item/item_book_lore.png",
  kind: "lorebook",
  status: "readable",
  rarity: "rare",
  value: 90,
  xp: 80,
  mergeLocation: "library",
  summary: "The innkeeper's exaggerated account of the night Lord Kealand first entered his inn.",
  story: "I remember the evening clearly, though I admit I have told the story so many times that it may have grown finer than the truth. But what is truth without a little foam on top?\n\nIt was a dark evening, and the wind beat against the shutters as if the forest itself wanted to come inside and warm itself. The inn was full, of course. When men have too little coin for bread, they somehow always have enough for mead.\n\nThen the door opened.\n\nNot like when a farmer enters. Not like when a merchant steps in and asks the price of soup before saying hello. No, the door opened as if it knew it had to make room for a man who had seen more than most kings.\n\nLord Kealand walked in.\n\nHis cloak was dark with road dust. His armor carried scratches, each one looking like the beginning of a long story. He was not young, but he held himself like a man who could still lift a table with one hand and an enemy with the other. His eyes moved across the room, and for one brief moment everyone fell silent.\n\nEven old Oskar stopped lying, and that is saying something.\n\nKealand ordered only one mug of mead. One. That was the first sign that he was either very wise or very dangerous. Most heroes drink as if trying to drown a fire in their stomach. Kealand drank like a man who wanted his mind clear because he knew the darkness outside still had eyes.\n\nI asked what brought him to our poor village. He barely answered. Men like that do not give their errands to innkeepers. They carry them like stones in the chest.\n\nBut I could see it. There was sorrow in him. The kind of sorrow that does not fade with age or victory. The kind that makes a man keep walking when he should sit down and let the world mind itself.\n\nLater he heard the men speaking of the treasure on Tornvalhed. The treasure young men had chased and never returned from. He did not listen like a curious man. He listened like a man who had already decided.\n\nHe called Oskar over. Gave him coins. Heard the tale. And when he went to his room that night, it felt as if the whole inn had glimpsed something larger than itself.\n\nI do not claim I knew what he would become part of. I do not claim I knew he would meet Eldiria, Nethrendor, Lady Lirien, Foldrik, and all the horrors that later filled the tales.\n\nBut I knew one thing.\n\nThat man had not come to my inn to rest.\n\nHe had come because fate needed somewhere to begin.\n\nAnd that place was my inn.\n\nSo next time someone says great adventures begin in castles, temples, or royal halls, send them to me. I will pour them a mead and tell them the truth:\n\nThe greatest adventures begin with a tired warrior, a dirty inn, a suspiciously clean mug, and an innkeeper who saw it all first."
},
{
  id: "lore_nethrendor_first_light",
  title: "Nethrendor Before the Dark",
  i18n: {
    da: {
      title: "Nethrendor Foer Moerket",
      summary: "Elvernes fortaelling om Nethrendors oprindelse, foer hans fald til moerket.",
      story: "Foer hans navn blev hvisket med frygt, blev det sunget med glaede.\n\nSaadan siger de aeldste blandt elverne, naar vinden staar stille mellem Elvindalens blade, og ingen toer naevne nordskoven for hoejt. For Nethrendor var ikke foedt i moerke. Han kom ikke til verden med had i hjertet eller skygger i sine haender. Han var engang blandt de lyseste af vores folk.\n\nHan blev foedt under en maane, der stod soelvklar over Livstraeets yderste roedder. Nogle sagde, at traeets blade vendte sig mod ham, som om det genkendte en kommende vogter. Andre sagde, at en hvid hjort traadte ud af skoven og boejede sit hoved ved hans vugge. Saadanne ting bliver sagt, naar et barn viser sig at vaere saerligt. Om de er sande, ved kun skoven.\n\nMen sandt er det, at Nethrendor voksede med en sjaelden kraft.\n\nHan laerte hurtigt. Alt for hurtigt, mente nogle. Han kunne laese de gamle runer, foer hans stemme var faerdig med at vaere barnlig. Han kunne hoere stammernes hvisken, hvor andre kun hoerte vind. Han kunne forme lysmagi i haenderne, ikke som flammer, men som traade. Smaa gyldne traade, der kunne hele en braekket gren, berolige et saaret dyr eller vaeve beskyttelse omkring en bange sjael.\n\nHan var elsket.\n\nIkke med den fjerne respekt, man giver en konge, men med den varme, man giver en, man tror vil redde verden, hvis verden en dag beder ham om det.\n\nDa han blev aeldre, gik han ofte alene til de aeldste ruiner i Elvindalen. Ikke for at soege moerke, sagde han, men for at forstaa det. Han mente, at ingen lysvogter kunne beskytte skoven, hvis han naegtede at kende de kraefter, der truede den.\n\nMange beundrede hans mod.\n\nNogle frygtede hans nysgerrighed.\n\nEldiria, der senere skulle blive hans dronning, saa begge dele. Hun saa hans mildhed, men ogsaa hans rastloeshed. Hun elskede ham ikke fordi han var uden fejl, men fordi hans fejl endnu ikke havde valgt side.\n\nDa de blev gift, sang Elvindalen i tre naetter. Lygteblomster aabnede sig uden for saeson. Fugle, der ellers kun sang ved daggry, sang ved midnat. Det siges, at Livstraeet lod et eneste blad falde for deres foedder, og at Nethrendor samlede det op med taarer i oejnene.\n\n'Jeg vil beskytte dette,' sagde han.\n\nIngen ved, hvornaar den saetning blev til noget andet.\n\nFor maaske er moerket ikke altid et broel. Maaske begynder det som en hvisken. Som et spoergsmaal. Som en tanke om, at man kunne goere mere godt, hvis man blot havde mere magt. Som et oenske om at beskytte alt saa haardt, at man til sidst kvaeler det.\n\nNethrendor soegte gamle steder. Forbudte steder. Steder hvor skovens lys blev tyndt, og hvor noget aeldre end elverne laa tilbage som sort dug paa jorden. Derfra vendte han hjem forandret.\n\nIkke helt.\n\nIkke straks.\n\nDet vaerste moerke tager sig tid.\n\nFoerst blev han tavs. Saa blev han streng. Saa blev han mistroisk. Saa begyndte han at tale om orden, noedvendighed og offer. Han samlede artefakter, ikke laengere for at studere dem, men for at eje dem. Han talte ikke laengere med skoven. Han befalede den.\n\nOg da nordskoven begyndte at visne, sagde han, at den blot boejede sig for en staerkere vilje.\n\nMen vi, som husker de gamle sange, ved dette:\n\nNethrendor var engang lys.\n\nDerfor goer moerket omkring ham mere ondt.\n\nFor naar en ond mand falder, faar verden en fjende.\n\nNaar en god mand falder, mister verden et haab."
    }
  },
  iconUrl: "/assets/generated/item/item_book_lore_moonlight.png",
  kind: "lorebook",
  status: "readable",
  rarity: "legendary",
  value: 150,
  xp: 140,
  mergeLocation: "library",
  summary: "An elven account of Nethrendor's origin, before his fall into darkness.",
  story: "Before his name was whispered in fear, it was sung with joy.\n\nSo say the eldest among the elves when the wind stands still between the leaves of Elvindale and no one dares speak too loudly of the northern forest. Nethrendor was not born in darkness. He did not come into the world with hatred in his heart or shadow in his hands. He was once among the brightest of our people.\n\nHe was born beneath a moon that shone silver over the outer roots of the Tree of Life. Some said the leaves turned toward him, as if the tree recognized a future guardian. Others claimed a white stag stepped from the forest and bowed its head beside his cradle. Such things are often said of gifted children. Only the forest knows whether they are true.\n\nBut it is true that Nethrendor grew with rare power.\n\nHe learned too quickly, some said. He could read old runes before his voice had lost its childlike softness. He could hear whispers in the trunks where others heard only wind. He shaped light magic in his hands, not as fire, but as threads. Golden threads that could heal a broken branch, soothe a wounded animal, or weave protection around a frightened soul.\n\nHe was loved.\n\nNot with the distant respect given to a king, but with the warmth given to one people believe might save the world if the world ever asked.\n\nAs he grew older, he often walked alone to the oldest ruins of Elvindale. Not to seek darkness, he said, but to understand it. He believed no guardian of light could protect the forest while refusing to know the powers that threatened it.\n\nMany admired his courage.\n\nSome feared his curiosity.\n\nEldiria, who would later become his queen, saw both. She saw his kindness, but also his restlessness. She loved him not because he was without flaw, but because his flaws had not yet chosen a side.\n\nWhen they were wed, Elvindale sang for three nights. Lantern flowers opened out of season. Birds that only sang at dawn sang at midnight. It is said the Tree of Life let a single leaf fall at their feet, and that Nethrendor lifted it with tears in his eyes.\n\n'I will protect this,' he said.\n\nNo one knows when that sentence became something else.\n\nPerhaps darkness is not always a roar. Perhaps it begins as a whisper. As a question. As the thought that one could do more good with just a little more power. As the wish to protect everything so fiercely that one slowly begins to suffocate it.\n\nNethrendor sought old places. Forbidden places. Places where the light of the forest grew thin and where something older than elves remained like black dew on the ground. From there he returned changed.\n\nNot fully.\n\nNot at once.\n\nThe worst darkness takes its time.\n\nFirst he grew silent. Then stern. Then suspicious. Then he spoke of order, necessity, and sacrifice. He gathered artifacts, no longer to study them, but to own them. He no longer spoke with the forest. He commanded it.\n\nAnd when the northern forest began to wither, he said it was merely bowing to a stronger will.\n\nBut we who remember the old songs know this:\n\nNethrendor was once light.\n\nThat is why the darkness around him hurts more.\n\nWhen an evil man falls, the world gains an enemy.\n\nWhen a good man falls, the world loses a hope."
},
{
  id: "lore_aeliriel_eldiria_testimony",
  title: "Daughter of the Tree's Guardian",
  i18n: {
    da: {
      title: "Datter af Livstraeets Vogter",
      summary: "Aeliriels personlige vidnesbyrd om sin mor Eldiria og byrden ved at beskytte Elvindalen.",
      story: "Mit navn er Aeliriel.\n\nJeg skriver dette, fordi folk altid fortaeller historier om min mor, som om hun var foedt af lys og aldrig har kendt tvivl. De kalder hende Eldiria den Retfaerdige. Eldiria den Milde. Eldiria, Livstraeets Vogter. Eldiria, som stod imod Nethrendor, da andre vendte blikket vaek.\n\nAlt dette er sandt.\n\nMen det er ikke hele sandheden.\n\nMin mor var ikke staerk, fordi hun aldrig graed. Hun var staerk, fordi hun graed og alligevel rejste sig.\n\nJeg husker hende ikke som en dronning foerst. Jeg husker hende som haender. Varme haender. Haender, der flettede mit haar, mens raadsmedlemmer skaendtes udenfor. Haender, der roerte ved barken paa syge traeer og blev liggende der, indtil bladene holdt op med at skaelve. Haender, der engang rystede saa voldsomt efter en kamp, at hun maatte gemme dem i sine aermer, saa hendes folk ikke skulle miste modet.\n\nMin mor bar Elvindalen som andre baerer et barn.\n\nHun kendte hver sti, hver kilde, hver lysning. Hun kunne maerke, naar noget var forkert. Ikke med oererne, men med hjertet. Naar en gren knaekkede i nord, maerkede hun det i syd. Naar moerk magi sivede ind mellem roedderne, sov hun ikke.\n\nFolk tror, at hendes stoerste kamp var mod Nethrendor.\n\nDet var den ikke.\n\nHendes stoerste kamp var mod sig selv.\n\nHun elskede ham engang. Det maa skrives, selvom nogle vil hade mig for det. Hun elskede ham, foer han blev frygtens konge. Hun saa ham, foer verden saa monsteret. Og fordi hun havde set lyset i ham, kunne hun aldrig helt overbevise sig selv om, at alt haab var doedt.\n\nDette var hendes smerte.\n\nNaar andre sagde, 'Draeb ham,' hoerte hun stadig en fjern stemme fra fortiden, der sagde hendes navn med kaerlighed.\n\nNaar andre sagde, 'Han er kun ond,' huskede hun en ung elver, der bar et faldet blad fra Livstraeet som var det en hellig ed.\n\nMen hun lod ikke sin sorg goere hende blind.\n\nDa Nethrendor truede Elvindalen, stillede hun sig imod ham. Da Den Store Troldekrig bredte sig, valgte hun at handle, selvom det kostede elverliv. Da flygtninge kom, aabnede hun stierne. Da saarede kom, lod hun helligsteder blive til tilflugtssteder. Da moerket hviskede, at alt var hendes skyld, svarede hun ikke med ord, men med handling.\n\nJeg saa hende en nat staa alene ved Livstraeet.\n\nHun troede, jeg sov.\n\nHun lagde panden mod barken og sagde: 'Jeg ved ikke, om jeg kan baere mere.'\n\nTraeet svarede ikke, som traeer goer i eventyr. Ingen lysstraale faldt over hende. Ingen aand viste sig. Hun stod bare der i moerket, lille og traet.\n\nSaa toerrede hun sine oejne.\n\nOg naeste morgen stod hun foran folket med rank ryg.\n\nDet er derfor, jeg skriver dette.\n\nIkke for at goere hende mindre.\n\nFor at goere hende stoerre.\n\nMin mor var ikke en myte. Hun var ikke et symbol. Hun var ikke kun en dronning paa afstand.\n\nHun var en kvinde, der mistede den mand, hun elskede, til moerket. Hun var en mor, der maatte lade sin datter vokse op i en verden af krig. Hun var en hersker, der bar skylden for ting, hun ikke alene havde skabt. Hun var bange mange gange.\n\nOg alligevel valgte hun lyset.\n\nHvis du laeser dette i en tid, hvor skoven igen er moerk, og du spoerger dig selv, om mod betyder, at frygten forsvinder, saa husk min mor.\n\nMod er ikke fravaer af frygt.\n\nMod er at laegge haanden mod det saarede trae og blive staaende."
    }
  },
  iconUrl: "/assets/generated/item/item_book_lore.png",
  kind: "lorebook",
  status: "readable",
  rarity: "legendary",
  value: 160,
  xp: 150,
  mergeLocation: "library",
  summary: "Aeliriel's personal testimony about her mother Eldiria and the burden of protecting Elvindale.",
  story: "My name is Aeliriel.\n\nI write this because people always tell stories about my mother as if she was born from light and never knew doubt. They call her Eldiria the Just. Eldiria the Gentle. Eldiria, Guardian of the Tree of Life. Eldiria, who stood against Nethrendor when others turned their eyes away.\n\nAll of this is true.\n\nBut it is not the whole truth.\n\nMy mother was not strong because she never wept. She was strong because she wept and rose anyway.\n\nI do not remember her first as a queen. I remember her as hands. Warm hands. Hands that braided my hair while council members argued outside. Hands that touched the bark of sick trees and stayed there until the leaves stopped trembling. Hands that once shook so badly after a battle that she hid them in her sleeves, so her people would not lose courage.\n\nMy mother carried Elvindale as others carry a child.\n\nShe knew every path, every spring, every clearing. She could feel when something was wrong. Not with her ears, but with her heart. When a branch broke in the north, she felt it in the south. When dark magic seeped between the roots, she did not sleep.\n\nPeople think her greatest battle was against Nethrendor.\n\nIt was not.\n\nHer greatest battle was against herself.\n\nShe loved him once. This must be written, though some will hate me for it. She loved him before he became the king of fear. She saw him before the world saw the monster. And because she had seen the light in him, she could never fully convince herself that all hope was dead.\n\nThis was her pain.\n\nWhen others said, 'Kill him,' she still heard a distant voice from the past speaking her name with love.\n\nWhen others said, 'He is only evil,' she remembered a young elf carrying a fallen leaf from the Tree of Life as if it were a sacred oath.\n\nBut she did not let sorrow blind her.\n\nWhen Nethrendor threatened Elvindale, she stood against him. When the Great Troll War spread, she chose to act, though it cost elven lives. When refugees came, she opened the paths. When the wounded arrived, she let sacred places become shelters. When darkness whispered that everything was her fault, she answered not with words, but with action.\n\nI saw her one night standing alone beside the Tree of Life.\n\nShe thought I was asleep.\n\nShe pressed her forehead to the bark and said: 'I do not know if I can carry more.'\n\nThe tree did not answer as trees do in tales. No beam of light fell upon her. No spirit appeared. She simply stood there in the dark, small and tired.\n\nThen she dried her eyes.\n\nAnd the next morning she stood before her people with a straight back.\n\nThat is why I write this.\n\nNot to make her smaller.\n\nTo make her greater.\n\nMy mother was not a myth. She was not a symbol. She was not only a distant queen.\n\nShe was a woman who lost the man she loved to darkness. She was a mother who had to let her daughter grow in a world of war. She was a ruler who carried guilt for things she had not made alone. She was afraid many times.\n\nAnd still she chose the light.\n\nIf you read this in a time when the forest is dark again, and you ask yourself whether courage means fear disappears, remember my mother.\n\nCourage is not the absence of fear.\n\nCourage is placing your hand on the wounded tree and remaining there."
},
{
  id: "note_nethrendor_black_decree",
  title: "The Black Decree",
  i18n: {
    da: {
      title: "Den Sorte Forordning",
      summary: "En brutal forordning udsendt under Nethrendors styre i nordskoven.",
      story: "Ved kongelig vilje og uigenkaldelig dom fra Nethrendor, retmaessig hersker over Nordskoven og kommende samler af hele Elvindalen, bekendtgoeres foelgende love med oejeblikkelig virkning:\n\nIngen borger maa baere vaaben efter solnedgang, medmindre vaabnet er udleveret af kongens vagt.\n\nIngen samling paa mere end tre personer maa finde sted uden tilladelse. Sang, boen, fortaelling og mundtlig overlevering regnes som samling, hvis ordene omhandler fortiden, haab, oproer eller Livstraeet.\n\nAlle boeger, skriftruller og runetavler skal afleveres til kongens skrivere. Tekster, der omtaler Eldiria som dronning, beskytter eller retmaessig hersker, skal braendes.\n\nBrug af lysmagi uden kongelig tilladelse straffes med laenkning, forhoer og efterfoelgende tjeneste efter kongens vurdering.\n\nBoern maa ikke oplaeres i gamle elversange. De gamle sange forleder sindet til svaghed.\n\nNavnet Livstraeet maa ikke udtales i offentlige rum. Traeet omtales herefter som Den Sydlige Rodstruktur, indtil det faeldes og erstattes af en mere anvendelig magisk kilde.\n\nHandel med sydskoven er forbudt.\n\nHusly til flygtninge er forbudt.\n\nMedlidenhed med fjender er forbudt.\n\nTvivl er ikke forbudt, men tvivleren skal selv melde sig til renselse, foer tvivlen bliver til forraederi.\n\nEnhver, der skjuler oproerere, helbreder saarede fra sydskoven, beskytter gamle helligsteder eller taler om Nethrendor som andet end konge, skal foeres til borgen og afhoeres.\n\nIngen undtagelser.\n\nOrden er fred.\nFrygt er orden.\nKongen er fred."
    }
  },
  iconUrl: "/assets/generated/item/item_res_scroll.png",
  kind: "lorenote",
  status: "readable",
  rarity: "unique",
  value: 55,
  xp: 35,
  mergeLocation: "library",
  summary: "A harsh decree issued under Nethrendor's rule in the northern forest.",
  story: "By royal will and final judgment of Nethrendor, rightful ruler of the Northern Forest and future unifier of all Elvindale, the following laws are declared effective immediately:\n\nNo citizen may carry weapons after sunset unless the weapon has been issued by the king's guard.\n\nNo gathering of more than three persons may take place without permission. Song, prayer, storytelling, and oral tradition count as gathering if the words concern the past, hope, rebellion, or the Tree of Life.\n\nAll books, scrolls, and rune tablets must be surrendered to the king's scribes. Texts naming Eldiria as queen, protector, or rightful ruler are to be burned.\n\nUse of light magic without royal permission is punishable by chaining, questioning, and later service at the king's discretion.\n\nChildren may not be taught the old elven songs. Old songs lead the mind toward weakness.\n\nThe name Tree of Life may not be spoken in public spaces. The tree shall be referred to as the Southern Root Structure until it is felled and replaced by a more useful magical source.\n\nTrade with the southern forest is forbidden.\n\nShelter for refugees is forbidden.\n\nMercy toward enemies is forbidden.\n\nDoubt is not forbidden, but the doubter must report for cleansing before doubt becomes treason.\n\nAnyone hiding rebels, healing wounded from the south, protecting old sanctuaries, or speaking of Nethrendor as anything but king shall be brought to the fortress and questioned.\n\nNo exceptions.\n\nOrder is peace.\nFear is order.\nThe king is peace."
},
{
  id: "note_mirrorwater_lydrendor_hint",
  title: "A Faint Gleam",
  i18n: {
    da: {
      title: "En Svag Lysning",
      summary: "En skraemt observation, der antyder Lydrendor og et sted, hvor moerket opfoerer sig forkert.",
      story: "Jeg skriver dette, mens mine haender stadig ryster.\n\nJeg ved ikke, om nogen finder noten. Jeg ved heller ikke, om jeg selv toer vende tilbage til stedet. Men hvis nogen goer, saa lyt til mig:\n\nDer findes et sted i nordskoven, hvor moerket ikke opfoerer sig rigtigt.\n\nJeg fandt det ved et tilfaelde. Jeg flygtede fra to af Nethrendors spejdere og forlod stien, selvom alle ved, at man ikke skal forlade stien i hans del af skoven. Jeg loeb gennem torne og doede roedder, indtil jeg faldt ned ad en skraent og landede ved en lille soe.\n\nSoeen var helt stille.\n\nIkke bare rolig. Stille som glas. Selv da vinden roerte traeerne omkring mig, bevaegede vandet sig ikke.\n\nPaa den anden side af soeen stod en gammel ruin. Ikke stor. Maaske kun resterne af et vagttaarn eller et kapel. Over doeren var et tegn, jeg ikke kunne laese. Det lignede Nethrendors maerke, men ikke helt. Linjerne var bloedere. Som om nogen havde tegnet det samme symbol, foer det blev oedelagt.\n\nJeg saa lys derinde.\n\nIkke fakler. Ikke ild. Noget svagt og gyldent, som trak vejret.\n\nSaa hoerte jeg en stemme.\n\nDen sagde ikke mit navn. Den sagde kun:\n\n'Lydrendor sover ikke. Han er blot begravet under sit eget moerke.'\n\nJeg loeb.\n\nDet skammer jeg mig over nu, men jeg loeb.\n\nDa jeg senere spurgte en gammel elver om stedet, blev han bleg og bad mig aldrig naevne det igen. Han sagde, at nogle spejle ikke viser, hvad der er, men hvad der kunne have vaeret. Han sagde ogsaa, at navne kan overleve, selv naar de, der bar dem, er blevet til noget andet.\n\nJeg ved ikke, hvad det betyder.\n\nMen jeg ved, hvad jeg foelte.\n\nFor foerste gang i nordskoven foeltes moerket ikke som en mur.\n\nDet foeltes som et taeppe.\n\nOg under det var der stadig noget, der gloede."
    }
  },
  iconUrl: "/assets/generated/item/item_res_paper.png",
  kind: "lorenote",
  status: "readable",
  rarity: "unique",
  value: 65,
  xp: 50,
  mergeLocation: "library",
  summary: "A frightened observation that hints at Lydrendor and a place where the darkness behaves strangely.",
  story: "I write this while my hands are still shaking.\n\nI do not know whether anyone will find this note. I do not even know if I dare return to the place. But if someone does, listen to me:\n\nThere is a place in the northern forest where the darkness does not behave correctly.\n\nI found it by accident. I was fleeing two of Nethrendor's scouts and left the path, though everyone knows you do not leave the path in his part of the forest. I ran through thorns and dead roots until I fell down a slope and landed beside a small lake.\n\nThe lake was completely still.\n\nNot calm. Still like glass. Even when the wind moved the trees around me, the water did not move.\n\nOn the far side stood an old ruin. Not large. Perhaps the remains of a watchtower or chapel. Above the door was a sign I could not read. It looked like Nethrendor's mark, but not quite. The lines were softer. As if someone had drawn the same symbol before it was broken.\n\nI saw light inside.\n\nNot torches. Not fire. Something faint and golden, breathing.\n\nThen I heard a voice.\n\nIt did not speak my name. It only said:\n\n'Lydrendor does not sleep. He is merely buried beneath his own darkness.'\n\nI ran.\n\nI am ashamed of that now, but I ran.\n\nWhen I later asked an old elf about the place, he went pale and begged me never to mention it again. He said some mirrors do not show what is, but what could have been. He also said names can survive even when those who carried them have become something else.\n\nI do not know what it means.\n\nBut I know what I felt.\n\nFor the first time in the northern forest, the darkness did not feel like a wall.\n\nIt felt like a blanket.\n\nAnd beneath it, something still glowed."
},
{
  id: "note_half_shadow",
  title: "The Same Hand",
  i18n: {
    da: {
      title: "Samme Haand",
      summary: "En meget kort og kryptisk note, der antyder, at den moerke konge og det tabte lys maaske er en og samme person.",
      story: "Jeg saa ham ved daggry.\n\nIkke kongen paa tronen. Ikke skikkelsen med vrede i oejnene og moerke i stemmen. Ikke ham, som vagterne frygter.\n\nJeg saa en anden.\n\nKun et oejeblik.\n\nHan stod ved vandet og roerte ved sit eget spejlbillede, som om han ikke forstod, hvorfor det ikke roerte ved ham foerst.\n\nHans ene haand var sort af magi.\n\nDen anden rystede som en soergende mands.\n\nDa han opdagede mig, blev hans ansigt haardt igen.\n\nMen foer moerket vendte tilbage i hans blik, saa jeg noget andet.\n\nJeg saa en, der genkendte sin egen faengselsdoer indefra.\n\nMaaske findes der ikke to maend.\n\nMaaske findes der kun en, der er blevet delt forkert."
    }
  },
  iconUrl: "/assets/generated/item/item_res_paper.png",
  kind: "lorenote",
  status: "readable",
  rarity: "unique",
  value: 70,
  xp: 45,
  mergeLocation: "library",
  summary: "A very short, cryptic note suggesting that the dark king and the lost light may be one and the same.",
  story: "I saw him at dawn.\n\nNot the king on the throne. Not the figure with anger in his eyes and darkness in his voice. Not the one the guards fear.\n\nI saw another.\n\nOnly for a moment.\n\nHe stood by the water and touched his own reflection, as if he did not understand why it did not touch him first.\n\nOne hand was black with magic.\n\nThe other trembled like the hand of a grieving man.\n\nWhen he noticed me, his face hardened again.\n\nBut before the darkness returned to his eyes, I saw something else.\n\nI saw one who recognized his own prison door from the inside.\n\nPerhaps there are not two men.\n\nPerhaps there is only one, divided wrongly."
},
{
  id: "lore_unnamed_city_foldrik",
  title: "Foldrik and the Mercy of Trolls",
  i18n: {
    da: {
      title: "Foldrik og Troldenes Barmhjertighed",
      summary: "En dyster beretning om en udslettet by under Den Store Troldekrig og en ung trolds uventede barmhjertighed.",
      story: "Ingen husker laengere byens navn.\n\nMaaske blev det braendt vaek sammen med skiltene. Maaske blev det slettet af dem, der overlevede, fordi navnet gjorde for ondt at sige. Maaske var der ingen tilbage til at huske det.\n\nI kroenikerne kaldes den blot Den Unavngivne By.\n\nDen laa ved en lav bakke mellem to handelsveje, omgivet af marker, moeller og smaa haver. Den var ikke vigtig for konger. Den havde ingen store mure, ingen beroemte riddere, ingen helligdomme af betydning. Den var blot et sted, hvor mennesker boede, arbejdede, skaendtes, elskede, bagte broed og troede, at krigen nok ville gaa udenom dem.\n\nMen krigen gaar sjaeldent udenom nogen.\n\nTroldene kom ved solnedgang.\n\nFoerst loed jorden forkert. Ikke som torden, men som trin. Tunge trin. Mange trin. Heste stejlede. Hunde peb. Fuglene forlod tagene paa en gang.\n\nSaa kom raabene.\n\nTrolde i krig er ikke som trolde i gamle boernefortaellinger. De er ikke klodsede kaemper, der lader sig narre af groed. De er staerke, haardfoere og grusomme, naar de drives af frygt, sult eller onde herrers vilje. Under Den Store Troldekrig blev mange af dem drevet af alle tre.\n\nDe broed byens palisader som toerre kviste. De vaeltede huse. De knuste vogne. Maend blev slaaet ned, foer de fik svaerdet fri af skeden. Kvinder og boern flygtede mod kirkepladsen, men ingen hellig mur kunne holde troldehaender ude.\n\nByen faldt paa mindre end en time.\n\nDa natten var moerkest, stod kun flammerne tilbage.\n\nMen midt i oedelaggelsen skete noget, som kroenikeskriverne laenge ikke ville tro paa.\n\nIkke alle trolde draebte.\n\nEn ung trold, mindre end de andre, men stadig stor som en hestetrukket vogn, fandt et barn under et vaeltet tag. Barnet var for lille til at forstaa krig. Det graed ikke engang laengere. Det laa bare stille i stoevet med et stykke roedt stof knuget i haanden.\n\nTrolden loeftede taget.\n\nEt menneske ville have troet, at barnet nu var fortabt.\n\nMen trolden tog barnet op, klodset og forsigtigt, som en bjoern der proever at holde et aeg. Han kiggede sig omkring, som om han vidste, at hvis de andre saa ham, ville de kalde ham svag.\n\nHan bar barnet ud gennem roegen.\n\nEn gammel kone, som havde gemt sig i broenden og senere fortalte dette, sagde at hun hoerte trolden mumle:\n\n'Lille ting skal ikke knuses. Lille ting har ikke gjort Foldrik noget.'\n\nFoldrik.\n\nDet var navnet.\n\nHan gemte barnet bag en stenmur uden for byen. Senere samme nat kom flere overlevende dertil. Ikke mange. Men nok til, at historien ikke doede.\n\nOg Foldrik var ikke den eneste.\n\nEn anden trold lod en saaret hest loebe. En tredje vaeltede bevidst en vogn foran en gruppe flygtninge, ikke for at fange dem, men for at spaerre udsynet fra de vaerste af sine egne. Der var barmhjertighed den nat. Lille, skjult og farlig.\n\nDet aendrede ikke byens skaebne.\n\nDen Unavngivne By blev udslettet.\n\nDens broende blev fyldt med aske. Dens klokke smeltede. Dens marker groede vilde. Dens navn forsvandt.\n\nMen en sandhed overlevede:\n\nTrolde kan vaere grusomme.\n\nMennesker kan vaere grusomme.\n\nElvere kan vaere grusomme.\n\nOg selv i en nat, hvor alt braender, kan en haand vaelge ikke at knuse det, den holder.\n\nDerfor boer Foldriks navn skrives.\n\nIkke som helt.\n\nIkke som synder.\n\nMen som bevis paa, at selv i Den Store Troldekrig var moerket aldrig helt uden spraekker."
    }
  },
  iconUrl: "/assets/generated/item/item_book_lore.png",
  kind: "lorebook",
  status: "readable",
  rarity: "rare",
  value: 110,
  xp: 100,
  mergeLocation: "library",
  summary: "A grim account of a destroyed city during the Great Troll War, and one young troll's unexpected mercy.",
  story: "No one remembers the city's name anymore.\n\nPerhaps it burned with the signs. Perhaps the survivors erased it because the name hurt too much to say. Perhaps no one was left to remember it.\n\nIn the chronicles it is called only the Unnamed City.\n\nIt lay by a low hill between two trade roads, surrounded by fields, mills, and small gardens. It was not important to kings. It had no great walls, no famous knights, no sacred temple of note. It was merely a place where people lived, worked, argued, loved, baked bread, and believed the war would probably pass them by.\n\nBut war rarely passes anyone by.\n\nThe trolls came at sunset.\n\nFirst the ground sounded wrong. Not like thunder, but like steps. Heavy steps. Many steps. Horses reared. Dogs whined. Birds left the roofs all at once.\n\nThen came the shouting.\n\nTrolls in war are not like trolls in children's tales. They are not clumsy giants fooled by bowls of porridge. They are strong, hard to kill, and terrible when driven by fear, hunger, or wicked masters. During the Great Troll War, many were driven by all three.\n\nThey broke the palisade like dry twigs. They toppled houses. They crushed wagons. Men were cut down before they drew their swords. Women and children fled toward the chapel square, but no holy wall could keep troll hands out.\n\nThe city fell in less than an hour.\n\nWhen the night was darkest, only flames remained.\n\nBut in the middle of the ruin, something happened that chroniclers long refused to believe.\n\nNot every troll killed.\n\nA young troll, smaller than the others yet still large as a wagon, found a child beneath a collapsed roof. The child was too young to understand war. It no longer even cried. It lay still in the dust, clutching a piece of red cloth.\n\nThe troll lifted the roof.\n\nA human would have thought the child doomed.\n\nBut the troll picked it up, clumsy and careful, like a bear trying to hold an egg. He looked around as if he knew the others would call him weak if they saw.\n\nHe carried the child through the smoke.\n\nAn old woman hiding in the well later swore she heard the troll mutter:\n\n'Small thing should not be crushed. Small thing has done Foldrik no harm.'\n\nFoldrik.\n\nThat was the name.\n\nHe hid the child behind a stone wall outside the city. Later that night a few survivors found the same place. Not many. But enough for the story to live.\n\nAnd Foldrik was not the only one.\n\nAnother troll let a wounded horse run. A third toppled a wagon before a group of fleeing villagers, not to catch them, but to block them from the sight of worse trolls behind him. There was mercy that night. Small, hidden, and dangerous.\n\nIt did not change the city's fate.\n\nThe Unnamed City was destroyed.\n\nIts wells filled with ash. Its bell melted. Its fields grew wild. Its name vanished.\n\nBut one truth survived:\n\nTrolls can be cruel.\n\nHumans can be cruel.\n\nElves can be cruel.\n\nAnd even in a night where everything burns, one hand can choose not to crush what it holds.\n\nThat is why Foldrik's name should be written.\n\nNot as hero.\n\nNot as sinner.\n\nBut as proof that even during the Great Troll War, the darkness was never without cracks."
},
{
  id: "lore_path_to_eldiriadalen",
  title: "The Path to Eldiriadalen",
  i18n: {
    da: {
      title: "Stien til Eldiriadalen",
      summary: "En families beretning om flugten gennem Nethrendors moerke skov og frelsen i Eldirias land.",
      story: "Vi forlod vores hjem uden at lukke doeren.\n\nDet er den slags detaljer, man husker, naar alt andet bliver uklart. Jeg husker ikke praecis, hvem der raabte foerst. Jeg husker ikke, hvor mange vi var, da vi begyndte at loebe. Jeg husker ikke engang, om jeg bar min yngste soen fra begyndelsen, eller om min mand gav ham til mig senere.\n\nMen jeg husker doeren.\n\nDen stod aaben bag os, som om huset ventede paa, at vi snart kom tilbage.\n\nVi kom aldrig tilbage.\n\nNethrendors skov var ikke altid moerk, sagde de gamle. Jeg troede dem ikke, da jeg var barn. For mig havde den altid vaeret sort. Traeerne voksede taet som faengselsstaenger, og stierne aendrede sig, naar man ikke saa paa dem. Nogle steder hang der klokker af ben i grenene. Andre steder stod gamle skilte, hvor teksten var kradset vaek og erstattet med kongens maerke.\n\nVi flygtede, fordi min mand havde hjulpet en saaret spejder fra sydskoven. Han sagde, det bare var en dreng. En dreng med blod paa skjorten og feber i oejnene. Hvad skulle han have gjort? Ladet ham doe i groeften?\n\nNaeste morgen kom vagterne.\n\nVi saa dem fra marken og loeb.\n\nMin datter Merra bar kun en sko. Min aeldste soen havde en koekkenkniv, som han holdt saa haardt, at hans haand bloedte. Min mand bar en saek med broed, toerrede roedder og det lille traedyr, som vores yngste ikke kunne sove uden.\n\nFoerste nat hvilede vi under en vaeltet eg.\n\nNej. Hvilede er ikke det rigtige ord.\n\nVi lukkede oejnene og lyttede til skoven forsoege at finde os.\n\nDer var lyde mellem traeerne. Ikke dyr. Ikke mennesker. Noget, der efterlignede begge dele. Det hviskede min datters navn med min stemme. Hun begyndte at rejse sig, og jeg maatte holde hende for munden, mens hun graed lydloest.\n\nPaa tredje dagen slap broedet op.\n\nPaa fjerde dagen kom taagen.\n\nMin mand sagde, at hvis vi kunne naa de gamle graensesten, ville Eldirias skov tage imod os. Jeg troede ham ikke laengere. Haab er tungt at baere, naar man er sulten.\n\nMen han havde ret.\n\nVed skumring fandt vi den foerste sten.\n\nDen var naesten skjult af mos. Paa den ene side var Nethrendors maerke ridset dybt ind. Paa den anden side var der et blad. Enkelt. Bloedt. Naesten usynligt.\n\nMin mand faldt paa knae.\n\n'Vi er taet paa,' sagde han.\n\nDet var da, skyggerne kom.\n\nTre af Nethrendors vaesner broed frem mellem traeerne. Jeg ved ikke, hvad de var. De havde arme som elvere, men bevaegede sig forkert. Deres ansigter var daekket af moerk bark, og i revnerne gloede noget sygt groent.\n\nMin mand stillede sig foran os med koekkenkniven.\n\nJeg ville gerne skrive, at han kaempede som en helt.\n\nSandheden er, at han var bange.\n\nMen han blev staaende.\n\nSaa begyndte skoven at synge.\n\nIkke hoejt. Ikke som musik fra en kro. Det var mere som blade, der huskede vinden. Lys gled mellem stammerne. Foerst troede jeg, det var daggry, men lyset kom nedefra. Fra roedderne. Fra mosset. Fra selve jorden.\n\nVaesnerne skreg og trak sig tilbage.\n\nOg mellem traeerne stod tre elvere i groenne kapper.\n\nDe spurgte ikke, om vi var vaerdige. De bad ikke om betaling. De tog bare boernene op, stoettede min mand og foerte os over graensen.\n\nJeg husker oejeblikket, hvor moerket slap.\n\nLuften aendrede sig.\n\nIkke helt. Sorg forsvinder ikke, bare fordi traeerne bliver groennere. Men jeg kunne traekke vejret uden at foele, at noget trak vejret tilbage i min nakke.\n\nEldiriadalen reddede os.\n\nEldiria saa os dagen efter. Ikke fra en trone, men ved en helbreders telt. Hun lagde haanden paa min yngste soens pande og sagde, at han ville leve.\n\nJeg graed foerst der.\n\nIkke da vi loeb.\n\nIkke da vagterne kom.\n\nIkke da skyggerne hviskede min datters navn.\n\nFoerst da nogen sagde, at mit barn ville leve.\n\nHvis du finder denne bog, og du er paa flugt gennem moerket, saa soeg graensestenene. Soeg bladet under mosset. Soeg den sti, der foeles varmere end de andre.\n\nOg hvis skoven begynder at synge, saa loeb ikke.\n\nLyt.\n\nDu er naesten fremme."
    }
  },
  iconUrl: "/assets/generated/item/item_book_lore_moonlight.png",
  kind: "lorebook",
  status: "readable",
  rarity: "rare",
  value: 115,
  xp: 100,
  mergeLocation: "library",
  summary: "A family's account of fleeing through Nethrendor's dark forest and finding safety in Eldiria's lands.",
  story: "We left our home without closing the door.\n\nThat is the kind of detail one remembers when everything else becomes unclear. I do not remember who shouted first. I do not remember how many we were when we began to run. I do not even remember whether I carried my youngest son from the start, or whether my husband gave him to me later.\n\nBut I remember the door.\n\nIt stood open behind us, as if the house expected us to return soon.\n\nWe never returned.\n\nNethrendor's forest was not always dark, the elders said. I did not believe them as a child. To me it had always been black. The trees grew close like prison bars, and the paths changed when you were not looking. In some places, bells made of bone hung in the branches. In others, old signs had been scraped clean and marked with the king's symbol.\n\nWe fled because my husband had helped a wounded scout from the southern forest. He said it was only a boy. A boy with blood on his shirt and fever in his eyes. What should he have done? Left him to die in the ditch?\n\nThe next morning the guards came.\n\nWe saw them from the field and ran.\n\nMy daughter Merra wore only one shoe. My eldest son carried a kitchen knife so tightly that his hand bled. My husband carried a sack of bread, dried roots, and the little wooden animal our youngest could not sleep without.\n\nThe first night we rested beneath a fallen oak.\n\nNo. Rested is not the right word.\n\nWe closed our eyes and listened to the forest trying to find us.\n\nThere were sounds among the trees. Not animals. Not people. Something that imitated both. It whispered my daughter's name in my voice. She began to rise, and I had to hold her mouth while she cried without sound.\n\nOn the third day the bread ran out.\n\nOn the fourth day the mist came.\n\nMy husband said that if we could reach the old border stones, Eldiria's forest would take us in. I no longer believed him. Hope is heavy to carry when one is hungry.\n\nBut he was right.\n\nAt dusk we found the first stone.\n\nIt was almost hidden by moss. On one side, Nethrendor's mark had been cut deep. On the other, there was a leaf. Simple. Soft. Almost invisible.\n\nMy husband fell to his knees.\n\n'We are close,' he said.\n\nThat was when the shadows came.\n\nThree of Nethrendor's creatures emerged between the trees. I do not know what they were. They had arms like elves, but moved wrongly. Their faces were covered in dark bark, and something sickly green glowed in the cracks.\n\nMy husband stood before us with the kitchen knife.\n\nI wish I could write that he fought like a hero.\n\nThe truth is he was afraid.\n\nBut he stood there.\n\nThen the forest began to sing.\n\nNot loudly. Not like music from an inn. More like leaves remembering the wind. Light moved between the trunks. At first I thought it was dawn, but the light came from below. From the roots. From the moss. From the earth itself.\n\nThe creatures screamed and withdrew.\n\nAnd between the trees stood three elves in green cloaks.\n\nThey did not ask whether we were worthy. They did not ask for payment. They simply lifted the children, supported my husband, and led us across the border.\n\nI remember the moment the darkness let go.\n\nThe air changed.\n\nNot entirely. Sorrow does not vanish because the trees grow greener. But I could breathe without feeling something breathing back against my neck.\n\nEldiriadalen saved us.\n\nEldiria saw us the next day. Not from a throne, but beside a healer's tent. She placed her hand on my youngest son's forehead and said he would live.\n\nThat was when I cried.\n\nNot when we ran.\n\nNot when the guards came.\n\nNot when the shadows whispered my daughter's name.\n\nOnly when someone said my child would live.\n\nIf you find this book and you are fleeing through darkness, seek the border stones. Seek the leaf beneath the moss. Seek the path that feels warmer than the others.\n\nAnd if the forest begins to sing, do not run.\n\nListen.\n\nYou are almost there."
},
{
  id: "letter_evan_to_maren",
  title: "To My Dearest Maren",
  i18n: {
    da: {
      title: "Til Min Kaere Maren",
      summary: "En bondes sidste brev til sin kone, skrevet fra slagmarken under Den Store Troldekrig.",
      story: "Min kaere Maren,\n\nHvis dette brev naar dig, er det fordi en venlig sjael har fundet det paa mig og valgt at goere det rette. Jeg beder dig ikke hade budbringeren. Den, der baerer daarlige nyheder, har ofte tungere haender end den, der skriver dem.\n\nJeg ved ikke, om jeg ser solen staa op igen.\n\nDer er stille lige nu. Det er det vaerste. Ikke kampens larm, ikke troldenes broel, ikke skrigene fra maend, der kalder paa deres moedre, selvom de for laengst selv er faedre. Stilheden er vaerst, fordi den giver tankerne plads.\n\nOg mine tanker gaar til dig.\n\nTil vores lille hus.\n\nTil laagen, der aldrig lukker ordentligt, selvom jeg tre gange har sagt, at jeg nok skal fikse den.\n\nTil marken bag broenden, hvor rugen altid staar lidt skaevt, fordi jorden er staedig.\n\nTil din maade at synge paa, naar du tror, ingen hoerer det.\n\nJeg ville oenske, jeg havde sunget med noget oftere.\n\nDe siger, vi holder linjen til daggry. Det siger kaptajnen. Han er en god mand, saa jeg tror, han siger det for vores skyld. Vi ved alle, hvad der kommer, naar moerket falder helt. Troldene samler sig ved bakken. Vi kan hoere dem flytte sten og traestammer. De bygger noget. Eller ogsaa goer de sig bare klar til at knuse os.\n\nJeg er ikke nogen helt, Maren.\n\nDet ved du.\n\nJeg meldte mig ikke, fordi jeg laengtes efter aere. Jeg meldte mig, fordi krigen rykkede taettere paa vores hjem, og fordi jeg ikke kunne holde ud at taenke paa, at du skulle hoere de trin ved vores egen doer.\n\nJeg er bange.\n\nDet skriver jeg, fordi du altid kunne kende, naar jeg loej.\n\nJeg er saa bange, at mine haender ryster, og blaekket klatter. Men jeg bliver her. Ikke for kongen. Ikke for fanen. Ikke for maendenes sange.\n\nFor dig.\n\nFor vores hjem.\n\nFor den lille plet jord, hvor vi plantede aebletraeet, selvom naboen sagde, det aldrig ville baere frugt.\n\nHvis jeg ikke kommer hjem, saa saelg min fars gamle plov. Den er mere vaerd, end han nogensinde indroemmede. Giv min jakke til Tomas, hvis han stadig kan bruge den. Og behold min traekniv. Den med det daarlige haandtag. Jeg ved, du hader den, men jeg lavede den den vinter, hvor sneen lukkede os inde, og vi levede af suppe og staedighed.\n\nJeg ville gerne have haft flere aar med dig.\n\nJeg ville gerne have set graat haar i dit.\n\nJeg ville gerne have brokket mig over ryggen, mens du sagde, at jeg selv var ude om det.\n\nJeg ville gerne have fikset laagen.\n\nHvis jeg faar lov at bede om noget, saa er det dette:\n\nLev.\n\nIkke bare overlev, fordi jeg er borte. Lev rigtigt. Gaa til markedet. Skaeld ud paa moelleren. Syng, naar du tror, ingen hoerer det. Plant noget ved siden af aebletraeet.\n\nOg fortael mig ikke som en modig mand.\n\nFortael mig som din mand.\n\nDet er nok for mig.\n\nJeg hoerer hornet nu.\n\nDe kalder os frem.\n\nJeg laegger brevet i inderlommen. Taet ved hjertet. Det er der, du altid har vaeret.\n\nDin,\nEvan"
    }
  },
  iconUrl: "/assets/generated/item/item_quest_letter.png",
  kind: "lorenote",
  status: "readable",
  rarity: "unique",
  value: 75,
  xp: 60,
  mergeLocation: "library",
  summary: "A farmer's final letter to his wife, written from the battlefield during the Great Troll War.",
  story: "My dearest Maren,\n\nIf this letter reaches you, it is because a kind soul found it on me and chose to do the right thing. Do not hate the messenger. The one who carries bad news often has heavier hands than the one who writes it.\n\nI do not know whether I will see the sun rise again.\n\nIt is quiet now. That is the worst part. Not the noise of battle, not the roaring of trolls, not the cries of men calling for their mothers though they have long since become fathers themselves. The quiet is worst because it gives thoughts room.\n\nAnd my thoughts go to you.\n\nTo our little house.\n\nTo the gate that never closes properly, though I have said three times that I will fix it.\n\nTo the field behind the well, where the rye always grows a little crooked because the soil is stubborn.\n\nTo the way you sing when you think no one hears.\n\nI wish I had sung with you more often.\n\nThey say we hold the line until dawn. The captain says so. He is a good man, so I think he says it for our sake. We all know what comes when darkness fully falls. The trolls gather by the hill. We can hear them moving stones and timber. They are building something. Or perhaps they are only preparing to crush us.\n\nI am no hero, Maren.\n\nYou know that.\n\nI did not join because I longed for glory. I joined because the war moved closer to our home, and because I could not bear the thought of you hearing those steps at our own door.\n\nI am afraid.\n\nI write that because you always knew when I lied.\n\nI am so afraid that my hands shake and the ink blots. But I stay here. Not for the king. Not for the banner. Not for men's songs.\n\nFor you.\n\nFor our home.\n\nFor the little patch of earth where we planted the apple tree, though the neighbor said it would never bear fruit.\n\nIf I do not come home, sell my father's old plow. It is worth more than he ever admitted. Give my jacket to Tomas if it still fits him. And keep my wooden knife. The one with the bad handle. I know you hate it, but I made it during the winter when snow trapped us inside, and we lived on soup and stubbornness.\n\nI would have liked more years with you.\n\nI would have liked to see gray in your hair.\n\nI would have liked to complain about my back while you told me it was my own fault.\n\nI would have liked to fix the gate.\n\nIf I may ask one thing, it is this:\n\nLive.\n\nDo not merely survive because I am gone. Live properly. Go to market. Scold the miller. Sing when you think no one hears. Plant something beside the apple tree.\n\nAnd do not tell of me as a brave man.\n\nTell of me as your husband.\n\nThat is enough for me.\n\nI hear the horn now.\n\nThey are calling us forward.\n\nI place the letter inside my coat. Close to the heart. That is where you have always been.\n\nYours,\nEvan"
},
{
  id: "lore_arachnogrim_origin",
  title: "The Eight Legs from the Dark",
  i18n: {
    da: {
      title: "De Otte Ben fra Moerket",
      summary: "En dyster undersoegelse af Arachnogrims oprindelse, natur og mulige forbindelse til Nethrendors moerke magi.",
      story: "Der findes skabninger, som naturen selv frembringer.\n\nUlve, der jager i flok. Bjoerne, der vogter deres unger. Edderkopper, der vaever net mellem grene og sten. Farlige, ja, men aerlige i deres farlighed. De draeber for foede, for forsvar, for livets gamle orden.\n\nArachnogrim er ikke saadan.\n\nArachnogrim er en forvanskning. Et brud. En skabning, der baerer naturens form, men ikke dens fred.\n\nDe foerste sikre beretninger stammer fra tiden kort foer Den Druknede Bys fald. Handelsfolk begyndte at tale om store spor i mudderet ved de nordlige havnelagre. Ikke hestespor, ikke kloeer, men dybe punktmaerker i raekker af otte. Vagter forsvandt. Hunde naegtede at gaa ned mod kajen. Fiskere fandt net, der ikke var deres egne, spaendt ud mellem paele og hustage.\n\nFoerst troede man, at det var almindelige kaempeedderkopper fra de moerkere dele af Elvindalen.\n\nDet var en farlig fejltagelse.\n\nEn almindelig kaempeedderkop er et dyr. Den kan lokkes, skraemmes, sultes eller draebes. Arachnogrim taenker. Ikke som mennesker. Ikke som elvere. Men den vurderer. Den husker. Den venter.\n\nDens krop ligner edderkoppens, men forvredet til en stoerrelse, hvor selv unge individer kan vaelte vogne og bryde doere. Dens oejne lyser roedt i moerke, ikke fordi de reflekterer lys, men fordi noget indeni dem aldrig helt sover. Dens gift er ikke kun doedelig. Den kan lamme muskler, sloeve tanker og i nogle tilfaelde efterlade ofre vaagne, men ude af stand til at skrige.\n\nDet aeldste elverskrift om vaesnet kalder det 'Nethrendors fejlslagne vaev.'\n\nIfolge denne teori opstod Arachnogrim ikke naturligt, men som et resultat af moerk magi udfoert paa skovens aeldste edderkoppearter. Nethrendor soegte soldater, der ikke stillede spoergsmaal, ikke kraevede loen og ikke kendte frygt. Han studerede edderkoppens taalmodighed, dens net, dens evne til at maerke selv den mindste bevaegelse.\n\nMen moerk magi skaber sjaeldent det, magikeren oensker.\n\nDen skaber det, magikeren fortjener.\n\nArachnogrim blev staerkere end planlagt. Klogere end planlagt. Og vigtigst af alt: mindre lydig. Hvis Nethrendor virkelig skabte de foerste, mistede han hurtigt kontrollen over dem.\n\nNogle mener, at de flygtede gennem underjordiske gange og slog sig ned under Den Druknede By. Andre haevder, at de kom fra bjergene og blot blev tiltrukket af byens doed og fugtige ruiner. En tredje teori, som kun faa toer skrive ned, siger at Arachnogrim ikke blev skabt af Nethrendor alene, men af noget, han selv fandt i moerket. Noget aeldre end elverne. Noget, der laerte ham at vaeve liv forkert.\n\nDer findes ogsaa beretninger om stoerre former.\n\nLangt stoerre.\n\nDe fleste affejer dem som skroener fra skraemte rejsende. Men i gamle bjergkroeniker naevnes 'moderoejne saa brede som porte' og 'ben, der spaender over kloefter.' Hvis disse beretninger er sande, er de Arachnogrims, man moeder naer overfladen, kun afkom.\n\nUnge.\n\nDet er en ubehagelig tanke.\n\nMen den forklarer, hvorfor selv en tilsyneladende ensom Arachnogrim ofte efterfoelges af mindre rystelser i jorden, svage ekkoer i tunneler og net, der dukker op, hvor ingen edderkop burde have vaeret.\n\nFor hvor der findes en unge, findes der som regel en rede.\n\nOg hvor der findes en rede, findes der en moder.\n\nHvis du moeder Arachnogrim, saa husk tre ting:\n\nFor det foerste: Kaemp ikke i moerke, hvis du kan skabe lys.\n\nFor det andet: Tro aldrig, at den flygter, blot fordi den traekker sig tilbage.\n\nFor det tredje: Hvis du hoerer klik fra stenene omkring dig, er du allerede i dens net.\n\nMaaske kan Arachnogrim draebes.\n\nMen intet i de gamle skrifter tyder paa, at arten kan udryddes.\n\nFor nogle moerke ting laegger ikke bare aeg i huler.\n\nDe laegger aeg i verdens fejl."
    }
  },
  iconUrl: "/assets/generated/item/item_book_lore.png",
  kind: "lorebook",
  status: "readable",
  rarity: "legendary",
  value: 175,
  xp: 170,
  mergeLocation: "library",
  summary: "A grim study of Arachnogrim's origin, nature, and possible link to Nethrendor's dark magic.",
  story: "There are creatures that nature itself brings forth.\n\nWolves that hunt in packs. Bears that guard their young. Spiders that weave between branches and stone. Dangerous, yes, but honest in their danger. They kill for food, for defense, for the old order of life.\n\nArachnogrim is not such a creature.\n\nArachnogrim is a corruption. A break. A thing that carries nature's shape, but not its peace.\n\nThe first reliable accounts come from the years shortly before the fall of the Sunken City. Traders began speaking of great tracks in the mud near the northern harbor stores. Not hoofprints. Not claws. Deep pointed marks in rows of eight. Guards vanished. Dogs refused to go near the docks. Fishermen found webs that were not theirs, stretched between posts and rooftops.\n\nAt first, people believed it to be ordinary giant spiders from the darker parts of Elvindale.\n\nThat was a dangerous mistake.\n\nAn ordinary giant spider is an animal. It can be lured, frightened, starved, or killed. Arachnogrim thinks. Not like humans. Not like elves. But it judges. It remembers. It waits.\n\nIts body resembles that of a spider, but twisted into such size that even young specimens can overturn wagons and break doors. Its eyes glow red in darkness, not because they reflect light, but because something inside them never fully sleeps. Its venom is not only deadly. It can paralyze muscle, dull thought, and in some cases leave victims awake but unable to scream.\n\nThe oldest elven writing about the creature calls it 'Nethrendor's failed weave.'\n\nAccording to that theory, Arachnogrim did not arise naturally, but as the result of dark magic performed upon the oldest spider species of the forest. Nethrendor sought soldiers that asked no questions, demanded no pay, and knew no fear. He studied the spider's patience, its web, its ability to feel even the smallest movement.\n\nBut dark magic rarely creates what the mage wants.\n\nIt creates what the mage deserves.\n\nArachnogrim became stronger than planned. Smarter than planned. And most importantly: less obedient. If Nethrendor truly created the first of them, he quickly lost control.\n\nSome believe they fled through underground passages and nested beneath the Sunken City. Others say they came from the mountains and were merely drawn to the city's death and wet ruins. A third theory, which few dare write down, says Arachnogrim was not created by Nethrendor alone, but by something he found in the dark. Something older than elves. Something that taught him to weave life wrongly.\n\nThere are also accounts of larger forms.\n\nFar larger.\n\nMost dismiss them as tales from frightened travelers. But old mountain chronicles mention 'mother eyes wide as gates' and 'legs spanning ravines.' If those reports are true, the Arachnogrims found near the surface are only offspring.\n\nYoung.\n\nThat is an unpleasant thought.\n\nBut it explains why even a seemingly lone Arachnogrim is often followed by faint tremors in the ground, echoes in tunnels, and webs appearing where no spider should have been.\n\nWhere there is one youngling, there is usually a nest.\n\nAnd where there is a nest, there is a mother.\n\nIf you meet Arachnogrim, remember three things:\n\nFirst: Do not fight in darkness if you can create light.\n\nSecond: Never believe it is fleeing merely because it withdraws.\n\nThird: If you hear clicking from the stones around you, you are already in its web.\n\nPerhaps Arachnogrim can be killed.\n\nBut nothing in the old writings suggests the species can be destroyed.\n\nSome dark things do not merely lay eggs in caves.\n\nThey lay eggs in the world's mistakes."
},
];

export const READABLE_DEF_BY_ID = Object.fromEntries(READABLE_ITEM_DEFS.map((entry) => [entry.id, entry]));
