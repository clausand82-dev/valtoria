import React, { useEffect, useRef, useState } from "react";
import { CHEAT_SETTINGS } from "../../game/config/cheat-config.js";
import { CITY_STATUS_EFFECT_ICON_URLS, cityEventEntries } from "../../game/config/city-config.js";
import {
  AtlasIcon,
  CityStatsTopBar,
  CitySideStats,
  ImageIcon,
  ITEM_MONEY_ICON_URL,
  QUICKBAR_CITY_ICON_URL,
  QUICKBAR_QUEST_ICON_URL,
  QUICKBAR_WILDERNESS_ICON_URL,
  QuestObjectiveMeta,
  ResourceBar,
} from "../index.jsx";
import { isRegionDebugShortcut } from "./region-debug-shortcut.js";

function DebugStatsList({ title, values }) {
  const entries = Object.entries(values ?? {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!entries.length) return null;
  return (
    <div className="region-debug-list">
      <b>{title}</b>
      {entries.map(([key, value]) => (
        <span key={key}><code>{key}</code><strong>{value}</strong></span>
      ))}
    </div>
  );
}

function compactReasons(reasons, max = 3) {
  const entries = (reasons ?? []).filter(Boolean);
  if (!entries.length) return "n/a";
  const visible = entries.slice(0, max).join(", ");
  return entries.length > max ? `${visible}, ...` : visible;
}

function summaryPercent(summary, key) {
  const entry = summary?.activitySplit?.[key];
  if (!entry) return "0%";
  return `${entry.percent ?? 0}%`;
}

function downloadJsonFile(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function RegionDebugPanel({ engineRef, liveStats, onClose, onRefresh, stats }) {
  const ms = (value) => Number.isFinite(Number(value)) ? `${value} ms` : "n/a";
  const saveTime = liveStats?.save?.savedAt
    ? new Date(liveStats.save.savedAt).toLocaleTimeString()
    : "n/a";
  const recording = liveStats?.performanceRecording ?? {};
  const historySummary = liveStats?.performanceHistory?.last60s ?? null;
  const recordingSummary = recording.summary ?? null;
  const startRecording = (seconds) => {
    engineRef.current?.startPerformanceRecording?.(seconds);
  };
  const stopRecording = () => {
    engineRef.current?.stopPerformanceRecording?.();
  };
  const clearRecording = () => {
    engineRef.current?.clearPerformanceRecording?.();
  };
  const exportRecording = () => {
    const payload = engineRef.current?.exportPerformanceRecording?.();
    if (!payload) return;
    const profile = payload.summary?.profileId ?? payload.metadata?.profileAtStart ?? "unknown";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJsonFile(`valtoria-performance-${profile}-${stamp}.json`, payload);
  };
  const totals = [
    ["Objekter", stats?.objects?.total ?? 0],
    ["Monsters", stats?.monsters?.total ?? 0],
    ["Foliage", stats?.foliage?.total ?? 0],
    ["Decals", stats?.decals?.total ?? 0],
    ["Tiles", stats?.tiles?.total ?? "-"],
  ];
  const liveTotals = [
    ["FPS", `${liveStats?.averageFps ?? 0} / ${liveStats?.targetFps ?? "-"}`],
    ["Update FPS", liveStats?.updateFps ?? 0],
    ["Render FPS", liveStats?.renderFps ?? 0],
    ["RAF/s", liveStats?.rafCallbacksPerSecond ?? 0],
    ["Skipped renders", liveStats?.skippedRenderFrames ?? 0],
    ["Dirty", liveStats?.renderDirty ? "ja" : "nej"],
    ["Visual active", liveStats?.visualActivity ? "ja" : "nej"],
    ["Activity level", liveStats?.visualActivityLevel ?? "idle"],
    ["Activity reasons", compactReasons(liveStats?.visualActivityReasons)],
    ["Debug reasons", compactReasons(liveStats?.visualDebugReasons)],
    ["Ambient FPS", liveStats?.ambientRenderFps ?? 0],
    ["Dirty reasons", compactReasons(liveStats?.lastRenderDirtyReasons)],
    ["Canvas MP", liveStats?.canvasMegapixels ?? 0],
    ["Frame", ms(liveStats?.frameMs)],
    ["Render", ms(liveStats?.render?.totalMs)],
    ["Tiles", ms(liveStats?.render?.tilesMs)],
    ["Drawables", `${liveStats?.counts?.drawables ?? 0} (${ms(liveStats?.render?.objectsMs)})`],
    ["Fog", ms(liveStats?.render?.fogMs)],
    ["Particle ms", ms(liveStats?.render?.particlesMs)],
    ["Minimap", ms(liveStats?.render?.minimapMs)],
    ["Minimap cache", `${liveStats?.render?.minimapCacheHit ? "hit" : "rebuild"}${liveStats?.render?.minimapRebuildReason ? ` (${liveStats.render.minimapRebuildReason})` : ""}`],
    ["Minimap clear/blit/fog", `${ms(liveStats?.render?.minimapClearMs)} / ${ms(liveStats?.render?.minimapBlitStaticMs)} / ${ms(liveStats?.render?.minimapFogOverlayMs)}`],
    ["Minimap markers/draw", `${ms(liveStats?.render?.minimapDynamicMarkersMs)} / ${ms(liveStats?.render?.minimapTotalDrawMs)}`],
    ["Monster motion", `${liveStats?.counts?.visibleCombatMovingMonsters ?? 0} combat / ${liveStats?.counts?.visiblePassiveMovingMonsters ?? 0} passive`],
    ["Objects", liveStats?.counts?.objects ?? 0],
    ["Monsters", liveStats?.counts?.monsters ?? 0],
    ["Effects", liveStats?.counts?.particles ?? 0],
    ["Terrain cache", liveStats?.counts?.cachedTerrainLayers ?? 0],
    ["Terrain cleared", liveStats?.counts?.terrainLayersCleared ?? 0],
    ["Save", `${liveStats?.save?.status ?? "n/a"} ${liveStats?.save?.sizeKb ?? "n/a"} KB ${saveTime}`],
    ["Particles", `${liveStats?.particles?.active ?? 0} / ${liveStats?.particles?.max ?? 0}`],
    ["Emitters", liveStats?.particles?.emitters ?? 0],
    ["Legacy particles", liveStats?.particles?.legacy ?? 0],
    ["Projectiles", liveStats?.runtime?.projectiles ?? 0],
    ["Hazards", liveStats?.runtime?.groundHazards ?? 0],
    ["Loot", liveStats?.runtime?.loots ?? 0],
    ["Critters", liveStats?.runtime?.critters ?? 0],
  ];
  return (
    <section className="region-debug-panel" aria-label="Region debug manifest">
      <header>
        <div>
          <b>Region manifest</b>
          <span>{stats?.region?.label ?? stats?.region?.id ?? "Ingen aktiv region"}</span>
        </div>
        <div>
          <button type="button" onClick={onRefresh}>Refresh</button>
          <button type="button" onClick={onClose}>Luk</button>
        </div>
      </header>
      <div className="region-debug-totals">
        {totals.map(([label, value]) => <span key={label}>{label} <b>{value}</b></span>)}
      </div>
      <div className="region-debug-totals region-debug-live">
        {liveTotals.map(([label, value]) => <span key={label}>{label} <b>{value}</b></span>)}
      </div>
      <div className="region-debug-recorder">
        <div className="region-debug-recorder-head">
          <b>Performance recorder</b>
          <span>
            Rolling 60s: update <b>{historySummary?.avgUpdateFps ?? 0}</b> / render <b>{historySummary?.avgRenderFps ?? 0}</b>
            {" "}max render <b>{ms(historySummary?.maxRenderTotalMs)}</b>
          </span>
        </div>
        <div className="region-debug-recorder-grid">
          <span>Recording <b>{recording.recording ? "yes" : "no"}</b></span>
          <span>Remaining <b>{recording.remainingSeconds ?? 0}s</b></span>
          <span>Samples <b>{recording.samplesCollected ?? 0}</b></span>
          <span>Last profile <b>{recordingSummary?.profileId ?? historySummary?.profileId ?? "n/a"}</b></span>
          <span>Idle <b>{summaryPercent(historySummary, "idle")}</b></span>
          <span>Ambient <b>{summaryPercent(historySummary, "ambient")}</b></span>
          <span>Active <b>{summaryPercent(historySummary, "active")}</b></span>
          <span>History samples <b>{liveStats?.performanceHistory?.samples ?? 0}</b></span>
        </div>
        <div className="region-debug-recorder-actions">
          <button type="button" onClick={() => startRecording(30)}>Record 30s</button>
          <button type="button" onClick={() => startRecording(60)}>Record 60s</button>
          <button type="button" onClick={() => startRecording(120)}>Record 120s</button>
          <button type="button" onClick={stopRecording} disabled={!recording.recording}>Stop</button>
          <button type="button" onClick={clearRecording}>Clear</button>
          <button type="button" onClick={exportRecording} disabled={!recording.samplesCollected}>Export JSON</button>
        </div>
        {recordingSummary?.sampleCount > 0 && (
          <div className="region-debug-summary">
            <span>Summary <b>{recordingSummary.profileId}</b>, {recordingSummary.durationSeconds}s, samples {recordingSummary.sampleCount}</span>
            <span>FPS update/render <b>{recordingSummary.avgUpdateFps}</b> / <b>{recordingSummary.avgRenderFps}</b>, min/max render <b>{recordingSummary.minRenderFps}</b> / <b>{recordingSummary.maxRenderFps}</b></span>
            <span>Render FPS avg/median <b>{recordingSummary.avgRenderFps}</b> / <b>{recordingSummary.medianRenderFps}</b>, minimap ms median/p90/max <b>{recordingSummary.medianMinimapMs}</b> / <b>{recordingSummary.p90MinimapMs}</b> / <b>{recordingSummary.maxMinimapMs}</b></span>
            <span>Split idle/ambient/active <b>{summaryPercent(recordingSummary, "idle")}</b> / <b>{summaryPercent(recordingSummary, "ambient")}</b> / <b>{summaryPercent(recordingSummary, "active")}</b></span>
            <span>Activity <b>{compactReasons(recordingSummary.topActivityReasons?.map((entry) => `${entry.reason}:${entry.count}`))}</b></span>
            <span>Debug <b>{compactReasons(recordingSummary.topVisualDebugReasons?.map((entry) => `${entry.reason}:${entry.count}`))}</b></span>
            <span>Dirty <b>{compactReasons(recordingSummary.topDirtyReasons?.map((entry) => `${entry.reason}:${entry.count}`))}</b></span>
            <span>Worst <b>{recordingSummary.worstSample?.renderTotalMs ?? "n/a"} ms</b> {compactReasons(recordingSummary.worstSample?.activityReasons)}</span>
          </div>
        )}
      </div>
      <div className="region-debug-columns">
        <DebugStatsList title="objects.byQuestTargetKey" values={stats?.objects?.byQuestTargetKey} />
        <DebugStatsList title="objects.byCompletedQuestTargetKey" values={stats?.objects?.byCompletedQuestTargetKey} />
        <DebugStatsList title="objects.byObjectDefId" values={stats?.objects?.byObjectDefId} />
        <DebugStatsList title="objects.byActionId" values={stats?.objects?.byActionId} />
        <DebugStatsList title="foliage.byQuestTargetKey" values={stats?.foliage?.byQuestTargetKey} />
        <DebugStatsList title="foliage.byCompletedQuestTargetKey" values={stats?.foliage?.byCompletedQuestTargetKey} />
        <DebugStatsList title="foliage.byActionId" values={stats?.foliage?.byActionId} />
        <DebugStatsList title="monsters.byType" values={stats?.monsters?.byType} />
        <DebugStatsList title="particles.byType (live)" values={liveStats?.particles?.byType} />
        <DebugStatsList title="emitters.byType (live)" values={liveStats?.particles?.emittersByType} />
        <DebugStatsList title="legacyParticles.byType (live)" values={liveStats?.particles?.legacyByType} />
      </div>
    </section>
  );
}

function CooldownClock({ progress }) {
  const pct = Math.max(0, Math.min(1, Number(progress) || 0));
  if (pct <= 0) return null;
  return <span className="quickslot-cooldown" style={{ "--cooldown-pct": pct }} aria-hidden="true" />;
}

function QuickSlot({ slotId, slot, quickActions, cityOpen, engineRef, openPicker, onOpenPicker, onClosePicker }) {
  const hoverTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const options = slot.kind === "potion" ? (quickActions.potions ?? []) : (quickActions.spells ?? []);
  const selected = options.find((entry) => String(entry.id) === String(slot.id)) ?? options[0] ?? null;
  const isPotion = slot.kind === "potion";
  const isChanneledSpell = !isPotion && Boolean(selected?.channeled);
  const isOpen = openPicker === slotId;
  const count = isPotion ? Math.max(0, Math.floor(Number(selected?.count) || 0)) : 0;
  const spellCooldown = !isPotion && selected?.cooldown
    ? Math.max(0, Number(quickActions.spellCooldown) || 0) / Math.max(0.1, Number(selected.cooldown) || 1)
    : 0;
  const potionCooldown = isPotion
    ? Math.max(0, Number(quickActions.potionCooldown) || 0) / Math.max(0.1, Number(quickActions.potionCooldownMax) || 0.5)
    : 0;
  const disabled = cityOpen || !selected || (isPotion ? count <= 0 : false);
  const title = selected
    ? `${selected.name ?? selected.title}${isPotion ? ` (${count})` : selected.manaCost ? ` (${selected.manaCost} mana)` : ""}`
    : "Empty slot";
  const hoverMs = Math.max(0, Number(quickActions.pickerHoverMs) || 3000);
  const closeMs = Math.max(0, Number(quickActions.pickerCloseMs) || 1800);

  useEffect(() => () => {
    window.clearTimeout(hoverTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
  }, []);

  const clearTimers = () => {
    window.clearTimeout(hoverTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
  };
  const scheduleOpen = () => {
    clearTimers();
    hoverTimerRef.current = window.setTimeout(() => onOpenPicker(slotId), hoverMs);
  };
  const scheduleClose = () => {
    window.clearTimeout(hoverTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => onClosePicker(slotId), closeMs);
  };
  const stopQuickbarEvent = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const renderIcon = (entry) => (
    entry?.iconUrl
      ? <ImageIcon src={entry.iconUrl} />
      : <AtlasIcon frameName={entry?.frameName ?? "orb"} />
  );

  return (
    <span
      className={`quickslot-wrap ${isOpen ? "open" : ""}`}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={`quickslot ${isPotion ? "potion-slot" : "spell-slot"} ${(isPotion ? potionCooldown : spellCooldown) > 0 ? "cooling" : ""}`}
        title={cityOpen ? "Ikke tilgaengelig i byen" : title}
        disabled={disabled}
        onPointerDown={(event) => {
          if (!isChanneledSpell) return;
          stopQuickbarEvent(event);
          engineRef.current?.activateQuickSlot?.(slotId);
        }}
        onPointerUp={(event) => {
          if (!isChanneledSpell) return;
          stopQuickbarEvent(event);
          engineRef.current?.stopHeldSpell?.(slot.id);
        }}
        onPointerCancel={(event) => {
          if (!isChanneledSpell) return;
          stopQuickbarEvent(event);
          engineRef.current?.stopHeldSpell?.(slot.id);
        }}
        onPointerLeave={(event) => {
          if (!isChanneledSpell) return;
          stopQuickbarEvent(event);
          engineRef.current?.stopHeldSpell?.(slot.id);
        }}
        onClick={(event) => {
          stopQuickbarEvent(event);
          if (isChanneledSpell) return;
          engineRef.current?.activateQuickSlot?.(slotId);
        }}
      >
        {renderIcon(selected)}
        <span className="hotkey-badge">{slotId}</span>
        {isPotion && <b>{count}</b>}
        <CooldownClock progress={isPotion ? potionCooldown : spellCooldown} />
      </button>
      {isOpen && options.length > 0 && (
        <div className="quickslot-picker" role="menu" aria-label={`Choose slot ${slotId}`} onPointerDown={(event) => event.stopPropagation()}>
          {options.map((option) => (
            <button
              type="button"
              className={String(option.id) === String(slot.id) ? "active" : ""}
              key={option.id}
              title={option.name ?? option.title}
              onClick={(event) => {
                stopQuickbarEvent(event);
                engineRef.current?.setQuickSlot?.(slotId, option.id);
                onClosePicker(slotId);
              }}
            >
              {renderIcon(option)}
              {isPotion && <b>{Math.max(0, Math.floor(Number(option.count) || 0))}</b>}
              <span className="quickslot-picker-label">{option.name ?? option.title}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function HeroModifierList({ events = {}, statusEffects = [] }) {
  const activeOrderRef = useRef(new Map());
  const nextOrderRef = useRef(0);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const eventEntries = cityEventEntries(events)
    .map((event) => ({
      ...event,
      effectText: cityEventModifierText(event.modifiers),
      kind: event.positive ? "positive" : "negative",
      iconText: heroModifierIconText(event.id),
      iconUrl: event.iconUrl,
    }))
    .filter((event) => event.effectText);
  const statusEntries = (statusEffects ?? []).map((effect, index) => ({
    id: `status-${effect.id ?? effect.label}-${index}`,
    label: effect.label,
    effectText: effect.effect,
    metaText: Number(effect.remainingSeconds) > 0 ? `${Math.ceil(Number(effect.remainingSeconds))}s` : "",
    solution: effect.solution,
    kind: effect.type === "buff" ? "positive" : "negative",
    detail: effect.detail ?? "",
    color: effect.color,
    iconText: heroStatusIconText(effect.type),
    iconUrl: effect.sourceId ? CITY_STATUS_EFFECT_ICON_URLS[effect.sourceId] ?? null : null,
  }));
  const entries = [...eventEntries, ...statusEntries];
  const activeIds = new Set(entries.map((entry) => entry.id));
  for (const key of activeOrderRef.current.keys()) {
    if (!activeIds.has(key)) activeOrderRef.current.delete(key);
  }
  for (const entry of entries) {
    if (!activeOrderRef.current.has(entry.id)) {
      activeOrderRef.current.set(entry.id, nextOrderRef.current);
      nextOrderRef.current += 1;
    }
  }
  entries.sort((a, b) => (
    (activeOrderRef.current.get(a.id) ?? 0) - (activeOrderRef.current.get(b.id) ?? 0)
  ));
  if (!entries.length) return null;
  const showTooltip = (event, element) => {
    const rect = element.getBoundingClientRect();
    const width = 250;
    const estimatedHeight = 150;
    const margin = 8;
    const left = Math.max(margin, Math.min(window.innerWidth - width - margin, rect.left));
    const below = rect.bottom + 7;
    const top = below + estimatedHeight <= window.innerHeight - margin
      ? below
      : Math.max(margin, rect.top - estimatedHeight - 7);
    setHoveredTooltip({ event, style: { left: `${left}px`, top: `${top}px`, width: `${width}px` } });
  };
  const hideTooltip = () => setHoveredTooltip(null);
  return (
    <>
      <div className="hero-modifier-list" aria-label="Active hero and loot modifiers">
        {entries.map((event) => (
          <div
            className={`hero-modifier ${event.kind}`}
            key={event.id}
            onBlur={hideTooltip}
            onFocus={(focusEvent) => showTooltip(event, focusEvent.currentTarget)}
            onMouseEnter={(mouseEvent) => showTooltip(event, mouseEvent.currentTarget)}
            onMouseLeave={hideTooltip}
            style={event.color ? { "--hero-modifier-color": event.color } : undefined}
            tabIndex={0}
          >
            <i aria-hidden="true">
              {event.iconUrl ? <img src={event.iconUrl} alt="" draggable="false" onError={(error) => { error.currentTarget.hidden = true; }} /> : null}
              <em>{event.iconText}</em>
            </i>
            {event.metaText ? <span>{event.metaText}</span> : null}
          </div>
        ))}
      </div>
      {hoveredTooltip && (
        <div className="hero-modifier-tooltip" role="tooltip" style={hoveredTooltip.style}>
          <b>{hoveredTooltip.event.label}</b>
          {hoveredTooltip.event.effectText ? <section><strong>Effect</strong><p>{hoveredTooltip.event.effectText}</p></section> : null}
          {hoveredTooltip.event.detail ? <section><strong>Info</strong><p>{hoveredTooltip.event.detail}</p></section> : null}
          {hoveredTooltip.event.solution ? <section><strong>Solution</strong><p>{hoveredTooltip.event.solution}</p></section> : null}
        </div>
      )}
    </>
  );
}

function heroModifierTitle(event) {
  return [
    event.label,
    event.effectText ? `Effect: ${event.effectText}` : "",
    event.detail ? `Info: ${event.detail}` : "",
    event.solution ? `Solution: ${event.solution}` : "",
  ].filter(Boolean).join("\n");
}

function heroModifierIconText(eventId) {
  const icons = {
    famine: "FO",
    water_shortage: "WA",
    disease_outbreak: "HP",
    uprising_poorness: "GD",
    fire: "FI",
    lawlessness: "MB",
    supply_crisis: "RP",
    trade_collapse: "TR",
    faith_crisis: "PT",
    prosperity: "RW",
  };
  return icons[eventId] ?? "EV";
}

function heroStatusIconText(type) {
  if (type === "buff") return "BF";
  if (type === "debuff") return "DB";
  return "FX";
}

function cityEventModifierText(modifiers = {}) {
  const parts = [];
  const pct = (value) => `${Math.round((Number(value) || 1) * 100)}%`;
  if (modifiers.heroMaxHpMultiplier !== undefined) parts.push(`Max HP ${pct(modifiers.heroMaxHpMultiplier)}`);
  if (modifiers.goldDropMultiplier !== undefined) parts.push(`Gold drops ${pct(modifiers.goldDropMultiplier)}`);
  if (modifiers.potionDropMultiplier !== undefined) parts.push(`Potion drops ${pct(modifiers.potionDropMultiplier)}`);
  if (modifiers.healthPotionHealMultiplier !== undefined) parts.push(`Health potions ${pct(modifiers.healthPotionHealMultiplier)}`);
  if (modifiers.cityMobSpawnChanceMultiplier !== undefined) parts.push(`City mob spawn ${pct(modifiers.cityMobSpawnChanceMultiplier)}`);
  if (modifiers.repairCostMultiplier !== undefined) parts.push(`Repair cost ${pct(modifiers.repairCostMultiplier)}`);
  if (modifiers.craftingCostMultiplier !== undefined) parts.push(`Crafting cost ${pct(modifiers.craftingCostMultiplier)}`);
  if (modifiers.merchantBuyPriceMultiplier !== undefined) parts.push(`Buy prices ${pct(modifiers.merchantBuyPriceMultiplier)}`);
  if (modifiers.merchantSellPriceMultiplier !== undefined) parts.push(`Sell prices ${pct(modifiers.merchantSellPriceMultiplier)}`);
  if (modifiers.merchantStockMultiplier !== undefined) parts.push(`Merchant stock ${pct(modifiers.merchantStockMultiplier)}`);
  if (modifiers.questGoldRewardMultiplier !== undefined) parts.push(`Quest gold ${pct(modifiers.questGoldRewardMultiplier)}`);
  if (modifiers.cityDurabilityDegradeChanceMultiplier !== undefined) parts.push(`City decay chance ${pct(modifiers.cityDurabilityDegradeChanceMultiplier)}`);
  if (modifiers.cityDurabilityDamageMultiplier !== undefined) parts.push(`City damage ${pct(modifiers.cityDurabilityDamageMultiplier)}`);
  const resourceMultipliers = Object.entries(modifiers.resourceDropMultiplierById ?? {});
  if (resourceMultipliers.length) {
    const values = [...new Set(resourceMultipliers.map(([, value]) => pct(value)))];
    parts.push(`Food resources ${values.join("/")}`);
  }
  return parts.join(" | ");
}

export function GameHud({
  cityHudStats,
  cityOpen,
  cityThreatLevel,
  derivedCityStats,
  engineRef,
  hoverMonster,
  hpPct,
  manaPct,
  minimapRef,
  minimapDynamicRef,
  monsterHpPct,
  openWorldMapFromCity,
  player,
  popularityPct,
  popularityValue,
  setConfirmMapAbandonOpen,
  setCitySettingsOpen,
  setHoveredCityStatId,
  setSelectedCityStatId,
  setCityStorageOpen,
  setHeroOpen,
  setInventoryOpen,
  setMapOpen,
  setQuestOverviewOpen,
  onOpenToastLog,
  setViewedQuest,
  snapshot,
  toastLogUnreadCount,
  trackedQuests,
  xpPct,
}) {
  const [openPicker, setOpenPicker] = useState(null);
  const [regionDebugOpen, setRegionDebugOpen] = useState(false);
  const [regionDebugStats, setRegionDebugStats] = useState(null);
  const [regionDebugLiveStats, setRegionDebugLiveStats] = useState(null);
  const questBadgeCount = Math.max(0, (snapshot.quests?.active ?? []).filter((quest) => quest.complete).length);
  const toastLogCount = Math.max(0, Number(toastLogUnreadCount) || 0);
  const handleOpenPicker = (slotId) => setOpenPicker(slotId);
  const handleClosePicker = (slotId) => setOpenPicker((current) => (current === slotId ? null : current));
  const refreshRegionDebug = () => {
    setRegionDebugStats(engineRef.current?.rebuildRegionStats?.({ includeTiles: true }) ?? null);
  };

  useEffect(() => {
    if (!CHEAT_SETTINGS.enabled) return undefined;
    const handleRegionDebugShortcut = (event) => {
      if (!isRegionDebugShortcut(event, CHEAT_SETTINGS.enabled)) return;
      event.preventDefault();
      setRegionDebugOpen((current) => !current);
    };
    window.addEventListener("keydown", handleRegionDebugShortcut);
    return () => window.removeEventListener("keydown", handleRegionDebugShortcut);
  }, [engineRef]);

  useEffect(() => {
    if (CHEAT_SETTINGS.enabled && regionDebugOpen) refreshRegionDebug();
  }, [engineRef, regionDebugOpen, snapshot.regionStats]);

  useEffect(() => {
    if (!CHEAT_SETTINGS.enabled || !regionDebugOpen) return undefined;
    const refreshLiveStats = () => {
      setRegionDebugLiveStats(engineRef.current?.runtimeDebugStats?.() ?? null);
    };
    refreshLiveStats();
    const intervalId = window.setInterval(refreshLiveStats, 1000);
    return () => window.clearInterval(intervalId);
  }, [engineRef, regionDebugOpen]);

  return (
    <>
      <section className="hud hud-left" aria-live="polite">
        {cityOpen ? (
          <>
            <div className="city-left-stack">
              <CitySideStats
                gold={player.gold}
                threatLevel={cityThreatLevel}
                popularity={popularityValue}
                events={derivedCityStats.events}
              />
            </div>
            <CityStatsTopBar stats={cityHudStats} onHoverStat={setHoveredCityStatId} onSelectStat={setSelectedCityStatId} />
          </>
        ) : (
          <>
            <div className="hero-hud-column">
              <div className="portrait">
                <b>{player.level}</b>
              </div>
              <HeroModifierList events={derivedCityStats?.events} statusEffects={player.statusEffects} />
            </div>
            <div className="resource-stack">
              <ResourceBar type="health" value={hpPct} label={`HP ${player.hp} / ${player.maxHp}`} />
              <ResourceBar type="mana" value={manaPct} label={`MANA ${player.mana} / ${player.maxMana}`} />
              <ResourceBar type="xp" value={xpPct} label={`XP ${player.xp} / ${player.nextXp}`} />
              <ResourceBar type="popularity" value={popularityPct} label={`POPULARITY ${Math.round(Number(popularityValue) || 0)}%`} />
            </div>
          </>
        )}
        {!cityOpen && (
          <div className="stat-chip">
            <span>Guld</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ImageIcon src={ITEM_MONEY_ICON_URL} />
              <b>{player.gold}</b>
            </div>
          </div>
        )}
      </section>

      <section className="hud hud-right">
        <div className="zone-panel">
          <div className="zone-header">
            <b>{cityOpen ? "City" : snapshot.zone.name}</b>
          </div>
          {!cityOpen && (
            <span>
              Weather: {snapshot.zone.weather?.label ?? "No weather"}
            </span>
          )}
        </div>
        {!cityOpen && (
          <div className="minimap" role="img" aria-label="Minimap">
            <canvas ref={minimapRef} className="minimap-layer minimap-static" width="154" height="154" aria-hidden="true" />
            <canvas ref={minimapDynamicRef} className="minimap-layer minimap-dynamic" width="154" height="154" aria-hidden="true" />
          </div>
        )}
      </section>

      {hoverMonster && (
        <section className="monster-hover-card" aria-live="polite">
          <div className="monster-hover-title">
            <span>L{hoverMonster.level}</span>
            <b>{hoverMonster.name}</b>
          </div>
          <ResourceBar type="monster-health" value={monsterHpPct} label={`${hoverMonster.hp} / ${hoverMonster.maxHp}`} />
        </section>
      )}

      {CHEAT_SETTINGS.enabled && regionDebugOpen && !cityOpen && (
        <RegionDebugPanel
          engineRef={engineRef}
          liveStats={regionDebugLiveStats}
          onClose={() => setRegionDebugOpen(false)}
          onRefresh={refreshRegionDebug}
          stats={regionDebugStats ?? snapshot.regionStats}
        />
      )}

      {!cityOpen && (
        <section className="combat-card">
          <span>Skade {player.damage}</span>
          <span>Armor {player.armor}</span>
          <span>{player.mode}</span>
          {snapshot.regionRun && snapshot.mobs?.total > 0 && (
            <span>Mobs {snapshot.mobs.killed} / {snapshot.mobs.total}</span>
          )}
        </section>
      )}

      {!cityOpen && trackedQuests.length > 0 && (
        <section className="quest-tracker" aria-label="Aktive quests">
          {trackedQuests.slice(0, 8).map((quest) => (
            <div
              className={`quest-track-row ${quest.complete ? "complete" : ""}`}
              key={quest.id}
              role="button"
              tabIndex={0}
              onClick={() => setViewedQuest(quest)}
              onKeyDown={(e) => { if (e.key === "Enter") setViewedQuest(quest); }}
            >
              <b>{quest.title}</b>
              <span>{quest.progressText}</span>
              <QuestObjectiveMeta quest={quest} compact />
            </div>
          ))}
        </section>
      )}

      {cityOpen ? (
        <section className="city-menu-bar" aria-label="City menu">
          <button type="button" className="city-menu-button" onClick={() => setInventoryOpen((value) => !value)}>
            <ImageIcon src="/assets/generated/icon_backpack.png" />
            <span>Back Pack</span>
          </button>
          <button type="button" className="city-menu-button" onClick={() => setCityStorageOpen(true)}>
            <ImageIcon src="/assets/generated/item/item_chest.png" />
            
            <span>Storage</span>
          </button>
          <button type="button" className="city-menu-button" onClick={() => setHeroOpen(true)}>
            <ImageIcon src="/assets/generated/ui_hero.png" />
            <span>Hero</span>
          </button>
          <button type="button" className="city-menu-button" onClick={() => setQuestOverviewOpen(true)}>
            <ImageIcon src={QUICKBAR_QUEST_ICON_URL} />
            <span>Questlog</span>
            {questBadgeCount > 0 && <b className="city-menu-badge">{questBadgeCount}</b>}
          </button>
          <button type="button" className="city-menu-button" onClick={onOpenToastLog}>
            <ImageIcon src="/assets/generated/item/item_book_lore.png" />
            <span>Beskeder</span>
            {toastLogCount > 0 && <b className="city-menu-badge">{Math.min(99, toastLogCount)}</b>}
          </button>
          <button type="button" className="city-menu-button" onClick={() => setCitySettingsOpen(true)}>
            <ImageIcon src="/assets/generated/item/item_book_lore.png" />
            <span>Setting</span>
          </button>
          <button type="button" className="city-menu-button" onClick={openWorldMapFromCity}>
            <ImageIcon src="/assets/generated/icon_map.png" />
            <span>World map</span>
          </button>

        </section>
      ) : (
      <section className="skillbar" aria-label="Battle quickbar">
        {["1", "2", "3", "4"].map((slotId) => (
          <QuickSlot
            cityOpen={cityOpen}
            engineRef={engineRef}
            key={slotId}
            onClosePicker={handleClosePicker}
            onOpenPicker={handleOpenPicker}
            openPicker={openPicker}
            quickActions={snapshot.quickActions}
            slot={snapshot.quickActions.slots?.[slotId] ?? { kind: Number(slotId) <= 2 ? "potion" : "spell", id: "" }}
            slotId={slotId}
          />
        ))}
        <button type="button" className="skill" title="Rygsaek" onClick={() => setInventoryOpen((value) => !value)}>
          <ImageIcon src="/assets/generated/icon_backpack.png" />
          <span className="hotkey-badge">I</span>
        </button>
        <button type="button" className="skill" title={cityOpen ? "Minimap er deaktiveret i byen" : "Map"} disabled={cityOpen} onClick={() => setMapOpen(true)}>
          <ImageIcon src="/assets/generated/icon_map.png" />
          <span className="hotkey-badge">M</span>
        </button>
        <button type="button" className="skill" title="Hero" onClick={() => setHeroOpen(true)}>
          <ImageIcon src="/assets/generated/ui_hero.png" />
          <span className="hotkey-badge">C</span>
        </button>
        <button type="button" className="skill" title="Questoversigt" onClick={() => setQuestOverviewOpen(true)}>
          <ImageIcon src={QUICKBAR_QUEST_ICON_URL} />
        </button>
        <button type="button" className="skill" title="Beskedlog" onClick={onOpenToastLog}>
          <ImageIcon src="/assets/generated/item/item_book_lore.png" />
          {toastLogCount > 0 && <b className="skill-badge">{Math.min(99, toastLogCount)}</b>}
        </button>
        <button
          type="button"
          className="skill"
          title={snapshot.regionRun ? "Forlad map til byen" : "Aaben world map"}
          onClick={() => {
            if (snapshot.regionRun) {
              setConfirmMapAbandonOpen(true);
              return;
            }
            openWorldMapFromCity();
          }}
        >
          <ImageIcon src={snapshot.regionRun ? QUICKBAR_WILDERNESS_ICON_URL : QUICKBAR_CITY_ICON_URL} />
        </button>
      </section>
      )}
    </>
  );
}
