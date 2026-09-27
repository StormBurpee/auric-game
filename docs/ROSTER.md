# AURIC — ROSTER

The content backbone for AURIC — "An Ambervale Story". Data engineers transcribe this
file verbatim into TypeScript. Pixel artists draw from the VISUAL specs. Every move key
referenced in a learnset exists in Section B. Every species key referenced by a trainer
or encounter table exists in Section A.

---

## 0. CONVENTIONS

- Stat order is always `HP / ATK / DEF / SPA / SPD / SPE`.
- Types are the 17 Gen-2 types: Normal, Fire, Water, Electric, Grass, Ice, Fighting,
  Poison, Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, Dark, Steel.
- Time windows (locked canon): MORNING 4:00-9:59, DAY 10:00-17:59, NIGHT 18:00-3:59.
- `key` is also the in-game display name, rendered UPPERCASE, <= 10 chars.
- Move display names are <= 12 chars. Kindex entries are <= 110 chars.
- Learnsets are cumulative: an evolved Kindra keeps moves known at evolution and uses
  its own learnset from then on. Wild/trainer Kindra know the last 4 learnset moves at
  or below their level.
- Evolution methods (Tier 1) are ordered rule lists — the first matching rule wins:
  `level N` (optionally gated to a time-of-day window), `stone ITEM` (used from the
  bag; refunded on a cancelled ceremony), `bond 220+` (friendship, checked at
  level-up, optionally time-gated), and `LINK CORD` (the trade stand-in until real
  trading exists). A species lists every rule that applies, in priority order.
