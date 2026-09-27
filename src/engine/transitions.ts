/**
 * The little curtains between moments: fade to black, fade back in,
 * flash white for a wild encounter. All of them are coroutines over the
 * framebuffer's post-effect dials, so any scene can compose them with a
 * plain `yield*`.
 */
import type { Task } from './coroutine'
import type { FrameBuffer } from './renderer'

export function* fadeOut(fb: FrameBuffer, ticks = 16): Task<void> {
  for (let i = 1; i <= ticks; i++) {
    fb.fade = i / ticks
    yield 1
  }
  fb.fade = 1
}

export function* fadeIn(fb: FrameBuffer, ticks = 16): Task<void> {
  for (let i = ticks - 1; i >= 0; i--) {
    fb.fade = i / ticks
    yield 1
  }
  fb.fade = 0
}

/** The encounter strobe: N quick white pulses. */
export function* flashes(fb: FrameBuffer, count = 3, period = 8): Task<void> {
  for (let i = 0; i < count; i++) {
    fb.flash = 1
    yield period / 2
    fb.flash = 0
    yield period / 2
  }
}
