# AURIC — WORLD

Complete map blueprints for the AURIC vertical slice. Map engineers transcribe each
ASCII grid one char per 16x16 tile. Every species key here exists in `docs/ROSTER.md`;
every trainerKey here exists in ROSTER.md Section C. Dialog keys follow the shared
convention `story.<scene>.<n>` used by the dialogue registry.

---

## 0. GLOBAL CONVENTIONS

- Coordinates are `(x,y)`, zero-indexed from the top-left tile. x grows east, y grows
  south. Facing values: `UP / DOWN / LEFT / RIGHT`.
- Grids are exact: each row is exactly `width` chars; there are exactly `height` rows.
- Buildings (exterior): 4-wide footprints — 2 rows of ROOF, 1 row of WALL, 1 row of
  WALL with one DOOR. The player enters a DOOR from the tile below it.
- Interiors exit via MAT tiles set into the bottom wall row; stepping onto a MAT warps
  to the exterior spawn listed in WARPS.
- Edge transitions: stepping onto a listed edge-zone tile warps to the target map and
  spawn. Arrival spawns are placed one tile inside the destination map.
- Encounters trigger only on TALL_GRASS tiles (exception: `wisteria_spire_1f`, where
  every walkable FLOOR_TILE rolls encounters, cave-style, NIGHT only).
- Encounter slot scheme (Gen-2-faithful, fixed): 7 slots at 30/30/20/10/5/4/1 percent.
  Tables below approximate ROSTER.md Section D proportions under this fixed scheme.
- Time windows: MORNING 4:00-9:59, DAY 10:00-17:59, NIGHT 18:00-3:59.
- LEDGE_S: hopping is allowed only moving south (DOWN); the ledge tile cannot be
  entered any other way.
- Trainer sight: a trainer challenges when the player enters any tile within
  `sightRange` tiles in the trainer's facing direction (line blocked by solid tiles).

### Shared grid legend (per-map legends restate only what the map uses)

| char | tile | char | tile |
|---|---|---|---|
| `T` | TREE | `R` | ROOF |
| `.` | GRASS (walkable) / interior open floor — see map legend | `W` | WALL |
| `"` | TALL_GRASS | `D` | DOOR |
| `=` | PATH | `f` | FLOOR_WOOD |
| `*` | FLOWER | `t` | FLOOR_TILE |
| `~` | WATER | `m` | MAT |
| `d` | SAND | `C` | COUNTER |
| `v` | LEDGE_S | `A` | TABLE |
| `#` | FENCE | `B` | BED |
| `s` | SIGN | `K` | BOOKSHELF |
| `o` | ROCK | `P` | PLANT |
| `U` | STATUE | `S` | STAIRS |
| `E` | PEDESTAL | `G` | GYM_FLOOR |
| `Y` | SAPLING (HEW obstacle) | `B` | BOULDER (HEAVE obstacle) |

### World flow

```
[dawnfern] --north--> [trail1 (vertical)] --north--> [bellmere]
[bellmere] --west--> [trail2 (horizontal)] --west--> [loomspire]
```

Tall grass gates: Trail 1 has two full-corridor TALL_GRASS bands (cannot reach
Bellmere without stepping in grass). Trail 2 has two more bands crossing its path.
Trail 2's ledge row gives a one-way fast lane back east to Bellmere.

---

## 1. MAP: dawnfern

- id: `dawnfern`
- displayName: DAWNFERN VILLAGE
- dimensions: 20x18
- music: `dawnfern`

### Grid

```
TTTTTTTTT==TTTTTTTTT
T........==s.......T
T.*......==......*.T
T........==........T
T..####..==..####..T
T..*..*..==..*..*..T
T........==........T
T..RRRR..==..RRRR..T
T..RRRR..==..RRRR..T
T..WWWW..==..WWWW..T
T..WDWW..==..WDWW..T
T...=....==..s=....T
T...===========RRRRT
T........==....RRRRT
T..*..*..==..*.WWWWT
T........==....WDWWT
T*................*T
TTTTTTTTTTTTTTTTTTTT
```

### Legend

`T` TREE, `.` GRASS, `=` PATH, `*` FLOWER, `#` FENCE, `s` SIGN, `R` ROOF, `W` WALL,
`D` DOOR. West building (x3-6) = player's house; east building (x13-16) = Larch's
lab; southeast building (x15-18, rows 12-15, Tier 2) = the DAWNFERN NURSERY, its
door at (16,15) opening off the end of the east road. The lab sign stepped north
to (13,11) to make room.

### WARPS

