/**
 * Ambervale on foot: tile-grid movement with GB timing, the chasing
 * camera, collision and ledge hops, tall-grass and surf encounter
 * rolls, NPCs with wander, schedules, and line-of-sight trainers, warps
 * and edge transitions, signs, ground items, day/night, field-skill
 * obstacles (HEW/HEAVE/WAVERIDE/LUMINA over per-visit tile overrides),
 * the rod cast at the water's edge, carried eggs walked toward
 * hatching — and the ScriptCtx implementation that lets story scripts
 * drive all of it.
 *
 * Modality is one counter: while any modal task runs (a script, a
 * warp, an engagement) the player's input and NPC free-roam freeze,
 * but in-flight steps always finish — a body never stops between
 * tiles. Scenes pushed above (dialog, battle) starve update() instead,
 * which freezes the world for free.
 *
 * The constructor signature and `spawnScript`
 * are load-bearing (main.ts and the flow scenes call them).
 */
import type { FrameBuffer, Palette, Scene, Sprite, Task } from '../../engine'
import { fadeIn, fadeOut, flashes, SCREEN_H, SCREEN_W } from '../../engine'
import { CHAR_ART, charArtOf, tileArtOf, UI_ART } from '../assets'
import { PAL_FLOWER, PAL_GRASS, PAL_UI } from '../assets/palettes'
import type { CharArt } from '../assets/types'
import { playSfx, playSong } from '../audio'
import { runBattle } from '../battle/scene'
import { ITEMS, trainerOf } from '../data'
import { EVENTS } from '../data/events'
import { mapOf } from '../data/maps'
import { nurseryStepWrap } from '../data/events/nursery'
import { str } from '../data/strings'
import type { Game } from '../game'
import { bondEvent, healAll, makeKindra } from '../kindra'
import { runEvolutionCheck } from '../scenes/evolution'
import { runHatch } from '../scenes/hatch'
import type { GameScript } from '../script/dsl'
import { bagAdd, flag, markSeen, setFlag } from '../state'
import type { BattleConfig, BattleResult, Dir, GroundItemDef, Kindra, MapDef } from '../types'
import { askConfirm, drawFrame, drawText, openPauseMenu } from '../ui/widgets'
import { cameraFor } from './camera'
import type { Camera } from './camera'
import { rollBite, rollEncounter, rollFishingEncounter, rollWaterEncounter } from './encounters'
import { fieldPartner } from './fieldskills'
import { BITE_WINDOW_TICKS, CAST_DOT_TICKS, CAST_DOTS, CastScene, hasRod, waterIntent } from './fishing'
import { canReceiveBoulder, overriddenTileId, setTileOverride } from './overrides'
import type { TileOverrides } from './overrides'
import {
  beginStep,
  DIR_DX,
  DIR_DY,
  dirBetween,
  DIRS,
  HOP_TICKS,
  hopLift,
  makeWalker,
  opposite,
  pixelPos,
  STEP_TICKS,
  tickWalker,
  TILE_PX,
  TURN_TICKS,
  walkPose,
} from './movement'
import type { Walker, WalkPose } from './movement'
import { NpcActor } from './npcs'
import { WorldScriptCtx } from './scriptctx'
import type { ScriptHost } from './scriptctx'
import { TILE_IDS, tileDef } from './tiles'
import type { TileDef } from './tiles'

/** Ticks the map-name plaque stays up after entering a named outdoor map. */
const PLAQUE_TICKS = 90
/** Ticks the '!' speech mark hangs over a trainer who spotted the player. */
const ALERT_TICKS = 30
/** Animated tiles (water, flowers) advance a frame this often. */
const TILE_ANIM_TICKS = 32
/** Actors stand this many pixels above their tile row (heads overlap the tile behind). */
const ACTOR_LIFT_PX = 4
/** Ticks the sapling-crumble beat holds the world after a HEW. */
const CRUMBLE_TICKS = 24
/** Steps between party-wide bond ticks (Gen-2's 256-step cadence). */
const BOND_STEP_SPAN = 256
/** Dark-map spotlight radii: bare eyes vs. a kindled LUMINA glow. */
const DARK_RADII = { lit: 28, dim: 44 }
const LUMINA_RADII = { lit: 64, dim: 88 }

/** A short-lived overlay sprite gliding between two pixel anchors. */
interface WorldFx {
  sprite: Sprite
  palette: Palette
  fromX: number
  fromY: number
  toX: number
  toY: number
  /** Ticks remaining; the fx is culled at 0. */
  ticks: number
  total: number
}

interface World {
  map: MapDef
  npcs: NpcActor[]
  /** Per-visit tile replacements (hewn saplings, heaved boulders); setMap resets them free. */
  overrides: TileOverrides
  /** LUMINA kindled this visit — the spotlight widens. */
  lumina: boolean
  /** The dark-room entry beat already played this visit. */
  luminaAsked: boolean
  /** Crumble/slide overlays in flight. */
  fx: WorldFx[]
}

/** Hold a modal slot open for the task's whole life, cancellation included. */
function* modalWrap(task: Task<void>, release: () => void): Task<void> {
  try {
    yield* task
  } finally {
    release()
  }
}

function asDir(b: string | null): Dir | null {
  return b === 'up' || b === 'down' || b === 'left' || b === 'right' ? b : null
}

