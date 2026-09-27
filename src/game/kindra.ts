/**
 * The lifecycle of a creature: birth (genes rolled, stats derived),
 * growth (exp curves), friendship (the bond table), becoming someone
 * new (evolution-rule resolution), healing — and, since Tier 2, the
 * egg math of the Dawnfern nursery (groups, compatibility bands,
 * inheritance, hatch) — the Gen-2-faithful math of docs/MECHANICS.md
 * §1, §9.2, §13 and §15, pinned by tests/mechanics.test.ts,
 * tests/evolution.test.ts and tests/breeding.test.ts.
 *
 * The math (ceilSqrt, statFrom, maxHpFrom, statsFor, expForLevel,
 * bondDelta, bondEvent, matchEvolution, movesetAt) is registry-free and
 * pure so tests drive it with inline fixtures; only creation and the
 * party helpers consult the data tables.
 */
import type { DayPeriod, Rng } from '../engine'
import { moveOf, SPECIES, speciesOf } from './data'
import { EGG_GROUPS } from './data/species'
import type { EggGroup } from './data/species'
import type {
  EvolutionRule, GrowthCurve, Kindra, LearnsetEntry, MoveSlot, SaveData, Species, Stats,
} from './types'

export type { EggGroup } from './data/species'

/** Smallest integer s with s*s >= n (§1.2; ceilSqrt(0) = 0). Exact — no float drift. */
export function ceilSqrt(n: number): number {
  if (n <= 0) return 0
  let s = Math.floor(Math.sqrt(n))
  while (s * s < n) s += 1
  while ((s - 1) * (s - 1) >= n) s -= 1
  return s
}

/** §1.3 core: a single floor over ((base+gene)*2 + seTerm) * L / 100. */
function core(base: number, gene: number, statExp: number, level: number): number {
  const seTerm = Math.floor(ceilSqrt(statExp) / 4)
  return Math.floor(((base + gene) * 2 + seTerm) * level / 100)
}

/** §1.3: maxHP = core + L + 10. */
export function maxHpFrom(base: number, gene: number, statExp: number, level: number): number {
  return core(base, gene, statExp, level) + level + 10
}

/** §1.3: every non-HP stat = core + 5. */
export function statFrom(base: number, gene: number, statExp: number, level: number): number {
  return core(base, gene, statExp, level) + 5
}

/** §1.1: the HP gene is the low bit of each rolled gene, packed ATK/DEF/SPE/SPC. */
export function deriveHpGene(atk: number, def: number, spe: number, spc: number): number {
  return (atk % 2) * 8 + (def % 2) * 4 + (spe % 2) * 2 + (spc % 2)
}

/**
 * Roll a fresh gene set (§1.1): ATK, DEF, SPE, SPC each rand(0..15), drawn
 * in that order; SPA and SPD share the single special gene; HP is always
 * derived. Without an rng the four rolled genes are flat 8s (HP derives
 * to 0 — all low bits even), giving a deterministic mid-tier creature.
 */
export function rollGenes(rng?: Rng): Stats {
  const atk = rng ? rng.int(16) : 8
  const def = rng ? rng.int(16) : 8
  const spe = rng ? rng.int(16) : 8
  const spc = rng ? rng.int(16) : 8
  return { hp: deriveHpGene(atk, def, spe, spc), atk, def, spa: spc, spd: spc, spe }
}

/** Full §1.3 recompute from explicit species data (registry-free; hp = MAX hp). */
export function statsFor(species: Species, k: Pick<Kindra, 'level' | 'genes' | 'statExp'>): Stats {
  const b = species.base
  const g = k.genes
  const se = k.statExp
  const L = k.level
  return {
    hp: maxHpFrom(b.hp, g.hp, se.hp, L),
    atk: statFrom(b.atk, g.atk, se.atk, L),
    def: statFrom(b.def, g.def, se.def, L),
    spa: statFrom(b.spa, g.spa, se.spa, L),
    spd: statFrom(b.spd, g.spd, se.spd, L),
    spe: statFrom(b.spe, g.spe, se.spe, L),
  }
}

