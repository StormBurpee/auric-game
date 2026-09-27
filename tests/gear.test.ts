/**
 * The Charm Gear, proven: the region graph welded to the atlas (an
 * orphan map fails here before it ships), the journal's quests as pure
 * flag projections walked in story order, contact derivation and the
 * rematch ladder math, the dayStamp-rotated flavor pools, Mom's grant
 * (first-run and retroactive), and the UI flows driven headless in
 * main.ts tick order — pause routes into the Gear, tabs switch, calls
 * and quest pages stack and unstack cleanly.
 */
import { describe, expect, it } from 'vitest'
import { Input, Rng, SaveSlot, SceneStack, Scheduler } from '../src/engine'
import type { Apu, Button, FrameBuffer, Sequencer } from '../src/engine'
import { dayOfWeek, dayStamp } from '../src/game/clock'
import { TRAINERS } from '../src/game/data'
import { momHome } from '../src/game/data/events/services'
import { MAPS } from '../src/game/data/maps'
import {
  condMet, contactList, flavorLineKey, journalRows, phonePrefix, phoneStatus, QUESTS,
  questView, rematchesDone, rematchLadder, rematchOffer, rematchTarget,
} from '../src/game/data/quests'
import type { CallCtx, QuestDef } from '../src/game/data/quests'
import type { Game } from '../src/game/game'
import type { GameScript, ScriptCtx } from '../src/game/script/dsl'
import { flag, newSave, setFlag } from '../src/game/state'
import type { MapDef, SaveData, TrainerDef } from '../src/game/types'
import { GearScene, openGear } from '../src/game/ui/gear'
import { QuestDetailScene } from '../src/game/ui/gearJournal'
import { buildRegionGraph, nodeName, REGION_GRAPH, REGION_LAYOUT } from '../src/game/ui/gearMap'
import { callFlow } from '../src/game/ui/gearPhone'
import { openPauseMenu, pauseItems } from '../src/game/ui/pause'

// ── Harness (the ui.test.ts pattern) ────────────────────────────────────────

function makeGame(): Game {
  const game: Game = {
    fb: null as unknown as FrameBuffer,
    input: new Input(),
    scenes: new SceneStack(),
    tasks: new Scheduler(),
    apu: { context: null } as unknown as Apu,
    seq: null as unknown as Sequencer,
    rng: new Rng(7),
    save: new SaveSlot<SaveData>('test:gear', 1),
    state: newSave('STORM'),
    frames: 0,
    debugPeriod: null,
    debugDay: null,
    period: () => 'day' as const,
    day: () => 0 as const,
  }
  return game
}

/** One tick in main.ts order. */
function tick(game: Game): void {
  game.input.beginFrame()
  game.frames++
  game.tasks.tick()
  game.scenes.update()
}

/** Press a button for exactly one tick. */
function tap(game: Game, b: Button): void {
  game.input.setDown(b, true)
  tick(game)
  game.input.setDown(b, false)
}

/** Press, then one released tick — back-to-back presses stay fresh edges. */
function press(game: Game, b: Button): void {
  tap(game, b)
  tick(game)
}

/** Tick until the condition holds (the ring beats are fixed-length waits). */
function until(game: Game, cond: () => boolean, max = 200): void {
  for (let i = 0; i < max && !cond(); i++) tick(game)
  expect(cond()).toBe(true)
}

/** Fill-and-advance dialog pages until the stack settles at `depthAfter`. */
function dismissText(game: Game, depthAfter: number): void {
  for (let i = 0; i < 8 && game.scenes.depth !== depthAfter; i++) {
    press(game, 'b') // fill
    press(game, 'a') // advance or pop
  }
  expect(game.scenes.depth).toBe(depthAfter)
}

const ctxAt = (stamp: number): CallCtx => ({ period: 'day', dow: 3, dayStamp: stamp })

const questOf = (id: string): QuestDef => {
  const q = QUESTS.find((q) => q.id === id)
  if (!q) throw new Error(`no quest '${id}'`)
  return q
}

