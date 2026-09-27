/**
 * Field skills — the traversal vocabulary, badge-gated party abilities.
 * No move slots are ever spent (the modern mercy); the ritual that
 * remains is the one that mattered: a badge earned, and a companion who
 * steps forward by name.
 *
 * A skill with `badge: null` is not earnable yet — its obstacles speak
 * in teasers until a future badge claims it.
 */
import { speciesOf } from '../data'
import type { FieldSkillId, Kindra, SaveData } from '../types'

export interface FieldSkillDef {
  id: FieldSkillId
  /** Display name, ≤12 chars. */
  name: string
  badge: string | null
}

export const FIELD_SKILLS: Record<FieldSkillId, FieldSkillDef> = {
  HEW: { id: 'HEW', name: 'HEW', badge: 'ZEPHYR' },
  WAVERIDE: { id: 'WAVERIDE', name: 'WAVERIDE', badge: 'ZEPHYR' },
  HEAVE: { id: 'HEAVE', name: 'HEAVE', badge: null },
  LUMINA: { id: 'LUMINA', name: 'LUMINA', badge: null },
}

/**
 * First party member able to perform the skill now (fainted still counts —
 * HM tradition; eggs never do — a VERDIL egg must not answer HEW), else null.
 */
export function fieldPartner(state: SaveData, skill: FieldSkillId): Kindra | null {
  const def = FIELD_SKILLS[skill]
  if (def.badge === null || !state.badges.includes(def.badge)) return null
  return state.party.find(
    (k) => k.egg === undefined && speciesOf(k.species).fieldSkills?.includes(skill),
  ) ?? null
}
