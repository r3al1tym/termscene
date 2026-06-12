// termscene playground — author a scene in the browser, preview it on a live
// canvas scrubber, and export to mp4 / webm / gif / png entirely client-side.
//
// Reuses the SAME portable kernel as the CLI (compiler, themes, lint, types) so the
// playground and the CLI never drift on how scenes compile, lint, or theme. The only
// new code is the canvas renderer (engine.html port) + the client exporter.

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
  frameCount,
  ExportUnsupportedError,
  type ExportFormat,
} from "./export.js"
import { STARTER, SHOWCASE_INDEX } from "./scenes-data.js"

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
const themeSel = $<HTMLSelectElement>("theme")
const aspectSel = $<HTMLSelectElement>("aspect")
const exportBtns = $("export")
const progressBar = $("progressbar")
const progressFill = $("progressfill")
const progressLabel = $("progresslabel")
const examplesEl = $("examples")

// ---- state ----
let scene: Scene | null = null
let compiled: CompiledScene | null = null
let t = 0
let playing = false
let raf = 0
let last = 0
let exportEpoch = 0 // bumped on every export-state change; guards stale async capability checks

// ---- font loading (same JBM woff2 the engine uses) ----
async function loadFonts(): Promise<boolean> {
  const faces = [
    new FontFace("JBM", "url(fonts/jbm-Regular.woff2)", { weight: "400" }),
    new FontFace("JBM", "url(fonts/jbm-Bold.woff2)", { weight: "700" }),
    new FontFace("JBM", "url(fonts/jbm-Italic.woff2)", { style: "italic" }),
  ]
  const results = await Promise.all(
    faces.map((f) =>
      f
        .load()
        .then((ff) => {
          ;(document as any).fonts.add(ff)
          return true
        })
        .catch(() => false),
    ),
  )
  return results.every(Boolean) // false → at least one JBM face failed (fallback metrics)
}

// ---- compile pipeline: text → parse → lint → compile → preview ----
function recompile() {
  const text = editor.value
  let parsed: Scene
  try {
    parsed = parseScene(text)
  } catch (e: any) {
    failCompile([{ level: "error", step: null, code: "parse", message: e.message }], true)
    return
  }
  scene = parsed

  // lint() and compile() can both throw on malformed step entries (e.g. a null or
  // primitive step) — keep BOTH inside try/catch so a bad keystroke never escapes
  // as an uncaught error that breaks the lint panel for every later edit.
  let findings: LintFinding[]
  try {
    findings = lint(parsed)
    const { errors } = summarize(findings)
    setLint(findings, false)
    if (errors > 0) {
      compiled = null
      disableExport()
      // best-effort: still try to compile + preview despite (non-fatal) errors
    }
    compiled = compile(parsed)
    if (errors === 0) enableExport()
  } catch (e: any) {
    failCompile([{ level: "error", step: null, code: "compile", message: e.message }], false)
    return
  }

  // size canvas to scene
  canvas.width = compiled.meta.width
  canvas.height = compiled.meta.height
  fitCanvas()
  scrub.max = String(compiled.duration)
  if (t > compiled.duration) t = 0
  syncMetaControls()
  render(t)
}

/** A failure exit for recompile: show the error, drop compiled state, disable
 *  export, and clear the canvas so the preview never contradicts the lint panel. */
