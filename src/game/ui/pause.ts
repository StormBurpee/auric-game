/**
 * The START menu: the right-side column that hangs over the world —
 * KINDEX, KINDRA, BAG (and GEAR, once Mom's gift is given), SAVE,
 * EXIT. The row list is assembled per open and the launcher switches
 * on the row NAME, so story-gated entries never leave dead rows. It
 * stays open beneath whichever submenu it launches and remembers the
 * cursor until it closes, so a save-check-heal round trip is three
 * presses, like it should be.
 */
import type { FrameBuffer, Scene, Task } from '../../engine'
import { UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import { str } from '../data/strings'
import type { Game } from '../game'
import { flag } from '../state'
import type { SaveData } from '../types'
import { openBag } from './bag'
import { askConfirm } from './choice'
import { CELL, drawFrame, drawText } from './draw'
import { showText } from './dialog'
import { openGear } from './gear'
import { openKindex } from './kindex'
import { wrapIndex } from './nav'
import { openPartyScreen } from './party'

/** The column for this open: GEAR joins after BAG once granted (D2). */
export function pauseItems(state: SaveData): string[] {
  const items = ['KINDEX', 'KINDRA', 'BAG']
  if (flag(state, 'charm_gear')) items.push('GEAR')
  items.push('SAVE', 'EXIT')
  return items
}

/** Frame cells: hugging the right edge, top of the screen. */
const FRAME_X = 11
const FRAME_W = 9

class PauseScene implements Scene {
  readonly translucent = true
  /** Index into `items` the coroutine should launch. */
  pick: number | null = null
  closed = false
  private cursor = 0

  constructor(
    private readonly game: Game,
    private readonly items: readonly string[],
  ) {}

  /** Re-arm for the next pick (a method, so TS keeps `pick` wide across the yield). */
  rearm(): void {
    this.pick = null
  }

  update(): void {
    const input = this.game.input
    if (input.pressed('up') || input.pressed('down')) {
      this.cursor = wrapIndex(this.cursor + (input.pressed('down') ? 1 : -1), this.items.length)
      playSfx(this.game, 'menu_move')
      return
    }
    if (input.pressed('a')) {
      this.pick = this.cursor
      playSfx(this.game, 'menu_confirm')
      return
    }
    if (input.pressed('b') || input.pressed('start')) {
      this.closed = true
      playSfx(this.game, 'menu_cancel')
    }
  }

  draw(fb: FrameBuffer): void {
    drawFrame(fb, FRAME_X, 0, FRAME_W, this.items.length * 2 + 1)
    for (let i = 0; i < this.items.length; i++) {
      const py = (1 + i * 2) * CELL
      drawText(fb, this.items[i]!, (FRAME_X + 2) * CELL, py)
      if (i === this.cursor) fb.blit(UI_ART.cursor, PAL_UI, (FRAME_X + 1) * CELL, py)
    }
  }
}

/** The save ritual: prompt, write-through, chime or apology. */
function* saveFlow(game: Game): Task<void> {
  const pick = yield* askConfirm(game, str('sys.save.prompt'), ['YES', 'NO'], { cancelIndex: 1 })
  if (pick !== 0) return
  yield* showText(game, str('sys.save.saving'))
  if (game.save.store(game.state)) {
    playSfx(game, 'save_chime')
    yield* showText(game, str('sys.save.done'))
  } else {
    yield* showText(game, str('sys.save.fail'))
  }
}

/** START menu: KINDEX / KINDRA / BAG / (GEAR) / SAVE / EXIT. */
export function* openPauseMenu(game: Game): Task<void> {
  const items = pauseItems(game.state)
  const scene = new PauseScene(game, items)
  game.scenes.push(scene)
  try {
    for (;;) {
      scene.rearm()
      yield () => scene.pick !== null || scene.closed
      if (scene.closed) return
      switch (items[scene.pick ?? 0]) {
        case 'KINDEX':
          yield* openKindex(game)
          break
        case 'KINDRA':
          yield* openPartyScreen(game, 'view')
          break
        case 'BAG':
          yield* openBag(game, 'field')
          break
        case 'GEAR':
          yield* openGear(game)
          break
        case 'SAVE':
          yield* saveFlow(game)
          break
        default:
          return // EXIT
      }
    }
  } finally {
    game.scenes.pop()
  }
}
