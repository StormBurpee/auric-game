/**
 * The Gear's JOURNAL tab: the quest log 1999 couldn't afford (D6).
 * Quests are pure projections of flags the world already writes —
 * data/quests.ts derives everything on open, so old saves back-fill
 * and nothing here mutates. The list shows visible quests, actives
 * first and completes sunk with a dot; A opens the detail page with
 * the current stage's text (or the epilogue, once done).
 */
import type { FrameBuffer } from '../../engine'
import { UI_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import { journalRows, questView } from '../data/quests'
import type { JournalRow, QuestDef } from '../data/quests'
import { str } from '../data/strings'
import type { Game } from '../game'
import { drawText, drawTextCenter } from './draw'
import { interpolate, wrapText } from './format'
import type { GearPick, GearTab } from './gear'
import type { ModalScene } from './modal'
import { PadRepeat, wrapIndex } from './nav'

const LIST_Y = 24
const ROW_H = 12

export class GearJournalTab implements GearTab {
  readonly title = 'JOURNAL'
  private rows: JournalRow[] = []
  private cursor = 0
  private readonly pad = new PadRepeat()

  constructor(private readonly game: Game) {
    this.refresh()
  }

  refresh(): void {
    this.rows = journalRows(this.game.state)
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
      return { kind: 'quest', quest: this.rows[this.cursor]!.quest }
    }
    return null
  }

  draw(fb: FrameBuffer): void {
    if (this.rows.length === 0) {
      drawTextCenter(fb, 'NO ENTRIES YET', 80, 64)
      return
    }
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!
      const y = LIST_Y + i * ROW_H
      drawText(fb, row.quest.title, 16, y)
      if (row.view.complete) drawText(fb, '•', 148, y)
      if (i === this.cursor) fb.blit(UI_ART.cursor, PAL_UI, 4, y)
    }
  }

  footer(): string {
    const done = this.rows.filter((r) => r.view.complete).length
    return `${done}/${this.rows.length} DONE`
  }
}

/** The detail page: title, STAGE n/m, and the stage text. A or B closes. */
export class QuestDetailScene implements ModalScene {
  readonly translucent = true
  done = false

  constructor(
    private readonly game: Game,
    private readonly quest: QuestDef,
  ) {}

  update(): void {
    const input = this.game.input
    if (input.pressed('a') || input.pressed('b')) {
      this.done = true
      playSfx(this.game, 'menu_cancel')
    }
  }

  draw(fb: FrameBuffer): void {
    fb.fillRect(0, 0, 160, 144, PAL_UI, 0)
    const view = questView(this.game.state, this.quest)
    drawTextCenter(fb, this.quest.title, 80, 8)
    const status = view.complete
      ? 'COMPLETE'
      : `STAGE ${view.stage + 1}/${this.quest.stages.length}`
    drawTextCenter(fb, status, 80, 20)
    fb.fillRect(8, 30, 144, 1, PAL_UI, 3)
    const key = view.complete
      ? this.quest.epilogue
      : this.quest.stages[Math.min(view.stage, this.quest.stages.length - 1)]!.desc
    const text = interpolate(this.game, str(key).join(' ').replace(/\n/g, ' '))
    const lines = wrapText(text)
    for (let i = 0; i < lines.length && i < 10; i++) {
      drawText(fb, lines[i]!, 8, 38 + i * 10)
    }
  }
}