/** Full derived stats (hp = MAX hp) from species/level/genes/statExp. */
export function statsOf(k: Kindra): Stats {
  return statsFor(speciesOf(k.species), k)
}

export function maxHpOf(k: Kindra): number {
  return statsOf(k).hp
}

/** Total experience required to BE a level on a growth curve (§9.2; level 1-100). */
export function expForLevel(level: number, curve: GrowthCurve): number {
  const cube = level * level * level
  switch (curve) {
    case 'fast':
      return Math.floor((4 * cube) / 5)
    case 'mediumFast':
      return cube
    case 'mediumSlow':
      // max(0, ...) clamps the L1 negative (the Gen-2 underflow glitch is not replicated)
      return Math.max(0, Math.floor((6 * cube) / 5) - 15 * level * level + 100 * level - 140)
    case 'slow':
      return Math.floor((5 * cube) / 4)
  }
}

// ── Bond (the Gen-2 happiness tradition, MECHANICS §13) ─────────────────────

/** Where every friendship begins. */
export const BOND_BASE = 70
/** Where friendship tops out; bondEvent clamps to [0, BOND_MAX]. */
export const BOND_MAX = 255
/** The threshold 'bond' rules in the data tables use (Gen 2's exact number). */
export const BOND_EVOLVE_MIN = 220

/** The moments that move friendship. The accrual hooks live with the scenes that own them. */
export type BondEventKind = 'levelUp' | 'heal' | 'steps' | 'gymWin' | 'faint'

/**
 * The banded gain table: the big moments pay less as bond grows
 * (<100 / <200 / else), the small kindnesses always pay 1, and fainting
 * always stings for 1. Pure — bondEvent applies it.
 */
export function bondDelta(bond: number, kind: BondEventKind): number {
  switch (kind) {
    case 'levelUp':
    case 'gymWin':
      return bond < 100 ? 5 : bond < 200 ? 3 : 2
    case 'heal':
    case 'steps':
      return 1
    case 'faint':
      return -1
  }
}

/** Apply one bond event to a Kindra, clamped to [0, BOND_MAX]. */
export function bondEvent(k: Kindra, kind: BondEventKind): void {
  k.bond = Math.max(0, Math.min(BOND_MAX, k.bond + bondDelta(k.bond, kind)))
}

// ── Evolution resolution (MECHANICS §13) ────────────────────────────────────

/** What just happened, evolution-wise: a level-up (with the clock and the bond), a stone, or the LINK CORD. */
export type EvoTrigger =
  | { kind: 'level'; level: number; period: DayPeriod; bond: number }
  | { kind: 'stone'; item: string }
  | { kind: 'link' }

/**
 * Resolve an ordered rule list against a trigger: the FIRST matching
 * rule wins (§13), which is how a night rule placed before a plain rule
 * takes the night and yields the day. Level triggers answer both
 * 'level' and 'bond' rules — bond evolutions fire only at level-up,
 * Gen-2 semantics — each gated by its optional period. Registry-free,
 * so tests drive it with inline rule lists.
 */
export function matchEvolution(
  rules: readonly EvolutionRule[] | undefined,
  t: EvoTrigger,
): string | null {
  for (const r of rules ?? []) {
    switch (r.kind) {
      case 'level':
        if (t.kind === 'level' && t.level >= r.level && (!r.period || r.period === t.period)) return r.into
        break
      case 'bond':
        if (t.kind === 'level' && t.bond >= r.min && (!r.period || r.period === t.period)) return r.into
        break
      case 'stone':
        if (t.kind === 'stone' && t.item === r.item) return r.into
        break
      case 'link':
        if (t.kind === 'link') return r.into
        break
    }
  }
  return null
}

/** ROSTER convention: a fresh Kindra knows the last up-to-4 learnset moves at or below its level. */
export function movesetAt(learnset: readonly LearnsetEntry[], level: number): string[] {
  const eligible: string[] = []
  for (const entry of [...learnset].sort((a, b) => a.level - b.level)) {
    if (entry.level <= level && !eligible.includes(entry.move)) eligible.push(entry.move)
  }
  return eligible.slice(-4)
}

