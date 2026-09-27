/**
 * Every word the game says, keyed exactly as docs/STORY.md defines.
 * Each entry is a list of text boxes; each box is one string with a
 * newline between its (max two) 18-character lines. `{PLAYER}` and
 * friends interpolate at display time.
 *
 * STORY_STRINGS transcribes all 310 keyed boxes of docs/STORY.md
 * verbatim (236 story.* + 74 sys.* from §10). It spreads OVER
 * SYS_STRINGS, so §10's doc-formatted sys.* boxes win where keys
 * collide while engine-only defaults (sys.whiteout, ...) survive.
 */
import { SYS_STRINGS } from './sysStrings'

const STORY_STRINGS: Record<string, string[]> = {
  // -- §1 INTRO — Prof. Larch's opening monologue ------------------------
  'story.intro.1': ['Hello! Glad you\ncould make it.'],
  'story.intro.2': ['Welcome to the\nworld of KINDRA!'],
  'story.intro.3': ['I am PROF. LARCH\nof DAWNFERN.'],
  'story.intro.4': ['KINDRA live all\naround us... in'],
  'story.intro.5': ['grass and river,\nwood and wind.'],
  'story.intro.6': ['People and KINDRA\nlive side by side.'],
  'story.intro.7': ['Me? I study the\nbond we share.'],
  'story.intro.8': ['Now then... what\nis your name?'],
  'story.intro.9': ['{PLAYER}! What a\nfine name it is.'],

  // -- §2 HOME — Mom's send-off ------------------------------------------
  'story.home.1': ['Oh, {PLAYER}!\nUp already?'],
  'story.home.2': ['PROF. LARCH was\nasking for you.'],
  'story.home.3': ["He's at the lab\njust up the road."],
  'story.home.4': ['Take your bag.\nAnd... be safe.'],
  'story.home.after.1': ['Every journey\ncomes home again.'],
  // Tier 2: Mom hands over the CHARM GEAR inside the send-off (and
  // retroactively, before her ambient line, for saves that left already).
  'story.home.gear.1': ['Wait! I have\nsomething for you.'],
  'story.home.gear.2': ['Your very own\nCHARM GEAR!'],
  'story.home.gear.3': ['Map, phone, notes.\nCall me, dear!'],

  // -- §3 LAB — Larch, the favor, the starters, the window ----------------
  'story.lab.1': ['{PLAYER}! Come\nin, come in!'],
  'story.lab.2': ['I have a favor\nto ask of you.'],
  'story.lab.3': ['My field notes\nmust reach ELDER'],
  'story.lab.4': ['ROWAN in BELLMERE\nTOWN, up TRAIL 1.'],
  'story.lab.5': ['But wild KINDRA\nprowl the tall'],
  'story.lab.6': ['grass on the way.\nAlone? Risky!'],
  'story.lab.7': ['So! Choose one of\nthese three.'],
  'story.lab.8': ['Go on. Take a\ngood, long look.'],
  'story.lab.wait': ['Now, now! Choose\na KINDRA first!'],
  'story.lab.pick.verdil': ['VERDIL, the leaf\nnewt? A calm soul.'],
  'story.lab.pick.emberit': ['EMBERIT, the ember\nshrew? Bold pick!'],
  'story.lab.pick.rillet': ['RILLET, the river\npup? A merry one!'],
  'story.lab.9': ['It chose you too,\nyou know.'],
  'story.lab.10': ['Take these as\nwell... 5 CHARMS!'],
  'story.lab.11': ['Toss a CHARM to\nbefriend a wild'],
  'story.lab.12': ['KINDRA. Gently,\nmind you!'],
  'story.lab.13': ['Now then! ELDER\nROWAN awaits.'],
  'story.lab.14': ['...? Someone is at\nthe window. Cold'],
  'story.lab.15': ['eyes, watching...\nThen... gone.'],

  // -- §4 ELDER ROWAN — Bellmere Town --------------------------------------
  'story.rowan.1': ['Hm? Notes from\nyoung LARCH?'],
  'story.rowan.2': ['Ah... his hand is\nstill dreadful.'],
  'story.rowan.3': ['He writes of the\nold stories. Of'],
  'story.rowan.4': ['AMBERSTAG, whose\nantlers carry the'],
  'story.rowan.5': ['dawn... and of the\nWISTERIA SPIRE,'],
  'story.rowan.6': ['where petals that\nfell still drift.'],
  'story.rowan.7': ['Old tales. But\ntales have roots.'],
  'story.rowan.8': ['Now. LARCH asked\nme to give you'],
  'story.rowan.9': ['this. A KINDEX!\nIt records every'],
  'story.rowan.10': ['KINDRA you meet.\nA book of bonds.'],
  'story.rowan.11': ['Take TRAIL 2 west\nto LOOMSPIRE CITY.'],
  'story.rowan.12': ['WARDEN ARIA keeps\nthe gym there.'],
  'story.rowan.13': ['Earn her ZEPHYR\nBADGE, child.'],
  'story.rowan.after.1': ['The SPIRE sings\nat night. Listen.'],

  // -- §5 RIVAL — Corvin's ambush on Trail 2 -------------------------------
  'story.rival1.pre.1': ['...You. The one\nfrom the lab.'],
  'story.rival1.pre.2': ["I'm {RIVAL}.\nRemember it."],
  'story.rival1.pre.3': ['Weak trainers\nmake KINDRA weak.'],
  'story.rival1.defeat.1': ['Tch. A fluke,\nnothing more.'],
  'story.rival1.defeat.2': ['Only the strong\ndeserve Kindra.'],
  'story.rival1.victory.1': ["Hmph. So that's\nthe lab's pick."],
  'story.rival1.post.1': ['Heh. The GLOAM\nSYNDICATE has'],
  'story.rival1.post.2': ["plans. Big plans.\nYou're not ready."],
  'story.rival1.post.3': ['Get stronger.\nOr stay small.'],

  // -- §5b TRAIL 2 TRAINERS -------------------------------------------------
  'story.trainer.ben.pre': ['Halt! Scouts\nbattle on sight!'],
  'story.trainer.ben.defeat.1': ['Whoa! You hit\nlike a landslide!'],
  'story.trainer.ben.defeat.2': ['Trail 2 is wilder\nthan it looks.'],
  'story.trainer.ben.post': ['I saw a ribbon of\nwind... a KINDRA?'],
  'story.trainer.mae.pre': ['My mushrooms!\nStep carefully!'],
  'story.trainer.mae.defeat.1': ['Oof! Even my\nmushrooms wilted.'],
  'story.trainer.mae.post': ['Morning dew draws\nDEWBELL out.'],
  'story.trainer.otto.pre': ['Each bell has its\nown voice. Hear!'],
  'story.trainer.otto.defeat.1': ['The bells toll\nfor me today...'],
  'story.trainer.otto.defeat.2': ['Ring on, friend.'],
  'story.trainer.otto.post': ['At midnight, a\nbell rings itself.'],
  'story.trainer.ivy.pre': ['Care for a tonic?\nAfter we battle!'],
  'story.trainer.ivy.defeat.1': ['Hmm. No salve\nmends a loss.'],
  'story.trainer.ivy.defeat.2': ['Take the lesson\nas your tonic.'],
  'story.trainer.ivy.post': ['Wisteria petals\nremember falling.'],

  // -- §6 LOOMSPIRE GYM -------------------------------------------------------
  'story.gym.sign': ['The wind favors\nthe unburdened.'],
  'story.gym.fern.pre': ['The wind lifts\nthose who leap!'],
  'story.gym.fern.defeat.1': ['My wings are\nclipped! Go on.'],
  'story.gym.fern.post': ['ARIA taught me\nto fall first.'],
  'story.gym.juno.pre': ['Hush... hear the\nowl on the wind?'],
  'story.gym.juno.defeat.1': ['You ride the\nwind better...'],
  'story.gym.juno.defeat.2': ['ARIA awaits you.'],
  'story.gym.juno.post': ['Fly steady. ARIA\nshows no mercy.'],
  'story.gym.aria.pre.1': ['Welcome. I am\nARIA. Wind Warden.'],
  'story.gym.aria.pre.2': ['The wind owns no\nmaster. It only'],
  'story.gym.aria.pre.3': ['carries the free.\nShow me you fly!'],
  'story.gym.aria.win.1': ['The wind bows to\nno one... yet it'],
  'story.gym.aria.win.2': ['carries you. Take\nthe ZEPHYR BADGE.'],
  'story.gym.aria.win.3': ['Wear it lightly,\nlike a feather.'],
  'story.gym.aria.lose': ['The wind tests\nall. Rise again.'],
  'story.gym.aria.post.1': ['Oh! Word came\nfrom PROF. LARCH.'],
  'story.gym.aria.post.2': ['He has news for\nyou. Safe winds!'],

  // -- §7 AMBIENT NPCS --------------------------------------------------------
  'story.npc.dawnfern1.1': ['Wild KINDRA hide\nin tall grass!'],
  'story.npc.dawnfern1.2': ['Walk in, and one\nmight pounce!'],
  'story.npc.dawnfern2.day': ['WRENLET sings at\ndawn on TRAIL 1.'],
  'story.npc.dawnfern2.night': ['Hear that hush?\nHUSHOWL is awake.'],
  'story.npc.dawnfern3.1': ['PROF. LARCH talks\nto KINDRA all day.'],
  'story.npc.dawnfern3.2': ['I think they\nunderstand him.'],
  'story.npc.bellmere1.1': ['My first journey\nbegan with a gift'],
  'story.npc.bellmere1.2': ['of gold... games\nlike that stay in'],
  'story.npc.bellmere1.3': ['your heart\nforever.'],
  'story.npc.bellmere2.day': ['Some KINDRA only\nwake at night.'],
  'story.npc.bellmere2.night': ["Now's the hour!\nSHADEKIT prowls."],
  // Tier 2: her Saturday daylight variant points at the market vendor.
  'story.npc.bellmere2.market': ['Market day! See\nthe lake vendor!'],
  'story.npc.bellmere3.1': ['Ledges! Hop down\nthem with a jump!'],
  'story.npc.bellmere3.2': ["But you can't\nclimb back up!"],
  'story.npc.bellmere4.1': ['They say the tide\nturns when a'],
  'story.npc.bellmere4.2': ['sleeping TORTIDE\nrolls over. True!'],
  // Tier 2: bellmere5 — the old angler on the sand who TOLD the boy that
  // tall tale; he hands over the OLD ROD once ('old_rod_given').
  'story.npc.bellmere5.1': ['Heh. The boy still\ntells my story?'],
  'story.npc.bellmere5.2': ['Sixty years I have\nfished this lake.'],
  'story.npc.bellmere5.3': ['Take my OLD ROD.\nPatience, child.'],
  'story.npc.bellmere5.after': ['The deep ones bite\nfor the patient.'],
  'story.npc.loomspire1.day': ['The WISTERIA\nSPIRE is lovely...'],
  'story.npc.loomspire1.night.1': ['Lights in the\nSPIRE again...'],
  'story.npc.loomspire1.night.2': ['Petals drift\nwith no wind.'],
  'story.npc.loomspire2.1': ['WARDEN ARIA reads\nthe wind like a'],
  'story.npc.loomspire2.2': ['letter from an\nold friend.'],
  'story.npc.loomspire3.1': ['The arcade got a\nSTORMBOY COLOR!'],
  'story.npc.loomspire3.2': ['Mom says I have\nto journey first.'],
  'story.npc.loomspire4.day': ["LOOMSPIRE looms,\ndoesn't it?"],
  'story.npc.loomspire4.night': ['The lamplighters\nfollow DUSKMOTH.'],
  'story.npc.loomspire5.1': ['Strangers in grey\nasked about the'],
  'story.npc.loomspire5.2': ['SPIRE... then left\nat twilight.'],
  // Tier 2: the Spire watcher's Wednesday-night line (the bell-toll).
  'story.npc.spire.toll': ['The SPIRE rings\ntonight! Listen!'],

  // -- §8 SIGNS -------------------------------------------------------------
  'story.sign.dawnfern1': ['DAWNFERN VILLAGE\nHere journeys dawn'],
  'story.sign.dawnfern2': ['DAWNFERN KINDRA\nLAB - PROF. LARCH'],
  'story.sign.trail11': ['TRAIL 1\nNorth to BELLMERE'],
  'story.sign.trail12': ['Tall grass ahead.\nTread kindly.'],
  'story.sign.bellmere1': ['BELLMERE TOWN\nThe lake remembers'],
  'story.sign.bellmere2': ['BELLMERE HAVEN\nRest your KINDRA'],
  'story.sign.bellmere3': ['OUTFITTER\nGear for the road'],
  'story.sign.bellmere4': ["ELDER ROWAN'S\nHOUSE"],
  'story.sign.trail21': ['TRAIL 2\nWest to LOOMSPIRE'],
  'story.sign.trail22': ['Steep ledges.\nHop with care!'],
  'story.sign.loomspire1': ['LOOMSPIRE CITY\nWhere wind weaves'],
  'story.sign.loomspire2': ['LOOMSPIRE GYM\nWind Warden ARIA'],
  'story.sign.loomspire3': ['STORMBOY COLOR\n- EST. 2026 -'],
  'story.sign.loomspire4': ['LOOMSPIRE HAVEN\nRest and be well'],
  'story.sign.loomspire5': ['OUTFITTER\nCHARMS! TONICS!'],
  'story.sign.loomspire6': ['WISTERIA SPIRE\nMind the petals.'],

  // -- §9 HAVEN & OUTFITTER ---------------------------------------------------
  // Tier 1 retired story.haven.lily.2 (the YES/NO heal prompt) for the
  // REST / ARCHIVE / LEAVE loop keyed by story.haven.lily.what.
  'story.haven.lily.1': ['Welcome to the\nHAVEN, traveler!'],
  'story.haven.lily.what': ['What can I do\nfor you, dear?'],
  'story.haven.lily.3': ['One moment...'],
  'story.haven.lily.4': ['There! Your KINDRA\nare fully rested!'],
  'story.haven.lily.5': ['Walk gently, and\ncome back soon!'],
  'story.haven.lily.no': ['Of course. Take\nyour time, dear.'],
  // Tier 2: Lily's Saturday opener (the in-world market-day hint).
  'story.haven.lily.market': ['Market day, dear!\nDo look outside.'],
  'story.haven.archive.1': ['Of course! Every\nguest is family.'],
  'story.haven.archive.2': ["They'll be rested\nwhen you return!"],
  'story.outfitter.clerk.1': ['Welcome to the\nOUTFITTER!'],
  'story.outfitter.clerk.2': ['Buying? Selling?\nTake a look!'],
  'story.outfitter.thanks': ['Thank you! Safe\ntrails out there!'],
  'story.outfitter.bye': ['Come again!'],

  // -- §10 SYSTEM TEXT (doc-formatted; overrides SYS_STRINGS on collision) --
  'sys.battle.wild': ['A wild {KINDRA}\nappeared!'],
  'sys.battle.trainer': ['{TRAINER}\nwants to battle!'],
  'sys.battle.foesend': ['{TRAINER}\nsent {KINDRA}!'],
  'sys.battle.go': ['Go! {KINDRA}!'],
  'sys.battle.return': ['Come back,\n{KINDRA}!'],
  'sys.battle.move': ['{KINDRA} used\n{MOVE}!'],
  'sys.battle.crit': ['A critical hit!'],
  'sys.battle.supereff': ["It's super\neffective!"],
  'sys.battle.noteff': ["It's not very\neffective..."],
  'sys.battle.immune': ["It doesn't affect\n{KINDRA}..."],
  'sys.battle.miss': ["{KINDRA}'s\nattack missed!"],
  'sys.battle.faint': ['{KINDRA}\nfainted!'],
  'sys.battle.faint.wild': ['Wild {KINDRA}\nfainted!'],
  'sys.battle.faint.foe': ['Foe {KINDRA}\nfainted!'],
  'sys.battle.victory': ['{PLAYER} beat\n{TRAINER}!'],
  'sys.battle.lose.1': ['{PLAYER} is out\nof usable KINDRA!'],
  'sys.battle.lose.2': ['{PLAYER}\nwhited out!'],
  'sys.exp.gain': ['{KINDRA} gained\n{EXP} EXP. points!'],
  'sys.exp.levelup': ['{KINDRA} grew to\nlevel {LEVEL}!'],
  'sys.learn.new': ['{KINDRA} learned\n{MOVE}!'],
  'sys.learn.full.1': ['{KINDRA} wants\nto learn'],
  'sys.learn.full.2': ['{MOVE}.\nBut it already'],
  'sys.learn.full.3': ['knows four moves!\nForget a move?'],
  'sys.learn.forget.1': ['1, 2, and... poof!'],
  'sys.learn.forget.2': ['{KINDRA} forgot\n{MOVE}!'],
  'sys.learn.stop': ['Stop learning\n{MOVE}?'],
  'sys.learn.skip': ['{KINDRA} gave up\non {MOVE}.'],
  'sys.evolve.start': ['What? {KINDRA}\nis evolving!'],
  'sys.evolve.done': ['{KINDRA} evolved\ninto {KINDRA2}!'],
  'sys.evolve.stop': ['Huh? {KINDRA}\nstopped evolving!'],
  'sys.catch.throw': ['{PLAYER} threw\nthe {ITEM}!'],
  'sys.catch.success': ['Gotcha! {KINDRA}\nwas caught!'],
  'sys.catch.party': ['{KINDRA} joined\nyour party!'],
  'sys.catch.archive': ['{KINDRA} went\nto the ARCHIVE.'],
  'sys.catch.fail': ['Oh no! It broke\nfree!'],
  'sys.catch.trainer': ["You can't charm\nanother's KINDRA!"],
  'sys.run.ok': ['Got away safely!'],
  'sys.run.fail': ["Can't escape!"],
  'sys.run.trainer': ["No! You can't run\nfrom this battle!"],
  'sys.status.psn': ['{KINDRA} was\npoisoned!'],
  'sys.status.brn': ['{KINDRA} was\nburned!'],
  'sys.status.par': ['{KINDRA} is\nparalyzed!'],
  'sys.status.slp': ['{KINDRA} fell\nasleep!'],
  'sys.status.frz': ['{KINDRA} was\nfrozen solid!'],
  'sys.status.cnf': ['{KINDRA} became\nconfused!'],
  'sys.status.psn.hurt': ['{KINDRA} is hurt\nby poison!'],
  'sys.status.brn.hurt': ['{KINDRA} is hurt\nby its burn!'],
  'sys.status.par.skip': ["{KINDRA} can't\nmove!"],
  'sys.status.slp.idle': ['{KINDRA} is fast\nasleep!'],
  'sys.status.slp.wake': ['{KINDRA}\nwoke up!'],
  'sys.status.frz.idle': ['{KINDRA} is\nfrozen solid!'],
  'sys.status.frz.thaw': ['{KINDRA}\nthawed out!'],
  'sys.status.cnf.idle': ['{KINDRA} is\nconfused!'],
  'sys.status.cnf.hit': ['It hurt itself in\nits confusion!'],
  'sys.status.cnf.end': ['{KINDRA} snapped\nout of confusion!'],
  'sys.stat.up': ["{KINDRA}'s\n{STAT} rose!"],
  'sys.stat.up2': ["{KINDRA}'s\n{STAT} soared!"],
  'sys.stat.down': ["{KINDRA}'s\n{STAT} fell!"],
  'sys.stat.down2': ["{KINDRA}'s\n{STAT} plunged!"],
  'sys.stat.max': ["It won't go any\nhigher!"],
  'sys.stat.min': ["It won't go any\nlower!"],
  'sys.item.use': ['{PLAYER} used\nthe {ITEM}!'],
  'sys.item.heal': ["{KINDRA}'s HP\nwas restored!"],
  'sys.item.cantuse': ["This isn't the\ntime for that!"],
  'sys.item.noeffect': ['It would have no\neffect.'],
  'sys.item.get': ['{PLAYER} got\nthe {ITEM}!'],
  'sys.shop.nomoney': ["You don't have\nenough GLINTS."],
  'sys.save.prompt': ['Would you like\nto save?'],
  'sys.save.saving': ["Saving... don't\nturn off power!"],
  'sys.save.done': ['{PLAYER} saved\nthe game!'],
  'sys.badge.get': ['{PLAYER} got the\n{BADGE}!'],
  'sys.money.win': ['{PLAYER} got\n{AMOUNT}G for winning!'],
  'sys.money.lose': ['{PLAYER} dropped\n{AMOUNT}G in a panic!'],
  'sys.kindex.reg': ["{KINDRA}'s data\njoined the KINDEX!"],

  // -- §11 CREDITS — to be continued ------------------------------------------
  'story.credits.1': ['AURIC\nAn Ambervale Story'],
  'story.credits.2': ['{PLAYER} earned\nthe ZEPHYR BADGE.'],
  'story.credits.3': ['But this tale has\nonly just begun.'],
  'story.credits.4': ['For everyone whose\nfirst cartridge'],
  'story.credits.5': ['felt like a whole\nworld. Thank you.'],
  'story.credits.6': ['TO BE CONTINUED...'],

  // -- §12 THE CHARM GEAR (Tier 2) --------------------------------------------
  // PHONE pools rotate on clock.ts#dayStamp — a different line each real
  // day. Prefix convention (data/quests.ts#phonePrefix):
  // story.phone.<who>.flavor1..N / .offer / .armed / .spent, where N = 3
  // for MOM and LARCH and 1 for trainers.
  'story.phone.mom.flavor1': ['Eat well, sleep\nwell, walk well!'],
  'story.phone.mom.flavor2': ['The house is so\nquiet without you.'],
  'story.phone.mom.flavor3': ['Your KINDRA eat\nbetter than you!'],
  'story.phone.larch.flavor1': ['Field notes,\n{PLAYER}! Notes!'],
  'story.phone.larch.flavor2': ['A KINDEX page a\nday, I always say.'],
  'story.phone.larch.flavor3': ['ROWAN still mocks\nmy handwriting.'],
  // Trainer pools are one line deep (data/quests.ts FLAVOR_POOLS).
  'story.phone.ben.flavor1': ['Scouts watch the\nskies. All clear!'],
  'story.phone.ben.offer': ['Up for a rematch?\nCome to TRAIL 2!'],
  'story.phone.ben.armed': ["I'm warmed up and\nwaiting for you!"],
  'story.phone.ben.spent': ["You've taught me\nplenty already."],
  'story.phone.mae.flavor1': ['The mushrooms\nare thriving!'],
  'story.phone.mae.offer': ['My bugs want a\nrematch! Come by!'],
  'story.phone.mae.armed': ['The baskets can\nwait. Battle me!'],
  'story.phone.mae.spent': ['No more battles.\nThe moths approve.'],
  'story.phone.otto.flavor1': ['Every bell rang\ntrue this morning.'],
  'story.phone.otto.offer': ['One more bout?\nThe bells insist.'],
  'story.phone.otto.armed': ['DEWBELL is rung\nand ready. Come!'],
  'story.phone.otto.spent': ['The bells still\ntoll your victory.'],
  'story.phone.ivy.flavor1': ['Brewing a tonic.\nIt... fizzes. Hm.'],
  'story.phone.ivy.offer': ['A rematch would\nbe good medicine.'],
  'story.phone.ivy.armed': ['The salve is set.\nNow, the battle!'],
  'story.phone.ivy.spent': ['Rest is the best\ntonic. Take mine.'],
  // Rematch (tier R1) in-battle defeat quotes — data/trainers.ts keys.
  'story.rematch.ben.defeat': ['Stronger AND\nfaster? Unfair!'],
  'story.rematch.mae.defeat': ['Even LACEWING\nbows to that!'],
  'story.rematch.otto.defeat': ['The bells toll\nfor me. Again!'],
  'story.rematch.ivy.defeat': ['My strongest brew,\noutdone again.'],
  // JOURNAL quest pages: story.quest.<id>.<stage> plus '.done' epilogues.
  // Ids and stage counts mirror data/quests.ts QUESTS exactly: fieldnotes 2,
  // coldeyes 1, zephyr 2, trail2 1, bonds 3, treasures 2, fullgear 2,
  // oldfriends 2.
  'story.quest.fieldnotes.1': ['PROF. LARCH was\nasking for you.'],
  'story.quest.fieldnotes.2': ['Take the notes to\nELDER ROWAN.'],
  'story.quest.fieldnotes.done': ['Delivered! And the\nKINDEX is yours.'],
  'story.quest.coldeyes.1': ['Cold eyes at the\nlab window. Whose?'],
  'story.quest.coldeyes.done': ['{RIVAL} of the\nGLOAM SYNDICATE...'],
  'story.quest.zephyr.1': ['WARDEN ARIA keeps\nthe LOOMSPIRE gym.'],
  'story.quest.zephyr.2': ['Beat the gliders,\nthen ARIA herself.'],
  'story.quest.zephyr.done': ['The ZEPHYR BADGE\nis yours. Fly on!'],
  'story.quest.trail2.1': ['Four tamers wait\non TRAIL 2.'],
  'story.quest.trail2.done': ['TRAIL 2 cleared!\nFour for four.'],
  'story.quest.bonds.1': ['The KINDEX is\nnearly empty.'],
  'story.quest.bonds.2': ['Charm wild KINDRA\nand fill the book.'],
  'story.quest.bonds.3': ['Ten bonds would\nmake ROWAN proud.'],
  'story.quest.bonds.done': ['A true book of\nbonds. Keep going!'],
  'story.quest.treasures.1': ['Treasures lie off\nthe beaten trail.'],
  'story.quest.treasures.2': ['Some need HEW or\nHEAVE. Look again.'],
  'story.quest.treasures.done': ['Every cranny\nchecked. Bravo!'],
  'story.quest.fullgear.1': ['Swap numbers with\ntamers you beat.'],
  'story.quest.fullgear.2': ['A few pages still\nblank. Find them.'],
  'story.quest.fullgear.done': ['Every number\nsaved. Popular!'],
  'story.quest.oldfriends.1': ['Call a friend.\nOffer a rematch.'],
  'story.quest.oldfriends.2': ['Armed challenges\nwait on TRAIL 2.'],
  'story.quest.oldfriends.done': ['Old friends, new\nbattles. The best.'],

  // -- §13 DAY-OF-WEEK LIFE (Tier 2) ------------------------------------------
  // The Saturday vendor sells ONE rotating rare; pitch keys are pinned by
  // data/weekly.ts MARKET_OFFERS. The gran gifts one berry per week.
  'story.market.vendor.1': ['Market day! Fresh\nfrom LOOMSPIRE!'],
  'story.market.offer': ['{ITEM}!\nJust {AMOUNT}G today.'],
  'story.market.deal': ['Sold! Use it well,\nfriend.'],
  'story.market.sold': ['Sold out! New\nstock next week.'],
  'story.market.bye': ['Suit yourself!\nBack next week.'],
  'story.market.pitch.charm': ['Gold leaf, half\nthe OUTFITTER ask!'],
  'story.market.pitch.cinder': ['A CINDER BAND.\nFire burns hotter!'],
  'story.market.pitch.dew': ['A DEW PEARL. The\nlake approves!'],
  'story.market.pitch.moss': ['A MOSS LOCKET,\nmossier than most!'],
  'story.market.pitch.lumen': ['A LUMEN BERRY.\nSkip the hunting!'],
  'story.gran.1': ['Sunday stroll! My\nberries came in.'],
  'story.gran.2': ['Take one, dear.\nGrown with care.'],
  'story.gran.again': ['One a week keeps\nthe basket full.'],

  // -- §15 THE DAWNFERN NURSERY (Tier 2) --------------------------------------
  // The keeper couple (events/nursery.ts speaks these). Band lines say
  // compatibility out loud (the Gen-2 checker-man, minus the riddle);
  // the old man steps outside while 'nursery_egg' is set.
  'story.nursery.keeper.1': ['Welcome to the\nDAWNFERN NURSERY.'],
  'story.nursery.keeper.what': ['Shall we mind a\nKINDRA for you?'],
  'story.nursery.board.took': ['{KINDRA} settles\nright in.'],
  'story.nursery.board.keeper': ['{KINDRA} will\nmind the clutch?'],
  'story.nursery.board.full': ['Two boarders is\nall we can mind.'],
  'story.nursery.board.last': ['And leave you all\nalone? No, dear.'],
  'story.nursery.retrieve.none': ['No boarders of\nyours just now.'],
  'story.nursery.retrieve.full': ['Your party is\nfull, dear.'],
  'story.nursery.back': ['{KINDRA} missed\nyou, I think.'],
  'story.nursery.band.species': ['Those two are\nthick as thieves!'],
  'story.nursery.band.group': ['They get along\nwell enough.'],
  'story.nursery.band.none': ['They keep to their\nown corners...'],
  'story.nursery.egg.hint': ['My husband is\noutside with news!'],
  'story.nursery.bye': ['Walk gently. We\nwill be here.'],
  'story.nursery.man.idle': ['My wife minds the\ndesk. I mind eggs.'],
  'story.nursery.man.1': ['Your pair was\nminding an EGG!'],
}

