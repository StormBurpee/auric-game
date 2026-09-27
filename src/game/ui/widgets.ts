/**
 * The interface toolkit: the classic text frame, the typewriter dialog,
 * choice menus, and the full-screen menus (pause, party, bag, Kindex,
 * shop, name entry). Battle and overworld both build on these.
 *
 * This module is the toolkit's public face. The pixels live in draw.ts,
 * the text shaping in format.ts, and each flow in its own sibling
 * module — every flow pushes translucent Scenes onto game.scenes and
 * consumes only its own input. Import from here; the split is an
 * implementation detail.
 */
export { CELL, drawFrame, drawHpBar, drawText, drawTextCenter, drawTextRight } from './draw'
export { showText } from './dialog'
export { askChoice, askConfirm } from './choice'
export { openPauseMenu } from './pause'
export { openPartyScreen, openSummary } from './party'
export type { PartyPickOpts } from './party'
export { openBag } from './bag'
export { openShop } from './shop'
export { openNameEntry } from './nameEntry'
export { openKindex } from './kindex'
export { openArchive } from './archive'
export { openGear } from './gear'
