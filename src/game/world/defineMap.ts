/**
 * Maps are authored as ASCII art with a legend — the way you'd sketch a
 * town on graph paper. `defineMap` compiles the drawing into packed tile
 * ids and validates everything it can see locally; `validateWorld`
 * checks the cross-map promises (warps land on real spawns, edges join
 * real maps) once the whole atlas is assembled. A typo in a map should
 * fail a test, never a play session.
 */
import type {
  EncounterSet,
  EncounterTable,
  GroundItemDef,
  MapDef,
  NpcDef,
  SignDef,
  SpawnDef,
  WarpDef,
  Dir,
} from '../types'
import type { TileKey } from './tiles'
import { TILE_IDS } from './tiles'

export interface MapSpec {
  id: string
  name: string
  music: string
  outdoor: boolean
  legend: Record<string, TileKey>
  rows: string[]
  spawns: Record<string, SpawnDef>
  warps?: WarpDef[]
  edges?: Partial<Record<Dir, { map: string; spawn: string }>>
  npcs?: NpcDef[]
  signs?: SignDef[]
  items?: GroundItemDef[]
  encounters?: EncounterSet
  encounterRate?: number
  caveEncounters?: boolean
  dark?: boolean
  waterEncounters?: EncounterTable
  waterRate?: number
  fishingEncounters?: EncounterTable
  fishingRate?: number
}

export function defineMap(spec: MapSpec): MapDef {
  const { id, rows, legend } = spec
  if (rows.length === 0) throw new Error(`map ${id}: no rows`)
  const width = rows[0]!.length
  const height = rows.length
  const tiles = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    const row = rows[y]!
    if (row.length !== width) {
      throw new Error(`map ${id}: row ${y} is ${row.length} chars, expected ${width}`)
    }
    for (let x = 0; x < width; x++) {
      const ch = row[x]!
      const key = legend[ch]
      if (key === undefined) throw new Error(`map ${id}: char '${ch}' at ${x},${y} not in legend`)
      const tid = TILE_IDS[key]
      if (tid === undefined) throw new Error(`map ${id}: legend '${ch}' names unknown tile '${key}'`)
      tiles[y * width + x] = tid
    }
  }

  const inBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height
  const checkPos = (what: string, x: number, y: number) => {
    if (!inBounds(x, y)) throw new Error(`map ${id}: ${what} at ${x},${y} is out of bounds`)
  }
  for (const w of spec.warps ?? []) checkPos(`warp to ${w.to.map}`, w.x, w.y)
  for (const [name, s] of Object.entries(spec.spawns)) checkPos(`spawn '${name}'`, s.x, s.y)
  for (const n of spec.npcs ?? []) checkPos(`npc '${n.id}'`, n.x, n.y)
  for (const s of spec.signs ?? []) checkPos(`sign '${s.text}'`, s.x, s.y)
  for (const it of spec.items ?? []) checkPos(`item '${it.id}'`, it.x, it.y)
  if (spec.encounters) {
    for (const [period, table] of Object.entries(spec.encounters)) {
      checkTable(id, period, table)
    }
  }
  if (spec.waterEncounters) checkTable(id, 'water', spec.waterEncounters)
  if (spec.fishingEncounters) checkTable(id, 'fishing', spec.fishingEncounters)

  return {
    id: spec.id,
    name: spec.name,
    music: spec.music,
    width,
    height,
    tiles,
    outdoor: spec.outdoor,
    warps: spec.warps ?? [],
    spawns: spec.spawns,
    ...(spec.edges ? { edges: spec.edges } : {}),
    npcs: spec.npcs ?? [],
    signs: spec.signs ?? [],
    items: spec.items ?? [],
    ...(spec.encounters ? { encounters: spec.encounters } : {}),
    ...(spec.encounterRate !== undefined ? { encounterRate: spec.encounterRate } : {}),
    ...(spec.caveEncounters ? { caveEncounters: true } : {}),
    ...(spec.dark ? { dark: true } : {}),
    ...(spec.waterEncounters ? { waterEncounters: spec.waterEncounters } : {}),
    ...(spec.waterRate !== undefined ? { waterRate: spec.waterRate } : {}),
    ...(spec.fishingEncounters ? { fishingEncounters: spec.fishingEncounters } : {}),
    ...(spec.fishingRate !== undefined ? { fishingRate: spec.fishingRate } : {}),
  }
}

function checkTable(mapId: string, period: string, table: EncounterTable): void {
  if (table.length !== 7) {
    throw new Error(`map ${mapId}: ${period} encounter table has ${table.length} slots, expected 7`)
  }
}

/** Cross-map validation; returns human-readable problems (tests assert []). */
export function validateWorld(maps: Record<string, MapDef>): string[] {
  const problems: string[] = []
  for (const map of Object.values(maps)) {
    const targets = [
      ...map.warps.map((w) => ({ what: `warp at ${w.x},${w.y}`, to: w.to })),
      ...Object.entries(map.edges ?? {}).map(([dir, to]) => ({ what: `edge ${dir}`, to: to! })),
    ]
    for (const { what, to } of targets) {
      const dest = maps[to.map]
      if (!dest) {
        problems.push(`${map.id}: ${what} targets unknown map '${to.map}'`)
      } else if (!dest.spawns[to.spawn]) {
        problems.push(`${map.id}: ${what} targets missing spawn '${to.spawn}' in '${to.map}'`)
      }
    }
  }
  return problems
}
