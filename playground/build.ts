// Build the playground into docs/playground/ (deploys to GitHub Pages alongside
// the landing page). Bundles the app + the SHARED portable kernel (compiler,
// themes, lint, types) + mediabunny + gifenc into one ESM file via esbuild.
//
// Also generates playground/src/scenes-data.ts from showcase/scenes.ts so the
// playground's example list and the gallery's deep-link targets are the SAME
// scene definitions — one source of truth, no drift.

import { build } from "esbuild"
import { mkdir, writeFile, copyFile, readdir } from "node:fs/promises"
import { resolve, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { SHOWCASE } from "../showcase/scenes.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const OUT = join(ROOT, "docs", "playground")
const SRC = join(__dirname, "src")

// the "start blank" scene (the Code-first path; no longer the default first screen).
// align:top + a settled opening frame so it never reads as an empty black void.
const STARTER = {
  meta: { aspect: "square", theme: { preset: "claude" }, window: { chrome: "mac", title: "demo" }, align: "top" },
  steps: [
    { cmd: "npm install termscene" },
    { out: "added 1 package in 1.2s", style: "dim" },
    { cmd: "termscene render demo.scene.json --out demo.gif" },
    { out: "wrote demo.gif", style: "ok" },
  ],
}

// ---- JOB-FIRST TEMPLATES (the Composer on-ramp) ----
// Visitors arrive with a JOB, not a terminal preference (composer-ux.md #1). The
// first screen is these, NOT raw JSON. Each carries a `destination` that drives the
// "where's this going?" reframe (sets aspect + the recommended export format).
// Scenes are lifted from design/gallery-scenes (already authored, lint-clean).
const JOB_TEMPLATES: { id: string; name: string; tagline: string; destination: string; scene: any }[] = [
  {
    // Lead with the product demo — it opens on an ASCII-art splash, so it's the most
    // visual on-ramp. The banner is "ANSI Shadow" block-drawing glyphs (U+2588/255x),
    // which the bundled mono renders cleanly (NOT emoji-tofu).
    id: "product-demo",
    name: "Product demo",
    tagline: "An ASCII-splash product boots and nails the task",
    destination: "social",
    scene: {
      meta: { aspect: "square", theme: { preset: "midnight", accent: "#34d399", ok: "#34d399" }, window: { chrome: "mac", title: "atlas — support agent" }, align: "top", prompt: "❯", fontSize: 22, typeSpeed: 46 },
      steps: [
        { out: [
          " █████╗ ████████╗██╗      █████╗ ███████╗",
          "██╔══██╗╚══██╔══╝██║     ██╔══██╗██╔════╝",
          "███████║   ██║   ██║     ███████║███████╗",
          "██╔══██║   ██║   ██║     ██╔══██║╚════██║",
          "██║  ██║   ██║   ███████╗██║  ██║███████║",
          "╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝",
        ], style: "accent", lineDelay: 0.08 },
        { out: "  support agent  ·  v2.4  ·  ready", style: "dim" },
        { div: true },
        { cmd: "atlas \"refund order 80421 and tell the customer why it was late\"" },
        { wait: 0.3 },
        { out: "✦ Pulling the order, the shipment trace, and the refund policy.", style: "dim", stream: 1.4 },
        { out: ["┌─ check ──────────────┬─ result ───────────────────────────", "● order   80421        │  $74.00 · 2 items", "● trace   shipment     │  stuck 3d at MEM hub", "● policy  late_delivery│  eligible · full refund", "└──────────────────────┴────────────────────────────────────"], style: "accent", lineDelay: 0.18 },
        { wait: 0.4 },
        { out: ["Carrier held it 3 days at the Memphis hub — that's on us, so a full", "refund qualifies. Issuing it and drafting the apology now."], stream: 2.0 },
        { out: ["● refund(order 80421)   $74.00 → card ···4417   ✓", "● email(customer)       sent · \"sorry it ran late\""], style: "accent", lineDelay: 0.18 },
        { div: true },
        { out: "✦ Done. Refunded $74.00 and emailed the customer the reason. Avg handle time: 9s.", style: "ok", stream: 1.6 },
      ],
    },
  },
  {
    id: "agent-demo",
    name: "Agent demo",
    tagline: "An AI coding agent finishes a real task",
    destination: "readme",
    scene: {
      meta: { aspect: "square", theme: { preset: "claude" }, window: { chrome: "mac", title: "claude code" }, align: "top", prompt: "❯", fontSize: 24, loopOffset: "80%" },
      steps: [
        { cmd: "fix the failing test in the orders module", typeSpeed: 46 },
        { wait: 0.3 },
        { out: "✻ Thinking… the partial-refund test is red — let me find where the amount is computed.", style: "dim", stream: 1.2 },
        { out: ["● Grep(\"partial_refund\", src/orders/)  3 matches", "● Read(src/orders/refund.py:40-60)", "● Edit(src/orders/refund.py +2 -1)"], style: "accent" },
        { out: "● Bash(pytest tests/test_orders.py -q)", style: "accent" },
        { progress: "running 48 tests", duration: 1.8, style: "accent" },
        { out: "✓ 48 passed in 0.9s", style: "ok" },
        { div: true },
        { out: ["● Fixed. The fee was subtracted after rounding, double-counting it;", "  rounding now happens last. All 48 tests green."], style: "ok", stream: 1.6 },
      ],
    },
  },
  {
    id: "launch-clip",
    name: "Launch clip",
    tagline: "A scroll-stopping deploy → live URL, vertical",
    destination: "story",
    scene: {
      meta: { aspect: "square", theme: { preset: "midnight", accent: "#7c5cff" }, window: { chrome: "mac", title: "shipd" }, align: "center", fontSize: 24, typeSpeed: 40 },
      steps: [
        { cmd: "shipd deploy", holdBeforeEnter: 0.15 },
        { out: "◇ detecting framework... Next.js", style: "dim" },
        { progress: "building", duration: 1.3, style: "accent" },
        { progress: "uploading", duration: 1.1, style: "accent" },
        { out: ["✓ 0 cold starts", "✓ edge in 38 regions"], style: "ok" },
        { div: true },
        { out: "● live → acme.shipd.app", style: "accent", stream: 0.9 },
        { out: "  shipped in 6s.", style: "accent", stream: 0.8 },
        { wait: 1.4 },
      ],
    },
  },
  {
    id: "bug-repro",
    name: "Bug repro",
    tagline: "Paste a failing command + error onto an issue",
    destination: "readme",
    scene: {
      meta: { aspect: "square", theme: { preset: "midnight" }, window: { chrome: "plain", title: "bash — repro" }, align: "top", fontSize: 24, prompt: "$" },
      steps: [
        { cmd: "pytest tests/test_orders.py::test_partial_refund -q" },
        { out: "collected 1 item", style: "dim" },
        { out: ["tests/test_orders.py:48: in test_partial_refund", ">       assert refund.amount == Decimal(\"4.50\")"], style: "dim" },
        { out: "E       assert Decimal('4.99') == Decimal('4.50')", style: "err" },
        { out: ["E        +  where Decimal('4.99') = Refund(line_total=4.99, fee=0.49).amount"], style: "err" },
        { div: true },
        { out: "1 failed in 0.21s", style: "err" },
        { out: "# rounding the fee before the subtraction double-counts it", style: "warn", stream: 0.8 },
      ],
    },
  },
  {
    id: "lesson",
    name: "Teach a command",
    tagline: "A clean before/after for a deck or course",
    destination: "deck",
    scene: {
      meta: { aspect: "square", theme: { preset: "paper" }, window: { chrome: "mac", title: "lesson — git rebase" }, align: "center", fontSize: 24, typeSpeed: 16, marginPad: 56, marginFill: "#e7e2d6" },
      steps: [
        { out: "# replay your commits on top of main — no merge bubble", style: "dim" },
        { wait: 0.5 },
        { cmd: "git rebase main", holdBeforeEnter: 0.5 },
        { out: ["Successfully rebased and updated refs/heads/feature.", ""], style: "ok" },
        { div: true },
        { out: "# now the history is a straight line:", style: "dim" },
        { cmd: "git log --oneline --graph -4", holdBeforeEnter: 0.5 },
        { out: ["* 4a1c9f2  feat: add export button", "* 9c3b1a7  feat: csv writer", "* e7d22f0  chore: deps", "* 1b9f034  (main) docs: readme"], style: "accent" },
        { wait: 1.2 },
      ],
    },
  },
]

async function genScenesData() {
  // a compact index for the gallery swatches + the playground example chips
  const index = SHOWCASE.map((s) => ({
    id: s.id,
    name: s.name,
    blurb: s.blurb,
    sw: (s.scene.meta?.theme && THEME_SW[s.scene.meta.theme.preset as string]) || "#d97757",
    scene: s.scene,
  }))
  // job templates (the on-ramp): expose name/tagline/destination/scene + a swatch
  const jobs = JOB_TEMPLATES.map((j) => ({
    id: j.id,
    name: j.name,
    tagline: j.tagline,
    destination: j.destination,
    sw: (j.scene.meta?.theme && THEME_SW[j.scene.meta.theme.preset as string]) || "#d97757",
    scene: j.scene,
  }))

  const body = `// AUTO-GENERATED by playground/build.ts from showcase/scenes.ts — do not edit.
// One source of truth: the gallery deep-links and the playground examples share these.
import type { Scene } from "../../src/types.js"

export const STARTER = ${JSON.stringify(JSON.stringify(STARTER, null, 2))}

export interface ShowcaseIndexEntry {
  id: string
  name: string
  blurb: string
  sw: string
  scene: Scene
}

// Terminal-LOOK examples — the secondary "style" axis (claude/gemini/warp/…).
export const SHOWCASE_INDEX: ShowcaseIndexEntry[] = ${JSON.stringify(index, null, 2)}

export interface JobTemplate {
  id: string
  name: string
  tagline: string
  /** where's this going? — drives aspect + recommended export format */
  destination: string
  sw: string
  scene: Scene
}

// JOB-FIRST templates — the primary on-ramp shown on first load.
export const JOB_TEMPLATES: JobTemplate[] = ${JSON.stringify(jobs, null, 2)}

// accent color per theme preset — for swatch chips in the structured controls.
export const THEME_ACCENT: Record<string, string> = ${JSON.stringify(THEME_SW, null, 2)}
`
  await writeFile(join(SRC, "scenes-data.ts"), body)
}

// swatch colors per preset (match the gallery in docs/index.html)
const THEME_SW: Record<string, string> = {
  claude: "#d97757",
  gemini: "#a78bfa",
  codex: "#10a37f",
  warp: "#4c8dff",
  iterm2: "#00d7af",
  macos: "#cfcfcf",
  ubuntu: "#8ae234",
  starship: "#88c0d0",
  midnight: "#58a6ff",
  matrix: "#37d837",
  paper: "#a8442a",
  kiro: "#9046ff",
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await mkdir(join(OUT, "fonts"), { recursive: true })

  // 1. generate the shared scenes data
  await genScenesData()

  // 2. copy fonts (same JBM woff2 the engine uses)
  const fontsSrc = join(ROOT, "src", "engine", "fonts")
  for (const f of await readdir(fontsSrc)) {
    if (f.endsWith(".woff2")) await copyFile(join(fontsSrc, f), join(OUT, "fonts", f))
  }

  // 3. copy the static html
  await copyFile(join(__dirname, "index.html"), join(OUT, "index.html"))

  // 4. bundle the app
  const result = await build({
    entryPoints: [join(SRC, "main.ts")],
    bundle: true,
    format: "esm",
    target: "es2022",
    outfile: join(OUT, "playground.js"),
    minify: true,
    // sourcemap on only when DEBUG=1 — the committed/deployed bundle ships without
    // a 1.2MB .map (and no dangling sourceMappingURL 404 on the published site).
    sourcemap: process.env.DEBUG === "1",
    logLevel: "info",
    metafile: true,
  })
  const out = result.metafile?.outputs[join("docs", "playground", "playground.js").replace(/\\/g, "/")]
  if (out) console.log(`bundle: ${(out.bytes / 1024).toFixed(0)} KB`)
  console.log(`playground → ${OUT}`)
}

main().catch((e) => {
  console.error("playground build error:", e)
  process.exit(1)
})
