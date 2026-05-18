import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY } from "./game/data.js";
import { GameEngine } from "./game/GameEngine.js";
import { loadAnimationSheets, loadGeneratedAtlas } from "./game/assets.js";
import { CITY_STATS_RULES } from "./game/config/city-stats-rules-config.js";
import { WORLD_MAP } from "./game/config/map-region-config.js";
import { QUEST_NPCS } from "./game/config/npc-config.js";
import { saveRepository } from "./storage/saveRepository.js";
import {
  calcThreatFallOnMapExit,
  calcThreatRiseOnDeath,
} from "./game/config/city-mobs-attack-config.js";
import {
  AppLoadingScreen,
  CITY_STAT_DEFS,
  CITY_STORAGE_KEY,
  CityPage,
  GameHud,
  HeroDialog,
  InventoryPanel,
  MergeChoiceDialog,
  MinimapDialog,
  QuestDetailDialog,
  QuestObjectiveMeta,
  QuestOfferDialog,
  QuestOverviewDialog,
  ReadableDialog,
  RegionMapDialog,
  StartMenu,
  calculateCityStats,
  calculateCityStatBreakdown,
  collectSaveSlots,
  createSaveSlot,
  emptySnapshot,
  loadCityAssetsOnce,
  loadCityProgress,
  loadRegionCorruption,
  loadRegionMapInitialId,
  normalizeSaveSlot,
  normalizeCityMobs,
  getRegionCorruptionLevel,
  saveCityProgress,
  saveRegionCorruption,
  setRegionCorruptionLevel,
  updateRegionCorruptionFromMapReturn,
  upsertSaveSlot,
  useEngineModalLock,
} from "./app/index.jsx";

function loadUiImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image load failed: ${src}`));
    image.src = src;
  });
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
  const [cityStorageOpen, setCityStorageOpen] = useState(false);
  const [citySettingsOpen, setCitySettingsOpen] = useState(false);
  const [cityMinimapHero, setCityMinimapHero] = useState(null);
  const [cityProgressHud, setCityProgressHud] = useState(() => loadCityProgress());
  const [skipCityMobProgressReturnId, setSkipCityMobProgressReturnId] = useState(null);
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
        await loadCityAssetsOnce();
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
    await loadCityAssetsOnce();
    preloadedGameAssetsRef.current = { atlas: null, animationSheets: null };
    update({ percent: 92, label: "Preparing UI", detail: "Save data and city state" });
    return token;
  };

  const preloadWildernessAssets = async (title = "Loading map", region = null) => {
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
      const atlas = await loadGeneratedAtlas(region);
      update({ percent: 68, label: "Loading combat", detail: "Hero and monster animations" });
      const animationSheets = await loadAnimationSheets(region);
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
    saveRepository.saveLastRegionMapIdSync(gameSession.slot.regionMapLastIdStorageKey, regionMapInitialId);
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

    if (isCityMobBattle) {
      setSkipCityMobProgressReturnId(mapReturn.id);
    }

    let nextRegionCorruption = regionCorruption;
    if (!isCityMobBattle) {
      const oldCorruptionLevel = getRegionCorruptionLevel(regionCorruption, mapReturn.areaMapId, mapReturn.regionId);
      const nextCorruptionLevel = updateRegionCorruptionFromMapReturn(oldCorruptionLevel, mapReturn);
      nextRegionCorruption = setRegionCorruptionLevel(regionCorruption, mapReturn.areaMapId, mapReturn.regionId, nextCorruptionLevel);
    }

    if (cityProgressChanged) {
      saveCityProgress(nextProgress, cityStorageKey);
      setCityProgressHud(nextProgress);
    }

    if (!isCityMobBattle) {
      setRegionCorruption(nextRegionCorruption);
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
    if (cityOpen) return;
    setCityStorageOpen(false);
    setCitySettingsOpen(false);
  }, [cityOpen]);

  useEngineModalLock({
    acceptedQuestNotice,
    cityOpen,
    confirmMapAbandonOpen,
    engineRef,
    heroOpen,
    mapOpen,
    questOffer,
    questOverviewOpen,
    regionMapOpen,
    setInventoryOpen,
    setSelectedItem,
  });

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
    () => calculateCityStats(cityProgressHud, snapshot, regionCorruption),
    [cityProgressHud, snapshot, regionCorruption],
  );
  const cityThreatLevel = Math.max(0, Math.min(100, Number(cityProgressHud?.threatLevel) || 0));
  const cityStatBreakdown = useMemo(
    () => calculateCityStatBreakdown(cityProgressHud, snapshot, regionCorruption),
    [cityProgressHud, snapshot, regionCorruption],
  );
  const cityHudStats = useMemo(() => CITY_STAT_DEFS.filter((stat) => stat.id !== "popularity").map((stat) => {
    const value = Math.max(0, Math.floor(Number(derivedCityStats[stat.id]) || 0));
    const configuredMax = CITY_STATS_RULES.displayMax?.[stat.id] ?? 500;
    const max = Math.max(1, Math.floor(Number(typeof stat.max === "function" ? stat.max(snapshot) : stat.max ?? configuredMax) || 1));
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const label = stat.id === "popularity" ? `${stat.label} ${Math.round(value)}%` : `${stat.label} ${value}`;
    return { ...stat, value, max, pct, label, classId: stat.classId ?? stat.id, breakdown: cityStatBreakdown[stat.id] ?? [] };
  }), [cityStatBreakdown, derivedCityStats, snapshot]);
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
    const corrupted = getRegionCorruptionLevel(regionCorruption, areaMapId, region.id, region) > 0;
    const preparedRegion = engineRef.current?.prepareMapRegionConfig?.(areaMapId, region, { corrupted }) ?? region;
    const ready = await preloadWildernessAssets("Loading map", preparedRegion);
    if (!ready) return;
    const started = engineRef.current?.startMapRegion?.(areaMapId, preparedRegion);
    if (!started) return;
    setRegionMapOpen(false);
    setMapOpen(false);
    setCityOpen(false);
  };

  const startCityMobBattle = async ({ areaMapId, region, cityMobId, cityMobType, cityMobLevel }) => {
    if (!areaMapId || !region?.id) return false;
    const corrupted = getRegionCorruptionLevel(regionCorruption, areaMapId, region.id, region) > 0;
    const preparedRegion = engineRef.current?.prepareMapRegionConfig?.(areaMapId, region, { corrupted }) ?? region;
    const ready = await preloadWildernessAssets("Loading battle", preparedRegion);
    if (!ready) return false;
    const started = engineRef.current?.startMapRegion?.(areaMapId, preparedRegion);
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
    setCityStorageOpen(false);
    setCitySettingsOpen(false);
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
    setCityOpen(true);
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

      {gameSession && <canvas ref={canvasRef} className="game-canvas" aria-label="Valtoria isometric game" />}

      {gameSession && (
      <>
      <GameHud
        cityHudStats={cityHudStats}
        cityOpen={cityOpen}
        cityThreatLevel={cityThreatLevel}
        derivedCityStats={derivedCityStats}
        engineRef={engineRef}
        hoverMonster={hoverMonster}
        hpPct={hpPct}
        manaPct={manaPct}
        minimapRef={minimapRef}
        monsterHpPct={monsterHpPct}
        openWorldMapFromCity={openWorldMapFromCity}
        player={player}
        popularityPct={popularityPct}
        setConfirmMapAbandonOpen={setConfirmMapAbandonOpen}
        setCitySettingsOpen={setCitySettingsOpen}
        setCityStorageOpen={setCityStorageOpen}
        setHeroOpen={setHeroOpen}
        setInventoryOpen={setInventoryOpen}
        setMapOpen={setMapOpen}
        setQuestOverviewOpen={setQuestOverviewOpen}
        setViewedQuest={setViewedQuest}
        snapshot={snapshot}
        trackedQuests={trackedQuests}
        xpPct={xpPct}
      />

      {confirmMapAbandonOpen && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="abandon-map-title">
            <h2 id="abandon-map-title">Tilbage til byen?</h2>
            <p>Hvis du forlader dette map nu, bruges abandon-configen til at afgore hvilke dele af run-progress der nulstilles.</p>
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

      {citySettingsOpen && cityOpen && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog city-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="city-settings-title">
            <h2 id="city-settings-title">Setting</h2>
            <p>Settings-panelet er reserveret til kommende valg.</p>
            <div>
              <button type="button" onClick={() => setCitySettingsOpen(false)}>Close</button>
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
        <InventoryPanel
          cityOpen={cityOpen}
          engineRef={engineRef}
          inventoryFilter={inventoryFilter}
          inventorySlots={inventorySlots}
          selectedItem={selectedItem}
          setInventoryFilter={setInventoryFilter}
          setInventoryOpen={setInventoryOpen}
          setMergeChoice={setMergeChoice}
          setReadableDialog={setReadableDialog}
          setSelectedItem={setSelectedItem}
          snapshot={snapshot}
        />
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
            const result = engineRef.current?.completeQuest?.(quest.id, questOffer.npcId);
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
            <p>{QUEST_NPCS[acceptedQuestNotice.quest?.turnInNpcId ?? acceptedQuestNotice.npcId]?.name ?? "Questgiver"} kan findes i byen, naar questen skal indleveres.</p>
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
          worldState={snapshot.worldState}
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
          setSnapshot={setSnapshot}
          onQuestCompleted={(result) => setQuestRewardModal(result)}
          cityStorageKey={gameSession.slot.cityStorageKey}
          regionCorruption={regionCorruption}
          onProgressChange={setCityProgressHud}
          onStartCityMobBattle={startCityMobBattle}
          skipMobProgressForVisit={skipCityMobProgressReturnId === snapshot.mapReturn?.id}
          onMobProgressSkipConsumed={() => setSkipCityMobProgressReturnId(null)}
          storageOpen={cityStorageOpen}
          onCloseStorage={() => setCityStorageOpen(false)}
          onClose={openWorldMapFromCity}
        />
      )}
      </>
      )}
      {appLoading.active && <AppLoadingScreen state={appLoading} />}
    </main>
  );
}
