import { writeFile, mkdir, access } from "node:fs/promises"
import { join } from "node:path"
import { spawn, execFileSync } from "node:child_process"
import { createInterface } from "node:readline"

// The repo that hosts the termscene skill. The `skills` CLI (vercel-labs/skills)
// git-clones this and installs the SKILL.md it finds into the user's agent dirs
// (.claude/skills, .cursor, .codex, …). Hardcoded — no user input reaches the spawn.
const SKILL_REPO = "r3al1tymonster/termscene"

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

For a richer, always-loaded guide, install the termscene skill into your agent:
\`termscene skills\` (or \`npx skills add ${SKILL_REPO}\`).

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

function hasNpx(): boolean {
  try {
    execFileSync("npx", ["--version"], { stdio: "ignore", timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/** Install the termscene skill into the user's AI coding agents via the `skills`
 *  CLI (`npx skills add <repo> --all`). Mirrors HyperFrames: the skill lives in
 *  the repo, the community CLI does the cloning + per-agent install. Returns true
 *  on success. Never throws — a missing/declined install is non-fatal. */
export async function installSkill(): Promise<boolean> {
  if (!hasNpx()) {
    console.error("npx not found — install Node.js, then run: npx skills add " + SKILL_REPO)
    return false
  }
  console.log(`\ninstalling the termscene skill (npx skills add ${SKILL_REPO}) …\n`)
  return new Promise((resolve) => {
    const child = spawn("npx", ["skills", "add", SKILL_REPO, "--all"], {
      stdio: "inherit",
      // The upstream `skills` CLI shells out to `git clone`. Git's clone-hook
      // protection (default-on in 2.45.1, still present on many CI/corp setups)
      // can abort the clone via a global lfs post-checkout hook. The repo is
      // hardcoded above — no user input reaches the spawn — so opting out is safe.
      env: { ...process.env, GIT_CLONE_PROTECTION_ACTIVE: "0" },
    })
    child.on("close", (code) => resolve(code === 0))
    child.on("error", () => {
      console.error(`skill install skipped — run it later: npx skills add ${SKILL_REPO}`)
      resolve(false)
    })
  })
}

/** Yes/no prompt on an interactive TTY. On non-interactive stdin (CI, agents,
 *  pipes) returns false without prompting — we never fire a network git-clone
 *  unprompted. `def` is the default for empty input at an interactive prompt. */
export async function confirm(question: string, def = true): Promise<boolean> {
  if (!process.stdin.isTTY) return false
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const hint = def ? "Y/n" : "y/N"
  const answer = await new Promise<string>((res) => rl.question(`${question} (${hint}) `, res))
  rl.close()
  const a = answer.trim().toLowerCase()
  if (!a) return def
  return a === "y" || a === "yes"
}
