/**
 * Four voices, like the hardware we loved: two pulse channels with real
 * duty cycles (12.5/25/50/75% — built from their Fourier series, not a
 * generic square), a soft "wave" channel for bass, and an LFSR noise
 * channel for percussion. Everything schedules against AudioContext
 * time, so the sequencer can look ahead and the mix never stutters.
 *
 * The context is created lazily on the first user gesture (browser
 * autoplay law) — call `unlock()` from an input handler.
 */
export type Duty = 0.125 | 0.25 | 0.5 | 0.75

export type DrumKind = 'kick' | 'snare' | 'hat' | 'crash'

export interface VoiceOpts {
  /** Absolute AudioContext time. */
  at: number
  freq: number
  /** Seconds. */
  dur: number
  /** 0..1 */
  vol: number
  duty?: Duty
  /** Glide to this frequency across the note (pitch slides, encounter swirls). */
  slideTo?: number
  /** Exponential die-away instead of a gated sustain (plucks, jingle notes). */
  decay?: boolean
}

export interface ActiveVoice {
  gain: GainNode
  endAt: number
  kill(at: number): void
}

const PULSE_HARMONICS = 32

/** Default music-bus level; mix drivers dim from here (e.g. a night rule). */
export const MUSIC_VOL = 0.55

export class Apu {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private sfxBus!: GainNode
  private duties!: Map<Duty, PeriodicWave>
  private noiseBuffer!: AudioBuffer

  /** Null until the first user gesture unlocks audio. */
  get context(): AudioContext | null {
    return this.ctx
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running'
  }

  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.35
      this.master.connect(this.ctx.destination)
      this.musicBus = this.ctx.createGain()
      this.musicBus.gain.value = MUSIC_VOL
      this.musicBus.connect(this.master)
      this.sfxBus = this.ctx.createGain()
      this.sfxBus.gain.value = 0.75
      this.sfxBus.connect(this.master)
      this.duties = new Map(
        ([0.125, 0.25, 0.5, 0.75] as Duty[]).map((d) => [d, this.buildPulseWave(d)]),
      )
      this.noiseBuffer = this.buildNoiseBuffer()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setMusicVolume(v: number): void {
    if (this.ctx) this.musicBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  /** Fourier coefficients of a pulse train with the given duty cycle. */
  private buildPulseWave(duty: Duty): PeriodicWave {
    const real = new Float32Array(PULSE_HARMONICS + 1)
    const imag = new Float32Array(PULSE_HARMONICS + 1)
    for (let n = 1; n <= PULSE_HARMONICS; n++) {
      real[n] = (2 / (Math.PI * n)) * Math.sin(2 * Math.PI * n * duty)
      imag[n] = (2 / (Math.PI * n)) * (1 - Math.cos(2 * Math.PI * n * duty))
    }
    return this.ctx!.createPeriodicWave(real, imag, { disableNormalization: false })
  }

  /** Two seconds of 15-bit LFSR noise for the handheld-style noise channel. */
  private buildNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!
    const length = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let lfsr = 0x7fff
    for (let i = 0; i < length; i++) {
      const bit = (lfsr ^ (lfsr >> 1)) & 1
      lfsr = (lfsr >> 1) | (bit << 14)
      data[i] = bit === 1 ? 0.6 : -0.6
    }
    return buffer
  }

  private envelope(at: number, dur: number, vol: number, decay: boolean): GainNode {
    const g = this.ctx!.createGain()
    g.gain.value = 0 // a voice killed before its start must decay from silence, not the default 1
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(vol, at + 0.003)
    if (decay) {
      g.gain.setTargetAtTime(0, at + 0.01, Math.max(0.02, dur / 4))
    } else {
      g.gain.setValueAtTime(vol, at + dur - 0.012)
      g.gain.linearRampToValueAtTime(0, at + dur)
    }
    return g
  }

