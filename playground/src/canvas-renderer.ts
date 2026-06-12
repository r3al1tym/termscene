// Canvas2D re-implementation of the termscene engine (src/engine/engine.html).
//
// WHY THIS EXISTS: the engine paints to the DOM. A browser video exporter needs
// PIXELS on a <canvas> per frame. Rather than rasterize the DOM (foreignObject /
// html2canvas — fragile for custom-font monospace), we re-draw the same compiled
// events directly with Canvas2D. The content is a terminal cell-grid (mono text +
// solid rects + a cursor block + a unicode-block progress bar), which Canvas2D
// renders natively and deterministically.
//
// CONTRACT: drawFrame(ctx, scene, t) must match engine.html's __render(t) as
// closely as a parallel renderer can — same per-event VISIBILITY/typing/streaming
// math (lifted verbatim from renderEvent), same theme variables, same layout
// (bottom/center/top alignment, pre-wrap + word-break wrapping, overflow clip,
// auto-scroll to newest line). It is NOT pixel-identical to the DOM (text AA and
// wrap breakpoints differ); the CLI/puppeteer path remains the byte-reference.
//
// NOT SUPPORTED (no shipped scene uses these; the playground disables them):
//   - out.html (raw HTML in an output line)
//   - meta.css (arbitrary injected CSS) / window.__overlay
// A scene using them still PREVIEWS via the DOM engine; only canvas EXPORT drops them.

import type { CompiledScene, CompiledEvent } from "../../src/types.js"

// ---- theme resolution: mirror engine.html boot()'s CSS-variable block ----
export interface ResolvedVars {
  page: string
  term: string
  fg: string
  out: string
  dim: string
  prompt: string
  cursor: string
  accent: string
  ok: string
  warn: string
  err: string
  bar: string
  barText: string
  barTextStrong: string
  windowRadius: number
  // layout
  fontSize: number
  lineHeight: number
  lineGap: number // px
  padding: number // px
  marginPad: number // px
  marginFill: string
  align: "top" | "center" | "bottom"
  barH: number // px
  chrome: "mac" | "plain" | "none"
  title: string
  font: string
}

const SEMANTIC: Record<string, keyof ResolvedVars> = {
  dim: "dim",
  ok: "ok",
  warn: "warn",
  err: "err",
  accent: "accent",
}

// finite-positive guard: a best-effort preview can be drawn while lint still flags
// a bad numeric (e.g. fontSize:Infinity) — keep canvas math from going degenerate.
function finitePos(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : fallback
}

export function resolveVars(scene: CompiledScene): ResolvedVars {
  const m = scene.meta as any
  const TH = m.theme || {}
  const fontSize = finitePos(m.fontSize, 24)
  const chrome: "mac" | "plain" | "none" = (m.window && m.window.chrome) || "mac"
  return {
    page: TH.page || "#0c0b09",
    term: TH.bg || "#15140f",
    fg: TH.fg || "#ece9e1",
    out: TH.out || TH.fg || "#b1aea5",
    dim: TH.dim || "#5d5a52",
    prompt: TH.prompt || "#6f9f6f",
    cursor: TH.cursor || TH.fg || "#ece9e1",
    accent: TH.accent || "#d97757",
    ok: TH.ok || "#28c93f",
    warn: TH.warn || "#fbbe2e",
    err: TH.err || "#f25f57",
    bar: TH.bar || "#211f1a",
    barText: TH.barText || "#7f7b71",
    barTextStrong: TH.barTextStrong || "#b1aea5",
    windowRadius: TH.windowRadius || 0,
    fontSize,
    lineHeight: finitePos(m.lineHeight, 1.5),
    lineGap: Number.isFinite(m.lineGap) ? Math.max(0, m.lineGap) : 4,
    padding: Number.isFinite(m.padding) ? Math.max(0, m.padding) : 36,
    marginPad: Number.isFinite(m.marginPad) ? Math.max(0, m.marginPad) : 0,
    marginFill: m.marginFill || TH.page || "#0c0b09",
    align: m.align || "bottom",
    barH: chrome !== "none" ? Math.round(fontSize * 1.9) : 0,
    chrome,
    title: (m.window && m.window.title) || "",
    font: TH.font || 'JBM,"DejaVu Sans Mono",monospace',
  }
}

function clamp(x: number, a: number, b: number): number {
  return x < a ? a : x > b ? b : x
}

// A drawable span: text + color. A rendered line is an array of spans (the prompt
// is a colored span; the rest is the line body). Cursor is appended as a flag.
interface Span {
  text: string
  color: string
}
interface RenderedLine {
  spans: Span[]
  cursor: boolean // append a cursor block after the spans
  cursorOpacity: number
}

