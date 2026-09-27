/**
 * TRAIL 1 — docs/WORLD.md §2. The vertical road from Dawnfern to
 * Bellmere. Two full-corridor TALL_GRASS bands (y6-8, y19-21) gate
 * progress — there is no grass-free line to Bellmere — and the two
 * LEDGE_S rows (y15, y25) are one-way hops south. A HEW grove on the
 * east flank (sealed but for the SAPLING at (17,2)) hides the AMBER
 * CRUMB; the TINGLE BERRY sits openly among the west flowers.
 * Encounter levels and the 30/30/20/10/5/4/1 slot tables transcribe
 * WORLD §2 / ROSTER §D.
 */
import { defineMap } from '../../world/defineMap'
import type { EncounterSlot } from '../../types'

const sl = (species: string, level: number): EncounterSlot => ({ species, level })

export const TRAIL1 = defineMap({
  id: 'trail1',
  name: 'TRAIL 1',
  music: 'trail',
  outdoor: true,
  legend: {
    'T': 'TREE', '.': 'GRASS', ',': 'GRASS_TUFT', 'p': 'PINE',
    '"': 'TALL_GRASS', '=': 'PATH', '*': 'FLOWER', 'o': 'ROCK',
    'v': 'LEDGE_S', 's': 'SIGN', 'Y': 'SAPLING',
  },
  rows: [
    'TTTTTTTTT==TTTTTTTTT',
    'T........==...T....T',
    'T..*..,..==....TTYTT',
    'T........==........T',
    'T..TTTp..==...TTT..T',
    'T...,....==......,.T',
    'TTTTTTT""""""TTTTTTT',
    'TTTTTTT""""""TTTTTTT',
    'TTTTTTT""""""TTTTTTT',
    'T........==....,...T',
    'T.o......==......o.T',
    'T....,...==........T',
    'T..""""..==..""""..T',
    'T..""""..==..""""..T',
    'T........==..,.....T',
    'Tvvvvvvvv==vvvvvvvvT',
    'T...,....==........T',
    'T..*.....==.....*..T',
    'T........==......,.T',
    'TTTTTT""""""TTTTTTTT',
    'TTTTTT""""""TTTTTTTT',
    'TTTTTT""""""TTTTTTTT',
    'T...,....==....,...T',
    'T...o....==....o...T',
    'T........==........T',
    'Tvvvvvvvv==vvvvvvvvT',
    'T.....,..==........T',
    'T..."""..==..."""..T',
    'T........==...,....T',
    'T..TTp...==....TT..T',
    'T........==........T',
    'T.s......==....,...T',
    'T........==........T',
    'T...*....==....*...T',
    'T...,....==........T',
    'TTTTTTTTT==TTTTTTTTT',
  ],
  warps: [
    { x: 9, y: 35, to: { map: 'dawnfern', spawn: 'from_trail1' } },
    { x: 10, y: 35, to: { map: 'dawnfern', spawn: 'from_trail1' } },
    { x: 9, y: 0, to: { map: 'bellmere', spawn: 'from_trail1' } },
    { x: 10, y: 0, to: { map: 'bellmere', spawn: 'from_trail1' } },
  ],
  edges: {
    down: { map: 'dawnfern', spawn: 'from_trail1' },
    up: { map: 'bellmere', spawn: 'from_trail1' },
  },
  spawns: {
    south: { x: 9, y: 34, facing: 'up' },
    north: { x: 9, y: 1, facing: 'down' },
  },
  npcs: [
    {
      // STORY §7 bellmere4 — the angler's TORTIDE tall tale, told by the
      // kid headed up to the lake (two boxes, strung by an EVENTS chat).
      id: 'trail1_boy', sprite: 'BOY', x: 5, y: 32, facing: 'right',
      movement: 'wander', script: 'npc_trail1_boy',
    },
    {
      // STORY §7 bellmere3 — ledge hopping, explained between the
      // trail's two ledge rows where the lesson lands.
      id: 'trail1_woman', sprite: 'WOMAN', x: 14, y: 17, facing: 'down',
      movement: 'static', script: 'npc_trail1_woman',
    },
    {
      // Tier 2 — the berry gran, Sunday mornings only, beside the west
      // flowers and the open TINGLE BERRY (hers, of course). One
      // hold-berry per week, rotation in data/weekly.ts.
      id: 'trail1_gran', sprite: 'ELDER', x: 5, y: 17, facing: 'down',
      movement: 'static', script: 'berry_gran',
      appears: { days: [0], periods: ['morning'] },
    },
  ],
  signs: [
    { x: 2, y: 31, text: 'story.sign.trail11' },
  ],
  items: [
    { id: 'trail1_charm', x: 3, y: 10, item: 'CHARM', qty: 1 },
    { id: 'trail1_tonic', x: 17, y: 23, item: 'TONIC', qty: 1 },
    // Behind the HEW grove's sapling — the pocket's only mouth.
    { id: 'trail1_grove', x: 16, y: 1, item: 'AMBER_CRUMB', qty: 1 },
    // In the open by the west flowers; no skill needed, just eyes.
    { id: 'trail1_berry', x: 4, y: 17, item: 'TINGLE_BERRY', qty: 1 },
  ],
  encounterRate: 25,
  encounters: {
    morning: [
      sl('SCURRIL', 3), sl('WRENLET', 3), sl('THREDLE', 2), sl('DEWBELL', 3),
      sl('DEWBELL', 4), sl('SPOOLEN', 4), sl('WRENLET', 4),
    ],
    day: [
      sl('SCURRIL', 3), sl('WRENLET', 3), sl('THREDLE', 2), sl('SCURRIL', 4),
      sl('SPOOLEN', 4), sl('WRENLET', 4), sl('THREDLE', 4),
    ],
    night: [
      sl('SCURRIL', 3), sl('DUSKMOTH', 3), sl('HUSHOWL', 3), sl('THREDLE', 2),
      sl('THREDLE', 3), sl('HUSHOWL', 4), sl('SCURRIL', 4),
    ],
  },
})
