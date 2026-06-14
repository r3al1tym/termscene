import type {
  Scene,
  SceneStep,
  CmdStep,
  OutStep,
  ProgressStep,
  WaitStep,
  DivStep,
  CompiledScene,
  CompiledEvent,
  SceneMeta,
} from "./types.js"
import { resolveTheme, ASPECTS } from "./themes.js"

const DEFAULTS = {
  fps: 30,
  fontSize: 24,
  lineHeight: 1.5,
  lineGap: 4,
  padding: 36,
  typeSpeed: 22, // chars/sec
  prompt: "❯",
  holdBeforeEnter: 0.4,
  lineDelay: 0.12,
  outGap: 0.18, // gap after a command commits before its output starts
  tailHold: 1.2, // hold on the final frame so the end reads
}

export function isCmd(s: SceneStep): s is CmdStep {
  return (s as CmdStep).cmd !== undefined
}
export function isOut(s: SceneStep): s is OutStep {
  return (s as OutStep).out !== undefined
}
export function isWait(s: SceneStep): s is WaitStep {
  return (s as WaitStep).wait !== undefined
}
export function isProgress(s: SceneStep): s is ProgressStep {
  return (s as ProgressStep).progress !== undefined
}
export function isDiv(s: SceneStep): s is DivStep {
  return (s as DivStep).div !== undefined
}

/**
 * Compile a declarative scene into the flat, timestamped event list the engine
 * renders as a pure function of t. This is the whole "tape → timeline" step —
 * it walks the steps advancing a virtual cursor `t`, so authors never hand-write
 * absolute timecodes.
 */
export function compile(scene: Scene): CompiledScene {
  const m: SceneMeta = scene.meta || {}
  const aspect = m.aspect ? ASPECTS[m.aspect] : ASPECTS.square
  const width = m.width ?? aspect.width
  const height = m.height ?? aspect.height
  const fps = m.fps ?? DEFAULTS.fps
  const theme = resolveTheme(m.theme)
  const defaultPrompt = m.prompt ?? DEFAULTS.prompt
  const defaultTypeSpeed = m.typeSpeed ?? DEFAULTS.typeSpeed

  const events: CompiledEvent[] = []
  let t = 0.2 // small lead-in so the first frame isn't mid-keystroke

  let stepIndex = -1
  for (const step of scene.steps) {
    stepIndex++ // source-step ordinal; carried onto each event for click-to-edit
    if (isWait(step)) {
      t += step.wait
      continue
    }
    if (isProgress(step)) {
      const appearAt = t
      const fillEnd = appearAt + step.duration
      events.push({
        kind: "progress",
        label: typeof step.progress === "string" ? step.progress : String(step.progress ?? ""),
        appearAt: round(appearAt),
        fillEnd: round(fillEnd),
        width: step.width ?? 22,
        cls: step.style,
        pct: step.pct ?? true,
        stepIndex,
      })
      t = fillEnd + DEFAULTS.lineDelay
      continue
    }
    if (isDiv(step)) {
      events.push({ kind: "div", appearAt: round(t), stepIndex })
      continue
    }
    if (isCmd(step)) {
      const speed = step.typeSpeed ?? defaultTypeSpeed
      // coerce: a non-string cmd is a lint error, but never throw the renderer
      const text = typeof step.cmd === "string" ? step.cmd : String(step.cmd ?? "")
      const typeStart = t
      const typeDur = Math.max(0.12, text.length / speed)
      const typeEnd = typeStart + typeDur
      const hold = step.holdBeforeEnter ?? DEFAULTS.holdBeforeEnter
      const commitAt = typeEnd + hold
      events.push({
        kind: "cmd",
        prompt: step.prompt ?? defaultPrompt,
        text,
        typeStart: round(typeStart),
        typeEnd: round(typeEnd),
        commitAt: round(commitAt),
        stepIndex,
      })
      t = commitAt + DEFAULTS.outGap
      continue
    }
    if (isOut(step)) {
      // coerce each line to a string — a non-string out is a lint error, but the
      // renderer iterates text char-by-char and must never throw on bad input.
      const rawLines = Array.isArray(step.out) ? step.out : [step.out]
      const lines = rawLines.map((l) => (typeof l === "string" ? l : String(l ?? "")))
      const lineDelay = step.lineDelay ?? DEFAULTS.lineDelay
      const cls = step.style
      // a single `stream` budget is spread across the block's characters
      const totalChars = lines.reduce((n, l) => n + l.length, 0) || 1
      let charsSoFar = 0
      let outLineIndex = -1
      for (const line of lines) {
        outLineIndex++
        const appearAt = t
        let streamEnd: number | null = null
        if (step.stream && step.stream > 0) {
          const frac = line.length / totalChars
          const dur = step.stream * frac
          streamEnd = appearAt + dur
          t = streamEnd
        }
        events.push({
          kind: "out",
          text: line,
          appearAt: round(appearAt),
          streamEnd: streamEnd != null ? round(streamEnd) : null,
          cls,
          html: step.html,
          stepIndex,
          outLineIndex,
        })
        charsSoFar += line.length
        if (!step.stream) t += lineDelay
      }
      continue
    }
  }

  const duration = round(t + DEFAULTS.tailHold)

  const compiledMeta = {
    ...m,
    width,
    height,
    fps,
    fontSize: m.fontSize ?? DEFAULTS.fontSize,
    lineHeight: m.lineHeight ?? DEFAULTS.lineHeight,
    lineGap: m.lineGap ?? DEFAULTS.lineGap,
    padding: m.padding ?? DEFAULTS.padding,
    theme,
    window: m.window ?? { chrome: "mac" },
  }

  return { meta: compiledMeta, events, duration }
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000
}
