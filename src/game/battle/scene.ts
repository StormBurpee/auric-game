/**
 * The battle scene: intro slides, the command grid, turn resolution
 * with message-by-message narration, HP bars that drain a pixel at a
 * time, capture wobbles, the §5.5 berry sweeps and §11.7 item phase,
 * exp and level-ups — the full Gen-2 ceremony, driven by MECHANICS §11.
 *
 * Shape: `runBattle` pushes the (draw-only) scene, spawns one master
 * coroutine on game.tasks that owns the whole ceremony, pops on exit
 * and returns the BattleResult. Menus from ui/widgets (bag, party,
 * move-forget choice) stack translucently above; the message box in
 * the bottom 48px is the scene's own typewriter — no dialog scenes
 * inside battle.
 *
 * `runBattle` is the single entry point;
 * the overworld and event scripts only ever call this.
 */
import { fadeIn, fadeOut } from '../../engine'
import type { FrameBuffer, Palette, Scene, Sprite, Task } from '../../engine'
import { monArtOf, trainerArtOf, UI_ART } from '../assets'
import { PAL_BATTLE_BG, PAL_UI } from '../assets/palettes'
import { playSfx, playSong } from '../audio'
import { effectiveness, itemOf, moveOf, speciesOf } from '../data'
import { str } from '../data/strings'
import type { Game } from '../game'
import { able, bondEvent, expForLevel, statsOf } from '../kindra'
import { addKindra, bagRemove, markSeen } from '../state'
import type {
  BattleConfig, BattleResult, BattleStat, Item, Kindra, Move, MoveSlot, Rider, StatusId,
} from '../types'
import { interpolate, paginate, wrapText } from '../ui/format'
import { askChoice, openBag, openPartyScreen } from '../ui/widgets'
import { chooseMove } from './ai'
import { accuracyCheck, attemptEscape, effectiveStat, rollDamage } from './calc'
import { attemptCapture } from './capture'
import { applyExp, expGain, grantStatExp } from './exp'
import {
  cropBottom, displayName, drawCommandMenu, drawFightMenu, drawFoePanel, drawMessage,
  drawPlatform, drawPlayerPanel, EXP_BAR_PX, FOE_BASE, FOE_CX, HP_BAR_PX, PLAYER_BASE, PLAYER_CX,
} from './hud'
import type { MoveEntry } from './hud'
import { berryTrigger, heldEffect, leftoversAmount } from './held'
import { intoBattle } from './state'
import type { BattleMon } from './state'
import {
  actsFirst, changeStage, dealDamage, healHp, inflictConfusion, inflictStatus,
  multiHitCount, preMoveGauntlet, STAT_LABEL, STRUGGLE,
} from './turn'
import type { GauntletEvent } from './turn'

/** How a finished message lingers: a skippable pause, an A-press, or not at all. */
type Hold = 'auto' | 'press' | 'none'

/** A battler's stage presence: which sprite, where, and how much of it. */
interface Vis {
  spr: Sprite
  pal: Palette
  /** Horizontal offset from the resting spot (slide-ins/outs). */
  dx: number
  /** Visible rows from the top; sink/rise animations shrink/grow this. */
  rows: number
  shown: boolean
}

interface Side {
  mon: BattleMon
  isPlayer: boolean
  vis: Vis
  /** Animated HP the bar displays; chases mon.k.hp ~1px per 2 ticks. */
  shownHp: number
  panelOn: boolean
}

type PlayerAction =
  | { kind: 'fight'; slot: MoveSlot | null } // null slot = STRUGGLE
  | { kind: 'charm'; item: Item }
  | { kind: 'item'; item: Item; partyIdx: number }
  | { kind: 'switch'; idx: number }
  | { kind: 'run' }

/** Offscreen slide distance — clears the 160px screen for any ≤48px sprite. */
const SLIDE_PX = 120
/** Ticks an 'auto' message lingers after typing out (A/B cuts it short). */
const AUTO_HOLD_TICKS = 36

/**
 * Run one battle to its conclusion. Pushes the battle scene, drives the
 * master task via game.tasks, pops on exit. Music: battle_wild /
 * battle_trainer on entry, victory fanfare on a win — the map theme is
 * the overworld's to restore.
 */
export function* runBattle(game: Game, cfg: BattleConfig): Task<BattleResult> {
  const scene = new BattleScene(game, cfg)
  game.scenes.push(scene)
  const run = game.tasks.spawn(scene.master())
  yield () => run.done
  game.scenes.pop()
  yield* fadeIn(game.fb, 12)
  const result = run.result
  if (!result) throw new Error('runBattle: master task ended without a result')
  return result
}

class BattleScene implements Scene {
  private readonly foeParty: Kindra[]
  private foe: Side
  private player: Side
  /** Shown EXP bar fill, 0..1; chases the real fraction ~1px per tick. */
  private playerExp: number
  private msgLines: readonly string[] = []
  private msgShown = 0
  private msgWaiting = false
  private menu: { kind: 'command' | 'fight'; index: number } | null = null
  private charm: { x: number; y: number } | null = null
  private cmdIndex = 0
  private moveIndex = 0
  private fleeAttempts = 0
  private result: BattleResult | null = null

