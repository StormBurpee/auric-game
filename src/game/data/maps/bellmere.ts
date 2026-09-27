/**
 * BELLMERE TOWN — docs/WORLD.md §3. The lakeside town: Haven (NW),
 * Elder Rowan's house (NE, home roof), Outfitter (SW), and the sand-
 * rimmed lake with its shore TALL_GRASS band (x13-15, y10-13). The
 * Haven and Outfitter doors carry their wall plaques; Rowan's house is
 * a home. Shore-grass slots transcribe WORLD §3 / ROSTER §D.
 *
 * The lake is open water for WAVERIDE: mount from the SAND rim, roll
 * the period-less surf table per water step (rate 15/256), and the
 * two-tile islet at (20,11)-(20,12) holds the KEEN LENS — reachable
 * only by riding the waves.
 *
 * Tier 2 puts the OLD ROD's whole arc on the south sand: the angler at
 * (18,14) gives it, the rod table (60-in-100 bite per cast) reaches the
 * lake's deeper, older residents, and on Saturdays the market vendor
 * sets up his one-rare stall at (17,14).
 */
import { defineMap } from '../../world/defineMap'
import type { EncounterSlot } from '../../types'

const sl = (species: string, level: number): EncounterSlot => ({ species, level })

export const BELLMERE = defineMap({
  id: 'bellmere',
  name: 'BELLMERE TOWN',
  music: 'bellmere',
  outdoor: true,
  legend: {
    'T': 'TREE', '.': 'GRASS', ',': 'GRASS_TUFT', 'p': 'PINE',
    '"': 'TALL_GRASS', '=': 'PATH', '~': 'WATER', 'd': 'SAND', 's': 'SIGN',
    '{': 'ROOF_HOME_L', 'h': 'ROOF_HOME_M', '}': 'ROOF_HOME_R',
    '[': 'ROOF_CIVIC_L', 'c': 'ROOF_CIVIC_M', ']': 'ROOF_CIVIC_R',
    'W': 'WALL', 'w': 'WALL_WINDOW', 'D': 'DOOR',
    'a': 'WALL_SIGN_HAVEN', 'k': 'WALL_SIGN_SHOP',
  },
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTT',
    'T.....,...........,.p..T',
    'T.[cc]....{hh}.........T',
    'T.[cc]....{hh}..d~~~~~~T',
    'T.WWWW....WWWW..d~~~~~~T',
    'T.wDaW....wDwW..d~~~~~~T',
    'T..=.......=..,.d~~~~~~T',
    'T..=.......=....d~~~~~~T',
    '===============sd~~~~~~T',
    '=..=.......==...d~~~~~~T',
    'T.[cc].....=="""d~~~~~~T',
    'T.[cc].....=="""d~~~d~~T',
    'T.WWWW.....=="""d~~~d~~T',
    'T.wDkW.....=="""d~~~~~~T',
    'T..=.......==...dddddddT',
    'T..==========...,......T',
    'T.,........==s.........T',
    'TTTTTTTTTTT==TTTTTTTTTTT',
  ],
  warps: [
    { x: 3, y: 5, to: { map: 'bellmere_haven', spawn: 'entry' } },
    { x: 11, y: 5, to: { map: 'elder_house', spawn: 'entry' } },
    { x: 3, y: 13, to: { map: 'bellmere_outfitter', spawn: 'entry' } },
    { x: 11, y: 17, to: { map: 'trail1', spawn: 'north' } },
    { x: 12, y: 17, to: { map: 'trail1', spawn: 'north' } },
    { x: 0, y: 8, to: { map: 'trail2', spawn: 'east' } },
    { x: 0, y: 9, to: { map: 'trail2', spawn: 'east' } },
  ],
  edges: {
    down: { map: 'trail1', spawn: 'north' },
    left: { map: 'trail2', spawn: 'east' },
  },
  spawns: {
    from_trail1: { x: 11, y: 16, facing: 'up' },
    from_trail2: { x: 1, y: 8, facing: 'right' },
    from_haven: { x: 3, y: 6, facing: 'down' },
    from_elder: { x: 11, y: 6, facing: 'down' },
    from_outfitter: { x: 3, y: 14, facing: 'down' },
  },
  npcs: [
    {
      // STORY §7 bellmere2 — the night watcher by the shore grass. Her
      // day/night lines moved into a script so Saturdays can add the
      // market hint (Tier 2); the string keys themselves are unchanged.
      id: 'bellmere_girl', sprite: 'GIRL', x: 14, y: 9, facing: 'down',
      movement: 'wander', script: 'npc_bellmere_market',
    },
    {
      // STORY §7 bellmere1 — the elder's three-box dedication, strung
      // by an EVENTS chat script.
      id: 'bellmere_man', sprite: 'MAN', x: 8, y: 14, facing: 'up',
      movement: 'static', script: 'npc_bellmere_elder',
    },
    {
      // STORY §7 bellmere5 (Tier 2) — the old angler on the sand,
      // facing his lake. He told the boy's tall tale, and he gives the
      // OLD ROD away exactly once ('old_rod_given').
      id: 'bellmere_angler', sprite: 'ELDER', x: 18, y: 14, facing: 'up',
      movement: 'static', script: 'npc_bellmere_angler',
    },
    {
      // Tier 2 — the Saturday market vendor on the sand rim beside the
      // angler; `appears` keeps his stall a weekly appointment.
      id: 'bellmere_market', sprite: 'MAN', x: 17, y: 14, facing: 'down',
      movement: 'static', script: 'market_vendor',
      appears: { days: [6] },
    },
  ],
  signs: [
    { x: 15, y: 8, text: 'story.sign.bellmere1' },
    { x: 13, y: 16, text: 'story.sign.bellmere2' },
  ],
  items: [
    // On the surf islet — dismount on the south tile, face up, claim it.
    { id: 'bellmere_islet', x: 20, y: 11, item: 'KEEN_LENS', qty: 1 },
  ],
  encounterRate: 20,
  encounters: {
    morning: [
      sl('PADDLET', 5), sl('WRENLET', 4), sl('DEWBELL', 5), sl('PADDLET', 6),
      sl('PADDLET', 4), sl('DEWBELL', 6), sl('WRENLET', 7),
    ],
    day: [
      sl('PADDLET', 5), sl('WRENLET', 5), sl('PADDLET', 6), sl('SCURRIL', 5),
      sl('SCURRIL', 6), sl('SCURRIL', 4), sl('PADDLET', 7),
    ],
    night: [
      sl('PADDLET', 5), sl('HUSHOWL', 5), sl('DUSKMOTH', 5), sl('PADDLET', 6),
      sl('DUSKMOTH', 6), sl('DUSKMOTH', 4), sl('HUSHOWL', 7),
    ],
  },
  // The lake itself: one period-less surf table (WORLD §3), levels 5-10.
  // PADDLET paddles everywhere, TORTIDE holds the middle slots, and the
  // 1% is a DEWBELL adrift on the lake mist at any hour.
  waterRate: 15,
  waterEncounters: [
    sl('PADDLET', 5), sl('PADDLET', 7), sl('PADDLET', 6), sl('TORTIDE', 8),
    sl('TORTIDE', 10), sl('PADDLET', 9), sl('DEWBELL', 10),
  ],
  // The rod reaches where paddling can't: deeper, older (Tier 2,
  // ROSTER §D rod band). DEWBELL keeps its lake-mist exception, and the
  // 1% at the bottom is the angler's tall tale made flesh — a sleeping
  // lv 15 TORTIDE.
  fishingRate: 60,
  fishingEncounters: [
    { species: 'PADDLET', level: [6, 9] },   // 30%
    { species: 'PADDLET', level: [8, 11] },  // 30%
    sl('TORTIDE', 10),                       // 20%
    sl('TORTIDE', 12),                       // 10%
    sl('PADDLET', 12),                       //  5%
    sl('DEWBELL', 10),                       //  4%
    sl('TORTIDE', 15),                       //  1% — the sleeping one
  ],
})
