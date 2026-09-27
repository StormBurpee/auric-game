/**
 * The STORMBOY COLOR — the atomic-purple handheld around the screen.
 *
 * Pure DOM/SVG/CSS; knows nothing about the game. The shell's contract:
 *  - adopt the 160x144 canvas into the screen window and hold it at the
 *    largest integer multiple that fits the viewport (the surrounding
 *    chrome budget lives in the `--sb-chrome-*` custom properties so the
 *    CSS layout and this maths share one source of truth),
 *  - feed pointer presses into the same virtual pad the keyboard uses.
 *    Multi-touch safe (per-pointerId holds, per-button press counts);
 *    releases on pointerup/leave/cancel, window blur, and tab-hide; a
 *    thumb may roll across the D-pad. Every press forwards the WebAudio
 *    unlock gesture.
 *
 * Mounted once per page (the SVG defs use fixed ids).
 */
import './shell.css'
import { SCREEN_H, SCREEN_W } from '../engine'
import type { Button, Input } from '../engine'

/** One pointer's claim: the virtual button it holds and where the press shows. */
interface Hold {
  button: Button
  el: HTMLButtonElement
}

export function mountShell(opts: { canvas: HTMLCanvasElement; input: Input }): void {
  const { canvas, input } = opts
  const root = document.querySelector<HTMLElement>('#app') ?? document.body

  // ---- chassis --------------------------------------------------------
  const stage = el('div', 'sb-stage')
  const shell = el('div', 'sb-shell', stage)
  shell.insertAdjacentHTML('afterbegin', CIRCUIT_SVG)
  el('span', 'sb-ir', shell).setAttribute('aria-hidden', 'true')
  for (const corner of ['tl', 'tr', 'bl', 'br']) {
    el('span', `sb-screw sb-screw-${corner}`, shell).setAttribute('aria-hidden', 'true')
  }

  // ---- bezel, screen window, badges ------------------------------------
  const bezel = el('div', 'sb-bezel', shell)
  const bezelTop = el('div', 'sb-bezel-top', bezel)
  const ledBlock = el('div', 'sb-led-block', bezelTop)
  ledBlock.setAttribute('aria-hidden', 'true')
  const led = el('span', 'sb-led', ledBlock)
  el('span', 'sb-led-label', ledBlock).textContent = 'POWER'
  const wordmark = el('div', 'sb-wordmark', bezelTop)
  wordmark.append('STORMBOY')
  const colorWord = el('span', 'sb-color', wordmark)
  for (const ch of 'COLOR') el('span', '', colorWord).textContent = ch
  el('span', 'sb-bezel-spacer', bezelTop)

  const screen = el('div', 'sb-screen', bezel)
  screen.appendChild(canvas)
  screen.insertAdjacentHTML('beforeend', GLASS_SVG)
  const model = el('div', 'sb-model', bezel)
  el('span', '', model).textContent = 'AURIC'

  // ---- press routing ----------------------------------------------------
  const holds = new Map<number, Hold>()
  const downs = new Map<Button, number>()

  const press = (pointerId: number, button: Button, target: HTMLButtonElement): void => {
    if (holds.has(pointerId)) return
    holds.set(pointerId, { button, el: target })
    const count = (downs.get(button) ?? 0) + 1
    downs.set(button, count)
    if (count === 1) input.setDown(button, true)
    target.classList.add('is-down')
    input.onGesture?.()
  }

  const release = (pointerId: number): void => {
    const hold = holds.get(pointerId)
    if (!hold) return
    holds.delete(pointerId)
    const count = (downs.get(hold.button) ?? 1) - 1
    downs.set(hold.button, count)
    if (count <= 0) input.setDown(hold.button, false)
    let stillShown = false
    for (const other of holds.values()) {
      if (other.el === hold.el) stillShown = true
    }
    if (!stillShown) hold.el.classList.remove('is-down')
  }

  const releaseAll = (): void => {
    for (const pointerId of [...holds.keys()]) release(pointerId)
  }

  const bind = (target: HTMLButtonElement, button: Button): void => {
    target.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (e.pointerType === 'mouse' && e.button !== 0) return
      // Undo the implicit touch capture so a thumb can roll across the D-pad.
      if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId)
      press(e.pointerId, button, target)
    })
    target.addEventListener('pointerenter', (e) => {
      if ((e.buttons & 1) !== 0 && !holds.has(e.pointerId)) press(e.pointerId, button, target)
    })
    target.addEventListener('pointerleave', (e) => {
      if (holds.get(e.pointerId)?.el === target) release(e.pointerId)
    })
    target.addEventListener('pointerup', (e) => release(e.pointerId))
    target.addEventListener('pointercancel', (e) => release(e.pointerId))
    // Assistive tech fires synthetic clicks (detail 0) with no pointer
    // lifecycle; latch the button long enough for the 60Hz poll to see it.
    target.addEventListener('click', (e) => {
      if (e.detail !== 0) return
      input.setDown(button, true)
      input.onGesture?.()
      window.setTimeout(() => input.setDown(button, false), 100)
    })
  }

  // ---- controls ---------------------------------------------------------
  const dpad = el('div', 'sb-dpad', shell)
  dpad.setAttribute('role', 'group')
  dpad.setAttribute('aria-label', 'Directional pad')
  const arms: ReadonlyArray<readonly [Button, string]> = [
    ['up', 'Up'],
    ['right', 'Right'],
    ['down', 'Down'],
    ['left', 'Left'],
  ]
  for (const [button, label] of arms) {
    bind(makeButton(`sb-dpad-arm sb-dpad-${button}`, label, dpad), button)
  }
  el('div', 'sb-dpad-center', dpad)

  const ab = el('div', 'sb-ab', shell)
  ab.setAttribute('role', 'group')
  ab.setAttribute('aria-label', 'Action buttons')
  const buttonA = makeButton('sb-btn sb-btn-a', 'A', ab)
  buttonA.textContent = 'A'
  bind(buttonA, 'a')
  const buttonB = makeButton('sb-btn sb-btn-b', 'B', ab)
  buttonB.textContent = 'B'
  bind(buttonB, 'b')

  const meta = el('div', 'sb-meta', shell)
  meta.setAttribute('role', 'group')
  meta.setAttribute('aria-label', 'Select and Start')
  const pills: ReadonlyArray<readonly [Button, string, string]> = [
    ['select', 'Select', 'SELECT'],
    ['start', 'Start', 'START'],
  ]
  for (const [button, aria, label] of pills) {
    const wrap = el('div', 'sb-pill-wrap', meta)
    bind(makeButton('sb-pill', aria, wrap), button)
    el('span', 'sb-pill-label', wrap).textContent = label
  }

  const speaker = el('div', 'sb-speaker', shell)
  speaker.setAttribute('aria-hidden', 'true')
  for (let i = 0; i < 6; i++) el('span', '', speaker)

  el('p', 'sb-hint', stage).textContent =
    'ARROWS/WASD move · X or SPACE = A · Z = B · ENTER = START · SHIFT = SELECT'

  // ---- safety nets: never leave a button stuck down ----------------------
  window.addEventListener('pointerup', (e) => release(e.pointerId))
  window.addEventListener('pointercancel', (e) => release(e.pointerId))
  window.addEventListener('blur', releaseAll)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') releaseAll()
  })
  shell.addEventListener('contextmenu', (e) => e.preventDefault())

  root.appendChild(stage)

  // ---- integer-scale the screen to the viewport ---------------------------
  const fit = (): void => {
    const style = getComputedStyle(stage)
    const chromeW = parseFloat(style.getPropertyValue('--sb-chrome-w')) || 0
    const chromeH = parseFloat(style.getPropertyValue('--sb-chrome-h')) || 0
    const scale = Math.max(
      1,
      Math.min(
        Math.floor((window.innerWidth - chromeW) / SCREEN_W),
        Math.floor((window.innerHeight - chromeH) / SCREEN_H),
      ),
    )
    canvas.style.width = `${SCREEN_W * scale}px`
    canvas.style.height = `${SCREEN_H * scale}px`
  }
  window.addEventListener('resize', fit)
  fit()

  // Power on: two frames so the LED's lit state transitions rather than pops.
  requestAnimationFrame(() => requestAnimationFrame(() => led.classList.add('on')))
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  parent?.appendChild(node)
  return node
}

