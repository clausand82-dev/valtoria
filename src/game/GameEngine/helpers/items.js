import {
  MAX_INVENTORY,
  PREFIXES,
  RARITIES,
  createId,
  itemValue,
  makeItem,
  clamp,
  RESOURCE_DEFS,
  RESOURCE_MERGE_RECIPES,
  RESOURCE_RARITY_COLOR,
  READABLE_DEF_BY_ID,
  READABLE_ITEM_DEFS,
  canMergeItem,
  isPotionItem,
  isQuestItem,
  isReadableItem,
  isResourceItem,
  withItemFlags,
  withItemIcon
} from "../dependencies.js";

export function rollItemOfRarity(level, rarityId, tries = 60) {
  const wanted = RARITIES.find((entry) => entry.id === rarityId);
  if (!wanted) return null;

  for (let i = 0; i < tries; i += 1) {
    const item = makeItem(level, Math.random());
    if (item.rarity === rarityId) return item;
  }

  // Fallback: force rarity to guarantee drop quality for configured object loot.
  const fallback = makeItem(level, Math.random());
  fallback.rarity = wanted.id;
  fallback.rarityLabel = wanted.label;
  fallback.rarityColor = wanted.color;
  const prefixes = PREFIXES[wanted.id] ?? [];
  if (prefixes.length > 0 && fallback.baseName) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    fallback.name = `${prefix} ${fallback.baseName}`;
  }
  fallback.value = itemValue(fallback);
  return fallback;
}

export function itemsCanMerge(a, b) {
  if (!a || !b) return false;
  if (isPotionItem(a) || isPotionItem(b)) return false;
  if (isResourceItem(a) || isResourceItem(b)) return false;
  if (!canMergeItem(a) || !canMergeItem(b)) return false;
  if (a.unique || b.unique || a.named || b.named) return false;
  return a.baseName === b.baseName
    && a.rarity === b.rarity
    && a.slot === b.slot
    && a.mode === b.mode;
}

export function itemIconIndex(item) {
  if (isResourceItem(item)) return item.iconIndex ?? RESOURCE_DEFS[item.resourceId]?.iconIndex ?? 0;
  if (itemIconSheet(item) === "armor") {
    const armorMap = {
      Helm: 0,
      Gorget: 1,
      Chestplate: 2,
      Vambraces: 3,
      Greaves: 4,
      Bracelet: 8,
      Boots: 9,
      Gloves: 10,
      Pauldrons: 5,
      Cape: 6,
      Belt: 7,
      Relic: 11,
    };
    return armorMap[item?.baseName] ?? 2;
  }

  const map = {
    Sword: 0,
    Spear: 1,
    Javelin: 1,
    Dagger: 2,
    "Mana Potion": 3,
    "Health Potion": 4,
    Crossbow: 8,
    Bow: 9,
    "Rune Staff": 10,
    "Spell Mask": 11,
    Ring: 6,
    Amulet: 7,
    Gorget: 7,
    Bracelet: 7,
    Helm: 11,
    Chestplate: 11,
    Vambraces: 11,
    Greaves: 11,
    Boots: 11,
    Gloves: 11,
    Pauldrons: 11,
    Cape: 11,
    Belt: 11,
    Relic: 11,
  };
  return map[item?.baseName] ?? (item?.slot === "ring" ? 6 : item?.slot === "weapon" ? 0 : 11);
}

export function itemIconSheet(item) {
  if (isQuestItem(item)) return "items";
  if (isResourceItem(item)) return RESOURCE_DEFS[item.resourceId]?.sheet ?? "resources";
  const armorBases = new Set(["Helm", "Gorget", "Chestplate", "Vambraces", "Greaves", "Bracelet", "Boots", "Gloves", "Pauldrons", "Cape", "Belt", "Relic"]);
  return armorBases.has(item?.baseName) ? "armor" : "items";
}

export function makeResourceItem(resourceId, count = 1) {
  const def = RESOURCE_DEFS[resourceId];
  if (!def) return null;
  return withItemIcon(withItemFlags({
    id: createId(),
    name: def.name,
    baseName: def.name,
    resourceId,
    rarity: "normal",
    rarityLabel: "Resource",
    rarityColor: RESOURCE_RARITY_COLOR,
    resourceColor: def.color,
    slot: "resource",
    mode: "resource",
    level: 1,
    count: clamp(Math.floor(Number(count) || 1), 1, def.stackMax),
    stackMax: def.stackMax,
    iconIndex: def.iconIndex,
    iconSheet: def.sheet ?? "resources",
    iconUrl: def.iconUrl ?? undefined,
    value: def.value,
  }));
}

export function normalizeReadableStatus(status) {
  const value = String(status ?? "readable");
  return value === "consumable" || value === "mergeable" ? value : "readable";
}

export function createReadableBonuses() {
  return {
    maxHp: 0,
    maxMana: 0,
    armor: 0,
    damageMin: 0,
    damageMax: 0,
    range: 0,
    speed: 0,
    magic: 0,
  };
}

