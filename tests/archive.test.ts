/**
 * Larch's Archive, driven headless: the state helpers' guards and
 * heal-on-exit rule, the split-screen scene's flows (deposit through
 * the vetoing party picker, withdraw/swap/summary, the double-confirm
 * release), the SELECT sort cycle as a pure view permutation, and the
 * long-shelf navigation cadence (auto-repeat traverse, wrap, ±7 page
 * jumps). Same harness as ui.test.ts: a real Input/Scheduler/SceneStack
 * in a stub Game, ticked in main.ts order; draw() is never called.
 */
import { describe, expect, it } from 'vitest'
import { Input, Rng, SaveSlot, SceneStack, Scheduler } from '../src/engine'
import type { Apu, Button, FrameBuffer, Sequencer } from '../src/engine'
import type { Game } from '../src/game/game'
import type { Kindra, SaveData } from '../src/game/types'
import { makeEgg, makeKindra, maxHpOf } from '../src/game/kindra'
import {
  canDeposit, depositToArchive, markCaught, newSave, PARTY_LIMIT, releaseFromArchive,
  swapWithArchive, withdrawFromArchive,
} from '../src/game/state'
import { openArchive, sortView } from '../src/game/ui/archive'
import type { ArchiveSort } from '../src/game/ui/archive'

function makeGame(): Game {
  const game: Game = {
    fb: null as unknown as FrameBuffer,
    input: new Input(),
    scenes: new SceneStack(),
    tasks: new Scheduler(),
    apu: { context: null } as unknown as Apu,
    seq: null as unknown as Sequencer,
    rng: new Rng(7),
    save: new SaveSlot<SaveData>('test:archive', 1),
    state: newSave('STORM'),
    frames: 0,
    debugPeriod: null,
    debugDay: null,
    period: () => 'day' as const,
    day: () => 0 as const,
  }
  return game
}

/** One tick in main.ts order. */
function tick(game: Game): void {
  game.input.beginFrame()
  game.frames++
  game.tasks.tick()
  game.scenes.update()
}

/** Press a button for exactly one tick. */
function tap(game: Game, b: Button): void {
  game.input.setDown(b, true)
  tick(game)
  game.input.setDown(b, false)
}

/**
 * Press, then run one released tick: the follow-up tick lets the woken
 * coroutine push/pop scenes AND keeps back-to-back same-button presses
 * fresh edges (PadRepeat needs to see the release).
 */
function press(game: Game, b: Button): void {
  tap(game, b)
  tick(game)
}

/** Fill-and-advance dialog pages (however many) until the stack settles at `depthAfter`. */
function dismissText(game: Game, depthAfter: number): void {
  for (let i = 0; i < 8 && game.scenes.depth !== depthAfter; i++) {
    press(game, 'b') // fill
    press(game, 'a') // advance or pop
  }
  expect(game.scenes.depth).toBe(depthAfter)
}

/** Spawn the archive over a seeded save; one tick so the scene is up. */
function openSeeded(game: Game, party: Kindra[], archive: Kindra[]) {
  game.state.party = party
  game.state.archive = archive
  const handle = game.tasks.spawn(openArchive(game))
  tick(game)
  return handle
}

/** The live scene, structurally typed — tests peek at cursor/sort/view. */
function topScene(game: Game): { cursor: number; sort: ArchiveSort; view: number[] } {
  return game.scenes.top as unknown as { cursor: number; sort: ArchiveSort; view: number[] }
}

// ── State helpers ───────────────────────────────────────────────────────────

