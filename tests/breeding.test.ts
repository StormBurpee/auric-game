/**
 * The breeding contract of docs/MECHANICS.md §15 — egg groups (every
 * evolution family in exactly one), the compatibility bands, the
 * mid-point ± 2 gene math with its draw order pinned by a scripted Rng,
 * cycle counts (clamp(6, baseExp/12, 12) × 256), the egg-move-lite
 * selection, makeEgg end to end, hatch()'s warm numbers (level 5 kept,
 * bond 120, full HP), the nurseryWrap lay roll (and that it draws from
 * the rng ONLY when a roll is live — seed-replay discipline), and the
 * EGG veil over names, tells, pickers and sorts.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '../src/engine'
import { EGG_GROUPS, SPECIES } from '../src/game/data/species'
import type { EggGroup } from '../src/game/data/species'
import { NURSERY_EGG_FLAG, nurseryStepWrap, nurseryWrap } from '../src/game/data/events/nursery'
import type { Game } from '../src/game/game'
import {
  able, baseForm, BOND_BASE, BOND_HATCH, compatibility, EGG_CHANCE, EGG_CYCLE, eggGroupOf,
  eggMoveset, eggStepsFor, expForLevel, HATCH_LEVEL, hatch, inheritGene, isEgg, makeEgg,
  makeKindra, maxHpOf, partyAble,
} from '../src/game/kindra'
import { newSave } from '../src/game/state'
import type { Kindra, LearnsetEntry, MoveSlot, Species } from '../src/game/types'
import { sortView } from '../src/game/ui/archive'
import { eggTellKey, kindraName } from '../src/game/ui/format'
import { eggArtOf } from '../src/game/ui/party'

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Rng whose int() draws are scripted; throws when over-drawn, so tests also prove draw counts. */
class ScriptedRng extends Rng {
  private readonly queue: number[]
  constructor(values: readonly number[] = []) {
    super(0)
    this.queue = [...values]
  }
  override int(n: number): number {
    const v = this.queue.shift()
    if (v === undefined) throw new Error('ScriptedRng: queue exhausted')
    if (v >= n) throw new Error(`ScriptedRng: scripted ${v} out of range for int(${n})`)
    return v
  }
}

const L = (level: number, move: string): LearnsetEntry => ({ level, move })
const slot = (move: string): MoveSlot => ({ move, pp: 10, ppMax: 10 })

/** A registry-free species for synthetic baseForm walks. */
function spec(key: string, into?: string): Species {
  const s: Species = {
    id: 1, key, type1: 'normal',
    base: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
    catchRate: 45, baseExp: 60, growth: 'mediumFast', learnset: [], entry: '',
  }
  if (into) s.evolution = [{ kind: 'level', level: 5, into }]
  return s
}

/** A real Kindra turned egg (steps optional; defaults mid-shell). */
function eggOf(species: string, steps = 1000): Kindra {
  const k = makeKindra(species, HATCH_LEVEL)
  k.egg = steps
  return k
}

// ── Egg groups (D2) ─────────────────────────────────────────────────────────

describe('egg groups', () => {
  it('covers every species except AMBERSTAG, which does not breed', () => {
    for (const key of Object.keys(SPECIES)) {
      if (key === 'AMBERSTAG') expect(EGG_GROUPS[key]).toBeUndefined()
      else expect(EGG_GROUPS[key], `${key} needs a group`).toBeDefined()
    }
    expect(eggGroupOf('AMBERSTAG')).toBeNull()
    expect(eggGroupOf('NOBODY')).toBeNull()
  })

  it('pins the census: field 8 / shore 4 / sky 4 / brood 4 / drift 3', () => {
    const census: Record<EggGroup, number> = { field: 0, shore: 0, sky: 0, brood: 0, drift: 0 }
    for (const g of Object.values(EGG_GROUPS)) census[g]++
    expect(census).toEqual({ field: 8, shore: 4, sky: 4, brood: 4, drift: 3 })
    expect(Object.keys(EGG_GROUPS)).toHaveLength(23)
  })

  it('keeps every evolution family inside one group', () => {
    for (const s of Object.values(SPECIES)) {
      for (const rule of s.evolution ?? []) {
        expect(EGG_GROUPS[rule.into], `${s.key} -> ${rule.into} crosses groups`)
          .toBe(EGG_GROUPS[s.key])
      }
      // The hatchling's base form therefore shares the group too.
      expect(eggGroupOf(baseForm(s.key))).toBe(eggGroupOf(s.key))
    }
  })
})

