import {
  MAX_INVENTORY,
  PREFIXES,
  RARITIES,
  createId,
  itemValue,
  clamp,
  distance,
  DESTROYED_ITEM_RESOURCE_DROPS,
  RESOURCE_DEFS,
  isPotionItem,
  isQuestItem,
  isReadableItem,
  isResourceItem,
  MAX_POTION_STACK,
  GROUND_LOOT_DESPAWN_SECONDS
} from "../dependencies.js";
import {
  itemsCanMerge,
  makeResourceItem,
  normalizeReadableBonuses,
  makeReadableItem,
  readableMergeRecipesFor,
  readableMergeOption,
  consumeReadableInputs,
  resourceMergeRecipeFor,
  resourceMergeRecipesFor,
  resourceMergeOption,
  resourceCount,
  consumeResourceInputs,
  resourceOutputCanFitAfterMerge,
  resourceStackMax,
  randomInt,
  incrementStatMap,
  decrementStatMap,
  itemRarityBucket,
  inventoryCanAccept
} from "../helpers.js";
import {
  SKILL_TREE_NODE_BY_ID,
  normalizeSkillTree,
  skillTreeAvailablePoints,
  skillTreeBranchSpentPoints,
} from "../../config/skill-tree-config.js";
import {
  GEM_SOCKET_BONUSES,
  MAX_ITEM_SOCKETS,
  itemCanHaveSockets,
  normalizeSockets,
} from "../../config/socket-config.js";
import {
  ITEM_REPAIR_GOLD_PER_PCT,
  ITEM_REPAIR_JUNK_PER_PCT,
} from "../../config/durability-config.js";

function recipeRequiresResearchLab(recipe) {
  if (recipe?.station === "research_lab") return true;
  const ids = [...Object.keys(recipe?.inputs ?? {}), recipe?.output].map(String);
  return ids.some((id) => id === "diamond" || id.includes("gemstone"));
}

