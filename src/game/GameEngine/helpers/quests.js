import {
  createId,
  QUEST_CONFIG,
  QUEST_DEFS,
  QUEST_ITEM_DEFS,
  QUEST_NPCS,
  withItemFlags,
  withItemIcon
} from "../dependencies.js";
import { resourceCount } from "./items.js";

const QUEST_DEF_BY_ID = new Map(
  Object.values(QUEST_DEFS)
    .filter((def) => def && typeof def === "object" && def.id)
    .map((def) => [String(def.id), def]),
);

export function resolveQuestDefById(questId) {
  if (!questId) return null;
  const id = String(questId);
  return QUEST_DEF_BY_ID.get(id) ?? QUEST_DEFS[id] ?? null;
}

function normalizeNpcIdList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined) return [];
  const single = String(value);
  return single ? [single] : [];
}

function uniqueNpcIds(ids) {
  return [...new Set((ids ?? []).map(String).filter(Boolean))];
}

export function getQuestStartNpcIds(quest) {
  if (!quest || typeof quest !== "object") return [];
  const explicit = uniqueNpcIds([
    ...normalizeNpcIdList(quest.startNpcIds),
    ...normalizeNpcIdList(quest.giverNpcIds),
    ...normalizeNpcIdList(quest.startNpcId),
  ]);
  if (explicit.length > 0) return explicit;
  const legacy = uniqueNpcIds([
    ...normalizeNpcIdList(quest.npcIds),
    ...normalizeNpcIdList(quest.npcId),
  ]);
  return legacy;
}

export function getQuestTurnInNpcIds(quest) {
  if (!quest || typeof quest !== "object") return [];
  const explicit = uniqueNpcIds([
    ...normalizeNpcIdList(quest.turnInNpcIds),
    ...normalizeNpcIdList(quest.completeNpcIds),
    ...normalizeNpcIdList(quest.turnInNpcId),
  ]);
  if (explicit.length > 0) return explicit;
  const legacy = uniqueNpcIds([
    ...normalizeNpcIdList(quest.npcIds),
    ...normalizeNpcIdList(quest.npcId),
  ]);
  return legacy;
}

export function canNpcStartQuest(quest, npcId) {
  if (!quest || !npcId) return false;
  const source = String(quest.source ?? "npc");
  if (source === "readable") return false;
  return getQuestStartNpcIds(quest).includes(String(npcId));
}

export function canNpcTurnInQuest(quest, npcId) {
  if (!quest || !npcId) return false;
  return getQuestTurnInNpcIds(quest).includes(String(npcId));
}

export function normalizeMonsterType(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "object") {
    if (entry.type) return String(entry.type);
    if (entry.id) return String(entry.id);
    if (entry.name) return String(entry.name);
  }
  return null;
}

export function makeQuestItem(questItemId, questInstanceId) {
  const def = QUEST_ITEM_DEFS[questItemId];
  if (!def) return null;
  return withItemIcon(withItemFlags({
    id: createId(),
    name: def.name,
    baseName: def.name,
    questItemId,
    questInstanceId,
    rarity: "unique",
    rarityLabel: "Quest",
    rarityColor: "#ffcf5a",
    slot: "quest",
    mode: "quest",
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
    iconUrl: def.iconUrl ?? QUEST_CONFIG.questItemIconPlaceholder,
    value: 0,
  }));
}

export function questItemTargetsForQuest(quest) {
  const defTarget = resolveQuestDefById(quest?.questId)?.target ?? {};
  const target = quest?.target ?? {};
  const targets = [];
  const questItems = Array.isArray(defTarget.questItems)
    ? defTarget.questItems
    : Array.isArray(target.questItems)
      ? target.questItems
      : [];
  if (questItems.length) {
    targets.push(
      ...questItems
        .filter((entry) => entry?.questItemId)
        .map((entry) => ({
          questItemId: entry.questItemId,
          count: entry.count ?? 1,
          source: entry.source,
          dropChance: entry.dropChance,
          regionIds: entry.regionIds,
          dropRegionIds: entry.dropRegionIds,
          monsterTypes: entry.monsterTypes,
        })),
    );
  }

  const questItemId = defTarget.questItemId ?? target.questItemId;
  if (questItemId) {
    targets.push({
      questItemId,
      count: target.count ?? defTarget.count ?? 1,
      source: target.source ?? defTarget.source,
      dropChance: target.dropChance ?? defTarget.dropChance,
      regionIds: target.regionIds ?? defTarget.regionIds,
      dropRegionIds: target.dropRegionIds ?? defTarget.dropRegionIds,
      monsterTypes: target.monsterTypes ?? defTarget.monsterTypes,
    });
  }
  return targets;
}

