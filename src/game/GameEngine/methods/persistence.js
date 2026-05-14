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
  MAX_POTION_STACK
} from "../dependencies.js";
import {
  normalizeReadableStatus,
  normalizeReadableBonuses,
  resourceStackMax,
  normalizeResourceId,
  normalizeHeroStats,
  normalizeSavedQuestState
} from "../helpers.js";
import { normalizeSkillTree } from "../../config/skill-tree-config.js";
import { normalizeSockets, itemCanHaveSockets } from "../../config/socket-config.js";
import { SAVE_PERSIST_CONFIG } from "../../config/save-persist-config.js";

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
    try {
      const raw = localStorage.getItem(this.currentSaveStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== SAVE_VERSION) return null;
      if (parsed.seed !== WORLD_SEED) return null;
      return parsed;
    } catch {
      return null;
    }
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
      damagePct: Number(item.damagePct) || 0,
      speedPct: Number(item.speedPct) || 0,
      attackSpeed: Number(item.attackSpeed) || 0,
      critChance: Number(item.critChance) || 0,
      critDamage: Number(item.critDamage) || 0,
      blockChance: Number(item.blockChance) || 0,
      dodgeChance: Number(item.dodgeChance) || 0,
      lifeSteal: Number(item.lifeSteal) || 0,
      magicFind: Number(item.magicFind) || 0,
      goldFind: Number(item.goldFind) || 0,
      resourceFind: Number(item.resourceFind) || 0,
      xpGain: Number(item.xpGain) || 0,
      durability: Number.isFinite(Number(item.durability))
        ? clamp(Number(item.durability), 0, 100)
        : undefined,
      sockets: normalizeSockets(item.sockets),
      potionType: item.potionType ? String(item.potionType) : undefined,
      restorePct: Number(item.restorePct) || undefined,
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
      iconIndex: Number.isFinite(Number(item.iconIndex)) ? Math.floor(Number(item.iconIndex)) : undefined,
      stackMax: isResourceItem(item) ? resourceStackMax(savedResourceId) : undefined,
      count: isPotionItem(item)
        ? clamp(Math.floor(Number(item.count) || 1), 1, MAX_POTION_STACK)
        : isResourceItem(item)
          ? clamp(Math.floor(Number(item.count) || 1), 1, resourceStackMax(savedResourceId))
          : undefined,
    };
    if (isResourceItem(normalized)) {
      const def = RESOURCE_DEFS[normalized.resourceId];
      normalized.name = def?.name ?? normalized.name;
      normalized.baseName = def?.name ?? normalized.baseName;
      normalized.rarityLabel = "Resource";
      normalized.rarityColor = RESOURCE_RARITY_COLOR;
      normalized.resourceColor = def?.color;
      normalized.iconIndex = def?.iconIndex ?? normalized.iconIndex;
      normalized.iconSheet = def?.sheet ?? normalized.iconSheet;
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
    if (normalized.uniqueId) {
      const def = UNIQUE_ITEMS.find((entry) => entry.id === normalized.uniqueId);
      // Always re-derive from definition — never trust the saved iconUrl for unique items.
      normalized.iconUrl = def?.iconUrl || iconUrlFromKey(deriveIconKey({ uniqueId: normalized.uniqueId }));
    } else if (normalized.namedId) {
      const def = NAMED_ITEM_TEMPLATES.find((entry) => entry.id === normalized.namedId);
      // Named items: use definition iconUrl if set, else fall through to baseName mapping.
      normalized.iconUrl = def?.iconUrl || undefined;
    } else if (!isResourceItem(normalized) && !isQuestItem(normalized)) {
      // Generic gear: clear stale saved iconUrl so baseName mapping takes over.
      normalized.iconUrl = undefined;
    }
    if (!itemCanHaveSockets(normalized)) normalized.sockets = [];
    normalized.value = Math.max(1, Math.floor(Number(item.value) || itemValue(normalized)));
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
    this.player.readableBonuses = normalizeReadableBonuses(savedPlayer.readableBonuses);
    this.player.skillTree = normalizeSkillTree(savedPlayer.skillTree);
    this.player.unlockedSpells = [...new Set(["ember_spark", ...(Array.isArray(savedPlayer.unlockedSpells) ? savedPlayer.unlockedSpells.map(String) : [])])];
    this.player.activeSpellId = savedPlayer.activeSpellId ? String(savedPlayer.activeSpellId) : this.player.unlockedSpells[0] ?? "ember_spark";
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

    if (Array.isArray(savedPlayer.inventory)) {
      const normalizedInventory = savedPlayer.inventory
        .map((item) => this.normalizeSavedItem(item))
        .filter(Boolean);
      for (const item of normalizedInventory) {
        if (isPotionItem(item)) this.addPotionLoot(item);
      }
      this.player.inventory = normalizedInventory
        .filter((item) => !isPotionItem(item))
        .slice(0, MAX_INVENTORY);
    }

    const nextEquipment = createEquipment();
    const savedEquipment = savedPlayer.equipment;
    if (savedEquipment && typeof savedEquipment === "object") {
      for (const slot of EQUIPMENT_SLOTS) {
        const normalized = this.normalizeSavedItem(savedEquipment[slot.id]);
        nextEquipment[slot.id] = normalized || nextEquipment[slot.id] || null;
      }
    }
    this.player.equipment = nextEquipment;

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

    this.addToast("Progression indlaest");
  },

  saveProgress(options = {}) {
    const force = Boolean(options?.force);
    if (this.activeMapRegion && !force) return false;
    if (!SAVE_PERSIST_CONFIG.storage.playerSave) return false;
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
        } : {}),
        ...(cfg.player.potions ? { potions: { ...this.player.potions } } : {}),
        ...(cfg.player.readableBonuses ? { readableBonuses: { ...this.player.readableBonuses } } : {}),
        ...(cfg.player.skillTree ? { skillTree: normalizeSkillTree(this.player.skillTree) } : {}),
        ...(cfg.player.spells ? {
          unlockedSpells: [...(this.player.unlockedSpells ?? [])],
          activeSpellId: this.player.activeSpellId ?? null,
        } : {}),
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
          ? this.questState.active.map((quest) => ({ ...quest, progress: { ...(quest.progress ?? {}) } }))
          : [],
        completed: cfg.quests.completed ? [...this.questState.completed] : [],
      },
      loots: [],
    };

    try {
      localStorage.setItem(this.currentSaveStorageKey(), JSON.stringify(payload));
      if (this.onSave) this.onSave(payload);
    } catch {
      // Ignore quota or storage-denied errors.
    }
    return true;
  }
};
