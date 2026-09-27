/**
 * Data-layer contract tests: the tables in src/game/data must match
 * docs/ROSTER.md (§A–C) and docs/MECHANICS.md (§4, §12) exactly, and
 * every cross-reference (learnset → move, evolution → species,
 * trainer party → species, defeat text key) must resolve.
 */
import { describe, expect, it } from 'vitest'
import {
  ITEMS, MOVES, SPECIES, TRAINERS, TYPE_CHART, PHYSICAL_TYPES,
  effectiveness, isPhysical, itemOf, moveOf, speciesOf, trainerOf,
} from '../src/game/data'
import {
  BELL_TOLL_DAY, BELL_TOLL_MAPS, BELL_TOLL_MULT, GIFT_DAY, GIFT_ROTATION,
  MARKET_DAY, MARKET_OFFERS, giftItem, marketOffer, weeklyEncounterMult,
} from '../src/game/data/weekly'
import type { ElemType, FieldSkillId, Move, Rider, TrainerDef } from '../src/game/types'
import { BOX_LINES, wrapText } from '../src/game/ui/format'

const ALL_TYPES: readonly ElemType[] = [
  'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost',
  'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark',
]

/** Narrow a move to its strike riders (empty for riderless strikes). */
function ridersOf(m: Move): Rider[] {
  expect(m.effect.kind).toBe('strike')
  return m.effect.kind === 'strike' ? m.effect.riders ?? [] : []
}

