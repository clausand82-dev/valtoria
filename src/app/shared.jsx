import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY, RARITIES, TILE_H, TILE_W } from "../game/data.js";
import { drawGroundTile, drawShadow, loadGeneratedAtlas } from "../game/assets-ground.js";
import { GameEngine } from "../game/GameEngine.js";
import { makeItem, itemValue } from "../game/world.js";
import { makeResourceItem } from "../game/GameEngine/helpers.js";
import { screenToWorld, worldToIso, worldToScreen } from "../game/iso.js";
import { RESOURCE_DEFS, RESOURCE_MERGE_RECIPES } from "../game/config/resource-config.js";
import { READABLE_DEF_BY_ID, READABLE_ITEM_DEFS } from "../game/config/readable-config.js";
import { CITY_AREAS, CITY_AREA_LABEL_OPTIONS, CITY_MAP_IMAGE, CITY_NPC_AREA, CITY_NPC_POINTS } from "../game/config/city-areas-config.js";
import { CITY_BUILDINGS } from "../game/config/city-buildings-config.js";
import { DURABILITY_DEFAULT, DURABILITY_DEGRADE_CHANCE, DURABILITY_DEGRADE_MIN_PCT, DURABILITY_DEGRADE_MAX_PCT } from "../game/config/durability-config.js";
import { CITY_STATS_RULES } from "../game/config/city-stats-rules-config.js";
import { SPELL_DEFS } from "../game/config/spell-config.js";
import { GEM_SOCKET_BONUSES, MAX_ITEM_SOCKETS, itemCanHaveSockets, normalizeSockets } from "../game/config/socket-config.js";
import {
  SKILL_TREE_BRANCHES,
  skillTreeAvailablePoints,
  skillTreeBranchSpentPoints,
  normalizeSkillTree,
} from "../game/config/skill-tree-config.js";
import { AREA_MAPS, MAP_REGION_SETS, WORLD_MAP } from "../game/config/map-region-config.js";
import { QUEST_DEFS, QUEST_ITEM_DEFS } from "../game/config/quest-config.js";
import { QUEST_NPCS } from "../game/config/npc-config.js";
import { SHOW_INACTIVE_CITY_NPCS } from "../game/config/game-engine-config.js";
import {
  CITY_STORAGE_KEY,
  regionStatusKey,
} from "./save/save-keys.js";
import {
  collectSaveSlots,
  createSaveSlot,
  loadRegionCorruption,
  loadRegionMapInitialId,
  normalizeSaveSlot,
  saveRegionCorruption,
  upsertSaveSlot,
  formatSaveTimestamp,
} from "./save/save-slots.js";
import {
  INVENTORY_FILTERS,
  isItemRequiredByActiveQuests,
  itemMatchesInventoryFilter,
} from "./inventory/inventory-filters.js";
import {
  AtlasIcon,
  ImageIcon,
  InventoryIcon,
  ITEM_GOLD_ICON_URL,
  ITEM_MONEY_ICON_URL,
  ITEM_STANDARD_ICON_URL,
  QUICKBAR_ATTACK_ICON_URL,
  QUICKBAR_CITY_ICON_URL,
  QUICKBAR_HEALTH_POTION_ICON_URL,
  QUICKBAR_MANA_POTION_ICON_URL,
  QUICKBAR_QUEST_ICON_URL,
  QUICKBAR_WILDERNESS_ICON_URL,
} from "./ui/icons.jsx";
import {
  CITY_MOB_DAMAGE_PER_LEVEL_PCT,
  CITY_MOB_LEVELS,
  CITY_MOB_LEVEL_UP_CHANCE,
  CITY_MOB_MAX_LEVEL,
  CITY_MOB_POOL,
  CITY_SPAWN_AREA_BUILDING_TARGETS,
  CITY_SPAWN_AREA_RULES,
  CITY_SPAWN_PATHS,
  CITY_SPAWN_SPREAD_TARGETS,
  CITY_THREAT_SPAWN_THRESHOLD,
  calcCitySpawnChance,
  calcThreatFallOnMapExit,
  calcThreatRiseOnDeath,
  pickCityMobType,
} from "../game/config/city-mobs-attack-config.js";
import {
  deriveIconKey,
  iconUrlFromKey,
  isEquippableItem,
  isPotionItem,
  isQuestItem,
  isReadableItem,
  isResourceItem,
} from "../game/item-system.js";

const cityAssetCache = {
  promise: null,
  assets: null,
};

const cityPrebuildCache = {
  layout: null,
};

const emptySnapshot = {
  player: {
    level: 1,
    hp: 1,
    maxHp: 1,
    mana: 1,
    maxMana: 1,
    xp: 0,
    nextXp: 1,
    gold: 0,
    popularity: 0,
    damage: "0-0",
    armor: 0,
    mode: "melee",
    skillTree: normalizeSkillTree(),
    skillPoints: 0,
    unlockedSpells: ["ember_spark"],
    activeSpellId: "ember_spark",
    activeSpellTitle: "Ember Spark",
    critChance: 0,
    critDamage: 1.5,
    blockChance: 0,
    dodgeChance: 0,
    lifeSteal: 0,
    magicFind: 0,
    goldFind: 0,
    resourceFind: 0,
    xpGain: 0,
  },
  zone: { name: "Stonewake Wilds", level: 1, seed: 7341 },
  region: { name: "Stonewake Wilds", index: 1, seed: 7341 },
  regionRun: null,
  mapReturn: null,
  lastDeath: null,
  mobs: { total: 0, alive: 0, killed: 0 },
  exitPrompt: false,
  nearbyFoliageLoot: null,
  inventory: [],
  equipment: [],
  hoverMonster: null,
  quickActions: { healthPotions: 0, manaPotions: 0, potionCooldown: 0 },
  quests: { active: [], completed: [], cityFade: [], wildernessNpc: null, nearbyQuestgiver: null },
  toasts: [],
};

