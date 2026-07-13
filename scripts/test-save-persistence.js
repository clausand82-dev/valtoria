import assert from "node:assert/strict";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.has(String(key)) ? storage.get(String(key)) : null,
  setItem: (key, value) => storage.set(String(key), String(value)),
  removeItem: (key) => storage.delete(String(key)),
};

const { localSaveRepository } = await import("../src/storage/localSaveRepository.js");
const { SAVE_VERSION } = await import("../src/game/config/game-engine-config.js");
const { persistenceMethods } = await import("../src/game/GameEngine/methods/persistence.js");
const { lifecycleMethods } = await import("../src/game/GameEngine/methods/lifecycle.js");
const { saveRepository } = await import("../src/storage/saveRepository.js");

const roundtripKey = "test-save-roundtrip";
const roundtripPayload = { version: SAVE_VERSION, seed: 7341, savedAt: 1, player: { level: 2 } };
assert.equal(localSaveRepository.saveGameSync(roundtripKey, roundtripPayload), true);
assert.deepEqual(localSaveRepository.loadSaveSync(roundtripKey), roundtripPayload);
localStorage.setItem("test-save-legacy", JSON.stringify({ ...roundtripPayload, version: SAVE_VERSION - 1 }));
assert.equal(localSaveRepository.loadSaveSync("test-save-legacy"), null, "unsupported save versions must remain rejected");

function makeEngine() {
  return {
    saveStorageKey: "test-save-engine",
    activeMapRegion: null,
    currentExpedition: null,
    player: {
      id: 1, x: 4, y: 5, facingX: 1, facingY: 0, level: 1, xp: 0, gold: 0, popularity: 0,
      factionRep: {}, potions: {}, quickSlots: {}, readableBonuses: {}, questStatBonuses: {}, skillTree: {},
      classId: "adventurer", classPoints: 0, classNodes: [], unlockedSpells: [], activeSpellId: null,
      autoLoot: {}, stats: { killsByMonster: {} }, hp: 10, mana: 10, attackCooldown: 0, spellCooldown: 0,
      hurtCooldown: 0, attackAnim: 0, castAnim: 0, gait: 0, moveSpeed: 0, deadTimer: 0,
      inventory: [], equipment: {},
    },
    questState: { active: [], completed: [], questBoards: {} },
    worldState: { flags: {}, counters: {}, values: {} },
    worldEnergy: {}, actionState: { completedActions: {}, objectStates: {} }, loots: [],
    saveDirty: true, saveDirtyReasons: { test: true }, saveDiagnostics: {}, cleanupUpdateTimings: {},
    serializeItemForSave: persistenceMethods.serializeItemForSave,
    currentSaveStorageKey: persistenceMethods.currentSaveStorageKey,
    autosaveStateSignature: persistenceMethods.autosaveStateSignature,
    warnPerformanceThreshold() {},
  };
}

const engine = makeEngine();
const originalSaveSerialized = saveRepository.saveGameSerializedSync;
let writes = 0;
saveRepository.saveGameSerializedSync = (key, serialized) => {
  writes += 1;
  localStorage.setItem(key, serialized);
  return true;
};
try {
  assert.equal(persistenceMethods.saveProgress.call(engine, { reason: "autosave" }), true);
  assert.equal(writes, 1);
  assert.equal(engine.saveDirty, false);
  assert.equal(persistenceMethods.saveProgress.call(engine, { reason: "autosave" }), false, "clean autosaves must not serialize or write");
  assert.equal(writes, 1);
  assert.equal(engine.saveDiagnostics.skippedClean, 1);

  engine.player.gold = 9;
  assert.equal(persistenceMethods.saveProgress.call(engine, { reason: "autosave" }), true, "autosave must capture changed persisted player state");
  assert.equal(writes, 2);
  assert.equal(JSON.parse(localStorage.getItem(engine.saveStorageKey)).player.gold, 9, "autosave must flush the latest state");

  engine.player.gold = 10;
  engine.saveDirty = true;
  engine.saveDirtyReasons = { gold: true };
  assert.equal(persistenceMethods.saveProgress.call(engine, { force: true, reason: "manual-save" }), true, "manual save must force a flush");
  assert.equal(writes, 3);

  engine.player.gold = 11;
  engine.saveDirty = true;
  saveRepository.saveGameSerializedSync = () => false;
  assert.equal(persistenceMethods.saveProgress.call(engine, { force: true, reason: "pagehide" }), false);
  assert.equal(engine.saveDirty, true, "failed writes must retain pending dirty state");
  assert.equal(engine.saveDirtyReasons["write-failed"], true);
} finally {
  saveRepository.saveGameSerializedSync = originalSaveSerialized;
}

let scheduled = null;
let savedValue = null;
const autosaveEngine = {
  pendingAutosaveTimer: null,
  value: 1,
  saveProgress() { savedValue = this.value; return true; },
};
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
globalThis.setTimeout = (callback) => {
  scheduled = callback;
  return 1;
};
globalThis.clearTimeout = () => {};
try {
  assert.equal(lifecycleMethods.scheduleAutosave.call(autosaveEngine), true);
  assert.equal(lifecycleMethods.scheduleAutosave.call(autosaveEngine), false, "only one autosave callback may be pending");
  autosaveEngine.value = 2;
  scheduled();
  assert.equal(savedValue, 2, "the coalesced autosave must capture the later state");
} finally {
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
}

const originalDocument = globalThis.document;
const criticalReasons = [];
globalThis.document = { hidden: true };
try {
  const criticalSaveEngine = { saveProgress: (options) => criticalReasons.push(options) };
  lifecycleMethods.handleDocumentVisibilityChange.call(criticalSaveEngine);
  lifecycleMethods.handlePageHide.call(criticalSaveEngine);
  assert.deepEqual(criticalReasons, [
    { force: true, reason: "visibility-hidden" },
    { force: true, reason: "pagehide" },
  ]);
} finally {
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}

console.log("[save-persistence] roundtrip, version guard, clean autosave skip, force flush, lifecycle flush, failed write retry and coalescing OK");