// Produce the visible lines for time t — the canvas analogue of building the
// transcript innerHTML. Timing math is lifted verbatim from engine.html renderEvent.
function visibleLines(events: CompiledEvent[], t: number, V: ResolvedVars): RenderedLine[] {
  const lines: RenderedLine[] = []
  const blinkOpacity = Math.floor(t * 1.6) % 2 ? 1 : 0.25

  for (const ev of events as any[]) {
    if (ev.kind === "div") {
      if (t >= ev.appearAt) lines.push({ spans: [{ text: " ", color: V.out }], cursor: false, cursorOpacity: 1 })
      continue
    }
    if (ev.kind === "cmd") {
      if (t < ev.typeStart) continue
      const full: string = ev.text || ""
      let shown: string
      let active: boolean
      if (t < ev.typeEnd) {
        const f = ev.typeEnd > ev.typeStart ? clamp((t - ev.typeStart) / (ev.typeEnd - ev.typeStart), 0, 1) : 1
        shown = full.slice(0, Math.floor(f * full.length))
        active = true
      } else {
        shown = full
        active = ev.commitAt != null && t < ev.commitAt
      }
      const spans: Span[] = []
      if (ev.prompt != null) spans.push({ text: ev.prompt + " ", color: V.prompt })
      spans.push({ text: shown, color: V.fg })
      lines.push({ spans, cursor: active, cursorOpacity: blinkOpacity })
      continue
    }
    if (ev.kind === "progress") {
      if (t < ev.appearAt) continue
      const pf = ev.fillEnd > ev.appearAt ? clamp((t - ev.appearAt) / (ev.fillEnd - ev.appearAt), 0, 1) : 1
      const w = ev.width || 22
      const filled = Math.round(pf * w)
      const bar = "█".repeat(filled) + "░".repeat(w - filled)
      const col = ev.cls && SEMANTIC[ev.cls] ? V[SEMANTIC[ev.cls]] : V.accent
      const pct = ev.pct ? "  " + Math.round(pf * 100) + "%" : ""
      lines.push({
        spans: [
          { text: ev.label + " ", color: V.out },
          { text: bar, color: col as string },
          { text: pct, color: V.out },
        ],
        cursor: false,
        cursorOpacity: 1,
      })
      continue
    }
    if (ev.kind === "out") {
      if (t < ev.appearAt) continue
      const cls = ev.cls && SEMANTIC[ev.cls] ? (V[SEMANTIC[ev.cls]] as string) : V.out
      let txt: string = ev.text || ""
      let streaming = false
      if (ev.streamEnd != null && ev.streamEnd > ev.appearAt) {
        const sf = clamp((t - ev.appearAt) / (ev.streamEnd - ev.appearAt), 0, 1)
        txt = txt.slice(0, Math.floor(sf * txt.length))
        streaming = sf < 1
      }
      lines.push({ spans: [{ text: txt, color: cls }], cursor: streaming, cursorOpacity: blinkOpacity })
      continue
    }
  }
  return lines
}

// rounded-rect path (matches CSS border-radius on the window)
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/**
 * Draw one frame of the scene at time t onto ctx. The canvas must be sized to
 * scene.meta.width × scene.meta.height (device pixels). Pure function of t.
 */
export function drawFrame(ctx: CanvasRenderingContext2D, scene: CompiledScene, t: number): void {
  const V = resolveVars(scene)
  const W = scene.meta.width
  const H = scene.meta.height
  const fontPx = V.fontSize
  const lineStep = fontPx * V.lineHeight + V.lineGap

  // ---- page backdrop / margin fill ----
  ctx.fillStyle = V.marginFill
  ctx.fillRect(0, 0, W, H)

  // window box = full frame minus margin gutter
  const wx = V.marginPad
  const wy = V.marginPad
  const ww = W - V.marginPad * 2
  const wh = H - V.marginPad * 2

  // clip to the rounded window and paint its background
  ctx.save()
  roundRect(ctx, wx, wy, ww, wh, V.windowRadius)
  ctx.clip()
  ctx.fillStyle = V.term
  ctx.fillRect(wx, wy, ww, wh)

  // ---- title bar ----
  if (V.chrome !== "none") {
    ctx.fillStyle = V.bar
    ctx.fillRect(wx, wy, ww, V.barH)
    if (V.chrome === "mac") {
      const dotR = 6
      const cy = wy + V.barH / 2
      const dots = ["#f25f57", "#fbbe2e", "#28c93f"]
      let dx = wx + 16 + dotR
      for (const c of dots) {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(dx, cy, dotR, 0, Math.PI * 2)
        ctx.fill()
        dx += dotR * 2 + 9
      }
    }
    if (V.title) {
      ctx.fillStyle = V.barTextStrong
      ctx.font = `${Math.round(fontPx * 0.62)}px ${V.font}`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(V.title, wx + ww / 2, wy + V.barH / 2 + 1)
      ctx.textAlign = "left"
    }
  }

  ctx.restore() // drop the window clip; the transcript re-clips to the scroll rect

  // ---- scroll region (the transcript) ----
  const sx = wx + V.padding
  const sTop = wy + V.barH + V.padding
  const sw = ww - V.padding * 2
  const sBottom = wy + wh - V.padding
  const sh = sBottom - sTop

  // measure char width (monospace → constant advance) for wrapping + cursor sizing
  ctx.font = `${fontPx}px ${V.font}`
  ctx.textBaseline = "alphabetic"
  const charW = ctx.measureText("M").width
  const maxCols = Math.max(1, Math.floor(sw / charW))

  drawTranscript(ctx, scene, t, V, { sx, sTop, sw, sh, sBottom, lineStep, fontPx, charW, maxCols })
}

