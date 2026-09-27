/**
 * The soundtrack registry: songs and sound effects, transcribed from
 * docs/AUDIO.md into the engine's notation.
 *
 * Song data lives in songs.ts (§2), effects in sfx.ts (§4); this module
 * is the single seam the rest of the game plays through. The §3 NIGHT
 * RULE is a playback-time transform owned by whoever drives the mix
 * (apu.setMusicVolume), not by the note data.
 */
import type { Game } from '../game'
import { SFX } from './sfx'
import { SONGS } from './songs'

export { SFX, SONGS }

export function playSong(game: Game, key: string, opts?: { restart?: boolean }): void {
  const song = SONGS[key]
  if (song) game.seq.play(key, song, opts)
}

export function playSfx(game: Game, key: string): void {
  if (!game.apu.context) return
  SFX[key]?.(game.apu)
}
