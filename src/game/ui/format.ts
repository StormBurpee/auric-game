/**
 * Text shaping shared by every widget: {VAR} interpolation, the
 * 18-char/2-line word wrap the dialog box enforces, and the little
 * display-name helpers menus repeat everywhere. Pure string logic —
 * nothing here touches the framebuffer.
 */
import type { Game } from '../game'
import { isEgg } from '../kindra'
import type { Kindra, Species } from '../types'

/** A text-box line is at most 18 glyphs; a box holds two lines. */
export const LINE_CHARS = 18
export const BOX_LINES = 2

/**
 * Replace {PLAYER}/{RIVAL} and caller vars in display text. Caller vars
 * win over the built-ins; unknown tokens stay visible (a loud bug beats
 * a silent blank).
 */
export function interpolate(game: Game, text: string, vars?: Record<string, string>): string {
  return text.replace(/\{([A-Z0-9_]+)\}/g, (token, key: string) => {
    const fromVars = vars?.[key]
    if (fromVars !== undefined) return fromVars
    if (key === 'PLAYER') return game.state.playerName
    if (key === 'RIVAL') return 'CORVIN'
    return token
  })
}

/**
 * Word-wrap to `width` glyphs, splitting on spaces and honouring
 * explicit newlines. Words longer than a whole line are hard-split so a
 * pathological string can never push glyphs through the frame.
 */
export function wrapText(text: string, width = LINE_CHARS): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(' ').filter((w) => w.length > 0)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (let word of words) {
      while (word.length > width) {
        if (line.length > 0) {
          lines.push(line)
          line = ''
        }
        lines.push(word.slice(0, width))
        word = word.slice(width)
      }
      if (line.length === 0) line = word
      else if (line.length + 1 + word.length <= width) line += ' ' + word
      else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  return lines
}

/** Chunk wrapped lines into text-box pages of `per` lines. */
export function paginate(lines: string[], per = BOX_LINES): string[][] {
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += per) pages.push(lines.slice(i, i + per))
  return pages
}

/** Right-align a number in `width` glyph cells (the GB column trick). */
export function padNum(n: number, width: number): string {
  return String(n).padStart(width, ' ')
}

/** Nickname when given, else the species key (which IS the name). Eggs are veiled everywhere: 'EGG'. */
export function kindraName(k: Kindra): string {
  if (isEgg(k)) return 'EGG'
  return k.nickname ?? k.species
}

/**
 * The veiled summary line for an egg, banded by remaining steps — the
 * four Gen-2 tells. Returns a sys.egg.* strings key.
 */
export function eggTellKey(k: Kindra): string {
  const steps = k.egg ?? 0
  if (steps > 1280) return 'sys.egg.far'
  if (steps > 640) return 'sys.egg.near'
  if (steps > 256) return 'sys.egg.soon'
  return 'sys.egg.now'
}

/** Three-letter condition badge; fainted outranks everything. */
export function statusLabel(k: Kindra): string {
  if (k.hp <= 0) return 'FNT'
  switch (k.status) {
    case 'psn': return 'PSN'
    case 'brn': return 'BRN'
    case 'par': return 'PAR'
    case 'slp': return 'SLP'
    case 'frz': return 'FRZ'
    default: return ''
  }
}

/** 'FIRE' or 'FIRE/FLYING' — uppercased for the 8x8 caps. */
export function typeLabel(sp: Species): string {
  const t1 = sp.type1.toUpperCase()
  return sp.type2 ? `${t1}/${sp.type2.toUpperCase()}` : t1
}