function failCompile(findings: LintFinding[], parseError: boolean) {
  setLint(findings, parseError)
  scene = parseError ? null : scene
  compiled = null
  disableExport()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

/** On a fresh scene load, show a readable frame (engine default: min(2.0, dur))
 *  instead of the blank lead-in, so the preview never looks empty. */
function showInitialFrame() {
  if (!compiled) return
  t = Math.min(2.0, compiled.duration)
  render(t)
}

function setLint(findings: LintFinding[], parseError: boolean) {
  const { errors, warns } = summarize(findings)
  if (findings.length === 0) {
    lintEl.innerHTML = `<span class="ok">✓ lint clean</span>`
    return
  }
  const rows = findings
    .map((f) => {
      const where = f.step != null ? `step ${f.step}` : "scene"
      return `<div class="finding ${f.level}"><span class="lv">${f.level}</span><span class="wh">${where}</span><span class="msg">${escapeHtml(f.message)}</span></div>`
    })
    .join("")
  const head = parseError
    ? `<span class="err">✗ ${errors} error${errors !== 1 ? "s" : ""}</span>`
    : `${errors ? `<span class="err">✗ ${errors} error${errors !== 1 ? "s" : ""}</span>` : ""}${warns ? `<span class="warn">▲ ${warns} warning${warns !== 1 ? "s" : ""}</span>` : `<span class="ok">✓ no errors</span>`}`
  lintEl.innerHTML = `<div class="linthead">${head}</div>${rows}`
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// ---- rendering / scrubber ----
function render(tt: number) {
  if (!compiled) return
  t = tt
  scrub.value = String(tt)
  timeEl.textContent = `${tt.toFixed(2)} / ${compiled.duration.toFixed(2)}s`
  drawFrame(ctx, compiled, tt)
}
function tick(ts: number) {
  if (!playing || !compiled) return
  if (!last) last = ts
  const dt = (ts - last) / 1000
  last = ts
  let nt = t + dt
  if (nt >= compiled.duration) {
    nt = compiled.duration
    pause()
  }
  render(nt)
  if (playing) raf = requestAnimationFrame(tick)
}
function play() {
  if (!compiled) return
  if (t >= compiled.duration) t = 0
  playing = true
  last = 0
  playBtn.textContent = "❚❚ pause"
  raf = requestAnimationFrame(tick)
}
function pause() {
  playing = false
  playBtn.textContent = "▶ play"
  cancelAnimationFrame(raf)
}

function fitCanvas() {
  if (!compiled) return
  const box = $("frame").getBoundingClientRect()
  const s = Math.min(box.width / compiled.meta.width, box.height / compiled.meta.height, 1)
  canvas.style.width = compiled.meta.width * s + "px"
  canvas.style.height = compiled.meta.height * s + "px"
}

// ---- meta controls (theme + aspect dropdowns, two-way bound) ----
function syncMetaControls() {
  if (!scene) return
  const m = scene.meta || {}
  themeSel.value = m.theme?.preset || "claude"
  aspectSel.value = m.aspect || "square"
}
function applyMetaControl(key: "theme" | "aspect", value: string) {
  if (!scene) return
  scene.meta = scene.meta || {}
  if (key === "theme") {
    scene.meta.theme = { ...(scene.meta.theme || {}), preset: value }
  } else {
    scene.meta.aspect = value as any
    delete (scene.meta as any).width
    delete (scene.meta as any).height
  }
  editor.value = JSON.stringify(scene, null, 2)
  recompile()
}

// ---- export ----
async function doExport(format: ExportFormat) {
  if (!compiled) return
  pause()
  showProgress(`Preparing ${format.toUpperCase()}…`)
  try {
    let result
    if (format === "png") {
      result = await exportPng(compiled, t)
    } else if (format === "gif") {
      result = await exportGif(compiled, (d, total, phase) => setProgress(d / total, `${phase} ${d}/${total}`))
    } else {
      result = await exportVideo(compiled, format, (d, total, phase) => setProgress(d / total, `${phase} ${d}/${total}`))
    }
    download(result)
    const codecNote = result.codec ? ` · ${result.codec}` : ""
    hideProgress(`✓ exported ${result.filename}${codecNote}`)
  } catch (e: any) {
    if (e instanceof ExportUnsupportedError) hideProgress(`✗ ${e.message}`)
    else hideProgress(`✗ export failed: ${e.message}`)
    console.error(e)
  }
}

function showProgress(label: string) {
  progressBar.classList.add("show")
  progressFill.style.width = "0%"
  progressLabel.textContent = label
}
function setProgress(frac: number, label: string) {
  progressFill.style.width = Math.round(frac * 100) + "%"
  progressLabel.textContent = label
}
function hideProgress(status: string) {
  progressBar.classList.remove("show")
  statusEl.textContent = status
}

async function refreshExportCapabilities() {
  if (!compiled) return
  const { width, height } = compiled.meta
  const epoch = exportEpoch // capture; a newer recompile bumps this
  const [mp4ok, webmok] = await Promise.all([canExport("mp4", width, height), canExport("webm", width, height)])
  // ignore stale results: a later recompile may have disabled export meanwhile
  if (epoch !== exportEpoch || !compiled) return
  setBtnState("mp4", mp4ok)
  setBtnState("webm", webmok)
}
function setBtnState(fmt: string, ok: boolean) {
  const b = exportBtns.querySelector<HTMLButtonElement>(`[data-fmt="${fmt}"]`)
  if (!b) return
  b.disabled = !ok
  b.title = ok ? `Export ${fmt}` : `${fmt} encoding unavailable in this browser`
}
function enableExport() {
  exportEpoch++
  exportBtns.querySelectorAll("button").forEach((b) => (b.disabled = false))
  refreshExportCapabilities()
}
function disableExport() {
  exportEpoch++
  exportBtns.querySelectorAll("button").forEach((b) => (b.disabled = true))
}

// ---- examples / showcase deep-link ----
function buildExamples() {
  examplesEl.innerHTML = SHOWCASE_INDEX.map(
    (s) => `<button class="ex" data-id="${s.id}" title="${escapeHtml(s.blurb)}"><span class="sw" style="background:${s.sw}"></span>${escapeHtml(s.name)}</button>`,
  ).join("")
  examplesEl.querySelectorAll<HTMLButtonElement>(".ex").forEach((b) => {
    b.addEventListener("click", () => loadShowcase(b.dataset.id!))
  })
}
function loadShowcase(id: string) {
  const s = SHOWCASE_INDEX.find((x) => x.id === id)
  if (!s) return
  editor.value = JSON.stringify(s.scene, null, 2)
  recompile()
  showInitialFrame()
  statusEl.textContent = `loaded "${s.name}" — edit and re-export`
}

// ---- populate dropdowns from the shared theme/aspect data ----
function populateSelects() {
  themeSel.innerHTML = Object.keys(THEMES)
    .map((k) => `<option value="${k}">${k}</option>`)
    .join("")
  aspectSel.innerHTML = Object.keys(ASPECTS)
    .map((k) => `<option value="${k}">${k}</option>`)
    .join("")
}

// ---- boot ----
async function boot() {
  populateSelects()
  buildExamples()
  const fontsOk = await loadFonts()

  // deep-link: ?scene=<id> loads a showcase scene; else the starter
  const params = new URLSearchParams(location.search)
  const sceneId = params.get("scene")
  if (sceneId && SHOWCASE_INDEX.some((s) => s.id === sceneId)) {
    loadShowcase(sceneId)
  } else {
    editor.value = STARTER
    recompile()
    showInitialFrame()
  }

  if (!fontsOk) {
    statusEl.textContent = "⚠ JBM font failed to load — preview uses a fallback mono (export fidelity reduced)"
  }

  // wire events
  let debounce = 0
  editor.addEventListener("input", () => {
    clearTimeout(debounce)
    debounce = window.setTimeout(recompile, 180)
  })
  scrub.addEventListener("input", () => {
    pause()
    render(parseFloat(scrub.value))
  })
  playBtn.addEventListener("click", () => (playing ? pause() : play()))
  document.body.addEventListener("keydown", (e) => {
    if (e.code === "Space" && document.activeElement !== editor) {
      e.preventDefault()
      playing ? pause() : play()
    }
  })
  themeSel.addEventListener("change", () => applyMetaControl("theme", themeSel.value))
  aspectSel.addEventListener("change", () => applyMetaControl("aspect", aspectSel.value))
  exportBtns.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
    b.addEventListener("click", () => doExport(b.dataset.fmt as ExportFormat))
  })
  window.addEventListener("resize", fitCanvas)
}

boot()
