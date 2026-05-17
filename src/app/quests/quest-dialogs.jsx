import React, { useEffect, useState } from "react";
import { RESOURCE_DEFS } from "../../game/config/resource-config.js";
import { MAP_REGION_SETS } from "../../game/config/map-region-config.js";
import { QUEST_ITEM_DEFS } from "../../game/config/quest-config.js";
import { QUEST_NPCS } from "../../game/config/npc-config.js";
import { deriveIconKey, iconUrlFromKey } from "../../game/item-system.js";
import { ITEM_STANDARD_ICON_URL } from "../ui/icons.jsx";
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

export function QuestObjectiveMeta({ quest, compact = false }) {
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
          <span className="quest-chip kill-count">DrÃ¦b: {killQuestCountLabel(quest)}</span>
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
          <span className="quest-chip region-chip">UdlÃ¸ser: {quest.sourceLabel ?? "Readable"}</span>
        </div>
      )}
    </div>
  );
}

export function QuestOfferDialog({ interaction, onDecline, onAcceptQuest, onTurnInQuest }) {
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

export function QuestDetailDialog({ quest, engineRef, onClose, onQuestCompleted, cityOpen }) {
  if (!quest) return null;
  const npc = QUEST_NPCS[quest.turnInNpcId ?? quest.npcId];
  const turnIn = async () => {
    const result = engineRef.current?.completeQuest?.(quest.id, quest.turnInNpcId ?? quest.npcId);
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

export function QuestOverviewDialog({ activeQuests, onClose, onToggleTracked, onOpenQuest }) {
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
  const selectedNpc = selectedQuest ? QUEST_NPCS[selectedQuest.turnInNpcId ?? selectedQuest.npcId] : null;

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