describe('archive state helpers', () => {
  it('eggs do not make it safe to deposit the last battle-ready member', () => {
    const s = newSave('STORM')
    const adult = makeKindra('VERDIL', 5)
    const egg = makeEgg(makeKindra('RILLET', 20), makeKindra('RILLET', 20), new Rng(9))
    s.party = [adult, egg]

    expect(canDeposit(s, 0)).toBe(false)
    expect(depositToArchive(s, 0)).toBe(false)
    expect(s.party).toEqual([adult, egg])
    expect(s.archive).toEqual([])
    expect(depositToArchive(s, 1)).toBe(true)
    expect(s.party).toEqual([adult])
    expect(s.archive).toEqual([egg])
  })

  it('rejects invalid deposit indices without splicing a different party member', () => {
    const s = newSave('STORM')
    const party = [makeKindra('VERDIL', 5), makeKindra('RILLET', 5)]
    s.party = [...party]

    for (const index of [-1, 0.5, 2, Number.NaN]) {
      expect(canDeposit(s, index)).toBe(false)
      expect(depositToArchive(s, index)).toBe(false)
    }
    expect(s.party).toEqual(party)
    expect(s.archive).toEqual([])
  })

  it('refuses to swap the only battle-ready adult for an archived egg', () => {
    const s = newSave('STORM')
    const adult = makeKindra('VERDIL', 5)
    const fainted = makeKindra('EMBERIT', 5)
    fainted.hp = 0
    const egg = makeEgg(makeKindra('RILLET', 20), makeKindra('RILLET', 20), new Rng(9))
    s.party = [adult, fainted]
    s.archive = [egg]

    swapWithArchive(s, 0, 0)
    expect(s.party).toEqual([adult, fainted])
    expect(s.archive).toEqual([egg])

    swapWithArchive(s, 1, 0)
    expect(s.party).toEqual([adult, egg])
    expect(s.archive).toEqual([fainted])
  })

  it('canDeposit/deposit refuse to strip the last able member', () => {
    const s = newSave('STORM')
    const solo = makeKindra('VERDIL', 5)
    s.party = [solo]
    expect(canDeposit(s, 0)).toBe(false)
    expect(depositToArchive(s, 0)).toBe(false)
    expect(s.party).toHaveLength(1)
    expect(s.archive).toHaveLength(0)
  })

  it('with one able and one fainted member, only the fainted one may go (both directions)', () => {
    const s = newSave('STORM')
    const able = makeKindra('VERDIL', 5)
    const fainted = makeKindra('EMBERIT', 5)
    fainted.hp = 0

    s.party = [able, fainted]
    expect(canDeposit(s, 0)).toBe(false)
    expect(canDeposit(s, 1)).toBe(true)

    s.party = [fainted, able]
    expect(canDeposit(s, 0)).toBe(true)
    expect(canDeposit(s, 1)).toBe(false)

    expect(depositToArchive(s, 0)).toBe(true)
    expect(s.party).toEqual([able])
    expect(s.archive).toEqual([fainted]) // deposit appends; nobody is healed on the way IN
    expect(fainted.hp).toBe(0)
  })

  it('withdraw refuses a full party and rests the returnee on the way out', () => {
    const s = newSave('STORM')
    s.party = Array.from({ length: PARTY_LIMIT }, () => makeKindra('VERDIL', 5))
    const hurt = makeKindra('RILLET', 9)
    hurt.hp = 1
    hurt.status = 'psn'
    hurt.moves[0]!.pp = 0
    s.archive = [hurt]

    expect(withdrawFromArchive(s, 0)).toBe(false)
    expect(s.archive).toHaveLength(1)

    s.party.pop()
    expect(withdrawFromArchive(s, 0)).toBe(true)
    expect(s.party).toHaveLength(PARTY_LIMIT)
    expect(s.archive).toHaveLength(0)
    expect(hurt.hp).toBe(maxHpOf(hurt))
    expect(hurt.status).toBeNull()
    expect(hurt.moves[0]!.pp).toBe(hurt.moves[0]!.ppMax)
  })

  it('swap preserves the archive index (caught order) and rests only the incomer', () => {
    const s = newSave('STORM')
    const outgoing = makeKindra('VERDIL', 5)
    outgoing.hp = 3
    s.party = [outgoing, makeKindra('EMBERIT', 5)]
    const first = makeKindra('THATCHRAT', 3)
    const incomer = makeKindra('RILLET', 8)
    incomer.hp = 0
    incomer.status = 'brn'
    s.archive = [first, incomer]

    swapWithArchive(s, 0, 1)
    expect(s.party[0]).toBe(incomer)
    expect(s.archive[0]).toBe(first) // untouched neighbours keep their shelf spots
    expect(s.archive[1]).toBe(outgoing) // the outgoing member takes the SAME index
    expect(incomer.hp).toBe(maxHpOf(incomer))
    expect(incomer.status).toBeNull()
    expect(outgoing.hp).toBe(3) // the one going IN keeps its wounds
  })

  it('release splices, returns the Kindra, and never touches the Kindex', () => {
    const s = newSave('STORM')
    const a = makeKindra('VERDIL', 5)
    const b = makeKindra('EMBERIT', 5)
    s.archive = [a, b]
    markCaught(s, 'VERDIL')
    markCaught(s, 'EMBERIT')

    expect(releaseFromArchive(s, 0)).toBe(a)
    expect(s.archive).toEqual([b])
    expect(s.caught).toContain('VERDIL')
    expect(s.seen).toContain('VERDIL')
    expect(() => releaseFromArchive(s, 5)).toThrow()
  })
})