describe('species (ROSTER §A)', () => {
  const all = Object.values(SPECIES)

  it('has all 24 species with unique ids 1–24', () => {
    expect(all).toHaveLength(24)
    const ids = all.map(s => s.id).sort((a, b) => a - b)
    expect(ids).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
  })

  it('keys the record by species key, UPPERCASE ≤10 chars', () => {
    for (const [key, s] of Object.entries(SPECIES)) {
      expect(s.key).toBe(key)
      expect(key.length).toBeLessThanOrEqual(10)
      expect(key).toBe(key.toUpperCase())
    }
  })

  it('resolves every learnset move in MOVES, levels non-decreasing', () => {
    for (const s of all) {
      expect(s.learnset.length).toBeGreaterThan(0)
      let prev = 1
      for (const { level, move } of s.learnset) {
        expect(MOVES[move], `${s.key} learns unknown move ${move}`).toBeDefined()
        expect(level).toBeGreaterThanOrEqual(prev)
        prev = level
      }
    }
  })

  it('gives every species a damaging move at level 1 (ROSTER §E)', () => {
    for (const s of all) {
      const opener = s.learnset.some(e => e.level === 1 && moveOf(e.move).power > 0)
      expect(opener, `${s.key} has no damaging level-1 move`).toBe(true)
    }
  })

  it('resolves every evolution target; starter thresholds are 16/14/15', () => {
    for (const s of all) {
      for (const rule of s.evolution ?? []) {
        expect(SPECIES[rule.into], `${s.key} evolution -> ${rule.into}`).toBeDefined()
      }
    }
    // The plain (any-period) level rule; night branches are pinned separately.
    const levelRule = (key: string) =>
      speciesOf(key).evolution?.find((r) => r.kind === 'level' && !r.period)
    expect(levelRule('VERDIL')).toEqual({ kind: 'level', level: 16, into: 'VERDRAKE' })
    expect(levelRule('EMBERIT')).toEqual({ kind: 'level', level: 14, into: 'CINDERAX' })
    expect(levelRule('RILLET')).toEqual({ kind: 'level', level: 15, into: 'CASCOTT' })
    expect(levelRule('THREDLE')).toEqual({ kind: 'level', level: 7, into: 'SPOOLEN' })
    expect(levelRule('SHADEKIT')).toEqual({ kind: 'level', level: 18, into: 'GLOAMFANG' })
    expect(levelRule('SPOOLEN')?.into).toBe('LACEWING')
    const finals = all.filter(s => !s.evolution?.length).map(s => s.key)
    expect(finals.length).toBeGreaterThanOrEqual(13)
  })

  it('orders SPOOLEN: moth by night first, butterfly by day, link last', () => {
    expect(speciesOf('SPOOLEN').evolution).toEqual([
      { kind: 'level', level: 10, into: 'DUSKMOTH', period: 'night' },
      { kind: 'level', level: 10, into: 'LACEWING' },
      { kind: 'link', into: 'LACEWING' },
    ])
  })

  it('evolves DEWBELL by the TOLL SHARD stone', () => {
    expect(speciesOf('DEWBELL').evolution).toEqual([
      { kind: 'stone', item: 'TOLL_SHARD', into: 'TOLLGEIST' },
    ])
  })

  it('checks SHADEKIT bond at night before its plain level rule', () => {
    expect(speciesOf('SHADEKIT').evolution).toEqual([
      { kind: 'bond', min: 220, into: 'GLOAMFANG', period: 'night' },
      { kind: 'level', level: 18, into: 'GLOAMFANG' },
    ])
  })

  it('resolves every stone rule to a stone-kind item', () => {
    let stoneRules = 0
    for (const s of all) {
      for (const rule of s.evolution ?? []) {
        if (rule.kind !== 'stone') continue
        stoneRules++
        expect(itemOf(rule.item).effect.kind, `${s.key} stone ${rule.item}`).toBe('stone')
      }
    }
    expect(stoneRules).toBeGreaterThanOrEqual(1)
  })

  it('grants each field skill to exactly the planned species', () => {
    const adepts = (skill: FieldSkillId) =>
      all.filter(s => s.fieldSkills?.includes(skill)).map(s => s.key).sort()
    expect(adepts('HEW')).toEqual(['VERDIL', 'VERDRAKE'])
    expect(adepts('WAVERIDE')).toEqual(['CASCOTT', 'PADDLET', 'RILLET', 'TORTIDE'])
    expect(adepts('HEAVE')).toEqual(['CASCOTT', 'TORTIDE'])
    expect(adepts('LUMINA')).toEqual(['AMBERSTAG', 'WISPETAL'])
  })

  it('sets the wild held-item bands (MECHANICS §10.2)', () => {
    expect(speciesOf('THATCHRAT').heldItems).toEqual([{ item: 'PLUMP_BERRY', chance: 23 }])
    expect(speciesOf('DEWBELL').heldItems).toEqual([
      { item: 'TINGLE_BERRY', chance: 23 },
      { item: 'TOLL_SHARD', chance: 2 },
    ])
    expect(speciesOf('WISPETAL').heldItems).toEqual([{ item: 'LUMEN_BERRY', chance: 2 }])
    expect(speciesOf('HUSHOWL').heldItems).toEqual([{ item: 'KEEN_LENS', chance: 2 }])
    const carriers = all.filter(s => s.heldItems).map(s => s.key).sort()
    expect(carriers).toEqual(['DEWBELL', 'HUSHOWL', 'THATCHRAT', 'WISPETAL'])
  })

  it('resolves every wild held item, bands fitting one rand(0..99) draw', () => {
    for (const s of all) {
      for (const { item } of s.heldItems ?? []) {
        expect(() => itemOf(item), `${s.key} holds unknown ${item}`).not.toThrow()
      }
      const total = (s.heldItems ?? []).reduce((sum, h) => sum + h.chance, 0)
      expect(total, `${s.key} held bands`).toBeLessThanOrEqual(100)
      for (const { chance } of s.heldItems ?? []) expect(chance).toBeGreaterThan(0)
    }
  })

  it('pins exact rows: VERDIL and AMBERSTAG', () => {
    const verdil = speciesOf('VERDIL')
    expect(verdil.id).toBe(1)
    expect(verdil.type1).toBe('grass')
    expect(verdil.type2).toBeUndefined()
    expect(verdil.base).toEqual({ hp: 50, atk: 49, def: 55, spa: 49, spd: 55, spe: 52 })
    expect(verdil.catchRate).toBe(45)
    expect(verdil.baseExp).toBe(64)
    expect(verdil.growth).toBe('mediumSlow')

    const stag = speciesOf('AMBERSTAG')
    expect(stag.id).toBe(24)
    expect(stag.type1).toBe('normal')
    expect(stag.type2).toBe('psychic')
    expect(stag.base).toEqual({ hp: 95, atk: 75, def: 70, spa: 95, spd: 85, spe: 60 })
    expect(stag.catchRate).toBe(3)
    expect(stag.baseExp).toBe(200)
    expect(stag.growth).toBe('slow')
    expect(stag.learnset.at(-1)).toEqual({ level: 31, move: 'DAWN_LANCE' })
  })

  it('keeps base stat totals in the doc-validated bands (ROSTER §E)', () => {
    const total = (key: string) => {
      const b = speciesOf(key).base
      return b.hp + b.atk + b.def + b.spa + b.spd + b.spe
    }
    expect(total('VERDIL')).toBe(310)
    expect(total('VERDRAKE')).toBe(415)
    expect(total('CINDERAX')).toBe(408)
    expect(total('THREDLE')).toBe(195)
    expect(total('ZEPHYRIL')).toBe(400)
    expect(total('AMBERSTAG')).toBe(480)
  })

  it('keeps Kindex entries within 110 chars', () => {
    for (const s of all) expect(s.entry.length, s.key).toBeLessThanOrEqual(110)
  })
})

