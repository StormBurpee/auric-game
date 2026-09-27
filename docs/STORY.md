# AURIC — STORY & SYSTEM TEXT

The complete dialog script and system-string table for AURIC — "An Ambervale Story".
Engine programmers key every text box off the stable IDs below. ROSTER.md (Section C)
is the single source of truth for trainer defeat quotes; they are repeated here
verbatim, marked, so this file reads as a complete script.

---

## 0. CONVENTIONS

- A text box holds at most **2 lines of 18 characters**. Every box below is written as
  its exact rendered lines between pipes, padded to an 18-char interior:

  ```
  [story.intro.2]
  | Welcome to the     |
  | world of KINDRA!   |
  ```

- Keys are dot-separated and stable: `story.<scene>.<n>` for plot boxes,
  `story.npc.<town><n>` for ambient NPCs (with `.day` / `.night` time variants and
  `.1`/`.2` box numbers), `story.sign.<mapid><n>` for signs, `sys.*` for system text.
- Sign map ids (concatenated with the sign number, e.g. trail 1's second sign is
  `story.sign.trail12`): `dawnfern`, `trail1`, `bellmere`, `trail2`, `loomspire`.
- All proper names render UPPERCASE in-game. ASCII apostrophes and `...` only; no
  em-dashes (8x8 GB font).
- Day/night windows are canon: MORNING 4:00-9:59, DAY 10:00-17:59, NIGHT 18:00-3:59.
  `.day` variants are shown during MORNING and DAY; `.night` during NIGHT.

### Placeholders

Every line is validated at the placeholder's MAXIMUM expansion width. Lines whose
template text is longer than 18 chars still fit when expanded (budgets below).

| placeholder | expands to                              | max chars |
|---|---|---|
| `{PLAYER}`  | player's entered name (default STORM)   | 10 |
| `{RIVAL}`   | rival's name (default/hardcoded CORVIN) | 10 |
| `{KINDRA}`  | context creature display name/nickname  | 10 |
| `{KINDRA2}` | evolution target's display name         | 10 |
| `{MOVE}`    | move display name                       | 12 |
| `{ITEM}`    | item display name (CHARM, GILDED CHARM, AURIC SIGIL, TONIC, KINDEX, FIELD NOTES) | 12 |
| `{TRAINER}` | trainer class + name (longest: WIND WARDEN ARIA; RIVAL {RIVAL}) | 16 |
| `{STAT}`    | ATTACK, DEFENSE, SPCL.ATK, SPCL.DEF, SPEED, ACCURACY | 8 |
| `{LEVEL}`   | level number                            | 3 |
| `{EXP}`     | experience points gained                | 4 |
| `{AMOUNT}`  | Glints amount (max prize 1300)          | 4 |
| `{BADGE}`   | badge name (ZEPHYR BADGE)               | 12 |
| `{NAME}`    | a phone contact's bare name (BEN, MAE, OTTO, IVY, MOM, LARCH) | 10 |

---

## 1. INTRO — Prof. Larch's opening monologue (story.intro.*)

Trigger: new game, before the player's bedroom fade-in. Larch's portrait on a plain
backdrop, Gen-2 style. Box 8 opens the name-entry screen; box 9 plays after entry.

[story.intro.1]
| Hello! Glad you    |
| could make it.     |

[story.intro.2]
| Welcome to the     |
| world of KINDRA!   |

[story.intro.3]
| I am PROF. LARCH   |
| of DAWNFERN.       |

[story.intro.4]
| KINDRA live all    |
| around us... in    |

[story.intro.5]
| grass and river,   |
| wood and wind.     |

[story.intro.6]
| People and KINDRA  |
| live side by side. |

[story.intro.7]
| Me? I study the    |
| bond we share.     |

[story.intro.8]
| Now then... what   |
| is your name?      |

*(name entry screen — default STORM)*

[story.intro.9]
| {PLAYER}! What a   |
| fine name it is.   |

---

## 2. HOME — Mom's send-off (story.home.*)

Trigger: player walks downstairs on the first morning. Boxes 1-4 play once;
`story.home.after.1` is Mom's ambient line on every later visit.

[story.home.1]
| Oh, {PLAYER}!      |
| Up already?        |

[story.home.2]
| PROF. LARCH was    |
| asking for you.    |

[story.home.3]
| He's at the lab    |
| just up the road.  |

[story.home.4]
| Take your bag.     |
| And... be safe.    |

[story.home.after.1]
| Every journey      |
| comes home again.  |

Tier 2 — the CHARM GEAR ceremony (§12): inside the send-off, after box 4, Mom
hands over the Gear — `story.home.gear.1-3`, the levelup chime, then
`sys.item.get` with `{ITEM}` = CHARM GEAR, flag `charm_gear`. Saves that already
passed the send-off receive the same ceremony retroactively, just before
`story.home.after.1` — nobody is ever locked out.

[story.home.gear.1]
| Wait! I have       |
| something for you. |

[story.home.gear.2]
| Your very own      |
| CHARM GEAR!        |

[story.home.gear.3]
| Map, phone, notes. |
| Call me, dear!     |

---

## 3. LAB — Larch, the favor, the starters, the window (story.lab.*)

Trigger: first entry to Larch's lab. Boxes 1-8 play, then the player is free to
inspect the three pedestals. Each pedestal opens its `story.lab.pick.*` YES/NO
confirm; NO returns to the pedestals. YES continues at box 9.

[story.lab.1]
| {PLAYER}! Come     |
| in, come in!       |

[story.lab.2]
| I have a favor     |
| to ask of you.     |

[story.lab.3]
| My field notes     |
| must reach ELDER   |

