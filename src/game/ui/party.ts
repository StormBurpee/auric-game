/**
 * The party screen: six rows of name/level/HP at a glance, and the
 * two-page summary (stats + EXP, moves with PP and type) behind A in
 * view mode — by way of the SUMMARY/ITEM/CANCEL action menu, where ITEM
 * takes a held item back into the bag. Select mode is the picker battle
 * items and the bag's tonics share — it resolves to a party index that
 * passes the pick rule (able(): standing and not an egg, unless the
 * caller says otherwise), or -1 on B. The summary itself browses any
 * list a caller hands it, so the Archive leafs through its shelf with
 * the same two pages — eggs show one veiled card instead (Tier 2).
 */
import type { FrameBuffer, Palette, Sprite, Task } from '../../engine'
import { pal, sprite } from '../../engine'
import * as assetRegistry from '../assets'
import { monArtOf, UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import { itemOf, moveOf, speciesOf } from '../data'
import { str } from '../data/strings'
import type { Game } from '../game'
import { able, expForLevel, isEgg, statsOf } from '../kindra'
import { bagAdd } from '../state'
import type { Kindra } from '../types'
import { askChoice } from './choice'
import { showText } from './dialog'
import { drawHpBar, drawText, drawTextCenter, drawTextRight } from './draw'
import { eggTellKey, kindraName, LINE_CHARS, padNum, statusLabel, wrapText } from './format'
import type { ModalScene } from './modal'
import { runScene } from './modal'
import { PadRepeat, wrapIndex } from './nav'

/** First party row's top pixel; rows are two text lines tall. */
const ROW_Y = 8
const ROW_H = 16
const HP_BAR_W = 50

// ── The egg's face (Tier 2) ─────────────────────────────────────────────────
// One veiled sprite for every egg everywhere: party summary, the Archive
// card, the hatch ceremony. The art pass exports the real EGG_ART beside
// UI_ART; until it lands (and as a permanent safety net) an inline
// placeholder keeps every screen whole — the probe below picks up the real
// sprite automatically the moment the assets module exports it.

/** Inline fallback: a 20x24 speckled egg in warm shell tones. */
const FALLBACK_EGG: { front: Sprite; palette: Palette } = {
  front: sprite(`
    .......333333.......
    .....3111111113.....
    ....311111111113....
    ...31111111111113...
    ...31111121111113...
    ..3111111111111113..
    ..3112111111112113..
    .311111111111111113.
    .312211221122112213.
    .321122112211221123.
    31111111111111111113
    31111111111111111113
    31111111111111111113
    31111111111111111123
    31111111111111111123
    31111111111111111223
    31111111111111111223
    31111111111111112223
    .311111111111112223.
    .311111111111122223.
    ..3111111111122223..
    ...31111111122223...
    ....311112222223....
    ......33333333......
  `),
  palette: pal('#ffffff', '#f8f0dc', '#c8b478', '#504838'),
}

/** What the art registry may export once the egg art pass lands. */
type EggArtExport = { front?: Sprite; sprite?: Sprite; palette: Palette }

/** The egg sprite + palette: EGG_ART when exported, else the inline fallback. */
export function eggArtOf(): { front: Sprite; palette: Palette } {
  const reg = assetRegistry as { EGG_ART?: EggArtExport }
  const art: EggArtExport | undefined = reg.EGG_ART ?? assetRegistry.MON_ART['EGG']
  const front = art?.front ?? art?.sprite
  if (art && front) return { front, palette: art.palette }
  return FALLBACK_EGG
}

/** Caller hooks for select mode; the defaults are today's classic rules. */
export interface PartyPickOpts {
  /** Per-member veto; default: able(k) — standing and not an egg (the rule battle and tonics share). */
  canPick?: (k: Kindra, index: number) => boolean
  /** Footer line under the list; default 'CHOOSE A KINDRA.'. */
  footer?: string
}

class PartyScene implements ModalScene {
  readonly translucent = true
  done = false
  result = -1
  /** View mode: the member whose action menu the coroutine should open. */
  pick: number | null = null
  cursor = 0
  private readonly pad = new PadRepeat()
  private readonly canPick: (k: Kindra, index: number) => boolean
  private readonly footer: string

  constructor(
    private readonly game: Game,
    private readonly mode: 'view' | 'select',
    opts: PartyPickOpts,
  ) {
    // The default veto centrally bars eggs (and the fainted) from battle
    // switches, bag GIVE/stones/tonics — every picker that doesn't override.
    this.canPick = opts.canPick ?? ((k) => able(k))
    this.footer = opts.footer ?? 'CHOOSE A KINDRA.'
  }

  /** Re-arm for the next pick (a method, so TS keeps `pick` wide across the yield). */
  rearm(): void {
    this.pick = null
  }

  update(): void {
    const input = this.game.input
    const party = this.game.state.party
    if (party.length === 0) {
      this.done = true
      return
    }
    this.cursor = Math.min(this.cursor, party.length - 1)
    const dir = this.pad.step(input)
    if (dir === 'up' || dir === 'down') {
      this.cursor = wrapIndex(this.cursor + (dir === 'down' ? 1 : -1), party.length)
      playSfx(this.game, 'menu_move')
      return
    }
    if (input.pressed('a')) {
      if (this.mode === 'select') {
        if (this.canPick(party[this.cursor]!, this.cursor)) {
          this.result = this.cursor
          this.done = true
          playSfx(this.game, 'menu_confirm')
        } else {
          playSfx(this.game, 'menu_cancel')
        }
      } else {
        this.pick = this.cursor
        playSfx(this.game, 'menu_confirm')
      }
      return
    }
    if (input.pressed('b')) {
      this.result = -1
      this.done = true
      playSfx(this.game, 'menu_cancel')
    }
  }

  draw(fb: FrameBuffer): void {
    fb.fillRect(0, 0, 160, 144, PAL_UI, 0)
    const party = this.game.state.party
    for (let i = 0; i < party.length; i++) {
      const k = party[i]!
      const y = ROW_Y + i * ROW_H
      drawText(fb, kindraName(k), 8, y)
      // An egg keeps its secrets: the name alone — no level, HP or status.
      if (!isEgg(k)) {
        drawText(fb, `Lv${k.level}`, 96, y)
        const max = statsOf(k).hp
        drawHpBar(fb, 8, y + 10, HP_BAR_W, k.hp, max)
        drawTextRight(fb, `${padNum(k.hp, 3)}/${padNum(max, 3)}`, 128, y + 8)
        const st = statusLabel(k)
        if (st) drawTextRight(fb, st, 152, y + 8)
      }
      if (i === this.cursor) fb.blit(UI_ART.cursor, PAL_UI, 0, y)
    }
    if (this.mode === 'select') {
      fb.fillRect(0, 120, 160, 1, PAL_UI, 3)
      drawTextCenter(fb, this.footer, 80, 128)
    }
  }
}

/** Summary header/body geometry. */
const DIVIDER_Y = 66
const STAT_ROWS: readonly { label: string; key: 'atk' | 'def' | 'spa' | 'spd' | 'spe' }[] = [
  { label: 'ATK', key: 'atk' },
  { label: 'DEF', key: 'def' },
  { label: 'SPA', key: 'spa' },
  { label: 'SPD', key: 'spd' },
  { label: 'SPE', key: 'spe' },
]

class SummaryScene implements ModalScene {
  readonly translucent = true
  done = false
  /** 0 = stats, 1 = moves; up/down browses the list without leaving. */
  private page = 0

  constructor(
    private readonly game: Game,
    public index: number,
    /** A live thunk, not a snapshot: the party today, the Archive's shelf tomorrow. */
    private readonly list: () => readonly Kindra[],
  ) {}

  update(): void {
    const input = this.game.input
    const list = this.list()
    if (list.length === 0) {
      this.done = true
      return
    }
    this.index = Math.min(this.index, list.length - 1)
    if (input.pressed('up') || input.pressed('down')) {
      this.index = wrapIndex(this.index + (input.pressed('down') ? 1 : -1), list.length)
      playSfx(this.game, 'menu_move')
      return
    }
    if (input.pressed('left') || input.pressed('right')) {
      // An egg has a single veiled page — nothing to leaf through.
      if (!isEgg(list[this.index]!)) {
        this.page = 1 - this.page
        playSfx(this.game, 'menu_move')
      }
      return
    }
    if (input.pressed('a')) {
      if (this.page === 0 && !isEgg(list[this.index]!)) {
        this.page = 1
        playSfx(this.game, 'menu_move')
      } else {
        this.done = true
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
    const k = this.list()[this.index]
    if (!k) return
    fb.fillRect(0, 0, 160, 144, PAL_UI, 0)
    if (isEgg(k)) {
      this.drawEgg(fb, k)
      return
    }
    this.drawHeader(fb, k)
    if (this.page === 0) this.drawStats(fb, k)
    else this.drawMoves(fb, k)
    drawTextCenter(fb, this.page === 0 ? '< STATS >' : '< MOVES >', 80, 132)
  }

  /** The veiled card: the egg's face and one banded tell — nothing else escapes the shell. */
  private drawEgg(fb: FrameBuffer, k: Kindra): void {
    const art = eggArtOf()
    fb.blit(art.front, art.palette, 8 + ((48 - art.front.w) >> 1), 8 + (48 - art.front.h))
    drawText(fb, kindraName(k), 64, 8)
    fb.fillRect(0, DIVIDER_Y, 160, 1, PAL_UI, 3)
    const lines = wrapText(str(eggTellKey(k))[0] ?? '', LINE_CHARS)
    for (let i = 0; i < lines.length; i++) {
      drawText(fb, lines[i]!, 16, 78 + i * 10)
    }
  }

  private drawHeader(fb: FrameBuffer, k: Kindra): void {
    const sp = speciesOf(k.species)
    const art = monArtOf(k.species)
    fb.blit(art.front, art.palette, 8 + ((48 - art.front.w) >> 1), 8 + (48 - art.front.h))
    drawText(fb, kindraName(k), 64, 8)
    drawText(fb, `Lv${k.level}`, 64, 18)
    const st = statusLabel(k)
    if (st) drawText(fb, st, 112, 18)
    drawText(fb, sp.type1.toUpperCase(), 64, 28)
    if (sp.type2) drawText(fb, sp.type2.toUpperCase(), 64, 38)
    const max = statsOf(k).hp
    drawHpBar(fb, 64, 50, 56, k.hp, max)
    drawTextRight(fb, `${padNum(k.hp, 3)}/${padNum(max, 3)}`, 152, 58)
    fb.fillRect(0, DIVIDER_Y, 160, 1, PAL_UI, 3)
  }

  private drawStats(fb: FrameBuffer, k: Kindra): void {
    const stats = statsOf(k)
    for (let i = 0; i < STAT_ROWS.length; i++) {
      const row = STAT_ROWS[i]!
      const y = 72 + i * 8
      drawText(fb, row.label, 16, y)
      drawTextRight(fb, String(stats[row.key]), 88, y)
    }
    drawText(fb, 'ITEM', 16, 114)
    drawTextRight(fb, k.heldItem ? itemOf(k.heldItem).name : '-', 152, 114)
    const sp = speciesOf(k.species)
    const toNext = k.level >= 100 ? 0 : Math.max(0, expForLevel(k.level + 1, sp.growth) - k.exp)
    drawText(fb, 'EXP', 104, 72)
    drawTextRight(fb, String(k.exp), 152, 80)
    drawText(fb, 'NEXT', 104, 96)
    drawTextRight(fb, String(toNext), 152, 104)
  }

  private drawMoves(fb: FrameBuffer, k: Kindra): void {
    for (let i = 0; i < 4; i++) {
      const y = 70 + i * 14
      const slot = k.moves[i]
      if (!slot) {
        drawText(fb, '-', 16, y)
        continue
      }
      const m = moveOf(slot.move)
      drawText(fb, m.name, 16, y)
      drawTextRight(fb, `${padNum(slot.pp, 2)}/${padNum(slot.ppMax, 2)}`, 152, y)
      drawText(fb, m.type.toUpperCase(), 24, y + 8)
    }
  }
}

/** Browse summaries over any live list; resolves to the index the player settled on. */
export function* openSummary(game: Game, list: () => readonly Kindra[], index: number): Task<number> {
  const scene = yield* runScene(game, new SummaryScene(game, index, list))
  return scene.index
}

/** The ITEM action: a held item comes back to the bag; empty paws just say so. */
function* takeHeldItem(game: Game, k: Kindra): Task<void> {
  const name = kindraName(k)
  if (k.heldItem === undefined) {
    yield* showText(game, str('sys.held.none'), { KINDRA: name })
    return
  }
  const item = itemOf(k.heldItem)
  bagAdd(game.state, item.key, 1)
  delete k.heldItem
  yield* showText(game, str('sys.held.took'), { ITEM: item.name, KINDRA: name })
}

/** Party screen. 'select' resolves to a party index or -1 on cancel; 'view' always -1. */
export function* openPartyScreen(game: Game, mode: 'view' | 'select', opts?: PartyPickOpts): Task<number> {
  if (game.state.party.length === 0) return -1
  const scene = new PartyScene(game, mode, opts ?? {})
  game.scenes.push(scene)
  try {
    for (;;) {
      scene.rearm()
      yield () => scene.done || scene.pick !== null
      if (scene.done) return scene.result
      const idx = scene.pick ?? 0
      // An egg holds nothing and takes nothing: SUMMARY is its whole menu.
      const options = isEgg(game.state.party[idx]!)
        ? ['SUMMARY', 'CANCEL']
        : ['SUMMARY', 'ITEM', 'CANCEL']
      const action = yield* askChoice(game, options, { cancelIndex: options.length - 1 })
      if (options[action] === 'SUMMARY') {
        scene.cursor = yield* openSummary(game, () => game.state.party, idx)
      } else if (options[action] === 'ITEM') {
        yield* takeHeldItem(game, game.state.party[idx]!)
      }
    }
  } finally {
    game.scenes.pop()
  }
}
