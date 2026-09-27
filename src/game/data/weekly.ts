/**
 * Everything that happens on a calendar in Ambervale, in one place:
 * the Saturday market's rotation, the Sunday gift, the night the Spire
 * sings. Read this file to know what this week holds.
 *
 * Pure data and total lookups only — events and encounter rolls import
 * from here, never the other way round. Week indices come from
 * clock.ts#dayStamp; day numbers keep the JS Date convention
 * (0 = Sunday … 6 = Saturday). Pitch keys resolve in data/strings.ts.
 */
import type { DayOfWeek } from '../types'

/** One rotating market offer: the week index picks from the ring. */
export interface MarketOffer {
  item: string
  price: number
  /** Sales-pitch strings key. */
  pitch: string
}

export const MARKET_DAY: DayOfWeek = 6 // Saturday

/**
 * The Bellmere vendor's five-week ring, one rare per Saturday. Prices
 * undercut the Outfitter where the shelves overlap (GILDED CHARM lists
 * 600G there, the type-boost trio 900G apiece); the LUMEN BERRY is
 * otherwise wild-held only — 200G buys a week of not hunting WISPETAL.
 */
export const MARKET_OFFERS: readonly MarketOffer[] = [
  { item: 'GILDED_CHARM', price: 450, pitch: 'story.market.pitch.charm' },
  { item: 'CINDER_BAND', price: 700, pitch: 'story.market.pitch.cinder' },
  { item: 'DEW_PEARL', price: 700, pitch: 'story.market.pitch.dew' },
  { item: 'MOSS_LOCKET', price: 700, pitch: 'story.market.pitch.moss' },
  { item: 'LUMEN_BERRY', price: 200, pitch: 'story.market.pitch.lumen' },
]

/** This week's market offer — total over any integer week stamp. */
export function marketOffer(week: number): MarketOffer {
  const n = MARKET_OFFERS.length
  return MARKET_OFFERS[((week % n) + n) % n]!
}

export const GIFT_DAY: DayOfWeek = 0 // Sunday morning, Trail 1

/** The berry gran's three-week ring; every gift is a hold-berry. */
export const GIFT_ROTATION: readonly string[] = [
  'TINGLE_BERRY', 'PLUMP_BERRY', 'LUMEN_BERRY',
]

/** This week's Sunday berry — total over any integer week stamp. */
export function giftItem(week: number): string {
  const n = GIFT_ROTATION.length
  return GIFT_ROTATION[((week % n) + n) % n]!
}

/** The bell-toll: one weeknight the Spire's encounter rate multiplies. */
export const BELL_TOLL_DAY: DayOfWeek = 3 // Wednesday
export const BELL_TOLL_MAPS: ReadonlySet<string> = new Set([
  'wisteria_spire_1f', 'wisteria_spire_2f',
])
export const BELL_TOLL_MULT = 2

/** Encounter-rate multiplier for a map tonight (1 = ordinary night). */
export function weeklyEncounterMult(mapId: string, day: DayOfWeek, isNight: boolean): number {
  return isNight && day === BELL_TOLL_DAY && BELL_TOLL_MAPS.has(mapId) ? BELL_TOLL_MULT : 1
}
