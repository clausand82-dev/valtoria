import {
  ARMOR_BASES,
  WEAPON_BASES,
  NAMED_ITEM_TEMPLATES,
  PREFIXES,
  RARITIES,
  UNIQUE_ITEMS,
  createId,
  itemValue,
  makeItem,
  makeNamedItem,
  makePotion,
  makeUniqueItem,
  rollNamedItem,
  rollUniqueItem,
  clamp,
  distance,
  POTION_DEFS,
  RESOURCE_DEFS,
  UNIQUE_DROP_CHANCES,
  RESTRICTED_DROPS,
  isPotionItem,
  isQuestItem,
  isReadableItem,
  isResourceItem,
  GROUND_LOOT_DESPAWN_SECONDS,
  cityRuntimeModifiers,
  LOOT_TABLES,
} from "../dependencies.js";
import {
  rollItemOfRarity,
  namedItemChanceMultiplier,
  makeResourceItem,
  makeReadableItem,
  makeQuestItem,
  inventoryCanAccept,
  pickupStatusText,
  questItemCount,
  questItemTargetsForQuest,
  resourceCount,
  randomInt
} from "../helpers.js";
import { worldEntryAllowed } from "../../world-state.js";

const FOLIAGE_LOOT_INTERACT_RANGE = 0.78;

function rollPotionIdByWeight(filter = null) {
  const entries = Object.values(POTION_DEFS)
    .filter((def) => def?.id && (!filter || filter(def)))
    .map((def) => ({ id: def.id, weight: Math.max(0, Number(def.dropWeight) || 0) }))
    .filter((entry) => entry.weight > 0);
  if (!entries.length) return "";
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return entries[entries.length - 1]?.id ?? "";
}

function rollPotionIdForCategory(category) {
  if (category === "health") return rollPotionIdByWeight((def) => def.type === "health" || Number(def.restoreHealthPct) > 0) || "small_health";
  if (category === "mana") return rollPotionIdByWeight((def) => def.type === "mana" || Number(def.restoreManaPct) > 0) || "mana";
  return rollPotionIdByWeight() || "small_health";
}

function normalizeItemLookupToken(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function itemMatchesLookupToken(item, target) {
  const normalizedTarget = normalizeItemLookupToken(target);
  if (!normalizedTarget) return false;
  const tokens = [
    item?.name,
    item?.baseName,
    item?.namedId,
    item?.uniqueId,
    item?.questItemId,
    item?.resourceId,
    item?.readableId,
  ].map(normalizeItemLookupToken).filter(Boolean);
  return tokens.includes(normalizedTarget);
}

function itemBiasForLookup(target) {
  const normalizedTarget = normalizeItemLookupToken(target);
  const weaponMatches = WEAPON_BASES.some((entry) => normalizedTarget.includes(normalizeItemLookupToken(entry.name)));
  const armorMatches = ARMOR_BASES.some((entry) => normalizedTarget.includes(normalizeItemLookupToken(entry.name)));
  if (weaponMatches && !armorMatches) return 0.1;
  if (armorMatches && !weaponMatches) return 0.9;
  return Math.random();
}

function makeConfiguredCommonItem(entry, level) {
  const itemId = entry?.itemId ?? entry?.baseName ?? entry?.name;
  const target = normalizeItemLookupToken(itemId);
  if (!target) return null;
  const tries = Math.max(1, Math.floor(Number(entry?.tries) || 80));
  const preferredRarity = entry?.rarity ? String(entry.rarity) : null;
  const bias = itemBiasForLookup(target);

  for (let index = 0; index < tries; index += 1) {
    const item = makeItem(level, bias);
    if (!itemMatchesLookupToken(item, target)) continue;
    if (preferredRarity && item.rarity !== preferredRarity) continue;
    return item;
  }
  return null;
}

function normalizeLootTableRefs(source) {
  const refs = [];
  if (source?.lootTable) refs.push(source.lootTable);
  if (Array.isArray(source?.lootTables)) refs.push(...source.lootTables);
  return [...new Set(refs.map((id) => String(id ?? "").trim()).filter(Boolean))];
}

function weightedLootEntry(entries) {
  const weighted = (Array.isArray(entries) ? entries : []).filter((entry) => entry && Number(entry.weight) > 0);
  const total = weighted.reduce((sum, entry) => sum + Number(entry.weight), 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= Number(entry.weight);
    if (roll <= 0) return entry;
  }
  return weighted[weighted.length - 1] ?? null;
}

function chanceValue(entry, fallback = 1) {
  return Math.max(0, Math.min(1, Number(entry?.chance ?? fallback) || 0));
}

function rarityRank(rarityId) {
  return RARITIES.findIndex((rarity) => rarity.id === rarityId);
}

function itemMeetsMinRarity(item, minRarity) {
  if (!minRarity) return true;
  const minRank = rarityRank(String(minRarity));
  if (minRank < 0) return true;
  const itemRank = rarityRank(item?.rarity);
  return itemRank >= minRank;
}

function forceItemRarity(item, rarityId) {
  const rarity = RARITIES.find((entry) => entry.id === rarityId);
  if (!item || !rarity) return item;
  const oldPrefixes = Object.values(PREFIXES).flat();
  let baseName = item.baseName;
  if (!baseName && item.name) {
    baseName = oldPrefixes.reduce((name, prefix) => (
      name.startsWith(`${prefix} `) ? name.slice(prefix.length + 1) : name
    ), item.name);
  }
  item.baseName = baseName ?? item.baseName;
  item.rarity = rarity.id;
  item.rarityLabel = rarity.label;
  item.rarityColor = rarity.color;
  const prefixes = PREFIXES[rarity.id] ?? [];
  if (prefixes.length > 0 && item.baseName) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    item.name = `${prefix} ${item.baseName}`;
  }
  item.value = itemValue(item);
  return item;
}

