/**
 * The unit-test contract of docs/MECHANICS.md §14 — every vector T1-T21
 * pinned to its exact integer — plus edge pins for the stage tables, the
 * §9.3 growth-curve rows, capture wobbles, status-modified stats,
 * level-up processing and the §5.5 held-item cores. Every vector was
 * recomputed by hand first; all of them agree with the doc, so the
 * doc's numbers are pinned verbatim.
 *
 * All fixtures are inline literals: the data registry is maintained separately; these mechanics tests deliberately use isolated fixtures.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '../src/engine'
import {
  ceilSqrt, deriveHpGene, expForLevel, maxHpFrom, movesetAt, rollGenes, statFrom, statsFor,
} from '../src/game/kindra'
import {
  ACC_NUM, STAGE_NUM, accuracyCheck, accuracyThreshold, applyStage, attemptEscape,
  combatStats, confusionSelfDamage, damageFormula, effectiveStat, escapeThreshold,
} from '../src/game/battle/calc'
import {
  attemptCapture, charmRateMod, modifiedCatchValue, resolveCapture, shakeChance,
} from '../src/game/battle/capture'
import { STAT_EXP_CAP, applyExpFor, expGainFor, grantStatExp } from '../src/game/battle/exp'
import {
  CRIT_LADDER, berryTrigger, critStage, leftoversAmount, typeBoostApplies,
} from '../src/game/battle/held'
import type { BattleMon } from '../src/game/battle/state'
import { healHp } from '../src/game/battle/turn'
import { rollHeldItem } from '../src/game/world/encounters'
import type { BattleStat, HoldEffect, Item, Kindra, Move, Species, Stats, StatusId } from '../src/game/types'

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Rng whose byte()/int() draws are scripted (one queue); throws when over-drawn, so tests also prove draw counts. */
class ScriptedRng extends Rng {
  private readonly bytes: number[]
  constructor(bytes: readonly number[] = []) {
    super(0)
    this.bytes = [...bytes]
  }
  override byte(): number {
    const v = this.bytes.shift()
    if (v === undefined) throw new Error('ScriptedRng: byte queue exhausted')
    return v
  }
  override int(n: number): number {
    const v = this.bytes.shift()
    if (v === undefined) throw new Error('ScriptedRng: byte queue exhausted')
    if (v >= n) throw new Error(`ScriptedRng: scripted ${v} out of range for int(${n})`)
    return v
  }
}

const zeroStats = (): Stats => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })

function fixtureKindra(over: Partial<Kindra> = {}): Kindra {
  return {
    species: 'FIXTURE',
    level: 50,
    exp: 0,
    genes: zeroStats(),
    statExp: zeroStats(),
    hp: 1,
    status: null,
    moves: [],
    bond: 70,
    ...over,
  }
}

function fixtureMon(opts: {
  level?: number
  stats?: Partial<Stats>
  stages?: Partial<Record<BattleStat, number>>
  status?: StatusId | null
  hp?: number
} = {}): BattleMon {
  const stats: Stats = { hp: 40, atk: 50, def: 50, spa: 50, spd: 50, spe: 50, ...opts.stats }
  return {
    k: fixtureKindra({ level: opts.level ?? 50, hp: opts.hp ?? stats.hp, status: opts.status ?? null }),
    stats,
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, ...opts.stages },
    confusedTurns: 0,
    sleepTurns: 0,
    flinched: false,
    mustRecharge: false,
  }
}

const ALL_STAGES = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const

// ── §1 Creature stats ───────────────────────────────────────────────────────

