/**
 * Larch's Archive — the living collection, one scrolling shelf instead
 * of fourteen numbered boxes. Reached through Keeper Lily; sorting,
 * one-move swaps, and a gentle goodbye live inside.
 *
 * Crystal-style split screen: the roster scrolls on the left under a
 * pinned DEPOSIT pseudo-row (the bag's CANCEL-row trick, so an empty
 * shelf still has something to stand on); the hovered Kindra's identity
 * card sits on the right. SELECT cycles the sort — a pure view
 * permutation over `state.archive`, whose array order IS caught order
 * (deposit appends, swap replaces in place). Everything that leaves the
 * shelf comes back rested, and RELEASE asks twice — the second time by
 * name — before the warm goodbye.
 */
import type { FrameBuffer, Task } from '../../engine'
import { monArtOf, UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import { speciesOf } from '../data'
import { str } from '../data/strings'
import type { Game } from '../game'
import { able, isEgg, statsOf } from '../kindra'
import {
  depositToArchive, PARTY_LIMIT, releaseFromArchive, swapWithArchive,
  withdrawFromArchive,
} from '../state'
import type { Kindra } from '../types'
import { askChoice, askConfirm } from './choice'
import { showText } from './dialog'
import { drawFrame, drawHpBar, drawText, drawTextRight } from './draw'
import { eggTellKey, kindraName, padNum, statusLabel, wrapText } from './format'
import type { ModalScene } from './modal'
import { PadRepeat, wrapIndex } from './nav'
import { eggArtOf, openPartyScreen, openSummary } from './party'

export type ArchiveSort = 'caught' | 'kindex' | 'level' | 'name'

/** SELECT walks this ring. */
const SORT_CYCLE: Record<ArchiveSort, ArchiveSort> = {
  caught: 'kindex',
  kindex: 'level',
  level: 'name',
  name: 'caught',
}

/** Rows visible at once; left/right page-jump by exactly this many. */
const VISIBLE = 7
/** List rows are two text lines tall, cursor in the left gutter. */
const ROW_Y0 = 16
const ROW_H = 16
const LIST_X = 16
/** The split: list left of the rule, identity card right of it. */
const DIVIDER_X = 88
const CARD_X = 96
const FOOTER_Y = 128

/**
 * The view permutation: archive indices in `sort` order. 'caught' is
 * array order itself; every other sort breaks ties by it (stable), so
 * two same-level LACEWING never trade places between visits. LEVEL
 * sorts strongest-first — the shelf's reason to exist.
 */
export function sortView(archive: readonly Kindra[], sort: ArchiveSort): number[] {
  const view = archive.map((_, i) => i)
  switch (sort) {
    case 'caught':
      return view
    case 'kindex':
      return view.sort(
        (a, b) => speciesOf(archive[a]!.species).id - speciesOf(archive[b]!.species).id || a - b,
      )
    case 'level':
      return view.sort((a, b) => archive[b]!.level - archive[a]!.level || a - b)
    case 'name':
      return view.sort((a, b) => {
        const na = kindraName(archive[a]!)
        const nb = kindraName(archive[b]!)
        return na < nb ? -1 : na > nb ? 1 : a - b
      })
  }
}

class ArchiveScene implements ModalScene {
  readonly translucent = true
  done = false
  /** View row the coroutine should act on; 0 is the DEPOSIT pseudo-row. */
  pick: number | null = null
  cursor = 0
  sort: ArchiveSort = 'caught'
  /** Archive indices in sort order; rebuilt on sort change and after every mutation. */
  view: number[]
  private scroll = 0
  private readonly pad = new PadRepeat()

  constructor(private readonly game: Game) {
    this.view = sortView(game.state.archive, this.sort)
  }

  /** Re-arm for the next pick (a method, so TS keeps `pick` wide across the yield). */
  rearm(): void {
    this.pick = null
  }

  /** Re-derive the view and keep the cursor on a real row (mutations shrink the list). */
  refresh(): void {
    this.view = sortView(this.game.state.archive, this.sort)
    this.cursor = Math.min(this.cursor, this.view.length)
  }

  /** The shelf exactly as the player sees it — the summary browser leafs this. */
  viewList(): Kindra[] {
    const archive = this.game.state.archive
    return this.view.map((a) => archive[a]!)
  }

  /** The Kindra under the cursor, or null on the DEPOSIT row. */
  private hovered(): Kindra | null {
    if (this.cursor === 0) return null
    const a = this.view[this.cursor - 1]
    return a === undefined ? null : (this.game.state.archive[a] ?? null)
  }

  update(): void {
    const input = this.game.input
    const rows = this.view.length + 1
    const dir = this.pad.step(input)
    if (dir === 'up' || dir === 'down') {
      this.cursor = wrapIndex(this.cursor + (dir === 'down' ? 1 : -1), rows)
      playSfx(this.game, 'menu_move')
      return
    }
    if (dir === 'left' || dir === 'right') {
      // The long-list answer: a page at a time, clamped at the ends.
      const next = Math.max(0, Math.min(rows - 1, this.cursor + (dir === 'right' ? VISIBLE : -VISIBLE)))
      if (next !== this.cursor) {
        this.cursor = next
        playSfx(this.game, 'menu_move')
      }
      return
    }
    if (input.pressed('select')) {
      this.sort = SORT_CYCLE[this.sort]
      this.refresh()
      playSfx(this.game, 'menu_move')
      return
    }
    if (input.pressed('a')) {
      this.pick = this.cursor
      playSfx(this.game, 'menu_confirm')
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
    drawText(fb, 'ARCHIVE', 8, 8)
    drawTextRight(fb, this.sort.toUpperCase(), 152, 8)
    for (let i = 0; i < VISIBLE; i++) {
      const row = this.scroll + i
      if (row > this.view.length) break
      const y = ROW_Y0 + i * ROW_H
      if (row === 0) {
        drawText(fb, 'DEPOSIT', LIST_X, y)
      } else {
        const k = s.archive[this.view[row - 1]!]
        if (k) {
          drawText(fb, kindraName(k), LIST_X, y)
          // Eggs keep their secrets on the shelf too: no level, no status.
          if (!isEgg(k)) {
            drawText(fb, `Lv${k.level}`, LIST_X, y + 8)
            const st = statusLabel(k)
            if (st) drawTextRight(fb, st, 80, y + 8)
          }
        }
      }
      if (row === this.cursor) fb.blit(UI_ART.cursor, PAL_UI, 8, y)
    }
    fb.fillRect(DIVIDER_X, ROW_Y0, 1, 112, PAL_UI, 3)
    const k = this.hovered()
    if (k) this.drawCard(fb, k)
    else if (s.archive.length === 0) this.drawEmpty(fb)
    drawText(fb, `KEPT ${s.archive.length}`, 8, FOOTER_Y)
    drawTextRight(fb, 'SEL:SORT', 152, FOOTER_Y)
  }

  /** The right pane: sprite, level, condition, types, HP — the at-a-glance card. Eggs stay veiled. */
  private drawCard(fb: FrameBuffer, k: Kindra): void {
    if (isEgg(k)) {
      // The shelf minds the shell: the egg's face and one banded tell.
      const egg = eggArtOf()
      fb.blit(egg.front, egg.palette, CARD_X + ((48 - egg.front.w) >> 1), 20 + (48 - egg.front.h))
      const lines = wrapText(str(eggTellKey(k))[0] ?? '', 8)
      for (let i = 0; i < lines.length; i++) {
        drawText(fb, lines[i]!, CARD_X, 76 + i * 10)
      }
      return
    }
    const sp = speciesOf(k.species)
    const art = monArtOf(k.species)
    fb.blit(art.front, art.palette, CARD_X + ((48 - art.front.w) >> 1), 20 + (48 - art.front.h))
    drawText(fb, `Lv${k.level}`, CARD_X, 72)
    const st = statusLabel(k)
    if (st) drawTextRight(fb, st, 152, 72)
    drawText(fb, sp.type1.toUpperCase(), CARD_X, 84)
    if (sp.type2) drawText(fb, sp.type2.toUpperCase(), CARD_X, 92)
    const max = statsOf(k).hp
    drawHpBar(fb, CARD_X, 104, 56, k.hp, max)
    drawTextRight(fb, `${padNum(k.hp, 3)}/${padNum(max, 3)}`, 152, 110)
  }

  /** An empty shelf: the card pane explains itself instead. */
  private drawEmpty(fb: FrameBuffer): void {
    const lines = wrapText(str('sys.archive.empty')[0] ?? '', 7)
    for (let i = 0; i < lines.length; i++) {
      drawText(fb, lines[i]!, CARD_X, 24 + i * 8)
    }
  }
}

/** A on the pinned DEPOSIT row: pick who rests. The last able member may never leave (D8). */
function* depositFlow(game: Game, scene: ArchiveScene): Task<void> {
  const s = game.state
  if (s.party.length <= 1) {
    // No pick could ever pass the guard — say why instead of opening a dead picker.
    yield* showText(game, str('sys.archive.last'))
    return
  }
  const idx = yield* openPartyScreen(game, 'select', {
    // Egg-aware deposit rule: whoever stays behind must include someone
    // ABLE — an egg (full HP, zero fight) may never be the member "left".
    // Eggs themselves may rest here: the shelf is stasis, and that's fine.
    canPick: (_k, i) => s.party.some((m, j) => j !== i && able(m)),
    footer: 'WHO WILL REST?',
  })
  if (idx < 0) return
  const k = s.party[idx]
  if (!k || !depositToArchive(s, idx)) return
  scene.refresh()
  yield* showText(game, str('sys.archive.deposit'), { KINDRA: kindraName(k) })
}

/** A on a real row: WITHDRAW / SWAP / SUMMARY / RELEASE (WITHDRAW drops away when the party is full). */
function* entryFlow(game: Game, scene: ArchiveScene, viewPos: number): Task<void> {
  const s = game.state
  const a = scene.view[viewPos]
  if (a === undefined) return
  const k = s.archive[a]
  if (!k) return
  const name = kindraName(k)
  // Eggs cannot be released — a promise is kept; their menu simply never offers it.
  const base = s.party.length >= PARTY_LIMIT
    ? ['SWAP', 'SUMMARY', 'RELEASE', 'CANCEL']
    : ['WITHDRAW', 'SWAP', 'SUMMARY', 'RELEASE', 'CANCEL']
  const options = isEgg(k) ? base.filter((o) => o !== 'RELEASE') : base
  const pick = yield* askChoice(game, options, { cancelIndex: options.length - 1 })
  switch (options[pick]) {
    case 'WITHDRAW': {
      if (!withdrawFromArchive(s, a)) {
        // Unreachable while the menu drops WITHDRAW at the limit; kept honest anyway.
        yield* showText(game, str('sys.archive.full'))
        return
      }
      scene.refresh()
      yield* showText(game, str('sys.archive.withdraw'), { KINDRA: name })
      return
    }
    case 'SWAP': {
      const idx = yield* openPartyScreen(game, 'select', {
        // The incomer arrives rested, so even the last able member may step
        // out — UNLESS the incomer is an egg: then someone able must stay,
        // or the swap would strand a party of shells and the fainted.
        canPick: isEgg(k)
          ? (_m, i) => s.party.some((m, j) => j !== i && able(m))
          : () => true,
        footer: 'SWAP WITH WHOM?',
      })
      if (idx < 0) return
      swapWithArchive(s, idx, a)
      scene.refresh()
      yield* showText(game, str('sys.archive.swap'), { KINDRA: name })
      return
    }
    case 'SUMMARY': {
      const settled = yield* openSummary(game, () => scene.viewList(), viewPos)
      scene.cursor = settled + 1
      return
    }
    case 'RELEASE': {
      // Twice, the second time by name — goodbyes deserve a deliberate hand.
      if ((yield* askConfirm(game, str('sys.archive.release.1'), ['YES', 'NO'], { cancelIndex: 1 })) !== 0) return
      const sure = yield* askConfirm(
        game, str('sys.archive.release.2'), ['YES', 'NO'], { cancelIndex: 1 }, { KINDRA: name },
      )
      if (sure !== 0) return
      releaseFromArchive(s, a)
      scene.refresh()
      yield* showText(game, str('sys.archive.release.bye'), { KINDRA: name })
      return
    }
    default:
      return
  }
}

/** Larch's Archive: the split screen, its action menus, and the farewell ritual. */
export function* openArchive(game: Game): Task<void> {
  const scene = new ArchiveScene(game)
  game.scenes.push(scene)
  try {
    for (;;) {
      scene.rearm()
      yield () => scene.done || scene.pick !== null
      if (scene.done) return
      const pick = scene.pick ?? 0
      if (pick === 0) yield* depositFlow(game, scene)
      else yield* entryFlow(game, scene, pick - 1)
    }
  } finally {
    game.scenes.pop()
  }
}
