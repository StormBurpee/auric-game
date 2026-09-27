/**
 * The lab choice — docs/STORY.md §3. Larch's favor, the three pedestals
 * with YES/NO confirms, five CHARMS, the errand to Elder Rowan, and the
 * cold eyes at the window. Repeat visits before the errand is done get
 * his "Rowan awaits" nudge.
 */
import type { GameScript } from '../../script/dsl'
import { makeKindra } from '../../kindra'

const STARTERS = ['VERDIL', 'EMBERIT', 'RILLET'] as const
const PICK_KEYS: Record<(typeof STARTERS)[number], string> = {
  VERDIL: 'story.lab.pick.verdil',
  EMBERIT: 'story.lab.pick.emberit',
  RILLET: 'story.lab.pick.rillet',
}

export const larchLab: GameScript = function* (c) {
  if (c.flag('starter_chosen')) {
    yield* c.say('story.lab.13')
    return
  }

  for (let box = 1; box <= 8; box++) yield* c.say(`story.lab.${box}`)

  // The pedestal loop: a pick opens its confirm; NO (or B) returns to
  // the row of pedestals. There is no leaving without a partner.
  let starter: (typeof STARTERS)[number] | undefined
  while (starter === undefined) {
    const pick = yield* c.ask(null, [...STARTERS])
    const choice = STARTERS[pick]
    if (choice === undefined) {
      yield* c.say('story.lab.wait')
      continue
    }
    yield* c.say(PICK_KEYS[choice])
    const sure = yield* c.ask(null, ['YES', 'NO'], { cancelIndex: 1 })
    if (sure === 0) starter = choice
    else yield* c.say('story.lab.8')
  }

  yield* c.giveKindra(makeKindra(starter, 5, { rng: c.game.rng }))
  c.game.state.starter = starter
  c.setFlag('starter_chosen')

  yield* c.say('story.lab.9')
  yield* c.say('story.lab.10')
  yield* c.giveItem('CHARM', 5)
  yield* c.say('story.lab.11')
  yield* c.say('story.lab.12')
  yield* c.say('story.lab.13')

  // The window beat: a knock, two beats of unease, and CORVIN is gone.
  c.sfx('bump')
  yield* c.wait(30)
  yield* c.say('story.lab.14')
  yield* c.wait(20)
  yield* c.say('story.lab.15')
}