/** Synthetic trainer registry — independent of the game contact registry. */
const tdef = (key: string, contact?: { name: string; place: string }): TrainerDef => ({
  key,
  name: key.replace(/_/g, ' '),
  sprite: 'TRAINER_SCOUT',
  ai: 'random',
  reward: 100,
  defeatText: 'story.x',
  party: [{ species: 'WRENLET', level: 6 }],
  ...(contact ? { contact } : {}),
})

const REG: Record<string, TrainerDef> = {
  SCOUT_BEN: tdef('SCOUT_BEN', { name: 'BEN', place: 'TRAIL 2' }),
  SCOUT_BEN_R1: tdef('SCOUT_BEN_R1'),
  FORAGER_MAE: tdef('FORAGER_MAE', { name: 'MAE', place: 'TRAIL 2' }),
}

// ── The region graph: welded to the atlas ───────────────────────────────────

describe('region graph', () => {
  it('welds: every map in the atlas resolves to a node', () => {
    for (const id of Object.keys(MAPS)) {
      expect(REGION_GRAPH.nodeOf[id], id).toBeDefined()
    }
  })

  it('outdoor maps are their own nodes; interiors resolve to their towns', () => {
    const at = (id: string): number => REGION_GRAPH.nodeOf[id]!
    REGION_LAYOUT.forEach((n, i) => expect(at(n.map)).toBe(i))
    expect(at('player_home')).toBe(at('dawnfern'))
    expect(at('larch_lab')).toBe(at('dawnfern'))
    expect(at('bellmere_haven')).toBe(at('bellmere'))
    expect(at('elder_house')).toBe(at('bellmere'))
    expect(at('bellmere_outfitter')).toBe(at('bellmere'))
    expect(at('loomspire_haven')).toBe(at('loomspire'))
    expect(at('loomspire_gym')).toBe(at('loomspire'))
    expect(at('wisteria_spire_2f')).toBe(at('wisteria_spire_1f'))
  })

  it('links carry exactly the WORLD.md chain plus loomspire-spire', () => {
    expect(REGION_GRAPH.links).toEqual([[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]])
  })

  it('pins coordinates on-canvas and names within the footer budget', () => {
    for (const n of REGION_GRAPH.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(8)
      expect(n.x).toBeLessThanOrEqual(152)
      expect(n.y).toBeGreaterThanOrEqual(20)
      expect(n.y).toBeLessThanOrEqual(124)
      const name = nodeName(n)
      expect(name.length, name).toBeGreaterThan(0)
      expect(name.length, name).toBeLessThanOrEqual(16)
    }
  })

  it('derivation is deterministic', () => {
    expect(buildRegionGraph(MAPS, REGION_LAYOUT)).toEqual(buildRegionGraph(MAPS, REGION_LAYOUT))
  })

  it('an orphan map stays out of nodeOf — the CI tripwire', () => {
    const orphan: MapDef = {
      id: 'zzz_orphan', name: '', music: 'x', width: 1, height: 1,
      tiles: new Uint8Array(1), outdoor: false, warps: [], spawns: {},
      npcs: [], signs: [], items: [],
    }
    const g = buildRegionGraph({ ...MAPS, zzz_orphan: orphan }, REGION_LAYOUT)
    expect(g.nodeOf['zzz_orphan']).toBeUndefined()
    expect(g.links).toEqual(REGION_GRAPH.links)
  })
})

// ── The clock seam ──────────────────────────────────────────────────────────

describe('dayOfWeek / dayStamp', () => {
  it('reads the JS week and honours the override', () => {
    const wed = new Date(2026, 5, 10, 12, 0)
    expect(dayOfWeek(null, wed)).toBe(3)
    expect(dayOfWeek(6, wed)).toBe(6)
  })

  it('weeks start on Monday and survive midnight', () => {
    const sun = new Date(2026, 5, 7, 23, 59)
    const monStart = new Date(2026, 5, 8, 0, 0)
    const monNoon = new Date(2026, 5, 8, 12, 0)
    const nextSun = new Date(2026, 5, 14, 23, 59)
    expect(dayStamp(monStart)).toBe(dayStamp(sun) + 1)
    expect(dayStamp(monNoon)).toBe(dayStamp(monStart))
    expect(dayStamp(nextSun)).toBe(dayStamp(monStart))
  })
})