  constructor(private readonly game: Game, private readonly cfg: BattleConfig) {
    this.foeParty = cfg.foe
    const first = cfg.foe[0]
    if (!first) throw new Error('runBattle: battle with no foe')
    // able(), not hp > 0: a carried egg has full HP and zero fight (Tier 2).
    const starter = game.state.party.find(able)
    if (!starter) throw new Error('runBattle: no able party member')
    // The foe slot opens with the tamer's portrait in trainer battles;
    // the player's side always opens with the hero seen from behind.
    const foeArt = cfg.trainer ? trainerArtOf(cfg.trainer.sprite) : null
    const foeMonArt = monArtOf(first.species)
    const foeSpr = foeArt ? foeArt.sprite : foeMonArt.front
    this.foe = {
      mon: this.intake(first),
      isPlayer: false,
      vis: { spr: foeSpr, pal: foeArt ? foeArt.palette : foeMonArt.palette, dx: SLIDE_PX, rows: foeSpr.h, shown: true },
      shownHp: first.hp,
      panelOn: false,
    }
    const back = trainerArtOf('PLAYER_BACK')
    this.player = {
      mon: this.intake(starter),
      isPlayer: true,
      vis: { spr: back.sprite, pal: back.palette, dx: -SLIDE_PX, rows: back.sprite.h, shown: true },
      shownHp: starter.hp,
      panelOn: false,
    }
    this.playerExp = this.expFraction(starter)
  }

  enter(): void {
    this.game.fb.fade = 1 // the master task fades the stage in
  }

  /** All thinking happens in the master task; the scene only renders. */
  update(): void {}

  // ── The master ceremony ────────────────────────────────────────────────────

  *master(): Task<BattleResult> {
    const g = this.game
    playSong(g, this.cfg.kind === 'wild' ? 'battle_wild' : 'battle_trainer', { restart: true })
    yield* fadeIn(g.fb, 16)
    yield* this.intro()
    while (!this.result) yield* this.commandTurn()
    yield 24 // let the last line land
    yield* fadeOut(g.fb, 16)
    return this.result
  }

  /** §11.1: slide-ins, the appear/challenge line, both sides sent out. */
  private *intro(): Task<void> {
    const g = this.game
    while (this.foe.vis.dx > 0 || this.player.vis.dx < 0) {
      this.foe.vis.dx = Math.max(0, this.foe.vis.dx - 3)
      this.player.vis.dx = Math.min(0, this.player.vis.dx + 3)
      yield 1
    }
    const trainer = this.cfg.trainer
    if (this.cfg.kind === 'wild' || !trainer) {
      markSeen(g.state, this.foe.mon.k.species)
      this.foe.panelOn = true
      yield* this.say('sys.wild.appear', { KINDRA: displayName(this.foe.mon.k) }, 'press')
    } else {
      yield* this.say('sys.trainer.challenge', { TRAINER: trainer.name }, 'press')
      yield* this.slideOut(this.foe.vis, 1)
      yield* this.sendFoe(this.foeIndex())
    }
    yield* this.say('sys.go', { KINDRA: displayName(this.player.mon.k) })
    yield* this.slideOut(this.player.vis, -1)
    const art = monArtOf(this.player.mon.k.species)
    this.setVis(this.player.vis, art.back, art.palette)
    yield* this.rise(this.player.vis)
    this.player.panelOn = true
    // §5.5 entry check: a holder arriving statused / at half pops its berry now.
    yield* this.berrySweep(this.foe)
    yield* this.berrySweep(this.player)
  }

  /** One full round: command, simultaneous foe pick, resolution, end-of-turn. */
  private *commandTurn(): Task<void> {
    const g = this.game
    const action = yield* this.chooseAction()
    // The opponent picks simultaneously (§11.2); wild brains are 'random'.
    const ai = this.cfg.trainer?.ai ?? 'random'
    const foePick = chooseMove(g.rng, ai, this.foe.mon, this.player.mon)
    const foeSlot = foePick >= 0 ? this.foe.mon.k.moves[foePick] ?? null : null
    const foeMove = foeSlot ? moveOf(foeSlot.move) : STRUGGLE

    if (action.kind === 'fight') {
      const slot = action.slot
      const myMove = slot ? moveOf(slot.move) : STRUGGLE
      const meFirst = actsFirst(g.rng, this.player.mon, this.foe.mon, myMove, foeMove)
      const mine = { user: this.player, target: this.foe, mon: this.player.mon, move: myMove, slot }
      const theirs = { user: this.foe, target: this.player, mon: this.foe.mon, move: foeMove, slot: foeSlot }
      const queue = meFirst ? [mine, theirs] : [theirs, mine]
      let first = true
      for (const q of queue) {
        if (this.result) return
        // §11.4g: a fainted (or replaced) battler's queued action is cancelled.
        if (q.user.mon !== q.mon || q.mon.k.hp <= 0) {
          first = false
          continue
        }
        yield* this.executeMove(q.user, q.target, q.move, q.slot, !first)
        first = false
        // §5.5: one state-based berry sweep per executed move, both sides,
        // before the faint check — an inflicted status never survives to
        // the holder's own gauntlet.
        yield* this.berrySweep(q.user)
        yield* this.berrySweep(q.target)
        yield* this.faintSweep()
        if (this.result) return
      }
    } else {
      // Non-move actions resolve before the foe's move (§6).
      if (action.kind === 'run') yield* this.runFlow()
      else if (action.kind === 'charm') yield* this.captureFlow(action.item)
      else if (action.kind === 'item') yield* this.itemFlow(action.item, action.partyIdx)
      else yield* this.switchFlow(action.idx, true)
      if (this.result) return
      if (this.foe.mon.k.hp > 0) {
        yield* this.executeMove(this.foe, this.player, foeMove, foeSlot, true)
        yield* this.berrySweep(this.foe)
        yield* this.berrySweep(this.player)
        yield* this.faintSweep()
        if (this.result) return
      }
    }
    yield* this.endOfTurn()
  }

  // ── Command phase ──────────────────────────────────────────────────────────

