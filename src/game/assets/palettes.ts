/**
 * The standard palettes of Ambervale — four colours each, GBC
 * discipline. Convention: index 0 is the lightest ground colour for
 * opaque tiles, and the (unused) transparent slot for sprites. UI
 * palettes are `fixed`: night never tints a text box.
 */
import { pal } from '../../engine'

// ── Terrain ─────────────────────────────────────────────────────────────────
export const PAL_GRASS = pal('#c0e898', '#88c858', '#488830', '#184020')
export const PAL_TREE = pal('#a0d080', '#58a040', '#287030', '#103c18')
export const PAL_PATH = pal('#e8d8a8', '#d0b078', '#a08050', '#604830')
export const PAL_WATER = pal('#b8e0f8', '#70b8f0', '#3878d0', '#184880')
export const PAL_FLOWER = pal('#c0e898', '#f8a0b0', '#e04858', '#902030')
export const PAL_SAND = pal('#f8e8b8', '#e8d090', '#c0a868', '#807040')
export const PAL_STONE = pal('#e0e0d8', '#a8a8a0', '#686860', '#303028')

// ── Buildings ───────────────────────────────────────────────────────────────
export const PAL_ROOF_HOME = pal('#f8c8a0', '#e88860', '#b85038', '#702820')
export const PAL_ROOF_CIVIC = pal('#c8d8f8', '#88a0e8', '#5060b8', '#283068')
export const PAL_WALL_BLDG = pal('#f8f0d8', '#d8c8a0', '#988868', '#504030')

// ── Interiors ───────────────────────────────────────────────────────────────
export const PAL_INTERIOR = pal('#f0e0c0', '#c8a878', '#906848', '#483020')
export const PAL_RUG = pal('#f0e0c0', '#e89878', '#c05848', '#702828')
export const PAL_GYM = pal('#e8e8f0', '#b0b8d0', '#7078a0', '#383858')

// ── People ──────────────────────────────────────────────────────────────────
// Index 0 transparent; 1 = skin/highlight, 2 = signature colour, 3 = outline.
export const PAL_HERO = pal('#000000', '#f8e0b0', '#d09838', '#202038')
export const PAL_NPC_RED = pal('#000000', '#f8e0c0', '#d04840', '#302020')
export const PAL_NPC_BLUE = pal('#000000', '#f8e0c0', '#4068c8', '#202030')
export const PAL_NPC_GREEN = pal('#000000', '#f8e0c0', '#409858', '#203024')
export const PAL_NPC_PURPLE = pal('#000000', '#f8e0c0', '#8858b8', '#28202e')
export const PAL_NPC_GRAY = pal('#000000', '#f0e8d8', '#888890', '#282830')

// ── Interface (all fixed: immune to day/night) ──────────────────────────────
export const PAL_UI = pal('#f8f8f0', '#b0c0b0', '#506858', '#101810', { fixed: true })
export const PAL_UI_INK = pal('#000000', '#f8f8f0', '#506858', '#101810', { fixed: true })
export const PAL_HP = pal('#f8f8f0', '#58c870', '#f8c848', '#e05038', { fixed: true })
export const PAL_BATTLE_BG = pal('#f8f8f0', '#c0d0b8', '#88a080', '#404840', { fixed: true })

// ── Title ───────────────────────────────────────────────────────────────────
export const PAL_TITLE_GOLD = pal('#000000', '#f8e060', '#d09020', '#684010')