export class OverworldScene implements Scene, ScriptHost {
  private world: World | null = null
  private player: Walker
  private readonly ctx: WorldScriptCtx
  /** >0 while any script/transition/engagement owns the world. */
  private modal = 0
  /** Ticks left before a freshly turned facing commits to a step (tap = turn only). */
  private turnDelay = 0
  /** Cooldown so pushing a wall thuds every ~16 ticks, not 60 times a second. */
  private bumpCooldown = 0
  /** Consecutive ticks spent pushing something solid (drives walk-in-place). */
  private pushTicks = 0
  private plaque: { text: string; ticks: number } | null = null
  /** Riding a Kindra over water (WAVERIDE); mirrored to state.pos.surfing. */
  private surfing: boolean
  /** A bite on the line: ticks left in the A-press window ('!' over the player). */
  private fishing: { bite: number } | null = null

  /** Reads game.state.pos for map and position (a mid-lake save resumes afloat). */
  constructor(private readonly game: Game) {
    const pos = game.state.pos
    this.player = makeWalker(pos.x, pos.y, pos.facing)
    this.surfing = pos.surfing === true
    this.ctx = new WorldScriptCtx(game, this)
  }

  enter(): void {
    const world = this.ensureWorld()
    // A save loaded inside a dark room still gets its entry beat.
    if (world.map.dark && !world.luminaAsked) this.runModal(this.darkEntry())
  }

  /** Run a GameScript modally over the world (used by intro hand-off). */
  *spawnScript(script: GameScript): Task<void> {
    this.ensureWorld()
    this.modal++
    try {
      yield* script(this.ctx)
    } finally {
      this.modal--
    }
  }

  // ── Per-tick simulation ───────────────────────────────────────────────────

  update(): void {
    const world = this.ensureWorld()
    const { map, npcs } = world
    const game = this.game
    game.fb.setPeriod(map.outdoor ? game.period() : 'day')

    if (this.plaque && --this.plaque.ticks <= 0) this.plaque = null
    if (this.bumpCooldown > 0) this.bumpCooldown--
    if (world.fx.length > 0) world.fx = world.fx.filter((fx) => --fx.ticks > 0)

    // In-flight steps always finish, even mid-cutscene.
    const arrived = tickWalker(this.player)
    if (arrived) {
      game.state.pos.x = this.player.x
      game.state.pos.y = this.player.y
      // Walking together is its own quiet ritual: every 256th step warms the
      // party (eggs keep their counsel — bond is set at hatch), and the
      // nursery shares the heartbeat: a boarded pair may lay on the wrap.
      if (++game.state.stepTicker >= BOND_STEP_SPAN) {
        game.state.stepTicker = 0
        for (const k of game.state.party) {
          if (k.egg === undefined) bondEvent(k, 'steps')
        }
        nurseryStepWrap(game)
      }
      // Carried eggs are walked toward hatching; archived and boarded eggs
      // are in stasis. A counter pins at zero until onPlayerArrived hatches
      // it on the next free step (in-flight scripts finish first).
      for (const k of game.state.party) {
        if (k.egg !== undefined && k.egg > 0) k.egg--
      }
    }
    for (const npc of npcs) {
      if (npc.alertTicks > 0) npc.alertTicks--
      tickWalker(npc.walker)
    }

    if (this.modal > 0) return

    if (arrived && this.onPlayerArrived()) return
    if (this.player.step === 0) {
      if (this.checkTrainerSight()) return
      this.handleInput(arrived)
    }
    for (const npc of npcs) {
      if (this.npcVisible(npc)) npc.wander(game.rng, (x, y) => this.canWanderTo(x, y))
    }
  }

  /** Landed-on-a-tile consequences. @returns true if a modal task took over. */
  private onPlayerArrived(): boolean {
    // A carried egg at zero steps comes first — a birth preempts warps and
    // wild grass alike (the tile keeps whatever it was holding for later).
    const due = this.game.state.party.filter((k) => k.egg === 0)
    if (due.length > 0) {
      this.runModal(this.hatchTask(due))
      return true
    }
    const map = this.world!.map
    const tile = this.tileAt(this.player.x, this.player.y)
    const warp = map.warps.find((w) => w.x === this.player.x && w.y === this.player.y)
    if (warp) {
      // Only doors and mats creak; edge-row warps between maps are open air.
      const door = tile.key === 'DOOR' || tile.key === 'MAT'
      this.runModal(this.warpTask(warp.to.map, warp.to.spawn, door))
      return true
    }
    if (this.surfing && tile.water) {
      const wild = rollWaterEncounter(this.game, map)
      if (wild) {
        this.runModal(this.wildEncounter(wild))
        return true
      }
    } else if (tile.grass || map.caveEncounters) {
      if (tile.grass) playSfx(this.game, 'grass_step')
      const wild = rollEncounter(this.game, map)
      if (wild) {
        this.runModal(this.wildEncounter(wild))
        return true
      }
    }
    return false
  }

