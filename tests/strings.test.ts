/**
 * String-table contract tests: src/game/data/strings.ts must carry the
 * full docs/STORY.md transcription (236 story.* + 74 sys.* boxes), every
 * line must fit an 18-char row at MAXIMUM placeholder expansion (STORY.md
 * §0 budgets), every box must fit 2 lines, and the collapsed defeat-quote
 * sequences must resolve every trainer's `defeatText` key.
 */
import { describe, expect, it } from 'vitest'
import { SYS_STRINGS } from '../src/game/data/sysStrings'
import { QUESTS } from '../src/game/data/quests'
import { STORY_STRINGS, STRINGS, str } from '../src/game/data/strings'
import { TRAINERS } from '../src/game/data'
import { MARKET_OFFERS } from '../src/game/data/weekly'

/** Maximum expansion width per placeholder — STORY.md §0 budget table. */
const PLACEHOLDER_MAX: Record<string, number> = {
  PLAYER: 10, RIVAL: 10, KINDRA: 10, KINDRA2: 10,
  MOVE: 12, ITEM: 12, BADGE: 12, NAME: 10,
  TRAINER: 16, STAT: 8, EXP: 4, AMOUNT: 4, LEVEL: 3,
}

/** Expand every {TOKEN} to its budgeted maximum width; unknown tokens fail. */
function expand(line: string): string {
  return line.replace(/\{([A-Z0-9]+)\}/g, (token, name: string) => {
    const max = PLACEHOLDER_MAX[name]
    if (max === undefined) throw new Error(`unbudgeted placeholder ${token}`)
    return 'X'.repeat(max)
  })
}

const transcribed = Object.entries(STORY_STRINGS)
const storyKeys = Object.keys(STRINGS).filter(k => k.startsWith('story.'))