describe('moves (ROSTER §B + MECHANICS §12)', () => {
  const all = Object.values(MOVES)

  it('has all 46 moves, keyed consistently, names ≤12 chars', () => {
    expect(all).toHaveLength(46)
    for (const [key, m] of Object.entries(MOVES)) {
      expect(m.key).toBe(key)
      expect(m.name.length).toBeLessThanOrEqual(12)
    }
  })

  it('is fully reachable: every move appears in some learnset (ROSTER §E)', () => {
    const learned = new Set(
      Object.values(SPECIES).flatMap(s => s.learnset.map(e => e.move)),
    )
    for (const m of all) expect(learned.has(m.key), `${m.key} unlearnable`).toBe(true)
  })

  it('marks non-damaging moves with power 0 and vice versa', () => {
    for (const m of all) {
      const damaging = m.effect.kind === 'strike'
      expect(m.power > 0, `${m.key} power/effect mismatch`).toBe(damaging)
    }
  })

  it('gives never-miss moves accuracy null (the "—" rows)', () => {
    const neverMiss = all.filter(m => m.accuracy === null).map(m => m.key).sort()
    expect(neverMiss).toEqual(['CURL_UP', 'MORNING_DEW', 'RILE_UP', 'WIND_SPRINT'])
  })

  it('maps EFFECT.PRIORITY_HI and EFFECT.HIGH_CRIT', () => {
    expect(moveOf('QUICK_DART').priority).toBe(1)
    expect(moveOf('SHADOWSTEP').priority).toBe(1)
    expect(moveOf('LEAF_LASH').highCrit).toBe(true)
    expect(moveOf('ZEPHYR_LANCE').highCrit).toBe(true)
    const flagged = all.filter(m => m.priority !== undefined || m.highCrit)
    expect(flagged.map(m => m.key).sort())
      .toEqual(['LEAF_LASH', 'QUICK_DART', 'SHADOWSTEP', 'ZEPHYR_LANCE'])
  })

  it('maps secondary riders: status, flinch, confuse, stat-lower', () => {
    expect(ridersOf(moveOf('TRAMPLE'))).toEqual([{ kind: 'status', status: 'par', chance: 30 }])
    expect(ridersOf(moveOf('CINDER_SPIT'))).toEqual([{ kind: 'status', status: 'brn', chance: 10 }])
    expect(ridersOf(moveOf('FROST_DEW'))).toEqual([{ kind: 'status', status: 'frz', chance: 10 }])
    expect(ridersOf(moveOf('VENOM_BARB'))).toEqual([{ kind: 'status', status: 'psn', chance: 20 }])
    expect(ridersOf(moveOf('DIVE_BOMB'))).toEqual([{ kind: 'flinch', chance: 30 }])
    expect(ridersOf(moveOf('MIND_RIPPLE'))).toEqual([{ kind: 'confuse', chance: 20 }])
    expect(ridersOf(moveOf('VERDANT_COIL')))
      .toEqual([{ kind: 'stat', target: 'foe', stat: 'spd', delta: -1, chance: 100 }])
    expect(ridersOf(moveOf('SAP_SIP'))).toEqual([{ kind: 'drain' }])
    expect(ridersOf(moveOf('RECKLESS_RAM'))).toEqual([{ kind: 'recoil' }])
    expect(ridersOf(moveOf('TAIL_FLURRY'))).toEqual([{ kind: 'multiHit' }])
  })

  it('maps pure-status, stat-change, and heal effects', () => {
    expect(moveOf('LULLABELL').effect).toEqual({ kind: 'inflict', status: 'slp' })
    expect(moveOf('LULLABELL').accuracy).toBe(55)
    expect(moveOf('NUMB_POWDER').effect).toEqual({ kind: 'inflict', status: 'par' })
    expect(moveOf('BLIGHTSPORE').effect).toEqual({ kind: 'inflict', status: 'psn' })
    expect(moveOf('DREAM_MIST').accuracy).toBe(60)
    expect(moveOf('BRISTLE').effect)
      .toEqual({ kind: 'statChange', target: 'foe', changes: [{ stat: 'atk', delta: -1 }] })
    expect(moveOf('SAND_KICK').effect)
      .toEqual({ kind: 'statChange', target: 'foe', changes: [{ stat: 'acc', delta: -1 }] })
    expect(moveOf('RILE_UP').effect)
      .toEqual({ kind: 'statChange', target: 'self', changes: [{ stat: 'atk', delta: 2 }] })
    expect(moveOf('WIND_SPRINT').effect)
      .toEqual({ kind: 'statChange', target: 'self', changes: [{ stat: 'spe', delta: 2 }] })
    expect(moveOf('MORNING_DEW').effect).toEqual({ kind: 'heal', fraction: 0.5 })
  })

  it('pins a sample row verbatim: TRAMPLE 85/100/15 Normal', () => {
    const m = moveOf('TRAMPLE')
    expect([m.type, m.power, m.accuracy, m.pp]).toEqual(['normal', 85, 100, 15])
  })
})