interface ScrollBox {
  sx: number
  sTop: number
  sw: number
  sh: number
  sBottom: number
  lineStep: number
  fontPx: number
  charW: number
  maxCols: number
}

function wrapLine(line: RenderedLine, maxCols: number): RenderedLine[] {
  // flatten spans to a char stream tagged with color, then wrap by columns,
  // breaking on the last space when possible (word-break:break-word fallback).
  const chars: { ch: string; color: string }[] = []
  for (const s of line.spans) for (const ch of s.text) chars.push({ ch, color: s.color })
  if (chars.length <= maxCols) return [line]

  const out: RenderedLine[] = []
  let start = 0
  while (start < chars.length) {
    let end = Math.min(start + maxCols, chars.length)
    if (end < chars.length) {
      // try to break at the last space within the window
      let brk = -1
      for (let i = end - 1; i > start; i--) {
        if (chars[i].ch === " ") {
          brk = i
          break
        }
      }
      if (brk > start) end = brk + 1 // include the space on this line (it collapses visually)
    }
    const slice = chars.slice(start, end)
    // rebuild spans by merging consecutive same-color chars
    const spans: Span[] = []
    for (const c of slice) {
      const last = spans[spans.length - 1]
      if (last && last.color === c.color) last.text += c.ch
      else spans.push({ text: c.ch, color: c.color })
    }
    out.push({ spans, cursor: false, cursorOpacity: line.cursorOpacity })
    start = end
  }
  // cursor belongs only on the final visual line
  if (line.cursor && out.length) out[out.length - 1].cursor = true
  return out
}

function drawTranscript(
  ctx: CanvasRenderingContext2D,
  scene: CompiledScene,
  t: number,
  V: ResolvedVars,
  box: ScrollBox,
): void {
  const events = (scene as any).events as CompiledEvent[]
  const logical = visibleLines(events, t, V)

  // wrap all lines
  let visual: RenderedLine[] = []
  for (const ln of logical) visual = visual.concat(wrapLine(ln, box.maxCols))

  // clip to scroll rect
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.sx, box.sTop, box.sw, box.sh)
  ctx.clip()
  ctx.font = `${box.fontPx}px ${V.font}`
  ctx.textBaseline = "alphabetic"

  const totalH = visual.length * box.lineStep
  // vertical alignment within the scroll region; if content overflows, pin to
  // bottom and auto-scroll (newest line visible) — matches scrollTop=scrollHeight.
  let yTop: number
  if (totalH > box.sh) {
    yTop = box.sBottom - totalH // overflow → bottom-anchored, top clipped (auto-scroll)
  } else if (V.align === "top") {
    yTop = box.sTop
  } else if (V.align === "center") {
    yTop = box.sTop + (box.sh - totalH) / 2
  } else {
    yTop = box.sBottom - totalH // bottom (default)
  }

  // baseline offset within a line slot: text sits ~80% down the line height
  const ascent = box.fontPx * 0.8
  visual.forEach((ln, i) => {
    const slotTop = yTop + i * box.lineStep
    const baseline = slotTop + ascent + V.lineGap / 2
    let x = box.sx
    for (const s of ln.spans) {
      ctx.fillStyle = s.color
      ctx.fillText(s.text, x, baseline)
      x += s.text.length * box.charW
    }
    if (ln.cursor) {
      ctx.globalAlpha = ln.cursorOpacity
      ctx.fillStyle = V.cursor
      // .cur is .55em × 1.05em in the CSS — em = font-size, NOT the M advance
      const cw = box.fontPx * 0.55
      const ch = box.fontPx * 1.05
      ctx.fillRect(x, baseline - box.fontPx * 0.82, cw, ch)
      ctx.globalAlpha = 1
    }
  })
  ctx.restore()
}
