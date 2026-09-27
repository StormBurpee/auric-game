/**
 * The bandleader. Holds one Song at a time, schedules a short lookahead
 * window of voices against AudioContext time every tick, loops at the
 * song's loop point, and can silence everything in a 50ms breath when
 * the scene changes. Songs are pure data; this is the only object that
 * turns them into sound.
 */
import type { ActiveVoice, Apu, Duty } from './apu'
import { freqOf } from './notation'
import type { DrumEvent, NoteEvent } from './notation'

export interface Track {
  duty?: Duty
  vol?: number
  notes: NoteEvent[]
}

export interface Song {
  bpm: number
  /** Total length in sixteenth steps. */
  length: number
  /** Step to rewind to at the end; omit for play-once jingles. */
  loopTo?: number
  pulse1?: Track
  pulse2?: Track
  wave?: Track
  noise?: DrumEvent[]
}

/** Seconds of audio scheduled ahead of the clock. */
const LOOKAHEAD = 0.35

type VoiceChannel = 'pulse1' | 'pulse2' | 'wave'
const VOICE_CHANNELS: readonly VoiceChannel[] = ['pulse1', 'pulse2', 'wave']
const DEFAULT_VOLS: Record<VoiceChannel, number> = { pulse1: 0.5, pulse2: 0.38, wave: 0.6 }
const DEFAULT_DUTY: Record<VoiceChannel, Duty> = { pulse1: 0.5, pulse2: 0.25, wave: 0.5 }

export class Sequencer {
  private song: Song | null = null
  private songKey: string | null = null
  /** AudioContext time of absolute step 0 of the current performance. */
  private startTime = 0
  /** Next absolute (monotonic, loop-unaware) step to schedule. */
  private nextStep = 0
  private active: ActiveVoice[] = []
  /** Step-indexed events, precomputed per song. */
  private voiceEvents = new Map<VoiceChannel, Map<number, NoteEvent[]>>()
  private drumEvents = new Map<number, DrumEvent[]>()

  constructor(private readonly apu: Apu) {}

  get playingKey(): string | null {
    return this.songKey
  }

  /** Start a song. Re-playing the song already on is a no-op unless `restart`. */
  play(key: string, song: Song, opts?: { restart?: boolean }): void {
    if (!this.apu.context) {
      // Audio not unlocked yet; remember intent so the first gesture starts music.
      this.song = song
      this.songKey = key
      this.nextStep = -1
      return
    }
    if (key === this.songKey && this.nextStep >= 0 && opts?.restart !== true) return
    this.silence()
    this.song = song
    this.songKey = key
    this.begin()
  }

  private begin(): void {
    const song = this.song!
    this.startTime = this.apu.now + 0.08
    this.nextStep = 0
    this.voiceEvents.clear()
    this.drumEvents.clear()
    for (const ch of VOICE_CHANNELS) {
      const track = song[ch]
      if (!track) continue
      const byStep = new Map<number, NoteEvent[]>()
      for (const ev of track.notes) {
        const list = byStep.get(ev.step) ?? []
        list.push(ev)
        byStep.set(ev.step, list)
      }
      this.voiceEvents.set(ch, byStep)
    }
    for (const ev of song.noise ?? []) {
      const list = this.drumEvents.get(ev.step) ?? []
      list.push(ev)
      this.drumEvents.set(ev.step, list)
    }
  }

  stop(): void {
    this.silence()
    this.song = null
    this.songKey = null
  }

  private silence(): void {
    const now = this.apu.now
    for (const v of this.active) v.kill(now)
    this.active = []
  }

  /** Map a monotonic step onto the song's timeline, honouring the loop point. */
  private songStepOf(absStep: number): number | null {
    const song = this.song!
    if (absStep < song.length) return absStep
    if (song.loopTo === undefined) return null
    const span = song.length - song.loopTo
    return song.loopTo + ((absStep - song.length) % span)
  }

  /** Call once per game tick. */
  update(): void {
    if (!this.song) return
    if (this.nextStep < 0) {
      // Was queued before audio unlock; start properly once the context exists.
      if (this.apu.context) this.begin()
      else return
    }
    const song = this.song
    const stepDur = 60 / (song.bpm * 4)
    // A hidden tab stops rAF but not the audio clock; skip the steps we
    // slept through instead of scheduling thousands of past voices.
    const behind = Math.floor((this.apu.now - (this.startTime + this.nextStep * stepDur)) / stepDur)
    if (behind > 0) this.nextStep += behind
    const horizon = this.apu.now + LOOKAHEAD
    while (this.startTime + this.nextStep * stepDur < horizon) {
      const songStep = this.songStepOf(this.nextStep)
      if (songStep === null) {
        this.song = null
        this.songKey = null
        break
      }
      const at = this.startTime + this.nextStep * stepDur
      for (const ch of VOICE_CHANNELS) {
        const events = this.voiceEvents.get(ch)?.get(songStep)
        if (!events) continue
        const track = song[ch]!
        for (const ev of events) {
          const voice =
            ch === 'wave'
              ? this.apu.wave({ at, freq: freqOf(ev.midi), dur: ev.len * stepDur * 0.92, vol: track.vol ?? DEFAULT_VOLS[ch] })
              : this.apu.pulse({
                  at,
                  freq: freqOf(ev.midi),
                  dur: ev.len * stepDur * 0.92,
                  vol: track.vol ?? DEFAULT_VOLS[ch],
                  duty: track.duty ?? DEFAULT_DUTY[ch],
                })
          if (voice) this.active.push(voice)
        }
      }
      for (const ev of this.drumEvents.get(songStep) ?? []) {
        this.active.push(...this.apu.drum(ev.kind, at))
      }
      this.nextStep++
    }
    // Let finished voices go.
    const now = this.apu.now
    this.active = this.active.filter((v) => v.endAt > now)
  }
}