// ── Sorting (a pure view permutation) ───────────────────────────────────────

/** Adversarial: caught order disagrees with kindex, level AND name order. */
function sortFixture(): Kindra[] {
  const rillet = makeKindra('RILLET', 12) // id 5
  const verdil = makeKindra('VERDIL', 3) // id 1
  const emberA = makeKindra('EMBERIT', 30) // id 3
  const emberB = makeKindra('EMBERIT', 7) // id 3 — kindex tie, broken by caught order
  emberB.nickname = 'AAA' // names sort by what the player SEES
  return [rillet, verdil, emberA, emberB]
}

describe('sortView', () => {
  it('caught is array order itself', () => {
    expect(sortView(sortFixture(), 'caught')).toEqual([0, 1, 2, 3])
  })

  it('kindex sorts by species id, ties by caught order', () => {
    expect(sortView(sortFixture(), 'kindex')).toEqual([1, 2, 3, 0])
  })

  it('level sorts strongest first, ties by caught order', () => {
    expect(sortView(sortFixture(), 'level')).toEqual([2, 0, 3, 1])
  })

  it('name sorts by display name — nicknames included', () => {
    expect(sortView(sortFixture(), 'name')).toEqual([3, 2, 0, 1])
  })

  it('never mutates the archive', () => {
    const archive = sortFixture()
    const before = [...archive]
    sortView(archive, 'level')
    expect(archive).toEqual(before)
  })
})

// ── Scene flows ─────────────────────────────────────────────────────────────

describe('openArchive: deposit', () => {
  it('the DEPOSIT pseudo-row opens the party picker and the deposit lands', () => {
    const game = makeGame()
    const handle = openSeeded(
      game,
      [makeKindra('VERDIL', 5), makeKindra('EMBERIT', 6)],
      [makeKindra('RILLET', 4)],
    )
    expect(game.scenes.depth).toBe(1)
    press(game, 'a') // cursor starts ON the pinned DEPOSIT row
    expect(game.scenes.depth).toBe(2) // the party picker
    press(game, 'down')
    press(game, 'a') // EMBERIT goes to rest
    dismissText(game, 1) // the settling-in line
    expect(game.state.party.map((k) => k.species)).toEqual(['VERDIL'])
    expect(game.state.archive.map((k) => k.species)).toEqual(['RILLET', 'EMBERIT'])
    press(game, 'b') // close the archive
    expect(handle.done).toBe(true)
    expect(game.scenes.depth).toBe(0)
  })

  it('the picker vetoes the last able member but allows the fainted one', () => {
    const game = makeGame()
    const able = makeKindra('VERDIL', 5)
    const fainted = makeKindra('EMBERIT', 5)
    fainted.hp = 0
    openSeeded(game, [able, fainted], [])
    press(game, 'a') // DEPOSIT
    expect(game.scenes.depth).toBe(2)
    press(game, 'a') // member 0 is the last able one: refused, picker stays
    expect(game.scenes.depth).toBe(2)
    press(game, 'down')
    press(game, 'a') // the fainted member may rest
    dismissText(game, 1)
    expect(game.state.party).toEqual([able])
    expect(game.state.archive).toEqual([fainted])
  })

  it('a one-member party is told no without a dead picker', () => {
    const game = makeGame()
    openSeeded(game, [makeKindra('VERDIL', 5)], [])
    press(game, 'a') // DEPOSIT → sys.archive.last instead of a picker
    dismissText(game, 1)
    expect(game.state.party).toHaveLength(1)
    expect(game.state.archive).toHaveLength(0)
  })

  it('an empty shelf still stands on the DEPOSIT row (the row list never empties)', () => {
    const game = makeGame()
    openSeeded(game, [makeKindra('VERDIL', 5), makeKindra('EMBERIT', 6)], [])
    press(game, 'down') // one row: wraps onto itself
    press(game, 'down')
    expect(topScene(game).cursor).toBe(0)
    press(game, 'a')
    press(game, 'down')
    press(game, 'a')
    dismissText(game, 1)
    expect(game.state.archive).toHaveLength(1)
  })
})