[story.lab.4]
| ROWAN in BELLMERE  |
| TOWN, up TRAIL 1.  |

[story.lab.5]
| But wild KINDRA    |
| prowl the tall     |

[story.lab.6]
| grass on the way.  |
| Alone? Risky!      |

[story.lab.7]
| So! Choose one of  |
| these three.       |

[story.lab.8]
| Go on. Take a      |
| good, long look.   |

If the player tries to leave before choosing:

[story.lab.wait]
| Now, now! Choose   |
| a KINDRA first!    |

Pedestal confirms (YES/NO prompts):

[story.lab.pick.verdil]
| VERDIL, the leaf   |
| newt? A calm soul. |

[story.lab.pick.emberit]
| EMBERIT, the ember |
| shrew? Bold pick!  |

[story.lab.pick.rillet]
| RILLET, the river  |
| pup? A merry one!  |

After the choice (sys.item.get fires for FIELD NOTES before box 13; the CHARMS
hand-off is box 10):

[story.lab.9]
| It chose you too,  |
| you know.          |

[story.lab.10]
| Take these as      |
| well... 5 CHARMS!  |

[story.lab.11]
| Toss a CHARM to    |
| befriend a wild    |

[story.lab.12]
| KINDRA. Gently,    |
| mind you!          |

[story.lab.13]
| Now then! ELDER    |
| ROWAN awaits.      |

*(stage: a silhouette appears at the lab window — CORVIN. Two beats of unease,
then he is gone. He is not named until Trail 2.)*

[story.lab.14]
| ...? Someone is at |
| the window. Cold   |

[story.lab.15]
| eyes, watching...  |
| Then... gone.      |

---

## 4. ELDER ROWAN — Bellmere Town (story.rowan.*)

Trigger: speaking to Elder Rowan in his house with FIELD NOTES in the bag.
sys.item.get fires for the KINDEX between boxes 10 and 11.
`story.rowan.after.1` is his ambient line afterward.

[story.rowan.1]
| Hm? Notes from     |
| young LARCH?       |

[story.rowan.2]
| Ah... his hand is  |
| still dreadful.    |

[story.rowan.3]
| He writes of the   |
| old stories. Of    |

[story.rowan.4]
| AMBERSTAG, whose   |
| antlers carry the  |

[story.rowan.5]
| dawn... and of the |
| WISTERIA SPIRE,    |

[story.rowan.6]
| where petals that  |
| fell still drift.  |

[story.rowan.7]
| Old tales. But     |
| tales have roots.  |

[story.rowan.8]
| Now. LARCH asked   |
| me to give you     |

[story.rowan.9]
| this. A KINDEX!    |
| It records every   |

[story.rowan.10]
| KINDRA you meet.   |
| A book of bonds.   |

[story.rowan.11]
| Take TRAIL 2 west  |
| to LOOMSPIRE CITY. |

[story.rowan.12]
| WARDEN ARIA keeps  |
| the gym there.     |

[story.rowan.13]
| Earn her ZEPHYR    |
| BADGE, child.      |

[story.rowan.after.1]
| The SPIRE sings    |
| at night. Listen.  |

---

## 5. RIVAL — Corvin's ambush on Trail 2 (story.rival1.*)

Trainer key: `RIVAL_CORVIN_T2` (ROSTER §C). Trigger: line-of-sight ambush halfway
along Trail 2. Pre-battle boxes 1-3, then battle. On player win: defeat quote
(verbatim from ROSTER), then the post sneer, then he walks off-screen. On player
loss: victory quote, then standard whiteout.

[story.rival1.pre.1]
| ...You. The one    |
| from the lab.      |

[story.rival1.pre.2]
| I'm {RIVAL}.       |
| Remember it.       |

[story.rival1.pre.3]
| Weak trainers      |
| make KINDRA weak.  |

Defeat quote (player wins — verbatim from ROSTER §C):

[story.rival1.defeat.1]
| Tch. A fluke,      |
| nothing more.      |

[story.rival1.defeat.2]
| Only the strong    |
| deserve Kindra.    |

Victory quote (player loses):

[story.rival1.victory.1]
| Hmph. So that's    |
| the lab's pick.    |

Post-battle sneer (player won; Gloam Syndicate hint):

[story.rival1.post.1]
| Heh. The GLOAM     |
| SYNDICATE has      |

[story.rival1.post.2]
| plans. Big plans.  |
| You're not ready.  |

[story.rival1.post.3]
| Get stronger.      |
| Or stay small.     |

---

## 5b. TRAIL 2 TRAINERS (story.trainer.*)

Line-of-sight trainers. `.pre` plays on sight, defeat quotes are verbatim from
ROSTER §C, `.post` is their chat line after being beaten.

### SCOUT_BEN — SCOUT BEN

[story.trainer.ben.pre]
| Halt! Scouts       |
| battle on sight!   |

[story.trainer.ben.defeat.1]
| Whoa! You hit      |
| like a landslide!  |

[story.trainer.ben.defeat.2]
| Trail 2 is wilder  |
| than it looks.     |

[story.trainer.ben.post]
| I saw a ribbon of  |
| wind... a KINDRA?  |

### FORAGER_MAE — FORAGER MAE

[story.trainer.mae.pre]
| My mushrooms!      |
| Step carefully!    |

[story.trainer.mae.defeat.1]
| Oof! Even my       |
| mushrooms wilted.  |

[story.trainer.mae.post]
| Morning dew draws  |
| DEWBELL out.       |

### BELLRINGER_OTTO — BELLRINGER OTTO

[story.trainer.otto.pre]
| Each bell has its  |
| own voice. Hear!   |