/**
 * Create a Kindra at a level: genes rolled from rng (or flat 8s
 * without), learnset-derived moves, bond at the baseline, and an
 * optional held item (wild rolls, trainer `held` fields).
 */
export function makeKindra(
  speciesKey: string,
  level: number,
  opts?: { rng?: Rng; moves?: string[]; held?: string },
): Kindra {
  const species = speciesOf(speciesKey)
  const lv = Math.min(100, Math.max(1, Math.floor(level)))
  const moveKeys = (opts?.moves ?? movesetAt(species.learnset, lv)).slice(0, 4)
  const moves: MoveSlot[] = moveKeys.map((key) => {
    const pp = moveOf(key).pp
    return { move: key, pp, ppMax: pp }
  })
  const k: Kindra = {
    species: speciesKey,
    level: lv,
    exp: expForLevel(lv, species.growth),
    genes: rollGenes(opts?.rng),
    statExp: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    hp: 0,
    status: null,
    moves,
    bond: BOND_BASE,
  }
  if (opts?.held !== undefined) k.heldItem = opts.held
  k.hp = statsFor(species, k).hp
  return k
}

/** Haven treatment: full HP, status cleared, every move's PP refilled. */
export function healAll(k: Kindra): void {
  k.hp = maxHpOf(k)
  k.status = null
  for (const slot of k.moves) slot.pp = slot.ppMax
}

// ── Eggs & breeding (the Dawnfern nursery, MECHANICS §15) ───────────────────

/** A hatchling's first level — Gen 2's exact number. */
export const HATCH_LEVEL = 5
/** Where a hatchling's friendship begins (Gen 2's 120: a newborn trusts you more than a stranger's 70). */
export const BOND_HATCH = 120
/** Lay chance in 100 per 256-step wrap, by compatibility band — Gen 2's top two bands. */
export const EGG_CHANCE = { species: 70, group: 50 } as const
/** The step-cycle granularity eggs count in; shared with the bond cadence. */
export const EGG_CYCLE = 256

/** Present `egg` field = this Kindra IS an egg: veiled in UI, barred from battle. */
export function isEgg(k: Kindra): boolean {
  return k.egg !== undefined
}

/** Can act in battle and in the field: standing AND already born. */
export function able(k: Kindra): boolean {
  return k.hp > 0 && !isEgg(k)
}

/** True iff the party holds at least one able (non-egg, standing) member. */
export function partyAble(s: Pick<SaveData, 'party'>): boolean {
  return s.party.some(able)
}

/** The species' breeding group; null = does not breed (AMBERSTAG). */
export function eggGroupOf(speciesKey: string): EggGroup | null {
  return EGG_GROUPS[speciesKey] ?? null
}

/**
 * The keeper-couple's verdict on a boarded pair: 'species' (70 in 100
 * per wrap), 'group' (50 in 100), or null — never. Eggs and groupless
 * species never pair; same species implies same group, so the bands are
 * strictly ordered.
 */
export function compatibility(a: Kindra, b: Kindra): 'species' | 'group' | null {
  if (isEgg(a) || isEgg(b)) return null
  const ga = eggGroupOf(a.species)
  const gb = eggGroupOf(b.species)
  if (ga === null || gb === null || ga !== gb) return null
  return a.species === b.species ? 'species' : 'group'
}

/**
 * Root of the evolution family, found by reverse-walking the registry's
 * EvolutionRule lists (DUSKMOTH → SPOOLEN → THREDLE). Cycle-safe: a
 * malformed loop terminates at the first revisited species. The egg of
 * any line hatches this form.
 */
export function baseForm(speciesKey: string, registry: Record<string, Species> = SPECIES): string {
  const seen = new Set<string>([speciesKey])
  let cur = speciesKey
  for (;;) {
    const parent = Object.values(registry).find((sp) => sp.evolution?.some((r) => r.into === cur))
    if (!parent || seen.has(parent.key)) return cur
    seen.add(parent.key)
    cur = parent.key
  }
}