describe('type chart (MECHANICS §4)', () => {
  it('covers all 17 attacking types with the doc row sizes', () => {
    const rowSizes: Record<ElemType, number> = {
      normal: 3, fighting: 10, flying: 6, poison: 6, ground: 8, rock: 7,
      bug: 9, ghost: 5, steel: 6, fire: 8, water: 6, grass: 10,
      electric: 6, psychic: 5, ice: 8, dragon: 2, dark: 5,
    }
    for (const t of ALL_TYPES) {
      expect(Object.keys(TYPE_CHART[t] ?? {}).length, `row ${t}`).toBe(rowSizes[t])
    }
  })

  it('matches doc spot checks (immunities)', () => {
    expect(effectiveness('ghost', 'normal')).toBe(0)
    expect(effectiveness('normal', 'ghost')).toBe(0)
    expect(effectiveness('electric', 'ground')).toBe(0)
    expect(effectiveness('ground', 'flying')).toBe(0)
    expect(effectiveness('psychic', 'dark')).toBe(0)
    expect(effectiveness('poison', 'steel')).toBe(0)
    expect(effectiveness('fighting', 'ghost')).toBe(0)
  })

  it('matches doc spot checks (super effective)', () => {
    expect(effectiveness('fire', 'grass')).toBe(2)
    expect(effectiveness('water', 'fire')).toBe(2)
    expect(effectiveness('grass', 'water')).toBe(2)
    expect(effectiveness('fighting', 'normal')).toBe(2)
    expect(effectiveness('ghost', 'psychic')).toBe(2)
    expect(effectiveness('dark', 'psychic')).toBe(2)
    expect(effectiveness('electric', 'flying')).toBe(2)
    expect(effectiveness('ice', 'dragon')).toBe(2)
    expect(effectiveness('steel', 'ice')).toBe(2)
  })

  it('matches doc spot checks (resisted + Gen-2 hallmarks)', () => {
    expect(effectiveness('dark', 'steel')).toBe(0.5)
    expect(effectiveness('ghost', 'steel')).toBe(0.5)
    expect(effectiveness('bug', 'poison')).toBe(0.5)
    expect(effectiveness('poison', 'bug')).toBe(1)
    expect(effectiveness('ice', 'fire')).toBe(0.5)
    expect(effectiveness('normal', 'rock')).toBe(0.5)
    expect(effectiveness('dragon', 'steel')).toBe(0.5)
    expect(effectiveness('grass', 'grass')).toBe(0.5)
  })

  it('multiplies dual-type defenders (slot product)', () => {
    expect(effectiveness('electric', 'normal', 'flying')).toBe(2)   // WRENLET
    expect(effectiveness('rock', 'bug', 'flying')).toBe(4)          // LACEWING
    expect(effectiveness('ground', 'bug', 'flying')).toBe(0)        // LACEWING
    expect(effectiveness('fire', 'ghost', 'grass')).toBe(2)         // WISPETAL
    expect(effectiveness('grass', 'ghost', 'grass')).toBe(0.5)      // WISPETAL
    expect(effectiveness('normal', 'normal')).toBe(1)               // absent cell = 1
  })

  it('keeps the Gen-2 physical/special split by type', () => {
    expect(PHYSICAL_TYPES.size).toBe(9)
    expect(isPhysical('ghost')).toBe(true)
    expect(isPhysical('dark')).toBe(false)
    expect(isPhysical('fire')).toBe(false)
  })
})

