// Browser-safe scene validation — the portable kernel lifted from src/load.ts's
// validateScene(). The CLI reads scenes from disk; the playground gets a JS object
// from JSON.parse of the editor text. Same structural gate, no node I/O.
//
// AUTHORING IS JSON-ONLY. The CLI's loadScene also accepts .ts/.js via dynamic
// import() — that's arbitrary-code-execution in a browser and is deliberately NOT
// supported here. JSON covers every shipped example and the full scene format.

import type { Scene } from "../../src/types.js"

export class SceneParseError extends Error {}

/** Parse editor text → Scene, throwing a friendly message on bad JSON/shape. */
export function parseScene(text: string): Scene {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e: any) {
    throw new SceneParseError(`Invalid JSON: ${e.message}`)
  }
  return validateScene(raw)
}

/** Structural check (mirror of load.ts validateScene, minus the path arg). */
export function validateScene(raw: unknown): Scene {
  if (raw == null || typeof raw !== "object") {
    throw new SceneParseError('Scene must be an object with a "steps" array')
  }
  const s = raw as Record<string, unknown>
  if (!Array.isArray(s.steps)) {
    throw new SceneParseError('Scene is missing a "steps" array')
  }
  if (s.meta != null && typeof s.meta !== "object") {
    throw new SceneParseError("scene.meta must be an object")
  }
  // each step must be an object — a null/primitive entry would throw deep inside
  // lint()/compile() instead of failing cleanly here.
  const bad = (s.steps as unknown[]).findIndex((st) => st == null || typeof st !== "object")
  if (bad !== -1) {
    throw new SceneParseError(`step ${bad} must be an object (got ${s.steps[bad] === null ? "null" : typeof s.steps[bad]})`)
  }
  return raw as Scene
}
