/**
 * Held items in battle — the pure cores of MECHANICS §2.2 (the crit
 * ladder), §2.4 (the Item term), §5.5 (berry triggers) and §11.7 (the
 * end-of-turn item phase). Registry-free pieces first, per the
 * capture.ts pattern, so tests/mechanics.test.ts drives them with
 * inline HoldEffect fixtures; `heldEffect` is the one registry-aware
 * wrapper the battle scene and calc lean on.
 *
 * Consumption is deliberately NOT here: `berryTrigger` only reports
 * that a berry would fire. The scene deletes `k.heldItem` so the
 * narration, HP animation and the save-shaped Kindra change in one
 * place.
 */
import { itemOf } from '../data'
import type { ElemType, HoldEffect, Kindra, StatusId } from '../types'

/** The holder's battle effect, or null when its hands are empty (or the item is not a hold item). */
export function heldEffect(k: Kindra): HoldEffect | null {
  if (!k.heldItem) return null
  const fx = itemOf(k.heldItem).effect
  return fx.kind === 'hold' ? fx.fx : null
}

/** §2.4 Item term: does this held effect boost moves of `moveType` (×1.1)? */
export function typeBoostApplies(fx: HoldEffect | null, moveType: ElemType): boolean {
  return fx !== null && fx.kind === 'typeBoost' && fx.type === moveType
}

/**
 * §2.2 crit thresholds of 256, indexed by stage — the Gen-2 ladder.
 * Stage 1 (a held critBoost item alone) is exactly one Gen-2 stage up
 * from the 17/256 base: 32/256 = 1/8.
 */
export const CRIT_LADDER = [17, 32, 64, 85] as const

/** §2.2: ladder stage = (+2 for a high-crit move) + (+1 for a held critBoost item). 0..3. */
export function critStage(highCrit: boolean, fx: HoldEffect | null): number {
  return (highCrit ? 2 : 0) + (fx !== null && fx.kind === 'critBoost' ? 1 : 0)
}

/** §11.7 leftovers analog: max(1, floor(maxHP/16)) — the min-1 clamp matters below maxHP 16. */
export function leftoversAmount(maxHp: number): number {
  return Math.max(1, Math.floor(maxHp / 16))
}

/** What a berry check found: a status cure, an HP top-up, or nothing. */
export type BerryFire = { kind: 'cure' } | { kind: 'hp'; heal: number } | null

/**
 * §5.5 berry predicate, state-based: a cure berry fires while the
 * holder has a status it cures; an HP berry fires at or below half
 * (`hp * 2 <= maxHp`), healing `min(heal, maxHp - hp)`. A fainted
 * holder never pops its berry. Pure — reports, does not consume.
 */
export function berryTrigger(
  fx: HoldEffect | null,
  status: StatusId | null,
  hp: number,
  maxHp: number,
): BerryFire {
  if (fx === null || hp <= 0) return null
  if (fx.kind === 'cureBerry' && status !== null && (fx.cures === 'all' || fx.cures === status)) {
    return { kind: 'cure' }
  }
  if (fx.kind === 'hpBerry' && hp * 2 <= maxHp) {
    return { kind: 'hp', heal: Math.min(fx.heal, maxHp - hp) }
  }
  return null
}