describe('openArchive: entry actions', () => {
  it('WITHDRAW leads the menu when the party has room; the returnee comes back rested', () => {
    const game = makeGame()
    const hurt = makeKindra('RILLET', 9)
    hurt.hp = 2
    hurt.status = 'par'
    openSeeded(game, [makeKindra('VERDIL', 5)], [hurt])
    press(game, 'down') // row 1: RILLET
    press(game, 'a') // action menu
    press(game, 'a') // WITHDRAW (first option)
    dismissText(game, 1)
    expect(game.state.party.map((k) => k.species)).toEqual(['VERDIL', 'RILLET'])
    expect(game.state.archive).toHaveLength(0)
    expect(game.state.party[1]!.hp).toBe(maxHpOf(game.state.party[1]!))
    expect(game.state.party[1]!.status).toBeNull()
  })

  it('a full party is offered SWAP first, not WITHDRAW', () => {
    const game = makeGame()
    const party = Array.from({ length: PARTY_LIMIT }, (_, i) => makeKindra('VERDIL', i + 2))
    party[0]!.hp = 5 // the one stepping out carries its wounds onto the shelf
    const archived = makeKindra('RILLET', 9)
    archived.hp = 1
    openSeeded(game, party, [archived])
    press(game, 'down')
    press(game, 'a') // action menu — first option must now be SWAP
    press(game, 'a')
    expect(game.scenes.depth).toBe(2) // the party picker, not an instant withdraw
    press(game, 'a') // swap with member 0
    dismissText(game, 1)
    expect(game.state.party).toHaveLength(PARTY_LIMIT)
    expect(game.state.archive).toHaveLength(1)
    expect(game.state.party[0]!.species).toBe('RILLET')
    expect(game.state.party[0]!.hp).toBe(maxHpOf(game.state.party[0]!)) // rested on the way out
    expect(game.state.archive[0]!.species).toBe('VERDIL')
    expect(game.state.archive[0]!.hp).toBe(5) // not healed on the way in
  })

  it('SWAP may take the last able member — the incomer keeps the party standing', () => {
    const game = makeGame()
    const solo = makeKindra('VERDIL', 5)
    openSeeded(game, [solo], [makeKindra('RILLET', 9)])
    press(game, 'down')
    press(game, 'a')
    press(game, 'down') // SWAP (second option; party has room, WITHDRAW leads)
    press(game, 'a')
    press(game, 'a') // the lone member steps out
    dismissText(game, 1)
    expect(game.state.party.map((k) => k.species)).toEqual(['RILLET'])
    expect(game.state.party[0]!.hp).toBeGreaterThan(0)
    expect(game.state.archive.map((k) => k.species)).toEqual(['VERDIL'])
  })

  it('SUMMARY browses the shelf in view order and the cursor follows', () => {
    const game = makeGame()
    openSeeded(
      game,
      [makeKindra('VERDIL', 5)],
      [makeKindra('RILLET', 4), makeKindra('THATCHRAT', 6), makeKindra('EMBERIT', 8)],
    )
    press(game, 'down') // row 1: RILLET
    press(game, 'a')
    press(game, 'down')
    press(game, 'down') // SUMMARY
    press(game, 'a')
    press(game, 'down') // leaf to the next shelf entry without leaving
    press(game, 'b') // close the summary
    expect(topScene(game).cursor).toBe(2) // the cursor followed the leafing
    expect(game.scenes.depth).toBe(1)
  })
})

describe('openArchive: release', () => {
  function seed(game: Game) {
    return openSeeded(
      game,
      [makeKindra('VERDIL', 5)],
      [makeKindra('RILLET', 4), makeKindra('THATCHRAT', 6)],
    )
  }

  /** Cursor to the LAST row, action menu, down to RELEASE, A. */
  function toRelease(game: Game): void {
    press(game, 'down')
    press(game, 'down')
    press(game, 'a')
    press(game, 'down')
    press(game, 'down')
    press(game, 'down') // WITHDRAW SWAP SUMMARY → RELEASE
    press(game, 'a') // → first confirm types out
  }

  it('a NO at either confirm aborts with nothing removed', () => {
    const game = makeGame()
    seed(game)

    toRelease(game)
    press(game, 'a') // fill confirm 1
    press(game, 'b') // NO
    expect(game.state.archive).toHaveLength(2)
    expect(game.scenes.depth).toBe(1)

    toRelease(game)
    press(game, 'a') // fill confirm 1
    press(game, 'a') // YES
    press(game, 'a') // fill confirm 2 (the one that names the Kindra)
    press(game, 'b') // NO — second thoughts are honoured too
    expect(game.state.archive).toHaveLength(2)
    expect(game.scenes.depth).toBe(1)
  })

  it('YES twice releases, says the warm goodbye, and the cursor lands on a real row', () => {
    const game = makeGame()
    seed(game)
    toRelease(game)
    press(game, 'a') // fill confirm 1
    press(game, 'a') // YES
    press(game, 'a') // fill confirm 2
    press(game, 'a') // YES, truly
    dismissText(game, 1) // the warm goodbye, both boxes
    expect(game.state.archive.map((k) => k.species)).toEqual(['RILLET'])
    const scene = topScene(game)
    expect(scene.cursor).toBeLessThanOrEqual(scene.view.length) // clamped after the shelf shrank
  })
})

