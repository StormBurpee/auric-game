/**
 * The arithmetic of combat, straight from docs/MECHANICS.md §2-§7:
 * the Gen-2 damage pipeline (type-decided physical/special split, the
 * §2.4 held-item term, crits on the §2.2 ladder that ignore stages,
 * the 217-255 random factor), both stage-multiplier tables,
 * status-modified stats, the confusion self-hit and the wild escape
 * formula. Pure cores (damageFormula, accuracyThreshold, applyStage,
 * combatStats, escapeThreshold) carry the spec's test vectors; the
 * rng wrappers add dice and registry lookups on top.
 */
import type { Rng } from '../../engine'
import { effectiveness, isPhysical, speciesOf } from '../data'
import type { Move } from '../types'
import { CRIT_LADDER, critStage, heldEffect, typeBoostApplies } from './held'
import type { BattleMon } from './state'

/** §3.1 numerators for ATK/DEF/SPA/SPD/SPE, indexed by stage + 6. */
export const STAGE_NUM: readonly number[] = [25, 28, 33, 40, 50, 66, 100, 150, 200, 250, 300, 350, 400]

/** §3.2 numerators for accuracy/evasion, indexed by stage + 6. */
export const ACC_NUM: readonly number[] = [33, 36, 43, 50, 60, 75, 100, 133, 166, 200, 233, 266, 300]

function numerator(table: readonly number[], stage: number): number {
  const n = table[stage + 6]
  if (n === undefined) throw new Error(`stat stage out of range: ${stage}`)
  return n
}

/** §3.1: a main stat under a stage, clamped to 1..999. */
export function applyStage(stat: number, stage: number): number {
  const v = Math.floor((stat * numerator(STAGE_NUM, stage)) / 100)
  return v < 1 ? 1 : v > 999 ? 999 : v
}

/** A stat after stages and status (PAR speed, BRN attack), per MECHANICS §3.3. */
export function effectiveStat(mon: BattleMon, stat: 'atk' | 'def' | 'spa' | 'spd' | 'spe'): number {
  let v = applyStage(mon.stats[stat], mon.stages[stat])
  if (stat === 'spe' && mon.k.status === 'par') v = Math.max(1, Math.floor(v / 4))
  if (stat === 'atk' && mon.k.status === 'brn') v = Math.max(1, Math.floor(v / 2))
  return v
}

/**
 * §2.3: the A and D fed to the pipeline. On a crit, stages AND the burn
 * halving are ignored (raw stats) unless the attacker's offensive stage
 * strictly exceeds the defender's defensive stage (§2.2).
 */
export function combatStats(
  attacker: BattleMon,
  defender: BattleMon,
  physical: boolean,
  crit: boolean,
): { atk: number; def: number } {
  const atkKey = physical ? 'atk' : 'spa'
  const defKey = physical ? 'def' : 'spd'
  const applyMods = !crit || attacker.stages[atkKey] > defender.stages[defKey]
  if (!applyMods) return { atk: attacker.stats[atkKey], def: defender.stats[defKey] }
  return { atk: effectiveStat(attacker, atkKey), def: effectiveStat(defender, defKey) }
}

export interface DamageArgs {
  level: number
  power: number
  /** Effective attack and defense, already stage/status-resolved (§2.3). */
  atk: number
  def: number
  stab: boolean
  /** Combined dual-type effectiveness: 0, 0.25, 0.5, 1, 2 or 4 (§4). */
  eff: number
  crit: boolean
  /** §2.4 Item term: the attacker holds a type-boost item matching the move (×1.1, §5.5). */
  itemBoost?: boolean
  /** The Gen-2 random factor, 217-255 (ignored when base damage is 1). */
  roll: number
}

/**
 * §2.4, exactly: one floor per step, the Item term floored in after the
 * /50 and before the crit doubling (the exact Gen-2 slot), crit
 * doubling before the +2, STAB as floor(d*3/2), type effectiveness
 * folded from the dual-type product (¼ = two successive halvings, so
 * floor(d/4) is exact), and the random roll skipped at base damage 1.
 * Returns 0 only on type immunity, otherwise at least 1.
 */