// ── Compatibility bands ─────────────────────────────────────────────────────

describe('compatibility', () => {
  const rillet = makeKindra('RILLET', 10)
  const rillet2 = makeKindra('RILLET', 22)
  const cascott = makeKindra('CASCOTT', 20)
  const verdil = makeKindra('VERDIL', 10)
  const stag = makeKindra('AMBERSTAG', 40)

  it('answers the matrix: species / group / never', () => {
    expect(compatibility(rillet, rillet2)).toBe('species')
    expect(compatibility(rillet, cascott)).toBe('group') // same family is NOT same species
    expect(compatibility(cascott, rillet)).toBe('group') // symmetric
    expect(compatibility(rillet, verdil)).toBeNull() // shore × field
    expect(compatibility(stag, makeKindra('AMBERSTAG', 40))).toBeNull() // the legend abstains
  })

  it('never pairs an egg', () => {
    expect(compatibility(eggOf('RILLET'), rillet)).toBeNull()
    expect(compatibility(rillet, eggOf('RILLET'))).toBeNull()
  })

  it('orders the bands by EGG_CHANCE', () => {
    expect(EGG_CHANCE.species).toBe(70)
    expect(EGG_CHANCE.group).toBe(50)
  })
})

// ── Base form ───────────────────────────────────────────────────────────────

describe('baseForm', () => {
  it('reverse-walks every line to its root', () => {
    expect(baseForm('DUSKMOTH')).toBe('THREDLE') // two stages up, through the branch
    expect(baseForm('LACEWING')).toBe('THREDLE')
    expect(baseForm('TOLLGEIST')).toBe('DEWBELL') // a stone line walks back too
    expect(baseForm('GLOAMFANG')).toBe('SHADEKIT')
    expect(baseForm('CASCOTT')).toBe('RILLET')
    expect(baseForm('VERDIL')).toBe('VERDIL') // a base form is its own root
    expect(baseForm('AMBERSTAG')).toBe('AMBERSTAG')
  })

  it('terminates on a malformed evolution cycle', () => {
    const loop = { A: spec('A', 'B'), B: spec('B', 'A') }
    expect(baseForm('A', loop)).toBe('B') // stops at the first revisit
    expect(baseForm('B', loop)).toBe('A')
  })
})

// ── Cycle counts (D5) ───────────────────────────────────────────────────────

describe('eggStepsFor', () => {
  it('pins the full band table', () => {
    expect(eggStepsFor(SPECIES['THREDLE']!.baseExp)).toBe(1536) // 50 → clamp up to 6 cycles
    expect(eggStepsFor(SPECIES['VERDIL']!.baseExp)).toBe(1536) // 64 → 5 → clamp 6
    expect(eggStepsFor(SPECIES['RILLET']!.baseExp)).toBe(1536) // 66 → 6
    expect(eggStepsFor(SPECIES['SHADEKIT']!.baseExp)).toBe(1536) // 70 → 6
    expect(eggStepsFor(SPECIES['DEWBELL']!.baseExp)).toBe(1792) // 84 → 7
    expect(eggStepsFor(SPECIES['HUSHOWL']!.baseExp)).toBe(2048) // 92 → 8
    expect(eggStepsFor(SPECIES['WISPETAL']!.baseExp)).toBe(2048) // 95 → 8
    expect(eggStepsFor(SPECIES['ZEPHYRIL']!.baseExp)).toBe(3072) // 150 → 13 → clamp 12
  })

  it('clamps both ends to 6 and 12 cycles of 256', () => {
    expect(eggStepsFor(0)).toBe(6 * EGG_CYCLE)
    expect(eggStepsFor(99999)).toBe(12 * EGG_CYCLE)
  })
})

