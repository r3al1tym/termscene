# Changelog

All notable changes to termscene are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
