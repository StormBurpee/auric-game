/**
 * BELLMERE OUTFITTER — docs/WORLD.md §10. Stock shelves along the back
 * wall, the clerk behind her counter; talking across it opens the shop
 * through the 'outfitter_clerk' event.
 */
import { defineMap } from '../../world/defineMap'

export const BELLMERE_OUTFITTER = defineMap({
  id: 'bellmere_outfitter',
  name: '',
  music: 'bellmere',
  outdoor: false,
  legend: {
    'W': 'WALL_INT', 't': 'FLOOR_STONE', 'K': 'BOOKSHELF', 'C': 'COUNTER',
    'P': 'PLANT_POT', 'm': 'MAT',
  },
  rows: [
    'WWWWWWWWWW',
    'WKKKttKKKW',
    'WttttttttW',
    'WCCCCttttW',
    'WttttttttW',
    'WPttttttPW',
    'WttttttttW',
    'WWWWmmWWWW',
  ],
  warps: [
    { x: 4, y: 7, to: { map: 'bellmere', spawn: 'from_outfitter' } },
    { x: 5, y: 7, to: { map: 'bellmere', spawn: 'from_outfitter' } },
  ],
  spawns: {
    entry: { x: 4, y: 6, facing: 'up' },
  },
  npcs: [
    {
      id: 'outfitter_clerk', sprite: 'WOMAN', x: 2, y: 2, facing: 'down',
      movement: 'static', script: 'outfitter_clerk',
    },
  ],
})
