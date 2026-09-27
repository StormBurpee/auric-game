/**
 * The Charm Gear's brain: contacts, rematch ladders, phone lines, and
 * the journal's quests — all PURE projections of save state the world
 * already writes. Nothing in
 * this module mutates a save: registration sets `contact_<key>` (the
 * overworld), a call sets `challenge_<key>` (the phone flow), a rematch
 * win sets `beat_<key>_R<n>` (the ordinary trainer-battle pipeline) —
 * and everything here is derived from those flags, so old saves
 * back-fill for free.
 */
import type { DayPeriod } from '../../engine'
import { flag } from '../state'
import type { DayOfWeek, SaveData, TrainerDef } from '../types'
import { TRAINERS } from './trainers'

// ── The phone book ──────────────────────────────────────────────────────────

/** One row of the PHONE tab. MOM and LARCH are flavor contacts (no trainer). */
export interface ContactRow {
  /** 'MOM' | 'LARCH' | trainer key ('SCOUT_BEN'). */
  key: string
  /** Row name, ≤10 UPPERCASE. */
  name: string
  /** Where they stand, ≤8 — the row's right column. */
  place: string
  /** Present on rematch contacts; flavor contacts omit it. */
  trainer?: TrainerDef
}

/** When a call happens — the scheduling seam the weekly architect extends. */
export interface CallCtx {
  period: DayPeriod
  dow: DayOfWeek
  /** Week index from clock.dayStamp(); rotates the flavor pools. */
  dayStamp: number
}

/** story.phone.* line-pool sizes for the flavor contacts; trainers keep 1. */
const FLAVOR_POOLS: Record<string, number> = { MOM: 3, LARCH: 3 }

/**
 * The contact list, derived: MOM iff `charm_gear`, LARCH iff
 * `starter_chosen`, and every registered trainer (`contact_<key>`)
 * whose def carries a TrainerContact, in registry order.
 */
export function contactList(
  s: SaveData,
  registry: Record<string, TrainerDef> = TRAINERS,
): ContactRow[] {
  const rows: ContactRow[] = []
  if (flag(s, 'charm_gear')) rows.push({ key: 'MOM', name: 'MOM', place: 'HOME' })
  if (flag(s, 'starter_chosen')) rows.push({ key: 'LARCH', name: 'LARCH', place: 'LAB' })
  for (const t of Object.values(registry)) {
    if (t.contact && flag(s, 'contact_' + t.key)) {
      rows.push({ key: t.key, name: t.contact.name, place: t.contact.place, trainer: t })
    }
  }
  return rows
}

/** strings.ts prefix for a contact's lines: 'story.phone.ben' and friends. */
export function phonePrefix(row: ContactRow): string {
  return 'story.phone.' + row.name.toLowerCase()
}

/**
 * Deterministic flavor line for a rotating pool: a different line each
 * dayStamp, save-free, with a per-prefix offset so MOM and LARCH don't
 * rotate in lockstep.
 */
export function flavorLineKey(prefix: string, poolSize: number, ctx: CallCtx): string {
  const n = Math.max(1, poolSize)
  let seed = 0
  for (const ch of prefix) seed += ch.charCodeAt(0)
  const idx = (((ctx.dayStamp + seed) % n) + n) % n
  return `${prefix}.flavor${idx + 1}`
}

// ── Rematch ladders (D5/D7/D8) ──────────────────────────────────────────────

/** Ascending rematch TrainerDef keys for a base trainer: '<key>_R1', ... */
export function rematchLadder(
  trainerKey: string,
  registry: Record<string, TrainerDef> = TRAINERS,
): string[] {
  const out: string[] = []
  for (let n = 1; registry[`${trainerKey}_R${n}`]; n++) out.push(`${trainerKey}_R${n}`)
  return out
}

/** Ladder height climbed: highest consecutive n with `beat_<key>_R<n>` set. */
export function rematchesDone(s: SaveData, trainerKey: string): number {
  let n = 0
  while (flag(s, `beat_${trainerKey}_R${n + 1}`)) n++
  return n
}

/**
 * The rematch def a call may offer right now, or null. Today the gate is
 * the ZEPHYR BADGE and a finite ladder (reconciliation #5); `ctx` is the
 * choke point real scheduling replaces later (D7).
 */
