import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY } from "./game/data.js";
import { GameEngine } from "./game/GameEngine.js";
import { loadAnimationSheets, loadGeneratedAtlas } from "./game/assets.js";
import { CITY_AREAS } from "./game/config/city-areas-config.js";
import { CITY_STATS_RULES } from "./game/config/city-stats-rules-config.js";
import { CITY_BUILDINGS } from "./game/config/city-buildings-config.js";
import { WORLD_MAP } from "./game/config/map-region-config.js";
import { incrementWorldCounter } from "./game/world-state.js";
import { CHEAT_SETTINGS, cheatGiveOptions, installValtoriaCheats } from "./game/config/cheat-config.js";
import { QUEST_NPCS } from "./game/config/npc-config.js";
import { PERFORMANCE_PROFILES, resolvePerformanceProfile } from "./game/config/performance-config.js";
import { QUEST_DEFS } from "./game/config/quest-config.js";
import { ACTION_CONFIG } from "./game/config/action-config.js";
import { saveRepository } from "./storage/saveRepository.js";
import { useLocalization } from "./i18n/index.js";
import { HelpDialog } from "./app/help/index.js";
import {
  calcThreatDeltaFromCityStats,
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
  QuestDetailCard,
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

const PERFORMANCE_MODE_STORAGE_KEY = "valtoria.performanceMode";
const PERFORMANCE_CUSTOM_STORAGE_KEY = "valtoria.performanceCustom.v1";
const LANGUAGE_SETTING = Object.freeze({
  id: "language_setting",
  label: "Language",
  description: "Choose the language used for help and game text.",
  i18n: Object.freeze({
    da: Object.freeze({
      label: "Sprog",
      description: "Vælg sproget til hjælp og spiltekst.",
    }),
  }),
});

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function normalizePerformanceSettings(input = {}) {
  const profile = resolvePerformanceProfile(input.mode ?? "auto");
  const custom = input.custom && typeof input.custom === "object" ? input.custom : {};
  return {
    mode: profile.id,
    useCustom: Boolean(input.useCustom),
    custom: {
      targetFps: clampNumber(custom.targetFps, 30, 60, profile.targetFps),
      ambientRenderFps: clampNumber(custom.ambientRenderFps, 4, 20, profile.ambientRenderFps ?? 12),
      minimapFps: clampNumber(custom.minimapFps, 1, 10, profile.minimapFps ?? 5),
      maxDpr: clampNumber(custom.maxDpr, 1, 2, profile.maxDpr),
      fogRenderScale: clampNumber(custom.fogRenderScale, 0.3, 1, profile.fogRenderScale),
      particleQuality: ["low", "medium", "high"].includes(custom.particleQuality) ? custom.particleQuality : profile.particleQuality,
      maxParticles: Math.floor(clampNumber(custom.maxParticles, 64, 1400, profile.maxParticles)),
      particlesEnabled: custom.particlesEnabled !== false,
      disableAmbientCritters: Boolean(custom.disableAmbientCritters ?? profile.disableAmbientCritters),
      lowPowerMode: Boolean(custom.lowPowerMode ?? profile.lowPowerMode),
    },
  };
}

function resolveRuntimePerformanceSettings(settings) {
  const normalized = normalizePerformanceSettings(settings);
  if (!normalized.useCustom) {
    const profile = resolvePerformanceProfile(normalized.mode);
    return {
      mode: profile.id,
      targetFps: profile.targetFps,
      ambientRenderFps: profile.ambientRenderFps ?? 12,
      minimapFps: profile.minimapFps ?? 5,
      maxDpr: profile.maxDpr,
      fogRenderScale: profile.fogRenderScale,
      particleQuality: profile.particleQuality,
      maxParticles: profile.maxParticles,
      disableAmbientCritters: profile.disableAmbientCritters,
      particlesEnabled: true,
      lowPowerMode: Boolean(profile.lowPowerMode),
      useCustom: false,
    };
  }
  return {
    mode: normalized.mode,
    ...normalized.custom,
    useCustom: true,
  };
}

function readPerformanceSettings() {
  if (typeof window === "undefined") return normalizePerformanceSettings({ mode: "auto", useCustom: false });
  const mode = window.localStorage?.getItem?.(PERFORMANCE_MODE_STORAGE_KEY) || "auto";
  try {
    const rawCustom = window.localStorage?.getItem?.(PERFORMANCE_CUSTOM_STORAGE_KEY);
    if (!rawCustom) return normalizePerformanceSettings({ mode, useCustom: false });
    const parsed = JSON.parse(rawCustom);
    return normalizePerformanceSettings({
      mode,
      useCustom: Boolean(parsed?.useCustom),
      custom: parsed?.custom ?? {},
    });
  } catch {
    return normalizePerformanceSettings({ mode, useCustom: false });
  }
}

function persistPerformanceSettings(settings) {
  if (typeof window === "undefined") return;
  const normalized = normalizePerformanceSettings(settings);
  window.localStorage?.setItem?.(PERFORMANCE_MODE_STORAGE_KEY, normalized.mode);
  window.localStorage?.setItem?.(PERFORMANCE_CUSTOM_STORAGE_KEY, JSON.stringify({
    useCustom: normalized.useCustom,
    custom: normalized.custom,
  }));
}

function cityAddonIds() {
  const entries = [];
  for (const building of CITY_BUILDINGS) {
    const buildingTitle = String(building?.title ?? building?.name ?? building?.label ?? building?.id ?? "Bygning").trim();
    for (const addon of building?.addons ?? []) {
      const id = String(addon?.id ?? "").trim();
      if (!id) continue;
      const addonTitle = String(addon?.title ?? addon?.name ?? addon?.label ?? id).trim() || id;
      entries.push({
        id,
        label: `${addonTitle} (${id}) - ${buildingTitle}`,
      });
    }
  }
  const byId = new Map();
  for (const entry of entries) {
    if (!byId.has(entry.id)) byId.set(entry.id, entry);
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, "da"));
}

