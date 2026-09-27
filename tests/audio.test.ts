/**
 * The contract of docs/AUDIO.md: every §2 track and §4 effect exists,
 * every song's skeleton matches the spec table (BPM, bar count × meter,
 * loop point), and no event sticks out past the end of its song — the
 * sequencer schedules this data verbatim, so a stray event would bleed
 * across the loop seam.
 *
 * SFX are exercised against a recording Apu probe: each effect must
 * schedule at least one voice, only on the 'sfx' bus, never in the past.
 */
import { describe, expect, it } from 'vitest'
import type { Apu, DrumKind, Song, Track } from '../src/engine'
import { lastStep, midiOf } from '../src/engine'
import { SFX, SONGS } from '../src/game/audio'

// ── Songs ───────────────────────────────────────────────────────────────────

/** docs/AUDIO.md §2 tables: BPM, total sixteenth steps, loop point. */
const SONG_SPECS: Record<string, { bpm: number; length: number; loopTo?: number }> = {
  title: { bpm: 96, length: 16 * 16, loopTo: 0 },
  dawnfern: { bpm: 80, length: 16 * 12, loopTo: 0 }, //  3/4: 12 steps per bar
  trail: { bpm: 116, length: 16 * 16, loopTo: 0 },
  bellmere: { bpm: 90, length: 16 * 12, loopTo: 0 }, //  6/8 at eighth = 180
  loomspire: { bpm: 96, length: 16 * 16, loopTo: 0 },
  battle_wild: { bpm: 144, length: 24 * 16, loopTo: 2 * 16 }, //  loop skips the intro
  battle_trainer: { bpm: 150, length: 24 * 16, loopTo: 2 * 16 },
  victory: { bpm: 132, length: 6 * 16 },
  haven_heal: { bpm: 120, length: 2 * 16 },
  evolution: { bpm: 100, length: 8 * 16 },
  spire_night: { bpm: 64, length: 8 * 16, loopTo: 0 },
}

/** Songs whose spec writes a NOISE part (dawnfern and haven_heal are silent). */
const DRUMMED = [
  'title', 'trail', 'bellmere', 'loomspire', 'battle_wild', 'battle_trainer',
  'victory', 'evolution', 'spire_night',
] as const

const C2 = midiOf('C2')
const C8 = midiOf('C8')

function tracksOf(song: Song): ReadonlyArray<readonly [string, Track | undefined]> {
  return [['pulse1', song.pulse1], ['pulse2', song.pulse2], ['wave', song.wave]]
}

describe('SONGS registry', () => {
  it('contains exactly the 11 tracks of docs/AUDIO.md §2', () => {
    expect(Object.keys(SONGS).sort()).toEqual(Object.keys(SONG_SPECS).sort())
  })

  for (const [key, spec] of Object.entries(SONG_SPECS)) {
    describe(key, () => {
      const song = SONGS[key]

      it('pins bpm, length and loop point to the spec table', () => {
        expect(song).toBeDefined()
        expect(song!.bpm).toBe(spec.bpm)
        expect(song!.bpm).toBeGreaterThanOrEqual(60)
        expect(song!.bpm).toBeLessThanOrEqual(200)
        expect(song!.length).toBe(spec.length)
        expect(song!.length).toBeGreaterThan(0)
        expect(song!.loopTo).toBe(spec.loopTo)
        if (song!.loopTo !== undefined) {
          expect(song!.loopTo).toBeGreaterThanOrEqual(0)
          expect(song!.loopTo).toBeLessThan(song!.length)
        }
      })

      it('scores lead, harmony and bass', () => {
        for (const [name, track] of tracksOf(song!)) {
          expect(track, `${key}.${name}`).toBeDefined()
          expect(track!.notes.length, `${key}.${name}`).toBeGreaterThan(0)
        }
      })

      it('keeps every note event inside the song and the C2–C8 range', () => {
        for (const [name, track] of tracksOf(song!)) {
          for (const ev of track!.notes) {
            expect(ev.step, `${key}.${name} step`).toBeGreaterThanOrEqual(0)
            expect(ev.len, `${key}.${name} len`).toBeGreaterThan(0)
            expect(ev.step + ev.len, `${key}.${name} end`).toBeLessThanOrEqual(song!.length)
            expect(ev.midi, `${key}.${name} low`).toBeGreaterThanOrEqual(C2)
            expect(ev.midi, `${key}.${name} high`).toBeLessThanOrEqual(C8)
          }
        }
      })

      it('fills every part to the final barline', () => {
        // A mis-summed middle bar would shift everything after it early,
        // which `step + len <= length` alone cannot see. Every part ends
        // flush with the last bar, except spire_night's tolls, whose
        // spec writes bar 8 as silence (toll bar 7 ends at step 104).
        for (const [name, track] of tracksOf(song!)) {
          const expected = key === 'spire_night' && name === 'pulse2' ? 104 : song!.length
          expect(lastStep(track!.notes), `${key}.${name}`).toBe(expected)
        }
      })

      it('keeps every drum hit inside the song', () => {
        for (const ev of song!.noise ?? []) {
          expect(ev.step).toBeGreaterThanOrEqual(0)
          expect(ev.step).toBeLessThan(song!.length)
        }
      })
    })
  }

  it('writes drums exactly where the spec does', () => {
    for (const key of DRUMMED) {
      expect(SONGS[key]?.noise?.length, key).toBeGreaterThan(0)
    }
    expect(SONGS['dawnfern']?.noise).toBeUndefined()
    expect(SONGS['haven_heal']?.noise).toBeUndefined()
  })

  it('never loops the jingles', () => {
    for (const key of ['victory', 'haven_heal', 'evolution']) {
      expect(SONGS[key]?.loopTo, key).toBeUndefined()
    }
  })
})

