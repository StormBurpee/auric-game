/**
 * Grid locomotion with handheld-style timing: a step is 16 ticks across one
 * 16px tile (1px per tick), a ledge hop is 32px under a small arc, and
 * the two-frame walk cycle changes feet every half tile. A Walker is
 * the shared chassis for the player and every NPC — its logical tile is
 * always the step's DESTINATION, so collision reserves where a body is
 * going while the pixels catch up.
 */
import type { Dir } from '../types'

export const TILE_PX = 16
/** Ticks to cross one tile (GB walking pace: 1px per tick). */
export const STEP_TICKS = 16
/** Ticks for the 2-tile ledge hop (32px under the arc). */
export const HOP_TICKS = 24
/** Peak height of the hop arc, in pixels. */
export const HOP_ARC_PX = 8
/** Hold a new direction this many ticks before a step begins; shorter = turn in place. */
export const TURN_TICKS = 6
/** The walk frame shows for the first half of each step. */
const HALF_STEP_TICKS = 8

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right']
export const DIR_DX: Record<Dir, number> = { up: 0, down: 0, left: -1, right: 1 }
export const DIR_DY: Record<Dir, number> = { up: -1, down: 1, left: 0, right: 0 }

export interface Walker {
  /** Logical tile — the destination while a step is in flight. */
  x: number
  y: number
  /** Origin tile of the in-flight step (equals x/y when standing). */
  fromX: number
  fromY: number
  facing: Dir
  /** Ticks remaining in the current step; 0 = standing. */
  step: number
  /** Total ticks of the current step (STEP_TICKS or HOP_TICKS). */
  stepTotal: number
  /** True while airborne over a ledge. */
  hop: boolean
  /** Alternates every step so the walk cycle changes feet. */
  parity: boolean
}

export function makeWalker(x: number, y: number, facing: Dir): Walker {
  return { x, y, fromX: x, fromY: y, facing, step: 0, stepTotal: STEP_TICKS, hop: false, parity: false }
}

/** Commit to a step: the walker now occupies the destination, pixels interpolate. */
export function beginStep(w: Walker, dir: Dir, tiles = 1, ticks = STEP_TICKS, hop = false): void {
  w.facing = dir
  w.fromX = w.x
  w.fromY = w.y
  w.x += DIR_DX[dir] * tiles
  w.y += DIR_DY[dir] * tiles
  w.step = ticks
  w.stepTotal = ticks
  w.hop = hop
  w.parity = !w.parity
}

/** Advance one tick. @returns true on the tick the step completes. */
export function tickWalker(w: Walker): boolean {
  if (w.step === 0) return false
  w.step--
  if (w.step > 0) return false
  w.fromX = w.x
  w.fromY = w.y
  w.hop = false
  return true
}

/** Interpolated ground position in pixels (tile top-left; hops follow the ground, not the arc). */
export function pixelPos(w: Walker): { x: number; y: number } {
  if (w.step === 0) return { x: w.x * TILE_PX, y: w.y * TILE_PX }
  const done = w.stepTotal - w.step
  return {
    x: w.fromX * TILE_PX + Math.floor(((w.x - w.fromX) * TILE_PX * done) / w.stepTotal),
    y: w.fromY * TILE_PX + Math.floor(((w.y - w.fromY) * TILE_PX * done) / w.stepTotal),
  }
}

/** Height above the ground while hopping a ledge (visual only — never game state). */
export function hopLift(w: Walker): number {
  if (!w.hop || w.step === 0) return 0
  const done = w.stepTotal - w.step
  return Math.round(HOP_ARC_PX * Math.sin((Math.PI * done) / w.stepTotal))
}

export interface WalkPose {
  /** Index into the CharArt two-frame cycle: 0 stand, 1 step. */
  frame: 0 | 1
  /** Mirror the step frame (other foot) — apply for up/down facings only. */
  mirror: boolean
}

/** The classic four-phase gait from two frames: step, stand, mirrored step, stand. */
export function walkPose(w: Walker): WalkPose {
  if (w.step === 0) return { frame: 0, mirror: false }
  if (w.hop) return { frame: 1, mirror: false }
  const frame: 0 | 1 = w.stepTotal - w.step < HALF_STEP_TICKS ? 1 : 0
  return { frame, mirror: frame === 1 && w.parity }
}

/** The facing that looks from one tile toward another (ties prefer vertical). */
export function dirBetween(fromX: number, fromY: number, toX: number, toY: number): Dir {
  const dx = toX - fromX
  const dy = toY - fromY
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right'
  return dy < 0 ? 'up' : 'down'
}

export function opposite(dir: Dir): Dir {
  switch (dir) {
    case 'up': return 'down'
    case 'down': return 'up'
    case 'left': return 'right'
    case 'right': return 'left'
  }
}
