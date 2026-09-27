/**
 * Wind Warden ARIA — docs/STORY.md §6. Spoken-to battle (no sight
 * range), gym colors on the battle (isGym), and on victory the ZEPHYR
 * BADGE, the sequel hook, and the credits roll. Once 'badge_zephyr' is
 * set she only repeats the hook. Her win.1-3 award speech is her
 * in-battle defeatText ('story.gym.aria.defeat'), so this script picks
 * up at the badge itself.
 */
import type { GameScript } from '../../script/dsl'
import { trainerOf } from '..'
import { makeKindra } from '../../kindra'
import { runCredits } from '../../scenes/credits'

export const gymAria: GameScript = function* (c) {
  if (c.flag('badge_zephyr')) {
    yield* c.say('story.gym.aria.post.1')
    yield* c.say('story.gym.aria.post.2')
    return
  }

  yield* c.say('story.gym.aria.pre.1')
  yield* c.say('story.gym.aria.pre.2')
  yield* c.say('story.gym.aria.pre.3')

  const def = trainerOf('WARDEN_ARIA')
  const foe = def.party.map((p) => makeKindra(p.species, p.level, { held: p.held }))
  const result = yield* c.battle({ kind: 'trainer', foe, trainer: def, isGym: true })

  if (result.outcome !== 'win') {
    yield* c.say('story.gym.aria.lose')
    return
  }

  c.sfx('badge_get')
  yield* c.say('sys.badge.get', { BADGE: 'ZEPHYR BADGE' })
  if (!c.game.state.badges.includes('ZEPHYR')) c.game.state.badges.push('ZEPHYR')
  c.setFlag('badge_zephyr')

  yield* c.say('story.gym.aria.post.1')
  yield* c.say('story.gym.aria.post.2')
  yield* runCredits(c.game)
}
