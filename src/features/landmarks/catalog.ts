import { ANITKABIR } from './anitkabir.ts'
import type { Landmark, Material, Part, XY } from './landmarks.ts'
import {
  dome,
  ellipse,
  grid,
  lightsAlong,
  lightsRound,
  minaret,
  mosque,
  scaled,
} from './shapes.ts'

/*
 * The landmarks, each where OpenStreetMap has it, and drawn from its own
 * outline there where that matters.
 */

const DEG = Math.PI / 180

/** Ankara: a 125 m concrete shaft with a glass, tulip shaped head and a mast. */
const ATAKULE: Landmark = {
  id: 'atakule',
  lights: lightsRound(9, 6),
  name: 'Atakule',
  near: [32.856137, 39.886135],
  // The tower, not the shopping centre round its foot
  hide: [{ within: 1, tallerThan: 30 }],
  parts: [
    {
      kind: 'round',
      material: 'concrete',
      outline: [
        [6.5, 0],
        [5.2, 4],
        [4.6, 86],
      ],
    },
    {
      kind: 'round',
      material: 'glass',
      outline: [
        [4.6, 86],
        [6, 88],
        [9, 90],
        [12, 92.5],
        [14, 95.5],
        [15, 99],
        [14.6, 102],
      ],
    },
    {
      kind: 'round',
      material: 'windows',
      outline: [
        [14.6, 102],
        [13, 105],
        [11.5, 107.5],
      ],
    },
    {
      kind: 'round',
      material: 'glass',
      outline: [
        [11.5, 107.5],
        [9, 110],
        [5.5, 112],
        [2, 113],
      ],
    },
    {
      kind: 'round',
      material: 'concrete',
      sides: 12,
      outline: [
        [0.8, 113],
        [0.3, 125],
      ],
    },
  ],
}

/** Istanbul: a stone tower with a gallery and a conical lead roof. */
const GALATA: Landmark = {
  id: 'galata',
  lights: lightsRound(11, 8),
  name: 'Galata Kulesi',
  near: [28.974213, 41.025634],
  hide: [{ within: 1, tallerThan: 30 }],
  parts: [
    {
      kind: 'round',
      material: 'stone',
      outline: [
        [8.3, 0],
        [8, 43],
        [8.9, 45],
        [8.9, 46.5],
      ],
    },
    {
      kind: 'round',
      material: 'windows',
      outline: [
        [7.5, 46.5],
        [7.5, 52],
      ],
    },
    {
      kind: 'round',
      material: 'lead',
      outline: [
        [8.2, 52],
        [8.2, 52.3],
        [0.35, 62.6],
        [0.3, 66.9],
      ],
    },
  ],
}

/** Istanbul: a white tower and the buildings round it on a rock in the Bosphorus. */
const KIZ_KULESI: Landmark = {
  id: 'kiz-kulesi',
  lights: lightsRound(16, 8, [-1, 6]),
  name: 'Kız Kulesi',
  near: [29.00409, 41.02106],
  // Everything on the rock
  hide: [{ at: [0, 6], within: 18, tallerThan: 0 }],
  parts: [
    {
      kind: 'block',
      material: 'rock',
      footprint: ellipse(17, 15).map(([x, y]): XY => [x - 1, y + 6]),
      base: 0,
      top: 2,
    },
    ...(
      [
        [
          [
            [0.8, 15.3],
            [-8, 13.9],
            [-5.2, -4],
            [-2.7, -3.6],
            [3.6, -2.6],
            [2.7, 3.4],
          ],
          11,
        ],
        [
          [
            [-10, -4.9],
            [-5.2, -4],
            [-8, 13.9],
            [-12.9, 13.2],
          ],
          5.5,
        ],
        [
          [
            [7.9, 16.7],
            [0.8, 15.3],
            [2.7, 3.4],
            [3.6, -2.6],
            [11.1, -1.6],
            [8.9, 11],
          ],
          9,
        ],
        [
          [
            [2.7, 3.4],
            [-3.6, 2.4],
            [-2.7, -3.6],
            [3.6, -2.6],
          ],
          15,
        ],
      ] as [XY[], number][]
    ).map(([footprint, top]): Part => ({
      kind: 'block',
      material: 'whitewash',
      footprint,
      base: 2,
      top,
    })),
    {
      kind: 'round',
      material: 'whitewash',
      sides: 8,
      outline: [
        [3.9, 15],
        [3.9, 15.6],
        [3.3, 15.6],
        [3.3, 19.5],
        [3.8, 19.8],
        [3.8, 20.3],
      ],
    },
    {
      kind: 'round',
      material: 'windows',
      sides: 8,
      outline: [
        [2.6, 20.3],
        [2.6, 22.2],
      ],
    },
    {
      kind: 'round',
      material: 'lead',
      sides: 8,
      outline: [
        [3, 22.2],
        [0.2, 25.5],
        [0.08, 27.5],
      ],
    },
  ],
}