export function questItemCount(items, questInstanceId, questItemId) {
  return (items ?? []).reduce((sum, item) => (
    item?.mode === "quest"
    && String(item.questItemId) === String(questItemId)
    && (item.questInstanceId == null || String(item.questInstanceId) === String(questInstanceId))
      ? sum + 1
      : sum
  ), 0);
}

export function questConsumesQuestItem(quest, item) {
  if (!item || item.mode !== "quest") return false;
  // allow quest items that are bound to this quest instance OR global (null/undefined)
  if (!(item.questInstanceId == null || String(item.questInstanceId) === String(quest?.id))) return false;
  return questItemTargetsForQuest(quest).some((target) => String(target.questItemId) === String(item.questItemId));
}

export function makeQuestInstance(def, npcId, context = {}) {
  const startNpcIds = getQuestStartNpcIds(def);
  const turnInNpcIds = getQuestTurnInNpcIds(def);
  const startNpcId = String(context.startNpcId ?? npcId ?? startNpcIds[0] ?? turnInNpcIds[0] ?? "");
  const turnInNpcId = String(context.turnInNpcId ?? turnInNpcIds[0] ?? startNpcId);
  const npc = QUEST_NPCS[startNpcId];
  const uid = createId();
  const regionIds = Array.isArray(def?.regionIds) ? def.regionIds.map(String) : ["city"];
  const source = context.source ? String(context.source) : String(def.source ?? "npc");
  const sourceLabel = context.sourceLabel
    ? String(context.sourceLabel)
    : source === "readable"
      ? `Readable: ${context.readableTitle ?? "Ukendt tekst"}`
      : undefined;
  const sourceFields = {
    source,
    sourceLabel,
    sourceReadableId: context.readableId ? String(context.readableId) : undefined,
  };
  if (def.id === "vengeance") {
    const monster = normalizeMonsterType(context.monster) ?? "monstre";
    const count = Math.max(1, Math.floor(Number(context.count) || def.target.countMin || 5));
    return {
      id: `${def.id}:${monster}:${context.regionSeed}:${context.regionIndex}:${uid}`,
      questId: def.id,
      npcId: startNpcId,
      startNpcId,
      turnInNpcId,
      startNpcIds,
      turnInNpcIds,
      title: def.titleTemplate.replace("{monster}", monster),
      repeatable: true,
      type: def.type,
      regionIds,
      story: def.storyTemplate.replace("{npcName}", npc?.name ?? "En questgiver").replace("{monster}", monster),
      acceptText: def.acceptTextTemplate.replace("{count}", count).replace("{monster}", monster),
      turnInText: def.turnInTextTemplate,
      target: { monster, count, allowElite: true },
      progress: { kills: 0 },
      rewards: { ...def.rewards },
      ...sourceFields,
    };
  }

  return {
    id: `${def.id}:${context.regionSeed}:${context.regionIndex}:${uid}`,
    questId: def.id,
    npcId: startNpcId,
    startNpcId,
    turnInNpcId,
    startNpcIds,
    turnInNpcIds,
    title: def.title,
    repeatable: Boolean(def.repeatable),
    type: def.type,
    regionIds,
    story: def.story,
    acceptText: def.acceptText,
    turnInText: def.turnInText,
    target: { ...def.target },
    progress: def.type === "collect_quest_item" ? { items: 0 } : def.type === "clear_map" ? { kills: 0, total: null, cleared: false } : {},
    rewards: { ...def.rewards },
    ...sourceFields,
  };
}

