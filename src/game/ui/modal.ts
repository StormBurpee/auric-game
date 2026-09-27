/**
 * The widget protocol every menu follows: a translucent Scene that owns
 * the input while it is on top, raises `done` from its own update(),
 * and is pushed/popped around a coroutine that sleeps on it. Because a
 * scene's verdict lands one Scheduler tick before the coroutine acts on
 * it, an edge-latched press can never leak from one widget into the
 * next — the handoff itself is the debounce.
 */
import type { Scene, Task } from '../../engine'
import type { Game } from '../game'

export interface ModalScene extends Scene {
  /** Raised by the scene's own update() when its job is finished. */
  readonly done: boolean
}

/**
 * Push `scene`, sleep until it reports done, pop it — even when the
 * surrounding task is cancelled mid-dialog (the finally pops). Returns
 * the scene so callers read its typed result fields directly.
 */
export function* runScene<S extends ModalScene>(game: Game, scene: S): Task<S> {
  game.scenes.push(scene)
  try {
    yield () => scene.done
  } finally {
    game.scenes.pop()
  }
  return scene
}
