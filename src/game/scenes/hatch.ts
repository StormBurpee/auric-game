/**
 * The birth: the egg rocks, rocks faster, blooms white — and someone
 * small is standing there. The ceremony mirrors the evolution scene's
 * staging (dark stage, accelerating pulse, white bloom) with one
 * deliberate difference: there is NO B-cancel anywhere in it. A birth
 * is not a decision.
 *
 * The overworld calls runHatch for each carried egg whose counter
 * reached zero (the onPlayerArrived hook); the egg's
 * genes, moves and species were locked when it was laid (kindra.ts
 * makeEgg), so hatching is one field deletion plus the warm numbers.
 *
 */
import { fadeIn, fadeOut, pal, SCREEN_W } from '../../engine'
import type { FrameBuffer, Scene, Task } from '../../engine'
import { monArtOf } from '../assets'
import { PAL_UI_INK } from '../assets/palettes'
import { playSfx, playSong } from '../audio'
import { mapOf } from '../data/maps'
import { str } from '../data/strings'
import type { Game } from '../game'
import { hatch, isEgg } from '../kindra'
import { markCaught } from '../state'
import type { Kindra } from '../types'
import { eggArtOf } from '../ui/party'
import { kindraName } from '../ui/format'
import { showText } from '../ui/widgets'

/** Every ink slot near-black: the stage floor's shadow line (evolution.ts's shade). */
const PAL_HATCH_SHADOW = pal('#000000', '#181c28', '#181c28', '#181c28', { fixed: true })

/** Feet (and shell) stand here, above the dialog's bottom 48px. */
const BASELINE_Y = 80
const FLOOR_Y = 82

/** Three rocking bursts, each quicker than the last — the acceleration of a small impatience. */
const WOBBLE_BURSTS = 3
/** Ticks of rocking per burst. */
const WOBBLE_TICKS = 36
/** Stillness between bursts (the held breath). */
const WOBBLE_REST = 26
/** Ticks per rock flip in the first burst; each burst flips this much faster. */
const WOBBLE_PERIOD_START = 10
const WOBBLE_PERIOD_STEP = 3
const WOBBLE_PERIOD_MIN = 2

/** The white bloom that hides the moment of birth (evolution.ts's exact envelope). */
const BLOOM_IN = 12
const BLOOM_HOLD = 8
const BLOOM_OUT = 20

/** A dark stage for one shell; the ceremony coroutine owns all pacing. */
class HatchScene implements Scene {
  /** The egg's horizontal rock in pixels; the ceremony drives it. */
  shake = 0
  /** After the bloom the newborn stands where the egg sat. */
  hatched = false

  constructor(private readonly k: Kindra) {}

  update(): void {
    // The ceremony coroutine drives; dialogs capture input above us.
  }

  draw(fb: FrameBuffer): void {
    // Studio-lit like the evolution stage; the overworld restores the live period.
    fb.setPeriod('day')
    fb.clear(PAL_UI_INK, 0)
    fb.fillRect(0, FLOOR_Y, SCREEN_W, 1, PAL_HATCH_SHADOW, 1)
    if (this.hatched) {
      const art = monArtOf(this.k.species)
      fb.blit(art.front, art.palette, Math.floor((SCREEN_W - art.front.w) / 2), BASELINE_Y - art.front.h)
    } else {
      const egg = eggArtOf()
      const x = Math.floor((SCREEN_W - egg.front.w) / 2) + this.shake
      fb.blit(egg.front, egg.palette, x, BASELINE_Y - egg.front.h)
    }
  }
}

/**
 * One egg's hatching, end to end: the 'Oh?' beat, three accelerating
 * wobble bursts (no input is read — no cancel exists), the white bloom
 * under which hatch() fires (level 5, bond 120, full HP) and the
 * newborn joins the Kindex as seen and caught, then the reveal line.
 * Safe to call only with an egg; anything else returns untouched.
 */
export function* runHatch(game: Game, k: Kindra): Task<void> {
  if (!isEgg(k)) return
  const scene = new HatchScene(k)
  yield* fadeOut(game.fb, 12)
  game.scenes.push(scene)
  try {
    yield* fadeIn(game.fb, 12)
    playSong(game, 'evolution', { restart: true })
    yield* showText(game, str('sys.hatch.oh'))

    yield* wobble(scene, game)

    // Build to white, be born at the peak, let the light decay.
    for (let i = 1; i <= BLOOM_IN; i++) {
      game.fb.flash = i / BLOOM_IN
      yield 1
    }
    scene.shake = 0
    hatch(k)
    scene.hatched = true
    markCaught(game.state, k.species) // seen and caught in one first breath
    yield BLOOM_HOLD
    for (let i = BLOOM_OUT - 1; i >= 0; i--) {
      game.fb.flash = i / BLOOM_OUT
      yield 1
    }
    playSfx(game, 'levelup')
    yield* showText(game, str('sys.hatch.done'), { KINDRA: kindraName(k) })
    yield* fadeOut(game.fb, 12)
  } finally {
    game.fb.flash = 0
    if (game.scenes.top === scene) game.scenes.pop()
    // The ceremony borrowed the speakers; give the map its song back.
    playSong(game, mapOf(game.state.pos.map).music)
  }
  yield* fadeIn(game.fb, 12)
}

/**
 * The three rocking bursts. Fixed tick counts and zero input reads —
 * deterministic under seed replay, uncancellable by design.
 */
function* wobble(scene: HatchScene, game: Game): Task<void> {
  for (let burst = 0; burst < WOBBLE_BURSTS; burst++) {
    const period = Math.max(WOBBLE_PERIOD_MIN, WOBBLE_PERIOD_START - WOBBLE_PERIOD_STEP * burst)
    playSfx(game, 'bump')
    let nextFlip = 0
    for (let t = 0; t < WOBBLE_TICKS; t++) {
      if (t >= nextFlip) {
        scene.shake = scene.shake === 1 ? -1 : 1
        nextFlip = t + period
      }
      yield 1
    }
    scene.shake = 0
    yield WOBBLE_REST
  }
}
