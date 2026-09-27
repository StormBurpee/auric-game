/**
 * The AURIC soundtrack — docs/AUDIO.md §2, transcribed bar by bar.
 *
 * Conventions of the transcription (constraints, not choices):
 * - One sixteenth = one step; a 4/4 bar is 16 steps, 3/4 and 6/8 bars are
 *   12 (durations are absolute note values, per §1.2).
 * - The engine allows one duty/volume per channel per song, so parts the
 *   spec splits mid-track (title's ECHO→harmony PULSE B) take a single
 *   compromise voice; the notes themselves follow the spec exactly.
 * - Spec drum letters map onto the engine kit: K→kick, S→snare, H/O→hat,
 *   C/R→crash (the only long noise wash available).
 * - The §3 NIGHT RULE is a playback-time transform; the data here is the
 *   §2 daytime truth.
 * - v0–15 envelope volumes map to engine gain at ≈ v/24 (lead v12 ≈ 0.5).
 */
import { drums, notes } from '../../engine'
import type { NoteEvent, Song } from '../../engine'

// ── Part builders (each encodes one figure the spec defines by formula) ─────

const shift = (events: NoteEvent[], by: number): NoteEvent[] =>
  events.map((e) => ({ ...e, step: e.step + by }))

/**
 * §1.4 ECHO: replay a lead delayed one eighth (2 steps). Each echo note is
 * clipped at the next one (the channel stays monophonic) and at `until`
 * (so it ends inside the song / before a part change).
 */
function echo(lead: NoteEvent[], until: number, transpose = 0): NoteEvent[] {
  const src = lead.filter((e) => e.step + 2 < until)
  return src.flatMap((e, i) => {
    const step = e.step + 2
    const next = src[i + 1]
    const len = Math.min(e.len, (next ? next.step + 2 : until) - step)
    return len > 0 ? [{ step, midi: e.midi + transpose, len }] : []
  })
}

/** §2.2 music-box accompaniment: six eighths, broken chord up-and-back. */
const broken = (r4: string, t4: string, f4: string, r5: string): string =>
  `${r4} e ${t4} e ${f4} e ${r5} e ${f4} e ${t4} e`

/** §2.3 bass bounce P(x) = x q  x+oct e  x e  fifth(x) q  x q. */
const bounce = (x: string, oct: string, fifth: string): string =>
  `${x} q ${oct} e ${x} e ${fifth} q ${x} q`

/** §2.4 lilting offbeats: r e  3rd e  5th e, twice per 6/8 bar. */
const lilt = (third: string, fifth: string): string =>
  `r e ${third} e ${fifth} e `.repeat(2)

/** §2.6 pump bass: root/octave eighth alternation, 8 eighths per bar. */
const pump = (x: string, oct: string): string => `${x} e ${oct} e `.repeat(4)

/** §2.6 A-section ostinato: driving eighths alternating chord root and 5th. */
const drive = (root: string, fifth: string): string =>
  `${root} e ${fifth} e `.repeat(4)

/** §2.7 offbeat eighth stabs on the chord 3rd. */
const stab = (third: string): string => `r e ${third} e `.repeat(4)

/** §2.7 stab bass S(x): slots 1:x 2:r 3:x 4:x 5:r 6:x 7:x 8:x+oct. */
const stabBass = (x: string, oct: string): string =>
  `${x} e r e ${x} e ${x} e r e ${x} e ${x} e ${oct} e`

/** §2.10 shimmer: R5-3-5-R6 sixteenths, repeated every beat of the bar. */
const shimmer = (a: string, b: string, c: string, d: string): string =>
  `${a} s ${b} s ${c} s ${d} s `.repeat(4)

// ── 2.1 title — "Gold Light Through Clouds" ─────────────────────────────────

const TITLE_LEAD = notes(`
  G4 q  C5 q  E5 h               | D5 q. E5 e  D5 q  B4 q          |
  C5 q  E5 q  A5 h               | G5 q. F5 e  E5 q  F5 q          |
  G5 h  E5 q  C5 q               | A5 q  G5 e  F5 e  E5 q  F5 q    |
  D5 q  F5 q  A5 q  G5 e  F5 e   | G5 h. r q                       |
  E5 q  C5 q  A4 q  B4 e  C5 e   | D5 q. C5 e  A4 h                |
  G4 q  C5 q  D5 q  E5 q         | D5 h  B4 q  G4 q                |
  C5 q  Eb5 q  Ab5 h             | G5 q. F5 e  D5 q  F5 q          |
  E5 q  G5 q  C6 h               | D5 q  C5 q  D5 h                |
`)