[story.trainer.otto.defeat.1]
| The bells toll     |
| for me today...    |

[story.trainer.otto.defeat.2]
| Ring on, friend.   |

[story.trainer.otto.post]
| At midnight, a     |
| bell rings itself. |

### HERBALIST_IVY — HERBALIST IVY

[story.trainer.ivy.pre]
| Care for a tonic?  |
| After we battle!   |

[story.trainer.ivy.defeat.1]
| Hmm. No salve      |
| mends a loss.      |

[story.trainer.ivy.defeat.2]
| Take the lesson    |
| as your tonic.     |

[story.trainer.ivy.post]
| Wisteria petals    |
| remember falling.  |

---

## 6. LOOMSPIRE GYM (story.gym.*)

Street signpost is `story.sign.loomspire2`. `story.gym.sign` is the plaque just
inside the door. Trainees GLIDER_FERN and GLIDER_JUNO (ROSTER §C) guard the path
to ARIA. Badge award: `sys.badge.get` fires after `story.gym.aria.win.3`, then
`sys.money.win`. The post-badge boxes play when ARIA is spoken to again (sequel
hook: Larch has news).

[story.gym.sign]
| The wind favors    |
| the unburdened.    |

### GLIDER_FERN — GLIDER FERN

[story.gym.fern.pre]
| The wind lifts     |
| those who leap!    |

[story.gym.fern.defeat.1]  *(verbatim from ROSTER §C)*
| My wings are       |
| clipped! Go on.    |

[story.gym.fern.post]
| ARIA taught me     |
| to fall first.     |

### GLIDER_JUNO — GLIDER JUNO

[story.gym.juno.pre]
| Hush... hear the   |
| owl on the wind?   |

[story.gym.juno.defeat.1]  *(verbatim from ROSTER §C)*
| You ride the       |
| wind better...     |

[story.gym.juno.defeat.2]  *(verbatim from ROSTER §C)*
| ARIA awaits you.   |

[story.gym.juno.post]
| Fly steady. ARIA   |
| shows no mercy.    |

### WARDEN_ARIA — WIND WARDEN ARIA

[story.gym.aria.pre.1]
| Welcome. I am      |
| ARIA. Wind Warden. |

[story.gym.aria.pre.2]
| The wind owns no   |
| master. It only    |

[story.gym.aria.pre.3]
| carries the free.  |
| Show me you fly!   |

Defeat + ZEPHYR BADGE award (boxes 1-2 verbatim from ROSTER §C):

[story.gym.aria.win.1]
| The wind bows to   |
| no one... yet it   |

[story.gym.aria.win.2]
| carries you. Take  |
| the ZEPHYR BADGE.  |

[story.gym.aria.win.3]
| Wear it lightly,   |
| like a feather.    |

If the player loses:

[story.gym.aria.lose]
| The wind tests     |
| all. Rise again.   |

Post-badge (talk to ARIA again — sequel hook):

[story.gym.aria.post.1]
| Oh! Word came      |
| from PROF. LARCH.  |

[story.gym.aria.post.2]
| He has news for    |
| you. Safe winds!   |

---

## 7. AMBIENT NPCS (story.npc.*)

Keys are exactly `story.npc.<town><n>` plus `.day`/`.night` variants and box
numbers. Four NPCs have both day and night lines: dawnfern2, bellmere2,
loomspire1, loomspire4.

### Dawnfern Village

NPC dawnfern1 — a kid by the tall grass (explains tall grass):

[story.npc.dawnfern1.1]
| Wild KINDRA hide   |
| in tall grass!     |

[story.npc.dawnfern1.2]
| Walk in, and one   |
| might pounce!      |

NPC dawnfern2 — a villager by the trail gate (day/night):

[story.npc.dawnfern2.day]
| WRENLET sings at   |
| dawn on TRAIL 1.   |

[story.npc.dawnfern2.night]
| Hear that hush?    |
| HUSHOWL is awake.  |

NPC dawnfern3 — a neighbor near the lab:

[story.npc.dawnfern3.1]
| PROF. LARCH talks  |
| to KINDRA all day. |

[story.npc.dawnfern3.2]
| I think they       |
| understand him.    |

### Bellmere Town

NPC bellmere1 — THE ELDER on the bench (the heart of this project):

[story.npc.bellmere1.1]
| My first journey   |
| began with a gift  |

[story.npc.bellmere1.2]
| of gold... games   |
| like that stay in  |

[story.npc.bellmere1.3]
| your heart         |
| forever.           |

NPC bellmere2 — a night watcher by the shore grass (day/night; night-only Kindra):

[story.npc.bellmere2.day]
| Some KINDRA only   |
| wake at night.     |

[story.npc.bellmere2.night]
| Now's the hour!    |
| SHADEKIT prowls.   |

*(Tier 2: on Saturday daylight she points at the market vendor instead —
`npc_bellmere_market` picks night / market / day in that order.)*

[story.npc.bellmere2.market]
| Market day! See    |
| the lake vendor!   |

NPC bellmere3 — a kid on the ledge (explains ledge hopping):

[story.npc.bellmere3.1]
| Ledges! Hop down   |
| them with a jump!  |

[story.npc.bellmere3.2]
| But you can't      |
| climb back up!     |

NPC bellmere4 — an angler by the lake:

[story.npc.bellmere4.1]
| They say the tide  |
| turns when a       |

[story.npc.bellmere4.2]
| sleeping TORTIDE   |
| rolls over. True!  |

NPC bellmere5 — THE OLD ANGLER on the sand at (18,14), facing his lake (Tier 2;
he is the one who told the boy that tall tale, and the rod table's 1% TORTIDE
makes it true). Boxes 1-3 play once, ending in the OLD ROD (`sys.item.given`,
flag `old_rod_given`); `.after` is his only line ever after:

