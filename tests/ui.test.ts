/**
 * The interface toolkit, driven headless: a real Input/Scheduler/
 * SceneStack wired into a stub Game, ticked in main.ts order
 * (beginFrame, tasks, scenes). draw() is never called — node has no
 * ImageData — so these pin the *behavior*: push/pop discipline, the
 * typewriter's fill-vs-advance presses, cursor wrap and cancel,
 * pickers resolving, and the D-pad auto-repeat cadence.
 */
import { describe, expect, it } from 'vitest'
import { Input, Rng, SaveSlot, SceneStack, Scheduler } from '../src/engine'
import type { Apu, Button, FrameBuffer, Sequencer } from '../src/engine'
import type { Game } from '../src/game/game'
import type { SaveData } from '../src/game/types'
import { makeKindra } from '../src/game/kindra'
import { newSave, bagAdd } from '../src/game/state'
import { askChoice } from '../src/game/ui/choice'
import { showText } from '../src/game/ui/dialog'
import { PadRepeat, wrapIndex } from '../src/game/ui/nav'
import { openBag } from '../src/game/ui/bag'
import { openNameEntry } from '../src/game/ui/nameEntry'
import { openPartyScreen } from '../src/game/ui/party'

function makeGame(): Game {
  const game: Game = {
    fb: null as unknown as FrameBuffer,
    input: new Input(),
    scenes: new SceneStack(),
    tasks: new Scheduler(),
    apu: { context: null } as unknown as Apu,
    seq: null as unknown as Sequencer,
    rng: new Rng(7),
    save: new SaveSlot<SaveData>('test:ui', 1),
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
 * Press, then run one released tick — the woken coroutine gets to
 * push/pop scenes, and back-to-back same-button presses stay fresh edges.
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

describe('showText', () => {
  it('types, fills on one press, advances on the next, pops at the end', () => {
    const game = makeGame()
    const handle = game.tasks.spawn(showText(game, ['HELLO']))
    tick(game) // coroutine pushes the box; first glyph types
    expect(game.scenes.depth).toBe(1)
    tap(game, 'a') // press during typing: fills, must NOT also advance
    expect(game.scenes.depth).toBe(1)
    expect(handle.done).toBe(false)
    tick(game) // release the button so the next press is a fresh edge
    tap(game, 'a') // now it advances; the box pops next tick
    tick(game)
    expect(handle.done).toBe(true)
    expect(game.scenes.depth).toBe(0)
  })

  it('spills overflow into extra boxes that each wait for A', () => {
    const game = makeGame()
    // Wraps to 5 lines -> 3 two-line boxes.
    const long = 'The quick brown fox jumps over the lazy dog and keeps on running through the valley.'
    const handle = game.tasks.spawn(showText(game, [long]))
    tick(game)
    for (let page = 0; page < 3; page++) {
      expect(game.scenes.depth).toBe(1)
      expect(handle.done).toBe(false)
      tap(game, 'b') // B fills but never advances
      tick(game)
      tap(game, 'a') // advance (or pop, on the last box)
      tick(game)
    }
    expect(handle.done).toBe(true)
    expect(game.scenes.depth).toBe(0)
  })

  it('interpolates {PLAYER} without leaving the token behind', () => {
    const game = makeGame()
    // 'STORM!' is 6 printable glyphs; '{PLAYER}!' raw would be 9.
    const handle = game.tasks.spawn(showText(game, ['{PLAYER}!']))
    tick(game) // push + glyph 1
    for (let i = 0; i < 5; i++) tick(game) // glyphs 2-6: fully revealed
    tap(game, 'a') // a single A must finish it (nothing left to fill)
    tick(game)
    expect(handle.done).toBe(true)
  })
})

describe('askChoice', () => {
  it('wraps the cursor and resolves on A', () => {
    const game = makeGame()
    const handle = game.tasks.spawn(askChoice(game, ['YES', 'NO']))
    tick(game)
    tap(game, 'up') // wraps 0 -> 1
    tap(game, 'a')
    tick(game)
    expect(handle.result).toBe(1)
    expect(game.scenes.depth).toBe(0)
  })

  it('resolves cancelIndex on B only when provided', () => {
    const game = makeGame()
    const stubborn = game.tasks.spawn(askChoice(game, ['ONE', 'TWO']))
    tick(game)
    tap(game, 'b') // no cancelIndex: B is ignored
    expect(stubborn.done).toBe(false)
    tap(game, 'a')
    tick(game)
    expect(stubborn.result).toBe(0)

    const cancellable = game.tasks.spawn(askChoice(game, ['ONE', 'TWO'], { cancelIndex: 1 }))
    tick(game)
    tap(game, 'b')
    tick(game)
    expect(cancellable.result).toBe(1)
  })
})

describe('openBag', () => {
  it("battle mode resolves the chosen item's key", () => {
    const game = makeGame()
    bagAdd(game.state, 'CHARM', 2)
    bagAdd(game.state, 'TONIC', 1)
    const handle = game.tasks.spawn(openBag(game, 'battle'))
    tick(game)
    expect(game.scenes.depth).toBe(1)
    tap(game, 'a') // first row, registry order: CHARM
    tick(game)
    expect(handle.result).toBe('CHARM')
    expect(game.scenes.depth).toBe(0)
  })

  it('battle mode resolves null on B', () => {
    const game = makeGame()
    bagAdd(game.state, 'TONIC', 1)
    const handle = game.tasks.spawn(openBag(game, 'battle'))
    tick(game)
    tap(game, 'b')
    tick(game)
    expect(handle.done).toBe(true)
    expect(handle.result).toBe(null)
  })

  it('an empty bag just says so', () => {
    const game = makeGame()
    const handle = game.tasks.spawn(openBag(game, 'battle'))
    tick(game) // pushes the sys.bag.none text box instead of the bag
    tap(game, 'b') // fill
    tap(game, 'a') // dismiss
    tick(game)
    expect(handle.result).toBe(null)
    expect(game.scenes.depth).toBe(0)
  })
})

describe('openPartyScreen select mode', () => {
  it('refuses fainted members and resolves a living index', () => {
    const game = makeGame()
    const fainted = makeKindra('VERDIL', 5)
    fainted.hp = 0
    game.state.party = [fainted, makeKindra('EMBERIT', 5)]
    const handle = game.tasks.spawn(openPartyScreen(game, 'select'))
    tick(game)
    tap(game, 'a') // cursor 0 is fainted: rejected
    expect(handle.done).toBe(false)
    tap(game, 'down')
    tap(game, 'a')
    tick(game)
    expect(handle.result).toBe(1)
    expect(game.scenes.depth).toBe(0)
  })

  it('resolves -1 on B', () => {
    const game = makeGame()
    game.state.party = [makeKindra('RILLET', 5)]
    const handle = game.tasks.spawn(openPartyScreen(game, 'select'))
    tick(game)
    tap(game, 'b')
    tick(game)
    expect(handle.result).toBe(-1)
  })
})

describe('openPartyScreen pick opts', () => {
  it('an explicit empty opts object keeps the classic rule (default-equivalent)', () => {
    const game = makeGame()
    const fainted = makeKindra('VERDIL', 5)
    fainted.hp = 0
    game.state.party = [fainted, makeKindra('EMBERIT', 5)]
    const handle = game.tasks.spawn(openPartyScreen(game, 'select', {}))
    tick(game)
    tap(game, 'a') // cursor 0 is fainted: still rejected with no canPick given
    expect(handle.done).toBe(false)
    tap(game, 'down')
    tap(game, 'a')
    tick(game)
    expect(handle.result).toBe(1)
    expect(game.scenes.depth).toBe(0)
  })

  it('a canPick veto overrides the default both ways', () => {
    const game = makeGame()
    const fainted = makeKindra('VERDIL', 5)
    fainted.hp = 0
    game.state.party = [makeKindra('EMBERIT', 5), fainted]
    // Inverted rule: only DOWNED members may be picked (a revive item's view).
    const handle = game.tasks.spawn(openPartyScreen(game, 'select', { canPick: (k) => k.hp <= 0 }))
    tick(game)
    tap(game, 'a') // member 0 lives: the veto refuses what the default allows
    expect(handle.done).toBe(false)
    tap(game, 'down')
    tap(game, 'a') // member 1 fainted: allowed where the default refuses
    tick(game)
    expect(handle.result).toBe(1)
    expect(game.scenes.depth).toBe(0)
  })
})

describe('party view mode: SUMMARY / ITEM / CANCEL', () => {
  it('ITEM takes the held item back into the bag', () => {
    const game = makeGame()
    const k = makeKindra('VERDIL', 5)
    k.heldItem = 'AMBER_CRUMB'
    game.state.party = [k]
    const handle = game.tasks.spawn(openPartyScreen(game, 'view'))
    tick(game)
    press(game, 'a') // member 0 → the action menu
    press(game, 'down') // ITEM
    press(game, 'a')
    press(game, 'b') // fill 'Took the AMBER CRUMB...'
    press(game, 'a') // dismiss
    expect(k.heldItem).toBeUndefined()
    expect(game.state.bag['AMBER_CRUMB']).toBe(1)
    expect(game.scenes.depth).toBe(1) // still on the party screen
    press(game, 'b')
    expect(handle.done).toBe(true)
    expect(game.scenes.depth).toBe(0)
  })

  it('ITEM on empty paws just says so; CANCEL backs out clean', () => {
    const game = makeGame()
    game.state.party = [makeKindra('VERDIL', 5)]
    const handle = game.tasks.spawn(openPartyScreen(game, 'view'))
    tick(game)
    press(game, 'a')
    press(game, 'down')
    press(game, 'a') // ITEM with nothing held
    press(game, 'b')
    press(game, 'a')
    expect(game.state.bag).toEqual({})
    press(game, 'a') // menu again
    press(game, 'b') // B = CANCEL
    expect(game.scenes.depth).toBe(1)
    press(game, 'b')
    expect(handle.done).toBe(true)
  })

  it('SUMMARY still opens behind the menu and B returns to the list', () => {
    const game = makeGame()
    game.state.party = [makeKindra('VERDIL', 5), makeKindra('EMBERIT', 7)]
    const handle = game.tasks.spawn(openPartyScreen(game, 'view'))
    tick(game)
    press(game, 'a') // menu
    press(game, 'a') // SUMMARY (first option)
    expect(game.scenes.depth).toBe(2)
    press(game, 'down') // leaf to member 1 inside the summary
    press(game, 'b') // close it
    expect(game.scenes.depth).toBe(1)
    press(game, 'b')
    tick(game)
    expect(handle.result).toBe(-1) // view mode always resolves -1
    expect(game.scenes.depth).toBe(0)
  })
})

describe('bag GIVE and evolution items in the field', () => {
  it('GIVE hands a hold item over; what was held swaps back to the bag', () => {
    const game = makeGame()
    const k = makeKindra('VERDIL', 5)
    k.heldItem = 'KEEN_LENS'
    game.state.party = [k]
    bagAdd(game.state, 'CINDER_BAND', 1)
    const handle = game.tasks.spawn(openBag(game, 'field'))
    tick(game)
    press(game, 'a') // the only row: CINDER BAND → party picker
    press(game, 'a') // member 0
    dismissText(game, 1) // 'Took the KEEN LENS...', then 'VERDIL is now holding...'
    expect(k.heldItem).toBe('CINDER_BAND')
    expect(game.state.bag['KEEN_LENS']).toBe(1)
    expect(game.state.bag['CINDER_BAND']).toBeUndefined()
    press(game, 'b') // leave the bag
    expect(handle.done).toBe(true)
    expect(game.scenes.depth).toBe(0)
  })

  it('GIVE to empty paws skips the swap-back message', () => {
    const game = makeGame()
    const k = makeKindra('VERDIL', 5)
    game.state.party = [k]
    bagAdd(game.state, 'MOSS_LOCKET', 1)
    const handle = game.tasks.spawn(openBag(game, 'field'))
    tick(game)
    press(game, 'a')
    press(game, 'a')
    // No swap-back line, just 'now holding' — and with the bag now
    // empty, openBag closes itself the moment the box pops.
    dismissText(game, 0)
    expect(k.heldItem).toBe('MOSS_LOCKET')
    expect(game.state.bag['MOSS_LOCKET']).toBeUndefined()
    expect(handle.done).toBe(true)
    expect(game.scenes.depth).toBe(0)
  })

  it('cancelling the GIVE picker keeps the item in the bag', () => {
    const game = makeGame()
    game.state.party = [makeKindra('VERDIL', 5)]
    bagAdd(game.state, 'DEW_PEARL', 1)
    game.tasks.spawn(openBag(game, 'field'))
    tick(game)
    press(game, 'a') // → picker
    press(game, 'b') // never mind
    expect(game.state.bag['DEW_PEARL']).toBe(1)
    expect(game.state.party[0]!.heldItem).toBeUndefined()
    expect(game.scenes.depth).toBe(1) // back on the bag
  })

  it('a stone nobody answers says so and is kept', () => {
    const game = makeGame()
    game.state.party = [makeKindra('VERDIL', 5)] // VERDIL has no stone rule
    bagAdd(game.state, 'TOLL_SHARD', 1)
    const handle = game.tasks.spawn(openBag(game, 'field'))
    tick(game)
    press(game, 'a') // TOLL SHARD → picker
    press(game, 'a') // offer it to VERDIL → 'Nothing happened...'
    dismissText(game, 1)
    expect(game.state.bag['TOLL_SHARD']).toBe(1)
    expect(game.state.party[0]!.species).toBe('VERDIL')
    expect(game.state.party[0]!.pendingEvo).toBeUndefined()
    press(game, 'b')
    expect(handle.done).toBe(true)
    expect(game.scenes.depth).toBe(0)
  })
})

describe('openNameEntry', () => {
  it('types from the grid and resolves on END', () => {
    const game = makeGame()
    const handle = game.tasks.spawn(openNameEntry(game, 'STORM'))
    tick(game)
    tap(game, 'a') // 'A' (cursor starts on it)
    tap(game, 'down') // 'H'
    tap(game, 'a')
    tap(game, 'start') // jump to END
    tap(game, 'a')
    tick(game)
    expect(handle.result).toBe('AH')
    expect(game.scenes.depth).toBe(0)
  })

  it('END on an empty name falls back to the initial; B deletes', () => {
    const game = makeGame()
    const handle = game.tasks.spawn(openNameEntry(game, 'STORM'))
    tick(game)
    tap(game, 'a') // 'A'
    tap(game, 'b') // deleted again
    tap(game, 'start')
    tap(game, 'a')
    tick(game)
    expect(handle.result).toBe('STORM')
  })
})

describe('PadRepeat', () => {
  it('fires immediately, then repeats after the delay at typing rate', () => {
    const input = new Input()
    const pad = new PadRepeat()
    const fires: number[] = []
    input.setDown('down', true)
    for (let t = 0; t < 30; t++) {
      input.beginFrame()
      if (pad.step(input) === 'down') fires.push(t)
    }
    expect(fires[0]).toBe(0)
    expect(fires[1]).toBe(14)
    expect(fires[2]).toBe(18)
  })

  it('releasing resets; a new direction fires at once', () => {
    const input = new Input()
    const pad = new PadRepeat()
    input.setDown('down', true)
    input.beginFrame()
    expect(pad.step(input)).toBe('down')
    input.setDown('down', false)
    input.beginFrame()
    expect(pad.step(input)).toBe(null)
    input.setDown('up', true)
    input.beginFrame()
    expect(pad.step(input)).toBe('up')
  })
})

describe('wrapIndex', () => {
  it('wraps both directions', () => {
    expect(wrapIndex(3, 3)).toBe(0)
    expect(wrapIndex(-1, 3)).toBe(2)
    expect(wrapIndex(1, 3)).toBe(1)
  })
})
