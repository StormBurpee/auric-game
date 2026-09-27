/**
 * The professor's welcome: Larch on a soft plain backdrop, the world of
 * KINDRA in eight boxes, the name entry, and the hand-off into a fresh
 * save in the player's bedroom. (Mom's send-off downstairs is a map
 * event — the overworld owns it.)
 *
 * TitleScene's NEW GAME resets into `IntroScene`.
 */
import { fadeIn, fadeOut, SCREEN_H, SCREEN_W } from '../../engine'
import type { FrameBuffer, Handle, Scene, Task } from '../../engine'
import { CHAR_ART } from '../assets'
import { PAL_UI } from '../assets/palettes'
import { mapOf } from '../data/maps'
import { str } from '../data/strings'
import type { Game } from '../game'
import { newSave } from '../state'
import { openNameEntry, showText } from '../ui/widgets'
import { OverworldScene } from '../world/overworld'

/** Where the professor stands: centered, a little above the text box. */
const PROF_X = (SCREEN_W - 16) / 2
const PROF_Y = 44

export class IntroScene implements Scene {
  private run_: Handle | null = null

  constructor(private readonly game: Game) {}

  enter(): void {
    // The disarm hook lets the coroutine survive the scene swap IT initiates;
    // any other exit (debug jumps, future skips) still kills it cleanly.
    this.run_ = this.game.tasks.spawn(runIntro(this.game, () => (this.run_ = null)))
  }

  exit(): void {
    // The monologue dies with the scene — no zombie narrator.
    this.run_?.cancel()
  }

  update(): void {
    // The intro coroutine owns the pacing; dialogs capture input above us.
  }

  draw(fb: FrameBuffer): void {
    // A soft cream page with quiet margins — nothing to compete with Larch.
    fb.clear(PAL_UI, 0)
    fb.fillRect(0, 0, SCREEN_W, 4, PAL_UI, 1)
    fb.fillRect(0, SCREEN_H - 4, SCREEN_W, 4, PAL_UI, 1)
    const prof = CHAR_ART['PROF']
    if (prof) {
      fb.fillRect(PROF_X - 2, PROF_Y + 16, 20, 2, PAL_UI, 1)
      fb.blit(prof.down[0], prof.palette, PROF_X, PROF_Y)
    }
  }
}

/** Larch's monologue, the name entry, and the in-place rebirth of the save. */
export function* runIntro(game: Game, disarm?: () => void): Task<void> {
  yield* fadeIn(game.fb, 24)
  yield 20
  for (let box = 1; box <= 8; box++) {
    yield* showText(game, str(`story.intro.${box}`))
  }
  const name = yield* openNameEntry(game, 'STORM')
  yield* showText(game, str('story.intro.9'), { PLAYER: name })
  yield 10
  yield* fadeOut(game.fb, 24)

  // main.ts built Game around this exact state object, so a new game must
  // mutate it in place: clear every field, then refill from a fresh save.
  const live = game.state as unknown as Record<string, unknown>
  for (const key of Object.keys(live)) delete live[key]
  Object.assign(game.state, newSave(name))
  const spawn = mapOf('player_home').spawns['start']
  if (spawn) {
    game.state.pos = { map: 'player_home', x: spawn.x, y: spawn.y, facing: spawn.facing }
  }

  disarm?.()
  game.scenes.reset(new OverworldScene(game))
  yield* fadeIn(game.fb, 24)
}
