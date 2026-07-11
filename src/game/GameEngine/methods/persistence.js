import {
  EQUIPMENT_SLOTS,
  MAX_INVENTORY,
  NAMED_ITEM_TEMPLATES,
  UNIQUE_ITEMS,
  WORLD_SEED,
  createEquipment,
  ensureNextId,
  itemValue,
  clamp,
  RESOURCE_DEFS,
  RESOURCE_RARITY_COLOR,
  POPULARITY_CONFIG,
  READABLE_DEF_BY_ID,
  QUEST_ITEM_DEFS,
  deriveIconKey,
  iconUrlFromKey,
  isPotionItem,
  isQuestItem,
  isReadableItem,
  isResourceItem,
  withItemFlags,
  withItemIcon,
  SAVE_VERSION,
  SAVE_STORAGE_KEY,
  MAX_POTION_STACK,
  makePotion,
  normalizePotionId,
  potionDefById,
  normalizeQuickSlots
} from "../dependencies.js";
import {
  normalizeReadableStatus,
  normalizeReadableBonuses,
  resourceStackMax,
  normalizeResourceId,
  normalizeHeroStats,
  normalizeQuestBoards,
  normalizeSavedQuestState,
  makeQuestItem,
  questItemCount,
  questItemCanStack,
  questItemStackMax,
  questSavePayload,
  questItemTargetsForQuest
} from "../helpers.js";
import { normalizeAutoLootRules } from "./loot.js";
import { normalizeSkillTree } from "../../config/skill-tree-config.js";
import { DEFAULT_CLASS_ID, normalizeClassId, normalizeClassNodes } from "../../config/class-config.js";
import { normalizeSockets, itemCanHaveSockets } from "../../config/socket-config.js";
import { SAVE_PERSIST_CONFIG } from "../../config/save-persist-config.js";
import { saveRepository } from "../../../storage/saveRepository.js";
import { normalizeWorldState } from "../../world-state.js";
import { normalizeWorldEnergy } from "../../world-energy.js";
import { normalizeActionState } from "../../actions/action-runner.js";
import { normalizeCurrentExpedition } from "./subregions.js";
import { normalizeFactionRep } from "../../config/faction-config.js";
import { normalizePlayerStatBonuses } from "../../config/player-stat-bonus-config.js";

function normalizeItemEffects(effects) {
  if (!effects || typeof effects !== "object") return undefined;
  const onHit = Array.isArray(effects.onHit)
    ? effects.onHit
      .filter((effect) => effect && typeof effect === "object" && typeof effect.type === "string")
      .map((effect) => ({ ...effect }))
    : [];
  return onHit.length ? { onHit } : undefined;
}

function normalizeStringList(value) {
  return Array.isArray(value) ? [...new Set(value.map((entry) => String(entry ?? "").trim()).filter(Boolean))] : undefined;
}

function normalizeTargetBonus(value) {
  return Array.isArray(value)
    ? value
      .filter((entry) => Array.isArray(entry) && entry.length >= 2 && String(entry[0] ?? "").trim())
      .map((entry) => [String(entry[0]), entry[1]])
    : undefined;
}

function normalizeDurabilityLossOnEvents(value) {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value)
    .map(([event, loss]) => [String(event ?? "").trim(), Math.max(0, Number(loss) || 0)])
    .filter(([event, loss]) => event && loss > 0);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function cleanupObsoleteQuestItems(player, questState) {
  if (!player || !Array.isArray(player.inventory) || !questState) return;
  const completed = new Set((Array.isArray(questState.completed) ? questState.completed : []).map(String));
  if (!completed.has("innkeeper_ring_for_noble")) return;

  const activeRingQuest = (Array.isArray(questState.active) ? questState.active : [])
    .some((quest) => questItemTargetsForQuest(quest)
      .some((target) => String(target.questItemId) === "ring"));
  if (activeRingQuest) return;

  player.inventory = player.inventory.filter((item) => !(
    item?.mode === "quest"
    && String(item.questItemId ?? "") === "ring"
  ));
}

function repairActiveScarecrowPlacementItems(engine) {
  const quest = (engine.questState?.active ?? [])
    .find((entry) => String(entry?.questId ?? "") === "place_scarecrows");
  if (!quest) return false;
  const total = Math.max(0, Math.floor(Number(quest.target?.count) || 7));
  const progressField = String(quest.target?.progressField ?? "placed");
  const placed = Math.max(0, Math.floor(Number(
    quest.progress?.[progressField]
      ?? engine.worldState?.counters?.[quest.target?.counter]
  ) || 0));
  const requiredRemaining = Math.max(0, total - placed);
  const current = questItemCount(engine.player.inventory, quest.id, "scarecrow");
  let missing = Math.max(0, requiredRemaining - current);
  if (!missing) return false;
  while (missing > 0) {
    const item = makeQuestItem("scarecrow", quest.id);
    if (!item || !engine.addInventoryItem(item)) break;
    missing -= 1;
  }
  return missing < requiredRemaining - current;
}