/** Concatenate already-transcribed boxes into one multi-box sequence. */
function seq(...keys: string[]): string[] {
  return keys.flatMap(key => {
    const boxes = STORY_STRINGS[key]
    if (!boxes) throw new Error(`strings: sequence references unknown key ${key}`)
    return boxes
  })
}

/**
 * Battle code shows a trainer's whole defeat quote through the single
 * `defeatText` key pinned in data/trainers.ts, so each multi-box quote
 * from STORY.md §5-§6 is also published collapsed, in doc order.
 * ARIA's covers her full award speech (story.gym.aria.win.1-3).
 */
const DEFEAT_SEQUENCES: Record<string, string[]> = {
  'story.rival1.defeat': seq('story.rival1.defeat.1', 'story.rival1.defeat.2'),
  'story.trail2.ben.defeat': seq('story.trainer.ben.defeat.1', 'story.trainer.ben.defeat.2'),
  'story.trail2.mae.defeat': seq('story.trainer.mae.defeat.1'),
  'story.trail2.otto.defeat': seq('story.trainer.otto.defeat.1', 'story.trainer.otto.defeat.2'),
  'story.trail2.ivy.defeat': seq('story.trainer.ivy.defeat.1', 'story.trainer.ivy.defeat.2'),
  'story.gym.fern.defeat': seq('story.gym.fern.defeat.1'),
  'story.gym.juno.defeat': seq('story.gym.juno.defeat.1', 'story.gym.juno.defeat.2'),
  'story.gym.aria.defeat': seq('story.gym.aria.win.1', 'story.gym.aria.win.2', 'story.gym.aria.win.3'),
}

export const STRINGS: Record<string, string[]> = {
  ...SYS_STRINGS,
  ...STORY_STRINGS,
  ...DEFEAT_SEQUENCES,
}

export { STORY_STRINGS }

/** Missing keys speak up on screen instead of crashing the scene. */
export function str(key: string): string[] {
  return STRINGS[key] ?? [`?${key}?`.slice(0, 18)]
}