describe('items (MECHANICS §8.1 + content spec)', () => {
  it('has every charm tier with the right capture modifiers', () => {
    expect(itemOf('CHARM').effect).toEqual({ kind: 'charm', mult: 1 })
    expect(itemOf('CHARM').price).toBe(200)
    expect(itemOf('GILDED_CHARM').effect).toEqual({ kind: 'charm', mult: 1.5 })
    expect(itemOf('GILDED_CHARM').price).toBe(600)
    expect(itemOf('AURIC_SIGIL').effect).toEqual({ kind: 'charm', mult: 1, sigil: true })
    expect(itemOf('AURIC_SIGIL').price).toBe(0)
  })

  it('has the healing and curing items', () => {
    expect(itemOf('TONIC').effect).toEqual({ kind: 'heal', amount: 20 })
    expect(itemOf('TONIC').price).toBe(300)
    expect(itemOf('BIG_TONIC').effect).toEqual({ kind: 'heal', amount: 50 })
    expect(itemOf('BIG_TONIC').price).toBe(700)
    expect(itemOf('CURE_LEAF').effect).toEqual({ kind: 'cure', status: 'all' })
    expect(itemOf('CURE_LEAF').price).toBe(450)
  })

  it('stocks the type-boost trio at the Outfitter for 900G', () => {
    const trio = [
      ['CINDER_BAND', 'fire'], ['DEW_PEARL', 'water'], ['MOSS_LOCKET', 'grass'],
    ] as const
    for (const [key, type] of trio) {
      expect(itemOf(key).effect).toEqual({ kind: 'hold', fx: { kind: 'typeBoost', type } })
      expect(itemOf(key).price, key).toBe(900)
    }
  })

  it('keeps the find-only battle helds off the shelf', () => {
    expect(itemOf('AMBER_CRUMB').effect).toEqual({ kind: 'hold', fx: { kind: 'leftovers' } })
    expect(itemOf('AMBER_CRUMB').price).toBe(0)
    expect(itemOf('KEEN_LENS').effect).toEqual({ kind: 'hold', fx: { kind: 'critBoost' } })
    expect(itemOf('KEEN_LENS').price).toBe(0)
  })

  it('defines the three trigger-consumed berries, never sold', () => {
    expect(itemOf('LUMEN_BERRY').effect)
      .toEqual({ kind: 'hold', fx: { kind: 'cureBerry', cures: 'all' } })
    expect(itemOf('TINGLE_BERRY').effect)
      .toEqual({ kind: 'hold', fx: { kind: 'cureBerry', cures: 'par' } })
    expect(itemOf('PLUMP_BERRY').effect)
      .toEqual({ kind: 'hold', fx: { kind: 'hpBerry', heal: 10 } })
    for (const key of ['LUMEN_BERRY', 'TINGLE_BERRY', 'PLUMP_BERRY']) {
      expect(itemOf(key).price, key).toBe(0)
    }
  })

  it('defines the evolution items: TOLL SHARD free, LINK CORD dear', () => {
    expect(itemOf('TOLL_SHARD').effect).toEqual({ kind: 'stone' })
    expect(itemOf('TOLL_SHARD').price).toBe(0)
    expect(itemOf('LINK_CORD').effect).toEqual({ kind: 'link' })
    expect(itemOf('LINK_CORD').price).toBe(2000)
  })

  it("defines the OLD ROD: the angler's rod-kind gift, never sold", () => {
    const rod = itemOf('OLD_ROD')
    expect(rod.effect).toEqual({ kind: 'rod' })
    expect(rod.price).toBe(0)
    expect(rod.name).toBe('OLD ROD')
    expect(wrapText(rod.desc)).toEqual(['A trusty rod. Cast', 'where water waits.'])
  })

  it('holds the full Tier-2 shelf: 17 items, names ≤12 chars', () => {
    expect(Object.keys(ITEMS)).toHaveLength(17)
    for (const [key, i] of Object.entries(ITEMS)) {
      expect(i.key).toBe(key)
      expect(i.name.length, key).toBeLessThanOrEqual(12)
    }
  })

  it('word-wraps every description into the 2-line bag/shop panel', () => {
    for (const [key, i] of Object.entries(ITEMS)) {
      expect(wrapText(i.desc).length, key).toBeLessThanOrEqual(BOX_LINES)
    }
  })
})

