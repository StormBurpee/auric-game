# Third-party development tools

AURIC's browser runtime is implemented in this repository. The build and test workflow uses these development tools:

| Tool | Purpose | Upstream license |
|---|---|---|
| [TypeScript](https://github.com/microsoft/TypeScript) | Type checking | Apache-2.0 |
| [Vite](https://github.com/vitejs/vite) | Development server and production build | MIT |
| [Vitest](https://github.com/vitest-dev/vitest) | Automated tests | MIT |

Exact versions and transitive dependencies are recorded in `package-lock.json`. Each installed package distributes its own license and notices. Installed `node_modules` directories are excluded from this repository; preserve their upstream notices if you redistribute those tools.

No external fonts, sprite packs, sound recordings or asset libraries are bundled with the game. The pixel font, art and synthesized score are part of the AURIC source release under the root license.