  private voice(
    makeSource: () => OscillatorNode | AudioBufferSourceNode,
    opts: { at: number; dur: number; vol: number; decay?: boolean },
    bus: 'music' | 'sfx',
  ): ActiveVoice {
    const ctx = this.ctx!
    const src = makeSource()
    const gain = this.envelope(opts.at, opts.dur, opts.vol, opts.decay === true)
    src.connect(gain)
    gain.connect(bus === 'music' ? this.musicBus : this.sfxBus)
    const endAt = opts.at + opts.dur + 0.1
    src.start(opts.at)
    src.stop(endAt)
    return {
      gain,
      endAt,
      kill(at: number) {
        gain.gain.cancelScheduledValues(at)
        gain.gain.setTargetAtTime(0, at, 0.012)
        try {
          src.stop(at + 0.08)
        } catch {
          // already stopped
        }
      },
    }
  }

  pulse(opts: VoiceOpts, bus: 'music' | 'sfx' = 'music'): ActiveVoice | null {
    if (!this.ctx) return null
    return this.voice(() => {
      const osc = this.ctx!.createOscillator()
      osc.setPeriodicWave(this.duties.get(opts.duty ?? 0.5)!)
      osc.frequency.setValueAtTime(opts.freq, opts.at)
      if (opts.slideTo !== undefined) {
        osc.frequency.linearRampToValueAtTime(opts.slideTo, opts.at + opts.dur)
      }
      return osc
    }, opts, bus)
  }

  /** The "wave" channel: a mellow triangle for basslines and pads. */
  wave(opts: VoiceOpts, bus: 'music' | 'sfx' = 'music'): ActiveVoice | null {
    if (!this.ctx) return null
    return this.voice(() => {
      const osc = this.ctx!.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(opts.freq, opts.at)
      if (opts.slideTo !== undefined) {
        osc.frequency.linearRampToValueAtTime(opts.slideTo, opts.at + opts.dur)
      }
      return osc
    }, opts, bus)
  }

  noise(
    opts: { at: number; dur: number; vol: number; rate?: number; decay?: boolean },
    bus: 'music' | 'sfx' = 'music',
  ): ActiveVoice | null {
    if (!this.ctx) return null
    return this.voice(() => {
      const src = this.ctx!.createBufferSource()
      src.buffer = this.noiseBuffer
      src.loop = true
      src.playbackRate.setValueAtTime(opts.rate ?? 1, opts.at)
      return src
    }, { at: opts.at, dur: opts.dur, vol: opts.vol, ...(opts.decay !== undefined ? { decay: opts.decay } : {}) }, bus)
  }

  /** Percussion recipes on the noise + wave channels. */
  drum(kind: DrumKind, at: number, vol = 1, bus: 'music' | 'sfx' = 'music'): ActiveVoice[] {
    if (!this.ctx) return []
    const out: (ActiveVoice | null)[] = []
    switch (kind) {
      case 'kick':
        out.push(this.wave({ at, freq: 140, slideTo: 42, dur: 0.1, vol: 0.9 * vol, decay: true }, bus))
        out.push(this.noise({ at, dur: 0.03, vol: 0.25 * vol, rate: 0.4, decay: true }, bus))
        break
      case 'snare':
        out.push(this.noise({ at, dur: 0.11, vol: 0.5 * vol, rate: 1.1, decay: true }, bus))
        out.push(this.wave({ at, freq: 190, slideTo: 120, dur: 0.05, vol: 0.3 * vol, decay: true }, bus))
        break
      case 'hat':
        out.push(this.noise({ at, dur: 0.04, vol: 0.22 * vol, rate: 2.4, decay: true }, bus))
        break
      case 'crash':
        out.push(this.noise({ at, dur: 0.5, vol: 0.45 * vol, rate: 1.8, decay: true }, bus))
        break
    }
    return out.filter((v): v is ActiveVoice => v !== null)
  }
}
