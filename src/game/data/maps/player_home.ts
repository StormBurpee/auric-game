/**
 * STORM'S HOUSE — docs/WORLD.md §6. The player's one-room home. The
 * 'start' spawn beside the bed is where IntroScene plants a new game
 * (WORLD calls it 'wake'; both names point at the same tile), and
 * 'heal' is the whiteout fallback before any Haven has been visited.
 */
import { defineMap } from '../../world/defineMap'

export const PLAYER_HOME = defineMap({
  id: 'player_home',
  name: '',
  music: 'dawnfern',
  outdoor: false,
  legend: {
    'W': 'WALL_INT', 'f': 'FLOOR_WOOD', 'B': 'BED', 'K': 'BOOKSHELF',
    'P': 'PLANT_POT', 'A': 'TABLE', 'm': 'MAT',
  },
  rows: [
    'WWWWWWWWWW',
    'WBBffKffPW',
    'WffffffffW',
    'WfAAfffffW',
    'WfAAfffffW',
    'WffffffffW',
    'WffffffffW',
    'WWWWmmWWWW',
  ],
  warps: [
    { x: 4, y: 7, to: { map: 'dawnfern', spawn: 'from_home' } },
    { x: 5, y: 7, to: { map: 'dawnfern', spawn: 'from_home' } },
  ],
  spawns: {
    entry: { x: 4, y: 6, facing: 'up' },
    wake: { x: 1, y: 2, facing: 'down' },
    start: { x: 1, y: 2, facing: 'down' },
    heal: { x: 1, y: 2, facing: 'down' },
  },
  npcs: [
    {
      id: 'home_mom', sprite: 'MOM', x: 6, y: 4, facing: 'left',
      movement: 'static', script: 'mom_home',
    },
  ],
})