export function isQuestComplete(quest, inventory = []) {
  if (quest.type === "clear_map") {
    return quest.progress?.cleared === true;
  }
  if (quest.type === "kill_monsters") {
    return Math.max(0, Math.floor(Number(quest.progress?.kills) || 0)) >= Math.max(1, Math.floor(Number(quest.target?.count) || 1));
  }
  if (quest.type === "collect_quest_item") {
    let hasAnyRequirement = false;
    // legacy quest that uses quest items dropped/picked up
    const questItemTargets = questItemTargetsForQuest(quest);
    if (questItemTargets.length > 0) {
      hasAnyRequirement = true;
      if (!questItemTargets.every((target) => (
        questItemCount(inventory, quest.id, target.questItemId) >= Math.max(1, Math.floor(Number(target.count) || 1))
      ))) return false;
    }
    // resource-based or specific-item requirements: evaluate against current inventory
    const inv = Array.isArray(inventory) ? inventory : (quest._cachedInventory || []);
    inventory = inv;
    // resources
    if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
      hasAnyRequirement = true;
      if (!quest.target.resources.every((r) => resourceCount(inventory, r.resource) >= (r.count ?? 1))) return false;
    }
    // specific items
    if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
      hasAnyRequirement = true;
      for (const req of quest.target.items) {
        let needed = Math.max(1, Math.floor(Number(req.count) || 1));
        for (const item of inventory) {
          if (needed <= 0) break;
          if (!item) continue;
          let match = true;
          if (req.templateId) match = match && (String(item.uniqueId) === String(req.templateId) || String(item.namedId) === String(req.templateId));
          if (req.namePrefix) match = match && String(item.name || "").startsWith(`${req.namePrefix} `);
          if (req.baseName) match = match && String(item.baseName || "") === String(req.baseName);
          if (req.rarity) match = match && String(item.rarity || "") === String(req.rarity);
          if (match) needed -= 1;
        }
        if (needed > 0) return false;
      }
    }
    if (Array.isArray(quest.target?.killObjectives) && quest.target.killObjectives.length > 0) {
      hasAnyRequirement = true;
      const killCounts = quest.progress?.killObjectives ?? {};
      const allDone = quest.target.killObjectives.every((objective) => {
        const key = String(objective?.id ?? objective?.key ?? objective?.monsterType ?? objective?.monster ?? "kill");
        const needed = Math.max(1, Math.floor(Number(objective?.count) || 1));
        const current = Math.max(0, Math.floor(Number(killCounts[key]) || 0));
        return current >= needed;
      });
      if (!allDone) return false;
    }
    return hasAnyRequirement;
  }
  return false;
}

export function questSnapshot(quest, inventory = []) {
  if (!quest) return null;
  const startNpcId = String(quest.startNpcId ?? quest.npcId ?? "");
  const turnInNpcId = String(quest.turnInNpcId ?? getQuestTurnInNpcIds(quest)[0] ?? startNpcId);
  const startNpc = QUEST_NPCS[startNpcId];
  const turnInNpc = QUEST_NPCS[turnInNpcId];
  // prefer provided inventory, otherwise fallback to cached inventory on quest
  const inv = Array.isArray(inventory) && inventory.length ? inventory : (quest._cachedInventory || []);
  const complete = isQuestComplete(quest, inv);
  return {
    ...quest,
    startNpcId,
    turnInNpcId,
    startNpcName: startNpc?.name ?? startNpcId,
    startNpcTitle: startNpc?.title ?? "Questgiver",
    startNpcImageUrl: startNpc?.imageUrl,
    turnInNpcName: turnInNpc?.name ?? turnInNpcId,
    turnInNpcTitle: turnInNpc?.title ?? "Questgiver",
    turnInNpcImageUrl: turnInNpc?.imageUrl,
    npcName: turnInNpc?.name ?? turnInNpcId,
    npcTitle: turnInNpc?.title ?? "Questgiver",
    npcImageUrl: turnInNpc?.imageUrl,
    source: quest.source ?? "npc",
    sourceLabel: quest.sourceLabel,
    sourceReadableId: quest.sourceReadableId,
    complete,
    progressText: questProgressText(quest, inv),
  };
}

