/**
 * The KINDEX: Elder Rowan's book of bonds. The list shows all 24
 * species in Kindex order — '???' until seen, a dot once caught — over
 * a SEEN/CAUGHT tally; A on a seen species opens its detail page
 * (front art, types, the flavor entry), where up/down leafs through
 * the other seen entries without going back to the list.
 */
import type { FrameBuffer, Task } from '../../engine'
import { monArtOf, UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import { SPECIES } from '../data'
import type { Game } from '../game'
import type { Species } from '../types'
import { drawFrame, drawText, drawTextCenter, drawTextRight } from './draw'
import { wrapText } from './format'
import type { ModalScene } from './modal'
import { runScene } from './modal'
import { PadRepeat } from './nav'

/** The roster in Kindex order, fixed at module load. */
const DEX: readonly Species[] = Object.values(SPECIES).sort((a, b) => a.id - b.id)

/** List rows visible at once. */
const VISIBLE = 12
const LIST_Y = 24

class KindexListScene implements ModalScene {
  readonly translucent = true
  done = false
  /** Index into DEX whose detail page the coroutine should open. */
  pick: number | null = null
  cursor = 0
  private scroll = 0
  private readonly pad = new PadRepeat()

  constructor(private readonly game: Game) {}

  /** Re-arm for the next pick (a method, so TS keeps `pick` wide across the yield). */
  rearm(): void {
    this.pick = null
  }

  update(): void {
    const input = this.game.input
    const dir = this.pad.step(input)
    if (dir === 'up' || dir === 'down') {
      const next = this.cursor + (dir === 'down' ? 1 : -1)
      if (next >= 0 && next < DEX.length) {
        this.cursor = next
        playSfx(this.game, 'menu_move')
      }
      return
    }
    if (input.pressed('a')) {
      const sp = DEX[this.cursor]!
      if (this.game.state.seen.includes(sp.key)) {
        this.pick = this.cursor
        playSfx(this.game, 'menu_confirm')
      }
      return
    }
    if (input.pressed('b')) {
      this.done = true
      playSfx(this.game, 'menu_cancel')
    }
  }

  draw(fb: FrameBuffer): void {
    const s = this.game.state
    if (this.cursor < this.scroll) this.scroll = this.cursor
    if (this.cursor >= this.scroll + VISIBLE) this.scroll = this.cursor - VISIBLE + 1
    drawFrame(fb, 0, 0, 20, 18)
    drawTextCenter(fb, 'KINDEX', 80, 8)
    for (let i = 0; i < VISIBLE; i++) {
      const sp = DEX[this.scroll + i]
      if (!sp) break
      const y = LIST_Y + i * 8
      drawText(fb, String(sp.id).padStart(2, '0'), 24, y)
      if (s.caught.includes(sp.key)) drawText(fb, '•', 40, y)
      drawText(fb, s.seen.includes(sp.key) ? sp.key : '???', 56, y)
      if (this.scroll + i === this.cursor) fb.blit(UI_ART.cursor, PAL_UI, 8, y)
    }
    fb.fillRect(8, 122, 144, 1, PAL_UI, 3)
    drawText(fb, `SEEN ${s.seen.length}`, 16, 128)
    drawTextRight(fb, `CAUGHT ${s.caught.length}`, 144, 128)
  }
}

class KindexDetailScene implements ModalScene {
  readonly translucent = true
  done = false

  constructor(
    private readonly game: Game,
    public index: number,
  ) {}

  /** Step to the nearest seen species in `delta` direction, if any. */
  private seek(delta: number): void {
    const seen = this.game.state.seen
    for (let i = this.index + delta; i >= 0 && i < DEX.length; i += delta) {
      if (seen.includes(DEX[i]!.key)) {
        this.index = i
        playSfx(this.game, 'menu_move')
        return
      }
    }
  }

  update(): void {
    const input = this.game.input
    if (input.pressed('up')) {
      this.seek(-1)
      return
    }
    if (input.pressed('down')) {
      this.seek(1)
      return
    }
    if (input.pressed('b') || input.pressed('a')) {
      this.done = true
      playSfx(this.game, 'menu_cancel')
    }
  }

  draw(fb: FrameBuffer): void {
    const sp = DEX[this.index]!
    fb.fillRect(0, 0, 160, 144, PAL_UI, 0)
    const art = monArtOf(sp.key)
    fb.blit(art.front, art.palette, 8 + ((48 - art.front.w) >> 1), 8 + (48 - art.front.h))
    drawText(fb, sp.key, 64, 8)
    drawText(fb, `No.${String(sp.id).padStart(2, '0')}`, 64, 18)
    drawText(fb, sp.type1.toUpperCase(), 64, 28)
    if (sp.type2) drawText(fb, sp.type2.toUpperCase(), 64, 38)
    drawText(fb, this.game.state.caught.includes(sp.key) ? 'CAUGHT' : 'SEEN', 64, 50)
    fb.fillRect(0, 62, 160, 1, PAL_UI, 3)
    const lines = wrapText(sp.entry)
    for (let i = 0; i < lines.length; i++) {
      drawText(fb, lines[i]!, 8, 70 + i * 8)
    }
  }
}

/** The full Kindex flow: list, detail pages, back. */
export function* openKindex(game: Game): Task<void> {
  const scene = new KindexListScene(game)
  game.scenes.push(scene)
  try {
    for (;;) {
      scene.rearm()
      yield () => scene.done || scene.pick !== null
      if (scene.done) return
      const detail = yield* runScene(game, new KindexDetailScene(game, scene.pick ?? 0))
      scene.cursor = detail.index
    }
  } finally {
    game.scenes.pop()
  }
}
