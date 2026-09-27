/**
 * THE DAWNFERN NURSERY — docs/WORLD.md §15 (Tier 2). The keeper couple's
 * cottage off Dawnfern's southeast green: the old woman minds the desk
 * (counter-talk runs the BOARD / RETRIEVE / LEAVE flow, EVENTS
 * 'nursery_keeper'), and her husband minds the eggs — he stands by the
 * bed until 'nursery_egg' (events/nursery.ts NURSERY_EGG_FLAG) sends
 * him outside to dawnfern's door with the news. Both of his selves
 * speak EVENTS 'nursery_egg_man'; the flag swaps which one you meet.
 */
import { defineMap } from '../../world/defineMap'

export const DAWNFERN_NURSERY = defineMap({
  id: 'dawnfern_nursery',
  name: '',
  music: 'dawnfern',
  outdoor: false,
  legend: {
    'W': 'WALL_INT', 'f': 'FLOOR_WOOD', 'K': 'BOOKSHELF', 'B': 'BED',
    'C': 'COUNTER', 'A': 'TABLE', 'P': 'PLANT_POT', 'm': 'MAT',
  },
  rows: [
    'WWWWWWWWWW',
    'WKKffffBBW',
    'WffffffffW',
    'WfCCCCffPW',
    'WffffffffW',
    'WPffffAAfW',
    'WffffffffW',
    'WWWWmmWWWW',
  ],
  warps: [
    { x: 4, y: 7, to: { map: 'dawnfern', spawn: 'from_nursery' } },
    { x: 5, y: 7, to: { map: 'dawnfern', spawn: 'from_nursery' } },
  ],
  spawns: {
    entry: { x: 4, y: 6, facing: 'up' },
  },
  npcs: [
    {
      // The keeper, behind her boarding desk (talk across the COUNTER).
      id: 'nursery_keeper', sprite: 'WOMAN', x: 3, y: 2, facing: 'down',
      movement: 'static', script: 'nursery_keeper',
    },
    {
      // Her husband, home only while no egg waits outside.
      id: 'nursery_man', sprite: 'ELDER', x: 7, y: 2, facing: 'down',
      movement: 'static', script: 'nursery_egg_man',
      hideFlag: 'nursery_egg',
    },
  ],
})
