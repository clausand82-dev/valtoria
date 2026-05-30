export const FACTIONS = {
  village_outskirt: {
    id: "village_outskirt",
    label: "Village Outskirt",
    description: "The struggling settlement where the hero's journey begins.",
    defaultRep: 0,
  },

  eldiria_court: {
    id: "eldiria_court",
    label: "Eldiria's Court",
    description: "The southern elven court loyal to Eldiria and the protection of Elvindalen.",
    defaultRep: 0,
  },

  life_tree_guardians: {
    id: "life_tree_guardians",
    label: "Life Tree Guardians",
    description: "Protectors of the Life Tree and the light balance of Elvindalen.",
    defaultRep: 0,
  },

  sunken_city: {
    id: "sunken_city",
    label: "The Sunken City",
    description: "Remnants, survivors, and forces tied to the flooded northern city.",
    defaultRep: 0,
  },

  nethrendor_regime: {
    id: "nethrendor_regime",
    label: "Nethrendor's Regime",
    description: "Nethrendor's soldiers, servants, spies, and corrupted forces.",
    defaultRep: 0,
  },

  tornvalhed_trolls: {
    id: "tornvalhed_trolls",
    label: "Tornvalhed Trolls",
    description: "The troll remnants and clans tied to Tornvalhed.",
    defaultRep: 0,
  },

  wilds: {
    id: "wilds",
    label: "The Wilds",
    description: "Natural hostile wildlife and wilderness creatures.",
    defaultRep: 0,
    hidden: true,
  },

  corrupted_wilds: {
    id: "corrupted_wilds",
    label: "Corrupted Wilds",
    description: "Wild creatures affected by corruption, dark magic, or Net'dra'thot.",
    defaultRep: 0,
    hidden: true,
  },
};

const warnedFactionIds = new Set();

function devWarnUnknownFaction(factionId) {
  const id = String(factionId ?? "").trim();
  if (!id || FACTIONS[id] || warnedFactionIds.has(id)) return;
  warnedFactionIds.add(id);
  console.warn(`[factions] Unknown factionId '${id}'. Add it to faction-config.js before relying on reputation or conditions.`);
}

export function normalizeFactionRep(input = {}) {
  const rep = {};
  for (const [factionId, faction] of Object.entries(FACTIONS)) {
    const raw = input && typeof input === "object" ? input[factionId] : undefined;
    rep[factionId] = Number.isFinite(Number(raw)) ? Number(raw) : Number(faction.defaultRep) || 0;
  }
  if (input && typeof input === "object") {
    for (const [factionId, value] of Object.entries(input)) {
      if (FACTIONS[factionId]) continue;
      devWarnUnknownFaction(factionId);
      if (Number.isFinite(Number(value))) rep[factionId] = Number(value);
    }
  }
  return rep;
}

export function getFactionRepFrom(playerOrRep, factionId) {
  const id = String(factionId ?? "").trim();
  if (!id) return 0;
  devWarnUnknownFaction(id);
  const source = playerOrRep?.factionRep ?? playerOrRep ?? {};
  const normalized = normalizeFactionRep(source);
  return Number(normalized[id]) || 0;
}

export function setFactionRepOnPlayer(player, factionId, value) {
  if (!player) return 0;
  const id = String(factionId ?? "").trim();
  if (!id) return 0;
  devWarnUnknownFaction(id);
  player.factionRep = normalizeFactionRep(player.factionRep);
  player.factionRep[id] = Number.isFinite(Number(value)) ? Number(value) : 0;
  return player.factionRep[id];
}

export function addFactionRepOnPlayer(player, factionId, amount) {
  const current = getFactionRepFrom(player, factionId);
  return setFactionRepOnPlayer(player, factionId, current + (Number(amount) || 0));
}

export function applyFactionRepEffects(player, factionRep = {}) {
  if (!player || !factionRep || typeof factionRep !== "object" || Array.isArray(factionRep)) return {};
  const applied = {};
  for (const [factionId, amount] of Object.entries(factionRep)) {
    const delta = Number(amount) || 0;
    if (!delta) continue;
    applied[factionId] = addFactionRepOnPlayer(player, factionId, delta);
  }
  return applied;
}

export function getKnownFactions(options = {}) {
  const includeHidden = Boolean(options.includeHidden);
  return Object.values(FACTIONS).filter((faction) => includeHidden || !faction.hidden);
}
