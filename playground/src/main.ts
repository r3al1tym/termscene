// termscene Composer — compose a terminal clip line by line, pick a look, export.
//
// Reuses the SAME portable kernel as the CLI (compiler, themes, lint, types) so the
// Composer and the CLI never drift on how scenes compile, lint, or theme. The only
// new code is the canvas renderer (engine.html port) + the client exporter + this
// authoring UI (template picker, line editor, command bar, autosave/share).
//
// Editing model: lines ONLY. The preview is read-only; you author by editing the
// line rows on the left (drag to reorder, insert between, change kind/style). Raw
// JSON is available behind a progressive-disclosure ‹/› toggle.

import { compile } from "../../src/compiler.js"
import { lint, summarize, type LintFinding } from "../../src/lint.js"
import { THEMES, ASPECTS } from "../../src/themes.js"
import type { Scene, CompiledScene } from "../../src/types.js"
import { parseScene, SceneParseError } from "./validate.js"
import { drawFrame } from "./canvas-renderer.js"
import {
  exportVideo,
  exportGif,
  exportPng,
  download,
  canExport,
  ExportUnsupportedError,
  type ExportFormat,
} from "./export.js"
import { STARTER, SHOWCASE_INDEX, JOB_TEMPLATES, THEME_ACCENT } from "./scenes-data.js"
import { reorderDest } from "./reorder.js"

// ---- icons (Lucide, inlined — no runtime dependency) ----
// inner markup only; `ic()` wraps it in a sized <svg>. Keep these in sync with the
// static SVGs in index.html (same icon set, same stroke conventions).
const ICONS: Record<string, string> = {
  grip: `<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>`,
  x: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
  plus: `<path d="M5 12h14"/><path d="M12 5v14"/>`,
  minus: `<path d="M5 12h14"/>`,
  play: `<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>`,
  pause: `<rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/>`,
  timer: `<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>`,
  chevronsRight: `<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>`,
}
/** Inline a Lucide icon as an SVG string. `sz` in px (default 15). */
function ic(name: keyof typeof ICONS, sz = 15, cls = ""): string {
  return `<svg class="ic ${cls}" style="--sz:${sz}px" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`
}

// ---- DOM refs ----
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const editor = $<HTMLTextAreaElement>("editor")
const canvas = $<HTMLCanvasElement>("stage")
const ctx = canvas.getContext("2d")!
const scrub = $<HTMLInputElement>("scrub")
const playBtn = $<HTMLButtonElement>("play")
const timeEl = $("time")
const lintEl = $("lint")
const statusEl = $("status")
const progressBar = $("progressbar")
const progressFill = $("progressfill")
const progressLabel = $("progresslabel")
const linesEl = $("lines")
const lineCountEl = $("lineCount")
const pauseChip = $("pausechip")
const emptyHint = $("emptyhint")
const pickerEl = $("picker")
const jobsEl = $("jobs")
const webcodecsNote = $("webcodecsNote")
const gutterEl = $("gutter")
const hlEl = $("hl")
const scrubTicks = $("scrubticks")
const leftCol = $("leftcol")
const codepane = $("codepane")
// export split-button
const exportGo = $<HTMLButtonElement>("exportGo")
const exportCaret = $<HTMLButtonElement>("exportCaret")
const exportMenu = $("exportMenu")
const exportFmtLabel = $("exportFmtLabel")

// ---- state ----
let scene: Scene | null = null
let compiled: CompiledScene | null = null
let lastGoodCompiled: CompiledScene | null = null
let t = 0
let playing = false
let raf = 0
let last = 0
let exportEpoch = 0
let previewMode: "compose" | "play" = "compose"
let codeOpen = false
let hasError = false
let saveTimer = 0
let exportFmt: ExportFormat = "mp4" // primary CTA default
let selStep = -1 // selected line index (for keyboard/focus context)

// ---- aspect options (everything defaults to square) ----
const ASPECT_OPTS: { id: keyof typeof ASPECTS; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "wide", label: "Wide 16:9" },
  { id: "landscape", label: "Landscape" },
  { id: "portrait", label: "Vertical 9:16" },
]
const CHROME_OPTS: { id: string; label: string }[] = [
  { id: "mac", label: "macOS" },
  { id: "plain", label: "Plain" },
  { id: "none", label: "None" },
]
const FORMATS: { fmt: ExportFormat; use: string }[] = [
  { fmt: "mp4", use: "social / X / LinkedIn" },
  { fmt: "gif", use: "README hero loop" },
  { fmt: "webm", use: "web embed" },
  { fmt: "png", use: "slide still" },
]

// ---- font loading ----
async function loadFonts(): Promise<boolean> {
  const faces = [
    new FontFace("JBM", "url(fonts/jbm-Regular.woff2)", { weight: "400" }),
    new FontFace("JBM", "url(fonts/jbm-Bold.woff2)", { weight: "700" }),
    new FontFace("JBM", "url(fonts/jbm-Italic.woff2)", { style: "italic" }),
    // technical-glyph fallback (braille, ⎿, ✻ ✦ ↳, box/block) — see engine.html
    new FontFace("TSSym", "url(fonts/symbols-Regular.woff2)", {}),
  ]
  const results = await Promise.all(
    faces.map((f) => f.load().then((ff) => { (document as any).fonts.add(ff); return true }).catch(() => false)),
  )
  return results.every(Boolean)
}

