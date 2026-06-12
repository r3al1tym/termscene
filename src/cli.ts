#!/usr/bin/env node
import { compile } from "./compiler.js"
import { loadScene } from "./load.js"
import { render, type OutputFormat } from "./renderer.js"
import { serve } from "./server.js"
import { buildScrubber } from "./scrub.js"
import { lint, summarize } from "./lint.js"
import { scaffold, installSkill, confirm } from "./init.js"
import { docs, DOC_TOPICS } from "./docs.js"
import { writeFile } from "node:fs/promises"

const HELP = `termscene — design-forward, deterministic videos of terminal experiences

USAGE
  termscene render <scene> [--out file] [--format mp4|gif|webm|frames] [--fps N] [--also a.gif,b.webm]
  termscene lint <scene> [--json]                    validate a scene (run after every edit)
  termscene preview <scene> [--port N]               live scrubber server (recompiles on reload)
  termscene scrub <scene> [--out file.html]          standalone self-contained scrubber file
  termscene init [dir] [--skip-skills]               scaffold a project (CLAUDE.md + example) + offer skill install
  termscene skills                                   install the termscene skill into your AI coding agents
  termscene docs [topic]                             offline reference (${Object.keys(DOC_TOPICS).join(", ")})
  termscene compile <scene>                          print the compiled timeline (debug)

EXAMPLES
  termscene render demo.scene.json --out demo.mp4
  termscene render demo.scene.json --out demo.gif --also demo.mp4,demo.webm
  termscene lint demo.scene.json                          # gate before render
  termscene scrub demo.scene.json --out preview.html      # one shareable scrubber file

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

  if (cmd === "lint") {
    requireScene(scenePath)
    const findings = lint(await loadScene(scenePath))
    const { errors, warns, infos } = summarize(findings)
    if (args.json) {
      console.log(JSON.stringify({ findings, summary: { errors, warns, infos } }, null, 2))
    } else {
      for (const x of findings) {
        const where = x.step == null ? "scene" : `step ${x.step}`
        console.log(`  ${x.level.toUpperCase().padEnd(5)} ${where.padEnd(8)} ${x.code} — ${x.message}`)
      }
      console.log(findings.length
        ? `\n${errors} error(s), ${warns} warning(s), ${infos} info`
        : "clean — no issues")
    }
    process.exit(errors > 0 ? 1 : 0)
  }

  if (cmd === "init") {
    const dir = scenePath || "."
    const created = await scaffold(dir)
    console.log(`scaffolded termscene project in ${dir}:`)
    for (const f of created) console.log(`  + ${f}`)

    // Offer to install the skill into the user's AI coding agents (HyperFrames
    // pattern). Skipped via --skip-skills. On non-TTY stdin (CI/agents/pipes)
    // confirm() returns false without prompting — we just print the hint.
    if (!args["skip-skills"]) {
      const yes = await confirm("\nInstall the termscene skill? (Claude Code, Cursor, Codex, …)")
      if (yes) await installSkill()
      else console.log(`\nyou can install it later: termscene skills`)
    }

    console.log(`\nnext: termscene scrub demo.scene.json --out preview.html`)
    return
  }

  if (cmd === "skills") {
    const ok = await installSkill()
    process.exit(ok ? 0 : 1)
  }

  if (cmd === "docs") {
    console.log(docs(scenePath))
    return
  }

  if (cmd === "scrub") {
    requireScene(scenePath)
    const compiled = compile(await loadScene(scenePath))
    const out = (args.out as string) || scenePath.replace(/\.(scene\.)?(json|ts|js|mjs)$/i, "") + ".scrubber.html"
    await writeFile(out, await buildScrubber(compiled))
    console.log(`wrote standalone scrubber → ${out} (${compiled.duration}s, ${compiled.meta.width}×${compiled.meta.height})`)
    return
  }

  if (cmd === "render") {
    requireScene(scenePath)
    const scene = await loadScene(scenePath)
    // gate: refuse to render a scene with errors (warnings are advisory)
    const findings = lint(scene)
    const errs = findings.filter((x) => x.level === "error")
    if (errs.length) {
      console.error(`refusing to render — ${errs.length} lint error(s):`)
      for (const x of errs) console.error(`  ${x.step == null ? "scene" : "step " + x.step}: ${x.message}`)
      console.error(`(run \`termscene lint ${scenePath}\` for the full report)`)
      process.exit(1)
    }
    const compiled = compile(scene)
    const format = (args.format as OutputFormat) || undefined
    const out =
      (args.out as string) ||
      scenePath.replace(/\.(scene\.)?(json|ts|js|mjs)$/i, "") + "." + (format || "mp4")
    const also = args.also ? String(args.also).split(",").map((s) => s.trim()).filter(Boolean) : undefined
    const fps = args.fps ? parseInt(String(args.fps), 10) : undefined

    process.stdout.write(
      `rendering ${compiled.events.length} events · ${compiled.duration}s · ` +
        `${compiled.meta.width}×${compiled.meta.height} → ${out}\n`,
    )
    let lastPct = -1
    await render(compiled, {
      out,
      format,
      fps,
      also,
      onProgress: (done, t) => {
        const pct = Math.floor((done / t) * 100)
        if (pct !== lastPct && pct % 5 === 0) {
          process.stdout.write(`\r  ${pct}%  (${done}/${t} frames)`)
          lastPct = pct
        }
      },
    })
    process.stdout.write(`\rwrote ${[out, ...(also ?? [])].join(", ")}                         \n`)
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