describe('stats (§1)', () => {
  it('T1: HP at L5 — base 45, gene 7, statExp 0', () => {
    expect(maxHpFrom(45, 7, 0, 5)).toBe(20)
  })

  it('T2: Attack at L50 — base 60, gene 12, statExp 5000', () => {
    expect(statFrom(60, 12, 5000, 50)).toBe(85)
  })

  it('ceilSqrt is the smallest s with s*s >= n', () => {
    expect(ceilSqrt(0)).toBe(0)
    expect(ceilSqrt(1)).toBe(1)
    expect(ceilSqrt(2)).toBe(2)
    expect(ceilSqrt(4)).toBe(2)
    expect(ceilSqrt(4900)).toBe(70)
    expect(ceilSqrt(4901)).toBe(71)
    expect(ceilSqrt(5041)).toBe(71)
    expect(ceilSqrt(5042)).toBe(72)
    expect(ceilSqrt(65535)).toBe(256) // max seTerm = floor(256 / 4) = 64
  })

  it('derives the HP gene from low bits (§1.1 example: 7/6/13/4 → 10)', () => {
    expect(deriveHpGene(7, 6, 13, 4)).toBe(10)
    expect(deriveHpGene(15, 15, 15, 15)).toBe(15)
    expect(deriveHpGene(0, 0, 0, 0)).toBe(0)
  })

  it('rollGenes without rng: flat 8s, HP derives to 0, SPA/SPD share the special gene', () => {
    expect(rollGenes()).toEqual({ hp: 0, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 })
  })

  it('rollGenes with rng: each gene 0-15, HP derived, SPA = SPD', () => {
    const g = rollGenes(new Rng(0xa11ce))
    for (const v of [g.atk, g.def, g.spa, g.spd, g.spe]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(15)
      expect(Number.isInteger(v)).toBe(true)
    }
    expect(g.spa).toBe(g.spd)
    expect(g.hp).toBe(deriveHpGene(g.atk, g.def, g.spe, g.spa))
  })

  it('statsFor recomputes all six stats (§1.3 example genes at L50)', () => {
    const species: Species = {
      id: 999,
      key: 'PINSPRITE',
      type1: 'normal',
      base: { hp: 45, atk: 60, def: 55, spa: 49, spd: 65, spe: 52 },
      catchRate: 255,
      baseExp: 64,
      growth: 'mediumFast',
      learnset: [],
      entry: 'A creature of pure arithmetic. It exists only to be measured.',
    }
    const k = fixtureKindra({
      level: 50,
      genes: { hp: 10, atk: 7, def: 6, spa: 4, spd: 4, spe: 13 }, // the §1.1 example set
    })
    expect(statsFor(species, k)).toEqual({ hp: 115, atk: 72, def: 66, spa: 58, spd: 74, spe: 70 })
  })
})

// ── §2 Damage ───────────────────────────────────────────────────────────────

describe('damage pipeline (§2.4)', () => {
  it('T3: plain hit min/max rolls — L10, power 40, A 20, D 15', () => {
    const args = { level: 10, power: 40, atk: 20, def: 15, stab: false, eff: 1, crit: false }
    expect(damageFormula({ ...args, roll: 217 })).toBe(6)
    expect(damageFormula({ ...args, roll: 255 })).toBe(8)
  })

  it('T4: STAB + super-effective — L25, power 65, A 49, D 40', () => {
    const args = { level: 25, power: 65, atk: 49, def: 40, stab: true, eff: 2, crit: false }
    expect(damageFormula({ ...args, roll: 240 })).toBe(58)
    expect(damageFormula({ ...args, roll: 217 })).toBe(52)
    expect(damageFormula({ ...args, roll: 255 })).toBe(62)
  })

  it('T5: crit with raw stats — L30, power 80, A 70, D 55', () => {
    expect(damageFormula({ level: 30, power: 80, atk: 70, def: 55, stab: false, eff: 1, crit: true, roll: 255 })).toBe(58)
    // the doc's contrast: had the +2 DEF stage applied (D = 110), the crit would land 30 — it must not
    expect(damageFormula({ level: 30, power: 80, atk: 70, def: 110, stab: false, eff: 1, crit: true, roll: 255 })).toBe(30)
  })

  it('T6: STAB + not-very-effective min/max — L15, power 120, A 35, D 42', () => {
    const args = { level: 15, power: 120, atk: 35, def: 42, stab: true, eff: 0.5, crit: false }
    expect(damageFormula({ ...args, roll: 217 })).toBe(11)
    expect(damageFormula({ ...args, roll: 255 })).toBe(13)
  })

  it('folds 4x and 0.25x dual-type products exactly', () => {
    const args = { level: 25, power: 65, atk: 49, def: 40, stab: true, crit: false, roll: 255 }
    expect(damageFormula({ ...args, eff: 4 })).toBe(124) // 31 * 4
    expect(damageFormula({ ...args, eff: 0.25 })).toBe(7) // floor(31 / 4)
  })

  it('returns 0 on immunity, else never below 1 (roll skipped at base 1)', () => {
    expect(damageFormula({ level: 50, power: 100, atk: 200, def: 10, stab: true, eff: 0, crit: true, roll: 255 })).toBe(0)
    // t=2, floor(2*1*1/999)=0, /50=0, +2=2, x0.5=1 → roll skipped, floor of 1 holds
    expect(damageFormula({ level: 1, power: 1, atk: 1, def: 999, stab: false, eff: 0.5, crit: false, roll: 217 })).toBe(1)
  })
})

