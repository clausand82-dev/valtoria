import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveMapRegionConfig, resolveRegionAudio } from "../src/game/world-state.js";
import { audioManager } from "../src/game/audio-manager.js";
import { MUSIC_PROFILES, MUSIC_TRACKS } from "../src/game/config/music-config.js";
import { MAP_REGION_SETS } from "../src/game/config/map-region-config.js";

const context = {
  regionId: "audio-test",
  questState: { active: [], completed: ["restore_the_forest"] },
};
const corruptWorldState = { flags: {}, counters: {}, values: { "region.audio-test.corruptionLevel": 7 } };
const normalWorldState = { flags: {}, counters: {}, values: { "region.audio-test.corruptionLevel": 2 } };

const requiredEnvironmentalProfiles = [
  "forest", "forest_dark", "mainland_paths", "fields", "village", "village_lively", "village_troubled",
  "riverlands", "ancient_shrine", "ruined_outpost", "cellar", "deep_dungeon", "dungeon_danger", "rocky_highlands",
];
const requiredCityThreatTracks = ["city_threat_low_01", "city_threat_high_01", "city_threat_very_high_01"];
assert.equal(new Set(Object.keys(MUSIC_TRACKS)).size, Object.keys(MUSIC_TRACKS).length, "music track ids must be unique");
assert.equal(new Set(Object.keys(MUSIC_PROFILES)).size, Object.keys(MUSIC_PROFILES).length, "music profile ids must be unique");
for (const profileId of requiredEnvironmentalProfiles) {
  const track = MUSIC_TRACKS[MUSIC_PROFILES[profileId]?.trackId];
  assert.ok(track, `music profile "${profileId}" must resolve to a track`);
  assert.equal(track.bus, "music", `music profile "${profileId}" must use the music bus`);
  assert.equal(track.rotateVariants, true, `music profile "${profileId}" must rotate its variants`);
  assert.ok(track.files?.length > 1, `music profile "${profileId}" must have multiple files`);
}
for (const trackId of requiredCityThreatTracks) {
  const track = MUSIC_TRACKS[trackId];
  assert.equal(track?.files?.length, 4, `city threat track "${trackId}" must retain both old and both new variants`);
  assert.equal(track.rotateVariants, true, `city threat track "${trackId}" must rotate its variants`);
}
for (const [trackId, track] of Object.entries(MUSIC_TRACKS)) {
  for (const path of track.files ?? (track.file ? [track.file] : [])) {
    const diskPath = fileURLToPath(new URL(`../public${path}`, import.meta.url));
    assert.ok(existsSync(diskPath), `music track "${trackId}" references missing file ${path}`);
  }
}
const environmentDirectory = fileURLToPath(new URL("../public/audio/music/environment/", import.meta.url));
const referencedMusicFiles = new Set(Object.values(MUSIC_TRACKS).flatMap((track) => track.files ?? (track.file ? [track.file] : [])));
for (const fileName of readdirSync(environmentDirectory).filter((fileName) => fileName.endsWith(".mp3"))) {
  assert.ok(referencedMusicFiles.has(`/audio/music/environment/${fileName}`), `environment music file "${fileName}" is not assigned to a track`);
}
for (const profileId of Object.keys(MUSIC_PROFILES)) {
  assert.ok(MUSIC_TRACKS[MUSIC_PROFILES[profileId].trackId], `music profile "${profileId}" references a missing track`);
}

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

const villageOutskirts = MAP_REGION_SETS["village-outskirts"];
assert.ok(villageOutskirts.every((region) => region.audio), "every Village Outskirts region must define audio");
const marketSquare = villageOutskirts.find((region) => region.id === "market-square");
const marketSquareCorruptState = { flags: {}, counters: {}, values: { "region.market-square.corruptionLevel": 7 } };
const marketSquareNormalState = { flags: {}, counters: {}, values: { "region.market-square.corruptionLevel": 2 } };
assert.equal(resolveRegionAudio(marketSquare.audio, marketSquareCorruptState, { ...context, regionId: "market-square", regionConfig: marketSquare }).musicProfile, "village_troubled");
assert.equal(resolveRegionAudio(marketSquare.audio, marketSquareNormalState, { ...context, regionId: "market-square", regionConfig: marketSquare }).musicProfile, "village");
const forest = villageOutskirts.find((region) => region.id === "the-forest");
const forestCorruptState = { flags: {}, counters: {}, values: { "region.the-forest.corruptionLevel": 7 } };
const forestNormalState = { flags: {}, counters: {}, values: { "region.the-forest.corruptionLevel": 2 } };
assert.equal(resolveRegionAudio(forest.audio, forestCorruptState, { ...context, regionId: "the-forest", regionConfig: forest }).musicProfile, "forest_dark");
assert.equal(resolveRegionAudio(forest.audio, forestNormalState, { ...context, regionId: "the-forest", regionConfig: forest }).musicProfile, "forest");
const lookoutPost = villageOutskirts.find((region) => region.id === "lookout-post");
assert.equal(resolveRegionAudio(lookoutPost.audio, normalWorldState, { ...context, regionId: "lookout-post", regionConfig: lookoutPost, questState: { active: [], completed: ["clear_and_repair_the_lookout_post"] } }).musicProfile, "mainland_paths");
assert.equal(resolveRegionAudio(lookoutPost.audio, normalWorldState, { ...context, regionId: "lookout-post", regionConfig: lookoutPost, questState: { active: [], completed: [] } }).musicProfile, "ruined_outpost");

audioManager.unlocked = false;
const playableAudio = { ...selectedRegion.audio, musicProfile: "forest", ambience: ["forest_ambience"] };
audioManager.setRegionAudio(playableAudio);
audioManager.setRegionAudio(playableAudio);
assert.deepEqual(audioManager.desiredAmbience, ["forest_ambience"]);
assert.equal(audioManager.desiredMusic?.trackId, "environment_forest");
audioManager.stopMusic({ fadeMs: 0 });
audioManager.stopAmbience();

console.log("[test-region-audio-config] OK");