export function rematchOffer(
  s: SaveData,
  t: TrainerDef,
  _ctx: CallCtx,
  registry: Record<string, TrainerDef> = TRAINERS,
): string | null {
  if (!flag(s, 'badge_zephyr')) return null
  if (!flag(s, 'beat_' + t.key)) return null
  if (flag(s, 'challenge_' + t.key)) return null // already armed — nothing new to offer
  const next = `${t.key}_R${rematchesDone(s, t.key) + 1}`
  return registry[next] ? next : null
}

/**
 * The def an armed challenge battles when the player TALKS to the
 * trainer (battles fire on talk, never ambush — D5's named deviation),
 * or null when nothing is armed or the ladder is spent. The overworld's
 * trainer-interact path consults this.
 */
export function rematchTarget(
  s: SaveData,
  trainerKey: string,
  registry: Record<string, TrainerDef> = TRAINERS,
): string | null {
  if (!flag(s, 'challenge_' + trainerKey)) return null
  const next = `${trainerKey}_R${rematchesDone(s, trainerKey) + 1}`
  return registry[next] ? next : null
}

/** What a dialed contact says, resolved against the flag state. */
export type PhoneStatus =
  /** A rotating small-talk line (MOM/LARCH always; trainers while gated). */
  | { kind: 'flavor'; key: string }
  /** A fresh rematch on the table; YES arms `challenge_<key>`. */
  | { kind: 'offer'; key: string; defKey: string }
  /** A challenge waits on the trail — go talk to them. */
  | { kind: 'armed'; key: string; defKey: string }
  /** The ladder is climbed out; nothing left to arm. */
  | { kind: 'spent'; key: string }

/** Resolve one call. Pure — the phone flow owns the side effects. */
export function phoneStatus(
  s: SaveData,
  row: ContactRow,
  ctx: CallCtx,
  registry: Record<string, TrainerDef> = TRAINERS,
): PhoneStatus {
  const p = phonePrefix(row)
  const t = row.trainer
  if (!t) return { kind: 'flavor', key: flavorLineKey(p, FLAVOR_POOLS[row.key] ?? 1, ctx) }
  const armed = rematchTarget(s, t.key, registry)
  if (armed) return { kind: 'armed', key: `${p}.armed`, defKey: armed }
  if (flag(s, 'challenge_' + t.key)) return { kind: 'spent', key: `${p}.spent` }
  const offer = rematchOffer(s, t, ctx, registry)
  if (offer) return { kind: 'offer', key: `${p}.offer`, defKey: offer }
  const ladder = rematchLadder(t.key, registry)
  if (ladder.length > 0 && rematchesDone(s, t.key) >= ladder.length) {
    return { kind: 'spent', key: `${p}.spent` }
  }
  return { kind: 'flavor', key: `${p}.flavor1` }
}

// ── The journal (D6) ────────────────────────────────────────────────────────

/** A condition over state the world already writes — quests never mutate. */
export type QuestCond =
  | { kind: 'flag'; flag: string }
  | { kind: 'allFlags'; flags: readonly string[] }
  /** Count of set flags with this prefix ('contact_', 'item_trail'). */
  | { kind: 'flagCount'; prefix: string; min: number }
  | { kind: 'caught'; min: number }
  /** Count of rematch wins across every ladder (`beat_*_R<n>` flags). */
  | { kind: 'rematches'; min: number }

export interface QuestStageDef {
  /** strings key ('story.quest.<id>.<n>') shown on the detail page. */
  desc: string
  done: QuestCond
}

export interface QuestDef {
  id: string
  /** UPPERCASE, ≤16 chars — one journal row. */
  title: string
  /** Hidden until met; quests surface as the world reaches them. */
  unlock: QuestCond
  /** Ordered; current stage = first whose `done` is unmet. */
  stages: readonly QuestStageDef[]
  /** strings key ('story.quest.<id>.done') shown once every stage is done. */
  epilogue: string
}

const REMATCH_WIN = /^beat_.+_R\d+$/

/** Evaluate one condition against a save. */
export function condMet(s: SaveData, c: QuestCond): boolean {
  switch (c.kind) {
    case 'flag':
      return flag(s, c.flag)
    case 'allFlags':
      return c.flags.every((f) => flag(s, f))
    case 'flagCount':
      return countFlags(s, (k) => k.startsWith(c.prefix)) >= c.min
    case 'caught':
      return s.caught.length >= c.min
    case 'rematches':
      return countFlags(s, (k) => REMATCH_WIN.test(k)) >= c.min
  }
}