export function normalizeReadableBonuses(bonuses) {
  const base = createReadableBonuses();
  if (!bonuses || typeof bonuses !== "object") return base;
  return {
    maxHp: Math.floor(Number(bonuses.maxHp) || 0),
    maxMana: Math.floor(Number(bonuses.maxMana) || 0),
    armor: Math.floor(Number(bonuses.armor) || 0),
    damageMin: Math.floor(Number(bonuses.damageMin) || 0),
    damageMax: Math.floor(Number(bonuses.damageMax) || 0),
    range: Number((Number(bonuses.range) || 0).toFixed(2)),
    speed: Number((Number(bonuses.speed) || 0).toFixed(2)),
    magic: Math.floor(Number(bonuses.magic) || 0),
  };
}

export function makeReadableItem(readableId) {
  const def = READABLE_DEF_BY_ID[readableId];
  if (!def) return null;
  const status = normalizeReadableStatus(def.status);
  const rarity = String(def.rarity ?? "unique");
  return withItemIcon(withItemFlags({
    id: createId(),
    readableId: def.id,
    readableKind: String(def.kind ?? "lorebook"),
    readableStatus: status,
    name: String(def.title ?? def.id),
    baseName: String(def.title ?? def.id),
    rarity,
    rarityLabel: rarity === "unique" ? "Readable" : rarity,
    rarityColor: rarity === "legendary" ? "#ff5757" : "#c9b1ff",
    slot: "readable",
    mode: "readable",
    level: 1,
    damageMin: 0,
    damageMax: 0,
    range: 0,
    cooldown: 0,
    armor: 0,
    maxHp: 0,
    maxMana: 0,
    speed: 0,
    magic: 0,
    storyText: String(def.story ?? ""),
    readableQuestId: def.questId ? String(def.questId) : def.readableQuestId ? String(def.readableQuestId) : undefined,
    readableXp: Math.max(0, Math.floor(Number(def.xp) || 0)),
    mergeLocation: String(def.mergeLocation ?? "backpack"),
    mergeParts: Array.isArray(def.parts) ? def.parts.map(String) : [],
    consumableEffect: def.consumable && typeof def.consumable === "object" ? { ...def.consumable } : undefined,
    iconUrl: def.iconUrl ?? undefined,
    value: Math.max(1, Math.floor(Number(def.value) || 1)),
  }, {
    readable: true,
    consumable: status === "consumable",
    mergeable: status === "mergeable",
    stackable: false,
    equippable: false,
  }), def.id);
}

export function readablePartCount(inventory, readableId) {
  return inventory.reduce((sum, item) => (
    isReadableItem(item) && item.readableStatus === "mergeable" && String(item.readableId) === String(readableId)
      ? sum + 1
      : sum
  ), 0);
}

export function hasReadableInputs(inventory, inputs) {
  return Object.entries(inputs).every(([readableId, needed]) => readablePartCount(inventory, readableId) >= needed);
}

export function readableMergeRecipesFor(item, inventory) {
  if (!isReadableItem(item) || item.readableStatus !== "mergeable" || !item.readableId) return [];
  return READABLE_ITEM_DEFS
    .filter((entry) => entry && normalizeReadableStatus(entry.status) !== "mergeable" && Array.isArray(entry.parts) && entry.parts.length > 0)
    .map((entry) => {
      const inputs = Object.fromEntries(entry.parts.map((partId) => [String(partId), 1]));
      return {
        output: entry.id,
        outputName: entry.title,
        mergeLocation: String(entry.mergeLocation ?? "backpack"),
        inputs,
      };
    })
    .filter((recipe) => Object.hasOwn(recipe.inputs, String(item.readableId)) && hasReadableInputs(inventory, recipe.inputs));
}

export function readableMergeOption(recipe) {
  const output = READABLE_DEF_BY_ID[recipe.output];
  const previewItem = withItemIcon({ mode: "readable", readableId: recipe.output, name: output?.title ?? recipe.output });
  return {
    output: recipe.output,
    name: output?.title ?? recipe.output,
    count: 1,
    iconIndex: output?.iconIndex ?? 11,
    iconSheet: output?.iconSheet ?? "items",
    iconUrl: output?.iconUrl ?? previewItem.iconUrl,
    inputs: recipe.inputs,
  };
}

