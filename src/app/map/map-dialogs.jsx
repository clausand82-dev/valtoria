import React, { useEffect, useMemo, useRef, useState } from "react";
import { CITY_BUILDINGS } from "../../game/config/city-buildings-config.js";
import { AREA_MAPS, MAP_REGION_SETS, WORLD_MAP } from "../../game/config/map-region-config.js";
import { QUEST_DEFS, QUEST_ITEM_DEFS } from "../../game/config/quest-config.js";
import { useLocalization } from "../../i18n/index.js";
import { localizeQuestField } from "../../i18n/quest-localization.js";
import { QUEST_NPCS } from "../../game/config/npc-config.js";
import { RESOURCE_DEFS } from "../../game/config/resource-config.js";
import { deriveIconKey, iconUrlFromKey } from "../../game/item-system.js";
import { ITEM_STANDARD_ICON_URL } from "../ui/icons.jsx";
import { getQuestStartNpcIds } from "../../game/GameEngine/helpers.js";
import { resolveMapRegionConfig, worldConditionMet, worldEntryAllowed } from "../../game/world-state.js";
import { getWorldEnergyState } from "../../game/world-energy.js";
import { regionStatusKey } from "../save/save-keys.js";
const cityPrebuildCache = { layout: null };

function getCityLayout() {
  if (!cityPrebuildCache.layout) cityPrebuildCache.layout = buildCityLayout();
  return cityPrebuildCache.layout;
}

function buildCityLayout() {
  const mapWidth = 17;
  const mapHeight = 17;
  const rows = Array.from({ length: mapHeight }, () => Array.from({ length: mapWidth }, () => "g"));
  const roadRows = [3, 8, 13];
  const roadCols = [3, 8, 13];
  for (const y of roadRows) {
    for (let x = 1; x < mapWidth - 1; x += 1) rows[y][x] = "r";
  }
  for (const x of roadCols) {
    for (let y = 1; y < mapHeight - 1; y += 1) rows[y][x] = "r";
  }
  const housePositions = [
    { gx: 2.35, gy: 2.35 },
    { gx: 7.1, gy: 2.35 },
    { gx: 11.85, gy: 2.35 },
    { gx: 2.35, gy: 6.75 },
    { gx: 11.85, gy: 6.75 },
    { gx: 2.35, gy: 11.15 },
    { gx: 7.1, gy: 11.15 },
    { gx: 11.85, gy: 11.15 },
    { gx: 14.65, gy: 8.15 },
    { gx: 14.65, gy: 12.75 },
  ];
  const houses = housePositions.map((position, index) => ({ ...position, spriteIndex: index, buildingId: CITY_BUILDINGS[index]?.id ?? null }));
  return {
    mapWidth,
    mapHeight,
    rows,
    houses,
    spawn: { gx: 8.5, gy: 8.5 },
  };
}
export function mapRegionColor(mapId, region, regionCorruption) {
  if (mapId === WORLD_MAP.id) return region.color;
  const corruptionLevel = regionCorruptionLevel(regionCorruption, mapId, region);
  if (corruptionLevel <= 0) return "#58d96d";
  if (corruptionLevel >= 10) return "#d94343";
  return "#d99a43";
}

function clampCorruptionLevel(value) {
  return Math.max(0, Math.min(10, Math.floor(Number(value) || 0)));
}

function regionCorruptionLevel(regionCorruption, mapId, region) {
  const entry = regionCorruption?.[regionStatusKey(mapId, region.id)];
  if (typeof entry === "boolean") return entry ? 10 : 0;
  if (typeof entry === "number") return clampCorruptionLevel(entry);
  if (entry?.corruptionLevel !== undefined) return clampCorruptionLevel(entry.corruptionLevel);
  if (region.corruptionLevel !== undefined) return clampCorruptionLevel(region.corruptionLevel);
  return region.corrupted === false ? 0 : 10;
}

function areaAverageCorruptionLevel(regionCorruption, areaMapId) {
  const regions = MAP_REGION_SETS[areaMapId] ?? [];
  if (!regions.length) return null;
  const total = regions.reduce((sum, region) => sum + regionCorruptionLevel(regionCorruption, areaMapId, region), 0);
  return total / regions.length;
}

