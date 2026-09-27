# AURIC — MECHANICS.md

**Authoritative battle & systems specification.** Classic handheld RPG arithmetic,
with this game's deviations explicitly listed in Appendix A. Engineers implement exactly what is
written here; the test vectors in §14 are the unit-test contract.

## Conventions

- `floor(x)` — truncate toward zero (all operands are non-negative, so this is integer truncation).
  Every truncation point is written explicitly. **Never** round; never use floating point for game
  state (floats may appear transiently inside a single expression only if the expression is proven
  exact; prefer pure integer math: `floor(a / b)` ⇒ integer division).
- `ceil(x)` — round up to the nearest integer.
- `rand(a..b)` — uniform random integer, inclusive of both endpoints. Every draw is independent.
- `clamp(x, lo, hi)` — `min(max(x, lo), hi)`.
- Implementations MUST use integers of at least 32 bits for all intermediates.
- "Genes" are our name for Gen 2 DVs. "Stat experience" (statExp) is Gen 2 Stat Exp (not EVs).
- Stats: `HP, ATK, DEF, SPA, SPD, SPE` (hit points, attack, defense, special attack, special
  defense, speed).

---

## 1. CREATURE STATS

### 1.1 Genes (DVs)

Each Kindra has four stored genes, each an integer **0–15**, rolled once at creation
(wild encounter, gift, or starter) and never changed — not by level-up, not by evolution:

```
GENE_ATK = rand(0..15)
GENE_DEF = rand(0..15)
GENE_SPE = rand(0..15)
GENE_SPC = rand(0..15)        // shared by SPA and SPD (Gen 2: single Special DV)
```

The HP gene is **derived** from the low bit of each of the four (Gen 2 rule):

```
GENE_HP = (GENE_ATK mod 2) * 8
        + (GENE_DEF mod 2) * 4
        + (GENE_SPE mod 2) * 2
        + (GENE_SPC mod 2) * 1
```

Example: genes ATK 7, DEF 6, SPE 13, SPC 4 → bits 1,0,1,0 → `GENE_HP = 8 + 0 + 2 + 0 = 10`.

### 1.2 Stat experience

Each Kindra has five statExp buckets: `SE_HP, SE_ATK, SE_DEF, SE_SPE, SE_SPC` (SPC bucket is shared
by SPA and SPD). Each bucket is an integer **0–65535**. **Every newly created Kindra (wild catch,
starter, gift) starts with all buckets at 0.** Gain rules are in §9.4.

The statExp contribution to a stat uses a ceiling square root:

```
ceilSqrt(n) = the smallest integer s such that s * s >= n     // ceilSqrt(0) = 0
seTerm      = floor(ceilSqrt(statExp) / 4)                    // max: floor(256/4) = 64
```

### 1.3 Stat formulas (Gen 2)

Level `L` is an integer **1–100**.

```
core(base, gene, statExp, L) = floor( ((base + gene) * 2 + floor(ceilSqrt(statExp) / 4)) * L / 100 )

maxHP = core(baseHP,  GENE_HP,  SE_HP,  L) + L + 10
ATK   = core(baseATK, GENE_ATK, SE_ATK, L) + 5
DEF   = core(baseDEF, GENE_DEF, SE_DEF, L) + 5
SPA   = core(baseSPA, GENE_SPC, SE_SPC, L) + 5
SPD   = core(baseSPD, GENE_SPC, SE_SPC, L) + 5
SPE   = core(baseSPE, GENE_SPE, SE_SPE, L) + 5
```

Order of operations inside `core`: compute `(base + gene) * 2`, add `seTerm`, multiply the whole
sum by `L`, then a single `floor( … / 100 )`.

Stats are recalculated from this formula at every level-up and on evolution (§13). When `maxHP`
increases, current HP increases by the same delta. There is no deferred/"box trick" recalculation —
recalc is immediate.

---

## 2. DAMAGE FORMULA

Gen 2 pipeline, **including the Item term** (×1.1 from a held type-boost item, §5.5) in its exact
Gen-2 slot. **Excluded by design:** badge boosts, weather, Triple-Kick/MoveMod terms (all treated
as ×1 and absent from the code). Gen 2's 8-bit overflow quirks (stat > 255 quartering, 997 damage
cap) are NOT replicated — use full integer math.

### 2.1 Physical/Special split BY TYPE (Gen 2 rule)

The move's **type** — not the move itself — decides which stats are used:

| Category | Types | Stats used |
|---|---|---|
| **Physical** | Normal, Fighting, Flying, Ground, Rock, Bug, Ghost, Poison, Steel | attacker `ATK` vs defender `DEF` |
| **Special**  | Fire, Water, Grass, Electric, Psychic, Ice, Dragon, Dark | attacker `SPA` vs defender `SPD` |

### 2.2 Critical hits

- Crit roll, made per damaging move use: crit iff `rand(0..255) < CRIT_LADDER[stage]`, on the
  Gen-2 ladder:

  ```
  CRIT_LADDER = [17, 32, 64, 85]                   // of 256: ≈6.64%, 1/8, 1/4, ≈33.2%
  stage = (2 if EFFECT.HIGH_CRIT else 0) + (1 if attacker holds a critBoost item (§5.5) else 0)
  ```

  - Plain move, empty hands: stage 0 → 17/256 (the Gen-2 base).
  - Held critBoost item alone: stage 1 → 32/256 — exactly one Gen-2 stage up (1/8).
  - `EFFECT.HIGH_CRIT` alone: stage 2 → 64/256 (1/4).
  - Both: stage 3 → 85/256. The stage is 0–3 by construction — the ladder's full span.
- A crit **doubles** the base damage (applied before the `+2`, see pipeline).
- **Gen 2 stage-ignore rule:** on a crit, all stat stage modifiers AND the burn Attack-halving are
  ignored (raw stats used) **unless the attacker's offensive stage is strictly greater than the
  defender's corresponding defensive stage**, in which case stages and burn apply as normal.
  Formally: `applyMods = (not isCrit) or (atkStage > defStage)`.

### 2.3 Effective attack and defense

```
// stage application — see §3
applyStage(stat, stage) = clamp( floor(stat * STAGE_NUM[stage] / 100), 1, 999 )

if move.type is Physical: A0 = attacker.ATK; D0 = defender.DEF
                          atkStage = attacker.stages.ATK; defStage = defender.stages.DEF
else:                     A0 = attacker.SPA; D0 = defender.SPD
                          atkStage = attacker.stages.SPA; defStage = defender.stages.SPD

applyMods = (not isCrit) or (atkStage > defStage)

if applyMods:
    A = applyStage(A0, atkStage)
    if attacker has BRN and move.type is Physical: A = max(1, floor(A / 2))
    D = applyStage(D0, defStage)
else:
    A = A0
    D = D0
```

### 2.4 Pipeline (exact order)

