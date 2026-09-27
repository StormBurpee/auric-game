/**
 * Tall-grass dice, rolled exactly as MECHANICS §10 writes them: a /256
 * rate check per step, the 30/30/20/10/5/4/1 slot spread over the
 * current period's table, a level drawn from the slot's range — every
 * draw from the game's one seeded Rng, in that order, so a seed replays
 * the same wilds. Water steps (WAVERIDE) roll the same way over a map's
 * single surf table, rod casts roll a per-cast bite chance in 100 over
 * the fishing table, and wild Kindra may surface holding something
 * (§10.2's cumulative bands, one draw). The weekly bell-toll multiplies
 * the grass/cave rate read only — the single-seam rule.
 */
import type { Rng } from '../../engine'
import { speciesOf } from '../data'
import { weeklyEncounterMult } from '../data/weekly'
import type { Game } from '../game'
import { makeKindra } from '../kindra'
import { ENCOUNTER_SLOT_PERCENTS } from '../types'
import type { EncounterTable, Kindra, MapDef } from '../types'

/** Default surf-step encounter chance in 256 — rarer than grass, the classic cadence. */
export const WATER_RATE_DEFAULT = 15
/** Default bite chance per cast, in 100 — patient, not punishing. */
export const FISHING_BITE_DEFAULT = 60

/** A party member who can stand with you: alive, and not an egg (Tier 2). */
function able(k: Kindra): boolean {
  return k.hp > 0 && k.egg === undefined
}

/** Pick a slot index 0-6 with the classic percent spread (one rand(0..99) draw). */
export function encounterSlot(rng: Rng): number {
  const r = rng.int(100)
  let acc = 0
  for (let i = 0; i < ENCOUNTER_SLOT_PERCENTS.length; i++) {
    acc += ENCOUNTER_SLOT_PERCENTS[i]!
    if (r < acc) return i
  }
  return ENCOUNTER_SLOT_PERCENTS.length - 1
}

/**
 * Roll a species' wild held-item bands (Gen-2's 23%/2% tradition): one
 * rand(0..99) draw, compared against cumulative chances in list order.
 * No bands, no draw — the Rng stream stays pinned for itemless species.
 * @returns the held item key, or null for empty paws.
 */
export function rollHeldItem(
  rng: Rng,
  entries: readonly { item: string; chance: number }[] | undefined,
): string | null {
  if (!entries || entries.length === 0) return null
  const r = rng.int(100)
  let acc = 0
  for (const e of entries) {
    acc += e.chance
    if (r < acc) return e.item
  }
  return null
}

/** Slot pick → level roll → birth → held roll, in pinned Rng order. */
function makeWild(game: Game, table: EncounterTable): Kindra | null {
  const slot = table[encounterSlot(game.rng)] ?? table[0]
  if (!slot) return null
  const level =
    typeof slot.level === 'number' ? slot.level : game.rng.range(slot.level[0], slot.level[1])
  const wild = makeKindra(slot.species, level, { rng: game.rng })
  const held = rollHeldItem(game.rng, speciesOf(slot.species).heldItems)
  if (held !== null) wild.heldItem = held
  return wild
}

/** Per-step roll for a grass tile. @returns the wild Kindra, or null for a quiet step. */
export function rollEncounter(game: Game, map: MapDef): Kindra | null {
  // The wilds keep their distance until you have a companion to stand with you.
  if (!game.state.party.some(able)) return null
  const rate = map.encounterRate
  const tables = map.encounters
  if (rate === undefined || tables === undefined) return null
  // The bell-toll night may multiply the rate read (data/weekly.ts owns the
  // calendar); the draw count and order never change — seeds keep replaying.
  const period = game.period()
  const boosted = Math.min(255, rate * weeklyEncounterMult(map.id, game.day(), period === 'night'))
  if (game.rng.int(256) >= boosted) return null
  return makeWild(game, tables[period])
}

/**
 * Per-step roll for a water tile while riding (WAVERIDE). One 7-slot
 * table serves every period; the rate defaults to the surf cadence.
 */
export function rollWaterEncounter(game: Game, map: MapDef): Kindra | null {
  if (!game.state.party.some(able)) return null
  const table = map.waterEncounters
  if (table === undefined) return null
  if (game.rng.int(256) >= (map.waterRate ?? WATER_RATE_DEFAULT)) return null
  return makeWild(game, table)
}

/**
 * One rand(0..99) draw per cast: did something take the hook? No table,
 * or no able party member, means NO draw — the stream stays pinned
 * (rollHeldItem's "no bands, no draw" rule, applied to the lake).
 */
export function rollBite(game: Game, map: MapDef): boolean {
  if (!game.state.party.some(able)) return false
  if (map.fishingEncounters === undefined) return false
  return game.rng.int(100) < (map.fishingRate ?? FISHING_BITE_DEFAULT)
}

/** Slot pick → level → birth → held roll, grass cadence (call only after a true rollBite). */
export function rollFishingEncounter(game: Game, map: MapDef): Kindra | null {
  const table = map.fishingEncounters
  return table === undefined ? null : makeWild(game, table)
}