[story.npc.bellmere5.1]
| Heh. The boy still |
| tells my story?    |

[story.npc.bellmere5.2]
| Sixty years I have |
| fished this lake.  |

[story.npc.bellmere5.3]
| Take my OLD ROD.   |
| Patience, child.   |

[story.npc.bellmere5.after]
| The deep ones bite |
| for the patient.   |

### Loomspire City

NPC loomspire1 — a woman by the Spire path (day/night; the haunted Spire):

[story.npc.loomspire1.day]
| The WISTERIA       |
| SPIRE is lovely... |

[story.npc.loomspire1.night.1]
| Lights in the      |
| SPIRE again...     |

[story.npc.loomspire1.night.2]
| Petals drift       |
| with no wind.      |

NPC loomspire2 — a gym admirer outside the gym:

[story.npc.loomspire2.1]
| WARDEN ARIA reads  |
| the wind like a    |

[story.npc.loomspire2.2]
| letter from an     |
| old friend.        |

NPC loomspire3 — a kid outside the arcade:

[story.npc.loomspire3.1]
| The arcade got a   |
| STORMBOY COLOR!    |

[story.npc.loomspire3.2]
| Mom says I have    |
| to journey first.  |

NPC loomspire4 — a lamplighter on the main street (day/night):

[story.npc.loomspire4.day]
| LOOMSPIRE looms,   |
| doesn't it?        |

[story.npc.loomspire4.night]
| The lamplighters   |
| follow DUSKMOTH.   |

NPC loomspire5 — a nervous merchant (Gloam Syndicate hint):

[story.npc.loomspire5.1]
| Strangers in grey  |
| asked about the    |

[story.npc.loomspire5.2]
| SPIRE... then left |
| at twilight.       |

### Wisteria Spire

The watcher inside the Spire repeats Rowan's warning on purpose
(`story.rowan.after.1` — the old man taught him to listen). On the bell-toll
night (Tier 2, §13: Wednesday NIGHT) he hears it begin:

[story.npc.spire.toll]
| The SPIRE rings    |
| tonight! Listen!   |

---

## 8. SIGNS (story.sign.*)

One box each. Key = `story.sign.` + mapid + sign number.

[story.sign.dawnfern1]  *(town sign)*
| DAWNFERN VILLAGE   |
| Here journeys dawn |

