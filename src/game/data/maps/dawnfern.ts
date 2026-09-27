/**
 * DAWNFERN VILLAGE — docs/WORLD.md §1. The home town: the player's
 * house (west, home roof) and Larch's lab (east, civic roof) face each
 * other across the north road to Trail 1. WORLD's 'R'/wall rows are
 * dressed per the art spec — roof L/M/R trios and windows flanking each
 * door — and a light scatter of tufts keeps the grass alive.
 *
 * Tier 2 raises a third building on the southeast green: the DAWNFERN
 * NURSERY (rows 12-15, x15-18), its door at (16,15) opening off the end
 * of the east road. The lab sign stepped one row north to (13,11) to
 * make room, and the old pine by the door was cleared for the approach.
 * The keeper's husband waits outside while 'nursery_egg' is set.
 */
import { defineMap } from '../../world/defineMap'

export const DAWNFERN = defineMap({
  id: 'dawnfern',
  name: 'DAWNFERN VILLAGE',
  music: 'dawnfern',
  outdoor: true,
  legend: {
    'T': 'TREE', '.': 'GRASS', ',': 'GRASS_TUFT',
    '=': 'PATH', '*': 'FLOWER', '#': 'FENCE', 's': 'SIGN',
    '{': 'ROOF_HOME_L', 'h': 'ROOF_HOME_M', '}': 'ROOF_HOME_R',
    '[': 'ROOF_CIVIC_L', 'c': 'ROOF_CIVIC_M', ']': 'ROOF_CIVIC_R',
    'W': 'WALL', 'w': 'WALL_WINDOW', 'D': 'DOOR',
  },
  rows: [
    'TTTTTTTTT==TTTTTTTTT',
    'T........==s.......T',
    'T.*..,...==......*.T',
    'T........==....,...T',
    'T..####..==..####..T',
    'T..*..*..==..*..*..T',
    'T...,....==....,...T',
    'T..{hh}..==..[cc]..T',
    'T..{hh}..==..[cc]..T',
    'T..WWWW..==..WWWW..T',
    'T..wDwW..==..wDwW..T',
    'T...=....==..s=....T',
    'T...==========={hh}T',
    'T..,.....==....{hh}T',
    'T..*..*..==..*.WWWWT',
    'T........==....wDwWT',
    'T*.....,..........*T',
    'TTTTTTTTTTTTTTTTTTTT',
  ],
  warps: [
    { x: 4, y: 10, to: { map: 'player_home', spawn: 'entry' } },
    { x: 14, y: 10, to: { map: 'larch_lab', spawn: 'entry' } },
    { x: 16, y: 15, to: { map: 'dawnfern_nursery', spawn: 'entry' } },
    { x: 9, y: 0, to: { map: 'trail1', spawn: 'south' } },
    { x: 10, y: 0, to: { map: 'trail1', spawn: 'south' } },
  ],
  edges: {
    up: { map: 'trail1', spawn: 'south' },
  },
  spawns: {
    from_home: { x: 4, y: 11, facing: 'down' },
    from_lab: { x: 14, y: 11, facing: 'down' },
    from_nursery: { x: 16, y: 16, facing: 'down' },
    from_trail1: { x: 9, y: 1, facing: 'down' },
  },
  npcs: [
    {
      // STORY §7 dawnfern1 — the kid who explains tall grass (two boxes
      // under separate keys, so a small EVENTS chat script strings them).
      id: 'dawnfern_girl', sprite: 'GIRL', x: 6, y: 13, facing: 'down',
      movement: 'wander', script: 'npc_dawnfern_kid',
    },
    {
      // STORY §7 dawnfern2 — the villager by the trail gate (day/night).
      id: 'dawnfern_man', sprite: 'MAN', x: 12, y: 2, facing: 'down',
      movement: 'static',
      dialog: 'story.npc.dawnfern2.day', dialogNight: 'story.npc.dawnfern2.night',
    },
    {
      // Tier 2 — the nursery keeper's husband steps outside while an
      // egg waits (Gen-2's old man, beside his own door). Same script
      // as his indoor self; the 'nursery_egg' flag swaps which one
      // you meet (set on lay, cleared on claim — events/nursery.ts).
      id: 'dawnfern_nursery_man', sprite: 'ELDER', x: 15, y: 16, facing: 'right',
      movement: 'static', script: 'nursery_egg_man',
      showFlag: 'nursery_egg',
    },
  ],
  signs: [
    { x: 11, y: 1, text: 'story.sign.dawnfern1' },
    { x: 13, y: 11, text: 'story.sign.dawnfern2' },
  ],
})
