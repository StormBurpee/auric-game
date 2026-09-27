/**
 * The domain model of Ambervale. Pure types, no behaviour — every module
 * in the game speaks this vocabulary, and the design docs in /docs are
 * transcribed into these shapes.
 */
import type { DayPeriod } from '../engine'

// ── Elements ────────────────────────────────────────────────────────────────
/** The seventeen classic types. In Gen-2 tradition, physical vs special is a property of the TYPE, not the move. */
export type ElemType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel'

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'
export type Stats = Record<StatKey, number>
export type GrowthCurve = 'fast' | 'mediumFast' | 'mediumSlow' | 'slow'
export type StatusId = 'psn' | 'brn' | 'par' | 'slp' | 'frz'
/** Stats that battle stages can push around (-6..+6). */
export type BattleStat = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva'
export type Dir = 'up' | 'down' | 'left' | 'right'

// ── Species & moves ─────────────────────────────────────────────────────────
export interface LearnsetEntry {
  level: number
  move: string
}

/** Badge-gated party skills used in the field (world/fieldskills.ts owns gating). */
export type FieldSkillId = 'HEW' | 'WAVERIDE' | 'HEAVE' | 'LUMINA'

/** JS Date convention: 0 = Sunday … 6 = Saturday. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** How a species becomes someone new. Ordered; the first matching rule wins. */
export type EvolutionRule =
  | { kind: 'level'; level: number; into: string; period?: DayPeriod }
  | { kind: 'stone'; item: string; into: string }
  | { kind: 'bond'; min: number; into: string; period?: DayPeriod }
  /** Fired by the LINK CORD until real trading exists. */
  | { kind: 'link'; into: string }

export interface Species {
  /** Kindex number, 1-based. */
  id: number
  /** UPPERCASE key, ≤10 chars; doubles as the display name. */
  key: string
  type1: ElemType
  type2?: ElemType
  base: Stats
  catchRate: number
  baseExp: number
  growth: GrowthCurve
  evolution?: EvolutionRule[]
  learnset: LearnsetEntry[]
  /** Kindex flavor text. */
  entry: string
  /** Field skills this species can perform once the gating badge is earned. */
  fieldSkills?: FieldSkillId[]
  /** Wild held-item slots, Gen-2 bands: e.g. [{common, 23}, {rare, 2}]; one rand(0..99) draw, cumulative. */
  heldItems?: { item: string; chance: number }[]
}

/** Secondary things a damaging move can do. Chances are percentages (0-100). */
export type Rider =
  | { kind: 'status'; status: StatusId; chance: number }
  | { kind: 'flinch'; chance: number }
  | { kind: 'confuse'; chance: number }
  | { kind: 'stat'; target: 'self' | 'foe'; stat: BattleStat; delta: number; chance: number }
  | { kind: 'drain' }
  | { kind: 'recoil' }
  | { kind: 'multiHit' }
  | { kind: 'recharge' }

export type MoveEffect =
  /** A damaging move, possibly with riders. */
  | { kind: 'strike'; riders?: Rider[] }
  /** Pure status infliction (accuracy-checked). */
  | { kind: 'inflict'; status: StatusId }
  | { kind: 'confuseFoe' }
  /** Pure stat-stage changes. */
  | { kind: 'statChange'; target: 'self' | 'foe'; changes: { stat: BattleStat; delta: number }[] }
  /** Restore a fraction of max HP. */
  | { kind: 'heal'; fraction: number }

export interface Move {
  key: string
  /** Display name, ≤12 chars. */
  name: string
  type: ElemType
  /** 0 for non-damaging moves. */
  power: number
  /** 1-100, or null for moves that never miss the accuracy check. */
  accuracy: number | null
  pp: number
  effect: MoveEffect
  /** Turn-order bracket; 0 for normal moves. */
  priority?: number
  highCrit?: boolean
}

// ── A living creature ───────────────────────────────────────────────────────
export interface MoveSlot {
  move: string
  pp: number
  ppMax: number
}

