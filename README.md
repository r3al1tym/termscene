# termscene

[![npm](https://img.shields.io/npm/v/termscene.svg)](https://www.npmjs.com/package/termscene)
[![CI](https://github.com/r3al1tymonster/termscene/actions/workflows/ci.yml/badge.svg)](https://github.com/r3al1tymonster/termscene/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/termscene.svg)](LICENSE)
[![node](https://img.shields.io/node/v/termscene.svg)](package.json)

Show the terminal experience before you build it.

<p align="center">
  <a href="https://r3al1tymonster.github.io/termscene/playground/">
    <img src="https://raw.githubusercontent.com/r3al1tymonster/termscene/main/docs/clips/hero.gif" alt="termscene rendering a scripted Claude Code session into a clean, deterministic terminal clip" width="800">
  </a>
</p>

**[▶ Try it in the browser playground](https://r3al1tymonster.github.io/termscene/playground/)** — author, preview & export a clip with no install · **[Gallery](https://r3al1tymonster.github.io/termscene/#gallery)**

termscene renders a *mock* terminal you fully control. You script the typed
commands and their output in a small declarative file, and it renders to mp4, GIF,
or WebM. The session doesn't have to be real — so you can show an experience that
only exists as an idea: a concept you're pitching, a flow that doesn't exist yet, a
clip for a deck or a post.

It's built for a coding assistant to drive. Describe the terminal experience you
want, and the assistant writes the scene, previews it with you, and renders it. A
[skill](.claude/skills/termscene/SKILL.md) ships in this repo — install it into
Claude Code, Cursor, Codex, and others with `npx skills add r3al1tymonster/termscene`
(or, inside the tool, `termscene skills`).

## How it differs from a recorder

[Charm VHS](https://github.com/charmbracelet/vhs) and asciinema record a *real*
terminal — they run your commands and capture the genuine output. That's the right
tool when authenticity is the point (testing a CLI, documenting real behavior).

termscene is for the other case: terminal *content* you direct. You control the
theme, window chrome, fonts, aspect ratio, and every line of output. No real shell,
no flaky commands, no cleanup. Just the terminal story you want to tell, rendered
the same way every time.

## Install

Run it straight with `npx` (no install), or install globally:

```bash
npx termscene render demo.scene.json --out demo.gif
# or
npm install -g termscene
termscene render demo.scene.json --out demo.gif
```

Needs Chrome/Chromium and ffmpeg available on the machine. termscene auto-detects
Chrome (including puppeteer's cached copy); set `TERMSCENE_CHROME=/path/to/chrome`
to point at a specific binary.

New to it? `termscene init` scaffolds a project with a `CLAUDE.md`/`AGENTS.md` that
teaches a coding agent the workflow, plus an example scene to render — and offers to
install the skill into your agents. Use `--skip-skills` to skip that prompt.

## A scene

A scene is a JSON, TS, or JS file. Steps run top to bottom on a virtual clock — you
never write timecodes.

```json
{
  "meta": {
    "aspect": "wide",
    "theme": { "preset": "claude" },
    "window": { "chrome": "mac", "title": "demo" }
  },
  "steps": [
    { "cmd": "npm install termscene" },
    { "out": "added 1 package in 1.2s", "style": "dim" },
    { "cmd": "termscene render demo.scene.json --out demo.gif" },
    { "out": "wrote demo.gif", "style": "ok" }
  ]
}
```

Step types: `cmd` (typed command + Enter), `out` (one or more output lines, with an
optional `style` and char-by-char `stream`), `wait` (pause), `div` (blank line).
Full field reference is in [the skill](.claude/skills/termscene/SKILL.md).

## Lint

```bash
termscene lint demo.scene.json        # validate before rendering
```

A deterministic quality gate — no LLM. It catches the mistakes you (or an agent)
actually make: unknown presets, glyphs the bundled font can't render, bad timing,
empty scenes. `render` runs it automatically and refuses on errors.

## Render

```bash
termscene render demo.scene.json --out demo.mp4    # also .gif / .webm
termscene render demo.scene.json --out demo.gif --fps 24
termscene render demo.scene.json --out demo.gif --also demo.mp4,demo.webm
```

Format is inferred from the output extension. The render is a pure function of the
timeline, so it's deterministic — frame for frame, every time.

## Preview & iterate

```bash
termscene preview demo.scene.json                  # live server → http://localhost:5180/
termscene scrub demo.scene.json --out preview.html # one standalone file you can share
```

`preview` runs a local scrubber that recompiles on reload — edit the scene, click
reload, watch it. `scrub` bakes the same scrubber into a single self-contained HTML
file you can drop into a PR or hand to someone. Both are where you tune pacing
before rendering.

## Playground (no install)

Don't want to install anything? The
[**playground**](https://r3al1tymonster.github.io/termscene/playground/) runs the
whole loop in your browser — author a scene in a live editor (with the same lint
gate the CLI uses), scrub the timeline on a canvas preview, and export to **mp4,
webm, gif, or png** entirely client-side. No server, no upload; your scene never
leaves the page. Hover any clip in the [gallery](https://r3al1tymonster.github.io/termscene/#gallery)
to open it in the playground and make it yours.

It's great for trying termscene, tweaking a theme, or grabbing a quick clip. For
**reproducible, diffable, byte-stable** renders, use the CLI — that stays the
reference renderer (see below). Video export needs WebCodecs (Chrome/Edge, Safari
16.4+, Firefox 130+); png and gif work everywhere.

## Themes

Eleven built-in looks, each modeled on a terminal your audience recognizes:
`claude`, `midnight`, `matrix`, `paper`, `gemini`, `codex`, `warp`, `iterm2`,
`macos`, `ubuntu`, `starship`. Override any color on `meta.theme`. Window chrome is
`mac`, `plain`, or `none`, and aspect is `wide`, `landscape`, `square`, or
`portrait`.

See the full gallery on the [landing page](https://r3al1tymonster.github.io/termscene/).

## Why "deterministic" matters

The engine renders the whole scene as a pure function of one number — the time `t`.
There's no animation loop and no real clock, so the renderer can ask for any frame
directly and get a perfectly reproducible image. That's what makes the video smooth
and the output stable across machines.

The **CLI** is the reference renderer for this: it screenshots the real DOM engine
in headless Chrome and encodes with a pinned ffmpeg, so the same scene yields the
same frames every run. The **playground** re-draws those frames on a canvas and
encodes with the browser's own codecs — visually faithful, but text anti-aliasing
and codec bitstreams vary by browser/OS, so it's "looks the same," not byte-for-byte
identical. Reach for the CLI when reproducibility matters; the playground when reach
and instant feedback do.

## Using it from a script

termscene is a CLI — there's no published library API. To generate scenes
programmatically, write the scene out as JSON (or a `.ts`/`.js` module that exports
`default`) and shell out to `termscene render`. The scene format is the stable
contract; the internal modules are not.

## License

MIT

