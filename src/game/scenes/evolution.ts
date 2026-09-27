/**
 * The change: silhouette pulses, the shape becomes someone new, the
 * fanfare plays. Checked after battles and ground exp; offered stones
 * and the LINK CORD by the bag (runItemEvolution); B cancels
 * (the classic mercy).
 *
 */
import { fadeIn, fadeOut, pal, SCREEN_W } from '../../engine'
import type { FrameBuffer, Scene, Task } from '../../engine'
import { monArtOf } from '../assets'
import { PAL_UI_INK } from '../assets/palettes'
import { playSfx, playSong } from '../audio'
import { itemOf, speciesOf } from '../data'
import { str } from '../data/strings'
import type { Game } from '../game'
import { matchEvolution, maxHpOf } from '../kindra'
import type { EvoTrigger } from '../kindra'
import { markCaught } from '../state'
import type { Kindra } from '../types'
import { kindraName } from '../ui/format'
import { showText } from '../ui/widgets'

/** Every ink slot near-black: the creature as a shadow of itself. */
const PAL_EVO_SHADOW = pal('#000000', '#181c28', '#181c28', '#181c28', { fixed: true })

/** Feet stand here, above the dialog's bottom 48px; forms grow upward. */
const BASELINE_Y = 80
const FLOOR_Y = 82

/** The whole pulse lasts three seconds; B anywhere inside it cancels. */
const PULSE_TICKS = 180
/** Phase length starts here and tightens by 3 ticks every stage (the acceleration). */
const PHASE_START = 18
const PHASE_MIN = 3
const STAGE_TICKS = 30

/** The white bloom that hides the moment of change. */
const BLOOM_IN = 12
const BLOOM_HOLD = 8
const BLOOM_OUT = 20

/** Run evolution ceremonies for every party member with pendingEvo set (completion flags ignored here). */
export function* runEvolutionCheck(game: Game): Task<void> {
  for (const k of game.state.party) {
    if (k.pendingEvo) yield* ceremony(game, k)
  }
}

/**
 * The bag's entry: a stone or LINK CORD offered to one Kindra. The rule
 * list decides — 'none' means no rule answers (the bag shows
 * sys.evo.stone.none and keeps the item), 'cancelled' means B stopped
 * the pulse (the bag refunds the item — Gen 2 ate your stone; we
 * don't), 'done' means the change completed and the item is spent.
 */
export function* runItemEvolution(
  game: Game,
  k: Kindra,
  itemKey: string,
): Task<'done' | 'cancelled' | 'none'> {
  const fx = itemOf(itemKey).effect
  const trigger: EvoTrigger | null =
    fx.kind === 'stone' ? { kind: 'stone', item: itemKey }
    : fx.kind === 'link' ? { kind: 'link' }
    : null
  const into = trigger && matchEvolution(speciesOf(k.species).evolution, trigger)
  if (!into) return 'none'
  k.pendingEvo = into
  return (yield* ceremony(game, k)) ? 'done' : 'cancelled'
}

/** A dark stage for one creature; the ceremony coroutine owns all pacing. */
class EvolutionScene implements Scene {
  /** While true the creature draws all-dark — the pulse's off-beat. */
  silhouette = false

  constructor(private readonly k: Kindra) {}

  update(): void {
    // The ceremony coroutine drives; dialogs capture input above us.
  }

  draw(fb: FrameBuffer): void {
    // The ceremony is studio-lit; the overworld restores the live period in its own draw.
    fb.setPeriod('day')
    fb.clear(PAL_UI_INK, 0)
    fb.fillRect(0, FLOOR_Y, SCREEN_W, 1, PAL_EVO_SHADOW, 1)
    const art = monArtOf(this.k.species)
    const x = Math.floor((SCREEN_W - art.front.w) / 2)
    fb.blit(art.front, this.silhouette ? PAL_EVO_SHADOW : art.palette, x, BASELINE_Y - art.front.h)
  }
}

/**
 * One creature's change, MECHANICS §13: the announcement, the
 * accelerating pulse (B cancels — pendingEvo clears and exp.ts re-marks
 * it on the next level-up), then the swap under a white bloom. Genes,
 * statExp, level, exp and nickname all survive; current HP rises by the
 * max-HP delta; the new form joins the Kindex as seen and caught.
 * @returns true if the change completed, false if B cancelled it —
 * runItemEvolution turns that into the stone refund.
 */
function* ceremony(game: Game, k: Kindra): Task<boolean> {
  const into = k.pendingEvo!
  const scene = new EvolutionScene(k)
  let evolved = false
  yield* fadeOut(game.fb, 12)
  game.scenes.push(scene)
  try {
    yield* fadeIn(game.fb, 12)
    playSong(game, 'evolution', { restart: true })
    yield* showText(game, str('sys.evo.start'), { KINDRA: kindraName(k) })

    if (yield* pulse(game, scene)) {
      scene.silhouette = false
      delete k.pendingEvo
      playSfx(game, 'menu_cancel')
      yield* showText(game, str('sys.evo.cancel'), { KINDRA: kindraName(k) })
    } else {
      evolved = true
      const wasName = kindraName(k)
      const oldMax = maxHpOf(k)
      // Build to white, become someone new at the peak, let the light decay.
      for (let i = 1; i <= BLOOM_IN; i++) {
        game.fb.flash = i / BLOOM_IN
        yield 1
      }
      scene.silhouette = false
      k.species = into
      delete k.pendingEvo
      yield BLOOM_HOLD
      for (let i = BLOOM_OUT - 1; i >= 0; i--) {
        game.fb.flash = i / BLOOM_OUT
        yield 1
      }
      const newMax = maxHpOf(k)
      // currentHP += maxHP delta (§13); a standing creature never drops below 1.
      k.hp = Math.min(newMax, Math.max(k.hp > 0 ? 1 : 0, k.hp + newMax - oldMax))
      markCaught(game.state, into) // seen and caught in one stroke
      playSfx(game, 'levelup')
      yield* showText(game, str('sys.evo.done'), { KINDRA: wasName, KINDRA2: into })
    }
    yield* fadeOut(game.fb, 12)
  } finally {
    game.fb.flash = 0
    if (game.scenes.top === scene) game.scenes.pop()
  }
  yield* fadeIn(game.fb, 12)
  return evolved
}

/** The accelerating silhouette pulse. @returns true if B cancelled it. */
function* pulse(game: Game, scene: EvolutionScene): Task<boolean> {
  let nextFlip = 0
  for (let t = 0; t < PULSE_TICKS; t++) {
    if (t >= nextFlip) {
      scene.silhouette = !scene.silhouette
      nextFlip = t + Math.max(PHASE_MIN, PHASE_START - 3 * Math.floor(t / STAGE_TICKS))
    }
    if (game.input.pressed('b')) return true
    yield 1
  }
  return false
}
