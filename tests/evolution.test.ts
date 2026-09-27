/**
 * The evolution + bond contract of docs/MECHANICS.md §13: matchEvolution's
 * first-match-wins resolution across every rule shape (level, period-gated
 * level, bond, stone, link), the banded bond table with its clamps, and
 * applyExpFor's level loop — bond accrual per level gained, day-period
 * plumbing, rule-driven pendingEvo marking, and the cancelled-evolution
 * re-mark semantics.
 *
 * All fixtures are inline literals: the data registry is maintained separately; these mechanics tests deliberately use isolated fixtures.
 */
import { describe, expect, it } from 'vitest'
import type { DayPeriod } from '../src/engine'
import {
  BOND_BASE, BOND_EVOLVE_MIN, BOND_MAX, bondDelta, bondEvent, expForLevel, matchEvolution,
} from '../src/game/kindra'
import type { EvoTrigger } from '../src/game/kindra'
import { applyExpFor } from '../src/game/battle/exp'
import type { EvolutionRule, Kindra, Species, Stats } from '../src/game/types'

// ── Fixtures ────────────────────────────────────────────────────────────────

const zeroStats = (): Stats => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })

/** A level-up trigger: day at the bond baseline unless overridden. */
function levelTrigger(level: number, over: { period?: DayPeriod; bond?: number } = {}): EvoTrigger {
  return { kind: 'level', level, period: over.period ?? 'day', bond: over.bond ?? BOND_BASE }
}