const title: Song = {
  bpm: 96,
  length: 256,
  loopTo: 0,
  pulse1: { duty: 0.5, vol: 0.5, notes: TITLE_LEAD },
  // Spec wants ECHO (duty 12.5, 35% of lead) for bars 1–8 and harmony
  // (duty 25, v8) for 9–16; one voice config per track, so both halves
  // share duty 25 at a volume between the two.
  pulse2: {
    duty: 0.25,
    vol: 0.26,
    notes: [
      ...echo(TITLE_LEAD, 128),
      ...shift(
        notes(`
          C5 q  A4 q  E4 q  G4 e  A4 e | A4 q. A4 e  F4 h        |
          E4 q  G4 q  B4 q  C5 q       | B4 h  G4 q  D4 q        |
          Ab4 q  C5 q  Eb5 h           | D5 q. D5 e  Bb4 q  D5 q |
          C5 q  E5 q  G5 h             | C5 q  G4 q  B4 h        |
        `),
        128,
      ),
    ],
  },
  wave: {
    vol: 0.45,
    notes: notes(`
      C3 h C3 h | B2 h B2 h | A2 h A2 h | F2 h F2 h |
      C3 h C3 h | F2 h F2 h | D3 h D3 h | G2 h G2 h |
      A2 h A2 h | F2 h F2 h | E2 h E2 h | G2 h G2 h |
      Ab2 h Ab2 h | Bb2 h Bb2 h | C3 h C3 h | G2 h G2 q B2 q
    `),
  },
  noise: drums(
    [
      '.'.repeat(128), //               bars 1–8 silent
      'k.......s.......'.repeat(7), //  bars 9–15: kick 1, soft snare 3
      'k.......s...ssss', //            bar 16: sixteenth-snare swell
    ].join(''),
  ),
}

// ── 2.2 dawnfern — "Dawnfern Village" (music box, 3/4) ──────────────────────

const DAWN_F = broken('F4', 'A4', 'C5', 'F5')
const DAWN_DM = broken('D4', 'F4', 'A4', 'D5')
const DAWN_BB = broken('Bb4', 'D5', 'F5', 'Bb5')
const DAWN_C = broken('C4', 'E4', 'G4', 'C5')
const DAWN_GM = broken('G4', 'Bb4', 'D5', 'G5')

const dawnfern: Song = {
  bpm: 80,
  length: 192,
  loopTo: 0,
  pulse1: {
    duty: 0.125,
    vol: 0.42,
    notes: notes(`
      A5 h  C6 q          | A5 q. G5 e  F5 q    | G5 h  D5 q          | E5 h.            |
      F5 q  A5 q  C6 q    | D6 q. C6 e  A5 q    | Bb5 q  A5 q  G5 q   | G5 h.            |
      F5 q  Bb5 q  D6 q   | C6 h  A5 q          | Bb5 q. A5 e  G5 q   | G5 q  E5 q  C5 q |
      F5 q  G5 q  A5 q    | Bb5 q. C6 e  D6 q   | A5 q  F5 q  E5 q    | F5 h.            |
    `),
  },
  pulse2: {
    duty: 0.125,
    vol: 0.22,
    notes: notes(
      [
        DAWN_F, DAWN_DM, DAWN_BB, DAWN_C, DAWN_F, DAWN_DM, DAWN_GM, DAWN_C,
        DAWN_BB, DAWN_F, DAWN_GM, DAWN_C, DAWN_F, DAWN_BB,
        'F4 e A4 e C5 e F5 e G4 e E4 e', // bar 15: I64 beats 1–2, V7 beat 3
        'F4 h.',
      ].join(' | '),
    ),
  },
  wave: {
    vol: 0.25,
    notes: notes(`
      F3 h. | D3 h. | Bb2 h. | C3 h. | F3 h. | D3 h. | G3 h. | C3 h. |
      Bb2 h. | A2 h. | G3 h. | C3 h. | F3 h. | Bb2 h. | C3 h. | F3 h.
    `),
  },
}

