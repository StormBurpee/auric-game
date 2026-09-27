/**
 * World-layer contract tests: the atlas in src/game/data/maps must
 * transcribe docs/WORLD.md (dimensions, doors, edges, encounter
 * tables) and every cross-reference must resolve — warp/edge targets
 * (validateWorld), NPC scripts in EVENTS, trainer keys in TRAINERS,
 * encounter species in SPECIES, dialog/sign keys in STRINGS.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '../src/engine'
import { dayStamp } from '../src/game/clock'
import { ITEMS, SPECIES, TRAINERS } from '../src/game/data'
import { EVENTS } from '../src/game/data/events'
import { MAPS, mapOf } from '../src/game/data/maps'
import { STRINGS } from '../src/game/data/strings'
import { giftItem, marketOffer } from '../src/game/data/weekly'
import type { Game } from '../src/game/game'
import { makeKindra } from '../src/game/kindra'
import type { GameScript, ScriptCtx } from '../src/game/script/dsl'
import { newSave } from '../src/game/state'
import { ENCOUNTER_SLOT_PERCENTS } from '../src/game/types'
import type { BattleOutcome, DayOfWeek, Item, Kindra, MapDef, NpcDef } from '../src/game/types'
import { defineMap, validateWorld } from '../src/game/world/defineMap'
import {
  FISHING_BITE_DEFAULT,
  rollBite,
  rollFishingEncounter,
  rollHeldItem,
} from '../src/game/world/encounters'
import { hasRod, waterIntent } from '../src/game/world/fishing'
import { NpcActor } from '../src/game/world/npcs'
import { canReceiveBoulder, overriddenTileId, setTileOverride } from '../src/game/world/overrides'
import type { TileOverrides } from '../src/game/world/overrides'
import { TILE_IDS, tileDef } from '../src/game/world/tiles'
import type { TileKey } from '../src/game/world/tiles'

const maps = Object.values(MAPS)
const npcsOf = (m: MapDef) => m.npcs.map(n => ({ map: m.id, npc: n }))
const allNpcs = maps.flatMap(npcsOf)

function tileAt(map: MapDef, x: number, y: number): TileKey {
  return tileDef(map.tiles[y * map.width + x]!).key
}

describe('atlas shape (WORLD.md §1-§15)', () => {
  it('holds exactly the 15 maps, keyed by id', () => {
    const ids = [
      'dawnfern', 'trail1', 'bellmere', 'trail2', 'loomspire',
      'player_home', 'larch_lab', 'dawnfern_nursery',
      'bellmere_haven', 'loomspire_haven',
      'bellmere_outfitter', 'elder_house', 'loomspire_gym',
      'wisteria_spire_1f', 'wisteria_spire_2f',
    ]
    expect(Object.keys(MAPS).sort()).toEqual([...ids].sort())
    for (const [key, m] of Object.entries(MAPS)) expect(m.id).toBe(key)
  })

  it('matches every WORLD.md grid dimension', () => {
    const dims: Record<string, [w: number, h: number]> = {
      dawnfern: [20, 18], trail1: [20, 36], bellmere: [24, 18],
      trail2: [36, 18], loomspire: [26, 22], player_home: [10, 8],
      larch_lab: [12, 10], dawnfern_nursery: [10, 8],
      bellmere_haven: [10, 8], loomspire_haven: [10, 8],
      bellmere_outfitter: [10, 8], elder_house: [10, 8],
      loomspire_gym: [12, 16], wisteria_spire_1f: [12, 12],
      wisteria_spire_2f: [10, 10],
    }
    for (const [id, [w, h]] of Object.entries(dims)) {
      expect([mapOf(id).width, mapOf(id).height], id).toEqual([w, h])
    }
  })

  it('passes cross-map validation (warps and edges land on real spawns)', () => {
    expect(validateWorld(MAPS)).toEqual([])
  })

  it('keeps interiors indoor and the five outdoor maps outdoor', () => {
    const outdoor = ['dawnfern', 'trail1', 'bellmere', 'trail2', 'loomspire']
    for (const m of maps) expect(m.outdoor, m.id).toBe(outdoor.includes(m.id))
  })

  it('plays the approved soundtrack (interiors share their town track)', () => {
    const music: Record<string, string> = {
      dawnfern: 'dawnfern', trail1: 'trail', bellmere: 'bellmere',
      trail2: 'trail', loomspire: 'loomspire', player_home: 'dawnfern',
      larch_lab: 'dawnfern', dawnfern_nursery: 'dawnfern',
      bellmere_haven: 'bellmere',
      bellmere_outfitter: 'bellmere', elder_house: 'bellmere',
      loomspire_haven: 'loomspire', loomspire_gym: 'loomspire',
      wisteria_spire_1f: 'spire_night', wisteria_spire_2f: 'spire_night',
    }
    for (const m of maps) expect(m.music, m.id).toBe(music[m.id])
  })

  it('puts every warp on a DOOR, exit MAT, STAIRS, or edge-zone border tile', () => {
    for (const m of maps) {
      for (const w of m.warps) {
        const tile = tileAt(m, w.x, w.y)
        const border = w.x === 0 || w.y === 0 || w.x === m.width - 1 || w.y === m.height - 1
        const ok = tile === 'DOOR' || tile === 'MAT' || tile === 'STAIRS' ||
          (border && !tileDef(m.tiles[w.y * m.width + w.x]!).solid)
        expect(ok, `${m.id}: warp at ${w.x},${w.y} sits on ${tile}`).toBe(true)
      }
    }
  })

  it('keeps the Spire 2F dark and the rest of the atlas lit', () => {
    for (const m of maps) {
      expect(m.dark === true, m.id).toBe(m.id === 'wisteria_spire_2f')
    }
  })

  it('throws from mapOf on an unknown id', () => {
    expect(() => mapOf('glitch_city')).toThrow(/unknown map/)
  })
})

describe('spawns', () => {
  it('gives every Haven and the player home a heal spawn', () => {
    for (const id of ['bellmere_haven', 'loomspire_haven', 'player_home']) {
      expect(mapOf(id).spawns['heal'], id).toBeDefined()
    }
  })

  it('starts a new game beside the bed', () => {
    const start = mapOf('player_home').spawns['start']
    expect(start).toBeDefined()
    expect(tileAt(mapOf('player_home'), start!.x, start!.y - 1)).toBe('BED')
  })

  it('places every spawn on walkable ground', () => {
    for (const m of maps) {
      for (const [name, s] of Object.entries(m.spawns)) {
        const tile = tileDef(m.tiles[s.y * m.width + s.x]!)
        expect(tile.solid, `${m.id}:${name} stands on ${tile.key}`).toBe(false)
      }
    }
  })
})

describe('npcs', () => {
  it('resolves every script and sightScript key in EVENTS', () => {
    for (const { map, npc } of allNpcs) {
      if (npc.script !== undefined) {
        expect(EVENTS[npc.script], `${map}:${npc.id} script ${npc.script}`).toBeDefined()
      }
      if (npc.sightScript !== undefined) {
        expect(EVENTS[npc.sightScript.script], `${map}:${npc.id} sight script`).toBeDefined()
      }
    }
  })

  it('resolves every trainer key in TRAINERS, with a positive sight', () => {
    for (const { map, npc } of allNpcs) {
      if (!npc.trainer) continue
      expect(TRAINERS[npc.trainer.key], `${map}:${npc.id}`).toBeDefined()
      expect(npc.trainer.sight, `${map}:${npc.id}`).toBeGreaterThan(0)
    }
  })

  it('stocks a rival variant for every starter the ambush can meet', () => {
    for (const starter of ['VERDIL', 'EMBERIT', 'RILLET']) {
      expect(TRAINERS[`RIVAL_CORVIN_T2_${starter}`], starter).toBeDefined()
    }
  })

  it('resolves every dialog and dialogNight key in STRINGS', () => {
    for (const { map, npc } of allNpcs) {
      for (const key of [npc.dialog, npc.dialogNight]) {
        if (key === undefined) continue
        expect(STRINGS[key], `${map}:${npc.id} says ${key}`).toBeDefined()
      }
    }
  })

  it('gives every NPC something to say or do', () => {
    for (const { map, npc } of allNpcs) {
      const speaks = npc.dialog !== undefined || npc.script !== undefined ||
        npc.trainer !== undefined
      expect(speaks, `${map}:${npc.id} is mute`).toBe(true)
    }
  })

  it('stands every NPC on walkable ground', () => {
    for (const { map, npc } of allNpcs) {
      const tile = tileDef(mapOf(map).tiles[npc.y * mapOf(map).width + npc.x]!)
      expect(tile.solid, `${map}:${npc.id} stands on ${tile.key}`).toBe(false)
    }
  })

  it('hides Corvin behind rival1_done and triggers at sight 4', () => {
    const corvin = mapOf('trail2').npcs.find(n => n.id === 'trail2_corvin')
    expect(corvin?.hideFlag).toBe('rival1_done')
    expect(corvin?.sightScript).toEqual({ script: 'rival_ambush', sight: 4 })
  })
})

describe('signs and items', () => {
  it('resolves every sign text in STRINGS, standing on a SIGN tile', () => {
    for (const m of maps) {
      for (const s of m.signs) {
        expect(STRINGS[s.text], `${m.id} sign ${s.text}`).toBeDefined()
        expect(tileAt(m, s.x, s.y), `${m.id} sign at ${s.x},${s.y}`).toBe('SIGN')
      }
    }
  })

  it('drops only real items, on walkable tiles, with unique pickup ids', () => {
    const ids = new Set<string>()
    for (const m of maps) {
      for (const item of m.items) {
        expect(ITEMS[item.item], `${m.id}: ${item.item}`).toBeDefined()
        expect(item.qty).toBeGreaterThan(0)
        expect(tileDef(m.tiles[item.y * m.width + item.x]!).solid, `${m.id}:${item.id}`).toBe(false)
        expect(ids.has(item.id), `duplicate ground item id ${item.id}`).toBe(false)
        ids.add(item.id)
      }
    }
  })

  it('seeds the WORLD.md ground pickups, Tier-1 finds included', () => {
    const drops = maps.flatMap(m => m.items.map(i => i.item)).sort()
    expect(drops).toEqual([
      'AMBER_CRUMB', 'CHARM', 'CHARM', 'KEEN_LENS',
      'TINGLE_BERRY', 'TOLL_SHARD', 'TONIC', 'TONIC',
    ])
  })
})

describe('Tier-1 proof content (TIER1_PLAN.md "Proof content")', () => {
  const solidAt = (m: MapDef, x: number, y: number) =>
    tileDef(m.tiles[y * m.width + x]!).solid

  it('seals the trail1 HEW grove behind its single SAPLING', () => {
    const t1 = mapOf('trail1')
    expect(tileAt(t1, 17, 2)).toBe('SAPLING')
    // The pocket (x15-18, y1) is open ground holding the AMBER CRUMB...
    for (const x of [15, 16, 17, 18]) expect(solidAt(t1, x, 1), `(${x},1)`).toBe(false)
    const crumb = t1.items.find(i => i.id === 'trail1_grove')
    expect(crumb).toMatchObject({ x: 16, y: 1, item: 'AMBER_CRUMB' })
    // ...walled on every other side: y0 border, x14 tree, x19 border,
    // and the y2 row solid except the sapling mouth at (17,2).
    for (const x of [14, 15, 16, 17, 18, 19]) expect(solidAt(t1, x, 0), `(${x},0)`).toBe(true)
    expect(solidAt(t1, 14, 1)).toBe(true)
    expect(solidAt(t1, 19, 1)).toBe(true)
    for (const x of [15, 16, 18, 19]) expect(solidAt(t1, x, 2), `(${x},2)`).toBe(true)
    // The approach tile below the sapling stays walkable.
    expect(solidAt(t1, 17, 3)).toBe(false)
    // The TINGLE BERRY sits honestly in the open, ungated.
    const berry = t1.items.find(i => i.id === 'trail1_berry')
    expect(berry).toMatchObject({ item: 'TINGLE_BERRY' })
    expect(solidAt(t1, berry!.x, berry!.y)).toBe(false)
  })

  it('opens the bellmere lake: surf table, rate 15, and the KEEN LENS islet', () => {
    const town = mapOf('bellmere')
    expect(town.waterRate).toBe(15)
    const table = town.waterEncounters!
    expect(table.length).toBe(ENCOUNTER_SLOT_PERCENTS.length)
    // Water-line species only, ROSTER lake band levels 5-10.
    for (const slot of table) {
      expect(['PADDLET', 'TORTIDE', 'DEWBELL'], slot.species).toContain(slot.species)
      expect(SPECIES[slot.species], slot.species).toBeDefined()
      const level = typeof slot.level === 'number' ? slot.level : slot.level[0]
      expect(level).toBeGreaterThanOrEqual(5)
      expect(level).toBeLessThanOrEqual(10)
    }
    // PADDLET-heavy (both 30% slots), TORTIDE mid, DEWBELL the 1%.
    expect(table[0]!.species).toBe('PADDLET')
    expect(table[1]!.species).toBe('PADDLET')
    expect(table[3]!.species).toBe('TORTIDE')
    expect(table[6]!.species).toBe('DEWBELL')
    // The islet: two SAND tiles in open water, KEEN LENS on the north one.
    expect(tileAt(town, 20, 11)).toBe('SAND')
    expect(tileAt(town, 20, 12)).toBe('SAND')
    for (const [x, y] of [[20, 10], [20, 13], [19, 11], [21, 11], [19, 12], [21, 12]]) {
      expect(tileAt(town, x!, y!), `(${x},${y})`).toBe('WATER')
    }
    expect(town.items.find(i => i.id === 'bellmere_islet'))
      .toMatchObject({ x: 20, y: 11, item: 'KEEN_LENS' })
  })

  it('plants the trail2 HEAVE boulder with a clear push lane', () => {
    const t2 = mapOf('trail2')
    expect(tileAt(t2, 4, 11)).toBe('BOULDER')
    // Stand on either side, push to the other: both ends open.
    expect(solidAt(t2, 4, 10)).toBe(false)
    expect(solidAt(t2, 4, 12)).toBe(false)
  })

  it('gives every BOULDER on every map at least one workable push axis', () => {
    const boulders = maps.flatMap(m => {
      const found: { m: MapDef; x: number; y: number }[] = []
      for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
          if (tileAt(m, x, y) === 'BOULDER') found.push({ m, x, y })
        }
      }
      return found
    })
    expect(boulders.length).toBeGreaterThan(0)
    for (const { m, x, y } of boulders) {
      const open = (px: number, py: number) =>
        px >= 0 && px < m.width && py >= 0 && py < m.height && !solidAt(m, px, py)
      const vertical = open(x, y - 1) && open(x, y + 1)
      const horizontal = open(x - 1, y) && open(x + 1, y)
      expect(vertical || horizontal, `${m.id}: boulder at ${x},${y} is stuck`).toBe(true)
    }
  })

  it('climbs the Spire both ways on real STAIRS', () => {
    const f1 = mapOf('wisteria_spire_1f')
    const f2 = mapOf('wisteria_spire_2f')
    // 1F up: both stair tiles warp to the 2F entry.
    for (const x of [5, 6]) {
      expect(tileAt(f1, x, 1), `1F (${x},1)`).toBe('STAIRS')
      expect(f1.warps).toContainEqual({ x, y: 1, to: { map: 'wisteria_spire_2f', spawn: 'entry' } })
    }
    // 2F down: the stair tile warps back to 1F's stairs-foot spawn.
    expect(tileAt(f2, 1, 1)).toBe('STAIRS')
    expect(f2.warps).toContainEqual({ x: 1, y: 1, to: { map: 'wisteria_spire_1f', spawn: 'stairs' } })
    // Each landing spawn stands beside its stairs, off the warp tiles.
    const foot = f1.spawns['stairs']!
    expect([foot.x, foot.y]).toEqual([5, 2])
    expect(tileAt(f1, foot.x, foot.y - 1)).toBe('STAIRS')
    const entry = f2.spawns['entry']!
    expect([entry.x, entry.y]).toEqual([2, 1])
    expect(tileAt(f2, entry.x - 1, entry.y)).toBe('STAIRS')
  })

  it('hides one guaranteed TOLL SHARD in the 2F gloom', () => {
    const f2 = mapOf('wisteria_spire_2f')
    expect(f2.dark).toBe(true)
    expect(f2.items.find(i => i.id === 'spire2f_shard'))
      .toMatchObject({ item: 'TOLL_SHARD', qty: 1 })
  })
})

describe('Calendar, fishing and nursery content contracts', () => {
  const solidAt = (m: MapDef, x: number, y: number) =>
    tileDef(m.tiles[y * m.width + x]!).solid

  it('raises the Dawnfern nursery with a door that works both ways', () => {
    const town = mapOf('dawnfern')
    const inn = mapOf('dawnfern_nursery')
    // Outside: a real DOOR at (16,15), approach tile below it open.
    expect(tileAt(town, 16, 15)).toBe('DOOR')
    expect(town.warps).toContainEqual(
      { x: 16, y: 15, to: { map: 'dawnfern_nursery', spawn: 'entry' } },
    )
    expect(solidAt(town, 16, 16)).toBe(false)
    expect(town.spawns['from_nursery']).toEqual({ x: 16, y: 16, facing: 'down' })
    // Inside: both MAT tiles head home to the from_nursery spawn.
    for (const x of [4, 5]) {
      expect(tileAt(inn, x, 7), `mat (${x},7)`).toBe('MAT')
      expect(inn.warps).toContainEqual(
        { x, y: 7, to: { map: 'dawnfern', spawn: 'from_nursery' } },
      )
    }
    expect(inn.spawns['entry']).toEqual({ x: 4, y: 6, facing: 'up' })
  })

  it('staffs the nursery: keeper at her desk, the old man swapping on the egg flag', () => {
    const inn = mapOf('dawnfern_nursery')
    const keeper = inn.npcs.find(n => n.id === 'nursery_keeper')
    expect(keeper).toMatchObject({ x: 3, y: 2, script: 'nursery_keeper' })
    // Counter-talk: the desk row sits between keeper and lobby.
    expect(tileAt(inn, 3, 3)).toBe('COUNTER')
    const inside = inn.npcs.find(n => n.id === 'nursery_man')
    expect(inside).toMatchObject({ script: 'nursery_egg_man', hideFlag: 'nursery_egg' })
    const outside = mapOf('dawnfern').npcs.find(n => n.id === 'dawnfern_nursery_man')
    expect(outside).toMatchObject({ script: 'nursery_egg_man', showFlag: 'nursery_egg' })
    // One flag, two doors: he is never in both places at once.
    expect(outside!.showFlag).toBe(inside!.hideFlag)
    // He waits beside the nursery door, off the arrival spawn tile.
    expect([outside!.x, outside!.y]).toEqual([15, 16])
  })

  it('sits the angler on the bellmere sand, facing open water, every day', () => {
    const town = mapOf('bellmere')
    const angler = town.npcs.find(n => n.id === 'bellmere_angler')
    expect(angler).toMatchObject({
      x: 18, y: 14, facing: 'up', sprite: 'ELDER', script: 'npc_bellmere_angler',
    })
    expect(angler!.appears).toBeUndefined() // the lake is a daily appointment
    expect(tileAt(town, 18, 14)).toBe('SAND')
    expect(tileAt(town, 18, 13)).toBe('WATER')
  })

  it('keeps the weekly appointments: vendor Saturdays, gran Sunday mornings', () => {
    const vendor = mapOf('bellmere').npcs.find(n => n.id === 'bellmere_market')
    expect(vendor).toMatchObject({ x: 17, y: 14, script: 'market_vendor' })
    expect(vendor!.appears).toEqual({ days: [6] })
    expect(tileAt(mapOf('bellmere'), 17, 14)).toBe('SAND')
    const gran = mapOf('trail1').npcs.find(n => n.id === 'trail1_gran')
    expect(gran).toMatchObject({ x: 5, y: 17, script: 'berry_gran' })
    expect(gran!.appears).toEqual({ days: [0], periods: ['morning'] })
  })

  it('arms the bellmere rod table: 7 slots, PADDLET-heavy, the lv-15 TORTIDE 1%', () => {
    const town = mapOf('bellmere')
    expect(town.fishingRate).toBe(60)
    const table = town.fishingEncounters!
    expect(table.length).toBe(ENCOUNTER_SLOT_PERCENTS.length)
    // Lake species only, ROSTER §D rod band levels 6-15.
    for (const slot of table) {
      expect(['PADDLET', 'TORTIDE', 'DEWBELL']).toContain(slot.species)
      expect(SPECIES[slot.species], slot.species).toBeDefined()
      const lo = typeof slot.level === 'number' ? slot.level : slot.level[0]
      const hi = typeof slot.level === 'number' ? slot.level : slot.level[1]
      expect(lo).toBeGreaterThanOrEqual(6)
      expect(hi).toBeLessThanOrEqual(15)
    }
    expect(table[0]!.species).toBe('PADDLET')
    expect(table[1]!.species).toBe('PADDLET')
    // The angler's tall tale, catchable: the 1% is the sleeping TORTIDE.
    expect(table[6]!).toEqual({ species: 'TORTIDE', level: 15 })
  })
})

describe('encounters (WORLD.md tables, ROSTER §D)', () => {
  const wilds = maps.filter(m => m.encounters !== undefined)

  it('arms exactly the five wild maps, at WORLD.md rates', () => {
    const rates: Record<string, number> = {
      trail1: 25, bellmere: 20, trail2: 30,
      wisteria_spire_1f: 30, wisteria_spire_2f: 20,
    }
    expect(wilds.map(m => m.id).sort()).toEqual(Object.keys(rates).sort())
    for (const m of wilds) expect(m.encounterRate, m.id).toBe(rates[m.id])
  })

  it('fills all 7 slots per period with real species at sane levels', () => {
    for (const m of wilds) {
      for (const [period, table] of Object.entries(m.encounters!)) {
        expect(table.length, `${m.id} ${period}`).toBe(ENCOUNTER_SLOT_PERCENTS.length)
        for (const slot of table) {
          expect(SPECIES[slot.species], `${m.id} ${period}: ${slot.species}`).toBeDefined()
          const level = typeof slot.level === 'number' ? slot.level : slot.level[0]
          expect(level).toBeGreaterThanOrEqual(1)
          expect(level).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('whispers AMBERSTAG into the trail2 night 1% slot', () => {
    const night = mapOf('trail2').encounters!.night
    expect(night.some(s => s.species === 'AMBERSTAG')).toBe(true)
    // The 1% slot is the last of the 30/30/20/10/5/4/1 spread.
    expect(night[night.length - 1]).toEqual({ species: 'AMBERSTAG', level: 7 })
  })

  it('rolls the Wisteria Spire cave-style on every floor tile', () => {
    for (const id of ['wisteria_spire_1f', 'wisteria_spire_2f']) {
      const spire = mapOf(id)
      expect(spire.caveEncounters, id).toBe(true)
      // One simplification, pinned: the night table serves all periods.
      expect(spire.encounters!.morning, id).toEqual(spire.encounters!.night)
      expect(spire.encounters!.day, id).toEqual(spire.encounters!.night)
    }
    // 2F shares 1F's one table — same gloom, same voices.
    expect(mapOf('wisteria_spire_2f').encounters!.night)
      .toEqual(mapOf('wisteria_spire_1f').encounters!.night)
  })
})

describe('events registry', () => {
  it('registers the seven scripted moments of the slice', () => {
    for (const key of [
      'larch_lab', 'elder_rowan', 'rival_ambush', 'gym_aria',
      'haven_lily', 'outfitter_clerk', 'mom_home',
    ]) {
      expect(EVENTS[key], key).toBeDefined()
    }
  })

  it('registers the Tier-2 moments: market, gift, rod, and the nursery couple', () => {
    for (const key of [
      'market_vendor', 'berry_gran', 'npc_bellmere_angler',
      'nursery_keeper', 'nursery_egg_man',
    ]) {
      expect(EVENTS[key], key).toBeDefined()
    }
  })

  it('exposes every event as a generator-producing GameScript', () => {
    for (const [key, script] of Object.entries(EVENTS)) {
      expect(typeof script, key).toBe('function')
    }
  })
})

// ── Script execution harness ────────────────────────────────────────────────
// A stub ScriptCtx drives every event to completion, recording what it
// says, gives, and battles — so flag logic, branch order, and every
// string key are pinned without a renderer.

interface Harness {
  ctx: ScriptCtx
  said: string[]
  given: [item: string, qty: number][]
  shopped: string[][]
  state: ReturnType<typeof newSave>
  healed: () => number
  archived: () => number
}

function makeHarness(opts?: {
  answers?: number[]
  outcome?: BattleOutcome
  period?: 'morning' | 'day' | 'night'
  /** Calendar day for day-aware scripts (JS Date order; default Tuesday). */
  day?: DayOfWeek
}): Harness {
  const said: string[] = []
  const given: [string, number][] = []
  const shopped: string[][] = []
  const answers = [...(opts?.answers ?? [])]
  const state = newSave('STORM')
  let healCount = 0
  let archiveCount = 0
  const game = {
    state,
    rng: new Rng(7),
    period: () => opts?.period ?? 'day',
    day: () => opts?.day ?? 2,
  } as unknown as Game
  const ctx: ScriptCtx = {
    game,
    *say(key) { said.push(key) },
    *sayRaw() { /* raw boxes carry no keys to pin */ },
    *ask() { return answers.shift() ?? 0 },
    *battle() { return { outcome: opts?.outcome ?? 'win' } },
    *warpTo() {},
    *movePlayer() {},
    *moveNpc() {},
    faceNpc() {},
    npcFacePlayer() {},
    *heal() { healCount++ },
    // The Archive UI is exercised by its own tests; here we only count.
    *archive() { archiveCount++ },
    *shop(items) { shopped.push(items) },
    *nameEntry(initial) { return initial },
    *giveItem(item, qty) { given.push([item, qty]) },
    *giveKindra(k: Kindra) { state.party.push(k) },
    flag: (key) => state.flags[key] === true,
    setFlag: (key, value = true) => { state.flags[key] = value },
    song() {},
    sfx() {},
    *wait() {},
  }
  return {
    ctx, said, given, shopped, state,
    healed: () => healCount,
    archived: () => archiveCount,
  }
}