const CITY_STAT_ALIASES = {
  defence: "city_defence",
  cityDefence: "city_defence",
  city_defence: "city_defence",
  citizensHealth: "citizens_health",
  citizens_health: "citizens_health",
  food: "provision",
};
const CITY_STAT_DEFS = [
  { id: "city_defence", classId: "defence", label: "CITY DEFENCE" },
  { id: "population", label: "POPULATION" },
  { id: "housing", label: "HOUSING" },
  { id: "provision", label: "PROVISION" },
  { id: "water", label: "WATER" },
  { id: "army", label: "ARMY" },
  { id: "happiness", label: "HAPPINESS" },
  { id: "citizens_health", classId: "citizens-health", label: "CITIZENS HEALTH" },
  { id: "xp", label: "XP", max: (snapshot) => snapshot.player?.nextXp ?? 1 },
  { id: "popularity", label: "POPULARITY", max: 100 },
  { id: "gold", label: "GOLD", max: 999999 },
];
const CITY_CITIZEN_CONDITION_DEFS = [
  { id: "homeless_people", label: "Homeless" },
  { id: "hungry_people", label: "Hungry" },
  { id: "thirsty_people", label: "Thirsty" },
  { id: "sick_people", label: "Sick" },
  { id: "angry_people", label: "Angry" },
];
const CITY_STAT_ICON_URLS = {
  city_defence: "/assets/generated/icon/icon_citydefence.png",
  population: "/assets/generated/icon/icon_population.png",
  housing: "/assets/generated/icon/icon_housing.png",
  provision: "/assets/generated/icon/icon_provision.png",
  water: "/assets/generated/icon/icon_water.png",
  army: "/assets/generated/icon/icon_army.png",
  happiness: "/assets/generated/icon/icon_happiness.png",
  citizens_health: "/assets/generated/icon/icon_health.png",
  hungry_people: "/assets/generated/icon/icon_hunger.png",
  homeless_people: "/assets/generated/icon/icon_homeless.png",
  thirsty_people: "/assets/generated/icon/icon_thirst.png",
  sick_people: "/assets/generated/icon/icon_sick.png",
  angry_people: "/assets/generated/icon/icon_angry.png",
  xp: "/assets/generated/icon/icon_xp.png",
  popularity: "/assets/generated/icon/icon_popularity.png",
  gold: ITEM_MONEY_ICON_URL,
};
const CITY_BUILDING_CHIPS_ALWAYS_VISIBLE = true;
function mapRegionColor(mapId, region, regionCorruption) {
  if (mapId === WORLD_MAP.id) return region.color;
  const corrupted = regionCorruption[regionStatusKey(mapId, region.id)] ?? region.corrupted ?? true;
  return corrupted ? "#d94343" : "#58d96d";
}