// ── 2.3 trail — "Trail 1" ───────────────────────────────────────────────────

const TRAIL_PG = bounce('G2', 'G3', 'D3')
const TRAIL_PC = bounce('C3', 'C4', 'G3')
const TRAIL_PD = bounce('D3', 'D4', 'A3')
const TRAIL_PE = bounce('E2', 'E3', 'B2')
const TRAIL_PA = bounce('A2', 'A3', 'E3')
const TRAIL_BAR = 'k...h.h.s...h...'
const TRAIL_FILL = 'k...h...s...ssss'

const trail: Song = {
  bpm: 116,
  length: 256,
  loopTo: 0,
  pulse1: {
    duty: 0.5,
    vol: 0.5,
    notes: notes(`
      G5 q. E5 e  D5 e  B4 e  D5 q             | C5 e  E5 e  G5 q. A5 e  G5 q          |
      B5 e  G5 e  D5 q. E5 e  D5 e  B4 e       | A4 e  B4 e  C5 e  D5 e  F#5 q  A5 q   |
      G5 q. E5 e  D5 e  B4 e  D5 q             | C5 e  E5 e  G5 q. A5 e  B5 q          |
      C6 e  B5 e  A5 q  F#5 e  D5 e  A5 q      | G5 h  r e  D5 e  E5 e  F#5 e          |
      G5 q  E5 q  B4 q. E5 e                   | G5 e  A5 e  G5 q  E5 q  C5 q          |
      D5 q. G5 e  B5 q  A5 e  G5 e             | A5 q. G5 e  F#5 e  E5 e  A5 q         |
      E5 e  G5 e  A5 q. G5 e  E5 q             | F#5 e  A5 e  D6 q. C6 e  A5 q         |
      B5 q  G5 e  E5 e  D5 q  E5 e  D5 e       | C5 q  D5 q  D5 e  E5 e  F#5 e  A5 e   |
    `),
  },
  // Diatonic 3rd below, same rhythm; bars 4 and 12 sustain the chord 5th
  // as a whole-note pad, per spec.
  pulse2: {
    duty: 0.25,
    vol: 0.3,
    notes: notes(`
      E5 q. C5 e  B4 e  G4 e  B4 q             | A4 e  C5 e  E5 q. F#5 e  E5 q         |
      G5 e  E5 e  B4 q. C5 e  B4 e  G4 e       | A4 w                                  |
      E5 q. C5 e  B4 e  G4 e  B4 q             | A4 e  C5 e  E5 q. F#5 e  G5 q         |
      A5 e  G5 e  F#5 q  D5 e  C5 e  F#5 q     | D5 h  r e  B4 e  C5 e  D5 e           |
      E5 q  B4 q  G4 q. B4 e                   | E5 e  F#5 e  E5 q  C5 q  G4 q         |
      B4 q. D5 e  G5 q  F#5 e  D5 e            | E4 w                                  |
      C5 e  E5 e  F#5 q. E5 e  C5 q            | D5 e  F#5 e  A5 q. A5 e  F#5 q        |
      G5 q  E5 e  C5 e  B4 q  C5 e  B4 e       | A4 q  B4 q  A4 e  C5 e  D5 e  F#5 e   |
    `),
  },
  wave: {
    vol: 0.45,
    notes: notes(
      [
        TRAIL_PG, TRAIL_PC, TRAIL_PG, TRAIL_PD, TRAIL_PG, TRAIL_PC, TRAIL_PD,
        'G2 q G2 q A2 q B2 q', // bar 8: walk to C
        TRAIL_PE, TRAIL_PC, TRAIL_PG, TRAIL_PA, TRAIL_PC, TRAIL_PD,
        'G2 q G2 q E2 q E2 q',
        'C3 q C3 q D3 q D3 q',
      ].join(' | '),
    ),
  },
  noise: drums(
    [TRAIL_BAR.repeat(7), TRAIL_FILL, TRAIL_BAR.repeat(7), TRAIL_FILL].join(''),
  ),
}

// ── 2.4 bellmere — "Bellmere Town" (6/8, eighth = 180 ⇒ quarter = 90) ───────