// ============================================================
// compile pipeline
// ============================================================
function recompile() {
  const text = editor.value
  let parsed: Scene
  try {
    parsed = parseScene(text)
  } catch (e: any) {
    failCompile([friendlyParseFinding(e, text)], true)
    return
  }
  scene = parsed
  try {
    const findings = lint(parsed)
    const { errors } = summarize(findings)
    setLint(findings, false)
    compiled = compile(parsed)
    lastGoodCompiled = compiled
    if (errors > 0) { disableExport("scene"); clearError() }
    else { enableExport(); clearError() }
  } catch (e: any) {
    failCompile([{ level: "error", step: null, code: "compile", message: e.message }], false)
    return
  }
  canvas.width = compiled.meta.width
  canvas.height = compiled.meta.height
  fitCanvas()
  scrub.max = String(Math.max(0.001, compiled.duration))
  if (t > compiled.duration) t = compiled.duration
  syncCmdBar()
  // soft re-entry (typing into a line input): DON'T rebuild the rows or we'd yank
  // focus mid-keystroke. The edited input already holds the right value.
  if (!softReentry) syncLines()
  updateGutter()
  renderTicks()
  autosave()
  renderCurrent()
}

function updateGutter() {
  const n = editor.value.split("\n").length
  let s = ""
  for (let i = 1; i <= n; i++) s += i + "\n"
  gutterEl.textContent = s
  paintHighlight()
  syncEditorScroll()
}
function syncEditorScroll() {
  gutterEl.scrollTop = editor.scrollTop
  hlEl.scrollTop = editor.scrollTop
  hlEl.scrollLeft = editor.scrollLeft
}
/** Tokenize JSON into colored spans for the overlay. Pure string scan (no parse),
 *  so it highlights even while the text is mid-edit and not yet valid JSON. */
const HL_RE = /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],:])/g
function paintHighlight() {
  const src = editor.value
  let out = "", last = 0, m: RegExpExecArray | null
  HL_RE.lastIndex = 0
  while ((m = HL_RE.exec(src))) {
    if (m.index > last) out += escapeHtml(src.slice(last, m.index))
    const cls = m[1] ? "tk" : m[2] ? "ts" : m[3] ? "tn" : m[4] ? "tb" : "tp"
    out += `<span class="${cls}">${escapeHtml(m[0])}</span>`
    last = m.index + m[0].length
  }
  out += escapeHtml(src.slice(last))
  // trailing newline so the overlay's last line height matches the textarea
  hlEl.innerHTML = out + "\n"
}

function renderTicks() {
  if (!compiled || compiled.duration <= 0) { scrubTicks.innerHTML = ""; return }
  const dur = compiled.duration
  const seen = new Set<number>()
  const marks: string[] = []
  for (const ev of compiled.events as any[]) {
    const at = ev.appearAt ?? ev.typeStart
    if (at == null) continue
    const pct = Math.round((at / dur) * 1000) / 10
    if (seen.has(pct)) continue
    seen.add(pct)
    marks.push(`<i style="left:${pct}%"></i>`)
  }
  scrubTicks.innerHTML = marks.join("")
}

function friendlyParseFinding(e: any, text: string): LintFinding {
  const raw = e instanceof SceneParseError ? e.message : String(e?.message || e)
  const pos = locateJsonError(text)
  const where = pos ? `line ${pos.line}, col ${pos.col}` : "scene"
  const human = raw.includes("Invalid JSON")
    ? `That's not valid JSON yet — check ${pos ? `near ${where}` : "for a missing comma, quote, or bracket"}.`
    : raw.replace(/^Scene /, "")
  return { level: "error", step: null, code: "parse", message: `${human}|||${raw}` } as any
}
function locateJsonError(text: string): { line: number; col: number } | null {
  try { JSON.parse(text); return null } catch (e: any) {
    const m = /position (\d+)/.exec(e.message || "")
    let offset = m ? parseInt(m[1], 10) : text.length
    const upto = text.slice(0, offset)
    return { line: (upto.match(/\n/g) || []).length + 1, col: offset - upto.lastIndexOf("\n") }
  }
}

function failCompile(findings: LintFinding[], parseError: boolean) {
  setLint(findings, parseError)
  compiled = null
  hasError = true
  disableExport("scene")
  if (lastGoodCompiled) { drawDim(lastGoodCompiled); pauseChip.classList.add("show") }
  else ctx.clearRect(0, 0, canvas.width, canvas.height)
  timeEl.textContent = "— / —"
  scrub.disabled = true
  playBtn.disabled = true
  pause()
  updateEmptyHint()
}
function clearError() {
  hasError = false
  pauseChip.classList.remove("show")
  scrub.disabled = false
  playBtn.disabled = false
}
function drawDim(c: CompiledScene) {
  if (canvas.width !== c.meta.width || canvas.height !== c.meta.height) {
    canvas.width = c.meta.width; canvas.height = c.meta.height; fitCanvas()
  }
  drawFrame(ctx, c, Math.min(t, c.duration), { mode: previewMode })
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore()
}

