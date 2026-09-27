/**
 * Sound effects — docs/AUDIO.md §4, one function per row of the table.
 *
 * Every effect schedules immediately (at apu.now) on the 'sfx' bus, so it
 * rides over the music without touching the WAVE bass floor (§1.5).
 * Frequencies are the spec's Hz values verbatim; sweeps use the engine's
 * per-voice `slideTo` glide. Deterministic by construction — no Rng, no
 * Math.random.
 */
import type { Apu } from '../../engine'

/** docs/AUDIO.md v0–15 envelope volumes → engine 0..1 gain (v12 ≈ 0.5). */
const v = (n: number): number => n / 24

export const SFX: Record<string, (apu: Apu) => void> = {
  /** §4.1 — A5 tick, 35ms, hard cut. */
  menu_move: (apu) => {
    apu.pulse({ at: apu.now, freq: 880, dur: 0.035, vol: v(10), duty: 0.25 }, 'sfx')
  },

  /** §4.2 — A5 then E6; the cancel sound's exact mirror. */
  menu_confirm: (apu) => {
    const at = apu.now
    apu.pulse({ at, freq: 880, dur: 0.04, vol: v(11), duty: 0.25 }, 'sfx')
    apu.pulse({ at: at + 0.04, freq: 1319, dur: 0.09, vol: v(11), duty: 0.25, decay: true }, 'sfx')
  },

  /** §4.3 — E6 then A5; the confirm sound's exact mirror. */
  menu_cancel: (apu) => {
    const at = apu.now
    apu.pulse({ at, freq: 1319, dur: 0.04, vol: v(10), duty: 0.25 }, 'sfx')
    apu.pulse({ at: at + 0.04, freq: 880, dur: 0.09, vol: v(10), duty: 0.25, decay: true }, 'sfx')
  },

  /** §4.4 — low pulse sagging to ~90Hz plus a dull noise thud. */
  bump: (apu) => {
    const at = apu.now
    apu.pulse({ at, freq: 131, slideTo: 90, dur: 0.09, vol: v(12), duty: 0.5, decay: true }, 'sfx')
    apu.noise({ at, dur: 0.06, vol: v(8), rate: 0.4, decay: true }, 'sfx')
  },

  /** §4.5 — one octave up-sweep, G4 → G5. */
  door: (apu) => {
    apu.pulse({ at: apu.now, freq: 392, slideTo: 784, dur: 0.11, vol: v(10), duty: 0.25 }, 'sfx')
  },

  /** §4.6 — falling arc, then the landing thump at 140ms. */
  ledge_hop: (apu) => {
    const at = apu.now
    apu.pulse({ at, freq: 659, slideTo: 440, dur: 0.14, vol: v(10), duty: 0.5 }, 'sfx')
    apu.noise({ at: at + 0.14, dur: 0.04, vol: v(10), rate: 0.4, decay: true }, 'sfx')
  },

  /** §4.7 — a 40ms high-mid rustle. */
  grass_step: (apu) => {
    apu.noise({ at: apu.now, dur: 0.04, vol: v(6), rate: 1.6, decay: true }, 'sfx')
  },

  /** §4.8 — four crossing sweeps: pulse A up 300→1500, pulse B down. */
  encounter_swirl: (apu) => {
    const at = apu.now
    for (let i = 0; i < 4; i++) {
      const t = at + i * 0.15
      apu.pulse({ at: t, freq: 300, slideTo: 1500, dur: 0.15, vol: v(13), duty: 0.5 }, 'sfx')
      apu.pulse({ at: t, freq: 1500, slideTo: 300, dur: 0.15, vol: v(13), duty: 0.5 }, 'sfx')
    }
  },

  /** §4.9 — middle of the hit ladder: mid crunch, modest drop. */
  hit_normal: (apu) => {
    const at = apu.now
    apu.noise({ at, dur: 0.09, vol: v(12), rate: 1.1, decay: true }, 'sfx')
    apu.pulse({ at, freq: 440, slideTo: 330, dur: 0.07, vol: v(10), duty: 0.5, decay: true }, 'sfx')
  },

  /** §4.10 — top of the ladder: long low crunch, noise layered 10ms late. */
  hit_super: (apu) => {
    const at = apu.now
    apu.pulse({ at, freq: 659, slideTo: 220, dur: 0.16, vol: v(13), duty: 0.5, decay: true }, 'sfx')
    apu.noise({ at: at + 0.01, dur: 0.18, vol: v(14), rate: 0.7, decay: true }, 'sfx')
  },

  /** §4.11 — bottom of the ladder: a high 50ms tick. */
  hit_weak: (apu) => {
    const at = apu.now
    apu.noise({ at, dur: 0.05, vol: v(8), rate: 2.2, decay: true }, 'sfx')
    apu.pulse({ at, freq: 523, slideTo: 440, dur: 0.04, vol: v(8), duty: 0.25 }, 'sfx')
  },

  /** §4.12 — two-octave fall, C5 → C3, fading as it drops. */
  faint_fall: (apu) => {
    apu.pulse({ at: apu.now, freq: 523, slideTo: 131, dur: 0.45, vol: v(12), duty: 0.5, decay: true }, 'sfx')
  },

  /** §4.13 — rising arc, G4 → D5. */
  charm_throw: (apu) => {
    apu.pulse({ at: apu.now, freq: 392, slideTo: 587, dur: 0.16, vol: v(9), duty: 0.25 }, 'sfx')
  },

  /** §4.14 — "wob-ble": E4 then C4. The battle scene spaces shakes ≥500ms. */
  charm_shake: (apu) => {
    const at = apu.now
    apu.pulse({ at, freq: 330, dur: 0.07, vol: v(10), duty: 0.5, decay: true }, 'sfx')
    apu.pulse({ at: at + 0.07, freq: 262, dur: 0.11, vol: v(10), duty: 0.5, decay: true }, 'sfx')
  },

  /**
   * §4.15 — two soft stages: a 12ms metallic tick, then a tiny falling
   * pulse. Quiet, dry, FINAL — the caller owes ≥250ms of silence after it.
   */
  charm_click: (apu) => {
    const at = apu.now
    apu.noise({ at, dur: 0.012, vol: v(9), rate: 2.8, decay: true }, 'sfx')
    apu.pulse({ at, freq: 1319, slideTo: 988, dur: 0.045, vol: v(8), duty: 0.125, decay: true }, 'sfx')
  },

  /** §4.16 — C-major climb, doubled an octave down at 40% volume. */
  levelup: (apu) => {
    const at = apu.now
    const steps: ReadonlyArray<readonly [number, number, number, boolean]> = [
      [0, 523, 0.07, false],
      [0.07, 659, 0.07, false],
      [0.14, 784, 0.07, false],
      [0.21, 1047, 0.28, true],
    ]
    for (const [t, freq, dur, decay] of steps) {
      apu.pulse({ at: at + t, freq, dur, vol: v(12), duty: 0.25, decay }, 'sfx')
      apu.pulse({ at: at + t, freq: freq / 2, dur, vol: v(12) * 0.4, duty: 0.25, decay }, 'sfx')
    }
  },

  /** §4.17 — the long fanfare climb, a 3rd below it, cymbal on the E6. */
  badge_get: (apu) => {
    const at = apu.now
    const steps: ReadonlyArray<readonly [number, number, number, number, boolean]> = [
      [0, 392, 330, 0.07, false],
      [0.07, 523, 392, 0.07, false],
      [0.14, 659, 523, 0.07, false],
      [0.21, 784, 659, 0.07, false],
      [0.28, 1047, 784, 0.14, false],
      [0.42, 1319, 1047, 0.35, true],
    ]
    for (const [t, lead, below, dur, decay] of steps) {
      apu.pulse({ at: at + t, freq: lead, dur, vol: v(13), duty: 0.25, decay }, 'sfx')
      apu.pulse({ at: at + t, freq: below, dur, vol: v(13) * 0.5, duty: 0.25, decay }, 'sfx')
    }
    apu.drum('crash', at + 0.42, 0.8, 'sfx')
  },

  /** §4.18 — D5 → G5, a B4 slipping in underneath to close the triad. */
  save_chime: (apu) => {
    const at = apu.now
    apu.pulse({ at, freq: 587, dur: 0.16, vol: v(9), duty: 0.125 }, 'sfx')
    apu.pulse({ at: at + 0.16, freq: 784, dur: 0.38, vol: v(9), duty: 0.125, decay: true }, 'sfx')
    apu.pulse({ at: at + 0.16, freq: 494, dur: 0.38, vol: v(6), duty: 0.125, decay: true }, 'sfx')
  },

  /** §4.19 — the text printer's voice: tiny, fixed, never above 0.1 gain. */
  text_blip: (apu) => {
    apu.pulse({ at: apu.now, freq: 1047, dur: 0.03, vol: 0.08, duty: 0.25 }, 'sfx')
  },
}