/**
 * Istanbul: the white TV tower on Küçük Çamlıca, a tulip in outline, with
 * glass floors high up and a long mast.
 */
const CAMLICA: Landmark = {
  id: 'camlica',
  lights: lightsRound(17, 8),
  name: 'Çamlıca Kulesi',
  near: [29.065541, 41.016372],
  hide: [{ within: 1, tallerThan: 0 }],
  parts: [
    {
      kind: 'round',
      material: 'whitewash',
      outline: [
        [14, 0],
        [12.5, 10],
        [11.4, 30],
        [9, 90],
        [9.5, 120],
      ],
    },
    {
      kind: 'round',
      material: 'glass',
      outline: [
        [9.5, 120],
        [12, 135],
        [15, 150],
        [16.5, 165],
      ],
    },
    {
      kind: 'round',
      material: 'windows',
      outline: [
        [16.5, 165],
        [16.5, 180],
      ],
    },
    {
      kind: 'round',
      material: 'glass',
      outline: [
        [16.5, 180],
        [15, 195],
        [12, 207],
        [8.5, 215],
      ],
    },
    {
      kind: 'round',
      material: 'whitewash',
      outline: [
        [8.5, 215],
        [6, 221],
      ],
    },
    {
      kind: 'round',
      material: 'lead',
      sides: 12,
      outline: [
        [2.2, 221],
        [1.2, 300],
        [0.5, 369],
      ],
    },
  ],
}

/**
 * Istanbul, 4. Levent: Sabancı Center's twin towers of dark glass banded
 * in white, each a square with cut corners and a taller slab across it.
 */
function sabanciTower(outline: XY[], core: XY[], center: XY): Part[] {
  const wings = 124
  const top = 143
  const bands: Part[] = []
  // A white band every two floors
  for (let h = 7.3; h < top - 4; h += 7.3) {
    bands.push({
      kind: 'block',
      material: 'whitewash',
      footprint: scaled(h < wings - 2 ? outline : core, 1.012, center),
      base: h,
      top: h + 1.1,
    })
  }
  return [
    // Dark glass, its offices lit behind it at night
    {
      kind: 'block',
      material: 'tint',
      footprint: outline,
      base: 0,
      top: wings,
    },
    { kind: 'block', material: 'tint', footprint: core, base: wings, top },
    ...bands,
    {
      kind: 'block',
      material: 'whitewash',
      footprint: scaled(outline, 0.94, center),
      base: wings,
      top: wings + 2.5,
    },
    {
      kind: 'block',
      material: 'windows',
      footprint: scaled(core, 0.9, center),
      base: top,
      top: top + 4,
    },
  ]
}

const SABANCI: Landmark = {
  id: 'sabanci',
  lights: [
    ...lightsRound(24, 6, [16, -28.2]),
    ...lightsRound(24, 6, [-16.2, 28.2]),
  ],
  name: 'Sabancı Center',
  near: [29.010287, 41.084958],
  // The two towers, not the podium between them
  hide: [
    { at: [16, -28.2], within: 12, tallerThan: 50 },
    { at: [-16.2, 28.2], within: 12, tallerThan: 50 },
  ],
  parts: [
    ...sabanciTower(
      [
        [6.5, -43.5],
        [21.3, -47.1],
        [29.1, -42.5],
        [33.4, -25.9],
        [25.2, -12.7],
        [10.4, -9.4],
        [2.7, -14.2],
        [-1.3, -31],
      ],
      [
        [8.1, -26],
        [6.5, -32.8],
        [8.4, -35.7],
        [13.8, -37],
        [23.9, -30.6],
        [25.7, -23.9],
        [23.5, -20.6],
        [18.1, -19.4],
      ],
      [16, -28.2],
    ),
    ...sabanciTower(
      [
        [-7, 43.8],
        [-21.8, 47.1],
        [-29.5, 42.3],
        [-33.5, 25.6],
        [-25.7, 13],
        [-10.9, 9.4],
        [-3.1, 14],
        [1.2, 30.6],
      ],
      [
        [-24.1, 30.6],
        [-25.7, 23.7],
        [-23.8, 20.9],
        [-18.4, 19.6],
        [-8.3, 25.9],
        [-6.5, 32.6],
        [-8.7, 36],
        [-14.1, 37.2],
      ],
      [-16.2, 28.2],
    ),
    {
      kind: 'round',
      material: 'lead',
      sides: 12,
      at: [16, -28.2],
      outline: [
        [0.8, 147],
        [0.2, 160],
      ],
    },
  ],
}

