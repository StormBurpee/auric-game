/**
 * The canonical system strings — every line battle and menus can speak,
 * with {VAR} interpolation. These keys are LAW: battle-scene and ui code
 * reference them, and data/strings.ts spreads them under the full string
 * table. The story transcription may override phrasing, never keys.
 *
 * Boxes are single strings; the dialog renderer word-wraps to 18 chars
 * per line, 2 lines per box, spilling long text into extra boxes.
 */
export const SYS_STRINGS: Record<string, string[]> = {
  'sys.wild.appear': ['A wild {KINDRA} appeared!'],
  'sys.trainer.challenge': ['{TRAINER} wants to battle!'],
  'sys.go': ['Go! {KINDRA}!'],
  'sys.return': ['Come back, {KINDRA}!'],
  'sys.used': ['{KINDRA} used {MOVE}!'],
  'sys.foe.used': ['Foe {KINDRA} used {MOVE}!'],
  'sys.crit': ['A critical hit!'],
  'sys.super': ["It's super effective!"],
  'sys.notvery': ["It's not very effective..."],
  'sys.noeffect': ["It doesn't affect {KINDRA}..."],
  'sys.miss': ['The attack missed!'],
  'sys.faint': ['{KINDRA} fainted!'],
  'sys.foe.faint': ['Foe {KINDRA} fainted!'],
  'sys.exp': ['{KINDRA} gained {N} EXP. Points!'],
  'sys.levelup': ['{KINDRA} grew to level {N}!'],
  'sys.learn.learned': ['{KINDRA} learned {MOVE}!'],
  'sys.learn.wants': ['{KINDRA} wants to learn {MOVE}.'],
  'sys.learn.full': ['But {KINDRA} already knows four moves!'],
  'sys.learn.forget': ['Forget a move to make room?'],
  'sys.learn.forgot': ['1, 2 and... poof! {KINDRA} forgot {MOVE}!'],
  'sys.learn.skipped': ['{KINDRA} did not learn {MOVE}.'],
  'sys.catch.throw': ['{PLAYER} threw a {ITEM}!'],
  'sys.catch.success': ['Gotcha! {KINDRA} was caught!'],
  'sys.catch.party': ['{KINDRA} joined your party!'],
  'sys.catch.archive': ["{KINDRA} was sent to Larch's Archive!"],
  'sys.catch.broke': ['Oh no! It broke free!'],
  'sys.catch.almost': ['Aargh! So close!'],
  'sys.catch.trainer': ["You can't charm another tamer's KINDRA!"],
  'sys.run.ok': ['Got away safely!'],
  'sys.run.fail': ["Can't escape!"],
  'sys.run.trainer': ['No! There is no running from a tamer battle!'],
  'sys.status.psn': ['{KINDRA} was poisoned!'],
  'sys.status.brn': ['{KINDRA} was burned!'],
  'sys.status.par': ['{KINDRA} is paralyzed! It may not attack!'],
  'sys.status.slp': ['{KINDRA} fell asleep!'],
  'sys.status.frz': ['{KINDRA} was frozen solid!'],
  'sys.status.cnf': ['{KINDRA} became confused!'],
  'sys.status.psnHurt': ['{KINDRA} is hurt by poison!'],
  'sys.status.brnHurt': ['{KINDRA} is hurt by its burn!'],
  'sys.status.parFull': ["{KINDRA} is fully paralyzed!"],
  'sys.status.slpSnooze': ['{KINDRA} is fast asleep.'],
  'sys.status.woke': ['{KINDRA} woke up!'],
  'sys.status.frzSolid': ['{KINDRA} is frozen solid!'],
  'sys.status.thaw': ['{KINDRA} thawed out!'],
  'sys.cnf.hurt': ['It hurt itself in its confusion!'],
  'sys.cnf.snap': ['{KINDRA} snapped out of confusion!'],
  'sys.flinch': ['{KINDRA} flinched and couldn\'t move!'],
  'sys.recharge': ['{KINDRA} must recharge!'],
  'sys.multihit': ['Hit {N} time(s)!'],
  'sys.stat.rose': ["{KINDRA}'s {STAT} rose!"],
  'sys.stat.rose2': ["{KINDRA}'s {STAT} rose sharply!"],
  'sys.stat.fell': ["{KINDRA}'s {STAT} fell!"],
  'sys.stat.fell2': ["{KINDRA}'s {STAT} harshly fell!"],
  'sys.stat.capped': ['Nothing happened!'],
  'sys.money.win': ['{PLAYER} won {N}G!'],
  'sys.whiteout': ['{PLAYER} is out of usable KINDRA!', '{PLAYER} rushed to a Haven, protecting the exhausted party...'],
  'sys.heal.item': ['{KINDRA} recovered {N} HP!'],
  'sys.cure.item': ['{KINDRA} became healthy!'],
  'sys.item.get': ['{PLAYER} found {ITEM}!'],
  'sys.item.given': ['{PLAYER} received {ITEM}!'],
  'sys.item.cant': ["It won't have any effect."],
  'sys.bag.none': ['The bag is empty.'],
  'sys.save.prompt': ['Save your progress?'],
  'sys.save.done': ['{PLAYER} saved the game!'],
  'sys.save.fail': ['Save failed... the browser refused.'],
  'sys.badge.get': ['{PLAYER} received the {BADGE}!'],
  'sys.kindex.reg': ["{KINDRA}'s data was added to the KINDEX!"],
  'sys.shop.greet': ['Welcome to the Outfitter! How can I help?'],
  'sys.shop.what': ['What would you like?'],
  'sys.shop.thanks': ['Thank you! Come again!'],
  'sys.shop.poor': ["You don't have enough Glints..."],
  'sys.evo.start': ['What? {KINDRA} is changing!'],
  'sys.evo.done': ['Congratulations! Your {KINDRA} evolved into {KINDRA2}!'],
  'sys.evo.cancel': ['Huh? {KINDRA} stopped changing.'],

  // ── Held items (Tier 1) ───────────────────────────────────────────────────
  'sys.held.berry.hp': ["{KINDRA}'s {ITEM} restored {N} HP!"],
  'sys.held.berry.cure': ["{KINDRA}'s {ITEM} cured its ailment!"],
  'sys.held.leftovers': ['{KINDRA} restored a little HP with its {ITEM}!'],
  'sys.held.gave': ['{KINDRA} is now holding the {ITEM}.'],
  'sys.held.took': ['Took the {ITEM} from {KINDRA}.'],
  'sys.held.none': ["{KINDRA} isn't holding anything."],

  // ── The Archive (Tier 1) ──────────────────────────────────────────────────
  'sys.archive.empty': ['The ARCHIVE is empty for now.'],
  'sys.archive.deposit': ['{KINDRA} settled in to rest.'],
  'sys.archive.withdraw': ['{KINDRA} is back, fully rested!'],
  'sys.archive.swap': ['{KINDRA} joined the party, fully rested!'],
  'sys.archive.last': ['Your party needs an able KINDRA!'],
  'sys.archive.full': ['Your party is full. Try SWAP!'],
  'sys.archive.release.1': ['Release it back to the wild?'],
  'sys.archive.release.2': ['Say goodbye to {KINDRA}? Truly?'],
  'sys.archive.release.bye': ['{KINDRA} waved, and was gone.', 'Be well, friend!'],

  // ── Field abilities (Tier 1) ──────────────────────────────────────────────
  'sys.field.sapling': ['A supple sapling blocks the way.'],
  'sys.field.sapling.can': ['{KINDRA} can clear it! Hew the sapling?'],
  'sys.field.sapling.done': ['{KINDRA} hewed the sapling!'],
  'sys.field.water': ['The water is calm and deep.'],
  'sys.field.water.can': ['{KINDRA} can ferry you! Ride the waves?'],
  'sys.field.boulder': ['A massive boulder. Something immense could move it... one day.'],
  'sys.field.boulder.can': ['{KINDRA} can move it! Give it a heave?'],
  'sys.field.boulder.done': ['{KINDRA} heaved the boulder!'],
  'sys.field.dark': ['It is pitch dark. Something here could kindle a light... one day.'],
  'sys.field.dark.can': ['{KINDRA} can light the way! Kindle its glow?'],
  'sys.field.dark.done': ["{KINDRA}'s glow filled the room!"],

  // ── Evolution methods (Tier 1) ────────────────────────────────────────────
  'sys.evo.stone.none': ['Nothing happened... it is not the right gift.'],

  // ── Fishing (Tier 2) ──────────────────────────────────────────────────────
  'sys.fish.none': ['Not even a nibble...'],
  'sys.fish.bite': ['A bite!'],
  'sys.fish.away': ['It slipped off the hook...'],
  'sys.fish.bag': ["Cast it at the water's edge."],

  // ── Eggs & the Nursery (Tier 2) ───────────────────────────────────────────
  // The four veiled tells, banded by remaining steps (>1280 / >640 /
  // >256 / else — ui/format.ts#eggTellKey). Single-line: the party and
  // archive cards re-wrap str(key)[0] to their own column widths.
  'sys.egg.got': ['{PLAYER} got the EGG!'],
  'sys.egg.full': ['Your party is full. The EGG must wait.'],
  'sys.egg.far': ['A long wait yet.'],
  'sys.egg.near': ['It shifts sometimes.'],
  'sys.egg.soon': ['Soft sounds inside!'],
  'sys.egg.now': ["It's about to hatch!"],
  'sys.hatch.oh': ['Oh?'],
  'sys.hatch.done': ['{KINDRA} hatched from the EGG!'],

  // ── The Charm Gear (Tier 2) ───────────────────────────────────────────────
  // The post-victory registration prompt (overworld trainerBattle).
  'sys.gear.swap': ['Swap numbers with {NAME}?'],
}
