import type { Landmark } from './landmarks.ts'

const DEG = Math.PI / 180

/**
 * The landmarks with a road raised across them, as routes need them: where
 * each stands and its deck, without the geometry it is drawn with, so
 * directions can lay routes on the decks without loading the whole
 * catalog. landmarks.test.ts checks that they match the catalog.
 */
export const DECK_LANDMARKS: Landmark[] = [
  {
    id: '15-temmuz-koprusu',
    name: '15 Temmuz Şehitler Köprüsü',
    near: [29.034368, 41.045537],
    terrain: 'sea',
    deck: {
      angle: -51.8 * DEG,
      // The side spans, European and Asian, beyond half the main span
      from: -532 - 231,
      to: 532 + 255,
      halfWidth: 16.7,
      height: 64,
    },
    hide: [],
    parts: [],
  },
]
