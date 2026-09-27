/**
 * The 24 Kindra of Ambervale, transcribed from docs/ROSTER.md §A.
 * Base stat tuples keep the roster's column order (HP/ATK/DEF/SPA/SPD/SPE)
 * so each entry can be eyeballed against the doc. Learnsets are cumulative
 * by design; wild/trainer movesets are derived elsewhere (last four moves
 * at or below level). Keys double as display names, UPPERCASE â‰¤10 chars.
 *
 * Tier-1 columns: `evolution` is an ordered rule list (first match wins,
 * MECHANICS §13); `extra` carries badge-gated field skills (HEW/WAVERIDE/
 * HEAVE/LUMINA) and the Gen-2 wild held-item bands (common 23%, rare 2%;
 * one cumulative rand(0..99) draw in rollEncounter, MECHANICS §10.2).
 */
import type { ElemType, EvolutionRule, GrowthCurve, Species, Stats } from '../types'

type BaseTuple = [hp: number, atk: number, def: number, spa: number, spd: number, spe: number]

const S = (
  id: number, key: string, type1: ElemType, type2: ElemType | null,
  base: BaseTuple, catchRate: number, baseExp: number, growth: GrowthCurve,
  learnset: [level: number, move: string][], entry: string,
  evolution?: EvolutionRule[],
  extra?: Pick<Species, 'fieldSkills' | 'heldItems'>,
): Species => {
  const [hp, atk, def, spa, spd, spe] = base
  const stats: Stats = { hp, atk, def, spa, spd, spe }
  const s: Species = {
    id, key, type1, base: stats, catchRate, baseExp, growth,
    learnset: learnset.map(([level, move]) => ({ level, move })),
    entry,
  }
  if (type2) s.type2 = type2
  if (evolution) s.evolution = evolution
  if (extra?.fieldSkills) s.fieldSkills = extra.fieldSkills
  if (extra?.heldItems) s.heldItems = extra.heldItems
  return s
}

