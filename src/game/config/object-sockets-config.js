/*
Object sockets are precise attachment points for visual effects on object
sprites. Keep Photoshop/socket coordinates here instead of in
region-object-config.js.

coordinateSpace: "sheet" means x/y are measured on the full source sheet,
not inside the individual frame. cols/rows can be any grid size. Frame keys
use frameNumberBase, which defaults to 0. For manual Photoshop counting,
frameNumberBase: 1 lets a 4x4 sheet use keys 1..16:

1  2  3  4
5  6  7  8
9  10 11 12
13 14 15 16

Missing sockets are valid and simply skip their attached effects. Use
socketPrefix in attachedEffects to target groups such as lanternA/lanternB or
windowGlowA/windowGlowB.
*/

export const OBJECT_SOCKET_CONFIG = {
  object_house_mainland: {
    coordinateSpace: "sheet",
    frameNumberBase: 1,
    cols: 4,
    rows: 4,

    // Used to convert sheet-space Photoshop coordinates into frame-local
    // coordinates. For this 4x4 sheet frameW/frameH become 313.5px.
    imageWidth: 1254,
    imageHeight: 1254,

    files: {
      "object/object_house_normal_1.png": {
        1: { chimney: { x: 174, y: 68 } },
        2: { chimney: { x: 428, y: 78 } },
        3: { chimney: { x: 832, y: 84 } },
        4: { chimney: { x: 1044, y: 62 } },
        5: { chimney: { x: 123, y: 388 } },
        6: {},
        7: {
          chimney: { x: 831, y: 359 },
          lanternA: { x: 655, y: 528 },
        },
        8: {
          chimney: { x: 1032, y: 387 },
          fireplace: { x: 1126, y: 551 },
        },
        9: { chimney: { x: 191, y: 673 } },
        10: {},
        11: { chimney: { x: 704, y: 670 } },
        12: { chimney: { x: 1160, y: 697 } },
        13: { fireplace: { x: 197, y: 1135 } },
        14: { chimney: { x: 498, y: 965 } },
        15: { chimney: { x: 714, y: 981 } },
        16: {
          chimney: { x: 1114, y: 984 },
          lanternA: { x: 960, y: 1117 },
        },
      },

      "object/object_house_normal_2.png": {
        1: {},
        2: {},
        3: {},
        4: {},
      },

      "object/object_house_normal_3.png": {
        1: {},
        2: {},
        3: {},
        4: {},
      },
    },
  },
};
