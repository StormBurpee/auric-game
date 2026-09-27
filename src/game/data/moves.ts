/**
 * All 46 moves, transcribed from docs/ROSTER.md §B with the EFFECT.*
 * vocabulary of docs/MECHANICS.md §12 mapped onto the MoveEffect union.
 * `accuracy: null` marks moves the spec exempts from the accuracy check
 * ("—" in the roster table); power 0 marks non-damaging moves. Stat
 * abbreviations follow the docs' convention: SPD is special defense,
 * SPE is speed.
 */
import type { BattleStat, ElemType, Move, MoveEffect, Rider, StatusId } from '../types'

const plain: MoveEffect = { kind: 'strike' }
const strike = (...riders: Rider[]): MoveEffect => ({ kind: 'strike', riders })
const inflict = (status: StatusId): MoveEffect => ({ kind: 'inflict', status })
const raiseSelf = (stat: BattleStat, delta: number): MoveEffect =>
  ({ kind: 'statChange', target: 'self', changes: [{ stat, delta }] })
const lowerFoe = (stat: BattleStat, delta: number): MoveEffect =>
  ({ kind: 'statChange', target: 'foe', changes: [{ stat, delta }] })

const status = (s: StatusId, chance: number): Rider => ({ kind: 'status', status: s, chance })
const flinch = (chance: number): Rider => ({ kind: 'flinch', chance })
const confuse = (chance: number): Rider => ({ kind: 'confuse', chance })
const lowerRider = (stat: BattleStat, delta: number, chance: number): Rider =>
  ({ kind: 'stat', target: 'foe', stat, delta, chance })

interface Flags { priority?: number; highCrit?: boolean }
const M = (
  key: string, name: string, type: ElemType, power: number,
  accuracy: number | null, pp: number, effect: MoveEffect, flags?: Flags,
): Move => ({ key, name, type, power, accuracy, pp, effect, ...flags })