/** Istanbul, Maslak: a slim glass tower with a stepped crown and a mast. */
const SAPPHIRE_OUTLINE: XY[] = [
  [6.1, 18.4],
  [4.9, 21.1],
  [0.2, 18.7],
  [-0.5, 20.4],
  [-11.8, 15.9],
  [-10.3, -16],
  [-4.4, -15.1],
  [-3, -21.3],
  [5.3, -18.9],
  [7.8, -18.2],
  [10.7, -17.4],
  [8.3, -8.6],
  [14.8, -6.4],
  [7.4, 15.5],
]

const SAPPHIRE: Landmark = {
  id: 'sapphire',
  lights: lightsRound(22, 6),
  name: 'İstanbul Sapphire',
  near: [29.006984, 41.084966],
  hide: [{ within: 1, tallerThan: 0 }],
  parts: [
    {
      kind: 'block',
      material: 'glass',
      footprint: SAPPHIRE_OUTLINE,
      base: 0,
      top: 206,
    },
    // Its sky gardens, every few floors
    ...[40, 80, 120, 160, 196].map((h): Part => ({
      kind: 'block',
      material: 'windows',
      footprint: scaled(SAPPHIRE_OUTLINE, 1.01),
      base: h,
      top: h + 4,
    })),
    {
      kind: 'block',
      material: 'glass',
      footprint: scaled(SAPPHIRE_OUTLINE, 0.8),
      base: 206,
      top: 222,
    },
    {
      kind: 'block',
      material: 'steel',
      footprint: scaled(SAPPHIRE_OUTLINE, 0.55),
      base: 222,
      top: 236,
    },
    {
      kind: 'round',
      material: 'steel',
      sides: 12,
      outline: [
        [1, 236],
        [0.25, 261],
      ],
    },
  ],
}

/** Istanbul: the stone fire tower in Beyazıt, with a watch room on top. */
const BEYAZIT: Landmark = {
  id: 'beyazit-kulesi',
  lights: lightsRound(9, 6),
  name: 'Beyazıt Kulesi',
  near: [28.964896, 41.012786],
  hide: [{ within: 1, tallerThan: 0 }],
  parts: [
    {
      kind: 'round',
      material: 'stone',
      sides: 16,
      outline: [
        [6.4, 0],
        [6.2, 55],
        [5.6, 60],
        [6.9, 60.3],
        [6.9, 61.5],
      ],
    },
    {
      kind: 'round',
      material: 'windows',
      sides: 16,
      outline: [
        [5, 61.5],
        [5, 68],
      ],
    },
    {
      kind: 'round',
      material: 'stone',
      sides: 16,
      outline: [
        [5.8, 68],
        [5.8, 69],
        [4.2, 69.3],
        [4.2, 75],
      ],
    },
    {
      kind: 'round',
      material: 'lead',
      sides: 16,
      outline: [
        [4.6, 75],
        [0.4, 83],
        [0.1, 85],
      ],
    },
  ],
}

/** Istanbul: the clock tower by Dolmabahçe Palace, in three storeys. */
const dolmabahce = grid(31.3 * DEG).box

const DOLMABAHCE: Landmark = {
  id: 'dolmabahce-saat',
  lights: lightsRound(9, 4),
  name: 'Dolmabahçe Saat Kulesi',
  near: [28.996363, 41.037658],
  hide: [{ within: 1, tallerThan: 0 }],
  parts: [
    ...(
      [
        [6.2, 0, 3, 'stone'],
        [5.7, 3, 11, 'whitewash'],
        [6.1, 11, 11.8, 'stone'],
        [4.9, 11.8, 17.5, 'whitewash'],
        [5.3, 17.5, 18.3, 'stone'],
        [4.2, 18.3, 22, 'whitewash'],
        [4.6, 22, 22.8, 'stone'],
      ] as const
    ).map(([half, base, top, material]): Part => ({
      kind: 'block',
      material,
      footprint: dolmabahce(-half, -half, half, half),
      base,
      top,
    })),
    {
      kind: 'round',
      material: 'stone',
      sides: 16,
      outline: [
        [3.2, 22.8],
        [3.2, 23.8],
      ],
    },
    ...dome(3.2, 23.8, 2.6),
  ],
}