// ── SFX ─────────────────────────────────────────────────────────────────────

const SFX_KEYS = [
  'menu_move', 'menu_confirm', 'menu_cancel', 'bump', 'door', 'ledge_hop',
  'grass_step', 'encounter_swirl', 'hit_normal', 'hit_super', 'hit_weak',
  'faint_fall', 'charm_throw', 'charm_shake', 'charm_click', 'levelup',
  'badge_get', 'save_chime', 'text_blip',
] as const

interface ProbeCall {
  fn: 'pulse' | 'wave' | 'noise' | 'drum'
  at: number
  dur: number
  vol: number
  bus: string
}

/** An Apu stand-in that records scheduling instead of making sound. */
function probeApu(now: number): { apu: Apu; calls: ProbeCall[] } {
  const calls: ProbeCall[] = []
  const record =
    (fn: 'pulse' | 'wave' | 'noise') =>
    (opts: { at: number; dur: number; vol: number }, bus: string = 'music'): null => {
      calls.push({ fn, at: opts.at, dur: opts.dur, vol: opts.vol, bus })
      return null
    }
  const probe = {
    now,
    pulse: record('pulse'),
    wave: record('wave'),
    noise: record('noise'),
    drum: (_kind: DrumKind, at: number, vol = 1, bus: string = 'music'): never[] => {
      calls.push({ fn: 'drum', at, dur: 0, vol, bus })
      return []
    },
  }
  return { apu: probe as unknown as Apu, calls }
}

describe('SFX registry', () => {
  it('contains exactly the 19 effects of docs/AUDIO.md §4', () => {
    expect(Object.keys(SFX).sort()).toEqual([...SFX_KEYS].sort())
  })

  for (const key of SFX_KEYS) {
    it(`${key} schedules on the sfx bus, never in the past`, () => {
      const { apu, calls } = probeApu(1.5)
      SFX[key]!(apu)
      expect(calls.length).toBeGreaterThan(0)
      for (const c of calls) {
        expect(c.bus, `${key} bus`).toBe('sfx')
        expect(c.at, `${key} time`).toBeGreaterThanOrEqual(1.5)
        expect(c.vol, `${key} vol`).toBeGreaterThan(0)
        expect(c.vol, `${key} vol`).toBeLessThanOrEqual(1)
      }
    })
  }

  it('encounter_swirl crosses four up-sweeps with four down-sweeps', () => {
    const { apu, calls } = probeApu(0)
    SFX['encounter_swirl']!(apu)
    expect(calls.filter((c) => c.fn === 'pulse')).toHaveLength(8)
  })

  it('charm_click is two soft stages (tick + falling pulse)', () => {
    const { apu, calls } = probeApu(0)
    SFX['charm_click']!(apu)
    expect(calls.length).toBeGreaterThanOrEqual(2)
    expect(calls.some((c) => c.fn === 'noise')).toBe(true)
    expect(calls.some((c) => c.fn === 'pulse')).toBe(true)
  })

  it('text_blip stays tiny: one short pulse at gain ≤ 0.1', () => {
    const { apu, calls } = probeApu(0)
    SFX['text_blip']!(apu)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.fn).toBe('pulse')
    expect(calls[0]!.vol).toBeLessThanOrEqual(0.1)
    expect(calls[0]!.dur).toBeLessThanOrEqual(0.04)
  })
})
