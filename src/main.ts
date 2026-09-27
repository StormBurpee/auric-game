/**
 * Boot: build the machine, wrap it in the STORMBOY, start the heart.
 *
 * Order of a tick: latch input, advance the frame counter and play
 * clock, advance coroutines (scripts, battles, dialogs), let the top
 * scene think, keep the bandleader's lookahead full. Rendering happens
 * on the rAF side, top of the scene stack down.
 */
import {
  Apu,
  FrameBuffer,
  Input,
  MUSIC_VOL,
  Rng,
  SaveSlot,
  SceneStack,
  Scheduler,
  Sequencer,
  SCREEN_H,
  SCREEN_W,
  startLoop,
  TICK_HZ,
} from './engine'
import type { DayPeriod } from './engine'
import { currentPeriod, dayOfWeek } from './game/clock'
import type { Game } from './game/game'
import { TitleScene } from './game/scenes/title'
import { migrateSave, newSave } from './game/state'
import type { SaveData } from './game/types'
import { mountShell } from './shell/shell'

const canvas = document.createElement('canvas')
canvas.width = SCREEN_W
canvas.height = SCREEN_H
const ctx = canvas.getContext('2d', { alpha: false })!

const apu = new Apu()
const input = new Input()
input.attachKeyboard(window)
input.onGesture = () => apu.unlock()

const game: Game = {
  fb: new FrameBuffer(),
  input,
  scenes: new SceneStack(),
  tasks: new Scheduler(),
  apu,
  seq: new Sequencer(apu),
  rng: new Rng(Date.now() >>> 0),
  save: new SaveSlot<SaveData>('auric:save', 3, migrateSave),
  state: newSave('STORM'),
  frames: 0,
  debugPeriod: null,
  debugDay: null,
  period: () => currentPeriod(game.debugPeriod),
  day: () => dayOfWeek(game.debugDay),
}

mountShell({ canvas, input })

// F1 cycles the day/night clock for anyone who can't wait for dusk;
// F2 cycles the calendar for anyone who can't wait for market Saturday.
const PERIODS: (DayPeriod | null)[] = [null, 'morning', 'day', 'night']
window.addEventListener('keydown', (e) => {
  if (e.code === 'F1') {
    e.preventDefault()
    game.debugPeriod = PERIODS[(PERIODS.indexOf(game.debugPeriod) + 1) % PERIODS.length] ?? null
  }
  if (e.code === 'F2') {
    e.preventDefault()
    game.debugDay = game.debugDay === null ? 0 : game.debugDay >= 6 ? null : ((game.debugDay + 1) as typeof game.debugDay)
  }
})

game.scenes.push(new TitleScene(game))

// Dev-only hooks for the e2e screenshot harness (scripts/*.mjs): teleport
// anywhere with a ready-made party. Stripped from production builds.
if (import.meta.env.DEV) {
  void Promise.all([
    import('./game/world/overworld'),
    import('./game/kindra'),
    import('./game/state'),
  ]).then(([{ OverworldScene }, { makeKindra }, { bagAdd }]) => {
    Object.assign(window as object, {
      __auric: {
        game,
        jump(map: string, x: number, y: number, starter?: string) {
          if (starter && game.state.party.length === 0) {
            game.state.party = [makeKindra(starter, 8)]
            game.state.starter = starter
            bagAdd(game.state, 'CHARM', 10)
            bagAdd(game.state, 'TONIC', 5)
          }
          game.state.pos = { map, x, y, facing: 'down' }
          game.scenes.reset(new OverworldScene(game))
        },
      },
    })
  })
}

// AUDIO.md §3 NIGHT RULE: these overworld themes play at 0.8x volume after
// dark (battles, jingles and spire_night are exempt by key).
const NIGHT_RULE_SONGS = new Set(['dawnfern', 'trail', 'bellmere', 'loomspire'])

startLoop({
  update() {
    game.input.beginFrame()
    game.frames++
    if (game.frames % TICK_HZ === 0) game.state.playSeconds++
    game.tasks.tick()
    game.scenes.update()
    if (apu.context) {
      const night = game.period() === 'night' && NIGHT_RULE_SONGS.has(game.seq.playingKey ?? '')
      apu.setMusicVolume(night ? MUSIC_VOL * 0.8 : MUSIC_VOL)
    }
    game.seq.update()
  },
  render() {
    game.scenes.draw(game.fb)
    game.fb.present(ctx)
  },
})
