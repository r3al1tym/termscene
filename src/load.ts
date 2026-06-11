import { readFile } from "node:fs/promises"
import { resolve, extname } from "node:path"
import { pathToFileURL } from "node:url"
import type { Scene } from "./types.js"

/** Load a scene from .json, .ts, .js, or .mjs. TS/JS modules export default or `scene`. */
export async function loadScene(path: string): Promise<Scene> {
  const abs = resolve(path)
  const ext = extname(abs).toLowerCase()
  if (ext === ".json") {
    return JSON.parse(await readFile(abs, "utf8")) as Scene
  }
  if (ext === ".ts") {
    // rely on the host already running under tsx (dev) — dynamic import resolves .ts
    const mod = await import(pathToFileURL(abs).href)
    return (mod.default ?? mod.scene) as Scene
  }
  if (ext === ".js" || ext === ".mjs") {
    const mod = await import(pathToFileURL(abs).href)
    return (mod.default ?? mod.scene) as Scene
  }
  throw new Error(`unsupported scene file: ${path} (use .json, .ts, .js)`)
}
