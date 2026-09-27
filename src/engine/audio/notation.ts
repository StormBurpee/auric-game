/**
 * Songs are written the way musicians talk:
 *
 *   notes('E5 q | G5 e A5 e B5 h | r q C6 q.')
 *
 * Pitch + duration letters (w/h/q/e/s, dot = half again), `r` for rests,
 * bars (`|`) purely cosmetic. Drums get a one-character-per-sixteenth
 * pattern language: `k.h. s.h. k.h. s.h.` — kick, hat, snare. Both
 * compile to step-indexed events the sequencer schedules verbatim.
 */
import type { DrumKind } from './apu'

export interface NoteEvent {
  /** Offset from song start, in sixteenth-note steps. */
  step: number
  midi: number
  /** Length in steps. */
  len: number
}

export interface DrumEvent {
  step: number
  kind: DrumKind
}

const NOTE_OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const DURATIONS: Record<string, number> = { w: 16, h: 8, q: 4, e: 2, s: 1 }

/** 'F#3' / 'Bb5' / 'C4' → MIDI number (C4 = 60). */
export function midiOf(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name)
  if (!m) throw new Error(`midiOf: bad note '${name}'`)
  const base = NOTE_OFFSETS[m[1]!]!
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  const octave = parseInt(m[3]!, 10)
  return 12 * (octave + 1) + base + acc
}

export function freqOf(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Parse a melody string into events. Tokens are `<pitch> <dur>` pairs
 * (`E5 q`), rests are `r <dur>`, `|` is ignored. A dotted duration
 * (`q.`) lasts half again as long.
 */
export function notes(score: string): NoteEvent[] {
  const tokens = score.split(/\s+/).filter((t) => t.length > 0 && t !== '|')
  const out: NoteEvent[] = []
  let step = 0
  let pendingPitch: string | null = null
  for (const tok of tokens) {
    if (pendingPitch === null) {
      pendingPitch = tok
      continue
    }
    const dotted = tok.endsWith('.')
    const durKey = dotted ? tok.slice(0, -1) : tok
    const base = DURATIONS[durKey]
    if (base === undefined) throw new Error(`notes: bad duration '${tok}' after '${pendingPitch}'`)
    const len = dotted ? Math.round(base * 1.5) : base
    if (pendingPitch !== 'r') {
      out.push({ step, midi: midiOf(pendingPitch), len })
    }
    step += len
    pendingPitch = null
  }
  if (pendingPitch !== null) throw new Error(`notes: dangling token '${pendingPitch}'`)
  return out
}

/** Total length in steps of a parsed melody (end of its last event/rest isn't tracked — use explicit song length). */
export function lastStep(events: NoteEvent[]): number {
  return events.reduce((m, e) => Math.max(m, e.step + e.len), 0)
}

const DRUM_CHARS: Record<string, DrumKind> = { k: 'kick', s: 'snare', h: 'hat', c: 'crash' }

/** One char per sixteenth: k/s/h/c hit, `.` rest. Whitespace and `|` ignored. */
export function drums(pattern: string): DrumEvent[] {
  const chars = pattern.replace(/[\s|]/g, '')
  const out: DrumEvent[] = []
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!
    if (ch === '.') continue
    const kind = DRUM_CHARS[ch]
    if (!kind) throw new Error(`drums: bad char '${ch}' at step ${i}`)
    out.push({ step: i, kind })
  }
  return out
}