  /** Loop the command grid until the player commits a turn-consuming action. */
  private *chooseAction(): Task<PlayerAction> {
    const g = this.game
    while (true) {
      const cmd = yield* this.commandMenu()
      if (cmd === 0) {
        // FIGHT — with every PP spent, §11.6 forces STRUGGLE.
        if (this.player.mon.k.moves.every((s) => s.pp <= 0)) return { kind: 'fight', slot: null }
        const slot = yield* this.fightMenu()
        if (slot) return { kind: 'fight', slot }
      } else if (cmd === 1) {
        yield 1 // the press that picked BAG must not pick an item
        const picked = yield* openBag(g, 'battle')
        if (picked === null) continue
        const item = itemOf(picked)
        const fx = item.effect
        if (fx.kind === 'charm') {
          // §11.9: charms bounce off tamer battles, item kept, no turn lost.
          if (this.cfg.kind === 'trainer') {
            yield* this.say('sys.catch.trainer')
            continue
          }
          return { kind: 'charm', item }
        }
        if (fx.kind !== 'heal' && fx.kind !== 'cure') {
          // Stones, cords, holdables and key items have no place mid-battle:
          // GIVE lives in the field bag only — Gen 2 refused these too (§5.5).
          yield* this.say('sys.item.cant')
          continue
        }
        const idx = yield* openPartyScreen(g, 'select')
        if (idx < 0) continue
        const k = g.state.party[idx]
        if (!k) continue
        const usable = fx.kind === 'heal'
          ? k.hp > 0 && k.hp < statsOf(k).hp
          : k.status !== null && (fx.status === 'all' || fx.status === k.status)
        if (!usable) {
          yield* this.say('sys.item.cant', { KINDRA: displayName(k) })
          continue
        }
        return { kind: 'item', item, partyIdx: idx }
      } else if (cmd === 2) {
        yield 1 // the press that picked KINDRA must not pick a member
        const idx = yield* this.pickParty(false)
        if (idx >= 0) return { kind: 'switch', idx }
      } else {
        // RUN — never from a tamer (§11.3), and it costs nothing to be told so.
        if (this.cfg.kind === 'trainer') {
          yield* this.say('sys.run.trainer')
          continue
        }
        return { kind: 'run' }
      }
    }
  }

  /** The 2x2 FIGHT/BAG/KINDRA/RUN grid. @returns the chosen cell 0-3. */
  private *commandMenu(): Task<number> {
    const g = this.game
    this.msgLines = []
    this.msgShown = 0
    this.msgWaiting = false
    const menu = { kind: 'command' as const, index: this.cmdIndex }
    this.menu = menu
    try {
      yield 1 // the press that got us here must not count in here
      while (true) {
        let next = menu.index
        if (g.input.pressed('left')) next &= ~1
        else if (g.input.pressed('right')) next |= 1
        else if (g.input.pressed('up')) next &= ~2
        else if (g.input.pressed('down')) next |= 2
        if (next !== menu.index) {
          menu.index = next
          playSfx(g, 'menu_move')
        }
        if (g.input.pressed('a')) {
          playSfx(g, 'menu_confirm')
          this.cmdIndex = menu.index
          return menu.index
        }
        yield 1
      }
    } finally {
      this.menu = null
    }
  }

  /** The vertical move list with the type/PP readout. @returns null on B. */
  private *fightMenu(): Task<MoveSlot | null> {
    const g = this.game
    const slots = this.player.mon.k.moves
    const menu = { kind: 'fight' as const, index: Math.min(this.moveIndex, slots.length - 1) }
    this.menu = menu
    try {
      yield 1 // the press that opened FIGHT must not pick a move
      while (true) {
        if (g.input.pressed('up') && menu.index > 0) {
          menu.index--
          playSfx(g, 'menu_move')
        } else if (g.input.pressed('down') && menu.index < slots.length - 1) {
          menu.index++
          playSfx(g, 'menu_move')
        }
        if (g.input.pressed('b')) {
          playSfx(g, 'menu_cancel')
          return null
        }
        if (g.input.pressed('a')) {
          const slot = slots[menu.index]
          if (slot && slot.pp > 0) {
            playSfx(g, 'menu_confirm')
            this.moveIndex = menu.index
            return slot
          }
          playSfx(g, 'bump') // dry move: the cursor stays put
        }
        yield 1
      }
    } finally {
      this.menu = null
    }
  }

  /**
   * Party pick for switches. Rejects fainted members and the one already
   * out; when `forced` (a faint replacement) cancel just reopens the list.
   */
  private *pickParty(forced: boolean): Task<number> {
    const g = this.game
    while (true) {
      const idx = yield* openPartyScreen(g, 'select')
      if (idx < 0) {
        if (!forced) return -1
        continue
      }
      const k = g.state.party[idx]
      // able() re-validates the picker's veto: never fainted, never an egg.
      if (!k || !able(k) || k === this.player.mon.k) {
        playSfx(g, 'bump')
        continue
      }
      return idx
    }
  }

  // ── Move execution ─────────────────────────────────────────────────────────

