/**
 * The tile vocabulary of Ambervale: every kind of ground a foot (or a
 * ledge-hop) can meet. SEMANTICS live here — solidity, grass checks,
 * ledges, counters. LOOKS live in assets/tiles.ts. Map data references
 * these keys through the defineMap legend, so the world is readable as
 * text long before it is drawable as pixels.
 */
export type TileKey =
  // terrain
  | 'VOID' | 'GRASS' | 'GRASS_TUFT' | 'TALL_GRASS' | 'PATH' | 'FLOWER' | 'SAND'
  | 'TREE' | 'PINE' | 'ROCK' | 'WATER' | 'LEDGE_S' | 'FENCE' | 'SIGN'
  // buildings, outside
  | 'ROOF_HOME_L' | 'ROOF_HOME_M' | 'ROOF_HOME_R'
  | 'ROOF_CIVIC_L' | 'ROOF_CIVIC_M' | 'ROOF_CIVIC_R'
  | 'WALL' | 'WALL_WINDOW' | 'WALL_SIGN_HAVEN' | 'WALL_SIGN_SHOP' | 'WALL_SIGN_GYM'
  | 'DOOR'
  // interiors
  | 'FLOOR_WOOD' | 'FLOOR_STONE' | 'RUG' | 'MAT' | 'WALL_INT'
  | 'COUNTER' | 'TABLE' | 'BED' | 'BOOKSHELF' | 'PLANT_POT'
  | 'PEDESTAL' | 'STATUE' | 'GYM_FLOOR'
  // field-ability obstacles + interior stairs (Tier 1)
  | 'SAPLING' | 'BOULDER' | 'STAIRS'

export interface TileDef {
  key: TileKey
  solid: boolean
  /** Steps here roll wild-encounter checks. */
  grass?: boolean
  /** One-way hop when the player walks south onto it. */
  ledge?: boolean
  /** Interactable across (Haven/Outfitter counters). */
  counter?: boolean
  water?: boolean
}

const T = (key: TileKey, solid: boolean, extra?: Partial<TileDef>): TileDef => ({ key, solid, ...extra })

/** Index in this list IS the tile id stored in map data. Append-only. */
export const TILE_LIST: readonly TileDef[] = [
  T('VOID', true),
  T('GRASS', false),
  T('GRASS_TUFT', false),
  T('TALL_GRASS', false, { grass: true }),
  T('PATH', false),
  T('FLOWER', false),
  T('SAND', false),
  T('TREE', true),
  T('PINE', true),
  T('ROCK', true),
  T('WATER', true, { water: true }),
  T('LEDGE_S', true, { ledge: true }),
  T('FENCE', true),
  T('SIGN', true),
  T('ROOF_HOME_L', true),
  T('ROOF_HOME_M', true),
  T('ROOF_HOME_R', true),
  T('ROOF_CIVIC_L', true),
  T('ROOF_CIVIC_M', true),
  T('ROOF_CIVIC_R', true),
  T('WALL', true),
  T('WALL_WINDOW', true),
  T('WALL_SIGN_HAVEN', true),
  T('WALL_SIGN_SHOP', true),
  T('WALL_SIGN_GYM', true),
  T('DOOR', false),
  T('FLOOR_WOOD', false),
  T('FLOOR_STONE', false),
  T('RUG', false),
  T('MAT', false),
  T('WALL_INT', true),
  T('COUNTER', true, { counter: true }),
  T('TABLE', true),
  T('BED', true),
  T('BOOKSHELF', true),
  T('PLANT_POT', true),
  T('PEDESTAL', true),
  T('STATUE', true),
  T('GYM_FLOOR', false),
  T('SAPLING', true),
  T('BOULDER', true),
  T('STAIRS', false),
]

export const TILE_IDS: Record<TileKey, number> = Object.fromEntries(
  TILE_LIST.map((t, i) => [t.key, i]),
) as Record<TileKey, number>

export function tileDef(id: number): TileDef {
  return TILE_LIST[id] ?? TILE_LIST[0]!
}