export const inventoryMethods = {
  levelUpIfNeeded() {
    let needed = this.xpForNextLevel();
    while (this.player.xp >= needed) {
      this.player.xp -= needed;
      this.player.level += 1;
      const stats = this.calcStats();
      this.player.hp = stats.maxHp;
      this.player.mana = stats.maxMana;
      this.addFloater(this.player.x, this.player.y, `Level ${this.player.level}`, "#f4da96", 1.2);
      this.addToast(`Level ${this.player.level}`);
      needed = this.xpForNextLevel();
    }
    this.publishSnapshot();
  },

  awardXp(amount, label = "XP") {
    const xp = this.modifiedXp(amount);
    if (xp <= 0) return false;
    this.player.xp += xp;
    this.addToast(`+${xp} XP ${label}`);
    this.levelUpIfNeeded();
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  modifiedXp(amount) {
    const base = Math.max(0, Math.floor(Number(amount) || 0));
    if (base <= 0) return 0;
    const stats = this.calcStats?.() ?? {};
    return Math.max(0, Math.floor(base * (1 + (Number(stats.xpGain) || 0))));
  },

  buySkillTreeRank(nodeId) {
    const node = SKILL_TREE_NODE_BY_ID[nodeId];
    if (!node) return false;
    const tree = normalizeSkillTree(this.player.skillTree);
    const currentRank = tree[nodeId] ?? 0;
    if (currentRank >= node.maxRank) return false;
    if (skillTreeAvailablePoints(this.player.level, tree) <= 0) {
      this.addToast("Ingen skill points");
      return false;
    }
    const branchPoints = skillTreeBranchSpentPoints(tree, node.branchId);
    if (branchPoints < (node.requiresBranchPoints ?? 0)) {
      this.addToast("Flere points i grenen kraeves");
      return false;
    }
    tree[nodeId] = currentRank + 1;
    this.player.skillTree = tree;
    const stats = this.calcStats();
    this.player.hp = clamp(this.player.hp, 1, stats.maxHp);
    this.player.mana = clamp(this.player.mana, 0, stats.maxMana);
    this.addToast(`${node.title} ${tree[nodeId]}/${node.maxRank}`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  unlockSpell(spellId, label = "Spellbook") {
    const id = String(spellId ?? "");
    if (!id) return false;
    const unlocked = new Set(this.player.unlockedSpells ?? []);
    if (unlocked.has(id)) return false;
    unlocked.add(id);
    this.player.unlockedSpells = [...unlocked];
    if (!this.player.activeSpellId) this.player.activeSpellId = id;
    this.addToast(`${label}: spell unlocked`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  setActiveSpell(spellId) {
    const id = String(spellId ?? "");
    if (!id || !(this.player.unlockedSpells ?? []).includes(id)) return false;
    this.player.activeSpellId = id;
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  socketAddCost(item) {
    const sockets = normalizeSockets(item?.sockets);
    return 500 * (sockets.length + 1);
  },

  addSocketToInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!itemCanHaveSockets(item)) {
      this.addToast("Item kan ikke faa sockets");
      return false;
    }
    const sockets = normalizeSockets(item.sockets);
    if (sockets.length >= MAX_ITEM_SOCKETS) {
      this.addToast("Max sockets");
      return false;
    }
    const cost = this.socketAddCost(item);
    if ((this.player.gold ?? 0) < cost) {
      this.addToast("Ikke nok guld");
      return false;
    }
    this.player.gold -= cost;
    item.sockets = [...sockets, null];
    item.value = itemValue(item);
    this.addToast(`Socket added: ${cost} g`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  socketGemIntoInventoryItem(itemIndex, gemIndex) {
    if (itemIndex === gemIndex) return false;
    const item = this.player.inventory[itemIndex];
    const gem = this.player.inventory[gemIndex];
    if (!itemCanHaveSockets(item) || !isResourceItem(gem) || !GEM_SOCKET_BONUSES[gem.resourceId]) {
      this.addToast("Ugyldig socket kombination");
      return false;
    }
    const sockets = normalizeSockets(item.sockets);
    const emptyIndex = sockets.findIndex((socket) => !socket);
    if (emptyIndex < 0) {
      this.addToast("Ingen tom socket");
      return false;
    }
    sockets[emptyIndex] = { resourceId: gem.resourceId };
    item.sockets = sockets;
    const count = Math.max(1, Math.floor(Number(gem.count) || 1));
    if (count > 1) gem.count = count - 1;
    else this.player.inventory.splice(gemIndex, 1);
    item.value = itemValue(item);
    this.addToast(`${RESOURCE_DEFS[gem.resourceId]?.name ?? gem.resourceId} socketed`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  addArmy(amount, label = "supplies") {
    const value = Math.max(0, Math.floor(Number(amount) || 0));
    if (value <= 0) return false;
    if (!this.player.stats) this.player.stats = {};
    this.player.stats.army = Math.max(0, Math.floor(Number(this.player.stats.army) || 0)) + value;
    this.addToast(`+${value} army fra ${label}`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  addGold(amount, label = "Gold") {
    const gold = Math.max(0, Math.floor(Number(amount) || 0));
    if (gold <= 0) return false;
    this.player.gold = Math.max(0, Math.floor(Number(this.player.gold) || 0)) + gold;
    this.player.stats.goldEarned += gold;
    this.addToast(`+${gold} g ${label}`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  equipItem(index) {
    const item = this.player.inventory[index];
    if (!item) return;
    if (isResourceItem(item)) return;
    if (isPotionItem(item)) {
      this.usePotion(item.potionType, index);
      return;
    }
    let slotId = item.slot;
    if (slotId === "ring") {
      slotId = !this.player.equipment.ring1 ? "ring1" : !this.player.equipment.ring2 ? "ring2" : "ring1";
    }

    const old = this.player.equipment[slotId];
    this.player.equipment[slotId] = item;
    this.player.inventory.splice(index, 1);
    if (old) this.addInventoryItem(old);

    const stats = this.calcStats();
    this.player.hp = clamp(this.player.hp, 1, stats.maxHp);
    this.player.mana = clamp(this.player.mana, 0, stats.maxMana);
    this.addToast(`Udstyret: ${item.name}`);
    this.publishSnapshot();
  },

  usePotion(type, preferredIndex = -1) {
    if (this.potionCooldown > 0) return;
    const count = Math.max(0, Math.floor(Number(this.player.potions?.[type]) || 0));
    if (count <= 0) return;

    const stats = this.calcStats();
    const pct = 0.25;
    if (type === "health") {
      this.player.hp = clamp(this.player.hp + stats.maxHp * pct, 0, stats.maxHp);
      this.addFloater(this.player.x, this.player.y, `+${Math.floor(stats.maxHp * pct)} liv`, "#58d96d", 0.95);
    } else {
      this.player.mana = clamp(this.player.mana + stats.maxMana * pct, 0, stats.maxMana);
      this.addFloater(this.player.x, this.player.y, `+${Math.floor(stats.maxMana * pct)} mana`, "#58bfff", 0.95);
    }
    this.player.potions[type] = Math.max(0, count - 1);
    if (type === "health") this.player.stats.healthPotionsUsed += 1;
    if (type === "mana") this.player.stats.manaPotionsUsed += 1;
    this.potionCooldown = 0.5;
    this.publishSnapshot();
  },

  restoreVitalsForCity() {
    const stats = this.calcStats();
    this.player.hp = stats.maxHp;
    this.player.mana = stats.maxMana;
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  readInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!item || !isReadableItem(item) || item.readableStatus !== "readable") return null;
    const text = String(item.storyText ?? "").trim();
    if (!text) {
      this.addToast("Ingen tekst at laese");
      return null;
    }
    this.player.stats.readablesRead = Math.max(0, Math.floor(Number(this.player.stats.readablesRead) || 0)) + 1;
    const startedQuest = this.startReadableQuest?.(item) ?? null;
    this.publishSnapshot();
    return {
      type: "readable-text",
      title: item.name,
      text,
      questStarted: startedQuest ? {
        title: startedQuest.title,
        npcName: startedQuest.npcName,
        sourceLabel: startedQuest.sourceLabel,
      } : null,
    };
  },

  consumeInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!item || !isReadableItem(item) || item.readableStatus !== "consumable") return false;
    const effect = item.consumableEffect ?? {};
    const bonuses = normalizeReadableBonuses(this.player.readableBonuses);
    const delta = normalizeReadableBonuses(effect.statBonuses ?? effect);
    this.player.readableBonuses = {
      maxHp: bonuses.maxHp + delta.maxHp,
      maxMana: bonuses.maxMana + delta.maxMana,
      armor: bonuses.armor + delta.armor,
      damageMin: bonuses.damageMin + delta.damageMin,
      damageMax: bonuses.damageMax + delta.damageMax,
      range: Number((bonuses.range + delta.range).toFixed(2)),
      speed: Number((bonuses.speed + delta.speed).toFixed(2)),
      magic: bonuses.magic + delta.magic,
    };
    this.player.inventory.splice(index, 1);
    this.player.stats.readablesConsumed = Math.max(0, Math.floor(Number(this.player.stats.readablesConsumed) || 0)) + 1;
    const stats = this.calcStats();
    this.player.hp = clamp(this.player.hp, 1, stats.maxHp);
    this.player.mana = clamp(this.player.mana, 0, stats.maxMana);
    const label = String(effect.label ?? "Laest og forbrugt");
    this.addToast(`${item.name}: ${label}`);
    this.publishSnapshot();
    return true;
  },

  dropInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!item) return;
    // Prevent dropping quest items
    if (isQuestItem(item)) {
      this.addToast("Du kan ikke droppe quest items!");
      return;
    }
    // Prevent dropping any items in city
    if (this.player?.region?.id === "city" || this.player?.region?.id === "village" || this.player?.region?.id === "sunk-city") {
      this.addToast("Du kan ikke droppe items i byen!");
      return;
    }
    this.player.inventory.splice(index, 1);
    this.loots.push({
      id: createId(),
      type: "item",
      item,
      x: this.player.x + this.player.facingX * 0.75 + (Math.random() - 0.5) * 0.22,
      y: this.player.y + this.player.facingY * 0.75 + (Math.random() - 0.5) * 0.22,
      bob: Math.random() * Math.PI * 2,
      pickupDelay: 0.9,
      despawn: GROUND_LOOT_DESPAWN_SECONDS,
    });
    this.addToast(`Droppet: ${item.name}`);
    this.publishSnapshot();
  },

  takeInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!item) return null;
    this.player.inventory.splice(index, 1);
    this.publishSnapshot();
    return item;
  },

  takeInventoryItemCount(index, count = 1) {
    const item = this.player.inventory[index];
    if (!item) return null;
    const requested = Math.max(1, Math.floor(Number(count) || 1));
    if (!isResourceItem(item)) {
      this.player.inventory.splice(index, 1);
      this.publishSnapshot();
      return item;
    }
    const current = Math.max(1, Math.floor(Number(item.count) || 1));
    const moved = Math.min(current, requested);
    const taken = { ...item, count: moved };
    if (current > moved) {
      item.count = current - moved;
    } else {
      this.player.inventory.splice(index, 1);
    }
    this.publishSnapshot();
    return taken;
  },

  returnInventoryItem(item) {
    const accepted = this.addInventoryItem(item);
    if (accepted) this.publishSnapshot();
    return accepted;
  },

  consumeResource(resourceId, amount) {
    const count = Math.max(0, Math.floor(Number(amount) || 0));
    if (!resourceId || count <= 0) return 0;
    const available = resourceCount(this.player.inventory, resourceId);
    const used = Math.min(available, count);
    if (used <= 0) return 0;
    consumeResourceInputs(this.player.inventory, { [resourceId]: used });
    this.addToast(`Used ${used}x ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`);
    this.publishSnapshot();
    return used;
  },

  consumeGold(amount) {
    const count = Math.max(0, Math.floor(Number(amount) || 0));
    if (count <= 0) return 0;
    const used = Math.min(Math.max(0, Math.floor(Number(this.player.gold) || 0)), count);
    if (used <= 0) return 0;
    this.player.gold -= used;
    this.addToast(`Used ${used} gold`);
    this.publishSnapshot();
    return used;
  },

  destroyInventoryItem(index, force = false) {
    const item = this.player.inventory[index];
    if (!item) return;
    if (item.rarity === "legendary" && !force) {
      this.addToast("Bekraeft destroy af roedt udstyr");
      return;
    }
    this.player.inventory.splice(index, 1);
    if (!isResourceItem(item)) {
      this.player.stats.itemsDestroyed += 1;
      incrementStatMap(this.player.stats.itemsDestroyedByRarity, itemRarityBucket(item));
    }
    this.dropDestroyedItemResources(item);
    this.addToast(`Destrueret: ${item.name}`);
    this.publishSnapshot();
  },

  forgeDestroyInventoryWeapon(index) {
    const item = this.player.inventory[index];
    if (!item) return false;
    if (item.slot !== "weapon") {
      this.addToast("Forge kan kun destruere vaaben");
      return false;
    }
    this.destroyInventoryItem(index, true);
    this.saveProgress({ force: true });
    return true;
  },

  smeltGoldToIngot(count = 1) {
    const batches = Math.max(1, Math.floor(Number(count) || 1));
    const cost = batches * 1000;
    if (Math.max(0, Math.floor(Number(this.player.gold) || 0)) < cost) {
      this.addToast("Kraever 1000 gold pr. gold ingot");
      return false;
    }
    const output = makeResourceItem("gold_ingot", batches);
    if (!output) {
      this.addToast("gold_ingot mangler resource config");
      return false;
    }
    const simulated = this.player.inventory.map((item) => ({ ...item }));
    if (!inventoryCanAccept(simulated, output)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    this.player.gold -= cost;
    if (!this.addInventoryItem(output)) {
      this.player.gold += cost;
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    this.addToast(`Smelted ${cost} gold til ${batches}x ${output.name}`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  smeltGoldToBar(count = 1) {
    const batches = Math.max(1, Math.floor(Number(count) || 1));
    const popularity = clamp(Number(this.player.popularity) || 0, 0, 100);
    const priceMult = clamp(1.25 - (popularity / 100) * 0.5, 0.75, 1.25);
    const unitCost = Math.max(1, Math.round(1000 * priceMult));
    const cost = batches * unitCost;
    if (Math.max(0, Math.floor(Number(this.player.gold) || 0)) < cost) {
      this.addToast(`Kraever ${unitCost} gold pr. gold bar`);
      return false;
    }
    const output = makeResourceItem("gold_bar", batches);
    if (!output) {
      this.addToast("gold_bar mangler resource config");
      return false;
    }
    const simulated = this.player.inventory.map((item) => ({ ...item }));
    if (!inventoryCanAccept(simulated, output)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    this.player.gold -= cost;
    if (!this.addInventoryItem(output)) {
      this.player.gold += cost;
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    this.addToast(`Smelted ${cost} gold til ${batches}x ${output.name}`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  convertResourceToResource(inputResourceId, inputCount, outputResourceId, outputCount = 1) {
    const cost = Math.max(1, Math.floor(Number(inputCount) || 1));
    const outCount = Math.max(1, Math.floor(Number(outputCount) || 1));
    const output = makeResourceItem(outputResourceId, outCount);
    if (!output) {
      this.addToast(`${outputResourceId} mangler resource config`);
      return false;
    }
    if (resourceCount(this.player.inventory, inputResourceId) < cost) {
      this.addToast(`Kraever ${cost}x ${RESOURCE_DEFS[inputResourceId]?.name ?? inputResourceId}`);
      return false;
    }
    const simulated = this.player.inventory.map((item) => ({ ...item }));
    consumeResourceInputs(simulated, { [inputResourceId]: cost });
    if (!inventoryCanAccept(simulated, output)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    consumeResourceInputs(this.player.inventory, { [inputResourceId]: cost });
    this.addInventoryItem(output);
    this.addToast(`Created ${outCount}x ${output.name}`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  mergeResearchResourceRecipe(outputResourceId) {
    const recipe = RESOURCE_MERGE_RECIPES.find((entry) => String(entry.output) === String(outputResourceId));
    if (!recipe) return false;
    for (const [resourceId, needed] of Object.entries(recipe.inputs ?? {})) {
      if (resourceCount(this.player.inventory, resourceId) < Math.max(1, Math.floor(Number(needed) || 1))) {
        this.addToast("Ikke nok resources til recipe");
        return false;
      }
    }
    const output = makeResourceItem(recipe.output, recipe.count ?? 1);
    if (!output) return false;
    const simulated = this.player.inventory.map((item) => ({ ...item }));
    consumeResourceInputs(simulated, recipe.inputs ?? {});
    if (!inventoryCanAccept(simulated, output)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    consumeResourceInputs(this.player.inventory, recipe.inputs ?? {});
    this.addInventoryItem(output);
    this.addToast(`Merged: ${output.name}`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  extractArcaneEssence(index) {
    const item = this.player.inventory[index];
    if (!item) return false;
    if (item.unique || item.named || item.mode === "resource" || item.mode === "potion" || item.mode === "readable") {
      this.addToast("Kan ikke extrahe magi fra dette item");
      return false;
    }
    const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
    const normalIndex = RARITIES.findIndex((rarity) => rarity.id === "normal");
    if (rarityIndex < 0 || rarityIndex <= normalIndex) {
      this.addToast("Kraever groent eller bedre item");
      return false;
    }
    const essenceCount = Math.max(1, rarityIndex - normalIndex);
    const essence = makeResourceItem("magic_essence", essenceCount);
    if (!essence) {
      this.addToast("magic_essence mangler resource config");
      return false;
    }
    const simulated = this.player.inventory.map((entry, entryIndex) => (entryIndex === index ? null : entry)).filter(Boolean);
    if (!inventoryCanAccept(simulated, essence)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    const normal = RARITIES[normalIndex] ?? RARITIES.find((rarity) => rarity.id === "normal");
    const currentRarity = RARITIES[rarityIndex];
    const statRatio = (normal?.mult ?? 1) / (currentRarity?.mult ?? 1);
    item.damageMin = Math.max(item.damageMin ? 1 : 0, Math.floor((Number(item.damageMin) || 0) * statRatio));
    item.damageMax = Math.max(item.damageMin ? item.damageMin + 1 : 0, Math.floor((Number(item.damageMax) || 0) * statRatio));
    item.armor = Math.floor((Number(item.armor) || 0) * statRatio);
    item.maxHp = Math.floor((Number(item.maxHp) || 0) * statRatio);
    item.maxMana = Math.floor((Number(item.maxMana) || 0) * statRatio);
    item.speed = Number(((Number(item.speed) || 0) * statRatio).toFixed(2));
    item.magic = Math.floor((Number(item.magic) || 0) * statRatio);
    item.rarity = normal?.id ?? "normal";
    item.rarityLabel = normal?.label ?? "Normal";
    item.rarityColor = normal?.color ?? "#f5f3ea";
    item.name = item.baseName ?? item.name;
    item.value = itemValue(item);
    this.addInventoryItem(essence);
    this.addToast(`Extracted ${essence.count}x ${essence.name}`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  dropDestroyedItemResources(item) {
    const profile = DESTROYED_ITEM_RESOURCE_DROPS[item.unique ? "unique" : item.rarity] ?? DESTROYED_ITEM_RESOURCE_DROPS.normal;
    const entries = [
      ...(profile.guaranteed ?? []).map((entry) => ({ ...entry, chance: 1 })),
      ...(profile.rare ?? []),
    ];
    for (const entry of entries) {
      if (Math.random() > (entry.chance ?? 1)) continue;
      const resource = makeResourceItem(entry.resource, randomInt(entry.min ?? 1, entry.max ?? entry.min ?? 1));
      if (!resource) continue;
      if (this.addInventoryItem(resource)) continue;
      this.loots.push({
        id: createId(),
        type: "item",
        item: resource,
        x: this.player.x + this.player.facingX * 0.72 + (Math.random() - 0.5) * 0.35,
        y: this.player.y + this.player.facingY * 0.72 + (Math.random() - 0.5) * 0.35,
        bob: Math.random() * Math.PI * 2,
        pickupDelay: 0.75,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(resource);
    }
  },

  trackItemDropped(item) {
    if (!item || isResourceItem(item)) return;
    this.player.stats.itemsDropped += 1;
    this.player.stats.itemsNotPicked += 1;
    incrementStatMap(this.player.stats.itemsDroppedByRarity, itemRarityBucket(item));
    incrementStatMap(this.player.stats.itemsNotPickedByRarity, itemRarityBucket(item));
  },

  trackItemPicked(item) {
    if (!item || isResourceItem(item)) return;
    incrementStatMap(this.player.stats.itemsPickedByRarity, itemRarityBucket(item));
    this.player.stats.itemsNotPicked = Math.max(0, this.player.stats.itemsNotPicked - 1);
    decrementStatMap(this.player.stats.itemsNotPickedByRarity, itemRarityBucket(item));
  },

  mergeInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!item) return null;
    if (isReadableItem(item) && item.readableStatus === "mergeable") {
      const recipes = readableMergeRecipesFor(item, this.player.inventory);
      if (recipes.length > 1) {
        return {
          type: "readable-choice",
          index,
          itemId: item.id,
          options: recipes.map((recipe) => readableMergeOption(recipe)),
        };
      }
      const recipe = recipes[0] ?? null;
      if (!recipe) {
        this.addToast("Ikke nok fragmenter til at samle item");
        return null;
      }
      return this.mergeInventoryReadableWithRecipe(index, recipe.output);
    }
    if (isResourceItem(item)) {
      const researchOnly = resourceMergeRecipesFor(item, this.player.inventory).filter((recipe) => recipeRequiresResearchLab(recipe));
      if (researchOnly.length > 0) {
        this.addToast("Gemstone merge klares i Research Lab");
        return null;
      }
      const recipes = resourceMergeRecipesFor(item, this.player.inventory).filter((recipe) => !recipe.requiresFire || this.isNearFireSource());
      if (recipes.length > 1) {
        return {
          type: "resource-choice",
          index,
          itemId: item.id,
          options: recipes.map((recipe) => resourceMergeOption(recipe)),
        };
      }
      const recipe = recipes[0] ?? resourceMergeRecipeFor(item, this.player.inventory);
      if (!recipe) {
        this.addToast("Ikke nok resources til merge");
        return null;
      }
      if (recipe.requiresFire && !this.isNearFireSource()) {
        this.addToast("Kraever fire eller fire beacon");
        return null;
      }
      return this.mergeInventoryResourceWithRecipe(index, recipe.output);
    }
    this.addToast("Gear merge klares hos blacksmith");
    return null;
  },

  mergeInventoryGearAtBlacksmith(index, category, selectedIndices = null) {
    const explicitIndices = Array.isArray(selectedIndices)
      ? [...new Set(selectedIndices.map((entry) => Math.floor(Number(entry))).filter((entry) => Number.isInteger(entry) && entry >= 0))]
      : null;
    const baseIndex = explicitIndices?.[0] ?? index;
    const item = this.player.inventory[baseIndex];
    if (!item) return false;
    const gearCategory = category === "armor" ? "armor" : "weapon";
    if (gearCategory === "weapon" && item.slot !== "weapon") {
      this.addToast("Weapon Anvil kan kun merge vaaben");
      return false;
    }
    if (gearCategory === "armor" && item.mode !== "armor") {
      this.addToast("Armor Anvil kan kun merge armor");
      return false;
    }
    const currentRarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
    const nextRarity = RARITIES[currentRarityIndex + 1];
    if (currentRarityIndex < 0 || !nextRarity) {
      this.addToast("Kan ikke merges hoejere");
      return null;
    }

    const matches = explicitIndices ?? [];
    if (explicitIndices) {
      if (matches.length !== 3) {
        this.addToast("Kraever 3 ens items");
        return false;
      }
      for (const matchIndex of matches) {
        const candidate = this.player.inventory[matchIndex];
        if (gearCategory === "weapon" && candidate?.slot !== "weapon") {
          this.addToast("Weapon Anvil kan kun merge vaaben");
          return false;
        }
        if (gearCategory === "armor" && candidate?.mode !== "armor") {
          this.addToast("Armor Anvil kan kun merge armor");
          return false;
        }
        if (!itemsCanMerge(item, candidate)) {
          this.addToast("Kraever 3 ens items");
          return false;
        }
      }
    } else {
      for (let i = 0; i < this.player.inventory.length; i += 1) {
        const candidate = this.player.inventory[i];
        if (gearCategory === "weapon" && candidate?.slot !== "weapon") continue;
        if (gearCategory === "armor" && candidate?.mode !== "armor") continue;
        if (itemsCanMerge(item, candidate)) matches.push(i);
        if (matches.length >= 3) break;
      }
    }

    if (matches.length < 3) {
      this.addToast("Kraever 3 ens items");
      return null;
    }

    const merged = this.makeMergedItem(matches.map((matchIndex) => this.player.inventory[matchIndex]), nextRarity);
    for (const matchIndex of matches.slice().sort((a, b) => b - a)) {
      this.player.inventory.splice(matchIndex, 1);
    }
    this.player.inventory.push(merged);
    this.addToast(`Merged: ${merged.name}`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  mergeInventoryReadableWithRecipe(index, outputReadableId) {
    const item = this.player.inventory[index];
    if (!item || !isReadableItem(item) || item.readableStatus !== "mergeable") return false;
    const recipe = readableMergeRecipesFor(item, this.player.inventory).find((entry) => entry.output === outputReadableId);
    if (!recipe) {
      this.addToast("Ikke nok fragmenter til at samle item");
      return false;
    }
    const output = makeReadableItem(outputReadableId);
    if (!output) return false;
    const requiredStation = String(recipe.mergeLocation ?? "backpack");
    const currentStation = String(this.readableMergeStation ?? "backpack");
    if (requiredStation !== "backpack" && currentStation !== requiredStation) {
      this.addToast(`Kraever ${requiredStation.replaceAll("_", " ")}`);
      return false;
    }
    const simulated = this.player.inventory.map((entry) => ({ ...entry }));
    consumeReadableInputs(simulated, recipe.inputs);
    if (!inventoryCanAccept(simulated, output)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    consumeReadableInputs(this.player.inventory, recipe.inputs);
    if (!this.addInventoryItem(output)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    this.addToast(`Samlet: ${output.name}`);
    this.publishSnapshot();
    return true;
  },

  mergeInventoryResourceWithRecipe(index, outputResourceId) {
    const item = this.player.inventory[index];
    if (!item || !isResourceItem(item)) return false;
    const recipe = resourceMergeRecipesFor(item, this.player.inventory).find((entry) => entry.output === outputResourceId);
    if (!recipe) {
      this.addToast("Ikke nok resources til merge");
      return false;
    }
    if (recipe.requiresFire && !this.isNearFireSource()) {
      this.addToast("Kraever fire eller fire beacon");
      return false;
    }
    const output = makeResourceItem(recipe.output, recipe.count ?? 1);
    if (!output) return false;
    if (!resourceOutputCanFitAfterMerge(this.player.inventory, recipe, output)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    consumeResourceInputs(this.player.inventory, recipe.inputs);
    if (!this.addInventoryItem(output)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    this.addToast(`Merged: ${output.name}`);
    this.publishSnapshot();
    return true;
  },

  isNearFireSource() {
    for (const chunk of this.nearbyChunks(1)) {
      for (const object of chunk.objects) {
        if (object.type !== "fireplace" && object.type !== "firebeacon") continue;
        if (distance(this.player, object) <= this.player.radius + object.radius + 1.2) return true;
      }
    }
    return false;
  },

  makeMergedItem(items, rarity) {
    const base = items[0];
    const currentRarity = RARITIES.find((entry) => entry.id === base.rarity) ?? RARITIES[1];
    const ratio = rarity.mult / currentRarity.mult;
    const prefix = PREFIXES[rarity.id]?.[0] ?? rarity.label;
  const merged = {
    ...base,
    id: createId(),
    name: `${prefix} ${base.baseName}`,
    level: Math.max(...items.map((item) => Math.max(1, Math.floor(Number(item.level) || 1)))),
    rarity: rarity.id,
    rarityLabel: rarity.label,
    rarityColor: rarity.color,
      damageMin: Math.max(base.damageMin ? base.damageMin + 1 : 0, Math.floor((base.damageMin || 0) * ratio)),
      damageMax: Math.max(base.damageMax ? base.damageMax + 1 : 0, Math.floor((base.damageMax || 0) * ratio)),
      armor: Math.floor((base.armor || 0) * ratio),
      maxHp: Math.floor((base.maxHp || 0) * ratio),
      maxMana: Math.floor((base.maxMana || 0) * ratio),
      speed: Number(((base.speed || 0) * Math.min(1.8, ratio)).toFixed(2)),
      magic: Math.floor((base.magic || 0) * ratio),
      range: Number((base.range || 0).toFixed(2)),
      cooldown: base.cooldown ? Math.max(0.28, Number((base.cooldown * 0.97).toFixed(2))) : 0,
    };
    merged.value = itemValue(merged);
    return merged;
  },

  addPotionLoot(item) {
    const type = item?.potionType;
    if (type !== "health" && type !== "mana") return false;
    if (!this.player.potions) this.player.potions = { health: 0, mana: 0 };
    const current = Math.max(0, Math.floor(Number(this.player.potions[type]) || 0));
    if (current >= MAX_POTION_STACK) return false;
    this.player.potions[type] = Math.min(MAX_POTION_STACK, current + Math.max(1, Math.floor(Number(item.count) || 1)));
    return true;
  },

  addInventoryItem(item) {
    if (!item) return false;
    if (isResourceItem(item)) {
      let remaining = Math.max(1, Math.floor(Number(item.count) || 1));
      const stackMax = resourceStackMax(item.resourceId);
      for (const stack of this.player.inventory) {
        if (stack.mode !== "resource" || stack.resourceId !== item.resourceId) continue;
        const current = Math.max(1, Math.floor(Number(stack.count) || 1));
        const room = stackMax - current;
        if (room <= 0) continue;
        const moved = Math.min(room, remaining);
        stack.count = current + moved;
        remaining -= moved;
        if (remaining <= 0) return true;
      }
      while (remaining > 0) {
        if (this.player.inventory.length >= MAX_INVENTORY) {
          item.count = remaining;
          return false;
        }
        const count = Math.min(stackMax, remaining);
        this.player.inventory.push({ ...item, id: createId(), count });
        remaining -= count;
      }
      return true;
    }
    if (isPotionItem(item)) {
      return this.addPotionLoot(item);
    }
    if (this.player.inventory.length >= MAX_INVENTORY) return false;
    this.player.inventory.push(item);
    return true;
  },

  compactPotionStacks() {
    const equipment = this.player.inventory.filter((item) => !isPotionItem(item));
    const potions = this.player.inventory.filter((item) => isPotionItem(item));
    this.player.inventory = equipment;
    for (const potion of potions) {
      this.addPotionLoot(potion);
    }
  },

  itemSummary(item) {
    const parts = [];
    const pct = (value) => `${Math.round(Number(value) * 100)}%`;
    const pushGearBonuses = (options = {}) => {
      const includeDamage = options.includeDamage !== false;
      if (item.armor) parts.push(`+${item.armor} armor`);
      if (includeDamage && (item.damageMin || item.damageMax)) parts.push(`+${item.damageMin}-${item.damageMax} skade`);
      if (item.maxHp) parts.push(`+${item.maxHp} liv`);
      if (item.maxMana) parts.push(`+${item.maxMana} mana`);
      if (item.magic) parts.push(`+${item.magic} magi`);
      if (item.speed) parts.push(`+${item.speed.toFixed(2)} fart`);
      if (item.maxHpPct) parts.push(`+${pct(item.maxHpPct)} liv`);
      if (item.maxManaPct) parts.push(`+${pct(item.maxManaPct)} mana`);
      if (item.armorFlat) parts.push(`+${item.armorFlat} armor`);
      if (item.damagePct) parts.push(`+${pct(item.damagePct)} skade`);
      if (item.speedPct) parts.push(`+${pct(item.speedPct)} fart`);
      if (item.attackSpeed) parts.push(`+${pct(item.attackSpeed)} attack speed`);
      if (item.critChance) parts.push(`+${pct(item.critChance)} crit chance`);
      if (item.critDamage) parts.push(`+${pct(item.critDamage)} crit damage`);
      if (item.blockChance) parts.push(`+${pct(item.blockChance)} block`);
      if (item.dodgeChance) parts.push(`+${pct(item.dodgeChance)} dodge`);
      if (item.lifeSteal) parts.push(`+${pct(item.lifeSteal)} life steal`);
      if (item.magicFind) parts.push(`+${pct(item.magicFind)} magic find`);
      if (item.goldFind) parts.push(`+${pct(item.goldFind)} gold find`);
      if (item.resourceFind) parts.push(`+${pct(item.resourceFind)} resource find`);
      if (item.xpGain) parts.push(`+${pct(item.xpGain)} XP gain`);
    };
    if (isResourceItem(item)) {
      parts.push(`Resource stack ${item.count ?? 1} / ${resourceStackMax(item.resourceId)}`);
    } else if (isReadableItem(item)) {
      const status = String(item.readableStatus ?? "readable");
      parts.push(status === "mergeable" ? "Fragment" : status === "consumable" ? "Consumable" : "Readable");
      if (Array.isArray(item.mergeParts) && item.mergeParts.length) parts.push(`${item.mergeParts.length} dele`);
      if (item.mergeLocation) parts.push(`Merge ved ${item.mergeLocation}`);
      if (item.readableQuestId) parts.push("Starter quest ved laesning");
    } else if (isQuestItem(item)) {
      parts.push("Quest item");
    } else if (isPotionItem(item)) {
      parts.push(item.potionType === "health" ? "Giver 25% liv" : "Giver 25% mana");
    } else if (item.slot === "weapon") {
      parts.push(`${item.damageMin}-${item.damageMax} skade`);
      parts.push(`${item.range} range`);
      parts.push(item.mode);
      if (Array.isArray(item.effects?.onHit) && item.effects.onHit.length) parts.push(`on-hit ${item.effects.onHit.length}`);
      pushGearBonuses({ includeDamage: false });
    } else {
      pushGearBonuses();
    }
    const sockets = normalizeSockets(item.sockets);
    if (sockets.length) {
      parts.push(`Sockets ${sockets.filter(Boolean).length}/${sockets.length}`);
    }
    parts.push(`${item.value ?? itemValue(item)} g`);
    return parts.join(" | ");
  },

  // ─── Item repair at Blacksmith ────────────────────────────────────────────────
  // slotId: equipment slot id (e.g. "weapon", "chest", ...)
  // Returns true on success, false on failure (calls addToast with reason).
  repairEquippedItem(slotId, options = {}) {
    const item = this.player.equipment?.[slotId];
    if (!item) { this.addToast("Intet udstyr i den slot."); return false; }

    const dur = Number(item.durability ?? 100);
    const missing = Math.ceil(100 - dur);
    if (missing <= 0) { this.addToast(`${item.name} er allerede fuldt repareret.`); return false; }

    // Calculate costs: gold and junk only
    const goldNeeded = Math.max(1, Math.ceil(ITEM_REPAIR_GOLD_PER_PCT * missing));
    const junkNeeded = Math.max(1, Math.ceil(ITEM_REPAIR_JUNK_PER_PCT * missing));

    if (!options?.prepaid) {
      const goldHave = Math.max(0, Math.floor(Number(this.player.gold) || 0));
      const junkHave = resourceCount(this.player.inventory, "junk");

      // Check availability
      const deficits = [];
      if (goldHave < goldNeeded) deficits.push(`Guld ${goldNeeded} (har ${goldHave})`);
      if (junkHave < junkNeeded) deficits.push(`Skrot ${junkNeeded} (har ${junkHave})`);

      if (deficits.length > 0) {
        this.addToast(`Kan ikke reparere: mangler ${deficits.join(", ")}`);
        return false;
      }

      // Consume resources (gold is wallet currency, junk is inventory resource)
      this.player.gold = Math.max(0, goldHave - goldNeeded);
      consumeResourceInputs(this.player.inventory, { junk: junkNeeded });
    }
    item.durability = 100;
    this.addToast(`${item.name} repareret. Brugt: ${goldNeeded}x Guld, ${junkNeeded}x Skrot`);
    this.publishSnapshot();
    return true;
  },

  // Calculate repair cost for an item (returns {gold, junk})
  getRepairCost(item) {
    if (!item) return { gold: 0, junk: 0 };
    const dur = Number(item.durability ?? 100);
    const missing = Math.max(0, Math.ceil(100 - dur));
    if (missing <= 0) return { gold: 0, junk: 0 };
    return {
      gold: Math.max(1, Math.ceil(ITEM_REPAIR_GOLD_PER_PCT * missing)),
      junk: Math.max(1, Math.ceil(ITEM_REPAIR_JUNK_PER_PCT * missing)),
    };
  },
};
