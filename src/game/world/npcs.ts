/**
 * The townsfolk as live actors: a Walker over the NpcDef, flag- and
 * calendar-driven visibility (hideFlag/showFlag/appears re-checked every
 * frame, so scripts can conjure or banish anyone mid-scene and weekly
 * NPCs keep their appointments with zero machinery), and the idle wander
 * — one tile every 60-180 ticks, leashed to two tiles from home, never
 * onto anything the world says is taken. The overworld scene owns
 * collision; wander asks it through a predicate.
 */
import type { DayPeriod, Rng } from '../../engine'
import { flag } from '../state'
import type { DayOfWeek, NpcDef, SaveData } from '../types'
import { beginStep, DIR_DX, DIR_DY, DIRS, makeWalker } from './movement'
import type { Walker } from './movement'

const WANDER_MIN_TICKS = 60
const WANDER_MAX_TICKS = 180
/** Wanderers stay within this many tiles of their home square, per axis. */
export const WANDER_LEASH = 2

export class NpcActor {
  readonly walker: Walker
  /** Ticks left on the '!' speech mark over a trainer's head. */
  alertTicks = 0
  /** Latched once a sighted-trainer engagement begins (cleared by map reload). */
  engaged = false
  private wanderWait: number

  constructor(readonly def: NpcDef, rng: Rng) {
    this.walker = makeWalker(def.x, def.y, def.facing)
    this.wanderWait = rng.range(WANDER_MIN_TICKS, WANDER_MAX_TICKS)
  }

  /**
   * Flag gates AND-ed with the calendar gate (NpcDef.appears, Tier 2).
   * The overworld passes the live clock on every read; a caller without
   * one (day/period omitted) skips the schedule clause — flags only,
   * exactly the Tier-1 contract.
   */
  visible(state: SaveData, day?: DayOfWeek, period?: DayPeriod): boolean {
    if (this.def.hideFlag !== undefined && flag(state, this.def.hideFlag)) return false
    if (this.def.showFlag !== undefined && !flag(state, this.def.showFlag)) return false
    const appears = this.def.appears
    if (appears?.days !== undefined && day !== undefined && !appears.days.includes(day)) {
      return false
    }
    if (appears?.periods !== undefined && period !== undefined && !appears.periods.includes(period)) {
      return false
    }
    return true
  }

  /**
   * One free-roam tick. When the timer lapses, try a single step in a
   * random direction; a blocked or out-of-leash pick becomes a turn in
   * place, which keeps idle characters looking around like the classics.
   */
  wander(rng: Rng, canStepTo: (x: number, y: number) => boolean): void {
    if (this.def.movement !== 'wander' || this.walker.step > 0) return
    if (--this.wanderWait > 0) return
    this.wanderWait = rng.range(WANDER_MIN_TICKS, WANDER_MAX_TICKS)
    const dir = rng.pick(DIRS)
    const nx = this.walker.x + DIR_DX[dir]
    const ny = this.walker.y + DIR_DY[dir]
    const leashed =
      Math.abs(nx - this.def.x) <= WANDER_LEASH && Math.abs(ny - this.def.y) <= WANDER_LEASH
    if (leashed && canStepTo(nx, ny)) beginStep(this.walker, dir)
    else this.walker.facing = dir
  }
}