/** Drain a script synchronously; yielded waits are no-ops here. */
function run(script: GameScript, h: Harness): void {
  const gen = script(h.ctx)
  // The cap turns a script that never terminates (a menu loop fed the
  // wrong answers) into a loud failure instead of a hung test runner.
  for (let tick = 0; tick < 10_000; tick++) {
    if (gen.next().done) return
  }
  throw new Error('script did not terminate in 10000 ticks')
}

const event = (key: string): GameScript => {
  const script = EVENTS[key]
  if (!script) throw new Error(`missing event '${key}'`)
  return script
}

/** Every key a run spoke must resolve in the string table. */
function expectAllInStrings(said: string[]): void {
  expect(said.length).toBeGreaterThan(0)
  for (const key of said) expect(STRINGS[key], key).toBeDefined()
}

describe('event scripts (executed against a stub ctx)', () => {
  it('speaks only keys that exist in STRINGS, across every event', () => {
    // Default answers walk the YES/first-option path; menu-loop events
    // need answers that reach their LEAVE branch.
    const answersFor: Record<string, number[]> = {
      haven_lily: [0, 1, 2], // REST, then ARCHIVE, then LEAVE
      nursery_keeper: [2], // straight to LEAVE (BOARD needs a real party UI)
    }
    const said: string[] = []
    for (const key of Object.keys(EVENTS)) {
      // Loss outcome keeps gym_aria clear of the credits hand-off; the
      // win branches are pinned by the dedicated tests below.
      const h = makeHarness({ answers: answersFor[key] ?? [0, 0], outcome: 'loss' })
      h.state.pos = { map: 'trail2', x: 4, y: 9, facing: 'up' }
      run(event(key), h)
      said.push(...h.said)
    }
    // night branch of the Spire warning too
    const night = makeHarness({ period: 'night' })
    run(event('npc_loomspire_spire'), night)
    said.push(...night.said)
    expectAllInStrings(said)
  })

  it('larch_lab: confirm flow hands over the starter, 5 CHARMS, the errand', () => {
    const h = makeHarness({ answers: [1, 1, 2, 0] }) // EMBERIT->NO, then RILLET->YES
    run(event('larch_lab'), h)
    expect(h.state.starter).toBe('RILLET')
    expect(h.state.flags['starter_chosen']).toBe(true)
    expect(h.state.party.map(k => [k.species, k.level])).toEqual([['RILLET', 5]])
    expect(h.given).toEqual([['CHARM', 5]])
    expect(h.said).toContain('story.lab.pick.emberit')
    expect(h.said).toContain('story.lab.pick.rillet')
    expect(h.said.slice(-2)).toEqual(['story.lab.14', 'story.lab.15']) // the window beat
    // repeat visit: only the Rowan nudge
    h.said.length = 0
    run(event('larch_lab'), h)
    expect(h.said).toEqual(['story.lab.13'])
  })

  it('elder_rowan: KINDEX only once, only after the starter', () => {
    const h = makeHarness()
    run(event('elder_rowan'), h)
    expect(h.said).toEqual(['story.rowan.after.1']) // no errand yet
    h.state.flags['starter_chosen'] = true
    h.said.length = 0
    run(event('elder_rowan'), h)
    expect(h.state.flags['kindex_given']).toBe(true)
    expect(h.said).toContain('sys.item.get')
    expect(h.said[h.said.length - 1]).toBe('story.rowan.13')
    h.said.length = 0
    run(event('elder_rowan'), h)
    expect(h.said).toEqual(['story.rowan.after.1'])
  })

  it('rival_ambush: win sneers and retires him; loss still clears the trail', () => {
    const win = makeHarness({ outcome: 'win' })
    win.state.starter = 'VERDIL'
    win.state.pos = { map: 'trail2', x: 4, y: 9, facing: 'up' }
    run(event('rival_ambush'), win)
    expect(win.state.flags['rival1_done']).toBe(true)
    expect(win.said).toContain('story.rival1.pre.3')
    expect(win.said).toContain('story.rival1.post.3')
    expectAllInStrings(win.said)

    const loss = makeHarness({ outcome: 'loss' })
    loss.state.starter = 'EMBERIT'
    loss.state.pos = { map: 'trail2', x: 4, y: 8, facing: 'up' }
    run(event('rival_ambush'), loss)
    expect(loss.state.flags['rival1_done']).toBe(true)
    expect(loss.said).toContain('story.rival1.victory.1')
    expect(loss.said).not.toContain('story.rival1.post.1')

    // already done: not a word
    win.said.length = 0
    run(event('rival_ambush'), win)
    expect(win.said).toEqual([])
  })

  it('gym_aria: badge once on win, lose line on loss, hook afterwards', () => {
    const loss = makeHarness({ outcome: 'loss' })
    run(event('gym_aria'), loss)
    expect(loss.said[loss.said.length - 1]).toBe('story.gym.aria.lose')
    expect(loss.state.badges).toEqual([])

    const win = makeHarness({ outcome: 'win' })
    // The win path ends in runCredits, which needs the real renderer;
    // every badge effect is asserted to land before that hand-off.
    try { run(event('gym_aria'), win) } catch { /* credits need a real Game */ }
    expect(win.state.badges).toEqual(['ZEPHYR'])
    expect(win.state.flags['badge_zephyr']).toBe(true)
    expect(win.said).toContain('sys.badge.get')
    expect(win.said).toContain('story.gym.aria.post.2')
    expectAllInStrings(win.said)

    win.said.length = 0
    run(event('gym_aria'), win) // spoken to again: only the sequel hook
    expect(win.said).toEqual(['story.gym.aria.post.1', 'story.gym.aria.post.2'])
    expect(win.state.badges).toEqual(['ZEPHYR'])
  })

  it('haven_lily: REST heals and LEAVE ends the visit warmly', () => {
    const rest = makeHarness({ answers: [0, 2] })
    run(event('haven_lily'), rest)
    expect(rest.healed()).toBe(1)
    expect(rest.archived()).toBe(0)
    expect(rest.said).toContain('story.haven.lily.4')
    expect(rest.said[rest.said.length - 1]).toBe('story.haven.lily.5')
  })

  it('haven_lily: ARCHIVE opens the box, bracketed by Lily', () => {
    const h = makeHarness({ answers: [1, 2] })
    run(event('haven_lily'), h)
    expect(h.archived()).toBe(1)
    expect(h.healed()).toBe(0)
    expect(h.said).toContain('story.haven.archive.1')
    expect(h.said).toContain('story.haven.archive.2')
    expect(h.said[h.said.length - 1]).toBe('story.haven.lily.5')
  })

  it('haven_lily: one visit can archive AND rest before leaving', () => {
    const h = makeHarness({ answers: [1, 0, 2] })
    run(event('haven_lily'), h)
    expect(h.archived()).toBe(1)
    expect(h.healed()).toBe(1)
    expect(h.said[h.said.length - 1]).toBe('story.haven.lily.5')
  })

  it('haven_lily: an immediate LEAVE bows out untouched', () => {
    const h = makeHarness({ answers: [2] })
    run(event('haven_lily'), h)
    expect(h.healed()).toBe(0)
    expect(h.archived()).toBe(0)
    expect(h.said[h.said.length - 1]).toBe('story.haven.lily.no')
  })

  it('outfitter_clerk: opens the full Tier-1 shelf, every item real', () => {
    const h = makeHarness()
    run(event('outfitter_clerk'), h)
    expect(h.shopped).toEqual([[
      'CHARM', 'GILDED_CHARM', 'TONIC', 'BIG_TONIC', 'CURE_LEAF',
      'CINDER_BAND', 'DEW_PEARL', 'MOSS_LOCKET', 'LINK_CORD',
    ]])
    for (const key of h.shopped[0]!) expect(ITEMS[key], key).toBeDefined()
    expect(h.said[h.said.length - 1]).toBe('story.outfitter.bye')
  })

  it('mom_home: the send-off plays once, CHARM GEAR ceremony included', () => {
    const h = makeHarness()
    run(event('mom_home'), h)
    expect(h.said).toEqual([
      'story.home.1', 'story.home.2', 'story.home.3', 'story.home.4',
      'story.home.gear.1', 'story.home.gear.2', 'story.home.gear.3',
      'sys.item.get',
    ])
    expect(h.state.flags['mom_sendoff']).toBe(true)
    expect(h.state.flags['charm_gear']).toBe(true)
    h.said.length = 0
    run(event('mom_home'), h)
    expect(h.said).toEqual(['story.home.after.1'])
  })

  it('mom_home: an in-flight save gets the Gear retroactively, once', () => {
    const h = makeHarness()
    h.state.flags['mom_sendoff'] = true // left home before Tier 2 landed
    run(event('mom_home'), h)
    expect(h.said).toEqual([
      'story.home.gear.1', 'story.home.gear.2', 'story.home.gear.3',
      'sys.item.get', 'story.home.after.1',
    ])
    expect(h.state.flags['charm_gear']).toBe(true)
  })
})

