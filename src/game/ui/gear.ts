/**
 * The CHARM GEAR — Mom's gift and Ambervale's Pokegear: one full-screen
 * scene with three tabs, MAP / PHONE / JOURNAL, switched with left and
 * right (the GSC gesture). The shell owns the chrome (tab strip, footer)
 * and the B-closes discipline; each tab owns its list and raises picks
 * the coroutine runs OVER the Gear — calls and quest pages push
 * translucent scenes, so the tabs stay visible beneath, like dialogs
 * over the world. The Gear is a flag ('charm_gear'), not a bag item —
 * the Kindex precedent.
 */
import type { FrameBuffer, Scene, Task } from '../../engine'
import { pal } from '../../engine'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import type { ContactRow, QuestDef } from '../data/quests'
import type { Game } from '../game'
import { drawText, drawTextCenter } from './draw'
import { GearJournalTab, QuestDetailScene } from './gearJournal'
import { GearMapTab } from './gearMap'
import { callFlow, GearPhoneTab } from './gearPhone'
import { runScene } from './modal'
import { wrapIndex } from './nav'

/** What a tab hands the coroutine: a phone call or a quest detail page. */
export type GearPick =
  | { kind: 'call'; row: ContactRow }
  | { kind: 'quest'; quest: QuestDef }

/** One tab behind the strip. The shell consumes left/right and B first. */
export interface GearTab {
  /** Strip label, UPPERCASE. */
  readonly title: string
  /** Re-derive rows from the save (called on switch-in and after picks). */
  refresh(): void
  /** Per-tick input; may raise a pick (playing its own confirm sfx). */
  update(): GearPick | null
  /** Content area between the strip (y=16) and the footer rule (y=128). */
  draw(fb: FrameBuffer): void
  /** One ≤18-char line under the rule. */
  footer(): string
}

/** Tab label columns across the strip. */
const TAB_X = [8, 48, 96] as const
/** Inactive chrome speaks in the mid tone (ink index swapped down). */
const PAL_UI_DIM = pal('#f8f8f0', '#b0c0b0', '#506858', '#506858', { fixed: true })

export class GearScene implements Scene {
  readonly translucent = true
  done = false
  /** What the coroutine should run; null while browsing. */
  pick: GearPick | null = null
  private tab = 0
  private readonly tabs: readonly GearTab[]

  constructor(private readonly game: Game) {
    this.tabs = [new GearMapTab(game), new GearPhoneTab(game), new GearJournalTab(game)]
  }

  /** Re-arm for the next pick (a method, so TS keeps `pick` wide across the yield). */
  rearm(): void {
    this.pick = null
    this.tabs[this.tab]!.refresh()
  }

  update(): void {
    const input = this.game.input
    if (input.pressed('left') || input.pressed('right')) {
      this.tab = wrapIndex(this.tab + (input.pressed('right') ? 1 : -1), this.tabs.length)
      this.tabs[this.tab]!.refresh()
      playSfx(this.game, 'menu_move')
      return
    }
    if (input.pressed('b')) {
      this.done = true
      playSfx(this.game, 'menu_cancel')
      return
    }
    this.pick = this.tabs[this.tab]!.update()
  }

  draw(fb: FrameBuffer): void {
    fb.fillRect(0, 0, 160, 144, PAL_UI, 0)
    drawText(fb, '<', 0, 4, PAL_UI_DIM)
    drawText(fb, '>', 152, 4, PAL_UI_DIM)
    for (let i = 0; i < this.tabs.length; i++) {
      const tab = this.tabs[i]!
      drawText(fb, tab.title, TAB_X[i]!, 4, i === this.tab ? PAL_UI : PAL_UI_DIM)
      if (i === this.tab) fb.fillRect(TAB_X[i]!, 12, tab.title.length * 8, 1, PAL_UI, 3)
    }
    fb.fillRect(0, 15, 160, 1, PAL_UI, 3)
    this.tabs[this.tab]!.draw(fb)
    fb.fillRect(0, 128, 160, 1, PAL_UI, 3)
    drawTextCenter(fb, this.tabs[this.tab]!.footer(), 80, 133)
  }
}

/** The full Gear flow: tabs, calls and quest pages over them, B backs out. */
export function* openGear(game: Game): Task<void> {
  const scene = new GearScene(game)
  game.scenes.push(scene)
  try {
    for (;;) {
      scene.rearm()
      yield () => scene.done || scene.pick !== null
      if (scene.done) return
      const pick = scene.pick
      if (!pick) continue
      if (pick.kind === 'call') yield* callFlow(game, pick.row)
      else yield* runScene(game, new QuestDetailScene(game, pick.quest))
    }
  } finally {
    game.scenes.pop()
  }
}
