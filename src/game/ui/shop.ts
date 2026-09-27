/**
 * The Outfitter: greeting, a priced shelf with the player's Glints in
 * the corner and the hovered item's blurb below, a held YES/NO confirm
 * per purchase, and the shopkeeper's goodbye on the way out. Buying
 * adds to the bag and rings the little acquisition jingle.
 */
import type { FrameBuffer, Scene, Task } from '../../engine'
import { UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import { itemOf } from '../data'
import { str } from '../data/strings'
import type { Game } from '../game'
import { bagAdd } from '../state'
import type { Item } from '../types'
import { askConfirm } from './choice'
import { drawFrame, drawText, drawTextRight } from './draw'
import { showText } from './dialog'
import { wrapText } from './format'
import { PadRepeat, wrapIndex } from './nav'

const LIST_Y = 32
const VISIBLE = 7

class ShopScene implements Scene {
  readonly translucent = true
  /** Index into the shelf the coroutine should ring up. */
  pick: number | null = null
  cancelled = false
  private cursor = 0
  private scroll = 0
  private readonly pad = new PadRepeat()

  constructor(
    private readonly game: Game,
    private readonly shelf: readonly Item[],
  ) {}

  /** Re-arm for the next pick (a method, so TS keeps `pick` wide across the yield). */
  rearm(): void {
    this.pick = null
  }

  update(): void {
    const input = this.game.input
    const rows = this.shelf.length + 1 // + CANCEL
    const dir = this.pad.step(input)
    if (dir === 'up' || dir === 'down') {
      this.cursor = wrapIndex(this.cursor + (dir === 'down' ? 1 : -1), rows)
      playSfx(this.game, 'menu_move')
      return
    }
    if (input.pressed('a')) {
      if (this.cursor < this.shelf.length) {
        this.pick = this.cursor
        playSfx(this.game, 'menu_confirm')
      } else {
        this.cancelled = true
        playSfx(this.game, 'menu_cancel')
      }
      return
    }
    if (input.pressed('b')) {
      this.cancelled = true
      playSfx(this.game, 'menu_cancel')
    }
  }

  draw(fb: FrameBuffer): void {
    if (this.cursor < this.scroll) this.scroll = this.cursor
    if (this.cursor >= this.scroll + VISIBLE) this.scroll = this.cursor - VISIBLE + 1
    drawFrame(fb, 0, 0, 10, 3)
    drawTextRight(fb, `${this.game.state.glints}G`, 72, 8)
    drawFrame(fb, 0, 3, 20, 9)
    for (let i = 0; i < VISIBLE; i++) {
      const idx = this.scroll + i
      if (idx > this.shelf.length) break
      const y = LIST_Y + i * 8
      const item = this.shelf[idx]
      drawText(fb, item ? item.name : 'CANCEL', 24, y)
      if (item) drawTextRight(fb, `${item.price}G`, 144, y)
      if (idx === this.cursor) fb.blit(UI_ART.cursor, PAL_UI, 8, y)
    }
    drawFrame(fb, 0, 12, 20, 6)
    const hovered = this.shelf[this.cursor]
    if (hovered) {
      const lines = wrapText(hovered.desc)
      if (lines[0]) drawText(fb, lines[0], 8, 104)
      if (lines[1]) drawText(fb, lines[1], 8, 120)
    }
  }
}

/** The Outfitter buy flow over the given item keys. */
export function* openShop(game: Game, items: string[]): Task<void> {
  const shelf = items.map((key) => itemOf(key))
  yield* showText(game, str('sys.shop.greet'))
  const scene = new ShopScene(game, shelf)
  game.scenes.push(scene)
  try {
    for (;;) {
      scene.rearm()
      yield () => scene.pick !== null || scene.cancelled
      if (scene.cancelled) break
      const item = shelf[scene.pick ?? 0]
      if (!item) continue
      const pick = yield* askConfirm(
        game,
        [`${item.name}? That will be ${item.price}G.`],
        ['YES', 'NO'],
        { cancelIndex: 1 },
      )
      if (pick !== 0) continue
      if (game.state.glints < item.price) {
        yield* showText(game, str('sys.shop.nomoney'))
        continue
      }
      game.state.glints -= item.price
      bagAdd(game.state, item.key, 1)
      playSfx(game, 'levelup')
    }
  } finally {
    game.scenes.pop()
  }
  yield* showText(game, str('sys.shop.thanks'))
}