export interface Kindra {
  species: string
  nickname?: string
  level: number
  exp: number
  /** Inborn variance, 0-15 per stat (the Gen-2 "DV" tradition). */
  genes: Stats
  /** Stat experience accumulated from battle (Gen-2 tradition; grows slowly). */
  statExp: Stats
  /** Current HP; max HP is derived from species/level/genes/statExp. */
  hp: number
  status: StatusId | null
  moves: MoveSlot[]
  /** Friendship, 0-255; starts at BOND_BASE (70). Gen-2 happiness tradition. */
  bond: number
  /** Item key currently held; absent = holding nothing. Berries delete it on trigger. */
  heldItem?: string
  /** Species key this Kindra is ready to evolve into (set on level-up, cleared on evolve/cancel). */
  pendingEvo?: string
  /** Steps until this egg hatches; present = it IS an egg (species names the baby). */
  egg?: number
}

// ── Items, trainers, battles ────────────────────────────────────────────────
/** What a held item does while a Kindra carries it. */
export type HoldEffect =
  /** ×1.1 on the holder's moves of this type (MECHANICS §2.4 item term). */
  | { kind: 'typeBoost'; type: ElemType }
  /** End of turn: restore max(1, floor(maxHP/16)). */
  | { kind: 'leftovers' }
  /** +1 stage on the crit ladder (MECHANICS §2.2). */
  | { kind: 'critBoost' }
  /** Consumed to cure a major status the moment it applies. */
  | { kind: 'cureBerry'; cures: StatusId | 'all' }
  /** Consumed at or below half HP to restore `heal`. */
  | { kind: 'hpBerry'; heal: number }

export type ItemKind =
  | { kind: 'charm'; mult: number; sigil?: boolean }
  | { kind: 'heal'; amount: number }
  | { kind: 'cure'; status: StatusId | 'all' }
  /** Evolution stone; which species answers it is the EvolutionRule's business. */
  | { kind: 'stone' }
  /** The LINK CORD: fires 'link' evolution rules until real trading exists. */
  | { kind: 'link' }
  | { kind: 'hold'; fx: HoldEffect }
  /** A fishing rod; casting is an overworld interaction, not a bag use. */
  | { kind: 'rod' }
  | { kind: 'key' }

export interface Item {
  key: string
  /** Display name, ≤12 chars. */
  name: string
  desc: string
  /** Outfitter price in Glints; 0 = not for sale. */
  price: number
  effect: ItemKind
}

/** A registered Charm Gear phone contact attached to a trainer. */
export interface TrainerContact {
  /** Row name, ≤10 UPPERCASE ('BEN'). */
  name: string
  /** Where they stand, ≤8 ('TRAIL 2'). */
  place: string
}

export interface TrainerDef {
  key: string
  /** Display name with class, e.g. 'SCOUT BEN'. ≤16 chars. */
  name: string
  /** TRAINER_ART key. */
  sprite: string
  party: { species: string; level: number; held?: string }[]
  /** Glints awarded on defeat. */
  reward: number
  ai: 'random' | 'smart'
  /** strings.ts key spoken on defeat (in-battle). */
  defeatText: string
  /** Present = this trainer swaps numbers after their first defeat. */
  contact?: TrainerContact
}

export interface BattleConfig {
  kind: 'wild' | 'trainer'
  foe: Kindra[]
  trainer?: TrainerDef
  isGym?: boolean
}

export type BattleOutcome = 'win' | 'loss' | 'fled' | 'caught'

export interface BattleResult {
  outcome: BattleOutcome
  /** Present when outcome is 'caught'. */
  caught?: Kindra
}

// ── Maps & the overworld ────────────────────────────────────────────────────
export interface WarpDef {
  x: number
  y: number
  to: { map: string; spawn: string }
}

export interface SpawnDef {
  x: number
  y: number
  facing: Dir
}