// ============================================================
// lint panel
// ============================================================
function setLint(findings: LintFinding[], parseError: boolean) {
  const { errors, warns } = summarize(findings)
  if (findings.length === 0) { lintEl.innerHTML = `<span class="ok">✓ lint clean</span>`; return }
  const rows = findings.map((f) => {
    const where = f.step != null ? `step ${f.step}` : "scene"
    const [human, raw] = String(f.message).split("|||")
    const msg = raw ? `${escapeHtml(human)} <span class="det" data-raw="${escapeHtml(raw)}">details</span>` : escapeHtml(human)
    return `<button class="finding ${f.level}" data-step="${f.step ?? ""}"><span class="lv">${f.level}</span><span class="wh">${where}</span><span class="msg">${msg}</span></button>`
  }).join("")
  const head = parseError
    ? `<span class="err">✗ ${errors} error${errors !== 1 ? "s" : ""}</span>`
    : `${errors ? `<span class="err">✗ ${errors} error${errors !== 1 ? "s" : ""}</span>` : ""}${warns ? `<span class="warn">▲ ${warns} warning${warns !== 1 ? "s" : ""}</span>` : `<span class="ok">✓ no errors</span>`}`
  lintEl.innerHTML = `<div class="linthead">${head}</div>${rows}`
  lintEl.querySelectorAll<HTMLButtonElement>(".finding").forEach((b) => {
    b.addEventListener("click", (e) => {
      const det = (e.target as HTMLElement).closest(".det") as HTMLElement | null
      if (det) { alert(det.dataset.raw || ""); return }
      jumpToStep(b.dataset.step ? parseInt(b.dataset.step, 10) : null)
    })
  })
}
function jumpToStep(step: number | null) {
  if (!codeOpen) setCodeOpen(true)
  editor.focus()
  if (step == null) return
  const text = editor.value
  const stepsIdx = text.indexOf('"steps"')
  if (stepsIdx < 0) return
  let depth = 0, count = -1, pos = -1
  for (let i = stepsIdx; i < text.length; i++) {
    const ch = text[i]
    if (ch === "[") depth++
    else if (ch === "{" && depth === 1) { count++; if (count === step) { pos = i; break } }
  }
  if (pos >= 0) {
    const end = text.indexOf("}", pos)
    editor.setSelectionRange(pos, end > pos ? end + 1 : pos)
    editor.scrollTop = Math.max(0, (text.slice(0, pos).split("\n").length - 3) * 20)
    syncEditorScroll()
  }
}
function escapeHtml(s: unknown) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// ============================================================
// rendering / scrubber
// ============================================================
function renderCurrent() {
  if (!compiled) return
  drawFrame(ctx, compiled, t, { mode: previewMode })
  scrub.value = String(t)
  scrub.style.setProperty("--pct", String(compiled.duration > 0 ? (t / compiled.duration) * 100 : 0))
  timeEl.textContent = `${t.toFixed(2)} / ${compiled.duration.toFixed(2)}s`
  updateEmptyHint()
}
function updateEmptyHint() {
  const empty = !!compiled && (!compiled.events || compiled.events.length === 0)
  emptyHint.classList.toggle("show", empty && !hasError)
}
function tick(ts: number) {
  if (!playing || !compiled) return
  if (!last) last = ts
  const dt = (ts - last) / 1000
  last = ts
  let nt = t + dt
  if (nt >= compiled.duration) { t = compiled.duration; renderCurrent(); pause(); return }
  t = nt; renderCurrent()
  if (playing) raf = requestAnimationFrame(tick)
}
function play() {
  if (!compiled || hasError) return
  setPreviewMode("play")
  if (t >= compiled.duration) t = 0
  playing = true; last = 0; setPlayBtn(true)
  raf = requestAnimationFrame(tick)
}
function pause() { playing = false; setPlayBtn(false); cancelAnimationFrame(raf) }
function setPlayBtn(isPlaying: boolean) {
  playBtn.innerHTML = isPlaying ? `${ic("pause", 13)}pause` : `${ic("play", 13)}play`
  playBtn.setAttribute("aria-label", isPlaying ? "Pause" : "Play")
}
// Sizing lives in CSS: the wrap declares the scene's aspect ratio and grows to the
// largest box that fits the frame on both axes (container-query units). All JS does
// is publish the ratio so there's no fixed-pixel scaling to drift or letterbox.
function fitCanvas() {
  if (!compiled) return
  // set on #frame (the parent) so both the frame box (mobile edit mode) and the
  // .canvaswrap inside it inherit the same ratio.
  $("frame").style.setProperty("--ar", String(compiled.meta.width / compiled.meta.height))
}
function setPreviewMode(m: "compose" | "play") {
  if (previewMode === m) { renderCurrent(); return }
  previewMode = m
  if (m === "compose") pause()
  $("composeBtn").setAttribute("aria-pressed", String(m === "compose"))
  $("playBtn2").setAttribute("aria-pressed", String(m === "play"))
  renderCurrent()
}

