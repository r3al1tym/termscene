import type { Scene } from "../src/types.js"

// The 8 terminals showcased on the splash page. Each scene is scripted to sell
// that terminal's signature look in one short loop. Order = gallery wall order.
// (Curated with Fable: variety, instant recognition, "I want that".)

export interface ShowcaseScene {
  id: string
  name: string // display name on the card
  blurb: string // one-line default-style description
  scene: Scene
}

const wide = { aspect: "wide" as const, fontSize: 24 }

export const SHOWCASE: ShowcaseScene[] = [
  // 1. Claude Code — warm dark, terracotta ❯, ✻ thinking, ● tool calls
  {
    id: "claude-code",
    name: "Claude Code",
    blurb: "warm dark · terracotta ❯ · ✻ thinking lines · ● tool calls",
    scene: {
      meta: { ...wide, theme: { preset: "claude" }, window: { chrome: "mac", title: "claude code" }, prompt: "❯" },
      steps: [
        { cmd: "add a /health endpoint" },
        { wait: 0.3 },
        { out: "✻ Thinking… I'll add a route returning status + uptime.", style: "dim", stream: 1.3 },
        { out: "● Read(src/server.ts)", style: "accent" },
        { out: "● Edit(src/server.ts)  +9", style: "accent" },
        { out: "● Bash(curl localhost:3000/health)", style: "accent" },
        { out: "{ \"status\": \"ok\", \"uptime\": 12.4 }", style: "ok" },
        { wait: 0.3 },
        { out: "Added — /health returns status and uptime.", style: "ok", stream: 1.2 },
      ],
    },
  },

  // 2. Gemini CLI — gradient logo bloom, sparkle accents
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    blurb: "dark slate · blue→violet gradient logo · ✦ sparkle accents",
    scene: {
      meta: { ...wide, theme: { preset: "gemini" }, window: { chrome: "mac", title: "gemini" }, prompt: ">" },
      steps: [
        { out: ["  ✦ ✦ ✦   G E M I N I", "  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  cli"], style: "accent", stream: 1.2 },
        { div: true },
        { cmd: "explain this regex /\\b\\d{3}-\\d{4}\\b/" },
        { wait: 0.3 },
        { out: "✦ It matches a 7-digit phone number: three digits, a hyphen, four digits, on word boundaries.", stream: 2.0 },
        { out: "✦ Tip: add \\d{3}[-.] for area codes.", style: "accent", stream: 1.1 },
      ],
    },
  },

  // 3. OpenAI Codex CLI — minimal, sparse, green/white
  {
    id: "codex-cli",
    name: "Codex CLI",
    blurb: "near-black · sparse green/white · › prompt · minimal chrome",
    scene: {
      meta: { ...wide, theme: { preset: "codex" }, window: { chrome: "mac", title: "codex" }, prompt: "›" },
      steps: [
        { cmd: "fix the failing test in cart.test.ts" },
        { wait: 0.4 },
        { out: "patching cart.ts — total() ignored discounts", style: "dim" },
        { out: "● apply patch  +4 −2", style: "ok" },
        { out: "npm test cart", style: "dim" },
        { out: "PASS  cart.test.ts (6 tests)", style: "ok" },
      ],
    },
  },

  // 4. Warp — block-based output, blue accent, rounded
  {
    id: "warp",
    name: "Warp",
    blurb: "dark · rounded block output · blue accent · modern GUI terminal",
    scene: {
      meta: { ...wide, theme: { preset: "warp" }, window: { chrome: "mac", title: "warp — ~/app" }, prompt: "❯" },
      steps: [
        { cmd: "pnpm build" },
        { progress: "compiling", duration: 1.4, style: "accent" },
        { out: ["▸ tsc      done in 2.1s", "▸ bundle   done in 0.8s", "▸ assets   copied"], style: "dim" },
        { out: "build succeeded · 3.0s", style: "ok" },
      ],
    },
  },

  // 5. iTerm2 + Powerlevel10k — powerline segments, two-line git prompt
  {
    id: "iterm2-p10k",
    name: "iTerm2 · Powerlevel10k",
    blurb: "dark · powerline segments · two-line git prompt",
    scene: {
      meta: { ...wide, theme: { preset: "iterm2" }, window: { chrome: "mac", title: "iTerm2" }, prompt: "❯" },
      steps: [
        { out: " ~/app   main ✔   v20.11 ", style: "accent" },
        { cmd: "git checkout -b feat/login" },
        { out: "Switched to a new branch 'feat/login'", style: "dim" },
        { out: " ~/app   feat/login ✚2   v20.11 ", style: "accent" },
        { cmd: "git commit -am 'add login form'" },
        { out: "[feat/login 9c1f2a0] add login form", style: "ok" },
      ],
    },
  },

  // 6. macOS Terminal (zsh) — white, unstyled, % prompt
  {
    id: "macos-zsh",
    name: "macOS Terminal",
    blurb: "white bg · black SF Mono · user dir % · the everyman shell",
    scene: {
      meta: { ...wide, theme: { preset: "macos" }, window: { chrome: "mac", title: "zsh — 80×24" }, prompt: "sanju@mac ~ %" },
      steps: [
        { cmd: "brew install jq", typeSpeed: 30 },
        { out: ["==> Downloading https://formulae.brew.sh/jq", "==> Pouring jq--1.7.1.arm64.bottle.tar.gz"], style: "dim" },
        { out: "==> /opt/homebrew/Cellar/jq/1.7.1: 18 files, 2.1MB", style: "dim" },
        { cmd: "jq --version", typeSpeed: 30 },
        { out: "jq-1.7.1" },
      ],
    },
  },

  // 7. Ubuntu GNOME Terminal — aubergine, green user@host
  {
    id: "ubuntu-bash",
    name: "Ubuntu Terminal",
    blurb: "aubergine #300a24 · green user@host · $ prompt · peak Linux",
    scene: {
      meta: { ...wide, theme: { preset: "ubuntu" }, window: { chrome: "plain", title: "sanju@ubuntu: ~" }, prompt: "sanju@ubuntu:~$" },
      steps: [
        { cmd: "sudo apt update", typeSpeed: 28 },
        { out: ["Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease", "Reading package lists... Done"], style: "dim" },
        { out: "12 packages can be upgraded.", style: "warn" },
        { cmd: "sudo apt upgrade -y", typeSpeed: 28 },
        { progress: "unpacking", duration: 1.3, style: "ok" },
        { out: "Setting up... done.", style: "ok" },
      ],
    },
  },

  // 8. Starship — segmented multicolor cross-shell prompt morphing by repo
  {
    id: "starship",
    name: "Starship",
    blurb: "segmented multicolor prompt · morphs per language/repo",
    scene: {
      meta: { ...wide, theme: { preset: "starship" }, window: { chrome: "mac", title: "starship" }, prompt: "❯" },
      steps: [
        { out: " ~/rust-svc   main   rust v1.78 ", style: "accent" },
        { cmd: "cd ../node-api" },
        { out: " ~/node-api   main   ⬢ node v20.11 ", style: "ok" },
        { cmd: "cd ../py-worker" },
        { out: " ~/py-worker   main   py v3.12 ", style: "warn" },
        { wait: 0.3 },
        { out: "one prompt, every stack.", style: "accent", stream: 1.0 },
      ],
    },
  },
]
