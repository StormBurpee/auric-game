/**
 * The town services and the send-off — docs/STORY.md §2 and §9.
 * Keeper Lily's Haven loop (REST plays the jingle, restores the party,
 * and latches this Haven as the whiteout return; ARCHIVE opens Larch's
 * Archive — both in one visit, as many times as the player likes),
 * the Outfitter counter, and Mom's first-morning farewell.
 */
import type { Task } from '../../../engine'
import type { GameScript, ScriptCtx } from '../../script/dsl'

/**
 * Everything on the Outfitter's shelf, grouped charms / tonics / cures
 * then the Tier-1 hold gear, price-ascending within each group per docs
 * (the LINK CORD is sold dearly — trades are priceless).
 */
const SHELF = [
  'CHARM', 'GILDED_CHARM', 'TONIC', 'BIG_TONIC', 'CURE_LEAF',
  'CINDER_BAND', 'DEW_PEARL', 'MOSS_LOCKET', 'LINK_CORD',
]

export const havenLily: GameScript = function* (c) {
  yield* c.say('story.haven.lily.1')
  let helped = false
  for (;;) {
    const pick = yield* c.ask('story.haven.lily.what', ['REST', 'ARCHIVE', 'LEAVE'], { cancelIndex: 2 })
    if (pick === 0) {
      yield* c.say('story.haven.lily.3')
      yield* c.heal()
      yield* c.say('story.haven.lily.4')
    } else if (pick === 1) {
      yield* c.say('story.haven.archive.1')
      yield* c.archive()
      yield* c.say('story.haven.archive.2')
    } else {
      break
    }
    helped = true
  }
  yield* c.say(helped ? 'story.haven.lily.5' : 'story.haven.lily.no')
}

export const outfitterClerk: GameScript = function* (c) {
  yield* c.say('story.outfitter.clerk.1')
  yield* c.say('story.outfitter.clerk.2')
  yield* c.shop(SHELF)
  yield* c.say('story.outfitter.bye')
}

/**
 * The CHARM GEAR ceremony — Mom's gift, exactly where 1999 put it
 * (Gen-2 canon, tier2-charm-gear.md D1). The Gear is a flag, not a bag
 * item: like the Kindex, it's a menu the story unlocks.
 */
function* gearGrant(c: ScriptCtx): Task<void> {
  for (let box = 1; box <= 3; box++) yield* c.say(`story.home.gear.${box}`)
  c.sfx('levelup')
  yield* c.say('sys.item.get', { ITEM: 'CHARM GEAR' })
  c.setFlag('charm_gear')
}

export const momHome: GameScript = function* (c) {
  if (c.flag('mom_sendoff')) {
    // In-flight saves that already had the send-off still get the Gear —
    // the retroactive grant comes before her ambient line, so nobody is
    // ever locked out of the feature.
    if (!c.flag('charm_gear')) yield* gearGrant(c)
    yield* c.say('story.home.after.1')
    return
  }
  for (let box = 1; box <= 4; box++) yield* c.say(`story.home.${box}`)
  c.setFlag('mom_sendoff')
  yield* gearGrant(c)
}
