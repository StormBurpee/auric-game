/**
 * The art registry. Game code asks for art by key; pixels live in the
 * sibling modules (tiles.ts, characters.ts, mons/*, ui.ts, title.ts).
 * Accessors throw loudly: a missing sprite is a build-time bug, not a
 * soft error.
 */
import type { TileKey } from '../world/tiles'
import { CHAR_ART_TABLE, PLAYER_BACK } from './characters'
import { EGG_ART } from './mons/egg'
import { MONS_1 } from './mons/mons1'
import { MONS_2 } from './mons/mons2'
import { MONS_3, TRAINERS_3 } from './mons/mons3'
import { TILE_ART_TABLE } from './tiles'
import { TITLE_ART_TABLE } from './title'
import type { CharArt, MonArt, TileArt, TitleArt, TrainerArt, UiArt } from './types'
import { UI_ART_TABLE } from './ui'

export const TILE_ART: Partial<Record<TileKey, TileArt>> = TILE_ART_TABLE

/** Every species, plus 'EGG' — the nursery's veiled card and hatch art. */
export const MON_ART: Record<string, MonArt> = { ...MONS_1, ...MONS_2, ...MONS_3, EGG: EGG_ART }

/** The egg by name, for callers that never touch a species key. */
export { EGG_ART } from './mons/egg'

export const CHAR_ART: Record<string, CharArt> = CHAR_ART_TABLE

/** 16x8 splash overlay for the surf waterline; draw with PLAYER_SURF's palette. */
export { SURF_WAKE } from './characters'

/** 8x8 fishing float for the cast scene; draw with PLAYER_SURF's palette. */
export { BOBBER } from './characters'

export const TRAINER_ART: Record<string, TrainerArt> = { ...TRAINERS_3, PLAYER_BACK }

export const UI_ART: UiArt = UI_ART_TABLE

export const TITLE_ART: TitleArt = TITLE_ART_TABLE

export function tileArtOf(key: TileKey): TileArt {
  const a = TILE_ART[key]
  if (!a) throw new Error(`missing tile art '${key}'`)
  return a
}

export function monArtOf(species: string): MonArt {
  const a = MON_ART[species]
  if (!a) throw new Error(`missing mon art '${species}'`)
  return a
}

export function charArtOf(key: string): CharArt {
  const a = CHAR_ART[key]
  if (!a) throw new Error(`missing character art '${key}'`)
  return a
}

export function trainerArtOf(key: string): TrainerArt {
  const a = TRAINER_ART[key]
  if (!a) throw new Error(`missing trainer art '${key}'`)
  return a
}
