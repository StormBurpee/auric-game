/**
 * The Outfitter's shelf, per docs/MECHANICS.md §8.1 and the content spec.
 * Charm multipliers feed the Gen-2 capture math; the AURIC SIGIL's
 * `sigil` flag skips it entirely (guaranteed catch). Hold items carry a
 * HoldEffect for the battle pipeline (§5.5); stones and the LINK CORD
 * fire EvolutionRules (§13). Prices are in Glints; 0 marks an item that
 * is never sold. Descriptions must word-wrap to ≤2 lines of 18 glyphs
 * (the bag/shop panel height).
 *
 * Save compatibility: item keys are referenced by saved data (`bag`,
 * `Kindra.heldItem`). Adding keys is free; renaming or removing one
 * forces a save-version bump with a migration.
 */
import type { Item } from '../types'

export const ITEMS: Record<string, Item> = {
  CHARM: {
    key: 'CHARM',
    name: 'CHARM',
    desc: 'A woven charm. Calms wild Kindra.',
    price: 200,
    effect: { kind: 'charm', mult: 1 },
  },
  GILDED_CHARM: {
    key: 'GILDED_CHARM',
    name: 'GILDED CHARM',
    desc: 'Gold-leafed. Wary Kindra linger.',
    price: 600,
    effect: { kind: 'charm', mult: 1.5 },
  },
  AURIC_SIGIL: {
    key: 'AURIC_SIGIL',
    name: 'AURIC SIGIL',
    desc: 'The amber seal. No Kindra refuses it.',
    price: 0,
    effect: { kind: 'charm', mult: 1, sigil: true },
  },
  TONIC: {
    key: 'TONIC',
    name: 'TONIC',
    desc: 'Bitter herbs. Restores 20 HP.',
    price: 300,
    effect: { kind: 'heal', amount: 20 },
  },
  BIG_TONIC: {
    key: 'BIG_TONIC',
    name: 'BIG TONIC',
    desc: 'Twice-brewed. Restores 50 HP.',
    price: 700,
    effect: { kind: 'heal', amount: 50 },
  },
  CURE_LEAF: {
    key: 'CURE_LEAF',
    name: 'CURE LEAF',
    desc: 'A cool leaf. Cures any ailment.',
    price: 450,
    effect: { kind: 'cure', status: 'all' },
  },

  // ── Hold items (Tier 1, MECHANICS §5.5) ───────────────────────────────────
  // The type-boost trio stocks the Bellmere Outfitter at 900G apiece.
  CINDER_BAND: {
    key: 'CINDER_BAND',
    name: 'CINDER BAND',
    desc: 'Snug band. Fire moves hit harder.',
    price: 900,
    effect: { kind: 'hold', fx: { kind: 'typeBoost', type: 'fire' } },
  },
  DEW_PEARL: {
    key: 'DEW_PEARL',
    name: 'DEW PEARL',
    desc: 'Cool pearl. Water moves hit harder.',
    price: 900,
    effect: { kind: 'hold', fx: { kind: 'typeBoost', type: 'water' } },
  },
  MOSS_LOCKET: {
    key: 'MOSS_LOCKET',
    name: 'MOSS LOCKET',
    desc: 'Soft moss. Grass moves hit harder.',
    price: 900,
    effect: { kind: 'hold', fx: { kind: 'typeBoost', type: 'grass' } },
  },
  // Find-only: hidden behind the Trail 1 HEW grove.
  AMBER_CRUMB: {
    key: 'AMBER_CRUMB',
    name: 'AMBER CRUMB',
    desc: 'Sweet amber. Mends its holder slowly.',
    price: 0,
    effect: { kind: 'hold', fx: { kind: 'leftovers' } },
  },
  // Find-only: waiting on the Bellmere WAVERIDE islet.
  KEEN_LENS: {
    key: 'KEEN_LENS',
    name: 'KEEN LENS',
    desc: 'Clear lens. Crits land more often.',
    price: 0,
    effect: { kind: 'hold', fx: { kind: 'critBoost' } },
  },
  // The berries arrive held by wild Kindra (§10.2 bands); never sold.
  LUMEN_BERRY: {
    key: 'LUMEN_BERRY',
    name: 'LUMEN BERRY',
    desc: 'Eaten when held to cure any ailment.',
    price: 0,
    effect: { kind: 'hold', fx: { kind: 'cureBerry', cures: 'all' } },
  },
  TINGLE_BERRY: {
    key: 'TINGLE_BERRY',
    name: 'TINGLE BERRY',
    desc: 'Eaten when held to cure paralysis.',
    price: 0,
    effect: { kind: 'hold', fx: { kind: 'cureBerry', cures: 'par' } },
  },
  PLUMP_BERRY: {
    key: 'PLUMP_BERRY',
    name: 'PLUMP BERRY',
    desc: 'Eaten at half HP to mend 10.',
    price: 0,
    effect: { kind: 'hold', fx: { kind: 'hpBerry', heal: 10 } },
  },

  // ── Evolution items (Tier 1, MECHANICS §13) ───────────────────────────────
  // Which Kindra answers a stone is the EvolutionRule's business; DEWBELL
  // hears this one (rare night find, plus one waiting in the Spire's gloom).
  TOLL_SHARD: {
    key: 'TOLL_SHARD',
    name: 'TOLL SHARD',
    desc: 'Bell shard. Some Kindra answer it.',
    price: 0,
    effect: { kind: 'stone' },
  },
  // The trade placeholder. Pour one out for every childhood Haunter that
  // stayed a Haunter because nobody owned a second Game Link Cable —
  // Legends: Arceus canonized the fix as the Linking Cord, and AURIC
  // simply sells it over the counter. Dearly: some jokes cost 2000G.
  LINK_CORD: {
    key: 'LINK_CORD',
    name: 'LINK CORD',
    desc: 'A trade cord. Some Kindra change.',
    price: 2000,
    effect: { kind: 'link' },
  },

  // ── Field gear (Tier 2, MECHANICS §10.4) ──────────────────────────────────
  // Never sold; the Bellmere angler's gift. One rod, one lake, no hurry —
  // casting is an A-press at the water's edge, not a bag use.
  OLD_ROD: {
    key: 'OLD_ROD',
    name: 'OLD ROD',
    desc: 'A trusty rod. Cast where water waits.',
    price: 0,
    effect: { kind: 'rod' },
  },
}
