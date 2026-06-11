import { writeFile, mkdir, readFile } from "node:fs/promises"
import { resolve, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { compile } from "../src/compiler.js"
import { render } from "../src/renderer.js"
import { SCENES } from "./scenes.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, "out")

async function main() {
  await mkdir(OUT, { recursive: true })
  const only = process.argv.slice(2) // optional scene ids to render a subset

  const manifest: { id: string; title: string; tests: string; file: string; dur: number; w: number; h: number }[] = []

  for (const ws of SCENES) {
    if (only.length && !only.includes(ws.id)) continue
    const compiled = compile(ws.scene)
    const file = `${ws.id}.mp4`
    process.stdout.write(`render ${ws.id} (${compiled.duration}s, ${compiled.meta.width}×${compiled.meta.height})… `)
    const t0 = Date.now()
    await render(compiled, { out: join(OUT, file), quiet: true })
    process.stdout.write(`${((Date.now() - t0) / 1000).toFixed(1)}s\n`)
    manifest.push({
      id: ws.id, title: ws.title, tests: ws.tests, file,
      dur: compiled.duration, w: compiled.meta.width, h: compiled.meta.height,
    })
  }

  await writeFile(join(OUT, "index.html"), gallery(manifest, false))
  console.log(`\nworkbench → ${join(OUT, "index.html")}`)

  // also emit a single self-contained file (videos base64-inlined) for sharing
  if (!only.length) {
    const inlined = await Promise.all(
      manifest.map(async (m) => ({
        ...m,
        file: `data:video/mp4;base64,${(await readFile(join(OUT, m.file))).toString("base64")}`,
      })),
    )
    await writeFile(join(OUT, "workbench.html"), gallery(inlined, true))
    console.log(`shareable → ${join(OUT, "workbench.html")}`)
  }
}

function gallery(items: any[], _inlined: boolean): string {
  const cards = items
    .map(
      (it) => `
    <figure class="card">
      <div class="vid" data-aspect="${(it.w / it.h).toFixed(3)}">
        <video src="${it.file}" muted loop playsinline preload="metadata"></video>
      </div>
      <figcaption>
        <div class="row"><b>${esc(it.title)}</b><span class="dim">${it.w}×${it.h} · ${it.dur}s</span></div>
        <div class="tests">${esc(it.tests)}</div>
      </figcaption>
    </figure>`,
    )
    .join("")

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>termscene · workbench</title>
<style>
  :root{--bg:#0c0b09;--card:#16140f;--line:#2a2620;--ink:#e7e2d6;--dim:#8a8273;--accent:#d97757}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--ink);font:15px/1.6 ui-sans-serif,system-ui,-apple-system,sans-serif;padding:48px 32px 80px}
  header{max-width:1200px;margin:0 auto 36px}
  h1{font-size:24px;font-weight:600;letter-spacing:-.01em}
  .lede{color:var(--dim);margin-top:8px;max-width:60ch}
  .controls{margin-top:18px;display:flex;gap:10px;align-items:center}
  button{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:8px 14px;font:inherit;cursor:pointer}
  button:hover{border-color:#4a443c}
  .grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px;align-items:start}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
  .vid{background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative}
  .vid video{width:100%;height:auto;display:block;max-height:420px;object-fit:contain}
  figcaption{padding:14px 16px 16px}
  .row{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  .row b{font-weight:600}
  .dim{color:var(--dim);font-size:12px;font-variant-numeric:tabular-nums}
  .tests{color:var(--dim);font-size:12.5px;margin-top:6px}
  .hint{color:var(--dim);font-size:12px;margin-top:4px}
</style></head><body>
<header>
  <h1>termscene · workbench</h1>
  <p class="lede">Eight scenes pressure-testing the engine across themes, aspect ratios, window chrome, prompts, progress bars, streaming, and error states. Each is a ~15-line declarative scene file.</p>
  <div class="controls">
    <button id="playAll">▶ play all</button>
    <button id="pauseAll">⏸ pause all</button>
    <span class="hint">click any video to replay it · they loop</span>
  </div>
</header>
<div class="grid">${cards}</div>
<script>
  const vids = [...document.querySelectorAll('video')];
  vids.forEach(v=>{ v.addEventListener('click',()=>{ v.currentTime=0; v.play(); }); });
  // autoplay each once it scrolls into view
  const io=new IntersectionObserver((es)=>es.forEach(e=>{ if(e.isIntersecting) e.target.play(); }),{threshold:.4});
  vids.forEach(v=>io.observe(v));
  document.getElementById('playAll').onclick=()=>vids.forEach(v=>{v.currentTime=0;v.play()});
  document.getElementById('pauseAll').onclick=()=>vids.forEach(v=>v.pause());
</script>
</body></html>`
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

main().catch((e) => {
  console.error("workbench build error:", e?.message || e)
  process.exit(1)
})