describe('Tier-2 event scripts (market day, the gift, the rod)', () => {
  /** This week's stamped one-shot flag, if any flag under the key is set. */
  const weeklyFlag = (h: Harness, key: string): string | undefined =>
    Object.keys(h.state.flags).find(f => f.startsWith(`weekly_${key}_`) && h.state.flags[f])

  it('market_vendor: BUY takes the glints once, gives the rotation item, stamps the week', () => {
    const offer = marketOffer(dayStamp())
    const h = makeHarness({ answers: [0] }) // BUY
    run(event('market_vendor'), h)
    expect(h.said).toContain(offer.pitch)
    expect(h.said).toContain('story.market.offer')
    expect(h.said[h.said.length - 1]).toBe('story.market.deal')
    expect(h.given).toEqual([[offer.item, 1]])
    expect(h.state.glints).toBe(1500 - offer.price)
    expect(weeklyFlag(h, 'market')).toBe(`weekly_market_${dayStamp()}`)
    expectAllInStrings(h.said)
    // Same week, same stall: sold out, nothing moves.
    h.said.length = 0
    run(event('market_vendor'), h)
    expect(h.said).toEqual(['story.market.vendor.1', 'story.market.sold'])
    expect(h.given).toHaveLength(1)
    expect(h.state.glints).toBe(1500 - offer.price)
  })

  it('market_vendor: PASS walks away unstamped; a short purse is refused unstamped', () => {
    const pass = makeHarness({ answers: [1] })
    run(event('market_vendor'), pass)
    expect(pass.said[pass.said.length - 1]).toBe('story.market.bye')
    expect(pass.given).toEqual([])
    expect(pass.state.glints).toBe(1500)
    expect(weeklyFlag(pass, 'market')).toBeUndefined()

    const poor = makeHarness({ answers: [0] })
    poor.state.glints = 0
    run(event('market_vendor'), poor)
    expect(poor.said[poor.said.length - 1]).toBe('sys.shop.nomoney')
    expect(poor.given).toEqual([])
    expect(poor.state.glints).toBe(0)
    // The week stays unclaimed — she can come back with coin on Saturday.
    expect(weeklyFlag(poor, 'market')).toBeUndefined()
  })

  it('berry_gran: one berry per week stamp, from the weekly rotation', () => {
    const h = makeHarness()
    run(event('berry_gran'), h)
    expect(h.said).toEqual(['story.gran.1', 'story.gran.2'])
    expect(h.given).toEqual([[giftItem(dayStamp()), 1]])
    expect(weeklyFlag(h, 'gift')).toBe(`weekly_gift_${dayStamp()}`)
    // Back for seconds: the basket stays shut this week.
    h.said.length = 0
    run(event('berry_gran'), h)
    expect(h.said).toEqual(['story.gran.again'])
    expect(h.given).toHaveLength(1)
  })

  it('npc_bellmere_angler: the OLD ROD is given exactly once', () => {
    const h = makeHarness()
    run(event('npc_bellmere_angler'), h)
    expect(h.said).toEqual([
      'story.npc.bellmere5.1', 'story.npc.bellmere5.2', 'story.npc.bellmere5.3',
    ])
    expect(h.given).toEqual([['OLD_ROD', 1]])
    expect(h.state.flags['old_rod_given']).toBe(true)
    h.said.length = 0
    run(event('npc_bellmere_angler'), h)
    expect(h.said).toEqual(['story.npc.bellmere5.after'])
    expect(h.given).toHaveLength(1)
  })

  it('npc_spire_watcher: hears the bell-toll on Wednesday night only', () => {
    const toll = makeHarness({ day: 3, period: 'night' })
    run(event('npc_spire_watcher'), toll)
    expect(toll.said).toEqual(['story.npc.spire.toll'])
    for (const opts of [
      { day: 3 as DayOfWeek, period: 'day' as const },
      { day: 2 as DayOfWeek, period: 'night' as const },
    ]) {
      const quiet = makeHarness(opts)
      run(event('npc_spire_watcher'), quiet)
      expect(quiet.said).toEqual(['story.rowan.after.1'])
    }
  })

  it('npc_bellmere_market: the watcher keeps day/night and gains the Saturday hint', () => {
    const sat = makeHarness({ day: 6 })
    run(event('npc_bellmere_market'), sat)
    expect(sat.said).toEqual(['story.npc.bellmere2.market'])
    const satNight = makeHarness({ day: 6, period: 'night' })
    run(event('npc_bellmere_market'), satNight)
    expect(satNight.said).toEqual(['story.npc.bellmere2.night'])
    const tue = makeHarness({ day: 2 })
    run(event('npc_bellmere_market'), tue)
    expect(tue.said).toEqual(['story.npc.bellmere2.day'])
  })
})