describe('effective attack/defense (§2.2-2.3)', () => {
  it('T5 stage-ignore: crit uses raw stats when atkStage <= defStage', () => {
    const attacker = fixtureMon({ level: 30, stats: { atk: 70 } })
    const defender = fixtureMon({ stats: { def: 55 }, stages: { def: 2 } })
    expect(combatStats(attacker, defender, true, true)).toEqual({ atk: 70, def: 55 })
    expect(combatStats(attacker, defender, true, false)).toEqual({ atk: 70, def: 110 })
  })

  it('crit keeps stages when the attacker is ahead (atkStage > defStage)', () => {
    const attacker = fixtureMon({ stats: { atk: 70 }, stages: { atk: 1 } })
    const defender = fixtureMon({ stats: { def: 55 } })
    expect(combatStats(attacker, defender, true, true)).toEqual({ atk: 105, def: 55 })
  })

  it('burn halves physical attack — except on a stage-ignoring crit', () => {
    const burned = fixtureMon({ stats: { atk: 70 }, status: 'brn' })
    const defender = fixtureMon({ stats: { def: 55 } })
    expect(combatStats(burned, defender, true, false)).toEqual({ atk: 35, def: 55 })
    expect(combatStats(burned, defender, true, true)).toEqual({ atk: 70, def: 55 })
  })

  it('special moves read SPA/SPD and ignore burn', () => {
    const burned = fixtureMon({ stats: { spa: 90 }, status: 'brn' })
    const defender = fixtureMon({ stats: { spd: 60 }, stages: { spd: -1 } })
    expect(combatStats(burned, defender, false, false)).toEqual({ atk: 90, def: 39 }) // floor(60*66/100)
  })
})

// ── §3 Stat stages & status modifiers ───────────────────────────────────────

describe('stat stages (§3)', () => {
  it('T14: ATK 85 at stage -1 → 56; at +2 → 170', () => {
    expect(applyStage(85, -1)).toBe(56)
    expect(applyStage(85, 2)).toBe(170)
  })

  it('matches the full §3.1 numerator ladder at stat 100', () => {
    expect(ALL_STAGES.map((s) => applyStage(100, s))).toEqual([...STAGE_NUM])
    expect([...STAGE_NUM]).toEqual([25, 28, 33, 40, 50, 66, 100, 150, 200, 250, 300, 350, 400])
  })

  it('clamps the staged stat to 1..999', () => {
    expect(applyStage(2, -6)).toBe(1) // floor(2*25/100) = 0 → 1
    expect(applyStage(999, 6)).toBe(999) // 3996 → 999
  })

  it('publishes the §3.2 accuracy ladder', () => {
    expect([...ACC_NUM]).toEqual([33, 36, 43, 50, 60, 75, 100, 133, 166, 200, 233, 266, 300])
  })

  it('effectiveStat: paralysis quarters Speed after stages (§3.3)', () => {
    expect(effectiveStat(fixtureMon({ stats: { spe: 100 }, status: 'par' }), 'spe')).toBe(25)
    expect(effectiveStat(fixtureMon({ stats: { spe: 100 }, stages: { spe: 1 }, status: 'par' }), 'spe')).toBe(37) // floor(150/4)
  })

  it('effectiveStat: burn halves Attack after stages, never Special Attack', () => {
    expect(effectiveStat(fixtureMon({ stats: { atk: 85 }, stages: { atk: -1 }, status: 'brn' }), 'atk')).toBe(28) // floor(56/2)
    expect(effectiveStat(fixtureMon({ stats: { spa: 85 }, stages: { spa: -1 }, status: 'brn' }), 'spa')).toBe(56)
  })
})

// ── §5 Confusion self-hit ───────────────────────────────────────────────────

describe('confusion self-hit (§5)', () => {
  it('typeless 40-power physical with no random factor', () => {
    // L30, ATK 70, DEF 55: t=14, floor(14*40*70/55)=712, /50=14, +2=16
    expect(confusionSelfDamage(fixtureMon({ level: 30, stats: { atk: 70, def: 55 } }))).toBe(16)
  })

  it('stages and burn apply to the self-hit', () => {
    // ATK stage -1: A=46 → floor(25760/55)=468, /50=9, +2=11
    expect(confusionSelfDamage(fixtureMon({ level: 30, stats: { atk: 70, def: 55 }, stages: { atk: -1 } }))).toBe(11)
    // burned: A=35 → floor(19600/55)=356, /50=7, +2=9
    expect(confusionSelfDamage(fixtureMon({ level: 30, stats: { atk: 70, def: 55 }, status: 'brn' }))).toBe(9)
  })
})

// ── §5.5 Held items (also §2.2, §2.4, §10.2, §11.7) ─────────────────────────

