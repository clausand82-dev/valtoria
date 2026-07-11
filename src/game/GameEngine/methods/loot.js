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
import { audioManager } from "../../audio-manager.js";

const FOLIAGE_LOOT_INTERACT_RANGE = 0.78;

function distanceSq(a, b) {
  const dx = (Number(a?.x) || 0) - (Number(b?.x) || 0);
  const dy = (Number(a?.y) || 0) - (Number(b?.y) || 0);
  return dx * dx + dy * dy;
}

function addTiming(bucket, key, ms) {
  if (!bucket) return;
  bucket[key] = (bucket[key] ?? 0) + ms;
}

function addLootDropTiming(engine, key, ms) {
  addTiming(engine?.lootUpdateTimings ?? null, key, ms);
}

function timedLootDrop(engine, key, action) {
  const startedAt = performance.now();
  const result = action();
  addLootDropTiming(engine, key, performance.now() - startedAt);
  return result;
}

function addInteractionTiming(engine, key, ms) {
  if (!engine?.interactionTargetTimings) return;
  engine.interactionTargetTimings[key] = (engine.interactionTargetTimings[key] ?? 0) + ms;
}

function addInteractionStateReason(engine, reason) {
  if (!engine?.interactionTargetTimings) return;
  const key = String(reason || "unknown");
  const reasons = engine.interactionTargetTimings.interactionTargetStateReasons ??= {};
  reasons[key] = (reasons[key] ?? 0) + 1;
}

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

const LOOT_CONDITION_KEYS = new Set([
  "all", "any", "not", "conditions", "requires", "blockedBy",
  "worldBalanceLydra", "worldBalanceNetdra", "corruption", "visited", "cleared", "explored", "unlocked",
  "flag", "notFlag", "counter", "quest", "questActive", "questCompleted", "questStep", "stepCompleted",
  "questStepActive", "questStepCompleted", "questStepRevealed", "questCurrentStep", "inventory",
  "cityStat", "cityArea", "cityAreas", "cityAreaLevel", "cityAreaLevels", "cityBuilding", "cityBuildings",
  "cityAddon", "cityAddons", "cityStorage", "cityInventory", "player", "playerStat", "factions",
  "factionRep", "speciesKills", "tagKills", "destroyedObjectTags", "rootRegionId", "rootMapId",
  "rootMapInstanceId", "sourceRegionId", "sourceMapId", "sourceObjectId", "sourceObjectRuntimeId",
  "subregionId", "subregionKind", "subregionDepth",
]);

function lootConditionKey(entry) {
  return Object.keys(entry ?? {}).find((key) => LOOT_CONDITION_KEYS.has(key)) ?? null;
}

