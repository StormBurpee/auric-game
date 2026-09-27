/**
 * WISTERIA SPIRE 2F — docs/WORLD.md §14. The dark teaser room above the
 * haunted ground floor: pitch black (`dark`), so until LUMINA earns a
 * badge the player explores by the narrow circle of light around their
 * feet. The layout is deliberately fair in the gloom — one open ring of
 * floor, statues as landmarks, no dead ends — with the TOLL SHARD
 * glinting in the far corner (the Gloam arc's front door).
 *
 * Encounters share 1F's single table, cave-style on every walkable
 * tile, at a gentler rate — the dark is the hazard here, not the wilds.
 */
import { defineMap } from '../../world/defineMap'
import { SPIRE_NIGHT } from './wisteria_spire_1f'

export const WISTERIA_SPIRE_2F = defineMap({
  id: 'wisteria_spire_2f',
  name: '',
  music: 'spire_night',
  outdoor: false,
  dark: true,
  legend: {
    'W': 'WALL_INT', 't': 'FLOOR_STONE', 'Z': 'STAIRS', 'U': 'STATUE',
    'P': 'PLANT_POT',
  },
  rows: [
    'WWWWWWWWWW',
    'WZtttttPtW',
    'WtttUttttW',
    'WttttttttW',
    'WttUttUttW',
    'WttttttttW',
    'WttttUtttW',
    'WttttttttW',
    'WtPttttttW',
    'WWWWWWWWWW',
  ],
  warps: [
    { x: 1, y: 1, to: { map: 'wisteria_spire_1f', spawn: 'stairs' } },
  ],
  spawns: {
    entry: { x: 2, y: 1, facing: 'right' },
  },
  items: [
    // The guaranteed TOLL SHARD find, visible even in the 20px gloom.
    { id: 'spire2f_shard', x: 8, y: 8, item: 'TOLL_SHARD', qty: 1 },
  ],
  caveEncounters: true,
  encounterRate: 20,
  encounters: {
    morning: SPIRE_NIGHT,
    day: SPIRE_NIGHT,
    night: SPIRE_NIGHT,
  },
})