// ============================================================
// command bar: Look · Aspect · Options
// ============================================================
function buildCmdBar() {
  // Look swatches
  $("lookGrid").innerHTML = Object.keys(THEMES).map((k) =>
    `<button class="opt-tile" data-theme="${k}"><span class="sw" style="background:${THEME_ACCENT[k] || "#d97757"}"></span>${k}</button>`).join("")
  $("lookGrid").querySelectorAll<HTMLButtonElement>(".opt-tile").forEach((b) =>
    b.addEventListener("click", () => { applyTheme(b.dataset.theme!); closePops() }))
  // Aspect tiles
  $("aspectGrid").innerHTML = ASPECT_OPTS.map((a) => {
    const dim = ASPECTS[a.id]
    const ar = dim.width / dim.height
    const w = ar >= 1 ? 18 : 18 * ar, h = ar >= 1 ? 18 / ar : 18
    return `<button class="opt-tile" data-aspect="${a.id}"><span class="shape" style="width:${w}px;height:${h}px"></span>${a.label}</button>`
  }).join("")
  $("aspectGrid").querySelectorAll<HTMLButtonElement>(".opt-tile").forEach((b) =>
    b.addEventListener("click", () => { applyAspect(b.dataset.aspect!); closePops() }))
  // chrome tiles
  $("chromeGrid").innerHTML = CHROME_OPTS.map((c) => `<button class="opt-tile" data-chrome="${c.id}">${c.label}</button>`).join("")
  $("chromeGrid").querySelectorAll<HTMLButtonElement>(".opt-tile").forEach((b) =>
    b.addEventListener("click", () => applyChrome(b.dataset.chrome!)))
  $<HTMLInputElement>("titleInput").addEventListener("input", (e) => applyTitle((e.target as HTMLInputElement).value))
}
function syncCmdBar() {
  const preset = scene?.meta?.theme?.preset || "claude"
  $("lookGrid").querySelectorAll<HTMLButtonElement>(".opt-tile").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.theme === preset)))
  const aspect = scene?.meta?.aspect || "square"
  $("aspectGrid").querySelectorAll<HTMLButtonElement>(".opt-tile").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.aspect === aspect)))
  const chrome = scene?.meta?.window?.chrome || "mac"
  $("chromeGrid").querySelectorAll<HTMLButtonElement>(".opt-tile").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.chrome === chrome)))
  const ti = $<HTMLInputElement>("titleInput")
  if (document.activeElement !== ti) ti.value = scene?.meta?.window?.title || ""
}
function applyTheme(preset: string) { mutMeta((m) => { m.theme = { ...(m.theme || {}), preset } }) }
function applyAspect(aspect: string) { mutMeta((m) => { m.aspect = aspect; delete m.width; delete m.height }) }
function applyChrome(chrome: string) { mutMeta((m) => { m.window = { ...(m.window || {}), chrome } }) }
function applyTitle(title: string) { mutMeta((m) => { m.window = { ...(m.window || {}), title } }, true) }
/** Mutate scene.meta, re-serialize, recompile. keepFocus skips re-render of the bar input. */
function mutMeta(fn: (m: any) => void, fromInput = false) {
  if (!scene) return
  scene.meta = scene.meta || {}
  fn(scene.meta)
  editor.value = JSON.stringify(scene, null, 2)
  recompile()
}

// popover open/close
function closePops() { document.querySelectorAll(".pop.show").forEach((p) => p.classList.remove("show")); document.querySelectorAll('[aria-expanded="true"]').forEach((b)=>b.setAttribute("aria-expanded","false")) }
function togglePop(btnId: string, popId: string) {
  const pop = $(popId), btn = $(btnId)
  const open = pop.classList.contains("show")
  closePops()
  if (!open) { pop.classList.add("show"); btn.setAttribute("aria-expanded", "true") }
}

// ============================================================
// LINES — the visual editor (drag to reorder, insert, remove)
// ============================================================
const KIND_CYCLE = ["cmd", "out", "progress", "wait", "div"] as const
type StepKind = (typeof KIND_CYCLE)[number]
function stepKind(s: any): string {
  if (s.cmd !== undefined) return "cmd"
  if (s.out !== undefined) return "out"
  if (s.progress !== undefined) return "progress"
  if (s.wait !== undefined) return "wait"
  if (s.div !== undefined) return "div"
  return "cmd"
}

function syncLines() {
  if (!scene) { linesEl.innerHTML = ""; lineCountEl.textContent = ""; return }
  const steps = scene.steps || []
  lineCountEl.textContent = `${steps.length} line${steps.length !== 1 ? "s" : ""}`
  let html = insertSlot(0)
  steps.forEach((s, i) => { html += rowHtml(s, i); html += insertSlot(i + 1) })
  linesEl.innerHTML = html
  wireLines()
}

function insertSlot(at: number): string {
  return `<div class="insert" data-at="${at}"><button title="Insert a line here" aria-label="Insert a line here" data-insert="${at}">${ic("plus", 12)}insert</button></div>`
}

const KIND_LABEL: Record<string, string> = { cmd: "cmd", out: "out", progress: "prog", wait: "wait", div: "div" }
function rowHtml(s: any, i: number): string {
  const kind = stepKind(s)
  const tag = `<button class="kindtag ${kind === "progress" ? "prog" : kind}" data-cyclekind="${i}" title="Change line type (click to cycle)">${KIND_LABEL[kind] || kind}</button>`
  // toprow = one line at rest: [kindtag] [field]. meta-line is disclosed below on hover/focus.
  let field = "", meta = ""
  if (kind === "cmd") {
    field = `<input class="ipt" data-field="cmd" data-i="${i}" value="${escapeHtml(s.cmd)}" placeholder="a command to type" aria-label="command">`
  } else if (kind === "out") {
    const val = Array.isArray(s.out) ? s.out.join("\n") : (s.out ?? "")
    const rows = Math.min(4, Math.max(1, String(val).split("\n").length))
    const styles = ["", "dim", "ok", "warn", "err", "accent"]
    field = `<textarea class="ipt" data-field="out" data-i="${i}" rows="${rows}" placeholder="output text" aria-label="output">${escapeHtml(String(val))}</textarea>`
    meta = `<select class="mini" data-field="style" data-i="${i}" aria-label="style">${styles.map((st) => `<option value="${st}"${(s.style || "") === st ? " selected" : ""}>${st || "plain"}</option>`).join("")}</select>`
  } else if (kind === "progress") {
    field = `<input class="ipt" data-field="progress" data-i="${i}" value="${escapeHtml(s.progress)}" placeholder="progress label" aria-label="progress label">`
    meta = `<span class="ml">duration</span><input class="mini" style="width:60px" data-field="duration" data-i="${i}" value="${s.duration ?? 1.5}" aria-label="duration seconds"><span class="ml">s</span>`
  } else if (kind === "wait") {
    // wait has no text field — the duration IS its content, inline in the toprow
    field = `<span class="ml">pause for</span><input class="mini" style="width:62px" data-field="wait" data-i="${i}" value="${s.wait ?? 0.5}" aria-label="wait seconds"><span class="ml">seconds</span>`
  } else {
    field = `<span class="blankrow">— blank spacer —</span>`
  }
  return `<div class="row" data-i="${i}" draggable="false">
    <div class="handle" data-handle="${i}" title="Drag to reorder" aria-label="Drag to reorder line ${i + 1}">${ic("grip", 14)}</div>
    <div class="main"><div class="toprow">${tag}${field}</div>${meta ? `<div class="meta-line">${meta}</div>` : ""}</div>
    <button class="del" data-del="${i}" title="Delete line" aria-label="Delete line">${ic("x", 14)}</button>
  </div>`
}

