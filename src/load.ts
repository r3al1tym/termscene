import { readFile } from "node:fs/promises"
import { resolve, extname } from "node:path"
import { pathToFileURL } from "node:url"
import type { Scene } from "./types.js"

/** Load a scene from .json, .ts, .js, or .mjs. TS/JS modules export default or `scene`. */
export async function loadScene(path: string): Promise<Scene> {
  const abs = resolve(path)
  const ext = extname(abs).toLowerCase()
  let raw: unknown
  if (ext === ".json") {
    raw = JSON.parse(await readFile(abs, "utf8"))
  } else if (ext === ".ts" || ext === ".js" || ext === ".mjs") {
    // .ts relies on the host running under tsx (dev); dynamic import resolves it
    const mod = await import(pathToFileURL(abs).href)
    raw = mod.default ?? mod.scene
  } else {
    throw new Error(`unsupported scene file: ${path} (use .json, .ts, .js)`)
  }
  return validateScene(raw, path)
}

/** Cheap structural check at the load boundary so compile/scrub (which skip lint)
 *  fail with a clear message instead of a deep, opaque TypeError. */
function validateScene(raw: unknown, path: string): Scene {
  if (raw == null || typeof raw !== "object") {
    throw new Error(`${path}: scene must be an object with a "steps" array`)
  }
  const s = raw as Record<string, unknown>
  if (!Array.isArray(s.steps)) {
    throw new Error(`${path}: scene is missing a "steps" array`)
  }
  if (s.meta != null && typeof s.meta !== "object") {
    throw new Error(`${path}: scene.meta must be an object`)
  }
  return raw as Scene
}