export const AUTO_LOOT_TYPE_IDS = [
  "gold",
  "resource",
  "weapon",
  "head",
  "shoulder",
  "neck",
  "amulet",
  "cape",
  "chest",
  "arms",
  "hands",
  "bracelet",
  "ring",
  "belt",
  "legs",
  "feet",
  "offhand",
  "relic",
  "potion",
  "readable",
  "quest",
];

export const AUTO_LOOT_RARITY_IDS = ["poor", "normal", "upgraded", "rare", "epic", "legendary", "unique"];

export function createAutoLootRules() {
  return {
    types: Object.fromEntries(AUTO_LOOT_TYPE_IDS.map((id) => [id, true])),
    rarities: Object.fromEntries(AUTO_LOOT_RARITY_IDS.map((id) => [id, true])),
  };
}

export function normalizeAutoLootRules(rules) {
  const defaults = createAutoLootRules();
  if (!rules || typeof rules !== "object") return defaults;
  return {
    types: Object.fromEntries(AUTO_LOOT_TYPE_IDS.map((id) => [id, rules.types?.[id] !== false])),
    rarities: Object.fromEntries(AUTO_LOOT_RARITY_IDS.map((id) => [id, rules.rarities?.[id] !== false])),
  };
}

function autoLootTypeFor(item, lootType) {
  if (lootType === "gold") return "gold";
  if (isResourceItem(item)) return "resource";
  if (isPotionItem(item)) return "potion";
  if (isQuestItem(item)) return "quest";
  if (isReadableItem(item)) return "readable";
  if (item?.slot === "weapon") return "weapon";
  if (item?.slot === "ring1" || item?.slot === "ring2") return "ring";
  return String(item?.slot ?? item?.mode ?? "item");
}

function autoLootRarityFor(item, lootType) {
  if (lootType === "gold") return null;
  if (item?.unique || item?.rarity === "unique") return "unique";
  return item?.rarity ? String(item.rarity) : null;
}

function questRequirementMatchesItem(requirement, item) {
  if (![requirement?.templateId, requirement?.namePrefix, requirement?.baseName, requirement?.rarity].some(Boolean)) return false;
  let matches = true;
  if (requirement?.templateId) {
    matches = matches && (
      String(item?.uniqueId ?? "") === String(requirement.templateId)
      || String(item?.namedId ?? "") === String(requirement.templateId)
    );
  }
  if (requirement?.namePrefix) matches = matches && String(item?.name ?? "").startsWith(`${requirement.namePrefix} `);
  if (requirement?.baseName) matches = matches && String(item?.baseName ?? "") === String(requirement.baseName);
  if (requirement?.rarity) matches = matches && String(item?.rarity ?? "") === String(requirement.rarity);
  return matches;
}

