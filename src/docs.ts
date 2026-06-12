// Offline, in-terminal reference (borrowed from HyperFrames' `docs <topic>`). No
// network, no URL-guessing — the agent gets accurate syntax from the installed tool.

export const DOC_TOPICS: Record<string, string> = {
  steps: `STEPS — a scene is { meta?, steps: [...] }, run top-to-bottom on a virtual clock.

  { "cmd": "git push" }                 type a command, then Enter
      prompt?       override the scene prompt for this line
      typeSpeed?    chars/sec for this line (default 22)
      holdBeforeEnter?  seconds to pause after typing before Enter (default 0.4)

  { "out": "done" }  or  { "out": ["a","b"] }   output line(s) after the command
      style?        dim | ok | warn | err | accent
      stream?       seconds — type the output char-by-char (AI/streaming look)
      lineDelay?    seconds between array lines (default 0.12)

  { "progress": "downloading", "duration": 1.4 }   animated bar, fills 0→100%
      style?, width? (chars, default 22), pct? (default true)

  { "wait": 0.6 }    pause the clock (seconds)
  { "div": true }    a blank spacer line

You never write timecodes — the compiler lays them out from the steps.`,

  meta: `META — all optional, sensible defaults.

  aspect      square | landscape | wide | portrait   (or set width/height)
  width,height  explicit pixels
  fps         default 30
  theme       { preset, ...overrides }   see \`docs themes\`
  window      { chrome: mac|plain|none, title }
  align       top | center | bottom   (default bottom; center fills tall frames)
  prompt      default "❯"
  typeSpeed   default 22 chars/sec
  fontSize, lineHeight, lineGap, padding
  marginPad + marginFill   gutter of color around the window (social cards)
  loopOffset  frame number or "25%" — seamless loop entry point for gif/webm`,

  themes: `THEMES — meta.theme.preset, override any color field on top.

  Generic:  claude  midnight  matrix  paper
  Brands:   gemini  codex  warp  iterm2  macos  ubuntu  starship

  Override fields:
    bg fg out dim prompt cursor accent ok warn err
    bar barText barTextStrong windowShadow windowRadius font

  Example: { "preset": "claude", "accent": "#ff0000" }`,

  glyphs: `GLYPHS — the bundled mono forces text-presentation, so EMOJI render as tofu
boxes (🦀 🐍 🍺 ✅). Use instead:
    ●  ▸  ✦  ⬢  →  ✓  ✗  ▔  ░  █   (these render)
Powerline private-use glyphs () are also absent — fake segments with spaces+color.
\`termscene lint\` flags both.`,

  render: `RENDER & PREVIEW

  termscene lint <scene>                 validate (run after every edit; gates render)
  termscene scrub <scene> --out x.html   standalone scrubber file (no server)
  termscene preview <scene>              live scrubber server
  termscene render <scene> --out x.mp4   render (mp4 | gif | webm; inferred from ext)
      --fps N        override framerate
      --also a.gif,b.webm   also encode these from the same capture (one pass)

  Render is a pure function of the timeline — deterministic, frame-for-frame.
  Needs Chrome/Chromium + ffmpeg; set TERMSCENE_CHROME=/path to force a binary.`,
}

export function docs(topic?: string): string {
  if (!topic) {
    return (
      "termscene docs <topic>\n\n  topics: " +
      Object.keys(DOC_TOPICS).join(", ") +
      "\n\n  e.g. termscene docs steps"
    )
  }
  const body = DOC_TOPICS[topic]
  if (!body) {
    return `unknown topic "${topic}" — known: ${Object.keys(DOC_TOPICS).join(", ")}`
  }
  return "\n" + body + "\n"
}