export default function App() {
  const {
    language,
    setLanguage,
    supportedLanguages,
    localize,
    t,
  } = useLocalization();
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const minimapDynamicRef = useRef(null);
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
  const [toastLogOpen, setToastLogOpen] = useState(false);
  const [lastReadImportantToastId, setLastReadImportantToastId] = useState(null);
  const [confirmMapAbandonOpen, setConfirmMapAbandonOpen] = useState(false);
  const [cityStorageOpen, setCityStorageOpen] = useState(false);
  const [selectedCityStatId, setSelectedCityStatId] = useState(null);
  const [hoveredCityStatId, setHoveredCityStatId] = useState(null);
  const [citySettingsOpen, setCitySettingsOpen] = useState(false);
  const [helpState, setHelpState] = useState({ open: false, topicId: null });
  const [performanceSettings, setPerformanceSettings] = useState(() => readPerformanceSettings());
  const [settingsDraft, setSettingsDraft] = useState(() => readPerformanceSettings());
  const [cheatResetQuestId, setCheatResetQuestId] = useState(() => Object.keys(QUEST_DEFS ?? {})[0] ?? "");
  const [cheatClearCityTarget, setCheatClearCityTarget] = useState("all");
  const [cheatGiveSelection, setCheatGiveSelection] = useState(() => {
    const first = cheatGiveOptions()[0];
    return first ? `${first.type}:${first.id}` : "";
  });
  const [cheatGiveCount, setCheatGiveCount] = useState(1);
  const [cheatGiveLevel, setCheatGiveLevel] = useState(1);
  const [cityMinimapHero, setCityMinimapHero] = useState(null);
  const [cityProgressHud, setCityProgressHud] = useState(() => loadCityProgress());
  const [cityProgressRefreshToken, setCityProgressRefreshToken] = useState(0);
  const [skipCityMobProgressReturnId, setSkipCityMobProgressReturnId] = useState(null);
  const snapshotRef = useRef(emptySnapshot);
  const regionCorruptionRef = useRef(regionCorruption);
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

  const syncCityProgress = useCallback((progress, options = {}) => {
    if (engineRef.current) {
      engineRef.current.cityProgress = progress;
      engineRef.current.cityInventory = progress;
      engineRef.current.cityStorage = progress;
      engineRef.current.cityStats = calculateCityStats(progress, snapshotRef.current, regionCorruptionRef.current);
      if (engineRef.current.refreshQuestStepProgress?.()) {
        engineRef.current.publishSnapshot?.();
        engineRef.current.saveProgress?.({ force: true });
      }
    }
    setCityProgressHud(progress);
    if (options.refreshCityPage) setCityProgressRefreshToken((value) => value + 1);
  }, []);

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
    const runtimePerformance = resolveRuntimePerformanceSettings(performanceSettings);
    const engine = new GameEngine(canvasRef.current, setSnapshot, {
      saveStorageKey: slot.saveKey,
      newGame: gameSession.newGame,
      performanceMode: runtimePerformance.mode,
      lowPowerMode: runtimePerformance.lowPowerMode,
      disableAmbientCritters: runtimePerformance.disableAmbientCritters,
      maxDpr: runtimePerformance.maxDpr,
      targetFps: runtimePerformance.targetFps,
      ambientRenderFps: runtimePerformance.ambientRenderFps,
      minimapFps: runtimePerformance.minimapFps,
      fogRenderScale: runtimePerformance.fogRenderScale,
      particleQuality: runtimePerformance.particleQuality,
      maxParticles: runtimePerformance.maxParticles,
      particlesEnabled: runtimePerformance.particlesEnabled,
      useCustomPerformanceProfile: runtimePerformance.useCustom,
      cityStorageKey: slot.cityStorageKey,
      loadCityProgress,
      saveCityProgress,
      onCityProgressChange: (progress) => {
        syncCityProgress(progress, { refreshCityPage: true });
      },
      atlas: preloadedGameAssetsRef.current.atlas,
      animationSheets: preloadedGameAssetsRef.current.animationSheets,
      deferAssetLoad: true,
      onSave: (payload) => {
        if (!slot.legacy) upsertSaveSlot({ ...slot, updatedAt: payload?.savedAt ?? Date.now() });
        setSaveSlots(collectSaveSlots());
      },
    });
    engineRef.current = engine;
    if (typeof window !== "undefined") window.VALTORIA_ENGINE = engine;
    engine.start();
    if (gameSession.newGame) engine.saveProgress({ force: true });
    return () => {
      if (typeof window !== "undefined" && window.VALTORIA_ENGINE === engine) delete window.VALTORIA_ENGINE;
      engine.stop();
      engineRef.current = null;
    };
  }, [gameSession?.sessionId]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    regionCorruptionRef.current = regionCorruption;
  }, [regionCorruption]);

  useEffect(() => {
    installValtoriaCheats({
      getEngine: () => engineRef.current,
      getCityStorageKey: () => gameSessionRef.current?.slot?.cityStorageKey ?? CITY_STORAGE_KEY,
      getCityProgress: () => cityProgressHud,
      setCityProgress: setCityProgressHud,
      loadCityProgress,
      saveCityProgress,
      refreshCity: () => setCityProgressRefreshToken((value) => value + 1),
    });
  }, [cityProgressHud]);

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
      if (engineRef.current) {
        engineRef.current.worldState = incrementWorldCounter(
          engineRef.current.worldState,
          "cityMobGroupsDefeated.hero",
          1,
        );
        engineRef.current.saveProgress?.({ force: true });
        engineRef.current.publishSnapshot?.();
      }
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

    const cityStatThreatDelta = calcThreatDeltaFromCityStats(calculateCityStats(nextProgress, snapshotRef.current, nextRegionCorruption));
    if (cityStatThreatDelta !== 0) {
      const prev = Math.max(0, Math.min(100, Number(nextProgress.threatLevel) || 0));
      const next = Math.max(0, Math.min(100, prev + cityStatThreatDelta));
      if (next !== prev) {
        nextProgress = { ...nextProgress, threatLevel: next };
        cityProgressChanged = true;
      }
    }

    if (cityProgressChanged) {
      saveCityProgress(nextProgress, cityStorageKey);
      setCityProgressHud(nextProgress);
    }

    if (!isCityMobBattle) {
      setRegionCorruption(nextRegionCorruption);
      setRegionMapInitialId(mapReturn.areaMapId ?? WORLD_MAP.id);
    }
    clearToastLogForModeSwitch();
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
    const rise = calcThreatRiseOnDeath(
      Math.max(0, Math.min(1, Number(lastDeath.xpPct) || 0)),
      snapshot.player?.level,
    );
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
        const completedTalkQuests = engineRef.current?.advanceTalkToNpcQuests?.(snapshotRef.current.quests.nearbyQuestgiver.npcId) ?? [];
        if (completedTalkQuests.length > 0) {
          setQuestRewardModal(completedTalkQuests[0]);
          setQuestOffer(null);
          return;
        }
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
    setSelectedCityStatId(null);
    setHoveredCityStatId(null);
  }, [cityOpen]);

  useEffect(() => {
    if (!citySettingsOpen) return;
    setSettingsDraft(performanceSettings);
  }, [citySettingsOpen, performanceSettings]);

  useEffect(() => {
    const openHelp = (event) => {
      const topicId = String(event?.detail?.topicId ?? "").trim() || null;
      setHelpState({ open: true, topicId });
    };
    window.addEventListener("valtoria:open-help", openHelp);
    return () => window.removeEventListener("valtoria:open-help", openHelp);
  }, []);

  useEngineModalLock({
    acceptedQuestNotice,
    cityOpen,
    confirmMapAbandonOpen,
    engineRef,
    heroOpen,
    helpOpen: helpState.open,
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
    engineRef.current?.renderMinimap(minimapRef.current, minimapDynamicRef.current);
  }, [snapshot, cityOpen, cityMinimapHero]);

  useEffect(() => {
    if (!inventoryOpen) {
      setSelectedItem(null);
      setReadableDialog(null);
    }
  }, [inventoryOpen]);

  const player = snapshot.player;
  const importantToastLog = (snapshot.toastLog ?? []).filter((toast) => toast?.important);
  const lastReadImportantToastIndex = lastReadImportantToastId
    ? importantToastLog.findIndex((toast) => toast.id === lastReadImportantToastId)
    : -1;
  const toastLogUnreadCount = lastReadImportantToastId
    ? (lastReadImportantToastIndex >= 0 ? lastReadImportantToastIndex : importantToastLog.length)
    : importantToastLog.length;
  const openToastLog = () => {
    setLastReadImportantToastId(importantToastLog[0]?.id ?? null);
    setToastLogOpen(true);
  };
  useEffect(() => {
    if (!toastLogOpen) return;
    setLastReadImportantToastId(importantToastLog[0]?.id ?? null);
  }, [toastLogOpen, importantToastLog[0]?.id]);
  const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const manaPct = Math.max(0, Math.min(100, (player.mana / player.maxMana) * 100));
  const xpPct = Math.max(0, Math.min(100, (player.xp / player.nextXp) * 100));
  const derivedCityStats = useMemo(
    () => calculateCityStats(cityProgressHud, snapshot, regionCorruption),
    [cityProgressHud, snapshot, regionCorruption],
  );
  const effectivePopularity = Math.max(0, Math.min(100, Number(derivedCityStats.popularity) || 0));
  const popularityPct = effectivePopularity;
  const cityThreatLevel = Math.max(0, Math.min(100, Number(cityProgressHud?.threatLevel) || 0));
  const cityStatBreakdown = useMemo(
    () => calculateCityStatBreakdown(cityProgressHud, snapshot, regionCorruption),
    [cityProgressHud, snapshot, regionCorruption],
  );
  const cityHudStats = useMemo(() => CITY_STAT_DEFS.filter((stat) => stat.id !== "popularity").map((stat) => {
    const value = Math.max(0, Math.floor(Number(derivedCityStats[stat.id]) || 0));
    const need = Math.max(0, Math.floor(Number(derivedCityStats.needs?.[stat.id]) || 0));
    const ratio = derivedCityStats.ratios?.[stat.id] ?? null;
    const status = derivedCityStats.statuses?.[stat.id] ?? null;
    const configuredMax = CITY_STATS_RULES.displayMax?.[stat.id] ?? 500;
    const max = Math.max(1, Math.floor(Number(need || (typeof stat.max === "function" ? stat.max(snapshot) : stat.max ?? configuredMax)) || 1));
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const statLabel = localize(stat, "label");
    const statusLabels = localize(CITY_STATS_RULES.balance, "statusLabels") || CITY_STATS_RULES.balance?.statusLabels;
    const actionHints = localize(CITY_STATS_RULES.balance, "actionHints") || CITY_STATS_RULES.balance?.actionHints;
    const label = stat.id === "popularity" ? `${statLabel} ${Math.round(value)}%` : `${statLabel} ${value}`;
    return {
      ...stat,
      value,
      max,
      need,
      ratio,
      status,
      statusLabel: status ? statusLabels?.[status] : "",
      actionHint: actionHints?.[stat.id] ?? "",
      pct,
      label,
      classId: stat.classId ?? stat.id,
      breakdown: cityStatBreakdown[stat.id] ?? [],
    };
  }), [cityStatBreakdown, derivedCityStats, localize, snapshot]);
  const selectedCityStat = useMemo(
    () => cityHudStats.find((stat) => stat.id === selectedCityStatId) ?? null,
    [cityHudStats, selectedCityStatId],
  );
  const hoveredCityStat = useMemo(
    () => cityHudStats.find((stat) => stat.id === hoveredCityStatId) ?? null,
    [cityHudStats, hoveredCityStatId],
  );
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
  const profileOptions = useMemo(
    () => Object.values(PERFORMANCE_PROFILES),
    [],
  );
  const clearCityTargets = useMemo(() => {
    const base = [
      { value: "all", label: "Alle omraader + bygninger (all)" },
      { value: "allareas", label: "Alle omraader (allareas)" },
      { value: "allbuildings", label: "Alle bygninger (allbuildings)" },
      { value: "alladdons", label: "Alle addons (alladdons)" },
    ];
    const areaTargets = CITY_AREAS
      .map((entry) => {
        const id = String(entry?.id ?? "").trim();
        if (!id) return null;
        const title = String(entry?.title ?? entry?.name ?? entry?.label ?? id).trim() || id;
        return { value: id, label: `${title} (${id})` };
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label, "da"));
    const buildingTargets = CITY_BUILDINGS
      .map((entry) => {
        const id = String(entry?.id ?? "").trim();
        if (!id) return null;
        const title = String(entry?.title ?? entry?.name ?? entry?.label ?? id).trim() || id;
        return { value: id, label: `${title} (${id})` };
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label, "da"));
    const addonTargets = cityAddonIds().map((entry) => ({ value: entry.id, label: entry.label }));
    return [...base, ...areaTargets, ...buildingTargets, ...addonTargets];
  }, []);
  const questOptions = useMemo(() => (
    Object.keys(QUEST_DEFS ?? {})
      .map((id) => {
        const quest = QUEST_DEFS?.[id] ?? null;
        const title = String(quest?.title ?? quest?.name ?? id).trim() || id;
        return { value: id, label: `${title} (${id})` };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "da"))
  ), []);
  const giveOptions = useMemo(() => cheatGiveOptions(), []);
  const selectedGiveOption = useMemo(
    () => giveOptions.find((option) => `${option.type}:${option.id}` === cheatGiveSelection) ?? giveOptions[0] ?? null,
    [cheatGiveSelection, giveOptions],
  );

  const applyPerformanceSettings = (nextSettings) => {
    const normalized = normalizePerformanceSettings(nextSettings);
    const resolved = resolveRuntimePerformanceSettings(normalized);
    setPerformanceSettings(normalized);
    persistPerformanceSettings(normalized);
    const engine = engineRef.current;
    if (!engine) return;

    engine.setPerformanceMode?.(resolved.mode);
    engine.performanceMode = resolved.mode;
    engine.isCustomPerformanceProfile = Boolean(resolved.useCustom);
    engine.lowPowerMode = Boolean(resolved.lowPowerMode);
    engine.disableAmbientCritters = Boolean(resolved.disableAmbientCritters);
    engine.targetFps = clampNumber(resolved.targetFps, 30, 60, engine.targetFps ?? 50);
    engine.ambientRenderFps = clampNumber(resolved.ambientRenderFps, 4, 20, engine.ambientRenderFps ?? 12);
    engine.ambientRenderIntervalMs = 1000 / engine.ambientRenderFps;
    engine.minimapFps = clampNumber(resolved.minimapFps, 1, 10, engine.minimapFps ?? 5);
    engine.minimapIntervalMs = 1000 / engine.minimapFps;
    engine.maxDpr = clampNumber(resolved.maxDpr, 1, 2, engine.maxDpr ?? 1.25);
    engine.fogRenderScale = clampNumber(resolved.fogRenderScale, 0.3, 1, engine.fogRenderScale ?? 0.45);
    engine.setParticleQuality?.(resolved.particleQuality);
    if (engine.particleEngine) {
      engine.particleEngine.enabled = resolved.particlesEnabled !== false;
      engine.particleEngine.maxParticles = Math.max(64, Math.floor(Number(resolved.maxParticles) || 650));
      engine.particleEngine.pool.max = engine.particleEngine.maxParticles;
      while (engine.particleEngine.particles.length > engine.particleEngine.maxParticles) {
        const particle = engine.particleEngine.particles.pop();
        if (particle) engine.particleEngine.pool.release(particle);
      }
      if (!engine.particleEngine.enabled) engine.particleEngine.clearAll();
    }
    if (engine.disableAmbientCritters) engine.resetCritterRuntime?.();
    else engine.spawnAmbientCritters?.();
    engine.fogOverlayCanvas = null;
    engine.nextFrameTime = performance.now();
    engine.resize?.();
    engine.markRenderDirty?.("performance-settings");
    engine.publishSnapshot?.();
  };

  const runCheatCommand = (input, ...args) => {
    if (!CHEAT_SETTINGS.enabled) return;
    const cmd = window?.[CHEAT_SETTINGS.commandName] ?? (CHEAT_SETTINGS.exposeAlias ? window?.[CHEAT_SETTINGS.exposeAlias] : null);
    if (typeof cmd !== "function") {
      engineRef.current?.addToast?.("Cheat command ikke tilgaengelig");
      return;
    }
    const output = cmd(input, ...args);
    const message = output && typeof output === "object" ? output.message : "Cheat command koert";
    engineRef.current?.addToast?.(`Cheat: ${message}`);
  };

  const resolvedDraft = resolveRuntimePerformanceSettings(settingsDraft);

  const clearToastLogForModeSwitch = () => {
    engineRef.current?.clearToastLog?.();
    setToastLogOpen(false);
    setLastReadImportantToastId(null);
  };

  const startPlayableMapRegion = async (areaMapId, region) => {
    if (!areaMapId || !region?.id) return;
    const corrupted = getRegionCorruptionLevel(regionCorruption, areaMapId, region.id, region) > 0;
    const preparedRegion = engineRef.current?.prepareMapRegionConfig?.(areaMapId, region, { corrupted }) ?? region;
    const ready = await preloadWildernessAssets("Loading map", preparedRegion);
    if (!ready) return;
    const started = engineRef.current?.startMapRegion?.(areaMapId, preparedRegion);
    if (!started) return;
    clearToastLogForModeSwitch();
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
    clearToastLogForModeSwitch();
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

  const deleteSaveSlot = (slot) => {
    if (!slot) return;
    const key = slot.legacy ? slot.saveKey : slot.id;
    saveRepository.deleteSaveSync(key);
    setSaveSlots(collectSaveSlots());
  };

  const openWorldMapFromCity = () => {
    clearToastLogForModeSwitch();
    setRegionMapOpen(true);
    setMapOpen(false);
    setInventoryOpen(false);
    setHeroOpen(false);
    setCityOpen(true);
  };

  const handleOpenCityFromMap = () => {
    clearToastLogForModeSwitch();
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
          onDeleteSave={deleteSaveSlot}
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
        minimapDynamicRef={minimapDynamicRef}
        monsterHpPct={monsterHpPct}
        openWorldMapFromCity={openWorldMapFromCity}
        player={player}
        popularityPct={popularityPct}
        popularityValue={effectivePopularity}
        setConfirmMapAbandonOpen={setConfirmMapAbandonOpen}
        setCitySettingsOpen={setCitySettingsOpen}
        setHoveredCityStatId={setHoveredCityStatId}
        setSelectedCityStatId={setSelectedCityStatId}
        setCityStorageOpen={setCityStorageOpen}
        setHeroOpen={setHeroOpen}
        setInventoryOpen={setInventoryOpen}
        setMapOpen={setMapOpen}
        setQuestOverviewOpen={setQuestOverviewOpen}
        onOpenToastLog={openToastLog}
        setViewedQuest={setViewedQuest}
        snapshot={snapshot}
        toastLogUnreadCount={toastLogUnreadCount}
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
            <h2 id="city-settings-title">{t("panel.settings.title")}</h2>
            <p className="city-settings-note">Vaelg en performance-profil eller brug custom for finjustering. Aendringer aktiveres ved OK.</p>
            <div className="city-settings-section">
              <h3>{localize(LANGUAGE_SETTING, "label")}</h3>
              <p>{localize(LANGUAGE_SETTING, "description")}</p>
              <select
                aria-label={localize(LANGUAGE_SETTING, "label")}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {Object.values(supportedLanguages).map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="city-settings-section">
              <h3>Performance profil</h3>
              <label>
                Profil
                <select
                  value={settingsDraft.mode}
                  onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                    ...current,
                    mode: event.target.value,
                  }))}
                >
                  {profileOptions.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.label ?? profile.id}</option>
                  ))}
                </select>
              </label>
              <label className="city-settings-check">
                <input
                  type="checkbox"
                  checked={settingsDraft.useCustom}
                  onChange={(event) => setSettingsDraft((current) => ({
                    ...current,
                    useCustom: event.target.checked,
                  }))}
                />
                Brug custom profil
              </label>
            </div>

            {settingsDraft.useCustom && (
              <div className="city-settings-section city-settings-grid">
                <h3>Custom profil</h3>
                <label>
                  Target FPS
                  <input
                    type="number"
                    min="30"
                    max="60"
                    step="1"
                    value={resolvedDraft.targetFps}
                    onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                      ...current,
                      custom: { ...current.custom, targetFps: Number(event.target.value) },
                    }))}
                  />
                </label>
                <label>
                  Ambient FPS
                  <input
                    type="number"
                    min="4"
                    max="20"
                    step="1"
                    value={resolvedDraft.ambientRenderFps}
                    onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                      ...current,
                      custom: { ...current.custom, ambientRenderFps: Number(event.target.value) },
                    }))}
                  />
                </label>
                <label>
                  Minimap FPS
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={resolvedDraft.minimapFps}
                    onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                      ...current,
                      custom: { ...current.custom, minimapFps: Number(event.target.value) },
                    }))}
                  />
                </label>
                <label>
                  Max DPR
                  <input
                    type="number"
                    min="1"
                    max="2"
                    step="0.05"
                    value={resolvedDraft.maxDpr}
                    onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                      ...current,
                      custom: { ...current.custom, maxDpr: Number(event.target.value) },
                    }))}
                  />
                </label>
                <label>
                  Fog Scale
                  <input
                    type="number"
                    min="0.3"
                    max="1"
                    step="0.05"
                    value={resolvedDraft.fogRenderScale}
                    onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                      ...current,
                      custom: { ...current.custom, fogRenderScale: Number(event.target.value) },
                    }))}
                  />
                </label>
                <label>
                  Particle quality
                  <select
                    value={resolvedDraft.particleQuality}
                    onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                      ...current,
                      custom: { ...current.custom, particleQuality: event.target.value },
                    }))}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </label>
                <label>
                  Max particles
                  <input
                    type="number"
                    min="64"
                    max="1400"
                    step="10"
                    value={resolvedDraft.maxParticles}
                    onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                      ...current,
                      custom: { ...current.custom, maxParticles: Number(event.target.value) },
                    }))}
                  />
                </label>
                <label className="city-settings-check">
                  <input
                    type="checkbox"
                    checked={resolvedDraft.particlesEnabled}
                    onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                      ...current,
                      custom: { ...current.custom, particlesEnabled: event.target.checked },
                    }))}
                  />
                  Partikler enabled
                </label>
                <label className="city-settings-check">
                  <input
                    type="checkbox"
                    checked={resolvedDraft.disableAmbientCritters}
                    onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                      ...current,
                      custom: { ...current.custom, disableAmbientCritters: event.target.checked },
                    }))}
                  />
                  Disable ambient critters
                </label>
                <label className="city-settings-check">
                  <input
                    type="checkbox"
                    checked={resolvedDraft.lowPowerMode}
                    onChange={(event) => setSettingsDraft((current) => normalizePerformanceSettings({
                      ...current,
                      custom: { ...current.custom, lowPowerMode: event.target.checked },
                    }))}
                  />
                  Low power mode
                </label>
              </div>
            )}

            {CHEAT_SETTINGS.enabled && (
              <div className="city-settings-section">
                <h3>Cheats</h3>
                <div className="city-settings-cheat-grid">
                  <button type="button" onClick={() => runCheatCommand("clearBestiary")}>clearBestiary</button>
                  <button type="button" onClick={() => runCheatCommand("clearCityMobs")}>clearCityMobs</button>
                  <button type="button" onClick={() => runCheatCommand("resetAllQuests")}>resetAllQuests</button>
                  <button type="button" onClick={() => runCheatCommand("repairCityBuildings")}>repairCityBuildings</button>
                  <button type="button" onClick={() => runCheatCommand("repairCityAreas")}>repairCityAreas</button>
                  <button type="button" onClick={() => runCheatCommand("prebuilt", "on")}>prebuilt on</button>
                  <button type="button" onClick={() => runCheatCommand("prebuilt", "off")}>prebuilt off</button>
                </div>

                <div className="city-settings-cheat-inline">
                  <label>
                    resetQuest
                    <select value={cheatResetQuestId} onChange={(event) => setCheatResetQuestId(event.target.value)}>
                      {questOptions.map((quest) => (
                        <option key={quest.value} value={quest.value}>{quest.label}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!cheatResetQuestId) return;
                      runCheatCommand("resetQuest", cheatResetQuestId);
                    }}
                  >
                    Koer resetQuest
                  </button>
                </div>

                <div className="city-settings-cheat-inline">
                  <label>
                    clearCity
                    <select value={cheatClearCityTarget} onChange={(event) => setCheatClearCityTarget(event.target.value)}>
                      {clearCityTargets.map((target) => (
                        <option key={`${target.value}:${target.label}`} value={target.value}>{target.label}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => runCheatCommand("clearCity", cheatClearCityTarget)}>Koer clearCity</button>
                </div>

                <div className="city-settings-cheat-inline city-settings-cheat-give">
                  <label>
                    give
                    <select value={cheatGiveSelection} onChange={(event) => setCheatGiveSelection(event.target.value)}>
                      {giveOptions.map((option) => (
                        <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    antal
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      step="1"
                      value={cheatGiveCount}
                      onChange={(event) => setCheatGiveCount(Math.max(1, Math.min(9999, Math.floor(Number(event.target.value) || 1))))}
                    />
                  </label>
                  <label>
                    level
                    <input
                      type="number"
                      min="1"
                      max="999"
                      step="1"
                      disabled={!selectedGiveOption?.levelable}
                      value={cheatGiveLevel}
                      onChange={(event) => setCheatGiveLevel(Math.max(1, Math.min(999, Math.floor(Number(event.target.value) || 1))))}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedGiveOption) return;
                      runCheatCommand("give", selectedGiveOption.type, selectedGiveOption.id, cheatGiveCount, cheatGiveLevel);
                    }}
                  >
                    Koer give
                  </button>
                </div>
              </div>
            )}
            <div className="city-settings-actions">
              <button type="button" onClick={() => setCitySettingsOpen(false)}>{t("ui.cancel")}</button>
              <button
                type="button"
                onClick={() => {
                  applyPerformanceSettings(settingsDraft);
                  setCitySettingsOpen(false);
                }}
              >
                {t("ui.ok")}
              </button>
            </div>
          </section>
        </div>
      )}

      {questOverviewOpen && (
        <QuestOverviewDialog
          activeQuests={activeQuests}
          completedQuestIds={snapshot.quests?.completed ?? []}
          onClose={() => setQuestOverviewOpen(false)}
          onToggleTracked={(questId, tracked) => engineRef.current?.setQuestTracked?.(questId, tracked)}
          onAbandonQuest={(quest) => engineRef.current?.abandonQuest?.(quest.id)}
          onOpenQuest={(quest) => {
            setViewedQuest(quest);
            setQuestOverviewOpen(false);
          }}
        />
      )}

      {toastLogOpen && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog toast-log-dialog" role="dialog" aria-modal="true" aria-labelledby="toast-log-title">
            <header className="toast-log-head">
              <h2 id="toast-log-title">{t("panel.messageLog.title")}</h2>
              <button type="button" onClick={() => setToastLogOpen(false)}>{t("ui.close")}</button>
            </header>
            <div className="toast-log-list">
              {(snapshot.toastLog ?? []).length <= 0 ? (
                <p>Ingen beskeder endnu.</p>
              ) : (snapshot.toastLog ?? []).map((toast) => (
                <div className={`toast-log-row ${String(toast.kind ?? "").startsWith("quest") ? "quest" : ""}`} key={toast.id}>
                  <time>
                    {toast.createdAt
                      ? new Date(toast.createdAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                      : "--.--.--"}
                  </time>
                  <span>-</span>
                  <p>{toast.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
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
          <div className={`toast ${String(toast.kind ?? "").startsWith("quest") ? "quest" : ""}`} key={toast.id}>
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
              } else if (mergeChoice.type === "potion-choice") {
                engineRef.current?.mergeInventoryPotionWithRecipe?.(current.index, output);
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

      {snapshot.nearbyActionTarget && !snapshot.quests?.nearbyQuestgiver && !cityOpen && !questOffer && (
        <div className="city-interact-prompt wilderness-prompt">
          Press <b>E</b> to {localize(ACTION_CONFIG[snapshot.nearbyActionTarget.actionId], "label") || snapshot.nearbyActionTarget.label}
          {snapshot.nearbyActionTarget.targetCount > 1 && (
            <span> · <b>Tab</b> skift {snapshot.nearbyActionTarget.targetIndex}/{snapshot.nearbyActionTarget.targetCount}</span>
          )}
        </div>
      )}

      {snapshot.nearbyFoliageLoot && !snapshot.quests?.nearbyQuestgiver && !snapshot.nearbyActionTarget && !cityOpen && !questOffer && (
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
              quest: { ...quest, npcId: quest.npcId ?? questOffer.npcId },
            });
            if (accepted) setAcceptedQuestNotice({ npcId: questOffer.npcId, quest });
            else engineRef.current?.addToast?.("Quest kunne ikke tages");
            engineRef.current?.publishSnapshot?.();
            setQuestOffer(null);
          }}
          onTurnInQuest={(quest) => {
            const result = engineRef.current?.completeQuest?.(quest.id ?? quest.questId, questOffer.npcId);
            if (result?.ok) {
              setQuestRewardModal(result);
              setQuestOffer(null);
            } else {
              engineRef.current?.addToast?.("Quest kunne ikke indleveres");
              engineRef.current?.publishSnapshot?.();
            }
          }}
          onAbandonQuest={(quest) => {
            const abandoned = engineRef.current?.abandonQuest?.(quest.id);
            if (abandoned) setQuestOffer(null);
          }}
        />
      )}

      {viewedQuest && (
        <QuestDetailDialog
          quest={viewedQuest}
          engineRef={engineRef}
          onClose={() => setViewedQuest(null)}
          onQuestCompleted={(result) => setQuestRewardModal(result)}
          onQuestAbandoned={() => setViewedQuest(null)}
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
        <QuestDetailCard
          quest={{
            ...(questRewardModal.questInfo ?? {}),
            title: questRewardModal.questTitle ?? questRewardModal.questInfo?.title ?? "Quest reward",
            rewards: questRewardModal.rewards ?? questRewardModal.questInfo?.rewards ?? {},
          }}
          npc={QUEST_NPCS[questRewardModal.questInfo?.turnInNpcId ?? questRewardModal.questInfo?.npcId]}
          onClose={() => setQuestRewardModal(null)}
          footer={<button type="button" onClick={() => setQuestRewardModal(null)}>OK</button>}
        />
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
          worldEnergy={snapshot.worldEnergy}
          activeQuests={snapshot.quests?.active ?? []}
          completedQuests={snapshot.quests?.completed ?? []}
          army={snapshot.player?.stats?.army ?? 0}
          onPlayableRegionSelected={startPlayableMapRegion}
          onCityOpen={handleOpenCityFromMap}
          onMapNavigation={(mapId) => setRegionMapInitialId(mapId)}
          onClose={() => setRegionMapOpen(false)}
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
          cityProgressRefreshToken={cityProgressRefreshToken}
          regionCorruption={regionCorruption}
          hoveredCityStat={hoveredCityStat}
          selectedCityStat={selectedCityStat}
          onClearSelectedCityStat={() => setSelectedCityStatId(null)}
          onProgressChange={syncCityProgress}
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
      {(appLoading.active || snapshot.subregionTransition?.active) && (
        <AppLoadingScreen state={appLoading.active ? appLoading : snapshot.subregionTransition} />
      )}
      {helpState.open && (
        <HelpDialog
          topicId={helpState.topicId}
          onClose={() => setHelpState({ open: false, topicId: null })}
        />
      )}
    </main>
  );
}
