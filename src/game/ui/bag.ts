/**
 * The bag: item rows with counts over a description panel. In the
 * field, tonics and cure leaves pick a party member and apply on the
 * spot; hold items are GIVEn (whatever was held swaps back to the bag);
 * stones and the LINK CORD are offered to one Kindra and only spent if
 * the change completes; charms and key items politely refuse. In battle
 * the bag is a picker — choosing ANY item resolves to its key and the
 * battle scene interprets it (throwing charms, feeding tonics mid-fight).
 */
import type { FrameBuffer, Scene, Task } from '../../engine'
import { UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import { ITEMS, itemOf } from '../data'
import { str } from '../data/strings'
import type { Game } from '../game'
import { maxHpOf } from '../kindra'
import { runItemEvolution } from '../scenes/evolution'
import { bagAdd, bagCount, bagRemove } from '../state'
import type { Item, SaveData } from '../types'
import { drawFrame, drawText, drawTextCenter, drawTextRight } from './draw'
import { showText } from './dialog'
import { kindraName, wrapText } from './format'
import { PadRepeat, wrapIndex } from './nav'
import { openPartyScreen } from './party'

interface BagRow {
  /** null marks the CANCEL row. */
  item: Item | null
  count: number
}

/** Held items in registry (Outfitter shelf) order, plus CANCEL. */
function bagRows(s: SaveData): BagRow[] {
  const rows: BagRow[] = Object.values(ITEMS)
    .filter((item) => bagCount(s, item.key) > 0)
    .map((item) => ({ item, count: bagCount(s, item.key) }))
  rows.push({ item: null, count: 0 })
  return rows
}

/** Rows live inside the (0,0,20,12) frame: y=24 through y=80+8. */
const LIST_Y = 24
const VISIBLE = 8

/** Resolves through `pick` OR `cancelled`, so it is a plain Scene, not a ModalScene. */
class BagScene implements Scene {
  readonly translucent = true
  pick: string | null = null
  cancelled = false
  private cursor = 0
  private scroll = 0
  private readonly pad = new PadRepeat()

  constructor(private readonly game: Game) {}

  /** Re-arm for the next pick (a method, so TS keeps `pick` wide across the yield). */
  rearm(): void {
    this.pick = null
  }

  update(): void {
    const input = this.game.input
    const rows = bagRows(this.game.state)
    this.cursor = Math.min(this.cursor, rows.length - 1)
    const dir = this.pad.step(input)
    if (dir === 'up' || dir === 'down') {
      this.cursor = wrapIndex(this.cursor + (dir === 'down' ? 1 : -1), rows.length)
      playSfx(this.game, 'menu_move')
      return
    }
    if (input.pressed('a')) {
      const row = rows[this.cursor]!
      if (row.item) {
        this.pick = row.item.key
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
    const rows = bagRows(this.game.state)
    const cursor = Math.min(this.cursor, rows.length - 1)
    if (cursor < this.scroll) this.scroll = cursor
    if (cursor >= this.scroll + VISIBLE) this.scroll = cursor - VISIBLE + 1
    drawFrame(fb, 0, 0, 20, 12)
    drawTextCenter(fb, 'BAG', 80, 8)
    for (let i = 0; i < VISIBLE; i++) {
      const row = rows[this.scroll + i]
      if (!row) break
      const y = LIST_Y + i * 8
      drawText(fb, row.item ? row.item.name : 'CANCEL', 24, y)
      if (row.item) drawTextRight(fb, `x${row.count}`, 144, y)
      if (this.scroll + i === cursor) fb.blit(UI_ART.cursor, PAL_UI, 8, y)
    }
    drawFrame(fb, 0, 12, 20, 6)
    const hovered = rows[cursor]
    if (hovered?.item) {
      const lines = wrapText(hovered.item.desc)
      if (lines[0]) drawText(fb, lines[0], 8, 104)
      if (lines[1]) drawText(fb, lines[1], 8, 120)
    }
  }
}

/** GIVE: hand a hold item to a member; whatever they held swaps back to the bag. */
function* giveHoldItem(game: Game, item: Item): Task<void> {
  const idx = yield* openPartyScreen(game, 'select')
  if (idx < 0) return
  const k = game.state.party[idx]!
  const name = kindraName(k)
  if (k.heldItem !== undefined) {
    const old = itemOf(k.heldItem)
    bagAdd(game.state, old.key, 1)
    yield* showText(game, str('sys.held.took'), { ITEM: old.name, KINDRA: name })
  }
  bagRemove(game.state, item.key, 1)
  k.heldItem = item.key
  yield* showText(game, str('sys.held.gave'), { KINDRA: name, ITEM: item.name })
}

/**
 * USE on a stone or the LINK CORD: offer it to one Kindra and let the
 * rule list answer. The item is spent only on a completed change — a
 * B-cancelled ceremony refunds it (Gen 2 ate your stone; we don't), and
 * the wrong gift just says so.
 */
function* useEvolutionItem(game: Game, item: Item): Task<void> {
  const idx = yield* openPartyScreen(game, 'select')
  if (idx < 0) return
  const k = game.state.party[idx]!
  const result = yield* runItemEvolution(game, k, item.key)
  if (result === 'done') bagRemove(game.state, item.key, 1)
  else if (result === 'none') yield* showText(game, str('sys.evo.stone.none'))
}

/** Field use: tonics and cures apply, hold items are given, stones and cords offered; the rest refuse. */
function* useInField(game: Game, key: string): Task<void> {
  const item = itemOf(key)
  const effect = item.effect
  switch (effect.kind) {
    case 'hold':
      yield* giveHoldItem(game, item)
      return
    case 'stone':
    case 'link':
      yield* useEvolutionItem(game, item)
      return
    case 'heal':
    case 'cure':
      break
    default:
      yield* showText(game, str('sys.item.cantuse'))
      return
  }
  const idx = yield* openPartyScreen(game, 'select')
  if (idx < 0) return
  const k = game.state.party[idx]!
  const name = kindraName(k)
  if (effect.kind === 'heal') {
    const healed = Math.min(effect.amount, maxHpOf(k) - k.hp)
    if (k.hp <= 0 || healed <= 0) {
      yield* showText(game, str('sys.item.noeffect'))
      return
    }
    k.hp += healed
    bagRemove(game.state, key, 1)
    yield* showText(game, str('sys.heal.item'), { KINDRA: name, N: String(healed) })
  } else {
    const curable = k.hp > 0 && k.status !== null && (effect.status === 'all' || k.status === effect.status)
    if (!curable) {
      yield* showText(game, str('sys.item.noeffect'))
      return
    }
    k.status = null
    bagRemove(game.state, key, 1)
    yield* showText(game, str('sys.cure.item'), { KINDRA: name })
  }
}

/** Bag screen; using items handled inside. Resolves to a chosen item key in 'battle' mode, else null. */
export function* openBag(game: Game, mode: 'field' | 'battle'): Task<string | null> {
  if (bagRows(game.state).length <= 1) {
    yield* showText(game, str('sys.bag.none'))
    return null
  }
  const scene = new BagScene(game)
  game.scenes.push(scene)
  try {
    for (;;) {
      scene.rearm()
      yield () => scene.pick !== null || scene.cancelled
      if (scene.cancelled) return null
      const key = scene.pick
      if (key === null) continue
      if (mode === 'battle') return key
      yield* useInField(game, key)
      if (bagRows(game.state).length <= 1) return null
    }
  } finally {
    game.scenes.pop()
  }
}