function wireLines() {
  linesEl.querySelectorAll<HTMLElement>("[data-field]").forEach((inp) => {
    const i = parseInt(inp.dataset.i!, 10)
    const f = inp.dataset.field!
    const evt = inp.tagName === "SELECT" ? "change" : "input"
    inp.addEventListener(evt, () => updateField(i, f, (inp as HTMLInputElement).value))
    inp.addEventListener("focus", () => { selStep = i })
  })
  linesEl.querySelectorAll<HTMLButtonElement>("[data-cyclekind]").forEach((b) =>
    b.addEventListener("click", () => cycleKind(parseInt(b.dataset.cyclekind!, 10))))
  linesEl.querySelectorAll<HTMLButtonElement>("[data-del]").forEach((b) =>
    b.addEventListener("click", () => deleteStep(parseInt(b.dataset.del!, 10))))
  linesEl.querySelectorAll<HTMLButtonElement>("[data-insert]").forEach((b) =>
    b.addEventListener("click", () => insertStep(parseInt(b.dataset.insert!, 10))))
  wireDrag()
}

function updateField(i: number, field: string, value: string) {
  if (!scene || !scene.steps[i]) return
  const s = scene.steps[i] as any
  if (field === "out") s.out = value.includes("\n") ? value.split("\n") : value
  else if (field === "wait" || field === "duration") s[field] = parseFloat(value) || 0
  else if (field === "style") { if (value) s.style = value; else delete s.style }
  else s[field] = value
  // text fields: don't rebuild the row list (keeps focus); just reserialize + preview
  syncFromScene(field !== "style" && field !== "duration" ? "soft" : "full")
}

function cycleKind(i: number) {
  if (!scene || !scene.steps[i]) return
  const cur = stepKind(scene.steps[i])
  const next = KIND_CYCLE[(KIND_CYCLE.indexOf(cur as any) + 1) % KIND_CYCLE.length]
  scene.steps[i] = freshStep(next, scene.steps[i] as any)
  syncFromScene("full")
}
function freshStep(kind: string, prev?: any): any {
  const text = prev && (prev.cmd ?? (Array.isArray(prev.out) ? prev.out.join("\n") : prev.out) ?? prev.progress) || ""
  if (kind === "cmd") return { cmd: text || "your command" }
  if (kind === "out") return { out: text || "output line" }
  if (kind === "progress") return { progress: text || "working", duration: 1.5 }
  if (kind === "wait") return { wait: 0.5 }
  return { div: true }
}
function deleteStep(i: number) {
  if (!scene) return
  scene.steps.splice(i, 1)
  syncFromScene("full")
}
function insertStep(at: number, kind: StepKind = "cmd") {
  if (!scene) scene = { steps: [] }
  scene.steps.splice(at, 0, freshStep(kind))
  syncFromScene("full")
  // focus the new row's input
  requestAnimationFrame(() => {
    const el = linesEl.querySelector<HTMLElement>(`[data-field][data-i="${at}"]`)
    el?.focus()
  })
}
function addStep(kind: StepKind) {
  insertStep(scene?.steps.length ?? 0, kind)
}
/** Populate the "+ more" menu with the line kinds that aren't on the main add bar. */
const MORE_KINDS: { kind: StepKind; label: string; hint: string; icon: keyof typeof ICONS }[] = [
  { kind: "progress", label: "Progress", hint: "a spinner / progress bar", icon: "chevronsRight" },
  { kind: "wait", label: "Wait", hint: "a timed pause", icon: "timer" },
  { kind: "div", label: "Divider", hint: "a blank spacer line", icon: "minus" },
]
function buildMorePop() {
  const pop = $("morePop2")
  pop.innerHTML = `<div class="ph">Add line</div>` + MORE_KINDS.map((m) =>
    `<button class="opt-tile" style="width:100%;margin-bottom:4px" data-addkind="${m.kind}">${ic(m.icon, 14, "ic-tile")}<b style="color:var(--ink)">${m.label}</b><span style="color:var(--muted);margin-left:auto;font-size:10.5px">${m.hint}</span></button>`).join("")
  pop.querySelectorAll<HTMLButtonElement>("[data-addkind]").forEach((b) =>
    b.addEventListener("click", () => { addStep(b.dataset.addkind as StepKind); closePops() }))
}

