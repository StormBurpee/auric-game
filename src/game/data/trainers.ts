/**
 * Every trainer of the slice, transcribed from docs/ROSTER.md §C.
 *
 * CORVIN's Trail 2 ambush exists in three variants keyed by the PLAYER'S
 * starter (he counter-picked at the lab): he always leads with the
 * SHADEKIT he stole, then sends the starter strong against the player's.
 * The overworld script selects `RIVAL_CORVIN_T2_<playerStarter>`.
 *
 * `defeatText` keys resolve in data/strings.ts (docs/STORY.md); sprites
 * are TRAINER_ART keys (docs/ART_SPEC.md). ARIA's reward is the Glints
 * half of "ZEPHYR BADGE + 1300G" — the badge is granted by the gym script.
 *
 * A party tuple's optional third slot is a held item key (Tier 1,
 * MECHANICS §5.5): CORVIN's stolen SHADEKIT nibbles a PLUMP BERRY, IVY's
 * WISPETAL keeps an herbalist's LUMEN BERRY, and ARIA's ace carries the
 * AMBER CRUMB — the slice's one trainer-held leftovers.
 *
 * Tier 2 (the Charm Gear): the four Trail 2 trainers carry a `contact`
 * and swap numbers after their first defeat; calling them can arm one
 * rematch against the ordinary `<key>_R1` def below (fought on talk,
 * never ambush). Rematch parties run +5-6 levels with evolutions the
 * dex earns, and purses scale 1.5x the first bout.
 */
import type { TrainerContact, TrainerDef } from '../types'

const T = (
  key: string, name: string, sprite: string, ai: TrainerDef['ai'],
  reward: number, defeatText: string,
  party: [species: string, level: number, held?: string][],
  contact?: TrainerContact,
): TrainerDef => ({
  key, name, sprite, ai, reward, defeatText,
  party: party.map(([species, level, held]) =>
    held ? { species, level, held } : { species, level }),
  ...(contact ? { contact } : {}),
})

/** All four phone friends of the slice stand on Trail 2. */
const onTrail2 = (name: string): TrainerContact => ({ name, place: 'TRAIL 2' })

const ALL: readonly TrainerDef[] = [
  // Rival — Trail 2 ambush, one variant per player starter.
  T('RIVAL_CORVIN_T2_VERDIL', 'RIVAL CORVIN', 'TRAINER_CORVIN', 'smart', 270,
    'story.rival1.defeat', [['SHADEKIT', 8, 'PLUMP_BERRY'], ['EMBERIT', 9]]),
  T('RIVAL_CORVIN_T2_EMBERIT', 'RIVAL CORVIN', 'TRAINER_CORVIN', 'smart', 270,
    'story.rival1.defeat', [['SHADEKIT', 8, 'PLUMP_BERRY'], ['RILLET', 9]]),
  T('RIVAL_CORVIN_T2_RILLET', 'RIVAL CORVIN', 'TRAINER_CORVIN', 'smart', 270,
    'story.rival1.defeat', [['SHADEKIT', 8, 'PLUMP_BERRY'], ['VERDIL', 9]]),
  // Trail 2.
  T('SCOUT_BEN', 'SCOUT BEN', 'TRAINER_SCOUT', 'random', 110,
    'story.trail2.ben.defeat', [['WRENLET', 6], ['SCURRIL', 7]],
    onTrail2('BEN')),
  T('FORAGER_MAE', 'FORAGER MAE', 'TRAINER_FORAGER', 'random', 120,
    'story.trail2.mae.defeat', [['THREDLE', 6], ['SPOOLEN', 8]],
    onTrail2('MAE')),
  T('BELLRINGER_OTTO', 'BELLRINGER OTTO', 'TRAINER_BELLRINGER', 'random', 160,
    'story.trail2.otto.defeat', [['DEWBELL', 8]],
    onTrail2('OTTO')),
  T('HERBALIST_IVY', 'HERBALIST IVY', 'TRAINER_HERBALIST', 'random', 180,
    'story.trail2.ivy.defeat', [['WISPETAL', 9, 'LUMEN_BERRY']],
    onTrail2('IVY')),
  // Trail 2 rematch tier 1 (Charm Gear): BEN's WRENLET fledged into the
  // GALEWREN it earns at 12; MAE's cocoon opened by day (SPOOLEN ->
  // LACEWING at 10) while her THREDLE stays her well-babied first bug;
  // OTTO and IVY simply raised their one true partner.
  T('SCOUT_BEN_R1', 'SCOUT BEN', 'TRAINER_SCOUT', 'random', 165,
    'story.rematch.ben.defeat', [['GALEWREN', 12], ['SCURRIL', 12]]),
  T('FORAGER_MAE_R1', 'FORAGER MAE', 'TRAINER_FORAGER', 'random', 180,
    'story.rematch.mae.defeat', [['THREDLE', 11], ['LACEWING', 14]]),
  T('BELLRINGER_OTTO_R1', 'BELLRINGER OTTO', 'TRAINER_BELLRINGER', 'random', 240,
    'story.rematch.otto.defeat', [['DEWBELL', 14]]),
  T('HERBALIST_IVY_R1', 'HERBALIST IVY', 'TRAINER_HERBALIST', 'random', 270,
    'story.rematch.ivy.defeat', [['WISPETAL', 15, 'LUMEN_BERRY']]),
  // Loomspire Gym — trainees, then the Wind Warden (GALEWREN pre-evolved
  // by leader convention; her lv-13 ZEPHYRIL carries ZEPHYR_LANCE).
  T('GLIDER_FERN', 'GLIDER FERN', 'TRAINER_TRAINEE', 'random', 130,
    'story.gym.fern.defeat', [['WRENLET', 7], ['WRENLET', 8]]),
  T('GLIDER_JUNO', 'GLIDER JUNO', 'TRAINER_TRAINEE', 'random', 150,
    'story.gym.juno.defeat', [['HUSHOWL', 9]]),
  T('WARDEN_ARIA', 'WIND WARDEN ARIA', 'TRAINER_ARIA', 'smart', 1300,
    'story.gym.aria.defeat',
    [['WRENLET', 9], ['GALEWREN', 11], ['ZEPHYRIL', 13, 'AMBER_CRUMB']]),
]

export const TRAINERS: Record<string, TrainerDef> = Object.fromEntries(
  ALL.map((t): [string, TrainerDef] => [t.key, t]),
)