```
t    = floor(2 * L / 5) + 2                      // L = attacker's level
d    = floor( t * Power * A / D )                // ONE floor after the division by D
d    = floor( d / 50 )
if attacker holds typeBoost(move.type):          // §5.5 Item term — the exact Gen-2 slot:
    d = floor( d * 110 / 100 )                   // ×1.1, AFTER the /50, BEFORE the crit double
if isCrit: d = d * 2                             // crit BEFORE the +2
d    = d + 2

if STAB (move.type is one of attacker's types):
    d = floor(d * 3 / 2)                         // 1.5x, single truncation

for each defenderType in [type1, type2 if present]:   // §4 chart, applied in slot order
    e = CHART[move.type][defenderType]
    if e == 0:   damage = 0; STOP ("it doesn't affect…")    // checked before accuracy in practice, §11.5
    if e == 2:   d = d * 2
    if e == 0.5: d = floor(d / 2)

d = max(d, 1)                                    // halving can reach 0; restore floor of 1

if d > 1:
    R = rand(217..255)                           // uniform; rolled per damage application
    d = floor(d * R / 255)                       // Gen 2 skips the roll when d == 1

damage = max(d, 1)                               // never 0 unless type-immune
```

Damage applied to the target is `min(damage, target.currentHP)`.

---

## 3. STAT STAGES

Each battler has in-battle stages for `ATK, DEF, SPA, SPD, SPE, ACC, EVA`, all starting at 0,
clamped to **−6…+6**. Stage-raising/lowering effects that would exceed the clamp fail with a
"nothing happened" / "won't go higher/lower" message. Stages reset on switch-out and at battle end.

### 3.1 Main stats (ATK/DEF/SPA/SPD/SPE) — Gen 2 multipliers

```
effective = clamp( floor(stat * NUM / 100), 1, 999 )
```

| Stage | −6 | −5 | −4 | −3 | −2 | −1 | 0 | +1 | +2 | +3 | +4 | +5 | +6 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NUM | 25 | 28 | 33 | 40 | 50 | 66 | 100 | 150 | 200 | 250 | 300 | 350 | 400 |

### 3.2 Accuracy / Evasion — Gen 2 multipliers (separate table)

| Stage | −6 | −5 | −4 | −3 | −2 | −1 | 0 | +1 | +2 | +3 | +4 | +5 | +6 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ACC_NUM | 33 | 36 | 43 | 50 | 60 | 75 | 100 | 133 | 166 | 200 | 233 | 266 | 300 |

Usage in the accuracy check: attacker's ACC stage is looked up directly; defender's EVA stage is
looked up **negated** (EVA +1 on the defender uses the −1 column). See §7.

### 3.3 Status interaction order

Effective in-battle stat = raw stat → stage multiplier (§3.1) → status modifier:

```
effSPE = applyStage(SPE, stages.SPE);  if PAR: effSPE = max(1, floor(effSPE / 4))
effATK = applyStage(ATK, stages.ATK);  if BRN: effATK = max(1, floor(effATK / 2))   // physical only, §2.3
```

---

## 4. TYPE CHART — full Gen 2, 17 types

Rows = attacking move type. Columns = defending type. Entries: `0`, `0.5` (shown `½`), `1`, `2`.
Dual-type defenders: apply both entries sequentially (§2.4); products of 4, 2, 1, ½, ¼, 0 result.

| atk \\ def | NOR | FIG | FLY | POI | GRO | ROC | BUG | GHO | STE | FIR | WAT | GRA | ELE | PSY | ICE | DRA | DAR |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **NOR** | 1 | 1 | 1 | 1 | 1 | ½ | 1 | 0 | ½ | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| **FIG** | 2 | 1 | ½ | ½ | 1 | 2 | ½ | 0 | 2 | 1 | 1 | 1 | 1 | ½ | 2 | 1 | 2 |
| **FLY** | 1 | 2 | 1 | 1 | 1 | ½ | 2 | 1 | ½ | 1 | 1 | 2 | ½ | 1 | 1 | 1 | 1 |
| **POI** | 1 | 1 | 1 | ½ | ½ | ½ | 1 | ½ | 0 | 1 | 1 | 2 | 1 | 1 | 1 | 1 | 1 |
| **GRO** | 1 | 1 | 0 | 2 | 1 | 2 | ½ | 1 | 2 | 2 | 1 | ½ | 2 | 1 | 1 | 1 | 1 |
| **ROC** | 1 | ½ | 2 | 1 | ½ | 1 | 2 | 1 | ½ | 2 | 1 | 1 | 1 | 1 | 2 | 1 | 1 |
| **BUG** | 1 | ½ | ½ | ½ | 1 | 1 | 1 | ½ | ½ | ½ | 1 | 2 | 1 | 2 | 1 | 1 | 2 |
| **GHO** | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 2 | ½ | 1 | 1 | 1 | 1 | 2 | 1 | 1 | ½ |
| **STE** | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 1 | ½ | ½ | ½ | 1 | ½ | 1 | 2 | 1 | 1 |
| **FIR** | 1 | 1 | 1 | 1 | 1 | ½ | 2 | 1 | 2 | ½ | ½ | 2 | 1 | 1 | 2 | ½ | 1 |
| **WAT** | 1 | 1 | 1 | 1 | 2 | 2 | 1 | 1 | 1 | 2 | ½ | ½ | 1 | 1 | 1 | ½ | 1 |
| **GRA** | 1 | 1 | ½ | ½ | 2 | 2 | ½ | 1 | ½ | ½ | 2 | ½ | 1 | 1 | 1 | ½ | 1 |
| **ELE** | 1 | 1 | 2 | 1 | 0 | 1 | 1 | 1 | 1 | 1 | 2 | ½ | ½ | 1 | 1 | ½ | 1 |
| **PSY** | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 1 | ½ | 1 | 1 | 1 | 1 | ½ | 1 | 1 | 0 |
| **ICE** | 1 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | ½ | ½ | ½ | 2 | 1 | 1 | ½ | 2 | 1 |
| **DRA** | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | ½ | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 |
| **DAR** | 1 | ½ | 1 | 1 | 1 | 1 | 1 | 2 | ½ | 1 | 1 | 1 | 1 | 2 | 1 | 1 | ½ |

Gen 2 hallmarks preserved: Ghost→Steel ½, Dark→Steel ½, Bug→Poison ½, Poison→Bug 1, Ice→Fire ½,
Ghost→Psychic 2, Psychic→Dark 0, Poison→Steel 0.

Battle messages: product 4 or 2 → "It's super effective!"; ½ or ¼ → "It's not very effective…";
0 → "It doesn't affect <NAME>!".

---

## 5. STATUS CONDITIONS

Major statuses (`PAR, BRN, PSN, SLP, FRZ`) are **mutually exclusive** — a creature with one cannot
gain another. They **persist after battle** and are stored on the Kindra until healed (Haven, item).
Volatile statuses (confusion, flinch) clear on switch-out and at battle end and may coexist with a
major status. `TOX` (badly poisoned) is **deliberately omitted** from this slice.

Type-based immunities to infliction (any source — secondary chance or pure status move):
Fire-types cannot be burned; Ice-types cannot be frozen; Poison- and Steel-types cannot be poisoned.
A target that already has a major status cannot receive another one (the attempt simply fails;
damage from the move still applies).

