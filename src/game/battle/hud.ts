/**
 * Battle HUD: layout constants and pure drawing for the Gen-2 stage —
 * platforms, info panels, animated HP/EXP bars, message box, command
 * and move menus. Every function is a pure render of values the scene
 * owns; nothing here mutates battle state. Coordinates are fixed for
 * the 160x144 screen: foe on the top-right platform (baseline y=48),
 * player bottom-left (baseline y=96), message frame in the bottom 48px.
 */
import type { FrameBuffer, Sprite } from '../../engine'
import { UI_ART } from '../assets'
import { PAL_BATTLE_BG, PAL_HP, PAL_UI } from '../assets/palettes'
import type { Kindra, StatusId } from '../types'
import { drawFrame, drawText } from '../ui/widgets'

// ── Stage geometry ──────────────────────────────────────────────────────────
export const FOE_CX = 124
export const FOE_BASE = 48
export const PLAYER_CX = 40
export const PLAYER_BASE = 96
/** Inner pixel width of an HP bar (Gen 2's classic 48). */
export const HP_BAR_PX = 48
/** Pixel width of the EXP bar. */
export const EXP_BAR_PX = 64

export const STATUS_ABBREV: Record<StatusId, string> = {
  psn: 'PSN',
  brn: 'BRN',
  par: 'PAR',
  slp: 'SLP',
  frz: 'FRZ',
}

/** A Kindra speaks under its nickname when it has one. */
export function displayName(k: Kindra): string {
  return k.nickname ?? k.species
}

export function padNum(n: number, width: number): string {
  return String(n).padStart(width, ' ')
}

// ── Text plumbing ───────────────────────────────────────────────────────────

/** Replace every {VAR} with its value; unknown vars stay visible (a loud bug). */
export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{([A-Z0-9_]+)\}/g, (whole, key: string) => vars[key] ?? whole)
}

/**
 * Word-wrap to 18-char lines and group into 2-line boxes, honouring
 * explicit '\n' breaks (story-authored boxes pass through unchanged).
 */
export function wrapBoxes(text: string): string[][] {
  const lines: string[] = []
  for (const seg of text.split('\n')) {
    const words = seg.split(' ').filter((w) => w.length > 0)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let cur = ''
    for (let word of words) {
      while (word.length > 18) {
        if (cur.length > 0) {
          lines.push(cur)
          cur = ''
        }
        lines.push(word.slice(0, 18))
        word = word.slice(18)
      }
      if (cur.length === 0) cur = word
      else if (cur.length + 1 + word.length <= 18) cur += ` ${word}`
      else {
        lines.push(cur)
        cur = word
      }
    }
    if (cur.length > 0) lines.push(cur)
  }
  const boxes: string[][] = []
  for (let i = 0; i < lines.length; i += 2) boxes.push(lines.slice(i, i + 2))
  return boxes.length > 0 ? boxes : [['']]
}

// ── Sprites ─────────────────────────────────────────────────────────────────

/**
 * The top `visibleRows` rows of a sprite — the faint animation sinks a
 * battler through its platform by shrinking this while sliding down.
 */
export function cropBottom(spr: Sprite, visibleRows: number): Sprite | null {
  const rows = Math.max(0, Math.min(spr.h, visibleRows))
  if (rows === 0) return null
  if (rows === spr.h) return spr
  return { w: spr.w, h: rows, px: spr.px.subarray(0, spr.w * rows) }
}

/** Filled ellipse in PAL_BATTLE_BG midtones — the battler platforms. */
export function drawPlatform(fb: FrameBuffer, cx: number, cy: number, rx: number, ry: number): void {
  for (let dy = -ry; dy < ry; dy++) {
    const t = (dy + 0.5) / ry
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - t * t)))
    if (half <= 0) continue
    fb.fillRect(cx - half, cy + dy, half * 2, 1, PAL_BATTLE_BG, dy >= ry - 2 ? 2 : 1)
  }
}

// ── Bars ────────────────────────────────────────────────────────────────────

/** Slim bordered HP bar; colour turns yellow under 50%, red under 20%. */
export function drawHpBar(fb: FrameBuffer, x: number, y: number, shownHp: number, maxHp: number): void {
  fb.fillRect(x, y, HP_BAR_PX + 4, 6, PAL_UI, 3)
  fb.fillRect(x + 1, y + 1, HP_BAR_PX + 2, 4, PAL_UI, 0)
  const ratio = maxHp > 0 ? shownHp / maxHp : 0
  if (shownHp <= 0) return
  const px = Math.max(1, Math.min(HP_BAR_PX, Math.round(HP_BAR_PX * ratio)))
  fb.fillRect(x + 2, y + 2, px, 2, PAL_HP, ratio > 0.5 ? 1 : ratio > 0.2 ? 2 : 3)
}

