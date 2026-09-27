/**
 * CORVIN's Trail 2 ambush — docs/STORY.md §5. He strides down his
 * column to the player, introduces himself, and leads with the stolen
 * SHADEKIT plus the starter strong against the player's (the
 * RIVAL_CORVIN_T2_<starter> variants of ROSTER §C). Win or lose he
 * leaves the trail; 'rival1_done' hides his NPC for good.
 */
import type { GameScript } from '../../script/dsl'
import { trainerOf } from '..'
import { makeKindra } from '../../kindra'
import type { Dir } from '../../types'

/** Corvin's post on trail2 — the stride below is measured from here. */
const CORVIN_X = 4
const CORVIN_Y = 6

export const rivalAmbush: GameScript = function* (c) {
  if (c.flag('rival1_done')) return

  // Stride down the sighted column until one tile short of the player
  // (a direct talk is already adjacent and strides zero tiles).
  const pos = c.game.state.pos
  const steps: Dir[] = []
  if (pos.x === CORVIN_X) {
    for (let y = CORVIN_Y + 1; y < pos.y; y++) steps.push('down')
  }
  if (steps.length > 0) yield* c.moveNpc('trail2_corvin', steps)
  c.npcFacePlayer('trail2_corvin')

  yield* c.say('story.rival1.pre.1')
  yield* c.say('story.rival1.pre.2')
  yield* c.say('story.rival1.pre.3')

  // He counter-picked at the lab; the starter is set long before Trail 2
  // is reachable (VERDIL is a pure type-safety fallback).
  const starter = c.game.state.starter ?? 'VERDIL'
  const def = trainerOf(`RIVAL_CORVIN_T2_${starter}`)
  // Flat genes, the fixed-DV tradition for trainer creatures.
  const foe = def.party.map((p) => makeKindra(p.species, p.level, { held: p.held }))
  const result = yield* c.battle({ kind: 'trainer', foe, trainer: def })

  if (result.outcome === 'win') {
    yield* c.say('story.rival1.post.1')
    yield* c.say('story.rival1.post.2')
    yield* c.say('story.rival1.post.3')
    // Off toward Loomspire; blocked steps are skipped, the hide flag
    // below removes him wherever the walk ends.
    yield* c.moveNpc('trail2_corvin', ['down', 'left', 'left', 'left'])
  } else {
    // The whiteout already carried the player to safety; his parting
    // sneer lingers anyway.
    yield* c.say('story.rival1.victory.1')
  }
  c.setFlag('rival1_done')
}