const BELL_D = lilt('F#4', 'A4')
const BELL_G = lilt('B4', 'D5')
const BELL_A = lilt('C#5', 'E5')
const BELL_BM = lilt('D4', 'F#4')
const BELL_EM = lilt('G4', 'B4')
/** Bars 7/15: D/A beats 1–3, A7 beats 4–6 — one pedal-A bar. */
const BELL_PEDAL = 'r e F#4 e A4 e r e C#5 e E5 e'

const bellmere: Song = {
  bpm: 90,
  length: 192,
  loopTo: 0,
  pulse1: {
    duty: 0.25,
    vol: 0.42,
    notes: notes(`
      F#5 q  A5 e  F#5 q  E5 e   | D5 q. G5 q  E5 e             | F#5 q  A5 e  D6 q.       | C#6 e  B5 e  A5 e  E5 q. |
      D5 q  F#5 e  B5 q.         | B5 e  A5 e  G5 e  E5 q  G5 e | F#5 q  D5 e  E5 q.       | D5 h.                    |
      G5 q  A5 e  B5 q  G5 e     | A5 q. F#5 q  D5 e            | E5 q  F#5 e  G5 q  B4 e  | C#5 q  E5 e  A5 q.       |
      B5 q  A5 e  F#5 q  D5 e    | E5 q  G5 e  B5 q.            | A5 q  F#5 e  E5 q  C#5 e | D5 h.                    |
    `),
  },
  pulse2: {
    duty: 0.125,
    vol: 0.22,
    notes: notes(
      [
        BELL_D, BELL_G, BELL_D, BELL_A, BELL_BM, BELL_G, BELL_PEDAL, BELL_D,
        BELL_G, BELL_D, BELL_EM, BELL_A, BELL_BM, BELL_G, BELL_PEDAL, BELL_D,
      ].join(' | '),
    ),
  },
  // Barcarolle rocking: root q., fifth-above q. per bar.
  wave: {
    vol: 0.45,
    notes: notes(`
      D3 q. A3 q. | G2 q. D3 q. | D3 q. A3 q. | A2 q. E3 q. |
      B2 q. F#3 q. | G2 q. D3 q. | A2 q. E3 q. | D3 q. A3 q. |
      G2 q. D3 q. | F#2 q. C#3 q. | E3 q. B3 q. | A2 q. E3 q. |
      B2 q. F#3 q. | G2 q. D3 q. | A2 q. E3 q. | D3 q. A3 q.
    `),
  },
  // Soft brush, bars 9–16 only: K . . H . . on the six eighth slots.
  noise: drums('.'.repeat(96) + 'k.....h.....'.repeat(8)),
}

// ── 2.5 loomspire — "Loomspire City" (bells) ────────────────────────────────

const loomspire: Song = {
  bpm: 96,
  length: 256,
  loopTo: 0,
  pulse1: {
    duty: 0.5,
    vol: 0.42,
    notes: notes(`
      B4 q  E5 q  G5 q  F#5 q  | G5 h  D5 h            | F#5 q  A5 q  F#5 q  E5 q | E5 w               |
      E5 h  G5 q  C6 q         | B5 h  G5 h            | A5 q  G5 q  E5 q  C5 q   | B4 h. D#5 q        |
      E5 q  G5 q  B5 h         | A5 q  F#5 q  D5 h     | G5 q  E5 q  C5 h         | F#5 q  D#5 q  B4 h |
      G5 h  F#5 q  E5 q        | C5 q  E5 q  A5 h      | B5 q  A5 q  F#5 q  D#5 q | E5 w               |
    `),
  },
  // Bell ostinato: chord root in octave 6 on beat 1, chord 5th in octave 5
  // on beat 3; written as half notes so each toll rings ≈1.2s at 96 BPM.
  pulse2: {
    duty: 0.125,
    vol: 0.32,
    notes: notes(`
      E6 h B5 h | G6 h D6 h | D6 h A5 h | E6 h B5 h |
      C6 h G5 h | G6 h D6 h | A5 h E5 h | B5 h F#5 h |
      E6 h B5 h | D6 h A5 h | C6 h G5 h | B5 h F#5 h |
      E6 h B5 h | A5 h E5 h | B5 h F#5 h | E6 h B5 h
    `),
  },
  wave: {
    vol: 0.45,
    notes: notes(`
      E2 h B2 h | G2 h D3 h | D3 h A3 h | E2 h B2 h |
      C3 h G3 h | G2 h D3 h | A2 h E3 h | B2 h F#3 h |
      E2 h B2 h | D3 h A3 h | C3 h G3 h | B2 h F#3 h |
      E2 h B2 h | A2 h E3 h | B2 h F#3 h | E2 h B2 h
    `),
  },
  // One felt-timpani boom per bar; no hats, no snare.
  noise: drums('k...............'.repeat(16)),
}