// ── Tier 1 traversal pure helpers  ─────────────────
// rollHeldItem and the per-visit tile overrides are registry-free; these
// pins keep the Rng discipline and the Sokoban-lite rules honest without
// instantiating a scene.

describe('wild held-item bands (rollHeldItem, MECHANICS §10.2)', () => {
  /** An Rng whose one int(100) draw is fixed — bands become assertable points. */
  const rngAt = (r: number): Rng => ({ int: () => r }) as unknown as Rng
  const bands = [
    { item: 'AMBER_CRUMB', chance: 23 },
    { item: 'TOLL_SHARD', chance: 2 },
  ]

  it('returns null without bands, never touching the Rng stream', () => {
    let draws = 0
    const counting = { int: (): number => { draws++; return 0 } } as unknown as Rng
    expect(rollHeldItem(counting, undefined)).toBeNull()
    expect(rollHeldItem(counting, [])).toBeNull()
    expect(draws).toBe(0)
  })

  it('spends exactly one draw when bands exist, hit or miss', () => {
    let draws = 0
    const counting = { int: (n: number): number => { draws++; return n - 1 } } as unknown as Rng
    expect(rollHeldItem(counting, bands)).toBeNull()
    expect(draws).toBe(1)
  })

  it('maps the classic 23/2 bands cumulatively: 0-22, 23-24, 25-99', () => {
    expect(rollHeldItem(rngAt(0), bands)).toBe('AMBER_CRUMB')
    expect(rollHeldItem(rngAt(22), bands)).toBe('AMBER_CRUMB')
    expect(rollHeldItem(rngAt(23), bands)).toBe('TOLL_SHARD')
    expect(rollHeldItem(rngAt(24), bands)).toBe('TOLL_SHARD')
    expect(rollHeldItem(rngAt(25), bands)).toBeNull()
    expect(rollHeldItem(rngAt(99), bands)).toBeNull()
  })
})