function StartMenu({ view, saveSlots, onNewGame, onLoadClick, onBack, onLoadGame }) {
  const hasSaves = saveSlots.some((slot) => slot.exists);
  const [menuImageLoaded, setMenuImageLoaded] = useState(false);
  return (
    <section className={`start-menu-screen ${menuImageLoaded ? "has-menu-image" : ""}`} aria-label="Valtoria start menu">
      <img
        className="start-menu-bg"
        src="/assets/generated/menu.png"
        alt=""
        aria-hidden="true"
        onLoad={() => setMenuImageLoaded(true)}
        onError={() => setMenuImageLoaded(false)}
      />
      <div className="start-menu-panel">
        {!menuImageLoaded && <h1>Valtoria</h1>}
        {view === "main" && (
          <nav className="start-menu-actions" aria-label="Main menu">
            <button type="button" onClick={onNewGame}>New Game</button>
            <button type="button" onClick={onLoadClick} disabled={!hasSaves}>Load Game</button>
            <button type="button" disabled>Game Setting</button>
          </nav>
        )}
        {view === "load" && (
          <div className="load-menu">
            <div className="load-menu-head">
              <button type="button" onClick={onBack}>Back</button>
              <span>Choose save</span>
            </div>
            <div className="save-slot-list">
              {saveSlots.filter((slot) => slot.exists).map((slot) => (
                <button
                  type="button"
                  className="save-slot-row"
                  key={slot.id}
                  onClick={() => onLoadGame(slot)}
                >
                  <b>{slot.label}</b>
                  <span>
                    Level {slot.level} | Gold {slot.gold} | Quests {slot.activeQuestCount} | {formatSaveTimestamp(slot.updatedAt)}
                  </span>
                </button>
              ))}
              {!hasSaves && <p>Ingen saves fundet.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ResourceBar({ type, value, label }) {
  return (
    <div className={`resource ${type}`}>
      <span style={{ width: `${value}%` }} />
      <b>{label}</b>
    </div>
  );
}

function CityStatsTopBar({ stats }) {
  return (
    <div className="city-top-stat-bar" aria-label="City stats">
      {stats.map((stat) => (
        <div className={`city-top-stat city-top-stat-${stat.classId}`} key={stat.id} title={stat.label}>
          <img src={CITY_STAT_ICON_URLS[stat.id]} alt="" draggable="false" />
          <div>
            <span>{cityTopStatLabel(stat)}</span>
            <b>{cityTopStatValue(stat)}</b>
          </div>
        </div>
      ))}
    </div>
  );
}

function CityCitizenConditions({ stats }) {
  return (
    <div className="city-citizen-conditions" aria-label="Citizen conditions">
      {CITY_CITIZEN_CONDITION_DEFS.map((entry) => {
        const value = Math.max(0, Math.floor(Number(stats?.[entry.id]) || 0));
        return (
          <div className={value > 0 ? "warning" : ""} title={entry.label} key={entry.id}>
            <img src={CITY_STAT_ICON_URLS[entry.id]} alt="" draggable="false" />
            <span>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function cityTopStatLabel(stat) {
  return stat.label.replace(/\s+-?\d+%?(\s*\/\s*\d+)?$/, "");
}

function cityTopStatValue(stat) {
  if (stat.id === "xp") return `${stat.value} / ${stat.max}`;
  if (stat.id === "popularity" || stat.id === "happiness") return `${Math.round(stat.value)}%`;
  return String(stat.value);
}

function MergeChoiceDialog({ choice, onCancel, onChoose }) {
  const mergeTitle = choice?.type === "readable-choice" ? "Choose assembled item" : "Choose merge result";
  const mergeBody = choice?.type === "readable-choice"
    ? "These fragments can assemble more than one item."
    : "This resource can be used in more than one recipe.";
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog merge-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="merge-choice-title">
        <h2 id="merge-choice-title">{mergeTitle}</h2>
        <p>{mergeBody}</p>
        <div className="merge-choice-list">
          {choice.options.map((option) => (
            <button type="button" className="merge-choice-option" key={option.output} onClick={() => onChoose(option.output)}>
              <InventoryIcon iconIndex={option.iconIndex} iconSheet={option.iconSheet} iconUrl={option.iconUrl} />
              <span>
                <b>{option.name}</b>
                <em>{formatMergeInputs(option.inputs, choice?.type)}</em>
              </span>
            </button>
          ))}
        </div>
        <div>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

function ReadableDialog({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="readable-title">
        <h2 id="readable-title">{entry.title}</h2>
        <p>{entry.text}</p>
        {entry.questStarted && <p><b>Quest startet:</b> {entry.questStarted.title}</p>}
        <div>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

function formatMergeInputs(inputs, type = "resource-choice") {
  return Object.entries(inputs)
    .map(([resourceId, count]) => {
      if (type === "readable-choice") return `${count} ${READABLE_DEF_BY_ID[resourceId]?.title ?? resourceId}`;
      return `${count} ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`;
    })
    .join(" + ");
}

function normalizeQuestRegions(quest) {
  const target = quest?.target ?? {};
  if (quest?.type === "clear_map" && target.regionId) return [String(target.regionId)];

  const regions = new Set();
  if (Array.isArray(target.dropRegionIds)) {
    for (const regionId of target.dropRegionIds) regions.add(String(regionId));
  }
  for (const entry of target.questItems ?? []) {
    if (Array.isArray(entry?.dropRegionIds)) {
      for (const regionId of entry.dropRegionIds) regions.add(String(regionId));
    }
  }
  if (regions.size) return [...regions];

  const explicit = Array.isArray(quest?.regionIds)
    ? quest.regionIds.map(String).filter((regionId) => regionId !== "city")
    : [];
  if (explicit.length) return explicit;
  return [];
}

function getRegionLabel(regionId) {
  // Search all map region sets for a matching region id
  for (const regions of Object.values(MAP_REGION_SETS)) {
    const region = regions.find((r) => r?.id === regionId);
    if (region?.label) return region.label;
  }
  return regionId; // Fallback to id if no label found
}

function monsterSpriteSheetFromType(typeName) {
  const type = String(typeName ?? "");
  const id = type === "Scorpion" ? "scorpion"
    : type === "Snake" ? "snake"
    : type === "Spider" ? "spider"
    : type === "MiniSpider" ? "spider"
    : type === "MediumSpider" ? "spider"
    : type === "LargeSpider" ? "spider"
    : type === "Wolf" ? "wolf"
    : type === "Skeleton" ? "skeleton"
    : type === "Ghost" ? "ghost"
    : type === "Demon" ? "demon"
    : type.includes("Bone") ? "skeleton"
    : type.includes("Warden") ? "skeleton"
    : type.includes("Shade") ? "ghost"
    : "demon";
  return `/assets/generated/mobs/${id}_animated_sheet.png`;
}

function QuestMonsterSprite({ monsterType }) {
  const canvasRef = React.useRef(null);
  
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.onload = () => {
      // Extract frame 0 from 4-col x 3-row sheet
      const cellW = image.naturalWidth / 4;
      const cellH = image.naturalHeight / 3;
      
      // Draw frame 0 to canvas
      ctx.drawImage(image, 0, 0, cellW, cellH, 0, 0, canvas.width, canvas.height);
      
      // Remove green screen like loadChromaImage does
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (g > 145 && g > r * 1.55 && g > b * 1.55) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    };
    image.src = monsterSpriteSheetFromType(monsterType);
  }, [monsterType]);
  
  return <canvas ref={canvasRef} className="quest-monster-mini" width={22} height={22} />;
}

function collectQuestTargets(quest) {
  const target = quest?.target ?? {};
  const rows = [];
  if (target.questItemId) {
    const def = QUEST_ITEM_DEFS[target.questItemId];
    rows.push({
      key: `quest-item-${target.questItemId}`,
      label: `${target.count ?? 1}x ${def?.name ?? target.questItemId}`,
      iconUrl: def?.iconUrl ?? ITEM_STANDARD_ICON_URL,
    });
  }
  for (const entry of target.questItems ?? []) {
    if (!entry?.questItemId) continue;
    const def = QUEST_ITEM_DEFS[entry.questItemId];
    rows.push({
      key: `quest-item-${entry.questItemId}`,
      label: `${entry.count ?? 1}x ${def?.name ?? entry.questItemId}`,
      iconUrl: def?.iconUrl ?? ITEM_STANDARD_ICON_URL,
    });
  }
  for (const entry of target.resources ?? []) {
    const resourceId = String(entry?.resource ?? "");
    if (!resourceId) continue;
    rows.push({
      key: `resource-${resourceId}`,
      label: `${entry.count ?? 1}x ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`,
      iconUrl: iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId })),
    });
  }
  for (const entry of target.items ?? []) {
    const name = entry?.templateId ?? entry?.namePrefix ?? entry?.baseName ?? "item";
    rows.push({
      key: `item-${name}`,
      label: `${entry?.count ?? 1}x ${name}`,
      iconUrl: ITEM_STANDARD_ICON_URL,
    });
  }
  return rows;
}

function killQuestMonsters(quest) {
  const target = quest?.target ?? {};
  if (Array.isArray(target.monsters) && target.monsters.length) return target.monsters.map(String);
  if (target.monster && String(target.monster) !== "random") return [String(target.monster)];
  return [];
}

function killQuestCountLabel(quest) {
  const target = quest?.target ?? {};
  if (target.count !== undefined) return `${target.count}`;
  if (target.countMin !== undefined && target.countMax !== undefined) return `${target.countMin}-${target.countMax}`;
  if (target.countMin !== undefined) return `${target.countMin}`;
  if (target.countMax !== undefined) return `${target.countMax}`;
  return "?";
}

function QuestObjectiveMeta({ quest, compact = false }) {
  if (!quest) return null;
  const regions = normalizeQuestRegions(quest);
  const collectRows = quest.type === "collect_quest_item" ? collectQuestTargets(quest) : [];
  const killMonsters = quest.type === "kill_monsters" ? killQuestMonsters(quest) : [];
  const clearMapMonsters = quest.type === "clear_map" ? (quest.target?.monsters ?? []).map(String) : [];
  return (
    <div className={`quest-objective-meta ${compact ? "compact" : ""}`}>
      {quest.type === "collect_quest_item" && collectRows.length > 0 && (
        <div className="quest-objective-row quest-objective-items">
          {collectRows.map((row) => (
            <span className="quest-chip" key={row.key}>
              {row.iconUrl && <img src={row.iconUrl} alt="" />}
              {row.label}
            </span>
          ))}
        </div>
      )}

      {quest.type === "kill_monsters" && (
        <div className="quest-objective-row quest-objective-kills">
          <span className="quest-chip kill-count">Dræb: {killQuestCountLabel(quest)}</span>
          {killMonsters.length > 0 ? killMonsters.map((monster) => (
            <span className="quest-monster-chip" key={monster}>
              <QuestMonsterSprite monsterType={monster} />
              {monster}
            </span>
          )) : <span className="quest-chip">Regionens monstre</span>}
        </div>
      )}

      {quest.type === "clear_map" && (
        <div className="quest-objective-row quest-objective-kills">
          {clearMapMonsters.map((monster) => (
            <span className="quest-monster-chip" key={monster}>
              <QuestMonsterSprite monsterType={monster} />
              {monster}
            </span>
          ))}
        </div>
      )}

      {(regions.length > 0 || quest.type === "kill_monsters" || quest.target?.dropChance !== undefined) && (
        <div className="quest-objective-row quest-objective-regions">
          <span className="quest-chip region-chip">Regioner: {regions.length ? regions.map(getRegionLabel).join(", ") : "Alle"}</span>
        </div>
      )}
      {quest.source === "readable" && (
        <div className="quest-objective-row quest-objective-regions">
          <span className="quest-chip region-chip">Udløser: {quest.sourceLabel ?? "Readable"}</span>
        </div>
      )}
    </div>
  );
}

function QuestOfferDialog({ interaction, onDecline, onAcceptQuest, onTurnInQuest }) {
  const npc = QUEST_NPCS[interaction.npcId];
  const offers = interaction.offers ?? [];
  const active = interaction.active ?? [];
  const completeActive = active.filter((quest) => quest.complete);
  const inProgress = active.filter((quest) => !quest.complete);
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog quest-offer-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-offer-title">
        <div className="quest-offer-header">
          {npc?.imageUrl && <img src={npc.imageUrl} alt="" />}
          <div>
            <h2 id="quest-offer-title">{npc?.name ?? "Questgiver"}</h2>
            <span>{npc?.name ?? "Questgiver"} - {npc?.title ?? "Questgiver"}</span>
          </div>
        </div>
        {completeActive.length > 0 && (
          <>
            <p>Ferdige quests:</p>
            <div className="quest-list">
              {completeActive.map((quest) => (
                <article className="quest-card complete" key={quest.id}>
                  <header>
                    <b>{quest.title}</b>
                    <span>{quest.progressText}</span>
                  </header>
                  <p>{quest.turnInText}</p>
                  <QuestObjectiveMeta quest={quest} />
                  <button type="button" onClick={() => onTurnInQuest?.(quest)}>Indlever quest</button>
                </article>
              ))}
            </div>
          </>
        )}
        {offers.length > 0 && (
          <>
            <p>Tilgaengelige quests:</p>
            <div className="quest-list">
              {offers.map((quest) => (
                <article className="quest-card" key={quest.id}>
                  <header>
                    <b>{quest.title}</b>
                    <span>{quest.progressText}</span>
                  </header>
                  <p>{quest.story}</p>
                  <p>{quest.acceptText}</p>
                  <QuestObjectiveMeta quest={quest} />
                  <button type="button" onClick={() => onAcceptQuest?.(quest)}>Tag quest</button>
                </article>
              ))}
            </div>
          </>
        )}
        {offers.length === 0 && completeActive.length === 0 && inProgress.length > 0 && (
          <p>Du har aktive quests herfra, og ingen nye quests er tilgaengelige lige nu.</p>
        )}
        {offers.length === 0 && completeActive.length === 0 && inProgress.length === 0 && (
          <p>Ingen quests tilgaengelige lige nu.</p>
        )}
        <div>
          <button type="button" onClick={onDecline}>Luk</button>
        </div>
      </section>
    </div>
  );
}

function QuestDetailDialog({ quest, engineRef, onClose, onQuestCompleted, cityOpen }) {
  if (!quest) return null;
  const npc = QUEST_NPCS[quest.npcId];
  const turnIn = async () => {
    const result = engineRef.current?.completeQuest?.(quest.id);
    if (result?.ok) {
      onQuestCompleted?.(result);
      onClose?.();
    }
  };

  return (
    <div className="city-popup-backdrop">
      <section className="confirm-dialog quest-offer-dialog quest-parchment-dialog quest-detail-dialog" role="dialog" aria-modal="true" aria-label={quest.title}>
        <div className="quest-offer-header">
          {npc?.imageUrl && <img src={npc.imageUrl} alt="" />}
          <div>
            <h2>{quest.title}</h2>
            <span>{npc?.name ?? "Questgiver"} - {npc?.title ?? ""}</span>
          </div>
        </div>
        <p>{quest.complete ? quest.turnInText : quest.story}</p>
        {quest.progressText && (
          <p className="quest-progress-line">
            <b>Progress:</b> {quest.progressText}
          </p>
        )}
        <QuestObjectiveMeta quest={quest} />
        <div className="comparison-list">
          {(quest.rewards?.xp ?? 0) > 0 && <span className="diff-good">+ XP {quest.rewards.xp}</span>}
          {(quest.rewards?.gold ?? 0) > 0 && <span className="diff-good">+ Gold {quest.rewards.gold}</span>}
          {(quest.rewards?.resources ?? []).map((r) => (
            <span className="diff-good" key={`res-${r.resource}`}>+ {r.count}x {r.resource}</span>
          ))}
        </div>
        <div>
          <button type="button" onClick={onClose}>Luk</button>
          {cityOpen && (
            <button type="button" disabled={!quest.complete} onClick={turnIn}>Indlever quest</button>
          )}
        </div>
      </section>
    </div>
  );
}

function QuestOverviewDialog({ activeQuests, onClose, onToggleTracked, onOpenQuest }) {
  const [selectedQuestId, setSelectedQuestId] = useState(activeQuests[0]?.id ?? null);

  useEffect(() => {
    if (!activeQuests.length) {
      setSelectedQuestId(null);
      return;
    }
    const stillExists = activeQuests.some((quest) => quest.id === selectedQuestId);
    if (!stillExists) setSelectedQuestId(activeQuests[0].id);
  }, [activeQuests, selectedQuestId]);

  const selectedQuest = activeQuests.find((quest) => quest.id === selectedQuestId) ?? activeQuests[0] ?? null;
  const selectedNpc = selectedQuest ? QUEST_NPCS[selectedQuest.npcId] : null;

  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog quest-overview-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-overview-title">
        <header className="quest-overview-head">
          <h2 id="quest-overview-title">Questoversigt</h2>
        </header>

        <div className="quest-overview-body">
          {activeQuests.length <= 0 ? (
            <p>Ingen aktive quests lige nu.</p>
          ) : (
            <div className="quest-overview-layout">
              <div className="quest-overview-list">
                {activeQuests.map((quest) => (
                  (() => {
                    const completionPct = questCompletionPercent(quest);
                    return (
                  <article
                    className={`quest-overview-row ${quest.complete ? "complete" : ""} ${selectedQuest?.id === quest.id ? "selected" : ""}`}
                    key={quest.id}
                  >
                    <button type="button" className="quest-open-button" onClick={() => setSelectedQuestId(quest.id)}>
                      <span
                        className="quest-name-bar"
                        style={{
                          "--quest-pct": `${completionPct}%`,
                        }}
                      >
                        <b className="quest-name-label">{quest.title}</b>
                      </span>
                    </button>
                    <label className="quest-track-toggle">
                      <input
                        type="checkbox"
                        checked={quest.tracked !== false}
                        onChange={(event) => onToggleTracked?.(quest.id, event.target.checked)}
                      />
                      Track
                    </label>
                  </article>
                    );
                  })()
                ))}
              </div>

              {selectedQuest && (
                <aside className="quest-overview-detail quest-parchment-panel">
                  <header>
                    <div>
                      <b>{selectedQuest.title}</b>
                      <span>{selectedNpc?.name ?? "Questgiver"}{selectedNpc?.title ? ` | ${selectedNpc.title}` : ""}</span>
                    </div>
                    <button type="button" onClick={() => onOpenQuest?.(selectedQuest)}>Aaben quest</button>
                  </header>
                  <p>{selectedQuest.complete ? selectedQuest.turnInText : selectedQuest.story}</p>
                  {selectedQuest.progressText && (
                    <p className="quest-progress-line">
                      <b>Progress:</b> {selectedQuest.progressText}
                    </p>
                  )}
                  <QuestObjectiveMeta quest={selectedQuest} />
                  <div className="comparison-list">
                    {(selectedQuest.rewards?.xp ?? 0) > 0 && <span className="diff-good">+ XP {selectedQuest.rewards.xp}</span>}
                    {(selectedQuest.rewards?.gold ?? 0) > 0 && <span className="diff-good">+ Gold {selectedQuest.rewards.gold}</span>}
                    {(selectedQuest.rewards?.resources ?? []).map((r) => (
                      <span className="diff-good" key={`ov-res-${selectedQuest.id}-${r.resource}`}>+ {r.count}x {r.resource}</span>
                    ))}
                  </div>
                </aside>
              )}
            </div>
          )}
        </div>

        <footer className="quest-overview-foot">
          <button type="button" onClick={onClose}>Luk</button>
        </footer>
      </section>
    </div>
  );
}

function questCompletionPercent(quest) {
  if (!quest) return 0;
  if (quest.complete) return 100;
  const text = String(quest.progressText ?? "");
  const matches = [...text.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
  if (!matches.length) return 0;
  const ratios = matches
    .map((match) => {
      const current = Number(match[1]);
      const total = Number(match[2]);
      if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
      return Math.max(0, Math.min(1, current / total));
    })
    .filter((value) => value !== null);
  if (!ratios.length) return 0;
  const avg = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
  return Math.round(avg * 100);
}

function MinimapDialog({ engineRef, snapshot, cityOpen, cityMinimapHero, onClose }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    if (cityOpen) {
      renderCityMinimap(canvasRef.current, cityMinimapHero ?? undefined);
      return;
    }
    engineRef.current?.renderMinimap(canvasRef.current);
  }, [engineRef, snapshot, cityOpen, cityMinimapHero]);
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="map-dialog" role="dialog" aria-modal="true" aria-label="Map">
        <header>
          <div>
            <h2>Map</h2>
            <span>{cityOpen ? "City" : `${snapshot.region.name} | Seed ${snapshot.region.seed}`}</span>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>
        <canvas ref={canvasRef} width="520" height="520" aria-label="Current minimap" />
      </section>
    </div>
  );
}

function renderCityMinimap(canvas, heroPosition) {
  if (!canvas) return;
  const layout = getCityLayout();
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = 20;
  const gridW = width - pad * 2;
  const gridH = height - pad * 2;
  const cellW = gridW / layout.mapWidth;
  const cellH = gridH / layout.mapHeight;

  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1b2420");
  gradient.addColorStop(1, "#0e1411");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < layout.mapHeight; y += 1) {
    for (let x = 0; x < layout.mapWidth; x += 1) {
      const tile = layout.rows[y]?.[x] ?? "g";
      const px = pad + x * cellW;
      const py = pad + y * cellH;
      ctx.fillStyle = tile === "r" ? "#6f6756" : "#2a5f39";
      ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(cellW) + 1, Math.ceil(cellH) + 1);
    }
  }

  for (const house of layout.houses) {
    const hx = pad + (house.gx + 0.5) * cellW;
    const hy = pad + (house.gy + 0.5) * cellH;
    ctx.fillStyle = "#d3b47d";
    ctx.beginPath();
    ctx.arc(hx, hy, Math.max(2, Math.min(cellW, cellH) * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
}

function RegionMapDialog({ initialMapId, regionCorruption, completedQuests = [], army = 0, onPlayableRegionSelected, onCityOpen, onMapNavigation }) {
  const [selectedMapId, setSelectedMapId] = useState(initialMapId ?? WORLD_MAP.id);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [lockedRegion, setLockedRegion] = useState(null);
  const isWorldMap = selectedMapId === WORLD_MAP.id;
  const activeMap = isWorldMap ? WORLD_MAP : AREA_MAPS[selectedMapId] ?? WORLD_MAP;
  const activeRegions = MAP_REGION_SETS[selectedMapId] ?? [];
  useEffect(() => {
    setSelectedMapId(initialMapId ?? WORLD_MAP.id);
    setHoveredRegionId(null);
    setSelectedRegion(null);
    setLockedRegion(null);
  }, [initialMapId]);
  const navigateToMap = (mapId) => {
    setSelectedMapId(mapId);
    onMapNavigation?.(mapId);
  };
  const selectWorldMap = () => {
    navigateToMap(WORLD_MAP.id);
    setHoveredRegionId(null);
    setSelectedRegion(null);
    setLockedRegion(null);
  };
  const completedQuestSet = new Set(completedQuests.map(String));
  const currentArmy = Math.max(0, Math.floor(Number(army) || 0));
  const activateRegion = (region) => {
    if (!regionIsUnlocked(region, completedQuestSet, currentArmy)) {
      setSelectedRegion(region);
      setLockedRegion(region);
      return;
    }
    const targetMapId = region.targetMapId ?? region.id;
    if (isWorldMap && AREA_MAPS[targetMapId]) {
      navigateToMap(targetMapId);
      setHoveredRegionId(null);
      setSelectedRegion(null);
      return;
    }
    setSelectedRegion(region);
    onPlayableRegionSelected?.(selectedMapId, region);
  };
  const handleRegionKeyDown = (event, region) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activateRegion(region);
  };
  const mapAspectValue = useMemo(() => {
    const rawAspect = String(activeMap?.aspect ?? "").trim();
    const [rawWidth, rawHeight] = rawAspect.split("/").map((part) => Number.parseFloat(part.trim()));
    if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawHeight <= 0) return 1;
    return rawWidth / rawHeight;
  }, [activeMap?.aspect]);

  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="map-dialog world-map-dialog" role="dialog" aria-modal="true" aria-label="World map">
        <header>
          <div>
            <h2>{activeMap.title}</h2>
            <span>{isWorldMap ? activeMap.subtitle : `${activeMap.subtitle} | vaelg en region`}</span>
          </div>
          <div className="map-dialog-actions">
            {!isWorldMap && (
              <button type="button" className="map-back-button" onClick={selectWorldMap}>
                World map
              </button>
            )}
            {onCityOpen && (
              <button type="button" className="map-back-button" onClick={onCityOpen}>
                By
              </button>
            )}
          </div>
        </header>
        <div className="map-viewer">
          <div
            className={`map-frame ${isWorldMap ? "interactive-map-frame" : "area-map-frame"}`}
            style={{
              "--map-aspect": activeMap.aspect,
              "--map-max-width": activeMap.maxWidth,
              "--map-aspect-value": mapAspectValue,
            }}
          >
            <img src={activeMap.imageUrl} alt={activeMap.title} draggable="false" />
            {activeRegions.length > 0 && (
              <>
                <svg className="world-map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`Klikbare omraader paa ${activeMap.title}`}>
                  {activeRegions.map((region) => (
                    (() => {
                      const locked = !regionIsUnlocked(region, completedQuestSet, currentArmy);
                      const regionColor = mapRegionColor(selectedMapId, region, regionCorruption);
                      return (
                    <g
                      className={`world-map-region ${locked ? "locked" : ""} ${hoveredRegionId === region.id || selectedRegion?.id === region.id ? "hovered" : ""}`}
                      style={{ "--region-color": regionColor }}
                      key={region.id}
                      role="button"
                      tabIndex={0}
                      aria-label={locked ? `${region.label} er laast` : `${isWorldMap ? "Aaben" : "Vaelg"} ${region.label}`}
                      onClick={() => activateRegion(region)}
                      onKeyDown={(event) => handleRegionKeyDown(event, region)}
                      onMouseEnter={() => setHoveredRegionId(region.id)}
                      onMouseLeave={() => setHoveredRegionId(null)}
                      onFocus={() => setHoveredRegionId(region.id)}
                      onBlur={() => setHoveredRegionId(null)}
                    >
                      <title>{region.label}</title>
                      <polygon points={region.points} />
                    </g>
                      );
                    })()
                  ))}
                </svg>
                {activeRegions.map((region) => {
                  const locked = !regionIsUnlocked(region, completedQuestSet, currentArmy);
                  const regionColor = mapRegionColor(selectedMapId, region, regionCorruption);
                  return (
                    <button
                      type="button"
                      className={`world-map-label ${locked ? "locked" : ""} ${hoveredRegionId === region.id ? "hovered" : ""}`}
                      style={{
                        "--region-color": regionColor,
                        left: `${region.labelX}%`,
                        top: `${region.labelY}%`,
                      }}
                      key={`${region.id}-label`}
                      aria-label={locked ? `${region.label} er laast. ${regionUnlockText(region, completedQuestSet, currentArmy)}` : `${isWorldMap ? "Aaben" : "Vaelg"} ${region.label}`}
                      title={locked ? `${region.label} er laast. ${regionUnlockText(region, completedQuestSet, currentArmy)}` : region.label}
                      onClick={() => activateRegion(region)}
                      onMouseEnter={() => setHoveredRegionId(region.id)}
                      onMouseLeave={() => setHoveredRegionId(null)}
                      onFocus={() => setHoveredRegionId(region.id)}
                      onBlur={() => setHoveredRegionId(null)}
                    >
                      {locked && (
                        <img
                          className="map-lock-icon"
                          src="/assets/generated/minilock.png"
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                      {region.label}
                    </button>
                  );
                })}
              </>
            )}
          </div>
          {!isWorldMap && (
            <p className="map-note">
              {selectedRegion
                ? regionIsUnlocked(selectedRegion, completedQuestSet, currentArmy)
                  ? `${selectedRegion.label} | id: ${selectedRegion.id} | biodome: ${selectedRegion.biodome ?? "not set"}`
                  : `${selectedRegion.label} er laast. ${regionUnlockText(selectedRegion, completedQuestSet, currentArmy)}`
                : `${activeMap.title} er aabnet som underkort. Klik et omraade for at vaelge det.`}
            </p>
          )}
          {isWorldMap && selectedRegion && !regionIsUnlocked(selectedRegion, completedQuestSet, currentArmy) && (
            <p className="map-note">{selectedRegion.label} er laast. {regionUnlockText(selectedRegion, completedQuestSet, currentArmy)}</p>
          )}
        </div>
        {lockedRegion && (
          <LockedRegionDialog
            completedQuestSet={completedQuestSet}
            army={currentArmy}
            region={lockedRegion}
            onClose={() => setLockedRegion(null)}
          />
        )}
      </section>
    </div>
  );
}

function regionIsUnlocked(region, completedQuestSet, army = 0) {
  if (region?.unlock?.locked) return false;
  const requiredArmy = Math.max(0, Math.floor(Number(region?.unlock?.army ?? region?.unlock?.requiredArmy) || 0));
  if (army < requiredArmy) return false;
  const hasQuestCompletion = (questId) => {
    const raw = String(questId ?? "");
    if (!raw) return false;
    const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
    return completedQuestSet.has(raw) || completedQuestSet.has(swapped);
  };
  const requiredQuests = region?.unlock?.completedQuests ?? [];
  return requiredQuests.every((questId) => hasQuestCompletion(questId));
}

function regionUnlockText(region, completedQuestSet, army = 0) {
  if (region?.unlock?.text) return region.unlock.text;
  const requiredArmy = Math.max(0, Math.floor(Number(region?.unlock?.army ?? region?.unlock?.requiredArmy) || 0));
  if (army < requiredArmy) return `Kraever ${requiredArmy} army. Du har ${Math.max(0, Math.floor(Number(army) || 0))}.`;
  const hasQuestCompletion = (questId) => {
    const raw = String(questId ?? "");
    if (!raw) return false;
    const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
    return completedQuestSet.has(raw) || completedQuestSet.has(swapped);
  };
  const missingQuests = (region?.unlock?.completedQuests ?? [])
    .filter((questId) => !hasQuestCompletion(questId));
  if (!missingQuests.length) return "Ingen manglende krav.";
  const questNames = missingQuests.map((questId) => {
    const raw = String(questId ?? "");
    const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
    return QUEST_DEFS[raw]?.title ?? QUEST_DEFS[swapped]?.title ?? raw;
  });
  return `Kraever quest: ${questNames.join(", ")}.`;
}

function LockedRegionDialog({ region, completedQuestSet, army = 0, onClose }) {
  const hasQuestCompletion = (questId) => {
    const raw = String(questId ?? "");
    if (!raw) return false;
    const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
    return completedQuestSet.has(raw) || completedQuestSet.has(swapped);
  };
  const missingQuestIds = (region?.unlock?.completedQuests ?? [])
    .filter((questId) => !hasQuestCompletion(questId));
  const requiredArmy = Math.max(0, Math.floor(Number(region?.unlock?.army ?? region?.unlock?.requiredArmy) || 0));
  return (
    <div className="map-lock-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="map-lock-modal" role="dialog" aria-modal="true" aria-label={`${region.label} er laast`} onClick={(event) => event.stopPropagation()}>
        <header>
          <div className="map-lock-title">
            <img src="/assets/generated/minilock.png" alt="" aria-hidden="true" />
            <div>
              <span className="map-lock-kicker">Laast omraade</span>
              <h3>{region.label}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose}>Luk</button>
        </header>
        {region?.unlock?.text && <p>{region.unlock.text}</p>}
        {requiredArmy > 0 && army < requiredArmy && <p>Kraever {requiredArmy} army. Du har {army}.</p>}
        {missingQuestIds.length > 0 && (
          <div className="map-lock-quests">
            {missingQuestIds.map((questId) => (
              <LockedQuestRequirement questId={questId} key={questId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LockedQuestRequirement({ questId }) {
  const quest = QUEST_DEFS[questId];
  const npcId = quest?.npcIds?.[0];
  const npc = npcId ? QUEST_NPCS[npcId] : null;
  return (
    <article className="map-lock-quest">
      <div className="map-lock-quest-head">
        {npc?.imageUrl && <img src={npc.imageUrl} alt={npc.name} />}
        <div>
          <b>{quest?.title ?? questId}</b>
          <span>{npc ? `${npc.name} | ${npc.title}` : "Questgiver ikke sat"}</span>
        </div>
      </div>
      {quest?.story && <p>{quest.story}</p>}
      <div className="map-lock-requirements">
        {questRequirementRows(quest).map((row) => (
          <span className="map-lock-requirement" key={row.key}>
            {row.iconUrl && <img src={row.iconUrl} alt="" aria-hidden="true" />}
            {row.label}
          </span>
        ))}
      </div>
    </article>
  );
}

function questRequirementRows(quest) {
  const target = quest?.target ?? {};
  const rows = [];
  const addQuestItem = (entry) => {
    const def = QUEST_ITEM_DEFS[entry.questItemId];
    rows.push({
      key: `quest-${entry.questItemId}`,
      label: `${entry.count ?? 1}x ${def?.name ?? entry.questItemId}`,
      iconUrl: def?.iconUrl,
    });
  };
  if (target.questItemId) addQuestItem({ questItemId: target.questItemId, count: target.count ?? 1 });
  for (const entry of target.questItems ?? []) addQuestItem(entry);
  for (const entry of target.resources ?? []) {
    const def = RESOURCE_DEFS[entry.resource];
    rows.push({
      key: `resource-${entry.resource}`,
      label: `${entry.count ?? 1}x ${def?.name ?? entry.resource}`,
      iconUrl: iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: entry.resource })),
    });
  }
  for (const entry of target.items ?? []) {
    rows.push({
      key: `item-${entry.templateId ?? entry.namePrefix ?? entry.baseName ?? "item"}`,
      label: `${entry.count ?? 1}x ${entry.templateId ?? entry.namePrefix ?? entry.baseName ?? "item"}`,
      iconUrl: ITEM_STANDARD_ICON_URL,
    });
  }
  return rows.length ? rows : [{ key: "quest-completion", label: "Fuldfør questen", iconUrl: null }];
}

function HeroDialog({ snapshot, onSelectSpell, onClose }) {
  const [tab, setTab] = useState("overview");
  const stats = snapshot.player.stats ?? {};
  const monsterRows = Object.entries(stats.killsByMonster ?? {})
    .sort(([a], [b]) => a.localeCompare(b));
  const objectsDestroyed = detailEntries(stats.objectsDestroyedByType);
  const pickedRarity = detailEntries(stats.itemsPickedByRarity);
  const droppedRarity = detailEntries(stats.itemsDroppedByRarity);
  const notPickedRarity = detailEntries(stats.itemsNotPickedByRarity);
  const destroyedRarity = detailEntries(stats.itemsDestroyedByRarity);
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="hero-dialog" role="dialog" aria-modal="true" aria-label="Hero">
        <header>
          <div className="hero-dialog-title">
            <img src="/assets/generated/ui_hero.png" alt="" />
            <div>
              <h2>Hero</h2>
              <span>Level {snapshot.player.level} | XP {snapshot.player.xp} / {snapshot.player.nextXp}</span>
            </div>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>
        <div className="hero-tabs" role="tablist" aria-label="Hero tabs">
          {["overview", "combat", "loot", "quests"].map((id) => (
            <button type="button" className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{id}</button>
          ))}
        </div>
        {tab === "overview" && (
          <div className="hero-stat-grid">
            <HeroStat label="HP" value={`${snapshot.player.hp} / ${snapshot.player.maxHp}`} />
            <HeroStat label="Mana" value={`${snapshot.player.mana} / ${snapshot.player.maxMana}`} />
            <HeroStat label="Gold" value={snapshot.player.gold} />
            <HeroStat label="Popularity" value={`${snapshot.player.popularity}%`} />
            <HeroStat label="Damage" value={snapshot.player.damage} />
            <HeroStat label="Armor" value={snapshot.player.armor} />
            <HeroStat label="Mode" value={snapshot.player.mode} />
            <HeroStat label="Active spell" value={snapshot.player.activeSpellTitle ?? "None"} />
            <HeroStat label="Skill points" value={snapshot.player.skillPoints ?? 0} />
            <HeroStat label="Crit" value={`${Math.round((snapshot.player.critChance ?? 0) * 100)}% / ${Math.round((snapshot.player.critDamage ?? 1.5) * 100)}%`} />
            <HeroStat label="Block" value={`${Math.round((snapshot.player.blockChance ?? 0) * 100)}%`} />
            <HeroStat label="Find" value={`G ${Math.round((snapshot.player.goldFind ?? 0) * 100)}% / M ${Math.round((snapshot.player.magicFind ?? 0) * 100)}%`} />
            <HeroStat label="Deaths" value={stats.deaths ?? 0} />
          </div>
        )}
        {tab === "overview" && (snapshot.player.unlockedSpells?.length ?? 0) > 0 && (
          <div className="spell-picker">
            {snapshot.player.unlockedSpells.map((spellId) => (
              <button
                type="button"
                className={snapshot.player.activeSpellId === spellId ? "active" : ""}
                key={spellId}
                onClick={() => onSelectSpell?.(spellId)}
              >
                {SPELL_DEFS[spellId]?.title ?? spellId}
              </button>
            ))}
          </div>
        )}
        {tab === "combat" && (
          <>
            <div className="hero-stat-grid">
              <HeroStat label="Damage dealt" value={stats.damageDealt ?? 0} />
              <HeroStat label="Damage taken" value={stats.damageTaken ?? 0} />
              <HeroStat label="Kills total" value={stats.killsTotal ?? 0} />
              <HeroStat label="Melee attacks" value={stats.meleeAttacks ?? 0} />
              <HeroStat label="Ranged attacks" value={stats.rangedAttacks ?? 0} />
              <HeroStat label="Spell projectiles" value={stats.spellProjectiles ?? 0} />
              <HeroStat label="Spells cast" value={stats.spellsCast ?? 0} />
              <HeroStat label="Objects destroyed" value={stats.objectsDestroyed ?? 0} details={objectsDestroyed} />
            </div>
            <HeroDetailSection title="Kills by monster" empty="Ingen kills endnu" rows={monsterRows.map(([name, value]) => `${name}: ${value.normal ?? 0} normal | ${value.elite ?? 0} elite`)} />
          </>
        )}
        {tab === "loot" && (
          <div className="hero-stat-grid">
            <HeroStat label="Gold earned" value={stats.goldEarned ?? 0} />
            <HeroStat label="Gold looted" value={stats.goldLooted ?? 0} />
            <HeroStat label="Items dropped" value={stats.itemsDropped ?? 0} details={droppedRarity} />
            <HeroStat label="Items picked" value={stats.itemsPicked ?? 0} details={pickedRarity} />
            <HeroStat label="Items not picked" value={stats.itemsNotPicked ?? 0} details={notPickedRarity} />
            <HeroStat label="Items destroyed" value={stats.itemsDestroyed ?? 0} details={destroyedRarity} />
            <HeroStat label="Resources picked" value={stats.resourcesPicked ?? 0} />
            <HeroStat label="Health potions" value={stats.healthPotionsUsed ?? 0} />
            <HeroStat label="Mana potions" value={stats.manaPotionsUsed ?? 0} />
          </div>
        )}
        {tab === "quests" && (
          <section className="hero-quest-section">
            <h3>{`Quests completed: ${stats.questsCompleted ?? 0}`}</h3>
            {(snapshot.quests?.active ?? []).length > 0 ? (
              <div className="quest-list hero-quest-list">
                {(snapshot.quests?.active ?? []).map((quest) => (
                  <article className={`quest-card ${quest.complete ? "complete" : ""}`} key={quest.id}>
                    <header>
                      <b>{quest.title}</b>
                      <span>{quest.progressText}</span>
                    </header>
                    <QuestObjectiveMeta quest={quest} compact />
                  </article>
                ))}
              </div>
            ) : <p>Ingen aktive quests</p>}
          </section>
        )}
      </section>
    </div>
  );
}

function HeroStat({ label, value, details = [] }) {
  return (
    <div className="hero-stat" title={details.length ? details.join("\n") : undefined}>
      <span>{label}</span>
      <b>{value}</b>
      {details.length > 0 && <em>{details.slice(0, 2).join(" | ")}</em>}
    </div>
  );
}

function HeroDetailSection({ title, rows, empty }) {
  return (
    <section className="hero-quest-section">
      <h3>{title}</h3>
      {rows.length ? rows.map((row) => <p key={row}>{row}</p>) : <p>{empty}</p>}
    </section>
  );
}

function detailEntries(record = {}) {
  return Object.entries(record)
    .filter(([, value]) => Number(value) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}: ${value}`);
}

function findEquippedComparison(item, equipment) {
  if (!item || item.index === undefined) return null;
  let slotId = item.slot;
  if (slotId === "ring") {
    const ring1 = equipment.find((slot) => slot.id === "ring1")?.item;
    const ring2 = equipment.find((slot) => slot.id === "ring2")?.item;
    return ring1 || ring2 || null;
  }
  return equipment.find((slot) => slot.id === slotId)?.item ?? null;
}

function getItemDiffs(item, equipped) {
  const rows = [
    diffNumber("Skade min", item.damageMin, equipped.damageMin),
    diffNumber("Skade max", item.damageMax, equipped.damageMax),
    diffNumber("Armor", item.armor, equipped.armor),
    diffNumber("Liv", item.maxHp, equipped.maxHp),
    diffNumber("Mana", item.maxMana, equipped.maxMana),
    diffNumber("Magi", item.magic, equipped.magic),
    diffNumber("Fart", item.speed, equipped.speed, { decimals: 2 }),
    diffNumber("Range", item.range, equipped.range, { decimals: 2 }),
    diffNumber("Cooldown", item.cooldown, equipped.cooldown, { decimals: 2, lowerIsBetter: true }),
  ];
  return rows.filter(Boolean);
}

function diffNumber(label, next, current, options = {}) {
  const decimals = options.decimals ?? 0;
  const diff = Number(next || 0) - Number(current || 0);
  if (Math.abs(diff) < 0.005) return null;
  const good = options.lowerIsBetter ? diff < 0 : diff > 0;
  return {
    label,
    good,
    text: Math.abs(diff).toFixed(decimals),
  };
}

function InventoryItemDetail({ selectedItem, equipment }) {
  if (!selectedItem) return null;

  const comparisonItem = findEquippedComparison(selectedItem, equipment);
  const diffs = comparisonItem ? getItemDiffs(selectedItem, comparisonItem) : [];
  const showDurability = selectedItem.mode !== "resource" && selectedItem.mode !== "potion" && selectedItem.mode !== "readable" && selectedItem.durability !== undefined;
  const durPct = showDurability ? Math.max(0, Math.min(100, Number(selectedItem.durability ?? 100))) : null;
  const durColor = durPct === null ? null : durPct >= 75 ? "#58d96d" : durPct >= 40 ? "#ffd85d" : "#ff6b5f";

  return (
    <div className="item-detail">
      <b className={selectedItem.mode === "resource" ? "resource-rarity" : selectedItem.rarity}>{selectedItem.name}</b>
      {selectedItem.mode === "resource" && <em>Stack: {selectedItem.count ?? 1} / {selectedItem.stackMax ?? "?"}</em>}
      {selectedItem.mode === "potion" && selectedItem.count > 1 && <em>Stack: {selectedItem.count}</em>}
      {showDurability && (
        <div className="item-detail-durability">
          <span style={{ color: durColor }}>
            Durability: {Math.round(durPct)}%{durPct < 75 && durPct > 0 ? " - Stats reduceret" : ""}{durPct <= 0 ? " - Ubrugeligt" : ""}
          </span>
          <span className="item-detail-dur-bar-wrap">
            <span className="item-detail-dur-bar-fill" style={{ width: String(durPct) + "%", background: durColor }} />
          </span>
        </div>
      )}
      <span>{selectedItem.summary}</span>
      {comparisonItem && diffs.length > 0 && (
        <div className="comparison-list">
          {diffs.map((diff) => (
            <span className={diff.good ? "diff-good" : "diff-bad"} key={diff.label}>
              {diff.good ? "+" : "-"} {diff.label} {diff.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export {
  InventoryItemDetail,
  collectSaveSlots,
  createSaveSlot,
  upsertSaveSlot,
  normalizeSaveSlot,
  saveRegionCorruption,
  loadRegionMapInitialId,
  loadRegionCorruption,
  regionStatusKey,
  mapRegionColor,
  emptySnapshot,
  CITY_BUILDING_CHIPS_ALWAYS_VISIBLE,
  CITY_STORAGE_KEY,
  StartMenu,
  ResourceBar,
  CityStatsTopBar,
  CityCitizenConditions,
  MergeChoiceDialog,
  ReadableDialog,
  QuestObjectiveMeta,
  QuestOfferDialog,
  QuestDetailDialog,
  QuestOverviewDialog,
  MinimapDialog,
  RegionMapDialog,
  HeroDialog,
  ImageIcon,
  AtlasIcon,
  InventoryIcon,
  itemMatchesInventoryFilter,
  isItemRequiredByActiveQuests,
  INVENTORY_FILTERS,
  QUICKBAR_HEALTH_POTION_ICON_URL,
  QUICKBAR_MANA_POTION_ICON_URL,
  QUICKBAR_ATTACK_ICON_URL,
  QUICKBAR_CITY_ICON_URL,
  QUICKBAR_WILDERNESS_ICON_URL,
  QUICKBAR_QUEST_ICON_URL,
  ITEM_STANDARD_ICON_URL,
  ITEM_GOLD_ICON_URL,
  ITEM_MONEY_ICON_URL,
  CITY_STAT_DEFS,
  CITY_STAT_ALIASES,
  CITY_STAT_ICON_URLS,
  CITY_CITIZEN_CONDITION_DEFS
};
