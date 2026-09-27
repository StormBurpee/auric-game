/**
 * The mechanics of a single battle turn, MECHANICS.md §5, §6, §11.6,
 * §12: action order, the pre-move can-act gauntlet (recharge → sleep →
 * freeze → flinch → confusion → paralysis, first failure ends the
 * action), status and stage infliction with their immunity rules, the
 * multi-hit count table, and STRUGGLE. Everything here mutates
 * BattleMon state and reports what happened as plain data; the scene
 * owns all narration and animation around these calls.
 */
import type { Rng } from '../../engine'
import { speciesOf } from '../data'
import type { BattleStat, Move, StatusId } from '../types'
import { confusionSelfDamage, effectiveStat } from './calc'
import { clampStage } from './state'
import type { BattleMon } from './state'

/**
 * §11.6: the no-PP fallback. Normal-type physical, power 50, accuracy
 * 100 (keeps the 1/256 miss), no PP cost; the recoil rider is exactly
 * the §12 RECOIL_25 quarter. Subject to Ghost immunity like any Normal
 * move.
 */
export const STRUGGLE: Move = {
  key: 'STRUGGLE',
  name: 'Struggle',
  type: 'normal',
  power: 50,
  accuracy: 100,
  pp: 0,
  effect: { kind: 'strike', riders: [{ kind: 'recoil' }] },
}

/** Display names for {STAT}, all within the 8-char placeholder budget. */
export const STAT_LABEL: Record<BattleStat, string> = {
  atk: 'ATTACK',
  def: 'DEFENSE',
  spa: 'SPCL.ATK',
  spd: 'SPCL.DEF',
  spe: 'SPEED',
  acc: 'ACCURACY',
  eva: 'EVADE',
}

/**
 * §6: does `a` move before `b`? Priority bracket first, then effective
 * Speed (stages applied, paralysis quartering), exact ties 50/50.
 */
export function actsFirst(rng: Rng, a: BattleMon, b: BattleMon, moveA: Move, moveB: Move): boolean {
  const pa = moveA.priority ?? 0
  const pb = moveB.priority ?? 0
  if (pa !== pb) return pa > pb
  const sa = effectiveStat(a, 'spe')
  const sb = effectiveStat(b, 'spe')
  if (sa !== sb) return sa > sb
  return rng.range(0, 1) === 0
}

export type GauntletEvent =
  | { kind: 'recharge' }
  | { kind: 'asleep' }
  | { kind: 'woke' }
  | { kind: 'frozen' }
  | { kind: 'thawed' }
  | { kind: 'flinched' }
  | { kind: 'confused' }
  | { kind: 'snapped' }
  | { kind: 'selfHit'; damage: number }
  | { kind: 'fullPar' }

export interface GauntletResult {
  /** False = the action is lost; the events explain why. */
  acts: boolean
  /** Beats to narrate, in order (a wake/thaw/snap can precede acting). */
  events: GauntletEvent[]
}

/**
 * §5's can-act checks in their fixed order. Mutates counters and flags
 * (recharge debt cleared, sleep decremented first, thaw rolled at 10%,
 * flinch consumed, confusion decremented then 50% self-hit, full
 * paralysis at 25%). A self-hit's damage is reported, not applied — the
 * scene applies it so the HP bar can drain on cue.
 */
export function preMoveGauntlet(rng: Rng, mon: BattleMon): GauntletResult {
  const events: GauntletEvent[] = []
  if (mon.mustRecharge) {
    mon.mustRecharge = false
    return { acts: false, events: [{ kind: 'recharge' }] }
  }
  if (mon.k.status === 'slp') {
    mon.sleepTurns -= 1
    if (mon.sleepTurns <= 0) {
      mon.k.status = null
      events.push({ kind: 'woke' }) // Gen 2: wakes and acts this same turn
    } else {
      return { acts: false, events: [{ kind: 'asleep' }] }
    }
  }
  if (mon.k.status === 'frz') {
    if (rng.range(0, 99) < 10) {
      mon.k.status = null
      events.push({ kind: 'thawed' }) // thaws and acts this turn
    } else {
      return { acts: false, events: [...events, { kind: 'frozen' }] }
    }
  }
  if (mon.flinched) {
    mon.flinched = false
    return { acts: false, events: [...events, { kind: 'flinched' }] }
  }
  if (mon.confusedTurns > 0) {
    mon.confusedTurns -= 1
    if (mon.confusedTurns === 0) {
      events.push({ kind: 'snapped' })
    } else {
      events.push({ kind: 'confused' })
      if (rng.range(0, 99) < 50) {
        return { acts: false, events: [...events, { kind: 'selfHit', damage: confusionSelfDamage(mon) }] }
      }
    }
  }
  if (mon.k.status === 'par' && rng.range(0, 99) < 25) {
    return { acts: false, events: [...events, { kind: 'fullPar' }] }
  }
  return { acts: true, events }
}

/**
 * §5 infliction gate: majors are mutually exclusive, and types carry
 * immunities (Fire can't burn, Ice can't freeze, Poison/Steel can't be
 * poisoned). Applies to every source — secondary chance or pure status.
 */
export function canInflict(target: BattleMon, status: StatusId): boolean {
  if (target.k.status !== null) return false
  const sp = speciesOf(target.k.species)
  const has = (t: string) => sp.type1 === t || sp.type2 === t
  if (status === 'brn' && has('fire')) return false
  if (status === 'frz' && has('ice')) return false
  if (status === 'psn' && (has('poison') || has('steel'))) return false
  return true
}

/** Inflict a major status (sleep rolls its rand(1..6) counter). @returns false if §5 blocks it. */
export function inflictStatus(rng: Rng, target: BattleMon, status: StatusId): boolean {
  if (!canInflict(target, status)) return false
  target.k.status = status
  if (status === 'slp') target.sleepTurns = rng.range(1, 6)
  return true
}

/** Confuse for rand(2..5) attacking turns (§5). Fails if already confused. */
export function inflictConfusion(rng: Rng, target: BattleMon): boolean {
  if (target.confusedTurns > 0) return false
  target.confusedTurns = rng.range(2, 5)
  return true
}

/**
 * Nudge a stat stage, clamped to ±6 (§3). @returns the actual movement
 * (0 = already at the wall, the "nothing happened" case).
 */
export function changeStage(mon: BattleMon, stat: BattleStat, delta: number): number {
  const before = mon.stages[stat]
  const after = clampStage(before + delta)
  mon.stages[stat] = after
  return after - before
}

/** §12 MULTI_HIT: rand(0..7) → 2/2/2/3/3/3/4/5 hits. */
export function multiHitCount(rng: Rng): number {
  const r = rng.int(8)
  return r < 3 ? 2 : r < 6 ? 3 : r < 7 ? 4 : 5
}

/** Apply damage, never below 0 HP. @returns the HP actually removed. */
export function dealDamage(target: BattleMon, amount: number): number {
  const dealt = Math.min(Math.max(0, amount), target.k.hp)
  target.k.hp -= dealt
  return dealt
}

/** Restore HP, capped at max. @returns the HP actually restored (0 at full health). */
export function healHp(mon: BattleMon, amount: number): number {
  const healed = Math.min(Math.max(0, amount), mon.stats.hp - mon.k.hp)
  mon.k.hp += healed
  return healed
}