describe('per-visit tile overrides (HEW/HEAVE runtime state)', () => {
  const arena = defineMap({
    id: 'test_arena', name: '', music: 'trail', outdoor: true,
    legend: { T: 'TREE', '.': 'GRASS', '~': 'WATER', D: 'DOOR', B: 'BOULDER' },
    rows: [
      'TTTTT',
      'T.B~T',
      'T.D.T',
      'TTTTT',
    ],
    spawns: { entry: { x: 1, y: 1, facing: 'down' } },
    warps: [{ x: 2, y: 2, to: { map: 'nowhere', spawn: 'door' } }],
  })

  it('reads through to the authored tile until overridden, neighbours untouched', () => {
    const o: TileOverrides = new Map()
    expect(overriddenTileId(arena.tiles, o, arena.width, 2, 1)).toBe(TILE_IDS.BOULDER)
    setTileOverride(o, arena.width, 2, 1, TILE_IDS.GRASS)
    expect(overriddenTileId(arena.tiles, o, arena.width, 2, 1)).toBe(TILE_IDS.GRASS)
    expect(overriddenTileId(arena.tiles, o, arena.width, 1, 1)).toBe(TILE_IDS.GRASS)
    expect(overriddenTileId(arena.tiles, o, arena.width, 3, 1)).toBe(TILE_IDS.WATER)
  })

  it('judges boulder destinations: open ground yes; solids, water, warps, out-of-bounds no', () => {
    const o: TileOverrides = new Map()
    expect(canReceiveBoulder(arena, o, 1, 1)).toBe(true) // grass
    expect(canReceiveBoulder(arena, o, 3, 2)).toBe(true) // walkable, no warp
    expect(canReceiveBoulder(arena, o, 0, 1)).toBe(false) // tree
    expect(canReceiveBoulder(arena, o, 3, 1)).toBe(false) // water stays a moat
    expect(canReceiveBoulder(arena, o, 2, 2)).toBe(false) // warp on a walkable DOOR
    expect(canReceiveBoulder(arena, o, -1, 1)).toBe(false)
    expect(canReceiveBoulder(arena, o, 5, 1)).toBe(false)
    expect(canReceiveBoulder(arena, o, 1, 4)).toBe(false)
  })

  it('respects overrides both ways: opened ground accepts, a parked boulder refuses', () => {
    const o: TileOverrides = new Map()
    setTileOverride(o, arena.width, 2, 1, TILE_IDS.GRASS) // the original boulder rolled away
    expect(canReceiveBoulder(arena, o, 2, 1)).toBe(true)
    setTileOverride(o, arena.width, 1, 1, TILE_IDS.BOULDER) // and parked here
    expect(canReceiveBoulder(arena, o, 1, 1)).toBe(false)
  })
})

