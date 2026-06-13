# Changelog

All notable changes to termscene are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] — 2026-06-12

### Added
- **Browser playground** (`docs/playground/`, published at
  [`/playground/`](https://r3al1tym.github.io/termscene/playground/)). Author a
  scene in a live editor, scrub it on a canvas preview, and export to mp4 / webm /
  gif / png entirely client-side — no install, no server, the scene never leaves the
  page. Reuses the CLI's own `compiler`, `lint`, and `themes` modules so authoring
  behavior never drifts from the CLI.
  - Video export via WebCodecs + [mediabunny](https://github.com/Vanilagy/mediabunny)
    (mp4 H.264 / webm VP9), with codec feature-detection and graceful fallback. Needs
    no cross-origin isolation, so it works on header-less static hosts (GitHub Pages).
  - GIF export via [gifenc](https://github.com/mattdesl/gifenc) (worker-free,
    per-frame 256-color quantization); PNG still export.
  - A Canvas2D renderer (`playground/src/canvas-renderer.ts`) that ports the DOM
    engine's per-frame logic, so what you scrub is what you export.
- **"Customize in playground"** hover action on every gallery clip, deep-linking the
  exact scene into the playground (`/playground/?scene=<id>`). Gallery scenes and
  playground examples are generated from one source (`showcase/scenes.ts`).
- `pnpm playground` (build), `pnpm playground:check` (type-check), and
  `pnpm playground:test` (puppeteer E2E that exports every format and validates each
  with ffprobe).

### Note
- The CLI remains the reference renderer for reproducible, byte-stable output. The
  playground is visually faithful but not byte-identical (browser canvas AA + codec
  bitstreams vary by platform).

## [0.2.1] — 2026-06-12

### Added
- `npm run prepublishOnly` gate (build + tests) so the published tarball is always
  fresh and green.
- Lint validation for numeric `meta` fields (`width`, `height`, `fps`, `fontSize`):
  rejects non-finite / non-positive values and warns on extreme dimensions.
- Structural scene validation at the load boundary, so `compile`/`scrub` fail with a
  clear message instead of a deep TypeError.

### Changed
- `package.json` now declares `repository`, `homepage`, `bugs`, and `author`, and
  ships only `dist/` (fonts are no longer double-packaged from `src/engine`).
- Test files are excluded from the build output and the published package.

### Security
- Escape the window title in the engine before injecting it into the DOM.
- Removed the `?scene=<url>` remote-script loader from the engine (script-injection sink).
- Preview server binds to `127.0.0.1` only and serves fonts through a path-traversal guard.

## [0.2.0] — 2026-06-11

### Added
- Lint gate (`termscene lint`) that `render` runs automatically, refusing on errors.
- Project scaffold (`termscene init`) writing `CLAUDE.md`/`AGENTS.md` + an example scene.
- Offline reference (`termscene docs`).
- Seamless-loop support via `meta.loopOffset`.
- Multi-format output in one render pass (`--also`).
- Splash/landing page, eight brand presets, showcase, and a standalone scrubber.
- Progress bars, vertical alignment, and a workbench scene matrix.

## [0.1.0]

### Added
- Initial release: deterministic mock-terminal video tool with a Claude Code skill.
- Declarative scene format compiled to a flat timeline, rendered frame-by-frame via
  puppeteer-core, encoded to mp4/gif/webm with ffmpeg.
