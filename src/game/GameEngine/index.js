import { createRegion, isRegionPointPlayable, AUTOSAVE_INTERVAL_SECONDS, WORLD_SEED } from "./dependencies.js";

import { lifecycleMethods } from "./methods/lifecycle.js";
import { effectsMethods } from "./methods/effects.js";
import { regionMethods } from "./methods/region.js";
import { regionStatsMethods } from "./methods/region-stats.js";
import { combatMethods } from "./methods/combat.js";
import { lootMethods } from "./methods/loot.js";
import { questsMethods } from "./methods/quests.js";
import { inventoryMethods } from "./methods/inventory.js";
import { persistenceMethods } from "./methods/persistence.js";
import { renderingMethods } from "./methods/rendering.js";
import { inputMethods } from "./methods/input.js";
import { snapshotMethods } from "./methods/snapshot.js";
import { actionsMethods } from "./methods/actions.js";
import { subregionMethods } from "./methods/subregions.js";
import { critterMethods } from "./methods/critters.js";
import { normalizeWorldState } from "../world-state.js";
import { normalizeWorldEnergy } from "../world-energy.js";
import { ParticleEngine } from "../particles/ParticleEngine.js";
import { resolvePerformanceProfile } from "../config/performance-config.js";

function applyMethodGroup(prototype, methods) {
  Object.defineProperties(prototype, Object.getOwnPropertyDescriptors(methods));
}

export class GameEngine {
  constructor(canvas, onSnapshot, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSnapshot = onSnapshot;
    this.saveStorageKey = options.saveStorageKey;
    this.onSave = typeof options.onSave === "function" ? options.onSave : null;
    this.newGame = Boolean(options.newGame);
    this.deferAssetLoad = Boolean(options.deferAssetLoad);
    const performanceProfile = resolvePerformanceProfile(options.performanceMode);
    this.performanceMode = performanceProfile.id;
    this.lowPowerMode = Boolean(options.lowPowerMode);
    this.disableAmbientCritters = Boolean(options.disableAmbientCritters || performanceProfile.disableAmbientCritters);
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.maxDpr = Math.max(1, Math.min(2, Number(options.maxDpr) || performanceProfile.maxDpr));
    this.targetFps = Math.max(30, Math.min(60, Number(options.targetFps) || performanceProfile.targetFps));
    this.fogRenderScale = Math.max(0.35, Math.min(1, Number(options.fogRenderScale) || performanceProfile.fogRenderScale));
    this.lastTime = performance.now();
    this.fpsWindowTime = 0;
    this.fpsWindowFrames = 0;
    this.averageFps = 0;
    this.time = 0;
    this.frame = 0;
    this.raf = 0;
    this.keys = new Set();
    this.chunks = new Map();
    this.monsters = new Map();
    this.currentRegionStats = null;
    this.critters = new Map();
    this.critterStats = { alive: 0, rendered: 0, updated: 0, killed: 0, drawCalls: 0 };
    this.loots = [];
    this.projectiles = [];
    this.groundHazards = [];
    this.particles = [];
    this.particleEngine = new ParticleEngine({
      maxParticles: options.maxParticles ?? performanceProfile.maxParticles,
      quality: options.particleQuality ?? performanceProfile.particleQuality,
      enabled: options.particlesEnabled !== false,
    });
    this.floaters = [];
    this.toasts = [];
    this.toastTimers = new Map();
    this.potionCooldown = 0;
    this.nearbyFoliageLoot = null;
    this.nearbyActionTarget = null;
    this.fogExploredTiles = new Set();
    this.fogVisibleTiles = new Set();
    this.fogExploredPoints = [];
    this.fogExploredPointKeys = new Set();
    this.fogLastReveal = { x: null, y: null, regionId: null };
    this.regionIndex = 1;
    // Use a stable base region at boot so reload never drops the player into a random biome.
    this.region = createRegion(this.regionIndex, WORLD_SEED, "mainland");
    this.activeMapRegion = null;
    this.mapRegionCheckpoint = null;
    this.mapReturn = null;
    this.mapReturnSerial = 0;
    this.lastDeath = null;
    this.deathSerial = 0;
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.camera = { offsetX: 0, offsetY: 0, targetOffsetX: 0, targetOffsetY: 0, shake: 0 };
    this.pointer = { x: 0, y: 0, worldX: this.region.start.x, worldY: this.region.start.y, down: false };
    this.hoverMonsterId = null;
    this.nearbyQuestgiver = null;
    this.inputLocked = false;
    this.paused = false;
    this.readableMergeStation = "backpack";
    this.player = this.createPlayer({ empty: this.newGame });
    this.regionStartPlayerLevel = this.player.level;
    this.eliteMonsterCount = 0;
    this.questState = {
      active: [],
      completed: [],
      cityOfferRolls: {},
      questBoards: {},
      wildernessNpc: null,
      cityFade: [],
    };
    this.worldState = normalizeWorldState();
    this.worldEnergy = normalizeWorldEnergy();
    this.actionState = { completedActions: {}, objectStates: {} };
    this.currentExpedition = null;
    this.currentMapInstanceId = null;
    if (!this.newGame) this.loadProgress();
    this.prepareRegionQuestgiver();
    this.regionStartPlayerLevel = this.player.level;
    if (!isRegionPointPlayable(this.region, this.player.x, this.player.y, this.player.radius)) {
      this.placePlayerAtRegionStart();
    }
    this.pointer.worldX = this.player.x;
    this.pointer.worldY = this.player.y;
    this.snapshotTimer = 0;
    this.autosaveTimer = AUTOSAVE_INTERVAL_SECONDS;
    this.ambientTimer = 0;
    this.atlas = options.atlas ?? null;
    this.animationSheets = options.animationSheets ?? null;
  
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }
}

for (const methods of [
  lifecycleMethods,
  effectsMethods,
  regionMethods,
  regionStatsMethods,
  combatMethods,
  lootMethods,
  questsMethods,
  inventoryMethods,
  persistenceMethods,
  renderingMethods,
  inputMethods,
  actionsMethods,
  subregionMethods,
  critterMethods,
  snapshotMethods,
]) {
  applyMethodGroup(GameEngine.prototype, methods);
}
