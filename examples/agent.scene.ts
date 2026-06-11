import type { Scene } from "../src/types.js"

// A scene with the "coding agent at work" look — streamed responses, tool lines,
// a closing value line. This is the flavor termscene is especially good at: an
// idealized agent session you fully art-direct, not a captured terminal log.
const scene: Scene = {
  meta: {
    aspect: "square",
    theme: { preset: "claude" },
    window: { chrome: "mac", title: "claude code" },
    fontSize: 27,
    prompt: "❯",
  },
  steps: [
    { cmd: "fix the failing auth test and explain why" },
    { wait: 0.3 },
    {
      out: "Reading the test and the auth middleware to find the mismatch.",
      style: "dim",
      stream: 1.4,
    },
    { out: "● Read(src/auth/middleware.ts)", style: "accent" },
    { out: "● Read(test/auth.test.ts)", style: "accent" },
    { wait: 0.4 },
    {
      out: "The test signs a token with the old 32-byte secret; the middleware now expects the rotated 64-byte key. Aligning the test fixture.",
      stream: 2.2,
    },
    { out: "● Edit(test/fixtures/keys.ts)  +3 −3", style: "accent" },
    { out: "● Bash(pnpm test auth)", style: "accent" },
    { out: "✓ 14 passed", style: "ok" },
    { wait: 0.5 },
    { div: true },
    {
      out: "Fixed — the fixture was on the pre-rotation secret. Tests green.",
      style: "ok",
      stream: 1.6,
    },
  ],
}

export default scene
