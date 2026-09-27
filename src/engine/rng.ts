/**
 * Deterministic pseudo-randomness (mulberry32).
 *
 * Every system that rolls dice — damage ranges, encounter slots, capture
 * wobbles — draws from an explicit `Rng` instead of `Math.random()`, so any
 * sequence of game events can be reproduced exactly from a seed. Tests pin
 * battle outcomes; bugs replay honestly.
 */
export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Next float in [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n)
  }

  /** Uniform integer in [lo, hi], inclusive on both ends. */
  range(lo: number, hi: number): number {
    return lo + this.int(hi - lo + 1)
  }

  /** Gen-2-style byte roll: uniform integer in [0, 255]. */
  byte(): number {
    return this.int(256)
  }

  /** True with probability p, where p is in [0, 1]. */
  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array')
    return items[this.int(items.length)] as T
  }

  /** Derive an independent stream (e.g. one per battle) without disturbing this one's replayability. */
  fork(): Rng {
    return new Rng((this.int(0xffffffff) ^ 0x9e3779b9) >>> 0)
  }
}
