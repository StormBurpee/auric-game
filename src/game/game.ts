/**
 * The one object every scene closes over: the machine (framebuffer,
 * input, audio), the clock, and the save-shaped world state. Built once
 * in main.ts; passed by reference everywhere; never global.
 */
import type {
  Apu,
  DayPeriod,
  FrameBuffer,
  Input,
  Rng,
  SaveSlot,
  Scheduler,
  SceneStack,
  Sequencer,
} from '../engine'
import type { DayOfWeek, SaveData } from './types'

export interface Game {
  fb: FrameBuffer
  input: Input
  scenes: SceneStack
  tasks: Scheduler
  apu: Apu
  seq: Sequencer
  rng: Rng
  save: SaveSlot<SaveData>
  /** Live world state; serialized verbatim on save. */
  state: SaveData
  /** Monotonic tick counter — drives tile animation, blink cursors, etc. */
  frames: number
  /** Debug override for the day/night clock (null = follow real time). */
  debugPeriod: DayPeriod | null
  /** Debug override for the calendar (null = follow the real week). */
  debugDay: DayOfWeek | null
  period(): DayPeriod
  day(): DayOfWeek
}
