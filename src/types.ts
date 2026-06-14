// termscene scene format — the authoring surface. Declarative and structured so
// both humans and coding assistants can write it without touching the renderer.
//
// A scene is a list of STEPS executed top-to-bottom on a virtual clock. The
// compiler walks the steps, advancing a cursor `t` (seconds), and emits the flat
// timestamped events the engine paints as a pure function of t.

export type WindowChrome = "mac" | "plain" | "none"

export interface SceneTheme {
  /** named preset to start from; explicit fields below override it */
  preset?: string
  font?: string
  page?: string // page backdrop (outside the margin fill)
  bg?: string // terminal background
  fg?: string // primary text
  out?: string // command output text
  dim?: string // muted/secondary
  prompt?: string // prompt glyph color
  cursor?: string
  accent?: string
  ok?: string
  warn?: string
  err?: string
  bar?: string // title-bar background
  barText?: string
  barTextStrong?: string
  windowShadow?: string
  windowRadius?: number
}

export type AspectPreset = "square" | "landscape" | "portrait" | "wide"

export interface SceneMeta {
  /** aspect shortcut; width/height override it */
  aspect?: AspectPreset
  width?: number
  height?: number
  fps?: number
  fontSize?: number
  lineHeight?: number
  lineGap?: number
  padding?: number
  /** margin (gutter) around the window, painted with marginFill */
  marginPad?: number
  marginFill?: string
  theme?: SceneTheme
  window?: { chrome?: WindowChrome; title?: string }
  /** vertical alignment of the transcript within the window (default "bottom") */
  align?: "top" | "center" | "bottom"
  /** seamless-loop entry point: a frame number or a percentage string like "25%".
   *  The render rotates the frame sequence so a looping gif/webm starts here —
   *  borrowed from VHS's LoopOffset. (Borrowed idea; deterministic for us.) */
  loopOffset?: number | string
  /** default prompt glyph for `cmd` steps (e.g. "❯", "$", "➜ ~") */
  prompt?: string
  /** typing speed in chars/sec for `cmd` steps (default 22) */
  typeSpeed?: number
  /** extra per-scene CSS injected into the engine (escape hatch for custom scenes) */
  css?: string
}

/** A typed command line: the cursor types `text`, then Enter commits it. */
export interface CmdStep {
  cmd: string
  /** override the scene-default prompt for this line */
  prompt?: string
  /** override typing speed (chars/sec) for this line */
  typeSpeed?: number
  /** seconds to hold after typing finishes, before Enter commits (default 0.4) */
  holdBeforeEnter?: number
}

/** One or more output lines that appear after the preceding command commits. */
export interface OutStep {
  out: string | string[]
  /** semantic class → themed color: dim|ok|warn|err|accent */
  style?: "dim" | "ok" | "warn" | "err" | "accent"
  /** stream the text in char-by-char (AI-style) over this many seconds */
  stream?: number
  /** treat `out` as raw pre-escaped HTML (advanced) */
  html?: boolean
  /** seconds between successive lines when `out` is an array (default 0.12) */
  lineDelay?: number
}

/** An animated progress bar that fills 0→100% in place over `duration` seconds. */
export interface ProgressStep {
  progress: string // label shown before the bar
  duration: number // seconds to fill
  /** bar width in characters (default 22) */
  width?: number
  /** semantic color for the filled bar */
  style?: "dim" | "ok" | "warn" | "err" | "accent"
  /** show a trailing percentage (default true) */
  pct?: boolean
}

/** Pause the virtual clock. */
export interface WaitStep {
  wait: number
}

/** A blank spacer line. */
export interface DivStep {
  div: true
}

export type SceneStep = CmdStep | OutStep | ProgressStep | WaitStep | DivStep

export interface Scene {
  meta?: SceneMeta
  steps: SceneStep[]
}

// ---- compiled output (what the engine consumes on window.SCENE) ----

// `stepIndex` (and `outLineIndex` for a multi-line `out`) tie each compiled event
// back to the source step it came from. The CLI ignores these; the playground
// Composer uses them to map a canvas click → the editable step. Optional so older
// callers / tests that construct events by hand stay valid.
export interface CmdEvent {
  kind: "cmd"
  prompt: string | null
  text: string
  typeStart: number
  typeEnd: number
  commitAt: number | null
  stepIndex?: number
}
export interface OutEvent {
  kind: "out"
  text: string
  appearAt: number
  streamEnd: number | null
  cls?: string
  html?: boolean
  stepIndex?: number
  outLineIndex?: number
}
export interface DivEvent {
  kind: "div"
  appearAt: number
  stepIndex?: number
}
export interface ProgressEvent {
  kind: "progress"
  label: string
  appearAt: number
  fillEnd: number
  width: number
  cls?: string
  pct: boolean
  stepIndex?: number
}
export type CompiledEvent = CmdEvent | OutEvent | DivEvent | ProgressEvent

export interface CompiledScene {
  meta: Required<Pick<SceneMeta, "width" | "height" | "fps">> & SceneMeta
  events: CompiledEvent[]
  duration: number
}
