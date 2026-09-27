/**
 * Four-color palette discipline: every sprite and tile is drawn with exactly
 * four colours from a named palette. Day and night are not separate art —
 * they are palette transformations applied at resolve time, exactly how
 * the classics did it. UI palettes opt out with `fixed`.
 */
export type Rgb = readonly [number, number, number]

export interface Palette {
  readonly colors: readonly [Rgb, Rgb, Rgb, Rgb]
  /** Fixed palettes ignore time-of-day tinting (text boxes, HUD, menus). */
  readonly fixed?: boolean
}

export type DayPeriod = 'morning' | 'day' | 'night'

/** '#rrggbb' → Rgb */
export function hex(s: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(s)
  if (!m) throw new Error(`hex: bad colour '${s}'`)
  const v = parseInt(m[1]!, 16)
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]
}

/** Build a palette from four hex strings (index 0 first, usually the lightest or transparent slot). */
export function pal(c0: string, c1: string, c2: string, c3: string, opts?: { fixed?: boolean }): Palette {
  return { colors: [hex(c0), hex(c1), hex(c2), hex(c3)], ...(opts?.fixed ? { fixed: true } : {}) }
}

const clamp255 = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : Math.round(n))

/** Apply the time-of-day cast to a single colour. */
export function tintRgb([r, g, b]: Rgb, period: DayPeriod): Rgb {
  switch (period) {
    case 'day':
      return [r, g, b]
    case 'morning':
      // Low gold light: lift reds, soften blues.
      return [clamp255(r * 1.04 + 14), clamp255(g * 1.0 + 6), clamp255(b * 0.88)]
    case 'night':
      // Moonlight: crush brightness, pull everything toward deep blue.
      return [clamp255(r * 0.45), clamp255(g * 0.5 + 4), clamp255(b * 0.72 + 34)]
  }
}
