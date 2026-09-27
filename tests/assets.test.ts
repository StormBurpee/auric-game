/**
 * Art-layer contract tests: every key the game can ask for has pixels of
 * the promised shape (docs/ART_SPEC.md). Importing the registry also
 * decodes every authored grid, so a single mistyped row fails the suite
 * at import time with the offending coordinates.
 */
import { describe, expect, it } from 'vitest'
import {
  CHAR_ART,
  MON_ART,
  SURF_WAKE,
  TILE_ART,
  TITLE_ART,
  TRAINER_ART,
  UI_ART,
} from '../src/game/assets'
import { SPECIES } from '../src/game/data'
import { TILE_LIST } from '../src/game/world/tiles'

const ARCHETYPES = [
  'PLAYER', 'MOM', 'BOY', 'GIRL', 'MAN', 'WOMAN', 'ELDER',
  'KEEPER', 'PROF', 'RIVAL', 'WARDEN', 'SCOUT', 'GRUNT', 'KID',
] as const

/** Every CharArt walker: the cast plus the hero's surf mount. */
const WALKERS = [...ARCHETYPES, 'PLAYER_SURF'] as const

const TRAINER_KEYS = [
  'TRAINER_CORVIN', 'TRAINER_ARIA', 'TRAINER_SCOUT', 'TRAINER_FORAGER',
  'TRAINER_BELLRINGER', 'TRAINER_HERBALIST', 'TRAINER_TRAINEE',
] as const

describe('tile art', () => {
  it('covers every TileKey with 16x16 frames', () => {
    for (const def of TILE_LIST) {
      const art = TILE_ART[def.key]
      expect(art, `missing tile art '${def.key}'`).toBeDefined()
      expect(art!.frames.length, `'${def.key}' has no frames`).toBeGreaterThanOrEqual(1)
      for (const f of art!.frames) {
        expect([f.w, f.h], `'${def.key}' frame is ${f.w}x${f.h}`).toEqual([16, 16])
      }
    }
  })

  it('animates WATER and FLOWER with two frames, the rest with one', () => {
    for (const def of TILE_LIST) {
      const expected = def.key === 'WATER' || def.key === 'FLOWER' ? 2 : 1
      expect(TILE_ART[def.key]!.frames, `'${def.key}' frame count`).toHaveLength(expected)
    }
  })
})

describe('creature art', () => {
  it('gives all 24 species a front and back within 48x48', () => {
    const keys = Object.keys(SPECIES)
    expect(keys).toHaveLength(24)
    for (const key of keys) {
      const art = MON_ART[key]
      expect(art, `missing mon art '${key}'`).toBeDefined()
      for (const side of ['front', 'back'] as const) {
        const s = art![side]
        expect(s.w, `${key} ${side} width`).toBeLessThanOrEqual(48)
        expect(s.h, `${key} ${side} height`).toBeLessThanOrEqual(48)
        expect(s.w, `${key} ${side} is empty`).toBeGreaterThan(0)
        expect(s.h, `${key} ${side} is empty`).toBeGreaterThan(0)
      }
    }
  })
})

describe('character art', () => {
  it('covers all 14 archetypes and PLAYER_SURF with 16x16 two-frame walks', () => {
    for (const key of WALKERS) {
      const art = CHAR_ART[key]
      expect(art, `missing character art '${key}'`).toBeDefined()
      for (const dir of ['down', 'up', 'side'] as const) {
        expect(art![dir], `${key}.${dir} frame count`).toHaveLength(2)
        for (const f of art![dir]) {
          expect([f.w, f.h], `${key}.${dir} frame is ${f.w}x${f.h}`).toEqual([16, 16])
        }
      }
    }
  })

  it('plants every walk frame on the sprite baseline', () => {
    for (const key of WALKERS) {
      const art = CHAR_ART[key]!
      for (const dir of ['down', 'up', 'side'] as const) {
        art[dir].forEach((f, i) => {
          const lastRow = f.px.subarray((f.h - 1) * f.w)
          expect(
            lastRow.some((v) => v !== 0),
            `${key}.${dir}[${i}] floats above the baseline`,
          ).toBe(true)
        })
      }
    }
  })

  it('has no stowaway keys beyond the cast', () => {
    expect(Object.keys(CHAR_ART).sort()).toEqual([...WALKERS].sort())
  })

  it('sizes the surf wake overlay at 16x8', () => {
    expect([SURF_WAKE.w, SURF_WAKE.h]).toEqual([16, 8])
  })
})

describe('trainer art', () => {
  it('has the player back view within 48x48', () => {
    const back = TRAINER_ART['PLAYER_BACK']
    expect(back, 'missing PLAYER_BACK').toBeDefined()
    expect(back!.sprite.w).toBeLessThanOrEqual(48)
    expect(back!.sprite.h).toBeLessThanOrEqual(48)
  })

  it('has every battle-intro portrait within 48x48', () => {
    for (const key of TRAINER_KEYS) {
      const art = TRAINER_ART[key]
      expect(art, `missing trainer art '${key}'`).toBeDefined()
      expect(art!.sprite.w, `${key} width`).toBeLessThanOrEqual(48)
      expect(art!.sprite.h, `${key} height`).toBeLessThanOrEqual(48)
    }
  })
})

describe('ui art', () => {
  it('builds the frame from 8x8 pieces', () => {
    for (const [name, piece] of Object.entries(UI_ART.frame)) {
      expect([piece.w, piece.h], `frame.${name}`).toEqual([8, 8])
    }
  })

  it('sizes the widgets per spec', () => {
    expect([UI_ART.cursor.w, UI_ART.cursor.h]).toEqual([8, 8])
    expect([UI_ART.arrowMore.w, UI_ART.arrowMore.h]).toEqual([8, 8])
    expect([UI_ART.charm.w, UI_ART.charm.h]).toEqual([16, 16])
    expect([UI_ART.grassRustle.w, UI_ART.grassRustle.h]).toEqual([16, 16])
    expect([UI_ART.shadow.w, UI_ART.shadow.h]).toEqual([16, 8])
  })
})

describe('title art', () => {
  it('sizes the wordmark and emblem per spec', () => {
    expect([TITLE_ART.logo.w, TITLE_ART.logo.h]).toEqual([120, 40])
    expect([TITLE_ART.emblem.w, TITLE_ART.emblem.h]).toEqual([48, 48])
  })

  it('draws the logo with ink on a transparent ground', () => {
    const { px } = TITLE_ART.logo
    let inked = 0
    for (const v of px) if (v !== 0) inked++
    expect(inked).toBeGreaterThan(1000) // thick caps, not a scratch
    expect(inked).toBeLessThan(px.length) // still breathes
  })
})