  /** §11.4: gauntlet, announce, PP, immunity, accuracy, then the effect. */
  private *executeMove(user: Side, target: Side, move: Move, slot: MoveSlot | null, targetActed: boolean): Task<void> {
    const g = this.game
    const verdict = preMoveGauntlet(g.rng, user.mon)
    for (const ev of verdict.events) yield* this.narrateGauntlet(user, ev)
    if (!verdict.acts) return
    yield* this.say(user.isPlayer ? 'sys.used' : 'sys.foe.used', {
      KINDRA: displayName(user.mon.k),
      MOVE: move.name,
    })
    if (slot) slot.pp = Math.max(0, slot.pp - 1)
    const effect = move.effect
    const targeted =
      effect.kind === 'strike' || effect.kind === 'inflict' || effect.kind === 'confuseFoe' ||
      (effect.kind === 'statChange' && effect.target === 'foe')
    if (targeted) {
      // §11.4c: chart immunity is checked before the accuracy roll.
      const theirs = speciesOf(target.mon.k.species)
      if (effectiveness(move.type, theirs.type1, theirs.type2) === 0) {
        yield* this.say('sys.noeffect', { KINDRA: this.tag(target) })
        return
      }
      if (!accuracyCheck(g.rng, user.mon, target.mon, move)) {
        yield* this.say('sys.miss')
        return
      }
    }
    switch (effect.kind) {
      case 'strike':
        yield* this.strike(user, target, move, effect.riders ?? [], targetActed)
        return
      case 'inflict':
        if (inflictStatus(g.rng, target.mon, effect.status)) yield* this.sayStatus(target, effect.status)
        else yield* this.say('sys.stat.capped')
        return
      case 'confuseFoe':
        if (inflictConfusion(g.rng, target.mon)) yield* this.say('sys.status.cnf', { KINDRA: this.tag(target) })
        else yield* this.say('sys.stat.capped')
        return
      case 'statChange': {
        const onto = effect.target === 'self' ? user : target
        for (const ch of effect.changes) yield* this.narrateStage(onto, ch.stat, ch.delta, true)
        return
      }
      case 'heal': {
        const healed = healHp(user.mon, Math.floor(user.mon.stats.hp * effect.fraction))
        if (healed <= 0) {
          yield* this.say('sys.stat.capped') // §12: fails at full HP
          return
        }
        yield* this.animateHp(user)
        yield* this.say('sys.heal.item', { KINDRA: this.tag(user), N: String(healed) })
        return
      }
    }
  }

  /** Damage, per-hit for multi-hit moves, then every §12 rider in order. */
  private *strike(user: Side, target: Side, move: Move, riders: readonly Rider[], targetActed: boolean): Task<void> {
    const g = this.game
    const multi = riders.some((r) => r.kind === 'multiHit')
    const hits = multi ? multiHitCount(g.rng) : 1
    let landed = 0
    let dealtTotal = 0
    let eff = 1
    for (let i = 0; i < hits; i++) {
      // Per-hit crit and random factor (§12 MULTI_HIT, deviation 9).
      const roll = rollDamage(g.rng, user.mon, target.mon, move)
      dealtTotal += dealDamage(target.mon, roll.damage)
      landed++
      eff = roll.effectiveness
      playSfx(g, eff > 1 ? 'hit_super' : eff < 1 ? 'hit_weak' : 'hit_normal')
      yield* this.blink(target.vis)
      yield* this.animateHp(target)
      if (roll.crit) yield* this.say('sys.crit')
      if (target.mon.k.hp <= 0) break // stop early on a faint
    }
    if (eff > 1) yield* this.say('sys.super')
    else if (eff < 1) yield* this.say('sys.notvery')
    if (multi) yield* this.say('sys.multihit', { N: String(landed) })
    if (move.type === 'fire' && dealtTotal > 0 && target.mon.k.status === 'frz') {
      target.mon.k.status = null // §5: a damaging Fire move thaws on the spot
      yield* this.say('sys.status.thaw', { KINDRA: this.tag(target) })
    }
    yield* this.applyRiders(user, target, riders, dealtTotal, targetActed)
  }

  /**
   * §12 riders. Chance rolls happen only when damage was dealt and the
   * target survives (short-circuit keeps the rng stream honest); drain,
   * recoil and recharge are the user's own business and apply regardless
   * of the target's fate.
   */
  private *applyRiders(user: Side, target: Side, riders: readonly Rider[], dealt: number, targetActed: boolean): Task<void> {
    const g = this.game
    const alive = target.mon.k.hp > 0
    for (const r of riders) {
      switch (r.kind) {
        case 'multiHit':
          break // consumed by strike()
        case 'status':
          if (dealt > 0 && alive && g.rng.range(0, 99) < r.chance && inflictStatus(g.rng, target.mon, r.status)) {
            yield* this.sayStatus(target, r.status)
          }
          break
        case 'flinch':
          // §5: flinch only bites a target that has not yet acted this turn.
          if (dealt > 0 && alive && !targetActed && g.rng.range(0, 99) < r.chance) {
            target.mon.flinched = true
          }
          break
        case 'confuse':
          if (dealt > 0 && alive && g.rng.range(0, 99) < r.chance && inflictConfusion(g.rng, target.mon)) {
            yield* this.say('sys.status.cnf', { KINDRA: this.tag(target) })
          }
          break
        case 'stat':
          if (dealt > 0 && alive && g.rng.range(0, 99) < r.chance) {
            yield* this.narrateStage(r.target === 'self' ? user : target, r.stat, r.delta, false)
          }
          break
        case 'drain':
          if (dealt > 0 && healHp(user.mon, Math.max(1, Math.floor(dealt / 2))) > 0) {
            yield* this.animateHp(user)
          }
          break
        case 'recoil':
          if (dealt > 0) {
            dealDamage(user.mon, Math.max(1, Math.floor(dealt / 4)))
            playSfx(g, 'hit_weak')
            yield* this.animateHp(user)
          }
          break
        case 'recharge':
          if (dealt > 0) user.mon.mustRecharge = true
          break
      }
    }
  }