  /** @param chained true on the tick a step just completed (mid-stride turns skip the tap delay). */
  private handleInput(chained: boolean): void {
    const game = this.game
    if (game.input.pressed('start')) {
      this.runModal(openPauseMenu(game))
      return
    }
    if (game.input.pressed('a')) {
      this.interact()
      return
    }
    const dir = asDir(game.input.heldDirection())
    if (dir === null) {
      this.turnDelay = 0
      this.pushTicks = 0
      return
    }
    if (dir !== this.player.facing) {
      // From a standstill, turn first; only a sustained hold becomes a step.
      this.player.facing = dir
      game.state.pos.facing = dir
      this.pushTicks = 0
      if (!chained) {
        this.turnDelay = TURN_TICKS
        return
      }
    } else if (this.turnDelay > 0) {
      this.turnDelay--
      if (this.turnDelay > 0) return
    }
    this.attemptPlayerStep(dir, { edges: true, bump: true })
  }

  /** One forward step: ledge hop, edge transition, collision, or motion. */
  private attemptPlayerStep(dir: Dir, opts: { edges: boolean; bump: boolean }): void {
    const map = this.world!.map
    const nx = this.player.x + DIR_DX[dir]
    const ny = this.player.y + DIR_DY[dir]

    if (!this.inBounds(nx, ny)) {
      const edge = opts.edges ? map.edges?.[dir] : undefined
      if (edge) this.runModal(this.warpTask(edge.map, edge.spawn, false))
      else if (opts.bump) this.bumpInPlace()
      return
    }

    const tile = this.tileAt(nx, ny)
    if (this.surfing) {
      // Afloat, legality flips: water is the road, land is the dismount, solids stay solid.
      if (this.actorAt(nx, ny)) {
        if (opts.bump) this.bumpInPlace()
        return
      }
      if (tile.water) {
        beginStep(this.player, dir)
        this.pushTicks = 0
        return
      }
      if (!tile.solid) {
        playSfx(this.game, 'ledge_hop')
        this.setSurfing(false)
        beginStep(this.player, dir, 1, HOP_TICKS, true)
        this.pushTicks = 0
        return
      }
      if (opts.bump) this.bumpInPlace()
      return
    }
    if (tile.ledge && dir === 'down') {
      const ly = ny + 1
      if (ly < map.height && !this.tileAt(nx, ly).solid && !this.actorAt(nx, ly)) {
        playSfx(this.game, 'ledge_hop')
        beginStep(this.player, dir, 2, HOP_TICKS, true)
        this.pushTicks = 0
      } else if (opts.bump) this.bumpInPlace()
      return
    }

    if (tile.solid || this.actorAt(nx, ny)) {
      if (opts.bump) this.bumpInPlace()
      return
    }
    beginStep(this.player, dir)
    this.pushTicks = 0
  }

  private bumpInPlace(): void {
    this.pushTicks++
    if (this.bumpCooldown === 0) {
      playSfx(this.game, 'bump')
      this.bumpCooldown = STEP_TICKS
    }
  }

  // ── Interaction (the A button) ────────────────────────────────────────────

  private interact(): void {
    const map = this.world!.map
    const dir = this.player.facing
    let fx = this.player.x + DIR_DX[dir]
    let fy = this.player.y + DIR_DY[dir]
    if (!this.inBounds(fx, fy)) return
    // Counters carry the conversation across: Keeper Lily behind her desk.
    let acrossCounter = false
    if (this.tileAt(fx, fy).counter) {
      fx += DIR_DX[dir]
      fy += DIR_DY[dir]
      if (!this.inBounds(fx, fy)) return
      acrossCounter = true
    }

    const npc = this.npcAt(fx, fy)
    if (npc) {
      this.interactNpc(npc)
      return
    }

    const faced = this.tileAt(fx, fy)
    if (faced.key === 'SIGN') {
      const sign = map.signs.find((s) => s.x === fx && s.y === fy)
      if (sign) this.runModal(this.ctx.say(sign.text))
      return
    }

    // Field-skill obstacles: the partner steps forward, or the tile keeps
    // its secret. Hands-on work only — never across a counter.
    if (!acrossCounter) {
      if (faced.key === 'SAPLING') {
        this.runModal(this.hewTask(fx, fy))
        return
      }
      if (faced.key === 'BOULDER') {
        this.runModal(this.heaveTask(fx, fy, dir))
        return
      }
      if (faced.water && !this.surfing && !this.actorAt(fx, fy)) {
        this.runModal(this.waterTask(dir))
        return
      }
    }

    const item = map.items.find(
      (i) => i.x === fx && i.y === fy && !flag(this.game.state, 'item_' + i.id),
    )
    if (item) this.runModal(this.pickupTask(item))
  }

  private interactNpc(npc: NpcActor): void {
    npc.walker.facing = dirBetween(npc.walker.x, npc.walker.y, this.player.x, this.player.y)
    const trainer = npc.def.trainer
    // No standing companion, no fight — the trainer just chats (cf.
    // encounters.ts; an egg has full HP but cannot stand with anyone).
    const able = this.game.state.party.some((k) => k.hp > 0 && k.egg === undefined)
    if (trainer && able && !flag(this.game.state, 'beat_' + trainer.key)) {
      this.runModal(this.trainerBattle(trainer.key))
      return
    }
    if (npc.def.script) {
      const event = EVENTS[npc.def.script]
      if (event) {
        this.runModal(event(this.ctx))
        return
      }
    }
    const night = this.game.period() === 'night'
    const key = (night ? npc.def.dialogNight : undefined) ?? npc.def.dialog
    if (key) this.runModal(this.ctx.say(key))
  }