// ── 2.6 battle_wild — "A Wild KINDRA Appeared!" ─────────────────────────────

const WILD_AM = drive('A4', 'E5')
const WILD_G = drive('G4', 'D5')
const WILD_F = drive('F4', 'C5')
const WILD_E7 = drive('E4', 'B4')
const WILD_DM = drive('D4', 'A4')
const WILD_DRUM_A = 'k.h.s.h.k.h.s.h.'
const WILD_DRUM_B = 'k.h.s.h.k.h.s.s.'
const WILD_DRUM_FILL = 'k.h.s.h.ssssssss'

const battle_wild: Song = {
  bpm: 144,
  length: 384,
  loopTo: 32, // play the 2-bar intro once, then loop bars 3–24
  pulse1: {
    duty: 0.5,
    vol: 0.52,
    notes: notes(`
      E6 s Eb6 s D6 s C#6 s C6 s B5 s Bb5 s A5 s G#5 s G5 s F#5 s F5 s E5 s Eb5 s D5 s C#5 s |
      A4 e  B4 e  C5 e  D5 e  E5 e  F5 e  G#5 e  B5 e                                        |
      A5 e  A5 e  r e  A5 e  C6 q  B5 e  A5 e   | B5 e  B5 e  r e  B5 e  D6 q  B5 q          |
      C6 e  C6 e  r e  A5 e  F5 q  G5 e  A5 e   | G#5 q  E5 e  G#5 e  B5 h                   |
      A5 e  A5 e  r e  A5 e  C6 q  E6 q         | D6 e  D6 e  r e  B5 e  G5 q  B5 q          |
      C6 q  A5 e  F5 e  E5 q  G#5 q             | A5 q  E5 e  A5 e  B5 e  C6 e  B5 e  G#5 e  |
      G5 q  C6 q  E6 h                          | D6 q. B5 e  G5 h                           |
      F5 q  A5 q  C6 h                          | B5 q. A5 e  G5 h                           |
      E6 q  D6 e  C6 e  G5 h                    | A5 q  B5 q  C6 q  E6 q                     |
      F5 q  G5 q  A5 q  C6 q                    | D6 h  B5 q  G5 q                           |
      F5 e  F5 e  r e  F5 e  A5 q  G5 e  F5 e   | E5 e  E5 e  r e  E5 e  C6 q  A5 q          |
      D5 q  F5 e  A5 e  D6 q  C6 e  A5 e        | B5 q  G#5 e  E5 e  B4 h                    |
      A5 e  G5 e  F5 e  E5 e  D5 e  C5 e  D5 e  E5 e | E5 e  G#5 e  B5 e  D6 e  E6 q  B5 e  G#5 e |
    `),
  },
  // Intro doubles the lead an octave down; A sections drive root/5th
  // eighths; B section (bars 11–18) sustains the chord 3rd.
  pulse2: {
    duty: 0.25,
    vol: 0.32,
    notes: notes(
      [
        'E5 s Eb5 s D5 s C#5 s C5 s B4 s Bb4 s A4 s G#4 s G4 s F#4 s F4 s E4 s Eb4 s D4 s C#4 s',
        'A3 e B3 e C4 e D4 e E4 e F4 e G#4 e B4 e',
        WILD_AM, WILD_G, WILD_F, WILD_E7, WILD_AM, WILD_G,
        'F4 e C5 e F4 e C5 e E4 e B4 e E4 e B4 e', // bar 9: F–E7 split
        WILD_AM,
        'E5 w', 'B4 w', 'A4 w', 'B4 w', 'E5 w', 'C5 w', 'A4 w', 'B4 w',
        WILD_DM, WILD_AM, WILD_DM, WILD_E7, WILD_F, WILD_E7,
      ].join(' | '),
    ),
  },
  wave: {
    vol: 0.6,
    notes: notes(
      [
        'r w', //                                       bar 1: tacet under the cascade
        'A2 e A2 e A2 e A2 e A2 e A2 e A2 e A2 e', //   bar 2: straight eighths
        pump('A2', 'A3'), pump('G2', 'G3'), pump('F2', 'F3'), pump('E2', 'E3'),
        pump('A2', 'A3'), pump('G2', 'G3'),
        'F2 e F3 e F2 e F3 e E2 e E3 e E2 e E3 e', //   bar 9: F–E7 split
        pump('A2', 'A3'),
        pump('C3', 'C4'), pump('B2', 'B3'), pump('A2', 'A3'), pump('G2', 'G3'),
        pump('C3', 'C4'), pump('A2', 'A3'), pump('F2', 'F3'), pump('G2', 'G3'),
        pump('D3', 'D4'), pump('A2', 'A3'), pump('D3', 'D4'), pump('E2', 'E3'),
        pump('F2', 'F3'), pump('E2', 'E3'),
      ].join(' | '),
    ),
  },
  noise: drums(
    [
      'ssssssssssssssss', //        bar 1: sixteenth snare roll
      'k...k...k...k.k.', //        bar 2
      WILD_DRUM_A.repeat(7), WILD_DRUM_FILL, //  bars 3–10
      WILD_DRUM_B.repeat(7), WILD_DRUM_FILL, //  bars 11–18
      WILD_DRUM_A.repeat(5), WILD_DRUM_FILL, //  bars 19–24
    ].join(''),
  ),
}

