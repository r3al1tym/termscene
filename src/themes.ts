import type { SceneTheme, AspectPreset } from "./types.js"

// Built-in themes. `claude` is the de-branded house look extracted from loop-videos
// (warm ink terminal, JetBrains Mono, the soft-green prompt). Pick with
// meta.theme.preset; any explicit field on meta.theme overrides the preset.
export const THEMES: Record<string, SceneTheme> = {
  // warm dark — the loop-videos terminal register, de-branded
  claude: {
    font: 'JBM,"DejaVu Sans Mono",monospace',
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
    font: 'JBM,"DejaVu Sans Mono",monospace',
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
    font: 'JBM,"DejaVu Sans Mono",monospace',
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
  // light — for docs / light-mode landing pages
  paper: {
    font: 'JBM,"DejaVu Sans Mono",monospace',
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
