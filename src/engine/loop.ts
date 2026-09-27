/**
 * Fixed-timestep heartbeat at 60 ticks per second (the DMG ran at 59.7;
 * we round with love). Updates are deterministic and frame-counted;
 * rendering rides requestAnimationFrame. If the tab sleeps, we drop the
 * backlog instead of fast-forwarding the world — coming back to your
 * game should never mean watching it convulse.
 */
export const TICK_HZ = 60
export const TICK_MS = 1000 / TICK_HZ

/** Most ticks we'll run to catch up after a stall before discarding time. */
const MAX_CATCH_UP = 5

export interface LoopHooks {
  update: () => void
  render: () => void
}

export function startLoop({ update, render }: LoopHooks): () => void {
  let rafId = 0
  let last = performance.now()
  let acc = 0
  let running = true

  const frame = (now: number) => {
    if (!running) return
    acc += now - last
    last = now
    if (acc > MAX_CATCH_UP * TICK_MS) acc = TICK_MS
    while (acc >= TICK_MS) {
      acc -= TICK_MS
      update()
    }
    render()
    rafId = requestAnimationFrame(frame)
  }
  rafId = requestAnimationFrame(frame)

  return () => {
    running = false
    cancelAnimationFrame(rafId)
  }
}
