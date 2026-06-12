// Client-side video export for the playground.
//
// PRIMARY PATH: WebCodecs VideoEncoder via mediabunny (Output + CanvasSource).
// Needs NO cross-origin isolation (works on GitHub Pages, which can't set COOP/COEP).
// We render each frame with the SAME canvas-renderer the preview uses, so what you
// scrub is what you export — deterministic per t.
//
// GIF: lazy-loaded gif.js (WebCodecs can't emit GIF). Slower; short clips only.
//
// FIDELITY NOTE: client export is visually faithful but not byte-identical to the
// CLI's puppeteer+ffmpeg reference render (canvas text AA + codec bitstream vary by
// browser/OS/GPU). The CLI stays the reference renderer for reproducible output.

import {
  Output,
  BufferTarget,
  Mp4OutputFormat,
  WebMOutputFormat,
  CanvasSource,
  QUALITY_HIGH,
  getFirstEncodableVideoCodec,
  canEncodeVideo,
} from "mediabunny"
import type { CompiledScene } from "../../src/types.js"
import { drawFrame } from "./canvas-renderer.js"

export type ExportFormat = "mp4" | "webm" | "gif" | "png"

export interface ExportResult {
  blob: Blob
  filename: string
  mime: string
  codec?: string
  note?: string
}

export interface ExportProgress {
  (done: number, total: number, phase: string): void
}

/** Frame count for a scene at its fps (matches renderer.ts: round(duration*fps)). */
export function frameCount(scene: CompiledScene): number {
  const fps = scene.meta.fps ?? 30
  return Math.max(1, Math.round(scene.duration * fps))
}

/** Resolve meta.loopOffset (frame index or "NN%") to an integer frame in [0,total).
 *  Mirrors renderer.ts resolveLoopOffset so playground exports match the CLI's
 *  seamless-loop frame rotation. */
function resolveLoopOffset(lo: number | string | undefined, total: number): number {
  if (lo == null) return 0
  let n: number
  if (typeof lo === "string" && lo.trim().endsWith("%")) n = Math.round((parseFloat(lo) / 100) * total)
  else n = Math.round(Number(lo))
  if (!Number.isFinite(n)) return 0
  return ((n % total) + total) % total
}

/** The scene time to draw for output frame `i`, honoring loopOffset (cyclic). The
 *  CLI rotates the rendered frame sequence; we instead pick the rotated SOURCE
 *  time, which is equivalent and deterministic. Output frame i still carries its
 *  own timestamp i/fps in the container. */
function frameTime(i: number, fps: number, total: number, offset: number): number {
  const src = (i + offset) % total
  return Math.round((src / fps) * 1000) / 1000
}

/** Make a canvas sized to the scene and draw frame at time t. */
function renderTo(canvas: HTMLCanvasElement, scene: CompiledScene, t: number): void {
  const ctx = canvas.getContext("2d")!
  drawFrame(ctx, scene, t)
}

/** A single PNG still at time t (defaults to a readable mid-point). */
export async function exportPng(scene: CompiledScene, t?: number): Promise<ExportResult> {
  const canvas = document.createElement("canvas")
  canvas.width = scene.meta.width
  canvas.height = scene.meta.height
  const tt = t ?? Math.min(scene.duration, scene.duration * 0.66)
  renderTo(canvas, scene, tt)
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"))
  return { blob, filename: "termscene.png", mime: "image/png" }
}

/**
 * Pick the best encodable video codec for a format, given the scene dimensions.
 * For mp4 we prefer avc (H.264) then fall back to av1/vp9; for webm, vp9 then av1.
 * Returns null if the browser can encode none of them (→ caller shows fallback).
 */
async function pickCodec(format: "mp4" | "webm", w: number, h: number): Promise<string | null> {
  const candidates = format === "mp4" ? ["avc", "av1", "vp9"] : ["vp9", "av1", "vp8"]
  const codec = await getFirstEncodableVideoCodec(candidates as any, { width: w, height: h })
  return codec
}

/** Whether this browser can export the given video format at this size. */
export async function canExport(format: "mp4" | "webm", w: number, h: number): Promise<boolean> {
  if (typeof (globalThis as any).VideoEncoder === "undefined") return false
  return (await pickCodec(format, w, h)) != null
}