// ── Quests: pure projections of writer-verified flags ───────────────────────

describe('quest registry', () => {
  it('speaks only writer-verified flags (the D6 inventory)', () => {
    const whitelist = new Set([
      'mom_sendoff', 'starter_chosen', 'kindex_given', 'rival1_done',
      'badge_zephyr', 'charm_gear',
      'beat_SCOUT_BEN', 'beat_FORAGER_MAE', 'beat_BELLRINGER_OTTO', 'beat_HERBALIST_IVY',
      'beat_GLIDER_FERN', 'beat_GLIDER_JUNO',
    ])
    const conds = QUESTS.flatMap((q) => [q.unlock, ...q.stages.map((st) => st.done)])
    for (const c of conds) {
      if (c.kind === 'flag') expect(whitelist.has(c.flag), c.flag).toBe(true)
      if (c.kind === 'allFlags') for (const f of c.flags) expect(whitelist.has(f), f).toBe(true)
      if (c.kind === 'flagCount') expect(['contact_', 'item_trail']).toContain(c.prefix)
    }
    // Every beat_ flag a quest names belongs to a real trainer.
    for (const f of [...whitelist].filter((f) => f.startsWith('beat_'))) {
      expect(TRAINERS[f.slice(5)], f).toBeDefined()
    }
  })

  it('keeps ids unique, titles in budget, string keys in convention', () => {
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length)
    expect(QUESTS.length).toBe(8)
    for (const q of QUESTS) {
      expect(q.title.length, q.title).toBeLessThanOrEqual(16)
      expect(q.title).toBe(q.title.toUpperCase())
      q.stages.forEach((st, i) => expect(st.desc).toBe(`story.quest.${q.id}.${i + 1}`))
      expect(q.epilogue).toBe(`story.quest.${q.id}.done`)
    }
  })

  it('projects the whole campaign in story order', () => {
    const s = newSave('STORM')
    const view = (id: string) => questView(s, questOf(id))
    expect(journalRows(s)).toEqual([])

    setFlag(s, 'mom_sendoff')
    expect(view('fieldnotes')).toEqual({ visible: true, stage: 0, complete: false })
    expect(view('coldeyes').visible).toBe(false)

    setFlag(s, 'starter_chosen')
    expect(view('fieldnotes').stage).toBe(1)
    expect(view('coldeyes').visible).toBe(true)
    expect(view('treasures').visible).toBe(true)

    setFlag(s, 'kindex_given')
    expect(view('fieldnotes')).toEqual({ visible: true, stage: 2, complete: true })
    expect(view('zephyr').visible).toBe(true)
    expect(view('trail2').visible).toBe(true)
    expect(view('bonds').visible).toBe(true)

    s.caught.push('VERDIL', 'SCURRIL', 'WRENLET')
    expect(view('bonds').stage).toBe(1)
    s.caught.push('THREDLE', 'SPOOLEN', 'DEWBELL')
    expect(view('bonds').stage).toBe(2)
    s.caught.push('WISPETAL', 'HUSHOWL', 'SHADEKIT', 'EMBERIT')
    expect(view('bonds').complete).toBe(true)

    setFlag(s, 'rival1_done')
    expect(view('coldeyes').complete).toBe(true)

    setFlag(s, 'beat_GLIDER_FERN')
    expect(view('zephyr').stage).toBe(0)
    setFlag(s, 'beat_GLIDER_JUNO')
    expect(view('zephyr').stage).toBe(1)
    setFlag(s, 'badge_zephyr')
    expect(view('zephyr').complete).toBe(true)

    for (const k of ['SCOUT_BEN', 'FORAGER_MAE', 'BELLRINGER_OTTO', 'HERBALIST_IVY']) {
      setFlag(s, 'beat_' + k)
    }
    expect(view('trail2').complete).toBe(true)

    setFlag(s, 'item_trail1_charm')
    setFlag(s, 'item_trail1_tonic')
    expect(view('treasures').stage).toBe(0)
    setFlag(s, 'item_trail1_grove')
    expect(view('treasures').stage).toBe(1)
    setFlag(s, 'item_trail1_berry')
    setFlag(s, 'item_trail2_tonic')
    setFlag(s, 'item_trail2_charm')
    expect(view('treasures').complete).toBe(true)

    setFlag(s, 'charm_gear')
    expect(view('fullgear')).toEqual({ visible: true, stage: 0, complete: false })
    expect(view('oldfriends').visible).toBe(false)

    setFlag(s, 'contact_SCOUT_BEN')
    expect(view('fullgear').stage).toBe(1)
    expect(view('oldfriends')).toEqual({ visible: true, stage: 0, complete: false })
    setFlag(s, 'contact_FORAGER_MAE')
    setFlag(s, 'contact_BELLRINGER_OTTO')
    setFlag(s, 'contact_HERBALIST_IVY')
    expect(view('fullgear').complete).toBe(true)

    // Base wins never count as rematches; only beat_<key>_R<n> does.
    expect(view('oldfriends').stage).toBe(0)
    setFlag(s, 'beat_SCOUT_BEN_R1')
    expect(view('oldfriends').stage).toBe(1)
    setFlag(s, 'beat_FORAGER_MAE_R1')
    setFlag(s, 'beat_BELLRINGER_OTTO_R1')
    setFlag(s, 'beat_HERBALIST_IVY_R1')
    expect(view('oldfriends').complete).toBe(true)

    // The whole board, complete and visible.
    const rows = journalRows(s)
    expect(rows.length).toBe(8)
    expect(rows.every((r) => r.view.complete)).toBe(true)
  })

  it('journal rows sink completed quests below the actives', () => {
    const s = newSave('STORM')
    setFlag(s, 'mom_sendoff')
    setFlag(s, 'starter_chosen')
    setFlag(s, 'kindex_given') // fieldnotes completes; coldeyes & co. stay active
    const rows = journalRows(s)
    const ids = rows.map((r) => r.quest.id)
    expect(ids[ids.length - 1]).toBe('fieldnotes')
    expect(rows[rows.length - 1]!.view.complete).toBe(true)
    expect(rows.slice(0, -1).every((r) => !r.view.complete)).toBe(true)
  })

  it('rematch wins never leak into flagCount prefixes', () => {
    const s = newSave('STORM')
    setFlag(s, 'beat_SCOUT_BEN_R1')
    expect(condMet(s, { kind: 'flagCount', prefix: 'contact_', min: 1 })).toBe(false)
    expect(condMet(s, { kind: 'flagCount', prefix: 'item_trail', min: 1 })).toBe(false)
    expect(condMet(s, { kind: 'rematches', min: 1 })).toBe(true)
    expect(condMet(s, { kind: 'rematches', min: 2 })).toBe(false)
  })
})