/**
 * Steps an egg takes to hatch: clamp(6, round(baseExp / 12), 12) cycles
 * of 256 — the sturdy hatch fast (1536), the rare take their time
 * (ZEPHYRIL's 3072), all inside Gen 2's ~1500-3000 window.
 */
export function eggStepsFor(baseExp: number): number {
  return Math.max(6, Math.min(12, Math.round(baseExp / 12))) * EGG_CYCLE
}

/** One inherited gene: the parents' mid-point with ±2 jitter, clamped to 0-15. One rng.int(5) draw. */
export function inheritGene(a: number, b: number, rng: Rng): number {
  return Math.max(0, Math.min(15, Math.floor((a + b) / 2) + rng.int(5) - 2))
}

/**
 * The hatchling's moveset, locked at lay: the base form's level-5
 * learnset moves, plus the egg-move-lite — the HIGHEST-learnset-level
 * move both parents currently know that sits in the baby's learnset
 * above HATCH_LEVEL and isn't already known. With four slots full it
 * replaces slot 0 (the oldest lesson yields). Pure over the learnset,
 * so tests drive it with synthetic lines.
 */
export function eggMoveset(
  learnset: readonly LearnsetEntry[],
  a: readonly MoveSlot[],
  b: readonly MoveSlot[],
): string[] {
  const moves = movesetAt(learnset, HATCH_LEVEL)
  const bKnows = new Set(b.map((s) => s.move))
  const shared = new Set(a.map((s) => s.move).filter((m) => bKnows.has(m)))
  let pick: string | null = null
  for (const entry of [...learnset].sort((x, y) => x.level - y.level)) {
    if (entry.level > HATCH_LEVEL && shared.has(entry.move) && !moves.includes(entry.move)) {
      pick = entry.move // ascending walk: the last qualifier is the highest-level one
    }
  }
  if (pick !== null) {
    if (moves.length >= 4) moves[0] = pick
    else moves.push(pick)
  }
  return moves
}

/**
 * Lay an egg: a Kindra of the keeper's base form with everything locked
 * now, Gen-2 style — genes drawn in rollGenes order (ATK, DEF, SPE, SPC;
 * one rng.int(5) each via inheritGene; the parents' single special gene
 * is read from `genes.spa`, which equals `spd` by construction; HP
 * derived), the eggMoveset, full HP, baseline bond, no held item, and
 * `egg` set to eggStepsFor(the baby's baseExp). Hatching is one field
 * deletion away (hatch()).
 */
export function makeEgg(keeper: Kindra, partner: Kindra, rng: Rng): Kindra {
  const species = speciesOf(baseForm(keeper.species))
  const atk = inheritGene(keeper.genes.atk, partner.genes.atk, rng)
  const def = inheritGene(keeper.genes.def, partner.genes.def, rng)
  const spe = inheritGene(keeper.genes.spe, partner.genes.spe, rng)
  const spc = inheritGene(keeper.genes.spa, partner.genes.spa, rng)
  const moves: MoveSlot[] = eggMoveset(species.learnset, keeper.moves, partner.moves).map((key) => {
    const pp = moveOf(key).pp
    return { move: key, pp, ppMax: pp }
  })
  const k: Kindra = {
    species: species.key,
    level: HATCH_LEVEL,
    exp: expForLevel(HATCH_LEVEL, species.growth),
    genes: { hp: deriveHpGene(atk, def, spe, spc), atk, def, spa: spc, spd: spc, spe },
    statExp: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    hp: 0,
    status: null,
    moves,
    bond: BOND_BASE,
    egg: eggStepsFor(species.baseExp),
  }
  k.hp = statsFor(species, k).hp
  return k
}

/**
 * The birth itself: the egg field goes, HP fills, and bond starts at
 * BOND_HATCH — a hatchling already trusts you. Everything else (species,
 * level, exp, genes, moves) was locked at lay. The caller owns the
 * ceremony and the Kindex entry (scenes/hatch.ts).
 */
export function hatch(k: Kindra): void {
  delete k.egg
  k.hp = maxHpOf(k)
  k.bond = BOND_HATCH
}