/**
 * Export an mp4 or webm via WebCodecs + mediabunny. Frames are drawn on an
 * OffscreenCanvas (falls back to a detached <canvas>) and pushed to the encoder
 * with explicit per-frame timestamps → deterministic frame ordering.
 */
export async function exportVideo(
  scene: CompiledScene,
  format: "mp4" | "webm",
  onProgress?: ExportProgress,
): Promise<ExportResult> {
  const W = scene.meta.width
  const H = scene.meta.height
  const fps = scene.meta.fps ?? 30
  const total = frameCount(scene)

  if (typeof (globalThis as any).VideoEncoder === "undefined") {
    throw new ExportUnsupportedError("This browser has no WebCodecs VideoEncoder. Try Chrome/Edge, or export a PNG/GIF.")
  }
  const codec = await pickCodec(format, W, H)
  if (!codec) {
    throw new ExportUnsupportedError(
      `This browser can't encode ${format.toUpperCase()} at ${W}×${H}. Try the other format, or PNG/GIF.`,
    )
  }

  // Offscreen if available (faster, off the main canvas); else a plain canvas.
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(W, H) : Object.assign(document.createElement("canvas"), { width: W, height: H })
  const ctx = (canvas as any).getContext("2d") as CanvasRenderingContext2D

  const output = new Output({
    format: format === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
    target: new BufferTarget(),
  })
  const source = new CanvasSource(canvas, { codec: codec as any, bitrate: QUALITY_HIGH })
  output.addVideoTrack(source, { frameRate: fps })
  await output.start()

  const dur = 1 / fps
  const offset = resolveLoopOffset(scene.meta.loopOffset, total)
  for (let i = 0; i < total; i++) {
    const srcT = frameTime(i, fps, total, offset) // honor loopOffset (rotated source)
    const outT = Math.round((i / fps) * 1000) / 1000 // monotonic output timestamp
    drawFrame(ctx, scene, srcT)
    await source.add(outT, dur)
    onProgress?.(i + 1, total, "encoding")
  }
  await output.finalize()

  const buffer = (output.target as BufferTarget).buffer!
  const mime = format === "mp4" ? "video/mp4" : "video/webm"
  const blob = new Blob([buffer], { type: mime })
  return { blob, filename: `termscene.${format}`, mime, codec }
}

/** Copy a (possibly SharedArrayBuffer-backed) byte view into a fresh ArrayBuffer
 *  so it satisfies BlobPart's ArrayBufferView<ArrayBuffer> constraint. */
function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(view.byteLength)
  new Uint8Array(out).set(view)
  return out
}

export class ExportUnsupportedError extends Error {}

/**
 * GIF export via gifenc — synchronous, worker-free, bundles cleanly. WebCodecs
 * can't emit GIF, so this is the dedicated GIF path. We quantize per-frame to a
 * 256-color palette (the engine's themes are low-color, so this is near-lossless),
 * yielding behavior comparable to the CLI's ffmpeg two-pass palette. Slower than
 * video — keep GIF clips short. Yields to the event loop periodically so the UI
 * progress bar stays responsive.
 */
export async function exportGif(scene: CompiledScene, onProgress?: ExportProgress): Promise<ExportResult> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc")
  const W = scene.meta.width
  const H = scene.meta.height
  const fps = scene.meta.fps ?? 30
  const total = frameCount(scene)
  const delay = Math.round(1000 / fps)

  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!

  const gif = GIFEncoder()
  const offset = resolveLoopOffset(scene.meta.loopOffset, total)
  for (let i = 0; i < total; i++) {
    drawFrame(ctx, scene, frameTime(i, fps, total, offset)) // honor loopOffset
    const { data } = ctx.getImageData(0, 0, W, H)
    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)
    gif.writeFrame(index, W, H, { palette, delay })
    onProgress?.(i + 1, total, "quantizing")
    if (i % 6 === 0) await new Promise((r) => setTimeout(r, 0)) // keep UI responsive
  }
  gif.finish()
  const blob = new Blob([toArrayBuffer(gif.bytes())], { type: "image/gif" })
  return { blob, filename: "termscene.gif", mime: "image/gif" }
}

/** Trigger a browser download of an export result. */
export function download(result: ExportResult): void {
  const url = URL.createObjectURL(result.blob)
  const a = document.createElement("a")
  a.href = url
  a.download = result.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