// ── Tier 2 world-layer pure pieces  ─────────────────────
// The fishing dice, the A-on-water dispatcher, and the NPC calendar gate
// are registry-light and scene-free; these pins hold the Rng draw-count
// discipline (a seed must replay) and the dispatch/schedule truth tables.

describe('fishing dice (rollBite / rollFishingEncounter, tier2-fishing.md F7)', () => {
  // A 7-slot lake in the bellmere mold; the real encounter table is tested independently.
  const LAKE_TABLE = [
    { species: 'PADDLET', level: [6, 9] as [number, number] },
    { species: 'PADDLET', level: [8, 11] as [number, number] },
    { species: 'TORTIDE', level: 10 },
    { species: 'TORTIDE', level: 12 },
    { species: 'PADDLET', level: 12 },
    { species: 'DEWBELL', level: 10 },
    { species: 'TORTIDE', level: 15 },
  ]
  const lakeMap = (over?: object): MapDef =>
    ({ id: 'test_lake', fishingEncounters: LAKE_TABLE, ...over }) as unknown as MapDef
  const dryMap = (): MapDef => ({ id: 'test_dry' }) as unknown as MapDef
  const gameWith = (party: Kindra[], rng: Rng): Game =>
    ({ state: { party }, rng, period: () => 'day', day: () => 2 }) as unknown as Game

  /** An Rng whose int() draws are counted, each returning `r` (clamped to range). */
  const countingRng = (r: number): { rng: Rng; draws: () => number } => {
    let n = 0
    const rng = {
      int: (max: number) => {
        n++
        return Math.min(r, max - 1)
      },
    } as unknown as Rng
    return { rng, draws: () => n }
  }

  const angler = (): Kindra => makeKindra('PADDLET', 7)
  const fainted = (): Kindra => {
    const k = makeKindra('PADDLET', 7)
    k.hp = 0
    return k
  }
  const egg = (): Kindra => {
    const k = makeKindra('PADDLET', 5)
    k.egg = 1536
    return k
  }

  it('keeps the patient default: 60 in 100', () => {
    expect(FISHING_BITE_DEFAULT).toBe(60)
  })

  it('never draws without a table — the stream stays pinned', () => {
    const { rng, draws } = countingRng(0)
    expect(rollBite(gameWith([angler()], rng), dryMap())).toBe(false)
    expect(rollFishingEncounter(gameWith([angler()], rng), dryMap())).toBeNull()
    expect(draws()).toBe(0)
  })

  it('never draws without an able member: empty, fainted, and egg-only parties stay quiet', () => {
    for (const party of [[], [fainted()], [egg()], [fainted(), egg()]]) {
      const { rng, draws } = countingRng(0)
      expect(rollBite(gameWith(party, rng), lakeMap())).toBe(false)
      expect(draws()).toBe(0)
    }
  })

  it('an egg in the bag does not silence an able angler beside it', () => {
    const { rng } = countingRng(0)
    expect(rollBite(gameWith([egg(), angler()], rng), lakeMap())).toBe(true)
  })

  it('spends exactly one draw per cast, hit or miss, at the default-rate boundary', () => {
    const hit = countingRng(59) // 59 < 60: the last winning roll
    expect(rollBite(gameWith([angler()], hit.rng), lakeMap())).toBe(true)
    expect(hit.draws()).toBe(1)
    const miss = countingRng(60) // 60 >= 60: the first losing roll
    expect(rollBite(gameWith([angler()], miss.rng), lakeMap())).toBe(false)
    expect(miss.draws()).toBe(1)
  })

  it('honours fishingRate: 0 never bites, 100 always does', () => {
    const never = countingRng(0)
    expect(rollBite(gameWith([angler()], never.rng), lakeMap({ fishingRate: 0 }))).toBe(false)
    const always = countingRng(99)
    expect(rollBite(gameWith([angler()], always.rng), lakeMap({ fishingRate: 100 }))).toBe(true)
  })

  it('hooks only lake species at lake levels, over 200 seeded casts', () => {
    const game = gameWith([angler()], new Rng(7))
    for (let cast = 0; cast < 200; cast++) {
      const wild = rollFishingEncounter(game, lakeMap())
      expect(wild).not.toBeNull()
      expect(['PADDLET', 'TORTIDE', 'DEWBELL']).toContain(wild!.species)
      expect(wild!.level).toBeGreaterThanOrEqual(6)
      expect(wild!.level).toBeLessThanOrEqual(15)
      expect(wild!.egg).toBeUndefined()
    }
  })
})

