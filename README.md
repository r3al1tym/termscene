# termscene

Show the terminal experience before you build it.

termscene renders a *mock* terminal you fully control. You script the typed
commands and their output in a small declarative file, and it renders to mp4, GIF,
or WebM. The session doesn't have to be real — so you can show an experience that
only exists as an idea: a concept you're pitching, a flow that doesn't exist yet, a
clip for a deck or a post.

It's built for a coding assistant to drive. Describe the terminal experience you
want, and the assistant writes the scene, previews it with you, and renders it. A
[Claude Code skill](.claude/skills/termscene/SKILL.md) ships in this repo.

## How it differs from a recorder

[Charm VHS](https://github.com/charmbracelet/vhs) and asciinema record a *real*
terminal — they run your commands and capture the genuine output. That's the right
tool when authenticity is the point (testing a CLI, documenting real behavior).

termscene is for the other case: terminal *content* you direct. You control the
theme, window chrome, fonts, aspect ratio, and every line of output. No real shell,
no flaky commands, no cleanup. Just the terminal story you want to tell, rendered
the same way every time.

## Install

```bash
npm install termscene        # or pnpm add termscene
```

Then render a scene:

```bash
npx termscene render demo.scene.json --out demo.gif
```

Needs Chrome/Chromium and ffmpeg available on the machine. termscene auto-detects
Chrome (including puppeteer's cached copy); set `TERMSCENE_CHROME=/path/to/chrome`
to point at a specific binary.

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

## Render

```bash
termscene render demo.scene.json --out demo.mp4    # also .gif / .webm
termscene render demo.scene.json --out demo.gif --fps 24
```

Format is inferred from the output extension. The render is a pure function of the
timeline, so it's deterministic — frame for frame, every time.

## Preview & iterate

```bash
termscene preview demo.scene.json     # → http://localhost:5180/
```

A scrubber to play the scene, drag the timeline, and reload after you edit the
file. This is where you and the assistant tune pacing before rendering.

## Themes

`claude` (warm dark), `midnight` (cool dark), `matrix` (green), `paper` (light).
Override any color on `meta.theme`. Window chrome is `mac`, `plain`, or `none`.

## Why "deterministic" matters

The engine renders the whole scene as a pure function of one number — the time `t`.
There's no animation loop and no real clock, so the renderer can ask for any frame
directly and get a perfectly reproducible image. That's what makes the video smooth
and the output stable across machines.

## License

MIT
