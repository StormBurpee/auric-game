/**
 * The Gear's MAP tab: a node-and-path region map whose TOPOLOGY is
 * auto-derived from the real atlas (warps + edges — it can never drift)
 * while node coordinates and dungeon labels are hand-pinned in
 * REGION_LAYOUT (D4). Interiors resolve to their town by BFS, so the
 * player's dot blinks on DAWNFERN even from inside Larch's lab.
 * Up/down walks the cursor between nodes; the footer reads the name.
 * No fast travel — A on a node does nothing but read.
 */
import type { FrameBuffer } from '../../engine'
import { PAL_UI } from '../assets/palettes'
import { playSfx } from '../audio'
import { MAPS } from '../data/maps'
import type { Game } from '../game'
import type { MapDef } from '../types'
import type { GearPick, GearTab } from './gear'
import { PadRepeat, wrapIndex } from './nav'

/** One pinned node of the region map. */
export interface RegionNodeDef {
  map: string
  /** Node centre in screen pixels. */
  x: number
  y: number
  /** Footer name override — interiors have `name: ''` and can't self-label. */
  label?: string
}

export interface RegionGraph {
  nodes: readonly RegionNodeDef[]
  /** Node-index pairs, each sorted ascending, deduped, in stable order. */
  links: ReadonlyArray<readonly [number, number]>
  /** EVERY reachable map id → its node (interiors → their town). */
  nodeOf: Readonly<Record<string, number>>
}

/**
 * The hand-pinned layout: the five outdoor maps WORLD.md §0 chains
 * together plus the Spire's ground floor standing in for the dungeon.
 * Coordinates live in the content area between the tab strip and footer.
 */
export const REGION_LAYOUT: readonly RegionNodeDef[] = [
  { map: 'dawnfern', x: 120, y: 112 },
  { map: 'trail1', x: 120, y: 84 },
  { map: 'bellmere', x: 120, y: 56 },
  { map: 'trail2', x: 76, y: 56 },
  { map: 'loomspire', x: 32, y: 56 },
  { map: 'wisteria_spire_1f', x: 32, y: 32, label: 'WISTERIA SPIRE' },
]

/**
 * Derive the region graph: adjacency from every warp and edge in the
 * atlas, containment by multi-source BFS from the layout's nodes (the
 * nearest node claims each interior; layout order breaks ties), links
 * wherever two maps of different nodes touch. Deterministic — map and
 * warp declaration order in, stable node/link order out.
 */
export function buildRegionGraph(
  maps: Record<string, MapDef>,
  layout: readonly RegionNodeDef[],
): RegionGraph {
  const adj = new Map<string, Set<string>>()
  const touch = (id: string): Set<string> => {
    let set = adj.get(id)
    if (!set) {
      set = new Set()
      adj.set(id, set)
    }
    return set
  }
  for (const m of Object.values(maps)) {
    for (const w of m.warps) {
      touch(m.id).add(w.to.map)
      touch(w.to.map).add(m.id)
    }
    for (const e of Object.values(m.edges ?? {})) {
      touch(m.id).add(e.map)
      touch(e.map).add(m.id)
    }
  }

  const nodeOf: Record<string, number> = {}
  const queue: string[] = []
  layout.forEach((n, i) => {
    if (!maps[n.map]) throw new Error(`region layout names unknown map '${n.map}'`)
    nodeOf[n.map] = i
    queue.push(n.map)
  })
  for (let q = 0; q < queue.length; q++) {
    const id = queue[q]!
    for (const next of adj.get(id) ?? []) {
      if (nodeOf[next] !== undefined) continue
      nodeOf[next] = nodeOf[id]!
      queue.push(next)
    }
  }

  const seen = new Set<string>()
  const links: [number, number][] = []
  for (const [id, outs] of adj) {
    for (const out of outs) {
      const a = nodeOf[id]
      const b = nodeOf[out]
      if (a === undefined || b === undefined || a === b) continue
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      if (seen.has(`${lo}:${hi}`)) continue
      seen.add(`${lo}:${hi}`)
      links.push([lo, hi])
    }
  }
  links.sort((p, q) => p[0] - q[0] || p[1] - q[1])
  return { nodes: layout, links, nodeOf }
}

/** The one graph the MAP tab draws, welded to the atlas at module load. */
export const REGION_GRAPH: RegionGraph = buildRegionGraph(MAPS, REGION_LAYOUT)

/** Footer name for a node: pinned label, else the map's own plaque name. */
export function nodeName(n: RegionNodeDef): string {
  return n.label ?? MAPS[n.map]?.name ?? n.map
}

/** Player-dot blink cadence, in frames-shift (16 on, 16 off). */
const BLINK_SHIFT = 4

export class GearMapTab implements GearTab {
  readonly title = 'MAP'
  private cursor: number
  private readonly pad = new PadRepeat()

  constructor(private readonly game: Game) {
    this.cursor = REGION_GRAPH.nodeOf[game.state.pos.map] ?? 0
  }

  refresh(): void {
    // Nothing derived to rebuild — the cursor keeps its place.
  }

  update(): GearPick | null {
    const dir = this.pad.step(this.game.input)
    if (dir === 'up' || dir === 'down') {
      this.cursor = wrapIndex(this.cursor + (dir === 'down' ? 1 : -1), REGION_GRAPH.nodes.length)
      playSfx(this.game, 'menu_move')
    }
    return null
  }

  draw(fb: FrameBuffer): void {
    const nodes = REGION_GRAPH.nodes
    for (const [a, b] of REGION_GRAPH.links) this.drawPath(fb, nodes[a]!, nodes[b]!)
    for (const n of nodes) {
      fb.fillRect(n.x - 5, n.y - 5, 10, 10, PAL_UI, 3)
      fb.fillRect(n.x - 3, n.y - 3, 6, 6, PAL_UI, 0)
    }
    // YOU ARE HERE, breathing.
    const here = REGION_GRAPH.nodeOf[this.game.state.pos.map]
    if (here !== undefined && ((this.game.frames >> BLINK_SHIFT) & 1) === 0) {
      const n = nodes[here]!
      fb.fillRect(n.x - 3, n.y - 3, 6, 6, PAL_UI, 3)
    }
    // The cursor ring.
    const c = nodes[this.cursor]!
    fb.fillRect(c.x - 8, c.y - 8, 16, 1, PAL_UI, 3)
    fb.fillRect(c.x - 8, c.y + 7, 16, 1, PAL_UI, 3)
    fb.fillRect(c.x - 8, c.y - 8, 1, 16, PAL_UI, 3)
    fb.fillRect(c.x + 7, c.y - 8, 1, 16, PAL_UI, 3)
  }

  /** An axis-aligned L between node centres (straight when aligned). */
  private drawPath(fb: FrameBuffer, a: RegionNodeDef, b: RegionNodeDef): void {
    if (a.x !== b.x) fb.fillRect(Math.min(a.x, b.x), a.y - 1, Math.abs(a.x - b.x), 2, PAL_UI, 2)
    if (a.y !== b.y) fb.fillRect(b.x - 1, Math.min(a.y, b.y), 2, Math.abs(a.y - b.y), PAL_UI, 2)
  }

  footer(): string {
    return nodeName(REGION_GRAPH.nodes[this.cursor]!)
  }
}
