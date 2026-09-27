/**
 * One save slot, versioned, in localStorage — our battery-backed SRAM.
 * Writes are wrapped so a full disk or private-mode browser degrades to
 * "save failed" instead of a crash, and version mismatches get a chance
 * to migrate before we give up on someone's adventure.
 */
export interface SaveEnvelope<T> {
  version: number
  savedAt: string
  data: T
}

export class SaveSlot<T> {
  constructor(
    private readonly key: string,
    private readonly version: number,
    private readonly migrate?: (old: unknown, fromVersion: number) => T | null,
  ) {}

  exists(): boolean {
    try {
      return localStorage.getItem(this.key) !== null
    } catch {
      return false
    }
  }

  load(): T | null {
    try {
      const raw = localStorage.getItem(this.key)
      if (raw === null) return null
      const env = JSON.parse(raw) as SaveEnvelope<T>
      if (env.version === this.version) return env.data
      return this.migrate?.(env.data, env.version) ?? null
    } catch {
      return null
    }
  }

  store(data: T): boolean {
    try {
      const env: SaveEnvelope<T> = { version: this.version, savedAt: new Date().toISOString(), data }
      localStorage.setItem(this.key, JSON.stringify(env))
      return true
    } catch {
      return false
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key)
    } catch {
      // Nothing to clear or nothing we can do.
    }
  }
}
