export const MUSIC_TRACKS = Object.freeze({
  last_stand_of_valtoria_01: { file: "/audio/music/menu/last_stand_of_valtoria_01.mp3", bus: "music", volume: 0.7, loop: true },
  forest_exploration_01: { file: "/audio/music/forest_exploration_01.mp3", bus: "music", volume: 0.7, loop: true },
  city_threat_low_01: { files: ["/audio/music/city/city_threat_low_01.mp3", "/audio/music/city/city_threat_low_02.mp3"], bus: "music", volume: 0.7, loop: true, rotateVariants: true },
  city_threat_high_01: { files: ["/audio/music/city/city_threat_high_01.mp3", "/audio/music/city/city_threat_high_02.mp3"], bus: "music", volume: 0.7, loop: true, rotateVariants: true },
  city_threat_very_high_01: { files: ["/audio/music/city/city_threat_very_high_01.mp3", "/audio/music/city/city_threat_very_high_02.mp3"], bus: "music", volume: 0.7, loop: true, rotateVariants: true },
});

export const MUSIC_PROFILES = Object.freeze({
  menu: Object.freeze({ trackId: "last_stand_of_valtoria_01", fadeMs: 1400 }),
  forest: Object.freeze({ trackId: "forest_exploration_01", fadeMs: 1400 }),
  city_low_threat: Object.freeze({ trackId: "city_threat_low_01", fadeMs: 1400 }),
  city_high_threat: Object.freeze({ trackId: "city_threat_high_01", fadeMs: 1400 }),
  city_very_high_threat: Object.freeze({ trackId: "city_threat_very_high_01", fadeMs: 1400 }),
});
