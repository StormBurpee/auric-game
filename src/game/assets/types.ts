/**
 * The shapes of art. Asset modules export these; game code renders them
 * without knowing a single pixel.
 */
import type { Palette, Sprite } from '../../engine'

export interface TileArt {
  /** 1 frame for still tiles; 2 for breathing ones (water, flowers). */
  frames: Sprite[]
  palette: Palette
}

export interface MonArt {
  /** 3/4 view facing the player, up to 48x48, feet on the baseline. */
  front: Sprite
  /** Seen from behind on the player's platform, up to 48x48. */
  back: Sprite
  palette: Palette
}

export interface CharArt {
  /** Two-frame walk cycles; `side` faces LEFT (right is mirrored). 16x16 each. */
  down: [Sprite, Sprite]
  up: [Sprite, Sprite]
  side: [Sprite, Sprite]
  palette: Palette
}

export interface TrainerArt {
  /** Battle portrait, up to 48x48. */
  sprite: Sprite
  palette: Palette
}

export interface UiArt {
  /** 8x8 border pieces of the classic text frame. */
  frame: { tl: Sprite; t: Sprite; tr: Sprite; l: Sprite; r: Sprite; bl: Sprite; b: Sprite; br: Sprite }
  /** 8x8 right-pointing menu cursor. */
  cursor: Sprite
  /** 8x8 "more text" down arrow. */
  arrowMore: Sprite
  /** 16x16 charm projectile / icon. */
  charm: Sprite
  /** 16x16 grass-rustle overlay drawn over the player's feet. */
  grassRustle: Sprite
  /** 16x8 drop shadow for ledge hops. */
  shadow: Sprite
}

export interface TitleArt {
  /** The AURIC wordmark, ~120x40. */
  logo: Sprite
  logoPalette: Palette
  /** A small emblem (the dawn stag) for the title screen. */
  emblem: Sprite
  emblemPalette: Palette
}