function lootEntryAllowed(engine, entry, context = {}) {
  if (!entry) return false;
  const conditionKey = lootConditionKey(entry);
  // Most loot-table entries are unconditional.  Avoid normalizing the whole
  // world state for those entries; it is both stable and implicitly allowed.
  if (!conditionKey) return true;
  const cache = context.conditionCache;
  if (cache?.has(entry)) return cache.get(entry);
  const startedAt = performance.now();
  const allowed = worldEntryAllowed(entry, engine.worldState, context.conditionContext ?? context);
  const elapsed = performance.now() - startedAt;
  addLootDropTiming(engine, "lootConditionEvaluationMs", elapsed);
  const timings = engine?.lootUpdateTimings;
  if (timings) {
    timings.lootEntriesEvaluated = (timings.lootEntriesEvaluated ?? 0) + 1;
    if (elapsed > (timings.slowLootConditionMs ?? 0)) {
      timings.slowLootConditionMs = elapsed;
      timings.slowLootEntryId = String(entry.id ?? entry.itemId ?? entry.resourceId ?? entry.type ?? "unknown");
      timings.slowLootConditionKey = conditionKey;
    }
    timings.conditionKey = conditionKey;
    timings.conditionElapsedMs = elapsed;
  }
  cache?.set(entry, allowed);
  return allowed;
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
  const startedAt = performance.now();
  const finish = (value) => {
    addTiming(engine?.lootUpdateTimings ?? null, "lootQuestTargetScanMs", performance.now() - startedAt);
    return value;
  };
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
      return finish(`${item.name ?? target.questItemId}: ${Math.min(needed, rawCurrent)} / ${needed}`);
    }

    if (isResourceItem(item)) {
      const resourceId = String(item.resourceId ?? "");
      const target = (quest.target?.resources ?? []).find((entry) => (
        String(entry?.resource ?? entry?.resourceId ?? "") === resourceId
      ));
      if (target) {
        const needed = Math.max(1, Math.floor(Number(target.count) || 1));
        const rawCurrent = resourceCount(inventory, resourceId);
        if (rawCurrent - picked < needed) return finish(`${RESOURCE_DEFS[resourceId]?.name ?? item.name ?? resourceId}: ${Math.min(needed, rawCurrent)} / ${needed}`);
      }
    }

    const itemTarget = (quest.target?.items ?? []).find((entry) => questRequirementMatchesItem(entry, item));
    if (itemTarget) {
      const needed = Math.max(1, Math.floor(Number(itemTarget.count) || 1));
      const rawCurrent = inventory.filter((entry) => questRequirementMatchesItem(itemTarget, entry)).length;
      if (rawCurrent - 1 < needed) return finish(`${item.name ?? itemTarget.templateId ?? itemTarget.baseName ?? "Quest item"}: ${Math.min(needed, rawCurrent)} / ${needed}`);
    }
  }
  return finish("");
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

function addLootToast(engine, text, options = {}) {
  engine.addToast(text, { deferSnapshot: true, ...options });
}