export function questProgressText(quest, inventory = []) {
  if (quest.type === "clear_map") {
    if (quest.progress?.cleared) return "Ryddet – klar til indlevering";
    const kills = Math.max(0, Math.floor(Number(quest.progress?.kills) || 0));
    const total = quest.progress?.total ?? "?";
    return `${kills} / ${total} edderkopper`;
  }
  if (quest.type === "kill_monsters") {
    return `${Math.max(0, Math.floor(Number(quest.progress?.kills) || 0))} / ${Math.max(1, Math.floor(Number(quest.target?.count) || 1))} ${quest.target?.monster ?? "kills"}`;
  }
  if (quest.type === "collect_quest_item") {
    // legacy quest item progress
    const parts = [];
    for (const target of questItemTargetsForQuest(quest)) {
      const item = QUEST_ITEM_DEFS[target.questItemId];
      parts.push(`${questItemCount(inventory, quest.id, target.questItemId)} / ${Math.max(1, Math.floor(Number(target.count) || 1))} ${item?.name ?? target.questItemId}`);
    }
    // resources
    if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
      parts.push(...quest.target.resources.map((r) => `${resourceCount(inventory, r.resource)} / ${r.count ?? 1} ${r.resource}`));
    }
    // specific items
    if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
      parts.push(...quest.target.items.map((req) => {
        // count matching items in inventory
        let have = 0;
        for (const item of inventory) {
          let match = true;
          if (req.templateId) match = match && (String(item.uniqueId) === String(req.templateId) || String(item.namedId) === String(req.templateId));
          if (req.namePrefix) match = match && String(item.name || "").startsWith(`${req.namePrefix} `);
          if (req.baseName) match = match && String(item.baseName || "") === String(req.baseName);
          if (req.rarity) match = match && String(item.rarity || "") === String(req.rarity);
          if (match) have += 1;
        }
        return `${have} / ${req.count ?? 1} ${req.templateId ?? req.namePrefix ?? req.baseName ?? "item"}`;
      }));
    }
    if (Array.isArray(quest.target?.killObjectives) && quest.target.killObjectives.length > 0) {
      const killCounts = quest.progress?.killObjectives ?? {};
      parts.push(...quest.target.killObjectives.map((objective) => {
        const key = String(objective?.id ?? objective?.key ?? objective?.monsterType ?? objective?.monster ?? "kill");
        const label = objective?.label
          ?? (Array.isArray(objective?.monsterTypes) && objective.monsterTypes.length > 0
            ? objective.monsterTypes.join("/")
            : objective?.monsterType ?? objective?.monster ?? key);
        const needed = Math.max(1, Math.floor(Number(objective?.count) || 1));
        const current = Math.max(0, Math.floor(Number(killCounts[key]) || 0));
        return `${current} / ${needed} ${label}`;
      }));
    }
    return parts.join(", ");
  }
  return "";
}