  private *pickupTask(item: GroundItemDef): Task<void> {
    setFlag(this.game.state, 'item_' + item.id)
    bagAdd(this.game.state, item.item, item.qty)
    playSfx(this.game, 'menu_confirm')
    yield* this.ctx.say('sys.item.get', { ITEM: ITEMS[item.item]?.name ?? item.item })
  }

  // ── Field skills (HEW / HEAVE / WAVERIDE / LUMINA) ────────────────────────

  private skillVars(partner: Kindra): Record<string, string> {
    return { KINDRA: partner.nickname ?? partner.species }
  }

  /** The Gen-2 ritual: the partner is named, the player decides. @returns true on YES. */
  private *confirmSkill(promptKey: string, partner: Kindra): Task<boolean> {
    const pick = yield* askConfirm(
      this.game,
      str(promptKey),
      ['YES', 'NO'],
      { cancelIndex: 1 },
      this.skillVars(partner),
    )
    return pick === 0
  }

  /** HEW: the sapling crumbles into fresh grass for the rest of this visit. */
  private *hewTask(x: number, y: number): Task<void> {
    const partner = fieldPartner(this.game.state, 'HEW')
    if (!partner) {
      yield* this.ctx.say('sys.field.sapling')
      return
    }
    if (!(yield* this.confirmSkill('sys.field.sapling.can', partner))) return
    yield* this.ctx.say('sys.field.sapling.done', this.skillVars(partner))
    const world = this.world!
    playSfx(this.game, 'grass_step')
    setTileOverride(world.overrides, world.map.width, x, y, TILE_IDS.GRASS)
    const px = x * TILE_PX
    const py = y * TILE_PX
    world.fx.push({
      sprite: UI_ART.grassRustle,
      palette: PAL_GRASS,
      fromX: px,
      fromY: py,
      toX: px,
      toY: py,
      ticks: CRUMBLE_TICKS,
      total: CRUMBLE_TICKS,
    })
    yield CRUMBLE_TICKS
  }

  /**
   * HEAVE, Sokoban-lite: one nudge along the facing, onto a walkable,
   * unoccupied, warp-free tile. The boulder lives in the overrides — the
   * origin opens up, the destination turns to stone.
   */
  private *heaveTask(x: number, y: number, dir: Dir): Task<void> {
    const partner = fieldPartner(this.game.state, 'HEAVE')
    if (!partner) {
      yield* this.ctx.say('sys.field.boulder')
      return
    }
    const world = this.world!
    const tx = x + DIR_DX[dir]
    const ty = y + DIR_DY[dir]
    if (!canReceiveBoulder(world.map, world.overrides, tx, ty) || this.actorAt(tx, ty)) {
      // Wedged that way; the boulder keeps its counsel.
      yield* this.ctx.say('sys.field.boulder')
      return
    }
    if (!(yield* this.confirmSkill('sys.field.boulder.can', partner))) return
    yield* this.ctx.say('sys.field.boulder.done', this.skillVars(partner))
    playSfx(this.game, 'bump')
    setTileOverride(world.overrides, world.map.width, x, y, TILE_IDS.GRASS)
    const art = tileArtOf('BOULDER')
    world.fx.push({
      sprite: art.frames[0]!,
      palette: art.palette,
      fromX: x * TILE_PX,
      fromY: y * TILE_PX,
      toX: tx * TILE_PX,
      toY: ty * TILE_PX,
      ticks: STEP_TICKS,
      total: STEP_TICKS,
    })
    // Tasks tick before scenes update: resuming one tick early lands the
    // destination override on the same frame the slide fx is culled —
    // the boulder never blinks out between the two.
    yield STEP_TICKS - 1
    setTileOverride(world.overrides, world.map.width, tx, ty, TILE_IDS.BOULDER)
    yield 1
  }

  /** WAVERIDE: a hop onto the water, and the shoreline rules invert until land. */
  private *waverideTask(dir: Dir): Task<void> {
    const partner = fieldPartner(this.game.state, 'WAVERIDE')
    if (!partner) {
      yield* this.ctx.say('sys.field.water')
      return
    }
    if (!(yield* this.confirmSkill('sys.field.water.can', partner))) return
    playSfx(this.game, 'ledge_hop')
    this.setSurfing(true)
    beginStep(this.player, dir, 1, HOP_TICKS, true)
    yield () => this.player.step === 0
  }

  /**
   * The A-press water dispatcher (tier2-fishing.md F4): a rod alone
   * casts on the spot — no partner, no prompt; rod + WAVERIDE partner
   * asks intent once; no rod falls through to the WAVERIDE flow
   * untouched (it owns its flavor and confirm lines). Land-only by
   * construction: interact() already gates this behind !surfing.
   */
  private *waterTask(dir: Dir): Task<void> {
    const state = this.game.state
    const intent = waterIntent(hasRod(state.bag), fieldPartner(state, 'WAVERIDE') !== null)
    if (intent === 'fish') {
      yield* this.fishingTask()
      return
    }
    if (intent === 'waveride') {
      yield* this.waverideTask(dir)
      return
    }
    const pick = yield* this.ctx.ask('sys.field.water', ['WAVERIDE', 'FISH', 'CANCEL'], {
      cancelIndex: 2,
    })
    if (pick === 0) yield* this.waverideTask(dir)
    else if (pick === 1) yield* this.fishingTask()
  }

