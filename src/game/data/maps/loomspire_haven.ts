/**
 * LOOMSPIRE HAVEN — docs/WORLD.md §9. The same gentle face in every
 * town: Keeper Lily again, same floor plan as Bellmere's Haven, with
 * the 'heal' spawn that makes this the local whiteout return.
 */
import { defineMap } from '../../world/defineMap'

export const LOOMSPIRE_HAVEN = defineMap({
  id: 'loomspire_haven',
  name: '',
  music: 'loomspire',
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
    { x: 4, y: 7, to: { map: 'loomspire', spawn: 'from_haven' } },
    { x: 5, y: 7, to: { map: 'loomspire', spawn: 'from_haven' } },
  ],
  spawns: {
    entry: { x: 4, y: 6, facing: 'up' },
    heal: { x: 4, y: 6, facing: 'up' },
  },
  npcs: [
    {
      id: 'haven_lily_l', sprite: 'KEEPER', x: 4, y: 1, facing: 'down',
      movement: 'static', script: 'haven_lily',
    },
  ],
})