  /** Speak one §5 gauntlet beat; the confusion self-hit lands its damage here. */
  private *narrateGauntlet(side: Side, ev: GauntletEvent): Task<void> {
    const vars = { KINDRA: this.tag(side) }
    switch (ev.kind) {
      case 'recharge': yield* this.say('sys.recharge', vars); return
      case 'asleep': yield* this.say('sys.status.slpSnooze', vars); return
      case 'woke': yield* this.say('sys.status.woke', vars); return
      case 'frozen': yield* this.say('sys.status.frzSolid', vars); return
      case 'thawed': yield* this.say('sys.status.thaw', vars); return
      case 'flinched': yield* this.say('sys.flinch', vars); return
      case 'confused': yield* this.say('sys.status.cnf.idle', vars); return
      case 'snapped': yield* this.say('sys.cnf.snap', vars); return
      case 'fullPar': yield* this.say('sys.status.parFull', vars); return
      case 'selfHit':
        yield* this.say('sys.cnf.hurt')
        dealDamage(side.mon, ev.damage)
        playSfx(this.game, 'hit_normal')
        yield* this.blink(side.vis)
        yield* this.animateHp(side)
        yield* this.berrySweep(side) // §5.5: the self-hit can drop a holder to half
        return
    }
  }

  /** Apply a stage change and narrate rose/fell, sharply at ±2, capped if loud. */
  private *narrateStage(side: Side, stat: BattleStat, delta: number, loud: boolean): Task<void> {
    const moved = changeStage(side.mon, stat, delta)
    if (moved === 0) {
      if (loud) yield* this.say('sys.stat.capped')
      return
    }
    const key = moved >= 2 ? 'sys.stat.rose2' : moved === 1 ? 'sys.stat.rose' : moved <= -2 ? 'sys.stat.fell2' : 'sys.stat.fell'
    yield* this.say(key, { KINDRA: this.tag(side), STAT: STAT_LABEL[stat] })
  }

  private *sayStatus(side: Side, status: StatusId): Task<void> {
    yield* this.say(`sys.status.${status}`, { KINDRA: this.tag(side) })
  }

  /**
   * §5.5: one state-based berry check. Runs at entry/switch-in/send-in,
   * after every executed move (both sides), after a confusion self-hit
   * and in the §11.7 item phase — so a curable status or a half-HP dip
   * never outlives the beat that caused it. Cures mirror itemFlow
   * (status cleared, sleep counter reset); the berry is consumed
   * (deleted, not returned to the bag).
   */
  private *berrySweep(side: Side): Task<void> {
    const k = side.mon.k
    const fire = berryTrigger(heldEffect(k), k.status, k.hp, side.mon.stats.hp)
    if (!fire || !k.heldItem) return
    const item = itemOf(k.heldItem).name
    delete k.heldItem
    if (fire.kind === 'cure') {
      const wasAsleep = k.status === 'slp'
      k.status = null
      if (wasAsleep) side.mon.sleepTurns = 0
      yield* this.say('sys.held.berry.cure', { KINDRA: this.tag(side), ITEM: item })
    } else {
      healHp(side.mon, fire.heal)
      yield* this.animateHp(side)
      yield* this.say('sys.held.berry.hp', { KINDRA: this.tag(side), ITEM: item, N: String(fire.heal) })
    }
  }

  // ── End of turn, faints, growth ────────────────────────────────────────────

  /** §11.7: poison/burn chip, then the item phase (berry → leftovers), both in speed order; flinch flags clear. */
  private *endOfTurn(): Task<void> {
    if (this.result) return
    const g = this.game
    const ps = effectiveStat(this.player.mon, 'spe')
    const fs = effectiveStat(this.foe.mon, 'spe')
    const meFirst = ps !== fs ? ps > fs : g.rng.range(0, 1) === 0
    const order = meFirst ? [this.player, this.foe] : [this.foe, this.player]
    for (const side of order) {
      if (this.result) return
      const st = side.mon.k.status
      if (side.mon.k.hp <= 0 || (st !== 'psn' && st !== 'brn')) continue
      yield* this.say(st === 'psn' ? 'sys.status.psnHurt' : 'sys.status.brnHurt', { KINDRA: this.tag(side) })
      dealDamage(side.mon, Math.max(1, Math.floor(side.mon.stats.hp / 8)))
      playSfx(g, 'hit_weak')
      yield* this.animateHp(side)
      yield* this.faintSweep()
    }
    // §11.7 item phase, same speed order, after chip and its faints — the
    // Gen-2 cruelty stands: poison can kill a holder before its item saves it.
    for (const side of order) {
      if (this.result) return
      const k = side.mon.k
      if (k.hp <= 0) continue
      yield* this.berrySweep(side)
      const fx = heldEffect(k)
      if (fx?.kind === 'leftovers' && k.heldItem && k.hp < side.mon.stats.hp) {
        healHp(side.mon, leftoversAmount(side.mon.stats.hp))
        yield* this.animateHp(side)
        yield* this.say('sys.held.leftovers', { KINDRA: this.tag(side), ITEM: itemOf(k.heldItem).name })
      }
    }
    this.player.mon.flinched = false
    this.foe.mon.flinched = false
  }