export function normalizeSavedQuestState(saved) {
  const rawActive = Array.isArray(saved?.active)
    ? saved.active
      .filter((quest) => quest && typeof quest === "object" && quest.id && quest.questId && quest.npcId)
      .map((quest) => {
        const def = resolveQuestDefById(quest.questId);
        const defStartNpcIds = getQuestStartNpcIds(def);
        const defTurnInNpcIds = getQuestTurnInNpcIds(def);
        const startNpcId = String(quest.startNpcId ?? quest.npcId ?? defStartNpcIds[0] ?? defTurnInNpcIds[0] ?? "");
        const turnInNpcId = String(quest.turnInNpcId ?? defTurnInNpcIds[0] ?? startNpcId);
        const base = {
          ...quest,
          id: String(quest.id),
          questId: String(quest.questId),
          npcId: startNpcId,
          startNpcId,
          turnInNpcId,
          startNpcIds: getQuestStartNpcIds(quest).length > 0 ? getQuestStartNpcIds(quest) : defStartNpcIds,
          turnInNpcIds: getQuestTurnInNpcIds(quest).length > 0 ? getQuestTurnInNpcIds(quest) : defTurnInNpcIds,
          type: String(quest.type ?? def?.type ?? ""),
          repeatable: Boolean(quest.repeatable),
          turnInText: String(quest.turnInText ?? ""),
          target: { ...(quest.target ?? {}) },
          progress: { ...(quest.progress ?? {}) },
          rewards: { ...(quest.rewards ?? {}) },
          source: String(quest.source ?? def?.source ?? "npc"),
          sourceLabel: quest.sourceLabel ? String(quest.sourceLabel) : undefined,
          sourceReadableId: quest.sourceReadableId ? String(quest.sourceReadableId) : undefined,
          regionIds: Array.isArray(quest.regionIds)
            ? quest.regionIds.map(String)
            : Array.isArray(def?.regionIds)
              ? def.regionIds.map(String)
              : ["city"],
        };

        // Always coerce basic text fields to strings
        base.title = String(quest.title ?? quest.questId);
        base.story = String(quest.story ?? "");
        base.acceptText = String(quest.acceptText ?? "");

        // Backfill missing collect_quest_item target fields from QUEST_DEFS.
        // This keeps old saves compatible when new constraints (for example
        // dropRegionIds) are added to quest targets in config.
        if (base.type === "collect_quest_item" && def?.target && typeof def.target === "object") {
          const savedTarget = base.target && typeof base.target === "object" ? base.target : {};
          const defTarget = def.target;
          const mergedTarget = { ...savedTarget };

          const scalarKeys = ["questItemId", "count", "source", "dropChance", "dropRegionIds"];
          for (const key of scalarKeys) {
            if (mergedTarget[key] === undefined && defTarget[key] !== undefined) {
              mergedTarget[key] = defTarget[key];
            }
          }

          if (defTarget.dropRegionIds !== undefined) {
            mergedTarget.dropRegionIds = Array.isArray(defTarget.dropRegionIds)
              ? defTarget.dropRegionIds.map(String)
              : defTarget.dropRegionIds;
          }

          if (!Array.isArray(mergedTarget.questItems) && Array.isArray(defTarget.questItems)) {
            mergedTarget.questItems = defTarget.questItems.map((entry) => ({ ...entry }));
          }

          base.target = mergedTarget;
        }

        // Ensure monster target is normalized (handles older saves where monster may be an object)
        if (base.target && base.target.monster) {
          const normalized = Array.isArray(base.target.monster)
            ? base.target.monster.map((entry) => normalizeMonsterType(entry) || String(entry))
            : (normalizeMonsterType(base.target.monster) || String(base.target.monster));
          base.target = { ...base.target, monster: normalized };

          // If this quest definition uses templates, rebuild title/story/acceptText from templates
          const npc = QUEST_NPCS[base.npcId];
          if (def) {
            const monsterText = Array.isArray(normalized) ? normalized.join(", ") : normalized;
            if (def.titleTemplate) base.title = String(def.titleTemplate.replace("{monster}", monsterText));
            if (def.storyTemplate) base.story = String((def.storyTemplate || "").replace("{npcName}", npc?.name ?? "En questgiver").replace("{monster}", monsterText));
            if (def.acceptTextTemplate) base.acceptText = String((def.acceptTextTemplate || "").replace("{count}", String(base.target?.count ?? "")).replace("{monster}", monsterText));
          }
        }

        return base;
      })
    : [];
  return {
    active: rawActive,
    completed: Array.isArray(saved?.completed) ? saved.completed.map(String) : [],
    cityOfferRolls: saved?.cityOfferRolls && typeof saved.cityOfferRolls === "object"
      ? Object.fromEntries(
        Object.entries(saved.cityOfferRolls)
          .map(([key, value]) => [String(key), Number(value)])
          .filter(([, value]) => Number.isFinite(value)),
      )
      : {},
    wildernessNpc: null,
    cityFade: [],
  };
}
