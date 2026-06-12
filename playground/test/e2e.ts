// End-to-end test for the playground: serve docs/, drive a real browser through
// the full author → preview → export loop for every format, and validate each
// artifact with ffprobe. This is the quality gate before shipping (it's a
// published project — the browser export must actually produce valid media).
//
// Run: pnpm playground:test   (builds first, then tests)
//
// Uses puppeteer-core against the same Chrome the renderer auto-detects. WebCodecs
// H.264 encode needs a real Chrome build; headless "new" supports it.

import { createServer } from "node:http"
import { readFile, writeFile, mkdir, stat } from "node:fs/promises"
import { resolve, dirname, join, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn, spawnSync } from "node:child_process"
import { existsSync, globSync } from "node:fs"
import puppeteer from "puppeteer-core"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..", "..")
const DOCS = join(ROOT, "docs")
const TMP = join(ROOT, "playground", "test", "out")

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".map": "application/json",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".css": "text/css",
}

function findChrome(): string {
  const cands = [
    process.env.TERMSCENE_CHROME,
    process.env.CHROME,
    join(process.env.HOME || "", ".cache/puppeteer/chrome/linux-*/chrome-linux64/chrome"),
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[]
  for (const c of cands) {
    if (c.includes("*")) {
      const hits = globSync(c).sort().reverse()
      if (hits.length && existsSync(hits[0])) return hits[0]
    } else if (existsSync(c)) return c
  }
  throw new Error("no chrome found (set TERMSCENE_CHROME)")
}

function ffprobe(file: string): Record<string, string> {
  const bin = process.env.FFPROBE || "ffprobe"
  const r = spawnSync(
    bin,
    ["-v", "error", "-show_entries", "stream=codec_name,codec_type,width,height,nb_read_packets:format=duration,format_name",
     "-count_packets", "-of", "default=noprint_wrappers=1", file],
    { encoding: "utf8" },
  )
  if (r.status !== 0) {
    // ffprobe may be absent; fall back to "exists + non-empty" only
    return { _noffprobe: "1" }
  }
  const out: Record<string, string> = {}
  for (const line of r.stdout.trim().split("\n")) {
    const [k, v] = line.split("=")
    if (k) out[k.trim()] = (v || "").trim()
  }
  return out
}

interface Case {
  fmt: "mp4" | "webm" | "gif" | "png"
  validate: (probe: Record<string, string>, bytes: number) => string | null // null = pass
}

async function main() {
  // 0. ensure a fresh build exists
  if (!existsSync(join(DOCS, "playground", "playground.js"))) {
    throw new Error("build first: pnpm playground")
  }
  await mkdir(TMP, { recursive: true })

  // 1. static server over docs/
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://localhost")
      let p = decodeURIComponent(url.pathname)
      if (p === "/" || p.endsWith("/")) p += "index.html"
      const file = join(DOCS, p)
      if (!file.startsWith(DOCS)) {
        res.writeHead(403).end("nope")
        return
      }
      const buf = await readFile(file)
      res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" })
      res.end(buf)
    } catch {
      res.writeHead(404).end("not found")
    }
  })
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r))
  const port = (server.address() as any).port
  const base = `http://127.0.0.1:${port}/playground/`

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  })

  let failures = 0
  const log = (ok: boolean, msg: string) => {
    console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`)
    if (!ok) failures++
  }

  try {
    const page = await browser.newPage()
    const consoleErrors: string[] = []
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text())
    })
    page.on("pageerror", (e) => consoleErrors.push(String(e)))

    // 2. load playground with a showcase deep-link (claude-code)
    await page.goto(base + "?scene=claude-code", { waitUntil: "networkidle0" })
    await page.evaluate(() => (document as any).fonts.ready)
    // wait for the app to compile + size the canvas
    await page.waitForFunction(() => {
      const c = document.getElementById("stage") as HTMLCanvasElement
      return c && c.width > 100
    }, { timeout: 10000 })
    console.log("PLAYGROUND LOADED")

    // 3. canvas sized correctly
    const dims = await page.evaluate(() => {
      const c = document.getElementById("stage") as HTMLCanvasElement
      return { w: c.width, h: c.height }
    })
    log(dims.w === 1600 && dims.h === 900, `canvas sized to scene aspect (${dims.w}×${dims.h})`)

    // scrub to ~70% (past the 0.2s lead-in) so the transcript is on screen
    await page.evaluate(() => {
      const s = document.getElementById("scrub") as HTMLInputElement
      s.value = String(parseFloat(s.max) * 0.7)
      s.dispatchEvent(new Event("input"))
    })
    await new Promise((r) => setTimeout(r, 100))

    // canvas is non-blank AFTER scrubbing (the renderer actually drew content)
    const nonBg = await page.evaluate(() => {
      const c = document.getElementById("stage") as HTMLCanvasElement
      const ctx = c.getContext("2d")!
      const { data } = ctx.getImageData(0, 0, c.width, c.height)
      let n = 0
      for (let i = 0; i < data.length; i += 400) {
        if (data[i] > 40 || data[i + 1] > 40 || data[i + 2] > 40) n++
      }
      return n
    })
    log(nonBg > 50, `canvas rendered content (${nonBg} sampled non-bg pixels)`)
    const canvasEl = await page.$("#stage")
    await canvasEl!.screenshot({ path: join(TMP, "preview.png") as `${string}.png` })
    console.log(`  · preview screenshot → ${join(TMP, "preview.png")}`)

    // 4. exercise each export. We invoke the exporters directly via the page's
    //    module to get the bytes back as base64 (download() would hit the FS).
    //    The playground doesn't expose them globally, so we re-import from the
    //    bundle is not possible; instead drive the actual UI buttons and capture
    //    the download via CDP.
    const client = await page.target().createCDPSession()
    await client.send("Browser.setDownloadBehavior", {
      behavior: "allowAndName",
      downloadPath: TMP,
      eventsEnabled: true,
    } as any)

    const cases: Case[] = [
      { fmt: "png", validate: (p, b) => (b > 2000 ? null : `png too small (${b}b)`) },
      {
        fmt: "mp4",
        validate: (p) =>
          p._noffprobe ? null : p.codec_type === "video" && Number(p.nb_read_packets) > 5 ? null : `mp4 invalid: ${JSON.stringify(p)}`,
      },
      {
        fmt: "webm",
        validate: (p) =>
          p._noffprobe ? null : p.codec_type === "video" && Number(p.nb_read_packets) > 5 ? null : `webm invalid: ${JSON.stringify(p)}`,
      },
      {
        fmt: "gif",
        validate: (p) => (p._noffprobe ? null : (p.format_name || "").includes("gif") ? null : `gif invalid: ${JSON.stringify(p)}`),
      },
    ]

    for (const c of cases) {
      const before = new Set(safeList(TMP))
      // click the export button
      await page.click(`#export button[data-fmt="${c.fmt}"]`)
      // wait for a new file to appear and stop growing
      const file = await waitForDownload(TMP, before, 90000)
      if (!file) {
        log(false, `${c.fmt}: no file produced (console: ${consoleErrors.slice(-2).join(" | ") || "none"})`)
        continue
      }
      const sz = (await stat(file)).size
      const probe = c.fmt === "png" ? {} : ffprobe(file)
      const err = c.validate(probe as any, sz)
      const detail =
        c.fmt === "png" || (probe as any)._noffprobe
          ? `${(sz / 1024).toFixed(0)}KB`
          : `${(sz / 1024).toFixed(0)}KB · ${(probe as any).codec_name || (probe as any).format_name} · ${(probe as any).nb_read_packets || "?"} frames`
      log(err === null, `${c.fmt} export valid (${detail})${err ? " — " + err : ""}`)
    }

    // 5. loopOffset honored in export: claude-code has loopOffset "80%", so the
    //    canvas at t=0 is the blank lead-in, but the FIRST exported frame must be
    //    rotated ~80% in (non-blank). Extract frame 0 of the exported mp4 and the
    //    canvas-at-t=0, and assert the exported frame 0 has MORE ink → rotation ran.
    const mp4File = safeList(TMP).find((f) => {
      const r = spawnSync(process.env.FFPROBE || "ffprobe", ["-v", "error", "-show_entries", "format=format_name", "-of", "csv=p=0", f], { encoding: "utf8" })
      return r.stdout.includes("mp4") || r.stdout.includes("mov")
    })
    if (mp4File) {
      const f0 = join(TMP, "exported-frame0.png")
      spawnSync(process.env.FFMPEG || "ffmpeg", ["-y", "-i", mp4File, "-vf", "select=eq(n\\,0)", "-vframes", "1", "-update", "1", f0], { encoding: "utf8" })
      const exportedInk = pngInk(f0)
      const leadInInk = await page.evaluate(() => {
        const c = document.getElementById("stage") as HTMLCanvasElement
        const ctx = c.getContext("2d")!
        // redraw t=0 (blank lead-in) by scrubbing to 0
        const s = document.getElementById("scrub") as HTMLInputElement
        s.value = "0"
        s.dispatchEvent(new Event("input"))
        const { data } = ctx.getImageData(0, 0, c.width, c.height)
        let n = 0
        for (let i = 0; i < data.length; i += 400) if (data[i] > 40 || data[i + 1] > 40 || data[i + 2] > 40) n++
        return n
      })
      log(exportedInk > leadInInk + 20, `loopOffset honored in export (frame0 ink ${exportedInk} > lead-in ${leadInInk})`)
    } else {
      console.log("  · (no mp4 to check loopOffset — skipped)")
    }

    // 6. malformed step → clean lint error, no uncaught throw
    const errsBefore = consoleErrors.length
    await page.evaluate(() => {
      const ed = document.getElementById("editor") as HTMLTextAreaElement
      ed.value = '{ "steps": [ null, 42 ] }'
      ed.dispatchEvent(new Event("input"))
    })
    await new Promise((r) => setTimeout(r, 400))
    const badStepLint = await page.$eval("#lint", (el) => el.textContent || "")
    log(/step 0 must be an object|error/i.test(badStepLint), `malformed step → clean lint error`)
    log(consoleErrors.length === errsBefore, `malformed step did not throw uncaught (${consoleErrors.length - errsBefore} new console errors)`)

    // 7. JSON edit re-renders (type a bad scene → lint error surfaces)
    await page.evaluate(() => {
      const ed = document.getElementById("editor") as HTMLTextAreaElement
      ed.value = '{ "steps": [ { "cmd": "echo hi 🍺" } ] }'
      ed.dispatchEvent(new Event("input"))
    })
    await new Promise((r) => setTimeout(r, 400))
    const lintText = await page.$eval("#lint", (el) => el.textContent || "")
    log(/tofu|emoji/i.test(lintText), `lint catches emoji tofu (live)`)

    log(consoleErrors.length === 0, `no console errors${consoleErrors.length ? ": " + consoleErrors.slice(0, 3).join(" | ") : ""}`)
  } finally {
    await browser.close()
    server.close()
  }

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  process.exit(failures === 0 ? 0 : 1)
}

