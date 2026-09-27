/**
 * The "to be continued" roll after the Zephyr Badge — six quiet boxes
 * over slow music, then back to the world.
 *
 * The gym event script calls this.
 */
import { fadeIn, fadeOut, pal, SCREEN_H, SCREEN_W } from '../../engine'
import type { FrameBuffer, Palette, Scene, Task } from '../../engine'
import { TITLE_ART } from '../assets'
import { FONT_H, FONT_W } from '../assets/font'
import { PAL_UI_INK } from '../assets/palettes'
import { playSong } from '../audio'
import { mapOf } from '../data/maps'
import { str } from '../data/strings'
import type { Game } from '../game'
import { interpolate } from '../ui/format'
import { drawText } from '../ui/widgets'

/** drawText inks with index 3: white for the roll, gold for the bookends. */
const PAL_CREDITS_INK = pal('#000000', '#000000', '#000000', '#f8f8f0', { fixed: true })
const PAL_CREDITS_GOLD = pal('#000000', '#000000', '#000000', '#f8e060', { fixed: true })

/** Where the dawn stag stands during the closing beat. */
const EMBLEM_Y = 24
/** Air between the emblem's last row and the card beneath it. */
const EMBLEM_TEXT_GAP = 16
/** Card lines breathe a little wider than the raw 8px font. */
const LINE_SPACING = 12

// The pacing of the roll, in ticks (60/s). Slow on purpose.
const FADE_TICKS = 32
/** Each of the five cards holds this long... */
const CARD_TICKS = 168
/** ...with this much black between them. */
const GAP_TICKS = 24
/** The emblem stands alone this long before the last words join it. */
const EMBLEM_TICKS = 110
/** TO BE CONTINUED... lingers. */
const FINAL_TICKS = 280
/** The roll's own exit is the slowest fade in the game. */
const FADE_OUT_TICKS = 48

interface CreditLine {
  text: string
  pal: Palette
}

/** A black page that shows one card at a time, plus the closing emblem. */
class CreditsScene implements Scene {
  /** The card currently on screen; null between cards. */
  card: CreditLine[] | null = null
  /** The dawn stag joins for the closing beat. */
  emblem = false

  update(): void {
    // runCredits owns all pacing.
  }

  draw(fb: FrameBuffer): void {
    fb.clear(PAL_UI_INK, 0)
    let top = 0
    if (this.emblem) {
      const emblem = TITLE_ART.emblem
      fb.blit(emblem, TITLE_ART.emblemPalette, Math.floor((SCREEN_W - emblem.w) / 2), EMBLEM_Y)
      top = EMBLEM_Y + emblem.h + EMBLEM_TEXT_GAP
    }
    const card = this.card
    if (!card) return
    if (!this.emblem) {
      const height = card.length * LINE_SPACING - (LINE_SPACING - FONT_H)
      top = Math.floor((SCREEN_H - height) / 2)
    }
    for (let i = 0; i < card.length; i++) {
      const line = card[i]!
      const x = Math.floor((SCREEN_W - line.text.length * FONT_W) / 2)
      drawText(fb, line.text, x, top + i * LINE_SPACING, line.pal)
    }
  }
}

/** story.credits.N as centered lines: 'AURIC' and the sequel hook print in gold. */
function cardOf(game: Game, n: number): CreditLine[] {
  const text = interpolate(game, str(`story.credits.${n}`).join('\n'))
  return text.split('\n').map((line, i) => ({
    text: line,
    pal: n === 6 || (n === 1 && i === 0) ? PAL_CREDITS_GOLD : PAL_CREDITS_INK,
  }))
}

/** STORY.md §11: fade to black, six boxes over the title theme, the stag, fade back. */
export function* runCredits(game: Game): Task<void> {
  const scene = new CreditsScene()
  yield* fadeOut(game.fb, FADE_TICKS)
  game.scenes.push(scene)
  try {
    playSong(game, 'title', { restart: true })
    yield* fadeIn(game.fb, FADE_TICKS)
    for (let n = 1; n <= 5; n++) {
      scene.card = cardOf(game, n)
      yield CARD_TICKS
      scene.card = null
      yield GAP_TICKS
    }
    scene.emblem = true
    yield EMBLEM_TICKS
    scene.card = cardOf(game, 6)
    yield FINAL_TICKS
    yield* fadeOut(game.fb, FADE_OUT_TICKS)
  } finally {
    if (game.scenes.top === scene) game.scenes.pop()
  }
  // Hand the airwaves back to wherever the player is standing; the caller resumes.
  playSong(game, mapOf(game.state.pos.map).music)
  yield* fadeIn(game.fb, FADE_TICKS)
}