/** Reserialize the in-memory scene to the editor + recompile. mode "soft" keeps
 *  the line rows as-is (preserves input focus during typing); "full" rebuilds them. */
let softReentry = false
function syncFromScene(mode: "soft" | "full" = "full") {
  if (!scene) return
  editor.value = JSON.stringify(scene, null, 2)
  if (mode === "soft") softReentry = true
  recompile()
  softReentry = false
}

// drag-to-reorder via the handle (HTML5 DnD on the row, initiated from the handle)
let dragFrom = -1
function wireDrag() {
  linesEl.querySelectorAll<HTMLElement>(".row").forEach((row) => {
    const handle = row.querySelector<HTMLElement>(".handle")!
    handle.addEventListener("mousedown", () => { row.setAttribute("draggable", "true") })
    handle.addEventListener("touchstart", () => { row.setAttribute("draggable", "true") }, { passive: true })
    row.addEventListener("dragstart", (e) => {
      dragFrom = parseInt(row.dataset.i!, 10)
      row.classList.add("dragging")
      e.dataTransfer!.effectAllowed = "move"
      try { e.dataTransfer!.setData("text/plain", String(dragFrom)) } catch {}
    })
    row.addEventListener("dragend", () => { row.classList.remove("dragging"); row.setAttribute("draggable", "false"); clearDragOver() })
    row.addEventListener("dragover", (e) => { e.preventDefault(); clearDragOver(); row.classList.add("dragover") })
    row.addEventListener("drop", (e) => {
      e.preventDefault()
      const to = parseInt(row.dataset.i!, 10)
      moveStep(dragFrom, to)
    })
  })
}
function clearDragOver() { linesEl.querySelectorAll(".dragover").forEach((r) => r.classList.remove("dragover")) }
function moveStep(from: number, to: number) {
  if (!scene || from < 0 || to < 0 || from === to) return
  const arr = scene.steps
  const [it] = arr.splice(from, 1)
  // reorderDest honors the drop indicator (top edge of `to` = "land above"): a
  // downward move resolves to to-1 since removing `from` shifted indices down.
  arr.splice(reorderDest(from, to), 0, it)
  syncFromScene("full")
}

// ============================================================
// export — split-button CTA, mp4 default
// ============================================================
function buildExportMenu() {
  exportMenu.innerHTML = FORMATS.map((f) =>
    `<button class="opt" role="menuitem" data-fmt="${f.fmt}"><span class="ofmt">${f.fmt}</span><span class="ouse">${f.use}</span><span class="odot">●</span></button>`).join("")
    + `<div class="mhint" id="exportMhint"></div>`
  exportMenu.querySelectorAll<HTMLButtonElement>(".opt").forEach((b) =>
    b.addEventListener("click", () => { setExportFmt(b.dataset.fmt as ExportFormat); closeExportMenu(); doExport(exportFmt) }))
}
function setExportFmt(fmt: ExportFormat) {
  exportFmt = fmt
  exportFmtLabel.textContent = fmt.toUpperCase()
  exportMenu.querySelectorAll<HTMLButtonElement>(".opt").forEach((b) => b.classList.toggle("active", b.dataset.fmt === fmt))
  try { localStorage.setItem("ts_fmt", fmt) } catch {}
}
function openExportMenu() { exportMenu.classList.add("show"); exportCaret.setAttribute("aria-expanded", "true") }
function closeExportMenu() { exportMenu.classList.remove("show"); exportCaret.setAttribute("aria-expanded", "false") }

async function doExport(format: ExportFormat) {
  if (!compiled || hasError) { statusBad("Fix the scene errors before exporting."); return }
  pause()
  showProgress(`Preparing ${format.toUpperCase()}…`)
  try {
    let result
    if (format === "png") { result = await exportPng(compiled, compiled.duration); result.filename = sceneFilename("png") }
    else if (format === "gif") { result = await exportGif(compiled, (d, tot, ph) => setProgress(d / tot, `${ph} ${d}/${tot}`)); result.filename = sceneFilename("gif") }
    else { result = await exportVideo(compiled, format, (d, tot, ph) => setProgress(d / tot, `${ph} ${d}/${tot}`)); result.filename = sceneFilename(format) }
    download(result)
    const where = format === "png" ? ` — settled frame @ ${compiled.duration.toFixed(1)}s` : ""
    hideProgress(`✓ Exported ${result.filename}${where}`, true)
  } catch (e: any) {
    if (e instanceof ExportUnsupportedError) hideProgress(`✗ ${e.message}`, false)
    else hideProgress(`✗ Export failed: ${e.message}`, false)
    console.error(e)
  }
}
function sceneFilename(ext: string): string {
  const title = (scene?.meta?.window?.title || "termscene").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "termscene"
  return `${title}.${ext}`
}
function showProgress(label: string) { progressBar.classList.add("show"); progressFill.style.width = "0%"; progressLabel.textContent = label }
function setProgress(frac: number, label: string) { progressFill.style.width = Math.round(frac * 100) + "%"; progressLabel.textContent = label }
function hideProgress(s: string, good: boolean) { progressBar.classList.remove("show"); setStatus(s, good ? "good" : "bad") }
/** Set the leading status text without disturbing the trailing note spans. */
function setStatus(s: string, cls = "") {
  const first = statusEl.firstChild
  if (first && first.nodeType === Node.TEXT_NODE) first.textContent = s + " "
  else statusEl.insertBefore(document.createTextNode(s + " "), statusEl.firstChild)
  statusEl.className = cls
}
function statusOk(s: string) { setStatus(s, "") }
function statusBad(s: string) { setStatus(s, "bad") }