describe('trainers (ROSTER §C)', () => {
  const all = Object.values(TRAINERS)

  it('has every trainer: rival variants plus the four rematch tiers', () => {
    expect(Object.keys(TRAINERS).sort()).toEqual([
      'BELLRINGER_OTTO', 'BELLRINGER_OTTO_R1', 'FORAGER_MAE', 'FORAGER_MAE_R1',
      'GLIDER_FERN', 'GLIDER_JUNO', 'HERBALIST_IVY', 'HERBALIST_IVY_R1',
      'RIVAL_CORVIN_T2_EMBERIT', 'RIVAL_CORVIN_T2_RILLET',
      'RIVAL_CORVIN_T2_VERDIL', 'SCOUT_BEN', 'SCOUT_BEN_R1', 'WARDEN_ARIA',
    ])
  })

  it('resolves every party species and keeps levels positive', () => {
    for (const t of all) {
      expect(t.party.length).toBeGreaterThan(0)
      for (const { species, level } of t.party) {
        expect(SPECIES[species], `${t.key} fields unknown ${species}`).toBeDefined()
        expect(level).toBeGreaterThan(0)
      }
    }
  })

  it('keeps names ≤16 chars and non-empty defeat text keys', () => {
    for (const t of all) {
      expect(t.name.length, t.key).toBeLessThanOrEqual(16)
      expect(t.defeatText.length, t.key).toBeGreaterThan(0)
      expect(t.sprite.startsWith('TRAINER_'), t.key).toBe(true)
    }
  })

  it('counter-picks the rival party per the player starter', () => {
    // The stolen SHADEKIT always leads, nibbling its PLUMP BERRY.
    const lead = { species: 'SHADEKIT', level: 8, held: 'PLUMP_BERRY' }
    expect(trainerOf('RIVAL_CORVIN_T2_VERDIL').party)
      .toEqual([lead, { species: 'EMBERIT', level: 9 }])
    expect(trainerOf('RIVAL_CORVIN_T2_EMBERIT').party)
      .toEqual([lead, { species: 'RILLET', level: 9 }])
    expect(trainerOf('RIVAL_CORVIN_T2_RILLET').party)
      .toEqual([lead, { species: 'VERDIL', level: 9 }])
    for (const k of ['VERDIL', 'EMBERIT', 'RILLET']) {
      const t = trainerOf(`RIVAL_CORVIN_T2_${k}`)
      expect(t.ai).toBe('smart')
      expect(t.reward).toBe(270)
    }
  })

  it('resolves every trainer-held item as a hold-kind item', () => {
    const carriers: string[] = []
    for (const t of all) {
      for (const { species, held } of t.party) {
        if (!held) continue
        carriers.push(`${t.key}:${species}`)
        expect(itemOf(held).effect.kind, `${t.key} ${species} holds ${held}`).toBe('hold')
      }
    }
    expect(carriers.sort()).toEqual([
      'HERBALIST_IVY:WISPETAL',
      'HERBALIST_IVY_R1:WISPETAL',
      'RIVAL_CORVIN_T2_EMBERIT:SHADEKIT',
      'RIVAL_CORVIN_T2_RILLET:SHADEKIT',
      'RIVAL_CORVIN_T2_VERDIL:SHADEKIT',
      'WARDEN_ARIA:ZEPHYRIL',
    ])
    expect(trainerOf('HERBALIST_IVY').party)
      .toEqual([{ species: 'WISPETAL', level: 9, held: 'LUMEN_BERRY' }])
  })

  it("fields ARIA's gym team with her signature ace", () => {
    const aria = trainerOf('WARDEN_ARIA')
    expect(aria.ai).toBe('smart')
    expect(aria.reward).toBe(1300)
    expect(aria.party).toEqual([
      { species: 'WRENLET', level: 9 },
      { species: 'GALEWREN', level: 11 },
      { species: 'ZEPHYRIL', level: 13, held: 'AMBER_CRUMB' },
    ])
    // ZEPHYR_LANCE is learnable at exactly her ace's level.
    const ace = aria.party.at(-1)
    expect(ace).toBeDefined()
    const learnable = speciesOf('ZEPHYRIL').learnset
      .filter(e => e.level <= (ace?.level ?? 0)).map(e => e.move)
    expect(learnable).toContain('ZEPHYR_LANCE')
  })

  it("supports CORVIN's lv-8 SHADEKIT knowing its doc moveset (ROSTER §E)", () => {
    // Last four learnset moves at or below level 8 — only three exist.
    const known = speciesOf('SHADEKIT').learnset
      .filter(e => e.level <= 8).slice(-4).map(e => e.move)
    expect(known).toEqual(['POUNCE', 'SHADOWSTEP', 'NIGHT_NIP'])
  })
})

