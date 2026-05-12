import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY } from "./game/data.js";
import { GameEngine } from "./game/GameEngine.js";
import { loadAnimationSheets, loadGeneratedAtlas } from "./game/assets.js";
import { CITY_STATS_RULES } from "./game/config/city-stats-rules-config.js";
import { WORLD_MAP } from "./game/config/map-region-config.js";
import { QUEST_NPCS } from "./game/config/npc-config.js";
import { SAVE_PERSIST_CONFIG } from "./game/config/save-persist-config.js";
import {
  calcThreatFallOnMapExit,
  calcThreatRiseOnDeath,
} from "./game/config/city-mobs-attack-config.js";
import {
  iconUrlFromKey,
  isEquippableItem,
  isQuestItem,
} from "./game/item-system.js";
import {
  AtlasIcon,
  CITY_STAT_DEFS,
  CITY_STORAGE_KEY,
  CityCitizenConditions,
  CityPage,
  CityStatsTopBar,
  CityThreatMeter,
  HeroDialog,
  ImageIcon,
  InventoryIcon,
  InventoryItemDetail,
  INVENTORY_FILTERS,
  ITEM_MONEY_ICON_URL,
  MergeChoiceDialog,
  MinimapDialog,
  QUICKBAR_ATTACK_ICON_URL,
  QUICKBAR_CITY_ICON_URL,
  QUICKBAR_HEALTH_POTION_ICON_URL,
  QUICKBAR_MANA_POTION_ICON_URL,
  QUICKBAR_QUEST_ICON_URL,
  QUICKBAR_WILDERNESS_ICON_URL,
  QuestDetailDialog,
  QuestObjectiveMeta,
  QuestOfferDialog,
  QuestOverviewDialog,
  ReadableDialog,
  RegionMapDialog,
  ResourceBar,
  StartMenu,
  applyMapReturnPopulationProgress,
  calculateCityStats,
  collectSaveSlots,
  createSaveSlot,
  emptySnapshot,
  isItemRequiredByActiveQuests,
  itemMatchesInventoryFilter,
  loadCityAssets,
  loadCityProgress,
  loadRegionCorruption,
  loadRegionMapInitialId,
  normalizeSaveSlot,
  normalizeCityMobs,
  regionStatusKey,
  saveCityProgress,
  saveRegionCorruption,
  upsertSaveSlot,
} from "./app/index.jsx";

function loadUiImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image load failed: ${src}`));
    image.src = src;
  });
}

function AppLoadingScreen({ state }) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(state?.percent) || 0)));
  return (
    <section className="app-loading-screen" role="status" aria-live="polite" aria-label="Loading">
      <div className="app-loading-copy">
        <b>{state?.title ?? "Loading"}</b>
        <span>{state?.label ?? "Preparing game..."}</span>
        {state?.error && <em>{state.error}</em>}
      </div>
      <div className="app-loading-bar" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="app-loading-meta">
        <span>{state?.detail ?? ""}</span>
        <b>{percent}%</b>
      </div>
    </section>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const engineRef = useRef(null);
  const [gameSession, setGameSession] = useState(null);
  const [menuView, setMenuView] = useState("main");
  const [saveSlots, setSaveSlots] = useState(collectSaveSlots);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [regionMapOpen, setRegionMapOpen] = useState(false);
  const [regionMapInitialId, setRegionMapInitialId] = useState(WORLD_MAP.id);
  const [regionCorruption, setRegionCorruption] = useState(() => loadRegionCorruption());
  const [heroOpen, setHeroOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [mergeChoice, setMergeChoice] = useState(null);
  const [readableDialog, setReadableDialog] = useState(null);
  const [questOffer, setQuestOffer] = useState(null);
  const [acceptedQuestNotice, setAcceptedQuestNotice] = useState(null);
  const [questRewardModal, setQuestRewardModal] = useState(null);
  const [viewedQuest, setViewedQuest] = useState(null);
  const [questOverviewOpen, setQuestOverviewOpen] = useState(false);
  const [confirmMapAbandonOpen, setConfirmMapAbandonOpen] = useState(false);
  const [cityMinimapHero, setCityMinimapHero] = useState(null);
  const [cityProgressHud, setCityProgressHud] = useState(() => loadCityProgress());
  const snapshotRef = useRef(emptySnapshot);
  const gameSessionRef = useRef(null);
  const lastMapReturnIdRef = useRef(null);
  const lastDeathIdRef = useRef(null);
  const lastCityOpenRef = useRef(false);
  const lastCityRollSessionRef = useRef(null);
  const preloadedGameAssetsRef = useRef({ atlas: null, animationSheets: null });
  const loadTokenRef = useRef(0);
  const [appLoading, setAppLoading] = useState({
    active: true,
    percent: 0,
    title: "Loading",
    label: "Starting...",
    detail: "",
    error: "",
  });

  useEffect(() => {
    let cancelled = false;
    const update = (patch) => {
      if (!cancelled) setAppLoading((current) => ({ ...current, ...patch }));
    };

    const preloadMenu = async () => {
      try {
        update({ active: true, percent: 5, title: "Loading", label: "Loading menu", detail: "Menu artwork" });
        await loadUiImage("/assets/generated/menu.png").catch(() => null);
        update({ percent: 20, label: "Loading city", detail: "Map, buildings, addons and NPCs" });
        await loadCityAssets();
        update({ percent: 100, label: "Ready", detail: "Menu ready" });
        window.setTimeout(() => update({ active: false }), 120);
      } catch (error) {
        update({
          active: false,
          percent: 100,
          label: "Menu ready",
          detail: "",
          error: error instanceof Error ? error.message : "Load failed",
        });
      }
    };

    preloadMenu();
    return () => {
      cancelled = true;
    };
  }, []);

  const preloadSessionAssets = async () => {
    const token = loadTokenRef.current + 1;
    loadTokenRef.current = token;
    const update = (patch) => {
      if (loadTokenRef.current === token) setAppLoading((current) => ({ ...current, ...patch }));
    };

    update({
      active: true,
      percent: 0,
      title: "Loading game",
      label: "Preparing session",
      detail: "",
      error: "",
    });

    update({ percent: 18, label: "Loading city", detail: "Map, buildings, addons and NPCs" });
    await loadCityAssets();
    preloadedGameAssetsRef.current = { atlas: null, animationSheets: null };
    update({ percent: 92, label: "Preparing UI", detail: "Save data and city state" });
    return token;
  };

  const preloadWildernessAssets = async (title = "Loading map") => {
    if (preloadedGameAssetsRef.current.atlas && preloadedGameAssetsRef.current.animationSheets) return true;
    const token = loadTokenRef.current + 1;
    loadTokenRef.current = token;
    const update = (patch) => {
      if (loadTokenRef.current === token) setAppLoading((current) => ({ ...current, ...patch }));
    };

    try {
      update({
        active: true,
        percent: 0,
        title,
        label: "Loading wilderness",
        detail: "Terrain, objects and overlays",
        error: "",
      });
      const atlas = await loadGeneratedAtlas();
      update({ percent: 68, label: "Loading combat", detail: "Hero and monster animations" });
      const animationSheets = await loadAnimationSheets();
      preloadedGameAssetsRef.current = { atlas, animationSheets };
      if (engineRef.current) {
        engineRef.current.atlas = atlas;
        engineRef.current.animationSheets = animationSheets;
        for (const chunk of engineRef.current.chunks?.values?.() ?? []) {
          chunk.terrainLayer = null;
        }
      }
      update({ percent: 100, label: "Ready", detail: "Entering map" });
      window.setTimeout(() => {
        if (loadTokenRef.current === token) setAppLoading((current) => ({ ...current, active: false }));
      }, 120);
      return true;
    } catch (error) {
      failSessionLoad(token, error);
      return false;
    }
  };

  const finishSessionLoad = (token) => {
    if (loadTokenRef.current !== token) return;
    setAppLoading((current) => ({
      ...current,
      active: true,
      percent: 100,
      label: "Ready",
      detail: "Entering city",
      error: "",
    }));
    window.setTimeout(() => {
      if (loadTokenRef.current === token) {
        setAppLoading((current) => ({ ...current, active: false }));
      }
    }, 120);
  };

  const failSessionLoad = (token, error) => {
    if (loadTokenRef.current !== token) return;
    setAppLoading((current) => ({
      ...current,
      active: true,
      percent: 100,
      label: "Load failed",
      detail: "Could not start game",
      error: error instanceof Error ? error.message : "Unknown load error",
    }));
  };

  useEffect(() => {
    gameSessionRef.current = gameSession;
  }, [gameSession]);

  useEffect(() => {
    if (!gameSession || !canvasRef.current) return undefined;
    const slot = gameSession.slot;
    const engine = new GameEngine(canvasRef.current, setSnapshot, {
      saveStorageKey: slot.saveKey,
      newGame: gameSession.newGame,
      atlas: preloadedGameAssetsRef.current.atlas,
      animationSheets: preloadedGameAssetsRef.current.animationSheets,
      deferAssetLoad: true,
      onSave: (payload) => {
        if (!slot.legacy) upsertSaveSlot({ ...slot, updatedAt: payload?.savedAt ?? Date.now() });
        setSaveSlots(collectSaveSlots());
      },
    });
    engineRef.current = engine;
    engine.start();
    if (gameSession.newGame) engine.saveProgress({ force: true });
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [gameSession?.sessionId]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const enteredCity = cityOpen && !lastCityOpenRef.current;
    lastCityOpenRef.current = cityOpen;
    if (!cityOpen || !gameSession?.sessionId || !engineRef.current) return;
    if (enteredCity) engineRef.current.restoreVitalsForCity?.();
    if (!enteredCity && lastCityRollSessionRef.current === gameSession.sessionId) return;
    lastCityRollSessionRef.current = gameSession.sessionId;
    engineRef.current.rollCityRepeatableQuestOffers?.();
  }, [cityOpen, gameSession?.sessionId]);

  useEffect(() => {
    if (!gameSession?.slot?.regionCorruptionStorageKey) return;
    saveRegionCorruption(regionCorruption, gameSession.slot.regionCorruptionStorageKey);
  }, [gameSession?.slot?.regionCorruptionStorageKey, regionCorruption]);

  useEffect(() => {
    if (!gameSession?.slot?.regionMapLastIdStorageKey) return;
    if (!SAVE_PERSIST_CONFIG.storage.regionMapLastId) return;
    try {
      localStorage.setItem(gameSession.slot.regionMapLastIdStorageKey, regionMapInitialId);
    } catch {
      // Ignore storage-denied errors.
    }
  }, [gameSession?.slot?.regionMapLastIdStorageKey, regionMapInitialId]);

  useEffect(() => {
    setCityProgressHud(loadCityProgress(gameSession?.slot?.cityStorageKey ?? CITY_STORAGE_KEY));
  }, [gameSession?.slot?.cityStorageKey, cityOpen]);

  useEffect(() => {
    const mapReturn = snapshot.mapReturn;
    if (!mapReturn?.id || lastMapReturnIdRef.current === mapReturn.id) return;
    lastMapReturnIdRef.current = mapReturn.id;
    const cityStorageKey = gameSessionRef.current?.slot?.cityStorageKey ?? CITY_STORAGE_KEY;
    const isCityMobBattle = Boolean(mapReturn.cityMobId);
    let nextProgress = loadCityProgress(cityStorageKey);
    let cityProgressChanged = false;

    if (mapReturn.cleared) {
      const threatFall = calcThreatFallOnMapExit(mapReturn.mapSize);
      if (threatFall > 0) {
        const prev = Math.max(0, Math.min(100, Number(nextProgress.threatLevel) || 0));
        const next = Math.max(0, prev - threatFall);
        if (next !== prev) {
          nextProgress = { ...nextProgress, threatLevel: next };
          cityProgressChanged = true;
        }
      }
    }

    if (isCityMobBattle && mapReturn.cleared) {
      const filtered = normalizeCityMobs(nextProgress.cityMobs).filter((mob) => mob.id !== mapReturn.cityMobId);
      nextProgress = { ...nextProgress, cityMobs: filtered };
      cityProgressChanged = true;
    }

    if (!isCityMobBattle) {
      const wasCorrupted = regionCorruption[regionStatusKey(mapReturn.areaMapId, mapReturn.regionId)] ?? true;
      const populationProgress = applyMapReturnPopulationProgress(nextProgress, mapReturn, wasCorrupted);
      if (populationProgress.changed) {
        nextProgress = populationProgress.progress;
        cityProgressChanged = true;
      }
    }

    if (cityProgressChanged) {
      saveCityProgress(nextProgress, cityStorageKey);
      setCityProgressHud(nextProgress);
    }

    if (!isCityMobBattle) {
      setRegionCorruption((current) => ({
        ...current,
        [regionStatusKey(mapReturn.areaMapId, mapReturn.regionId)]: !mapReturn.cleared,
      }));
      setRegionMapInitialId(mapReturn.areaMapId ?? WORLD_MAP.id);
    }
    setRegionMapOpen(false);
    setMapOpen(false);
    setInventoryOpen(false);
    setHeroOpen(false);
    setCityOpen(true);
    setConfirmMapAbandonOpen(false);
  }, [snapshot.mapReturn, regionCorruption]);

  useEffect(() => {
    const lastDeath = snapshot.lastDeath;
    if (!lastDeath?.id || lastDeathIdRef.current === lastDeath.id) return;
    lastDeathIdRef.current = lastDeath.id;
    const cityStorageKey = gameSessionRef.current?.slot?.cityStorageKey ?? CITY_STORAGE_KEY;
    const progress = loadCityProgress(cityStorageKey);
    const rise = calcThreatRiseOnDeath(Math.max(0, Math.min(1, Number(lastDeath.xpPct) || 0)));
    if (rise <= 0) return;
    const prev = Math.max(0, Math.min(100, Number(progress.threatLevel) || 0));
    const next = Math.min(100, prev + rise);
    if (next === prev) return;
    const nextProgress = { ...progress, threatLevel: next };
    saveCityProgress(nextProgress, cityStorageKey);
    setCityProgressHud(nextProgress);
    engineRef.current?.addToast?.(`Trusselsmeter steg med ${rise}%`);
  }, [snapshot.lastDeath]);

  useEffect(() => {
    if (!import.meta.hot) return undefined;
    const openWorldMapAfterHotUpdate = () => {
      if (!gameSessionRef.current) return;
      setRegionMapInitialId(WORLD_MAP.id);
      setRegionMapOpen(false);
      setMapOpen(false);
      setInventoryOpen(false);
      setHeroOpen(false);
      setCityOpen(true);
    };
    import.meta.hot.on("vite:afterUpdate", openWorldMapAfterHotUpdate);
    return () => import.meta.hot.off("vite:afterUpdate", openWorldMapAfterHotUpdate);
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (!gameSessionRef.current) return;
      // Allow inventory/map/hero hotkeys while city is open; city should not
      // block access to quickbar functionality.
      const key = event.key.toLowerCase();
      if (key === "i") setInventoryOpen((value) => !value);
      if (key === "m" && !cityOpen) setMapOpen((value) => !value);
      if (key === "c") setHeroOpen((value) => !value);
      if (key === "e" && snapshotRef.current.quests?.nearbyQuestgiver) {
        event.preventDefault();
        setQuestOffer(snapshotRef.current.quests.nearbyQuestgiver);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cityOpen]);

  useEffect(() => {
    const modalOpen = cityOpen
      || mapOpen
      || regionMapOpen
      || heroOpen
      || questOverviewOpen
      || confirmMapAbandonOpen
      || Boolean(questOffer)
      || Boolean(acceptedQuestNotice);
    engineRef.current?.setInputLocked(modalOpen);
    engineRef.current?.setPaused(modalOpen);
    if (cityOpen) {
      setInventoryOpen(false);
      setSelectedItem(null);
    }
    return () => {
      engineRef.current?.setInputLocked(false);
      engineRef.current?.setPaused(false);
    };
  }, [cityOpen, mapOpen, regionMapOpen, heroOpen, questOverviewOpen, confirmMapAbandonOpen, questOffer, acceptedQuestNotice]);

  useEffect(() => {
    if (!minimapRef.current) return;
    if (cityOpen) {
      return;
    }
    engineRef.current?.renderMinimap(minimapRef.current);
  }, [snapshot, cityOpen, cityMinimapHero]);

  useEffect(() => {
    if (!inventoryOpen) {
      setSelectedItem(null);
      setReadableDialog(null);
    }
  }, [inventoryOpen]);

  const player = snapshot.player;
  const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const manaPct = Math.max(0, Math.min(100, (player.mana / player.maxMana) * 100));
  const xpPct = Math.max(0, Math.min(100, (player.xp / player.nextXp) * 100));
  const popularityPct = Math.max(0, Math.min(100, player.popularity ?? 0));
  const derivedCityStats = useMemo(
    () => calculateCityStats(cityProgressHud, snapshot),
    [cityProgressHud, snapshot],
  );
  const cityThreatLevel = Math.max(0, Math.min(100, Number(cityProgressHud?.threatLevel) || 0));
  const cityHudStats = useMemo(() => CITY_STAT_DEFS.map((stat) => {
    const value = Math.max(0, Math.floor(Number(derivedCityStats[stat.id]) || 0));
    const configuredMax = CITY_STATS_RULES.displayMax?.[stat.id] ?? 500;
    const max = Math.max(1, Math.floor(Number(typeof stat.max === "function" ? stat.max(snapshot) : stat.max ?? configuredMax) || 1));
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const label = stat.id === "popularity" ? `${stat.label} ${Math.round(value)}%` : `${stat.label} ${value}`;
    return { ...stat, value, max, pct, label, classId: stat.classId ?? stat.id };
  }), [derivedCityStats, snapshot]);
  const hoverMonster = snapshot.hoverMonster;
  const monsterHpPct = hoverMonster
    ? Math.max(0, Math.min(100, (hoverMonster.hp / hoverMonster.maxHp) * 100))
    : 0;
  const inventorySlots = useMemo(() => (
    Array.from({ length: MAX_INVENTORY }, (_, index) => snapshot.inventory[index] ?? null)
  ), [snapshot.inventory]);
  const activeQuests = snapshot.quests?.active ?? [];
  const trackedQuests = useMemo(
    () => activeQuests.filter((quest) => quest.tracked !== false),
    [activeQuests],
  );
  const startPlayableMapRegion = async (areaMapId, region) => {
    if (!areaMapId || !region?.id) return;
    const ready = await preloadWildernessAssets("Loading map");
    if (!ready) return;
    const started = engineRef.current?.startMapRegion?.(areaMapId, region);
    if (!started) return;
    setRegionCorruption((current) => ({
      ...current,
      [regionStatusKey(areaMapId, region.id)]: true,
    }));
    setRegionMapOpen(false);
    setMapOpen(false);
    setCityOpen(false);
  };

  const startCityMobBattle = async ({ areaMapId, region, cityMobId, cityMobType, cityMobLevel }) => {
    if (!areaMapId || !region?.id) return false;
    const ready = await preloadWildernessAssets("Loading battle");
    if (!ready) return false;
    const started = engineRef.current?.startMapRegion?.(areaMapId, region);
    if (!started) return false;
    if (engineRef.current?.activeMapRegion) {
      engineRef.current.activeMapRegion.cityMobId = cityMobId;
      engineRef.current.activeMapRegion.cityMobType = cityMobType;
      engineRef.current.activeMapRegion.cityMobLevel = cityMobLevel;
    }
    setRegionMapOpen(false);
    setMapOpen(false);
    setInventoryOpen(false);
    setHeroOpen(false);
    setCityOpen(false);
    return true;
  };

  const beginSession = async (slot, newGame = false) => {
    const normalizedSlot = normalizeSaveSlot(slot);
    if (!normalizedSlot) return;
    let loadToken = null;
    try {
      loadToken = await preloadSessionAssets();
    } catch (error) {
      failSessionLoad(loadTokenRef.current, error);
      return;
    }
    if (!normalizedSlot.legacy) upsertSaveSlot(normalizedSlot);
    setSnapshot(emptySnapshot);
    setInventoryOpen(false);
    setMapOpen(false);
    setRegionMapOpen(false);
    setHeroOpen(false);
    setSelectedItem(null);
    setMergeChoice(null);
    setReadableDialog(null);
    setQuestOffer(null);
    setAcceptedQuestNotice(null);
    setQuestRewardModal(null);
    setViewedQuest(null);
    setQuestOverviewOpen(false);
    setConfirmMapAbandonOpen(false);
    setCityMinimapHero(null);
    setCityProgressHud(loadCityProgress(normalizedSlot.cityStorageKey));
    setRegionCorruption(loadRegionCorruption(normalizedSlot.regionCorruptionStorageKey));
    setRegionMapInitialId(loadRegionMapInitialId(normalizedSlot.regionMapLastIdStorageKey));
    lastMapReturnIdRef.current = null;
    setCityOpen(true);
    setGameSession({
      sessionId: `${normalizedSlot.id}-${Date.now()}`,
      slot: normalizedSlot,
      newGame,
    });
    setSaveSlots(collectSaveSlots());
    finishSessionLoad(loadToken);
  };

  const startNewGame = () => {
    const slot = createSaveSlot();
    beginSession(slot, true);
  };

  const openWorldMapFromCity = () => {
    setRegionMapInitialId(WORLD_MAP.id);
    setRegionMapOpen(true);
    setMapOpen(false);
    setInventoryOpen(false);
    setHeroOpen(false);
    setCityOpen(false);
  };

  const handleOpenCityFromMap = () => {
    setRegionMapOpen(false);
    setMapOpen(false);
    setCityOpen(true);
  };

  return (
    <main className={`game-shell ${gameSession ? "game-active" : "menu-active"} ${cityOpen ? "city-open" : ""}`}>
      {!gameSession && !appLoading.active && (
        <StartMenu
          view={menuView}
          saveSlots={saveSlots}
          onNewGame={startNewGame}
          onLoadClick={() => {
            setSaveSlots(collectSaveSlots());
            setMenuView("load");
          }}
          onBack={() => setMenuView("main")}
          onLoadGame={(slot) => beginSession(slot, false)}
        />
      )}

      {gameSession && <canvas ref={canvasRef} className="game-canvas" aria-label="Runebound Depths isometric game" />}

      {gameSession && (
      <>
      <section className="hud hud-left" aria-live="polite">
        {cityOpen ? (
          <div className="city-hero-cluster">
            <div className="portrait">
              <b>{player.level}</b>
            </div>
            <CityCitizenConditions stats={derivedCityStats} />
          </div>
        ) : (
          <div className="portrait">
            <b>{player.level}</b>
          </div>
        )}
        {cityOpen ? (
          <CityStatsTopBar stats={cityHudStats} />
        ) : (
          <div className="resource-stack">
            <ResourceBar type="health" value={hpPct} label={`HP ${player.hp} / ${player.maxHp}`} />
            <ResourceBar type="mana" value={manaPct} label={`MANA ${player.mana} / ${player.maxMana}`} />
            <ResourceBar type="xp" value={xpPct} label={`XP ${player.xp} / ${player.nextXp}`} />
            <ResourceBar type="popularity" value={popularityPct} label={`POPULARITY ${Math.round(player.popularity ?? 0)}%`} />
          </div>
        )}
        {cityOpen && <CityThreatMeter threatLevel={cityThreatLevel} />}
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
              Seed {snapshot.zone.seed} | Omraade L{snapshot.zone.level}
            </span>
          )}
        </div>
        {!cityOpen && <canvas ref={minimapRef} className="minimap" width="154" height="154" aria-label="Minimap" />}
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

      <section className="combat-card">
        <span>Skade {player.damage}</span>
        <span>Armor {player.armor}</span>
        <span>{player.mode}</span>
        {snapshot.regionRun && snapshot.mobs?.total > 0 && (
          <span>Mobs {snapshot.mobs.killed} / {snapshot.mobs.total}</span>
        )}
      </section>

      {trackedQuests.length > 0 && (
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

      <section className="skillbar">
        <span title={cityOpen ? "Ikke tilgængelig i byen" : undefined}>
          <button
            type="button"
            className="quick-potion"
            title="Health potion"
            disabled={cityOpen || !snapshot.quickActions.healthPotions || snapshot.quickActions.potionCooldown > 0}
            onClick={() => engineRef.current?.usePotion("health")}
          >
            <InventoryIcon iconIndex={4} iconSheet="items" iconUrl={QUICKBAR_HEALTH_POTION_ICON_URL} />
            <span className="hotkey-badge">1</span>
            <b>{snapshot.quickActions.healthPotions}</b>
          </button>
        </span>
        <span title={cityOpen ? "Ikke tilgængelig i byen" : undefined}>
          <button
            type="button"
            className="quick-potion"
            title="Mana potion"
            disabled={cityOpen || !snapshot.quickActions.manaPotions || snapshot.quickActions.potionCooldown > 0}
            onClick={() => engineRef.current?.usePotion("mana")}
          >
            <InventoryIcon iconIndex={3} iconSheet="items" iconUrl={QUICKBAR_MANA_POTION_ICON_URL} />
            <span className="hotkey-badge">2</span>
            <b>{snapshot.quickActions.manaPotions}</b>
          </button>
        </span>
        <span title={cityOpen ? "Ikke tilgængelig i byen" : undefined}>
          <button type="button" className="skill active" title="Angrib" disabled={cityOpen} onClick={() => engineRef.current?.primaryAttack()}>
            <InventoryIcon iconIndex={0} iconSheet="items" iconUrl={QUICKBAR_ATTACK_ICON_URL} />
          </button>
        </span>
        <span title={cityOpen ? "Ikke tilgængelig i byen" : undefined}>
          <button
            type="button"
            className="skill"
            title="Kast magi"
            disabled={cityOpen}
            onClick={() => {
              const engine = engineRef.current;
              if (engine) engine.castSpellAt(engine.pointer.worldX, engine.pointer.worldY);
            }}
          >
            <AtlasIcon frameName="orb" />
          </button>
        </span>
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
        <button
          type="button"
          className="skill"
          title={snapshot.regionRun ? "Til world map (progression nulstilles)" : "Aaben world map"}
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

      {confirmMapAbandonOpen && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="abandon-map-title">
            <h2 id="abandon-map-title">Tilbage til byen?</h2>
            <p>Hvis du forlader dette map nu, nulstilles al progression herfra, inklusive nyt loot, XP og quest-fremgang.</p>
            <div>
              <button type="button" onClick={() => setConfirmMapAbandonOpen(false)}>
                Bliv her
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={() => {
                  const left = engineRef.current?.abandonMapRegionToWorldMap?.();
                  if (left) {
                    setConfirmMapAbandonOpen(false);
                    setRegionMapInitialId(WORLD_MAP.id);
                    setRegionMapOpen(false);
                    setCityOpen(true);
                  }
                }}
              >
                Forlad til by
              </button>
            </div>
          </section>
        </div>
      )}

      {questOverviewOpen && (
        <QuestOverviewDialog
          activeQuests={activeQuests}
          onClose={() => setQuestOverviewOpen(false)}
          onToggleTracked={(questId, tracked) => engineRef.current?.setQuestTracked?.(questId, tracked)}
          onOpenQuest={(quest) => {
            setViewedQuest(quest);
            setQuestOverviewOpen(false);
          }}
        />
      )}

      {inventoryOpen && (
        <aside className="inventory-panel" onMouseLeave={() => setSelectedItem(null)}>
          <header>
            <div>
              <h1>Rygsaek</h1>
              <span>
                {snapshot.inventory.length} / {MAX_INVENTORY}
              </span>
            </div>
            <button type="button" className="close-button" onClick={() => setInventoryOpen(false)} title="Luk">
              x
            </button>
          </header>

          <div className="equipment-grid">
            {snapshot.equipment.map((slot) => (
              <button
                type="button"
                className={`equipment-slot equipment-${slot.id} ${slot.item ? "equipped" : "empty"}`}
                style={{ "--item-quality": slot.item?.rarityColor ?? "rgba(255,255,255,0.16)" }}
                key={slot.id}
                onMouseEnter={() => setSelectedItem(slot.item)}
                onFocus={() => setSelectedItem(slot.item)}
              >
                <span className="equipment-icon" aria-hidden="true">
                  {slot.item ? (
                    <InventoryIcon iconIndex={slot.item.iconIndex} iconSheet={slot.item.iconSheet} iconUrl={slot.item.iconUrl} />
                  ) : slot.emptyIconKey ? (
                    <InventoryIcon iconSheet="items" iconUrl={iconUrlFromKey(slot.emptyIconKey)} />
                  ) : (
                    <i />
                  )}
                </span>
                <span className="equipment-label">{slot.label}</span>
                <b className={slot.item?.rarity ?? ""}>{slot.item?.name ?? "Empty"}</b>
              </button>
            ))}
          </div>

          <div className="inventory-filter-bar" aria-label="Backpack visual filters">
            {INVENTORY_FILTERS.map((filter) => (
              <button
                type="button"
                className={`inventory-filter filter-${filter.id} ${inventoryFilter === filter.id ? "active" : ""}`}
                style={{ "--filter-color": filter.color }}
                key={filter.id}
                title={filter.label}
                onClick={() => setInventoryFilter(filter.id)}
              >
                <i aria-hidden="true" />
                <span>{filter.text}</span>
              </button>
            ))}
          </div>

          <div className="item-grid">
            {inventorySlots.map((item, slotIndex) => {
              if (!item) {
                return <article className="item-card empty-slot" key={`empty-${slotIndex}`} aria-hidden="true" />;
              }
              const dimmed = inventoryFilter !== "all" && !itemMatchesInventoryFilter(item, inventoryFilter);
              return (
                <article
                  className={`item-card ${item.rarity} ${item.mode === "resource" ? "resource-item" : ""} ${dimmed ? "filter-dimmed" : ""} ${isItemRequiredByActiveQuests(item, snapshot.quests?.active) ? "quest-related" : ""}`}
                  style={{ "--item-quality": item.rarityColor ?? "rgba(255,255,255,0.16)" }}
                  key={item.id}
                  onMouseEnter={() => setSelectedItem(item)}
                  onFocus={() => setSelectedItem(item)}
                  onClick={() => {
                    if (isEquippableItem(item)) engineRef.current?.equipItem(item.index);
                  }}
                  tabIndex={0}
                >
                  <button
                    type="button"
                    className="corner-action drop-action"
                    title={cityOpen ? "Kan ikke droppe i byen" : isQuestItem(item) ? "Kan ikke droppe quest item" : "Drop"}
                    disabled={cityOpen || isQuestItem(item)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!cityOpen && !isQuestItem(item)) {
                        engineRef.current?.dropInventoryItem(item.index);
                      }
                    }}
                  >
                    D
                  </button>
                  <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
                  {(item.mode === "potion" || item.mode === "resource") && item.count > 1 && <b className="stack-count">{item.count}</b>}
                  {item.durability !== undefined && item.mode !== "resource" && item.mode !== "potion" && (() => {
                    const dp = Math.max(0, Math.min(100, Number(item.durability ?? 100)));
                    const dc = dp >= 75 ? "#58d96d" : dp >= 40 ? "#ffd85d" : "#ff6b5f";
                    return (
                      <span className="item-card-dur-bar-wrap" title={`Durability: ${Math.round(dp)}%`}>
                        <span className="item-card-dur-bar-fill" style={{ width: `${dp}%`, background: dc }} />
                      </span>
                    );
                  })()}
                  <span>
                    {item.rarityLabel} | L{item.level} | {item.value}g
                  </span>
                  {item.canMerge && (
                    <button
                      type="button"
                      className="corner-action merge-action"
                      title="Merge"
                      onClick={(event) => {
                        event.stopPropagation();
                        const result = engineRef.current?.mergeInventoryItem(item.index);
                        if (result?.type === "resource-choice" || result?.type === "readable-choice") setMergeChoice(result);
                      }}
                    >
                      M
                    </button>
                  )}
                  {item.canRead && (
                    <button
                      type="button"
                      className="corner-action merge-action"
                      title="Read"
                      onClick={(event) => {
                        event.stopPropagation();
                        const result = engineRef.current?.readInventoryItem?.(item.index);
                        if (result?.type === "readable-text") setReadableDialog(result);
                      }}
                    >
                      R
                    </button>
                  )}
                  {item.canConsume && (
                    <button
                      type="button"
                      className="corner-action merge-action"
                      title="Use"
                      onClick={(event) => {
                        event.stopPropagation();
                        engineRef.current?.consumeInventoryItem?.(item.index);
                      }}
                    >
                      U
                    </button>
                  )}
                </article>
              );
            })}
          </div>

        </aside>
      )}

      {inventoryOpen && selectedItem && (
        <aside className="item-hover-panel" aria-live="polite">
          <InventoryItemDetail selectedItem={selectedItem} equipment={snapshot.equipment} />
        </aside>
      )}

      <div className="toast-stack">
        {snapshot.toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            {toast.text}
          </div>
        ))}
      </div>

      {mergeChoice && (
        <MergeChoiceDialog
          choice={mergeChoice}
          onCancel={() => setMergeChoice(null)}
          onChoose={(output) => {
            const current = snapshot.inventory.find((item) => item.id === mergeChoice.itemId);
            if (current) {
              if (mergeChoice.type === "readable-choice") {
                engineRef.current?.mergeInventoryReadableWithRecipe?.(current.index, output);
              } else {
                engineRef.current?.mergeInventoryResourceWithRecipe(current.index, output);
              }
            }
            setMergeChoice(null);
          }}
        />
      )}

      {readableDialog && (
        <ReadableDialog
          entry={readableDialog}
          onClose={() => setReadableDialog(null)}
        />
      )}

      {snapshot.quests?.nearbyQuestgiver && !cityOpen && !questOffer && (
        <div className="city-interact-prompt wilderness-prompt">
          Press <b>E</b> to speak with {QUEST_NPCS[snapshot.quests.nearbyQuestgiver.npcId]?.name ?? "questgiver"}
        </div>
      )}

      {snapshot.nearbyFoliageLoot && !snapshot.quests?.nearbyQuestgiver && !cityOpen && !questOffer && (
        <div className="city-interact-prompt wilderness-prompt">
          Press <b>E</b> to gather {snapshot.nearbyFoliageLoot.label}
        </div>
      )}

      {questOffer && (
        <QuestOfferDialog
          interaction={questOffer}
          onDecline={() => {
            engineRef.current?.declineWildernessQuest?.();
            setQuestOffer(null);
          }}
          onAcceptQuest={(quest) => {
            const accepted = engineRef.current?.acceptWildernessQuest?.({
              npcId: questOffer.npcId,
              quest,
            });
            if (accepted) setAcceptedQuestNotice({ npcId: questOffer.npcId, quest });
            setQuestOffer(null);
          }}
          onTurnInQuest={(quest) => {
            const result = engineRef.current?.completeQuest?.(quest.id);
            if (result?.ok) {
              setQuestRewardModal(result);
              setQuestOffer(null);
            }
          }}
        />
      )}

      {viewedQuest && (
        <QuestDetailDialog
          quest={viewedQuest}
          engineRef={engineRef}
          onClose={() => setViewedQuest(null)}
          onQuestCompleted={(result) => setQuestRewardModal(result)}
          cityOpen={cityOpen}
        />
      )}

      {acceptedQuestNotice && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog quest-parchment-dialog quest-accepted-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-city-title">
            <h2 id="quest-city-title">Quest taget</h2>
            <h3>{acceptedQuestNotice.quest?.title ?? "Ny quest"}</h3>
            {acceptedQuestNotice.quest?.story && <p>{acceptedQuestNotice.quest.story}</p>}
            {acceptedQuestNotice.quest?.acceptText && <p>{acceptedQuestNotice.quest.acceptText}</p>}
            <QuestObjectiveMeta quest={acceptedQuestNotice.quest} />
            <p>{QUEST_NPCS[acceptedQuestNotice.npcId]?.name ?? "Questgiver"} kan findes i byen, naar questen skal indleveres.</p>
            <div>
              <button type="button" onClick={() => setAcceptedQuestNotice(null)}>OK</button>
            </div>
          </section>
        </div>
      )}

      {questRewardModal && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-reward-title">
            <h2 id="quest-reward-title">Quest reward</h2>
            <p>{questRewardModal.questTitle}</p>
            {questRewardModal.questInfo && <QuestObjectiveMeta quest={questRewardModal.questInfo} compact />}
            <div className="comparison-list">
              {questRewardModal.rewards?.xp > 0 && <span className="diff-good">+ XP {questRewardModal.rewards.xp}</span>}
              {questRewardModal.rewards?.gold > 0 && <span className="diff-good">+ Gold {questRewardModal.rewards.gold}</span>}
              {(questRewardModal.rewards?.resources ?? []).map((entry) => (
                <span className="diff-good" key={`res-${entry.id}`}>+ {entry.count}x {entry.name}</span>
              ))}
              {(questRewardModal.rewards?.items ?? []).map((entry, index) => (
                <span className="diff-good" key={`item-${entry.id ?? index}`}>+ {entry.name}</span>
              ))}
            </div>
            <div>
              <button type="button" onClick={() => setQuestRewardModal(null)}>OK</button>
            </div>
          </section>
        </div>
      )}

      {snapshot.exitPrompt && !cityOpen && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="region-exit-title">
            <h2 id="region-exit-title">{snapshot.regionRun ? "Tilbage til byen?" : "Rejs videre?"}</h2>
            <p>
              {snapshot.regionRun
                ? `Du har fundet udgangen fra ${snapshot.region.name}. Forlad regionen og vend tilbage til byen?`
                : `Du har fundet udgangen fra ${snapshot.region.name}. Fortsaet til naeste region?`}
            </p>
            <div>
              <button type="button" onClick={() => engineRef.current?.dismissExitPrompt()}>
                Bliv her
              </button>
              <button type="button" onClick={() => engineRef.current?.travelToNextRegion()}>
                {snapshot.regionRun ? "Til byen" : "Rejs videre"}
              </button>
            </div>
          </section>
        </div>
      )}

      {mapOpen && !cityOpen && (
        <MinimapDialog
          engineRef={engineRef}
          snapshot={snapshot}
          cityOpen={cityOpen}
          cityMinimapHero={cityMinimapHero}
          onClose={() => setMapOpen(false)}
        />
      )}

      {regionMapOpen && (
        <RegionMapDialog
          initialMapId={regionMapInitialId}
          regionCorruption={regionCorruption}
          completedQuests={snapshot.quests?.completed ?? []}
          army={snapshot.player?.stats?.army ?? 0}
          onPlayableRegionSelected={startPlayableMapRegion}
          onCityOpen={handleOpenCityFromMap}
          onMapNavigation={(mapId) => setRegionMapInitialId(mapId)}
        />
      )}

      {heroOpen && (
        <HeroDialog
          snapshot={snapshot}
          onSelectSpell={(spellId) => engineRef.current?.setActiveSpell?.(spellId)}
          onClose={() => setHeroOpen(false)}
        />
      )}

      {cityOpen && (
        <CityPage
          key={gameSession.slot.id}
          engineRef={engineRef}
          snapshot={snapshot}
          onQuestCompleted={(result) => setQuestRewardModal(result)}
          cityStorageKey={gameSession.slot.cityStorageKey}
          onProgressChange={setCityProgressHud}
          onStartCityMobBattle={startCityMobBattle}
          onClose={openWorldMapFromCity}
        />
      )}
      </>
      )}
      {appLoading.active && <AppLoadingScreen state={appLoading} />}
    </main>
  );
}
