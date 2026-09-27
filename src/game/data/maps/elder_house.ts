/**
 * ELDER ROWAN'S HOUSE — docs/WORLD.md §11. Books, a bed, and the old
 * man at his table. The 'elder_rowan' event hands over the KINDEX once
 * Larch's errand brings the field notes here.
 */
import { defineMap } from '../../world/defineMap'

export const ELDER_HOUSE = defineMap({
  id: 'elder_house',
  name: '',
  music: 'bellmere',
  outdoor: false,
  legend: {
    'W': 'WALL_INT', 'f': 'FLOOR_WOOD', 'K': 'BOOKSHELF', 'B': 'BED',
    'A': 'TABLE', 'P': 'PLANT_POT', 'm': 'MAT',
  },
  rows: [
    'WWWWWWWWWW',
    'WKKKfffBBW',
    'WffffffffW',
    'WffAAffffW',
    'WffAAffffW',
    'WPfffffffW',
    'WffffffffW',
    'WWWWmmWWWW',
  ],
  warps: [
    { x: 4, y: 7, to: { map: 'bellmere', spawn: 'from_elder' } },
    { x: 5, y: 7, to: { map: 'bellmere', spawn: 'from_elder' } },
  ],
  spawns: {
    entry: { x: 4, y: 6, facing: 'up' },
  },
  npcs: [
    {
      id: 'elder_rowan', sprite: 'ELDER', x: 5, y: 3, facing: 'left',
      movement: 'static', script: 'elder_rowan',
    },
  ],
})