const ALL: readonly Species[] = [
  S(1, 'VERDIL', 'grass', null, [50, 49, 55, 49, 55, 52], 45, 64, 'mediumSlow',
    [[1, 'POUNCE'], [1, 'BRISTLE'], [7, 'SAP_SIP'], [10, 'LEAF_LASH'],
      [15, 'NUMB_POWDER'], [22, 'VERDANT_COIL'], [28, 'MORNING_DEW']],
    'Its leaf tail tastes the wind. The leaf curls tight a full hour before rain reaches the valley.',
    [{ kind: 'level', level: 16, into: 'VERDRAKE' }],
    { fieldSkills: ['HEW'] }),
  S(2, 'VERDRAKE', 'grass', null, [70, 62, 80, 63, 80, 60], 45, 142, 'mediumSlow',
    [[1, 'POUNCE'], [1, 'BRISTLE'], [1, 'SAP_SIP'], [10, 'LEAF_LASH'],
      [15, 'NUMB_POWDER'], [18, 'VERDANT_COIL'], [26, 'MORNING_DEW'], [31, 'TRAMPLE']],
    'Moss plates harden along its spine with age. Old trees lean toward it as if listening.',
    undefined, { fieldSkills: ['HEW'] }),
  S(3, 'EMBERIT', 'fire', null, [44, 58, 42, 60, 42, 64], 45, 65, 'mediumSlow',
    [[1, 'POUNCE'], [6, 'SOOT_VEIL'], [9, 'CINDER_SPIT'], [13, 'QUICK_DART'],
      [19, 'FLARE_SNAP'], [26, 'RILE_UP'], [31, 'PYRE_SPINES']],
    'Sparks nest in the fur of its back. It dozes in warm ash and wakes smelling of woodsmoke.',
    [{ kind: 'level', level: 14, into: 'CINDERAX' }]),
  S(4, 'CINDERAX', 'fire', null, [58, 76, 54, 80, 54, 86], 45, 143, 'mediumSlow',
    [[1, 'POUNCE'], [1, 'SOOT_VEIL'], [9, 'CINDER_SPIT'], [13, 'QUICK_DART'],
      [18, 'FLARE_SNAP'], [24, 'RILE_UP'], [28, 'PYRE_SPINES'], [34, 'RECKLESS_RAM']],
    'When riled, its back spines burn white-hot. It rakes embers into a ring and sleeps at the center.'),
  S(5, 'RILLET', 'water', null, [52, 55, 50, 55, 50, 48], 45, 66, 'mediumSlow',
    [[1, 'POUNCE'], [6, 'CURL_UP'], [8, 'WATER_DART'], [14, 'FOAM_BURST'],
      [19, 'GNAW'], [28, 'RIVER_SURGE']],
    'A river pup that drums its belly when happy. It can nap mid-stream, anchored by its tail.',
    [{ kind: 'level', level: 15, into: 'CASCOTT' }],
    { fieldSkills: ['WAVERIDE'] }),
  S(6, 'CASCOTT', 'water', null, [72, 75, 66, 70, 66, 63], 45, 144, 'mediumSlow',
    [[1, 'POUNCE'], [1, 'CURL_UP'], [8, 'WATER_DART'], [14, 'FOAM_BURST'],
      [21, 'GNAW'], [26, 'TRAMPLE'], [32, 'RIVER_SURGE']],
    'It climbs waterfalls by riding the spray upward. Its flat tail steers like a ferry rudder.',
    undefined, { fieldSkills: ['WAVERIDE', 'HEAVE'] }),
  S(7, 'WRENLET', 'normal', 'flying', [40, 45, 35, 30, 30, 56], 255, 54, 'mediumFast',
    [[1, 'BEAK_JAB'], [1, 'BRISTLE'], [5, 'SAND_KICK'], [9, 'AIR_SWIRL'],
      [13, 'QUICK_DART'], [19, 'WING_SMACK'], [25, 'WIND_SPRINT']],
    'Its three-note dawn song wakes whole villages. It is never a minute late, even in winter.',
    [{ kind: 'level', level: 12, into: 'GALEWREN' }]),
  S(8, 'GALEWREN', 'normal', 'flying', [60, 65, 50, 45, 45, 81], 90, 113, 'mediumFast',
    [[1, 'BEAK_JAB'], [1, 'BRISTLE'], [5, 'SAND_KICK'], [9, 'AIR_SWIRL'],
      [14, 'QUICK_DART'], [21, 'WING_SMACK'], [27, 'WIND_SPRINT'], [33, 'DIVE_BOMB']],
    'Its long tail feathers read the wind. Couriers once trusted it to outrace any storm.'),
  S(9, 'SCURRIL', 'normal', null, [42, 50, 36, 32, 36, 60], 255, 51, 'mediumFast',
    [[1, 'POUNCE'], [1, 'BRISTLE'], [6, 'QUICK_DART'], [10, 'TAIL_FLURRY'],
      [14, 'GNAW'], [21, 'CURL_UP'], [27, 'TRAMPLE']],
    'It stuffs its cheeks with seeds, then forgets where half are buried. The forest is grateful.',
    [{ kind: 'level', level: 13, into: 'THATCHRAT' }]),
  S(10, 'THATCHRAT', 'normal', null, [65, 76, 54, 45, 56, 84], 90, 116, 'mediumFast',
    [[1, 'POUNCE'], [1, 'BRISTLE'], [6, 'QUICK_DART'], [12, 'TAIL_FLURRY'],
      [16, 'GNAW'], [24, 'TRAMPLE'], [30, 'RECKLESS_RAM']],
    'It weaves its nest into roof thatch. A home with a THATCHRAT in the eaves never leaks.',
    undefined, { heldItems: [{ item: 'PLUMP_BERRY', chance: 23 }] }),
  S(11, 'THREDLE', 'bug', null, [40, 30, 33, 20, 25, 47], 255, 50, 'mediumFast',
    [[1, 'POUNCE'], [1, 'SILK_SNARE'], [4, 'VENOM_BARB'], [8, 'CHITIN_BITE'],
      [12, 'CURL_UP']],
    'It trails a fine silver thread wherever it crawls. Lost children once followed them home.',
    [{ kind: 'level', level: 7, into: 'SPOOLEN' }]),
  S(12, 'SPOOLEN', 'bug', null, [48, 25, 52, 22, 28, 30], 190, 58, 'mediumFast',
    [[1, 'CHITIN_BITE'], [1, 'SILK_SNARE'], [1, 'CURL_UP'], [7, 'VENOM_BARB'],
      [9, 'BRISTLE']],
    'Wound tight in its own silk, it hardly stirs. Inside, every part of it is being rewoven.',
    // Ordered: levelling at night reweaves it darker (the moth outranks the
    // butterfly); the LINK CORD re-spools the spool, thread to thread.
    [{ kind: 'level', level: 10, into: 'DUSKMOTH', period: 'night' },
      { kind: 'level', level: 10, into: 'LACEWING' },
      { kind: 'link', into: 'LACEWING' }]),
  S(13, 'LACEWING', 'bug', 'flying', [60, 45, 50, 75, 70, 70], 90, 128, 'mediumFast',
    [[1, 'AIR_SWIRL'], [1, 'SILK_SNARE'], [10, 'MIND_RIPPLE'], [13, 'SPORE_PUFF'],
      [15, 'NUMB_POWDER'], [20, 'PETAL_DRIFT'], [27, 'SHIMMER_DUST']],
    'Its wings are living lace that scatter sunlight into rings. It sips dew instead of nectar.'),
  S(14, 'DUSKMOTH', 'bug', 'dark', [50, 38, 42, 60, 55, 45], 190, 88, 'mediumFast',
    [[1, 'AIR_SWIRL'], [5, 'NUMB_POWDER'], [10, 'SHIMMER_DUST'], [15, 'DREAM_MIST'],
      [21, 'SHADOWSTEP'], [27, 'MIND_RIPPLE']],
    "It flies only after dusk, shedding a faint shimmer. Lamplighters call it the night's lantern."),
  S(15, 'HUSHOWL', 'dark', 'flying', [64, 52, 46, 48, 56, 54], 190, 92, 'mediumFast',
    [[1, 'BEAK_JAB'], [6, 'LULLABELL'], [11, 'NIGHT_NIP'], [16, 'WING_SMACK'],
      [22, 'MIND_RIPPLE'], [28, 'DIVE_BOMB']],
    'It flies without a whisper of sound. You learn it was watching only when morning comes.',
    undefined, { heldItems: [{ item: 'KEEN_LENS', chance: 2 }] }),
  S(16, 'DEWBELL', 'water', null, [50, 33, 48, 58, 62, 39], 190, 84, 'mediumFast',
    [[1, 'WATER_DART'], [6, 'LULLABELL'], [10, 'FOAM_BURST'], [16, 'MORNING_DEW'],
      [22, 'FROST_DEW']],
    'It gathers from dew on shrine bells at first light. By midmorning it is gone like mist.',
    [{ kind: 'stone', item: 'TOLL_SHARD', into: 'TOLLGEIST' }],
    { heldItems: [{ item: 'TINGLE_BERRY', chance: 23 }, { item: 'TOLL_SHARD', chance: 2 }] }),
  S(17, 'PADDLET', 'water', null, [50, 42, 55, 40, 45, 30], 255, 60, 'mediumFast',
    [[1, 'POUNCE'], [1, 'CURL_UP'], [6, 'WATER_DART'], [12, 'FOAM_BURST'],
      [18, 'GNAW'], [25, 'RIVER_SURGE']],
    'Its shell is still soft, so it floats more than it dives. It paddles in earnest, tiny circles.',
    [{ kind: 'level', level: 16, into: 'TORTIDE' }],
    { fieldSkills: ['WAVERIDE'] }),
  S(18, 'TORTIDE', 'water', null, [72, 60, 85, 58, 65, 40], 90, 126, 'mediumFast',
    [[1, 'POUNCE'], [1, 'CURL_UP'], [6, 'WATER_DART'], [12, 'FOAM_BURST'],
      [20, 'GNAW'], [26, 'TRAMPLE'], [33, 'RIVER_SURGE']],
    'Bellmere folk say the tide turns when a sleeping TORTIDE rolls over on the lakebed.',
    undefined, { fieldSkills: ['WAVERIDE', 'HEAVE'] }),
  S(19, 'ZEPHYRIL', 'flying', 'psychic', [60, 50, 55, 80, 70, 85], 45, 150, 'mediumFast',
    [[1, 'AIR_SWIRL'], [1, 'QUICK_DART'], [9, 'MIND_RIPPLE'], [13, 'ZEPHYR_LANCE'],
      [18, 'WIND_SPRINT'], [24, 'DREAM_MIST'], [30, 'DIVE_BOMB']],
    'A spirit of the high wind. Weathervanes spin to follow it though no breeze can be felt.'),
  S(20, 'SHADEKIT', 'dark', null, [45, 55, 40, 50, 40, 65], 190, 70, 'mediumFast',
    [[1, 'POUNCE'], [5, 'SHADOWSTEP'], [8, 'NIGHT_NIP'], [13, 'RILE_UP'],
      [18, 'GLOOM_CLAW'], [25, 'WIND_SPRINT']],
    'A kit with shadow-soft fur. It hides inside your own shadow and matches your stride exactly.',
    // Ordered: a beloved kit changes with the dusk (the Umbreon homage,
    // bond >= 220 checked at level-up) before plain level 18 catches it.
    [{ kind: 'bond', min: 220, into: 'GLOAMFANG', period: 'night' },
      { kind: 'level', level: 18, into: 'GLOAMFANG' }]),
  S(21, 'GLOAMFANG', 'dark', null, [65, 78, 52, 65, 52, 80], 90, 132, 'mediumFast',
    [[1, 'POUNCE'], [1, 'SHADOWSTEP'], [8, 'NIGHT_NIP'], [14, 'RILE_UP'],
      [20, 'GLOOM_CLAW'], [28, 'WIND_SPRINT']],
    'It hunts in the hour between lights. Its eyes hold the last gleam of a shuttered lantern.'),
  S(22, 'WISPETAL', 'ghost', 'grass', [44, 35, 40, 70, 65, 56], 190, 95, 'mediumFast',
    [[1, 'STARTLE'], [6, 'SAP_SIP'], [10, 'BLIGHTSPORE'], [14, 'PETAL_DRIFT'],
      [19, 'CHILL_TOUCH'], [26, 'DREAM_MIST']],
    'Wisteria petals that refused to touch the ground. They drift the spire halls, remembering.',
    undefined, { fieldSkills: ['LUMINA'], heldItems: [{ item: 'LUMEN_BERRY', chance: 2 }] }),
  S(23, 'TOLLGEIST', 'ghost', null, [55, 48, 65, 60, 65, 35], 190, 102, 'mediumFast',
    [[1, 'CHILL_TOUCH'], [5, 'STARTLE'], [9, 'LULLABELL'], [14, 'BELL_TOLL'],
      [20, 'CURL_UP'], [27, 'MIND_RIPPLE']],
    'A cracked shrine bell that learned to ring itself. Its midnight toll counts what no one sees.'),
  S(24, 'AMBERSTAG', 'normal', 'psychic', [95, 75, 70, 95, 85, 60], 3, 200, 'slow',
    [[1, 'QUICK_DART'], [1, 'MIND_RIPPLE'], [9, 'MORNING_DEW'], [16, 'TRAMPLE'],
      [24, 'WIND_SPRINT'], [31, 'DAWN_LANCE']],
    'Trail walkers swear dawn came twice: once with antlers of amber light, and then the sun.',
    undefined, { fieldSkills: ['LUMINA'] }),
]

