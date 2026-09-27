/**
 * LARCH KINDRA LAB — docs/WORLD.md §7. Larch waits by the bookshelf
 * wall; the three starter pedestals stand in a row behind him. The
 * choice itself runs through the 'larch_lab' event (the pedestals are
 * scenery — Larch presents all three himself).
 */
import { defineMap } from '../../world/defineMap'

export const LARCH_LAB = defineMap({
  id: 'larch_lab',
  name: '',
  music: 'dawnfern',
  outdoor: false,
  legend: {
    'W': 'WALL_INT', 't': 'FLOOR_STONE', 'K': 'BOOKSHELF', 'E': 'PEDESTAL',
    'C': 'COUNTER', 'P': 'PLANT_POT', 'm': 'MAT',
  },
  rows: [
    'WWWWWWWWWWWW',
    'WKKttttttKKW',
    'WttttttttttW',
    'WtttEtEtEttW',
    'WttttttttttW',
    'WCCttttttttW',
    'WttttttttttW',
    'WttttttttttW',
    'WtPttttttPtW',
    'WWWWWmmWWWWW',
  ],
  warps: [
    { x: 5, y: 9, to: { map: 'dawnfern', spawn: 'from_lab' } },
    { x: 6, y: 9, to: { map: 'dawnfern', spawn: 'from_lab' } },
  ],
  spawns: {
    entry: { x: 5, y: 8, facing: 'up' },
  },
  npcs: [
    {
      id: 'lab_larch', sprite: 'PROF', x: 6, y: 2, facing: 'down',
      movement: 'static', script: 'larch_lab',
    },
    {
      // STORY §7 dawnfern3 — the neighbor who thinks the KINDRA
      // understand Larch; nobody fits the line better than his aide.
      id: 'lab_aide', sprite: 'MAN', x: 2, y: 6, facing: 'right',
      movement: 'static', script: 'npc_lab_aide',
    },
  ],
})
