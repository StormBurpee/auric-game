/**
 * TRAIL 2 — docs/WORLD.md §4. The horizontal gauntlet between Bellmere
 * and Loomspire: two tree-capped TALL_GRASS bands across the path rows
 * (y8-9), four line-of-sight trainers whose gazes cover both rows, and
 * CORVIN's scripted ambush at the west end (sightScript fires the
 * 'rival_ambush' event; he is gone for good once 'rival1_done' is set).
 * The y11 ledge row drops one-way into a trainer-free south corridor
 * that reconnects only at the east (Bellmere) end — except for the
 * BOULDER at (4,11): one HEAVE nudge (badge pending; teaser text for
 * now) opens a west-end climb out of the corridor. The 1% slots carry
 * the rumors: ZEPHYRIL by light, AMBERSTAG by night (ROSTER §D).
 */
import { defineMap } from '../../world/defineMap'
import type { EncounterSlot } from '../../types'

const sl = (species: string, level: number): EncounterSlot => ({ species, level })

export const TRAIL2 = defineMap({
  id: 'trail2',
  name: 'TRAIL 2',
  music: 'trail',
  outdoor: true,
  legend: {
    'T': 'TREE', '.': 'GRASS', ',': 'GRASS_TUFT', 'p': 'PINE',
    '"': 'TALL_GRASS', '=': 'PATH', '*': 'FLOWER', 'o': 'ROCK',
    'v': 'LEDGE_S', 's': 'SIGN', 'B': 'BOULDER',
  },
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T....,......TTT........TTT....,....T',
    'T...........TTT...,....TTTp........T',
    'T..........."""........""".........T',
    'T....o......"""...,....""".....,...T',
    'T..........."""........""".........T',
    'T.,........."""........""".........T',
    'T.s........."""........""".......s.T',
    '============"""========"""==========',
    '============"""========"""==========',
    'T..........."""........""".........T',
    'TTTvBvvvvvvvvvvvvvvvvvvvvvvvvvv....T',
    'TTT.......,..............,.........T',
    'TTT...*.......................*....T',
    'TTT......,......................o..T',
    'TTT..*..........................*..T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  warps: [
    { x: 35, y: 8, to: { map: 'bellmere', spawn: 'from_trail2' } },
    { x: 35, y: 9, to: { map: 'bellmere', spawn: 'from_trail2' } },
    { x: 0, y: 8, to: { map: 'loomspire', spawn: 'from_trail2' } },
    { x: 0, y: 9, to: { map: 'loomspire', spawn: 'from_trail2' } },
  ],
  edges: {
    right: { map: 'bellmere', spawn: 'from_trail2' },
    left: { map: 'loomspire', spawn: 'from_trail2' },
  },
  spawns: {
    east: { x: 34, y: 8, facing: 'left' },
    west: { x: 1, y: 8, facing: 'right' },
  },
  npcs: [
    // Westbound order: BEN, grass, MAE, OTTO, grass, IVY, then CORVIN.
    // Each gaze (sight 3) crosses both path rows; `dialog` is the
    // trainer's post-defeat chat line (the overworld battles first).
    {
      id: 'trail2_ben', sprite: 'SCOUT', x: 29, y: 6, facing: 'down',
      movement: 'static', trainer: { key: 'SCOUT_BEN', sight: 3 },
      dialog: 'story.trainer.ben.post',
    },
    {
      id: 'trail2_mae', sprite: 'WOMAN', x: 20, y: 10, facing: 'up',
      movement: 'static', trainer: { key: 'FORAGER_MAE', sight: 3 },
      dialog: 'story.trainer.mae.post',
    },
    {
      id: 'trail2_otto', sprite: 'MAN', x: 16, y: 6, facing: 'down',
      movement: 'static', trainer: { key: 'BELLRINGER_OTTO', sight: 3 },
      dialog: 'story.trainer.otto.post',
    },
    {
      id: 'trail2_ivy', sprite: 'WOMAN', x: 8, y: 10, facing: 'up',
      movement: 'static', trainer: { key: 'HERBALIST_IVY', sight: 3 },
      dialog: 'story.trainer.ivy.post',
    },
    {
      // The ambush: sight 4 covers (4,7)-(4,10) — both path rows and
      // their shoulders. `script` doubles the trigger on a direct talk,
      // so the beat still fires when line-of-sight missed.
      id: 'trail2_corvin', sprite: 'RIVAL', x: 4, y: 6, facing: 'down',
      movement: 'static',
      sightScript: { script: 'rival_ambush', sight: 4 },
      script: 'rival_ambush',
      hideFlag: 'rival1_done',
    },
  ],
  signs: [
    { x: 33, y: 7, text: 'story.sign.trail21' },
    { x: 2, y: 7, text: 'story.sign.trail22' },
  ],
  items: [
    { id: 'trail2_tonic', x: 5, y: 13, item: 'TONIC', qty: 1 },
    { id: 'trail2_charm', x: 33, y: 13, item: 'CHARM', qty: 1 },
  ],
  encounterRate: 30,
  encounters: {
    morning: [
      sl('WRENLET', 5), sl('SCURRIL', 5), sl('THREDLE', 5), sl('DEWBELL', 5),
      sl('DEWBELL', 6), sl('DEWBELL', 4), sl('ZEPHYRIL', 7),
    ],
    day: [
      sl('WRENLET', 5), sl('SCURRIL', 5), sl('THREDLE', 5), sl('SPOOLEN', 5),
      sl('SPOOLEN', 6), sl('THREDLE', 6), sl('ZEPHYRIL', 7),
    ],
    night: [
      sl('SCURRIL', 5), sl('HUSHOWL', 5), sl('DUSKMOTH', 5), sl('SHADEKIT', 5),
      sl('SHADEKIT', 6), sl('SHADEKIT', 7), sl('AMBERSTAG', 7),
    ],
  },
})