/** Thin EXP bar that fills right-to-left, the Gen 2 way. */
export function drawExpBar(fb: FrameBuffer, x: number, y: number, frac: number): void {
  fb.fillRect(x, y, EXP_BAR_PX, 2, PAL_UI, 1)
  const w = Math.floor(Math.max(0, Math.min(1, frac)) * EXP_BAR_PX)
  if (w > 0) fb.fillRect(x + EXP_BAR_PX - w, y, w, 2, PAL_UI, 3)
}

// ── Info panels ─────────────────────────────────────────────────────────────

/** Foe panel, top-left: name, level, status, HP bar — never numbers. */
export function drawFoePanel(
  fb: FrameBuffer,
  name: string,
  level: number,
  status: StatusId | null,
  shownHp: number,
  maxHp: number,
): void {
  drawText(fb, name, 8, 8)
  drawText(fb, `Lv${level}`, 16, 18)
  if (status) drawText(fb, STATUS_ABBREV[status], 60, 18)
  drawHpBar(fb, 16, 28, shownHp, maxHp)
  fb.fillRect(8, 36, 68, 1, PAL_UI, 3)
}

/** Player panel, bottom-right: name, level, status, HP bar + numbers, EXP. */
export function drawPlayerPanel(
  fb: FrameBuffer,
  name: string,
  level: number,
  status: StatusId | null,
  shownHp: number,
  maxHp: number,
  expFrac: number,
): void {
  drawText(fb, name, 152 - name.length * 8, 56)
  if (status) drawText(fb, STATUS_ABBREV[status], 72, 66)
  const lv = `Lv${level}`
  drawText(fb, lv, 152 - lv.length * 8, 66)
  drawHpBar(fb, 100, 76, shownHp, maxHp)
  const hp = `${padNum(Math.max(0, Math.round(shownHp)), 3)}/${padNum(maxHp, 3)}`
  drawText(fb, hp, 152 - hp.length * 8, 84)
  drawExpBar(fb, 88, 93, expFrac)
}

// ── Message box ─────────────────────────────────────────────────────────────

/** The bottom 48px frame with a partially revealed two-line message. */
export function drawMessage(
  fb: FrameBuffer,
  lines: readonly string[],
  shownChars: number,
  waiting: boolean,
  frames: number,
): void {
  drawFrame(fb, 0, 12, 20, 6)
  const l0 = lines[0] ?? ''
  const l1 = lines[1] ?? ''
  if (shownChars > 0) drawText(fb, l0.slice(0, Math.min(shownChars, l0.length)), 8, 104)
  if (shownChars > l0.length) drawText(fb, l1.slice(0, shownChars - l0.length), 8, 120)
  if (waiting && ((frames >> 4) & 1) === 0) fb.blit(UI_ART.arrowMore, PAL_UI, 144, 128)
}

// ── Menus ───────────────────────────────────────────────────────────────────

const COMMAND_CELLS: readonly [string, number, number][] = [
  ['FIGHT', 64, 106],
  ['BAG', 120, 106],
  ['KINDRA', 64, 122],
  ['RUN', 120, 122],
]

/** The 2x2 command grid over the right side of the message box. */
export function drawCommandMenu(fb: FrameBuffer, index: number): void {
  drawFrame(fb, 6, 12, 14, 6)
  for (let i = 0; i < COMMAND_CELLS.length; i++) {
    const [label, x, y] = COMMAND_CELLS[i]!
    drawText(fb, label, x, y)
    if (i === index) fb.blit(UI_ART.cursor, PAL_UI, x - 8, y)
  }
}

export interface MoveEntry {
  name: string
  /** Uppercase elemental type of the move. */
  type: string
  pp: number
  ppMax: number
}

/**
 * Move list in the bottom frame plus the hovered move's type/PP readout
 * where the player panel sits (12-char names rule out two columns at
 * 160px, so the list is vertical like the originals).
 */
export function drawFightMenu(fb: FrameBuffer, moves: readonly MoveEntry[], index: number): void {
  drawFrame(fb, 5, 12, 15, 6)
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i]!
    drawText(fb, m.name, 56, 104 + i * 8)
    if (i === index) fb.blit(UI_ART.cursor, PAL_UI, 48, 104 + i * 8)
  }
  const sel = moves[index]
  if (!sel) return
  drawFrame(fb, 9, 7, 11, 5)
  drawText(fb, sel.type, 80, 66)
  drawText(fb, `PP ${padNum(sel.pp, 2)}/${padNum(sel.ppMax, 2)}`, 80, 76)
}