export const SPECIES: Record<string, Species> = Object.fromEntries(
  ALL.map((s): [string, Species] => [s.key, s]),
)

// ── Egg groups (Tier 2 breeding, MECHANICS §15) ─────────────────────────────
// A side table rather than a Species field: the domain model in types.ts is
// frozen this milestone, and breeding compatibility is registry data anyway —
// kindra.ts reads it through eggGroupOf(). Five flavor-derived groups from
// docs/ROSTER.md §A; every evolution family shares exactly one group (pinned
// by tests/breeding.test.ts), so a hatchling's base form never crosses groups.

/** Breeding compatibility band; absent from EGG_GROUPS = does not breed. */
export type EggGroup = 'field' | 'shore' | 'sky' | 'brood' | 'drift'

/** Species → group. AMBERSTAG is deliberately absent — the legend does not breed. */
export const EGG_GROUPS: Record<string, EggGroup> = {
  // FIELD — newt, shrew, vole, fox: the furred walkers.
  VERDIL: 'field', VERDRAKE: 'field',
  EMBERIT: 'field', CINDERAX: 'field',
  SCURRIL: 'field', THATCHRAT: 'field',
  SHADEKIT: 'field', GLOAMFANG: 'field',
  // SHORE — the otter naps mid-stream; the turtle paddles in earnest.
  RILLET: 'shore', CASCOTT: 'shore',
  PADDLET: 'shore', TORTIDE: 'shore',
  // SKY — dawn songbird, silent owl, the spirit of the high wind.
  WRENLET: 'sky', GALEWREN: 'sky',
  HUSHOWL: 'sky', ZEPHYRIL: 'sky',
  // BROOD — one silk family, egg to moth.
  THREDLE: 'brood', SPOOLEN: 'brood', LACEWING: 'brood', DUSKMOTH: 'brood',
  // DRIFT — the haunted-shrine trio: dew bell, cracked bell, petals remembering.
  DEWBELL: 'drift', TOLLGEIST: 'drift', WISPETAL: 'drift',
}