// ── Gene inheritance (D6) ───────────────────────────────────────────────────

describe('inheritGene', () => {
  it('is mid-point + (int(5) - 2), exactly one draw', () => {
    expect(inheritGene(10, 5, new ScriptedRng([4]))).toBe(9) // floor(7.5) + 2
    expect(inheritGene(10, 5, new ScriptedRng([2]))).toBe(7) // jitter 0
    expect(inheritGene(10, 5, new ScriptedRng([0]))).toBe(5) // jitter -2
  })

  it('clamps to the 0-15 gene range', () => {
    expect(inheritGene(15, 15, new ScriptedRng([4]))).toBe(15)
    expect(inheritGene(0, 0, new ScriptedRng([0]))).toBe(0)
    expect(inheritGene(0, 1, new ScriptedRng([0]))).toBe(0) // floor(0.5) - 2 → clamp
  })

  it('stays within mid ± 2 across seeds', () => {
    for (let seed = 0; seed < 50; seed++) {
      const g = inheritGene(3, 12, new Rng(seed))
      expect(g).toBeGreaterThanOrEqual(5) // floor(7.5) - 2
      expect(g).toBeLessThanOrEqual(9) // floor(7.5) + 2
    }
  })
})

// ── The egg-move-lite (D6) ──────────────────────────────────────────────────

describe('eggMoveset', () => {
  const line = [L(1, 'A'), L(1, 'B'), L(2, 'C'), L(3, 'D'), L(20, 'X')]

  it('starts from the level-5 learnset and adds the highest shared move above 5', () => {
    const out = eggMoveset(
      [L(1, 'A'), L(8, 'P'), L(12, 'Q')],
      [slot('A'), slot('P'), slot('Q')],
      [slot('P'), slot('Q')],
    )
    expect(out).toEqual(['A', 'Q']) // Q (12) outranks P (8)
  })

  it('adds nothing when the parents share nothing useful', () => {
    expect(eggMoveset(line, [slot('X')], [slot('A')])).toEqual(['A', 'B', 'C', 'D'])
    // A shared move outside the baby's learnset is no inheritance at all.
    expect(eggMoveset(line, [slot('Z')], [slot('Z')])).toEqual(['A', 'B', 'C', 'D'])
  })

  it('skips a shared move the hatchling already knows', () => {
    // 'A' re-appears above level 5, but the level-5 set already has it.
    expect(eggMoveset([L(1, 'A'), L(10, 'A')], [slot('A')], [slot('A')])).toEqual(['A'])
  })

  it('replaces slot 0 when four slots are already full', () => {
    expect(eggMoveset(line, [slot('X')], [slot('X')])).toEqual(['X', 'B', 'C', 'D'])
  })
})

// ── makeEgg, end to end ─────────────────────────────────────────────────────