/** İzmir: the Ottoman clock tower in Konak, octagonal, over four fountains. */
const KONAK: Landmark = {
  id: 'konak-saat',
  lights: lightsRound(7, 6),
  name: 'Konak Saat Kulesi',
  near: [27.128718, 38.418885],
  hide: [{ within: 3, tallerThan: 0 }],
  parts: [
    {
      kind: 'round',
      material: 'whitewash',
      sides: 8,
      outline: [
        [4.2, 0],
        [4.2, 1.2],
        [3.4, 1.2],
        [3.4, 7],
        [3.9, 7.4],
        [3.9, 8],
      ],
    },
    {
      kind: 'round',
      material: 'stone',
      sides: 8,
      outline: [
        [2.6, 8],
        [2.6, 15],
        [3.1, 15.3],
        [3.1, 15.9],
      ],
    },
    {
      kind: 'round',
      material: 'whitewash',
      sides: 8,
      outline: [
        [2.2, 15.9],
        [2.2, 19.5],
        [2.6, 19.8],
        [2.6, 20.3],
      ],
    },
    {
      kind: 'round',
      material: 'lead',
      sides: 8,
      outline: [
        [2.2, 20.3],
        [1.4, 22.5],
        [0.3, 24.5],
        [0.1, 25.5],
      ],
    },
    // The fountains round its foot
    ...(
      [
        [5, 0],
        [-5, 0],
        [0, 5],
        [0, -5],
      ] as XY[]
    ).map((at): Part => ({
      kind: 'round',
      material: 'stone',
      sides: 8,
      at,
      outline: [
        [1.3, 0],
        [1.3, 1],
      ],
    })),
  ],
}

/**
 * Istanbul: Rumeli Hisarı, its curtain walls up the hill from the shore
 * and three great towers.
 */
/** Its curtain walls, outside, as OpenStreetMap has them */
const RUMELI_WALLS: XY[] = [
  [58, -26],
  [53, -12],
  [55, 0],
  [66, 1],
  [68, 6],
  [68, 12],
  [63, 17],
  [53, 15],
  [45, 21],
  [47, 26],
  [44, 31],
  [36, 28],
  [25, 46],
  [32, 110],
  [25, 112],
  [19, 107],
  [9, 121],
  [-11, 122],
  [-10, 130],
  [-15, 136],
  [-22, 138],
  [-29, 135],
  [-32, 124],
  [-25, 115],
  [-19, 87],
  [-24, 80],
  [-20, 75],
  [-21, 52],
  [-26, 51],
  [-29, 47],
  [-28, 43],
  [-23, 41],
  [-26, 20],
  [-30, 15],
  [-27, 9],
  [-27, -6],
  [-32, -11],
  [-27, -17],
  [-23, -40],
  [-24, -44],
  [-30, -48],
  [-27, -55],
  [-42, -85],
  [-53, -92],
  [-54, -97],
  [-52, -104],
  [-45, -110],
  [-38, -109],
  [-32, -105],
  [-24, -92],
  [-11, -89],
  [15, -97],
  [61, -105],
  [63, -98],
  [56, -95],
  [57, -73],
  [62, -67],
  [57, -62],
  [58, -37],
  [63, -31],
]