function makeButton(className: string, ariaLabel: string, parent: HTMLElement): HTMLButtonElement {
  const node = el('button', className, parent)
  node.type = 'button'
  node.setAttribute('aria-label', ariaLabel)
  return node
}

/**
 * The circuit board sleeping under the translucent plastic: traces with
 * via dots at every bend's end, two ICs with legs. Tiled as an SVG
 * pattern so it covers the shell at any size; `.sb-circuit` keeps it
 * faint and clipped to the body's corners.
 */
const CIRCUIT_SVG = `
<div class="sb-circuit" aria-hidden="true">
  <svg width="100%" height="100%" focusable="false">
    <defs>
      <pattern id="sb-traces" width="104" height="104" patternUnits="userSpaceOnUse">
        <g fill="none" stroke="#a7eab4" stroke-width="1.5" stroke-linecap="round">
          <path d="M8 20h26v30h28"/>
          <path d="M96 10v22h-24"/>
          <path d="M16 88h28V70"/>
          <path d="M84 96V76h14"/>
          <path d="M58 8v14h20"/>
          <path d="M6 56h16v26"/>
        </g>
        <g fill="#a7eab4">
          <circle cx="8" cy="20" r="2.3"/><circle cx="62" cy="50" r="2.3"/>
          <circle cx="96" cy="10" r="2.3"/><circle cx="72" cy="32" r="2.3"/>
          <circle cx="16" cy="88" r="2.3"/><circle cx="44" cy="70" r="2.3"/>
          <circle cx="84" cy="96" r="2.3"/><circle cx="98" cy="76" r="2.3"/>
          <circle cx="58" cy="8" r="2.3"/><circle cx="78" cy="22" r="2.3"/>
          <circle cx="6" cy="56" r="2.3"/><circle cx="22" cy="82" r="2.3"/>
        </g>
        <g fill="#8fd69e">
          <rect x="46" y="80" width="22" height="14" rx="2"/>
          <rect x="10" y="34" width="12" height="20" rx="2"/>
        </g>
        <g fill="none" stroke="#8fd69e" stroke-width="1.4">
          <path d="M50 80v-5m6 5v-5m6 5v-5m-12 19v5m6-5v5m6-5v5"/>
          <path d="M10 38h-4m4 6h-4m4 6h-4m16-12h4m-4 6h4"/>
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#sb-traces)"/>
  </svg>
</div>`

/**
 * Curved glass over the LCD: a sheen that sweeps from the top edge down
 * the left, plus a soft specular ellipse. Stretches with the canvas
 * (`preserveAspectRatio="none"`); never intercepts pointers.
 */
const GLASS_SVG = `
<svg class="sb-glass" viewBox="0 0 160 144" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="sb-glass-sheen" x1="0" y1="0" x2="0.55" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="0.7" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path d="M0 0h126C82 24 38 62 16 144H0Z" fill="url(#sb-glass-sheen)"/>
  <ellipse cx="24" cy="13" rx="30" ry="9" fill="#ffffff" opacity="0.1" transform="rotate(-16 24 13)"/>
</svg>`