- Trainer-owned Kindra may be slightly pre-evolved relative to wild evolution levels
  (Gen-2 gym-leader convention; see ARIA's GALEWREN at lv 11).
- catchRate tiers: 255 common, 190 uncommon, 90 evolved, 45 starter/rare, 3 legend.
- Sprite canvas is 48x48. Heights below are the creature's drawn height in that canvas:
  commons ~28-32 px, evolved ~38-42 px, legend full 48 px. FRONT sprites face the
  viewer at 3/4; BACK sprites are seen from behind at lower detail (battle view).
- Palettes are 3 colors: dark outline shade / primary mid / light accent. GBC feel:
  saturated but soft.

---

## A. KINDRA ROSTER (24 species)

### 001 VERDIL
- key: `VERDIL` — say "VUR-dil"
- type1: Grass | type2: none
- baseStats: 50 / 49 / 55 / 49 / 55 / 52 (total 310)
- catchRate: 45 | baseExp: 64 | growthCurve: mediumSlow
- evolvesTo: VERDRAKE at level 16
- learnset:
  - 1: POUNCE
  - 1: BRISTLE
  - 7: SAP_SIP
  - 10: LEAF_LASH
  - 15: NUMB_POWDER
  - 22: VERDANT_COIL
  - 28: MORNING_DEW
- kindexEntry: "Its leaf tail tastes the wind. The leaf curls tight a full hour before rain reaches the valley."
- visual:
  - silhouette: small, plump four-legged newt; ~28 px tall
  - features: upright leaf-shaped tail; large round amber eyes; pale belly stripe; tiny sprout bud between its ear nubs
  - front: standing 3/4, head tilted up curiously, leaf tail curling over its back
  - back: rounded back and rump, leaf tail prominent at center, ear nubs visible
  - palette: outline `#1f4030` / primary `#5cb46a` / accent `#c8eaa0`

### 002 VERDRAKE
- key: `VERDRAKE` — say "VUR-drayk"
- type1: Grass | type2: none
- baseStats: 70 / 62 / 80 / 63 / 80 / 60 (total 415)
- catchRate: 45 | baseExp: 142 | growthCurve: mediumSlow
- evolvesTo: none
- learnset:
  - 1: POUNCE
  - 1: BRISTLE
  - 1: SAP_SIP
  - 10: LEAF_LASH
  - 15: NUMB_POWDER
  - 18: VERDANT_COIL
  - 26: MORNING_DEW
  - 31: TRAMPLE
- kindexEntry: "Moss plates harden along its spine with age. Old trees lean toward it as if listening."
- visual:
  - silhouette: medium, low and sturdy four-legged salamander with heavy shoulders; ~40 px tall
  - features: row of mossy plates down the spine; broad three-lobed frond tail; calm heavy-lidded eyes; bark-like bands on the forelegs
  - front: planted four-square, frond tail raised like a banner, chin slightly lowered
  - back: spine-plate row running down center, frond tail fanned, haunches wide
  - palette: outline `#1c3a2c` / primary `#3f8f5a` / accent `#a4d9a0`

### 003 EMBERIT
- key: `EMBERIT` — say "EM-bur-it"
- type1: Fire | type2: none
- baseStats: 44 / 58 / 42 / 60 / 42 / 64 (total 310)
- catchRate: 45 | baseExp: 65 | growthCurve: mediumSlow
- evolvesTo: CINDERAX at level 14
- learnset:
  - 1: POUNCE
  - 6: SOOT_VEIL
  - 9: CINDER_SPIT
  - 13: QUICK_DART
  - 19: FLARE_SNAP
  - 26: RILE_UP
  - 31: PYRE_SPINES
- kindexEntry: "Sparks nest in the fur of its back. It dozes in warm ash and wakes smelling of woodsmoke."
- visual:
  - silhouette: small crouched shrew, nose down, body a teardrop; ~26 px tall
  - features: long pointed snout; three ember tufts glowing along its back; oversized rounded ears; dark socked paws
  - front: hunched 3/4 crouch, one forepaw lifted, tiny sparks rising off its back tufts
  - back: round rump, three ember tufts in a line, big ears poking up
  - palette: outline `#4a2a1e` / primary `#d97b3f` / accent `#f6d77a`

### 004 CINDERAX
- key: `CINDERAX` — say "SIN-der-aks"
- type1: Fire | type2: none
- baseStats: 58 / 76 / 54 / 80 / 54 / 86 (total 408)
- catchRate: 45 | baseExp: 143 | growthCurve: mediumSlow
- evolvesTo: none
- learnset:
  - 1: POUNCE
  - 1: SOOT_VEIL
  - 9: CINDER_SPIT
  - 13: QUICK_DART
  - 18: FLARE_SNAP
  - 24: RILE_UP
  - 28: PYRE_SPINES
  - 34: RECKLESS_RAM
- kindexEntry: "When riled, its back spines burn white-hot. It rakes embers into a ring and sleeps at the center."
- visual:
  - silhouette: lean shrew rearing on hind legs, ready to bolt; ~40 px tall
  - features: crest of flame spines from crown to tail-base; long whip tail with ember tip; narrowed sharp eyes; soot-dark forearms
  - front: half-crouch sprinter's stance, spines flaring upward, tail whipping behind
  - back: glowing spine row down the center, tail curled to one side, ears swept back
  - palette: outline `#3d1f1a` / primary `#c8502e` / accent `#ffb45c`

### 005 RILLET
- key: `RILLET` — say "RIL-it"
- type1: Water | type2: none
- baseStats: 52 / 55 / 50 / 55 / 50 / 48 (total 310)
- catchRate: 45 | baseExp: 66 | growthCurve: mediumSlow
- evolvesTo: CASCOTT at level 15
- learnset:
  - 1: POUNCE
  - 6: CURL_UP
  - 8: WATER_DART
  - 14: FOAM_BURST
  - 19: GNAW
  - 28: RIVER_SURGE
- kindexEntry: "A river pup that drums its belly when happy. It can nap mid-stream, anchored by its tail."
- visual:
  - silhouette: small round otter pup sitting upright; ~30 px tall
  - features: teardrop marking on forehead; cream bib on chest; flat rudder tail wrapped around its feet; tiny paws held to chest
  - front: sitting 3/4, paws together, head cocked, tail curled in front of toes
  - back: round huddled back, rudder tail sticking out to one side, small ears
  - palette: outline `#203a52` / primary `#4d8fc4` / accent `#bfe6f2`

### 006 CASCOTT
- key: `CASCOTT` — say "kas-KOT"
- type1: Water | type2: none
- baseStats: 72 / 75 / 66 / 70 / 66 / 63 (total 412)
- catchRate: 45 | baseExp: 144 | growthCurve: mediumSlow
- evolvesTo: none
- learnset:
  - 1: POUNCE
  - 1: CURL_UP
  - 8: WATER_DART
  - 14: FOAM_BURST
  - 21: GNAW
  - 26: TRAMPLE
  - 32: RIVER_SURGE
- kindexEntry: "It climbs waterfalls by riding the spray upward. Its flat tail steers like a ferry rudder."
- visual:
  - silhouette: sleek long-bodied otter standing mid-stride; ~40 px tall
  - features: fin-like crest down the back of its neck; wave-band markings on flanks; thick flat tail; webbed forepaws
  - front: striding 3/4, crest raised, one webbed paw forward, confident grin
  - back: crest line down neck and spine, broad tail trailing, flank wave-band visible
  - palette: outline `#1b3350` / primary `#3a78b5` / accent `#a8dcef`

### 007 WRENLET
- key: `WRENLET` — say "REN-let"
- type1: Normal | type2: Flying
- baseStats: 40 / 45 / 35 / 30 / 30 / 56 (total 236)
- catchRate: 255 | baseExp: 54 | growthCurve: mediumFast
- evolvesTo: GALEWREN at level 12
- learnset:
  - 1: BEAK_JAB
  - 1: BRISTLE
  - 5: SAND_KICK
  - 9: AIR_SWIRL
  - 13: QUICK_DART
  - 19: WING_SMACK
  - 25: WIND_SPRINT
- kindexEntry: "Its three-note dawn song wakes whole villages. It is never a minute late, even in winter."
- visual:
  - silhouette: tiny round songbird, head nearly half its body; ~24 px tall
  - features: oversized head; short fanned tail with dark tips; single curled feather on crown; stubby beak
  - front: mid-hop 3/4, one wing slightly raised, beak open in song
  - back: round body, fanned tail with dark tips, crown curl visible from behind
  - palette: outline `#4a3526` / primary `#b58a52` / accent `#f2e0b8`

### 008 GALEWREN
- key: `GALEWREN` — say "GAYL-ren"
- type1: Normal | type2: Flying
- baseStats: 60 / 65 / 50 / 45 / 45 / 81 (total 346)
- catchRate: 90 | baseExp: 113 | growthCurve: mediumFast
- evolvesTo: none
- learnset:
  - 1: BEAK_JAB
  - 1: BRISTLE
  - 5: SAND_KICK
  - 9: AIR_SWIRL
  - 14: QUICK_DART
  - 21: WING_SMACK
  - 27: WIND_SPRINT
  - 33: DIVE_BOMB
- kindexEntry: "Its long tail feathers read the wind. Couriers once trusted it to outrace any storm."
- visual:
  - silhouette: slim swept-back bird leaning into the wind; ~36 px tall
  - features: two long streaming tail feathers; swept crest like a blown-back fringe; sharp angular wings; pale chest chevron
  - front: perched leaning forward, tail streamers blowing to one side, eye keen
  - back: crest point and twin tail streamers dominate, wingtips crossed
  - palette: outline `#2e3a52` / primary `#7d96c0` / accent `#e8eef8`

### 009 SCURRIL
- key: `SCURRIL` — say "SKUR-il"
- type1: Normal | type2: none
- baseStats: 42 / 50 / 36 / 32 / 36 / 60 (total 256)
- catchRate: 255 | baseExp: 51 | growthCurve: mediumFast
- evolvesTo: THATCHRAT at level 13
- learnset:
  - 1: POUNCE
  - 1: BRISTLE
  - 6: QUICK_DART
  - 10: TAIL_FLURRY
  - 14: GNAW
  - 21: CURL_UP
  - 27: TRAMPLE
- kindexEntry: "It stuffs its cheeks with seeds, then forgets where half are buried. The forest is grateful."
- visual:
  - silhouette: small plump vole on its haunches; ~26 px tall
  - features: bulging stuffed cheeks; stubby tail with a tuft; small folded ears; single buck tooth
  - front: sitting up 3/4, nibbling a seed held in both paws, cheeks full
  - back: round rump, tail tuft, ear tips — a fuzzy ball from behind
  - palette: outline `#45301f` / primary `#a8784a` / accent `#ead9ae`

### 010 THATCHRAT
- key: `THATCHRAT` — say "THACH-rat"
- type1: Normal | type2: none
- baseStats: 65 / 76 / 54 / 45 / 56 / 84 (total 380)
- catchRate: 90 | baseExp: 116 | growthCurve: mediumFast
- evolvesTo: none
- learnset:
  - 1: POUNCE
  - 1: BRISTLE
  - 6: QUICK_DART
  - 12: TAIL_FLURRY
  - 16: GNAW
  - 24: TRAMPLE
  - 30: RECKLESS_RAM
- kindexEntry: "It weaves its nest into roof thatch. A home with a THATCHRAT in the eaves never leaks."
- visual:
  - silhouette: long rat standing upright, slightly hunched; ~36 px tall
  - features: straw-textured ruff around the neck like woven thatch; long banded tail in an S-curve; prominent incisors; nimble forepaws
  - front: upright 3/4, forepaws raised as if patting straw into place, tail S-curved
  - back: thatch ruff collar, banded tail curling, narrow shoulders
  - palette: outline `#2f2418` / primary `#a87b3d` / accent `#e8cf8e`

### 011 THREDLE
- key: `THREDLE` — say "THRED-ul"
- type1: Bug | type2: none
- baseStats: 40 / 30 / 33 / 20 / 25 / 47 (total 195)
- catchRate: 255 | baseExp: 50 | growthCurve: mediumFast
- evolvesTo: SPOOLEN at level 7
- learnset:
  - 1: POUNCE
  - 1: SILK_SNARE
  - 4: VENOM_BARB
  - 8: CHITIN_BITE
  - 12: CURL_UP
- kindexEntry: "It trails a fine silver thread wherever it crawls. Lost children once followed them home."
- visual:
  - silhouette: short four-segment larva arched like an inchworm; ~22 px tall
  - features: four plump body segments; silver thread trailing from tail tip; stubby legs; big friendly dot eyes; tiny barb on brow
  - front: inchworm arch, head segment raised toward the viewer, thread looping behind
  - back: segment ridges, thread trailing off-canvas, rear stubby legs
  - palette: outline `#2c4028` / primary `#88b860` / accent `#e0eeb8`

### 012 SPOOLEN
- key: `SPOOLEN` — say "SPOO-len"
- type1: Bug | type2: none
- baseStats: 48 / 25 / 52 / 22 / 28 / 30 (total 205)
- catchRate: 190 | baseExp: 58 | growthCurve: mediumFast
- evolvesTo (ordered): DUSKMOTH at level 10 by NIGHT; LACEWING at level 10;
  LACEWING via LINK CORD. The night branch is canon Tier 1 flavor — the cocoon is
  "being rewoven", and what wakes depends on the hour it finishes (a deliberate,
  B-cancelable behavior change; the cord re-spools the spool, thread to thread).
- learnset:
  - 1: CHITIN_BITE
  - 1: SILK_SNARE
  - 1: CURL_UP
  - 7: VENOM_BARB
  - 9: BRISTLE
- kindexEntry: "Wound tight in its own silk, it hardly stirs. Inside, every part of it is being rewoven."
- visual:
  - silhouette: a thread spool — cylinder with flared top and bottom flanges; ~26 px tall
  - features: horizontal silk winding bands; two sleepy eyes peering through a gap in the silk; flat flanges top and bottom; one loose thread end
  - front: leaning slightly to 3/4, eyes visible in the band gap
  - back: plain banded spool, loose thread end dangling, no face
  - palette: outline `#4a4434` / primary `#b0a47a` / accent `#ece2c4`

### 013 LACEWING
- key: `LACEWING` — say "LAYS-wing"
- type1: Bug | type2: Flying
- baseStats: 60 / 45 / 50 / 75 / 70 / 70 (total 370)
- catchRate: 90 | baseExp: 128 | growthCurve: mediumFast
- evolvesTo: none
- learnset:
  - 1: AIR_SWIRL
  - 1: SILK_SNARE
  - 10: MIND_RIPPLE
  - 13: SPORE_PUFF
  - 15: NUMB_POWDER
  - 20: PETAL_DRIFT
  - 27: SHIMMER_DUST
- kindexEntry: "Its wings are living lace that scatter sunlight into rings. It sips dew instead of nectar."
- visual:
  - silhouette: butterfly with four broad wings, slender body; ~38 px wingtip to foot
  - features: lace-doily wing pattern with small cutout holes; slender pale body; antennae curled at the tips; dark wing edging
  - front: hovering 3/4, all four wings spread, body angled toward viewer
  - back: wing backs with simplified lace holes, body a thin line between them
  - palette: outline `#34406b` / primary `#9fc4e8` / accent `#fdf6ff`

### 014 DUSKMOTH
- key: `DUSKMOTH` — say "DUSK-mawth"
- type1: Bug | type2: Dark
- baseStats: 50 / 38 / 42 / 60 / 55 / 45 (total 290)
- catchRate: 190 | baseExp: 88 | growthCurve: mediumFast
- evolvesTo: none
- learnset:
  - 1: AIR_SWIRL
  - 5: NUMB_POWDER
  - 10: SHIMMER_DUST
  - 15: DREAM_MIST
  - 21: SHADOWSTEP
  - 27: MIND_RIPPLE
- kindexEntry: "It flies only after dusk, shedding a faint shimmer. Lamplighters call it the night's lantern."
- visual:
  - silhouette: broad fuzzy moth, wings wider than tall; ~32 px tall
  - features: thick fur ruff at the collar; amber eyespots on the hindwings; plume (feather-comb) antennae; faint dust motes beneath it
  - front: hovering mid-flap 3/4, eyespots showing, dust falling below
  - back: wing tops plain with eyespot edges peeking, ruff silhouette, antennae plumes
  - palette: outline `#2a2438` / primary `#6b5a8c` / accent `#e8c46a`

### 015 HUSHOWL
- key: `HUSHOWL` — say "HUSH-owl"
- type1: Dark | type2: Flying
- baseStats: 64 / 52 / 46 / 48 / 56 / 54 (total 320)
- catchRate: 190 | baseExp: 92 | growthCurve: mediumFast
- evolvesTo: none
- learnset:
  - 1: BEAK_JAB
  - 6: LULLABELL
  - 11: NIGHT_NIP
  - 16: WING_SMACK
  - 22: MIND_RIPPLE
  - 28: DIVE_BOMB
- kindexEntry: "It flies without a whisper of sound. You learn it was watching only when morning comes."
- visual:
  - silhouette: compact upright owl, perfectly still; ~32 px tall
  - features: smooth flat facial disc; eyes that look closed, one cracked open a sliver; folded silent wings; collar of soft down
  - front: perched bolt upright 3/4, head tilted a few degrees, one eye barely open
  - back: smooth folded wings, round head turned slightly, down collar edge
  - palette: outline `#241f2e` / primary `#5c4a6b` / accent `#cdb8da`

### 016 DEWBELL
- key: `DEWBELL` — say "DEW-bel"
- type1: Water | type2: none
- baseStats: 50 / 33 / 48 / 58 / 62 / 39 (total 290)
- catchRate: 190 | baseExp: 84 | growthCurve: mediumFast
- evolvesTo: TOLLGEIST via TOLL SHARD (stone; canon Tier 1 — the dew that gathered
  on shrine bells answers a shard of one; BST 290 -> 328)
- learnset:
  - 1: WATER_DART
  - 6: LULLABELL
  - 10: FOAM_BURST
  - 16: MORNING_DEW
  - 22: FROST_DEW
- kindexEntry: "It gathers from dew on shrine bells at first light. By midmorning it is gone like mist."
- visual:
  - silhouette: floating bell shape made of pale translucent water; ~26 px tall
  - features: glinting dewdrop clapper hanging beneath; rim that ripples like liquid; two simple dot eyes high on the dome; soft inner glow
  - front: hovering at a slight tilt 3/4, clapper-drop swinging, rim mid-ripple
  - back: smooth dome, rim ripple, clapper-drop visible below — no eyes
  - palette: outline `#2c4a4a` / primary `#6cc4c0` / accent `#e4fbf6`

### 017 PADDLET
- key: `PADDLET` — say "PAD-let"
- type1: Water | type2: none
- baseStats: 50 / 42 / 55 / 40 / 45 / 30 (total 262)
- catchRate: 255 | baseExp: 60 | growthCurve: mediumFast
- evolvesTo: TORTIDE at level 16
- learnset:
  - 1: POUNCE
  - 1: CURL_UP
  - 6: WATER_DART
  - 12: FOAM_BURST
  - 18: GNAW
  - 25: RIVER_SURGE
- kindexEntry: "Its shell is still soft, so it floats more than it dives. It paddles in earnest, tiny circles."
- visual:
  - silhouette: round little turtle, all shell and flippers; ~28 px tall
  - features: soft shell with a single spiral swirl mark; oversized paddle forelimbs; blunt happy face; stubby tail
  - front: paddling stance 3/4, one big flipper raised in a wave
  - back: shell swirl centered, head peeking around the side, flipper tips out
  - palette: outline `#1f3a3a` / primary `#4a9c8c` / accent `#c0ead8`

### 018 TORTIDE
- key: `TORTIDE` — say "TOR-tyde"
- type1: Water | type2: none
- baseStats: 72 / 60 / 85 / 58 / 65 / 40 (total 380)
- catchRate: 90 | baseExp: 126 | growthCurve: mediumFast
- evolvesTo: none
- learnset:
  - 1: POUNCE
  - 1: CURL_UP
  - 6: WATER_DART
  - 12: FOAM_BURST
  - 20: GNAW
  - 26: TRAMPLE
  - 33: RIVER_SURGE
- kindexEntry: "Bellmere folk say the tide turns when a sleeping TORTIDE rolls over on the lakebed."
- visual:
  - silhouette: heavy broad turtle with a tall domed shell; ~42 px tall
  - features: concentric tide-ring grooves on the shell; barnacle-like pale studs; weathered hooked jaw; thick column legs
  - front: low and broad 3/4, head pushed forward, shell rings readable
  - back: tall ringed shell dominates the frame, head and tail tips peeking
  - palette: outline `#16323e` / primary `#2f7d8c` / accent `#a0d8d4`

### 019 ZEPHYRIL
- key: `ZEPHYRIL` — say "ZEF-er-il"
- type1: Flying | type2: Psychic
- baseStats: 60 / 50 / 55 / 80 / 70 / 85 (total 400)
- catchRate: 45 | baseExp: 150 | growthCurve: mediumFast
- evolvesTo: none
- learnset:
  - 1: AIR_SWIRL
  - 1: QUICK_DART
  - 9: MIND_RIPPLE
  - 13: ZEPHYR_LANCE
  - 18: WIND_SPRINT
  - 24: DREAM_MIST
  - 30: DIVE_BOMB
- kindexEntry: "A spirit of the high wind. Weathervanes spin to follow it though no breeze can be felt."
- visual:
  - silhouette: airborne wisp-bird — a curling ribbon of wind with a bird's head, no feet; ~40 px tall
  - features: body is a single flowing ribbon spiral; two long streamer wings; gem-like single visible eye; trailing wisp tips that fade
  - front: spiraling upward 3/4, ribbons trailing below, head turned to viewer
  - back: ribbon curve seen from behind, head turned away, streamers crossing
  - palette: outline `#3a3a55` / primary `#9caee0` / accent `#f4f8ff`

### 020 SHADEKIT
- key: `SHADEKIT` — say "SHAYD-kit"
- type1: Dark | type2: none
- baseStats: 45 / 55 / 40 / 50 / 40 / 65 (total 295)
- catchRate: 190 | baseExp: 70 | growthCurve: mediumFast
- evolvesTo (ordered): GLOAMFANG at bond 220+ on a NIGHT level-up; GLOAMFANG at
  level 18. The bond branch is canon Tier 1 — a beloved kit changes with the dusk
  (it "matches your stride exactly"); a kept-at-distance one still gets there at 18.
- learnset:
  - 1: POUNCE
  - 5: SHADOWSTEP
  - 8: NIGHT_NIP
  - 13: RILE_UP
  - 18: GLOOM_CLAW
  - 25: WIND_SPRINT
- kindexEntry: "A kit with shadow-soft fur. It hides inside your own shadow and matches your stride exactly."
- visual:
  - silhouette: small fox kit in a low stalking crouch; ~28 px tall
  - features: fur edges slightly wispy, like smoke; pale cold blue-grey eyes; tail tip that fades to vapor; large alert ears
  - front: low stalking crouch 3/4, shoulders down, eyes locked on viewer
  - back: hunched shoulder blades, ears up, tail fading off at the tip
  - palette: outline `#1c1a24` / primary `#4a4458` / accent `#a89cc4`

### 021 GLOAMFANG
- key: `GLOAMFANG` — say "GLOHM-fang"
- type1: Dark | type2: none
- baseStats: 65 / 78 / 52 / 65 / 52 / 80 (total 392)
- catchRate: 90 | baseExp: 132 | growthCurve: mediumFast
- evolvesTo: none
- learnset:
  - 1: POUNCE
  - 1: SHADOWSTEP
  - 8: NIGHT_NIP
  - 14: RILE_UP
  - 20: GLOOM_CLAW
  - 28: WIND_SPRINT
- kindexEntry: "It hunts in the hour between lights. Its eyes hold the last gleam of a shuttered lantern."
- visual:
  - silhouette: tall lean angular fox, long thin legs; ~40 px tall
  - features: smoke ruff drifting at the neck; narrow knife-like muzzle; single pale fang glint; tail that streams like slow smoke
  - front: standing tall 3/4, head turned in a cold side glance, fang glinting
  - back: narrow shoulders, smoke ruff edges, long tail drifting sideways
  - palette: outline `#14121c` / primary `#3b3548` / accent `#8e84ac`

### 022 WISPETAL
- key: `WISPETAL` — say "WIS-pet-ul"
- type1: Ghost | type2: Grass
- baseStats: 44 / 35 / 40 / 70 / 65 / 56 (total 310)
- catchRate: 190 | baseExp: 95 | growthCurve: mediumFast
- evolvesTo: none
- learnset:
  - 1: STARTLE
  - 6: SAP_SIP
  - 10: BLIGHTSPORE
  - 14: PETAL_DRIFT
  - 19: CHILL_TOUCH
  - 26: DREAM_MIST
- kindexEntry: "Wisteria petals that refused to touch the ground. They drift the spire halls, remembering."
- visual:
  - silhouette: floating loose cluster of petals around a small ghostly core; ~28 px tall
  - features: five to seven wisteria petals fanned like a ragged cloak; two soft glowing eyes in the dark core; a trailing stream of stray petals; faint inner glow
  - front: drifting 3/4, petals fanned wide, eyes glowing from the gap
  - back: petal cluster from behind, core glow leaking between petals, no eyes
  - palette: outline `#2e2742` / primary `#8a6fae` / accent `#e6d4f4`

### 023 TOLLGEIST
- key: `TOLLGEIST` — say "TOHL-gyst"
- type1: Ghost | type2: none
- baseStats: 55 / 48 / 65 / 60 / 65 / 35 (total 328)
- catchRate: 190 | baseExp: 102 | growthCurve: mediumFast
- evolvesTo: none
- learnset:
  - 1: CHILL_TOUCH
  - 5: STARTLE
  - 9: LULLABELL
  - 14: BELL_TOLL
  - 20: CURL_UP
  - 27: MIND_RIPPLE
- kindexEntry: "A cracked shrine bell that learned to ring itself. Its midnight toll counts what no one sees."
- visual:
  - silhouette: hovering old temple bell, slightly tilted as if mid-swing; ~34 px tall
  - features: jagged crack down its face glowing faintly from inside; clapper hanging out like a tongue; wisps of mist curling at the rim; tarnished bronze sheen
  - front: tilted 3/4 mid-swing, crack-glow facing viewer, clapper swung to one side
  - back: plain bell back, edge of the crack wrapping around, rim mist
  - palette: outline `#2a2520` / primary `#6e5f3f` / accent `#d8c478`

### 024 AMBERSTAG
- key: `AMBERSTAG` — say "AM-bur-stag"
- type1: Normal | type2: Psychic
- baseStats: 95 / 75 / 70 / 95 / 85 / 60 (total 480)
- catchRate: 3 | baseExp: 200 | growthCurve: slow
- evolvesTo: none
- learnset:
  - 1: QUICK_DART
  - 1: MIND_RIPPLE
  - 9: MORNING_DEW
  - 16: TRAMPLE
  - 24: WIND_SPRINT
  - 31: DAWN_LANCE
- kindexEntry: "Trail walkers swear dawn came twice: once with antlers of amber light, and then the sun."
- visual:
  - silhouette: tall slender stag, head held high; full 48 px canvas height
  - features: translucent amber antlers with drifting light motes; dawn-mist mane along the neck; four-point star mark on the brow; slim dark legs that fade pale at the hooves
  - front: standing alert 3/4, head high, antlers at full span filling the canvas top
  - back: antler span above, mane line down the neck, tail mid-flick, narrow hips
  - palette: outline `#4a2f14` / primary `#d89a3c` / accent `#ffe9b0`

---

## B. MOVES (46)

Columns: key | display name | type | power | accuracy | pp | effect.
`—` means not applicable. Every learnset reference above resolves to a row below.

| key | display | type | power | acc | pp | effect |
|---|---|---|---|---|---|---|
| POUNCE | Pounce | Normal | 40 | 100 | 35 | DAMAGE |
| GNAW | Gnaw | Normal | 55 | 95 | 25 | DAMAGE |
| QUICK_DART | Quick Dart | Normal | 40 | 100 | 30 | DMG_PRIORITY_1 |
| TAIL_FLURRY | Tail Flurry | Normal | 15 | 85 | 20 | DMG_MULTI_2_5 |
| TRAMPLE | Trample | Normal | 85 | 100 | 15 | DMG_PAR_30 |
| RECKLESS_RAM | Reckless Ram | Normal | 90 | 85 | 20 | DMG_RECOIL_25 |
| BRISTLE | Bristle | Normal | — | 100 | 30 | LOWER_FOE_ATK_1 |
| SAND_KICK | Sand Kick | Normal | — | 100 | 15 | LOWER_FOE_ACC_1 |
| SOOT_VEIL | Soot Veil | Normal | — | 100 | 20 | LOWER_FOE_ACC_1 |
| CURL_UP | Curl Up | Normal | — | — | 30 | RAISE_SELF_DEF_1 |
| RILE_UP | Rile Up | Normal | — | — | 20 | RAISE_SELF_ATK_2 |
| WIND_SPRINT | Wind Sprint | Normal | — | — | 30 | RAISE_SELF_SPE_2 |
| LULLABELL | Lullabell | Normal | — | 55 | 15 | STATUS_SLP |
| SAP_SIP | Sap Sip | Grass | 40 | 100 | 20 | DMG_DRAIN_50 |
| LEAF_LASH | Leaf Lash | Grass | 55 | 95 | 25 | DMG_HIGH_CRIT |
| PETAL_DRIFT | Petal Drift | Grass | 60 | 100 | 20 | DAMAGE |
| VERDANT_COIL | Verdant Coil | Grass | 75 | 100 | 10 | DMG_LOWER_FOE_SPD_100 |
| SPORE_PUFF | Spore Puff | Grass | — | 75 | 15 | STATUS_SLP |
| NUMB_POWDER | Numb Powder | Grass | — | 75 | 30 | STATUS_PAR |
| CINDER_SPIT | Cinder Spit | Fire | 40 | 100 | 25 | DMG_BURN_10 |
| FLARE_SNAP | Flare Snap | Fire | 65 | 100 | 15 | DAMAGE |
| PYRE_SPINES | Pyre Spines | Fire | 80 | 95 | 10 | DMG_BURN_10 |
| WATER_DART | Water Dart | Water | 40 | 100 | 25 | DAMAGE |
| FOAM_BURST | Foam Burst | Water | 50 | 100 | 15 | DMG_LOWER_FOE_SPD_100 |
| RIVER_SURGE | River Surge | Water | 80 | 95 | 10 | DAMAGE |
| MORNING_DEW | Morning Dew | Water | — | — | 10 | HEAL_50 |
| FROST_DEW | Frost Dew | Ice | 55 | 95 | 15 | DMG_FRZ_10 |
| BEAK_JAB | Beak Jab | Flying | 35 | 100 | 35 | DAMAGE |
| AIR_SWIRL | Air Swirl | Flying | 40 | 100 | 35 | DAMAGE |
| WING_SMACK | Wing Smack | Flying | 60 | 100 | 25 | DAMAGE |
| DIVE_BOMB | Dive Bomb | Flying | 60 | 100 | 20 | DMG_FLINCH_30 |
| ZEPHYR_LANCE | Zephyr Lance | Flying | 80 | 95 | 10 | DMG_HIGH_CRIT |
| SILK_SNARE | Silk Snare | Bug | 30 | 95 | 25 | DMG_LOWER_FOE_SPD_100 |
| CHITIN_BITE | Chitin Bite | Bug | 45 | 100 | 25 | DAMAGE |
| SHIMMER_DUST | Shimmer Dust | Bug | 60 | 100 | 15 | DMG_CONFUSE_20 |
| VENOM_BARB | Venom Barb | Poison | 15 | 100 | 35 | DMG_PSN_20 |
| BLIGHTSPORE | Blightspore | Poison | — | 75 | 20 | STATUS_PSN |
| NIGHT_NIP | Night Nip | Dark | 60 | 100 | 25 | DMG_FLINCH_30 |
| SHADOWSTEP | Shadowstep | Dark | 40 | 100 | 25 | DMG_PRIORITY_1 |
| GLOOM_CLAW | Gloom Claw | Dark | 70 | 100 | 15 | DAMAGE |
| STARTLE | Startle | Ghost | 30 | 100 | 25 | DMG_FLINCH_30 |
| CHILL_TOUCH | Chill Touch | Ghost | 30 | 100 | 30 | DMG_PAR_30 |
| BELL_TOLL | Bell Toll | Ghost | 60 | 95 | 15 | DMG_CONFUSE_20 |
| MIND_RIPPLE | Mind Ripple | Psychic | 50 | 100 | 25 | DMG_CONFUSE_20 |
| DREAM_MIST | Dream Mist | Psychic | — | 60 | 15 | STATUS_SLP |
| DAWN_LANCE | Dawn Lance | Psychic | 90 | 100 | 5 | DAMAGE |

Signature notes: VERDANT_COIL (VERDIL line), PYRE_SPINES (EMBERIT line),
RIVER_SURGE (RILLET line + water line), ZEPHYR_LANCE (ZEPHYRIL / Warden Aria's ace),
BELL_TOLL (TOLLGEIST), DAWN_LANCE (AMBERSTAG).

---

## C. TRAINERS

Defeat quotes are written as text boxes of 2 lines, max 18 chars per line.
Format: box = `"line1" / "line2"`. Max 2 boxes per quote.

### RIVAL_CORVIN_T2 — RIVAL CORVIN (Trail 2 ambush)
- party: depends on the player's starter. CORVIN always leads with the Kindra he stole
  from Larch's lab, then sends the starter that is strong against the player's:
  - player chose VERDIL  -> SHADEKIT lv 8, EMBERIT lv 9
  - player chose EMBERIT -> SHADEKIT lv 8, RILLET lv 9
  - player chose RILLET  -> SHADEKIT lv 8, VERDIL lv 9
- ai: smart-type-aware
- reward: 270G
- defeatQuote:
  - box1: "Tch. A fluke," / "nothing more."
  - box2: "Only the strong" / "deserve Kindra."

### SCOUT_BEN — SCOUT BEN (Trail 2)
- party: WRENLET lv 6, SCURRIL lv 7
- ai: random
- reward: 110G
- defeatQuote:
  - box1: "Whoa! You hit" / "like a landslide!"
  - box2: "Trail 2 is wilder" / "than it looks."

### FORAGER_MAE — FORAGER MAE (Trail 2)
- party: THREDLE lv 6, SPOOLEN lv 8
- ai: random
- reward: 120G
- defeatQuote:
  - box1: "Oof! Even my" / "mushrooms wilted."

### BELLRINGER_OTTO — BELLRINGER OTTO (Trail 2)
- party: DEWBELL lv 8
- ai: random
- reward: 160G
- defeatQuote:
  - box1: "The bells toll" / "for me today..."
  - box2: "Ring on, friend."

### HERBALIST_IVY — HERBALIST IVY (Trail 2)
- party: WISPETAL lv 9
- ai: random
- reward: 180G
- defeatQuote:
  - box1: "Hmm. No salve" / "mends a loss."
  - box2: "Take the lesson" / "as your tonic."

### GLIDER_FERN — GLIDER FERN (Loomspire Gym trainee)
- party: WRENLET lv 7, WRENLET lv 8
- ai: random
- reward: 130G
- defeatQuote:
  - box1: "My wings are" / "clipped! Go on."

### GLIDER_JUNO — GLIDER JUNO (Loomspire Gym trainee)
- party: HUSHOWL lv 9
- ai: random
- reward: 150G
- defeatQuote:
  - box1: "You ride the" / "wind better..."
  - box2: "ARIA awaits you."

### WARDEN_ARIA — WIND WARDEN ARIA (Loomspire Gym leader)
- party: WRENLET lv 9, GALEWREN lv 11, ZEPHYRIL lv 13
  (GALEWREN is pre-evolved by leader convention; ZEPHYRIL knows ZEPHYR_LANCE at 13)
- ai: smart-type-aware
- reward: ZEPHYR BADGE + 1300G
- defeatQuote:
  - box1: "The wind bows to" / "no one... yet it"
  - box2: "carries you. Take" / "the ZEPHYR BADGE."

---

## D. WILD LEVEL BANDS & ENCOUNTER TABLES

Rates per slot sum to 100. Time slots use the canonical windows
(MORNING 4:00-9:59, DAY 10:00-17:59, NIGHT 18:00-3:59).

### Trail 1 — levels 2-4
| time | encounters |
|---|---|
| MORNING | SCURRIL 30, WRENLET 30, THREDLE 20, DEWBELL 15, SPOOLEN 5 |
| DAY | SCURRIL 35, WRENLET 35, THREDLE 25, SPOOLEN 5 |
| NIGHT | SCURRIL 30, HUSHOWL 25, DUSKMOTH 25, THREDLE 20 |

### Bellmere shore (shore grass) — levels 4-7
| time | encounters |
|---|---|
| MORNING | PADDLET 45, DEWBELL 25, WRENLET 30 |
| DAY | PADDLET 50, WRENLET 25, SCURRIL 25 |
| NIGHT | PADDLET 40, HUSHOWL 30, DUSKMOTH 30 |

### Trail 2 — levels 4-7
| time | encounters |
|---|---|
| MORNING | WRENLET 29, SCURRIL 25, THREDLE 25, DEWBELL 20, ZEPHYRIL 1 (lv 7) |
| DAY | WRENLET 30, SCURRIL 29, THREDLE 25, SPOOLEN 15, ZEPHYRIL 1 (lv 7) |
| NIGHT | SCURRIL 29, HUSHOWL 25, DUSKMOTH 25, SHADEKIT 20, AMBERSTAG 1 (lv 7) |

### Wisteria Spire (interior) — levels 5-8, NIGHT only
| time | encounters |
|---|---|
| NIGHT | WISPETAL 45, TOLLGEIST 30, DUSKMOTH 15, HUSHOWL 10 |
| MORNING / DAY | no encounters (the Spire is quiet by daylight) |

The Spire's 2F teaser room (Tier 1) shares this table verbatim, at a gentler
20/256 rate — the dark is the hazard up there, not the wilds.

### Bellmere lake (surf, Tier 1) — levels 5-10
| time | encounters |
|---|---|
| ALL | PADDLET 84, TORTIDE 15, DEWBELL 1 |

Rolled per water step while riding (rate 15/256). Surf tables are period-less.

### Bellmere lake (rod, Tier 2) — levels 6-15
| time | encounters |
|---|---|
| ALL | PADDLET 65, TORTIDE 31, DEWBELL 4 |

One roll per hooked cast (bite 60/100, MECHANICS §10.4). Rod tables are
period-less like the surf. The rod reaches deeper and older than paddling —
TORTIDE rises from 15% to 31% — and the 1% slot is a fixed **lv 15 TORTIDE**:
the old angler's tall tale ("the tide turns when a sleeping TORTIDE rolls
over", STORY §7 bellmere4/5), made catchable.

Placement notes:
- DEWBELL is MORNING-only everywhere it appears in grass. One pinned exception:
  the Bellmere lake's period-less surf table carries its 1% slot at any hour —
  lake mist reads as first light — and the Tier-2 rod band joins it (4% slot,
  same mist, same lake). DUSKMOTH, HUSHOWL, SHADEKIT, WISPETAL,
  TOLLGEIST, and AMBERSTAG are NIGHT-only.
- AMBERSTAG: the whispered rumor — 1% NIGHT encounter on Trail 2 only, fixed lv 7,
  catchRate 3. One spawn per save; it flees if the battle ends without capture
  (it may be found again on later nights).
- ZEPHYRIL: ultra-rare 1% wild on Trail 2 (MORNING/DAY), fixed lv 7.
- Starters (VERDIL/EMBERIT/RILLET lines) never appear wild.

### Egg groups (Tier 2 breeding — MECHANICS §15)

Five flavor-derived groups on `Species.eggGroup`; whole evolution families
share one group (pinned by test), so the keeper-line base form never crosses
groups. AMBERSTAG has none — the legend does not breed.

| group | species (24) |
|---|---|
| **FIELD** | VERDIL/VERDRAKE, EMBERIT/CINDERAX, SCURRIL/THATCHRAT, SHADEKIT/GLOAMFANG |
| **SHORE** | RILLET/CASCOTT, PADDLET/TORTIDE |
| **SKY** | WRENLET/GALEWREN, HUSHOWL, ZEPHYRIL |
| **BROOD** | THREDLE/SPOOLEN/LACEWING/DUSKMOTH |
| **DRIFT** | DEWBELL/TOLLGEIST, WISPETAL |
| *(none)* | AMBERSTAG |

Census: field 8, shore 4, sky 4, brood 4, drift 3, none 1.

---

## E. CROSS-VALIDATION (performed before writing)

- All 46 move keys referenced by the 24 learnsets exist in Section B; all 46 moves in
  Section B are referenced by at least one learnset.
- All effect keys come from the approved vocabulary.
- Every species has a damaging move at level 1.
- Evolution targets (VERDRAKE, CINDERAX, CASCOTT, GALEWREN, THATCHRAT, SPOOLEN,
  LACEWING, DUSKMOTH, TORTIDE, GLOAMFANG, TOLLGEIST) all exist; starter evolutions
  are at levels 16/14/15. Tier 1 methods each have canon coverage: time-gated
  level (SPOOLEN), stone (DEWBELL + TOLL SHARD), bond (SHADEKIT), link (SPOOLEN +
  LINK CORD). Ordered lists put the flavored branch first (SPOOLEN's night moth,
  SHADEKIT's bonded dusk) so the plain rule stays the fallback.
- Trainer party species (SHADEKIT, EMBERIT, RILLET, VERDIL, WRENLET, SCURRIL, THREDLE,
  SPOOLEN, DEWBELL, WISPETAL, HUSHOWL, GALEWREN, ZEPHYRIL) all exist; ARIA's ZEPHYRIL
  (lv 13) has its signature ZEPHYR_LANCE; CORVIN's SHADEKIT (lv 8) knows POUNCE,
  SHADOWSTEP, NIGHT_NIP.
- All species keys <= 10 chars; all move display names <= 12 chars; all Kindex entries
  <= 110 chars; all defeat-quote lines <= 18 chars, <= 2 lines per box, <= 2 boxes.
- Stat totals: commons 195-262, uncommons 290-328, evolved 346-392, starters 310 ->
  408-415, ZEPHYRIL 400, AMBERSTAG 480. Encounter rates in every slot sum to 100.
- Tier 2: the rod band's slots sum to 100 (PADDLET 65 / TORTIDE 31 / DEWBELL 4)
  and use only lake species; its 1% TORTIDE L15 is required (the bellmere4/5
  tall tale). Egg groups cover 23 species (AMBERSTAG has none) and every
  evolution family shares exactly one group (tests/data.test.ts pins the
  census).