describe('held items (§5.5)', () => {
  const fireBand: HoldEffect = { kind: 'typeBoost', type: 'fire' }
  const lens: HoldEffect = { kind: 'critBoost' }
  const crumb: HoldEffect = { kind: 'leftovers' }
  const plump: HoldEffect = { kind: 'hpBerry', heal: 10 }
  const cureAll: HoldEffect = { kind: 'cureBerry', cures: 'all' }
  const curePar: HoldEffect = { kind: 'cureBerry', cures: 'par' }

  /** §11.7 end-of-turn chip, the pure piece (§5: max(1, floor(maxHP/8)) for PSN/BRN). */
  const chipFor = (status: StatusId | null, maxHp: number): number =>
    status === 'psn' || status === 'brn' ? Math.max(1, Math.floor(maxHp / 8)) : 0

  describe('type-boost Item term (§2.4, T16)', () => {
    const t4 = { level: 25, power: 65, atk: 49, def: 40, stab: true, eff: 2, crit: false }

    it('T16: the T4 inputs land 62 boosted at R=240 (58 unboosted)', () => {
      expect(damageFormula({ ...t4, roll: 240 })).toBe(58)
      expect(damageFormula({ ...t4, itemBoost: true, roll: 240 })).toBe(62)
      expect(damageFormula({ ...t4, itemBoost: true, roll: 255 })).toBe(66)
    })

    it('floors the boost in right after the /50: 19 → 20, not 20.9', () => {
      // isolated (no STAB, neutral, R=255): 19 → 20 → +2 = 22; unboosted 21
      const bare = { level: 25, power: 65, atk: 49, def: 40, stab: false, eff: 1, crit: false, roll: 255 }
      expect(damageFormula({ ...bare, itemBoost: true })).toBe(22)
      expect(damageFormula(bare)).toBe(21)
    })

    it('boosts BEFORE the crit double: 19 → 20 → ×2 = 40 → +2 = 42 (not 43)', () => {
      // boost-after-crit would read 19 → 38 → floor(38·110/100) = 41 → 43
      expect(damageFormula({ level: 25, power: 65, atk: 49, def: 40, stab: false, eff: 1, crit: true, itemBoost: true, roll: 255 })).toBe(42)
    })

    it('typeBoostApplies matches the move type only', () => {
      expect(typeBoostApplies(fireBand, 'fire')).toBe(true)
      expect(typeBoostApplies(fireBand, 'water')).toBe(false)
      expect(typeBoostApplies(null, 'fire')).toBe(false)
      expect(typeBoostApplies(lens, 'fire')).toBe(false)
      expect(typeBoostApplies(crumb, 'fire')).toBe(false)
    })
  })

  describe('crit ladder (§2.2, T17)', () => {
    it('publishes the Gen-2 ladder of 256', () => {
      expect([...CRIT_LADDER]).toEqual([17, 32, 64, 85])
    })

    it('stage = (+2 high-crit) + (+1 held critBoost)', () => {
      expect(critStage(false, null)).toBe(0)
      expect(critStage(false, lens)).toBe(1)
      expect(critStage(true, null)).toBe(2)
      expect(critStage(true, lens)).toBe(3)
    })

    it('non-crit held effects add no stage', () => {
      expect(critStage(false, fireBand)).toBe(0)
      expect(critStage(false, crumb)).toBe(0)
      expect(critStage(true, plump)).toBe(2)
    })

    it('a held critBoost alone is exactly one Gen-2 stage up: 32/256 = 1/8', () => {
      expect(CRIT_LADDER[critStage(false, lens)]).toBe(32)
      expect(32 / 256).toBe(1 / 8)
    })
  })

  describe('leftovers (§11.7, T18)', () => {
    it('restores max(1, floor(maxHP/16))', () => {
      expect(leftoversAmount(35)).toBe(2)
      expect(leftoversAmount(32)).toBe(2)
      expect(leftoversAmount(31)).toBe(1)
      expect(leftoversAmount(16)).toBe(1)
      expect(leftoversAmount(15)).toBe(1) // the min-1 clamp
      expect(leftoversAmount(1)).toBe(1)
      expect(leftoversAmount(160)).toBe(10)
    })

    it('healing is capped at max HP: a 34/35 holder gains exactly 1', () => {
      const mon = fixtureMon({ stats: { hp: 35 }, hp: 34 })
      expect(healHp(mon, leftoversAmount(35))).toBe(1)
      expect(mon.k.hp).toBe(35)
    })
  })

  describe('berry triggers (§5.5, T20)', () => {
    it('HP berry fires at or below half, never above', () => {
      expect(berryTrigger(plump, null, 15, 30)).toEqual({ kind: 'hp', heal: 10 })
      expect(berryTrigger(plump, null, 16, 30)).toBeNull()
    })

    it('heal is capped at the deficit: maxHP 12 at hp 5 heals 7', () => {
      expect(berryTrigger(plump, null, 5, 12)).toEqual({ kind: 'hp', heal: 7 })
    })

    it('a fainted holder never pops its berry', () => {
      expect(berryTrigger(plump, null, 0, 30)).toBeNull()
      expect(berryTrigger(cureAll, 'psn', 0, 30)).toBeNull()
    })

    it("cure berries match their status; 'all' cures any major", () => {
      expect(berryTrigger(curePar, 'par', 20, 30)).toEqual({ kind: 'cure' })
      expect(berryTrigger(curePar, 'psn', 20, 30)).toBeNull()
      expect(berryTrigger(cureAll, 'frz', 20, 30)).toEqual({ kind: 'cure' })
      expect(berryTrigger(cureAll, null, 20, 30)).toBeNull()
    })

    it('non-berry held effects never trigger', () => {
      expect(berryTrigger(crumb, 'psn', 5, 30)).toBeNull()
      expect(berryTrigger(fireBand, 'psn', 5, 30)).toBeNull()
      expect(berryTrigger(null, 'psn', 5, 30)).toBeNull()
    })
  })

  describe('chip-then-item-phase order (§11.7, T19)', () => {
    it('poison chip lands first; the berry heals from the chipped HP', () => {
      const maxHp = 32
      let hp = 17
      let held: HoldEffect | null = plump
      // pre-chip the berry is quiet: 17·2 = 34 > 32
      expect(berryTrigger(held, 'psn', hp, maxHp)).toBeNull()
      hp -= chipFor('psn', maxHp) // chip 4 → 13 (survives the faint check)
      expect(hp).toBe(13)
      // item phase: the berry sees 13/32 and fires for the full 10
      const fire = berryTrigger(held, 'psn', hp, maxHp)
      expect(fire).toEqual({ kind: 'hp', heal: 10 })
      if (fire?.kind === 'hp') hp += fire.heal
      held = null // consumed
      expect(hp).toBe(23)
      expect(berryTrigger(held, 'psn', hp, maxHp)).toBeNull() // gone next sweep
    })

    it('a cure berry fires at the post-move sweep — zero chip that turn', () => {
      // PSN lands mid-turn; the sweep ending that same move cures it…
      const fire = berryTrigger(cureAll, 'psn', 20, 32)
      expect(fire).toEqual({ kind: 'cure' })
      // …so by the end-of-turn phase the status is gone and chip never ticks.
      expect(chipFor(null, 32)).toBe(0)
      expect(chipFor('psn', 32)).toBe(4) // what the holder was spared
    })
  })

  describe('wild held-item bands (§10.2, T21)', () => {
    const slots = [
      { item: 'COMMON_NUT', chance: 23 },
      { item: 'RARE_LENS', chance: 2 },
    ]

    it('one rand(0..99) draw over cumulative bands: <23 common, <25 rare, else none', () => {
      expect(rollHeldItem(new ScriptedRng([0]), slots)).toBe('COMMON_NUT')
      expect(rollHeldItem(new ScriptedRng([22]), slots)).toBe('COMMON_NUT')
      expect(rollHeldItem(new ScriptedRng([23]), slots)).toBe('RARE_LENS')
      expect(rollHeldItem(new ScriptedRng([24]), slots)).toBe('RARE_LENS')
      expect(rollHeldItem(new ScriptedRng([25]), slots)).toBeNull()
      expect(rollHeldItem(new ScriptedRng([99]), slots)).toBeNull()
    })

    it('no draw at all when the species defines no held slots', () => {
      // an exhausted ScriptedRng throws on any draw — passing proves none happened
      expect(rollHeldItem(new ScriptedRng([]), undefined)).toBeNull()
      expect(rollHeldItem(new ScriptedRng([]), [])).toBeNull()
    })
  })
})

