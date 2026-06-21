import type { SceneTheme, AspectPreset } from "./types.js"

// Built-in themes. `claude` is the de-branded house look extracted from loop-videos
// (warm ink terminal, JetBrains Mono, the soft-green prompt). Pick with
// meta.theme.preset; any explicit field on meta.theme overrides the preset.
export const THEMES: Record<string, SceneTheme> = {
  // warm dark — the loop-videos terminal register, de-branded
  claude: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#0c0b09",
    bg: "#15140f",
    fg: "#ece9e1",
    out: "#b1aea5",
    dim: "#5d5a52",
    prompt: "#6f9f6f",
    cursor: "#ece9e1",
    accent: "#d97757",
    ok: "#28c93f",
    warn: "#fbbe2e",
    err: "#f25f57",
    bar: "#211f1a",
    barText: "#7f7b71",
    barTextStrong: "#b1aea5",
    windowShadow: "0 24px 60px -20px rgba(0,0,0,.55)",
    windowRadius: 0,
  },
  // neutral cool dark
  midnight: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#0a0c10",
    bg: "#0d1117",
    fg: "#e6edf3",
    out: "#9da7b3",
    dim: "#56606b",
    prompt: "#58a6ff",
    cursor: "#e6edf3",
    accent: "#58a6ff",
    ok: "#3fb950",
    warn: "#d29922",
    err: "#f85149",
    bar: "#161b22",
    barText: "#7d8590",
    barTextStrong: "#c9d1d9",
    windowShadow: "0 24px 60px -20px rgba(0,0,0,.6)",
    windowRadius: 10,
  },
  // classic green-on-black
  matrix: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#000000",
    bg: "#020402",
    fg: "#37d837",
    out: "#27a327",
    dim: "#155515",
    prompt: "#5cff5c",
    cursor: "#37d837",
    accent: "#5cff5c",
    ok: "#5cff5c",
    warn: "#d8d837",
    err: "#ff5c5c",
    bar: "#0a120a",
    barText: "#2a7a2a",
    barTextStrong: "#5cff5c",
    windowShadow: "none",
    windowRadius: 0,
  },
  // ---- brand-recognizable terminal presets (for the showcase / demo page) ----
  // gemini CLI — dark slate, blue→violet accents
  gemini: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#070a12", bg: "#0b0f1a", fg: "#e8ecf6", out: "#9aa6c2", dim: "#566180",
    prompt: "#7aa2ff", cursor: "#c4b5fd", accent: "#a78bfa",
    ok: "#5ee6a8", warn: "#ffd24a", err: "#ff6b7d",
    bar: "#11162400", barText: "#566180", barTextStrong: "#a78bfa",
    windowShadow: "0 24px 60px -20px rgba(0,0,0,.6)", windowRadius: 12,
  },
  // OpenAI Codex CLI — near-black ANSI-palette TUI: cyan accent, green reserved
  // strictly for +N diffs / passing tests (kept as inline spans in the scene).
  codex: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#000000", bg: "#0a0a0a", fg: "#f2f2f2", out: "#b9b9b9", dim: "#5c5c5c",
    prompt: "#56c2d6", cursor: "#f2f2f2", accent: "#56c2d6",
    ok: "#10a37f", warn: "#e0a23a", err: "#ef5350",
    bar: "#111111", barText: "#5c5c5c", barTextStrong: "#b9b9b9",
    windowShadow: "0 24px 60px -20px rgba(0,0,0,.7)", windowRadius: 8,
  },
  // Warp — the shipped "Warp Dark" theme: cyan accent on true black, white fg
  warp: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#06080c", bg: "#000000", fg: "#ffffff", out: "#bcc3d0", dim: "#6b7280",
    prompt: "#00c2ff", cursor: "#00c2ff", accent: "#00c2ff",
    ok: "#b4fa72", warn: "#fbbf24", err: "#fb7185",
    bar: "#0c0f16", barText: "#6b7280", barTextStrong: "#bcc3d0",
    windowShadow: "0 30px 70px -24px rgba(0,0,0,.65)", windowRadius: 14,
  },
  // iTerm2 + Powerlevel10k — dark, the powerline-prompt look (segments via output styling)
  iterm2: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#101010", bg: "#1a1a1a", fg: "#e8e8e8", out: "#b0b0b0", dim: "#6a6a6a",
    prompt: "#00d7af", cursor: "#e8e8e8", accent: "#00afff",
    ok: "#5fd700", warn: "#ffaf00", err: "#ff5f5f",
    bar: "#252525", barText: "#6a6a6a", barTextStrong: "#b0b0b0",
    windowShadow: "0 24px 60px -20px rgba(0,0,0,.6)", windowRadius: 10,
  },
  // macOS Terminal (Basic profile, zsh default) — white bg, pure-black text, no accent
  macos: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#d9d9d9", bg: "#ffffff", fg: "#000000", out: "#000000", dim: "#8a8a8a",
    prompt: "#000000", cursor: "#000000", accent: "#000000",
    ok: "#1f8a2f", warn: "#b5851a", err: "#c0392b",
    bar: "#e4e4e4", barText: "#8a8a8a", barTextStrong: "#3a3a3a",
    windowShadow: "0 18px 50px -22px rgba(0,0,0,.3)", windowRadius: 8,
  },
  // Ubuntu GNOME Terminal (bash) — iconic aubergine bg, green user@host
  ubuntu: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#1d0712", bg: "#300a24", fg: "#eeeeec", out: "#d3d7cf", dim: "#8a7f86",
    prompt: "#8ae234", cursor: "#eeeeec", accent: "#ad7fa8",
    ok: "#8ae234", warn: "#fce94f", err: "#ef2929",
    bar: "#3d1230", barText: "#8a7f86", barTextStrong: "#d3d7cf",
    windowShadow: "0 24px 60px -20px rgba(0,0,0,.5)", windowRadius: 6,
  },
  // Starship cross-shell prompt — dark, segmented multicolor prompt
  starship: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#0c0e14", bg: "#13161e", fg: "#e6e6e6", out: "#a7adba", dim: "#5b616e",
    prompt: "#a3be8c", cursor: "#e6e6e6", accent: "#88c0d0",
    ok: "#a3be8c", warn: "#ebcb8b", err: "#bf616a",
    bar: "#1b1f2a", barText: "#5b616e", barTextStrong: "#a7adba",
    windowShadow: "0 24px 60px -20px rgba(0,0,0,.6)", windowRadius: 12,
  },
  // Kiro (AWS agentic IDE) — purple-tinted near-black, vivid #9046FF brand purple
  kiro: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#141118", bg: "#19161d", fg: "#ece9f1", out: "#a39fad", dim: "#615c6b",
    prompt: "#c6a0ff", cursor: "#c6a0ff", accent: "#9046ff",
    ok: "#80ffb5", warn: "#ffcf99", err: "#ff8080",
    bar: "#28242e", barText: "#938f9b", barTextStrong: "#c2a0fd",
    windowShadow: "0 24px 60px -20px rgba(0,0,0,.62)", windowRadius: 12,
  },
  // light — for docs / light-mode landing pages
  paper: {
    font: 'JBM,TSSym,"DejaVu Sans Mono",monospace',
    page: "#efece4",
    bg: "#faf8f3",
    fg: "#23211c",
    out: "#514c42",
    dim: "#8a8273",
    prompt: "#a8442a",
    cursor: "#23211c",
    accent: "#a8442a",
    ok: "#2f7d32",
    warn: "#b5851a",
    err: "#c0392b",
    bar: "#e6e0d3",
    barText: "#8a8273",
    barTextStrong: "#514c42",
    windowShadow: "0 18px 50px -22px rgba(0,0,0,.25)",
    windowRadius: 10,
  },
}

export const ASPECTS: Record<AspectPreset, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  landscape: { width: 1920, height: 1080 },
  wide: { width: 1600, height: 900 },
  portrait: { width: 1080, height: 1920 },
}

export function resolveTheme(theme?: SceneTheme): SceneTheme {
  const preset = theme?.preset ? THEMES[theme.preset] : THEMES.claude
  if (!preset && theme?.preset) {
    throw new Error(`unknown theme preset "${theme.preset}" — known: ${Object.keys(THEMES).join(", ")}`)
  }
  return { ...preset, ...theme }
}