// ── 2.7 battle_trainer — "Rival Eyes" ───────────────────────────────────────

const TRAINER_DRUM = 'k.k.s.h.k.h.s.h.'
const TRAINER_FILL = 'k.k.s.h.ssssssss'

const battle_trainer: Song = {
  bpm: 150,
  length: 384,
  loopTo: 32, // intro once, then loop bars 3–24
  pulse1: {
    duty: 0.75,
    vol: 0.52,
    notes: notes(`
      D5 e  D5 e  r e  D5 e  F5 e  E5 e  D5 e  C#5 e                                          |
      D5 s E5 s F5 s G5 s A5 s Bb5 s A5 s G5 s F5 s G5 s F5 s E5 s D5 s E5 s D5 s C#5 s       |
      D5 e  F5 e  A5 q. G5 e  F5 e  E5 e        | D5 e  F5 e  A5 q. C6 e  A5 q                |
      Bb5 e  Bb5 e  r e  Bb5 e  D6 e  C6 e  Bb5 e  A5 e | A5 q. E5 e  C#5 e  E5 e  A4 q       |
      D5 e  F5 e  A5 q. G5 e  F5 e  E5 e        | E5 e  G5 e  C6 q. B5 e  G5 q                |
      D6 q  Bb5 e  A5 e  G5 e  A5 e  Bb5 e  C6 e | C#6 q  A5 q  E5 q  r e  A5 e               |
      F5 q  A5 e  C6 e  C6 q. A5 e              | G5 e  E5 e  C5 q  E5 q  G5 q                |
      Bb5 q. A5 e  G5 q  D5 q                   | C#5 q  E5 q  A5 h                           |
      F5 e  A5 e  D6 q. C6 e  A5 q              | D6 q. C6 e  Bb5 q  A5 q                     |
      G5 e  A5 e  Bb5 q  A5 e  G5 e  F5 q       | E5 q  C#5 q  A4 q  C#5 e  E5 e              |
      D6 e  D6 e  r e  A5 e  F5 q  A5 q         | G5 e  G5 e  r e  D5 e  Bb5 q  G5 q          |
      A5 q  F5 e  D5 e  E5 q  F5 e  G5 e        | A5 e  A5 e  r e  G5 e  E5 e  C#5 e  A4 q    |
      D5 q  F5 q  Bb5 q  D6 q                   | C#6 e  A5 e  E5 e  C#5 e  E5 e  A5 e  C#6 e  E6 e |
    `),
  },
  // Intro doubles the lead in unison; A/turnaround bars stab the chord
  // 3rd on the offbeats; B section harmonizes a 3rd below the lead.
  pulse2: {
    duty: 0.25,
    vol: 0.32,
    notes: notes(
      [
        'D5 e D5 e r e D5 e F5 e E5 e D5 e C#5 e',
        'D5 s E5 s F5 s G5 s A5 s Bb5 s A5 s G5 s F5 s G5 s F5 s E5 s D5 s E5 s D5 s C#5 s',
        stab('F4'), stab('F4'), stab('D5'), stab('C#5'),
        stab('F4'), stab('E5'), stab('D5'), stab('C#5'),
        'C5 q F5 e A5 e A5 q. F5 e',
        'E5 e C5 e G4 q C5 q E5 q',
        'G5 q. F5 e D5 q Bb4 q',
        'A4 q C#5 q E5 h',
        'D5 e F5 e A5 q. A5 e F5 q',
        'Bb5 q. A5 e F5 q F5 q',
        'D5 e F5 e G5 q F5 e D5 e D5 q',
        'C#5 q A4 q E4 q A4 e C#5 e',
        stab('F4'), stab('Bb4'), stab('F4'), stab('C#5'),
        'r e F4 e r e F4 e r e D5 e r e D5 e', // bar 23: Dm–Bb split
        stab('C#5'),
      ].join(' | '),
    ),
  },
  wave: {
    vol: 0.6,
    notes: notes(
      [
        'D3 e D3 e r e D3 e D3 e D3 e D3 e D3 e', //   bar 1: lead's stab rhythm
        'D3 e D3 e D3 e D3 e D3 e D3 e A2 e A2 e', //  bar 2
        stabBass('D3', 'D4'), stabBass('D3', 'D4'), stabBass('Bb2', 'Bb3'), stabBass('A2', 'A3'),
        stabBass('D3', 'D4'), stabBass('C3', 'C4'), stabBass('Bb2', 'Bb3'), stabBass('A2', 'A3'),
        stabBass('F2', 'F3'), stabBass('E2', 'E3'), stabBass('G2', 'G3'), stabBass('A2', 'A3'),
        stabBass('D3', 'D4'), stabBass('Bb2', 'Bb3'), stabBass('G2', 'G3'), stabBass('A2', 'A3'),
        stabBass('D3', 'D4'), stabBass('G2', 'G3'), stabBass('A2', 'A3'), stabBass('A2', 'A3'),
        'D3 e r e D3 e D3 e r e Bb2 e Bb2 e Bb3 e', // bar 23: Dm–Bb split
        stabBass('A2', 'A3'),
      ].join(' | '),
    ),
  },
  noise: drums(
    [
      'k.......k.......', //        bar 1
      'ssssssssssssssss', //        bar 2: roll
      TRAINER_DRUM.repeat(7), TRAINER_FILL, //  bars 3–10
      TRAINER_DRUM.repeat(7), TRAINER_FILL, //  bars 11–18
      TRAINER_DRUM.repeat(5), //                bars 19–23
      'k.h.s.h.s.s.s.s.', //        bar 24
    ].join(''),
  ),
}