// ── Contacts & the rematch ladder ───────────────────────────────────────────

describe('contactList', () => {
  it('derives MOM, LARCH, and registered trainers from flags alone', () => {
    const s = newSave('STORM')
    expect(contactList(s, REG)).toEqual([])
    setFlag(s, 'charm_gear')
    expect(contactList(s, REG).map((r) => r.key)).toEqual(['MOM'])
    setFlag(s, 'starter_chosen')
    expect(contactList(s, REG).map((r) => r.key)).toEqual(['MOM', 'LARCH'])
    setFlag(s, 'contact_SCOUT_BEN')
    const rows = contactList(s, REG)
    expect(rows.map((r) => r.key)).toEqual(['MOM', 'LARCH', 'SCOUT_BEN'])
    expect(rows[2]).toMatchObject({ name: 'BEN', place: 'TRAIL 2' })
    expect(rows[2]!.trainer).toBe(REG['SCOUT_BEN'])
    // A flag with no contact-bearing def never makes a row.
    setFlag(s, 'contact_SCOUT_BEN_R1')
    expect(contactList(s, REG).length).toBe(3)
  })

  it('keeps the place column inside its 8-char budget', () => {
    const s = newSave('STORM')
    setFlag(s, 'charm_gear')
    setFlag(s, 'starter_chosen')
    for (const row of contactList(s, REG)) {
      expect(row.place.length, row.key).toBeLessThanOrEqual(8)
      expect(row.name.length, row.key).toBeLessThanOrEqual(10)
    }
  })
})

