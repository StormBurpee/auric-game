/**
 * In-battle creature state: the Kindra itself plus everything that
 * evaporates when the battle ends — stat stages, confusion, flinches,
 * recharge debts. Both the battle engine (calc/capture) and the battle
 * scene speak this shape.
 */
import type { BattleStat, Kindra, Stats } from '../types'
import { statsOf } from '../kindra'

export interface BattleMon {
  k: Kindra
  /** Derived stats, computed once on entry (Gen 2 recalculates on switch-in). */
  stats: Stats
  /** -6..+6 per battle stat. */
  stages: Record<BattleStat, number>
  /** Turns of confusion remaining; 0 = clear-headed. */
  confusedTurns: number
  /** Turns of sleep remaining (mirrors k.status === 'slp'). */
  sleepTurns: number
  flinched: boolean
  mustRecharge: boolean
}

export function intoBattle(k: Kindra): BattleMon {
  return {
    k,
    stats: statsOf(k),
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
    confusedTurns: 0,
    sleepTurns: 0,
    flinched: false,
    mustRecharge: false,
  }
}

export function clampStage(n: number): number {
  return n < -6 ? -6 : n > 6 ? 6 : n
}
