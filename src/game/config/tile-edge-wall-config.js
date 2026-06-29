export const TILE_EDGE_WALLS = {
  // Easy master toggle: set to false to disable loading and rendering all tile-edge walls.
  enabled: false,

  // Continue future wall adjustments from this baseline:
  // - back uses neighbour (0, -1) and is positioned correctly.
  // - left uses neighbour (-1, 0), moved from the old front/right edge.
  // - high_wall_test.png keeps its tall aspect ratio automatically.
  fileName: "high_wall_test.png",
  overlapPx: 2,
  yOffset: 0,
  // null preserves the source texture aspect ratio against one tile edge.
  renderHeight: null,
  debug: false,
  sides: {
    // These world-neighbour offsets are intentionally centralized so edge
    // interpretation can be adjusted without touching terrain rendering.
    back: {
      neighbourDx: 0,
      neighbourDy: -1,
      mirror: false,
      debugColor: "#3bd5ff",
    },
    left: {
      neighbourDx: -1,
      neighbourDy: 0,
      mirror: false,
      debugColor: "#ff4fd8",
    },
  },
};

/* ting at rette
- væg skal kun komme på bagkant og følge hele bagkant uanset hvad
- når hero eller andet er bag væg, skal det være bag væg

*/