function questPickupProgress(engine, item, pickedCount = 1) {
  const inventory = engine?.player?.inventory ?? [];
  const picked = Math.max(1, Math.floor(Number(pickedCount) || 1));
  for (const quest of engine?.questState?.active ?? []) {
    if (quest?.type !== "collect_quest_item") continue;

    for (const target of questItemTargetsForQuest(quest)) {
      if (String(target?.questItemId ?? "") !== String(item?.questItemId ?? "")) continue;
      if (item?.questInstanceId && String(item.questInstanceId) !== String(quest.id)) continue;
      const needed = Math.max(1, Math.floor(Number(target.count) || 1));
      const rawCurrent = questItemCount(inventory, quest.id, target.questItemId);
      if (rawCurrent - picked >= needed) continue;
      return `${item.name ?? target.questItemId}: ${Math.min(needed, rawCurrent)} / ${needed}`;
    }

    if (isResourceItem(item)) {
      const resourceId = String(item.resourceId ?? "");
      const target = (quest.target?.resources ?? []).find((entry) => (
        String(entry?.resource ?? entry?.resourceId ?? "") === resourceId
      ));
      if (target) {
        const needed = Math.max(1, Math.floor(Number(target.count) || 1));
        const rawCurrent = resourceCount(inventory, resourceId);
        if (rawCurrent - picked < needed) return `${RESOURCE_DEFS[resourceId]?.name ?? item.name ?? resourceId}: ${Math.min(needed, rawCurrent)} / ${needed}`;
      }
    }

    const itemTarget = (quest.target?.items ?? []).find((entry) => questRequirementMatchesItem(entry, item));
    if (itemTarget) {
      const needed = Math.max(1, Math.floor(Number(itemTarget.count) || 1));
      const rawCurrent = inventory.filter((entry) => questRequirementMatchesItem(itemTarget, entry)).length;
      if (rawCurrent - 1 < needed) return `${item.name ?? itemTarget.templateId ?? itemTarget.baseName ?? "Quest item"}: ${Math.min(needed, rawCurrent)} / ${needed}`;
    }
  }
  return "";
}

function addPickupFloater(engine, x, y, item, pickedCount = 1) {
  const questProgress = questPickupProgress(engine, item, pickedCount);
  if (questProgress) {
    engine.addFloater(x, y, questProgress, "#ffe08a", 2.05, {
      fontSize: 17,
      fontWeight: 800,
      riseSpeed: 20,
      fadeDuration: 0.55,
    });
    return;
  }
  engine.addFloater(x, y, item.name, item.rarityColor, 1.05);
}