describe('rematch ladder', () => {
  it('climbs: gate, offer, arm, win, spend', () => {
    const s = newSave('STORM')
    const ben = REG['SCOUT_BEN']!
    expect(rematchLadder('SCOUT_BEN', REG)).toEqual(['SCOUT_BEN_R1'])
    expect(rematchLadder('FORAGER_MAE', REG)).toEqual([])

    // No badge: gated to small talk.
    setFlag(s, 'beat_SCOUT_BEN')
    expect(rematchOffer(s, ben, ctxAt(0), REG)).toBeNull()
    // The badge opens tier 1.
    setFlag(s, 'badge_zephyr')
    expect(rematchOffer(s, ben, ctxAt(0), REG)).toBe('SCOUT_BEN_R1')
    // Nothing is armed until the call says YES.
    expect(rematchTarget(s, 'SCOUT_BEN', REG)).toBeNull()
    setFlag(s, 'challenge_SCOUT_BEN')
    expect(rematchTarget(s, 'SCOUT_BEN', REG)).toBe('SCOUT_BEN_R1')
    expect(rematchOffer(s, ben, ctxAt(0), REG)).toBeNull() // armed: nothing new to offer
    // The win lands as an ordinary beat_ flag; the ladder is climbed out.
    expect(rematchesDone(s, 'SCOUT_BEN')).toBe(0)
    setFlag(s, 'beat_SCOUT_BEN_R1')
    expect(rematchesDone(s, 'SCOUT_BEN')).toBe(1)
    expect(rematchTarget(s, 'SCOUT_BEN', REG)).toBeNull()
    expect(rematchOffer(s, ben, ctxAt(0), REG)).toBeNull()
  })

  it('never offers a rematch before the base party falls', () => {
    const s = newSave('STORM')
    setFlag(s, 'badge_zephyr')
    expect(rematchOffer(s, REG['SCOUT_BEN']!, ctxAt(0), REG)).toBeNull()
  })
})

describe('phoneStatus', () => {
  it('walks a trainer contact through every state', () => {
    const s = newSave('STORM')
    setFlag(s, 'charm_gear')
    setFlag(s, 'contact_SCOUT_BEN')
    setFlag(s, 'beat_SCOUT_BEN')
    const row = contactList(s, REG).find((r) => r.key === 'SCOUT_BEN')!
    expect(phonePrefix(row)).toBe('story.phone.ben')
    // Gated: flavor1.
    expect(phoneStatus(s, row, ctxAt(0), REG))
      .toEqual({ kind: 'flavor', key: 'story.phone.ben.flavor1' })
    // Badge: the offer.
    setFlag(s, 'badge_zephyr')
    expect(phoneStatus(s, row, ctxAt(0), REG))
      .toEqual({ kind: 'offer', key: 'story.phone.ben.offer', defKey: 'SCOUT_BEN_R1' })
    // Armed: the reminder.
    setFlag(s, 'challenge_SCOUT_BEN')
    expect(phoneStatus(s, row, ctxAt(0), REG))
      .toEqual({ kind: 'armed', key: 'story.phone.ben.armed', defKey: 'SCOUT_BEN_R1' })
    // Climbed out: spent (whether or not a stale challenge lingers).
    setFlag(s, 'beat_SCOUT_BEN_R1')
    expect(phoneStatus(s, row, ctxAt(0), REG).kind).toBe('spent')
    setFlag(s, 'challenge_SCOUT_BEN', false)
    expect(phoneStatus(s, row, ctxAt(0), REG).kind).toBe('spent')
  })

  it('a trainer with no ladder defined keeps to small talk', () => {
    const s = newSave('STORM')
    setFlag(s, 'charm_gear')
    setFlag(s, 'badge_zephyr')
    setFlag(s, 'contact_FORAGER_MAE')
    setFlag(s, 'beat_FORAGER_MAE')
    const row = contactList(s, REG).find((r) => r.key === 'FORAGER_MAE')!
    expect(phoneStatus(s, row, ctxAt(0), REG))
      .toEqual({ kind: 'flavor', key: 'story.phone.mae.flavor1' })
  })

  it('rotates the MOM pool deterministically on dayStamp', () => {
    const s = newSave('STORM')
    setFlag(s, 'charm_gear')
    const mom = contactList(s, REG)[0]!
    const keyAt = (stamp: number): string => {
      const st = phoneStatus(s, mom, ctxAt(stamp), REG)
      expect(st.kind).toBe('flavor')
      return st.key
    }
    // Deterministic: the same stamp always speaks the same line.
    expect(keyAt(140)).toBe(keyAt(140))
    // A pool of 3 cycles with period 3 and covers every line.
    expect(keyAt(140)).toBe(keyAt(143))
    expect(new Set([keyAt(0), keyAt(1), keyAt(2)]).size).toBe(3)
    for (const stamp of [0, 1, 2]) {
      expect(keyAt(stamp)).toMatch(/^story\.phone\.mom\.flavor[123]$/)
    }
  })
})

