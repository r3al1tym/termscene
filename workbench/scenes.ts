import type { Scene } from "../src/types.js"

// Workbench scene matrix — each entry pressure-tests a different axis of termscene:
// theme, aspect, window chrome, prompt glyph, progress bars, streaming, long-output
// scrolling, error/success coloring, and realistic terminal genres. The gallery
// builder (build.ts) renders every one and assembles a single review page.

export interface WorkbenchScene {
  id: string
  title: string
  tests: string // what dimension this scene is exercising
  scene: Scene
}

export const SCENES: WorkbenchScene[] = [
  // ---- 1. npm install + animated progress, wide, claude theme ----
  {
    id: "npm-install",
    title: "npm install",
    tests: "progress bars · dim noise · ok result · wide · claude",
    scene: {
      meta: { aspect: "wide", theme: { preset: "claude" }, window: { chrome: "mac", title: "zsh" }, fontSize: 26 },
      steps: [
        { cmd: "pnpm add termscene" },
        { out: "Resolving dependencies...", style: "dim" },
        { progress: "downloading", duration: 1.4, style: "accent" },
        { progress: "linking    ", duration: 0.9, style: "accent" },
        { out: ["+ termscene 0.1.0", "+ puppeteer-core 23.11.1"], style: "dim" },
        { out: "Done in 3.1s", style: "ok" },
      ],
    },
  },

  // ---- 2. git workflow, classic $ prompt, plain chrome, midnight ----
  {
    id: "git-flow",
    title: "git push",
    tests: "classic $ prompt · plain chrome · midnight · multi-line dim output",
    scene: {
      meta: { aspect: "wide", theme: { preset: "midnight" }, window: { chrome: "plain", title: "bash — project" }, prompt: "$", fontSize: 25 },
      steps: [
        { cmd: "git add -A && git commit -m 'feat: ship it'" },
        { out: ["[main 3f9a1c2] feat: ship it", " 4 files changed, 187 insertions(+), 12 deletions(-)"], style: "dim" },
        { cmd: "git push origin main" },
        { out: ["Enumerating objects: 14, done.", "Counting objects: 100% (14/14), done.", "Writing objects: 100% (8/8), 2.1 KiB"], style: "dim" },
        { out: "To github.com:acme/project.git", style: "dim" },
        { out: "   3f9a1c2..a1b2c3d  main -> main", style: "ok" },
      ],
    },
  },

  // ---- 3. AI coding agent, square, streaming responses, ➜ prompt ----
  {
    id: "agent-session",
    title: "coding agent",
    tests: "streaming responses · accent tool lines · square · long scroll",
    scene: {
      meta: { aspect: "square", theme: { preset: "claude" }, window: { chrome: "mac", title: "claude code" }, prompt: "❯", fontSize: 27 },
      steps: [
        { cmd: "add rate limiting to the API" },
        { wait: 0.3 },
        { out: "Looking at the route handlers and the existing middleware stack.", style: "dim", stream: 1.4 },
        { out: "● Read(src/server/routes.ts)", style: "accent" },
        { out: "● Read(src/middleware/index.ts)", style: "accent" },
        { wait: 0.3 },
        { out: "I'll add a token-bucket limiter as middleware — 100 req/min per IP, with a Retry-After header on 429.", stream: 2.0 },
        { out: "● Write(src/middleware/rateLimit.ts)  +38", style: "accent" },
        { out: "● Edit(src/server/index.ts)  +2", style: "accent" },
        { out: "● Bash(pnpm test rate)", style: "accent" },
        { out: "✓ 6 passed", style: "ok" },
        { wait: 0.4 },
        { out: "Done — limiter is wired in before the route stack. Tests cover the 429 path and the header.", style: "ok", stream: 1.6 },
      ],
    },
  },

  // ---- 4. docker build, error → fix, warn + err coloring ----
  {
    id: "docker-error",
    title: "build → error → fix",
    tests: "err + warn styles · failure then recovery · landscape",
    scene: {
      meta: { aspect: "landscape", theme: { preset: "midnight" }, window: { chrome: "mac", title: "docker build" }, prompt: "➜", fontSize: 24 },
      steps: [
        { cmd: "docker build -t app:latest ." },
        { out: ["[+] Building 12.4s (8/11)", " => [internal] load build definition", " => [4/7] RUN npm ci"], style: "dim" },
        { out: "ERROR: failed to solve: process \"/bin/sh -c npm ci\" exited with code 1", style: "err" },
        { out: "npm ERR! lockfile version mismatch", style: "warn" },
        { wait: 0.4 },
        { cmd: "npm install --package-lock-only && docker build -t app:latest ." },
        { out: ["[+] Building 18.7s (11/11) FINISHED"], style: "dim" },
        { out: "=> => naming to docker.io/library/app:latest", style: "ok" },
      ],
    },
  },

  // ---- 5. matrix theme, no chrome, full-bleed hacker aesthetic ----
  {
    id: "matrix-scan",
    title: "matrix / no chrome",
    tests: "matrix theme · chrome:none · full-bleed · long scrolling output",
    scene: {
      meta: { aspect: "wide", theme: { preset: "matrix" }, window: { chrome: "none" }, prompt: "root@node:~#", fontSize: 22, padding: 48 },
      steps: [
        { cmd: "nmap -sV 10.0.0.0/24" },
        { out: ["Starting Nmap 7.94 ( https://nmap.org )", "Nmap scan report for 10.0.0.1", "Host is up (0.0021s latency)."], style: "dim" },
        { progress: "scanning ports", duration: 1.6, style: "ok" },
        { out: ["PORT     STATE  SERVICE     VERSION", "22/tcp   open   ssh         OpenSSH 9.6", "80/tcp   open   http        nginx 1.25.3", "443/tcp  open   ssl/http    nginx 1.25.3", "5432/tcp open   postgresql  PostgreSQL 16.1"] },
        { out: "Nmap done: 256 IP addresses (3 hosts up) scanned in 8.42s", style: "ok" },
      ],
    },
  },

  // ---- 6. paper (light) theme, docs aesthetic, portrait ----
  {
    id: "paper-quickstart",
    title: "paper / portrait",
    tests: "paper light theme · portrait 9:16 · margin fill · docs feel",
    scene: {
      meta: { aspect: "portrait", theme: { preset: "paper" }, window: { chrome: "mac", title: "quickstart" }, prompt: "❯", fontSize: 30, marginPad: 60, marginFill: "#e7e2d6" },
      steps: [
        { cmd: "npx create-app my-site" },
        { progress: "scaffolding", duration: 1.2, style: "accent" },
        { out: ["✓ created my-site/", "✓ installed dependencies"], style: "ok" },
        { cmd: "cd my-site && npm run dev" },
        { out: ["", "  Local:   http://localhost:3000", "  ready in 412ms"], style: "dim" },
        { out: "open the URL — you're live", style: "accent", stream: 1.4 },
      ],
    },
  },

  // ---- 7. custom theme override (not a preset), long single command ----
  {
    id: "custom-theme",
    title: "custom theme",
    tests: "explicit color overrides · long command wrap · square · marginFill card",
    scene: {
      meta: {
        aspect: "square",
        theme: { preset: "claude", bg: "#0f1420", fg: "#cdd6f4", prompt: "#89b4fa", accent: "#f5c2e7", ok: "#a6e3a1", bar: "#181f30", barText: "#6c7086" },
        window: { chrome: "mac", title: "deploy" },
        prompt: "❯", fontSize: 26, marginPad: 44, marginFill: "#0a0e16",
      },
      steps: [
        { cmd: "aws cloudformation deploy --template infra.yml --stack-name prod --capabilities CAPABILITY_IAM" },
        { wait: 0.3 },
        { progress: "creating change set", duration: 1.3, style: "accent" },
        { progress: "applying          ", duration: 1.8, style: "accent" },
        { out: ["Successfully created/updated stack - prod"], style: "ok" },
        { out: "23 resources · 0 errors", style: "dim" },
      ],
    },
  },

  // ---- 8b. centered alignment on a large frame (the void-fill fix) ----
  {
    id: "centered",
    title: "centered align",
    tests: "align:center · landscape · short scene fills the frame instead of bottom-anchoring",
    scene: {
      meta: { aspect: "landscape", theme: { preset: "claude" }, window: { chrome: "mac", title: "release" }, align: "center", prompt: "❯", fontSize: 30 },
      steps: [
        { cmd: "npm publish --access public" },
        { progress: "uploading", duration: 1.4, style: "accent" },
        { out: "+ termscene@0.1.0", style: "ok" },
        { wait: 0.3 },
        { out: "shipped.", style: "accent", stream: 0.8 },
      ],
    },
  },

  // ---- 9. rapid-fire typing, fast pace, terse — tests timing extremes ----
  {
    id: "fast-pace",
    title: "fast pace",
    tests: "fast typeSpeed · short holds · terse cadence · wide",
    scene: {
      meta: { aspect: "wide", theme: { preset: "claude" }, window: { chrome: "mac", title: "demo" }, prompt: "❯", fontSize: 28, typeSpeed: 40 },
      steps: [
        { cmd: "ls", holdBeforeEnter: 0.15 },
        { out: "src  dist  package.json  README.md", style: "dim" },
        { cmd: "cat package.json | jq .version", holdBeforeEnter: 0.15 },
        { out: "\"0.1.0\"", style: "ok" },
        { cmd: "npm test", holdBeforeEnter: 0.15 },
        { out: "✓ 24 passed (1.2s)", style: "ok" },
      ],
    },
  },
]