describe('line and box budgets (STORY.md §0, §16)', () => {
  it('fits every transcribed line in 18 chars at max placeholder width', () => {
    for (const [key, boxes] of transcribed) {
      for (const box of boxes) {
        for (const line of box.split('\n')) {
          const rendered = expand(line)
          expect(rendered.length, `${key}: "${line}" -> "${rendered}"`)
            .toBeLessThanOrEqual(18)
        }
      }
    }
  })

  it('keeps every box in the whole table to at most 2 lines', () => {
    for (const [key, boxes] of Object.entries(STRINGS)) {
      expect(boxes.length, key).toBeGreaterThan(0)
      for (const box of boxes) {
        expect(box.split('\n').length, `${key}: "${box}"`).toBeLessThanOrEqual(2)
      }
    }
  })

  it('has no empty or whitespace-padded lines', () => {
    for (const [key, boxes] of transcribed) {
      for (const box of boxes) {
        for (const line of box.split('\n')) {
          expect(line, key).toBe(line.trim())
          expect(line.length, key).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('coverage (STORY.md has 310 keyed boxes)', () => {
  it('transcribes all 310 doc boxes: 236 story.* + 74 sys.*', () => {
    const boxCount = transcribed.reduce((n, [, boxes]) => n + boxes.length, 0)
    expect(boxCount).toBe(310)
    expect(transcribed.filter(([k]) => k.startsWith('story.'))).toHaveLength(236)
    expect(transcribed.filter(([k]) => k.startsWith('sys.'))).toHaveLength(74)
  })

  it('publishes exactly the 244 story.* keys (236 doc + 8 defeat sequences)', () => {
    expect(storyKeys.length).toBeGreaterThanOrEqual(120)
    expect(storyKeys).toHaveLength(244)
  })

  it('covers the doc NPC and sign inventories (STORY.md §16)', () => {
    for (const npc of ['dawnfern2', 'bellmere2', 'loomspire4']) {
      expect(STRINGS[`story.npc.${npc}.day`], npc).toBeDefined()
      expect(STRINGS[`story.npc.${npc}.night`], npc).toBeDefined()
    }
    expect(STRINGS['story.npc.loomspire1.day']).toBeDefined()
    expect(STRINGS['story.npc.loomspire1.night.1']).toBeDefined()
    expect(STRINGS['story.npc.loomspire1.night.2']).toBeDefined()
    // Tier 2: the angler closed the bellmere4 loop — inventory runs 1..5.
    for (const box of ['1', '2', '3', 'after']) {
      expect(STRINGS[`story.npc.bellmere5.${box}`], box).toBeDefined()
    }
    const signs = storyKeys.filter(k => k.startsWith('story.sign.'))
    expect(signs).toHaveLength(16)
  })
})

describe('spot checks — exact keys and text pinned to the doc', () => {
  it('opens and closes the intro on the doc lines', () => {
    expect(STRINGS['story.intro.1']).toEqual(['Hello! Glad you\ncould make it.'])
    expect(STRINGS['story.intro.9']).toEqual(['{PLAYER}! What a\nfine name it is.'])
  })

  it('greets the player at the lab', () => {
    expect(STRINGS['story.lab.1']).toEqual(['{PLAYER}! Come\nin, come in!'])
  })

  it("collapses CORVIN's defeat quote under the trainers.ts key", () => {
    expect(STRINGS['story.rival1.defeat']).toEqual([
      'Tch. A fluke,\nnothing more.',
      'Only the strong\ndeserve Kindra.',
    ])
  })

  it("collapses ARIA's award speech (win.1-3) under her defeat key", () => {
    expect(STRINGS['story.gym.aria.defeat']).toEqual([
      'The wind bows to\nno one... yet it',
      'carries you. Take\nthe ZEPHYR BADGE.',
      'Wear it lightly,\nlike a feather.',
    ])
  })

  it('rolls credits to the sequel hook', () => {
    expect(STRINGS['story.credits.6']).toEqual(['TO BE CONTINUED...'])
  })

  it('swaps the bellmere2 watcher line by time of day', () => {
    expect(STRINGS['story.npc.bellmere2.day'])
      .toEqual(['Some KINDRA only\nwake at night.'])
    expect(STRINGS['story.npc.bellmere2.night'])
      .toEqual(["Now's the hour!\nSHADEKIT prowls."])
  })

  it('posts the STORMBOY COLOR sign outside the arcade', () => {
    expect(STRINGS['story.sign.loomspire3'])
      .toEqual(['STORMBOY COLOR\n- EST. 2026 -'])
  })

  it("runs KEEPER LILY's Haven flow on the doc lines", () => {
    expect(STRINGS['story.haven.lily.1'])
      .toEqual(['Welcome to the\nHAVEN, traveler!'])
    expect(STRINGS['story.haven.lily.what'])
      .toEqual(['What can I do\nfor you, dear?'])
    expect(STRINGS['story.haven.lily.4'])
      .toEqual(['There! Your KINDRA\nare fully rested!'])
    expect(STRINGS['story.haven.lily.no'])
      .toEqual(['Of course. Take\nyour time, dear.'])
    expect(STRINGS['story.haven.archive.2'])
      .toEqual(["They'll be rested\nwhen you return!"])
    // Tier 1 retired the YES/NO heal prompt for the Haven loop.
    expect(STRINGS['story.haven.lily.2']).toBeUndefined()
  })

  it('keeps the §16 required verbatim lines', () => {
    expect(STRINGS['sys.catch.success']).toEqual(['Gotcha! {KINDRA}\nwas caught!'])
    expect(STRINGS['sys.catch.fail']).toEqual(['Oh no! It broke\nfree!'])
    expect(STRINGS['story.npc.bellmere1.1'])
      .toEqual(['My first journey\nbegan with a gift'])
    expect(STRINGS['story.npc.bellmere1.2'])
      .toEqual(['of gold... games\nlike that stay in'])
  })

  it('speaks the Tier-2 fishing set under the LAW keys', () => {
    expect(STRINGS['sys.fish.none']).toEqual(['Not even a nibble...'])
    expect(STRINGS['sys.fish.bite']).toEqual(['A bite!'])
    expect(STRINGS['sys.fish.away']).toEqual(['It slipped off the hook...'])
    expect(STRINGS['sys.fish.bag']).toEqual(["Cast it at the water's edge."])
  })

  it('keeps the four veiled egg tells single-line (cards re-wrap them)', () => {
    for (const band of ['far', 'near', 'soon', 'now']) {
      const boxes = STRINGS[`sys.egg.${band}`]
      expect(boxes, band).toBeDefined()
      expect(boxes).toHaveLength(1)
      expect(boxes![0], band).not.toContain('\n')
    }
  })
})

describe('Tier-2 cross-refs (registries name keys; the table must hold them)', () => {
  it('resolves every market pitch key the weekly rotation names', () => {
    expect(MARKET_OFFERS.length).toBeGreaterThan(0)
    for (const offer of MARKET_OFFERS) {
      expect(STRINGS[offer.pitch], `${offer.item} -> ${offer.pitch}`).toBeDefined()
    }
  })

  it('carries the full phone-line pools for every contact of the slice', () => {
    // MOM and LARCH rotate three-deep on dayStamp; trainers carry one
    // flavor line plus the offer/armed/spent call beats (data/quests.ts).
    for (const who of ['mom', 'larch']) {
      for (const n of [1, 2, 3]) {
        expect(STRINGS[`story.phone.${who}.flavor${n}`], who).toBeDefined()
      }
    }
    for (const who of ['ben', 'mae', 'otto', 'ivy']) {
      for (const suffix of ['flavor1', 'offer', 'armed', 'spent']) {
        expect(STRINGS[`story.phone.${who}.${suffix}`], `${who}.${suffix}`).toBeDefined()
      }
    }
  })

  it('resolves every stage desc and epilogue the QUESTS registry names', () => {
    expect(QUESTS).toHaveLength(8)
    for (const q of QUESTS) {
      for (const stage of q.stages) {
        expect(STRINGS[stage.desc], `${q.id}: ${stage.desc}`).toBeDefined()
      }
      expect(STRINGS[q.epilogue], `${q.id}: ${q.epilogue}`).toBeDefined()
    }
  })
})

describe('merge order and consumers', () => {
  it('lets STORY.md §10 win over SYS_STRINGS on key collisions', () => {
    expect(SYS_STRINGS['sys.catch.throw']).toEqual(['{PLAYER} threw a {ITEM}!'])
    expect(STRINGS['sys.catch.throw']).toEqual(['{PLAYER} threw\nthe {ITEM}!'])
    expect(STRINGS['sys.run.trainer'])
      .toEqual(["No! You can't run\nfrom this battle!"])
  })

  it('keeps engine-only sys defaults that §10 does not redefine', () => {
    for (const key of ['sys.wild.appear', 'sys.whiteout', 'sys.flinch', 'sys.recharge']) {
      expect(STRINGS[key], key).toEqual(SYS_STRINGS[key])
    }
  })

  it("resolves every trainer's defeatText key to transcribed boxes", () => {
    for (const t of Object.values(TRAINERS)) {
      const boxes = STRINGS[t.defeatText]
      expect(boxes, `${t.key} -> ${t.defeatText}`).toBeDefined()
      expect(boxes?.length, t.key).toBeGreaterThan(0)
    }
  })

  it('falls back loudly (and on-screen short) for unknown keys', () => {
    expect(str('story.intro.1')).toEqual(['Hello! Glad you\ncould make it.'])
    const missing = str('story.no.such.key.anywhere')
    expect(missing).toHaveLength(1)
    expect(missing[0]?.length).toBeLessThanOrEqual(18)
    expect(missing[0]?.startsWith('?')).toBe(true)
  })
})
