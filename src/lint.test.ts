import { describe, it, expect } from "vitest"
import { lint, summarize } from "./lint.js"

describe("lint", () => {
  it("passes a clean scene", () => {
    const f = lint({ meta: { theme: { preset: "claude" } }, steps: [{ cmd: "ls" }, { out: "ok" }] })
    expect(summarize(f).errors).toBe(0)
  })

  it("errors on an empty scene", () => {
    expect(lint({ steps: [] }).some((x) => x.code === "empty-scene")).toBe(true)
  })

  it("errors on an unknown theme preset", () => {
    const f = lint({ meta: { theme: { preset: "nope" } }, steps: [{ cmd: "x" }] })
    expect(f.some((x) => x.code === "unknown-theme" && x.level === "error")).toBe(true)
  })

  it("warns on emoji that render as tofu", () => {
    const f = lint({ steps: [{ out: "done 🍺" }] })
    expect(f.some((x) => x.code === "tofu-glyph" && x.level === "warn")).toBe(true)
  })

  it("does NOT flag geometric glyphs that render fine", () => {
    const f = lint({ steps: [{ out: "● Edit  → ✓ ⬢ ▸" }] })
    expect(f.some((x) => x.code === "tofu-glyph")).toBe(false)
  })

  it("errors on a progress step without a positive duration", () => {
    const f = lint({ steps: [{ progress: "x", duration: 0 } as any] })
    expect(f.some((x) => x.code === "bad-progress")).toBe(true)
  })

  it("errors on a negative wait", () => {
    const f = lint({ steps: [{ wait: -1 } as any] })
    expect(f.some((x) => x.code === "bad-wait")).toBe(true)
  })

  it("rejects a malformed loopOffset percentage", () => {
    const f = lint({ meta: { loopOffset: "abc" }, steps: [{ cmd: "x" }] })
    expect(f.some((x) => x.code === "bad-loop-offset")).toBe(true)
  })

  it("accepts a valid loopOffset percentage", () => {
    const f = lint({ meta: { loopOffset: "25%" }, steps: [{ cmd: "x" }] })
    expect(f.some((x) => x.code === "bad-loop-offset")).toBe(false)
  })
})