  /**
   * The cast (tier2-fishing.md F5-F6): three FIXED suspense dots — never
   * rng-flavored, so seeded replays hold — then the bite dice. No table
   * or no able party member means dots, then silence, with zero rng
   * draws (rollBite owns that rule). A bite hangs the '!' over the
   * player for a generous window; the hook feeds the same wild pipeline
   * as tall grass. Missing the window only costs the moment.
   */
  private *fishingTask(): Task<void> {
    const game = this.game
    const map = this.world!.map
    playSfx(game, 'fish_cast')
    const cast = new CastScene()
    game.scenes.push(cast)
    try {
      for (let dot = 1; dot <= CAST_DOTS; dot++) {
        cast.dots = dot
        yield CAST_DOT_TICKS
      }
    } finally {
      game.scenes.pop()
    }
    if (!rollBite(game, map)) {
      yield* this.ctx.say('sys.fish.none')
      return
    }
    playSfx(game, 'fish_bite')
    this.fishing = { bite: BITE_WINDOW_TICKS }
    let hooked = false
    try {
      // One tick of air before polling: an A latched during the dots can
      // never pre-spend the window (the ui/modal.ts handoff discipline).
      yield 1
      while (this.fishing.bite > 0) {
        if (game.input.pressed('a')) {
          hooked = true
          break
        }
        this.fishing.bite--
        yield 1
      }
    } finally {
      this.fishing = null
    }
    if (!hooked) {
      yield* this.ctx.say('sys.fish.away')
      return
    }
    yield* this.ctx.say('sys.fish.bite')
    const wild = rollFishingEncounter(game, map)
    if (wild !== null) yield* this.wildEncounter(wild)
  }

  /** Scene surfing state, mirrored into the save so a mid-lake save reloads afloat. */
  private setSurfing(on: boolean): void {
    this.surfing = on
    if (on) this.game.state.pos.surfing = true
    else delete this.game.state.pos.surfing
  }

  /**
   * The dark-room entry beat, once per visit: a LUMINA partner offers to
   * kindle its glow (widening the spotlight); without one, the gloom
   * gets its line and keeps the room.
   */
  private *darkEntry(): Task<void> {
    const world = this.world!
    if (!world.map.dark || world.luminaAsked) return
    world.luminaAsked = true
    const partner = fieldPartner(this.game.state, 'LUMINA')
    if (!partner) {
      yield* this.ctx.say('sys.field.dark')
      return
    }
    if (!(yield* this.confirmSkill('sys.field.dark.can', partner))) return
    playSfx(this.game, 'levelup')
    world.lumina = true
    yield* this.ctx.say('sys.field.dark.done', this.skillVars(partner))
  }

  // ── Trainers ──────────────────────────────────────────────────────────────

  /** Scan every unbeaten trainer's and sight-scripted NPC's gaze. @returns true if one locked on. */
  private checkTrainerSight(): boolean {
    // No standing companion, no ambush (cf. encounters.ts; eggs don't count).
    if (!this.game.state.party.some((k) => k.hp > 0 && k.egg === undefined)) return false
    const { npcs } = this.world!
    for (const npc of npcs) {
      const trainer = npc.def.trainer
      const sight = trainer?.sight ?? npc.def.sightScript?.sight
      if (sight === undefined || npc.engaged || npc.walker.step > 0) continue
      if (!this.npcVisible(npc)) continue
      if (trainer && flag(this.game.state, 'beat_' + trainer.key)) continue
      const dx = DIR_DX[npc.walker.facing]
      const dy = DIR_DY[npc.walker.facing]
      for (let i = 1; i <= sight; i++) {
        const x = npc.walker.x + dx * i
        const y = npc.walker.y + dy * i
        if (!this.inBounds(x, y)) break
        if (this.occupiedByPlayer(x, y)) {
          this.runModal(trainer ? this.trainerEngage(npc, i) : this.sightScriptEngage(npc))
          return true
        }
        if (this.tileAt(x, y).solid || this.occupiedByNpc(x, y, npc)) break
      }
    }
    return false
  }

  /** The classic ambush: '!', march over, stare down, fight. */
  private *trainerEngage(npc: NpcActor, dist: number): Task<void> {
    npc.engaged = true
    npc.alertTicks = ALERT_TICKS
    yield ALERT_TICKS
    for (let i = 0; i < dist - 1; i++) {
      beginStep(npc.walker, npc.walker.facing)
      yield () => npc.walker.step === 0
    }
    this.player.facing = opposite(npc.walker.facing)
    this.game.state.pos.facing = this.player.facing
    yield* this.trainerBattle(npc.def.trainer!.key)
  }

  /** A scripted gaze (CORVIN's ambush): '!', then the event owns the approach and the rest. */
  private *sightScriptEngage(npc: NpcActor): Task<void> {
    npc.engaged = true
    npc.alertTicks = ALERT_TICKS
    yield ALERT_TICKS
    const event = EVENTS[npc.def.sightScript!.script]
    if (event) yield* event(this.ctx)
  }

