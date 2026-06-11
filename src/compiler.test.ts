import { describe, it, expect } from "vitest"
import { compile } from "./compiler.js"
import type { Scene } from "./types.js"

describe("compile", () => {
  it("flattens steps onto a monotonic virtual clock", () => {
    const scene: Scene = {
      steps: [{ cmd: "echo hi" }, { out: "hi" }, { wait: 1 }, { cmd: "ls" }],
    }
    const c = compile(scene)
    const times = c.events.map((e) =>
      e.kind === "cmd" ? e.typeStart : e.kind === "out" ? e.appearAt : (e as any).appearAt,
    )
    // strictly non-decreasing
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1])
  })

  it("types a command over its length / typeSpeed", () => {
    const c = compile({ meta: { typeSpeed: 10 }, steps: [{ cmd: "0123456789" }] })
    const cmd = c.events[0]
    if (cmd.kind !== "cmd") throw new Error("expected cmd")
    expect(cmd.typeEnd - cmd.typeStart).toBeCloseTo(1.0, 1) // 10 chars / 10 cps = 1s
    expect(cmd.commitAt).toBeGreaterThan(cmd.typeEnd) // Enter after a hold
  })

  it("commits a command before its output appears", () => {
    const c = compile({ steps: [{ cmd: "build" }, { out: "done" }] })
    const cmd = c.events[0]
    const out = c.events[1]
    if (cmd.kind !== "cmd" || out.kind !== "out") throw new Error("shape")
    expect(out.appearAt).toBeGreaterThanOrEqual(cmd.commitAt!)
  })

  it("expands an array of output lines with a delay between them", () => {
    const c = compile({ steps: [{ out: ["a", "b", "c"] }] })
    const outs = c.events.filter((e) => e.kind === "out")
    expect(outs).toHaveLength(3)
    expect((outs[1] as any).appearAt).toBeGreaterThan((outs[0] as any).appearAt)
  })

  it("streams output over the given seconds budget", () => {
    const c = compile({ steps: [{ out: "hello world", stream: 2 }] })
    const out = c.events[0]
    if (out.kind !== "out") throw new Error("expected out")
    expect(out.streamEnd).not.toBeNull()
    expect(out.streamEnd! - out.appearAt).toBeCloseTo(2, 1)
  })

  it("resolves aspect presets and theme presets", () => {
    const c = compile({ meta: { aspect: "portrait", theme: { preset: "midnight" } }, steps: [] })
    expect(c.meta.width).toBe(1080)
    expect(c.meta.height).toBe(1920)
    expect(c.meta.theme!.bg).toBe("#0d1117")
  })

  it("lets explicit theme fields override the preset", () => {
    const c = compile({ meta: { theme: { preset: "claude", accent: "#ff0000" } }, steps: [] })
    expect(c.meta.theme!.accent).toBe("#ff0000")
    expect(c.meta.theme!.bg).toBe("#15140f") // preset value preserved
  })

  it("throws on an unknown theme preset", () => {
    expect(() => compile({ meta: { theme: { preset: "nope" } }, steps: [] })).toThrow(/unknown theme/)
  })
})
