/**
 * BELLMERE HAVEN — docs/WORLD.md §8. Keeper Lily behind the long
 * counter (the overworld carries A-presses across counter tiles). The
 * 'heal' spawn marks this Haven as a whiteout return point — the heal
 * script latches it into state.lastHaven.
 */
import { defineMap } from '../../world/defineMap'

export const BELLMERE_HAVEN = defineMap({
  id: 'bellmere_haven',
  name: '',
  music: 'bellmere',
  outdoor: false,
  legend: {
    'W': 'WALL_INT', 't': 'FLOOR_STONE', 'P': 'PLANT_POT', 'C': 'COUNTER',
    'A': 'TABLE', 'm': 'MAT',
  },
  rows: [
    'WWWWWWWWWW',
    'WPttttttPW',
    'WtCCCCCCtW',
    'WttttttttW',
    'WttttttttW',
    'WAttttttAW',
    'WttttttttW',
    'WWWWmmWWWW',
  ],
  warps: [
    { x: 4, y: 7, to: { map: 'bellmere', spawn: 'from_haven' } },
    { x: 5, y: 7, to: { map: 'bellmere', spawn: 'from_haven' } },
  ],
  spawns: {
    entry: { x: 4, y: 6, facing: 'up' },
    heal: { x: 4, y: 6, facing: 'up' },
  },
  npcs: [
    {
      id: 'haven_lily_b', sprite: 'KEEPER', x: 4, y: 1, facing: 'down',
      movement: 'static', script: 'haven_lily',
    },
  ],
})