  private *trainerBattle(key: string): Task<void> {
    const def = trainerOf(key)
    // No rng: trainer creatures get flat genes, the fixed-DV tradition.
    const foe = def.party.map((p) => makeKindra(p.species, p.level, { held: p.held }))
    const result = yield* this.battle({ kind: 'trainer', foe, trainer: def })
    if (result.outcome !== 'win') return
    const state = this.game.state
    setFlag(state, 'beat_' + key)
    // The Charm Gear's PHONE: swapping numbers is offered once, right after
    // the first victory — sight-engaged and talked battles share this seam.
    if (def.contact && flag(state, 'charm_gear') && !flag(state, 'contact_' + key)) {
      const pick = yield* askConfirm(
        this.game,
        str('sys.gear.swap'),
        ['YES', 'NO'],
        { cancelIndex: 1 },
        { NAME: def.contact.name },
      )
      if (pick === 0) setFlag(state, 'contact_' + key)
    }
  }

  // ── Battles, encounters, whiteout ─────────────────────────────────────────

  /** Every egg that reached zero this step, in party order (scenes/hatch stages each). */
  private *hatchTask(due: Kindra[]): Task<void> {
    for (const k of due) yield* runHatch(this.game, k)
  }

  private *wildEncounter(wild: Kindra): Task<void> {
    playSfx(this.game, 'encounter_swirl')
    markSeen(this.game.state, wild.species)
    yield* this.battle({ kind: 'wild', foe: [wild] })
  }

  /** The one battle pipeline every fight passes through (ScriptHost.battle). */
  *battle(cfg: BattleConfig): Task<BattleResult> {
    const game = this.game
    yield* flashes(game.fb)
    const result = yield* runBattle(game, cfg)
    yield* runEvolutionCheck(game)
    if (result.outcome === 'loss') yield* this.whiteout()
    else playSong(game, this.world!.map.music)
    return result
  }

  private *whiteout(): Task<void> {
    const game = this.game
    yield* this.ctx.say('sys.whiteout')
    yield* fadeOut(game.fb)
    const dest = game.state.lastHaven ?? { map: 'player_home', spawn: 'heal' }
    const world = this.setMap(dest.map)
    this.spawnAt(world.map, dest.spawn)
    for (const k of game.state.party) healAll(k)
    game.state.glints -= Math.floor(game.state.glints / 2)
    yield* fadeIn(game.fb)
    yield* this.darkEntry()
  }

  // ── Map changes (ScriptHost.warpTo and friends) ───────────────────────────

  *warpTo(mapId: string, spawn: string): Task<void> {
    yield* this.warpTask(mapId, spawn, false)
  }

  private *warpTask(mapId: string, spawn: string, door: boolean): Task<void> {
    const game = this.game
    if (door) playSfx(game, 'door')
    yield* fadeOut(game.fb)
    const world = this.setMap(mapId)
    this.spawnAt(world.map, spawn)
    game.fb.setPeriod(world.map.outdoor ? game.period() : 'day')
    yield* fadeIn(game.fb)
    yield* this.darkEntry()
  }

  private setMap(id: string): World {
    const map = mapOf(id)
    const world: World = {
      map,
      npcs: map.npcs.map((def) => new NpcActor(def, this.game.rng)),
      overrides: new Map(),
      lumina: false,
      luminaAsked: false,
      fx: [],
    }
    this.world = world
    this.game.state.pos.map = id
    playSong(this.game, map.music) // no-op when the song is already on
    this.plaque = map.outdoor && map.name !== '' ? { text: map.name, ticks: PLAQUE_TICKS } : null
    return world
  }

  private spawnAt(map: MapDef, spawn: string): void {
    // validateWorld pins warp/edge targets; the first spawn keeps a bad
    // whiteout destination playable instead of softlocked.
    const s = map.spawns[spawn] ?? Object.values(map.spawns)[0]
    if (!s) throw new Error(`map '${map.id}' defines no spawns`)
    this.player = makeWalker(s.x, s.y, s.facing)
    this.setSurfing(false) // warps and whiteouts always land the player on foot
    const pos = this.game.state.pos
    pos.x = s.x
    pos.y = s.y
    pos.facing = s.facing
  }

  private ensureWorld(): World {
    if (this.world) return this.world
    const pos = this.game.state.pos
    const world = this.setMap(pos.map)
    this.player = makeWalker(pos.x, pos.y, pos.facing)
    // A save can sit on a wanderer's home tile (it had roamed off when the
    // player stood there); nudge the rebuilt NPC to the first clear neighbour.
    for (const npc of world.npcs) {
      if (!this.npcVisible(npc)) continue
      if (npc.walker.x !== pos.x || npc.walker.y !== pos.y) continue
      for (const dir of DIRS) {
        const nx = npc.walker.x + DIR_DX[dir]
        const ny = npc.walker.y + DIR_DY[dir]
        if (!this.canWanderTo(nx, ny)) continue
        npc.walker.x = nx
        npc.walker.y = ny
        break
      }
    }
    return world
  }

  // ── ScriptHost: scripted movement ─────────────────────────────────────────

  map(): MapDef {
    return this.ensureWorld().map
  }

