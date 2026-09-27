/**
 * Ambervale keeps real time, the way the gold cartridge did with its
 * little battery. Play at night and the night Kindra come out; play
 * before school and the morning ones do.
 *
 *   Morning  04:00–09:59
 *   Day      10:00–17:59
 *   Night    18:00–03:59
 */
import type { DayPeriod } from '../engine'
import type { DayOfWeek } from './types'

export function periodAtHour(hour: number): DayPeriod {
  if (hour >= 4 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 18) return 'day'
  return 'night'
}

export function currentPeriod(override: DayPeriod | null = null, now: Date = new Date()): DayPeriod {
  return override ?? periodAtHour(now.getHours())
}

/** The day of the JS week (0 = Sunday). Market Saturdays, bell-toll Wednesdays. */
export function dayOfWeek(override: DayOfWeek | null = null, now: Date = new Date()): DayOfWeek {
  return override ?? (now.getDay() as DayOfWeek)
}

/**
 * Monday-start week index since the epoch, computed from LOCAL date parts
 * through Date.UTC so daylight-saving shifts can never split a week.
 * Weekly one-shot flags stamp themselves with this.
 */
export function dayStamp(now: Date = new Date()): number {
  const days = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
  return Math.floor((days - 4) / 7) // 1970-01-01 was a Thursday; -4 lands week starts on Monday
}