// ── §7 Accuracy ─────────────────────────────────────────────────────────────

describe('accuracy (§7)', () => {
  it('T13: 90% vs EVA +1 → threshold 171', () => {
    expect(accuracyThreshold(90, 0, 1)).toBe(171)
  })

  it('maps authored percents to /255 at neutral stages', () => {
    expect(accuracyThreshold(100, 0, 0)).toBe(255)
    expect(accuracyThreshold(95, 0, 0)).toBe(242)
    expect(accuracyThreshold(90, 0, 0)).toBe(229)
    expect(accuracyThreshold(85, 0, 0)).toBe(216)
    expect(accuracyThreshold(80, 0, 0)).toBe(204)
    expect(accuracyThreshold(75, 0, 0)).toBe(191)
    expect(accuracyThreshold(70, 0, 0)).toBe(178)
  })

  it('clamps the threshold to at least 1', () => {
    expect(accuracyThreshold(1, -6, 6)).toBe(1)
  })

  it('rolls byte < threshold, boundary exact', () => {
    const gale: Move = {
      key: 'GALE', name: 'GALE', type: 'flying', power: 40, accuracy: 90, pp: 35,
      effect: { kind: 'strike' },
    }
    const attacker = fixtureMon()
    const dodgy = fixtureMon({ stages: { eva: 1 } }) // threshold 171
    expect(accuracyCheck(new ScriptedRng([170]), attacker, dodgy, gale)).toBe(true)
    expect(accuracyCheck(new ScriptedRng([171]), attacker, dodgy, gale)).toBe(false)
  })

  it('keeps the authentic 1/256 miss on 100%-accuracy moves', () => {
    const tackle: Move = {
      key: 'TACKLE', name: 'TACKLE', type: 'normal', power: 35, accuracy: 100, pp: 35,
      effect: { kind: 'strike' },
    }
    expect(accuracyCheck(new ScriptedRng([254]), fixtureMon(), fixtureMon(), tackle)).toBe(true)
    expect(accuracyCheck(new ScriptedRng([255]), fixtureMon(), fixtureMon(), tackle)).toBe(false)
  })

  it('always-hit moves (accuracy null) bypass the check without an rng draw', () => {
    const trueShot: Move = {
      key: 'TRUESHOT', name: 'TRUE SHOT', type: 'normal', power: 60, accuracy: null, pp: 20,
      effect: { kind: 'strike' },
    }
    // an exhausted ScriptedRng throws on any draw — passing proves none happened
    expect(accuracyCheck(new ScriptedRng([]), fixtureMon(), fixtureMon({ stages: { eva: 6 } }), trueShot)).toBe(true)
  })
})

