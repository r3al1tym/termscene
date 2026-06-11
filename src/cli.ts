#!/usr/bin/env node
import { compile } from "./compiler.js"
import { loadScene } from "./load.js"
import { render, type OutputFormat } from "./renderer.js"
import { serve } from "./server.js"

const HELP = `termscene — design-forward, deterministic videos of terminal experiences

USAGE
  termscene render <scene> [--out file] [--format mp4|gif|webm] [--fps N]
  termscene preview <scene> [--port N]
  termscene compile <scene>                 print the compiled timeline (debug)

EXAMPLES
  termscene render demo.scene.json --out demo.mp4
  termscene render demo.scene.json --out demo.gif        # format inferred from ext
  termscene preview demo.scene.json                       # scrub & iterate in browser

A scene is a .json / .ts / .js file: { meta?, steps: [...] }. See examples/.
`

interface Args {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parse(argv: string[]): Args {
  const a: Args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i]
    if (v.startsWith("--")) {
      const key = v.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith("--")) {
        a[key] = next
        i++
      } else a[key] = true
    } else (a._ as string[]).push(v)
  }
  return a
}

async function main() {
  const args = parse(process.argv.slice(2))
  const [cmd, scenePath] = args._

  if (!cmd || cmd === "help" || args.help) {
    console.log(HELP)
    process.exit(cmd ? 0 : 1)
  }

  if (cmd === "compile") {
    requireScene(scenePath)
    const compiled = compile(await loadScene(scenePath))
    console.log(JSON.stringify(compiled, null, 2))
    return
  }

  if (cmd === "preview") {
    requireScene(scenePath)
    const port = args.port ? parseInt(String(args.port), 10) : 5180
    const url = await serve(scenePath, port)
    console.log(`termscene preview → ${url}`)
    console.log("edit the scene file and click ↻ reload to iterate. ctrl-c to stop.")
    return // keep the server alive
  }

  if (cmd === "render") {
    requireScene(scenePath)
    const compiled = compile(await loadScene(scenePath))
    const format = (args.format as OutputFormat) || undefined
    const out =
      (args.out as string) ||
      scenePath.replace(/\.(scene\.)?(json|ts|js|mjs)$/i, "") + "." + (format || "mp4")
    const fps = args.fps ? parseInt(String(args.fps), 10) : undefined

    const total = Math.round(compiled.duration * (fps ?? compiled.meta.fps))
    process.stdout.write(
      `rendering ${compiled.events.length} events · ${compiled.duration}s · ` +
        `${compiled.meta.width}×${compiled.meta.height} → ${out}\n`,
    )
    let lastPct = -1
    await render(compiled, {
      out,
      format,
      fps,
      onProgress: (done, t) => {
        const pct = Math.floor((done / t) * 100)
        if (pct !== lastPct && pct % 5 === 0) {
          process.stdout.write(`\r  ${pct}%  (${done}/${t} frames)`)
          lastPct = pct
        }
      },
    })
    process.stdout.write(`\rwrote ${out}                         \n`)
    return
  }

  console.error(`unknown command: ${cmd}\n`)
  console.log(HELP)
  process.exit(1)
}

function requireScene(p: string | undefined): asserts p is string {
  if (!p) {
    console.error("error: missing <scene> file\n")
    console.log(HELP)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error("\ntermscene error:", e?.message || e)
  process.exit(1)
})
