// Shared Web Audio mix controls. Individual sound definitions retain their authored gain/filter values.
export const AUDIO_MIX_CONFIG = Object.freeze({
  sfxEq: Object.freeze({
    lowShelf: Object.freeze({ enabled: true, frequency: 160, gainDb: 1.5 }),
    highShelf: Object.freeze({ enabled: true, frequency: 6500, gainDb: -3 }),
  }),
  spatial: Object.freeze({
    maxPan: 0.8,
    fullPanDistanceTiles: 6,
  }),
});