[story.sign.dawnfern2]  *(outside Larch's lab)*
| DAWNFERN KINDRA    |
| LAB - PROF. LARCH  |

[story.sign.trail11]  *(trail marker, south end)*
| TRAIL 1            |
| North to BELLMERE  |

[story.sign.trail12]  *(by the first grass patch)*
| Tall grass ahead.  |
| Tread kindly.      |

[story.sign.bellmere1]  *(town sign)*
| BELLMERE TOWN      |
| The lake remembers |

[story.sign.bellmere2]  *(Haven sign)*
| BELLMERE HAVEN     |
| Rest your KINDRA   |

[story.sign.bellmere3]  *(Outfitter sign)*
| OUTFITTER          |
| Gear for the road  |

[story.sign.bellmere4]  *(by Rowan's door)*
| ELDER ROWAN'S      |
| HOUSE              |

[story.sign.trail21]  *(trail marker, east end)*
| TRAIL 2            |
| West to LOOMSPIRE  |

[story.sign.trail22]  *(by the ledge run)*
| Steep ledges.      |
| Hop with care!     |

[story.sign.loomspire1]  *(city sign)*
| LOOMSPIRE CITY     |
| Where wind weaves  |

[story.sign.loomspire2]  *(gym signpost)*
| LOOMSPIRE GYM      |
| Wind Warden ARIA   |

[story.sign.loomspire3]  *(outside the arcade)*
| STORMBOY COLOR     |
| - EST. 2026 -      |

[story.sign.loomspire4]  *(Haven sign)*
| LOOMSPIRE HAVEN    |
| Rest and be well   |

[story.sign.loomspire5]  *(Outfitter sign)*
| OUTFITTER          |
| CHARMS! TONICS!    |

[story.sign.loomspire6]  *(at the Wisteria Spire gate)*
| WISTERIA SPIRE     |
| Mind the petals.   |

---

## 9. HAVEN & OUTFITTER (story.haven.* / story.outfitter.*)

KEEPER LILY runs every Haven (canon: the same gentle face in each town). After the
greeting, `.what` is a REST / ARCHIVE / LEAVE menu that loops until LEAVE (B also
leaves) — heal and Archive in one visit, as many times as the player likes.
REST: the heal jingle plays during box 3, then box 4. ARCHIVE: `archive.1`, then
Larch's Archive screen, then `archive.2` on the way out. LEAVE: `.5` if she did
anything this visit, the `.no` box if she did nothing.

*(Tier 1 retired `story.haven.lily.2` — the old YES/NO heal prompt — in favor of
this loop.)*

[story.haven.lily.1]
| Welcome to the     |
| HAVEN, traveler!   |

[story.haven.lily.what]
| What can I do      |
| for you, dear?     |

[story.haven.lily.3]
| One moment...      |

[story.haven.lily.4]
| There! Your KINDRA |
| are fully rested!  |

[story.haven.archive.1]
| Of course! Every   |
| guest is family.   |

[story.haven.archive.2]
| They'll be rested  |
| when you return!   |

[story.haven.lily.5]
| Walk gently, and   |
| come back soon!    |

[story.haven.lily.no]
| Of course. Take    |
| your time, dear.   |

*(Tier 2: Lily's Saturday opener — the Haven's in-world market-day hint; the
greeting key swaps to `.market` on `MARKET_DAY`.)*

[story.haven.lily.market]
| Market day, dear!  |
| Do look outside.   |

Outfitter clerk (both towns; `.thanks` after any purchase or sale, `.bye` on exit):

[story.outfitter.clerk.1]
| Welcome to the     |
| OUTFITTER!         |

[story.outfitter.clerk.2]
| Buying? Selling?   |
| Take a look!       |

[story.outfitter.thanks]
| Thank you! Safe    |
| trails out there!  |

[story.outfitter.bye]
| Come again!        |

---

## 10. SYSTEM TEXT (sys.*)

### Battle open / send-out

[sys.battle.wild]
| A wild {KINDRA}    |
| appeared!          |

[sys.battle.trainer]
| {TRAINER}          |
| wants to battle!   |

[sys.battle.foesend]
| {TRAINER}          |
| sent {KINDRA}!     |

[sys.battle.go]
| Go! {KINDRA}!      |

[sys.battle.return]
| Come back,         |
| {KINDRA}!          |

### Moves and damage

[sys.battle.move]
| {KINDRA} used      |
| {MOVE}!            |

[sys.battle.crit]
| A critical hit!    |

[sys.battle.supereff]
| It's super         |
| effective!         |

[sys.battle.noteff]
| It's not very      |
| effective...       |

[sys.battle.immune]
| It doesn't affect  |
| {KINDRA}...        |

[sys.battle.miss]
| {KINDRA}'s         |
| attack missed!     |

### Fainting and outcomes

[sys.battle.faint]
| {KINDRA}           |
| fainted!           |

[sys.battle.faint.wild]
| Wild {KINDRA}      |
| fainted!           |

[sys.battle.faint.foe]
| Foe {KINDRA}       |
| fainted!           |

[sys.battle.victory]
| {PLAYER} beat      |
| {TRAINER}!         |

[sys.battle.lose.1]
| {PLAYER} is out    |
| of usable KINDRA!  |

[sys.battle.lose.2]
| {PLAYER}           |
| whited out!        |

### Experience and levels

[sys.exp.gain]
| {KINDRA} gained    |
| {EXP} EXP. points! |

[sys.exp.levelup]
| {KINDRA} grew to   |
| level {LEVEL}!     |

### Learning moves (full-moveset forget flow)

Flow: `learn.new` when a slot is free. Otherwise `learn.full.1-3` (YES/NO on 3),
YES opens move select, then `learn.forget.1-2` and `learn.new`. NO asks
`learn.stop` (YES/NO), YES ends with `learn.skip`.

[sys.learn.new]
| {KINDRA} learned   |
| {MOVE}!            |

[sys.learn.full.1]
| {KINDRA} wants     |
| to learn           |

[sys.learn.full.2]
| {MOVE}.            |
| But it already     |

[sys.learn.full.3]
| knows four moves!  |
| Forget a move?     |

[sys.learn.forget.1]
| 1, 2, and... poof! |

[sys.learn.forget.2]
| {KINDRA} forgot    |
| {MOVE}!            |

[sys.learn.stop]
| Stop learning      |
| {MOVE}?            |

[sys.learn.skip]
| {KINDRA} gave up   |
| on {MOVE}.         |

### Evolution

`evolve.stop` plays if the player cancels with B mid-animation.

[sys.evolve.start]
| What? {KINDRA}     |
| is evolving!       |

[sys.evolve.done]
| {KINDRA} evolved   |
| into {KINDRA2}!    |

[sys.evolve.stop]
| Huh? {KINDRA}      |
| stopped evolving!  |

### Capture

Charm shakes are sound/animation only (no text between throw and result).

[sys.catch.throw]
| {PLAYER} threw     |
| the {ITEM}!        |

[sys.catch.success]
| Gotcha! {KINDRA}   |
| was caught!        |

[sys.catch.party]
| {KINDRA} joined    |
| your party!        |

[sys.catch.archive]
| {KINDRA} went      |
| to the ARCHIVE.    |

[sys.catch.fail]
| Oh no! It broke    |
| free!              |

[sys.catch.trainer]
| You can't charm    |
| another's KINDRA!  |

### Running away

[sys.run.ok]
| Got away safely!   |

[sys.run.fail]
| Can't escape!      |

[sys.run.trainer]
| No! You can't run  |
| from this battle!  |

### Status — inflicted

[sys.status.psn]
| {KINDRA} was       |
| poisoned!          |

[sys.status.brn]
| {KINDRA} was       |
| burned!            |

[sys.status.par]
| {KINDRA} is        |
| paralyzed!         |

[sys.status.slp]
| {KINDRA} fell      |
| asleep!            |

[sys.status.frz]
| {KINDRA} was       |
| frozen solid!      |

[sys.status.cnf]
| {KINDRA} became    |
| confused!          |

### Status — ongoing / recovery

[sys.status.psn.hurt]
| {KINDRA} is hurt   |
| by poison!         |

[sys.status.brn.hurt]
| {KINDRA} is hurt   |
| by its burn!       |

[sys.status.par.skip]
| {KINDRA} can't     |
| move!              |

[sys.status.slp.idle]
| {KINDRA} is fast   |
| asleep!            |

[sys.status.slp.wake]
| {KINDRA}           |
| woke up!           |

[sys.status.frz.idle]
| {KINDRA} is        |
| frozen solid!      |

[sys.status.frz.thaw]
| {KINDRA}           |
| thawed out!        |

[sys.status.cnf.idle]
| {KINDRA} is        |
| confused!          |

[sys.status.cnf.hit]
| It hurt itself in  |
| its confusion!     |

[sys.status.cnf.end]
| {KINDRA} snapped   |
| out of confusion!  |

### Stat stages

`up2`/`down2` are the two-stage lines (RILE_UP, WIND_SPRINT).

[sys.stat.up]
| {KINDRA}'s         |
| {STAT} rose!       |

[sys.stat.up2]
| {KINDRA}'s         |
| {STAT} soared!     |

[sys.stat.down]
| {KINDRA}'s         |
| {STAT} fell!       |

[sys.stat.down2]
| {KINDRA}'s         |
| {STAT} plunged!    |

[sys.stat.max]
| It won't go any    |
| higher!            |

[sys.stat.min]
| It won't go any    |
| lower!             |

### Items

[sys.item.use]
| {PLAYER} used      |
| the {ITEM}!        |

[sys.item.heal]
| {KINDRA}'s HP      |
| was restored!      |

[sys.item.cantuse]
| This isn't the     |
| time for that!     |

[sys.item.noeffect]
| It would have no   |
| effect.            |

[sys.item.get]
| {PLAYER} got       |
| the {ITEM}!        |

### Shop

[sys.shop.nomoney]
| You don't have     |
| enough GLINTS.     |

### Saving

[sys.save.prompt]
| Would you like     |
| to save?           |

[sys.save.saving]
| Saving... don't    |
| turn off power!    |

[sys.save.done]
| {PLAYER} saved     |
| the game!          |

### Badges, money, Kindex

[sys.badge.get]
| {PLAYER} got the   |
| {BADGE}!           |

[sys.money.win]
| {PLAYER} got       |
| {AMOUNT}G for winning! |

[sys.money.lose]
| {PLAYER} dropped   |
| {AMOUNT}G in a panic! |

[sys.kindex.reg]
| {KINDRA}'s data    |
| joined the KINDEX! |

---

## 11. CREDITS — to be continued (story.credits.*)

Trigger: after the ZEPHYR BADGE award, on leaving the gym, the screen fades to the
credits roll. Six boxes over slow music, then back to play.

[story.credits.1]
| AURIC              |
| An Ambervale Story |

[story.credits.2]
| {PLAYER} earned    |
| the ZEPHYR BADGE.  |

[story.credits.3]
| But this tale has  |
| only just begun.   |

[story.credits.4]
| For everyone whose |
| first cartridge    |

[story.credits.5]
| felt like a whole  |
| world. Thank you.  |

[story.credits.6]
| TO BE CONTINUED... |

---

## 12. THE CHARM GEAR (story.phone.* / story.quest.* / story.rematch.*)

Tier 2. Mom's grant ceremony lives in §2 (`story.home.gear.1-3`). Key
conventions, all stable:

- **PHONE flavor pools** rotate on `clock.ts#dayStamp` — a different line each
  real day, save-free. Pools: `story.phone.<who>.flavor1..N` (N = 3 for MOM and
  LARCH, 1 for trainers — data/quests.ts FLAVOR_POOLS).
- **Trainer call beats**: `story.phone.<who>.offer` (a rematch is available;
  accepting arms `challenge_<key>`), `.armed` (called again while armed),
  `.spent` (the R1 ladder is exhausted).
- **Rematch defeat quotes**: `story.rematch.<who>.defeat` — the `defeatText` of
  the `<KEY>_R1` defs in data/trainers.ts.
- **JOURNAL quests**: `story.quest.<id>.<stage>` and `story.quest.<id>.done`
  (the epilogue). Ids and stage counts mirror data/quests.ts QUESTS exactly:
  `fieldnotes` 2, `coldeyes` 1, `zephyr` 2, `trail2` 1, `bonds` 3,
  `treasures` 2, `fullgear` 2, `oldfriends` 2.
- Engine key (sysStrings.ts, renderer-wrapped, not doc-formatted):
  `sys.gear.swap` — "Swap numbers with {NAME}?", the post-victory
  registration prompt.

### Phone — MOM and PROF. LARCH (flavor pools)

[story.phone.mom.flavor1]
| Eat well, sleep    |
| well, walk well!   |

[story.phone.mom.flavor2]
| The house is so    |
| quiet without you. |

[story.phone.mom.flavor3]
| Your KINDRA eat    |
| better than you!   |

[story.phone.larch.flavor1]
| Field notes,       |
| {PLAYER}! Notes!   |

[story.phone.larch.flavor2]
| A KINDEX page a    |
| day, I always say. |

[story.phone.larch.flavor3]
| ROWAN still mocks  |
| my handwriting.    |

### Phone — the Trail 2 contacts

[story.phone.ben.flavor1]
| Scouts watch the   |
| skies. All clear!  |

[story.phone.ben.offer]
| Up for a rematch?  |
| Come to TRAIL 2!   |

[story.phone.ben.armed]
| I'm warmed up and  |
| waiting for you!   |

[story.phone.ben.spent]
| You've taught me   |
| plenty already.    |

[story.phone.mae.flavor1]
| The mushrooms      |
| are thriving!      |

[story.phone.mae.offer]
| My bugs want a     |
| rematch! Come by!  |

[story.phone.mae.armed]
| The baskets can    |
| wait. Battle me!   |

[story.phone.mae.spent]
| No more battles.   |
| The moths approve. |

[story.phone.otto.flavor1]
| Every bell rang    |
| true this morning. |

[story.phone.otto.offer]
| One more bout?     |
| The bells insist.  |

[story.phone.otto.armed]
| DEWBELL is rung    |
| and ready. Come!   |

[story.phone.otto.spent]
| The bells still    |
| toll your victory. |

[story.phone.ivy.flavor1]
| Brewing a tonic.   |
| It... fizzes. Hm.  |

[story.phone.ivy.offer]
| A rematch would    |
| be good medicine.  |

[story.phone.ivy.armed]
| The salve is set.  |
| Now, the battle!   |

[story.phone.ivy.spent]
| Rest is the best   |
| tonic. Take mine.  |

### Rematch defeat quotes (in-battle, `<KEY>_R1` defs)

[story.rematch.ben.defeat]
| Stronger AND       |
| faster? Unfair!    |

[story.rematch.mae.defeat]
| Even LACEWING      |
| bows to that!      |

[story.rematch.otto.defeat]
| The bells toll     |
| for me. Again!     |

[story.rematch.ivy.defeat]
| My strongest brew, |
| outdone again.     |

### Journal quest pages

THE FIELD NOTES (`fieldnotes`):

[story.quest.fieldnotes.1]
| PROF. LARCH was    |
| asking for you.    |

[story.quest.fieldnotes.2]
| Take the notes to  |
| ELDER ROWAN.       |

[story.quest.fieldnotes.done]
| Delivered! And the |
| KINDEX is yours.   |

COLD EYES (`coldeyes`):

[story.quest.coldeyes.1]
| Cold eyes at the   |
| lab window. Whose? |

[story.quest.coldeyes.done]
| {RIVAL} of the     |
| GLOAM SYNDICATE... |

THE ZEPHYR TRIAL (`zephyr`):

[story.quest.zephyr.1]
| WARDEN ARIA keeps  |
| the LOOMSPIRE gym. |

[story.quest.zephyr.2]
| Beat the gliders,  |
| then ARIA herself. |

[story.quest.zephyr.done]
| The ZEPHYR BADGE   |
| is yours. Fly on!  |

CLEARING TRAIL 2 (`trail2`):

[story.quest.trail2.1]
| Four tamers wait   |
| on TRAIL 2.        |

[story.quest.trail2.done]
| TRAIL 2 cleared!   |
| Four for four.     |

BOOK OF BONDS (`bonds` — three stages: 3, 6, then 10 caught):

[story.quest.bonds.1]
| The KINDEX is      |
| nearly empty.      |

[story.quest.bonds.2]
| Charm wild KINDRA  |
| and fill the book. |

[story.quest.bonds.3]
| Ten bonds would    |
| make ROWAN proud.  |

[story.quest.bonds.done]
| A true book of     |
| bonds. Keep going! |

TRAIL TREASURES (`treasures`):

[story.quest.treasures.1]
| Treasures lie off  |
| the beaten trail.  |

[story.quest.treasures.2]
| Some need HEW or   |
| HEAVE. Look again. |

[story.quest.treasures.done]
| Every cranny       |
| checked. Bravo!    |

A FULL GEAR (`fullgear`):

[story.quest.fullgear.1]
| Swap numbers with  |
| tamers you beat.   |

[story.quest.fullgear.2]
| A few pages still  |
| blank. Find them.  |

[story.quest.fullgear.done]
| Every number       |
| saved. Popular!    |

OLD FRIENDS (`oldfriends`):

[story.quest.oldfriends.1]
| Call a friend.     |
| Offer a rematch.   |

[story.quest.oldfriends.2]
| Armed challenges   |
| wait on TRAIL 2.   |

[story.quest.oldfriends.done]
| Old friends, new   |
| battles. The best. |

---

## 13. DAY-OF-WEEK LIFE (story.market.* / story.gran.*)

Tier 2. The calendar registry is `data/weekly.ts`; weekly one-shots are
`weekly_<key>_<weekstamp>` flags with prune-on-claim (the save never silts up).
Day-aware lines living in other sections: `story.npc.bellmere2.market` (§7),
`story.npc.spire.toll` (§7), `story.haven.lily.market` (§9).

**The Saturday market** (`market_vendor`, Bellmere sand rim, `appears` Saturdays):
greeting, this week's pitch (`MARKET_OFFERS[week].pitch`), the offer with
explicit vars, BUY / PASS. One sale per week stamp; a short purse reuses
`sys.shop.nomoney`.

[story.market.vendor.1]
| Market day! Fresh  |
| from LOOMSPIRE!    |

[story.market.offer]
| {ITEM}!            |
| Just {AMOUNT}G today. |

[story.market.deal]
| Sold! Use it well, |
| friend.            |

[story.market.sold]
| Sold out! New      |
| stock next week.   |

[story.market.bye]
| Suit yourself!     |
| Back next week.    |

Pitch ring (one key per `MARKET_OFFERS` entry, in rotation order):

[story.market.pitch.charm]
| Gold leaf, half    |
| the OUTFITTER ask! |

[story.market.pitch.cinder]
| A CINDER BAND.     |
| Fire burns hotter! |

[story.market.pitch.dew]
| A DEW PEARL. The   |
| lake approves!     |

[story.market.pitch.moss]
| A MOSS LOCKET,     |
| mossier than most! |

[story.market.pitch.lumen]
| A LUMEN BERRY.     |
| Skip the hunting!  |

**The Sunday berry gran** (`berry_gran`, Trail 1 west flowers, Sunday mornings
only): one hold-berry per week from `GIFT_ROTATION`.

[story.gran.1]
| Sunday stroll! My  |
| berries came in.   |

[story.gran.2]
| Take one, dear.    |
| Grown with care.   |

[story.gran.again]
| One a week keeps   |
| the basket full.   |

---

## 14. FISHING — THE OLD ROD (sys.fish.*)

Tier 2. The angler's boxes live in §7 (bellmere5); the rod's system lines are
engine keys in sysStrings.ts (renderer-wrapped, not doc-formatted, keys LAW):

| key | line |
|---|---|
| `sys.fish.none` | Not even a nibble... |
| `sys.fish.bite` | A bite! |
| `sys.fish.away` | It slipped off the hook... |
| `sys.fish.bag`  | Cast it at the water's edge. |

The cast itself is wordless on purpose — splash, three dots, the '!' — fewer
boxes than 1999, same held breath. `sys.fish.bag` answers a bag USE of the rod;
casting is an A-press at the water's edge (MECHANICS §10.4).

---

## 15. THE DAWNFERN NURSERY (story.nursery.* / sys.egg.* / sys.hatch.*)

Tier 2. The keeper couple's cottage (WORLD §15); scripts in events/nursery.ts.
The old woman runs the desk (BOARD / RETRIEVE / LEAVE); her husband steps
outside while `nursery_egg` is set and hands the egg over (`sys.egg.got`, or
`sys.egg.full` if the party has no room).

[story.nursery.keeper.1]
| Welcome to the     |
| DAWNFERN NURSERY.  |

[story.nursery.keeper.what]
| Shall we mind a    |
| KINDRA for you?    |

The desk, boarding (the keeper-line rule is said out loud on the FIRST boarder
— `.board.keeper` — because slot one decides the egg's species):

[story.nursery.board.keeper]
| {KINDRA} will      |
| mind the clutch?   |

[story.nursery.board.took]
| {KINDRA} settles   |
| right in.          |

[story.nursery.board.full]
| Two boarders is    |
| all we can mind.   |

[story.nursery.board.last]
| And leave you all  |
| alone? No, dear.   |

The desk, retrieving:

[story.nursery.retrieve.none]
| No boarders of     |
| yours just now.    |

[story.nursery.retrieve.full]
| Your party is      |
| full, dear.        |

[story.nursery.back]
| {KINDRA} missed    |
| you, I think.      |

Her verdict on a full pair (the Gen-2 checker-man, minus the riddle):

[story.nursery.band.species]
| Those two are      |
| thick as thieves!  |

[story.nursery.band.group]
| They get along     |
| well enough.       |

[story.nursery.band.none]
| They keep to their |
| own corners...     |

[story.nursery.egg.hint]
| My husband is      |
| outside with news! |

[story.nursery.bye]
| Walk gently. We    |
| will be here.      |

The old man (inside while no egg waits, outside while one does):

[story.nursery.man.idle]
| My wife minds the  |
| desk. I mind eggs. |

[story.nursery.man.1]
| Your pair was      |
| minding an EGG!    |

Engine keys (sysStrings.ts, keys LAW): `sys.egg.got`, `sys.egg.full`, the four
single-line veiled tells by remaining steps — `sys.egg.far` (>1280),
`sys.egg.near` (>640), `sys.egg.soon` (>256), `sys.egg.now` — and the hatch
ceremony's `sys.hatch.oh` ("Oh?") and `sys.hatch.done`.

---

## 16. CROSS-VALIDATION

- Every line fits 18 chars at maximum placeholder expansion (budgets in §0,
  `{NAME}` included).
- Every box has at most 2 lines.
- 310 keyed boxes transcribed to data/strings.ts: 236 story.* + 74 sys.*
  (tests/strings.test.ts pins the exact counts).
- Species/trainer/move references match ROSTER.md keys exactly: VERDIL, EMBERIT,
  RILLET, WRENLET, HUSHOWL, SHADEKIT, DUSKMOTH, TORTIDE, DEWBELL, AMBERSTAG;
  trainers RIVAL_CORVIN_T2, SCOUT_BEN, FORAGER_MAE, BELLRINGER_OTTO,
  HERBALIST_IVY, GLIDER_FERN, GLIDER_JUNO, WARDEN_ARIA (plus the four `_R1`
  rematch tiers, whose defeat quotes are §12's story.rematch.* boxes).
- All ROSTER §C defeat quotes appear verbatim and are marked as such.
- NPC inventory: story.npc.dawnfern1..3, story.npc.bellmere1..5,
  story.npc.loomspire1..5, story.npc.spire.toll. Day/night variants: dawnfern2,
  bellmere2 (+ a Saturday `.market` variant), loomspire1, loomspire4.
- Sign inventory: dawnfern 1-2, trail1 1-2, bellmere 1-4, trail2 1-2,
  loomspire 1-6 (town, gym, arcade, Haven, Outfitter, Spire).
- Required verbatim lines present: "Gotcha! {KINDRA} was caught!",
  "Oh no! It broke free!", "your KINDRA are fully rested!", the Bellmere elder's
  "My first journey began with a gift of gold..." dedication, and the
  STORMBOY COLOR - EST. 2026 sign.
- NPC hint lines stay true to ROSTER §D encounter data: DEWBELL is morning-only
  (Mae), SHADEKIT/HUSHOWL/DUSKMOTH are night-only (bellmere2, dawnfern2,
  loomspire4), ZEPHYRIL rumor (Ben), TOLLGEIST midnight bell (Otto), WISPETAL
  petals (Ivy, loomspire1.night), AMBERSTAG and the Spire (Rowan), and the
  rod table's 1% lv-15 TORTIDE makes the angler's tall tale (bellmere4/5) true.
- Tier 2 key families: story.home.gear.* (§2), story.phone.* / story.quest.* /
  story.rematch.* (§12), story.market.* / story.gran.* (§13), sys.fish.* (§14),
  story.nursery.* / sys.egg.* / sys.hatch.* (§15), sys.gear.* (§12). Pitch keys
  are pinned by data/weekly.ts MARKET_OFFERS; quest ids by data/gear.ts.
