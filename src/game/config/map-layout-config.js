export const MAP_LAYOUTS = {
  linear_path: {
    id: "linear_path",
    label: "Linear Path",
    pathStyle: "snake",
    roomCount: 6,
    roomBias: "alongPath",
    sideBranches: 0,
    bendScale: 0.72,
    wobbleScale: 0.65,
  },

  forked_path: {
    id: "forked_path",
    label: "Forked Path",
    pathStyle: "fork",
    roomCount: 7,
    roomBias: "branchEnds",
    sideBranches: 2,
    bendScale: 1.12,
    wobbleScale: 1.2,
  },

  central_clearing: {
    id: "central_clearing",
    label: "Central Clearing",
    pathStyle: "hub",
    roomCount: 5,
    roomBias: "aroundCenter",
    forceRoomAt: "center",
    bendScale: 0.85,
    wobbleScale: 0.7,
    roomScale: 1.2,
  },

  ring_ruin: {
    id: "ring_ruin",
    label: "Ring Ruin",
    pathStyle: "ring",
    roomCount: 8,
    roomBias: "aroundRing",
    bendScale: 1.35,
    wobbleScale: 0.9,
  },
};
