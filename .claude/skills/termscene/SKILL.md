---
name: termscene
description: Create a polished, deterministic VIDEO or GIF of a terminal experience from a plain-language description. Use when the user wants a terminal demo, CLI walkthrough, README hero GIF, launch/social clip, or "a video of running these commands" — anything showing a terminal in motion. termscene authors a MOCK terminal you fully control (idealized output, custom theme/branding, any aspect ratio) and renders it to crisp mp4/gif/webm. NOT a live-session recorder — use this when you want art direction, perfect output, or commands that needn't actually run.
---

# termscene

Turn a description of a terminal experience into a clean, deterministic video. You
(the assistant) translate the user's intent into a **scene** — a declarative list
of typed commands and output — preview it so the user can iterate, then render.

This is the core loop: **intent → scene → preview & iterate → render**. Do not
skip the preview step unless the user explicitly says "just render it."

## When to use

- "Make a GIF of installing and running my CLI"
- "I need a terminal demo for the README / landing page / launch tweet"
- "Show a video of these git commands"
- Any time the desired artifact is a *terminal in motion*, and the output can be
  idealized/scripted rather than captured from a real run.

If the user wants a recording of a REAL, live session with genuine command output
(e.g. integration-testing a CLI), Charm VHS is the better tool — say so.

## How to author a scene

A scene is a JSON (or TS/JS) file: `{ meta?, steps: [...] }`. Steps run top to
bottom on a virtual clock; you never write timecodes.

Step types:
- `{ "cmd": "git push" }` — types the command, then Enter. Optional `prompt`,
  `typeSpeed` (chars/sec), `holdBeforeEnter`.
- `{ "out": "text" }` or `{ "out": ["line1","line2"] }` — output after the command.
  Optional `style`: `dim | ok | warn | err | accent`. Optional `stream: <seconds>`
  to type the output in char-by-char (AI/streaming look). Optional `lineDelay`.
- `{ "wait": 0.6 }` — pause the clock (seconds).
- `{ "div": true }` — a blank spacer line.

`meta` (all optional, good defaults):
- `aspect`: `square | landscape | wide | portrait` (or set `width`/`height`).
- `theme.preset` — generic: `claude | midnight | matrix | paper`. Brand-recognizable
  terminal looks: `gemini | codex | warp | iterm2 | macos | ubuntu | starship`.
  Override any color via `theme.{bg,fg,prompt,accent,ok,warn,err,...}`.
- `window`: `{ "chrome": "mac" | "plain" | "none", "title": "..." }`.
- `align`: `"top" | "center" | "bottom"` (default bottom — terminal-authentic; use
  `center` on tall/large frames so a short scene fills instead of clinging to the floor).
- `fontSize`, `prompt` (default `❯`), `typeSpeed`, `padding`, `marginPad` +
  `marginFill` (a gutter of color around the window — nice for social cards).

Two more step types beyond `cmd`/`out`/`wait`/`div`:
- `{ "progress": "downloading", "duration": 1.4, "style": "accent" }` — an animated
  bar that fills 0→100% in place (installs, uploads, builds). Optional `width`, `pct`.

### Picking a brand preset
When the user names a terminal/CLI ("make it look like Claude Code / Warp / a Mac
terminal"), use the matching preset. Glyph notes: the engine forces text-presentation,
so language/brand EMOJI (🦀 🐍 🍺) render as tofu — use text labels or geometric
symbols (`●▸✦⬢▔`) instead. Powerline arrows () won't render in the bundled mono.

### Authoring guidance (make it look intentional)
- Keep commands realistic and output plausible — this is a *demo*, fidelity sells it.
- Use `style: "dim"` for noise (install logs), `ok` for success, `accent` for a
  closing value line. Don't color everything.
- Use `stream` on a final tagline or an AI/agent response for life; leave normal
  command output instant.
- Pick aspect by destination: `wide`/`landscape` for README/desktop, `square` for
  LinkedIn/IG feed, `portrait` for stories/reels.
- Default theme is `claude` (warm dark). Use `paper` for light-mode docs pages.

## Workflow

Run termscene from its project dir (or `npx termscene` once published). In dev:
`cd <termscene> && pnpm exec tsx src/cli.ts <command>`.

1. **Write the scene** to a file, e.g. `my-demo.scene.json`, from the user's intent.
2. **Preview — pick one:**
   - *Standalone scrubber* (default; works anywhere, shareable):
     `termscene scrub my-demo.scene.json --out preview.html` → one self-contained
     HTML file (engine + scene + fonts inlined, no server). Open it, drag the
     timeline, space to play. Hand it to the user or drop it in a PR.
   - *Live server* (when iterating fast): `termscene preview my-demo.scene.json` →
     `http://localhost:5180/`; recompiles the scene file on ↻ reload.
   - To QA visually yourself without a browser MCP: render to a few PNG frames
     (`--format frames`) or screenshot the scrubber via headless Chrome, and look.
3. **Render** once they're happy:
   `termscene render my-demo.scene.json --out my-demo.gif`
   (format inferred from extension: `.mp4` `.gif` `.webm`; `--fps` to override).
4. **Report** the output path. Offer a different aspect/format if useful.

## Notes
- Rendering needs Chrome/Chromium + ffmpeg on the machine. termscene auto-detects
  Chrome (incl. puppeteer's cached copy); set `TERMSCENE_CHROME=/path` to force one.
- The render is a pure function of the timeline — fully deterministic and
  reproducible, frame for frame. The `scrub` file is the same engine, so what you
  scrub is exactly what renders.
- See `examples/` for a complete scene; `showcase/scenes.ts` for the 8 brand looks.