  *movePlayer(steps: Dir[]): Task<void> {
    this.ensureWorld()
    for (const dir of steps) {
      this.player.facing = dir
      this.game.state.pos.facing = dir
      this.attemptPlayerStep(dir, { edges: false, bump: false })
      if (this.player.step > 0) yield () => this.player.step === 0
    }
  }

  *moveNpc(id: string, steps: Dir[]): Task<void> {
    const npc = this.npcById(id)
    if (!npc) return
    for (const dir of steps) {
      npc.walker.facing = dir
      const nx = npc.walker.x + DIR_DX[dir]
      const ny = npc.walker.y + DIR_DY[dir]
      const clear =
        this.inBounds(nx, ny) &&
        !this.tileAt(nx, ny).solid &&
        !this.occupiedByNpc(nx, ny, npc) &&
        !this.occupiedByPlayer(nx, ny)
      if (!clear) continue
      beginStep(npc.walker, dir)
      yield () => npc.walker.step === 0
    }
  }

  faceNpc(id: string, dir: Dir): void {
    const npc = this.npcById(id)
    if (npc) npc.walker.facing = dir
  }

  npcFacePlayer(id: string): void {
    const npc = this.npcById(id)
    if (npc) {
      npc.walker.facing = dirBetween(npc.walker.x, npc.walker.y, this.player.x, this.player.y)
    }
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  /** Flag AND calendar visibility — every overworld read passes the live clock. */
  private npcVisible(npc: NpcActor): boolean {
    return npc.visible(this.game.state, this.game.day(), this.game.period())
  }

  private inBounds(x: number, y: number): boolean {
    const map = this.world!.map
    return x >= 0 && y >= 0 && x < map.width && y < map.height
  }

  /** Tile id at (x, y) with this visit's overrides applied — the one truth for collision AND drawing. */
  private tileIdAt(x: number, y: number): number {
    const { map, overrides } = this.world!
    return overriddenTileId(map.tiles, overrides, map.width, x, y)
  }

  private tileAt(x: number, y: number): TileDef {
    return tileDef(this.tileIdAt(x, y))
  }

  /** A walker holds both its origin and destination while stepping. */
  private walkerOn(w: Walker, x: number, y: number): boolean {
    return (w.x === x && w.y === y) || (w.step > 0 && w.fromX === x && w.fromY === y)
  }

  private occupiedByPlayer(x: number, y: number): boolean {
    return this.walkerOn(this.player, x, y)
  }

  private occupiedByNpc(x: number, y: number, except?: NpcActor): boolean {
    for (const npc of this.world!.npcs) {
      if (npc === except || !this.npcVisible(npc)) continue
      if (this.walkerOn(npc.walker, x, y)) return true
    }
    return false
  }

  /** Blocking from the player's point of view (NPCs only; self excluded). */
  private actorAt(x: number, y: number): boolean {
    return this.occupiedByNpc(x, y)
  }

  private canWanderTo(x: number, y: number): boolean {
    const map = this.world!.map
    if (!this.inBounds(x, y)) return false
    if (this.tileAt(x, y).solid) return false
    if (map.warps.some((w) => w.x === x && w.y === y)) return false
    if (this.occupiedByNpc(x, y) || this.occupiedByPlayer(x, y)) return false
    return true
  }

  private npcAt(x: number, y: number): NpcActor | undefined {
    return this.world!.npcs.find(
      (n) => this.npcVisible(n) && n.walker.step === 0 && n.walker.x === x && n.walker.y === y,
    )
  }

  private npcById(id: string): NpcActor | undefined {
    return this.world?.npcs.find((n) => n.def.id === id)
  }

  private runModal(task: Task<void>): void {
    this.modal++
    this.game.tasks.spawn(modalWrap(task, () => this.modal--))
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  draw(fb: FrameBuffer): void {
    const world = this.world
    if (!world) return
    const { map, npcs } = world
    // Keep the cast honest even when a translucent scene starves update().
    fb.setPeriod(map.outdoor ? this.game.period() : 'day')

    const ground = pixelPos(this.player)
    const cam = cameraFor(map.width, map.height, ground.x, ground.y)
    this.drawTiles(fb, map, cam)
    this.drawItems(fb, map, cam)
    this.drawActors(fb, npcs, cam)
    this.drawGrassOverlays(fb, npcs, cam)
    this.drawFx(fb, world, cam)
    if (map.dark) {
      // Immediate darkening, after the world layers and before the UI
      // overlays — translucent scenes above stay readable in the gloom.
      const r = world.lumina ? LUMINA_RADII : DARK_RADII
      fb.spotlight(ground.x - cam.x + TILE_PX / 2, ground.y - cam.y + TILE_PX / 2, r.lit, r.dim)
    }
    this.drawPlaque(fb)
    for (const npc of npcs) {
      if (npc.alertTicks > 0) this.drawAlert(fb, npc.walker, cam)
    }
    // A bite on the line gets the same mark a spotted trainer gives.
    if (this.fishing !== null && this.fishing.bite > 0) this.drawAlert(fb, this.player, cam)
  }

  private drawTiles(fb: FrameBuffer, map: MapDef, cam: Camera): void {
    const animFrame = Math.floor(this.game.frames / TILE_ANIM_TICKS)
    const tx0 = Math.floor(cam.x / TILE_PX) - 1
    const ty0 = Math.floor(cam.y / TILE_PX) - 1
    const tx1 = Math.floor((cam.x + SCREEN_W - 1) / TILE_PX) + 1
    const ty1 = Math.floor((cam.y + SCREEN_H - 1) / TILE_PX) + 1
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const inMap = tx >= 0 && ty >= 0 && tx < map.width && ty < map.height
        const key = inMap ? tileDef(this.tileIdAt(tx, ty)).key : 'VOID'
        const art = tileArtOf(key)
        const frame = art.frames[animFrame % art.frames.length]!
        fb.blit(frame, art.palette, tx * TILE_PX - cam.x, ty * TILE_PX - cam.y, { opaqueZero: true })
      }
    }
  }

