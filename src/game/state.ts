/**
 * Small, honest mutations of the save-shaped world state: the bag, the
 * Kindex, the party. Anything that changes `SaveData` lives here or in
 * the battle/kindra modules — scenes don't poke fields directly.
 */
import { able, healAll, isEgg } from './kindra'
import type { Kindra, SaveData } from './types'

export const PARTY_LIMIT = 6

export function newSave(playerName: string): SaveData {
  return {
    playerName,
    party: [],
    archive: [],
    bag: {},
    glints: 1500,
    badges: [],
    flags: {},
    pos: { map: 'player_home', x: 4, y: 4, facing: 'down' },
    seen: [],
    caught: [],
    playSeconds: 0,
    starter: null,
    lastHaven: null,
    stepTicker: 0,
    nursery: null,
  }
}

/**
 * Save envelope migrations, chained: v1 added bond + stepTicker (Tier 1),
 * v2 added the nursery (Tier 2). Old companions wake at the friendship
 * baseline; old saves find the nursery empty, as it always was.
 */
export function migrateSave(old: unknown, fromVersion: number): SaveData | null {
  if (fromVersion < 1 || fromVersion > 2 || typeof old !== 'object' || old === null) return null
  const s = old as SaveData
  if (fromVersion <= 1) {
    for (const k of [...s.party, ...s.archive]) {
      if (typeof k.bond !== 'number') k.bond = 70
    }
    if (typeof s.stepTicker !== 'number') s.stepTicker = 0
  }
  if (s.nursery === undefined) s.nursery = null
  return s
}

export function bagCount(s: SaveData, item: string): number {
  return s.bag[item] ?? 0
}

export function bagAdd(s: SaveData, item: string, qty: number): void {
  s.bag[item] = (s.bag[item] ?? 0) + qty
}

/** @returns false if there weren't enough to remove. */
export function bagRemove(s: SaveData, item: string, qty: number): boolean {
  const have = s.bag[item] ?? 0
  if (have < qty) return false
  if (have === qty) delete s.bag[item]
  else s.bag[item] = have - qty
  return true
}

export function markSeen(s: SaveData, species: string): void {
  if (!s.seen.includes(species)) s.seen.push(species)
}

export function markCaught(s: SaveData, species: string): void {
  markSeen(s, species)
  if (!s.caught.includes(species)) s.caught.push(species)
}

/** Add to the party, overflowing into Larch's Archive. @returns where it went. */
export function addKindra(s: SaveData, k: Kindra): 'party' | 'archive' {
  markCaught(s, k.species)
  if (s.party.length < PARTY_LIMIT) {
    s.party.push(k)
    return 'party'
  }
  s.archive.push(k)
  return 'archive'
}

// ── Larch's Archive (Tier 1) ────────────────────────────────────────────────
// One flat, caught-ordered collection. Deposit appends and swap replaces in
// place, so array order IS catch order — the Archive screen's 'CAUGHT' sort.
// Everything that leaves the shelf is rested on the way out (healAll): Lily's
// free heal is one menu over, and an all-fainted-party trap helps no one.

/** True iff party[i] exists and removing it leaves a standing, non-egg member. */
export function canDeposit(s: SaveData, i: number): boolean {
  return Number.isInteger(i) && i >= 0 && i < s.party.length && s.party.some((k, j) => j !== i && able(k))
}

/** party[i] → end of archive (caught-order append). @returns false when canDeposit refuses. */
export function depositToArchive(s: SaveData, i: number): boolean {
  if (!canDeposit(s, i)) return false
  const [k] = s.party.splice(i, 1)
  if (!k) return false
  s.archive.push(k)
  return true
}

/** archive[a] → party, rested (healAll). @returns false when the party is at PARTY_LIMIT. */
export function withdrawFromArchive(s: SaveData, a: number): boolean {
  if (s.party.length >= PARTY_LIMIT) return false
  const [k] = s.archive.splice(a, 1)
  if (!k) return false
  healAll(k)
  s.party.push(k)
  return true
}

/**
 * party[i] ↔ archive[a] in one move; the incomer is rested. An egg may
 * enter only if another party member can battle. The archive index is
 * preserved — caught order stays honest.
 */
export function swapWithArchive(s: SaveData, i: number, a: number): void {
  const out = s.party[i]
  const incomer = s.archive[a]
  if (!out || !incomer) return
  if (isEgg(incomer) && !s.party.some((k, j) => j !== i && able(k))) return
  healAll(incomer)
  s.party[i] = incomer
  s.archive[a] = out
}

/** Remove archive[a] forever. @returns the released Kindra (for the farewell line). */
export function releaseFromArchive(s: SaveData, a: number): Kindra {
  const [k] = s.archive.splice(a, 1)
  if (!k) throw new Error(`releaseFromArchive: no archive entry at index ${a}`)
  return k
}

export function flag(s: SaveData, key: string): boolean {
  return s.flags[key] === true
}

export function setFlag(s: SaveData, key: string, value = true): void {
  if (value) s.flags[key] = true
  else delete s.flags[key]
}
