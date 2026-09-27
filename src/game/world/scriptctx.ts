/**
 * The ScriptCtx the story speaks through — every method of
 * script/dsl.ts, implemented over the live overworld. Anything that
 * must touch the scene's map, walkers, or battle pipeline goes through
 * the narrow ScriptHost the OverworldScene implements; everything else
 * (text, flags, items, audio) acts on the Game directly. {PLAYER} and
 * {RIVAL} are always available to every box a script shows.
 */
import type { Task } from '../../engine'
import { playSfx, playSong } from '../audio'
import { ITEMS } from '../data'
import { str } from '../data/strings'
import type { Game } from '../game'
import { bondEvent, healAll } from '../kindra'
import type { ScriptCtx } from '../script/dsl'
import { addKindra, bagAdd, flag as flagOf, setFlag as setFlagOf } from '../state'
import type { BattleConfig, BattleResult, Dir, Kindra, MapDef } from '../types'
import { askChoice, openArchive, openNameEntry, openShop, showText } from '../ui/widgets'

/** Ticks the haven jingle holds the scene before the party springs back. */
const HEAL_JINGLE_TICKS = 130

/** What a script may ask of the overworld scene (implemented by OverworldScene). */
export interface ScriptHost {
  map(): MapDef
  battle(cfg: BattleConfig): Task<BattleResult>
  warpTo(mapId: string, spawn: string): Task<void>
  movePlayer(steps: Dir[]): Task<void>
  moveNpc(id: string, steps: Dir[]): Task<void>
  faceNpc(id: string, dir: Dir): void
  npcFacePlayer(id: string): void
}

export class WorldScriptCtx implements ScriptCtx {
  constructor(
    readonly game: Game,
    private readonly host: ScriptHost,
  ) {}

  /** Every box gets the headline names; explicit vars win on collision. */
  private vars(extra?: Record<string, string>): Record<string, string> {
    return { PLAYER: this.game.state.playerName, RIVAL: 'CORVIN', ...extra }
  }

  *say(key: string, vars?: Record<string, string>): Task<void> {
    yield* showText(this.game, str(key), this.vars(vars))
  }

  *sayRaw(boxes: string[], vars?: Record<string, string>): Task<void> {
    yield* showText(this.game, boxes, this.vars(vars))
  }

  *ask(promptKey: string | null, options: string[], opts?: { cancelIndex?: number }): Task<number> {
    if (promptKey !== null) yield* showText(this.game, str(promptKey), this.vars())
    return yield* askChoice(this.game, options, opts)
  }

  *battle(cfg: BattleConfig): Task<BattleResult> {
    return yield* this.host.battle(cfg)
  }

  *warpTo(map: string, spawn: string): Task<void> {
    yield* this.host.warpTo(map, spawn)
  }

  *movePlayer(steps: Dir[]): Task<void> {
    yield* this.host.movePlayer(steps)
  }

  *moveNpc(id: string, steps: Dir[]): Task<void> {
    yield* this.host.moveNpc(id, steps)
  }

  faceNpc(id: string, dir: Dir): void {
    this.host.faceNpc(id, dir)
  }

  npcFacePlayer(id: string): void {
    this.host.npcFacePlayer(id)
  }

  /**
   * The Haven ritual: jingle, restored party, and this map becomes the
   * whiteout return. Being cared for is remembered — each companion's
   * bond warms a little (the whiteout heal pointedly does not pass here).
   */
  *heal(): Task<void> {
    const game = this.game
    playSong(game, 'haven_heal', { restart: true })
    yield HEAL_JINGLE_TICKS
    for (const k of game.state.party) {
      healAll(k)
      bondEvent(k, 'heal')
    }
    const map = this.host.map()
    playSong(game, map.music)
    if (map.spawns['heal']) game.state.lastHaven = { map: map.id, spawn: 'heal' }
  }

  *shop(items: string[]): Task<void> {
    yield* openShop(this.game, items)
  }

  *archive(): Task<void> {
    yield* openArchive(this.game)
  }

  *nameEntry(initial: string): Task<string> {
    return yield* openNameEntry(this.game, initial)
  }

  *giveItem(item: string, qty: number): Task<void> {
    bagAdd(this.game.state, item, qty)
    playSfx(this.game, 'levelup')
    yield* this.say('sys.item.given', { ITEM: ITEMS[item]?.name ?? item })
  }

  *giveKindra(k: Kindra): Task<void> {
    const where = addKindra(this.game.state, k)
    const key = where === 'party' ? 'sys.catch.party' : 'sys.catch.archive'
    yield* this.say(key, { KINDRA: k.nickname ?? k.species })
  }

  flag(key: string): boolean {
    return flagOf(this.game.state, key)
  }

  setFlag(key: string, value = true): void {
    setFlagOf(this.game.state, key, value)
  }

  song(key: string): void {
    playSong(this.game, key)
  }

  sfx(key: string): void {
    playSfx(this.game, key)
  }

  *wait(ticks: number): Task<void> {
    yield ticks
  }
}
