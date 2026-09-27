# AURIC — Audio Specification

Composition and SFX specs for the AURIC sound engine. Everything in this
document is written to be transcribed *directly* into note-event data — no
interpretation should be required beyond the conventions defined in §1.

---

## 1. APU Model & Global Conventions

### 1.1 Channels

The engine uses a handheld-style 4-channel APU. **Every channel is
monophonic** — one note at a time, no exceptions.

| Channel | Name    | Capabilities                                                        |
|---------|---------|---------------------------------------------------------------------|
| 1       | PULSE A | Square wave; duty cycles 12.5% / 25% / 50% / 75%; volume envelope; pitch sweep |
| 2       | PULSE B | Square wave; duty cycles 12.5% / 25% / 50% / 75%; volume envelope (no sweep)   |
| 3       | WAVE    | Soft wavetable channel for bass/pads; volume steps 100% / 50% / 25% / mute     |
| 4       | NOISE   | White-noise generator, variable "pitch" (low/mid/high), volume envelope        |

- Tuning: A4 = 440 Hz, 12-TET.
- Practical pitch range: **C2 (65.4 Hz) to C8**. Bass lines live in octaves 2–3;
  leads live in octaves 4–6. Never write below C2.
- WAVE default waveshape: a rounded "soft square" (a 32-sample wavetable of a
  square with the corners smoothed — mellow, flute/organ-like). All bass lines
  in this doc use it unless stated.
- Envelopes are written as `vN` (initial volume, 0–15) plus a decay
  description, e.g. `v12, decay to 0 over 80ms` or `v10, gate` (hold at v10,
  hard cut at note end).

### 1.2 Notation legend

Melodies are written bar-by-bar, bars separated by `|`.

- **Pitch:** scientific notation. `C4` = middle C. `#` sharp, `b` flat
  (enharmonics are equivalent).
- **Durations** (absolute note values, independent of meter):
  - `w` whole (4 quarter-units), `h` half (2), `q` quarter (1),
    `e` eighth (0.5), `s` sixteenth (0.25)
  - A dot adds half again: `q.` = 1.5, `h.` = 3.
  - Rests: `r` followed by a duration, e.g. `r q`.
- Every bar's durations sum to the meter: 4 quarter-units in 4/4,
  3 in 3/4, 3 in 6/8 (= six eighths). **All bar sums in this document have
  been checked.**
