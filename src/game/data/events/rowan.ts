/**
 * Elder Rowan — docs/STORY.md §4. Larch's notes arrive, the old tales
 * of AMBERSTAG and the Wisteria Spire, then the KINDEX (a flag, not a
 * bag item — the Kindex is a menu, not an inventory entry) and the
 * road west to Loomspire. Afterward: his ambient Spire line.
 */
import type { GameScript } from '../../script/dsl'

export const elderRowan: GameScript = function* (c) {
  if (!c.flag('starter_chosen') || c.flag('kindex_given')) {
    yield* c.say('story.rowan.after.1')
    return
  }

  for (let box = 1; box <= 10; box++) yield* c.say(`story.rowan.${box}`)
  c.sfx('levelup')
  yield* c.say('sys.item.get', { ITEM: 'KINDEX' })
  c.setFlag('kindex_given')
  for (let box = 11; box <= 13; box++) yield* c.say(`story.rowan.${box}`)
}
