/**
 * The first thing the player sees: a starfield over the amber earth,
 * the AURIC wordmark in gold, the dawn stag, PRESS START — then the
 * CONTINUE / NEW GAME choice that hands off into the overworld or
 * Larch's welcome.
 *
 * main.ts boots into `new TitleScene(game)`.
 */
import { fadeIn, fadeOut, pal, Rng, SCREEN_H, SCREEN_W } from '../../engine'
import type { FrameBuffer, Handle, Scene, Task } from '../../engine'
import { TITLE_ART } from '../assets'
import { FONT_W } from '../assets/font'
import { PAL_TITLE_GOLD } from '../assets/palettes'
import { playSfx, playSong } from '../audio'
import type { Game } from '../game'
import type { SaveData } from '../types'
import { askChoice, drawText } from '../ui/widgets'
import { OverworldScene } from '../world/overworld'
import { IntroScene } from './intro'

// ── The night sky ────────────────────────────────────────────────────────────
/** Sky bands, dark zenith down to a pale pre-dawn horizon; fixed so the clock can't tint them. */
const PAL_NIGHT_SKY = pal('#0c1024', '#1c2850', '#36488c', '#8090cc', { fixed: true })
/** drawText inks with index 3: pale gold for PRESS START, white for star cores. */
const PAL_GOLD_INK = pal('#000000', '#000000', '#000000', '#f8e060', { fixed: true })
const PAL_WHITE_INK = pal('#000000', '#000000', '#000000', '#f8f8f0', { fixed: true })

/** Band tops, zenith to ground; the thin index-3 line at the horizon is the coming dawn. */
const MID_SKY_Y = 84
const LOW_SKY_Y = 110
const HORIZON_Y = 126
const GROUND_Y = 128

// ── Layout ───────────────────────────────────────────────────────────────────
const LOGO_Y = 12
/** Air between the wordmark's last row and the stag. */
const EMBLEM_GAP = 8
const PRESS_START_Y = 133
const PRESS_START = 'PRESS START'
/** Blink rhythm of PRESS START: visible 40 of every 64 ticks. */
const BLINK_PERIOD = 64
const BLINK_ON = 40

interface Star {
  x: number
  y: number
  /** Offset into the twinkle cycle so the sky never blinks in unison. */
  phase: number
}

/** One cycle of a star's life: a short rest, a long dim glow, a bright wink. */
const TWINKLE_PERIOD = 128
const TWINKLE_REST = 16
const TWINKLE_WINK = 104

// A fixed constellation: module-seeded Rng keeps it identical every boot
// without touching the game's own replayable stream.
const starRng = new Rng(0x41555249)
const STARS: Star[] = Array.from({ length: 28 }, () => ({
  x: 2 + starRng.int(SCREEN_W - 4),
  y: 4 + starRng.int(96),
  phase: starRng.int(TWINKLE_PERIOD),
}))

export class TitleScene implements Scene {
  /** 'press' blinks the invitation; 'menu' hands the bottom of the screen to the choice. */
  private mode: 'press' | 'menu' = 'press'
  private run_: Handle | null = null

  constructor(private readonly game: Game) {}

  enter(): void {
    this.run_ = this.game.tasks.spawn(this.run())
  }

  exit(): void {
    // A scene's coroutine dies with the scene — no zombie waiting for A.
    this.run_?.cancel()
  }

  update(): void {
    // The title coroutine owns the pacing; the choice menu captures input above us.
  }

