/**
 * The capture formula and the wobble drama, MECHANICS.md §8. The pure
 * pieces (charmRateMod, modifiedCatchValue, shakeChance, resolveCapture)
 * carry the spec's T7/T8 vectors registry-free; attemptCapture is the
 * composition the battle scene calls. The AURIC SIGIL short-circuits
 * before any math, rng, or registry lookup.
 */
import type { Rng } from '../../engine'
import { speciesOf } from '../data'
import type { Item } from '../types'
import type { BattleMon } from './state'

export interface CaptureResult {
  caught: boolean
  /** 0-3 wobbles before escape (3 = "so close!"); irrelevant when caught. */
  shakes: number
}

/** §8.4 shake table rows: [highest `a` of the row, wobble byte `b`]. */
const SHAKE_TABLE: ReadonlyArray<readonly [number, number]> = [
  [1, 63], [2, 75], [3, 84], [4, 90], [5, 95], [7, 103], [10, 113], [15, 126],
  [20, 134], [30, 149], [40, 160], [50, 169], [60, 177], [80, 191], [100, 201],
  [120, 211], [140, 220], [160, 227], [180, 234], [200, 240], [220, 246],
  [240, 251], [254, 253], [255, 255],
]

/** §8.1: a charm's effective catch rate, capped at 255. mult is authored in half steps (1, 1.5), so doubled integer math keeps the floor exact. */
export function charmRateMod(rate: number, mult: number): number {
  return Math.min(Math.floor((rate * Math.round(mult * 2)) / 2), 255)
}

/** §8.2: the modified catch value `a`, 1-255. The +10 bonus applies to SLP/FRZ only (Gen 2 faithful). */
export function modifiedCatchValue(maxHp: number, curHp: number, rateMod: number, asleepOrFrozen: boolean): number {
  const a = Math.max(Math.floor(((3 * maxHp - 2 * curHp) * rateMod) / (3 * maxHp)), 1) + (asleepOrFrozen ? 10 : 0)
  return Math.min(a, 255)
}

/** §8.4: the per-shake success byte `b` shown after a failed throw. */
export function shakeChance(a: number): number {
  for (const [maxA, b] of SHAKE_TABLE) if (a <= maxA) return b
  return 255
}

/**
 * §8.3-8.4: the single catch roll (rand(0..255) <= a; a = 255 always
 * catches), then on failure up to 3 shake checks (rand(0..255) < b),
 * stopping at the first miss — the success count is the wobbles shown.
 */
export function resolveCapture(rng: Rng, a: number): CaptureResult {
  if (rng.byte() <= a) return { caught: true, shakes: 3 }
  const b = shakeChance(a)
  let shakes = 0
  while (shakes < 3 && rng.byte() < b) shakes += 1
  return { caught: false, shakes }
}

export function attemptCapture(rng: Rng, target: BattleMon, charm: Item): CaptureResult {
  const effect = charm.effect
  if (effect.kind !== 'charm') throw new Error(`item '${charm.key}' is not a charm`)
  if (effect.sigil) return { caught: true, shakes: 3 } // AURIC SIGIL: guaranteed, skip all math
  const rateMod = charmRateMod(speciesOf(target.k.species).catchRate, effect.mult)
  const a = modifiedCatchValue(
    target.stats.hp,
    target.k.hp,
    rateMod,
    target.k.status === 'slp' || target.k.status === 'frz',
  )
  return resolveCapture(rng, a)
}