function fixtureSpecies(evolution?: EvolutionRule[]): Species {
  return {
    id: 999,
    key: 'FIXTURE',
    type1: 'normal',
    base: { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
    catchRate: 255,
    baseExp: 64,
    growth: 'mediumFast', // EXP(L) = L^3
    evolution,
    learnset: [],
    entry: 'A fixture. It exists so the rules can be proven.',
  }
}

/** A FIXTURE at L5, exactly on its curve (EXP(5) = 125; maxHP 20). */
function atLevel5(bond = BOND_BASE): Kindra {
  return {
    species: 'FIXTURE',
    level: 5,
    exp: expForLevel(5, 'mediumFast'),
    genes: zeroStats(),
    statExp: zeroStats(),
    hp: 20, // floor((50*2)*5/100) + 5 + 10
    status: null,
    moves: [],
    bond,
  }
}

/** Exp needed to lift a curve-exact Kindra to `level`. */
const expTo = (k: Kindra, level: number): number => expForLevel(level, 'mediumFast') - k.exp

// The D5 shapes, as inline rule lists.
const spoolenRules: EvolutionRule[] = [
  { kind: 'level', level: 10, into: 'DUSKMOTH', period: 'night' },
  { kind: 'level', level: 10, into: 'LACEWING' },
]
const shadekitRules: EvolutionRule[] = [
  { kind: 'bond', min: 220, into: 'GLOAMFANG', period: 'night' },
  { kind: 'level', level: 18, into: 'NIGHTMAW' },
]

// ── matchEvolution (§13) ────────────────────────────────────────────────────

describe('matchEvolution: rule kinds', () => {
  it('level rule: matches at and above the threshold, refuses below', () => {
    const rules: EvolutionRule[] = [{ kind: 'level', level: 16, into: 'VERDRAKE' }]
    expect(matchEvolution(rules, levelTrigger(15))).toBeNull()
    expect(matchEvolution(rules, levelTrigger(16))).toBe('VERDRAKE')
    expect(matchEvolution(rules, levelTrigger(17))).toBe('VERDRAKE')
  })

  it('level rule with a period matches only that period', () => {
    const rules: EvolutionRule[] = [{ kind: 'level', level: 10, into: 'DUSKMOTH', period: 'night' }]
    expect(matchEvolution(rules, levelTrigger(10, { period: 'night' }))).toBe('DUSKMOTH')
    expect(matchEvolution(rules, levelTrigger(10, { period: 'day' }))).toBeNull()
    expect(matchEvolution(rules, levelTrigger(10, { period: 'morning' }))).toBeNull()
  })

  it('bond rule: fires on level triggers at or above min, at ANY level', () => {
    const rules: EvolutionRule[] = [{ kind: 'bond', min: 220, into: 'GLOAMFANG' }]
    expect(matchEvolution(rules, levelTrigger(50, { bond: 219 }))).toBeNull()
    expect(matchEvolution(rules, levelTrigger(50, { bond: 220 }))).toBe('GLOAMFANG')
    expect(matchEvolution(rules, levelTrigger(2, { bond: 255 }))).toBe('GLOAMFANG')
  })

  it('bond rule with a period matches only that period', () => {
    const rules: EvolutionRule[] = [{ kind: 'bond', min: 220, into: 'GLOAMFANG', period: 'night' }]
    expect(matchEvolution(rules, levelTrigger(18, { bond: 255, period: 'night' }))).toBe('GLOAMFANG')
    expect(matchEvolution(rules, levelTrigger(18, { bond: 255, period: 'day' }))).toBeNull()
  })

  it('stone rule: answers exactly its item, nothing else', () => {
    const rules: EvolutionRule[] = [{ kind: 'stone', item: 'TOLL_SHARD', into: 'TOLLGEIST' }]
    expect(matchEvolution(rules, { kind: 'stone', item: 'TOLL_SHARD' })).toBe('TOLLGEIST')
    expect(matchEvolution(rules, { kind: 'stone', item: 'RIME_STONE' })).toBeNull()
    expect(matchEvolution(rules, levelTrigger(99, { bond: 255 }))).toBeNull()
    expect(matchEvolution(rules, { kind: 'link' })).toBeNull()
  })

  it('link rule: answers only the link trigger', () => {
    const rules: EvolutionRule[] = [{ kind: 'link', into: 'LACEWING' }]
    expect(matchEvolution(rules, { kind: 'link' })).toBe('LACEWING')
    expect(matchEvolution(rules, { kind: 'stone', item: 'LINK_CORD' })).toBeNull()
    expect(matchEvolution(rules, levelTrigger(99, { bond: 255 }))).toBeNull()
  })

  it('stone and link triggers never answer level or bond rules', () => {
    const rules: EvolutionRule[] = [
      { kind: 'level', level: 1, into: 'A' },
      { kind: 'bond', min: 0, into: 'B' },
    ]
    expect(matchEvolution(rules, { kind: 'stone', item: 'TOLL_SHARD' })).toBeNull()
    expect(matchEvolution(rules, { kind: 'link' })).toBeNull()
  })

  it('undefined and empty rule lists refuse every trigger', () => {
    for (const rules of [undefined, [] as EvolutionRule[]]) {
      expect(matchEvolution(rules, levelTrigger(100, { bond: 255 }))).toBeNull()
      expect(matchEvolution(rules, { kind: 'stone', item: 'TOLL_SHARD' })).toBeNull()
      expect(matchEvolution(rules, { kind: 'link' })).toBeNull()
    }
  })
})

describe('matchEvolution: ordering (first match wins)', () => {
  it('a night rule placed before a plain rule takes the night and yields the day', () => {
    expect(matchEvolution(spoolenRules, levelTrigger(10, { period: 'night' }))).toBe('DUSKMOTH')
    expect(matchEvolution(spoolenRules, levelTrigger(10, { period: 'day' }))).toBe('LACEWING')
    expect(matchEvolution(spoolenRules, levelTrigger(10, { period: 'morning' }))).toBe('LACEWING')
    expect(matchEvolution(spoolenRules, levelTrigger(9, { period: 'night' }))).toBeNull()
  })

  it('a bond rule placed before a level rule wins when both answer', () => {
    // L18 at night with high bond: both rules match; the bond rule is first.
    expect(matchEvolution(shadekitRules, levelTrigger(18, { bond: 220, period: 'night' }))).toBe('GLOAMFANG')
    // Bond too low at night, or high bond by day: falls through to the level rule.
    expect(matchEvolution(shadekitRules, levelTrigger(18, { bond: 219, period: 'night' }))).toBe('NIGHTMAW')
    expect(matchEvolution(shadekitRules, levelTrigger(18, { bond: 255, period: 'day' }))).toBe('NIGHTMAW')
    // Below the level threshold the bond rule still answers night level-ups.
    expect(matchEvolution(shadekitRules, levelTrigger(10, { bond: 220, period: 'night' }))).toBe('GLOAMFANG')
    expect(matchEvolution(shadekitRules, levelTrigger(10, { bond: 219, period: 'night' }))).toBeNull()
  })
})

// ── Bond (§13, Gen-2 happiness tradition) ───────────────────────────────────

describe('bond constants', () => {
  it('pins the Gen-2 numbers', () => {
    expect(BOND_BASE).toBe(70)
    expect(BOND_MAX).toBe(255)
    expect(BOND_EVOLVE_MIN).toBe(220)
  })
})

describe('bondDelta: the banded table', () => {
  it('levelUp and gymWin pay +5 / +3 / +2 by band (<100 / <200 / else)', () => {
    for (const kind of ['levelUp', 'gymWin'] as const) {
      expect(bondDelta(0, kind)).toBe(5)
      expect(bondDelta(99, kind)).toBe(5)
      expect(bondDelta(100, kind)).toBe(3)
      expect(bondDelta(199, kind)).toBe(3)
      expect(bondDelta(200, kind)).toBe(2)
      expect(bondDelta(255, kind)).toBe(2)
    }
  })

  it('heal and steps always pay +1; faint always costs 1', () => {
    for (const bond of [0, 99, 100, 199, 200, 255]) {
      expect(bondDelta(bond, 'heal')).toBe(1)
      expect(bondDelta(bond, 'steps')).toBe(1)
      expect(bondDelta(bond, 'faint')).toBe(-1)
    }
  })
})

describe('bondEvent: application and clamps', () => {
  it('applies the band of the CURRENT bond, then moves it', () => {
    const k = atLevel5(98)
    bondEvent(k, 'levelUp') // 98 < 100 → +5, even though it crosses the band
    expect(k.bond).toBe(103)
    bondEvent(k, 'levelUp') // 103 → +3
    expect(k.bond).toBe(106)
  })

  it('clamps at BOND_MAX', () => {
    const k = atLevel5(254)
    bondEvent(k, 'levelUp') // 254 ≥ 200 → +2, clamped
    expect(k.bond).toBe(255)
    bondEvent(k, 'heal')
    expect(k.bond).toBe(255)
  })

  it('clamps at zero', () => {
    const k = atLevel5(1)
    bondEvent(k, 'faint')
    expect(k.bond).toBe(0)
    bondEvent(k, 'faint')
    expect(k.bond).toBe(0)
  })
})

// ── applyExpFor: the level loop wears the rules (§9.5 + §13) ────────────────

describe('applyExpFor: bond accrual', () => {
  it('accrues per level gained, banded as bond grows', () => {
    const k = atLevel5(92)
    const events = applyExpFor(k, fixtureSpecies(), expTo(k, 8))
    expect(events.map((e) => e.newLevel)).toEqual([6, 7, 8])
    expect(k.bond).toBe(105) // 92 +5 → 97 +5 → 102 +3 → 105
  })

  it('pays the high-band +2 and clamps at 255', () => {
    const high = atLevel5(210)
    applyExpFor(high, fixtureSpecies(), expTo(high, 6))
    expect(high.bond).toBe(212)
    const capped = atLevel5(254)
    applyExpFor(capped, fixtureSpecies(), expTo(capped, 6))
    expect(capped.bond).toBe(255)
  })

  it('accrues nothing for sub-level gains', () => {
    const k = atLevel5()
    expect(applyExpFor(k, fixtureSpecies(spoolenRules), 10)).toEqual([])
    expect(k.bond).toBe(BOND_BASE)
    expect(k.pendingEvo).toBeUndefined()
  })
})

describe('applyExpFor: period plumbing', () => {
  const moth = fixtureSpecies([
    { kind: 'level', level: 6, into: 'DUSKMOTH', period: 'night' },
    { kind: 'level', level: 6, into: 'LACEWING' },
  ])

  it('routes the period into the trigger: night takes the night rule', () => {
    const k = atLevel5()
    applyExpFor(k, moth, expTo(k, 6), 'night')
    expect(k.pendingEvo).toBe('DUSKMOTH')
  })

  it('day falls through to the plain rule', () => {
    const k = atLevel5()
    applyExpFor(k, moth, expTo(k, 6), 'day')
    expect(k.pendingEvo).toBe('LACEWING')
  })

  it("omitting the period behaves as 'day' (pure call sites keep compiling)", () => {
    const k = atLevel5()
    applyExpFor(k, moth, expTo(k, 6))
    expect(k.pendingEvo).toBe('LACEWING')
  })
})

describe('applyExpFor: bond rules at level-up', () => {
  const bondLine = fixtureSpecies([{ kind: 'bond', min: 220, into: 'GLOAMFANG' }])

  it("counts the level-up's own bond gain before reading the rules", () => {
    const k = atLevel5(218)
    applyExpFor(k, bondLine, expTo(k, 6)) // 218 ≥ 200 → +2 → 220, exactly the threshold
    expect(k.bond).toBe(220)
    expect(k.pendingEvo).toBe('GLOAMFANG')
  })

  it('does not mark below the threshold', () => {
    const k = atLevel5(100)
    applyExpFor(k, bondLine, expTo(k, 6)) // 100 → 103, far from 220
    expect(k.pendingEvo).toBeUndefined()
  })

  it('gates bond rules on the period', () => {
    const nightLine = fixtureSpecies([{ kind: 'bond', min: 220, into: 'GLOAMFANG', period: 'night' }])
    const day = atLevel5(255)
    applyExpFor(day, nightLine, expTo(day, 6), 'day')
    expect(day.pendingEvo).toBeUndefined()
    const night = atLevel5(255)
    applyExpFor(night, nightLine, expTo(night, 6), 'night')
    expect(night.pendingEvo).toBe('GLOAMFANG')
  })
})

describe('applyExpFor: re-marking after a cancelled ceremony', () => {
  it('a level rule re-marks on every later level-up', () => {
    const species = fixtureSpecies([{ kind: 'level', level: 6, into: 'BLOOMKIN' }])
    const k = atLevel5()
    applyExpFor(k, species, expTo(k, 6))
    expect(k.pendingEvo).toBe('BLOOMKIN')
    delete k.pendingEvo // the B-cancel
    applyExpFor(k, species, expTo(k, 7))
    expect(k.pendingEvo).toBe('BLOOMKIN')
  })

  it('a bond rule stops re-marking once bond has fallen below min', () => {
    const species = fixtureSpecies([{ kind: 'bond', min: 220, into: 'GLOAMFANG' }])
    const k = atLevel5(230)
    applyExpFor(k, species, expTo(k, 6))
    expect(k.pendingEvo).toBe('GLOAMFANG')
    delete k.pendingEvo // the B-cancel...
    k.bond = 50 // ...and a rough stretch of fainting
    applyExpFor(k, species, expTo(k, 7))
    expect(k.bond).toBe(55)
    expect(k.pendingEvo).toBeUndefined()
  })
})