describe('flavorLineKey', () => {
  it('is pure, wraps the pool, and never leaves it', () => {
    expect(flavorLineKey('story.phone.mom', 3, ctxAt(7)))
      .toBe(flavorLineKey('story.phone.mom', 3, ctxAt(7)))
    expect(flavorLineKey('story.phone.mom', 3, ctxAt(7)))
      .toBe(flavorLineKey('story.phone.mom', 3, ctxAt(10)))
    for (let stamp = 0; stamp < 9; stamp++) {
      expect(flavorLineKey('p', 3, ctxAt(stamp))).toMatch(/^p\.flavor[123]$/)
    }
    expect(flavorLineKey('p', 0, ctxAt(5))).toBe('p.flavor1') // degenerate pool clamps
  })
})

// ── Mom's grant (D1) ────────────────────────────────────────────────────────

interface ScriptRun {
  said: string[]
  state: SaveData
}

function runMomHome(state: SaveData): ScriptRun {
  const said: string[] = []
  const ctx: ScriptCtx = {
    game: { state } as unknown as Game,
    *say(key) { said.push(key) },
    *sayRaw() {},
    *ask() { return 0 },
    *battle() { return { outcome: 'win' as const } },
    *warpTo() {},
    *movePlayer() {},
    *moveNpc() {},
    faceNpc() {},
    npcFacePlayer() {},
    *heal() {},
    *archive() {},
    *shop() {},
    *nameEntry(initial) { return initial },
    *giveItem() {},
    *giveKindra() {},
    flag: (key) => flag(state, key),
    setFlag: (key, value) => setFlag(state, key, value),
    song() {},
    sfx() {},
    *wait() {},
  }
  const task = (momHome as GameScript)(ctx)
  for (let i = 0; i < 10000; i++) {
    if (task.next().done) return { said, state }
  }
  throw new Error('momHome did not terminate')
}

describe("Mom's CHARM GEAR grant", () => {
  it('rides the send-off: boxes, the gift, both flags', () => {
    const { said, state } = runMomHome(newSave('STORM'))
    expect(said).toEqual([
      'story.home.1', 'story.home.2', 'story.home.3', 'story.home.4',
      'story.home.gear.1', 'story.home.gear.2', 'story.home.gear.3',
      'sys.item.get',
    ])
    expect(flag(state, 'mom_sendoff')).toBe(true)
    expect(flag(state, 'charm_gear')).toBe(true)
  })

  it('grants retroactively to an in-flight save, before her ambient line', () => {
    const s = newSave('STORM')
    setFlag(s, 'mom_sendoff')
    const { said, state } = runMomHome(s)
    expect(said).toEqual([
      'story.home.gear.1', 'story.home.gear.2', 'story.home.gear.3',
      'sys.item.get', 'story.home.after.1',
    ])
    expect(flag(state, 'charm_gear')).toBe(true)
  })

  it('never grants twice', () => {
    const s = newSave('STORM')
    setFlag(s, 'mom_sendoff')
    setFlag(s, 'charm_gear')
    const { said } = runMomHome(s)
    expect(said).toEqual(['story.home.after.1'])
  })
})

// ── UI flows, headless ──────────────────────────────────────────────────────