describe('openArchive: B unwinds', () => {
  it('B backs out of the action menu, then the screen, leaving depth 0', () => {
    const game = makeGame()
    const handle = openSeeded(game, [makeKindra('VERDIL', 5)], [makeKindra('RILLET', 4)])
    press(game, 'down')
    press(game, 'a') // action menu up
    expect(game.scenes.depth).toBe(2)
    press(game, 'b') // CANCEL
    expect(game.scenes.depth).toBe(1)
    press(game, 'b') // close the archive
    expect(handle.done).toBe(true)
    expect(game.scenes.depth).toBe(0)
    expect(game.state.archive).toHaveLength(1) // looked, touched nothing
  })
})

// ── Sort cycle in the scene ─────────────────────────────────────────────────

describe('openArchive: SELECT sort cycle', () => {
  it('cycles caught → kindex → level → name → caught, rebuilding the view', () => {
    const game = makeGame()
    openSeeded(game, [makeKindra('VERDIL', 5), makeKindra('EMBERIT', 9)], sortFixture())
    const scene = topScene(game)
    expect(scene.sort).toBe('caught')
    expect(scene.view).toEqual([0, 1, 2, 3])
    press(game, 'select')
    expect(scene.sort).toBe('kindex')
    expect(scene.view).toEqual([1, 2, 3, 0])
    press(game, 'select')
    expect(scene.sort).toBe('level')
    expect(scene.view).toEqual([2, 0, 3, 1])
    press(game, 'select')
    expect(scene.sort).toBe('name')
    expect(scene.view).toEqual([3, 2, 0, 1])
    press(game, 'select')
    expect(scene.sort).toBe('caught')
    expect(scene.view).toEqual([0, 1, 2, 3])
  })

  it('a mutation mid-sort rebuilds the view in place, cursor in bounds', () => {
    const game = makeGame()
    openSeeded(game, [makeKindra('VERDIL', 5), makeKindra('EMBERIT', 9)], sortFixture())
    const scene = topScene(game)
    press(game, 'select')
    press(game, 'select') // → level
    press(game, 'a') // DEPOSIT while sorted
    press(game, 'down')
    press(game, 'a') // EMBERIT Lv9 joins the shelf at archive index 4
    dismissText(game, 1)
    expect(scene.sort).toBe('level')
    expect(scene.view).toEqual([2, 0, 4, 3, 1]) // 30, 12, 9, 7, 3
    expect(scene.cursor).toBeLessThanOrEqual(scene.view.length)
  })
})

// ── The long shelf ──────────────────────────────────────────────────────────

describe('openArchive: 120-entry navigation', () => {
  it('held auto-repeat traverses every row and wraps; pages jump ±7 with clamps', () => {
    const game = makeGame()
    openSeeded(
      game,
      [makeKindra('VERDIL', 5)],
      Array.from({ length: 120 }, () => makeKindra('THATCHRAT', 3)),
    )
    const scene = topScene(game)

    // Hold down: fires at t=0, t=14, then every 4 ticks (the pinned PadRepeat
    // cadence) — 120 fires by tick 486 lands on the last row...
    game.input.setDown('down', true)
    for (let t = 0; t < 487; t++) tick(game)
    expect(scene.cursor).toBe(120)
    // ...and the next fire wraps past the end back to DEPOSIT.
    for (let t = 0; t < 4; t++) tick(game)
    expect(scene.cursor).toBe(0)
    game.input.setDown('down', false)
    tick(game)

    // Page jumps: ±7 rows, clamped at both ends.
    press(game, 'right')
    expect(scene.cursor).toBe(7)
    press(game, 'right')
    expect(scene.cursor).toBe(14)
    press(game, 'left')
    expect(scene.cursor).toBe(7)
    press(game, 'left')
    expect(scene.cursor).toBe(0)
    press(game, 'left')
    expect(scene.cursor).toBe(0) // clamped, no wrap on page jumps

    scene.cursor = 119
    press(game, 'right')
    expect(scene.cursor).toBe(120) // clamped to the last row
    press(game, 'right')
    expect(scene.cursor).toBe(120)
    press(game, 'up')
    expect(scene.cursor).toBe(119)
    press(game, 'down')
    expect(scene.cursor).toBe(120)
    press(game, 'down')
    expect(scene.cursor).toBe(0) // single steps DO wrap
  })
})