async function refreshExportCapabilities() {
  if (!compiled || hasError) return
  const { width, height } = compiled.meta
  const epoch = exportEpoch
  const [mp4ok, webmok] = await Promise.all([canExport("mp4", width, height), canExport("webm", width, height)])
  if (epoch !== exportEpoch || !compiled || hasError) return
  setOptCapable("mp4", mp4ok)
  setOptCapable("webm", webmok)
  webcodecsNote.classList.toggle("show", !mp4ok || !webmok)
  // if the chosen primary format is unavailable, fall back the CTA label to a working one
  const mh = $("exportMhint")
  if (!mp4ok && (exportFmt === "mp4" || exportFmt === "webm")) {
    if (mh) mh.textContent = "Video encode unavailable in this browser — GIF and PNG still work."
  } else if (mh) mh.textContent = ""
  syncCtaEnabled()
}
function setOptCapable(fmt: string, ok: boolean) {
  const b = exportMenu.querySelector<HTMLButtonElement>(`[data-fmt="${fmt}"]`)
  if (!b) return
  b.toggleAttribute("disabled", !ok)
  b.dataset.cap = ok ? "1" : "0"
}
function syncCtaEnabled() {
  const opt = exportMenu.querySelector<HTMLButtonElement>(`[data-fmt="${exportFmt}"]`)
  const usable = !hasError && !!compiled && (!opt || opt.dataset.cap !== "0")
  exportGo.disabled = !usable
  exportCaret.disabled = !compiled || hasError
}
function enableExport() {
  exportEpoch++
  refreshExportCapabilities()
  syncCtaEnabled()
}
function disableExport(_reason: "scene" | "browser" = "scene") {
  exportEpoch++
  exportGo.disabled = true
  exportCaret.disabled = true
}

// ============================================================
// template picker
// ============================================================
function buildPicker() {
  jobsEl.innerHTML = JOB_TEMPLATES.map((j) =>
    `<button class="job" data-id="${j.id}"><span class="jt">${escapeHtml(j.name)}</span><span class="jd">${escapeHtml(j.tagline)}</span></button>`).join("")
  jobsEl.querySelectorAll<HTMLButtonElement>(".job").forEach((b) =>
    b.addEventListener("click", () => { loadJob(b.dataset.id!); closePicker() }))
}
let pickerReturnFocus: HTMLElement | null = null
function openPicker() {
  pickerReturnFocus = (document.activeElement as HTMLElement) || null
  pickerEl.classList.add("show")
  requestAnimationFrame(() => pickerEl.querySelector<HTMLElement>(".job")?.focus())
}
function closePicker() {
  pickerEl.classList.remove("show")
  if (pickerReturnFocus && document.body.contains(pickerReturnFocus)) pickerReturnFocus.focus()
  else $("templatesBtn").focus()
  pickerReturnFocus = null
}
function trapPickerTab(e: KeyboardEvent) {
  if (e.key !== "Tab" || !pickerEl.classList.contains("show")) return
  const f = [...pickerEl.querySelectorAll<HTMLElement>("button, a, [tabindex]")].filter((el) => el.offsetParent !== null)
  if (!f.length) return
  const first = f[0], lastEl = f[f.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus() }
  else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus() }
}
function loadJob(id: string) {
  const j = JOB_TEMPLATES.find((x) => x.id === id)
  if (!j) return
  loadScene(j.scene, `Started "${j.name}" — edit the lines to make it yours.`)
}
function confirmDiscard(): boolean {
  if (!scene || !scene.steps || scene.steps.length === 0) return true
  if (editor.value.trim() === lastLoadedText.trim()) return true
  return confirm("Replace your current scene? Your unsaved edits will be lost.")
}
let lastLoadedText = ""
function loadScene(s: Scene, status: string) {
  editor.value = JSON.stringify(s, null, 2)
  lastLoadedText = editor.value
  recompile(); setPreviewMode("compose"); showInitialFrame()
  statusOk(status)
}
function showInitialFrame() { if (!compiled) return; t = compiled.duration; renderCurrent() }

// ============================================================
// code-mode toggle (progressive disclosure)
// ============================================================
function setCodeOpen(on: boolean) {
  codeOpen = on
  leftCol.classList.toggle("codeon", on)
  codepane.classList.toggle("show", on)
  $("codeToggle").setAttribute("aria-pressed", String(on))
  try { localStorage.setItem("ts_codeopen", on ? "1" : "0") } catch {}
}