// ── §8 Capture ──────────────────────────────────────────────────────────────

describe('capture (§8)', () => {
  it('T7: full-HP common, CHARM — a = 63, b = 191', () => {
    expect(charmRateMod(190, 1)).toBe(190)
    expect(modifiedCatchValue(24, 24, 190, false)).toBe(63)
    expect(shakeChance(63)).toBe(191)
  })

  it('T8: weakened rare, GILDED CHARM, asleep — a = 66, b = 191', () => {
    expect(charmRateMod(45, 1.5)).toBe(67)
    expect(modifiedCatchValue(30, 7, 67, true)).toBe(66)
    expect(shakeChance(66)).toBe(191)
  })

  it('clamps a to 1..255 and caps the gilded rate at 255', () => {
    expect(modifiedCatchValue(24, 24, 1, false)).toBe(1) // floor never below 1
    expect(modifiedCatchValue(100, 1, 255, true)).toBe(255) // 253 + 10 capped
    expect(charmRateMod(255, 1.5)).toBe(255)
  })

  it('walks the §8.4 shake table by row upper bounds', () => {
    expect(shakeChance(0)).toBe(63)
    expect(shakeChance(1)).toBe(63)
    expect(shakeChance(2)).toBe(75)
    expect(shakeChance(8)).toBe(113)
    expect(shakeChance(10)).toBe(113)
    expect(shakeChance(11)).toBe(126)
    expect(shakeChance(241)).toBe(253)
    expect(shakeChance(254)).toBe(253)
    expect(shakeChance(255)).toBe(255)
  })

  it('catches iff byte <= a (boundary inclusive); a = 255 always catches', () => {
    expect(resolveCapture(new ScriptedRng([63]), 63)).toEqual({ caught: true, shakes: 3 })
    expect(resolveCapture(new ScriptedRng([255]), 255)).toEqual({ caught: true, shakes: 3 })
  })

  it('on failure, wobbles stop at the first shake miss (b = 191 for a = 63)', () => {
    expect(resolveCapture(new ScriptedRng([64, 250]), 63)).toEqual({ caught: false, shakes: 0 })
    expect(resolveCapture(new ScriptedRng([64, 100, 190, 191]), 63)).toEqual({ caught: false, shakes: 2 })
    expect(resolveCapture(new ScriptedRng([100, 0, 0, 0]), 63)).toEqual({ caught: false, shakes: 3 }) // "so close!"
  })

  it('AURIC SIGIL always catches — no math, no rng, no registry', () => {
    const sigil: Item = {
      key: 'AURICSIGIL', name: 'AURIC SIGIL', desc: 'Never fails.', price: 0,
      effect: { kind: 'charm', mult: 1, sigil: true },
    }
    // fixture species is unregistered and the rng queue is empty: any lookup or draw would throw
    expect(attemptCapture(new ScriptedRng([]), fixtureMon(), sigil)).toEqual({ caught: true, shakes: 3 })
  })

  it('rejects non-charm items loudly', () => {
    const tonic: Item = {
      key: 'TONIC', name: 'TONIC', desc: 'Restores 20 HP.', price: 200,
      effect: { kind: 'heal', amount: 20 },
    }
    expect(() => attemptCapture(new ScriptedRng([]), fixtureMon(), tonic)).toThrow()
  })
})