function regionHoverCorruptionText(mapId, region, regionCorruption) {
  if (mapId === WORLD_MAP.id) {
    const areaMapId = region.targetMapId ?? region.id;
    const average = AREA_MAPS[areaMapId] ? areaAverageCorruptionLevel(regionCorruption, areaMapId) : null;
    if (average === null) return "No region corruption data";
    return `Average corruption: ${average.toFixed(1)}/10`;
  }
  const level = regionCorruptionLevel(regionCorruption, mapId, region);
  return `Corruption: ${level}/10`;
}

function regionMapSizeLabel(mapSize) {
  const key = String(mapSize ?? "medium").trim().toLowerCase();
  return ({ small: "Small", medium: "Medium", large: "Large", giga: "Giga" })[key] ?? key;
}

function regionMobTypes(region) {
  const entries = [
    ...(Array.isArray(region?.mobs) ? region.mobs : []),
    ...(Array.isArray(region?.rareMobs) ? region.rareMobs : []),
  ];
  return [...new Set(entries
    .filter((entry) => typeof entry === "string" || Number(entry?.weight ?? 1) > 0)
    .map((entry) => String(typeof entry === "string" ? entry : entry?.displayName ?? entry?.type ?? "").trim())
    .filter(Boolean))];
}

function regionQuestTitles(activeQuests, regionId, localize, renderTemplate) {
  const targetId = String(regionId ?? "");
  if (!targetId) return [];
  return [...new Set((activeQuests ?? [])
    .filter((quest) => {
      const target = quest?.target ?? {};
      const definitionTarget = QUEST_DEFS[quest?.questId]?.target ?? {};
      const configuredRegionIds = target.regionIds ?? definitionTarget.regionIds;
      const configuredRegionId = target.regionId ?? definitionTarget.regionId;
      const regionIds = [
        ...(Array.isArray(configuredRegionIds) ? configuredRegionIds : configuredRegionIds ? [configuredRegionIds] : []),
        ...(configuredRegionId ? [configuredRegionId] : []),
      ].map(String);
      return regionIds.includes(targetId);
    })
    .map((quest) => String(localizeQuestField(quest, "title", localize, renderTemplate) || quest?.questId || "").trim())
    .filter(Boolean))];
}

