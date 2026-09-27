/**
 * Standing gifts of the open world: the Sunday-morning berry gran on
 * Trail 1 (one hold-berry a week — rotation in data/weekly.ts, stamped
 * like the market) and the old Bellmere angler whose OLD ROD opens
 * fishing for good (latched once by
 * 'old_rod_given').
 */
import { dayStamp } from '../../clock'
import type { GameScript } from '../../script/dsl'
import { giftItem } from '../weekly'
import { claimWeekly, weeklyClaimed } from './market'

/**
 * The gran appears Sunday mornings only (`appears` on her NpcDef) by
 * the west flowers, two steps from the trail's open TINGLE BERRY —
 * she's the one who grows them.
 */
export const berryGran: GameScript = function* (c) {
  const s = c.game.state
  if (weeklyClaimed(s, 'gift')) {
    yield* c.say('story.gran.again')
    return
  }
  yield* c.say('story.gran.1')
  yield* c.say('story.gran.2')
  claimWeekly(s, 'gift')
  yield* c.giveItem(giftItem(dayStamp()), 1)
}

/**
 * STORY.md §7 closed its own loop: the kid on Trail 1 retells a tall
 * tale (bellmere4), and here on the sand sits the old man who told it.
 * Three boxes, one rod, no hurry; ever after, one line of advice.
 */
export const bellmereAngler: GameScript = function* (c) {
  if (c.flag('old_rod_given')) {
    yield* c.say('story.npc.bellmere5.after')
    return
  }
  yield* c.say('story.npc.bellmere5.1')
  yield* c.say('story.npc.bellmere5.2')
  yield* c.say('story.npc.bellmere5.3')
  yield* c.giveItem('OLD_ROD', 1)
  c.setFlag('old_rod_given')
}