- Notes are played detached by default (≈90% of written length, "soft
  staccato") — this is the idiomatic GB articulation. `~` after a note means
  hold full value, legato into the next note.

### 1.3 Drum kit (NOISE channel)

Defined once; track patterns reference these by letter.

| Sym | Name   | Noise pitch        | Duration | Envelope                  |
|-----|--------|--------------------|----------|---------------------------|
| K   | KICK   | low (~150 Hz band) | 50 ms    | v13, decay to 0 by 50ms   |
| S   | SNARE  | mid (~1.5 kHz)     | 80 ms    | v11, decay to 0 by 80ms   |
| H   | HAT    | high (~6 kHz)      | 25 ms    | v6, decay to 0 by 25ms    |
| O   | OPEN HAT | high             | 60 ms    | v6, decay to 0 by 60ms    |
| C   | CYM    | high wash          | 350 ms   | v10, slow decay to 0      |
| R   | RUMBLE | very low           | 600 ms   | v7, slow fade to 0        |

Drum patterns are written on an **eighth-note grid** per bar: 8 slots in 4/4,
6 slots in 6/8 and 3/4. `.` = rest. Sixteenth fills are written inline as
pairs, e.g. `SS` in one slot = two sixteenth snares.

### 1.4 ECHO definition

`ECHO(lead)` = PULSE B replays the lead's note stream **delayed by one
eighth note**, at duty 12.5%, volume ≈ 35% of the lead. If a delayed note
would still be sounding when the next arrives, it is cut. Used by the night
rule and several tracks.

### 1.5 SFX priority

SFX commandeer PULSE A (and NOISE if needed) for their duration; the music's
parts on those channels are muted, then resume in time. WAVE bass is never
interrupted, which keeps the music's floor intact during gameplay blips.

---

## 2. Music Tracks

---

### 2.1 `title` — "Gold Light Through Clouds"

| Field      | Value                                  |
|------------|----------------------------------------|
| Key        | C major (with bVI/bVII mixture)        |
| Tempo      | 96 BPM                                 |
| Meter      | 4/4                                    |
| Length     | 16 bars                                |
| Loop       | bars 1–16, loop to bar 1               |

**Channel roles:** PULSE A = lead, duty 50%, v12. PULSE B = bars 1–8
`ECHO(lead)`; bars 9–16 harmony (nearest chord tone a diatonic 3rd below the
lead, same rhythm), duty 25%, v8. WAVE = bass, 50% volume. NOISE = silent
bars 1–8; light pulse bars 9–16.

**Chords (1 per bar):**

```
| C     | G/B   | Am    | F     | C     | F     | Dm    | G     |
| I     | V6    | vi    | IV    | I     | IV    | ii    | V     |
| Am    | F     | C/E   | G     | Ab    | Bb    | C     | Gsus4–G |
| vi    | IV    | I6    | V     | bVI   | bVII  | I     | Vsus4–V |
```

**Lead melody (PULSE A):**

```
G4 q  C5 q  E5 h               | D5 q. E5 e  D5 q  B4 q          |
C5 q  E5 q  A5 h               | G5 q. F5 e  E5 q  F5 q          |
G5 h  E5 q  C5 q               | A5 q  G5 e  F5 e  E5 q  F5 q    |
D5 q  F5 q  A5 q  G5 e  F5 e   | G5 h. r q                       |
E5 q  C5 q  A4 q  B4 e  C5 e   | D5 q. C5 e  A4 h                |
G4 q  C5 q  D5 q  E5 q         | D5 h  B4 q  G4 q                |
C5 q  Eb5 q  Ab5 h             | G5 q. F5 e  D5 q  F5 q          |
E5 q  G5 q  C6 h               | D5 q  C5 q  D5 h                |
```

**Bass (WAVE), rhythm `R h  R h` (repeat the bar's root twice) unless noted:**

```
C3 | B2 | A2 | F2 | C3 | F2 | D3 | G2 |
A2 | F2 | E2 | G2 | Ab2 | Bb2 | C3 | G2 h  G2 q  B2 q  (walk to C) |
```

**Drums (NOISE):** bars 1–8 silent. Bars 9–16: `K . . . S . . .`
(kick beat 1, soft snare beat 3). Bar 16: `K . . . S . SS SS` (sixteenth
snare swell into the loop).

---

### 2.2 `dawnfern` — "Dawnfern Village" (music box)

| Field      | Value                       |
|------------|------------------------------|
| Key        | F major                      |
| Tempo      | 80 BPM                       |
| Meter      | 3/4                          |
| Length     | 16 bars                      |
| Loop       | bars 1–16, loop to bar 1     |

**Channel roles:** PULSE A = lead, duty 12.5% (thin, glassy, music-box), v11,
each note enveloped `v11, decay to ~v4 over 350ms` for a plucked-tine feel.
PULSE B = broken-chord accompaniment, duty 12.5%, v6. WAVE = bass, 25%
volume (barely-there warmth). NOISE = **silent for the whole track**.

**Chords (1 per bar; bar 15 splits beats 1–2 / 3):**

```
| F  | Dm | Bb | C  | F  | Dm | Gm | C  |
| I  | vi | IV | V  | I  | vi | ii | V  |
| Bb | F/A | Gm | C  | F  | Bb | F/C–C7 | F |
| IV | I6  | ii | V  | I  | IV | I64–V7 | I |
```

**Lead melody (PULSE A):**

```
A5 h  C6 q          | A5 q. G5 e  F5 q    | G5 h  D5 q          | E5 h.            |
F5 q  A5 q  C6 q    | D6 q. C6 e  A5 q    | Bb5 q  A5 q  G5 q   | G5 h.            |
F5 q  Bb5 q  D6 q   | C6 h  A5 q          | Bb5 q. A5 e  G5 q   | G5 q  E5 q  C5 q |
F5 q  G5 q  A5 q    | Bb5 q. C6 e  D6 q   | A5 q  F5 q  E5 q    | F5 h.            |
```

**Accompaniment (PULSE B):** for each bar's chord `X`, play six eighths,
broken chord up-and-back starting in octave 4:
`root4 e  3rd4 e  5th4 e  root5 e  5th4 e  3rd4 e`
(e.g. bar 1, F: `F4 A4 C5 F5 C5 A4`). Bar 16: hold `F4 h.` instead.

**Bass (WAVE), one dotted half per bar (`R h.`):**

```
F3 | D3 | Bb2 | C3 | F3 | D3 | G3 | C3 |
Bb2 | A2 | G3 | C3 | F3 | Bb2 | C3 | F3 |
```

**Drums:** none.

---

### 2.3 `trail` — "Trail 1" (THE hummable one)

| Field      | Value                       |
|------------|------------------------------|
| Key        | G major                      |
| Tempo      | 116 BPM                      |
| Meter      | 4/4                          |
| Length     | 16 bars                      |
| Loop       | bars 1–16, loop to bar 1     |

Bouncy, syncopated, forward-leaning. The hook is the dotted-quarter pickup
figure in bars 1–2; it returns varied in 5–6 and the whole tune funnels back
into it at the loop (bar 16's run is an enclosure landing on bar 1's G5).

**Channel roles:** PULSE A = lead, duty 50%, v12. PULSE B = harmony, duty
25%, v8 — nearest chord tone a diatonic 3rd below the lead, same rhythm
(use a 6th below when the 3rd would collide within a whole step of the bass
register; in bars 4 and 12 sustain the chord 5th as a `w` pad instead).
WAVE = bass, 50%. NOISE = drums throughout.

**Chords (1 per bar; bars 15–16 split in halves):**

```
| G  | C  | G  | D7 | G  | C  | D7 | G  |
| I  | IV | I  | V7 | I  | IV | V7 | I  |
| Em | C  | G/B | A7  | C  | D7 | G–Em | C–D7 |
| vi | IV | I6  | V/V | IV | V7 | I–vi | IV–V7 |
```

**Lead melody (PULSE A):**

```
G5 q. E5 e  D5 e  B4 e  D5 q             | C5 e  E5 e  G5 q. A5 e  G5 q          |
B5 e  G5 e  D5 q. E5 e  D5 e  B4 e       | A4 e  B4 e  C5 e  D5 e  F#5 q  A5 q   |
G5 q. E5 e  D5 e  B4 e  D5 q             | C5 e  E5 e  G5 q. A5 e  B5 q          |
C6 e  B5 e  A5 q  F#5 e  D5 e  A5 q      | G5 h  r e  D5 e  E5 e  F#5 e          |
G5 q  E5 q  B4 q. E5 e                   | G5 e  A5 e  G5 q  E5 q  C5 q          |
D5 q. G5 e  B5 q  A5 e  G5 e             | A5 q. G5 e  F#5 e  E5 e  A5 q         |
E5 e  G5 e  A5 q. G5 e  E5 q             | F#5 e  A5 e  D6 q. C6 e  A5 q         |
B5 q  G5 e  E5 e  D5 q  E5 e  D5 e       | C5 q  D5 q  D5 e  E5 e  F#5 e  A5 e   |
```

**Bass (WAVE):** define bounce pattern
`P(x) = x q  x+oct e  x e  fifth(x) q  x q` (e.g. `P(G2)` =
`G2 q G3 e G2 e D3 q G2 q`). Bars:

```
P(G2) | P(C3) | P(G2) | P(D3) | P(G2) | P(C3) | P(D3) | G2 q G2 q A2 q B2 q (walk) |
P(E2) | P(C3) | P(G2) | P(A2) | P(C3) | P(D3) | G2 q G2 q E2 q E2 q | C3 q C3 q D3 q D3 q |
```

**Drums (NOISE), per bar (8 eighth slots):**

```
Default:        K . H H S . H .
Bars 8 & 16:    K . H . S . SS SS   (fill into next phrase)
```

---

### 2.4 `bellmere` — "Bellmere Town" (lakeside 6/8)

| Field      | Value                                    |
|------------|-------------------------------------------|
| Key        | D major                                   |
| Tempo      | 6/8, dotted-quarter = 60 (eighth = 180)   |
| Meter      | 6/8                                       |
| Length     | 16 bars                                   |
| Loop       | bars 1–16, loop to bar 1                  |

**Channel roles:** PULSE A = lead, duty 25%, v11. PULSE B = lilting offbeat
chord tones, duty 12.5%, v6: per bar, six eighth slots —
`r e  3rd e  5th e  r e  3rd e  5th e` (chord tones in octave 4/5, nearest
below the lead). WAVE = barcarolle bass, 50%. NOISE = soft brush, bars 9–16
only.

**Chords (1 per bar; bars 7 and 15 split beats 1–3 / 4–6):**

```
| D  | G  | D  | A  | Bm | G  | D/A–A7 | D  |
| I  | IV | I  | V  | vi | IV | I64–V7 | I  |
| G  | D/F# | Em | A7 | Bm | G  | D/A–A7 | D  |
| IV | I6   | ii | V7 | vi | IV | I64–V7 | I  |
```

**Lead melody (PULSE A):**

```
F#5 q  A5 e  F#5 q  E5 e   | D5 q. G5 q  E5 e        | F#5 q  A5 e  D6 q.       | C#6 e  B5 e  A5 e  E5 q. |
D5 q  F#5 e  B5 q.         | B5 e  A5 e  G5 e  E5 q  G5 e | F#5 q  D5 e  E5 q.  | D5 h.                    |
G5 q  A5 e  B5 q  G5 e     | A5 q. F#5 q  D5 e       | E5 q  F#5 e  G5 q  B4 e  | C#5 q  E5 e  A5 q.       |
B5 q  A5 e  F#5 q  D5 e    | E5 q  G5 e  B5 q.       | A5 q  F#5 e  E5 q  C#5 e | D5 h.                    |
```

**Bass (WAVE):** rocking pattern `R q.  fifth-above q.` per bar:

```
D3 | G2 | D3 | A2 | B2 | G2 | A2 | D3 |
G2 | F#2 | E3 | A2 | B2 | G2 | A2 | D3 |
```

(Bars 7 and 15 keep `A2 q. A2 q.` — the pedal A carries both chords.)

**Drums (NOISE), bars 9–16 only (6 eighth slots):** `K . . H . .`
(K at v8 — soft, like a distant oar; H at v4).

---

### 2.5 `loomspire` — "Loomspire City" (bells)

| Field      | Value                       |
|------------|------------------------------|
| Key        | E minor                      |
| Tempo      | 96 BPM                       |
| Meter      | 4/4                          |
| Length     | 16 bars                      |
| Loop       | bars 1–16, loop to bar 1     |

**Channel roles:** PULSE A = lead, duty 50%, v11, stately (quarters/halves,
detached). PULSE B = **bell ostinato**, duty 12.5%: every bar, beat 1 = the
chord root in octave 6, beat 3 = the chord 5th in octave 5; each toll
enveloped `v14, decay to 0 over ~600ms`. WAVE = bass, 50%. NOISE = one soft
low boom per bar.

**Chords (1 per bar):**

```
| Em | G   | D   | Em | C  | G   | Am7 | B7 |
| i  | III | VII | i  | VI | III | iv7 | V7 |
| Em | D   | C   | B7 | Em | Am  | B7  | Em |
| i  | VII | VI  | V7 | i  | iv  | V7  | i  |
```

**Lead melody (PULSE A):**

```
B4 q  E5 q  G5 q  F#5 q  | G5 h  D5 h            | F#5 q  A5 q  F#5 q  E5 q | E5 w            |
E5 h  G5 q  C6 q         | B5 h  G5 h            | A5 q  G5 q  E5 q  C5 q   | B4 h. D#5 q     |
E5 q  G5 q  B5 h         | A5 q  F#5 q  D5 h     | G5 q  E5 q  C5 h         | F#5 q  D#5 q  B4 h |
G5 h  F#5 q  E5 q        | C5 q  E5 q  A5 h      | B5 q  A5 q  F#5 q  D#5 q | E5 w            |
```

**Bell ostinato (PULSE B), written out:** beat 1 / beat 3 per bar:

```
E6/B5 | G6/D6 | D6/A5 | E6/B5 | C6/G5 | G6/D6 | A5/E5 | B5/F#5 |
E6/B5 | D6/A5 | C6/G5 | B5/F#5 | E6/B5 | A5/E5 | B5/F#5 | E6/B5 |
```

**Bass (WAVE):** `R h  fifth(R) h` per bar (root then fifth above):

```
E2 | G2 | D3 | E2 | C3 | G2 | A2 | B2 |
E2 | D3 | C3 | B2 | E2 | A2 | B2 | E2 |
```

**Drums (NOISE):** `K . . . . . . .` every bar (K at v9 — a felt timpani
boom, not a thud). No hats, no snare.

---

### 2.6 `battle_wild` — "A Wild KINDRA Appeared!"

| Field      | Value                                        |
|------------|-----------------------------------------------|
| Key        | A minor (B section lifts to C major)          |
| Tempo      | 144 BPM                                       |
| Meter      | 4/4                                           |
| Length     | 24 bars (2-bar intro + 22)                    |
| Loop       | play bars 1–24 once, then **loop bars 3–24**  |

**Channel roles:** PULSE A = lead, duty 50%, v13. PULSE B, duty 25%, v9:
intro doubles the lead one octave down; A section (bars 3–10, 19–24) plays a
driving eighth ostinato alternating chord root and 5th in octave 4
(`R e 5 e R e 5 e ...`); B section (bars 11–18) sustains the chord 3rd as a
whole note per bar. WAVE = pumping bass, 100%. NOISE = drums.

**Chords:**

```
Bar 1–2: intro (chromatic run / A pedal — N.C.)
| Am | G   | F  | E7 | Am | G   | F–E7 | Am |        (bars 3–10:  i VII VI V7 …)
| C  | G/B | F/A | G | C  | Am  | F   | G  |         (bars 11–18: I V6 IV6 V I vi IV V — in C)
| Dm | Am  | Dm | E7 | F  | E7 |                     (bars 19–24: iv i iv V7 VI V7)
```

**Lead melody (PULSE A):**

```
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
```

(The chromatic cascade in bar 1 is played by BOTH pulses in octaves, v13,
with a snare roll under it; bar 24's rising E7 arpeggio slingshots the loop
back to bar 3's A5.)

**Bass (WAVE):** pump pattern `x e x+oct e` repeated 4× per bar
(8 eighths, root/octave alternation). Roots:

```
Bar 1: tacet   Bar 2: A2 (straight eighths, crescendo)
A2 | G2 | F2 | E2 | A2 | G2 | F2(beats 1–2) E2(beats 3–4) | A2 |
C3 | B2 | A2 | G2 | C3 | A2 | F2 | G2 |
D3 | A2 | D3 | E2 | F2 | E2 |
```

**Drums (NOISE):**

```
Bar 1:        SS SS SS SS SS SS SS SS   (sixteenth snare roll, crescendo v6→v12)
Bar 2:        K . K . K . K K
A section:    K H S H K H S H
B section:    K H S H K H S S
Bars 10, 18, 24:  K H S H SS SS SS SS  (fill)
```

---

### 2.7 `battle_trainer` — "Rival Eyes" (Corvin / trainers)

| Field      | Value                                        |
|------------|-----------------------------------------------|
| Key        | D minor                                       |
| Tempo      | 150 BPM                                       |
| Meter      | 4/4                                           |
| Length     | 24 bars (2-bar intro + 22)                    |
| Loop       | play bars 1–24 once, then **loop bars 3–24**  |

Sharper than `battle_wild`: stabbing rests inside the riff, pushed bass.

**Channel roles:** PULSE A = lead, duty 75% (harsher color), v13. PULSE B,
duty 25%, v9: intro doubles lead in unison; A/turnaround sections play
offbeat eighth stabs on the chord 3rd, octave 4–5 (`r e 3 e r e 3 e ...`);
B section (bars 11–18) harmony a diatonic 3rd below the lead, same rhythm.
WAVE = syncopated bass, 100%. NOISE = drums.

**Chords:**

```
Bar 1–2: intro (Dm riff — N.C.)
| Dm | Dm | Bb | A7 | Dm | C   | Bb | A7 |      (bars 3–10:  i i VI V7 i VII VI V7)
| F  | C/E | Gm | A7 | Dm | Bb  | Gm | A7 |     (bars 11–18: III VII6 iv V7 i VI iv V7)
| Dm | Gm  | Dm/A | A7 | Dm–Bb | A7 |           (bars 19–24: i iv i64 V7 i–VI V7)
```

**Lead melody (PULSE A):**

```
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
```

**Bass (WAVE):** stab pattern `S(x)` per bar (8 eighth slots):
`x . x x . x x x+oct` — i.e. `x e r e x e x e r e x e x e (x+oct) e`
rearranged as slots `1:x 2:r 3:x 4:x 5:r 6:x 7:x 8:x+oct`. Roots:

```
Bar 1: D3 matching the lead rhythm (slots 1 2 4 5 6 7 8)
Bar 2: D3 e ×6 then A2 e A2 e
D3 | D3 | Bb2 | A2 | D3 | C3 | Bb2 | A2 |
F2 | E2 | G2 | A2 | D3 | Bb2 | G2 | A2 |
D3 | G2 | A2 | A2 | D3(beats 1–2) Bb2(beats 3–4) | A2 |
```

**Drums (NOISE):**

```
Bar 1:        K . . . K . . .  (with lead stabs)
Bar 2:        SS SS SS SS SS SS SS SS  (roll, v8→v13)
Default:      K K S H K H S H
Bars 10, 18:  K K S H SS SS SS SS
Bar 24:       K H S H S S S S
```

---

### 2.8 `victory` — fanfare jingle (non-looping)

| Field      | Value           |
|------------|------------------|
| Key        | C major          |
| Tempo      | 132 BPM          |
| Meter      | 4/4              |
| Length     | 6 bars, NO loop  |

**Channel roles:** PULSE A = lead, duty 50%, v13. PULSE B = harmony a
diatonic 3rd below, same rhythm, duty 50%, v9 (final bar: hold `E5 h`).
WAVE = bass, 100%. NOISE = drums.

**Chords:** `| C | F–G | C–Am | F–G7 | C | G7–C |`
(`I | IV–V | I–vi | IV–V7 | I | V7–I`; splits are beats 1–2 / 3–4)

**Lead melody:**

```
G5 e  G5 s  G5 s  G5 e  E5 e  A5 q  G5 q  | F5 e  F5 s  F5 s  F5 e  D5 e  G5 h |
E5 e  G5 e  C6 q  A5 e  C6 e  D6 q        | F5 q  A5 q  B5 q  D6 q             |
E5 q  G5 q  C6 q  E6 q                    | D6 q. B5 e  C6 h                   |
```

**Bass (WAVE), quarters:**

```
C3 C3 C3 C3 | F2 F2 G2 G2 | C3 C3 A2 A2 | F2 F2 G2 G2 | C3 C3 C3 C3 | G2 q G2 q C3 h |
```

**Drums:** `K . S . K . S .` bars 1–5; bar 6: `C . . . K . . .`
(cymbal on the final chord).

---

### 2.9 `haven_heal` — healing arpeggio jingle (non-looping)

| Field      | Value           |
|------------|------------------|
| Key        | A major          |
| Tempo      | 120 BPM          |
| Meter      | 4/4              |
| Length     | 2 bars, NO loop  |

**Channel roles:** PULSE A = arpeggio, duty 25%, v11. PULSE B =
`ECHO(lead)` **one octave up**, duty 12.5%, v5 (sparkle). WAVE = two soft
roots per bar, 25%. NOISE = silent.

**Chords:** `| A(beats 1–2) D(3–4) | E(1–2) A(3–4) |` — `I IV | V I`.

**Lead (PULSE A) — the rising I–IV–V–I arpeggio:**

```
A4 e  C#5 e  E5 e  A5 e  D5 e  F#5 e  A5 e  D6 e | E5 e  G#5 e  B5 e  E6 e  C#6 e  A5 q. |
```

**Bass (WAVE):** `A2 h  D3 h | E3 h  A2 h`.

---

### 2.10 `evolution` — rising wonder (non-looping shimmer)

| Field      | Value           |
|------------|------------------|
| Key        | C (non-functional planing — rising major triads) |
| Tempo      | 100 BPM          |
| Meter      | 4/4              |
| Length     | 8 bars, NO loop (engine may sustain bar 8 until the evolution animation resolves) |

**Channel roles:** PULSE A = lead (long rising dyad tones), duty 50%, v11,
swelling: each note `v8 rising to v11 over its length`. PULSE B = shimmer,
duty 25%, v7: continuous sixteenth arpeggio `R5 3 5 R6` of the current chord,
repeating every beat. WAVE = whole-note roots, 50%. NOISE = silent until
bar 8: `C` (cymbal wash) on beat 1.

**Chords (1 per bar — parallel major triads climbing):**

```
| C | D | E | F | G | Ab | Bb | C |
```

**Lead melody (PULSE A):**

```
C5 h  E5 h   | D5 h  F#5 h | E5 h  G#5 h | F5 h  A5 h |
G5 h  B5 h   | Ab5 h  C6 h | Bb5 h  D6 h | C6 w~       |
```

**Bass (WAVE), whole notes:** `C3 | D3 | E3 | F3 | G3 | Ab3 | Bb3 | C3`.

---

### 2.11 `spire_night` — "The Wisteria Spire, After Dark"

| Field      | Value                       |
|------------|------------------------------|
| Key        | D minor (D pedal, tritone color) |
| Tempo      | 64 BPM                       |
| Meter      | 4/4                          |
| Length     | 8 bars                       |
| Loop       | bars 1–8, loop to bar 1      |

**Channel roles:** PULSE A = sparse lead, duty 12.5% (hollow), v8, each note
`v8, decay to 0 over 700ms`. PULSE B = distant bell tolls, duty 12.5%,
`v10, decay to 0 over 1200ms`: beat 1 of bar 1 and 5 = `D6`; beat 1 of bar 3
and 7 = `G#5` (the tritone toll); silent otherwise. WAVE = `D2 w` drone
every bar, 25% volume, never stops. NOISE = `R` (rumble, v5) on beat 1 of
bars 4 and 8 only.

**Harmony per bar (colors over the D pedal):**

```
| Dm(add#4) | Gm/D | C#dim7/D | (pedal only) | Dm(chrom. 3rds) | Dm(add#4) | A5(open 5th)/D | C#dim7/D |
```

The `G#` is a deliberate tritone against the D pedal — do not "correct" it.

**Lead melody (PULSE A):**

```
D5 q  r q  G#4 q  r q | r h  A4 q. Bb4 e | C#5 h  r q  D5 q | r w |
F5 q  E5 q  Eb5 h     | r q  D5 q  r q  G#4 q | A4 w~ | r h  C#5 q  E5 q |
```

---

## 3. NIGHT RULE (overworld music, 18:00–3:59)

Applies to `dawnfern`, `trail`, `bellmere`, `loomspire` (NOT battles,
jingles, or `spire_night`, which is already a night cue). Same note data,
transformed at playback:

1. **Master volume × 0.8** (−20%).
2. **PULSE B** abandons its harmony/accompaniment part and plays
   `ECHO(lead)` instead (one-eighth delay, duty 12.5%, 35% of lead volume).
3. **WAVE bass** halves rhythmic density: replace each bar's pattern with the
   bar's root held — `R w` in 4/4, `R h.` in 3/4 and 6/8. Drop all walkups.
4. **NOISE** simplification: keep only the beat-1 `K` (at v6); drop all
   hats, snares, and fills.
5. Per-track notes:
   - `trail`: lead duty drops 50% → 25% (softer voice for the same tune).
   - `dawnfern`: already night-shaped; apply rules 1–3 only (it has no noise).
   - `bellmere`: drop PULSE B's offbeat lilt per rule 2; the echo over the
     6/8 lead reads as ripples on the lake.
   - `loomspire`: keep the bell ostinato but **only on beat 1 of
     odd-numbered bars**, volume v10 (distant tolling); the echo rule then
     applies to what PULSE B plays between tolls — to keep the channel
     monophonic, the bell toll takes priority and the echo resumes after it.

---

## 4. SFX Specifications

All SFX are parameterized events on PULSE A and/or NOISE (PULSE B only where
stated). "Sweep" = continuous pitch glide (stepped chromatic glide at ≥60
steps/sec is an acceptable implementation). Volumes use the v0–15 scale.

| # | Name | Channel(s) | Waveform | Pitch contour | Duration | Envelope |
|---|------|-----------|----------|----------------|----------|----------|
| 1 | `menu_move` | Pulse A | square 25% | A5 (880 Hz), flat | 35 ms | v10, gate (hard cut) |
| 2 | `menu_confirm` | Pulse A | square 25% | A5 (880) 40 ms → E6 (1319) 90 ms, two discrete notes | 130 ms | v11 each; 2nd note decays to 0 over 90 ms |
| 3 | `menu_cancel` | Pulse A | square 25% | E6 (1319) 40 ms → A5 (880) 90 ms | 130 ms | v10; 2nd note decays to 0 over 90 ms |
| 4 | `bump` | Pulse A + Noise | square 50% + low noise | pulse: C3 (131) sweeping down to ~90 Hz over 90 ms; noise: low burst | 100 ms | pulse v12 fast decay; noise v8, 60 ms |
| 5 | `door` | Pulse A | square 25% | sweep G4 (392) → G5 (784) over 110 ms | 110 ms | v10, gate |
| 6 | `ledge_hop` | Pulse A + Noise | square 50% + low noise | pulse: sweep E5 (659) → A4 (440) over 140 ms; then noise `K`-like thump at t=140 ms | 180 ms | pulse v10, gate; noise v10, 40 ms decay |
| 7 | `grass_step` | Noise | high-mid noise (~4 kHz) | n/a (randomize band ±10% per step) | 40 ms | v6, decay to 0 by 40 ms |
| 8 | `encounter_swirl` | Pulse A + B | both square 50% | A: 4 consecutive up-sweeps 300 → 1500 Hz, 150 ms each; B: simultaneous down-sweeps 1500 → 300 Hz, same timing | 600 ms | both v13, gate per sweep |
| 9 | `hit_normal` | Noise + Pulse A | mid noise + square 50% | pulse: sweep A4 (440) → E4 (330) over 70 ms | 90 ms | noise v12, 90 ms decay; pulse v10 |
| 10 | `hit_super` | Noise + Pulse A | low-mid noise + square 50% | pulse: sweep E5 (659) → A3 (220) over 160 ms; noise starts 10 ms later (layered crunch) | 180 ms | noise v14, 180 ms decay; pulse v13 |
| 11 | `hit_weak` | Noise + Pulse A | high noise + square 25% | pulse: sweep C5 (523) → A4 (440) over 40 ms | 50 ms | noise v8, 50 ms; pulse v8 |
| 12 | `faint_fall` | Pulse A | square 50% | sweep C5 (523) → C3 (131) over 450 ms (stepped chromatic gliss OK) | 450 ms | v12 fading linearly to 0 |
| 13 | `charm_throw` | Pulse A | square 25% | rising arc G4 (392) → D5 (587) over 160 ms, fast-then-slowing (ease-out) | 160 ms | v9, gate |
| 14 | `charm_shake` | Pulse A | square 50% | E4 (330) 70 ms → C4 (262) 110 ms ("wob-ble"); engine plays once per shake, shakes ≥500 ms apart | 180 ms | v10, slight decay each note |
| 15 | `charm_click` | Noise + Pulse A | metallic high-noise tick + square 12.5% | noise: 12 ms tick; pulse: E6 (1319) → B5 (988) over 45 ms | 60 ms total | noise v9; pulse v8, decay to 0 by 60 ms. Quiet, dry, FINAL. Engine must leave ≥250 ms of silence after it before any fanfare. |
| 16 | `levelup` | Pulse A + B | square 25% | A: C5 (523) 70 ms, E5 (659) 70 ms, G5 (784) 70 ms, C6 (1047) 280 ms; B doubles one octave down at 40% volume | 490 ms | v12 per note; final C6 decays to 0 over its 280 ms |
| 17 | `badge_get` | Pulse A + B + Noise | square 25% | A: G4 70, C5 70, E5 70, G5 70, C6 140, E6 350 ms; B a 3rd below each (E4 G4 C5 E5 G5 C6); noise `C` cymbal with the E6 | 770 ms | v13; final E6 slow decay to 0 |
| 18 | `save_chime` | Pulse A + B | square 12.5% | A: D5 (587) 160 ms → G5 (784) 380 ms; B: B4 (494) entering at t=160 ms under the G5 | 540 ms | A v9, final note decays to 0; B v6 |
| 19 | `text_blip` | Pulse A | square 25% | C6 (1047), flat | 16 ms | v7, gate. Fire every 2nd printed character; suppress during punctuation pauses. |

### SFX design notes

- `hit_normal` / `hit_super` / `hit_weak` form a loudness/length/pitch-drop
  ladder: weak is a high tick, super is a long low crunch. The player must be
  able to tell them apart with eyes closed.
- `charm_shake` then `charm_click` is the capture drama: wobble (tension) ×
  up to 3, then the tiny dry click (release). The mandated post-click silence
  is part of the sound.
- `menu_confirm` and `menu_cancel` are exact mirrors — learnable instantly.
- All sweeps are idiomatic for the GB sweep unit (pulse A); none require
  simultaneous polyphony on one channel.

---

## 5. Implementation checklist for the transcriber

1. Honor monophony per channel; where this doc says "chord", it is always
   expressed as arpeggio, dyad split across Pulse A/B, or bass+lead.
2. Bar duration sums are authoritative; if a transcription disagrees with a
   sum, the transcription is wrong.
3. Loop points: `title`, `dawnfern`, `trail`, `bellmere`, `loomspire`,
   `spire_night` loop from their final bar to bar 1; `battle_wild` and
   `battle_trainer` loop to bar 3 (skipping the intro); `victory`,
   `haven_heal`, `evolution` never loop.
4. Apply §3 NIGHT RULE as a playback transform, not as separate note data.
5. Default articulation is detached (§1.2); `~` marks the only true ties.