  /**
   * §11.5: faint ceremonies for whichever sides are down, then the
   * consequences — exp to a standing victor, the tamer's next Kindra or
   * the victory rites, a forced replacement or the loss. A fully fainted
   * party is always a loss, so the overworld can run the whiteout.
   */
  private *faintSweep(): Task<void> {
    if (this.result) return
    const g = this.game
    const foeDown = this.foe.mon.k.hp <= 0 && this.foe.vis.shown
    const playerDown = this.player.mon.k.hp <= 0 && this.player.vis.shown
    if (!foeDown && !playerDown) return
    const fallen = this.foe.mon.k
    if (foeDown) {
      playSfx(g, 'faint_fall')
      this.foe.panelOn = false
      yield* this.sink(this.foe.vis)
      yield* this.say('sys.foe.faint', { KINDRA: displayName(fallen) })
    }
    if (playerDown) {
      playSfx(g, 'faint_fall')
      this.player.panelOn = false
      yield* this.sink(this.player.vis)
      yield* this.say('sys.faint', { KINDRA: displayName(this.player.mon.k) })
      // Every player-side faint funnels through here — moves, chip, self-hits.
      bondEvent(this.player.mon.k, 'faint')
    }
    // A party of eggs and the fainted IS a wipe — an egg can't take the field,
    // and treating its full HP as fight would softlock the forced switch.
    const wiped = playerDown && !g.state.party.some(able)
    const foesLeft = this.foeParty.some((k) => k.hp > 0)
    if (foeDown && !foesLeft && !wiped) playSong(g, 'victory')
    // §9.1: only a standing active battler collects exp and statExp.
    if (foeDown && !playerDown) yield* this.expFlow(fallen)
    if (wiped) {
      this.result = { outcome: 'loss' }
      return
    }
    if (foeDown) {
      if (foesLeft) yield* this.sendFoe(this.foeIndex())
      else {
        yield* this.victory()
        return
      }
    }
    if (playerDown) {
      yield 1 // the press that closed the faint line must not pick a member
      const idx = yield* this.pickParty(true)
      yield* this.switchFlow(idx, false)
    }
  }

  /** Trainer rites — defeat speech and prize Glints — then the win. */
  private *victory(): Task<void> {
    const trainer = this.cfg.trainer
    if (trainer) {
      const art = trainerArtOf(trainer.sprite)
      this.setVis(this.foe.vis, art.sprite, art.palette)
      yield* this.rise(this.foe.vis)
      yield* this.say(trainer.defeatText, {}, 'press')
      this.game.state.glints += trainer.reward
      const n = String(trainer.reward)
      yield* this.say('sys.money.win', { N: n, AMOUNT: n })
    }
    // A gym victory warms the whole party's bond (keyed on cfg.isGym, so
    // future gyms inherit it without content edits).
    if (this.cfg.isGym) for (const k of this.game.state.party) bondEvent(k, 'gymWin')
    this.result = { outcome: 'win' }
  }

  /** §9: exp + statExp to the victor, level-ups and move learning per event. */
  private *expFlow(fallen: Kindra): Task<void> {
    const g = this.game
    const active = this.player.mon
    const gain = expGain(fallen, this.cfg.kind === 'trainer')
    if (gain <= 0) return
    grantStatExp(active.k, speciesOf(fallen.species).base)
    yield* this.say('sys.exp', { KINDRA: displayName(active.k), N: String(gain), EXP: String(gain) })
    const events = applyExp(active.k, gain, g.period()) // live clock: night rules can fire (§13)
    for (const ev of events) {
      yield* this.animateExp(1)
      this.playerExp = 0
      playSfx(g, 'levelup')
      active.stats = statsOf(active.k) // §9.5: immediate recalc; HP already grew
      yield* this.animateHp(this.player)
      yield* this.say('sys.levelup', { KINDRA: displayName(active.k), N: String(ev.newLevel), LEVEL: String(ev.newLevel) })
      for (const moveKey of ev.learns) yield* this.learnFlow(active, moveKey)
    }
    yield* this.animateExp(this.expFraction(active.k))
  }

  /** §9.5 move learning: free slot or the forget-one ceremony (B skips). */
  private *learnFlow(mon: BattleMon, moveKey: string): Task<void> {
    const g = this.game
    const move = moveOf(moveKey)
    const name = displayName(mon.k)
    if (mon.k.moves.length < 4) {
      mon.k.moves.push({ move: moveKey, pp: move.pp, ppMax: move.pp })
      yield* this.say('sys.learn.learned', { KINDRA: name, MOVE: move.name })
      return
    }
    yield* this.say('sys.learn.wants', { KINDRA: name, MOVE: move.name })
    yield* this.say('sys.learn.full', { KINDRA: name })
    yield* this.say('sys.learn.forget', {}, 'none')
    yield 1 // the press that cleared the prompt must not pick a move
    const pick = yield* askChoice(g, mon.k.moves.map((s) => moveOf(s.move).name), { cancelIndex: -1 })
    const old = pick >= 0 ? mon.k.moves[pick] : undefined
    if (!old) {
      yield* this.say('sys.learn.skipped', { KINDRA: name, MOVE: move.name })
      return
    }
    yield* this.say('sys.learn.forgot', { KINDRA: name, MOVE: moveOf(old.move).name })
    mon.k.moves[pick] = { move: moveKey, pp: move.pp, ppMax: move.pp }
    yield* this.say('sys.learn.learned', { KINDRA: name, MOVE: move.name })
  }

  // ── Player actions: run, items, capture, switching ─────────────────────────

  /** §11.8: the Gen-2 escape formula; failure hands the turn to the foe. */
  private *runFlow(): Task<void> {
    this.fleeAttempts++
    if (attemptEscape(this.game.rng, this.player.mon, this.foe.mon, this.fleeAttempts)) {
      yield* this.say('sys.run.ok')
      this.result = { outcome: 'fled' }
    } else {
      yield* this.say('sys.run.fail')
    }
  }

  /** A tonic or cure on a chosen member; usability was vetted at pick time. */
  private *itemFlow(item: Item, partyIdx: number): Task<void> {
    const g = this.game
    const k = g.state.party[partyIdx]
    if (!k) return
    bagRemove(g.state, item.key, 1)
    yield* this.say('sys.item.use', { ITEM: item.name })
    if (item.effect.kind === 'heal') {
      const healed = Math.min(item.effect.amount, statsOf(k).hp - k.hp)
      k.hp += healed
      if (k === this.player.mon.k) yield* this.animateHp(this.player)
      yield* this.say('sys.heal.item', { KINDRA: displayName(k), N: String(healed) })
    } else if (item.effect.kind === 'cure') {
      const wasAsleep = k.status === 'slp'
      k.status = null
      if (k === this.player.mon.k && wasAsleep) this.player.mon.sleepTurns = 0
      yield* this.say('sys.cure.item', { KINDRA: displayName(k) })
    }
  }