  private drawItems(fb: FrameBuffer, map: MapDef, cam: Camera): void {
    for (const item of map.items) {
      if (flag(this.game.state, 'item_' + item.id)) continue
      fb.blit(UI_ART.charm, PAL_FLOWER, item.x * TILE_PX - cam.x, item.y * TILE_PX - cam.y)
    }
  }

  private drawActors(fb: FrameBuffer, npcs: NpcActor[], cam: Camera): void {
    interface Entry {
      w: Walker
      art: CharArt
      pose: WalkPose
    }
    const entries: Entry[] = []
    for (const npc of npcs) {
      if (!this.npcVisible(npc)) continue
      entries.push({ w: npc.walker, art: charArtOf(npc.def.sprite), pose: walkPose(npc.walker) })
    }
    // The rider art swaps in while afloat, falling back gracefully until it lands.
    const playerArt = this.surfing ? (CHAR_ART['PLAYER_SURF'] ?? charArtOf('PLAYER')) : charArtOf('PLAYER')
    entries.push({ w: this.player, art: playerArt, pose: this.playerPose() })
    // Lower bodies draw over higher ones; the stable sort keeps the player on top of ties.
    entries.sort((a, b) => pixelPos(a.w).y - pixelPos(b.w).y)

    for (const { w, art, pose } of entries) {
      const p = pixelPos(w)
      const lift = hopLift(w)
      if (w.hop && w.step > 0) {
        fb.blit(UI_ART.shadow, art.palette, p.x - cam.x, p.y + TILE_PX / 2 - cam.y)
      }
      let spr: Sprite
      let flip = false
      switch (w.facing) {
        case 'down':
          spr = art.down[pose.frame]
          flip = pose.mirror
          break
        case 'up':
          spr = art.up[pose.frame]
          flip = pose.mirror
          break
        case 'left':
          spr = art.side[pose.frame]
          break
        case 'right':
          spr = art.side[pose.frame]
          flip = true
          break
      }
      fb.blit(spr, art.palette, p.x - cam.x, p.y - ACTOR_LIFT_PX - lift - cam.y, { flipX: flip })
    }
  }

  /** Standing players pushing a wall still pump their legs, GB-style; riders bob with the water. */
  private playerPose(): WalkPose {
    if (this.surfing && this.player.step === 0) {
      const frame: 0 | 1 = Math.floor(this.game.frames / TILE_ANIM_TICKS) % 2 === 0 ? 0 : 1
      return { frame, mirror: false }
    }
    if (this.player.step === 0 && this.pushTicks > 0) {
      const frame: 0 | 1 = this.pushTicks % STEP_TICKS < STEP_TICKS / 2 ? 1 : 0
      return { frame, mirror: frame === 1 && Math.floor(this.pushTicks / STEP_TICKS) % 2 === 1 }
    }
    return walkPose(this.player)
  }

  /** Short-lived overlays (sapling crumble, the boulder's slide) gliding between anchors. */
  private drawFx(fb: FrameBuffer, world: World, cam: Camera): void {
    for (const fx of world.fx) {
      const done = fx.total - fx.ticks
      const x = fx.fromX + Math.floor(((fx.toX - fx.fromX) * done) / fx.total)
      const y = fx.fromY + Math.floor(((fx.toY - fx.fromY) * done) / fx.total)
      fb.blit(fx.sprite, fx.palette, x - cam.x, y - cam.y)
    }
  }

  private drawGrassOverlays(fb: FrameBuffer, npcs: NpcActor[], cam: Camera): void {
    const rustle = (w: Walker): void => {
      if (w.step > 0 || !this.tileAt(w.x, w.y).grass) return
      fb.blit(UI_ART.grassRustle, PAL_GRASS, w.x * TILE_PX - cam.x, w.y * TILE_PX - cam.y)
    }
    for (const npc of npcs) {
      if (this.npcVisible(npc)) rustle(npc.walker)
    }
    rustle(this.player)
  }

  private drawPlaque(fb: FrameBuffer): void {
    if (!this.plaque) return
    drawFrame(fb, 0, 0, this.plaque.text.length + 2, 3)
    drawText(fb, this.plaque.text, 8, 8)
  }

  /** The '!' speech mark over any walker: a trainer who spotted you, or you with a bite. */
  private drawAlert(fb: FrameBuffer, w: Walker, cam: Camera): void {
    const p = pixelPos(w)
    const x = p.x - cam.x + 4
    const y = p.y - cam.y - 14
    fb.fillRect(x - 1, y - 1, 10, 10, PAL_UI, 0)
    drawText(fb, '!', x, y)
  }
}
