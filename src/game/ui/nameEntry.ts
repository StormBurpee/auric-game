/**
 * GB-style name entry: an A-Z grid with DEL and END, a 10-cell preview
 * padded with underscores, and the classic controls — A picks, B
 * deletes, START jumps to END, a full name hops the cursor to END on
 * its own. END resolves the typed name, or the caller's initial when
 * nothing was typed (the widget never returns an empty string).
 */
import type { FrameBuffer, Task } from '../../engine'
import { UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import type { Game } from '../game'
import { drawFrame, drawText, drawTextCenter } from './draw'
import type { ModalScene } from './modal'
import { runScene } from './modal'
import { PadRepeat } from './nav'

const MAX_NAME = 10
const GRID_COLS = 7
const GRID_ROWS = 4

interface Cell {
  label: string
  x: number
  y: number
  kind: 'char' | 'del' | 'end'
}

/** A-Z in 7 columns; DEL and END close out the last row. */
const GRID: readonly (readonly Cell[])[] = (() => {
  const rows = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZ']
  return rows.map((row, r) => {
    const y = 48 + r * 16
    const cells: Cell[] = [...row].map((ch, c) => ({ label: ch, x: 16 + c * 16, y, kind: 'char' }))
    if (r === GRID_ROWS - 1) {
      cells.push({ label: 'DEL', x: 96, y, kind: 'del' })
      cells.push({ label: 'END', x: 128, y, kind: 'end' })
    }
    return cells
  })
})()

class NameEntryScene implements ModalScene {
  readonly translucent = true
  done = false
  result = ''
  private name = ''
  private row = 0
  private col = 0
  private readonly pad = new PadRepeat()

  constructor(
    private readonly game: Game,
    private readonly initial: string,
  ) {}

  update(): void {
    const input = this.game.input
    const dir = this.pad.step(input)
    if (dir !== null) {
      if (dir === 'left' || dir === 'right') {
        this.col = (this.col + (dir === 'right' ? 1 : GRID_COLS - 1)) % GRID_COLS
      } else {
        this.row = (this.row + (dir === 'down' ? 1 : GRID_ROWS - 1)) % GRID_ROWS
      }
      playSfx(this.game, 'menu_move')
      return
    }
    if (input.pressed('start')) {
      this.jumpToEnd()
      playSfx(this.game, 'menu_move')
      return
    }
    if (input.pressed('a')) {
      this.activate(GRID[this.row]![this.col]!)
      return
    }
    if (input.pressed('b')) {
      this.backspace()
    }
  }

  private jumpToEnd(): void {
    this.row = GRID_ROWS - 1
    this.col = GRID_COLS - 1
  }

  private activate(cell: Cell): void {
    switch (cell.kind) {
      case 'char':
        if (this.name.length < MAX_NAME) {
          this.name += cell.label
          playSfx(this.game, 'text_blip')
          if (this.name.length === MAX_NAME) this.jumpToEnd()
        } else {
          playSfx(this.game, 'bump')
        }
        return
      case 'del':
        this.backspace()
        return
      case 'end': {
        const name = this.name.length > 0 ? this.name : this.initial
        if (name.length === 0) {
          playSfx(this.game, 'bump')
          return
        }
        this.result = name
        this.done = true
        playSfx(this.game, 'menu_confirm')
      }
    }
  }

  private backspace(): void {
    if (this.name.length === 0) return
    this.name = this.name.slice(0, -1)
    playSfx(this.game, 'menu_cancel')
  }

  draw(fb: FrameBuffer): void {
    fb.fillRect(0, 0, 160, 144, PAL_UI, 0)
    drawText(fb, 'YOUR NAME?', 8, 8)
    drawText(fb, this.name + '_'.repeat(MAX_NAME - this.name.length), 40, 24)
    drawFrame(fb, 0, 5, 20, 13)
    for (const row of GRID) {
      for (const cell of row) {
        drawText(fb, cell.label, cell.x, cell.y)
      }
    }
    const at = GRID[this.row]![this.col]!
    fb.blit(UI_ART.cursor, PAL_UI, at.x - 8, at.y)
    drawTextCenter(fb, 'B:DEL  START:END', 80, 120)
  }
}

/** GB-style grid name entry; resolves to the confirmed name (never empty). */
export function* openNameEntry(game: Game, initial: string): Task<string> {
  const scene = yield* runScene(game, new NameEntryScene(game, initial))
  return scene.result
}
