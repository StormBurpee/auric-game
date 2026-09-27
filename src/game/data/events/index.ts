/**
 * Scripted moments, keyed by the `script` / `sightScript` fields of
 * NPCs across the atlas: the lab choice, Elder Rowan's KINDEX, the
 * rival ambush, Aria's gym, Keeper Lily, the Outfitter, Mom's
 * send-off, and the multi-box ambient chats. tests/world.test.ts
 * asserts every key an NPC references resolves here.
 */
import type { GameScript } from '../../script/dsl'
import { AMBIENT_EVENTS } from './ambient'
import { bellmereAngler, berryGran } from './gift'
import { gymAria } from './gym'
import { larchLab } from './lab'
import { marketVendor } from './market'
import { nurseryEggMan, nurseryKeeper } from './nursery'
import { rivalAmbush } from './rival'
import { elderRowan } from './rowan'
import { havenLily, momHome, outfitterClerk } from './services'

export const EVENTS: Record<string, GameScript> = {
  larch_lab: larchLab,
  elder_rowan: elderRowan,
  rival_ambush: rivalAmbush,
  gym_aria: gymAria,
  haven_lily: havenLily,
  outfitter_clerk: outfitterClerk,
  mom_home: momHome,
  // Tier 2 — the week and the rod (content registry keys).
  market_vendor: marketVendor,
  berry_gran: berryGran,
  npc_bellmere_angler: bellmereAngler,
  // Tier 2 — the Dawnfern nursery couple (nursery registry keys).
  nursery_keeper: nurseryKeeper,
  nursery_egg_man: nurseryEggMan,
  ...AMBIENT_EVENTS,
}