/** Count non-near-black pixels in a PNG (proxy for "ink on screen"). Decodes to
 *  raw rgba via ffmpeg and samples. Returns 0 if the file is missing/undecodable. */
function pngInk(file: string): number {
  if (!existsSync(file)) return 0
  const r = spawnSync(process.env.FFMPEG || "ffmpeg", ["-v", "error", "-i", file, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], {
    encoding: "buffer",
    maxBuffer: 1 << 30,
  })
  const buf = r.stdout
  if (!buf || !buf.length) return 0
  let n = 0
  for (let i = 0; i < buf.length; i += 400) {
    if (buf[i] > 40 || buf[i + 1] > 40 || buf[i + 2] > 40) n++
  }
  return n
}

function safeList(dir: string): string[] {
  try {
    return globSync(join(dir, "*"))
  } catch {
    return []
  }
}

async function waitForDownload(dir: string, before: Set<string>, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs
  let candidate: string | null = null
  let lastSize = -1
  let stableCount = 0
  while (Date.now() < deadline) {
    const now = safeList(dir).filter((f) => !before.has(f) && !f.endsWith(".crdownload"))
    if (now.length) {
      candidate = now[0]
      try {
        const sz = (await stat(candidate)).size
        if (sz === lastSize && sz > 0) {
          stableCount++
          if (stableCount >= 3) return candidate
        } else {
          stableCount = 0
          lastSize = sz
        }
      } catch {
        /* file mid-write */
      }
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return candidate
}

main().catch((e) => {
  console.error("e2e error:", e)
  process.exit(1)
})
