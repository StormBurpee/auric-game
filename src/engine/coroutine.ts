/**
 * Cutscenes, dialog, battles — game logic that unfolds over time — are
 * written as generators that read like screenplays:
 *
 *   function* (ctx) {
 *     yield* ctx.say('story.lab.1')
 *     const pick = yield* ctx.ask('Which Kindra?', ['VERDIL', 'EMBERIT', 'RILLET'])
 *     ...
 *   }
 *
 * A task yields one of two primitives: a number (wait that many ticks)
 * or a predicate (wait until true). Composition happens with `yield*`,
 * which threads return values through naturally — no callback pyramids,
 * no ad-hoc state machines, just sequence on the page matching sequence
 * in time.
 */
export type Wait = number | (() => boolean)

export type Task<R = void> = Generator<Wait, R, void>

export interface Handle<R = void> {
  readonly done: boolean
  readonly result: R | undefined
  cancel(): void
}

interface Active {
  gen: Task<unknown>
  pending: Wait | null
  framesLeft: number
  handle: { done: boolean; result: unknown; cancelled: boolean }
}

export class Scheduler {
  private tasks: Active[] = []

  spawn<R>(gen: Task<R>): Handle<R> {
    const handle = { done: false, result: undefined as unknown, cancelled: false }
    const active: Active = { gen, pending: null, framesLeft: 0, handle }
    this.tasks.push(active)
    return {
      get done() {
        return handle.done
      },
      get result() {
        return handle.result as R | undefined
      },
      cancel() {
        handle.cancelled = true
      },
    }
  }

  /** Advance every task by one tick. Tasks spawned mid-tick start next tick. */
  tick(): void {
    const batch = this.tasks
    this.tasks = []
    const survivors: Active[] = []
    for (const t of batch) {
      if (t.handle.cancelled) {
        t.gen.return?.(undefined)
        continue
      }
      if (!this.step(t)) survivors.push(t)
    }
    // Tasks spawned during stepping were pushed onto the fresh array; keep them after survivors.
    this.tasks = [...survivors, ...this.tasks]
  }

  /** @returns true when the task completed. */
  private step(t: Active): boolean {
    // Honour an outstanding wait before resuming.
    if (typeof t.pending === 'number') {
      if (--t.framesLeft > 0) return false
      t.pending = null
    } else if (typeof t.pending === 'function') {
      if (!t.pending()) return false
      t.pending = null
    }
    const r = t.gen.next()
    if (r.done) {
      t.handle.done = true
      t.handle.result = r.value
      return true
    }
    if (typeof r.value === 'number') {
      t.pending = r.value
      t.framesLeft = Math.max(1, Math.floor(r.value))
    } else {
      t.pending = r.value
    }
    return false
  }

  get busy(): boolean {
    return this.tasks.length > 0
  }
}

/** Wait `n` ticks. */
export function* delay(n: number): Task<void> {
  yield n
}

/** Wait until `pred` returns true. */
export function* until(pred: () => boolean): Task<void> {
  yield pred
}
