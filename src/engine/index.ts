/**
 * The engine: everything below the game. It knows about pixels,
 * palettes, ticks, buttons, voices, scenes and saves — and nothing
 * about Kindra, Charms, or Ambervale. That line is load-bearing.
 */
export { Rng } from './rng'
export { sprite, symmetric, flipX, frames } from './sprites'
export type { Sprite } from './sprites'
export { hex, pal, tintRgb } from './palettes'
export type { Rgb, Palette, DayPeriod } from './palettes'
export { FrameBuffer, SCREEN_W, SCREEN_H, applySpotlight } from './renderer'
export type { BlitOpts } from './renderer'
export { Input, BUTTONS } from './input'
export type { Button } from './input'
export { startLoop, TICK_HZ, TICK_MS } from './loop'
export { Scheduler, delay, until } from './coroutine'
export type { Wait, Task, Handle } from './coroutine'
export { SceneStack } from './scene'
export type { Scene } from './scene'
export { fadeOut, fadeIn, flashes } from './transitions'
export { SaveSlot } from './save'
export type { SaveEnvelope } from './save'
export { Apu, MUSIC_VOL } from './audio/apu'
export type { Duty, DrumKind, VoiceOpts, ActiveVoice } from './audio/apu'
export { notes, drums, midiOf, freqOf, lastStep } from './audio/notation'
export type { NoteEvent, DrumEvent } from './audio/notation'
export { Sequencer } from './audio/sequencer'
export type { Song, Track } from './audio/sequencer'
