/**
 * Ambient townsfolk whose STORY.md §7 dialog spans several keyed boxes
 * (strings.ts holds one box per key, and an NpcDef `dialog` shows a
 * single key) — each gets a tiny chat script that strings its boxes.
 * Single-box and day/night-single NPCs use plain `dialog` fields on
 * their maps instead.
 */
import type { GameScript } from '../../script/dsl'
import { BELL_TOLL_DAY, MARKET_DAY } from '../weekly'

/** A talk that walks through the given string keys, one box after another. */
const chat = (...keys: string[]): GameScript =>
  function* (c) {
    for (const key of keys) yield* c.say(key)
  }

export const AMBIENT_EVENTS: Record<string, GameScript> = {
  // Dawnfern: the tall-grass kid; Larch's aide gets the neighbor's line.
  npc_dawnfern_kid: chat('story.npc.dawnfern1.1', 'story.npc.dawnfern1.2'),
  npc_lab_aide: chat('story.npc.dawnfern3.1', 'story.npc.dawnfern3.2'),

  // Trail 1: the lake tall-tale on the way up, ledges where they bite.
  npc_trail1_boy: chat('story.npc.bellmere4.1', 'story.npc.bellmere4.2'),
  npc_trail1_woman: chat('story.npc.bellmere3.1', 'story.npc.bellmere3.2'),

  // Bellmere: the elder's gift-of-gold dedication.
  npc_bellmere_elder: chat(
    'story.npc.bellmere1.1', 'story.npc.bellmere1.2', 'story.npc.bellmere1.3',
  ),

  // Bellmere: the shore watcher keeps her day/night lines, plus a
  // Saturday-daylight variant pointing at the market vendor (Tier 2).
  npc_bellmere_market: function* (c) {
    if (c.game.period() === 'night') {
      yield* c.say('story.npc.bellmere2.night')
    } else if (c.game.day() === MARKET_DAY) {
      yield* c.say('story.npc.bellmere2.market')
    } else {
      yield* c.say('story.npc.bellmere2.day')
    }
  },

  // Loomspire: the Spire warning swaps to its two-box night version.
  npc_loomspire_spire: function* (c) {
    if (c.game.period() === 'night') {
      yield* c.say('story.npc.loomspire1.night.1')
      yield* c.say('story.npc.loomspire1.night.2')
    } else {
      yield* c.say('story.npc.loomspire1.day')
    }
  },
  npc_loomspire_gym_fan: chat('story.npc.loomspire2.1', 'story.npc.loomspire2.2'),
  npc_loomspire_arcade_kid: chat('story.npc.loomspire3.1', 'story.npc.loomspire3.2'),
  npc_loomspire_grunt: chat('story.npc.loomspire5.1', 'story.npc.loomspire5.2'),

  // Inside the Spire — he repeats Rowan's warning on purpose; the old
  // man taught him to listen. On the bell-toll night (Tier 2: Wednesday
  // nights, when the Spire's encounter rate doubles), he hears it sing.
  npc_spire_watcher: function* (c) {
    if (c.game.day() === BELL_TOLL_DAY && c.game.period() === 'night') {
      yield* c.say('story.npc.spire.toll')
    } else {
      yield* c.say('story.rowan.after.1')
    }
  },
}