describe('makeEgg', () => {
  function parents(): { keeper: Kindra; partner: Kindra } {
    const keeper = makeKindra('CASCOTT', 30)
    keeper.genes = { hp: 0, atk: 10, def: 8, spa: 12, spd: 12, spe: 6 }
    const partner = makeKindra('RILLET', 30)
    partner.genes = { hp: 0, atk: 5, def: 7, spa: 3, spd: 3, spe: 9 }
    return { keeper, partner }
  }

  it('lays the keeper line as its base form, with the draw order pinned (ATK, DEF, SPE, SPC)', () => {
    const { keeper, partner } = parents()
    const egg = makeEgg(keeper, partner, new ScriptedRng([1, 2, 3, 4])) // exactly four draws
    expect(egg.species).toBe('RILLET') // CASCOTT's root, not the partner's anything
    expect(egg.genes.atk).toBe(6) // floor(15/2) + 1 - 2
    expect(egg.genes.def).toBe(7) // floor(15/2) + 2 - 2
    expect(egg.genes.spe).toBe(8) // floor(15/2) + 3 - 2
    expect(egg.genes.spa).toBe(9) // floor(15/2) + 4 - 2, the single special gene
    expect(egg.genes.spd).toBe(9) // spa === spd by construction
    expect(egg.genes.hp).toBe(5) // deriveHpGene(6, 7, 8, 9)
  })

  it('locks the whole shape at lay: level, exp, steps, moves, bond, no item', () => {
    const { keeper, partner } = parents()
    const egg = makeEgg(keeper, partner, new Rng(7))
    expect(egg.egg).toBe(1536) // RILLET baseExp 66 → 6 cycles
    expect(isEgg(egg)).toBe(true)
    expect(egg.level).toBe(HATCH_LEVEL)
    expect(egg.exp).toBe(expForLevel(HATCH_LEVEL, 'mediumSlow'))
    expect(egg.statExp).toEqual({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })
    expect(egg.bond).toBe(BOND_BASE) // warmth comes at hatch, not at lay
    expect(egg.heldItem).toBeUndefined()
    expect(egg.status).toBeNull()
    expect(egg.hp).toBe(maxHpOf(egg))
    // Both lv-30 parents know GNAW (19), the highest shared RILLET lesson above 5.
    expect(egg.moves.map((m) => m.move)).toEqual(['POUNCE', 'GNAW'])
  })

  it('walks a two-stage line all the way down', () => {
    const a = makeKindra('DUSKMOTH', 20)
    const egg = makeEgg(a, makeKindra('DUSKMOTH', 20), new Rng(3))
    expect(egg.species).toBe('THREDLE')
    expect(egg.egg).toBe(1536)
    // No DUSKMOTH lesson exists in THREDLE's learnset — base moves only.
    expect(egg.moves.map((m) => m.move)).toEqual(['POUNCE', 'SILK_SNARE', 'VENOM_BARB'])
  })
})

// ── hatch() ─────────────────────────────────────────────────────────────────

describe('hatch', () => {
  it('deletes the shell, fills HP, and starts bond at 120 — nothing else moves', () => {
    const egg = makeEgg(makeKindra('RILLET', 30), makeKindra('RILLET', 30), new Rng(1))
    const before = { species: egg.species, level: egg.level, exp: egg.exp, genes: { ...egg.genes } }
    egg.egg = 0 // walked all the way
    hatch(egg)
    expect(egg.egg).toBeUndefined()
    expect(isEgg(egg)).toBe(false)
    expect(egg.bond).toBe(BOND_HATCH)
    expect(egg.hp).toBe(maxHpOf(egg))
    expect(egg.species).toBe(before.species)
    expect(egg.level).toBe(before.level)
    expect(egg.exp).toBe(before.exp)
    expect(egg.genes).toEqual(before.genes)
    expect(kindraName(egg)).toBe('RILLET') // the veil lifts
  })
})

// ── The lay roll (nurseryWrap) ──────────────────────────────────────────────

