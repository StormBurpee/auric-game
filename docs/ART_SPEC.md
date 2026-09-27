# AURIC — Art Specification

All art is authored as text grids in TypeScript and rendered through 4-colour
palettes, GBC discipline. This file is the contract for every pixel.

## The format

```ts
import { sprite, symmetric } from '../../engine'

export const TUFT = sprite(`
  ................
  ......3.3.......
  ..3..323.23..3..
  .32.3232.323.23.
  ...`)            // '.'=index 0, '1','2','3'=palette entries
```

- `sprite(grid)`: rows must be equal length. `symmetric(halfGrid)` mirrors a
  left half (great for creatures). `flipX(s)` mirrors whole sprites.
- Index 0 is **transparent** for sprites (people, creatures, overlays) and
  **the lightest ground colour** for opaque tiles (drawn with `opaqueZero`).
- Convention for palettes: roughly light → dark as index rises. For people:
  1 = skin/highlight, 2 = signature colour, 3 = outline. Outlines: use 3,
  but DON'T fully outline everything — GB art outlines bottoms/sides heavily,
  tops lightly.
- Standard palettes live in `src/game/assets/palettes.ts`; custom creature
  palettes are encouraged: `pal('#000000', '#light', '#mid', '#dark')`
  (slot 0 unused for sprites).

## Quality bar (read twice)

This art must look like a lost 2001 cartridge, not like programmer rectangles.
- Strong, readable silhouettes; interior detail only where it reads at 1×.
- Use dithering (checkerboard 1/2) for shading large areas — sparingly.
- Two-frame animations: walk cycles bounce 1px; water shimmers by shifting
  wave rows; flowers nod by swapping 2 petal pixels.
- Creatures: feet planted on the sprite's bottom edge; eyes are the focal
  point — give them 2-3px of care; vary poses (don't center every creature).
- Use original creature silhouettes and artwork; do not copy another game's sprite shapes.

## Tiles — 16×16, file `src/game/assets/tiles.ts`

Export `TILE_ART_TABLE: Partial<Record<TileKey, TileArt>>` covering EVERY key
in `src/game/world/tiles.ts`, then wire it into `assets/index.ts` `TILE_ART`.
Frames: 2 for WATER and FLOWER, 1 elsewhere. Suggested palettes in parens.

| TileKey | What it looks like |
|---|---|
| VOID | solid darkest (PAL_STONE) — out-of-bounds black |
| GRASS | flat light green with sparse darker speckles (PAL_GRASS) |
| GRASS_TUFT | GRASS plus a small mowed tuft cluster (PAL_GRASS) |
| TALL_GRASS | dense wavy blades, clearly taller — the encounter tile (PAL_GRASS) |
| PATH | packed earth, soft rounded edges, few pebbles (PAL_PATH) |
| FLOWER | GRASS base + two tiny blooms; 2 frames nodding (PAL_FLOWER) |
| SAND | pale dotted shore (PAL_SAND) |
| TREE | round broadleaf canopy over a short trunk, fills the tile (PAL_TREE) |
| PINE | pointed conifer, darker (PAL_TREE) |
| ROCK | a boulder with bottom shadow (PAL_STONE) |
| WATER | gentle ripple bands; 2 frames shifting (PAL_WATER) |
| LEDGE_S | grass top, sharp earthen drop face at the bottom (PAL_PATH) |
| FENCE | two horizontal rails on posts (PAL_PATH) |
| SIGN | small wooden signpost on grass (PAL_PATH) |
| ROOF_HOME_L/M/R | warm shingled roof, left edge / middle / right edge (PAL_ROOF_HOME) |
| ROOF_CIVIC_L/M/R | blue-violet civic roof trio (PAL_ROOF_CIVIC) |
| WALL | plastered wall with timber line (PAL_WALL_BLDG) |
| WALL_WINDOW | WALL + four-pane window (PAL_WALL_BLDG) |
| WALL_SIGN_HAVEN | WALL + heart/bell emblem plaque (PAL_ROOF_CIVIC) |
| WALL_SIGN_SHOP | WALL + coin/bag plaque (PAL_PATH) |
| WALL_SIGN_GYM | WALL + badge/wing plaque (PAL_GYM) |
| DOOR | recessed doorway, dark opening (PAL_WALL_BLDG) |
| FLOOR_WOOD | plank floor, subtle grain (PAL_INTERIOR) |
| FLOOR_STONE | flagstones (PAL_STONE) |
| RUG | bordered warm rug (PAL_RUG) |
| MAT | door mat with arrow-ish weave — the exit tile (PAL_INTERIOR) |
| WALL_INT | interior back wall, darker base line (PAL_INTERIOR) |
| COUNTER | service counter front (PAL_INTERIOR) |
| TABLE | small table seen top-down (PAL_INTERIOR) |
| BED | pillow + blanket, top-down (PAL_RUG) |
| BOOKSHELF | spines in rows (PAL_INTERIOR) |
| PLANT_POT | leafy pot plant (PAL_TREE) |
| PEDESTAL | display pedestal with a glass dome glint (PAL_STONE) |
| STATUE | small guardian statue (PAL_STONE) |
| GYM_FLOOR | polished tiles with line inlay (PAL_GYM) |

## People — 16×16, file `src/game/assets/characters.ts`

Export `CHAR_ART_TABLE: Record<string, CharArt>` with keys:
`PLAYER, MOM, BOY, GIRL, MAN, WOMAN, ELDER, KEEPER, PROF, RIVAL, WARDEN,
SCOUT, GRUNT, KID`.
`CharArt = { down: [a,b], up: [a,b], side: [a,b], palette }` — two-frame walk,
`side` faces LEFT. GB body plan: big head (7-8px), small body, 2px feet.
PLAYER wears a gold cap (PAL_HERO); RIVAL is sharp in cold grey-violet;
WARDEN (Aria) sky-toned; KEEPER (Lily) warm with an apron; PROF (Larch) a
coat. Also export `PLAYER_BACK: TrainerArt` (48×48, player seen from behind
for battles — cap, shoulders, confident stance).

## Creatures — ≤48×48, files `src/game/assets/mons/monsNN.ts`

Per species (keys + visual specs in docs/ROSTER.md): front (3/4 toward
viewer) + back (from behind, simpler, bigger forms). Feet on the bottom row
of the GRID YOU DRAW (the battle scene aligns sprite bottoms to platforms).
Commons ~32px tall, evolved ~40, the legend uses the full 48. Wire into
`MON_ART` via `assets/index.ts` as `{ front, back, palette }` per key.

## Trainer portraits — ≤48×48, with art-mons-3

`TRAINER_ART` keys: `TRAINER_CORVIN, TRAINER_ARIA, TRAINER_SCOUT,
TRAINER_FORAGER, TRAINER_BELLRINGER, TRAINER_HERBALIST, TRAINER_TRAINEE`.
Full-body battle intro portraits, charismatic poses.

## UI — file `src/game/assets/ui.ts`

`UiArt` (see assets/types.ts): 8×8 frame pieces (double-line classic border,
PAL_UI: bg index 1=white fill... use 0 transparent, 3 ink, 1 fill), cursor ▶,
arrowMore ▼, 16×16 charm (round, gold band + button), 16×16 grassRustle
(blade tips overlay), 16×8 shadow ellipse.

## Title — file `src/game/assets/title.ts`

`TitleArt`: `logo` — "AURIC" wordmark ~120×40, thick serif-ish capitals with
a highlight slant, drawn for PAL_TITLE_GOLD; `emblem` — the dawn stag
(AMBERSTAG) head in profile, ~48×48, regal and quiet.