function countFlags(s: SaveData, match: (key: string) => boolean): number {
  let n = 0
  for (const k of Object.keys(s.flags)) {
    if (s.flags[k] === true && match(k)) n++
  }
  return n
}

export interface QuestView {
  visible: boolean
  /** Index of the first unmet stage; equals stages.length when complete. */
  stage: number
  complete: boolean
}

/** Project a quest from the flags — recomputed on open, back-fills old saves. */
export function questView(s: SaveData, q: QuestDef): QuestView {
  const visible = condMet(s, q.unlock)
  let stage = 0
  while (stage < q.stages.length && condMet(s, q.stages[stage]!.done)) stage++
  return { visible, stage, complete: stage >= q.stages.length }
}

export interface JournalRow {
  quest: QuestDef
  view: QuestView
}

/** Visible quests in journal order: actives first, completes sink (stable). */
export function journalRows(s: SaveData): JournalRow[] {
  const rows = QUESTS.map((quest) => ({ quest, view: questView(s, quest) })).filter(
    (r) => r.view.visible,
  )
  return [...rows.filter((r) => !r.view.complete), ...rows.filter((r) => r.view.complete)]
}

const F = (name: string): QuestCond => ({ kind: 'flag', flag: name })

const Q = (id: string, title: string, unlock: QuestCond, stages: QuestCond[]): QuestDef => ({
  id,
  title,
  unlock,
  stages: stages.map((done, i) => ({ desc: `story.quest.${id}.${i + 1}`, done })),
  epilogue: `story.quest.${id}.done`,
})

/**
 * The eight quests of the slice, built only on writer-verified flags
 * (D6's inventory): mom_sendoff, starter_chosen, kindex_given,
 * rival1_done, badge_zephyr, beat_<trainer>, item_<id>, the caught
 * array — plus the Gear's own contact_/challenge_/beat_*_R* family.
 */
export const QUESTS: readonly QuestDef[] = [
  // Larch's errand: the spine of the opening act.
  Q('fieldnotes', 'THE FIELD NOTES', F('mom_sendoff'), [F('starter_chosen'), F('kindex_given')]),
  // The watcher at the lab window gets a name, then a beating.
  Q('coldeyes', 'COLD EYES', F('starter_chosen'), [F('rival1_done')]),
  // Rowan points west: the gym trainees, then the Wind Warden.
  Q('zephyr', 'THE ZEPHYR TRIAL', F('kindex_given'), [
    { kind: 'allFlags', flags: ['beat_GLIDER_FERN', 'beat_GLIDER_JUNO'] },
    F('badge_zephyr'),
  ]),
  Q('trail2', 'CLEARING TRAIL 2', F('kindex_given'), [
    {
      kind: 'allFlags',
      flags: ['beat_SCOUT_BEN', 'beat_FORAGER_MAE', 'beat_BELLRINGER_OTTO', 'beat_HERBALIST_IVY'],
    },
  ]),
  // Rowan's book of bonds, filled the slow way.
  Q('bonds', 'BOOK OF BONDS', F('kindex_given'), [
    { kind: 'caught', min: 3 },
    { kind: 'caught', min: 6 },
    { kind: 'caught', min: 10 },
  ]),
  // The six item_trail* finds across Trails 1 and 2.
  Q('treasures', 'TRAIL TREASURES', F('starter_chosen'), [
    { kind: 'flagCount', prefix: 'item_trail', min: 3 },
    { kind: 'flagCount', prefix: 'item_trail', min: 6 },
  ]),
  // Fill the phone book.
  Q('fullgear', 'A FULL GEAR', F('charm_gear'), [
    { kind: 'flagCount', prefix: 'contact_', min: 1 },
    { kind: 'flagCount', prefix: 'contact_', min: 4 },
  ]),
  // Climb every ladder the phone book offers.
  Q('oldfriends', 'OLD FRIENDS', { kind: 'flagCount', prefix: 'contact_', min: 1 }, [
    { kind: 'rematches', min: 1 },
    { kind: 'rematches', min: 4 },
  ]),
]