const ALL: readonly Move[] = [
  // ── Normal ────────────────────────────────────────────────────────────────
  M('POUNCE', 'Pounce', 'normal', 40, 100, 35, plain),
  M('GNAW', 'Gnaw', 'normal', 55, 95, 25, plain),
  M('QUICK_DART', 'Quick Dart', 'normal', 40, 100, 30, plain, { priority: 1 }),
  M('TAIL_FLURRY', 'Tail Flurry', 'normal', 15, 85, 20, strike({ kind: 'multiHit' })),
  M('TRAMPLE', 'Trample', 'normal', 85, 100, 15, strike(status('par', 30))),
  M('RECKLESS_RAM', 'Reckless Ram', 'normal', 90, 85, 20, strike({ kind: 'recoil' })),
  M('BRISTLE', 'Bristle', 'normal', 0, 100, 30, lowerFoe('atk', -1)),
  M('SAND_KICK', 'Sand Kick', 'normal', 0, 100, 15, lowerFoe('acc', -1)),
  M('SOOT_VEIL', 'Soot Veil', 'normal', 0, 100, 20, lowerFoe('acc', -1)),
  M('CURL_UP', 'Curl Up', 'normal', 0, null, 30, raiseSelf('def', 1)),
  M('RILE_UP', 'Rile Up', 'normal', 0, null, 20, raiseSelf('atk', 2)),
  M('WIND_SPRINT', 'Wind Sprint', 'normal', 0, null, 30, raiseSelf('spe', 2)),
  M('LULLABELL', 'Lullabell', 'normal', 0, 55, 15, inflict('slp')),
  // ── Grass ─────────────────────────────────────────────────────────────────
  M('SAP_SIP', 'Sap Sip', 'grass', 40, 100, 20, strike({ kind: 'drain' })),
  M('LEAF_LASH', 'Leaf Lash', 'grass', 55, 95, 25, plain, { highCrit: true }),
  M('PETAL_DRIFT', 'Petal Drift', 'grass', 60, 100, 20, plain),
  M('VERDANT_COIL', 'Verdant Coil', 'grass', 75, 100, 10, strike(lowerRider('spd', -1, 100))),
  M('SPORE_PUFF', 'Spore Puff', 'grass', 0, 75, 15, inflict('slp')),
  M('NUMB_POWDER', 'Numb Powder', 'grass', 0, 75, 30, inflict('par')),
  // ── Fire ──────────────────────────────────────────────────────────────────
  M('CINDER_SPIT', 'Cinder Spit', 'fire', 40, 100, 25, strike(status('brn', 10))),
  M('FLARE_SNAP', 'Flare Snap', 'fire', 65, 100, 15, plain),
  M('PYRE_SPINES', 'Pyre Spines', 'fire', 80, 95, 10, strike(status('brn', 10))),
  // ── Water ─────────────────────────────────────────────────────────────────
  M('WATER_DART', 'Water Dart', 'water', 40, 100, 25, plain),
  M('FOAM_BURST', 'Foam Burst', 'water', 50, 100, 15, strike(lowerRider('spd', -1, 100))),
  M('RIVER_SURGE', 'River Surge', 'water', 80, 95, 10, plain),
  M('MORNING_DEW', 'Morning Dew', 'water', 0, null, 10, { kind: 'heal', fraction: 0.5 }),
  // ── Ice ───────────────────────────────────────────────────────────────────
  M('FROST_DEW', 'Frost Dew', 'ice', 55, 95, 15, strike(status('frz', 10))),
  // ── Flying ────────────────────────────────────────────────────────────────
  M('BEAK_JAB', 'Beak Jab', 'flying', 35, 100, 35, plain),
  M('AIR_SWIRL', 'Air Swirl', 'flying', 40, 100, 35, plain),
  M('WING_SMACK', 'Wing Smack', 'flying', 60, 100, 25, plain),
  M('DIVE_BOMB', 'Dive Bomb', 'flying', 60, 100, 20, strike(flinch(30))),
  M('ZEPHYR_LANCE', 'Zephyr Lance', 'flying', 80, 95, 10, plain, { highCrit: true }),
  // ── Bug ───────────────────────────────────────────────────────────────────
  M('SILK_SNARE', 'Silk Snare', 'bug', 30, 95, 25, strike(lowerRider('spd', -1, 100))),
  M('CHITIN_BITE', 'Chitin Bite', 'bug', 45, 100, 25, plain),
  M('SHIMMER_DUST', 'Shimmer Dust', 'bug', 60, 100, 15, strike(confuse(20))),
  // ── Poison ────────────────────────────────────────────────────────────────
  M('VENOM_BARB', 'Venom Barb', 'poison', 15, 100, 35, strike(status('psn', 20))),
  M('BLIGHTSPORE', 'Blightspore', 'poison', 0, 75, 20, inflict('psn')),
  // ── Dark ──────────────────────────────────────────────────────────────────
  M('NIGHT_NIP', 'Night Nip', 'dark', 60, 100, 25, strike(flinch(30))),
  M('SHADOWSTEP', 'Shadowstep', 'dark', 40, 100, 25, plain, { priority: 1 }),
  M('GLOOM_CLAW', 'Gloom Claw', 'dark', 70, 100, 15, plain),
  // ── Ghost ─────────────────────────────────────────────────────────────────
  M('STARTLE', 'Startle', 'ghost', 30, 100, 25, strike(flinch(30))),
  M('CHILL_TOUCH', 'Chill Touch', 'ghost', 30, 100, 30, strike(status('par', 30))),
  M('BELL_TOLL', 'Bell Toll', 'ghost', 60, 95, 15, strike(confuse(20))),
  // ── Psychic ───────────────────────────────────────────────────────────────
  M('MIND_RIPPLE', 'Mind Ripple', 'psychic', 50, 100, 25, strike(confuse(20))),
  M('DREAM_MIST', 'Dream Mist', 'psychic', 0, 60, 15, inflict('slp')),
  M('DAWN_LANCE', 'Dawn Lance', 'psychic', 90, 100, 5, plain),
]

export const MOVES: Record<string, Move> = Object.fromEntries(
  ALL.map((m): [string, Move] => [m.key, m]),
)