// ── §9 Experience ───────────────────────────────────────────────────────────

describe('experience gain (§9.1)', () => {
  it('T9: wild faint — baseExp 64, L5 → 45', () => {
    expect(expGainFor(64, 5, false)).toBe(45)
  })

  it('T10: trainer faint — baseExp 142, L18 → 547', () => {
    expect(expGainFor(142, 18, true)).toBe(547)
  })
})

describe('growth curves (§9.2-9.3)', () => {
  it('T11: Medium-Slow EXP(10) = 560; EXP(1) clamps to 0', () => {
    expect(expForLevel(10, 'mediumSlow')).toBe(560)
    expect(expForLevel(1, 'mediumSlow')).toBe(0)
  })

  it('T12: Slow EXP(20) = 10000', () => {
    expect(expForLevel(20, 'slow')).toBe(10000)
  })

  it('matches the full §9.3 lookup table, levels 1-20', () => {
    const table: ReadonlyArray<readonly [number, number, number, number, number]> = [
      [1, 0, 1, 0, 1],
      [2, 6, 8, 9, 10],
      [3, 21, 27, 57, 33],
      [4, 51, 64, 96, 80],
      [5, 100, 125, 135, 156],
      [6, 172, 216, 179, 270],
      [7, 274, 343, 236, 428],
      [8, 409, 512, 314, 640],
      [9, 583, 729, 419, 911],
      [10, 800, 1000, 560, 1250],
      [11, 1064, 1331, 742, 1663],
      [12, 1382, 1728, 973, 2160],
      [13, 1757, 2197, 1261, 2746],
      [14, 2195, 2744, 1612, 3430],
      [15, 2700, 3375, 2035, 4218],
      [16, 3276, 4096, 2535, 5120],
      [17, 3930, 4913, 3120, 6141],
      [18, 4665, 5832, 3798, 7290],
      [19, 5487, 6859, 4575, 8573],
      [20, 6400, 8000, 5460, 10000],
    ]
    for (const [level, fast, mediumFast, mediumSlow, slow] of table) {
      expect(expForLevel(level, 'fast'), `fast L${level}`).toBe(fast)
      expect(expForLevel(level, 'mediumFast'), `mediumFast L${level}`).toBe(mediumFast)
      expect(expForLevel(level, 'mediumSlow'), `mediumSlow L${level}`).toBe(mediumSlow)
      expect(expForLevel(level, 'slow'), `slow L${level}`).toBe(slow)
    }
  })

  it('pins EXP(100) per curve', () => {
    expect(expForLevel(100, 'fast')).toBe(800000)
    expect(expForLevel(100, 'mediumFast')).toBe(1000000)
    expect(expForLevel(100, 'mediumSlow')).toBe(1059860)
    expect(expForLevel(100, 'slow')).toBe(1250000)
  })
})

describe('stat experience (§9.4)', () => {
  it('every bucket gains the defeated base stat; the SPC bucket gains base SPA twice over', () => {
    const k = fixtureKindra()
    grantStatExp(k, { hp: 45, atk: 60, def: 55, spa: 49, spd: 65, spe: 52 })
    expect(k.statExp).toEqual({ hp: 45, atk: 60, def: 55, spa: 49, spd: 49, spe: 52 })
  })

  it('caps each bucket at 65535', () => {
    const k = fixtureKindra({ statExp: { hp: 65500, atk: 65535, def: 0, spa: 0, spd: 0, spe: 0 } })
    grantStatExp(k, { hp: 45, atk: 60, def: 55, spa: 49, spd: 65, spe: 52 })
    expect(k.statExp.hp).toBe(STAT_EXP_CAP)
    expect(k.statExp.atk).toBe(STAT_EXP_CAP)
  })
})

