/**
 * Per-visit tile overrides — the runtime memory of a hewn sapling or a
 * heaved boulder. The map's authored tiles are immutable; a World keeps
 * one small Map of replacements that collision and drawing both consult,
 * and because setMap() builds a fresh World on every transition, the
 * cartridge tradition (obstacles return when you do) costs nothing.
 *
 * Pure functions over plain data, so tests drive them without a scene.
 */
import type { MapDef } from '../types'
import { tileDef } from './tiles'

/** Tile index (y * width + x) → replacement tile id. */
export type TileOverrides = Map<number, number>

/** Replace the tile at (x, y) for the rest of this visit. */
export function setTileOverride(
  overrides: TileOverrides,
  width: number,
  x: number,
  y: number,
  tileId: number,
): void {
  overrides.set(y * width + x, tileId)
}

/** The tile id at (x, y) with this visit's overrides applied. */
export function overriddenTileId(
  tiles: Uint8Array,
  overrides: TileOverrides,
  width: number,
  x: number,
  y: number,
): number {
  const idx = y * width + x
  return overrides.get(idx) ?? tiles[idx]!
}

/**
 * Sokoban-lite legality for a boulder's destination: in bounds, walkable
 * after overrides (solids and water both refuse), and not a warp tile —
 * a boulder must never bury a doorway. Actor occupancy is the scene's
 * affair; it checks separately.
 */
export function canReceiveBoulder(
  map: MapDef,
  overrides: TileOverrides,
  x: number,
  y: number,
): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false
  if (tileDef(overriddenTileId(map.tiles, overrides, map.width, x, y)).solid) return false
  if (map.warps.some((w) => w.x === x && w.y === y)) return false
  return true
}