export const lootMethods = {
  autoLootAllows(loot) {
    const rules = normalizeAutoLootRules(this.player.autoLoot);
    const typeId = autoLootTypeFor(loot?.item, loot?.type);
    if (rules.types[typeId] === false) return false;
    const rarityId = autoLootRarityFor(loot?.item, loot?.type);
    if (rarityId && rules.rarities[rarityId] === false) return false;
    return true;
  },

  updateLoot(dt) {
    const beforeLootCount = this.loots.length;
    for (let i = this.loots.length - 1; i >= 0; i -= 1) {
      const loot = this.loots[i];
      loot.bob += dt * 4.5;
      if (Number.isFinite(Number(loot.despawn))) {
        loot.despawn -= dt;
        if (loot.despawn <= 0) {
          this.handleLootDespawn(loot);
          this.loots.splice(i, 1);
          this.markRenderDirty?.("loot-remove");
          continue;
        }
      }
      loot.pickupDelay = Math.max(0, (loot.pickupDelay || 0) - dt);
      if (loot.pickupDelay > 0) continue;
      if (!this.autoLootAllows(loot)) continue;
      if (distance(this.player, loot) < 0.62) {
        if (loot.type === "gold") {
          this.player.gold += loot.amount;
          this.recordRunGold?.(loot.amount);
          this.player.stats.goldLooted += loot.amount;
          this.player.stats.goldEarned += loot.amount;
          this.addFloater(loot.x, loot.y, `+${loot.amount} g`, "#f1c657");
          this.addToast(`+${loot.amount} guld`);
          this.loots.splice(i, 1);
          this.markRenderDirty?.("loot-pickup");
        } else if (isPotionItem(loot.item)) {
          const before = this.potionInventoryCount?.(loot.item.potionId ?? loot.item.potionType) ?? 0;
          if (this.addPotionLoot(loot.item)) {
            const after = this.potionInventoryCount?.(loot.item.potionId ?? loot.item.potionType) ?? before + 1;
            const picked = Math.max(1, after - before);
            this.trackItemPicked(loot.item);
            this.recordRunItem?.(loot.item, picked);
            addPickupFloater(this, loot.x, loot.y, loot.item, picked);
            this.addToast(pickupStatusText(loot.item, picked));
            this.loots.splice(i, 1);
            this.markRenderDirty?.("loot-pickup");
            this.publishSnapshot();
          } else if (!loot.warned) {
            loot.warned = true;
            this.addToast("Potion stack er fuld");
          }
        } else if (isQuestItem(loot.item) && this.addInventoryItem(loot.item, { countAsCollected: Boolean(loot.countAsCollected) })) {
          this.player.stats.itemsPicked += 1;
          this.trackItemPicked(loot.item);
          this.recordRunItem?.(loot.item, 1);
          this.applyQuestItemPickup(loot.item);
          addPickupFloater(this, loot.x, loot.y, loot.item, 1);
          this.addToast(pickupStatusText(loot.item, 1));
          this.loots.splice(i, 1);
          this.markRenderDirty?.("loot-pickup");
          this.publishSnapshot();
        } else if (!isPotionItem(loot.item) && this.addInventoryItem(loot.item, { countAsCollected: Boolean(loot.countAsCollected) })) {
          const picked = isResourceItem(loot.item) ? Math.max(1, Math.floor(Number(loot.item.count) || 1)) : 1;
          this.recordRunItem?.(loot.item, picked);
          if (isResourceItem(loot.item)) this.player.stats.resourcesPicked += picked;
          else {
            this.player.stats.itemsPicked += 1;
            this.trackItemPicked(loot.item);
          }
          addPickupFloater(this, loot.x, loot.y, loot.item, picked);
          this.addToast(pickupStatusText(loot.item, picked));
          this.loots.splice(i, 1);
          this.markRenderDirty?.("loot-pickup");
          this.publishSnapshot();
        } else if (!loot.warned) {
          loot.warned = true;
          this.addToast(isPotionItem(loot.item) ? "Potion stack er fuld" : "Rygsaekken er fuld");
        }
      }
    }
    if (beforeLootCount !== this.loots.length) this.markRenderDirty?.("loot");
  },

  updateFoliageLoot() {
    const target = this.nearestLootableFoliage(FOLIAGE_LOOT_INTERACT_RANGE);
    const next = target ? this.foliageLootSnapshot(target) : null;
    if ((next?.id ?? null) === (this.nearbyFoliageLoot?.id ?? null)) return;
    this.nearbyFoliageLoot = next;
    this.markRenderDirty?.("foliage-target");
    this.publishSnapshot();
  },

  nearestLootableFoliage(maxRange) {
    let best = null;
    let bestD = maxRange;
    for (const chunk of this.nearbyChunks(1)) {
      for (const object of chunk.objects) {
        if (object.type !== "foliage" || object.foliageLooted) continue;
        if (!this.availableFoliageResourceDrops(object).length) continue;
        const d = distance(this.player, object);
        if (d < bestD) {
          best = object;
          bestD = d;
        }
      }
    }
    return best;
  },

  availableFoliageResourceDrops(object) {
    if (!object || object.type !== "foliage" || object.foliageLooted) return [];
    return (Array.isArray(object.resourceDrops) ? object.resourceDrops : [])
      .map((entry) => ({
        resource: String(entry?.resource ?? ""),
        count: Math.max(1, Math.floor(Number(entry?.count) || 1)),
      }))
      .filter((entry) => {
        const def = RESOURCE_DEFS[entry.resource];
        const item = def ? {
          name: def.name,
          baseName: def.name,
          resourceId: entry.resource,
          mode: "resource",
          slot: "resource",
          rarity: "normal",
          count: entry.count,
        } : null;
        return item && !this.isDropBlocked(item);
      });
  },

  foliageLootSnapshot(object) {
    const drops = this.availableFoliageResourceDrops(object);
    if (!drops.length) return null;
    const resources = drops.map((entry) => ({
      resource: entry.resource,
      name: RESOURCE_DEFS[entry.resource]?.name ?? entry.resource,
      count: entry.count,
    }));
    const label = resources.length === 1
      ? `${resources[0].count > 1 ? `${resources[0].count}x ` : ""}${resources[0].name}`
      : "resources";
    return {
      id: object.id,
      label,
      resources,
    };
  },

  lootNearbyFoliage() {
    const object = this.findObjectById(this.nearbyFoliageLoot?.id)
      ?? this.nearestLootableFoliage(FOLIAGE_LOOT_INTERACT_RANGE);
    if (!object || distance(this.player, object) > FOLIAGE_LOOT_INTERACT_RANGE) return false;

    const drops = this.availableFoliageResourceDrops(object);
    if (!drops.length) {
      object.foliageLooted = true;
      object.resourceDrops = [];
      this.nearbyFoliageLoot = null;
      this.markRenderDirty?.("foliage-loot");
      this.publishSnapshot();
      return false;
    }

    const modifiers = cityRuntimeModifiers(this.cityStats);
    const items = drops
      .filter((entry) => Math.random() < (modifiers.resourceDropMultiplierById?.[entry.resource] ?? 1))
      .map((entry) => makeResourceItem(entry.resource, entry.count))
      .filter(Boolean);
    if (!items.length) {
      object.foliageLooted = true;
      object.resourceDrops = [];
      this.nearbyFoliageLoot = null;
      this.markRenderDirty?.("foliage-loot");
      this.publishSnapshot();
      return false;
    }
    const simulatedInventory = this.player.inventory.map((item) => ({ ...item }));
    const maxSlots = this.inventorySlotCapacity?.() ?? simulatedInventory.length;
    for (const item of items) {
      if (inventoryCanAccept(simulatedInventory, item, maxSlots)) continue;
      this.addToast("Rygsaekken er fuld");
      this.publishSnapshot();
      return false;
    }

    let total = 0;
    for (const item of items) {
      if (!this.addInventoryItem(item, { countAsCollected: true })) continue;
      const count = Math.max(1, Math.floor(Number(item.count) || 1));
      total += count;
      this.recordRunItem?.(item, count);
    }

    object.foliageLooted = true;
    object.resourceDrops = [];
    this.nearbyFoliageLoot = null;

    const first = items[0];
    const color = first ? RESOURCE_DEFS[first.resourceId]?.color ?? first.rarityColor : "#8be9ff";
    const toast = items.length === 1
      ? pickupStatusText(first, Math.max(1, Math.floor(Number(first.count) || 1)))
      : `+${total}x resources`;
    this.player.stats.resourcesPicked += total;
    this.addParticles(object.x, object.y, color, 10, 0.08);
    const questPickup = items.find((item) => questPickupProgress(this, item, Math.max(1, Math.floor(Number(item.count) || 1))));
    if (questPickup) addPickupFloater(this, object.x, object.y, questPickup, Math.max(1, Math.floor(Number(questPickup.count) || 1)));
    else this.addFloater(object.x, object.y, toast, first?.rarityColor ?? "#8be9ff", 1.05);
    this.addToast(toast);
    this.markRenderDirty?.("foliage-loot");
    this.publishSnapshot();
    return true;
  },

  handleLootDespawn(loot) {
    if (isQuestItem(loot.item) && this.questState.active) {
      const quest = this.questState.active.find((entry) => entry.id === loot.item.questInstanceId);
      if (quest?.type === "collect_quest_item") {
        quest.progress = { ...(quest.progress ?? {}), droppedItems: Math.max(0, Math.floor(Number(quest.progress?.droppedItems) || 0) - 1) };
      }
    }
  },

  dropChestLoot(chest) {
    const tableIds = normalizeLootTableRefs(chest).length
      ? normalizeLootTableRefs(chest)
      : ["chest_common", "chest_bonus_red_rose"];
    const context = {
      source: "chest",
      chest,
      sourceEntity: chest,
      conditionContext: this.questConditionContext?.({ source: "chest", chest }) ?? {},
    };
    if (normalizeLootTableRefs(chest).length) {
      this.dropLootFromTables(chest.x, chest.y, tableIds, context, { pickupDelay: 0.35 });
    } else {
      const primary = this.rollLootTable("chest_common", context).find((drop) => drop.item);
      if (primary?.item) this.dropGroundItem(chest.x + 0.16, chest.y - 0.16, primary.item, { pickupDelay: 0.35 });
      this.dropLootFromTables(chest.x, chest.y, ["chest_bonus_red_rose"], context, { pickupDelay: 0.35 });
    }
    this.addParticles(chest.x, chest.y, "#ffd85d", 18, 0.12);
    this.addFloater(chest.x, chest.y, "Chest loot", "#ffd85d", 1.05);
    this.markRenderDirty?.("loot-drop");
  },

  dropGroundItem(x, y, item, options = {}) {
    if (!item || this.isDropBlocked(item)) return false;
    this.loots.push({
      id: createId(),
      type: "item",
      item,
      countAsCollected: Boolean(options.countAsCollected),
      x: x + (Math.random() - 0.5) * (options.spread ?? 0.7),
      y: y + (Math.random() - 0.5) * (options.spread ?? 0.7),
      bob: Math.random() * Math.PI * 2,
      pickupDelay: options.pickupDelay ?? 0,
      despawn: options.despawn ?? GROUND_LOOT_DESPAWN_SECONDS,
    });
    this.trackItemDropped(item);
    this.markRenderDirty?.("loot-drop");
    return true;
  },

  lootEntryLevel(source, entry = {}) {
    const baseLevel = Math.max(1, Math.floor(Number(source?.lootLevel ?? source?.level ?? this.player?.level) || 1));
    if (entry.level !== undefined) return Math.max(1, Math.floor(Number(entry.level) || baseLevel));
    if (entry.levelOffset !== undefined) return Math.max(1, baseLevel + Math.floor(Number(entry.levelOffset) || 0));
    return baseLevel;
  },

  createLootEntryItem(entry, context = {}) {
    const source = context.sourceEntity ?? context.monster ?? context.object ?? context.chest ?? this.player;
    const level = this.lootEntryLevel(source, entry);
    const type = String(entry?.type ?? "").trim();
    if (type === "resource") {
      const id = entry.id ?? entry.resourceId ?? entry.resource;
      const count = Math.max(1, Math.floor(randomInt(entry.min ?? 1, entry.max ?? entry.min ?? 1) * (1 + (this.calcStats().resourceFind ?? 0))));
      const item = makeResourceItem(id, count);
      if (item && entry.questItem !== undefined) item.questItem = Boolean(entry.questItem);
      return item;
    }
    if (type === "potion") return makePotion(entry.potionId ?? entry.id, level);
    if (type === "potionPool") return makePotion(rollPotionIdForCategory(entry.category ?? "all"), level);
    if (type === "readable") return makeReadableItem(entry.readableId ?? entry.id);
    if (type === "questItem") return makeQuestItem(entry.questItemId ?? entry.id, entry.questInstanceId ?? context.quest?.id ?? context.questId);
    if (type === "item") return makeConfiguredCommonItem(entry, level);
    if (type === "named") {
      const id = entry.itemId ?? entry.id;
      if (id) {
        const definition = NAMED_ITEM_TEMPLATES.find((candidate) => String(candidate.id) === String(id));
        if (!definition) return null;
        if (!worldEntryAllowed(definition, this.worldState, context.conditionContext ?? {})) return null;
        return makeNamedItem(definition, level);
      }
      const monster = context.monster;
      const chanceMult = entry.chanceMult === "monster"
        ? namedItemChanceMultiplier(monster) * (1 + (this.calcStats().magicFind ?? 0))
        : Number(entry.chanceMult ?? 1) * (1 + (entry.magicFind ? this.calcStats().magicFind ?? 0 : 0));
      return rollNamedItem(level, {
        source: monster?.isBoss ? "boss" : entry.source ?? context.source ?? "monster",
        biomeId: this.region.mapRegion?.id,
        chanceMult,
        worldState: this.worldState,
        conditionContext: context.conditionContext ?? {},
      });
    }
    if (type === "unique") {
      const id = entry.itemId ?? entry.id;
      if (id) {
        const definition = UNIQUE_ITEMS.find((candidate) => String(candidate.id) === String(id));
        if (!definition) return null;
        if (!worldEntryAllowed(definition, this.worldState, context.conditionContext ?? {})) return null;
        return makeUniqueItem(definition, level);
      }
      const monster = context.monster;
      const baseChance = Number(entry.chance ?? UNIQUE_DROP_CHANCES.monster) || 0;
      const chance = baseChance * (1 + (entry.magicFind ? this.calcStats().magicFind ?? 0 : 0));
      return rollUniqueItem(level, {
        source: monster?.isBoss ? "boss" : entry.source ?? context.source ?? "monster",
        biomeId: this.region.mapRegion?.id,
        chance,
        worldState: this.worldState,
        conditionContext: context.conditionContext ?? {},
      });
    }
    if (type === "equipment") {
      const category = String(entry.category ?? "all");
      if (category === "none") return null;
      if (entry.rarity) return rollItemOfRarity(level, String(entry.rarity), Math.max(1, Math.floor(Number(entry.tries) || 60)));
      const tries = Math.max(1, Math.floor(Number(entry.tries) || 1));
      const biasForCategory = () => category === "weapon" ? 0.1 : category === "armor" ? 0.9 : Math.random();
      for (let i = 0; i < tries; i += 1) {
        const item = makeItem(level, biasForCategory());
        if (!itemMeetsMinRarity(item, entry.minRarity)) continue;
        return item;
      }
      return forceItemRarity(makeItem(level, biasForCategory()), String(entry.minRarity ?? ""));
    }
    return null;
  },

  lootEntryChance(entry, context = {}) {
    const type = String(entry?.type ?? "").trim();
    let chance = chanceValue(entry, entry?.weight !== undefined ? 1 : 1);
    const stats = this.calcStats();
    const cityModifiers = cityRuntimeModifiers(this.cityStats);
    if (type === "resource") {
      const resourceId = entry.id ?? entry.resourceId ?? entry.resource;
      chance *= (1 + (stats.resourceFind ?? 0)) * (cityModifiers.resourceDropMultiplierById?.[resourceId] ?? 1);
    } else if (type === "potion" || type === "potionPool") {
      chance *= cityModifiers.potionDropMultiplier ?? 1;
    } else if (type === "gold") {
      chance *= 1 + (stats.goldFind ?? 0);
    }
    return Math.max(0, Math.min(1, chance));
  },

  rollLootEntry(entry, context = {}) {
    if (!entry || !worldEntryAllowed(entry, this.worldState, context.conditionContext ?? context)) return [];
    const type = String(entry.type ?? "").trim();
    if (type === "gold") {
      if (Math.random() > this.lootEntryChance(entry, context)) return [];
      const source = context.sourceEntity ?? context.monster ?? this.player;
      const level = Math.max(1, Math.floor(Number(source?.lootLevel ?? source?.level ?? this.player?.level) || 1));
      const cityModifiers = cityRuntimeModifiers(this.cityStats);
      const stats = this.calcStats();
      const gold = Math.floor((4 + Math.random() * 9) * (1 + level * 0.28) * Number(entry.goldMult ?? 1) * (1 + stats.goldFind) * (cityModifiers.goldDropMultiplier ?? 1));
      return gold > 0 ? [{ type: "gold", amount: gold }] : [];
    }
    const rollsInternally = (type === "unique" || type === "named") && !(entry.itemId ?? entry.id);
    if (!rollsInternally && Math.random() > this.lootEntryChance(entry, context)) return [];
    const item = this.createLootEntryItem(entry, context);
    if (!item || this.isDropBlocked(item)) return [];
    return [{ type: "item", item, countAsCollected: type === "resource" || Boolean(entry.countAsCollected) }];
  },

  rollLootTable(tableId, context = {}) {
    const entries = LOOT_TABLES[String(tableId)] ?? [];
    if (!Array.isArray(entries) || !entries.length) return [];
    const drops = [];
    for (const entry of entries.filter((candidate) => !candidate?.weight)) {
      drops.push(...this.rollLootEntry(entry, context));
    }
    const weighted = weightedLootEntry(entries);
    if (weighted && !this.isDropCategoryBlocked(weighted.category)) {
      drops.push(...this.rollLootEntry(weighted, context));
      if (weighted.category === "all" && context.monster && Math.random() < clamp(0.08 + context.monster.level * 0.01, 0.08, 0.24)) {
        drops.push(...this.rollLootEntry({ type: "potionPool", category: "all", chance: 1 }, context));
      }
    }
    return drops;
  },

  rollLootTables(tableIds = [], context = {}) {
    return tableIds.flatMap((tableId) => this.rollLootTable(tableId, context));
  },

  dropLootFromTables(x, y, tableIds = [], context = {}, options = {}) {
    const drops = this.rollLootTables(tableIds, context);
    for (const drop of drops) {
      if (drop.type === "gold") {
        this.loots.push({
          id: createId(),
          type: "gold",
          amount: drop.amount,
          x: x + (Math.random() - 0.5) * (options.spread ?? 0.5),
          y: y + (Math.random() - 0.5) * (options.spread ?? 0.5),
          bob: Math.random() * Math.PI * 2,
          despawn: GROUND_LOOT_DESPAWN_SECONDS,
        });
        this.markRenderDirty?.("loot-drop");
      } else if (drop.item) {
        this.dropGroundItem(x, y, drop.item, { spread: options.spread ?? 0.7, pickupDelay: options.pickupDelay ?? 0.35, countAsCollected: drop.countAsCollected });
      }
    }
    return drops;
  },

  dropInstanceLootTables(monster) {
    const tableIds = normalizeLootTableRefs({ lootTables: monster?.instanceLootTables });
    if (!tableIds.length) return;
    this.dropLootFromTables(monster.x, monster.y, tableIds, {
      source: "rare_mob",
      monster,
      sourceEntity: monster,
      conditionContext: this.questConditionContext?.({ monster, source: "rare_mob" }) ?? {},
    });
  },

  dropLoot(monster) {
    const rareMode = monster?.lootMode === "override" ? "override" : "add";
    if (rareMode !== "override") {
      this.dropQuestLoot(monster);
      this.dropLootFromTables(monster.x, monster.y, normalizeLootTableRefs(monster), {
        source: "monster",
        monster,
        sourceEntity: monster,
        conditionContext: this.questConditionContext?.({ monster, source: monster.isBoss ? "boss" : "monster", sourceRegionId: this.region?.mapRegion?.id }) ?? {},
      });
    }

    this.dropInstanceLootTables(monster);
  },

  isDropRestricted(item) {
    if (!item || !RESTRICTED_DROPS.length) return false;
    const areaMapId = this.region?.mapRegion?.areaMapId ?? null;
    const regionId = this.region?.mapRegion?.id ?? null;

    const itemKeys = new Set([
      item.name,
      item.baseName,
      item.mode,
      item.slot,
    ].filter(Boolean).map(String));

    for (const rule of RESTRICTED_DROPS) {
      let matches = false;
      if (rule.resources?.length && isResourceItem(item)) matches = rule.resources.map(String).includes(String(item.resourceId));
      if (!matches && rule.uniques?.length && item.uniqueId) matches = rule.uniques.map(String).includes(String(item.uniqueId));
      if (!matches && rule.named?.length && item.namedId) matches = rule.named.map(String).includes(String(item.namedId));
      if (!matches && rule.questItems?.length && item.questItemId) matches = rule.questItems.map(String).includes(String(item.questItemId));
      if (!matches && rule.potions?.length && isPotionItem(item) && item.potionType) matches = rule.potions.map(String).includes(String(item.potionType));
      if (!matches && rule.rarities?.length && item.rarity) matches = rule.rarities.map(String).includes(String(item.rarity));
      if (!matches && rule.items?.length) matches = rule.items.map(String).some((key) => itemKeys.has(key));

      if (!matches) continue;

      // Item is restricted — check if current region is in the allowed scopes
      const allowedByArea = rule.areaMapIds?.length && areaMapId && rule.areaMapIds.map(String).includes(String(areaMapId));
      const allowedByRegion = rule.regionIds?.length && regionId && rule.regionIds.map(String).includes(String(regionId));
      if (allowedByArea || allowedByRegion) return false; // allowed here
      return true; // restricted elsewhere
    }
    return false;
  },

  isDropCategoryBlocked(category) {
    if (!category) return false;
    // Allow-only check for categories
    if (RESTRICTED_DROPS.some((rule) => rule.categories?.length && rule.categories.map(String).includes(String(category)))) {
      const areaMapId = this.region?.mapRegion?.areaMapId ?? null;
      const regionId = this.region?.mapRegion?.id ?? null;
      for (const rule of RESTRICTED_DROPS) {
        if (!rule.categories?.map(String).includes(String(category))) continue;
        const allowedByArea = rule.areaMapIds?.length && areaMapId && rule.areaMapIds.map(String).includes(String(areaMapId));
        const allowedByRegion = rule.regionIds?.length && regionId && rule.regionIds.map(String).includes(String(regionId));
        if (allowedByArea || allowedByRegion) return false;
        return true;
      }
    }
    const antiDrops = this.region?.mapRegion?.antiDrops;
    return Boolean(antiDrops?.categories?.includes(category));
  },

  isDropBlocked(item) {
    if (!item) return false;

    // Allow-only check: first priority, overrides antiDrops
    if (this.isDropRestricted(item)) return true;

    const antiDrops = this.region?.mapRegion?.antiDrops;
    if (!antiDrops) return false;

    // Broad type exclusions
    if (antiDrops.allResources && isResourceItem(item)) return true;
    if (antiDrops.allPotions && isPotionItem(item)) return true;
    if (antiDrops.allQuestItems && isQuestItem(item)) return true;
    if (antiDrops.allReadables && item.mode === "readable") return true;
    if (antiDrops.allUniques && item.uniqueId) return true;
    if (antiDrops.allNamed && item.namedId) return true;
    if (antiDrops.allItems && item.rarity && !isResourceItem(item) && !isPotionItem(item) && !isQuestItem(item) && item.mode !== "readable") return true;

    // Rarity exclusion: block the listed rarity and everything above it
    if (antiDrops.rarities?.length && item.rarity && item.mode !== "readable") {
      const lowestBlockedIndex = antiDrops.rarities.reduce((min, id) => {
        const idx = RARITIES.findIndex((r) => r.id === id);
        return idx >= 0 && idx < min ? idx : min;
      }, Infinity);
      const itemIndex = RARITIES.findIndex((r) => r.id === item.rarity);
      if (itemIndex >= lowestBlockedIndex) return true;
    }

    const itemKeys = [
      item.id,
      item.name,
      item.baseName,
      item.mode,
      item.slot,
      item.potionType,
      item.uniqueId,
      item.namedId,
      item.questItemId,
      item.readableId,
    ].filter(Boolean).map(String);

    const resources = new Set((antiDrops.resources ?? []).map(String));
    if (isResourceItem(item) && resources.has(String(item.resourceId))) return true;

    const uniques = new Set((antiDrops.uniques ?? []).map(String));
    if (item.uniqueId && uniques.has(String(item.uniqueId))) return true;

    const named = new Set((antiDrops.named ?? []).map(String));
    if (item.namedId && named.has(String(item.namedId))) return true;

    const items = new Set((antiDrops.items ?? []).map(String));
    return itemKeys.some((key) => items.has(key));
  }
};