const RUMELI: Landmark = {
  id: 'rumeli-hisari',
  lights: RUMELI_WALLS.filter((_, i) => i % 2 === 0),
  name: 'Rumeli Hisarı',
  near: [29.056009, 41.084788],
  // A point on its walls
  hide: [{ at: [58, -26], within: 1, tallerThan: 0 }],
  parts: [
    {
      kind: 'block',
      material: 'stone',
      footprint: RUMELI_WALLS,
      holes: [
        [
          [-40, -84],
          [-24, -51],
          [-21, -40],
          [-26, -1],
          [-17, 87],
          [-23, 115],
          [-2, 121],
          [8, 119],
          [19, 104],
          [23, 110],
          [30, 109],
          [30, 93],
          [24, 45],
          [35, 27],
          [55, 12],
          [51, -13],
          [56, -31],
          [55, -103],
          [16, -96],
          [-5, -88],
          [-19, -88],
          [-28, -94],
          [-33, -87],
        ],
      ],
      base: 0,
      top: 11,
    },
    ...(
      [
        [[-20, 128], 10.5, 26],
        [[-45, -100], 11.5, 24],
        [[61, 8], 7, 17],
      ] as [XY, number, number][]
    ).flatMap(([at, radius, height]): Part[] => [
      {
        kind: 'round',
        material: 'stone',
        sides: 24,
        at,
        outline: [
          [radius, 0],
          [radius, height],
        ],
      },
      {
        kind: 'round',
        material: 'lead',
        sides: 24,
        at,
        outline: [
          [radius + 0.4, height],
          [0.3, height + radius * 0.7],
        ],
      },
    ]),
  ],
}

/** Istanbul: Ayasofya, its great dome on half domes, buttresses and minarets. */
const ayasofya = grid(-32.6 * DEG)
/** At its four corners, as OpenStreetMap has them */
const AYASOFYA_MINARETS: [number, number][] = [
  [-53.1, 40],
  [-53.5, -32.5],
  [43.1, -33.4],
  [53, 39.1],
]

const AYASOFYA: Landmark = {
  id: 'ayasofya',
  lights: lightsAlong(ayasofya.box(-56, -40, 42, 40), 12),
  name: 'Ayasofya',
  near: [28.980049, 41.008526],
  hide: [
    { within: 44, tallerThan: 20 },
    // Its outline, a low block round the whole of it
    { within: 1, tallerThan: 0 },
    ...AYASOFYA_MINARETS.map(([u, v]) => ({
      at: ayasofya.at(u, v),
      within: 5,
      tallerThan: 0,
    })),
  ],
  parts: [
    ...(
      [
        [[-40, -36, 38, 36], 0, 25],
        [[-50, -33, -40, 33], 0, 16],
        // The walls holding up the dome to the north and south
        [[-12, -21, 12, 21], 25, 40],
        // Its four buttresses
        [[-31, -19, -20, -8], 0, 30],
        [[-31, 9, -20, 20], 0, 30],
        [[21, 8, 32, 19], 0, 30],
        [[21, -20, 32, -9], 0, 30],
      ] as [[number, number, number, number], number, number][]
    ).map(([rect, base, top]): Part => ({
      kind: 'block',
      material: 'ochre',
      footprint: ayasofya.box(...rect),
      base,
      top,
    })),
    ...dome(15, 25, 14, ayasofya.at(17.8, 0)),
    ...dome(15, 25, 14, ayasofya.at(-17.8, 0)),
    {
      kind: 'round',
      material: 'ochre',
      sides: 40,
      outline: [
        [16.8, 40],
        [16.8, 45],
      ],
    },
    ...dome(16.2, 45, 11),
    ...AYASOFYA_MINARETS.flatMap(([u, v]) => minaret(ayasofya.at(u, v), 60, 2)),
  ],
}

/** Istanbul: Sultanahmet, its cascade of domes and six minarets. */
const sultanahmet = grid(-43.5 * DEG)

const SULTANAHMET: Landmark = {
  id: 'sultanahmet',
  lights: lightsAlong(sultanahmet.box(-86, -35, 32, 34), 12),
  name: 'Sultanahmet Camii',
  near: [28.976879, 41.005253],
  hide: [
    // The hall, and the platform it stands on
    { within: 1, tallerThan: 0 },
    { within: 42, tallerThan: 20 },
    // Everything in and round the courtyard: its domed arcades, gate,
    // fountain and two minarets
    { at: sultanahmet.at(-55, 0), within: 41, tallerThan: 0 },
  ],
  parts: mosque({
    angle: -43.5 * DEG,
    hall: [-24, -28.5, 28, 28.5],
    wall: 22,
    dome: { radius: 11.8, base: 31, rise: 12 },
    halfDomes: { radius: 10.5, offset: 12.5, rise: 10, across: true },
    cornerDomes: { radius: 5, offset: 20, rise: 5 },
    turrets: { offset: 14.5, top: 36 },
    minarets: [
      {
        at: [
          [28.6, 29.9],
          [-24.6, 29.2],
          [-25.1, -31.2],
          [29.5, -31.7],
        ],
        height: 64,
      },
      {
        at: [
          [-81.5, 31.4],
          [-81.5, -31.4],
        ],
        height: 54,
      },
    ],
    courtyard: [-82, -30, -24, 30],
  }),
}