// ============================================================
// autosave + share
// ============================================================
const LS_KEY = "ts_scene_v1"
function autosave() { clearTimeout(saveTimer); saveTimer = window.setTimeout(() => { try { localStorage.setItem(LS_KEY, editor.value) } catch {} }, 200) }
function loadAutosave(): string | null { try { return localStorage.getItem(LS_KEY) } catch { return null } }
function encodeShare(text: string): string { try { return "s=" + btoa(unescape(encodeURIComponent(text))) } catch { return "" } }
function decodeShare(hash: string): string | null {
  const m = /[#&]s=([^&]+)/.exec(hash); if (!m) return null
  try { return decodeURIComponent(escape(atob(m[1]))) } catch { return null }
}
async function doShare() {
  const enc = encodeShare(editor.value)
  if (!enc) { statusBad("Couldn't build a share link for this scene."); return }
  const url = `${location.origin}${location.pathname}#${enc}`
  try { await navigator.clipboard.writeText(url); statusOk("✓ Share link copied — anyone can open and remix it.") }
  catch { location.hash = enc; statusOk("Share link is in the address bar — copy it from there.") }
}

// ============================================================
// boot
// ============================================================
async function boot() {
  buildCmdBar()
  buildPicker()
  buildExportMenu()
  try { setExportFmt((localStorage.getItem("ts_fmt") as ExportFormat) || "mp4") } catch { setExportFmt("mp4") }
  const fontsOk = await loadFonts()

  const params = new URLSearchParams(location.search)
  const sceneId = params.get("scene")
  const shared = decodeShare(location.hash)
  const saved = loadAutosave()

  if (shared) {
    editor.value = shared; lastLoadedText = shared; recompile(); setPreviewMode("compose"); showInitialFrame()
    statusOk("Opened a shared scene — edit and re-export.")
  } else if (sceneId && [...SHOWCASE_INDEX, ...JOB_TEMPLATES].some((s) => s.id === sceneId)) {
    const entry = [...JOB_TEMPLATES, ...SHOWCASE_INDEX].find((s) => s.id === sceneId)!
    loadScene(entry.scene, `Loaded "${entry.name}" — edit and re-export.`)
  } else if (saved) {
    editor.value = saved; lastLoadedText = saved; recompile(); setPreviewMode("compose"); showInitialFrame()
    statusOk("Restored your last scene.")
  } else {
    editor.value = STARTER; lastLoadedText = STARTER; recompile(); setPreviewMode("compose"); showInitialFrame()
    openPicker()
  }

  try { setCodeOpen(localStorage.getItem("ts_codeopen") === "1") } catch { setCodeOpen(false) }

  if (!fontsOk) statusOk("⚠ JBM font failed to load — preview uses a fallback mono.")

  // ---- events ----
  let debounce = 0
  editor.addEventListener("input", () => { updateGutter(); clearTimeout(debounce); debounce = window.setTimeout(recompile, 180) })
  editor.addEventListener("scroll", syncEditorScroll)
  scrub.addEventListener("input", () => { if (hasError) return; setPreviewMode("play"); pause(); t = parseFloat(scrub.value); renderCurrent() })
  playBtn.addEventListener("click", () => (playing ? pause() : play()))

  document.body.addEventListener("keydown", (e) => {
    const ae = document.activeElement as HTMLElement
    if (e.code === "Space" && ae && !ae.matches?.("input,textarea,select,button")) { e.preventDefault(); playing ? pause() : play() }
    if (e.code === "Escape") { closePops(); closeExportMenu(); if (pickerEl.classList.contains("show")) closePicker() }
    trapPickerTab(e)
  })

  $("composeBtn").addEventListener("click", () => setPreviewMode("compose"))
  $("playBtn2").addEventListener("click", () => setPreviewMode("play"))

  // command bar: one consolidated Customize popover (Look / Aspect / Window / title)
  $("customizeBtn").addEventListener("click", (e) => { e.stopPropagation(); togglePop("customizeBtn", "customizePop") })
  document.addEventListener("click", (e) => {
    const tgt = e.target as HTMLElement
    if (!tgt.closest(".chip") && !tgt.closest(".pop")) closePops()
    if (!tgt.closest(".export-cta")) closeExportMenu()
  })

  // add bar: command + output are one-click; "more" opens a small kind menu
  $("addCmd").addEventListener("click", () => addStep("cmd"))
  $("addOut").addEventListener("click", () => addStep("out"))
  buildMorePop()
  $("addMore").addEventListener("click", (e) => { e.stopPropagation(); togglePop("addMore", "morePop2") })

  // code toggle
  $("codeToggle").addEventListener("click", () => setCodeOpen(!codeOpen))

  // export split-button
  exportGo.addEventListener("click", () => doExport(exportFmt))
  exportCaret.addEventListener("click", (e) => { e.stopPropagation(); exportMenu.classList.contains("show") ? closeExportMenu() : openExportMenu() })

  // header
  $("templatesBtn").addEventListener("click", () => { if (confirmDiscard()) openPicker() })
  $("shareBtn").addEventListener("click", doShare)
  $("startBlank").addEventListener("click", () => { loadScene(JSON.parse(STARTER), "Blank scene — add lines or edit the code."); closePicker() })
  $("closePicker").addEventListener("click", closePicker)
  pickerEl.addEventListener("click", (e) => { if (e.target === pickerEl) closePicker() })

  const mobileEdit = $("mobileEdit")
  mobileEdit.addEventListener("click", () => {
    const on = document.body.classList.toggle("editing")
    mobileEdit.setAttribute("aria-pressed", String(on))
    const lbl = mobileEdit.querySelector(".elbl"); if (lbl) lbl.textContent = on ? "Done" : "Edit"
    requestAnimationFrame(fitCanvas)
  })

  window.addEventListener("resize", fitCanvas)
  window.addEventListener("hashchange", () => {
    const sh = decodeShare(location.hash)
    if (sh && sh !== editor.value) { editor.value = sh; lastLoadedText = sh; recompile(); setPreviewMode("compose"); showInitialFrame() }
  })
}

boot()
