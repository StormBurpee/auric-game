/**
 * Growth: experience gain (MECHANICS §9) and level-up processing,
 * including learnset checks and pending-evolution marking. The pure
 * pieces (expGainFor, grantStatExp, applyExpFor) are registry-free so
 * tests drive them with inline species fixtures; expGain/applyExp are
 * the registry-aware forms the battle scene calls.
 */
import type { DayPeriod } from '../../engine'
import { speciesOf } from '../data'
import { bondEvent, expForLevel, matchEvolution, statsFor } from '../kindra'
import type { Kindra, Species, Stats } from '../types'

/** §9.1, registry-free: floor(baseExp * level / 7); trainer battles ×3/2 AFTER the first floor. */
export function expGainFor(baseExp: number, faintedLevel: number, isTrainerBattle: boolean): number {
  const gain = Math.floor((baseExp * faintedLevel) / 7)
  return isTrainerBattle ? Math.floor((gain * 3) / 2) : gain
}

/** Exp awarded for fainting `fainted` (trainer battles pay 1.5x). */
export function expGain(fainted: Kindra, isTrainerBattle: boolean): number {
  return expGainFor(speciesOf(fainted.species).baseExp, fainted.level, isTrainerBattle)
}

export const STAT_EXP_CAP = 65535

/**
 * §9.4: on earning exp, every statExp bucket gains the defeated species'
 * base stat. The shared SPC bucket is stored as spa+spd in lockstep, so
 * both gain the defeated base SPA (and stay equal forever).
 */
export function grantStatExp(k: Kindra, defeatedBase: Stats): void {
  const se = k.statExp
  se.hp = Math.min(se.hp + defeatedBase.hp, STAT_EXP_CAP)
  se.atk = Math.min(se.atk + defeatedBase.atk, STAT_EXP_CAP)
  se.def = Math.min(se.def + defeatedBase.def, STAT_EXP_CAP)
  se.spa = Math.min(se.spa + defeatedBase.spa, STAT_EXP_CAP)
  se.spd = Math.min(se.spd + defeatedBase.spa, STAT_EXP_CAP)
  se.spe = Math.min(se.spe + defeatedBase.spe, STAT_EXP_CAP)
}

export interface LevelUpEvent {
  newLevel: number
  /** Move keys the Kindra wants to learn at this level. */
  learns: string[]
}

/**
 * §9.5 with explicit species data (registry-free; see applyExp). Total
 * exp is capped at EXP(100); each level-up recalcs stats, raises current
 * HP by the max-HP delta, lists the level's unlearned learnset moves,
 * accrues bond (§13's banded table, the gain counted before the rules
 * are read), and consults the evolution rules with a level trigger —
 * (re-)marking pendingEvo on every qualifying level-up, so a cancelled
 * evolution re-offers itself while its rule still answers. `period`
 * gates night/day rules; clock-aware callers pass game.period(), pure
 * callers may omit it ('day').
 */
export function applyExpFor(
  k: Kindra,
  species: Species,
  gained: number,
  period: DayPeriod = 'day',
): LevelUpEvent[] {
  k.exp = Math.min(k.exp + Math.max(0, Math.floor(gained)), expForLevel(100, species.growth))
  const events: LevelUpEvent[] = []
  while (k.level < 100 && k.exp >= expForLevel(k.level + 1, species.growth)) {
    const oldMaxHp = statsFor(species, k).hp
    k.level += 1
    k.hp += statsFor(species, k).hp - oldMaxHp
    const learns = species.learnset
      .filter((e) => e.level === k.level && !k.moves.some((s) => s.move === e.move))
      .map((e) => e.move)
    bondEvent(k, 'levelUp')
    const into = matchEvolution(species.evolution, { kind: 'level', level: k.level, period, bond: k.bond })
    if (into) k.pendingEvo = into
    events.push({ newLevel: k.level, learns })
  }
  return events
}

/**
 * Add exp, processing any level-ups one at a time (stats grow, HP rises
 * by the max-HP delta, bond accrues, pendingEvo set when a rule
 * answers). Returns the level-up events in order for the scene to
 * narrate. Pass the live game.period() so night rules can fire.
 */
export function applyExp(k: Kindra, gained: number, period?: DayPeriod): LevelUpEvent[] {
  return applyExpFor(k, speciesOf(k.species), gained, period)
}
