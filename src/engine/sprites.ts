/**
 * Sprites are authored as text grids, the way pixel art was meant to be
 * read in source code: one character per pixel, `.` for transparent,
 * `1`/`2`/`3` for palette entries. The grid below IS a 4x4 checkerboard:
 *
 *   sprite(`
 *     1.1.
 *     .1.1
 *     1.1.
 *     .1.1
 *   `)
 *
 * Decoding happens once at module load; at runtime a sprite is just a
 * width, a height, and a flat `Uint8Array` of palette indices.
 */
export interface Sprite {
  readonly w: number
  readonly h: number
  /** Row-major palette indices; 0 is transparent (or colour 0 for opaque tiles). */
  readonly px: Uint8Array
}

const CHAR_TO_INDEX: Record<string, number> = { '.': 0, ' ': 0, '0': 0, '1': 1, '2': 2, '3': 3 }

/** Parse a text grid into a Sprite. Rows must all be the same width. */
export function sprite(grid: string): Sprite {
  const rows = grid
    .split('\n')
    .map((r) => r.trimEnd())
    .filter((r) => r.trim().length > 0)
    .map((r) => r.replace(/^\s+/, ''))
  if (rows.length === 0) throw new Error('sprite: empty grid')
  const w = rows[0]!.length
  const h = rows.length
  const px = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = rows[y]!
    if (row.length !== w) {
      throw new Error(`sprite: row ${y} is ${row.length} chars, expected ${w}`)
    }
    for (let x = 0; x < w; x++) {
      const ch = row[x]!
      const idx = CHAR_TO_INDEX[ch]
      if (idx === undefined) throw new Error(`sprite: bad pixel char '${ch}' at ${x},${y}`)
      px[y * w + x] = idx
    }
  }
  return { w, h, px }
}

/**
 * Parse a grid whose rows are only the LEFT half of a horizontally
 * symmetric sprite; the right half is mirrored automatically. A gift for
 * creature artists: draw half a moth, get a whole moth.
 */
export function symmetric(halfGrid: string): Sprite {
  const half = sprite(halfGrid)
  const w = half.w * 2
  const px = new Uint8Array(w * half.h)
  for (let y = 0; y < half.h; y++) {
    for (let x = 0; x < half.w; x++) {
      const v = half.px[y * half.w + x]!
      px[y * w + x] = v
      px[y * w + (w - 1 - x)] = v
    }
  }
  return { w, h: half.h, px }
}

/** Horizontal mirror (for walk cycles: draw one side, flip the other). */
export function flipX(s: Sprite): Sprite {
  const px = new Uint8Array(s.w * s.h)
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      px[y * s.w + x] = s.px[y * s.w + (s.w - 1 - x)]!
    }
  }
  return { w: s.w, h: s.h, px }
}

/** Split a wide grid into equal frames of `frameW` pixels, left to right. */
export function frames(sheet: Sprite, frameW: number): Sprite[] {
  if (sheet.w % frameW !== 0) {
    throw new Error(`frames: sheet width ${sheet.w} not divisible by ${frameW}`)
  }
  const out: Sprite[] = []
  for (let f = 0; f < sheet.w / frameW; f++) {
    const px = new Uint8Array(frameW * sheet.h)
    for (let y = 0; y < sheet.h; y++) {
      for (let x = 0; x < frameW; x++) {
        px[y * frameW + x] = sheet.px[y * sheet.w + f * frameW + x]!
      }
    }
    out.push({ w: frameW, h: sheet.h, px })
  }
  return out
}
