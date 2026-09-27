# AURIC source release

This release packages the current AURIC working snapshot as a standalone game. It includes the newer Charm Gear, fishing, weekly events and nursery/egg work. It does not import the development repository's Git history, internal work plans, local saves, build outputs or installed dependencies.

## Original material

- **Pixel art:** the creatures, characters, tiles, font and interface art are represented as pixel grids in `src/game/assets/`. The renderer decodes those grids directly.
- **Music and sound:** `src/game/audio/` contains note-event compositions and effect definitions. `src/engine/audio/` synthesizes the sound through Web Audio; no recorded music or external sample library is included.
- **World and text:** creature and character names, dialogue, maps and story are defined in `src/game/data/` and the accompanying specifications.
- **Screenshots:** `docs/screenshots/title-current.png` was captured from this release's production build. The other three images show the opening areas in an earlier development build. These captures do not establish that every current story branch has been played through.

The code, these original assets and documentation share the root MIT license. No separate permission to third-party names or marks is implied. The general conventions of handheld role-playing games are an influence; this is an independent game with its own world and content.

## Development dependencies

The game has no imported third-party runtime library. Development dependencies are installed from the lockfile and keep their own licenses, as summarized in [THIRD_PARTY.md](THIRD_PARTY.md). Do not treat the root MIT license as relicensing those dependencies.

## Release limitations

The game is a prototype, and this source release is not a claim that every feature has been manually played through or every browser supported. Source review and automated tests cannot prove universal originality or eliminate every possible defect. Specific provenance concerns or reproducible bugs should be reported with the affected file and evidence.