describe('pause menu GEAR row', () => {
  it('joins the column only once granted, after BAG', () => {
    const s = newSave('STORM')
    expect(pauseItems(s)).toEqual(['KINDEX', 'KINDRA', 'BAG', 'SAVE', 'EXIT'])
    setFlag(s, 'charm_gear')
    expect(pauseItems(s)).toEqual(['KINDEX', 'KINDRA', 'BAG', 'GEAR', 'SAVE', 'EXIT'])
  })

  it('routes into the Gear and backs out clean', () => {
    const game = makeGame()
    setFlag(game.state, 'charm_gear')
    const handle = game.tasks.spawn(openPauseMenu(game))
    tick(game)
    expect(game.scenes.depth).toBe(1)
    press(game, 'down') // KINDRA
    press(game, 'down') // BAG
    press(game, 'down') // GEAR
    press(game, 'a')
    expect(game.scenes.depth).toBe(2)
    expect(game.scenes.top).toBeInstanceOf(GearScene)
    press(game, 'right') // PHONE
    press(game, 'right') // JOURNAL
    press(game, 'left') // PHONE again — tabs wrap both ways
    expect(game.scenes.top).toBeInstanceOf(GearScene)
    press(game, 'b') // close the Gear
    expect(game.scenes.depth).toBe(1)
    press(game, 'b') // close the pause menu
    tick(game)
    expect(handle.done).toBe(true)
    expect(game.scenes.depth).toBe(0)
  })
})

describe('the PHONE tab', () => {
  it('calls MOM: rings, speaks a flavor line over the Gear, hangs up', () => {
    const game = makeGame()
    setFlag(game.state, 'charm_gear')
    game.tasks.spawn(openGear(game))
    tick(game)
    expect(game.scenes.depth).toBe(1)
    press(game, 'right') // PHONE; MOM is the only contact
    tap(game, 'a') // dial
    until(game, () => game.scenes.depth === 2, 60) // ring beats, then the line
    dismissText(game, 1) // hang up; the Gear is still open beneath
    press(game, 'b')
    expect(game.scenes.depth).toBe(0)
  })

  it('an accepted offer arms the challenge; a spent ladder clears it', () => {
    const game = makeGame()
    const s = game.state
    setFlag(s, 'charm_gear')
    setFlag(s, 'badge_zephyr')
    setFlag(s, 'beat_SCOUT_BEN')
    setFlag(s, 'contact_SCOUT_BEN')
    const row = contactList(s, REG).find((r) => r.key === 'SCOUT_BEN')!

    let handle = game.tasks.spawn(callFlow(game, row, REG))
    until(game, () => game.scenes.depth === 1, 60) // the offer text (held)
    press(game, 'b') // fill; hold-mode settles, YES/NO opens
    until(game, () => game.scenes.depth === 2, 30)
    press(game, 'a') // YES
    until(game, () => flag(s, 'challenge_SCOUT_BEN'), 30)
    dismissText(game, 0) // the .armed confirmation
    expect(handle.done).toBe(true)

    // The win lands as beat_SCOUT_BEN_R1 (the ordinary trainer pipeline);
    // the next call finds the ladder spent and tidies the stale challenge.
    setFlag(s, 'beat_SCOUT_BEN_R1')
    handle = game.tasks.spawn(callFlow(game, row, REG))
    until(game, () => game.scenes.depth === 1, 60)
    dismissText(game, 0)
    expect(handle.done).toBe(true)
    expect(flag(s, 'challenge_SCOUT_BEN')).toBe(false)
  })
})

describe('the JOURNAL tab', () => {
  it('opens a quest detail page and returns', () => {
    const game = makeGame()
    setFlag(game.state, 'charm_gear')
    setFlag(game.state, 'mom_sendoff')
    game.tasks.spawn(openGear(game))
    tick(game)
    press(game, 'left') // MAP wraps backward to JOURNAL
    press(game, 'a') // first row: THE FIELD NOTES
    expect(game.scenes.depth).toBe(2)
    expect(game.scenes.top).toBeInstanceOf(QuestDetailScene)
    press(game, 'b')
    expect(game.scenes.depth).toBe(1)
    press(game, 'b')
    expect(game.scenes.depth).toBe(0)
  })
})