/** Ankara: Kocatepe Camii, in the classical style, with four tall minarets. */
const kocatepe = grid(-70.5 * DEG)

const KOCATEPE: Landmark = {
  id: 'kocatepe',
  lights: lightsAlong(kocatepe.box(-70, -34, 24, 31), 12),
  name: 'Kocatepe Camii',
  near: [32.86078, 39.91655],
  hide: [],
  parts: mosque({
    angle: -70.5 * DEG,
    hall: [-26, -29.5, 20, 26.5],
    wall: 24,
    dome: { radius: 12.75, base: 35, rise: 13.5 },
    halfDomes: { radius: 10, offset: 12.5, rise: 10, across: true },
    cornerDomes: { radius: 5, offset: 18.5, rise: 5 },
    turrets: { offset: 14.5, top: 38 },
    minarets: [
      {
        at: [
          [22.8, -32.2],
          [22.7, 29.4],
          [-28.7, 30],
          [-29.9, -33.1],
        ],
        height: 88,
      },
    ],
    courtyard: [-66, -29.5, -26, 26.5],
  }),
}

/** Edirne: Selimiye, Sinan's great dome on its octagon, and four slim minarets. */
const selimiye = grid(-50.3 * DEG)

const SELIMIYE: Landmark = {
  id: 'selimiye',
  lights: lightsAlong(selimiye.box(-70, -33, 31, 34), 12),
  name: 'Selimiye Camii',
  near: [26.55936, 41.67795],
  hide: [{ within: 1, tallerThan: 0 }],
  parts: mosque({
    angle: -50.3 * DEG,
    hall: [-28.9, -28.5, 26.5, 29.2],
    wall: 21,
    dome: { radius: 15.6, base: 29, rise: 14.3, sides: 8 },
    cornerDomes: { radius: 5.5, offset: 19, rise: 5 },
    turrets: { offset: 14.5, top: 33 },
    minarets: [
      {
        at: [
          [-28.9, -28.5],
          [-28.9, 29.2],
          [26.5, -28.5],
          [26.5, 29.2],
        ],
        height: 71,
      },
    ],
    courtyard: [-66, -28.5, -28.9, 29.2],
  }),
}

/**
 * Istanbul: the 15 Temmuz Şehitler Köprüsü as built: steel towers 165 m
 * over the water on either shore, the 33 m wide box girder deck 64 m up,
 * hung over the 1074 m main span from two main cables and carried over
 * the side spans on piers, and the cables running on down to their
 * anchorages. `u` runs along it from Europe to Asia.
 */
const bridge = grid(-51.8 * DEG)
/** Half the main span, to each tower */
const MAIN = 532
/** The side spans, European and Asian */
const SIDE = [231, 255] as const
const DECK = 64
const TOWER_TOP = 165
/** The towers' legs and the cables, out from the centre line */
const LEG = 19
const CABLE = 17.5

/** The main cables' height along the bridge. */
function cableHeight(u: number): number {
  const saddle = TOWER_TOP + 1.5
  if (Math.abs(u) <= MAIN) {
    return DECK + 2.5 + (saddle - DECK - 2.5) * (u / MAIN) ** 2
  }
  // Back down, straight, to the anchorage under the end of the deck
  const side = u < 0 ? SIDE[0] : SIDE[1]
  return saddle - ((saddle - DECK + 3) * (Math.abs(u) - MAIN)) / side
}

