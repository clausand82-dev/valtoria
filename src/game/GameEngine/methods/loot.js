import {
  PREFIXES,
  RARITIES,
  createId,
  itemValue,
  makeItem,
  makePotion,
  rollNamedItem,
  rollUniqueItem,
  clamp,
  distance,
  READABLE_ITEM_DEFS,
  RESOURCE_DEFS,
  UNIQUE_DROP_CHANCES,
  RESTRICTED_DROPS,
  monsterLootProfile,
  monsterResourceDrops,
  rollLootCategory,
  isPotionItem,
  isQuestItem,
  isReadableItem,
  isResourceItem,
  GROUND_LOOT_DESPAWN_SECONDS
} from "../dependencies.js";
import {
  rollItemOfRarity,
  namedItemChanceMultiplier,
  makeResourceItem,
  makeReadableItem,
  inventoryCanAccept,
  readableDropChanceForMonster,
  pickupStatusText,
  randomInt
} from "../helpers.js";

const FOLIAGE_LOOT_INTERACT_RANGE = 0.78;

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
    for (let i = this.loots.length - 1; i >= 0; i -= 1) {
      const loot = this.loots[i];
      loot.bob += dt * 4.5;
      if (Number.isFinite(Number(loot.despawn))) {
        loot.despawn -= dt;
        if (loot.despawn <= 0) {
          this.handleLootDespawn(loot);
          this.loots.splice(i, 1);
          continue;
        }
      }
      loot.pickupDelay = Math.max(0, (loot.pickupDelay || 0) - dt);
      if (loot.pickupDelay > 0) continue;
      if (!this.autoLootAllows(loot)) continue;
      if (distance(this.player, loot) < 0.62) {
        if (loot.type === "gold") {
          this.player.gold += loot.amount;
          this.player.stats.goldLooted += loot.amount;
          this.player.stats.goldEarned += loot.amount;
          this.addFloater(loot.x, loot.y, `+${loot.amount} g`, "#f1c657");
          this.addToast(`+${loot.amount} guld`);
          this.loots.splice(i, 1);
        } else if (isPotionItem(loot.item)) {
          const before = this.potionInventoryCount?.(loot.item.potionId ?? loot.item.potionType) ?? 0;
          if (this.addPotionLoot(loot.item)) {
            const after = this.potionInventoryCount?.(loot.item.potionId ?? loot.item.potionType) ?? before + 1;
            const picked = Math.max(1, after - before);
            this.trackItemPicked(loot.item);
            this.addFloater(loot.x, loot.y, loot.item.name, loot.item.rarityColor, 1.05);
            this.addToast(pickupStatusText(loot.item, picked));
            this.loots.splice(i, 1);
            this.publishSnapshot();
          } else if (!loot.warned) {
            loot.warned = true;
            this.addToast("Potion stack er fuld");
          }
        } else if (isQuestItem(loot.item) && this.addInventoryItem(loot.item)) {
          this.player.stats.itemsPicked += 1;
          this.trackItemPicked(loot.item);
          this.applyQuestItemPickup(loot.item);
          this.addFloater(loot.x, loot.y, loot.item.name, loot.item.rarityColor, 1.05);
          this.addToast(pickupStatusText(loot.item, 1));
          this.loots.splice(i, 1);
          this.publishSnapshot();
        } else if (!isPotionItem(loot.item) && this.addInventoryItem(loot.item)) {
          const picked = isResourceItem(loot.item) ? Math.max(1, Math.floor(Number(loot.item.count) || 1)) : 1;
          if (isResourceItem(loot.item)) this.player.stats.resourcesPicked += picked;
          else {
            this.player.stats.itemsPicked += 1;
            this.trackItemPicked(loot.item);
          }
          this.addFloater(loot.x, loot.y, loot.item.name, loot.item.rarityColor, 1.05);
          this.addToast(pickupStatusText(loot.item, picked));
          this.loots.splice(i, 1);
          this.publishSnapshot();
        } else if (!loot.warned) {
          loot.warned = true;
          this.addToast(isPotionItem(loot.item) ? "Potion stack er fuld" : "Rygsaekken er fuld");
        }
      }
    }
  },

  updateFoliageLoot() {
    const target = this.nearestLootableFoliage(FOLIAGE_LOOT_INTERACT_RANGE);
    const next = target ? this.foliageLootSnapshot(target) : null;
    if ((next?.id ?? null) === (this.nearbyFoliageLoot?.id ?? null)) return;
    this.nearbyFoliageLoot = next;
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
      this.publishSnapshot();
      return false;
    }

    const items = drops
      .map((entry) => makeResourceItem(entry.resource, entry.count))
      .filter(Boolean);
    const simulatedInventory = this.player.inventory.map((item) => ({ ...item }));
    for (const item of items) {
      if (inventoryCanAccept(simulatedInventory, item)) continue;
      this.addToast("Rygsaekken er fuld");
      this.publishSnapshot();
      return false;
    }

    let total = 0;
    for (const item of items) {
      if (!this.addInventoryItem(item)) continue;
      const count = Math.max(1, Math.floor(Number(item.count) || 1));
      total += count;
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
    this.addFloater(object.x, object.y, toast, first?.rarityColor ?? "#8be9ff", 1.05);
    this.addToast(toast);
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
    let item = rollUniqueItem(Math.max(1, this.player.level), {
      source: "chest",
      biomeId: this.region.mapRegion?.id,
      chance: UNIQUE_DROP_CHANCES.chest,
    }) ?? rollNamedItem(Math.max(1, this.player.level), {
      source: "chest",
      biomeId: this.region.mapRegion?.id,
      chanceMult: 3,
    });

    for (let i = 0; i < 12; i += 1) {
      if (item) break;
      const candidate = makeItem(Math.max(1, this.player.level), Math.random());
      if (candidate.rarity !== "poor") {
        item = candidate;
        break;
      }
      item = candidate;
    }

    if (item?.rarity === "poor") {
      const poorPrefix = PREFIXES.poor.find((prefix) => item.name.startsWith(`${prefix} `));
      if (poorPrefix) {
        item.name = item.name.replace(`${poorPrefix} `, `${PREFIXES.normal[Math.floor(Math.random() * PREFIXES.normal.length)]} `);
      }
      item.rarity = "normal";
      item.rarityLabel = "Normal";
      item.rarityColor = "#f5f3ea";
      item.value = itemValue(item);
    }

    if (!item || this.isDropBlocked(item)) return;

    this.loots.push({
      id: createId(),
      type: "item",
      item,
      x: chest.x + 0.16,
      y: chest.y - 0.16,
      bob: Math.random() * Math.PI * 2,
      pickupDelay: 0.35,
      despawn: GROUND_LOOT_DESPAWN_SECONDS,
    });
    this.trackItemDropped(item);
    this.addParticles(chest.x, chest.y, "#ffd85d", 18, 0.12);
    this.addFloater(chest.x, chest.y, item.name, item.rarityColor, 1.05);

    // Small chance for chest to also contain a red rose resource
    this.dropResourceLoot(chest.x, chest.y, [{ resource: "red_rose", chance: 0.05, min: 1, max: 1 }]);
  },

  dropLoot(monster) {
    const profile = monsterLootProfile(monster.typeName);
    const lootLevel = monster.lootLevel ?? monster.level;
    const stats = this.calcStats();
    this.dropResourceLoot(monster.x, monster.y, monsterResourceDrops(monster));
    this.dropQuestLoot(monster);
    this.dropReadableLoot(monster);
    const gearDropSource = monster.isBoss ? "boss" : "monster";
    if (Math.random() < profile.goldChance) {
      const gold = Math.floor((4 + Math.random() * 9) * (1 + lootLevel * 0.28) * profile.goldMult * (1 + stats.goldFind));
      this.loots.push({
        id: createId(),
        type: "gold",
        amount: gold,
        x: monster.x + (Math.random() - 0.5) * 0.5,
        y: monster.y + (Math.random() - 0.5) * 0.5,
        bob: Math.random() * Math.PI * 2,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
    }

    const unique = rollUniqueItem(lootLevel, {
      source: gearDropSource,
      biomeId: this.region.mapRegion?.id,
      chance: UNIQUE_DROP_CHANCES.monster * (1 + stats.magicFind),
    });
    if (unique && !this.isDropBlocked(unique)) {
      this.loots.push({
        id: createId(),
        type: "item",
        item: unique,
        x: monster.x + (Math.random() - 0.5) * 0.7,
        y: monster.y + (Math.random() - 0.5) * 0.7,
        bob: Math.random() * Math.PI * 2,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(unique);
    }

    const named = rollNamedItem(lootLevel, {
      source: gearDropSource,
      biomeId: this.region.mapRegion?.id,
      chanceMult: namedItemChanceMultiplier(monster) * (1 + stats.magicFind),
    });
    if (named && !this.isDropBlocked(named)) {
      this.loots.push({
        id: createId(),
        type: "item",
        item: named,
        x: monster.x + (Math.random() - 0.5) * 0.7,
        y: monster.y + (Math.random() - 0.5) * 0.7,
        bob: Math.random() * Math.PI * 2,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(named);
    }

    const category = rollLootCategory(profile.weights);
    if (!category || category === "none") return;
    if (this.isDropCategoryBlocked(category)) return;

    const item = category === "health" || category === "mana"
      ? makePotion(category, lootLevel)
      : makeItem(lootLevel, category === "weapon" ? 0.1 : category === "armor" ? 0.9 : Math.random());
    if (this.isDropBlocked(item)) return;
    this.loots.push({
      id: createId(),
      type: "item",
      item,
      x: monster.x + (Math.random() - 0.5) * 0.7,
      y: monster.y + (Math.random() - 0.5) * 0.7,
      bob: Math.random() * Math.PI * 2,
      despawn: GROUND_LOOT_DESPAWN_SECONDS,
    });
    this.trackItemDropped(item);

    if (category === "all" && Math.random() < clamp(0.08 + monster.level * 0.01, 0.08, 0.24)) {
      const potion = makePotion(Math.random() < 0.5 ? "health" : "mana", lootLevel);
      if (this.isDropBlocked(potion)) return;
      this.loots.push({
        id: createId(),
        type: "item",
        item: potion,
        x: monster.x + (Math.random() - 0.5) * 0.85,
        y: monster.y + (Math.random() - 0.5) * 0.85,
        bob: Math.random() * Math.PI * 2,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(potion);
    }
  },

  dropReadableLoot(monster) {
    for (const def of READABLE_ITEM_DEFS) {
      if (!def?.id || !def?.dropTable) continue;
      const chance = readableDropChanceForMonster(def.dropTable, monster.typeName);
      if (chance <= 0 || Math.random() > chance) continue;
      const item = makeReadableItem(def.id);
      if (!item || this.isDropBlocked(item)) continue;
      this.loots.push({
        id: createId(),
        type: "item",
        item,
        x: monster.x + (Math.random() - 0.5) * 0.7,
        y: monster.y + (Math.random() - 0.5) * 0.7,
        bob: Math.random() * Math.PI * 2,
        pickupDelay: 0.25,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(item);
    }
  },

  dropResourceLoot(x, y, entries = []) {
    const stats = this.calcStats();
    for (const entry of entries) {
      if (!entry?.resource || Math.random() > Math.min(1, (entry.chance ?? 1) * (1 + stats.resourceFind))) continue;
      const amount = Math.max(1, Math.floor(randomInt(entry.min ?? 1, entry.max ?? entry.min ?? 1) * (1 + stats.resourceFind)));
      const item = makeResourceItem(entry.resource, amount);
      if (!item || this.isDropBlocked(item)) continue;
      this.loots.push({
        id: createId(),
        type: "item",
        item,
        x: x + (Math.random() - 0.5) * 0.65,
        y: y + (Math.random() - 0.5) * 0.65,
        bob: Math.random() * Math.PI * 2,
        pickupDelay: 0.35,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(item);
    }
  },

  dropObjectItemLoot(x, y, entries = []) {
    for (const entry of entries) {
      if (!entry || Math.random() > (entry.chance ?? 0)) continue;
      const rarity = String(entry.rarity ?? "legendary");
      const tries = Math.max(1, Math.floor(Number(entry.tries) || 60));
      const levelOffset = Math.floor(Number(entry.levelOffset) || 0);
      const level = Math.max(1, this.player.level + levelOffset);
      const item = rollItemOfRarity(level, rarity, tries);
      if (!item || this.isDropBlocked(item)) continue;
      this.loots.push({
        id: createId(),
        type: "item",
        item,
        x: x + (Math.random() - 0.5) * 0.65,
        y: y + (Math.random() - 0.5) * 0.65,
        bob: Math.random() * Math.PI * 2,
        pickupDelay: 0.35,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(item);
    }
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
