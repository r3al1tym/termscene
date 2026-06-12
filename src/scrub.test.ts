import { describe, it, expect } from "vitest"
import { compile } from "./compiler.js"
import { buildScrubber } from "./scrub.js"

describe("buildScrubber", () => {
  it("escapes the embedded engine's </script> so the page script isn't terminated early", async () => {
    const scene = compile({ steps: [{ cmd: "echo hi" }, { out: "hi" }] })
    const html = await buildScrubber(scene)
    // the engine doc is embedded as a JS string in the page's <script>; a raw
    // </script> inside it would break out. It must be escaped.
    const afterConst = html.slice(html.indexOf("const ENGINE="))
    expect(afterConst).not.toMatch(/<\/script>\s*,\s*DUR=/) // no unescaped close inside the JS string
    expect(html).toContain("<\\/script>") // escaped form present
  })

  it("inlines the scene and fonts (self-contained, no external fetch)", async () => {
    const scene = compile({ steps: [{ cmd: "ls" }] })
    const html = await buildScrubber(scene)
    expect(html).toContain("window.SCENE=")
    expect(html).toContain("data:font/woff2;base64,") // fonts inlined
    expect(html).not.toContain("url(fonts/") // no relative font refs left
  })
})
