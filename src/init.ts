import { writeFile, mkdir, access } from "node:fs/promises"
import { join } from "node:path"

// Scaffold a termscene project. The point (borrowed from HyperFrames) is the
// CLAUDE.md/AGENTS.md: the project itself teaches any coding assistant how to
// drive termscene — the rules travel with the repo, not with us.

const CLAUDE_MD = `# termscene project

This project authors **mock terminal videos** with termscene — a designed terminal
you fully control, rendered to deterministic mp4/gif/webm. Not a live recorder.

## Workflow — follow this order

1. **Write a scene** — a \`*.scene.json\` (or .ts/.js): \`{ meta?, steps: [...] }\`.
   Steps run top-to-bottom on a virtual clock; you never write timecodes.
2. **Lint — ALWAYS, after every edit.** \`termscene lint my.scene.json\`
   Fix all errors before continuing. This is a hard gate (render refuses on errors).
3. **Preview** — \`termscene scrub my.scene.json --out preview.html\` (standalone file)
   or \`termscene preview my.scene.json\` (live server). Eyeball pacing before rendering.
4. **Render** — \`termscene render my.scene.json --out my.gif\` (mp4|gif|webm by ext).

## Reference (offline, no network)

\`termscene docs steps | meta | themes | glyphs | render\`

## Key rules

1. Step kinds: \`cmd\` (typed command), \`out\` (output, with style/stream), \`progress\`
   (animated bar), \`wait\`, \`div\`. See \`termscene docs steps\`.
2. **Deterministic only** — the render is a pure function of the timeline. No real
   shell runs; output is whatever you write. Idealize it.
3. **No emoji** — the bundled mono renders emoji (🦀🐍🍺✅) as tofu boxes. Use text
   labels or geometric glyphs (●▸✦⬢→✓). \`lint\` flags violations.
4. Themes: claude · midnight · matrix · paper · gemini · codex · warp · iterm2 ·
   macos · ubuntu · starship. Override any color on \`meta.theme\`.
5. Pick aspect by destination: wide/landscape (README/desktop), square (feed),
   portrait (stories/reels). Use \`meta.loopOffset\` for seamless looping clips.
`

const EXAMPLE = `{
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
`

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/** Write CLAUDE.md, AGENTS.md, and an example scene into `dir`. Skips files that
 *  already exist (never clobbers). Returns the list of files created. */
export async function scaffold(dir: string): Promise<string[]> {
  await mkdir(dir, { recursive: true })
  const files: Array<[string, string]> = [
    ["CLAUDE.md", CLAUDE_MD],
    ["AGENTS.md", CLAUDE_MD], // same guidance, for non-Claude agents
    ["demo.scene.json", EXAMPLE],
  ]
  const created: string[] = []
  for (const [name, content] of files) {
    const p = join(dir, name)
    if (await exists(p)) continue
    await writeFile(p, content)
    created.push(name)
  }
  return created
}
