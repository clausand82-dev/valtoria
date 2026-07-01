export const SKILL_TREE_BRANCHES = [
  {
    id: "survival",
    title: "Survival",
    description: "Small defensive upgrades for a warrior who survives longer fights.",
    i18n: { da: { title: "Overlevelse", description: "Smaa defensive opgraderinger til en kriger, der overlever laengere kampe." } },
    nodes: [
      { id: "iron_body", title: "Iron Body", i18n: { da: { title: "Jernkrop", description: "+3% maks HP per rank." } }, maxRank: 5, description: "+3% max HP per rank.", bonuses: { maxHpPct: 0.03 } },
      { id: "reinforced_guard", title: "Reinforced Guard", i18n: { da: { title: "Forstaerket Vaern", description: "+2 armor per rank." } }, maxRank: 5, requiresBranchPoints: 3, description: "+2 armor per rank.", bonuses: { armorFlat: 2 } },
      { id: "brace", title: "Brace", i18n: { da: { title: "Afstivning", description: "+1% block chance per rank." } }, maxRank: 5, requiresBranchPoints: 6, description: "+1% block chance per rank.", bonuses: { blockChance: 0.01 } },
      { id: "hard_to_kill", title: "Hard to Kill", i18n: { da: { title: "Svaer at Draebe", description: "+4% maks HP og +1 armor per rank." } }, maxRank: 3, requiresBranchPoints: 10, description: "+4% max HP and +1 armor per rank.", bonuses: { maxHpPct: 0.04, armorFlat: 1 } },
    ],
  },
  {
    id: "combat",
    title: "Combat",
    description: "Direct weapon improvements for damage and tempo.",
    i18n: { da: { title: "Kamp", description: "Direkte vaabenforbedringer til skade og tempo." } },
    nodes: [
      { id: "sharpened_edge", title: "Sharpened Edge", i18n: { da: { title: "Skaerpet Egg", description: "+2% skade per rank." } }, maxRank: 5, description: "+2% damage per rank.", bonuses: { damagePct: 0.02 } },
      { id: "battle_rhythm", title: "Battle Rhythm", i18n: { da: { title: "Kamprytme", description: "+1% attack speed per rank." } }, maxRank: 5, requiresBranchPoints: 3, description: "+1% attack speed per rank.", bonuses: { attackSpeed: 0.01 } },
      { id: "weak_spot", title: "Weak Spot", i18n: { da: { title: "Svagt Punkt", description: "+1% critical chance per rank." } }, maxRank: 5, requiresBranchPoints: 6, description: "+1% critical chance per rank.", bonuses: { critChance: 0.01 } },
      { id: "heavy_blows", title: "Heavy Blows", i18n: { da: { title: "Tunge Slag", description: "+10% critical damage per rank." } }, maxRank: 3, requiresBranchPoints: 10, description: "+10% critical damage per rank.", bonuses: { critDamage: 0.10 } },
    ],
  },
  {
    id: "scavenging",
    title: "Scavenging",
    description: "Better rewards from fighting and exploring.",
    i18n: { da: { title: "Indsamling", description: "Bedre beloenninger fra kamp og udforskning." } },
    nodes: [
      { id: "coin_sense", title: "Coin Sense", i18n: { da: { title: "Myntesans", description: "+5% gold find per rank." } }, maxRank: 5, description: "+5% gold find per rank.", bonuses: { goldFind: 0.05 } },
      { id: "salvager", title: "Salvager", i18n: { da: { title: "Skrothenter", description: "+5% resource find per rank." } }, maxRank: 5, requiresBranchPoints: 3, description: "+5% resource find per rank.", bonuses: { resourceFind: 0.05 } },
      { id: "gem_eye", title: "Gem Eye", i18n: { da: { title: "Aedelstensoeje", description: "+2% magic find per rank." } }, maxRank: 5, requiresBranchPoints: 6, description: "+2% magic find per rank.", bonuses: { magicFind: 0.02 } },
      { id: "spoils_of_war", title: "Spoils of War", i18n: { da: { title: "Krigsbytte", description: "+4% magic find og +3% gold find per rank." } }, maxRank: 3, requiresBranchPoints: 10, description: "+4% magic find and +3% gold find per rank.", bonuses: { magicFind: 0.04, goldFind: 0.03 } },
    ],
  },
  {
    id: "discipline",
    title: "Discipline",
    description: "Long-term training, learning, and battlefield control.",
    i18n: { da: { title: "Disciplin", description: "Langsigtet traening, laering og kontrol paa slagmarken." } },
    nodes: [
      { id: "veteran_instinct", title: "Veteran Instinct", i18n: { da: { title: "Veteraninstinkt", description: "+3% XP gain per rank." } }, maxRank: 5, description: "+3% XP gain per rank.", bonuses: { xpGain: 0.03 } },
      { id: "quick_step", title: "Quick Step", i18n: { da: { title: "Hurtigt Skridt", description: "+1% movement speed per rank." } }, maxRank: 5, requiresBranchPoints: 3, description: "+1% movement speed per rank.", bonuses: { speedPct: 0.01 } },
      { id: "arcane_tolerance", title: "Arcane Tolerance", i18n: { da: { title: "Arkan Tolerance", description: "+3% maks mana per rank." } }, maxRank: 5, requiresBranchPoints: 6, description: "+3% max mana per rank.", bonuses: { maxManaPct: 0.03 } },
      { id: "blood_focus", title: "Blood Focus", i18n: { da: { title: "Blodfokus", description: "+1% life steal per rank." } }, maxRank: 3, requiresBranchPoints: 10, description: "+1% life steal per rank.", bonuses: { lifeSteal: 0.01 } },
    ],
  },
];

export const SKILL_TREE_NODE_BY_ID = Object.fromEntries(
  SKILL_TREE_BRANCHES.flatMap((branch) => branch.nodes.map((node) => [node.id, { ...node, branchId: branch.id }])),
);

export function normalizeSkillTree(tree) {
  const source = tree && typeof tree === "object" ? tree : {};
  return Object.fromEntries(Object.keys(SKILL_TREE_NODE_BY_ID).map((nodeId) => {
    const maxRank = SKILL_TREE_NODE_BY_ID[nodeId].maxRank;
    return [nodeId, Math.max(0, Math.min(maxRank, Math.floor(Number(source[nodeId]) || 0)))];
  }));
}

export function skillTreeSpentPoints(tree) {
  const normalized = normalizeSkillTree(tree);
  return Object.values(normalized).reduce((sum, rank) => sum + rank, 0);
}

export function skillTreeAvailablePoints(level, tree) {
  return Math.max(0, Math.floor(Number(level) || 1) - 1 - skillTreeSpentPoints(tree));
}

export function skillTreeBranchSpentPoints(tree, branchId) {
  const normalized = normalizeSkillTree(tree);
  const branch = SKILL_TREE_BRANCHES.find((entry) => entry.id === branchId);
  if (!branch) return 0;
  return branch.nodes.reduce((sum, node) => sum + (normalized[node.id] ?? 0), 0);
}

export function skillTreeBonuses(tree) {
  const normalized = normalizeSkillTree(tree);
  const bonuses = {};
  for (const [nodeId, rank] of Object.entries(normalized)) {
    if (rank <= 0) continue;
    const node = SKILL_TREE_NODE_BY_ID[nodeId];
    for (const [key, value] of Object.entries(node?.bonuses ?? {})) {
      bonuses[key] = (bonuses[key] ?? 0) + value * rank;
    }
  }
  return bonuses;
}