describe('level-up processing (§9.5, §13)', () => {
  const sproutkin: Species = {
    id: 998,
    key: 'SPROUTKIN',
    type1: 'grass',
    base: { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
    catchRate: 255,
    baseExp: 64,
    growth: 'mediumFast',
    evolution: [{ kind: 'level', level: 8, into: 'BLOOMKIN' }],
    learnset: [
      { level: 1, move: 'TAP' },
      { level: 6, move: 'LEAFGUST' },
      { level: 8, move: 'SUNSHARD' },
    ],
    entry: 'A seedling fixture. It grows precisely as the formulas demand.',
  }
  const atLevel5 = () => fixtureKindra({
    species: 'SPROUTKIN',
    level: 5,
    exp: expForLevel(5, 'mediumFast'), // 125
    hp: 20, // maxHP at L5: floor(100*5/100) + 5 + 10
    moves: [{ move: 'TAP', pp: 30, ppMax: 30 }],
  })

  it('levels one at a time, learns moves, raises HP by the max-HP delta, marks pendingEvo', () => {
    const k = atLevel5()
    const events = applyExpFor(k, sproutkin, 512 - 125) // exactly EXP(8)
    expect(events).toEqual([
      { newLevel: 6, learns: ['LEAFGUST'] },
      { newLevel: 7, learns: [] },
      { newLevel: 8, learns: ['SUNSHARD'] },
    ])
    expect(k.level).toBe(8)
    expect(k.exp).toBe(512)
    expect(k.hp).toBe(26) // 20 + (26 - 20); maxHP at L8 = 8 + 8 + 10
    expect(k.pendingEvo).toBe('BLOOMKIN')
  })

  it('keeps the current-HP deficit across level-ups', () => {
    const k = atLevel5()
    k.hp = 10
    applyExpFor(k, sproutkin, 512 - 125)
    expect(k.hp).toBe(16) // delta +6, deficit of 10 preserved
  })

  it('does not mark pendingEvo below the threshold and skips known moves', () => {
    const k = atLevel5()
    k.moves.push({ move: 'LEAFGUST', pp: 25, ppMax: 25 })
    const events = applyExpFor(k, sproutkin, expForLevel(7, 'mediumFast') - k.exp)
    expect(events).toEqual([
      { newLevel: 6, learns: [] },
      { newLevel: 7, learns: [] },
    ])
    expect(k.pendingEvo).toBeUndefined()
  })

  it('returns no events for sub-level gains and caps total exp at EXP(100)', () => {
    const k = atLevel5()
    expect(applyExpFor(k, sproutkin, 10)).toEqual([])
    expect(k.exp).toBe(135)
    applyExpFor(k, sproutkin, 10 ** 9)
    expect(k.level).toBe(100)
    expect(k.exp).toBe(expForLevel(100, 'mediumFast'))
    expect(k.hp).toBe(210) // full at L100: 100 + 100 + 10
  })
})

describe('default movesets (ROSTER convention)', () => {
  const learnset = [
    { level: 1, move: 'TAP' },
    { level: 1, move: 'GLARE' },
    { level: 4, move: 'LEAFGUST' },
    { level: 7, move: 'SAPDRINK' },
    { level: 10, move: 'SUNSHARD' },
    { level: 13, move: 'VINEWHIRL' },
  ]

  it('takes the last up-to-4 moves at or below the level', () => {
    expect(movesetAt(learnset, 1)).toEqual(['TAP', 'GLARE'])
    expect(movesetAt(learnset, 10)).toEqual(['GLARE', 'LEAFGUST', 'SAPDRINK', 'SUNSHARD'])
    expect(movesetAt(learnset, 100)).toEqual(['LEAFGUST', 'SAPDRINK', 'SUNSHARD', 'VINEWHIRL'])
  })

  it('sorts by level and never duplicates a move', () => {
    expect(movesetAt([{ level: 7, move: 'B' }, { level: 1, move: 'A' }], 7)).toEqual(['A', 'B'])
    expect(movesetAt([{ level: 1, move: 'A' }, { level: 4, move: 'A' }, { level: 6, move: 'B' }], 6)).toEqual(['A', 'B'])
  })
})

// ── §11.8 Wild escape ───────────────────────────────────────────────────────

describe('wild escape (§11.8)', () => {
  it('T15: A 35 vs B 60, first attempt → F = 104', () => {
    expect(escapeThreshold(35, 60, 1)).toBe(104)
  })

  it('guarantees escape when floor(B/4) = 0 or F exceeds 255', () => {
    expect(escapeThreshold(35, 3, 1)).toBe(256)
    expect(escapeThreshold(200, 4, 1)).toBe(256) // floor(6400/1) + 30 > 255
  })

  it('attemptEscape rolls byte < F, with no draw on guaranteed escapes', () => {
    const player = fixtureMon({ stats: { spe: 35 } })
    const wild = fixtureMon({ stats: { spe: 60 } })
    expect(attemptEscape(new ScriptedRng([103]), player, wild, 1)).toBe(true)
    expect(attemptEscape(new ScriptedRng([104]), player, wild, 1)).toBe(false)
    expect(attemptEscape(new ScriptedRng([]), player, fixtureMon({ stats: { spe: 3 } }), 1)).toBe(true)
  })

  it('uses effective Speed — a paralyzed wild quarters its B term', () => {
    const player = fixtureMon({ stats: { spe: 35 } })
    const parWild = fixtureMon({ stats: { spe: 60 }, status: 'par' }) // effSPE 15, floor(15/4)=3
    expect(attemptEscape(new ScriptedRng([]), player, parWild, 1)).toBe(true) // F = floor(35*32/3)+30 > 255
  })
})
