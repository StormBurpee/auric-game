/**
 * The data registry: species, moves, items, trainers, and the type
 * chart, transcribed from docs/ROSTER.md and docs/MECHANICS.md. The
 * tables live in their own modules (species.ts, moves.ts, items.ts,
 * trainers.ts, typechart.ts); this index wires them together and owns
 * the lookups every other module leans on.
 */
import type { ElemType, Item, Move, Species, TrainerDef } from '../types'
import { ITEMS } from './items'
import { MOVES } from './moves'
import { SPECIES } from './species'
import { TRAINERS } from './trainers'
import { TYPE_CHART } from './typechart'

export { ITEMS, MOVES, SPECIES, TRAINERS, TYPE_CHART }

/** Gen-2 law: the TYPE decides whether a move is physical or special. */
export const PHYSICAL_TYPES: ReadonlySet<ElemType> = new Set([
  'normal', 'fighting', 'flying', 'ground', 'rock', 'bug', 'ghost', 'poison', 'steel',
])

export function speciesOf(key: string): Species {
  const s = SPECIES[key]
  if (!s) throw new Error(`unknown species '${key}'`)
  return s
}

export function moveOf(key: string): Move {
  const m = MOVES[key]
  if (!m) throw new Error(`unknown move '${key}'`)
  return m
}

export function itemOf(key: string): Item {
  const i = ITEMS[key]
  if (!i) throw new Error(`unknown item '${key}'`)
  return i
}

export function trainerOf(key: string): TrainerDef {
  const t = TRAINERS[key]
  if (!t) throw new Error(`unknown trainer '${key}'`)
  return t
}

export function effectiveness(attack: ElemType, def1: ElemType, def2?: ElemType): number {
  const vs = (d: ElemType) => TYPE_CHART[attack]?.[d] ?? 1
  return vs(def1) * (def2 ? vs(def2) : 1)
}

export function isPhysical(type: ElemType): boolean {
  return PHYSICAL_TYPES.has(type)
}
