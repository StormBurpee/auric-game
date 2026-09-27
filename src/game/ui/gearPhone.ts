/**
 * The Gear's PHONE tab and the call flow. Contacts are derived flags
 * (data/quests.ts contactList — D5): no new save arrays. A call rings,
 * then speaks one line resolved by phoneStatus: rotating dayStamp
 * flavor for MOM/LARCH, a rematch offer / armed reminder / spent sigh
 * for trainers. Accepting an offer arms `challenge_<key>`; the BATTLE
 * happens later, on talk, out on the trail — never over the phone and
 * never by ambush.
 */
import type { FrameBuffer, Task } from '../../engine'
import { UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import { dayStamp } from '../clock'
import { contactList, phonePrefix, phoneStatus } from '../data/quests'
import type { CallCtx, ContactRow } from '../data/quests'
import { str } from '../data/strings'
import type { Game } from '../game'
import { setFlag } from '../state'
import type { TrainerDef } from '../types'
import { askConfirm } from './choice'
import { showText } from './dialog'
import { drawText, drawTextRight } from './draw'
import type { GearPick, GearTab } from './gear'
import { PadRepeat, wrapIndex } from './nav'

const LIST_Y = 24
const ROW_H = 12

export class GearPhoneTab implements GearTab {
  readonly title = 'PHONE'
  private rows: ContactRow[] = []
  private cursor = 0
  private readonly pad = new PadRepeat()

  constructor(private readonly game: Game) {
    this.refresh()
  }

  refresh(): void {
    this.rows = contactList(this.game.state)
    if (this.cursor >= this.rows.length) this.cursor = Math.max(0, this.rows.length - 1)
  }

  update(): GearPick | null {
    const input = this.game.input
    const dir = this.pad.step(input)
    if ((dir === 'up' || dir === 'down') && this.rows.length > 1) {
      this.cursor = wrapIndex(this.cursor + (dir === 'down' ? 1 : -1), this.rows.length)
      playSfx(this.game, 'menu_move')
      return null
    }
    if (input.pressed('a') && this.rows.length > 0) {
      playSfx(this.game, 'menu_confirm')
      return { kind: 'call', row: this.rows[this.cursor]! }
    }
    return null
  }

  draw(fb: FrameBuffer): void {
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!
      const y = LIST_Y + i * ROW_H
      drawText(fb, row.name, 16, y)
      drawTextRight(fb, row.place, 152, y)
      if (i === this.cursor) fb.blit(UI_ART.cursor, PAL_UI, 4, y)
    }
  }

  footer(): string {
    return this.rows.length === 1 ? '1 CONTACT' : `${this.rows.length} CONTACTS`
  }
}

/** When this call happens — period/day/weekstamp, debug overrides honoured. */
export function callCtx(game: Game): CallCtx {
  return { period: game.period(), dow: game.day(), dayStamp: dayStamp() }
}

/** Ticks between the ring blips — fixed count, seeded-replay safe. */
const RING_GAP = 10
const RINGS = 3

/**
 * One phone call, played over the Gear (TextBoxScene is translucent, so
 * the tabs stay visible beneath). `registry` is injectable for tests.
 */
export function* callFlow(
  game: Game,
  row: ContactRow,
  registry?: Record<string, TrainerDef>,
): Task<void> {
  for (let i = 0; i < RINGS; i++) {
    playSfx(game, 'text_blip')
    yield RING_GAP
  }
  const status = phoneStatus(game.state, row, callCtx(game), registry)
  switch (status.kind) {
    case 'offer': {
      const pick = yield* askConfirm(
        game,
        str(status.key),
        ['YES', 'NO'],
        { cancelIndex: 1 },
        { NAME: row.name },
      )
      if (pick !== 0) return
      setFlag(game.state, 'challenge_' + row.key)
      yield* showText(game, str(phonePrefix(row) + '.armed'), { NAME: row.name })
      return
    }
    case 'spent':
      // A spent ladder keeps no stale challenge around (save hygiene).
      setFlag(game.state, 'challenge_' + row.key, false)
      yield* showText(game, str(status.key), { NAME: row.name })
      return
    default:
      // 'flavor' and 'armed' both just speak their line.
      yield* showText(game, str(status.key), { NAME: row.name })
  }
}
