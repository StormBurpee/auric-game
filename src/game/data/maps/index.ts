/**
 * The atlas of Ambervale — every MapDef of docs/WORLD.md, keyed by map
 * id. One module per map, each compiled through defineMap so a typo in
 * a grid fails at import time; tests/world.test.ts asserts the
 * cross-map promises (validateWorld, scripts, trainers, encounters).
 */
import type { MapDef } from '../../types'
import { BELLMERE } from './bellmere'
import { BELLMERE_HAVEN } from './bellmere_haven'
import { BELLMERE_OUTFITTER } from './bellmere_outfitter'
import { DAWNFERN } from './dawnfern'
import { DAWNFERN_NURSERY } from './dawnfern_nursery'
import { ELDER_HOUSE } from './elder_house'
import { LARCH_LAB } from './larch_lab'
import { LOOMSPIRE } from './loomspire'
import { LOOMSPIRE_GYM } from './loomspire_gym'
import { LOOMSPIRE_HAVEN } from './loomspire_haven'
import { PLAYER_HOME } from './player_home'
import { TRAIL1 } from './trail1'
import { TRAIL2 } from './trail2'
import { WISTERIA_SPIRE_1F } from './wisteria_spire_1f'
import { WISTERIA_SPIRE_2F } from './wisteria_spire_2f'

const ALL: readonly MapDef[] = [
  DAWNFERN, TRAIL1, BELLMERE, TRAIL2, LOOMSPIRE,
  PLAYER_HOME, LARCH_LAB, DAWNFERN_NURSERY,
  BELLMERE_HAVEN, LOOMSPIRE_HAVEN, BELLMERE_OUTFITTER, ELDER_HOUSE,
  LOOMSPIRE_GYM, WISTERIA_SPIRE_1F, WISTERIA_SPIRE_2F,
]

export const MAPS: Record<string, MapDef> = Object.fromEntries(
  ALL.map((m): [string, MapDef] => [m.id, m]),
)

export function mapOf(id: string): MapDef {
  const m = MAPS[id]
  if (!m) throw new Error(`unknown map '${id}'`)
  return m
}