  /** §8 + §11.9: throw, arc, wobbles, click — or the break-free letdown. */
  private *captureFlow(item: Item): Task<void> {
    const g = this.game
    bagRemove(g.state, item.key, 1)
    yield* this.say('sys.catch.throw', { ITEM: item.name })
    playSfx(g, 'charm_throw')
    const x1 = FOE_CX - 8
    const y1 = FOE_BASE - 18
    const x0 = PLAYER_CX
    const y0 = PLAYER_BASE - 44
    const arc = 28
    for (let t = 0; t <= arc; t++) {
      const f = t / arc
      this.charm = {
        x: Math.round(x0 + (x1 - x0) * f),
        y: Math.round(y0 + (y1 - y0) * f - 26 * Math.sin(Math.PI * f)),
      }
      yield 1
    }
    this.foe.vis.shown = false
    yield 12
    const res = attemptCapture(g.rng, this.foe.mon, item)
    const wobbles = res.caught ? 3 : res.shakes
    for (let i = 0; i < wobbles; i++) {
      yield 20 // with the wobble itself this spaces shakes ≥500ms apart
      playSfx(g, 'charm_shake')
      for (const dx of [-2, -2, 0, 2, 2, 0]) {
        this.charm = { x: x1 + dx, y: y1 }
        yield 3
      }
    }
    if (res.caught) {
      yield 16
      playSfx(g, 'charm_click')
      yield 24 // the spec'd beat of stillness before any fanfare
      playSong(g, 'victory')
      // The live foe object crosses over whole — a wild-held item (§10.2)
      // rides along on caught.heldItem, the Gen-2 "catch it for its item" loop.
      const caught = this.foe.mon.k
      const fresh = !g.state.caught.includes(caught.species)
      yield* this.say('sys.catch.success', { KINDRA: displayName(caught) }, 'press')
      const home = addKindra(g.state, caught)
      yield* this.say(home === 'party' ? 'sys.catch.party' : 'sys.catch.archive', { KINDRA: displayName(caught) })
      if (fresh) yield* this.say('sys.kindex.reg', { KINDRA: displayName(caught) })
      this.charm = null
      this.result = { outcome: 'caught', caught }
    } else {
      yield 10
      this.charm = null
      this.foe.vis.shown = true
      yield* this.say(res.shakes >= 3 ? 'sys.catch.almost' : 'sys.catch.broke')
    }
  }

  /** Recall (when voluntary) and send the replacement; stages reset (§3). */
  private *switchFlow(idx: number, voluntary: boolean): Task<void> {
    const g = this.game
    const next = g.state.party[idx]
    if (!next) return
    if (voluntary) {
      yield* this.say('sys.return', { KINDRA: displayName(this.player.mon.k) })
      this.player.panelOn = false
      yield* this.sink(this.player.vis)
    }
    this.player.mon = this.intake(next)
    this.player.shownHp = next.hp
    this.playerExp = this.expFraction(next)
    yield* this.say('sys.go', { KINDRA: displayName(next) })
    const art = monArtOf(next.species)
    this.setVis(this.player.vis, art.back, art.palette)
    yield* this.rise(this.player.vis)
    this.player.panelOn = true
    yield* this.berrySweep(this.player) // §5.5 switch-in check
  }

  /** The tamer's next able Kindra takes the platform (no turn cost, §11.5). */
  private *sendFoe(idx: number): Task<void> {
    const g = this.game
    const k = this.foeParty[idx]
    if (!k) throw new Error(`sendFoe: no able foe at index ${idx}`)
    this.foe.mon = this.intake(k)
    this.foe.shownHp = k.hp
    markSeen(g.state, k.species)
    if (this.cfg.trainer) {
      yield* this.say('sys.battle.foesend', { TRAINER: this.cfg.trainer.name, KINDRA: displayName(k) })
    }
    const art = monArtOf(k.species)
    this.setVis(this.foe.vis, art.front, art.palette)
    yield* this.rise(this.foe.vis)
    this.foe.panelOn = true
    yield* this.berrySweep(this.foe) // §5.5 send-in check
  }

  // ── The typewriter ─────────────────────────────────────────────────────────

  /**
   * Speak a string-table key in the battle box: interpolated, wrapped to
   * 18x2, typed ~1 char per 2 ticks (A/B held speeds it up), blipping
   * every 2nd glyph. Intermediate pages wait for A; the final page obeys
   * `hold`.
   */
  private *say(key: string, vars: Record<string, string> = {}, hold: Hold = 'auto'): Task<void> {
    const g = this.game
    const pages: string[][] = []
    for (const box of str(key)) pages.push(...paginate(wrapText(interpolate(g, box, vars))))
    for (let p = 0; p < pages.length; p++) {
      const lines = pages[p] ?? ['']
      this.msgLines = lines
      this.msgShown = 0
      this.msgWaiting = false
      const total = lines.reduce((n, l) => n + l.length, 0)
      let tick = 0
      let sinceBlip = 0
      while (this.msgShown < total) {
        const add = g.input.held('a') || g.input.held('b') ? 2 : tick % 2 === 0 ? 1 : 0
        this.msgShown = Math.min(total, this.msgShown + add)
        sinceBlip += add
        if (sinceBlip >= 2) {
          playSfx(g, 'text_blip')
          sinceBlip = 0
        }
        tick++
        yield 1
      }
      const mode: Hold = p < pages.length - 1 ? 'press' : hold
      if (mode === 'press') {
        this.msgWaiting = true
        yield () => g.input.pressed('a') || g.input.pressed('b')
        this.msgWaiting = false
      } else if (mode === 'auto') {
        for (let t = 0; t < AUTO_HOLD_TICKS; t++) {
          if (g.input.pressed('a') || g.input.pressed('b')) break
          yield 1
        }
      }
    }
  }