describe('nurseryWrap', () => {
  function saveWith(parents: Kindra[]): ReturnType<typeof newSave> {
    const s = newSave('STORM')
    s.nursery = { parents, egg: null }
    return s
  }

  it('lays on a same-species pair when the roll clears 70', () => {
    const s = saveWith([makeKindra('RILLET', 12), makeKindra('RILLET', 14)])
    // One lay roll (69 < 70), then makeEgg's four gene draws — six would throw.
    expect(nurseryWrap(s, new ScriptedRng([69, 0, 1, 2, 3]))).toBe(true)
    expect(s.nursery!.egg).not.toBeNull()
    expect(s.nursery!.egg!.species).toBe('RILLET')
    expect(s.flags[NURSERY_EGG_FLAG]).toBe(true)
  })

  it('respects the band edges exactly: 70 fails species, 50 fails group, 49 clears it', () => {
    const same = saveWith([makeKindra('RILLET', 12), makeKindra('RILLET', 14)])
    expect(nurseryWrap(same, new ScriptedRng([70]))).toBe(false)
    expect(same.nursery!.egg).toBeNull()
    expect(same.flags[NURSERY_EGG_FLAG]).toBeUndefined()

    const group = saveWith([makeKindra('PADDLET', 12), makeKindra('RILLET', 14)])
    expect(nurseryWrap(group, new ScriptedRng([50]))).toBe(false)
    expect(nurseryWrap(group, new ScriptedRng([49, 0, 0, 0, 0]))).toBe(true)
    expect(group.nursery!.egg!.species).toBe('PADDLET') // parents[0] is the keeper
  })

  it('never touches the rng without a live roll (seed-replay discipline)', () => {
    const empty = new ScriptedRng([]) // ANY draw would throw
    expect(nurseryWrap(newSave('STORM'), empty)).toBe(false) // nursery null
    expect(nurseryWrap(saveWith([makeKindra('RILLET', 9)]), empty)).toBe(false) // lone boarder
    expect(nurseryWrap(saveWith([makeKindra('RILLET', 9), makeKindra('VERDIL', 9)]), empty)).toBe(false) // no band
    expect(nurseryWrap(saveWith([makeKindra('AMBERSTAG', 40), makeKindra('AMBERSTAG', 40)]), empty)).toBe(false)
    const waiting = saveWith([makeKindra('RILLET', 9), makeKindra('RILLET', 9)])
    waiting.nursery!.egg = eggOf('RILLET')
    expect(nurseryWrap(waiting, empty)).toBe(false) // one egg at a time
  })

  it('rides the overworld hook unchanged', () => {
    const s = saveWith([makeKindra('RILLET', 12), makeKindra('RILLET', 14)])
    const game = { state: s, rng: new ScriptedRng([69, 0, 1, 2, 3]) } as unknown as Game
    nurseryStepWrap(game)
    expect(s.nursery!.egg).not.toBeNull()
  })
})

// ── The veil ────────────────────────────────────────────────────────────────

describe('the EGG veil', () => {
  it('names every egg EGG — even over a nickname — until it hatches', () => {
    const egg = eggOf('RILLET')
    expect(kindraName(egg)).toBe('EGG')
    egg.nickname = 'RIVY'
    expect(kindraName(egg)).toBe('EGG')
    delete egg.egg
    expect(kindraName(egg)).toBe('RIVY')
  })

  it('bands the four tells by remaining steps', () => {
    const egg = eggOf('RILLET')
    const tellAt = (steps: number) => {
      egg.egg = steps
      return eggTellKey(egg)
    }
    expect(tellAt(1536)).toBe('sys.egg.far')
    expect(tellAt(1281)).toBe('sys.egg.far')
    expect(tellAt(1280)).toBe('sys.egg.near')
    expect(tellAt(641)).toBe('sys.egg.near')
    expect(tellAt(640)).toBe('sys.egg.soon')
    expect(tellAt(257)).toBe('sys.egg.soon')
    expect(tellAt(256)).toBe('sys.egg.now')
    expect(tellAt(0)).toBe('sys.egg.now')
  })

  it('bars eggs from every able() gate despite their full HP', () => {
    const egg = eggOf('RILLET')
    expect(egg.hp).toBeGreaterThan(0)
    expect(isEgg(egg)).toBe(true)
    expect(able(egg)).toBe(false)
    const fainted = makeKindra('VERDIL', 9)
    fainted.hp = 0
    expect(partyAble({ party: [egg, fainted] })).toBe(false) // shells don't fight
    expect(partyAble({ party: [egg, makeKindra('VERDIL', 9)] })).toBe(true)
  })

  it('sorts as EGG on the Archive shelf', () => {
    const archive = [makeKindra('RILLET', 9), eggOf('RILLET'), makeKindra('VERDIL', 9)]
    expect(sortView(archive, 'name')).toEqual([1, 0, 2]) // EGG < RILLET < VERDIL
  })

  it('always has a face to show (fallback until EGG_ART lands)', () => {
    const art = eggArtOf()
    expect(art.front.w).toBeGreaterThan(0)
    expect(art.front.w).toBeLessThanOrEqual(48)
    expect(art.front.h).toBeGreaterThan(0)
    expect(art.front.h).toBeLessThanOrEqual(48)
    expect(art.front.px).toHaveLength(art.front.w * art.front.h)
  })
})
