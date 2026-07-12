import assert from "node:assert/strict";
import { resolveMapRegionConfig, resolveRegionAudio } from "../src/game/world-state.js";
import { audioManager } from "../src/game/audio-manager.js";

const context = {
  regionId: "audio-test",
  questState: { active: [], completed: ["restore_the_forest"] },
};
const corruptWorldState = { flags: {}, counters: {}, values: { "region.audio-test.corruptionLevel": 7 } };
const normalWorldState = { flags: {}, counters: {}, values: { "region.audio-test.corruptionLevel": 2 } };

const directAudio = { musicProfile: "forest", ambience: ["forest_ambience", "river_ambience"] };
assert.deepEqual(resolveMapRegionConfig({ id: "audio-test", audio: directAudio }, normalWorldState, context).audio, directAudio);

const variantsAudio = {
  value: { musicProfile: "forest", ambience: ["forest_ambience"] },
  variants: [{ corruption: { min: 5 }, value: { musicProfile: "forest_corrupted", ambience: ["dark_forest_ambience"] } }],
};
assert.deepEqual(resolveRegionAudio(variantsAudio, corruptWorldState, context), { musicProfile: "forest_corrupted", ambience: ["dark_forest_ambience"] });
assert.deepEqual(resolveRegionAudio(variantsAudio, normalWorldState, context), { musicProfile: "forest", ambience: ["forest_ambience"] });

const shorthandAudio = [
  { musicProfile: "corrupt", ambience: ["dark_forest_ambience"], corruption: { min: 5 } },
  { musicProfile: "normal", ambience: ["forest_ambience"] },
];
assert.deepEqual(resolveRegionAudio(shorthandAudio, corruptWorldState, context), { musicProfile: "corrupt", ambience: ["dark_forest_ambience"] });
assert.deepEqual(resolveRegionAudio(shorthandAudio, normalWorldState, context), { musicProfile: "normal", ambience: ["forest_ambience"] });

const firstMatchAudio = [
  { musicProfile: "doomed", corruption: { min: 9 } },
  { musicProfile: "corrupt", corruption: { min: 5 } },
];
const doomedWorldState = { flags: {}, counters: {}, values: { "region.audio-test.corruptionLevel": 10 } };
assert.deepEqual(resolveRegionAudio(firstMatchAudio, doomedWorldState, context), { musicProfile: "doomed" });
assert.equal(resolveRegionAudio([{ musicProfile: "corrupt", corruption: { min: 5 } }], normalWorldState, context), null);

const combinedAudio = [
  { musicProfile: "restored", corruption: { max: 2 }, questCompleted: "restore_the_forest" },
  { musicProfile: "normal" },
];
assert.deepEqual(resolveRegionAudio(combinedAudio, normalWorldState, context), { musicProfile: "restored" });
assert.deepEqual(resolveRegionAudio(combinedAudio, { ...normalWorldState, values: { "region.audio-test.corruptionLevel": 3 } }, context), { musicProfile: "normal" });

const nestedAudio = [{
  musicProfile: "nested",
  all: [{ corruption: { min: 5 } }, { any: [{ questCompleted: "restore_the_forest" }, { flag: "never" }] }],
  not: { flag: "blocked" },
}];
assert.deepEqual(resolveRegionAudio(nestedAudio, corruptWorldState, context), { musicProfile: "nested" });
const stripped = resolveRegionAudio([{ musicProfile: "clean", corruption: { min: 5 }, questCompleted: "restore_the_forest", all: [], any: [{ corruption: { min: 5 } }], not: { flag: "blocked" } }], corruptWorldState, context);
assert.deepEqual(stripped, { musicProfile: "clean" });

const selectedRegion = resolveMapRegionConfig({ id: "audio-test", audio: shorthandAudio }, corruptWorldState, context);
const originalPreload = audioManager.preload;
let preloadedIds = [];
audioManager.preload = (ids) => { preloadedIds = ids; };
audioManager.preloadRegion(selectedRegion);
audioManager.preload = originalPreload;
assert.deepEqual(preloadedIds, ["dark_forest_ambience"]);

audioManager.unlocked = false;
const playableAudio = { ...selectedRegion.audio, musicProfile: "forest", ambience: ["forest_ambience"] };
audioManager.setRegionAudio(playableAudio);
audioManager.setRegionAudio(playableAudio);
assert.deepEqual(audioManager.desiredAmbience, ["forest_ambience"]);
assert.equal(audioManager.desiredMusic?.trackId, "forest_exploration_01");
audioManager.stopMusic({ fadeMs: 0 });
audioManager.stopAmbience();

console.log("[test-region-audio-config] OK");