export function readableDropChanceForMonster(dropTable, monsterTypeName) {
  if (!dropTable || !monsterTypeName) return 0;
  const defaultChance = Number(dropTable.chance ?? 0);
  const monster = String(monsterTypeName);
  const entries = Array.isArray(dropTable.monsters) ? dropTable.monsters : [];
  for (const entry of entries) {
    if (typeof entry === "string") {
      if (String(entry) === monster) return defaultChance;
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    if (String(entry.type ?? "") !== monster) continue;
    return Number(entry.chance ?? defaultChance);
  }
  return 0;
}

export function consumeReadableInputs(inventory, inputs) {
  for (const [readableId, neededRaw] of Object.entries(inputs)) {
    let needed = Math.max(0, Math.floor(Number(neededRaw) || 0));
    for (let i = inventory.length - 1; i >= 0 && needed > 0; i -= 1) {
      const item = inventory[i];
      if (!isReadableItem(item) || item.readableStatus !== "mergeable" || String(item.readableId) !== String(readableId)) continue;
      inventory.splice(i, 1);
      needed -= 1;
    }
  }
}

export function pickupStatusText(item, count = 1) {
  const amount = Math.max(1, Math.floor(Number(count) || 1));
  return `+${amount}x ${item?.name ?? "Item"}`;
}

export function resourceMergeRecipeFor(item, inventory) {
  if (!item?.resourceId) return null;
  return resourceMergeRecipesFor(item, inventory)[0] ?? null;
}

export function resourceMergeRecipesFor(item, inventory) {
  if (!item?.resourceId) return [];
  return RESOURCE_MERGE_RECIPES.filter((recipe) => (
    Object.hasOwn(recipe.inputs, item.resourceId)
    && hasResourceInputs(inventory, recipe.inputs)
  ));
}

export function resourceMergeOption(recipe) {
  const output = RESOURCE_DEFS[recipe.output];
  const previewItem = withItemIcon({
    mode: "resource",
    resourceId: recipe.output,
    name: output?.name ?? recipe.output,
  });
  return {
    output: recipe.output,
    name: output?.name ?? recipe.output,
    count: recipe.count ?? 1,
    iconIndex: output?.iconIndex ?? 0,
    iconSheet: output?.sheet ?? "resources",
    iconUrl: output?.iconUrl ?? previewItem.iconUrl,
    inputs: recipe.inputs,
  };
}

export function hasResourceInputs(inventory, inputs) {
  return Object.entries(inputs).every(([resourceId, needed]) => resourceCount(inventory, resourceId) >= needed);
}

export function resourceCount(inventory, resourceId) {
  return inventory.reduce((sum, item) => (
    isResourceItem(item) && item.resourceId === resourceId
      ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
      : sum
  ), 0);
}

export function consumeResourceInputs(inventory, inputs) {
  for (const [resourceId, neededRaw] of Object.entries(inputs)) {
    let needed = Math.max(0, Math.floor(Number(neededRaw) || 0));
    for (let i = inventory.length - 1; i >= 0 && needed > 0; i -= 1) {
      const item = inventory[i];
      if (!isResourceItem(item) || item.resourceId !== resourceId) continue;
      const count = Math.max(1, Math.floor(Number(item.count) || 1));
      const used = Math.min(count, needed);
      item.count = count - used;
      needed -= used;
      if (item.count <= 0) inventory.splice(i, 1);
    }
  }
}

export function resourceOutputCanFitAfterMerge(inventory, recipe, output, maxInventory = MAX_INVENTORY) {
  const outputMax = resourceStackMax(output.resourceId);
  if (inventory.some((item) => (
    isResourceItem(item)
    && item.resourceId === output.resourceId
    && Math.max(1, Math.floor(Number(item.count) || 1)) < outputMax
  ))) return true;

  let freedSlots = 0;
  for (const [resourceId, neededRaw] of Object.entries(recipe.inputs)) {
    let needed = Math.max(0, Math.floor(Number(neededRaw) || 0));
    for (const item of inventory) {
      if (!isResourceItem(item) || item.resourceId !== resourceId || needed <= 0) continue;
      const count = Math.max(1, Math.floor(Number(item.count) || 1));
      const used = Math.min(count, needed);
      if (count - used <= 0) freedSlots += 1;
      needed -= used;
    }
  }
  return inventory.length - freedSlots < maxInventory;
}

export function resourceStackMax(resourceId) {
  return RESOURCE_DEFS[resourceId]?.stackMax ?? 99;
}

export function normalizeResourceId(resourceId) {
  const id = resourceId ? String(resourceId) : undefined;
  if (id === "iron_ore") return "iron_piece";
  if (id === "small_rock") return "stone_brick";
  return id;
}

export function inventoryCanAccept(inventory, item, maxInventory = MAX_INVENTORY) {
  if (!item) return true;
  if (item.mode !== "resource") return inventory.length < maxInventory;
  let remaining = Math.max(1, Math.floor(Number(item.count) || 1));
  const stackMax = resourceStackMax(item.resourceId);
  for (const stack of inventory) {
    if (stack.mode !== "resource" || stack.resourceId !== item.resourceId) continue;
    const room = stackMax - Math.max(1, Math.floor(Number(stack.count) || 1));
    const moved = Math.min(room, remaining);
    remaining -= moved;
    stack.count = Math.max(1, Math.floor(Number(stack.count) || 1)) + moved;
    if (remaining <= 0) return true;
  }
  while (remaining > 0) {
    if (inventory.length >= maxInventory) return false;
    const count = Math.min(stackMax, remaining);
    inventory.push({ ...item, count });
    remaining -= count;
  }
  return true;
}