  // ── Animation strokes ──────────────────────────────────────────────────────

  /** Drain (or refill) a bar toward the truth, ~1px of bar per 2 ticks. */
  private *animateHp(side: Side): Task<void> {
    const rate = Math.max(side.mon.stats.hp / (HP_BAR_PX * 2), 0.25)
    while (side.shownHp !== side.mon.k.hp) {
      const d = side.mon.k.hp - side.shownHp
      side.shownHp += Math.sign(d) * Math.min(rate, Math.abs(d))
      yield 1
    }
  }

  /** Slide the EXP bar fill toward `target`, a pixel a tick. */
  private *animateExp(target: number): Task<void> {
    const rate = 1 / EXP_BAR_PX
    while (this.playerExp !== target) {
      const d = target - this.playerExp
      this.playerExp += Math.sign(d) * Math.min(rate, Math.abs(d))
      yield 1
    }
  }

  /** Walk a battler offscreen toward its own edge, then hide it. */
  private *slideOut(v: Vis, dir: 1 | -1): Task<void> {
    for (let i = 0; i < SLIDE_PX / 4; i++) {
      v.dx += dir * 4
      yield 1
    }
    v.shown = false
    v.dx = 0
  }

  /** Grow a freshly set sprite up out of its platform. */
  private *rise(v: Vis): Task<void> {
    v.shown = true
    while (v.rows < v.spr.h) {
      v.rows = Math.min(v.spr.h, v.rows + 4)
      yield 1
    }
  }

  /** Sink a battler down through its platform (faints, recalls). */
  private *sink(v: Vis): Task<void> {
    while (v.rows > 0) {
      v.rows = Math.max(0, v.rows - 4)
      yield 1
    }
    v.shown = false
  }

  /** The impact flicker: two quick blinks of the sprite. */
  private *blink(v: Vis): Task<void> {
    for (let i = 0; i < 2; i++) {
      v.shown = false
      yield 3
      v.shown = true
      yield 3
    }
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  /** Enter battle with fresh volatiles; an already-sleeping arrival rolls a counter. */
  private intake(k: Kindra): BattleMon {
    const mon = intoBattle(k)
    if (k.status === 'slp') mon.sleepTurns = this.game.rng.range(1, 6)
    return mon
  }

  /** Message name: the foe's Kindra speak under a 'Foe ' prefix. */
  private tag(side: Side): string {
    return side.isPlayer ? displayName(side.mon.k) : `Foe ${displayName(side.mon.k)}`
  }

  private foeIndex(): number {
    return this.foeParty.findIndex((k) => k.hp > 0)
  }

  /** Progress into the current level, 0..1, for the EXP bar. */
  private expFraction(k: Kindra): number {
    if (k.level >= 100) return 0
    const growth = speciesOf(k.species).growth
    const cur = expForLevel(k.level, growth)
    const next = expForLevel(k.level + 1, growth)
    return Math.max(0, Math.min(1, (k.exp - cur) / Math.max(1, next - cur)))
  }

  private setVis(v: Vis, spr: Sprite, pal: Palette): void {
    v.spr = spr
    v.pal = pal
    v.dx = 0
    v.rows = 0
    v.shown = false
  }

  private fightEntries(): MoveEntry[] {
    return this.player.mon.k.moves.map((s) => {
      const m = moveOf(s.move)
      return { name: m.name, type: m.type.toUpperCase(), pp: s.pp, ppMax: s.ppMax }
    })
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  draw(fb: FrameBuffer): void {
    // Battles are studio-lit; the overworld restores the live period in its own draw.
    fb.setPeriod('day')
    fb.clear(PAL_BATTLE_BG, 0)
    drawPlatform(fb, FOE_CX, FOE_BASE + 2, 26, 6)
    drawPlatform(fb, PLAYER_CX, PLAYER_BASE + 2, 26, 6)
    this.drawSide(fb, this.foe, FOE_CX, FOE_BASE)
    this.drawSide(fb, this.player, PLAYER_CX, PLAYER_BASE)
    if (this.foe.panelOn) {
      const k = this.foe.mon.k
      drawFoePanel(fb, displayName(k), k.level, k.status, this.foe.shownHp, this.foe.mon.stats.hp)
    }
    if (this.player.panelOn) {
      const k = this.player.mon.k
      drawPlayerPanel(fb, displayName(k), k.level, k.status, this.player.shownHp, this.player.mon.stats.hp, this.playerExp)
    }
    drawMessage(fb, this.msgLines, this.msgShown, this.msgWaiting, this.game.frames)
    if (this.menu?.kind === 'command') drawCommandMenu(fb, this.menu.index)
    else if (this.menu?.kind === 'fight') drawFightMenu(fb, this.fightEntries(), this.menu.index)
    if (this.charm) fb.blit(UI_ART.charm, PAL_UI, this.charm.x, this.charm.y)
  }

  private drawSide(fb: FrameBuffer, side: Side, cx: number, base: number): void {
    const v = side.vis
    if (!v.shown) return
    const spr = cropBottom(v.spr, v.rows)
    if (!spr) return
    fb.blit(spr, v.pal, Math.floor(cx - v.spr.w / 2) + v.dx, base - v.rows)
  }
}