function savedWeaponHands(item) {
  return item?.slot === "weapon" ? Math.max(1, Math.min(2, Math.floor(Number(item.hands) || 1))) : 1;
}

export const persistenceMethods = {
  serializeItemForSave(item) {
    if (!item || typeof item !== "object") return item;
    const serialized = { ...item };
    if (!SAVE_PERSIST_CONFIG.items.durability) delete serialized.durability;
    if (!SAVE_PERSIST_CONFIG.items.sockets) delete serialized.sockets;
    if (!SAVE_PERSIST_CONFIG.items.iconData) {
      delete serialized.iconUrl;
      delete serialized.iconSheet;
      delete serialized.iconIndex;
    }
    if (!SAVE_PERSIST_CONFIG.items.value) delete serialized.value;
    return serialized;
  },

  currentSaveStorageKey() {
    return this.saveStorageKey || SAVE_STORAGE_KEY;
  },

  readSavePayload() {
    if (!SAVE_PERSIST_CONFIG.storage.playerSave) return null;
    const parsed = saveRepository.loadSaveSync(this.currentSaveStorageKey());
    if (!parsed || parsed.version !== SAVE_VERSION) return null;
    if (parsed.seed !== WORLD_SEED) return null;
    return parsed;
  },

  normalizeSavedItem(item) {
    if (!item || typeof item !== "object") return null;
    const id = Number(item.id);
    if (!Number.isFinite(id)) return null;
    const savedResourceId = normalizeResourceId(item.resourceId);
    const normalized = {
      id,
      name: String(item.name ?? "Unknown"),
      baseName: String(item.baseName ?? item.name ?? "Unknown"),
      rarity: String(item.rarity ?? "normal"),
      rarityLabel: String(item.rarityLabel ?? "Normal"),
      rarityColor: String(item.rarityColor ?? "#f5f3ea"),
      unique: Boolean(item.unique || item.uniqueId),
      uniqueId: item.uniqueId ? String(item.uniqueId) : undefined,
      named: Boolean(item.named || item.namedId),
      namedId: item.namedId ? String(item.namedId) : undefined,
      iconUrl: item.iconUrl ? String(item.iconUrl) : undefined,
      slot: String(item.slot ?? "weapon"),
      mode: String(item.mode ?? "melee"),
      type: item.type ? String(item.type) : undefined,
      hands: Number.isFinite(Number(item.hands)) ? Math.max(1, Math.min(2, Math.floor(Number(item.hands)))) : undefined,
      level: Math.max(1, Math.floor(Number(item.level) || 1)),
      damageMin: Math.floor(Number(item.damageMin) || 0),
      damageMax: Math.floor(Number(item.damageMax) || 0),
      range: Number(item.range) || 0,
      cooldown: Number(item.cooldown) || 0,
      armor: Math.floor(Number(item.armor) || 0),
      maxHp: Math.floor(Number(item.maxHp) || 0),
      maxMana: Math.floor(Number(item.maxMana) || 0),
      speed: Number(item.speed) || 0,
      magic: Math.floor(Number(item.magic) || 0),
      maxHpPct: Number(item.maxHpPct) || 0,
      maxManaPct: Number(item.maxManaPct) || 0,
      armorFlat: Number(item.armorFlat) || 0,
      armorPct: Number(item.armorPct) || 0,
      damagePct: Number(item.damagePct) || 0,
      speedPct: Number(item.speedPct) || 0,
      attackSpeed: Number(item.attackSpeed) || 0,
      critChance: Number(item.critChance) || 0,
      critDamage: Number(item.critDamage) || 0,
      blockChance: Number(item.blockChance) || 0,
      blockAmount: Number(item.blockAmount) || 0,
      dodgeChance: Number(item.dodgeChance) || 0,
      lifeSteal: Number(item.lifeSteal) || 0,
      magicFind: Number(item.magicFind) || 0,
      goldFind: Number(item.goldFind) || 0,
      resourceFind: Number(item.resourceFind) || 0,
      xpGain: Number(item.xpGain) || 0,
      physicalResist: Number(item.physicalResist) || 0,
      fireResist: Number(item.fireResist) || 0,
      iceResist: Number(item.iceResist) || 0,
      lightningResist: Number(item.lightningResist) || 0,
      poisonResist: Number(item.poisonResist) || 0,
      arcaneResist: Number(item.arcaneResist) || 0,
      holyResist: Number(item.holyResist) || 0,
      shadowResist: Number(item.shadowResist) || 0,
      natureResist: Number(item.natureResist) || 0,
      allResist: Number(item.allResist) || 0,
      magicResist: Number(item.magicResist) || 0,
      physicalDamageBonus: Number(item.physicalDamageBonus) || 0,
      fireDamageBonus: Number(item.fireDamageBonus) || 0,
      iceDamageBonus: Number(item.iceDamageBonus) || 0,
      lightningDamageBonus: Number(item.lightningDamageBonus) || 0,
      poisonDamageBonus: Number(item.poisonDamageBonus) || 0,
      arcaneDamageBonus: Number(item.arcaneDamageBonus) || 0,
      holyDamageBonus: Number(item.holyDamageBonus) || 0,
      shadowDamageBonus: Number(item.shadowDamageBonus) || 0,
      natureDamageBonus: Number(item.natureDamageBonus) || 0,
      spellDamageBonus: Number(item.spellDamageBonus) || 0,
      directDamageBonus: Number(item.directDamageBonus) || 0,
      areaDamageBonus: Number(item.areaDamageBonus) || 0,
      dotDamageBonus: Number(item.dotDamageBonus) || 0,
      hazardDamageBonus: Number(item.hazardDamageBonus) || 0,
      dotDurationBonus: Number(item.dotDurationBonus) || 0,
      statusDurationBonus: Number(item.statusDurationBonus) || 0,
      slowImmune: Boolean(item.slowImmune),
      classReq: Array.isArray(item.classReq) ? item.classReq.map(String) : undefined,
      levelReq: Math.max(0, Math.floor(Number(item.levelReq) || 0)) || undefined,
      requiresClassNode: item.requiresClassNode ? String(item.requiresClassNode) : undefined,
      durability: Number.isFinite(Number(item.durability))
        ? clamp(Number(item.durability), 0, 100)
        : undefined,
      sockets: normalizeSockets(item.sockets),
      potionId: item.potionId ? normalizePotionId(item.potionId) : normalizePotionId(item.potionType),
      potionType: item.potionType ? String(item.potionType) : undefined,
      restorePct: Number(item.restorePct) || undefined,
      restoreHealthPct: Number(item.restoreHealthPct) || undefined,
      restoreManaPct: Number(item.restoreManaPct) || undefined,
      armorBuffPct: Number(item.armorBuffPct) || undefined,
      armorBuffDurationMs: Number(item.armorBuffDurationMs) || undefined,
      speedBuffPct: Number(item.speedBuffPct) || undefined,
      durationMs: Number(item.durationMs) || undefined,
      tickMs: Number(item.tickMs) || undefined,
      healthRegenPct: Number(item.healthRegenPct) || undefined,
      manaRegenPct: Number(item.manaRegenPct) || undefined,
      description: item.description ? String(item.description) : undefined,
      nonRepairable: Boolean(item.nonRepairable),
      destroyWhenDurabilityDepleted: Boolean(item.destroyWhenDurabilityDepleted),
      durabilityLossOnEvents: normalizeDurabilityLossOnEvents(item.durabilityLossOnEvents),
      resourceId: savedResourceId,
      questItemId: item.questItemId ? String(item.questItemId) : undefined,
      questInstanceId: item.questInstanceId ? String(item.questInstanceId) : undefined,
      readableId: item.readableId ? String(item.readableId) : undefined,
      readableQuestId: item.readableQuestId ? String(item.readableQuestId) : undefined,
      readableKind: item.readableKind ? String(item.readableKind) : undefined,
      readableStatus: item.readableStatus ? String(item.readableStatus) : undefined,
      readableXp: Math.max(0, Math.floor(Number(item.readableXp) || 0)),
      storyText: item.storyText ? String(item.storyText) : undefined,
      mergeLocation: item.mergeLocation ? String(item.mergeLocation) : undefined,
      mergeParts: Array.isArray(item.mergeParts) ? item.mergeParts.map(String) : undefined,
      consumableEffect: item.consumableEffect && typeof item.consumableEffect === "object" ? { ...item.consumableEffect } : undefined,
      effects: normalizeItemEffects(item.effects),
      tags: normalizeStringList(item.tags),
      target: normalizeStringList(item.target),
      bonus: normalizeTargetBonus(item.bonus),
      iconIndex: Number.isFinite(Number(item.iconIndex)) ? Math.floor(Number(item.iconIndex)) : undefined,
      stackMax: isResourceItem(item)
        ? resourceStackMax(savedResourceId)
        : isQuestItem(item) && questItemCanStack(item.questItemId)
          ? questItemStackMax(item.questItemId)
          : undefined,
      count: isPotionItem(item)
        ? clamp(Math.floor(Number(item.count) || 1), 1, MAX_POTION_STACK)
        : isResourceItem(item)
          ? clamp(Math.floor(Number(item.count) || 1), 1, resourceStackMax(savedResourceId))
          : isQuestItem(item) && questItemCanStack(item.questItemId)
            ? clamp(Math.floor(Number(item.count) || 1), 1, questItemStackMax(item.questItemId))
          : undefined,
    };
    if (isResourceItem(normalized)) {
      const def = RESOURCE_DEFS[normalized.resourceId];
      normalized.name = def?.name ?? normalized.name;
      normalized.baseName = def?.name ?? normalized.baseName;
      normalized.rarityLabel = "Resource";
      normalized.rarityColor = RESOURCE_RARITY_COLOR;
      normalized.resourceColor = def?.color;
      normalized.description = def?.description ? String(def.description) : normalized.description;
      delete normalized.iconIndex;
      delete normalized.iconSheet;
      normalized.stackMax = def?.stackMax ?? normalized.stackMax;
      normalized.iconUrl = def?.iconUrl ?? iconUrlFromKey(deriveIconKey(normalized));
    }
    if (isQuestItem(normalized)) {
      const def = QUEST_ITEM_DEFS[normalized.questItemId];
      normalized.name = def?.name ?? normalized.name;
      normalized.baseName = def?.name ?? normalized.baseName;
      normalized.rarity = "unique";
      normalized.rarityLabel = "Quest";
      normalized.rarityColor = "#ffcf5a";
      normalized.slot = "quest";
      normalized.iconUrl = def?.iconUrl ?? normalized.iconUrl;
      normalized.stackMax = questItemCanStack(normalized.questItemId) ? questItemStackMax(normalized.questItemId) : undefined;
      normalized.count = questItemCanStack(normalized.questItemId)
        ? clamp(Math.floor(Number(normalized.count) || 1), 1, questItemStackMax(normalized.questItemId))
        : undefined;
      normalized.flags = {
        ...(normalized.flags ?? {}),
        stackable: questItemCanStack(normalized.questItemId),
      };
    }
    if (isReadableItem(normalized)) {
      const def = READABLE_DEF_BY_ID[normalized.readableId];
      normalized.name = def?.title ?? normalized.name;
      normalized.baseName = def?.title ?? normalized.baseName;
      normalized.rarity = String(def?.rarity ?? normalized.rarity ?? "unique");
      normalized.rarityLabel = normalized.rarity === "unique" ? "Readable" : normalized.rarityLabel;
      normalized.rarityColor = normalized.rarity === "unique" ? "#c9b1ff" : normalized.rarityColor;
      normalized.slot = "readable";
      normalized.mode = "readable";
      normalized.readableKind = String(def?.kind ?? normalized.readableKind ?? "lorebook");
      normalized.readableStatus = normalizeReadableStatus(def?.status ?? normalized.readableStatus ?? "readable");
      normalized.readableQuestId = def?.questId ? String(def.questId) : def?.readableQuestId ? String(def.readableQuestId) : normalized.readableQuestId;
      normalized.readableXp = Math.max(0, Math.floor(Number(def?.xp ?? normalized.readableXp) || 0));
      normalized.storyText = String(def?.story ?? normalized.storyText ?? "");
      normalized.mergeLocation = String(def?.mergeLocation ?? normalized.mergeLocation ?? "backpack");
      normalized.mergeParts = Array.isArray(def?.parts) ? def.parts.map(String) : (Array.isArray(normalized.mergeParts) ? normalized.mergeParts.map(String) : []);
      normalized.consumableEffect = def?.consumable ? { ...def.consumable } : (normalized.consumableEffect ? { ...normalized.consumableEffect } : undefined);
      normalized.iconUrl = def?.iconUrl ?? normalized.iconUrl;
      normalized.value = Math.max(1, Math.floor(Number(def?.value ?? normalized.value) || 1));
    }
    if (isPotionItem(normalized)) {
      const def = potionDefById(normalized.potionId ?? normalized.potionType);
      if (def) {
        const rarity = def.rarity ? String(def.rarity) : normalized.rarity;
        normalized.potionId = def.id;
        normalized.potionType = def.type;
        normalized.name = def.name;
        normalized.baseName = def.name;
        normalized.rarity = rarity;
        normalized.rarityLabel = rarity === "rare" ? "Good" : normalized.rarityLabel;
        normalized.restorePct = def.restorePct;
        normalized.restoreHealthPct = Number(def.restoreHealthPct) || undefined;
        normalized.restoreManaPct = Number(def.restoreManaPct) || undefined;
        normalized.armorBuffPct = Number(def.armorBuffPct) || undefined;
        normalized.armorBuffDurationMs = Number(def.armorBuffDurationMs) || undefined;
        normalized.speedBuffPct = Number(def.speedBuffPct) || undefined;
        normalized.durationMs = Number(def.durationMs) || undefined;
        normalized.tickMs = Number(def.tickMs) || undefined;
        normalized.healthRegenPct = Number(def.healthRegenPct) || undefined;
        normalized.manaRegenPct = Number(def.manaRegenPct) || undefined;
        normalized.description = def.description ? String(def.description) : normalized.description;
        normalized.iconKey = def.iconKey;
        normalized.iconUrl = def.iconUrl;
        normalized.rarityColor = def.color;
      }
    }
    if (normalized.uniqueId) {
      const def = UNIQUE_ITEMS.find((entry) => entry.id === normalized.uniqueId);
      // Always re-derive from definition — never trust the saved iconUrl for unique items.
      normalized.name = def?.name ? String(def.name) : normalized.name;
      normalized.baseName = def?.baseName ? String(def.baseName) : normalized.baseName;
      normalized.rarity = def?.rarity ? String(def.rarity) : normalized.rarity;
      normalized.slot = def?.slot ? String(def.slot) : normalized.slot;
      normalized.mode = def?.mode ? String(def.mode) : normalized.mode;
      normalized.type = def?.type ? String(def.type) : normalized.type;
      normalized.hands = Number.isFinite(Number(def?.hands))
        ? Math.max(1, Math.min(2, Math.floor(Number(def.hands))))
        : def?.slot === "weapon"
          ? 1
          : normalized.hands;
      normalized.classReq = Array.isArray(def?.classReq) ? def.classReq.map(String) : normalized.classReq;
      normalized.levelReq = Math.max(0, Math.floor(Number(def?.levelReq ?? normalized.levelReq) || 0)) || undefined;
      normalized.requiresClassNode = def?.requiresClassNode ? String(def.requiresClassNode) : normalized.requiresClassNode;
      normalized.iconUrl = def?.iconUrl || iconUrlFromKey(deriveIconKey({ uniqueId: normalized.uniqueId }));
      normalized.effects = normalizeItemEffects(def?.effects ?? normalized.effects);
      normalized.description = def?.description ? String(def.description) : normalized.description;
      normalized.nonRepairable = Boolean(def?.nonRepairable ?? normalized.nonRepairable);
      normalized.destroyWhenDurabilityDepleted = Boolean(def?.destroyWhenDurabilityDepleted ?? normalized.destroyWhenDurabilityDepleted);
      normalized.durabilityLossOnEvents = normalizeDurabilityLossOnEvents(def?.durabilityLossOnEvents ?? normalized.durabilityLossOnEvents);
      if (def?.tags !== undefined) normalized.tags = normalizeStringList(def.tags);
      if (def?.target !== undefined) normalized.target = normalizeStringList(def.target);
      if (def?.bonus !== undefined) normalized.bonus = normalizeTargetBonus(def.bonus);
    } else if (normalized.namedId) {
      const def = NAMED_ITEM_TEMPLATES.find((entry) => entry.id === normalized.namedId);
      // Named items: use definition iconUrl if set, else fall through to baseName mapping.
      normalized.iconUrl = def?.iconUrl || undefined;
      normalized.effects = normalizeItemEffects(def?.effects ?? normalized.effects);
      normalized.description = def?.description ? String(def.description) : normalized.description;
      normalized.nonRepairable = Boolean(def?.nonRepairable ?? normalized.nonRepairable);
      normalized.destroyWhenDurabilityDepleted = Boolean(def?.destroyWhenDurabilityDepleted ?? normalized.destroyWhenDurabilityDepleted);
      normalized.durabilityLossOnEvents = normalizeDurabilityLossOnEvents(def?.durabilityLossOnEvents ?? normalized.durabilityLossOnEvents);
      if (def?.tags !== undefined) normalized.tags = normalizeStringList(def.tags);
      if (def?.target !== undefined) normalized.target = normalizeStringList(def.target);
      if (def?.bonus !== undefined) normalized.bonus = normalizeTargetBonus(def.bonus);
    } else if (!isResourceItem(normalized) && !isQuestItem(normalized)) {
      // Generic gear: clear stale saved iconUrl so baseName mapping takes over.
      normalized.iconUrl = undefined;
    }
    if (!itemCanHaveSockets(normalized)) normalized.sockets = [];
    normalized.value = Math.max(1, Math.floor(Number(item.value) || itemValue(normalized)));
    const durability = Number(normalized.durability);
    if (
      (normalized.nonRepairable || normalized.destroyWhenDurabilityDepleted)
      && Number.isFinite(durability)
      && durability <= 0
    ) return null;
    return withItemIcon(withItemFlags(normalized));
  },

  loadProgress() {
    const payload = this.readSavePayload();
    if (!payload) return;

    const savedPlayer = payload.player;
    if (!savedPlayer || typeof savedPlayer !== "object") return;

    this.player.x = Number.isFinite(Number(savedPlayer.x)) ? Number(savedPlayer.x) : this.region.start.x;
    this.player.y = Number.isFinite(Number(savedPlayer.y)) ? Number(savedPlayer.y) : this.region.start.y;
    this.player.facingX = Number.isFinite(Number(savedPlayer.facingX)) ? Number(savedPlayer.facingX) : this.player.facingX;
    this.player.facingY = Number.isFinite(Number(savedPlayer.facingY)) ? Number(savedPlayer.facingY) : this.player.facingY;
    this.player.level = Math.max(1, Math.floor(Number(savedPlayer.level) || this.player.level));
    this.player.xp = Math.max(0, Math.floor(Number(savedPlayer.xp) || 0));
    this.player.gold = Math.max(0, Math.floor(Number(savedPlayer.gold) || 0));
    this.player.popularity = clamp(Number(savedPlayer.popularity) || 0, POPULARITY_CONFIG.min, POPULARITY_CONFIG.max);
    this.player.hp = Math.max(0, Number(savedPlayer.hp) || this.player.hp);
    this.player.mana = Math.max(0, Number(savedPlayer.mana) || this.player.mana);
    this.player.potions = {
      health: clamp(Math.floor(Number(savedPlayer.potions?.health) || 0), 0, MAX_POTION_STACK),
      mana: clamp(Math.floor(Number(savedPlayer.potions?.mana) || 0), 0, MAX_POTION_STACK),
    };
    this.player.quickSlots = normalizeQuickSlots(savedPlayer.quickSlots);
    this.player.readableBonuses = normalizeReadableBonuses(savedPlayer.readableBonuses);
    this.player.questStatBonuses = normalizePlayerStatBonuses(savedPlayer.questStatBonuses);
    this.player.skillTree = normalizeSkillTree(savedPlayer.skillTree);
    this.player.classId = normalizeClassId(savedPlayer.classId ?? DEFAULT_CLASS_ID);
    this.player.classPoints = Math.max(0, Math.floor(Number(savedPlayer.classPoints) || 0));
    this.player.classNodes = normalizeClassNodes(savedPlayer.classNodes);
    this.player.unlockedSpells = [...new Set(["ember_spark", ...(Array.isArray(savedPlayer.unlockedSpells) ? savedPlayer.unlockedSpells.map(String) : [])])];
    this.player.activeSpellId = savedPlayer.activeSpellId ? String(savedPlayer.activeSpellId) : this.player.unlockedSpells[0] ?? "ember_spark";
    this.player.autoLoot = normalizeAutoLootRules(savedPlayer.autoLoot);
    this.player.factionRep = normalizeFactionRep(savedPlayer.factionRep);
    this.player.statusEffects = [];
    this.player.stats = normalizeHeroStats(savedPlayer.stats);
    this.player.attackCooldown = Math.max(0, Number(savedPlayer.attackCooldown) || 0);
    this.player.spellCooldown = Math.max(0, Number(savedPlayer.spellCooldown) || 0);
    this.player.hurtCooldown = Math.max(0, Number(savedPlayer.hurtCooldown) || 0);
    this.player.attackAnim = Math.max(0, Number(savedPlayer.attackAnim) || 0);
    this.player.castAnim = Math.max(0, Number(savedPlayer.castAnim) || 0);
    this.player.gait = Number(savedPlayer.gait) || 0;
    this.player.moveSpeed = Math.max(0, Number(savedPlayer.moveSpeed) || 0);
    this.player.deadTimer = Math.max(0, Number(savedPlayer.deadTimer) || 0);
    this.player.moving = false;
    this.player.target = null;
    this.player.attackTargetId = null;

    this.questState = normalizeSavedQuestState(payload.quests);
    this.worldState = normalizeWorldState(payload.worldState);
    this.worldEnergy = normalizeWorldEnergy(payload.worldEnergy);
    this.actionState = normalizeActionState(payload.actionState);
    this.currentExpedition = normalizeCurrentExpedition(payload.currentExpedition);
    if ((this.currentExpedition?.subregionStack?.length ?? 0) > 0) {
      console.warn("[subregions] Loaded save with nested subregion stack", {
        currentMapInstanceId: this.currentExpedition.currentMapInstanceId,
        rootMapInstanceId: this.currentExpedition.rootMapInstanceId,
        stackDepth: this.currentExpedition.subregionStack.length,
        instanceIds: Object.keys(this.currentExpedition.subregionInstances ?? {}),
      });
    }
    this.currentMapInstanceId = this.currentExpedition?.currentMapInstanceId ?? null;
    const currentMapSnapshot = this.currentExpedition?.mapSnapshots?.[this.currentMapInstanceId];
    if (currentMapSnapshot) {
      this.restoreMapSnapshot?.(currentMapSnapshot);
    } else if (this.currentExpedition?.currentMapInstanceId) {
      console.warn("[subregions] Saved current expedition had no matching map snapshot; falling back to boot region");
      this.currentExpedition = null;
      this.currentMapInstanceId = null;
    }

    if (Array.isArray(savedPlayer.inventory)) {
      const normalizedInventory = savedPlayer.inventory
        .map((item) => this.normalizeSavedItem(item))
        .filter(Boolean);
      this.player.inventory = normalizedInventory
        .slice(0, MAX_INVENTORY);
      this.compactPotionStacks?.();
      cleanupObsoleteQuestItems(this.player, this.questState);
      repairActiveScarecrowPlacementItems(this);
    }
    for (const [legacyType, count] of Object.entries(this.player.potions ?? {})) {
      const amount = Math.max(0, Math.floor(Number(count) || 0));
      if (amount > 0) this.addPotionLoot(makePotion(legacyType, this.player.level));
      const potionId = normalizePotionId(legacyType);
      const stack = this.player.inventory.find((item) => isPotionItem(item) && normalizePotionId(item.potionId ?? item.potionType) === potionId);
      if (stack) stack.count = Math.min(MAX_POTION_STACK, Math.max(Math.floor(Number(stack.count) || 1), amount));
    }
    this.player.potions = { health: 0, mana: 0 };

    const nextEquipment = createEquipment();
    const savedEquipment = savedPlayer.equipment;
    if (savedEquipment && typeof savedEquipment === "object") {
      for (const slot of EQUIPMENT_SLOTS) {
        const normalized = this.normalizeSavedItem(savedEquipment[slot.id]);
        nextEquipment[slot.id] = normalized || nextEquipment[slot.id] || null;
      }
    }
    this.player.equipment = nextEquipment;
    if (savedWeaponHands(this.player.equipment.weapon) >= 2 && this.player.equipment.offhand) {
      const offhand = this.player.equipment.offhand;
      this.player.equipment.offhand = null;
      this.addInventoryItem(offhand);
    }

    // Re-evaluate persisted world flags after quest state has been restored.
    // Older saves may contain later completed steps while an earlier automatic
    // step is missing because refresh used to overwrite the new completion.
    for (let pass = 0; pass < 100 && this.refreshQuestStepProgress?.(); pass += 1) {}
    this.rebuildCountBasedRegionDecorators?.();

    if (Array.isArray(payload.loots)) {
      // If we're replacing active loots during load, ensure any existing loots
      // are processed as despawn so quest dropped counters stay consistent.
      for (const loot of this.loots) {
        try { this.handleLootDespawn(loot); } catch (e) {}
      }
      this.loots = [];
    }

    let maxSeenId = Math.floor(Number(this.player.id) || 0);
    for (const item of this.player.inventory) {
      maxSeenId = Math.max(maxSeenId, Math.floor(Number(item.id) || 0));
    }
    for (const item of Object.values(this.player.equipment)) {
      if (!item) continue;
      maxSeenId = Math.max(maxSeenId, Math.floor(Number(item.id) || 0));
    }
    for (const loot of this.loots) {
      maxSeenId = Math.max(maxSeenId, Math.floor(Number(loot.id) || 0));
      if (loot.type === "item" && loot.item) {
        maxSeenId = Math.max(maxSeenId, Math.floor(Number(loot.item.id) || 0));
      }
    }
    if (maxSeenId > 0) ensureNextId(maxSeenId);

    this.addToast("Progress loaded", {
      localization: { type: "ui", key: "messages.progressLoaded" },
    });
  },

  saveProgress(options = {}) {
    const saveStartedAt = performance.now();
    const saveTimings = {
      autosaveSnapshotBuildMs: 0,
      autosaveCloneMs: 0,
      autosaveSerializeMs: 0,
      autosaveStorageWriteMs: 0,
      autosaveTotalMs: 0,
    };
    const addSaveTiming = (key, ms) => {
      saveTimings[key] = (saveTimings[key] ?? 0) + ms;
      if (this.cleanupUpdateTimings) {
        this.cleanupUpdateTimings[key] = (this.cleanupUpdateTimings[key] ?? 0) + ms;
      }
    };
    const force = Boolean(options?.force);
    if (this.activeMapRegion && !force && !this.currentExpedition) return false;
    if (!SAVE_PERSIST_CONFIG.storage.playerSave) return false;
    if (this.currentExpedition?.currentMapInstanceId) {
      this.storeCurrentMapSnapshot?.(this.currentExpedition.currentMapInstanceId);
    }
    const cloneStartedAt = performance.now();
    const cfg = SAVE_PERSIST_CONFIG;
    const inventoryPayload = cfg.player.inventory
      ? this.player.inventory.map((item) => this.serializeItemForSave(item))
      : [];
    const equipmentPayload = cfg.player.equipment
      ? Object.fromEntries(
        EQUIPMENT_SLOTS.map((slot) => [
          slot.id,
          this.player.equipment[slot.id] ? this.serializeItemForSave(this.player.equipment[slot.id]) : null,
        ]),
      )
      : Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot.id, null]));

    const payload = {
      version: SAVE_VERSION,
      seed: WORLD_SEED,
      savedAt: Date.now(),
      player: {
        ...(cfg.player.core ? {
          id: this.player.id,
          x: this.player.x,
          y: this.player.y,
          facingX: this.player.facingX,
          facingY: this.player.facingY,
          level: this.player.level,
          xp: this.player.xp,
        } : {}),
        ...(cfg.player.economy ? {
          gold: this.player.gold,
          popularity: this.player.popularity,
          factionRep: normalizeFactionRep(this.player.factionRep),
        } : {}),
        ...(cfg.player.potions ? { potions: { ...this.player.potions } } : {}),
        quickSlots: normalizeQuickSlots(this.player.quickSlots),
        ...(cfg.player.readableBonuses ? { readableBonuses: { ...this.player.readableBonuses } } : {}),
        ...(cfg.player.questStatBonuses ? { questStatBonuses: normalizePlayerStatBonuses(this.player.questStatBonuses) } : {}),
        ...(cfg.player.skillTree ? { skillTree: normalizeSkillTree(this.player.skillTree) } : {}),
        classId: normalizeClassId(this.player.classId),
        classPoints: Math.max(0, Math.floor(Number(this.player.classPoints) || 0)),
        classNodes: normalizeClassNodes(this.player.classNodes),
        ...(cfg.player.spells ? {
          unlockedSpells: [...(this.player.unlockedSpells ?? [])],
          activeSpellId: this.player.activeSpellId ?? null,
        } : {}),
        autoLoot: normalizeAutoLootRules(this.player.autoLoot),
        ...(cfg.player.stats ? { stats: { ...this.player.stats, killsByMonster: { ...this.player.stats.killsByMonster } } } : {}),
        ...(cfg.player.vitals ? {
          hp: this.player.hp,
          mana: this.player.mana,
        } : {}),
        ...(cfg.player.cooldownsAndAnim ? {
          attackCooldown: this.player.attackCooldown,
          spellCooldown: this.player.spellCooldown,
          hurtCooldown: this.player.hurtCooldown,
          attackAnim: this.player.attackAnim,
          castAnim: this.player.castAnim,
          gait: this.player.gait,
          moveSpeed: this.player.moveSpeed,
          deadTimer: this.player.deadTimer,
        } : {}),
        inventory: inventoryPayload,
        equipment: equipmentPayload,
      },
      quests: {
        active: cfg.quests.active
          ? this.questState.active.map((quest) => questSavePayload(quest))
          : [],
        completed: cfg.quests.completed ? [...this.questState.completed] : [],
        questBoards: cfg.quests.questBoards ? normalizeQuestBoards(this.questState.questBoards) : {},
      },
      ...(cfg.worldState ? { worldState: normalizeWorldState(this.worldState) } : {}),
      ...(cfg.worldEnergy ? { worldEnergy: normalizeWorldEnergy(this.worldEnergy) } : {}),
      ...(cfg.actionState ? { actionState: normalizeActionState(this.actionState) } : {}),
      ...(cfg.currentExpedition ? { currentExpedition: normalizeCurrentExpedition(this.currentExpedition) } : {}),
      loots: [],
    };
    addSaveTiming("autosaveCloneMs", performance.now() - cloneStartedAt);

    let saveSizeKb = 0;
    let serializedPayload = "";
    try {
      const serializeStartedAt = performance.now();
      serializedPayload = JSON.stringify(payload);
      addSaveTiming("autosaveSerializeMs", performance.now() - serializeStartedAt);
      saveSizeKb = Math.round((new Blob([serializedPayload]).size / 1024) * 10) / 10;
      if (saveSizeKb > 2500) {
        console.warn(`[save] CRITICAL large save payload: ${saveSizeKb} KB`, {
          storageKey: this.currentSaveStorageKey(),
          activeQuests: payload.quests?.active?.length ?? 0,
          currentExpedition: Boolean(payload.currentExpedition),
        });
      } else if (saveSizeKb > 1500) {
        console.warn(`[save] Large save payload: ${saveSizeKb} KB`, {
          storageKey: this.currentSaveStorageKey(),
          activeQuests: payload.quests?.active?.length ?? 0,
          currentExpedition: Boolean(payload.currentExpedition),
        });
      }
    } catch (error) {
      console.warn("[save] Failed to measure save payload size", error);
    }

    const storageStartedAt = performance.now();
    const saved = serializedPayload && typeof saveRepository.saveGameSerializedSync === "function"
      ? saveRepository.saveGameSerializedSync(this.currentSaveStorageKey(), serializedPayload)
      : saveRepository.saveGameSync(this.currentSaveStorageKey(), payload);
    addSaveTiming("autosaveStorageWriteMs", performance.now() - storageStartedAt);
    addSaveTiming("autosaveTotalMs", performance.now() - saveStartedAt);
    this.lastSaveInfo = {
      savedAt: payload.savedAt,
      sizeKb: saveSizeKb,
      status: saved ? "OK" : "failed",
      reason: options?.reason ?? (force ? "force" : "manual"),
      timings: { ...saveTimings },
    };
    if (saved) {
      this.saveDirty = false;
      this.saveDirtyReasons = {};
    }
    this.warnPerformanceThreshold?.("autosaveTotalMs", saveTimings.autosaveTotalMs, 1.5, {
      save: {
        sizeKb: saveSizeKb,
        reason: this.lastSaveInfo.reason,
        status: this.lastSaveInfo.status,
        timings: { ...saveTimings },
      },
      regionId: this.region?.mapRegion?.id ?? this.activeMapRegion?.regionId ?? this.region?.id ?? null,
      playerTile: {
        x: Math.floor(Number(this.player?.x) || 0),
        y: Math.floor(Number(this.player?.y) || 0),
      },
      counts: {
        objects: this.renderDebugCounts?.objects ?? 0,
        monsters: this.monsters?.size ?? 0,
        loot: this.loots?.length ?? 0,
        projectiles: this.projectiles?.length ?? 0,
      },
    });
    if (saved && this.onSave) {
      this.onSave(payload);
    }
    return true;
  }
};