export function MinimapDialog({ engineRef, snapshot, cityOpen, cityMinimapHero, onClose }) {
  const { t } = useLocalization();
  const canvasRef = useRef(null);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
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
      <section className="map-dialog" role="dialog" aria-modal="true" aria-label={t("panel.map.title")}>
        <header>
          <div>
            <h2>{t("panel.map.title")}</h2>
            <span>{cityOpen ? t("hud.city") : `${snapshot.region.name} | Seed ${snapshot.region.seed}`}</span>
          </div>
          <button type="button" className="city-popup-close" aria-label={t("ui.close")} title={t("ui.close")} onClick={onClose}>X</button>
        </header>
        <canvas ref={canvasRef} width="520" height="520" aria-label={t("map.currentMinimap")} />
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

export function RegionMapDialog({ initialMapId, regionCorruption, worldState = null, worldEnergy = null, activeQuests = [], completedQuests = [], army = 0, onPlayableRegionSelected, onCityOpen, onMapNavigation, onClose }) {
  const { localize, renderTemplate, t } = useLocalization();
  const [selectedMapId, setSelectedMapId] = useState(initialMapId ?? WORLD_MAP.id);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [lockedRegion, setLockedRegion] = useState(null);
  const isWorldMap = selectedMapId === WORLD_MAP.id;
  const activeMap = isWorldMap ? WORLD_MAP : AREA_MAPS[selectedMapId] ?? WORLD_MAP;
  const activeMapTitle = localize(activeMap, "title") || activeMap.title;
  const activeMapSubtitle = localize(activeMap, "subtitle") || activeMap.subtitle;
  const activeRegions = useMemo(() => (
    (MAP_REGION_SETS[selectedMapId] ?? []).map((rawRegion) => ({
      rawRegion,
      region: resolveMapRegionConfig(rawRegion, worldState, {
        areaMapId: selectedMapId,
        regionId: rawRegion.id,
        questState: { active: activeQuests, completed: completedQuests },
        worldEnergy,
      }),
    }))
  ), [selectedMapId, worldState, worldEnergy, activeQuests, completedQuests]);
  useEffect(() => {
    setSelectedMapId(initialMapId ?? WORLD_MAP.id);
    setHoveredRegionId(null);
    setSelectedRegion(null);
    setLockedRegion(null);
  }, [initialMapId]);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
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
  const hoveredRegionEntry = activeRegions.find((entry) => entry.region.id === hoveredRegionId) ?? null;
  const hoveredCorruptionText = hoveredRegionEntry
    ? regionHoverCorruptionText(selectedMapId, hoveredRegionEntry.region, regionCorruption)
    : "";
  const mapCorruptionText = isWorldMap
    ? `World average corruption: ${worldAverageCorruptionLevel(regionCorruption).toFixed(1)}/10`
    : `Average corruption: ${(areaAverageCorruptionLevel(regionCorruption, selectedMapId) ?? 0).toFixed(1)}/10`;
  const statusRegion = hoveredRegionEntry?.region ?? selectedRegion;
  const statusTitle = (statusRegion ? (localize(statusRegion, "label") || statusRegion.label) : "") || activeMapTitle;
  const statusCorruptionText = hoveredCorruptionText || (statusRegion ? regionHoverCorruptionText(selectedMapId, statusRegion, regionCorruption) : mapCorruptionText);
  const hoveredAreaRegion = !isWorldMap ? hoveredRegionEntry?.region ?? null : null;
  const statusMobTypes = hoveredAreaRegion ? regionMobTypes(hoveredAreaRegion) : [];
  const statusQuestTitles = hoveredAreaRegion ? regionQuestTitles(activeQuests, hoveredAreaRegion.id, localize, renderTemplate) : [];
  const activateRegion = (regionEntry) => {
    const region = regionEntry?.region ?? regionEntry;
    const rawRegion = regionEntry?.rawRegion ?? region;
    if (!regionIsUnlocked(region, completedQuestSet, currentArmy, worldState, activeQuests)) {
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
    onPlayableRegionSelected?.(selectedMapId, rawRegion);
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
  const worldEnergyState = getWorldEnergyState({ worldEnergy });

  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="map-dialog world-map-dialog" role="dialog" aria-modal="true" aria-label={t("map.worldMap")}>
        <header className={!isWorldMap ? "with-region-info" : undefined}>
          <div>
            <h2>{activeMapTitle}</h2>
            <span>{isWorldMap ? activeMapSubtitle : `${activeMapSubtitle} | vaelg en region`}</span>
          </div>
          {!isWorldMap && (
            <section className={`map-region-header-info ${hoveredAreaRegion ? "active" : ""}`} aria-live="polite">
              {hoveredAreaRegion ? (
                <>
                  <div className="map-region-header-info-title">
                    <b>{localize(hoveredAreaRegion, "label") || hoveredAreaRegion.label}</b>
                    <span>{regionMapSizeLabel(hoveredAreaRegion.mapSize)}</span>
                    <span>Corruption {regionCorruptionLevel(regionCorruption, selectedMapId, hoveredAreaRegion)}/10</span>
                  </div>
                  <div className="map-region-header-info-line">
                    <b>Mobs</b>
                    <span>{statusMobTypes.length ? statusMobTypes.join(", ") : "None"}</span>
                  </div>
                  <div className="map-region-header-info-line">
                    <b>Active quest objectives</b>
                    <span>{statusQuestTitles.length ? statusQuestTitles.join(", ") : "None"}</span>
                  </div>
                </>
              ) : (
                <span className="map-region-header-info-empty">Hover over a region to see details</span>
              )}
            </section>
          )}
          <div className="map-dialog-actions">
            {!isWorldMap && (
              <button type="button" className="map-back-button" onClick={selectWorldMap}>
                {t("map.worldMap")}
              </button>
            )}
            {onCityOpen && (
              <button type="button" className="map-back-button" onClick={onCityOpen}>
                {t("hud.city")}
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
            <img src={activeMap.imageUrl} alt={activeMapTitle} draggable="false" />
            {activeRegions.length > 0 && (
              <>
                <svg className="world-map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`Klikbare omraader paa ${activeMapTitle}`}>
                  {activeRegions.map((entry) => (
                    (() => {
                      const region = entry.region;
                      const regionLabel = localize(region, "label") || region.label;
                      const locked = !regionIsUnlocked(region, completedQuestSet, currentArmy, worldState, activeQuests);
                      const regionColor = mapRegionColor(selectedMapId, region, regionCorruption);
                      const hoverText = regionHoverCorruptionText(selectedMapId, region, regionCorruption);
                      const unlockText = locked ? regionUnlockText(region, completedQuestSet, currentArmy, worldState, activeQuests, localize) : "";
                      return (
                    <g
                      className={`world-map-region ${locked ? "locked" : ""} ${hoveredRegionId === region.id || selectedRegion?.id === region.id ? "hovered" : ""}`}
                      style={{ "--region-color": regionColor }}
                      key={region.id}
                      role="button"
                      tabIndex={0}
                      aria-label={locked ? `${regionLabel} er laast. ${unlockText} ${hoverText}` : `${isWorldMap ? "Aaben" : "Vaelg"} ${regionLabel}. ${hoverText}`}
                      onClick={() => activateRegion(entry)}
                      onKeyDown={(event) => handleRegionKeyDown(event, region)}
                      onMouseEnter={() => setHoveredRegionId(region.id)}
                      onMouseLeave={() => setHoveredRegionId(null)}
                      onFocus={() => setHoveredRegionId(region.id)}
                      onBlur={() => setHoveredRegionId(null)}
                    >
                      {isWorldMap && (
                        <title>{locked ? `${regionLabel} er laast. ${unlockText} ${hoverText}` : `${regionLabel} | ${hoverText}`}</title>
                      )}
                      <polygon points={region.points} />
                    </g>
                      );
                    })()
                  ))}
                </svg>
                {activeRegions.map((entry) => {
                  const region = entry.region;
                  const regionLabel = localize(region, "label") || region.label;
                  const locked = !regionIsUnlocked(region, completedQuestSet, currentArmy, worldState, activeQuests);
                  const regionColor = mapRegionColor(selectedMapId, region, regionCorruption);
                  const hoverText = regionHoverCorruptionText(selectedMapId, region, regionCorruption);
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
                      aria-label={locked ? `${regionLabel} er laast. ${regionUnlockText(region, completedQuestSet, currentArmy, worldState, activeQuests, localize)} ${hoverText}` : `${isWorldMap ? "Aaben" : "Vaelg"} ${regionLabel}. ${hoverText}`}
                      title={isWorldMap
                        ? (locked ? `${regionLabel} er laast. ${regionUnlockText(region, completedQuestSet, currentArmy, worldState, activeQuests, localize)} ${hoverText}` : `${regionLabel}. ${hoverText}`)
                        : undefined}
                      onClick={() => activateRegion(entry)}
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
                      {regionLabel}
                    </button>
                  );
                })}
              </>
            )}
          </div>
          {isWorldMap && (
            <div className="map-hover-card" aria-live="polite">
              <b>{statusTitle}</b>
              <span>{statusCorruptionText}</span>
            </div>
          )}
          <WorldEnergyBalanceBar state={worldEnergyState} />
          {isWorldMap && selectedRegion && !regionIsUnlocked(selectedRegion, completedQuestSet, currentArmy, worldState, activeQuests) && (
            <p className="map-note">{localize(selectedRegion, "label") || selectedRegion.label} er laast. {regionUnlockText(selectedRegion, completedQuestSet, currentArmy, worldState, activeQuests, localize)}</p>
          )}
        </div>
        {lockedRegion && (
          <LockedRegionDialog
            completedQuestSet={completedQuestSet}
            army={currentArmy}
            region={lockedRegion}
            worldState={worldState}
            activeQuests={activeQuests}
            localize={localize}
            onClose={() => setLockedRegion(null)}
          />
        )}
      </section>
    </div>
  );
}

function worldAverageCorruptionLevel(regionCorruption) {
  const areaIds = Object.keys(AREA_MAPS);
  if (!areaIds.length) return 0;
  const values = areaIds
    .map((areaMapId) => areaAverageCorruptionLevel(regionCorruption, areaMapId))
    .filter((value) => value !== null);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function WorldEnergyBalanceBar({ state, compact = false }) {
  const balance = Math.max(-100, Math.min(100, Number(state?.balanceValue) || 0));
  const lydraPoints = formatWorldEnergyPoints(state?.lydra);
  const netdraPoints = formatWorldEnergyPoints(state?.netdra);
  const tooltip = `Ly'dra'thot: ${lydraPoints} point (${state.lydraPercent}%)\nNet'dra'thot: ${netdraPoints} point (${state.netdraPercent}%)\nBalance: ${state.balanceValue}`;
  return (
    <div
      className={`world-energy-bar ${compact ? "compact" : ""}`}
      style={{ "--world-energy-marker": `${(balance + 100) / 2}%` }}
      title={tooltip}
    >
      <div className="world-energy-labels">
        <span>
          <img src="/assets/generated/lydra_symbol.png" alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; }} />
          Ly'dra'thot {state.lydraPercent}%
        </span>
        <b>0</b>
        <span>
          Net'dra'thot {state.netdraPercent}%
          <img src="/assets/generated/netdra_symbol.png" alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        </span>
      </div>
      <div className="world-energy-track" aria-label={`Ly'dra'thot ${state.lydraPercent}% / Net'dra'thot ${state.netdraPercent}%`}>
        <div className="world-energy-midline" />
        <div className="world-energy-marker" />
      </div>
      <div className="world-energy-percent">Ly'dra'thot {state.lydraPercent}% / Net'dra'thot {state.netdraPercent}%</div>
    </div>
  );
}

function formatWorldEnergyPoints(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.?0+$/, "");
}

function regionIsUnlocked(region, completedQuestSet, army = 0, worldState = null, activeQuests = []) {
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
  if (!requiredQuests.every((questId) => hasQuestCompletion(questId))) return false;
  const context = { regionId: region?.id, regionConfig: region, questState: { completed: [...completedQuestSet], active: activeQuests }, worldState };
  if (region?.unlock && !worldEntryAllowed(region.unlock, worldState, context)) return false;
  return worldEntryAllowed(region, worldState, context);
}

function questLabel(questId) {
  const raw = String(questId ?? "");
  const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
  return QUEST_DEFS[raw]?.title ?? QUEST_DEFS[swapped]?.title ?? raw;
}

function conditionRequirementLabel(condition) {
  if (!condition || typeof condition !== "object") return String(condition ?? "");
  if (condition.questActive) return `aktiv quest: ${questLabel(condition.questActive)}`;
  if (condition.questCompleted) return `fuldfoert quest: ${questLabel(condition.questCompleted)}`;
  if (condition.questStepCompleted) {
    const questId = condition.questStepCompleted.questId ?? "";
    const stepId = condition.questStepCompleted.stepId ?? condition.questStepCompleted;
    return `quest-trin ${questLabel(questId)} / ${stepId}`;
  }
  if (condition.flag) return `flag: ${condition.flag}`;
  if (condition.notFlag) return `ikke flag: ${condition.notFlag}`;
  if (condition.factions || condition.factionRep) return "faction reputation";
  if (condition.worldBalanceLydra) return "Ly'dra'thot-balance";
  if (condition.worldBalanceNetdra) return "Net'dra'thot-balance";
  if (condition.corruption) return "corruption";
  return "world-state krav";
}

function unmetWorldConditionText(condition, worldState, context) {
  if (!condition || worldConditionMet(condition, worldState, context)) return [];
  if (Array.isArray(condition.all)) return condition.all.flatMap((entry) => unmetWorldConditionText(entry, worldState, context));
  if (Array.isArray(condition.any)) return [`Kraever mindst et af: ${condition.any.map(conditionRequirementLabel).join(" eller ")}.`];
  if (condition.requires) return unmetWorldConditionText(condition.requires, worldState, context);
  if (condition.conditions) return unmetWorldConditionText(condition.conditions, worldState, context);
  if (condition.blockedBy && worldConditionMet(condition.blockedBy, worldState, context)) {
    return [`Blokeret af ${conditionRequirementLabel(condition.blockedBy)}.`];
  }
  return [`Kraever ${conditionRequirementLabel(condition)}.`];
}

function regionUnlockText(region, completedQuestSet, army = 0, worldState = null, activeQuests = [], localizeEntity = null) {
  if (region?.unlock?.text) {
    const localizedText = localizeEntity ? localizeEntity(region.unlock, "text") : "";
    return localizedText || region.unlock.text;
  }
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
  if (missingQuests.length) return `Kraever quest: ${missingQuests.map(questLabel).join(", ")}.`;
  const context = { regionId: region?.id, regionConfig: region, questState: { completed: [...completedQuestSet], active: activeQuests }, worldState };
  const unmet = unmetWorldConditionText(region?.unlock, worldState, context);
  if (unmet.length) return unmet.join(" ");
  return "Ingen manglende krav.";
}

function LockedRegionDialog({ region, completedQuestSet, army = 0, worldState = null, activeQuests = [], localize, onClose }) {
  const { t } = useLocalization();
  const hasQuestCompletion = (questId) => {
    const raw = String(questId ?? "");
    if (!raw) return false;
    const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
    return completedQuestSet.has(raw) || completedQuestSet.has(swapped);
  };
  const missingQuestIds = (region?.unlock?.completedQuests ?? [])
    .filter((questId) => !hasQuestCompletion(questId));
  const regionLabel = localize(region, "label") || region.label;
  const unlockText = regionUnlockText(region, completedQuestSet, army, worldState, activeQuests, localize);
  return (
    <div className="map-lock-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="map-lock-modal" role="dialog" aria-modal="true" aria-label={`${regionLabel} er laast`} onClick={(event) => event.stopPropagation()}>
        <header>
          <div className="map-lock-title">
            <img src="/assets/generated/minilock.png" alt="" aria-hidden="true" />
            <div>
              <span className="map-lock-kicker">Laast omraade</span>
              <h3>{regionLabel}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose}>{t("ui.close")}</button>
        </header>
        {unlockText && <p>{unlockText}</p>}
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
  const { localize, renderTemplate } = useLocalization();
  const quest = QUEST_DEFS[questId];
  const npcId = getQuestStartNpcIds(quest)?.[0];
  const npc = npcId ? QUEST_NPCS[npcId] : null;
  return (
    <article className="map-lock-quest">
      <div className="map-lock-quest-head">
        {npc?.imageUrl && <img src={npc.imageUrl} alt={npc.name} />}
        <div>
          <b>{localizeQuestField(quest, "title", localize, renderTemplate) || questId}</b>
          <span>{npc ? `${npc.name} | ${npc.title}` : "Questgiver ikke sat"}</span>
        </div>
      </div>
      {quest?.story && <p>{localizeQuestField(quest, "story", localize, renderTemplate)}</p>}
      <div className="map-lock-requirements">
        {questRequirementRows(quest, localize).map((row) => (
          <span className="map-lock-requirement" key={row.key}>
            {row.iconUrl && <img src={row.iconUrl} alt="" aria-hidden="true" />}
            {row.label}
          </span>
        ))}
      </div>
    </article>
  );
}

function questRequirementRows(quest, localize) {
  const target = quest?.target ?? {};
  const rows = [];
  const addQuestItem = (entry) => {
    const def = QUEST_ITEM_DEFS[entry.questItemId];
    rows.push({
      key: `quest-${entry.questItemId}`,
      label: `${entry.count ?? 1}x ${localize(def, "name") || entry.questItemId}`,
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
  return rows.length ? rows : [{ key: "quest-completion", label: "FuldfÃƒÂ¸r questen", iconUrl: null }];
}
