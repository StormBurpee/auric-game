/**
 * Shared menu navigation feel: D-pad auto-repeat (first press fires
 * immediately, a held direction fires again after a beat and then at
 * typing rate — the GB list-menu cadence) and index wrapping. One
 * PadRepeat per scene; call step() exactly once per update tick.
 */
import type { Button, Input } from '../../engine'

/** Ticks a direction must stay held before it starts repeating. */
const REPEAT_DELAY = 14
/** Ticks between repeats once auto-repeat has kicked in. */
const REPEAT_RATE = 4

export class PadRepeat {
  private dir: Button | null = null
  private held = 0

  /** The direction to apply this tick, or null. Most-recent-wins, like thumbs. */
  step(input: Input): Button | null {
    const dir = input.heldDirection()
    if (dir === null) {
      this.dir = null
      return null
    }
    if (dir !== this.dir) {
      this.dir = dir
      this.held = 0
      return dir
    }
    this.held++
    if (this.held >= REPEAT_DELAY && (this.held - REPEAT_DELAY) % REPEAT_RATE === 0) return dir
    return null
  }
}

/** Wrap an index into [0, len) — menus loop top to bottom. */
export function wrapIndex(i: number, len: number): number {
  return ((i % len) + len) % len
}