describe('phone contacts & rematch tiers (Charm Gear, Tier 2)', () => {
  const CONTACT_KEYS = ['SCOUT_BEN', 'FORAGER_MAE', 'BELLRINGER_OTTO', 'HERBALIST_IVY']
  const levelSum = (t: TrainerDef) => t.party.reduce((sum, p) => sum + p.level, 0)

  it('swaps numbers with exactly the four Trail 2 trainers', () => {
    const carrying = Object.values(TRAINERS).filter(t => t.contact).map(t => t.key)
    expect(carrying.sort()).toEqual([...CONTACT_KEYS].sort())
  })

  it('pins the contacts: first names, all standing on TRAIL 2', () => {
    expect(trainerOf('SCOUT_BEN').contact).toEqual({ name: 'BEN', place: 'TRAIL 2' })
    expect(trainerOf('FORAGER_MAE').contact).toEqual({ name: 'MAE', place: 'TRAIL 2' })
    expect(trainerOf('BELLRINGER_OTTO').contact).toEqual({ name: 'OTTO', place: 'TRAIL 2' })
    expect(trainerOf('HERBALIST_IVY').contact).toEqual({ name: 'IVY', place: 'TRAIL 2' })
  })

  it('fits every contact in the PHONE row budgets (name ≤10, place ≤8)', () => {
    for (const key of CONTACT_KEYS) {
      const c = trainerOf(key).contact
      expect(c, key).toBeDefined()
      if (!c) continue
      expect(c.name.length, key).toBeLessThanOrEqual(10)
      expect(c.name, key).toBe(c.name.toUpperCase())
      expect(c.place.length, key).toBeLessThanOrEqual(8)
      expect(c.place, key).toBe(c.place.toUpperCase())
    }
  })

  it('fields a _R1 tier per contact: same face, +5-6 levels, 1.5x purse', () => {
    for (const key of CONTACT_KEYS) {
      const base = trainerOf(key)
      const re = trainerOf(`${key}_R1`)
      expect(re.name, key).toBe(base.name)
      expect(re.sprite, key).toBe(base.sprite)
      expect(re.ai, key).toBe(base.ai)
      expect(re.reward, key).toBe(base.reward * 1.5)
      expect(re.defeatText.startsWith('story.rematch.'), key).toBe(true)
      expect(re.contact, `${key}_R1 must not re-register`).toBeUndefined()
      expect(levelSum(re), key).toBeGreaterThan(levelSum(base))
      expect(re.party.length, key).toBe(base.party.length)
      re.party.forEach((slot, i) => {
        const delta = slot.level - (base.party[i]?.level ?? 0)
        expect(delta, `${key}_R1 slot ${i}`).toBeGreaterThanOrEqual(5)
        expect(delta, `${key}_R1 slot ${i}`).toBeLessThanOrEqual(6)
      })
    }
  })

  it('grows the rematch parties only where the dex earns it', () => {
    // BEN's WRENLET fledged at exactly its level-12 rule; MAE's SPOOLEN
    // opened by day past its level-10 rule. Everyone else just trained.
    expect(speciesOf('WRENLET').evolution)
      .toEqual([{ kind: 'level', level: 12, into: 'GALEWREN' }])
    expect(trainerOf('SCOUT_BEN_R1').party)
      .toEqual([{ species: 'GALEWREN', level: 12 }, { species: 'SCURRIL', level: 12 }])
    expect(trainerOf('FORAGER_MAE_R1').party)
      .toEqual([{ species: 'THREDLE', level: 11 }, { species: 'LACEWING', level: 14 }])
    expect(trainerOf('BELLRINGER_OTTO_R1').party)
      .toEqual([{ species: 'DEWBELL', level: 14 }])
    expect(trainerOf('HERBALIST_IVY_R1').party)
      .toEqual([{ species: 'WISPETAL', level: 15, held: 'LUMEN_BERRY' }])
  })
})

