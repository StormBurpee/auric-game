/**
 * Immediate-mode drawing primitives: font blitting, the classic
 * 9-sliced text frame, and HP bars. Frame coordinates are 8px cells
 * (the screen is 20x18 of them); text coordinates are raw pixels so
 * widgets can align off-grid where the GB would have allowed it.
 */
import type { FrameBuffer, Palette } from '../../engine'
import { UI_ART } from '../assets'
import { FONT, FONT_H, FONT_W } from '../assets/font'
import { PAL_HP, PAL_UI } from '../assets/palettes'

export const CELL = 8

/** Draw text with the 8x8 font. Index-3 ink of `pal` (default PAL_UI). */
export function drawText(fb: FrameBuffer, text: string, x: number, y: number, pal: Palette = PAL_UI): void {
  let cx = x
  let cy = y
  for (const ch of text) {
    if (ch === '\n') {
      cx = x
      cy += FONT_H
      continue
    }
    const glyph = FONT[ch] ?? FONT['?']
    if (glyph) fb.blit(glyph, pal, cx, cy)
    cx += FONT_W
  }
}

/** Right-aligned text: the LAST glyph ends just before `xRight`. */
export function drawTextRight(fb: FrameBuffer, text: string, xRight: number, y: number, pal?: Palette): void {
  drawText(fb, text, xRight - text.length * FONT_W, y, pal)
}

/** Centered text: the run straddles `cx` (page titles, footers). */
export function drawTextCenter(fb: FrameBuffer, text: string, cx: number, y: number, pal?: Palette): void {
  drawText(fb, text, cx - Math.floor((text.length * FONT_W) / 2), y, pal)
}

/**
 * The classic bordered box; x/y/w/h in 8px cells. The interior is
 * filled with PAL_UI white first because the border sprites are index-3
 * lines over transparent 0.
 */
export function drawFrame(fb: FrameBuffer, x: number, y: number, w: number, h: number): void {
  const px = x * CELL
  const py = y * CELL
  fb.fillRect(px, py, w * CELL, h * CELL, PAL_UI, 0)
  const f = UI_ART.frame
  for (let i = 1; i < w - 1; i++) {
    fb.blit(f.t, PAL_UI, px + i * CELL, py)
    fb.blit(f.b, PAL_UI, px + i * CELL, py + (h - 1) * CELL)
  }
  for (let j = 1; j < h - 1; j++) {
    fb.blit(f.l, PAL_UI, px, py + j * CELL)
    fb.blit(f.r, PAL_UI, px + (w - 1) * CELL, py + j * CELL)
  }
  fb.blit(f.tl, PAL_UI, px, py)
  fb.blit(f.tr, PAL_UI, px + (w - 1) * CELL, py)
  fb.blit(f.bl, PAL_UI, px, py + (h - 1) * CELL)
  fb.blit(f.br, PAL_UI, px + (w - 1) * CELL, py + (h - 1) * CELL)
}

/**
 * An HP bar `widthPx` wide and 4px tall: 1px ink casing around a 2px
 * inner bar. Green above half, amber above a fifth, red below — and
 * never 0px wide while a single hit point remains.
 */
export function drawHpBar(fb: FrameBuffer, x: number, y: number, widthPx: number, cur: number, max: number): void {
  const safeMax = Math.max(1, max)
  const hp = Math.min(Math.max(0, cur), safeMax)
  fb.fillRect(x, y, widthPx, 4, PAL_UI, 3)
  const inner = widthPx - 2
  fb.fillRect(x + 1, y + 1, inner, 2, PAL_HP, 0)
  if (hp <= 0) return
  const fill = Math.max(1, Math.floor((inner * hp) / safeMax))
  const index = hp * 2 > safeMax ? 1 : hp * 5 > safeMax ? 2 : 3
  fb.fillRect(x + 1, y + 1, fill, 2, PAL_HP, index)
}