export const lootMethods = {
  autoLootAllows(loot, normalizedRules = null) {
    const rules = normalizedRules ?? normalizeAutoLootRules(this.player.autoLoot);
    const typeId = autoLootTypeFor(loot?.item, loot?.type);
    if (rules.types[typeId] === false) return false;
    const rarityId = autoLootRarityFor(loot?.item, loot?.type);
    if (rarityId && rules.rarities[rarityId] === false) return false;
    return true;
  },

  updateLoot(dt) {
    const timings = this.lootUpdateTimings ??= {};
    const timed = (key, action) => {
      const startedAt = performance.now();
      const result = action();
      addTiming(timings, key, performance.now() - startedAt);
      return result;
    };
    const timedMerge = (action) => {
      const startedAt = performance.now();
      const result = action();
      const elapsed = performance.now() - startedAt;
      addTiming(timings, "lootMergeMs", elapsed);
      addTiming(timings, "lootInventoryMergeMs", elapsed);
      return result;
    };
    const timedLootFloater = (action) => timed("lootFloaterMs", action);
    const timedLootToast = (action) => timed("lootToastMs", action);
    this.processPendingLootDrops?.();
    const beforeLootCount = this.loots.length;
    const autoLootRules = normalizeAutoLootRules(this.player.autoLoot);
    const pickupRangeSq = 0.62 * 0.62;
    let shouldPublishSnapshot = false;
    let pickedUpItems = 0;
    for (let i = this.loots.length - 1; i >= 0; i -= 1) {
      const loot = this.loots[i];
      const despawned = timed("lootRenderStateMs", () => {
        loot.bob += dt * 4.5;
        if (Number.isFinite(Number(loot.despawn))) {
          loot.despawn -= dt;
          if (loot.despawn <= 0) {
            this.handleLootDespawn(loot);
            this.loots.splice(i, 1);
            audioManager.playSound("item_pickup", { position: loot, listener: this.player, maxDistance: 10 });
            this.markRenderDirty?.("loot-remove");
            return true;
          }
        }
        loot.pickupDelay = Math.max(0, (loot.pickupDelay || 0) - dt);
        return false;
      });
      if (despawned) continue;
      if (loot.pickupDelay > 0) continue;
      const canTryPickup = timed("lootHoverMs", () => this.autoLootAllows(loot, autoLootRules) && distanceSq(this.player, loot) < pickupRangeSq);
      if (canTryPickup) {
        if (loot.type === "gold") {
          timed("lootPickupMs", () => {
            this.player.gold += loot.amount;
            this.recordRunGold?.(loot.amount);
            this.player.stats.goldLooted += loot.amount;
            this.player.stats.goldEarned += loot.amount;
            timedLootFloater(() => this.addFloater(loot.x, loot.y, `+${loot.amount} g`, "#f1c657"));
            timedLootToast(() => addLootToast(this, `+${loot.amount} guld`));
            this.loots.splice(i, 1);
            this.markRenderDirty?.("loot-pickup");
            pickedUpItems += 1;
            shouldPublishSnapshot = true;
          });
        } else if (isPotionItem(loot.item)) {
          const before = timedMerge(() => this.potionInventoryCount?.(loot.item.potionId ?? loot.item.potionType) ?? 0);
          if (timedMerge(() => this.addPotionLoot(loot.item))) {
            const after = this.potionInventoryCount?.(loot.item.potionId ?? loot.item.potionType) ?? before + 1;
            const picked = Math.max(1, after - before);
            timed("lootPickupMs", () => {
              this.trackItemPicked(loot.item);
              this.recordRunItem?.(loot.item, picked);
              timedLootFloater(() => addPickupFloater(this, loot.x, loot.y, loot.item, picked));
              timedLootToast(() => addLootToast(this, pickupStatusText(loot.item, picked)));
              this.loots.splice(i, 1);
              audioManager.playSound("item_pickup", { position: loot, listener: this.player, maxDistance: 10 });
              this.markRenderDirty?.("loot-pickup");
              pickedUpItems += picked;
            });
            shouldPublishSnapshot = true;
          } else if (!loot.warned) {
            loot.warned = true;
            timedLootToast(() => addLootToast(this, "Potion stack er fuld"));
          }
        } else if (isQuestItem(loot.item) && timedMerge(() => this.addInventoryItem(loot.item, { countAsCollected: Boolean(loot.countAsCollected) }))) {
          timed("lootPickupMs", () => {
            this.player.stats.itemsPicked += 1;
            this.trackItemPicked(loot.item);
            this.recordRunItem?.(loot.item, 1);
            this.applyQuestItemPickup(loot.item);
            timedLootFloater(() => addPickupFloater(this, loot.x, loot.y, loot.item, 1));
            timedLootToast(() => addLootToast(this, pickupStatusText(loot.item, 1)));
            this.loots.splice(i, 1);
            audioManager.playSound("item_pickup", { position: loot, listener: this.player, maxDistance: 10 });
            this.markRenderDirty?.("loot-pickup");
            pickedUpItems += 1;
          });
          shouldPublishSnapshot = true;
        } else if (!isPotionItem(loot.item) && timedMerge(() => this.addInventoryItem(loot.item, { countAsCollected: Boolean(loot.countAsCollected) }))) {
          const picked = isResourceItem(loot.item) ? Math.max(1, Math.floor(Number(loot.item.count) || 1)) : 1;
          timed("lootPickupMs", () => {
            this.recordRunItem?.(loot.item, picked);
            if (isResourceItem(loot.item)) this.player.stats.resourcesPicked += picked;
            else {
              this.player.stats.itemsPicked += 1;
              this.trackItemPicked(loot.item);
            }
            timedLootFloater(() => addPickupFloater(this, loot.x, loot.y, loot.item, picked));
            timedLootToast(() => addLootToast(this, pickupStatusText(loot.item, picked)));
            this.loots.splice(i, 1);
            audioManager.playSound("item_pickup", { position: loot, listener: this.player, maxDistance: 10 });
            this.markRenderDirty?.("loot-pickup");
            pickedUpItems += picked;
          });
          shouldPublishSnapshot = true;
        } else if (!loot.warned) {
          loot.warned = true;
          timedLootToast(() => addLootToast(this, isPotionItem(loot.item) ? "Potion stack er fuld" : "Rygsaekken er fuld"));
        }
      }
    }
    timings.pickedUpItems = (timings.pickedUpItems ?? 0) + pickedUpItems;
    if (shouldPublishSnapshot) timed("lootSnapshotMs", () => {
      this.markSaveDirty?.("loot-pickup");
      this.scheduleSnapshotPublish?.("loot-pickup");
    });
    if (beforeLootCount !== this.loots.length) this.markRenderDirty?.("loot");
  },

  updateFoliageLoot() {
    const target = this.nearestLootableFoliage(FOLIAGE_LOOT_INTERACT_RANGE);
    const next = target ? this.foliageLootSnapshot(target) : null;
    if ((next?.id ?? null) === (this.nearbyFoliageLoot?.id ?? null)) return;
    const stateStartedAt = performance.now();
    this.nearbyFoliageLoot = next;
    this.markRenderDirty?.("foliage-target");
    addInteractionStateReason(this, "foliage-target");
    this.markUiOnlySnapshot?.("foliage-target");
    addInteractionTiming(this, "interactionTargetStateUpdateMs", performance.now() - stateStartedAt);
  },

  nearestLootableFoliage(maxRange) {
    let best = null;
    let bestD = maxRange;
    for (const chunk of this.nearbyChunks(1)) {
      for (const object of chunk.objects) {
        const collectStartedAt = performance.now();
        const valid = object?.type === "foliage" && !object.foliageLooted;
        addInteractionTiming(this, "interactionTargetCollectLootMs", performance.now() - collectStartedAt);
        if (!valid) continue;
        const distanceStartedAt = performance.now();
        if (distanceSq(this.player, object) > maxRange * maxRange) {
          addInteractionTiming(this, "interactionTargetDistanceChecksMs", performance.now() - distanceStartedAt);
          continue;
        }
        const d = distance(this.player, object);
        addInteractionTiming(this, "interactionTargetDistanceChecksMs", performance.now() - distanceStartedAt);
        if (d >= bestD) continue;
        if (!this.availableFoliageResourceDrops(object).length) continue;
        best = object;
        bestD = d;
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
    const startedAt = performance.now();
    const loot = timedLootDrop(this, "lootObjectCreationMs", () => ({
      id: createId(),
      type: "item",
      item,
      countAsCollected: Boolean(options.countAsCollected),
      x: x + (Math.random() - 0.5) * (options.spread ?? 0.7),
      y: y + (Math.random() - 0.5) * (options.spread ?? 0.7),
      bob: Math.random() * Math.PI * 2,
      pickupDelay: options.pickupDelay ?? 0,
      despawn: options.despawn ?? GROUND_LOOT_DESPAWN_SECONDS,
    }));
    timedLootDrop(this, "lootPlacementMs", () => this.loots.push(loot));
    this.lootUpdateTimings.lootObjectsCreated = (this.lootUpdateTimings.lootObjectsCreated ?? 0) + 1;
    this.trackItemDropped(item);
    timedLootDrop(this, "lootDirtyMarkMs", () => this.markRenderDirty?.("loot-drop"));
    addTiming(this.lootUpdateTimings ??= {}, "lootDropCreationMs", performance.now() - startedAt);
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
        const definition = timedLootDrop(this, "lootNamedCheckMs", () => NAMED_ITEM_TEMPLATES.find((candidate) => String(candidate.id) === String(id)));
        if (!definition) return null;
        if (!lootEntryAllowed(this, definition, context)) return null;
        return makeNamedItem(definition, level);
      }
      const monster = context.monster;
      const chanceMult = entry.chanceMult === "monster"
        ? namedItemChanceMultiplier(monster) * (1 + (this.calcStats().magicFind ?? 0))
        : Number(entry.chanceMult ?? 1) * (1 + (entry.magicFind ? this.calcStats().magicFind ?? 0 : 0));
      return timedLootDrop(this, "lootNamedCheckMs", () => rollNamedItem(level, {
        source: monster?.isBoss ? "boss" : entry.source ?? context.source ?? "monster",
        biomeId: this.region.mapRegion?.id,
        chanceMult,
        worldState: this.worldState,
        conditionContext: context.conditionContext ?? {},
      }));
    }
    if (type === "unique") {
      const id = entry.itemId ?? entry.id;
      if (id) {
        const definition = timedLootDrop(this, "lootUniqueCheckMs", () => UNIQUE_ITEMS.find((candidate) => String(candidate.id) === String(id)));
        if (!definition) return null;
        if (!lootEntryAllowed(this, definition, context)) return null;
        return makeUniqueItem(definition, level);
      }
      const monster = context.monster;
      const baseChance = Number(entry.chance ?? UNIQUE_DROP_CHANCES.monster) || 0;
      const chance = baseChance * (1 + (entry.magicFind ? this.calcStats().magicFind ?? 0 : 0));
      return timedLootDrop(this, "lootUniqueCheckMs", () => rollUniqueItem(level, {
        source: monster?.isBoss ? "boss" : entry.source ?? context.source ?? "monster",
        biomeId: this.region.mapRegion?.id,
        chance,
        worldState: this.worldState,
        conditionContext: context.conditionContext ?? {},
      }));
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
    const stats = context.lootStats ?? (context.lootStats = this.calcStats());
    const cityModifiers = context.lootCityModifiers ?? (context.lootCityModifiers = cityRuntimeModifiers(this.cityStats));
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
    const startedAt = performance.now();
    const finish = (drops) => {
      const timings = this.lootUpdateTimings;
      if (timings) {
        timings.entryId = String(entry?.id ?? entry?.itemId ?? entry?.resourceId ?? entry?.type ?? "unknown");
        timings.entryElapsedMs = performance.now() - startedAt;
        timings.entriesEvaluatedThisFrame = (timings.entriesEvaluatedThisFrame ?? 0) + 1;
        if (timings.entryElapsedMs > 0.5) console.warn("[performance] slow loot entry", { entryId: timings.entryId, elapsed: timings.entryElapsedMs, tableId: timings.lootTableId ?? null });
      }
      return drops;
    };
    if (!lootEntryAllowed(this, entry, context)) return finish([]);
    const type = String(entry.type ?? "").trim();
    if (type === "gold") {
      if (Math.random() > this.lootEntryChance(entry, context)) return finish([]);
      const source = context.sourceEntity ?? context.monster ?? this.player;
      const level = Math.max(1, Math.floor(Number(source?.lootLevel ?? source?.level ?? this.player?.level) || 1));
      const cityModifiers = context.lootCityModifiers ?? (context.lootCityModifiers = cityRuntimeModifiers(this.cityStats));
      const stats = context.lootStats ?? (context.lootStats = this.calcStats());
      const gold = Math.floor((4 + Math.random() * 9) * (1 + level * 0.28) * Number(entry.goldMult ?? 1) * (1 + stats.goldFind) * (cityModifiers.goldDropMultiplier ?? 1));
      return finish(gold > 0 ? [{ type: "gold", amount: gold }] : []);
    }
    const rollsInternally = (type === "unique" || type === "named") && !(entry.itemId ?? entry.id);
    if (!rollsInternally && Math.random() > this.lootEntryChance(entry, context)) return finish([]);
    const item = timedLootDrop(this, "lootObjectCreationMs", () => this.createLootEntryItem(entry, context));
    if (!item || this.isDropBlocked(item)) return finish([]);
    return finish([{ type: "item", item, countAsCollected: type === "resource" || Boolean(entry.countAsCollected) }]);
  },

  rollLootTable(tableId, context = {}) {
    const startedAt = performance.now();
    if (this.lootUpdateTimings) this.lootUpdateTimings.lootTableId = String(tableId);
    const drops = timedLootDrop(this, "lootTableRollMs", () => {
      const entries = LOOT_TABLES[String(tableId)] ?? [];
      if (!Array.isArray(entries) || !entries.length) return [];
      const drops = [];
      for (const entry of entries) {
        if (entry?.weight) continue;
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
    });
    const timings = this.lootUpdateTimings;
    if (timings) {
      timings.lootTablesRolled = (timings.lootTablesRolled ?? 0) + 1;
      const elapsed = performance.now() - startedAt;
      if (elapsed > (timings.slowLootTableMs ?? 0)) {
        timings.slowLootTableMs = elapsed;
        timings.slowLootTableId = String(tableId);
      }
      timings.lootTableId = String(tableId);
      timings.tableElapsedMs = elapsed;
      if (elapsed > 1) console.warn("[performance] slow loot table", { tableId, elapsed, jobId: context.lootJobId ?? null });
    }
    return drops;
  },

  rollLootTables(tableIds = [], context = {}) {
    return tableIds.flatMap((tableId) => this.rollLootTable(tableId, context));
  },

  dropLootFromTables(x, y, tableIds = [], context = {}, options = {}) {
    const startedAt = performance.now();
    const drops = this.rollLootTables(tableIds, context);
    for (const drop of drops) {
      if (drop.type === "gold") {
        const loot = timedLootDrop(this, "lootObjectCreationMs", () => ({
          id: createId(),
          type: "gold",
          amount: drop.amount,
          x: x + (Math.random() - 0.5) * (options.spread ?? 0.5),
          y: y + (Math.random() - 0.5) * (options.spread ?? 0.5),
          bob: Math.random() * Math.PI * 2,
          despawn: GROUND_LOOT_DESPAWN_SECONDS,
        }));
        timedLootDrop(this, "lootPlacementMs", () => this.loots.push(loot));
        this.lootUpdateTimings.lootObjectsCreated = (this.lootUpdateTimings.lootObjectsCreated ?? 0) + 1;
        timedLootDrop(this, "lootDirtyMarkMs", () => this.markRenderDirty?.("loot-drop"));
      } else if (drop.item) {
        this.dropGroundItem(x, y, drop.item, { spread: options.spread ?? 0.7, pickupDelay: options.pickupDelay ?? 0.35, countAsCollected: drop.countAsCollected });
      }
    }
    addTiming(this.lootUpdateTimings ??= {}, "lootDropCreationMs", performance.now() - startedAt);
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
    if (monster && this.enqueueMonsterLootDrop?.(monster)) return;
    this.dropMonsterLootNow(monster);
  },

  dropMonsterLootNow(monster) {
    const rareMode = monster?.lootMode === "override" ? "override" : "add";
    if (rareMode !== "override") {
      timedLootDrop(this, "lootQuestDropCheckMs", () => this.dropQuestLoot(monster));
      this.dropLootFromTables(monster.x, monster.y, normalizeLootTableRefs(monster), {
        source: "monster",
        monster,
        sourceEntity: monster,
        conditionContext: this.questConditionContext?.({ monster, source: monster.isBoss ? "boss" : "monster", sourceRegionId: this.region?.mapRegion?.id }) ?? {},
      });
    }

    this.dropInstanceLootTables(monster);
  },

  enqueueMonsterLootDrop(monster) {
    if (!monster || monster.__lootDropQueued) {
      if (monster?.__lootDropQueued && this.monsterDeathTimings) {
        this.monsterDeathTimings.duplicateLootJobsPrevented = (this.monsterDeathTimings.duplicateLootJobsPrevented ?? 0) + 1;
      }
      return false;
    }
    const deathTimings = this.activeMonsterDeathTimings;
    const preparationStartedAt = deathTimings ? performance.now() : 0;
    monster.__lootDropQueued = true;
    this.pendingLootDrops ??= [];
    const nextJobId = () => `loot-${(this.nextLootDropJobId = (this.nextLootDropJobId ?? 0) + 1)}`;
    // Do not resolve tables or create an expensive condition context here.  The
    // job captures stable death inputs and lets the resumable processor create
    // its working context in the following frame.
    const normalTables = normalizeLootTableRefs(monster);
    const instanceTables = normalizeLootTableRefs({ lootTables: monster?.instanceLootTables });
    const enqueueGeneration = this.lootProcessingGeneration ?? 0;
    const deathSource = this.activeMonsterDeathSource ?? {};
    const deathSnapshot = Object.freeze({
      monsterId: monster.id ?? null,
      monsterType: monster.typeName ?? null,
      monsterLevel: Math.max(0, Math.floor(Number(monster.lootLevel ?? monster.level) || 0)),
      regionId: this.region?.mapRegion?.id ?? null,
      subregionId: this.activeSubregion?.id ?? null,
      x: Number(monster.x) || 0,
      y: Number(monster.y) || 0,
      isRare: Boolean(monster.elite), isNamed: Boolean(monster.named), isBoss: Boolean(monster.isBoss || monster.boss),
      deathSourceType: deathSource.type ?? null, deathSourceId: deathSource.id ?? null,
      deathSourceSpellId: deathSource.spellId ?? null,
    });
    const jobBase = (source) => ({
      monster,
      source,
      deathSourceType: deathSource.type ?? null,
      deathSnapshot,
      enqueueGeneration,
      eligibleGeneration: enqueueGeneration + 1,
      enqueuedFrame: enqueueGeneration,
    });
    const queueJob = (job) => {
      const descriptor = Object.freeze({
        ...job,
        tableIds: job.tableIds ? Object.freeze([...job.tableIds]) : undefined,
      });
      this.pendingLootDrops.push(descriptor);
      this.lootJobsQueuedThisFrame = (this.lootJobsQueuedThisFrame ?? 0) + 1;
      const lootTimings = this.lootUpdateTimings;
      if (lootTimings) {
        lootTimings.lootJobsQueuedThisFrame = (lootTimings.lootJobsQueuedThisFrame ?? 0) + 1;
        const sourceType = descriptor.deathSourceType;
        if (sourceType === "groundHazard") lootTimings.lootQueuedFromGroundHazardDeath += 1;
        else if (sourceType === "projectile") lootTimings.lootQueuedFromProjectileDeath += 1;
        else if (sourceType === "melee") lootTimings.lootQueuedFromMeleeDeath += 1;
        else lootTimings.lootQueuedFromMonsterDeath += 1;
      }
    };
    const rareMode = monster?.lootMode === "override" ? "override" : "add";
    if (rareMode !== "override") {
      queueJob({
        id: nextJobId(),
        type: "quest",
        x: monster.x,
        y: monster.y,
        ...jobBase("monster"),
      });
      for (const tableId of normalTables) {
        queueJob({
          id: nextJobId(),
          type: "table",
          x: monster.x,
          y: monster.y,
          tableIds: [tableId],
          ...jobBase("monster"),
        });
      }
    }
    for (const tableId of instanceTables) {
      queueJob({
        id: nextJobId(),
        type: "table",
        x: monster.x,
        y: monster.y,
        tableIds: [tableId],
        ...jobBase("rare_mob"),
      });
    }
    if (deathTimings) {
      deathTimings.monsterDeathLootPreparationMs = (deathTimings.monsterDeathLootPreparationMs ?? 0) + (performance.now() - preparationStartedAt);
    }
    return true;
  },

  processPendingLootDrops(maxMs = 2) {
    const queue = this.pendingLootDrops;
    if (!Array.isArray(queue) || queue.length <= 0) return;
    this.lootUpdateTimings ??= {};
    const startedAt = performance.now();
    let processed = 0;
    const generation = this.lootProcessingGeneration ?? 0;
    const firstEligible = (queue[0]?.eligibleGeneration ?? generation) <= generation ? queue[0] : null;
    this.lootUpdateTimings.lootJobsEligibleThisFrame = this.lootJobsEligibleThisFrame ?? 0;
    this.lootUpdateTimings.lootJobsDeferredBecauseNew = this.lootJobsQueuedThisFrame ?? 0;
    this.lootUpdateTimings.lootOldestEligibleJobAgeFrames = firstEligible
      ? Math.max(0, generation - (firstEligible.enqueuedFrame ?? generation)) : 0;
    this.lootUpdateTimings.lootProcessingGeneration = generation;
    if (!firstEligible) return;
    while (queue.length > 0 && performance.now() - startedAt < maxMs) {
      if ((queue[0]?.eligibleGeneration ?? generation) > generation) break;
      const job = queue.shift();
      this.lootJobsEligibleThisFrame = Math.max(0, (this.lootJobsEligibleThisFrame ?? 0) - 1);
      const jobStartedAt = performance.now();
      this.lootUpdateTimings.currentLootJobId = job?.id ?? null;
      this.lootUpdateTimings.sourceType = job?.context?.source ?? job?.type ?? null;
      this.lootUpdateTimings.sourceId = job?.monster?.id ?? job?.context?.monster?.id ?? null;
      this.lootUpdateTimings.jobStage = job?.type ?? "unknown";
      if (job?.type === "quest") {
        timedLootDrop(this, "lootQuestDropCheckMs", () => this.dropQuestLoot(job.monster));
      } else if (job?.type === "table") {
        const context = typeof job.contextFactory === "function" ? job.contextFactory() : (job.context ?? {
          monster: job.monster,
          sourceEntity: job.monster,
          source: job.source ?? "monster",
          conditionContext: this.questConditionContext?.({
            monster: job.monster,
            source: job.source === "monster" && job.monster?.isBoss ? "boss" : job.source,
            sourceRegionId: this.region?.mapRegion?.id,
          }) ?? {},
          conditionCache: new Map(),
          lootStats: this.calcStats(),
          lootCityModifiers: cityRuntimeModifiers(this.cityStats),
        });
        if (context) context.lootJobId = job.id;
        this.dropLootFromTables(job.x, job.y, job.tableIds, context, job.options ?? {});
      }
      processed += 1;
      if (performance.now() - startedAt >= maxMs || performance.now() - jobStartedAt >= maxMs) break;
    }
    this.lootUpdateTimings.lootQueuedJobsProcessed = (this.lootUpdateTimings.lootQueuedJobsProcessed ?? 0) + processed;
    this.lootUpdateTimings.lootDropJobsQueued = queue.length + processed;
    this.lootUpdateTimings.lootDropJobsDeferred = queue.length;
    this.lootUpdateTimings.lootDropBudgetMs = maxMs;
    const elapsed = performance.now() - startedAt;
    this.lootUpdateTimings.frameLootElapsedMs = elapsed;
    this.lootUpdateTimings.jobElapsedTotalMs = elapsed;
    this.lootUpdateTimings.lootDropBudgetHit = elapsed >= maxMs;
    this.lootUpdateTimings.deferredBecauseBudget = this.lootUpdateTimings.lootDropBudgetHit && queue.length > 0;
    if (elapsed > maxMs) console.warn("[performance] loot drop frame budget exceeded", {
      elapsed, maxMs, processed, deferred: queue.length, jobId: this.lootUpdateTimings.currentLootJobId,
    });
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