describe('weekly registry (Tier 2)', () => {
  it('keeps the calendar constants on the planned beats', () => {
    expect(MARKET_DAY).toBe(6)    // the Bellmere market vendor, Saturdays
    expect(GIFT_DAY).toBe(0)      // the Trail 1 berry gran, Sunday mornings
    expect(BELL_TOLL_DAY).toBe(3) // the Wednesday night the Spire sings
  })

  it('resolves every market offer to a real item with a sane price', () => {
    expect(MARKET_OFFERS.length).toBeGreaterThanOrEqual(4)
    expect(MARKET_OFFERS.length).toBeLessThanOrEqual(6)
    for (const { item, price, pitch } of MARKET_OFFERS) {
      expect(() => itemOf(item), `offer ${item}`).not.toThrow()
      expect(Number.isInteger(price), item).toBe(true)
      expect(price, item).toBeGreaterThan(0)
      expect(pitch.startsWith('story.market.pitch.'), item).toBe(true)
    }
    const items = MARKET_OFFERS.map(o => o.item)
    expect(new Set(items).size).toBe(items.length) // a ring never repeats
  })

  it('undercuts the Outfitter wherever the shelves overlap', () => {
    for (const { item, price } of MARKET_OFFERS) {
      const listed = itemOf(item).price
      if (listed > 0) expect(price, item).toBeLessThan(listed)
    }
  })

  it('pins the ring: the charm week, the band trio, the berry week', () => {
    expect(MARKET_OFFERS[0])
      .toEqual({ item: 'GILDED_CHARM', price: 450, pitch: 'story.market.pitch.charm' })
    for (const key of ['CINDER_BAND', 'DEW_PEARL', 'MOSS_LOCKET']) {
      expect(MARKET_OFFERS.find(o => o.item === key)?.price, key).toBe(700)
    }
    expect(MARKET_OFFERS.find(o => o.item === 'LUMEN_BERRY')?.price).toBe(200)
  })

  it('rotates both rings totally over any week stamp', () => {
    for (let week = 0; week < 30; week++) {
      expect(MARKET_OFFERS).toContain(marketOffer(week))
      expect(GIFT_ROTATION).toContain(giftItem(week))
    }
    expect(marketOffer(MARKET_OFFERS.length)).toBe(MARKET_OFFERS[0])
    expect(giftItem(GIFT_ROTATION.length + 1)).toBe(GIFT_ROTATION[1])
  })

  it('resolves the Sunday gift ring to never-sold hold-berries', () => {
    expect(GIFT_ROTATION).toEqual(['TINGLE_BERRY', 'PLUMP_BERRY', 'LUMEN_BERRY'])
    for (const key of GIFT_ROTATION) {
      expect(itemOf(key).effect.kind, key).toBe('hold')
      expect(itemOf(key).price, key).toBe(0)
    }
  })

  it('doubles exactly the two Spire floors, only on toll night', () => {
    expect([...BELL_TOLL_MAPS].sort()).toEqual(['wisteria_spire_1f', 'wisteria_spire_2f'])
    expect(BELL_TOLL_MULT).toBe(2)
    for (const id of BELL_TOLL_MAPS) {
      expect(weeklyEncounterMult(id, BELL_TOLL_DAY, true), id).toBe(BELL_TOLL_MULT)
      expect(weeklyEncounterMult(id, BELL_TOLL_DAY, false), `${id} by day`).toBe(1)
      expect(weeklyEncounterMult(id, 2, true), `${id} on Tuesday`).toBe(1)
    }
    expect(weeklyEncounterMult('bellmere', BELL_TOLL_DAY, true)).toBe(1)
  })
})

describe('registry helpers', () => {
  it('throws on unknown keys', () => {
    expect(() => speciesOf('MISSINGNO')).toThrow(/unknown species/)
    expect(() => moveOf('SPLASH')).toThrow(/unknown move/)
    expect(() => itemOf('NUGGET')).toThrow(/unknown item/)
    expect(() => trainerOf('YOUNGSTER_JOE')).toThrow(/unknown trainer/)
  })
})