| Status | Effect |
|---|---|
| **PAR** | Effective Speed `= max(1, floor(effSPE / 4))` (after stages, §3.3). Each time the creature attempts to act: `rand(0..99) < 25` → "fully paralyzed", action lost. |
| **BRN** | Effective Attack `= max(1, floor(effATK / 2))` for Physical-type moves (after stages; ignored on crits per §2.2). End of each turn: damage `max(1, floor(maxHP / 8))`. |
| **PSN** | End of each turn: damage `max(1, floor(maxHP / 8))`. |
| **SLP** | On infliction: `sleepCounter = rand(1..6)`. When the sleeper attempts to act: decrement counter first; if it is now 0 → "woke up!" and it **acts this same turn** (Gen 2 behavior); otherwise "fast asleep", action lost. Cannot act while asleep. |
| **FRZ** | Cannot act. When the frozen creature attempts to act: `rand(0..99) < 10` → thaws and acts this turn; otherwise action lost. Also thaws immediately when hit by a damaging Fire-type move. (Gen 2's natural thaw is ≈10% (25/256); we use a flat 10%.) |
| **Confusion** (volatile) | On infliction: `confusionCounter = rand(2..5)` (Gen 2: 2–5 attacking turns). When the confused creature attempts to act: decrement counter first; if now 0 → "snapped out of confusion!", acts normally. Otherwise: `rand(0..99) < 50` → hurts itself (below), action lost; else acts normally. |
| **Flinch** (volatile) | If inflicted on a target that has **not yet acted this turn**, its action this turn is lost ("flinched!"). Cleared at end of turn. Flinch from a slower attacker onto a target that already moved does nothing. |

**Confusion self-hit damage** (Gen 2: typeless 40-power physical against itself, no crit, no STAB,
no type effectiveness, **no random factor**):

```
A = applyStage(self.ATK, self.stages.ATK); if BRN: A = max(1, floor(A / 2))
D = applyStage(self.DEF, self.stages.DEF)
t = floor(2 * L / 5) + 2
d = floor( floor( floor(t * 40 * A / D) / 50 ) ) + 2        // deterministic; min 1 applies
selfDamage = max(d, 1)
```

End-of-turn status damage (PSN/BRN) is applied to each afflicted active battler in turn order; each
application is followed by a faint check (§11.7).

**Order of can-act checks** when a battler's move comes up (first failure ends its action):
1. Recharging (from `EFFECT.RECHARGE` last turn) → "must recharge", flag cleared.
2. SLP check. 3. FRZ check. 4. Flinch check. 5. Confusion check (may self-hit). 6. PAR full-paralysis check.

### 5.5 Held items

Each Kindra may hold one item (`heldItem`; absent = empty hands). Five battle effect classes:

| Effect | Battle behavior |
|---|---|
| `typeBoost(T)` | ×1.1 on the holder's own moves of type T — the §2.4 Item term (CINDER BAND fire, DEW PEARL water, MOSS LOCKET grass). **Silent**, like Gen 2's Charcoal class — no battle message. |
| `critBoost` | +1 stage on the §2.2 crit ladder (KEEN LENS). Silent. |
| `leftovers` | End-of-turn item phase (§11.7): restores `max(1, floor(maxHP/16))`, narrated every turn it heals, never consumed (AMBER CRUMB). Quiet at full HP. |
| `cureBerry(S)` | Consumed at the first berry check while the holder has status S (`'all'` = any major status): the status is cured (a cured SLP also resets the sleep counter), one message (LUMEN BERRY all, TINGLE BERRY PAR). |
| `hpBerry(N)` | Consumed at the first berry check at or below half HP (`hp * 2 <= maxHP`): restores `min(N, maxHP − hp)`, one message (PLUMP BERRY, N = 10). |

**Berry checks are state-based, not edge-based.** One `berrySweep` (check both active battlers'
state; fire and consume if a trigger holds) runs at:

- battle entry, switch-in, and the foe's send-in — a holder *arriving* statused or at half pops
  its berry immediately;
- after each completed move execution, both sides, before the faint check;
- after a confusion self-hit;
- in the §11.7 end-of-turn item phase, before leftovers.

A fainted holder never pops its berry. Because every status infliction is followed by a sweep
within the same move's resolution, a curable status **never survives into the holder's §5 can-act
gauntlet** — the gauntlet contains no berry logic, and no chip tick or full-paralysis roll ever
happens off a status the berry would have cured (timing deviation recorded in Appendix A #2).

Consumption deletes the held item — it does not return to the bag. Held items cannot be given or
swapped mid-battle (the bag refuses `hold`/`stone`/`link`/`key` items there, §11.2); GIVE/TAKE
live in the field bag and party screens. Wild Kindra may hold items (§10.2); a captured Kindra
keeps whatever it holds.

---

## 6. TURN ORDER

Within the move-execution phase, order is decided by:

1. **Priority bracket**, highest first: `+1` (quick moves, `EFFECT.PRIORITY_HI`),
   `0` (everything else), `−1` (lagging moves, `EFFECT.PRIORITY_LO`).
2. Within the same bracket: higher **effective Speed** first (`effSPE` per §3.3 — stages applied,
   then paralysis quartering).
3. Exact Speed tie: `rand(0..1)` — 50/50.

Non-move actions resolve before all moves, in this fixed order: flee attempts (§11.8) → switches
(if both sides switch, player first) → item/Charm use (if both, player first). A battler whose
chosen action already resolved (switched in, etc.) still takes its move only if it chose FIGHT.

---

## 7. ACCURACY CHECK

Move accuracy is authored as a percent (e.g. 90) and converted once to a /255 value:

```
acc255 = floor(percent * 255 / 100)        // 100% → 255, 95% → 242, 90% → 229, 85% → 216,
                                           // 80% → 204, 75% → 191, 70% → 178
```

Per use of any accuracy-checked move (all damaging moves and all pure-status moves):

```
m1        = ACC_NUM[ attacker.stages.ACC ]          // §3.2 table
m2        = ACC_NUM[ -defender.stages.EVA ]         // NEGATED stage looked up in same table
threshold = floor( floor(acc255 * m1 / 100) * m2 / 100 )
threshold = clamp(threshold, 1, 255)
hit iff rand(0..255) < threshold
```

Note the authentic Gen 2 quirk is preserved: a 100%-accuracy move at neutral stages has threshold
255 and misses 1/256 of the time. Miss → "attack missed!", no damage, no secondary effects, PP
still spent. Type immunity (§4) is checked **before** the accuracy roll (§11.5).

---

## 8. CAPTURE

Capture is allowed **only in wild battles** (§11.9). Throwing a Charm consumes the player's action.

### 8.1 Charm tiers

| Item | Modifier |
|---|---|
| CHARM | `rateMod = rate` (×1) |
| GILDED CHARM | `rateMod = min(floor(rate * 3 / 2), 255)` (×1.5, Great Ball analog) |
| AURIC SIGIL | **Guaranteed capture.** Skip all math; play 3 wobbles + click. (Master Ball analog) |

`rate` is the species' catch rate, an integer 1–255 (defined in the content spec; common early
species ≈ 190–255, rarer ≈ 45–90).

### 8.2 Modified catch value `a` (Gen 2 form)

```
statusBonus = 10 if target has SLP or FRZ, else 0       // Gen 2: PAR/PSN/BRN give +0 (faithful)
a = max( floor( (3 * maxHP - 2 * curHP) * rateMod / (3 * maxHP) ), 1 ) + statusBonus
a = min(a, 255)
```

(`maxHP`, `curHP` are the wild target's. Single floor over the whole quotient.)

### 8.3 Catch check (single roll, Gen 2)

```
caught iff rand(0..255) <= a            // P(catch) = (a + 1) / 256 ; a = 255 → always caught
```

### 8.4 Shake/wobble animation on failure (Gen 2 table)

The catch is decided by §8.3 alone; wobbles are determined afterwards. On failure, look up `b`:

| `a` | 0–1 | 2 | 3 | 4 | 5 | 6–7 | 8–10 | 11–15 | 16–20 | 21–30 | 31–40 | 41–50 | 51–60 | 61–80 | 81–100 | 101–120 | 121–140 | 141–160 | 161–180 | 181–200 | 201–220 | 221–240 | 241–254 | 255 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `b` | 63 | 75 | 84 | 90 | 95 | 103 | 113 | 126 | 134 | 149 | 160 | 169 | 177 | 191 | 201 | 211 | 220 | 227 | 234 | 240 | 246 | 251 | 253 | 255 |

Perform up to 3 shake checks, **stopping at the first failure**; each check succeeds iff
`rand(0..255) < b`. The number of successes (0–3) is the number of wobbles shown before the Kindra
breaks free. On a successful capture, always show 3 wobbles + click. After a failed capture the
wild Kindra takes its turn normally.

A captured Kindra keeps its current HP, status, level, genes; statExp starts at whatever it has
(i.e. 0 — wild Kindra never accumulate statExp). No experience is awarded for capturing.

---

## 9. EXPERIENCE

### 9.1 Gain on fainting an opposing Kindra

```
gain = floor(BaseExp * faintedLevel / 7)
if trainer battle: gain = floor(gain * 3 / 2)        // ×1.5, applied AFTER the first floor
```

`BaseExp` is per-species (content spec). **Deviation (simplification):** only the player's active
battler at the moment of the faint gains experience and statExp — no participation split, no
Exp-Share device. A fainted active battler gains nothing.

### 9.2 Growth curves

Each species uses one of four curves. `EXP(L)` = total experience required to BE level `L`.
A Kindra is at level `L` = the largest `L ≤ 100` with `EXP(L) <= totalExp`. Experience gains are
capped so `totalExp` never exceeds `EXP(100)`.

```
Fast:        EXP(L) = floor(4 * L^3 / 5)
Medium-Fast: EXP(L) = L^3
Medium-Slow: EXP(L) = max(0, floor(6 * L^3 / 5) - 15 * L^2 + 100 * L - 140)
Slow:        EXP(L) = floor(5 * L^3 / 4)
```

The `max(0, …)` clamp on Medium-Slow guards the negative value at L1 (Gen 1/2 underflow glitch —
not replicated). EXP(100): Fast 800000, Medium-Fast 1000000, Medium-Slow 1059860, Slow 1250000.

A newly created Kindra (wild, starter, gift) at level `L` has its `totalExp` initialized to
`EXP(L)` for its species' curve.

### 9.3 Lookup table, levels 1–20 (exact values; unit-test these)

| L | Fast | Medium-Fast | Medium-Slow | Slow |
|---|---|---|---|---|
| 1 | 0 | 1 | 0 | 1 |
| 2 | 6 | 8 | 9 | 10 |
| 3 | 21 | 27 | 57 | 33 |
| 4 | 51 | 64 | 96 | 80 |
| 5 | 100 | 125 | 135 | 156 |
| 6 | 172 | 216 | 179 | 270 |
| 7 | 274 | 343 | 236 | 428 |
| 8 | 409 | 512 | 314 | 640 |
| 9 | 583 | 729 | 419 | 911 |
| 10 | 800 | 1000 | 560 | 1250 |
| 11 | 1064 | 1331 | 742 | 1663 |
| 12 | 1382 | 1728 | 973 | 2160 |
| 13 | 1757 | 2197 | 1261 | 2746 |
| 14 | 2195 | 2744 | 1612 | 3430 |
| 15 | 2700 | 3375 | 2035 | 4218 |
| 16 | 3276 | 4096 | 2535 | 5120 |
| 17 | 3930 | 4913 | 3120 | 6141 |
| 18 | 4665 | 5832 | 3798 | 7290 |
| 19 | 5487 | 6859 | 4575 | 8573 |
| 20 | 6400 | 8000 | 5460 | 10000 |

### 9.4 Stat experience gain

When the active battler earns experience from a faint, each of its five statExp buckets also gains
the defeated **species'** base stat, capped at 65535:

```
SE_HP  += baseHP;  SE_ATK += baseATK;  SE_DEF += baseDEF
SE_SPE += baseSPE; SE_SPC += baseSPA            // SPC bucket gains the defeated species' base SPA
(each bucket: min(bucket, 65535))
```

### 9.5 Level-up processing

After adding experience (mid-battle, immediately on faint):

```
while level < 100 and totalExp >= EXP(level + 1):
    level += 1
    recalc all six stats (§1.3); currentHP += (newMaxHP - oldMaxHP)
    check level-up move learning (content spec; if 4 moves known, prompt replace/skip)
    if species evolves at a level <= new level: queue evolution check for after the battle (§13)
```

---

## 10. WILD ENCOUNTERS

### 10.1 Per-step roll

Each step the player takes onto an encounter tile (tall grass; later: cave floors, surf water):

```
encounter iff rand(0..255) < mapRate
```

Recommended `mapRate` per map (tuned to Gen 2 feel — roughly one encounter per 10 steps in grass):

| Area | mapRate | ≈ chance/step |
|---|---|---|
| TRAIL 1 — tall grass | 25 | 9.8% |
| TRAIL 2 — tall grass | 25 | 9.8% |
| Dense/flowered grass patches (either trail) | 30 | 11.7% |
| WISTERIA SPIRE interior (night only) | 15 | 5.9% |

No encounters on plain ground, paths, or in towns.

### 10.2 Encounter slot table (Gen 2 percentages)

Each map has, **per time period**, a 7-slot table. On encounter, pick the slot:

```
r = rand(0..99)
slot = 1 if r < 30        // 30%
     | 2 if r < 60        // 30%
     | 3 if r < 80        // 20%
     | 4 if r < 90        // 10%
     | 5 if r < 95        //  5%
     | 6 if r < 99        //  4%
     | 7 otherwise        //  1%
```

Each slot specifies a species and a level (or `rand(lo..hi)` level range — content spec). The wild
Kindra's genes are rolled per §1.1, statExp all 0, full HP, no status.

**Wild held items.** If (and only if) the rolled species defines held-item slots
(`Species.heldItems`, authored as cumulative Gen-2 bands — e.g. `[{common, 23}, {rare, 2}]`),
one extra draw follows the wild Kindra's creation:

```
r = rand(0..99)
held = common if r < 23        // 23%
     | rare   if r < 25        //  2%
     | none   otherwise        // 75%
```

Species without `heldItems` make **no** draw at all — the rng stream stays replay-stable for
maps whose tables carry no held species. Trainer parties set helds per `TrainerDef.party[].held`
(authored data, no roll). A captured wild keeps its held item (§5.5).

### 10.3 Time-of-day switching

Real-time clock periods (also drive the screen palette):

| Period | Hours |
|---|---|
| MORNING | 04:00–09:59 |
| DAY | 10:00–17:59 |
| NIGHT | 18:00–03:59 |

Each map defines three slot tables (MORNING/DAY/NIGHT). The table is selected by the clock **at the
moment the encounter roll succeeds**. Tables may share entries; night tables should skew toward
nocturnal species (content spec).

### 10.4 Fishing (Tier 2)

Casting is an overworld act — an A-press from land facing WATER with a rod in the bag — never a
bag USE (`sys.fish.bag` answers the bag). A cast is an **action, not a step**, so the bite is a
flat percent, not /256:

```
bite iff rand(0..99) < fishingRate        // MapDef.fishingRate, default 60
```

- One period-less 7-slot `fishingEncounters` table per map, the §10.2 slot scheme exactly
  (30/30/20/10/5/4/1). A hooked cast rolls slot → level → birth → held bands, grass cadence.
- **No table (or no able party member) = NO draw.** The rng stream stays replay-stable on maps
  without rods in mind — the same rule wild held-items follow (§10.2). Eggs are not able members.
- The suspense is fixed: three dots at 24 ticks each (never rng-flavored — seed-replay
  discipline), then on a bite a 45-tick A-press window (~0.75 s; Gen 2 gave ~30 frames — ours is
  generous for kids). Miss the window and the catch "slipped off the hook"; no battle, no extra
  draws beyond the one bite roll and the encounter rolls already spent on the hook.
- One rod ships (the OLD ROD, the Bellmere angler's gift, flag `old_rod_given`); the schema
  leaves room for tiers without committing to them.

### 10.5 The week (Tier 2)

`clock.ts` reads the player's real calendar: `dayOfWeek()` (JS `Date` order, 0 = Sunday) and
`dayStamp()` (Monday-start week index computed from local date parts through `Date.UTC`, so DST
can never shear a week). F2 cycles a debug day override, mirroring F1's period override.

- **Schedules** are pure data: `NpcDef.appears { days?, periods? }`, AND-ed with the flag gates
  and re-checked every frame. The Saturday market vendor and the Sunday-morning berry gran ride
  this seam; `data/weekly.ts` is the one registry of what each week holds.
- **Weekly one-shots** are flags `weekly_<key>_<weekstamp>` with prune-on-claim: claiming deletes
  every stale stamp under the same key, so the save never accumulates a flag landfill.
- **The bell-toll**: one weeknight (Wednesday NIGHT) the Wisteria Spire's encounter rate
  multiplies by 2, clamped to 255. The boost applies to the **grass/cave per-step roll only**
  (`rollEncounter`) — deliberately single-seam; no boosted map has water, and the rng draw count
  and order are unchanged (seed-replay discipline).
- **Clock trust**: like the Gen-2 battery clock, the schedule follows the system clock. Setting
  the date back re-enables weekly claims (prune-on-claim deletes the newer stamp). Named and
  accepted — AURIC builds no anti-cheat for a single-player web GBC.

---

## 11. BATTLE FLOW

State machine for one battle. Two kinds: WILD (1 wild Kindra) and TRAINER (opponent has a party).

1. **INTRO.** "A wild <NAME> appeared!" / "<TRAINER> sent out <NAME>!". Player's first
   non-fainted party member is sent out. All stages 0, volatiles clear.
2. **COMMAND PHASE.** Player picks: FIGHT (choose move with PP > 0), PACK (item — includes Charms),
   KINDRA (switch), or RUN. If every known move has 0 PP, FIGHT forces STRUGGLE (§11.6). Hold
   items, stones, cords and key items are refused mid-battle (no turn lost; GIVE lives in the
   field bag, §5.5). The opponent AI picks simultaneously (wild: uniform random among moves with
   PP > 0; trainer AI: separate doc).
3. **ACTION RESOLUTION ORDER.** Flee attempt (§11.8) → switches → items/Charms → moves by §6.
   Selecting RUN in a trainer battle prints "Can't flee a trainer battle!" and returns to the
   command phase without consuming the turn.
4. **MOVE EXECUTION** (for each battler in order, if it still stands and chose FIGHT):
   a. Can-act gauntlet (§5 order: recharge, SLP, FRZ, flinch, confusion, PAR). Failure ends the action.
   b. Announce "<NAME> used <MOVE>!", deduct 1 PP.
   c. **Type immunity check** (damaging moves and typed pure-status moves): if the chart product
      vs the target is 0 → "It doesn't affect <NAME>!", action ends.
   d. **Accuracy check** (§7). Miss → action ends.
   e. Damaging moves: crit roll (§2.2), damage pipeline (§2.4), apply damage, print crit /
      effectiveness messages. Multi-hit moves repeat per §12 (stop if target faints).
   f. Effects: secondary chances, stat stage changes, status infliction, drain/recoil/heal per §12.
      Secondary effects on the target are skipped if it fainted from the hit.
   g. **Faint check** after each battler's complete action (both sides — recoil/self-hit can faint
      the user). A fainted battler's queued action is cancelled.
5. **FAINT HANDLING.** Opposing Kindra faints → award exp + statExp (§9) to the player's active
   battler, process level-ups. Trainer sends the next party member (no turn cost); wild battle →
   VICTORY. Player's Kindra faints → player must send a replacement (no turn cost); if none remain,
   the player **whites out**: warp to last Haven, party healed, lose `floor(glints / 2)` (Gen 2
   half-money rule, applied to carried Glints).
6. **STRUGGLE.** Normal-type Physical, power 50, accuracy 100 (acc255 = 255), no PP cost; user
   takes recoil `max(1, floor(damageDealt / 4))`. Subject to the Ghost immunity like any Normal move.
7. **END-OF-TURN PHASE.** In turn order: PSN/BRN damage (§5), faint checks (white-out / next
   opponent rules as above). Then the **item phase**, in the same speed order, for each standing
   battler: berry check (§5.5) first, then leftovers — `max(1, floor(maxHP/16))`, only below max
   HP, narrated every turn it heals. Chip strictly precedes the item phase: poison can faint a
   holder before its berry or crumb saves it (the Gen-2 cruelty stands). Flinch flags clear.
   Then back to COMMAND PHASE.
8. **FLEEING (wild battles only, player only — wild Kindra never flee).** Uses the Gen 2 escape
   formula. `A` = player's active battler's current effective Speed, `B` = wild Kindra's current
   effective Speed, `C` = number of flee attempts this battle including this one:

   ```
   if floor(B / 4) == 0: escape succeeds
   F = floor(A * 32 / floor(B / 4)) + 30 * C
   if F > 255: escape succeeds
   else: escape iff rand(0..255) < F
   ```

   Success → "Got away safely!", battle ends. Failure → "Can't escape!", the player's action is
   consumed; the wild Kindra acts.
9. **CAPTURE (wild battles only).** Throwing a Charm consumes the player's action; resolve per §8.
   Success ends the battle immediately (no exp). In trainer battles a thrown Charm is rejected:
   "You can't charm another's Kindra!" — item not consumed, returns to the command phase.
10. **END.** On battle end: volatile statuses and stages clear; major statuses, HP, and PP persist
    on the party.

---

## 12. MOVE EFFECT VOCABULARY

Every move references exactly one effect key. Damaging keys run the §2 pipeline; the table defines
what else happens. Secondary-chance rolls are `rand(0..99) < pct`, rolled only if the move dealt
damage and the target survives, and respect §5 immunities/exclusivity. The full ~40-move list with
power/type/accuracy/PP lives in the content spec.

| Key | Semantics |
|---|---|
| `EFFECT.PLAIN` | Damage only. |
| `EFFECT.BRN_10` / `EFFECT.BRN_30` | Damage; 10% / 30% chance to burn target. |
| `EFFECT.PAR_10` / `EFFECT.PAR_30` | Damage; 10% / 30% chance to paralyze target. |
| `EFFECT.PSN_20` / `EFFECT.PSN_30` | Damage; 20% / 30% chance to poison target. |
| `EFFECT.FRZ_10` | Damage; 10% chance to freeze target. |
| `EFFECT.FLINCH_10` / `EFFECT.FLINCH_30` | Damage; 10% / 30% chance target flinches (§5). |
| `EFFECT.CNF_10` | Damage; 10% chance to confuse target. |
| `EFFECT.SLP_STATUS` | No damage; puts target to sleep (accuracy-checked; fails vs existing major status). |
| `EFFECT.PAR_STATUS` | No damage; paralyzes target (accuracy-checked; fails vs type immunity to the move's type, e.g. an Electric-type paralyzing move fails vs Ground). |
| `EFFECT.PSN_STATUS` | No damage; poisons target (accuracy-checked; §5 immunities). |
| `EFFECT.CNF_STATUS` | No damage; confuses target (accuracy-checked; fails if already confused). |
| `EFFECT.RAISE_<STAT>_<N>` | No damage; raises user's stat by N stages. Keys used: `RAISE_ATK_1`, `RAISE_DEF_1`, `RAISE_DEF_2`, `RAISE_SPA_1`, `RAISE_SPE_2`, `RAISE_EVA_1`. Not accuracy-checked (self-target). |
| `EFFECT.LOWER_<STAT>_<N>` | No damage; lowers target's stat by N stages (accuracy-checked). Keys used: `LOWER_ATK_1`, `LOWER_DEF_1`, `LOWER_DEF_2`, `LOWER_SPE_1`, `LOWER_ACC_1`. |
| `EFFECT.LOWER_<STAT>_1_<PCT>` | Damage; PCT% chance to lower target's stat 1 stage. Keys used: `LOWER_DEF_1_20`, `LOWER_SPE_1_30`, `LOWER_SPD_1_20`. |
| `EFFECT.HIGH_CRIT` | Damage; crit threshold 64/256 (§2.2). |
| `EFFECT.PRIORITY_HI` | Damage; priority +1 (§6). |
| `EFFECT.PRIORITY_LO` | Damage; priority −1 (§6). |
| `EFFECT.MULTI_HIT` | Damage 2–5 times: `r = rand(0..7)`; r 0–2 → 2 hits, 3–5 → 3 hits, 6 → 4 hits, 7 → 5 hits (37.5/37.5/12.5/12.5%). One accuracy check for the whole move; damage (incl. crit and random factor) computed independently per hit; stop early if target faints. Report "Hit N time(s)!". |
| `EFFECT.DRAIN_50` | Damage; user heals `max(1, floor(damageDealt / 2))`, capped at maxHP. |
| `EFFECT.RECOIL_25` | Damage; user takes `max(1, floor(damageDealt / 4))` recoil (can faint the user). |
| `EFFECT.HEAL_50` | No damage; user restores `floor(maxHP / 2)` HP, capped at maxHP. Fails at full HP. |
| `EFFECT.RECHARGE` | Damage; if any damage was dealt, the user must recharge next turn (§5 gauntlet step 1). |

Stat enum for the grammar: `ATK, DEF, SPA, SPD, SPE, ACC, EVA`. Adding a new key requires updating
this table; engines should treat unknown keys as a build error.

---

## 13. EVOLUTION

- Trigger: species-defined **level threshold** (content spec). Only level-based evolution exists in
  this slice (no stones/trading/friendship).
- Checked **after the battle ends** (never mid-battle), once per Kindra that reached or passed its
  threshold level during that battle. Also checked after out-of-battle level gains if any exist.
- Sequence: "What? <NAME> is evolving!" → animation → player may press **B during the animation to
  cancel** ("…it stopped evolving!"). A cancelled evolution is re-attempted after every subsequent
  level-up battle while level ≥ threshold.
- On evolution: species id changes; base stats become the evolved form's; **genes and statExp are
  unchanged**; level and totalExp are unchanged; nickname (if any) is kept. All six stats are
  recalculated per §1.3 and `currentHP += (newMaxHP - oldMaxHP)`. Check the evolved form's learnset
  for moves learned at the current level.
- Stat recalculation also happens at every level-up (§9.5) — evolution and level-up use the same
  recalc routine.

---

## 14. TEST VECTORS

These are the unit-test contract. Every intermediate shown. RNG values are pinned inputs.

### T1 — Stat calc: HP

Inputs: baseHP 45, GENE_HP 7, SE_HP 0, level 5.
```
seTerm = floor(ceilSqrt(0) / 4) = floor(0 / 4) = 0
inner  = (45 + 7) * 2 + 0 = 104
core   = floor(104 * 5 / 100) = floor(520 / 100) = 5
maxHP  = 5 + 5 + 10 = 20                                   ► expect 20
```

### T2 — Stat calc: non-HP (Attack)

Inputs: baseATK 60, GENE_ATK 12, SE_ATK 5000, level 50.
```
ceilSqrt(5000) = 71        (70*70 = 4900 < 5000 <= 71*71 = 5041)
seTerm = floor(71 / 4) = 17
inner  = (60 + 12) * 2 + 17 = 144 + 17 = 161
core   = floor(161 * 50 / 100) = floor(8050 / 100) = 80
ATK    = 80 + 5 = 85                                       ► expect 85
```

### T3 — Damage: plain hit, min/max random bounds

Attacker L10, move Power 40 (no STAB, neutral), effective A 20, D 15, no crit, all stages 0.
```
t = floor(2*10/5) + 2 = 4 + 2 = 6
d = floor(6 * 40 * 20 / 15) = floor(4800 / 15) = 320
d = floor(320 / 50) = 6
d = 6 + 2 = 8                       (no crit, no STAB, type x1)
R = 217: floor(8 * 217 / 255) = floor(1736 / 255) = 6      ► min expect 6
R = 255: floor(8 * 255 / 255) = 8                          ► max expect 8
```

### T4 — Damage: STAB + super-effective (x2), pinned roll

Attacker L25, Power 65, effective A 49, D 40, STAB, one defender type at x2, no crit, R = 240.
```
t = floor(2*25/5) + 2 = 10 + 2 = 12
d = floor(12 * 65 * 49 / 40) = floor(38220 / 40) = 955
d = floor(955 / 50) = 19
d = 19 + 2 = 21
STAB: d = floor(21 * 3 / 2) = floor(63 / 2) = 31
type x2: d = 31 * 2 = 62
R = 240: d = floor(62 * 240 / 255) = floor(14880 / 255) = 58   ► expect 58
(bounds: R=217 → floor(13454/255) = 52; R=255 → 62)
```

### T5 — Damage: critical hit ignoring stat stages

Attacker L30, Power 80, raw A 70 (atkStage 0), defender raw D 55 with defStage +2, crit, no STAB,
neutral type, R = 255.
```
applyMods = atkStage(0) > defStage(+2)? NO → use RAW stats: A = 70, D = 55
t = floor(2*30/5) + 2 = 12 + 2 = 14
d = floor(14 * 80 * 70 / 55) = floor(78400 / 55) = 1425
d = floor(1425 / 50) = 28
crit: d = 28 * 2 = 56
d = 56 + 2 = 58
R = 255: d = floor(58 * 255 / 255) = 58                    ► expect 58
(Contrast, had stages applied: D = floor(55*200/100) = 110 → floor(78400/110)=712 →
 floor(712/50)=14 → x2=28 → +2=30. The crit MUST yield 58, not 30.)
```

### T6 — Damage: STAB + not-very-effective (x0.5), min/max bounds

Attacker L15, Power 120, effective A 35, D 42, STAB, one defender type at x0.5, no crit.
```
t = floor(2*15/5) + 2 = 6 + 2 = 8
d = floor(8 * 120 * 35 / 42) = floor(33600 / 42) = 800
d = floor(800 / 50) = 16
d = 16 + 2 = 18
STAB: d = floor(18 * 3 / 2) = 27
type x0.5: d = floor(27 / 2) = 13
R = 217: floor(13 * 217 / 255) = floor(2821 / 255) = 11    ► min expect 11
R = 255: floor(13 * 255 / 255) = 13                        ► max expect 13
```

### T7 — Capture: full-HP common Kindra, CHARM

Target: maxHP 24, curHP 24, rate 190, CHARM (x1), no status.
```
rateMod = 190
a = max(floor((3*24 - 2*24) * 190 / (3*24)), 1) + 0
  = max(floor(24 * 190 / 72), 1) = max(floor(4560 / 72), 1) = max(63, 1) = 63
P(catch) = (63 + 1) / 256 = 64/256 = 25.00%                ► expect a = 63, P = 0.25
On failure: b-table row 61-80 → b = 191; each shake check succeeds iff rand(0..255) < 191.
```

### T8 — Capture: weakened rare Kindra, GILDED CHARM, asleep

Target: maxHP 30, curHP 7, rate 45, GILDED CHARM, SLP.
```
rateMod = min(floor(45 * 3 / 2), 255) = min(floor(135 / 2), 255) = 67
a = max(floor((3*30 - 2*7) * 67 / (3*30)), 1) + 10
  = max(floor(76 * 67 / 90), 1) + 10 = max(floor(5092 / 90), 1) + 10 = 56 + 10 = 66
P(catch) = (66 + 1) / 256 = 67/256 ≈ 26.17%                ► expect a = 66, P = 67/256
On failure: b-table row 61-80 → b = 191.
```

### T9 — Experience: wild faint

Defeated wild Kindra: BaseExp 64, level 5.
```
gain = floor(64 * 5 / 7) = floor(320 / 7) = 45             ► expect 45
```

### T10 — Experience: trainer faint

Defeated trainer Kindra: BaseExp 142, level 18.
```
base = floor(142 * 18 / 7) = floor(2556 / 7) = 365
gain = floor(365 * 3 / 2) = floor(1095 / 2) = 547          ► expect 547
```

### T11 — Growth curve total: Medium-Slow, level 10

```
EXP(10) = max(0, floor(6 * 1000 / 5) - 15 * 100 + 100 * 10 - 140)
        = max(0, 1200 - 1500 + 1000 - 140) = 560           ► expect 560
(also: EXP(1) = max(0, floor(6/5) - 15 + 100 - 140) = max(0, 1 - 15 + 100 - 140)
              = max(0, -54) = 0 — the clamp case)
```

### T12 — Growth curve total: Slow, level 20

```
EXP(20) = floor(5 * 8000 / 4) = floor(40000 / 4) = 10000   ► expect 10000
```

### T13 — Accuracy probability

Move accuracy 90%, attacker ACC stage 0, defender EVA stage +1.
```
acc255    = floor(90 * 255 / 100) = floor(22950 / 100) = 229
m1        = ACC_NUM[0]  = 100 → floor(229 * 100 / 100) = 229
m2        = ACC_NUM[-1] = 75  → floor(229 * 75 / 100) = floor(17175 / 100) = 171
threshold = clamp(171, 1, 255) = 171
P(hit)    = 171/256 ≈ 66.80%                               ► expect threshold = 171
```

### T14 — Stat stage application

Raw ATK 85 at stage −1.
```
eff = clamp(floor(85 * 66 / 100), 1, 999) = clamp(floor(5610 / 100), 1, 999) = 56
                                                           ► expect 56
(and at +2: clamp(floor(85 * 200 / 100), 1, 999) = 170)
```

### T15 (bonus) — Wild escape check

Player effective Speed A = 35, wild effective Speed B = 60, first attempt (C = 1).
```
floor(B / 4) = floor(60 / 4) = 15   (nonzero → no auto-escape)
F = floor(35 * 32 / 15) + 30 * 1 = floor(1120 / 15) + 30 = 74 + 30 = 104   (≤ 255)
escape iff rand(0..255) < 104  →  P = 104/256 = 40.625%    ► expect F = 104
```

### T16 — Damage: held type-boost item (§2.4 Item term)

T4's inputs (L25, Power 65, A 49, D 40, STAB, ×2, no crit) with the attacker holding the
matching type-boost item, R = 240.
```
(from T4)  d = floor(955 / 50) = 19
item:      d = floor(19 * 110 / 100) = floor(2090 / 100) = 20    (20, not 20.9 — one floor)
d = 20 + 2 = 22
STAB: d = floor(22 * 3 / 2) = 33
type x2: d = 33 * 2 = 66
R = 240: d = floor(66 * 240 / 255) = floor(15840 / 255) = 62   ► expect 62 (T4 unboosted: 58)
(bounds: R = 255 → 66. Isolated — no STAB, neutral, R = 255: 22 boosted vs 21 unboosted.)
Order pin vs the crit double (no STAB, neutral, crit, R = 255):
  19 → item 20 → crit 40 → +2 = 42                             ► expect 42, NOT 43
  (boost-after-crit would read 19 → 38 → floor(38*110/100) = 41 → 43 — wrong slot)
```

### T17 — Crit ladder stages (§2.2)

```
critStage(plain move,  empty hands) = 0 → threshold 17/256
critStage(plain move,  critBoost)   = 1 → 32/256   (exactly one Gen-2 stage up: 1/8)
critStage(HIGH_CRIT,   empty hands) = 2 → 64/256
critStage(HIGH_CRIT,   critBoost)   = 3 → 85/256
► expect CRIT_LADDER = [17, 32, 64, 85]; non-crit held effects add no stage
```

### T18 — Leftovers rounding (§11.7)

```
leftoversAmount(maxHP) = max(1, floor(maxHP / 16))
35 → 2,  32 → 2,  31 → 1,  16 → 1,  15 → 1 (min-1 clamp),  160 → 10
cap: a holder at 34/35 heals min(2, 35 - 34) = 1               ► expect the row above
```

### T19 — Berry vs poison chip order (§11.7)

Holder: maxHP 32, curHP 17, PSN, holding hpBerry(10).
```
pre-chip the berry is quiet: 17 * 2 = 34 > 32 → no trigger
chip  = max(1, floor(32 / 8)) = 4 → hp 13; faint check passes
berry: 13 * 2 = 26 <= 32 → trigger; heal = min(10, 32 - 13) = 10 → hp 23, berry consumed
► expect hp 23, item gone, no second fire next sweep
Counterpart: a cureBerry('all') holder poisoned mid-turn is cured by the sweep ending that
same move → at end of turn the status is gone, chip = 0 (the holder was spared the 4).
```

### T20 — HP-berry boundary (§5.5)

```
maxHP 30: hp 15 → 30 <= 30 → triggers;  hp 16 → 32 > 30 → no trigger
cap case: maxHP 12, hp 5 → heal = min(10, 12 - 5) = 7
fainted:  hp 0 never triggers (cure berries included)
```

### T21 — Wild held-item bands (§10.2)

Bands `[{common, 23}, {rare, 2}]`, one `r = rand(0..99)` draw:
```
r = 0, 22 → common;  r = 23, 24 → rare;  r = 25, 99 → none
species without heldItems → no draw at all (rng stream untouched)
► expect the band edges exactly as above
```

---

## 15. BREEDING & EGGS (Tier 2)

The Dawnfern Nursery (WORLD §15). AURIC has no gender anywhere in its schema, so breeding is
**keeper-line and genderless** (deviation, Appendix A): any two adults sharing an egg group are
compatible, and the egg carries the line of the FIRST Kindra boarded — "the keeper" — hatching as
the **base form** of the keeper's evolution family (reverse-walk of `Species.evolution`).

### 15.1 Egg groups

Five flavor-derived groups on `Species.eggGroup`; absent = does not breed (AMBERSTAG — legendary
law). Every evolution family shares one group (pinned by test), so the base form never crosses
groups: FIELD (VERDIL, EMBERIT, SCURRIL, SHADEKIT lines), SHORE (RILLET, PADDLET lines), SKY
(WRENLET line, HUSHOWL, ZEPHYRIL), BROOD (the THREDLE silk family), DRIFT (DEWBELL line,
WISPETAL). Census: field 8, shore 4, sky 4, brood 4, drift 3, none 1. ROSTER §D appendix mirrors
this table.

### 15.2 The lay roll

Eggs ride the bond heartbeat: on each 256-step wrap (`stepTicker`), if both boarders are present,
no egg is waiting, and the pair is compatible:

```
band  = 'species' if same species else 'group' if same eggGroup else none
lay  iff rand(0..99) < EGG_CHANCE[band]     // species 70, group 50 (Gen 2's top two bands)
```

No live roll = **no draw** (seed-replay discipline). On lay: the egg's genes and moves are locked
immediately (Gen-2 semantics), `nursery_egg` is set, and the old man steps outside.

### 15.3 The egg

An egg is an ordinary `Kindra` with one extra field — `egg: steps-to-hatch` — so every list and
guard keeps working; `kindraName` veils it as EGG and `able()` excludes it from battle, field
skills, and "last member" checks.

```
eggCycles = clamp(6, round(babyBaseExp / 12), 12)
eggSteps  = eggCycles * 256          // 1536 sturdy .. 3072 ZEPHYRIL
```

Genes: per non-HP stat, `clamp(0, 15, floor((a+b)/2) + rand(0..4) - 2)` (mid-point ± 2 jitter);
HP derived as always (§1.1). Moves: the base form's level-5 moveset, plus **egg-move-lite** — the
highest-learnset-level move both parents currently share that sits in the baby's learnset above
level 5 and isn't already known (replaces slot 0 when full). Only **party** eggs tick steps;
boarded/archived eggs are in stasis (the cartridge's PC behavior). Eggs cannot be released, and
claiming one needs a party slot.

### 15.4 Hatch

At 0 steps the next free step runs the ceremony (no B-cancel — a birth is not a decision):
delete `egg`, full HP, `level 5`, `bond 120` (`BOND_HATCH` — Gen 2's trusting-hatchling number,
vs the stranger's 70), and only then `markCaught` — an unhatched species never touches the
Kindex.

---

## Appendix A — Deliberate deviations from Gen 2

1. **Badge boosts excluded** entirely (multiplier removed from the damage pipeline).
2. **Berry timing**: held items are implemented (the §2.4 Item term, the §2.2 crit ladder, §5.5
   berries, the §11.7 item phase). Gen 2 cures a berry-curable status *mid-message, at the
   instant of infliction*; AURIC runs one state-based berry sweep at the end of the same move's
   resolution (and at entry, switch-in, send-in, after a confusion self-hit, and end-of-turn —
   §5.5). Mechanically identical — the cured status never reaches a can-act check or a chip
   tick — only the message position differs.
3. **Weather excluded** (no weather in this slice).
4. **Experience & statExp go only to the active battler** — no participation split, no Exp Share.
5. **Sleep lasts 1–6 lost actions** (Bulbapedia lists Gen 2 handhelds as 2–8 turns; shortened for
   pacing). Wake-and-act-same-turn is Gen 2 faithful.
6. **TOX (badly poisoned) omitted** — no Toxic-class move in the slice.
7. **Percent-chance rolls** (secondary effects, full-paralysis, thaw, confusion self-hit) use
   `rand(0..99) < pct` instead of Gen 2's x/256 approximations. Inherently /256 mechanics
   (accuracy, crit, capture, escape, encounter rate) keep their exact /256 form.
8. **Freeze thaw is a flat 10%** per action attempt (Gen 2: 25/256 ≈ 9.77% — effectively faithful).
9. **Multi-hit moves recompute crit and the random factor per hit** (Gen 2 reuses some values).
10. **8-bit overflow quirks not replicated**: no stat-over-255 quartering, no 997 damage cap, no
    Medium-Slow level-1 underflow (clamped at 0). Use ≥32-bit integers.
11. **AURIC SIGIL** is a guaranteed catch (Master Ball analog) — skips all capture math.
12. **Confusion duration 2–5 turns** per Bulbapedia Gen 2 (design brief's 1–4 superseded for
    faithfulness); self-hit damage has no random factor (Gen 2 faithful).
13. The authentic **1/256 miss** on 100%-accuracy moves is **kept** (it's part of the feel).
14. Stat recalculation is immediate on level-up/evolution (no Gen 2 "box trick" deferral).
15. **Breeding is keeper-line and genderless** (§15) — no gender exists in the schema, so any two
    same-group adults pair and the first-boarded Kindra decides the egg's line. No Ditto-analog.
    Gene inheritance is mid-point ± 2 jitter (not DV-copy/XOR); egg moves are **learnset-only**
    ("egg-move-lite", no off-learnset tables).
16. **No daycare leveling, no boarding fee** — Gen 2's per-step exp silently overwrote boarders'
    moves (a trap, not a feature); AURIC's boarders return exactly as they left, and the walk to
    Dawnfern is the only price.
17. **Rematches battle on talk, never ambush** (the Charm Gear's phone) — GSC re-armed
    line-of-sight for rematch trainers; AURIC keeps beaten trainers safely walkable and fights
    only when you choose to speak. Reward farming is bounded by finite `_R1` ladders until real
    scheduling lands.
18. **One rod, one honest roll** — Gen 2's three rod tiers collapse to a single OLD ROD with a
    per-cast percent (§10.4); the bite window is ~45 ticks vs Gen 2's ~30 frames, on purpose.

## Appendix B — Verification note

Formulas cross-checked against Bulbapedia on 2026-06-10: *Damage* (Gen II formula, crit-before-+2,
random 217–255, crit stage-ignore exception), *Catch rate* (Gen II `a` formula, +10 SLP/FRZ only —
the PAR/PSN/BRN +5 is skipped by a Gen 2 glitch, `rand <= a` check, full shake `b` lookup table),
*Stat modifiers* (both Gen 2 stage tables), *Status conditions* (PAR ×¼ Speed + 25%, BRN/PSN 1/8,
Gen 2 freeze ≈10% natural thaw, wake-turn action), *Critical hit* (17/256 base; high-crit = +2
stages = 1/4), *Escape* (Gen 1/2 flee formula). Items NOT independently verified against
disassembly: the exact comparison direction of shake checks (`< b` chosen) and the Gen 2 Great
Ball's precise in-engine implementation (we define GILDED CHARM as `min(floor(rate*3/2), 255)`,
matching Bulbapedia's stated ×1.5). These two choices are normative for AURIC regardless.
