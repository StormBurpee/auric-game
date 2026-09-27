/**
 * The Dawnfern nursery — the keeper couple's scripts and the egg-laying
 * heartbeat (docs/MECHANICS.md §15, STORY.md's quiet corner).
 *
 * The old woman keeps the desk: BOARD (two at most; the FIRST boarded
 * is the keeper — the egg takes its line), RETRIEVE (boarders come back
 * exactly as they left: no levels, no overwritten moves — Gen 2's
 * daycare trap is a trap, not a feature), LEAVE. Boarding is free; the
 * walk to Dawnfern is the price. The old man steps outside (NpcDef
 * showFlag) when an egg waits, and hands it over if the party has room.
 *
 * The laying itself rides the overworld's 256-step wrap: overworld.ts
 * calls nurseryStepWrap(game) beside the bond tick. The rng is touched
 * ONLY while a full, compatible pair waits eggless — saves that never
 * board anyone replay identically (seed discipline).
 *
 */
import type { Rng, Task } from '../../../engine'
import type { Game } from '../../game'
import { able, compatibility, EGG_CHANCE, isEgg, makeEgg } from '../../kindra'
import type { GameScript, ScriptCtx } from '../../script/dsl'
import { PARTY_LIMIT, setFlag, flag } from '../../state'
import type { SaveData } from '../../types'
import { eggTellKey, kindraName } from '../../ui/format'
import { openPartyScreen } from '../../ui/widgets'

/** The save flag the old man's showFlag watches: set when an egg is laid, cleared on claim. */
export const NURSERY_EGG_FLAG = 'nursery_egg'
/** Boarders the couple can mind at once. */
export const NURSERY_LIMIT = 2

/** The nursery's books, opened on first visit (older saves carry null). */
function nurseryOf(s: SaveData): NonNullable<SaveData['nursery']> {
  if (!s.nursery) s.nursery = { parents: [], egg: null }
  return s.nursery
}

/**
 * One 256-step wrap at the nursery: a full pair, no egg waiting, a live
 * band → one rng.int(100) against EGG_CHANCE (species 70 / group 50);
 * on success the egg is laid — genes and moves locked NOW (makeEgg) —
 * and the old man steps outside. Draws from the rng only when a roll is
 * live. @returns true if an egg was laid.
 */
export function nurseryWrap(s: SaveData, rng: Rng): boolean {
  const n = s.nursery
  if (!n || n.egg !== null || n.parents.length < NURSERY_LIMIT) return false
  const keeper = n.parents[0]!
  const partner = n.parents[1]!
  const band = compatibility(keeper, partner)
  if (band === null) return false
  if (rng.int(100) >= EGG_CHANCE[band]) return false
  n.egg = makeEgg(keeper, partner, rng)
  setFlag(s, NURSERY_EGG_FLAG)
  return true
}

/** The overworld's per-wrap hook — one call beside the bond tick (overworld.ts owns the call site). */
export function nurseryStepWrap(game: Game): void {
  nurseryWrap(game.state, game.rng)
}

/** BOARD: hand one adult over the desk. The party must keep an able member, and eggs don't board. */
function* boardFlow(c: ScriptCtx, n: NonNullable<SaveData['nursery']>): Task<void> {
  const s = c.game.state
  if (n.parents.length >= NURSERY_LIMIT) {
    yield* c.say('story.nursery.board.full')
    return
  }
  if (s.party.length <= 1) {
    yield* c.say('story.nursery.board.last')
    return
  }
  const idx = yield* openPartyScreen(c.game, 'select', {
    // Adults only, and whoever stays must include someone able —
    // the desk never strands a party of shells and the fainted.
    canPick: (k, i) => !isEgg(k) && s.party.some((m, j) => j !== i && able(m)),
    footer: 'WHO WILL BOARD?',
  })
  if (idx < 0) return
  const [k] = s.party.splice(idx, 1)
  if (!k) return
  n.parents.push(k)
  // The first boarded minds the clutch — the keeper-line rule, said out loud.
  yield* c.say(
    n.parents.length === 1 ? 'story.nursery.board.keeper' : 'story.nursery.board.took',
    { KINDRA: kindraName(k) },
  )
  if (n.parents.length === NURSERY_LIMIT) yield* sayBand(c, n)
}

/** The keeper's verdict on a full pair — the Gen-2 checker-man, minus the riddle. */
function* sayBand(c: ScriptCtx, n: NonNullable<SaveData['nursery']>): Task<void> {
  const band = compatibility(n.parents[0]!, n.parents[1]!)
  yield* c.say(
    band === 'species' ? 'story.nursery.band.species'
    : band === 'group' ? 'story.nursery.band.group'
    : 'story.nursery.band.none',
  )
}

/** RETRIEVE: name a boarder, take them back untouched (D7 — no daycare leveling, no fee). */
function* retrieveFlow(c: ScriptCtx, n: NonNullable<SaveData['nursery']>): Task<void> {
  const s = c.game.state
  if (n.parents.length === 0) {
    yield* c.say('story.nursery.retrieve.none')
    return
  }
  const options = [...n.parents.map((k) => kindraName(k)), 'CANCEL']
  const pick = yield* c.ask(null, options, { cancelIndex: options.length - 1 })
  if (pick < 0 || pick >= n.parents.length) return
  if (s.party.length >= PARTY_LIMIT) {
    yield* c.say('story.nursery.retrieve.full')
    return
  }
  const [k] = n.parents.splice(pick, 1)
  if (!k) return
  s.party.push(k)
  yield* c.say('story.nursery.back', { KINDRA: kindraName(k) })
}

/**
 * The old woman at the counter: greeting (plus the band when a pair is
 * already boarded, an egg hint when one waits outside, or a carried
 * egg's tell — the four bands by remaining steps), then the desk loop.
 */
export const nurseryKeeper: GameScript = function* (c) {
  const s = c.game.state
  const n = nurseryOf(s)
  yield* c.say('story.nursery.keeper.1')
  if (flag(s, NURSERY_EGG_FLAG)) {
    yield* c.say('story.nursery.egg.hint')
  } else if (n.parents.length === NURSERY_LIMIT) {
    yield* sayBand(c, n)
  } else {
    const carried = s.party.find(isEgg)
    if (carried) yield* c.say(eggTellKey(carried))
  }
  for (;;) {
    const pick = yield* c.ask('story.nursery.keeper.what', ['BOARD', 'RETRIEVE', 'LEAVE'], { cancelIndex: 2 })
    if (pick === 0) yield* boardFlow(c, n)
    else if (pick === 1) yield* retrieveFlow(c, n)
    else break
  }
  yield* c.say('story.nursery.bye')
}

/**
 * The old man outside (showFlag: NURSERY_EGG_FLAG): he was minding it
 * for you. Claiming needs a party slot — the Archive is one menu away —
 * and pointedly does NOT pass addKindra: an unhatched species must not
 * touch the Kindex (the hatch ceremony marks it caught).
 */
export const nurseryEggMan: GameScript = function* (c) {
  const s = c.game.state
  const egg = s.nursery?.egg ?? null
  if (!egg) {
    // Unreachable while showFlag gates him; kept honest anyway.
    yield* c.say('story.nursery.man.idle')
    return
  }
  yield* c.say('story.nursery.man.1')
  if (s.party.length >= PARTY_LIMIT) {
    yield* c.say('sys.egg.full')
    return
  }
  s.party.push(egg)
  s.nursery!.egg = null
  setFlag(s, NURSERY_EGG_FLAG, false)
  c.sfx('levelup')
  yield* c.say('sys.egg.got')
}