export interface NpcDef {
  id: string
  /** CHAR_ART archetype key (BOY, GIRL, ELDER, PROF, ...). */
  sprite: string
  x: number
  y: number
  facing: Dir
  movement: 'static' | 'wander'
  /** strings.ts key for plain talk; boxes shown verbatim. */
  dialog?: string
  /** Optional night-time override of `dialog`. */
  dialogNight?: string
  /** EVENTS key for scripted NPCs (Larch, Rowan, Keeper Lily...). Overrides dialog. */
  script?: string
  /** Battle-on-sight trainer. */
  trainer?: { key: string; sight: number }
  /** Run an EVENTS script on line-of-sight (the rival ambush); fires once per its own flag logic. */
  sightScript?: { script: string; sight: number }
  /** Schedule: present only on listed days/periods (weekly NPCs — the market vendor). */
  appears?: { days?: DayOfWeek[]; periods?: DayPeriod[] }
  /** Hide this NPC while the flag is set / until the flag is set. */
  hideFlag?: string
  showFlag?: string
}

export interface SignDef {
  x: number
  y: number
  /** strings.ts key. */
  text: string
}

export interface GroundItemDef {
  /** Unique flag id so pickups persist across saves. */
  id: string
  x: number
  y: number
  item: string
  qty: number
}

export interface EncounterSlot {
  species: string
  /** Fixed level or inclusive [min, max]. */
  level: number | [number, number]
}

/** Exactly 7 slots; the classic 30/30/20/10/5/4/1 percent spread. */
export type EncounterTable = readonly EncounterSlot[]
export const ENCOUNTER_SLOT_PERCENTS: readonly number[] = [30, 30, 20, 10, 5, 4, 1]

export interface EncounterSet {
  morning: EncounterTable
  day: EncounterTable
  night: EncounterTable
}

export interface MapDef {
  id: string
  /** Display name announced on entry; '' for interiors. */
  name: string
  /** SONGS key. */
  music: string
  width: number
  height: number
  /** Row-major tile ids (see world/tiles.ts). */
  tiles: Uint8Array
  /** Outdoor maps receive the day/night palette cast. */
  outdoor: boolean
  warps: WarpDef[]
  spawns: Record<string, SpawnDef>
  /** Walking off this edge transitions to the named map+spawn. */
  edges?: Partial<Record<Dir, { map: string; spawn: string }>>
  npcs: NpcDef[]
  signs: SignDef[]
  items: GroundItemDef[]
  encounters?: EncounterSet
  /** Chance in 256 of a wild check per tall-grass step (classic ~25). */
  encounterRate?: number
  /** Cave-style: every walkable tile rolls encounters (the Wisteria Spire). */
  caveEncounters?: boolean
  /** Lit only in a circle around the player; LUMINA widens it. */
  dark?: boolean
  /** Surf table (7 slots, all periods); rolled per water step while riding. */
  waterEncounters?: EncounterTable
  /** Chance in 256 per surf step (default 15). */
  waterRate?: number
  /** Rod table (7 slots, all periods); one roll per cast. */
  fishingEncounters?: EncounterTable
  /** Bite chance per cast, in 100 (default 60). */
  fishingRate?: number
}

// ── The save file ───────────────────────────────────────────────────────────
export interface PlayerPos {
  map: string
  x: number
  y: number
  facing: Dir
  /** Riding a Kindra over water (WAVERIDE). Absent = on foot. */
  surfing?: boolean
}

export interface SaveData {
  playerName: string
  party: Kindra[]
  /** Larch's Archive: overflow storage when the party is full. */
  archive: Kindra[]
  bag: Record<string, number>
  glints: number
  badges: string[]
  flags: Record<string, boolean>
  pos: PlayerPos
  /** Kindex progress, by species key. */
  seen: string[]
  caught: string[]
  playSeconds: number
  starter: string | null
  /** Where a whiteout returns the player; havens set this on heal. */
  lastHaven: { map: string; spawn: string } | null
  /** Steps walked mod 256; each wrap grants +1 bond to the whole party. */
  stepTicker: number
  /** The Dawnfern nursery: boarded pair and the egg they're minding. */
  nursery: { parents: Kindra[]; egg: Kindra | null } | null
}
