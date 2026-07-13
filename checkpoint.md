# Checkpoint — termscene Composer

> Handoff note to pick this up in a fresh session. Updated 2026-06-14.
> Delete or rewrite freely — a working pointer, not a doc of record.

## What this is
termscene renders scripted terminal sessions into clean, deterministic clips (mp4/gif/webm/png).
The **Composer** is its browser authoring UI — a minimal, lines-first compose experience for
non-power-users (power users author via the agent/skill instead). Entry points:
- Behavior: `playground/src/main.ts` (the whole authoring UI)
- Layout/CSS: `playground/index.html`
- Shared kernel (used by CLI too): `src/compiler.ts`, `src/lint.ts`, `src/themes.ts`, `src/types.ts`

## Current focus
The Composer rebuild is **complete, committed, and deployed live**. No work in flight.

## Decisions locked this session (do NOT relitigate)
- **Lines-only editing.** The preview canvas is read-only; you author via the line rows on the
  left. Raw JSON is behind a progressive-disclosure code toggle. No inline canvas editing.
- **Compact single-line rows.** Tuned for the 8–13-step scenes the templates produce — a typical
  scene fits without scrolling. Secondary controls (style/duration) disclose on hover/focus only.
- **Syntax-highlighted JSON = zero-dep overlay**, NOT CodeMirror. A colored `<pre>` (`#hl`) sits
  behind a transparent-text `<textarea>` (`#editor`); they share identical box metrics so the
  caret/selection/tokens align. Chosen to keep the esbuild bundle lean (~259KB) and preserve the
  existing textarea hooks (jumpToStep, gutter, e2e). They MUST stay on one shared `white-space:pre`
  metric — do not reintroduce a mobile `pre-wrap` override on `#editor` alone (it desyncs the caret).
- **Icons = Lucide, inlined as SVG** (no runtime dep). Registry `ICONS` + `ic()` helper in main.ts
  for JS-rendered icons; static `<svg class="ic">` in index.html for static chrome. Stroke icons
  inherit currentColor via `.ic`; brand marks use `.ic-brand` (filled). GitHub uses the filled
  brand mark (NOT a lucide icon — lucide dropped brand icons; path is the canonical simple-icons one).
- **Export is the primary CTA** (split-button, MP4 default) top-right; **Share is a secondary button
  directly before it**; GitHub is an icon-only link. No `↗` text arrows.
- **Drag-reorder index math lives in `playground/src/reorder.ts`** (pure, unit-tested). The drop
  indicator sits at the row's TOP edge ("land above this row"), so downward moves resolve to `to-1`
  (`reorderDest`). Don't "simplify" back to a raw `splice(to)` — that reintroduces the off-by-one.
- **Bad raw-JSON input must never throw the renderer.** Non-string cmd/out/progress are BOTH a lint
  error AND coerced to string in the compiler. Two layers on purpose (lint = user-facing, compiler =
  protects CLI + renderer).
- `clod-fable.scene.json` at repo root is an unreferenced scratch file — intentionally left untracked,
  not part of this work.

## State of the tree
- Branch `main`, **clean** — all work committed in **`7bead93`** ("playground: rebuild the playground
  into a minimal Composer") and **pushed**.
- **Deployed live**: GitHub Pages serves `main:/docs` → https://r3al1tym.github.io/termscene/playground/
  (verified the live bundle carries the new icon system). `docs/playground/` is generated build output
  (committed because Pages serves it).
- Only untracked file: `clod-fable.scene.json` (scratch, ignore).

## How to resume
1. `cd /home/sunsanju/projects/termscene`
2. Read first: `playground/src/main.ts` (top comment explains the editing model), then
   `playground/index.html` for layout/CSS.
3. Local preview (already running at http://localhost:8799/playground/ via `python3 -m http.server 8799`
   in `docs/`). After editing source you MUST rebuild: `pnpm playground` (esbuild bundles
   `playground/src/main.ts` → `docs/playground/playground.js` and copies the HTML). Then hard-refresh.
4. Gates before shipping:
   - `pnpm playground:check` — typecheck the playground
   - `pnpm test` — unit (24 tests incl. `reorder.test.ts`)
   - `pnpm playground:test` — browser export e2e (png/mp4/webm/gif via puppeteer)
   - Functional puppeteer harness: `/tmp/ts-composer-verify.mjs` (28 checks — boot, Customize popover,
     compact rows, JSON highlight, all the review fixes, icons). Run `node /tmp/ts-composer-verify.mjs`.
   - Screenshots land in `~/.cache/ts-shots/` (latest: `v5-icons.png`).
5. Deploy = commit + push to `main` (Pages auto-rebuilds `/docs`). Confirm with
   `gh api repos/r3al1tym/termscene/pages/builds/latest`.

## Open / next steps
- Nothing required. Candidate polish if revisited:
  - Per-row insert **button** for touch devices. The insert-between hairline cue + hover pill covers
    desktop discovery; touch currently relies on append + drag-reorder (hover is unreachable on touch).
  - The 8 adversarial-UX-review findings from this session were all fixed; a fresh review could be
    re-run against the live build if desired.
- The big checklist of the original rebuild lives in `playground/COMPOSER-CHECKLIST.md` (all boxes
  checked) — historical reference, not active work.
