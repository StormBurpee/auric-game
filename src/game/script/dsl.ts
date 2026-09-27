/**
 * Cutscenes and NPC events are generator functions over this context —
 * the entire expressive power of the game's story system:
 *
 *   export const labChoice: GameScript = function* (c) {
 *     yield* c.say('story.lab.greeting')
 *     const pick = yield* c.ask(null, ['VERDIL', 'EMBERIT', 'RILLET'])
 *     ...
 *   }
 *
 * The overworld scene implements ScriptCtx; scripts stay pure sequence,
 * pausable on any frame, and read top-to-bottom like the scene plays.
 */
import type { Task } from '../../engine'
import type { BattleConfig, BattleResult, Dir, Kindra } from '../types'
import type { Game } from '../game'

export interface ScriptCtx {
  readonly game: Game

  /** Show every text box stored under a strings key. */
  say(key: string, vars?: Record<string, string>): Task<void>
  /** Show literal boxes ('line1\nline2' each). */
  sayRaw(boxes: string[], vars?: Record<string, string>): Task<void>
  /** Menu choice; resolves to the chosen index (B cancels to cancelIndex if given). */
  ask(promptKey: string | null, options: string[], opts?: { cancelIndex?: number }): Task<number>

  battle(cfg: BattleConfig): Task<BattleResult>
  warpTo(map: string, spawn: string): Task<void>
  movePlayer(steps: Dir[]): Task<void>
  moveNpc(id: string, steps: Dir[]): Task<void>
  faceNpc(id: string, dir: Dir): void
  npcFacePlayer(id: string): void

  heal(): Task<void>
  /** Open Larch's Archive (Keeper Lily's terminal). */
  archive(): Task<void>
  shop(items: string[]): Task<void>
  nameEntry(initial: string): Task<string>
  giveItem(item: string, qty: number): Task<void>
  giveKindra(k: Kindra): Task<void>

  flag(key: string): boolean
  setFlag(key: string, value?: boolean): void

  song(key: string): void
  sfx(key: string): void
  wait(ticks: number): Task<void>
}

export type GameScript = (ctx: ScriptCtx) => Task<void>
