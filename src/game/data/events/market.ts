/**
 * BELLMERE MARKET DAY — the Saturday vendor on the lake's sand rim
 * with one rotating rare per week, sold
 * through a script — `openShop` is never touched. The rotation and
 * pitch keys live in data/weekly.ts; the once-per-week latch is a
 * `weekly_market_<stamp>` flag with prune-on-claim, so the save file
 * never silts up with dead stamps.
 */
import { dayStamp } from '../../clock'
import type { GameScript } from '../../script/dsl'
import { flag, setFlag } from '../../state'
import type { SaveData } from '../../types'
import { ITEMS } from '../items'
import { marketOffer } from '../weekly'

// ── Weekly one-shot flags (tier2-weekly.md D5) ──────────────────────────────
// `weekly_<key>_<weekstamp>` rides the open-ended flags record; claiming
// prunes every stale stamp under the same key. Shared by the gift script.

/** Already claimed this week's `<key>` one-shot? */
export function weeklyClaimed(s: SaveData, key: string): boolean {
  return flag(s, `weekly_${key}_${dayStamp()}`)
}

/** Claim this week's `<key>` one-shot, pruning the previous stamps. */
export function claimWeekly(s: SaveData, key: string): void {
  const prefix = `weekly_${key}_`
  for (const f of Object.keys(s.flags)) {
    if (f.startsWith(prefix)) setFlag(s, f, false)
  }
  setFlag(s, `weekly_${key}_${dayStamp()}`)
}

/**
 * The vendor (visible Saturdays only — `appears` on his NpcDef). Pitch,
 * offer with explicit {ITEM}/{AMOUNT} vars, BUY/PASS, and exactly one
 * sale per week stamp. A short purse reuses the Outfitter's refusal.
 */
export const marketVendor: GameScript = function* (c) {
  const s = c.game.state
  yield* c.say('story.market.vendor.1')
  if (weeklyClaimed(s, 'market')) {
    yield* c.say('story.market.sold')
    return
  }
  const offer = marketOffer(dayStamp())
  yield* c.say(offer.pitch)
  yield* c.say('story.market.offer', {
    ITEM: ITEMS[offer.item]?.name ?? offer.item,
    AMOUNT: String(offer.price),
  })
  const pick = yield* c.ask(null, ['BUY', 'PASS'], { cancelIndex: 1 })
  if (pick !== 0) {
    yield* c.say('story.market.bye')
    return
  }
  if (s.glints < offer.price) {
    yield* c.say('sys.shop.nomoney')
    return
  }
  s.glints -= offer.price
  claimWeekly(s, 'market')
  yield* c.giveItem(offer.item, 1)
  yield* c.say('story.market.deal')
}
