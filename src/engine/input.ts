/**
 * Eight buttons. That's the whole vocabulary, same as the hardware:
 * a D-pad, A, B, Start, Select. Keyboard and the on-screen shell both
 * feed the same virtual pad, and the game polls edge-latched state once
 * per tick — no event-ordering surprises inside game logic.
 */
export type Button = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select'

export const BUTTONS: readonly Button[] = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select']

const KEY_MAP: Record<string, Button> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyX: 'a',
  Space: 'a',
  KeyZ: 'b',
  Backspace: 'b',
  Enter: 'start',
  ShiftLeft: 'select',
  ShiftRight: 'select',
}

export class Input {
  private live = new Set<Button>()
  /** Buttons that went down since the last latch — a press and release
   *  inside one tick (fast taps, synthetic input) still registers. */
  private transient = new Set<Button>()
  private current = new Set<Button>()
  private previous = new Set<Button>()
  /** D-pad press order; the most recent held direction wins, like thumbs do. */
  private dpadStack: Button[] = []
  /** Called on any user gesture — the hook that unlocks WebAudio. */
  onGesture: (() => void) | null = null

  attachKeyboard(target: Window): void {
    target.addEventListener('keydown', (e) => {
      const b = KEY_MAP[e.code]
      if (!b) return
      e.preventDefault()
      if (!e.repeat) this.setDown(b, true)
      this.onGesture?.()
    })
    target.addEventListener('keyup', (e) => {
      const b = KEY_MAP[e.code]
      if (!b) return
      e.preventDefault()
      this.setDown(b, false)
    })
    target.addEventListener('blur', () => {
      this.live.clear()
      this.dpadStack = []
    })
  }

  /** Virtual pad input (the shell's touch buttons call this). */
  setDown(b: Button, down: boolean): void {
    if (down) {
      this.live.add(b)
      this.transient.add(b)
      if (isDpad(b)) {
        this.dpadStack = this.dpadStack.filter((d) => d !== b)
        this.dpadStack.push(b)
      }
    } else {
      this.live.delete(b)
      if (isDpad(b)) this.dpadStack = this.dpadStack.filter((d) => d !== b)
    }
  }

  /** Latch the live state for this tick. Call exactly once per update. */
  beginFrame(): void {
    this.previous = this.current
    this.current = new Set(this.live)
    for (const b of this.transient) this.current.add(b)
    this.transient.clear()
  }

  held(b: Button): boolean {
    return this.current.has(b)
  }

  /** True only on the tick the button went down. */
  pressed(b: Button): boolean {
    return this.current.has(b) && !this.previous.has(b)
  }

  /** The direction the player means right now: most recently pressed, still held. */
  heldDirection(): Button | null {
    for (let i = this.dpadStack.length - 1; i >= 0; i--) {
      const d = this.dpadStack[i]!
      if (this.current.has(d)) return d
    }
    return null
  }
}

function isDpad(b: Button): boolean {
  return b === 'up' || b === 'down' || b === 'left' || b === 'right'
}