  draw(fb: FrameBuffer): void {
    fb.clear(PAL_NIGHT_SKY, 0)
    fb.fillRect(0, MID_SKY_Y, SCREEN_W, GROUND_Y - MID_SKY_Y, PAL_NIGHT_SKY, 1)
    fb.fillRect(0, LOW_SKY_Y, SCREEN_W, GROUND_Y - LOW_SKY_Y, PAL_NIGHT_SKY, 2)
    fb.fillRect(0, HORIZON_Y, SCREEN_W, GROUND_Y - HORIZON_Y, PAL_NIGHT_SKY, 3)
    fb.fillRect(0, GROUND_Y, SCREEN_W, SCREEN_H - GROUND_Y, PAL_TITLE_GOLD, 3)
    this.drawStars(fb)

    const logo = TITLE_ART.logo
    fb.blit(logo, PAL_TITLE_GOLD, Math.floor((SCREEN_W - logo.w) / 2), LOGO_Y)
    const emblem = TITLE_ART.emblem
    fb.blit(
      emblem,
      TITLE_ART.emblemPalette,
      Math.floor((SCREEN_W - emblem.w) / 2),
      LOGO_Y + logo.h + EMBLEM_GAP,
    )

    if (this.mode === 'press' && this.game.frames % BLINK_PERIOD < BLINK_ON) {
      const x = Math.floor((SCREEN_W - PRESS_START.length * FONT_W) / 2)
      drawText(fb, PRESS_START, x, PRESS_START_Y, PAL_GOLD_INK)
    }
  }

  private drawStars(fb: FrameBuffer): void {
    for (const s of STARS) {
      const tw = (this.game.frames + s.phase) % TWINKLE_PERIOD
      if (tw < TWINKLE_REST) continue
      if (tw >= TWINKLE_WINK) {
        // The bright wink: a white core with four pale arms.
        fb.fillRect(s.x, s.y, 1, 1, PAL_WHITE_INK, 3)
        fb.fillRect(s.x - 1, s.y, 1, 1, PAL_NIGHT_SKY, 3)
        fb.fillRect(s.x + 1, s.y, 1, 1, PAL_NIGHT_SKY, 3)
        fb.fillRect(s.x, s.y - 1, 1, 1, PAL_NIGHT_SKY, 3)
        fb.fillRect(s.x, s.y + 1, 1, 1, PAL_NIGHT_SKY, 3)
      } else {
        fb.fillRect(s.x, s.y, 1, 1, PAL_NIGHT_SKY, 3)
      }
    }
  }

  /** Song, starfield, START, the choice — and the hand-off out of the title. */
  private *run(): Task<void> {
    const game = this.game
    playSong(game, 'title')
    yield* fadeIn(game.fb, 32)
    for (;;) {
      this.mode = 'press'
      yield () => game.input.pressed('start') || game.input.pressed('a')
      playSfx(game, 'menu_confirm')
      this.mode = 'menu'
      yield 1 // let the confirming press settle so the menu only sees fresh edges
      const hasSave = game.save.exists()
      const options = hasSave ? ['CONTINUE', 'NEW GAME'] : ['NEW GAME']
      const pick = yield* askChoice(game, options, { cancelIndex: -1 })
      if (pick < 0) continue // B backs out to the starfield

      if (hasSave && pick === 0) {
        const loaded = game.save.load()
        if (!loaded) continue // unreadable envelope: stay on the title rather than lie
        yield* fadeOut(game.fb, 24)
        adoptSave(game, loaded)
        this.run_ = null // this swap is ours — exit() must not cancel us mid-fade
        game.scenes.reset(new OverworldScene(game))
        yield* fadeIn(game.fb, 24)
        return
      }

      yield* fadeOut(game.fb, 24)
      this.run_ = null // ditto: the hand-off into the intro is deliberate
      game.scenes.reset(new IntroScene(game))
      return // IntroScene fades itself back in
    }
  }
}

/**
 * main.ts built Game around one SaveData object and every module holds
 * that reference, so loading must refill it in place — the mirror of the
 * intro's new-game rebirth.
 */
function adoptSave(game: Game, loaded: SaveData): void {
  const live = game.state as unknown as Record<string, unknown>
  for (const key of Object.keys(live)) delete live[key]
  Object.assign(game.state, loaded)
}