// ── 2.8 victory — fanfare jingle (non-looping) ──────────────────────────────

const victory: Song = {
  bpm: 132,
  length: 96,
  pulse1: {
    duty: 0.5,
    vol: 0.52,
    notes: notes(`
      G5 e  G5 s  G5 s  G5 e  E5 e  A5 q  G5 q  | F5 e  F5 s  F5 s  F5 e  D5 e  G5 h |
      E5 e  G5 e  C6 q  A5 e  C6 e  D6 q        | F5 q  A5 q  B5 q  D6 q             |
      E5 q  G5 q  C6 q  E6 q                    | D6 q. B5 e  C6 h                   |
    `),
  },
  pulse2: {
    duty: 0.5,
    vol: 0.34,
    notes: notes(`
      E5 e  E5 s  E5 s  E5 e  C5 e  F5 q  E5 q  | D5 e  D5 s  D5 s  D5 e  A4 e  D5 h |
      C5 e  E5 e  G5 q  E5 e  A5 e  B5 q        | D5 q  F5 q  G5 q  B5 q             |
      C5 q  E5 q  G5 q  C6 q                    | B5 q. G5 e  E5 h                   |
    `),
  },
  wave: {
    vol: 0.6,
    notes: notes(`
      C3 q C3 q C3 q C3 q | F2 q F2 q G2 q G2 q | C3 q C3 q A2 q A2 q |
      F2 q F2 q G2 q G2 q | C3 q C3 q C3 q C3 q | G2 q G2 q C3 h
    `),
  },
  noise: drums('k...s...k...s...'.repeat(5) + 'c.......k.......'),
}

