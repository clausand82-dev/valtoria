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
          dropRegionIds: entry.dropRegionIds,
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
      dropRegionIds: target.dropRegionIds ?? defTarget.dropRegionIds,
    });
  }
  return targets;
}

export function questItemCount(items, questInstanceId, questItemId) {
  return (items ?? []).reduce((sum, item) => (
    item?.mode === "quest"
    && String(item.questInstanceId) === String(questInstanceId)
    && String(item.questItemId) === String(questItemId)
      ? sum + 1
      : sum
  ), 0);
}

export function questConsumesQuestItem(quest, item) {
  if (!item || item.mode !== "quest" || String(item.questInstanceId) !== String(quest?.id)) return false;
  return questItemTargetsForQuest(quest).some((target) => String(target.questItemId) === String(item.questItemId));
}

export function makeQuestInstance(def, npcId, context = {}) {
  const npc = QUEST_NPCS[npcId];
  const uid = createId();
  const regionIds = Array.isArray(def?.regionIds) ? def.regionIds.map(String) : [];
  if (def.id === "vengeance") {
    const monster = normalizeMonsterType(context.monster) ?? "monstre";
    const count = Math.max(1, Math.floor(Number(context.count) || def.target.countMin || 5));
    return {
      id: `${def.id}:${monster}:${context.regionSeed}:${context.regionIndex}:${uid}`,
      questId: def.id,
      npcId,
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
    };
  }

  return {
    id: `${def.id}:${context.regionSeed}:${context.regionIndex}:${uid}`,
    questId: def.id,
    npcId,
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
    // legacy quest that uses quest items dropped/picked up
    const questItemTargets = questItemTargetsForQuest(quest);
    if (questItemTargets.length > 0) {
      if (!questItemTargets.every((target) => (
        questItemCount(inventory, quest.id, target.questItemId) >= Math.max(1, Math.floor(Number(target.count) || 1))
      ))) return false;
    }
    // resource-based or specific-item requirements: evaluate against current inventory
    const inv = Array.isArray(inventory) ? inventory : (quest._cachedInventory || []);
    inventory = inv;
    // resources
    if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
      if (!quest.target.resources.every((r) => resourceCount(inventory, r.resource) >= (r.count ?? 1))) return false;
    }
    // specific items
    if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
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
      return true;
    }
    return questItemTargets.length > 0 || (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0);
  }
  return false;
}

export function questSnapshot(quest, inventory = []) {
  if (!quest) return null;
  const npc = QUEST_NPCS[quest.npcId];
  // prefer provided inventory, otherwise fallback to cached inventory on quest
  const inv = Array.isArray(inventory) && inventory.length ? inventory : (quest._cachedInventory || []);
  const complete = isQuestComplete(quest, inv);
  return {
    ...quest,
    npcName: npc?.name ?? quest.npcId,
    npcTitle: npc?.title ?? "Questgiver",
    npcImageUrl: npc?.imageUrl,
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
    return parts.join(", ");
  }
  return "";
}

export function normalizeSavedQuestState(saved) {
  const rawActive = Array.isArray(saved?.active)
    ? saved.active
      .filter((quest) => quest && typeof quest === "object" && quest.id && quest.questId && quest.npcId)
      .map((quest) => {
        const base = {
          ...quest,
          id: String(quest.id),
          questId: String(quest.questId),
          npcId: String(quest.npcId),
          type: String(quest.type ?? resolveQuestDefById(quest.questId)?.type ?? ""),
          repeatable: Boolean(quest.repeatable),
          turnInText: String(quest.turnInText ?? ""),
          target: { ...(quest.target ?? {}) },
          progress: { ...(quest.progress ?? {}) },
          rewards: { ...(quest.rewards ?? {}) },
          regionIds: Array.isArray(quest.regionIds)
            ? quest.regionIds.map(String)
            : Array.isArray(resolveQuestDefById(quest.questId)?.regionIds)
              ? resolveQuestDefById(quest.questId).regionIds.map(String)
              : [],
        };

        // Always coerce basic text fields to strings
        base.title = String(quest.title ?? quest.questId);
        base.story = String(quest.story ?? "");
        base.acceptText = String(quest.acceptText ?? "");

        const def = resolveQuestDefById(base.questId);

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
          const normalized = normalizeMonsterType(base.target.monster) || String(base.target.monster);
          base.target = { ...base.target, monster: normalized };

          // If this quest definition uses templates, rebuild title/story/acceptText from templates
          const npc = QUEST_NPCS[base.npcId];
          if (def) {
            if (def.titleTemplate) base.title = String(def.titleTemplate.replace("{monster}", normalized));
            if (def.storyTemplate) base.story = String((def.storyTemplate || "").replace("{npcName}", npc?.name ?? "En questgiver").replace("{monster}", normalized));
            if (def.acceptTextTemplate) base.acceptText = String((def.acceptTextTemplate || "").replace("{count}", String(base.target?.count ?? "")).replace("{monster}", normalized));
          }
        }

        return base;
      })
    : [];
  return {
    active: rawActive,
    completed: Array.isArray(saved?.completed) ? saved.completed.map(String) : [],
    wildernessNpc: null,
    cityFade: [],
  };
}
