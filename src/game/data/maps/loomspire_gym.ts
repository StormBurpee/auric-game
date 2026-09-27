/**
 * LOOMSPIRE GYM — docs/WORLD.md §12. A weaving wall maze: FERN's gaze
 * (sight 2) covers the only gap into the mid corridor at (10,9), JUNO's
 * covers the gap at (1,6), and ARIA waits between her statues, battling
 * only when spoken to — the 'gym_aria' event owns her whole ceremony.
 */
import { defineMap } from '../../world/defineMap'

export const LOOMSPIRE_GYM = defineMap({
  id: 'loomspire_gym',
  name: '',
  music: 'loomspire',
  outdoor: false,
  legend: {
    'W': 'WALL_INT', 'G': 'GYM_FLOOR', 'U': 'STATUE', 'm': 'MAT',
  },
  rows: [
    'WWWWWWWWWWWW',
    'WUGGGGGGGGUW',
    'WGGGGGGGGGGW',
    'WWWWWWWWWWGW',
    'WGGGGGGGGGGW',
    'WGGGGGGGGGGW',
    'WGWWWWWWWWWW',
    'WGGGGGGGGGGW',
    'WGGGGGGGGGGW',
    'WWWWWWWWWWGW',
    'WGGGGGGGGGGW',
    'WGGGGGGGGGGW',
    'WGGGGGGGGGGW',
    'WGGGGGGGGGGW',
    'WGGGGGGGGGGW',
    'WWWWWmmWWWWW',
  ],
  warps: [
    { x: 5, y: 15, to: { map: 'loomspire', spawn: 'from_gym' } },
    { x: 6, y: 15, to: { map: 'loomspire', spawn: 'from_gym' } },
  ],
  spawns: {
    entry: { x: 5, y: 14, facing: 'up' },
  },
  npcs: [
    {
      id: 'gym_fern', sprite: 'BOY', x: 8, y: 10, facing: 'right',
      movement: 'static', trainer: { key: 'GLIDER_FERN', sight: 2 },
      dialog: 'story.gym.fern.post',
    },
    {
      id: 'gym_juno', sprite: 'GIRL', x: 3, y: 7, facing: 'left',
      movement: 'static', trainer: { key: 'GLIDER_JUNO', sight: 2 },
      dialog: 'story.gym.juno.post',
    },
    {
      id: 'gym_aria', sprite: 'WARDEN', x: 5, y: 2, facing: 'down',
      movement: 'static', script: 'gym_aria',
    },
  ],
})
