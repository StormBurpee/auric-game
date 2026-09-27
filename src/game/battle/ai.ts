/**
 * Opponent brains. Wild Kindra and 'random' trainers pick uniformly
 * among moves with PP (§11.2); 'smart' trainers rank damaging moves by
 * expected punch — type effectiveness × power × STAB — and never throw
 * a move the chart zeroes out. The scene asks once per turn, before
 * action resolution, exactly like the player's simultaneous pick.
 */
import type { Rng } from '../../engine'
import { effectiveness, moveOf, speciesOf } from '../data'
import type { Move } from '../types'
import type { BattleMon } from './state'

/**
 * The smart ranking: eff × power × (1.5 with STAB), 0 for status moves.
 * Every factor is a power-of-two multiple of an integer, so equal
 * scores compare exactly — ties break by rng in chooseMove.
 */
export function moveScore(move: Move, self: BattleMon, target: BattleMon): number {
  if (move.power <= 0) return 0
  const mine = speciesOf(self.k.species)
  const theirs = speciesOf(target.k.species)
  const eff = effectiveness(move.type, theirs.type1, theirs.type2)
  const stab = move.type === mine.type1 || move.type === mine.type2 ? 1.5 : 1
  return move.power * eff * stab
}

/**
 * Pick the foe's move for this turn. @returns an index into
 * `self.k.moves`, or -1 when every move is out of PP (STRUGGLE time).
 */
export function chooseMove(rng: Rng, ai: 'random' | 'smart', self: BattleMon, target: BattleMon): number {
  const usable: number[] = []
  for (let i = 0; i < self.k.moves.length; i++) {
    const slot = self.k.moves[i]
    if (slot && slot.pp > 0) usable.push(i)
  }
  if (usable.length === 0) return -1
  if (ai === 'random') return rng.pick(usable)

  const theirs = speciesOf(target.k.species)
  const moveAt = (i: number): Move => moveOf(self.k.moves[i]!.move)
  const scores = usable.map((i) => moveScore(moveAt(i), self, target))
  const best = Math.max(...scores)
  if (best > 0) {
    return rng.pick(usable.filter((_, n) => scores[n] === best))
  }
  // Only status moves (or only chart-zeroed attacks) left: anything that
  // is not outright immune beats wasting a turn on "doesn't affect".
  const notImmune = usable.filter((i) => effectiveness(moveAt(i).type, theirs.type1, theirs.type2) > 0)
  return rng.pick(notImmune.length > 0 ? notImmune : usable)
}
