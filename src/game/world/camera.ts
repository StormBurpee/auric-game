/**
 * The chasing camera: the player's sprite sits at the exact screen
 * center (top-left pixel 72,64 for a 16x16 body on 160x144), the view
 * clamps at map bounds so the world never shows past its edges, and a
 * map smaller than the screen floats centered — all in whole pixels.
 */
import { SCREEN_H, SCREEN_W } from '../../engine'
import { TILE_PX } from './movement'

/** Screen-space position of the player's tile when the camera is unclamped. */
export const FOCUS_X = 72
export const FOCUS_Y = 64

export interface Camera {
  x: number
  y: number
}

function axis(mapPx: number, screenPx: number, focus: number, center: number): number {
  if (mapPx <= screenPx) return Math.floor((mapPx - screenPx) / 2)
  return Math.min(Math.max(focus - center, 0), mapPx - screenPx)
}

/** Camera offset in pixels for a map (in tiles) and a focus point (ground pixels). */
export function cameraFor(mapW: number, mapH: number, focusX: number, focusY: number): Camera {
  return {
    x: axis(mapW * TILE_PX, SCREEN_W, focusX, FOCUS_X),
    y: axis(mapH * TILE_PX, SCREEN_H, focusY, FOCUS_Y),
  }
}