// ── 2.9 haven_heal — healing arpeggio jingle (non-looping) ──────────────────

const HEAL_LEAD = notes(`
  A4 e  C#5 e  E5 e  A5 e  D5 e  F#5 e  A5 e  D6 e | E5 e  G#5 e  B5 e  E6 e  C#6 e  A5 q.
`)

const haven_heal: Song = {
  bpm: 120,
  length: 32,
  pulse1: { duty: 0.25, vol: 0.45, notes: HEAL_LEAD },
  // ECHO one octave up — the sparkle.
  pulse2: { duty: 0.125, vol: 0.16, notes: echo(HEAL_LEAD, 32, 12) },
  wave: { vol: 0.25, notes: notes('A2 h D3 h | E3 h A2 h') },
}

// ── 2.10 evolution — rising wonder (non-looping shimmer) ────────────────────

const evolution: Song = {
  bpm: 100,
  length: 128,
  pulse1: {
    duty: 0.5,
    vol: 0.42,
    notes: notes(`
      C5 h  E5 h   | D5 h  F#5 h | E5 h  G#5 h | F5 h  A5 h |
      G5 h  B5 h   | Ab5 h  C6 h | Bb5 h  D6 h | C6 w
    `),
  },
  pulse2: {
    duty: 0.25,
    vol: 0.26,
    notes: notes(
      [
        shimmer('C5', 'E5', 'G5', 'C6'),
        shimmer('D5', 'F#5', 'A5', 'D6'),
        shimmer('E5', 'G#5', 'B5', 'E6'),
        shimmer('F5', 'A5', 'C6', 'F6'),
        shimmer('G5', 'B5', 'D6', 'G6'),
        shimmer('Ab5', 'C6', 'Eb6', 'Ab6'),
        shimmer('Bb5', 'D6', 'F6', 'Bb6'),
        shimmer('C5', 'E5', 'G5', 'C6'),
      ].join(' | '),
    ),
  },
  wave: {
    vol: 0.45,
    notes: notes('C3 w | D3 w | E3 w | F3 w | G3 w | Ab3 w | Bb3 w | C3 w'),
  },
  // Silent until bar 8: one cymbal wash on beat 1.
  noise: drums('.'.repeat(112) + 'c' + '.'.repeat(15)),
}

// ── 2.11 spire_night — "The Wisteria Spire, After Dark" ─────────────────────

const spire_night: Song = {
  bpm: 64,
  length: 128,
  loopTo: 0,
  pulse1: {
    duty: 0.125,
    vol: 0.3,
    notes: notes(`
      D5 q  r q  G#4 q  r q | r h  A4 q. Bb4 e | C#5 h  r q  D5 q | r w |
      F5 q  E5 q  Eb5 h     | r q  D5 q  r q  G#4 q | A4 w | r h  C#5 q  E5 q
    `),
  },
  // Distant tolls: D6 on bars 1/5, the G#5 tritone toll on bars 3/7 —
  // the G# against the D pedal is deliberate; do not "correct" it.
  pulse2: {
    duty: 0.125,
    vol: 0.36,
    notes: notes(`
      D6 h  r h | r w | G#5 h  r h | r w | D6 h  r h | r w | G#5 h  r h | r w
    `),
  },
  // The drone never stops.
  wave: {
    vol: 0.25,
    notes: notes('D2 w | D2 w | D2 w | D2 w | D2 w | D2 w | D2 w | D2 w'),
  },
  // Rumble on beat 1 of bars 4 and 8 (crash is the engine's long wash).
  noise: drums('.'.repeat(48) + 'c' + '.'.repeat(63) + 'c' + '.'.repeat(15)),
}

// ── The atlas ───────────────────────────────────────────────────────────────

export const SONGS: Record<string, Song> = {
  title,
  dawnfern,
  trail,
  bellmere,
  loomspire,
  battle_wild,
  battle_trainer,
  victory,
  haven_heal,
  evolution,
  spire_night,
}
