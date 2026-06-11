import { spawn } from "node:child_process"
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import puppeteer, { type Browser, type Page } from "puppeteer-core"
import type { CompiledScene } from "./types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENGINE_DIR = resolve(__dirname, "engine") // dist/engine after build; src/engine in dev via tsx

export type OutputFormat = "mp4" | "gif" | "webm" | "frames"

export interface RenderOptions {
  out: string
  format?: OutputFormat
  fps?: number
  /** path to a chromium/chrome binary; auto-detected if omitted */
  chromePath?: string
  /** progress callback (0..1) */
  onProgress?: (done: number, total: number) => void
  quiet?: boolean
}

const CHROME_CANDIDATES = [
  process.env.TERMSCENE_CHROME,
  process.env.CHROME,
  // puppeteer's own cached download first — it's an unconfined binary that can
  // read our temp html (snap-packaged chromium is sandboxed away from /tmp & $HOME-temp)
  join(process.env.HOME || "", ".cache/puppeteer/chrome/linux-*/chrome-linux64/chrome"),
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
]

async function findChrome(explicit?: string): Promise<string> {
  const { existsSync } = await import("node:fs")
  const { globSync } = await import("node:fs")
  for (const c of [explicit, ...CHROME_CANDIDATES].filter(Boolean) as string[]) {
    if (c.includes("*")) {
      try {
        const hits = globSync(c).sort().reverse() // newest version dir first
        if (hits.length && existsSync(hits[0])) return hits[0]
      } catch {
        /* older node without globSync — skip */
      }
      continue
    }
    if (existsSync(c)) return c
  }
  throw new Error(
    "no chromium/chrome found. Set TERMSCENE_CHROME=/path/to/chrome (or install chromium).",
  )
}

/**
 * Render a compiled scene to video. The engine is loaded ONCE; for each frame we
 * call window.__render(t) and screenshot — no per-frame process spawn, so this is
 * ~10-50x faster than launching headless chrome per frame while staying perfectly
 * deterministic (t is the only input to the render).
 */
export async function render(scene: CompiledScene, opts: RenderOptions): Promise<string> {
  const fps = opts.fps ?? scene.meta.fps ?? 30
  const format = opts.format ?? inferFormat(opts.out)
  const W = scene.meta.width
  const H = scene.meta.height
  const total = Math.max(1, Math.round(scene.duration * fps))

  const chromePath = await findChrome(opts.chromePath)
  const work = await mkdtemp(join(tmpdir(), "termscene-"))

  let browser: Browser | undefined
  try {
    // build a self-contained engine html with the scene + fonts inlined so we can
    // load it from a file:// url with no server
    const html = await buildStandalone(scene)
    const htmlPath = join(work, "frame.html")
    await writeFile(htmlPath, html)

    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--font-render-hinting=none",
      ],
      defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    })
    const page: Page = await browser.newPage()
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" })
    await page.evaluate(() => (document as any).fonts.ready)

    const framesDir = join(work, "frames")
    await (await import("node:fs/promises")).mkdir(framesDir, { recursive: true })

    for (let i = 0; i < total; i++) {
      const t = Math.round((i / fps) * 1000) / 1000
      await page.evaluate((tt) => (window as any).__render(tt), t)
      const file = join(framesDir, `f${String(i).padStart(5, "0")}.png`)
      await page.screenshot({ path: file as `${string}.png`, omitBackground: false })
      opts.onProgress?.(i + 1, total)
    }

    await browser.close()
    browser = undefined

    if (format === "frames") {
      const { cp } = await import("node:fs/promises")
      await cp(framesDir, opts.out, { recursive: true })
      return opts.out
    }

    await encode(framesDir, opts.out, format, fps, opts.quiet ?? true)
    return opts.out
  } finally {
    if (browser) await browser.close().catch(() => {})
    await rm(work, { recursive: true, force: true }).catch(() => {})
  }
}

function inferFormat(out: string): OutputFormat {
  const ext = out.toLowerCase().split(".").pop()
  if (ext === "gif") return "gif"
  if (ext === "webm") return "webm"
  if (ext === "mp4") return "mp4"
  return "mp4"
}

/** Inline the engine html + scene + woff2 fonts (base64) into one portable file. */
async function buildStandalone(scene: CompiledScene): Promise<string> {
  let html = await readFile(join(ENGINE_DIR, "engine.html"), "utf8")
  // inline fonts so file:// load needs no relative font fetch
  const fonts: Record<string, string> = {
    "jbm-Regular.woff2": await fontData("jbm-Regular.woff2"),
    "jbm-Bold.woff2": await fontData("jbm-Bold.woff2"),
    "jbm-Italic.woff2": await fontData("jbm-Italic.woff2"),
  }
  for (const [name, b64] of Object.entries(fonts)) {
    html = html.replaceAll(`url(fonts/${name})`, `url(data:font/woff2;base64,${b64})`)
  }
  // inject the compiled scene before the engine script runs
  const inject = `<script>window.SCENE=${JSON.stringify({ ...scene, duration: scene.duration })};</script>`
  html = html.replace("</head>", `${inject}</head>`)
  return html
}

async function fontData(name: string): Promise<string> {
  const buf = await readFile(join(ENGINE_DIR, "fonts", name))
  return buf.toString("base64")
}

async function encode(
  framesDir: string,
  out: string,
  format: OutputFormat,
  fps: number,
  quiet: boolean,
): Promise<void> {
  const input = join(framesDir, "f%05d.png")
  let args: string[]
  if (format === "gif") {
    // two-pass palette for clean colors
    const palette = join(framesDir, "palette.png")
    await ffmpeg([
      "-y", "-framerate", String(fps), "-i", input,
      "-vf", "palettegen=stats_mode=diff", palette,
    ], quiet)
    args = [
      "-y", "-framerate", String(fps), "-i", input, "-i", palette,
      "-lavfi", "paletteuse=dither=bayer:bayer_scale=3", out,
    ]
  } else if (format === "webm") {
    args = [
      "-y", "-framerate", String(fps), "-i", input,
      "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "28", "-pix_fmt", "yuv420p", out,
    ]
  } else {
    args = [
      "-y", "-framerate", String(fps), "-i", input,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", out,
    ]
  }
  await ffmpeg(args, quiet)
}

function ffmpeg(args: string[], quiet: boolean): Promise<void> {
  const bin = process.env.FFMPEG || "ffmpeg"
  return new Promise((res, rej) => {
    const p = spawn(bin, args, { stdio: quiet ? "ignore" : "inherit" })
    p.on("error", rej)
    p.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`))))
  })
}
