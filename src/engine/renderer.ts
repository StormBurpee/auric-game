/**
 * A software framebuffer at the one true resolution: 160x144.
 *
 * Everything the player ever sees passes through `blit` and `fillRect`
 * as palette indices, exactly like pushing tiles through a PPU. The
 * buffer presents to a 160x144 canvas; scaling to the visible screen is
 * the shell's problem (CSS `image-rendering: pixelated`), which keeps
 * every pixel honest.
 */
import type { DayPeriod, Palette } from './palettes'
import { tintRgb } from './palettes'
import type { Sprite } from './sprites'

/**
 * The pure core of the spotlight (exported for node tests, which have
 * no ImageData): darken a packed-ABGR buffer outside a light circle.
 * Integer distance-squared compares only — one pass, no sqrt.
 */
export function applySpotlight(
  px32: Uint32Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  rLit: number,
  rDim: number,
): void {
  const lit2 = rLit * rLit
  const dim2 = rDim * rDim
  for (let y = 0; y < h; y++) {
    const dy2 = (y - cy) * (y - cy)
    const row = y * w
    for (let x = 0; x < w; x++) {
      const d2 = (x - cx) * (x - cx) + dy2
      if (d2 <= lit2) continue
      const c = px32[row + x]!
      if (d2 <= dim2) {
        // Half-bright: shift each channel right one bit, keep alpha.
        px32[row + x] = (0xff << 24) | ((c >>> 1) & 0x7f7f7f)
      } else {
        // Near-black with a whisper of blue so shapes still breathe.
        px32[row + x] = (0xff << 24) | 0x100804
      }
    }
  }
}

export const SCREEN_W = 160
export const SCREEN_H = 144

export interface BlitOpts {
  flipX?: boolean
  /** Treat palette index 0 as opaque colour instead of transparency (background tiles). */
  opaqueZero?: boolean
}

export class FrameBuffer {
  private readonly image: ImageData
  private readonly px32: Uint32Array

  /** 0 = scene fully visible … 1 = fully black. Applied at present time. */
  fade = 0
  /** 0 = no flash … 1 = pure white. Applied after fade (encounter flashes). */
  flash = 0

  private period: DayPeriod = 'day'
  private resolved = new Map<Palette, Uint32Array>()

  constructor() {
    this.image = new ImageData(SCREEN_W, SCREEN_H)
    this.px32 = new Uint32Array(this.image.data.buffer)
  }

  /** Change the time-of-day cast; palette caches rebuild lazily. */
  setPeriod(period: DayPeriod): void {
    if (period === this.period) return
    this.period = period
    this.resolved.clear()
  }

  getPeriod(): DayPeriod {
    return this.period
  }

  /** Palette → four packed ABGR words, tinted for the current period unless fixed. */
  private resolve(palette: Palette): Uint32Array {
    let cached = this.resolved.get(palette)
    if (!cached) {
      cached = new Uint32Array(4)
      for (let i = 0; i < 4; i++) {
        const [r, g, b] = palette.fixed ? palette.colors[i]! : tintRgb(palette.colors[i]!, this.period)
        cached[i] = (0xff << 24) | (b << 16) | (g << 8) | r
      }
      this.resolved.set(palette, cached)
    }
    return cached
  }

  clear(palette: Palette, index = 0): void {
    this.px32.fill(this.resolve(palette)[index]!)
  }

  fillRect(x: number, y: number, w: number, h: number, palette: Palette, index: number): void {
    const colour = this.resolve(palette)[index]!
    const x0 = Math.max(0, x)
    const y0 = Math.max(0, y)
    const x1 = Math.min(SCREEN_W, x + w)
    const y1 = Math.min(SCREEN_H, y + h)
    for (let yy = y0; yy < y1; yy++) {
      this.px32.fill(colour, yy * SCREEN_W + x0, yy * SCREEN_W + x1)
    }
  }

  blit(spr: Sprite, palette: Palette, x: number, y: number, opts?: BlitOpts): void {
    const colours = this.resolve(palette)
    const flip = opts?.flipX === true
    const opaqueZero = opts?.opaqueZero === true
    const x0 = Math.max(0, x)
    const y0 = Math.max(0, y)
    const x1 = Math.min(SCREEN_W, x + spr.w)
    const y1 = Math.min(SCREEN_H, y + spr.h)
    for (let yy = y0; yy < y1; yy++) {
      const sy = yy - y
      const rowOut = yy * SCREEN_W
      const rowIn = sy * spr.w
      for (let xx = x0; xx < x1; xx++) {
        const sx = flip ? spr.w - 1 - (xx - x) : xx - x
        const idx = spr.px[rowIn + sx]!
        if (idx === 0 && !opaqueZero) continue
        this.px32[rowOut + xx] = colours[idx]!
      }
    }
  }

  /**
   * Darken everything outside a circle of light: full colour within
   * `rLit`, half-bright within `rDim`, near-black beyond. Immediate —
   * call after the world layers so translucent scenes drawn above
   * (dialog boxes in a dark tower) stay readable.
   */
  spotlight(cx: number, cy: number, rLit: number, rDim: number): void {
    applySpotlight(this.px32, SCREEN_W, SCREEN_H, cx, cy, rLit, rDim)
  }

  /** Push the frame to the visible canvas, applying fade/flash post-effects. */
  present(ctx: CanvasRenderingContext2D): void {
    if (this.fade > 0 || this.flash > 0) {
      const data = this.image.data
      const keep = 1 - Math.min(1, this.fade)
      const flash = Math.min(1, this.flash)
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i]! * keep
        let g = data[i + 1]! * keep
        let b = data[i + 2]! * keep
        if (flash > 0) {
          r += (255 - r) * flash
          g += (255 - g) * flash
          b += (255 - b) * flash
        }
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
      }
    }
    ctx.putImageData(this.image, 0, 0)
  }
}
