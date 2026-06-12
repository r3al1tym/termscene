import type { Scene, SceneStep } from "./types.js"
import { THEMES, ASPECTS } from "./themes.js"

export interface LintFinding {
  level: "error" | "warn" | "info"
  /** step index (0-based) or null for scene-level */
  step: number | null
  code: string
  message: string
}

// Emoji / pictographic chars the bundled mono renders as tofu (it has no color-emoji
// glyphs). We flag the supplementary pictographic planes (1F000+) and the Misc-Symbols
// block (2600-26FF: 🍺☕☀ etc.). We deliberately do NOT sweep the Dingbats block
// (2700-27BF) wholesale — it contains text-symbols JBM renders fine (✓ ✗ ✦ ✂), and the
// arrows/geometric blocks (→ ● ▸ ⬢ ▔) are renderable too. A few known-emoji Dingbats
// (✅❌➡️ etc. via variation selectors) are caught by the VS16 check below.
const TOFU_RE = /[\u{1F000}-\u{1FAFF}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u
// any char followed by emoji variation selector U+FE0F → forced emoji presentation
const VS16_RE = /.\u{FE0F}/u
// Powerline private-use glyphs () that the bundled font lacks.
const POWERLINE_RE = /[\u{E0A0}-\u{E0D7}]/u

function stepText(s: SceneStep): string {
  const parts: string[] = []
  if ((s as any).cmd) parts.push((s as any).cmd)
  if ((s as any).out) parts.push(...[].concat((s as any).out as any))
  if ((s as any).progress) parts.push((s as any).progress)
  if ((s as any).prompt) parts.push((s as any).prompt)
  return parts.join(" ")
}

/**
 * Validate a scene before render. Deterministic, no LLM — this is the agent quality
 * gate (run after every edit, fix all errors before declaring done). Catches the
 * mistakes an assistant authoring scenes actually makes: unknown presets, glyphs the
 * font can't render, bad timing, empty scenes.
 */
export function lint(scene: Scene): LintFinding[] {
  const f: LintFinding[] = []
  const m = scene.meta || {}

  // ---- scene-level ----
  if (!Array.isArray(scene.steps) || scene.steps.length === 0) {
    f.push({ level: "error", step: null, code: "empty-scene", message: "scene has no steps" })
  }
  if (m.theme?.preset && !THEMES[m.theme.preset]) {
    f.push({
      level: "error", step: null, code: "unknown-theme",
      message: `unknown theme preset "${m.theme.preset}" — known: ${Object.keys(THEMES).join(", ")}`,
    })
  }
  if (m.aspect && !ASPECTS[m.aspect]) {
    f.push({
      level: "error", step: null, code: "unknown-aspect",
      message: `unknown aspect "${m.aspect}" — known: ${Object.keys(ASPECTS).join(", ")}`,
    })
  }
  if (m.window?.chrome && !["mac", "plain", "none"].includes(m.window.chrome)) {
    f.push({ level: "error", step: null, code: "bad-chrome", message: `window.chrome must be mac|plain|none` })
  }
  if (m.align && !["top", "center", "bottom"].includes(m.align)) {
    f.push({ level: "error", step: null, code: "bad-align", message: `align must be top|center|bottom` })
  }
  if (m.loopOffset != null) {
    const lo = m.loopOffset
    if (typeof lo === "string" && !/^\d+(\.\d+)?%$/.test(lo)) {
      f.push({ level: "error", step: null, code: "bad-loop-offset", message: `loopOffset string must be a percentage like "25%"` })
    }
  }
  if ((m.fontSize ?? 24) < 8) {
    f.push({ level: "warn", step: null, code: "tiny-font", message: `fontSize ${m.fontSize} is very small` })
  }

  // ---- per-step ----
  scene.steps?.forEach((s, i) => {
    const txt = stepText(s)
    if (TOFU_RE.test(txt) || VS16_RE.test(txt)) {
      const hit = (txt.match(TOFU_RE) || txt.match(VS16_RE))?.[0]
      f.push({
        level: "warn", step: i, code: "tofu-glyph",
        message: `"${hit}" is an emoji the bundled mono renders as a tofu box — use a text label or a geometric symbol (●▸✦⬢→✓)`,
      })
    }
    if (POWERLINE_RE.test(txt)) {
      f.push({
        level: "warn", step: i, code: "powerline-glyph",
        message: `powerline glyph won't render in the bundled font — fake the segment with spaces/color`,
      })
    }
    const wait = (s as any).wait
    if (wait != null && (typeof wait !== "number" || wait < 0)) {
      f.push({ level: "error", step: i, code: "bad-wait", message: `wait must be a non-negative number` })
    }
    const dur = (s as any).duration
    if ((s as any).progress != null && (typeof dur !== "number" || dur <= 0)) {
      f.push({ level: "error", step: i, code: "bad-progress", message: `progress step needs a positive "duration"` })
    }
    const stream = (s as any).stream
    if (stream != null && (typeof stream !== "number" || stream < 0)) {
      f.push({ level: "error", step: i, code: "bad-stream", message: `stream must be a non-negative number of seconds` })
    }
    const speed = (s as any).typeSpeed
    if (speed != null && (typeof speed !== "number" || speed <= 0)) {
      f.push({ level: "error", step: i, code: "bad-typespeed", message: `typeSpeed must be a positive chars/sec` })
    }
    const style = (s as any).style
    if (style != null && !["dim", "ok", "warn", "err", "accent"].includes(style)) {
      f.push({ level: "warn", step: i, code: "unknown-style", message: `style "${style}" — known: dim|ok|warn|err|accent (will render unstyled)` })
    }
  })

  return f
}

export function summarize(findings: LintFinding[]): { errors: number; warns: number; infos: number } {
  return {
    errors: findings.filter((x) => x.level === "error").length,
    warns: findings.filter((x) => x.level === "warn").length,
    infos: findings.filter((x) => x.level === "info").length,
  }
}
