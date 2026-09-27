/**
 * A scene stack with handheld-RPG modality: only the top scene thinks,
 * but translucent scenes (dialog boxes, menus) let the world beneath
 * them keep drawing. Push a battle over the overworld, pop back, and
 * the grass is exactly where you left it.
 */
import type { FrameBuffer } from './renderer'

export interface Scene {
  /** Called when the scene becomes part of the stack. */
  enter?(): void
  /** Called when the scene leaves the stack. */
  exit?(): void
  /** Translucent scenes draw the scenes beneath them first. */
  readonly translucent?: boolean
  update(): void
  draw(fb: FrameBuffer): void
}

export class SceneStack {
  private stack: Scene[] = []

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1]
  }

  get depth(): number {
    return this.stack.length
  }

  push(scene: Scene): void {
    this.stack.push(scene)
    scene.enter?.()
  }

  pop(): void {
    const s = this.stack.pop()
    s?.exit?.()
  }

  replace(scene: Scene): void {
    this.pop()
    this.push(scene)
  }

  /** Empty the stack and start fresh (title → new game). */
  reset(scene: Scene): void {
    while (this.stack.length > 0) this.pop()
    this.push(scene)
  }

  update(): void {
    this.top?.update()
  }

  draw(fb: FrameBuffer): void {
    // Find the deepest scene that still needs to draw: walk down past translucents.
    let first = this.stack.length - 1
    while (first > 0 && this.stack[first]!.translucent) first--
    for (let i = first; i < this.stack.length; i++) {
      this.stack[i]!.draw(fb)
    }
  }
}