function bridgeParts(): Part[] {
  const parts: Part[] = []
  const block = (
    rect: [number, number, number, number],
    base: number,
    top: number,
    material: Material = 'steel',
  ): Part => ({
    kind: 'block',
    material,
    footprint: bridge.box(...rect),
    base,
    top,
  })
  const [start, end] = [-MAIN - SIDE[0], MAIN + SIDE[1]]

  // The deck: the steel girder, its road, and the barriers down the
  // middle and along each edge
  parts.push(
    block([start, -16.7, end, 16.7], DECK - 3, DECK - 0.3),
    block([start, -14.8, end, 14.8], DECK - 0.3, DECK, 'asphalt'),
    block([start, -0.4, end, 0.4], DECK, DECK + 0.9, 'concrete'),
    block([start, -16.5, end, -15.9], DECK - 0.3, DECK + 1.2),
    block([start, 15.9, end, 16.5], DECK - 0.3, DECK + 1.2),
    // Lamps along both edges
    block([start, -16.4, end, -16], DECK + 1.2, DECK + 1.5, 'lamp'),
    block([start, 16, end, 16.4], DECK + 1.2, DECK + 1.5, 'lamp'),
  )

  for (const u of [-MAIN, MAIN]) {
    parts.push(block([u - 9, -LEG - 7, u + 9, LEG + 7], 0, 6, 'concrete'))
    for (const side of [-1, 1]) {
      // Each leg a steel box, narrowing as it rises
      const segments = 6
      for (let i = 0; i < segments; i++) {
        const along = (7 - (2.4 * (i + 0.5)) / segments) / 2
        const across = (5.4 - (1.8 * (i + 0.5)) / segments) / 2
        const v = side * LEG
        parts.push(
          block(
            [u - along, v - across, u + along, v + across],
            6 + ((TOWER_TOP - 6) * i) / segments,
            6 + ((TOWER_TOP - 6) * (i + 1)) / segments,
          ),
        )
      }
      // The saddle the cable rests on
      const v = side * CABLE
      parts.push(
        block([u - 3, v - 1.6, u + 3, v + 1.6], TOWER_TOP, TOWER_TOP + 2.5),
      )
    }
    // Portal beams: under the deck, two thirds of the way up, and on top
    for (const [base, top] of [
      [DECK - 9, DECK - 4],
      [112, 118],
      [TOWER_TOP - 7, TOWER_TOP],
    ]) {
      parts.push(block([u - 2.2, -LEG, u + 2.2, LEG], base, top))
    }
  }

  // The main cables, in short straight pieces
  const step = 4
  for (let u = start; u < end; u += step) {
    const [h0, h1] = [cableHeight(u), cableHeight(u + step)]
    for (const side of [-1, 1]) {
      const v = side * CABLE
      parts.push(
        block(
          [u, v - 0.5, u + step, v + 0.5],
          Math.min(h0, h1) - 0.9,
          Math.max(h0, h1),
          'cable',
        ),
      )
    }
  }
  // Hangers from the cables down to the deck, over the main span
  for (let u = -MAIN + 18; u < MAIN - 9; u += 18) {
    for (const side of [-1, 1]) {
      const v = side * CABLE
      parts.push(
        block(
          [u - 0.2, v - 0.2, u + 0.2, v + 0.2],
          DECK,
          cableHeight(u),
          'cable',
        ),
      )
    }
  }
  // Piers under the side spans
  for (const [from, to, dir] of [
    [-MAIN, start, -1],
    [MAIN, end, 1],
  ]) {
    for (let u = from + dir * 42; dir * (to - u) > 12; u += dir * 42) {
      parts.push(block([u - 2, -11, u + 2, 11], 0, DECK - 3, 'concrete'))
    }
  }
  // The anchorages, where the cables go into the ground
  parts.push(
    block([start - 26, -24, start + 4, 24], 0, DECK - 3, 'concrete'),
    block([end - 4, -24, end + 26, 24], 0, DECK - 3, 'concrete'),
  )
  return parts
}

/** Its lights on the water below, and at the towers' feet. */
function bridgeLights(): XY[] {
  const lights: XY[] = []
  for (let u = -MAIN; u <= MAIN; u += 38) lights.push(bridge.at(u, 0))
  for (const u of [-MAIN, MAIN]) {
    for (const v of [-LEG, LEG]) lights.push(bridge.at(u, v))
  }
  return lights
}

const BRIDGE: Landmark = {
  id: '15-temmuz-koprusu',
  lights: bridgeLights(),
  name: '15 Temmuz Şehitler Köprüsü',
  near: [29.034368, 41.045537],
  hide: [],
  parts: bridgeParts(),
}

export const LANDMARKS: Landmark[] = [
  ATAKULE,
  ANITKABIR,
  KOCATEPE,
  GALATA,
  KIZ_KULESI,
  CAMLICA,
  SABANCI,
  SAPPHIRE,
  BEYAZIT,
  DOLMABAHCE,
  RUMELI,
  AYASOFYA,
  SULTANAHMET,
  BRIDGE,
  KONAK,
  SELIMIYE,
]
