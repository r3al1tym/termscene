import { mkdir } from "node:fs/promises"
import { resolve, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { compile } from "../src/compiler.js"
import { render } from "../src/renderer.js"
import { SHOWCASE } from "./scenes.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, "out")

async function main() {
  await mkdir(OUT, { recursive: true })
  const only = process.argv.slice(2)
  for (const s of SHOWCASE) {
    if (only.length && !only.includes(s.id)) continue
    const compiled = compile(s.scene)
    process.stdout.write(`render ${s.id} (${compiled.duration}s)… `)
    const t0 = Date.now()
    await render(compiled, { out: join(OUT, `${s.id}.mp4`), quiet: true })
    process.stdout.write(`${((Date.now() - t0) / 1000).toFixed(1)}s\n`)
  }
  console.log(`\nshowcase clips → ${OUT}`)
}

main().catch((e) => {
  console.error("showcase render error:", e?.message || e)
  process.exit(1)
})
