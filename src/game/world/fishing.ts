/**
 * The patient art (Tier 2 fishing): the pure pieces the overworld's cast
 * dispatcher builds on — intent for an A-press at the water's edge, the
 * rod-in-bag check, the suspense-dot cadence, and the translucent
 * CastScene that types the dots. The bite dice live in encounters.ts
 * beside the other wild rolls; the tasks that drive a cast live in
 * overworld.ts (they own the scene's modality and the '!' window).
 */
import type { FrameBuffer, Scene } from '../../engine'
import { ITEMS } from '../data'
import type { Item } from '../types'
import { drawFrame, drawText } from '../ui/widgets'

/** Suspense dots per cast — FIXED at 3, never rng-flavored (seed-replay discipline). */
export const CAST_DOTS = 3
/** Ticks each suspense dot hangs before the next (the HEW crumble cadence). */
export const CAST_DOT_TICKS = 24
/** Ticks the player has to hook a bite (~0.75 s — generous for kids; Gen 2 was ~30). */
export const BITE_WINDOW_TICKS = 45

/** What an A-press facing water means once a rod can be in the picture. */
export type WaterIntent = 'waveride' | 'fish' | 'ask'

/**
 * Dispatch for A-on-water (tier2-fishing.md F4): a rod alone casts on
 * the spot — a rod is the player's own hands, no partner, no badge, no
 * prompt. Rod + WAVERIDE partner asks intent once. No rod falls through
 * to the existing WAVERIDE flow untouched (it owns its flavor lines).
 */
export function waterIntent(hasRod: boolean, hasPartner: boolean): WaterIntent {
  if (!hasRod) return 'waveride'
  return hasPartner ? 'ask' : 'fish'
}

/** True when any bag slot holds a rod-kind item (the OLD ROD; tiers welcome later). */
export function hasRod(bag: Record<string, number>, items: Record<string, Item> = ITEMS): boolean {
  for (const [key, qty] of Object.entries(bag)) {
    if (qty > 0 && items[key]?.effect.kind === 'rod') return true
  }
  return false
}

/** The dots type along the dialog frame's first line (ui/dialog.ts geometry). */
const LINE_X = 8
const LINE_Y = 104

/**
 * Translucent, draw-only: the standard bottom frame accumulating
 * '. . .' while the line sits in the water. The cast task owns the
 * pacing — it pushes the scene, sets `dots` as the suspense builds,
 * and pops it before the bite (or the silence) speaks.
 */
export class CastScene implements Scene {
  readonly translucent = true
  /** Dots shown so far, 0..CAST_DOTS; written by the cast task. */
  dots = 0

  update(): void {
    // Draw-only: the world beneath holds its breath (starved update), and
    // the cast task — not this scene — reads the player's input.
  }

  draw(fb: FrameBuffer): void {
    drawFrame(fb, 0, 12, 20, 6)
    if (this.dots > 0) drawText(fb, '. '.repeat(this.dots).trimEnd(), LINE_X, LINE_Y)
  }
}
