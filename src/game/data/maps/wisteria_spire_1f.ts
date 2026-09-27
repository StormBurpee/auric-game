/**
 * WISTERIA SPIRE 1F — docs/WORLD.md §13. The haunted ground floor:
 * pillar blocks, watching statues, withered wisteria, and the stairs —
 * unroped at last (Tier 1): real STAIRS tiles now climb to the dark
 * 2F teaser room and its TOLL SHARD.
 *
 * Encounters are cave-style: every walkable tile rolls. WORLD wants
 * them NIGHT only, but MapDef has no per-period gate, so the night
 * table serves all three periods — a deliberate slice simplification
 * (the Spire hums faintly by day instead of sleeping).
 */
import { defineMap } from '../../world/defineMap'
import type { EncounterSlot, EncounterTable } from '../../types'

const sl = (species: string, level: number): EncounterSlot => ({ species, level })

/** The Spire's one table (WORLD §13); 2F shares it in the gloom. */
export const SPIRE_NIGHT: EncounterTable = [
  sl('WISPETAL', 6), sl('TOLLGEIST', 6), sl('WISPETAL', 5), sl('DUSKMOTH', 6),
  sl('HUSHOWL', 7), sl('DUSKMOTH', 8), sl('HUSHOWL', 8),
]

export const WISTERIA_SPIRE_1F = defineMap({
  id: 'wisteria_spire_1f',
  name: '',
  music: 'spire_night',
  outdoor: false,
  legend: {
    'W': 'WALL_INT', 't': 'FLOOR_STONE', 'S': 'STAIRS', 'U': 'STATUE',
    'P': 'PLANT_POT', 'm': 'MAT',
  },
  rows: [
    'WWWWWWWWWWWW',
    'WttttSSttttW',
    'WttttttttttW',
    'WtWWttttWWtW',
    'WttttttttttW',
    'WtttUttUtttW',
    'WttttttttttW',
    'WtWWttttWWtW',
    'WttttttttttW',
    'WtPttttttPtW',
    'WttttttttttW',
    'WWWWWmmWWWWW',
  ],
  warps: [
    { x: 5, y: 11, to: { map: 'loomspire', spawn: 'from_spire' } },
    { x: 6, y: 11, to: { map: 'loomspire', spawn: 'from_spire' } },
    { x: 5, y: 1, to: { map: 'wisteria_spire_2f', spawn: 'entry' } },
    { x: 6, y: 1, to: { map: 'wisteria_spire_2f', spawn: 'entry' } },
  ],
  spawns: {
    entry: { x: 5, y: 10, facing: 'up' },
    stairs: { x: 5, y: 2, facing: 'down' },
  },
  npcs: [
    {
      // The watcher keeping an eye on the strangers in grey (the same
      // 'Spire sings at night' wisdom Rowan repeats — shared on purpose).
      id: 'spire_watcher', sprite: 'MAN', x: 3, y: 9, facing: 'right',
      movement: 'static', script: 'npc_spire_watcher',
    },
  ],
  caveEncounters: true,
  encounterRate: 30,
  encounters: {
    morning: SPIRE_NIGHT,
    day: SPIRE_NIGHT,
    night: SPIRE_NIGHT,
  },
})
