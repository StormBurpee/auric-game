/**
 * Vertical choice menus: the compact right-aligned frame that sits just
 * above the text area (YES/NO, starter picks), and the combined
 * prompt-then-choose flow where the question stays on screen while the
 * cursor blinks over the options.
 */
import type { FrameBuffer, Task } from '../../engine'
import { UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import type { Game } from '../game'
import { CELL, drawFrame, drawText } from './draw'
import { heldTextScene } from './dialog'
import type { ModalScene } from './modal'
import { runScene } from './modal'
import { wrapIndex } from './nav'

/** Screen width in 8px cells; the text frame's top row. */
const CELLS_W = 20
const TEXT_TOP = 12

class ChoiceScene implements ModalScene {
  readonly translucent = true
  done = false
  result = 0
  private cursor = 0
  /** Frame geometry in cells, fixed at construction. */
  private readonly x: number
  private readonly y: number
  private readonly w: number
  private readonly h: number
  /** Cell rows between options: airy 2 for short menus, dense 1 for long. */
  private readonly step: number

  constructor(
    private readonly game: Game,
    private readonly options: readonly string[],
    private readonly cancelIndex?: number,
  ) {
    const n = options.length
    const maxLen = options.reduce((m, o) => Math.max(m, o.length), 0)
    this.step = n <= 5 ? 2 : 1
    this.w = Math.min(CELLS_W, maxLen + 3)
    this.h = this.step === 2 ? n * 2 + 1 : n + 2
    this.x = CELLS_W - this.w
    this.y = Math.max(0, TEXT_TOP - this.h)
  }

  update(): void {
    const input = this.game.input
    if (input.pressed('up') || input.pressed('down')) {
      this.cursor = wrapIndex(this.cursor + (input.pressed('down') ? 1 : -1), this.options.length)
      playSfx(this.game, 'menu_move')
      return
    }
    if (input.pressed('a')) {
      this.result = this.cursor
      this.done = true
      playSfx(this.game, 'menu_confirm')
      return
    }
    if (input.pressed('b') && this.cancelIndex !== undefined) {
      this.result = this.cancelIndex
      this.done = true
      playSfx(this.game, 'menu_cancel')
    }
  }

  draw(fb: FrameBuffer): void {
    drawFrame(fb, this.x, this.y, this.w, this.h)
    for (let i = 0; i < this.options.length; i++) {
      const py = (this.y + 1 + i * this.step) * CELL
      drawText(fb, this.options[i]!, (this.x + 2) * CELL, py)
      if (i === this.cursor) fb.blit(UI_ART.cursor, PAL_UI, (this.x + 1) * CELL, py)
    }
  }
}

/** Vertical choice menu (top-right); resolves to index, or cancelIndex on B if provided. */
export function* askChoice(
  game: Game,
  options: string[],
  opts?: { cancelIndex?: number },
): Task<number> {
  if (options.length === 0) return opts?.cancelIndex ?? -1
  const scene = yield* runScene(game, new ChoiceScene(game, options, opts?.cancelIndex))
  return scene.result
}

/**
 * Prompt + choice in one breath: the boxes type out, the last page
 * stays on screen, and the menu opens over it — the save prompt and
 * shop till both speak this way.
 */
export function* askConfirm(
  game: Game,
  boxes: string[],
  options: string[],
  opts?: { cancelIndex?: number },
  vars?: Record<string, string>,
): Task<number> {
  const held = heldTextScene(game, boxes, vars)
  game.scenes.push(held)
  try {
    yield () => held.done
    return yield* askChoice(game, options, opts)
  } finally {
    game.scenes.pop()
  }
}