| trigger | tiles | target |
|---|---|---|
| DOOR (player house) | (4,10) | `player_home` : `entry` |
| DOOR (Larch's lab) | (14,10) | `larch_lab` : `entry` |
| DOOR (nursery, Tier 2) | (16,15) | `dawnfern_nursery` : `entry` |
| edge zone NORTH | (9,0), (10,0) | `trail1` : `south` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `from_home` | (4,11) | DOWN |
| `from_lab` | (14,11) | DOWN |
| `from_nursery` | (16,16) | DOWN |
| `from_trail1` | (9,1) | DOWN |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `dawnfern_girl` | GIRL | (6,13) | DOWN | wander2 | `story.dawnfern.1` |
| `dawnfern_man` | MAN | (12,2) | DOWN | static | `story.dawnfern.2` |
| `dawnfern_nursery_man` | ELDER | (15,16) | RIGHT | static | script `nursery_egg_man`; showFlag `nursery_egg` — the keeper's husband steps outside while an egg waits (Tier 2) |

### SIGNS

| pos | dialogKey | gist |
|---|---|---|
| (11,1) | `story.sign_dawnfern.1` | TRAIL 1 north -> Bellmere Town |
| (13,11) | `story.sign_dawnfern.2` | Kindra lab of Prof. Larch |

### ENCOUNTERS

None (no TALL_GRASS in this map).

### ITEMS

None.

---

## 2. MAP: trail1

- id: `trail1`
- displayName: TRAIL 1
- dimensions: 20x36
- music: `trail`

Vertical trail. Two full-corridor TALL_GRASS bands (y6-8 and y19-21) gate progress —
both cover the only walkable corridor, including the path columns. Two LEDGE_S rows
(y15, y25) with path gaps at x9-10. The HEW grove (Tier 1) sits on the northeast
flank: the pocket at x15-18, y1 is sealed by the border trees, the tree at (14,1),
and the tree wall along y2 — its only mouth is the SAPLING at (17,2), approached
from the open grass at (17,3).

### Grid

```
TTTTTTTTT==TTTTTTTTT
T........==...T....T
T..*.....==....TTYTT
T........==........T
T..TTT...==...TTT..T
T........==........T
TTTTTTT""""""TTTTTTT
TTTTTTT""""""TTTTTTT
TTTTTTT""""""TTTTTTT
T........==........T
T.o......==......o.T
T........==........T
T..""""..==..""""..T
T..""""..==..""""..T
T........==........T
Tvvvvvvvv==vvvvvvvvT
T........==........T
T..*.....==.....*..T
T........==........T
TTTTTT""""""TTTTTTTT
TTTTTT""""""TTTTTTTT
TTTTTT""""""TTTTTTTT
T........==........T
T...o....==....o...T
T........==........T
Tvvvvvvvv==vvvvvvvvT
T........==........T
T..."""..==..."""..T
T........==........T
T..TT....==....TT..T
T........==........T
T.s......==........T
T........==........T
T...*....==....*...T
T........==........T
TTTTTTTTT==TTTTTTTTT
```

### Legend

`T` TREE, `.` GRASS, `"` TALL_GRASS, `=` PATH, `*` FLOWER, `o` ROCK, `v` LEDGE_S,
`s` SIGN, `Y` SAPLING (HEW).

### WARPS

| trigger | tiles | target |
|---|---|---|
| edge zone SOUTH | (9,35), (10,35) | `dawnfern` : `from_trail1` |
| edge zone NORTH | (9,0), (10,0) | `bellmere` : `from_trail1` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `south` | (9,34) | UP |
| `north` | (9,1) | DOWN |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `trail1_boy` | BOY | (5,32) | RIGHT | wander2 | `story.trail1.1` |
| `trail1_woman` | WOMAN | (14,17) | DOWN | static | `story.trail1.2` |
| `trail1_gran` | ELDER | (5,17) | DOWN | static | script `berry_gran`; appears Sundays, MORNING only (Tier 2) — one `GIFT_ROTATION` berry per week, beside the TINGLE BERRY she grows |

### SIGNS

| pos | dialogKey | gist |
|---|---|---|
| (2,31) | `story.sign_trail1.1` | TRAIL 1 — north: Bellmere / south: Dawnfern |

### ENCOUNTERS

Rate: 25/256 per step in TALL_GRASS. Levels 2-4 (ROSTER.md Trail 1 band).

| slot % | MORNING | DAY | NIGHT |
|---|---|---|---|
| 30 | SCURRIL L3 | SCURRIL L3 | SCURRIL L3 |
| 30 | WRENLET L3 | WRENLET L3 | DUSKMOTH L3 |
| 20 | THREDLE L2 | THREDLE L2 | HUSHOWL L3 |
| 10 | DEWBELL L3 | SCURRIL L4 | THREDLE L2 |
| 5 | DEWBELL L4 | SPOOLEN L4 | THREDLE L3 |
| 4 | SPOOLEN L4 | WRENLET L4 | HUSHOWL L4 |
| 1 | WRENLET L4 | THREDLE L4 | SCURRIL L4 |

### ITEMS

| item | pos | note |
|---|---|---|
| CHARM | (3,10) | beside the west rock |
| TONIC | (17,23) | tucked behind the east rock |
| AMBER CRUMB | (16,1) | inside the HEW grove, behind the sapling |
| TINGLE BERRY | (4,17) | in the open by the west flowers, ungated |

---

## 3. MAP: bellmere

- id: `bellmere`
- displayName: BELLMERE TOWN
- dimensions: 24x18
- music: `bellmere`

Lakeside town. Lake on the east with a SAND rim; shore TALL_GRASS at x13-15, y10-13
(the "Bellmere shore" encounter zone). Buildings: Haven (x2-5, y2-5), Elder Rowan's
house (x10-13, y2-5), Outfitter (x2-5, y10-13). South opening to Trail 1, west opening
to Trail 2.

The lake is open water for WAVERIDE (Tier 1): mount from any SAND rim tile facing the
water, roll the surf table per water step, and dismount onto the two-tile islet at
(20,11)-(20,12) — the only land not joined to the shore, holding the KEEN LENS.

### Grid

```
TTTTTTTTTTTTTTTTTTTTTTTT
T......................T
T.RRRR....RRRR.........T
T.RRRR....RRRR..d~~~~~~T
T.WWWW....WWWW..d~~~~~~T
T.WDWW....WDWW..d~~~~~~T
T..=.......=....d~~~~~~T
T..=.......=....d~~~~~~T
===============sd~~~~~~T
=..=.......==...d~~~~~~T
T.RRRR.....=="""d~~~~~~T
T.RRRR.....=="""d~~~d~~T
T.WWWW.....=="""d~~~d~~T
T.WDWW.....=="""d~~~~~~T
T..=.......==...dddddddT
T..==========..........T
T..........==s.........T
TTTTTTTTTTT==TTTTTTTTTTT
```

### Legend

`T` TREE, `.` GRASS, `"` TALL_GRASS (shore grass), `=` PATH, `~` WATER, `d` SAND,
`s` SIGN, `R` ROOF, `W` WALL, `D` DOOR. NW building = Haven; NE building = Elder
Rowan's house; SW building = Outfitter.

### WARPS

| trigger | tiles | target |
|---|---|---|
| DOOR (Haven) | (3,5) | `bellmere_haven` : `entry` |
| DOOR (Elder's house) | (11,5) | `elder_house` : `entry` |
| DOOR (Outfitter) | (3,13) | `bellmere_outfitter` : `entry` |
| edge zone SOUTH | (11,17), (12,17) | `trail1` : `north` |
| edge zone WEST | (0,8), (0,9) | `trail2` : `east` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `from_trail1` | (11,16) | UP |
| `from_trail2` | (1,8) | RIGHT |
| `from_haven` | (3,6) | DOWN |
| `from_elder` | (11,6) | DOWN |
| `from_outfitter` | (3,14) | DOWN |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `bellmere_girl` | GIRL | (14,9) | DOWN | wander2 | `story.bellmere.1` (Tier 2: script `npc_bellmere_market` — same day/night keys plus the Saturday market hint) |
| `bellmere_man` | MAN | (8,14) | UP | static | `story.bellmere.2` |
| `bellmere_angler` | ELDER | (18,14) | UP | static | script `npc_bellmere_angler` (Tier 2) — STORY §7 bellmere5; gives the OLD ROD once (`old_rod_given`), facing the water at (18,13) |
| `bellmere_market` | MAN | (17,14) | DOWN | static | script `market_vendor` (Tier 2); appears Saturdays only — one rotating rare per week (`data/weekly.ts`) |

### SIGNS

| pos | dialogKey | gist |
|---|---|---|
| (15,8) | `story.sign_bellmere.1` | Bellmere Lake — listen for the bells |
| (13,16) | `story.sign_bellmere.2` | BELLMERE TOWN — Haven and Outfitter |

### ENCOUNTERS

Rate: 20/256 per step in shore TALL_GRASS. Levels 4-7 (ROSTER.md Bellmere shore band).

| slot % | MORNING | DAY | NIGHT |
|---|---|---|---|
| 30 | PADDLET L5 | PADDLET L5 | PADDLET L5 |
| 30 | WRENLET L4 | WRENLET L5 | HUSHOWL L5 |
| 20 | DEWBELL L5 | PADDLET L6 | DUSKMOTH L5 |
| 10 | PADDLET L6 | SCURRIL L5 | PADDLET L6 |
| 5 | PADDLET L4 | SCURRIL L6 | DUSKMOTH L6 |
| 4 | DEWBELL L6 | SCURRIL L4 | DUSKMOTH L4 |
| 1 | WRENLET L7 | PADDLET L7 | HUSHOWL L7 |

### WATER ENCOUNTERS (the lake, Tier 1)

Rate: 15/256 per water step while riding. One period-less table (surf tables ignore
the clock); levels 5-10 (ROSTER.md Bellmere lake band). PADDLET-heavy, TORTIDE in
the middle slots, and the 1% is a DEWBELL adrift on the lake mist at any hour — the
deliberate exception to its morning-only grass rule.

| slot % | ALL PERIODS |
|---|---|
| 30 | PADDLET L5 |
| 30 | PADDLET L7 |
| 20 | PADDLET L6 |
| 10 | TORTIDE L8 |
| 5 | TORTIDE L10 |
| 4 | PADDLET L9 |
| 1 | DEWBELL L10 |

### FISHING ENCOUNTERS (the rod, Tier 2)

One roll per hooked cast; bite chance 60 in 100 (`fishingRate`). Period-less,
like the surf table; levels 6-15 (ROSTER §D rod band). The rod reaches deeper
and older than paddling: DEWBELL keeps its lake-mist exception, and the 1% slot
is the angler's tall tale made catchable — the sleeping lv 15 TORTIDE.

| slot % | ALL PERIODS |
|---|---|
| 30 | PADDLET L6-9 |
| 30 | PADDLET L8-11 |
| 20 | TORTIDE L10 |
| 10 | TORTIDE L12 |
| 5 | PADDLET L12 |
| 4 | DEWBELL L10 |
| 1 | TORTIDE L15 |

### ITEMS

| item | pos | note |
|---|---|---|
| KEEN LENS | (20,11) | north tile of the surf islet; WAVERIDE only |

---

## 4. MAP: trail2

- id: `trail2`
- displayName: TRAIL 2
- dimensions: 36x18
- music: `trail`

Horizontal trail. North route (y1-10) carries the path (y8-9) through two TALL_GRASS
bands (x12-14 and x23-25, tree-capped at y1-2 so they cannot be skirted) and past four
trainers plus the CORVIN ambush. The LEDGE_S row at y11 (x3-30) drops one-way into the
south corridor (y12-15), a clear, trainer-free express lane that reconnects only at
the east end (x31-34) — a fast return to Bellmere. The corridor is tree-blocked at its
west end (x1-2), so it cannot be used to skip the trail westbound.

The HEAVE teaser (Tier 1): the BOULDER at (4,11) replaces one ledge tile. Until its
badge exists it only answers with teaser text; once HEAVE unlocks, one vertical nudge
(both (4,10) and (4,12) are open ground) opens a west-end climb out of the south
corridor. Obstacle state is per-visit, so the ledge row's one-way promise holds
across map loads.

### Grid

```
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
T...........TTT........TTT.........T
T...........TTT........TTT.........T
T..........."""........""".........T
T....o......"""........""".........T
T..........."""........""".........T
T..........."""........""".........T
T.s........."""........""".......s.T
============"""========"""==========
============"""========"""==========
T..........."""........""".........T
TTTvBvvvvvvvvvvvvvvvvvvvvvvvvvv....T
TTT................................T
TTT...*.......................*....T
TTT.............................o..T
TTT..*..........................*..T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
```

### Legend

`T` TREE, `.` GRASS, `"` TALL_GRASS, `=` PATH, `*` FLOWER, `o` ROCK, `v` LEDGE_S,
`s` SIGN, `B` BOULDER (HEAVE).

### WARPS

| trigger | tiles | target |
|---|---|---|
| edge zone EAST | (35,8), (35,9) | `bellmere` : `from_trail2` |
| edge zone WEST | (0,8), (0,9) | `loomspire` : `from_trail2` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `east` | (34,8) | LEFT |
| `west` | (1,8) | RIGHT |

### NPCS

| id | archetype | pos | facing | movement | dialogKey | sightRange | trainerKey |
|---|---|---|---|---|---|---|---|
| `trail2_ben` | SCOUT | (29,6) | DOWN | static | `story.trail2.1` | 3 | `SCOUT_BEN` |
| `trail2_mae` | WOMAN | (20,10) | UP | static | `story.trail2.2` | 3 | `FORAGER_MAE` |
| `trail2_otto` | MAN | (16,6) | DOWN | static | `story.trail2.3` | 3 | `BELLRINGER_OTTO` |
| `trail2_ivy` | WOMAN | (8,10) | UP | static | `story.trail2.4` | 3 | `HERBALIST_IVY` |
| `trail2_corvin` | RIVAL | (4,6) | DOWN | static | `story.trail2.5` | 3 | `RIVAL_CORVIN_T2` |

Sight-line notes: each trainer's range crosses both path rows (y8-9), the natural
route west; a careful player can thread the open field rows y3-7 to slip past
(genre convention — only the tall grass bands are truly mandatory). Westbound
order: BEN (x29) -> east grass band -> MAE (x20) -> OTTO (x16) -> west grass band ->
IVY (x8) -> CORVIN (x4, scripted ambush — he strides to the player, battles with
`RIVAL_CORVIN_T2`, then leaves the map after defeat).

### SIGNS

| pos | dialogKey | gist |
|---|---|---|
| (33,7) | `story.sign_trail2.1` | TRAIL 2 — west: Loomspire / east: Bellmere |
| (2,7) | `story.sign_trail2.2` | Loomspire City ahead — mind the ledges |

### ENCOUNTERS

Rate: 30/256 per step in TALL_GRASS. Levels 4-7 (ROSTER.md Trail 2 band).
AMBERSTAG: 1% NIGHT slot, fixed L7, one spawn per save, flees if not captured
(ROSTER.md placement note). ZEPHYRIL: 1% MORNING/DAY, fixed L7.

| slot % | MORNING | DAY | NIGHT |
|---|---|---|---|
| 30 | WRENLET L5 | WRENLET L5 | SCURRIL L5 |
| 30 | SCURRIL L5 | SCURRIL L5 | HUSHOWL L5 |
| 20 | THREDLE L5 | THREDLE L5 | DUSKMOTH L5 |
| 10 | DEWBELL L5 | SPOOLEN L5 | SHADEKIT L5 |
| 5 | DEWBELL L6 | SPOOLEN L6 | SHADEKIT L6 |
| 4 | DEWBELL L4 | THREDLE L6 | SHADEKIT L7 |
| 1 | ZEPHYRIL L7 | ZEPHYRIL L7 | AMBERSTAG L7 |

### ITEMS

| item | pos | note |
|---|---|---|
| TONIC | (5,13) | south corridor, west dead end |
| CHARM | (33,13) | south corridor, east mouth |

---

## 5. MAP: loomspire

- id: `loomspire`
- displayName: LOOMSPIRE CITY
- dimensions: 26x22
- music: `loomspire`

City of the Wind Warden. Haven (x4-7, y4-7) NW; the WISTERIA SPIRE (x17-20, a 4-wide
tower: 4 roof rows y2-5, wall y6, door row y7) NE behind a fence line; the Gym
(x4-7, y13-16) SW, its door approach flanked by statues. East opening to Trail 2.

### Grid

```
TTTTTTTTTTTTTTTTTTTTTTTTTT
T..............########..T
T...............*RRRR*...T
T................RRRR....T
T...RRRR.........RRRR....T
T...RRRR.........RRRR....T
T...WWWW.........WWWW....T
T...WDWW.........WDWW....T
T....=......*...s.=..*...T
T....=............=...s..T
T..=======================
T..=======================
T...........==...........T
T...RRRR....==...........T
T...RRRR....==...........T
T...WWWW....==..*........T
T...WDWW.s..==...........T
T...U=U.....==...........T
T....=========...........T
T........................T
T..*..............*......T
TTTTTTTTTTTTTTTTTTTTTTTTTT
```

### Legend

`T` TREE, `.` GRASS, `=` PATH, `*` FLOWER (wisteria), `#` FENCE, `s` SIGN, `o` ROCK,
`R` ROOF, `W` WALL, `D` DOOR, `U` STATUE. NW building = Haven; NE tower = Wisteria
Spire; SW building = Gym (statues flank its door path at (4,17) and (6,17)).

### WARPS

| trigger | tiles | target |
|---|---|---|
| DOOR (Haven) | (5,7) | `loomspire_haven` : `entry` |
| DOOR (Wisteria Spire) | (18,7) | `wisteria_spire_1f` : `entry` |
| DOOR (Gym) | (5,16) | `loomspire_gym` : `entry` |
| edge zone EAST | (25,10), (25,11) | `trail2` : `west` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `from_trail2` | (24,10) | LEFT |
| `from_haven` | (5,8) | DOWN |
| `from_spire` | (18,8) | DOWN |
| `from_gym` | (5,17) | DOWN |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `loomspire_woman` | WOMAN | (10,9) | DOWN | wander2 | `story.loomspire.1` |
| `loomspire_man` | MAN | (20,9) | UP | static | `story.loomspire.2` |
| `loomspire_boy` | BOY | (8,19) | UP | wander2 | `story.loomspire.3` |
| `loomspire_girl` | GIRL | (22,12) | LEFT | wander2 | `story.loomspire.4` |
| `loomspire_grunt` | GRUNT | (21,12) | UP | static | `story.loomspire.5` |

`loomspire_man` warns that the Spire is haunted after dark; `loomspire_grunt` is the
slice's only GLOAM SYNDICATE hint — a stranger in twilight grey watching the Spire.

### SIGNS

| pos | dialogKey | gist |
|---|---|---|
| (22,9) | `story.sign_loomspire.1` | LOOMSPIRE CITY — where the wind weaves |
| (9,16) | `story.sign_loomspire.2` | LOOMSPIRE GYM — Wind Warden ARIA |
| (16,8) | `story.sign_loomspire.3` | WISTERIA SPIRE — quiet by day... |

### ENCOUNTERS

None (no TALL_GRASS in this map).

### ITEMS

None.

---

## 6. MAP: player_home

- id: `player_home`
- displayName: STORM'S HOUSE
- dimensions: 10x8
- music: `dawnfern`

### Grid

```
WWWWWWWWWW
WBBffKffPW
WffffffffW
WfAAfffffW
WfAAfffffW
WffffffffW
WffffffffW
WWWWmmWWWW
```

### Legend

`W` WALL, `f` FLOOR_WOOD, `B` BED, `K` BOOKSHELF, `P` PLANT, `A` TABLE, `m` MAT.

### WARPS

| trigger | tiles | target |
|---|---|---|
| MAT (exit) | (4,7), (5,7) | `dawnfern` : `from_home` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `entry` | (4,6) | UP |
| `wake` | (1,2) | DOWN |

`wake` is the new-game start point, beside the bed.

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `home_mom` | WOMAN | (6,4) | LEFT | static | `story.home.1` |

### ENCOUNTERS / ITEMS

None.

---

## 7. MAP: larch_lab

- id: `larch_lab`
- displayName: LARCH KINDRA LAB
- dimensions: 12x10
- music: `dawnfern`

### Grid

```
WWWWWWWWWWWW
WKKttttttKKW
WttttttttttW
WtttEtEtEttW
WttttttttttW
WCCttttttttW
WttttttttttW
WttttttttttW
WtPttttttPtW
WWWWWmmWWWWW
```

### Legend

`W` WALL, `t` FLOOR_TILE, `K` BOOKSHELF, `E` PEDESTAL, `C` COUNTER, `P` PLANT,
`m` MAT.

### WARPS

| trigger | tiles | target |
|---|---|---|
| MAT (exit) | (5,9), (6,9) | `dawnfern` : `from_lab` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `entry` | (5,8) | UP |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `lab_larch` | PROF | (6,2) | DOWN | static | `story.lab.1` |
| `lab_aide` | MAN | (2,6) | RIGHT | static | `story.lab.2` |

### INTERACTABLES (starter pedestals)

| pos | contents | dialogKey |
|---|---|---|
| (4,3) | VERDIL | `story.lab.3` |
| (6,3) | EMBERIT | `story.lab.4` |
| (8,3) | RILLET | `story.lab.5` |

### ENCOUNTERS / ITEMS

None.

---

## 8. MAP: bellmere_haven

- id: `bellmere_haven`
- displayName: BELLMERE HAVEN
- dimensions: 10x8
- music: `bellmere`

### Grid

```
WWWWWWWWWW
WPttttttPW
WtCCCCCCtW
WttttttttW
WttttttttW
WAttttttAW
WttttttttW
WWWWmmWWWW
```

### Legend

`W` WALL, `t` FLOOR_TILE, `P` PLANT, `C` COUNTER, `A` TABLE (bench), `m` MAT.

### WARPS

| trigger | tiles | target |
|---|---|---|
| MAT (exit) | (4,7), (5,7) | `bellmere` : `from_haven` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `entry` | (4,6) | UP |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `haven_lily_b` | KEEPER | (4,1) | DOWN | static | `story.haven.1` |

KEEPER LILY heals the party from behind the counter.

### ENCOUNTERS / ITEMS

None.

---

## 9. MAP: loomspire_haven

- id: `loomspire_haven`
- displayName: LOOMSPIRE HAVEN
- dimensions: 10x8
- music: `loomspire`

### Grid

```
WWWWWWWWWW
WPttttttPW
WtCCCCCCtW
WttttttttW
WttttttttW
WAttttttAW
WttttttttW
WWWWmmWWWW
```

### Legend

`W` WALL, `t` FLOOR_TILE, `P` PLANT, `C` COUNTER, `A` TABLE (bench), `m` MAT.

### WARPS

| trigger | tiles | target |
|---|---|---|
| MAT (exit) | (4,7), (5,7) | `loomspire` : `from_haven` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `entry` | (4,6) | UP |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `haven_lily_l` | KEEPER | (4,1) | DOWN | static | `story.haven.2` |

### ENCOUNTERS / ITEMS

None.

---

## 10. MAP: bellmere_outfitter

- id: `bellmere_outfitter`
- displayName: BELLMERE OUTFITTER
- dimensions: 10x8
- music: `bellmere`

### Grid

```
WWWWWWWWWW
WKKKttKKKW
WttttttttW
WCCCCttttW
WttttttttW
WPttttttPW
WttttttttW
WWWWmmWWWW
```

### Legend

`W` WALL, `t` FLOOR_TILE, `K` BOOKSHELF (stock shelves), `C` COUNTER, `P` PLANT,
`m` MAT.

### WARPS

| trigger | tiles | target |
|---|---|---|
| MAT (exit) | (4,7), (5,7) | `bellmere` : `from_outfitter` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `entry` | (4,6) | UP |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `outfitter_clerk` | WOMAN | (2,2) | DOWN | static | `story.outfitter.1` |

Talking to the clerk over the counter opens the shop (prices in G). Tier-1 shelf:
CHARM 200, GILDED CHARM 600, TONIC 300, BIG TONIC 700, CURE LEAF 450, then the
hold gear — CINDER BAND / DEW PEARL / MOSS LOCKET at 900 each and the LINK CORD,
sold dearly at 2000 (trades are priceless).

### ENCOUNTERS / ITEMS

None.

---

## 11. MAP: elder_house

- id: `elder_house`
- displayName: ELDER ROWAN'S HOUSE
- dimensions: 10x8
- music: `bellmere`

### Grid

```
WWWWWWWWWW
WKKKfffBBW
WffffffffW
WffAAffffW
WffAAffffW
WPfffffffW
WffffffffW
WWWWmmWWWW
```

### Legend

`W` WALL, `f` FLOOR_WOOD, `K` BOOKSHELF, `B` BED, `A` TABLE, `P` PLANT, `m` MAT.

### WARPS

| trigger | tiles | target |
|---|---|---|
| MAT (exit) | (4,7), (5,7) | `bellmere` : `from_elder` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `entry` | (4,6) | UP |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `elder_rowan` | ELDER | (5,3) | LEFT | static | `story.elder.1` |

### ENCOUNTERS / ITEMS

None.

---

## 12. MAP: loomspire_gym

- id: `loomspire_gym`
- displayName: LOOMSPIRE GYM
- dimensions: 12x16
- music: `loomspire`

A weaving wall maze: entry hall (y10-14), gap at (10,9) guarded by GLIDER FERN, mid
corridor (y7-8) gap at (1,6) guarded by GLIDER JUNO, upper corridor (y4-5), gap at
(10,3), then ARIA's chamber (y1-2) with flanking statues.

### Grid

```
WWWWWWWWWWWW
WUGGGGGGGGUW
WGGGGGGGGGGW
WWWWWWWWWWGW
WGGGGGGGGGGW
WGGGGGGGGGGW
WGWWWWWWWWWW
WGGGGGGGGGGW
WGGGGGGGGGGW
WWWWWWWWWWGW
WGGGGGGGGGGW
WGGGGGGGGGGW
WGGGGGGGGGGW
WGGGGGGGGGGW
WGGGGGGGGGGW
WWWWWmmWWWWW
```

### Legend

`W` WALL, `G` GYM_FLOOR, `U` STATUE, `m` MAT.

### WARPS

| trigger | tiles | target |
|---|---|---|
| MAT (exit) | (5,15), (6,15) | `loomspire` : `from_gym` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `entry` | (5,14) | UP |

### NPCS

| id | archetype | pos | facing | movement | dialogKey | sightRange | trainerKey |
|---|---|---|---|---|---|---|---|
| `gym_fern` | BOY | (8,10) | RIGHT | static | `story.gym.1` | 2 | `GLIDER_FERN` |
| `gym_juno` | GIRL | (3,7) | LEFT | static | `story.gym.2` | 2 | `GLIDER_JUNO` |
| `gym_aria` | WARDEN | (5,2) | DOWN | static | `story.gym.3` | 0 | `WARDEN_ARIA` |

Sight-line notes: the only way up is through gap (10,9) — FERN's sight covers (9,10)
and (10,10), the mandatory approach tile. The only way onward is gap (1,6) — JUNO's
sight covers (2,7) and (1,7), the mandatory approach tile. ARIA battles when spoken
to (sightRange 0) and awards the ZEPHYR BADGE.

### ENCOUNTERS / ITEMS

None.

---

## 13. MAP: wisteria_spire_1f

- id: `wisteria_spire_1f`
- displayName: WISTERIA SPIRE 1F
- dimensions: 12x12
- music: `spire_night`

The haunted ground floor of the Wisteria Spire. Open at all hours; wild Kindra appear
on every walkable FLOOR_TILE, NIGHT only (the Spire is quiet by daylight). The stairs
are unroped as of Tier 1: real STAIRS tiles at (5,1)-(6,1) climb to the dark 2F
teaser room (§14).

### Grid

```
WWWWWWWWWWWW
WttttSSttttW
WttttttttttW
WtWWttttWWtW
WttttttttttW
WtttUttUtttW
WttttttttttW
WtWWttttWWtW
WttttttttttW
WtPttttttPtW
WttttttttttW
WWWWWmmWWWWW
```

### Legend

`W` WALL (outer walls and interior pillar blocks), `t` FLOOR_TILE, `S` STAIRS
(up to 2F), `U` STATUE, `P` PLANT (withered wisteria), `m` MAT.

### WARPS

| trigger | tiles | target |
|---|---|---|
| MAT (exit) | (5,11), (6,11) | `loomspire` : `from_spire` |
| STAIRS (up) | (5,1), (6,1) | `wisteria_spire_2f` : `entry` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `entry` | (5,10) | UP |
| `stairs` | (5,2) | DOWN |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `spire_watcher` | MAN | (3,9) | RIGHT | static | `story.spire.1` |

### ENCOUNTERS

Rate: 30/256 per step on any FLOOR_TILE, NIGHT only. Levels 5-8 (ROSTER.md Wisteria
Spire band). MORNING / DAY: no encounters.

| slot % | NIGHT |
|---|---|
| 30 | WISPETAL L6 |
| 30 | TOLLGEIST L6 |
| 20 | WISPETAL L5 |
| 10 | DUSKMOTH L6 |
| 5 | HUSHOWL L7 |
| 4 | DUSKMOTH L8 |
| 1 | HUSHOWL L8 |

### ITEMS

None.

---

## 14. MAP: wisteria_spire_2f

- id: `wisteria_spire_2f`
- displayName: WISTERIA SPIRE 2F
- dimensions: 10x10
- music: `spire_night`
- dark: yes (Tier 1 — lit only in a circle around the player; LUMINA widens it)

The dark teaser room above the ground floor: pitch black until LUMINA earns a badge,
so the player explores by the small circle of light at their feet. The layout is
deliberately fair in the gloom — one open ring of floor around sparse statue
landmarks, no dead ends — with the TOLL SHARD waiting in the far corner (the Gloam
arc's front door). Encounters share 1F's single table, cave-style on every walkable
tile, at a gentler rate (the dark is the hazard here, not the wilds).

### Grid

```
WWWWWWWWWW
WZtttttPtW
WtttUttttW
WttttttttW
WttUttUttW
WttttttttW
WttttUtttW
WttttttttW
WtPttttttW
WWWWWWWWWW
```

### Legend

`W` WALL, `t` FLOOR_TILE, `Z` STAIRS (down to 1F), `U` STATUE, `P` PLANT (withered
wisteria).

### WARPS

| trigger | tiles | target |
|---|---|---|
| STAIRS (down) | (1,1) | `wisteria_spire_1f` : `stairs` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `entry` | (2,1) | RIGHT |

### NPCS

None — nothing living keeps the second floor.

### ENCOUNTERS

Rate: 20/256 per step on any FLOOR_TILE, cave-style. The table is 1F's, verbatim
(same gloom, same voices — see §13).

### ITEMS

| item | pos | note |
|---|---|---|
| TOLL SHARD | (8,8) | the guaranteed find, far corner of the gloom |

---

## 15. MAP: dawnfern_nursery (Tier 2)

- id: `dawnfern_nursery`
- displayName: *(interior — no name announced)*
- dimensions: 10x8
- music: `dawnfern`

The keeper couple's cottage off Dawnfern's southeast green (MECHANICS §15 owns
the breeding rules). The old woman minds the boarding desk behind the COUNTER
run — counter-talk, like the Haven and Outfitter — and her husband stands by
the bed until `nursery_egg` sends him outside to the door in `dawnfern`.

### Grid

```
WWWWWWWWWW
WKKffffBBW
WffffffffW
WfCCCCffPW
WffffffffW
WPffffAAfW
WffffffffW
WWWWmmWWWW
```

### Legend

`W` WALL_INT, `f` FLOOR_WOOD, `K` BOOKSHELF, `B` BED, `C` COUNTER, `A` TABLE,
`P` PLANT, `m` MAT.

### WARPS

| trigger | tiles | target |
|---|---|---|
| MAT (exit) | (4,7), (5,7) | `dawnfern` : `from_nursery` |

### SPAWNS

| name | (x,y) | facing |
|---|---|---|
| `entry` | (4,6) | UP |

### NPCS

| id | archetype | pos | facing | movement | dialogKey |
|---|---|---|---|---|---|
| `nursery_keeper` | WOMAN | (3,2) | DOWN | static | script `nursery_keeper` — BOARD / RETRIEVE / LEAVE across the counter at (3,3) |
| `nursery_man` | ELDER | (7,2) | DOWN | static | script `nursery_egg_man`; hideFlag `nursery_egg` — he is outside in `dawnfern` whenever the flag is set |

### ENCOUNTERS

None (interior).

### ITEMS

None.

---

## 16. CROSS-VALIDATION (performed before writing)

- 15 maps; every grid row is exactly `width` chars and every grid has exactly
  `height` rows.
- Every DOOR tile has a WARP: dawnfern (4,10), (14,10), (16,15); bellmere (3,5),
  (11,5), (3,13); loomspire (5,7), (18,7), (5,16). Every interior MAT pair has a
  WARP. Every STAIRS tile has a WARP: spire 1F (5,1), (6,1) up; spire 2F (1,1)
  down.
- Every warp target spawn exists: dawnfern `from_home`/`from_lab`/`from_nursery`/
  `from_trail1`; trail1 `south`/`north`; bellmere `from_trail1`/`from_trail2`/
  `from_haven`/`from_elder`/`from_outfitter`; trail2 `east`/`west`; loomspire
  `from_trail2`/`from_haven`/`from_spire`/`from_gym`; all interiors `entry`
  (+ player_home `wake`, wisteria_spire_1f `stairs`). All spawn tiles are
  walkable (PATH/GRASS/FLOOR).
- Tier-2 schedules ride `NpcDef.appears` (re-checked every frame like the flag
  gates): `bellmere_market` Saturdays; `trail1_gran` Sunday mornings. The
  `nursery_egg` flag swaps the old man between his two posts. Fishing tables:
  bellmere only (the atlas has WATER nowhere else), 7 slots, rate 60/100 per
  cast.
- Edge zones are mutual: dawnfern N <-> trail1 S; trail1 N <-> bellmere S;
  bellmere W <-> trail2 E; trail2 W <-> loomspire E. The Spire stairs are mutual:
  1F (5,1)/(6,1) <-> 2F (1,1), each landing spawn one tile off its stairs.
- Encounter species all exist in ROSTER.md: SCURRIL, WRENLET, THREDLE, SPOOLEN,
  DEWBELL, DUSKMOTH, HUSHOWL, PADDLET, TORTIDE, SHADEKIT, ZEPHYRIL, AMBERSTAG,
  WISPETAL, TOLLGEIST. Trail 2 NIGHT 1% slot = AMBERSTAG L7 (required). Every slot
  column sums to 100 (30/30/20/10/5/4/1). Time-of-day exclusivity honored: DEWBELL
  morning-only; DUSKMOTH/HUSHOWL/SHADEKIT/WISPETAL/TOLLGEIST/AMBERSTAG night-only.
  One pinned exception: the Bellmere lake's surf table is period-less, so its 1%
  DEWBELL rides the lake mist at any hour (§3).
- Obstacles (Tier 1): the trail1 SAPLING at (17,2) is the HEW grove's only mouth;
  the trail2 BOULDER at (4,11) has open ground on both vertical sides for HEAVE.
  Obstacle state is per-visit (resets on map reload, cartridge-style).
- Trainer keys all exist in ROSTER.md Section C: SCOUT_BEN, FORAGER_MAE,
  BELLRINGER_OTTO, HERBALIST_IVY, RIVAL_CORVIN_T2, GLIDER_FERN, GLIDER_JUNO,
  WARDEN_ARIA. Gym sight lines cross truly mandatory tiles (chokepoints (10,10)
  and (1,7)); the Trail 2 gazes cover the natural route (path rows y8-9) but are
  dodgeable through the open field rows by careful players (genre convention).
- Progress gating: Trail 1 grass bands (y6-8, y19-21) span the full corridor incl.
  path; Trail 2 bands (x12-14, x23-25) span y3-10 with tree caps y1-2 — Bellmere and
  Loomspire are unreachable without tall grass. Trail 2 ledge row y11 is a one-way
  drop into the south corridor, which reconnects only at the east (Bellmere) end
  (until HEAVE opens the (4,11) climb).
- Items: CHARM x2 (trail1 (3,10), trail2 (33,13)), TONIC x2 (trail1 (17,23),
  trail2 (5,13)), AMBER CRUMB (trail1 (16,1), HEW-gated), TINGLE BERRY (trail1
  (4,17)), KEEN LENS (bellmere (20,11), WAVERIDE-gated), TOLL SHARD (spire 2F
  (8,8)) — all on walkable tiles, each reachable once its listed skill unlocks.
- Music keys all from the approved set: dawnfern, trail, bellmere, loomspire,
  spire_night (title is used by the title screen, not a map).