export function damageFormula({ level, power, atk, def, stab, eff, crit, itemBoost, roll }: DamageArgs): number {
  if (eff === 0) return 0
  const t = Math.floor((2 * level) / 5) + 2
  let d = Math.floor((t * power * atk) / def)
  d = Math.floor(d / 50)
  if (itemBoost) d = Math.floor((d * 110) / 100)
  if (crit) d *= 2
  d += 2
  if (stab) d = Math.floor((d * 3) / 2)
  if (eff === 4) d *= 4
  else if (eff === 2) d *= 2
  else if (eff === 0.5) d = Math.floor(d / 2)
  else if (eff === 0.25) d = Math.floor(d / 4)
  if (d <= 1) return 1
  return Math.max(Math.floor((d * roll) / 255), 1)
}

export interface DamageResult {
  damage: number
  crit: boolean
  /** Combined type effectiveness: 0, 0.25, 0.5, 1, 2, 4. */
  effectiveness: number
}

/**
 * Full damage roll for one hit (crit roll + random factor included).
 * Type immunity returns 0 damage without consuming rng — §11.4 checks
 * immunity before the crit roll. The 217-255 factor is drawn only when
 * base damage exceeds 1 (Gen 2 skips the roll at 1; roll 255 is the
 * identity factor, so it doubles as the dry-run probe).
 */
export function rollDamage(rng: Rng, attacker: BattleMon, defender: BattleMon, move: Move): DamageResult {
  const mine = speciesOf(attacker.k.species)
  const theirs = speciesOf(defender.k.species)
  const eff = effectiveness(move.type, theirs.type1, theirs.type2)
  if (eff === 0) return { damage: 0, crit: false, effectiveness: 0 }
  const fx = heldEffect(attacker.k)
  // §2.2: the ladder stage is 0..3 by construction — exactly the ladder's span.
  const crit = rng.byte() < CRIT_LADDER[critStage(move.highCrit ?? false, fx)]!
  const { atk, def } = combatStats(attacker, defender, isPhysical(move.type), crit)
  const stab = move.type === mine.type1 || move.type === mine.type2
  const itemBoost = typeBoostApplies(fx, move.type)
  const args = { level: attacker.k.level, power: move.power, atk, def, stab, eff, crit, itemBoost }
  const base = damageFormula({ ...args, roll: 255 })
  const damage = base > 1 ? damageFormula({ ...args, roll: rng.range(217, 255) }) : base
  return { damage, crit, effectiveness: eff }
}

/** §7: the /255 hit threshold for an authored percent under acc/eva stages, clamped 1..255. */
export function accuracyThreshold(percent: number, accStage: number, evaStage: number): number {
  const acc255 = Math.floor((percent * 255) / 100)
  const m1 = numerator(ACC_NUM, accStage)
  const m2 = numerator(ACC_NUM, -evaStage) // the defender's EVA stage is looked up negated
  const t = Math.floor((Math.floor((acc255 * m1) / 100) * m2) / 100)
  return t < 1 ? 1 : t > 255 ? 255 : t
}

/**
 * Gen 2 accuracy check incl. acc/eva stages. True = the move connects.
 * accuracy: null moves bypass the check entirely (no rng draw); authored
 * 100%-accuracy moves keep the authentic 1/256 miss.
 */
export function accuracyCheck(rng: Rng, attacker: BattleMon, defender: BattleMon, move: Move): boolean {
  if (move.accuracy === null) return true
  return rng.byte() < accuracyThreshold(move.accuracy, attacker.stages.acc, defender.stages.eva)
}

/** §5: the typeless 40-power self-hit — stages and burn apply; no crit, STAB, type, or random factor. */
export function confusionSelfDamage(mon: BattleMon): number {
  const a = effectiveStat(mon, 'atk')
  const d = effectiveStat(mon, 'def')
  const t = Math.floor((2 * mon.k.level) / 5) + 2
  return Math.max(Math.floor(Math.floor((t * 40 * a) / d) / 50) + 2, 1)
}

/**
 * §11.8 wild-escape threshold from effective Speeds; `attempts` counts
 * this try. Returns 256 for the guaranteed cases (floor(B/4) = 0 or
 * F > 255) so callers compare rand(0..255) < F uniformly — attemptEscape
 * skips the roll entirely when escape is guaranteed.
 */
export function escapeThreshold(playerSpe: number, wildSpe: number, attempts: number): number {
  const quarter = Math.floor(wildSpe / 4)
  if (quarter === 0) return 256
  const f = Math.floor((playerSpe * 32) / quarter) + 30 * attempts
  return f > 255 ? 256 : f
}

export function attemptEscape(rng: Rng, player: BattleMon, wild: BattleMon, attempts: number): boolean {
  const f = escapeThreshold(effectiveStat(player, 'spe'), effectiveStat(wild, 'spe'), attempts)
  return f > 255 || rng.byte() < f
}
