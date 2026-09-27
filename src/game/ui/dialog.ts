/**
 * The typewriter dialog: the bottom text frame every conversation in
 * Ambervale speaks through. Boxes interpolate and word-wrap via
 * format.ts (overflow spills into extra boxes), reveal one glyph per
 * tick with the classic blip cadence, and wait on A between pages.
 *
 * Hold mode keeps the final, fully revealed page on screen instead of
 * waiting for A — the prompt under a YES/NO overlay (save, shop).
 */
import type { FrameBuffer, Task } from '../../engine'
import { UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import type { Game } from '../game'
import { drawFrame, drawText } from './draw'
import { interpolate, paginate, wrapText } from './format'
import type { ModalScene } from './modal'
import { runScene } from './modal'

/** The frame owns cells (0,12)-(19,17); lines sit on these pixel rows. */
const LINE_X = 8
const LINE_Y0 = 104
const LINE_Y1 = 120
const ARROW_X = 144
const ARROW_Y = 128
/** Every 3rd printable glyph fires a text_blip. */
const BLIP_EVERY = 3

/** Interpolate + wrap raw boxes into 2-line pages; long text spills over. */
function compose(game: Game, boxes: string[], vars?: Record<string, string>): string[][] {
  return boxes.flatMap((box) => paginate(wrapText(interpolate(game, box, vars))))
}

export class TextBoxScene implements ModalScene {
  readonly translucent = true
  done = false
  private page = 0
  /** Glyphs revealed across the current page's two lines. */
  private shown = 0
  /** Printable glyphs revealed so far — drives the blip cadence. */
  private printed = 0

  constructor(
    private readonly game: Game,
    private readonly pages: string[][],
    /** Hold: settle on the last page (no arrow, no final A) and stay for an overlay. */
    private readonly hold = false,
  ) {}

  private get lines(): string[] {
    return this.pages[this.page] ?? []
  }

  private get total(): number {
    return this.lines.reduce((n, line) => n + line.length, 0)
  }

  private get lastPage(): boolean {
    return this.page >= this.pages.length - 1
  }

  private charAt(index: number): string {
    let i = index
    for (const line of this.lines) {
      if (i < line.length) return line[i]!
      i -= line.length
    }
    return ' '
  }

  update(): void {
    const input = this.game.input
    if (this.done) return
    if (this.shown < this.total) {
      if (input.pressed('a') || input.pressed('b')) {
        this.shown = this.total
      } else {
        this.shown++
        if (this.charAt(this.shown - 1) !== ' ') {
          this.printed++
          if (this.printed % BLIP_EVERY === 1) playSfx(this.game, 'text_blip')
        }
        if (this.shown < this.total) return
      }
      // The page settled this tick; the press that filled it is spent.
      if (this.hold && this.lastPage) this.done = true
      return
    }
    if (this.hold && this.lastPage) {
      this.done = true
      return
    }
    if (input.pressed('a')) {
      if (this.lastPage) {
        this.done = true
      } else {
        this.page++
        this.shown = 0
      }
    }
  }

  draw(fb: FrameBuffer): void {
    drawFrame(fb, 0, 12, 20, 6)
    const l0 = this.lines[0] ?? ''
    const l1 = this.lines[1] ?? ''
    if (this.shown > 0) drawText(fb, l0.slice(0, Math.min(this.shown, l0.length)), LINE_X, LINE_Y0)
    if (this.shown > l0.length) drawText(fb, l1.slice(0, this.shown - l0.length), LINE_X, LINE_Y1)
    const waiting = this.shown >= this.total && !(this.hold && this.lastPage)
    if (waiting && ((this.game.frames >> 4) & 1) === 0) {
      fb.blit(UI_ART.arrowMore, PAL_UI, ARROW_X, ARROW_Y)
    }
  }
}

/** Build a hold-mode text box for a caller that manages its own push/pop. */
export function heldTextScene(game: Game, boxes: string[], vars?: Record<string, string>): TextBoxScene {
  return new TextBoxScene(game, compose(game, boxes, vars), true)
}

/** Typewriter dialog at the screen bottom; boxes are 'line1\nline2'. Waits for A between boxes. */
export function* showText(game: Game, boxes: string[], vars?: Record<string, string>): Task<void> {
  const pages = compose(game, boxes, vars)
  if (pages.length === 0) return
  yield* runScene(game, new TextBoxScene(game, pages))
}
