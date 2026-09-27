/**
 * LOOMSPIRE CITY — docs/WORLD.md §5. City of the Wind Warden: the
 * Haven (NW), the four-story Wisteria Spire behind its fence line
 * (NE), and the Gym with its statue-flanked door path (SW). The Haven
 * and Gym doors carry their wall plaques; the Spire is bare civic
 * stone. The grunt by the east road is the slice's one Gloam hint.
 */
import { defineMap } from '../../world/defineMap'

export const LOOMSPIRE = defineMap({
  id: 'loomspire',
  name: 'LOOMSPIRE CITY',
  music: 'loomspire',
  outdoor: true,
  legend: {
    'T': 'TREE', '.': 'GRASS', ',': 'GRASS_TUFT', 'p': 'PINE',
    '=': 'PATH', '*': 'FLOWER', '#': 'FENCE', 's': 'SIGN', 'U': 'STATUE',
    '[': 'ROOF_CIVIC_L', 'c': 'ROOF_CIVIC_M', ']': 'ROOF_CIVIC_R',
    'W': 'WALL', 'w': 'WALL_WINDOW', 'D': 'DOOR',
    'a': 'WALL_SIGN_HAVEN', 'g': 'WALL_SIGN_GYM',
  },
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T..,...........########..T',
    'T......,........*[cc]*...T',
    'T................[cc]....T',
    'T...[cc].........[cc]....T',
    'T...[cc].........[cc]....T',
    'T...WWWW.........WWWW....T',
    'T...wDaW.........wDwW....T',
    'T....=......*...s.=..*...T',
    'T....=......,.....=...s..T',
    'T..=======================',
    'T..=======================',
    'T...........==...........T',
    'T...[cc]....==.....,.....T',
    'T...[cc]....==...........T',
    'T...WWWW....==..*..,.....T',
    'T...wDgW.s..==...........T',
    'T...U=U.....==...........T',
    'T....=========...........T',
    'T..,.....................T',
    'T..*..............*...p..T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  warps: [
    { x: 5, y: 7, to: { map: 'loomspire_haven', spawn: 'entry' } },
    { x: 18, y: 7, to: { map: 'wisteria_spire_1f', spawn: 'entry' } },
    { x: 5, y: 16, to: { map: 'loomspire_gym', spawn: 'entry' } },
    { x: 25, y: 10, to: { map: 'trail2', spawn: 'west' } },
    { x: 25, y: 11, to: { map: 'trail2', spawn: 'west' } },
  ],
  edges: {
    right: { map: 'trail2', spawn: 'west' },
  },
  spawns: {
    from_trail2: { x: 24, y: 10, facing: 'left' },
    from_haven: { x: 5, y: 8, facing: 'down' },
    from_spire: { x: 18, y: 8, facing: 'down' },
    from_gym: { x: 5, y: 17, facing: 'down' },
  },
  npcs: [
    {
      // STORY §7 loomspire4 — the lamplighter on the main street.
      id: 'loomspire_woman', sprite: 'WOMAN', x: 10, y: 9, facing: 'down',
      movement: 'wander',
      dialog: 'story.npc.loomspire4.day', dialogNight: 'story.npc.loomspire4.night',
    },
    {
      // STORY §7 loomspire1 — warns that the Spire is haunted after
      // dark; the two-box night line needs a period-aware EVENTS chat.
      id: 'loomspire_man', sprite: 'MAN', x: 20, y: 9, facing: 'up',
      movement: 'static', script: 'npc_loomspire_spire',
    },
    {
      // STORY §7 loomspire2 — the gym admirer outside ARIA's door.
      id: 'loomspire_boy', sprite: 'BOY', x: 8, y: 19, facing: 'up',
      movement: 'wander', script: 'npc_loomspire_gym_fan',
    },
    {
      // STORY §7 loomspire3 — the arcade kid (STORMBOY COLOR!).
      id: 'loomspire_girl', sprite: 'GIRL', x: 22, y: 12, facing: 'left',
      movement: 'wander', script: 'npc_loomspire_arcade_kid',
    },
    {
      // STORY §7 loomspire5 — the stranger in twilight grey watching
      // the Spire: the slice's only GLOAM SYNDICATE hint.
      id: 'loomspire_grunt', sprite: 'GRUNT', x: 21, y: 12, facing: 'up',
      movement: 'static', script: 'npc_loomspire_grunt',
    },
  ],
  signs: [
    { x: 22, y: 9, text: 'story.sign.loomspire1' },
    { x: 9, y: 16, text: 'story.sign.loomspire2' },
    { x: 16, y: 8, text: 'story.sign.loomspire6' },
  ],
})