describe('the water dispatcher (waterIntent / hasRod, tier2-fishing.md F4)', () => {
  it('sends a bare A-press down the WAVERIDE flow, partner or not', () => {
    expect(waterIntent(false, false)).toBe('waveride')
    expect(waterIntent(false, true)).toBe('waveride')
  })

  it('casts immediately with a rod alone, and asks only when both intents are live', () => {
    expect(waterIntent(true, false)).toBe('fish')
    expect(waterIntent(true, true)).toBe('ask')
  })

  it('spots a rod by item kind, never by key, ignoring exhausted slots', () => {
    const items = {
      OLD_ROD: { key: 'OLD_ROD', name: 'OLD ROD', desc: '', price: 0, effect: { kind: 'rod' } },
      TONIC: { key: 'TONIC', name: 'TONIC', desc: '', price: 120, effect: { kind: 'heal', amount: 20 } },
    } as Record<string, Item>
    expect(hasRod({}, items)).toBe(false)
    expect(hasRod({ TONIC: 5 }, items)).toBe(false)
    expect(hasRod({ OLD_ROD: 0 }, items)).toBe(false)
    expect(hasRod({ OLD_ROD: 1, TONIC: 5 }, items)).toBe(true)
  })
})

describe('NPC calendar visibility (NpcDef.appears, tier2-weekly.md D2)', () => {
  const npcDef = (extra?: Partial<NpcDef>): NpcDef => ({
    id: 'vendor', sprite: 'MAN', x: 1, y: 1, facing: 'down',
    movement: 'static', dialog: 'story.test', ...extra,
  })
  const actor = (def: NpcDef): NpcActor => new NpcActor(def, new Rng(1))
  const save = newSave('STORM')

  it('keeps the Tier-1 contract: no appears = visible any day, any hour', () => {
    expect(actor(npcDef()).visible(save, 2, 'day')).toBe(true)
  })

  it('keeps day appointments (the Saturday market)', () => {
    const market = actor(npcDef({ appears: { days: [6] } }))
    expect(market.visible(save, 6, 'day')).toBe(true)
    expect(market.visible(save, 6, 'night')).toBe(true)
    expect(market.visible(save, 2, 'day')).toBe(false)
  })

  it('keeps period appointments', () => {
    const owl = actor(npcDef({ appears: { periods: ['night'] } }))
    expect(owl.visible(save, 2, 'night')).toBe(true)
    expect(owl.visible(save, 2, 'morning')).toBe(false)
  })

  it('ANDs days with periods (the Sunday-morning visitor)', () => {
    const gran = actor(npcDef({ appears: { days: [0], periods: ['morning'] } }))
    expect(gran.visible(save, 0, 'morning')).toBe(true)
    expect(gran.visible(save, 0, 'day')).toBe(false)
    expect(gran.visible(save, 1, 'morning')).toBe(false)
  })

  it('ANDs the schedule with the flag gates', () => {
    const gated = actor(npcDef({ appears: { days: [6] }, hideFlag: 'gone' }))
    expect(gated.visible(save, 6, 'day')).toBe(true)
    const hidden = { ...save, flags: { gone: true } }
    expect(gated.visible(hidden, 6, 'day')).toBe(false)
  })

  it('skips the schedule for callers without a clock — flags only, never a surprise vanish', () => {
    expect(actor(npcDef({ appears: { days: [6] } })).visible(save)).toBe(true)
  })
})
