import { readFile } from "node:fs/promises"
import { resolve, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { CompiledScene } from "./types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENGINE_DIR = resolve(__dirname, "engine")

/**
 * Build a STANDALONE scrubber HTML for a compiled scene — engine, scene, and
 * fonts all inlined, no server required. Open the file (or share it) and drag
 * the timeline to preview the scene frame-by-frame. This is the portable form of
 * `termscene preview`: a single self-contained file an assistant can hand to a
 * user, or drop into a PR, to review pacing before rendering.
 */
export async function buildScrubber(scene: CompiledScene): Promise<string> {
  let engine = await readFile(join(ENGINE_DIR, "engine.html"), "utf8")
  const fonts: Record<string, string> = {
    "jbm-Regular.woff2": await fontData("jbm-Regular.woff2"),
    "jbm-Bold.woff2": await fontData("jbm-Bold.woff2"),
    "jbm-Italic.woff2": await fontData("jbm-Italic.woff2"),
    // technical-glyph fallback (braille, ⎿, ✻ ✦ ↳, box/block) JBM/DejaVu lack
    "symbols-Regular.woff2": await fontData("symbols-Regular.woff2"),
  }
  for (const [name, b64] of Object.entries(fonts)) {
    engine = engine.replaceAll(`url(fonts/${name})`, `url(data:font/woff2;base64,${b64})`)
  }
  // inject the scene so the engine boots standalone
  const sceneInject = `<script>window.SCENE=${JSON.stringify(scene)};</script>`
  engine = engine.replace("</head>", `${sceneInject}</head>`)
  // the engine HTML contains its own </script> tags; escape them so embedding the
  // doc inside this page's <script> as a JS string doesn't terminate it early.
  const engineDoc = JSON.stringify(engine).replace(/<\/script>/gi, "<\\/script>")

  const dur = scene.duration
  const w = scene.meta.width
  const h = scene.meta.height

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>termscene · scrubber</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0c0b09;color:#cfcbc2;font:14px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif;
    display:flex;flex-direction:column;height:100vh;align-items:center;padding:24px;gap:18px}
  #frame{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center}
  iframe{border:0;background:#000;box-shadow:0 24px 70px -24px rgba(0,0,0,.7);max-width:100%;max-height:100%}
  .controls{width:min(900px,100%);display:flex;align-items:center;gap:14px}
  button{background:#211f1a;color:#cfcbc2;border:1px solid #34302a;border-radius:8px;
    padding:8px 16px;font:inherit;cursor:pointer}
  button:hover{border-color:#4a443c}
  input[type=range]{flex:1;accent-color:#d97757}
  .t{font-variant-numeric:tabular-nums;color:#8a8273;min-width:104px;text-align:right}
  .hint{color:#5d5a52;font-size:12px}
</style></head><body>
<div id="frame"><iframe id="stage" width="${w}" height="${h}"></iframe></div>
<div class="controls">
  <button id="play">▶ play</button>
  <input id="scrub" type="range" min="0" max="${dur}" step="0.001" value="0">
  <span class="t" id="time">0.00 / ${dur.toFixed(2)}s</span>
</div>
<div class="hint">drag to scrub · space to play/pause · ${w}×${h} · ${dur.toFixed(1)}s</div>
<script>
const ENGINE=${engineDoc}, DUR=${dur}, W=${w}, H=${h};
let playing=false, t=0, raf=null, last=0;
const stage=document.getElementById('stage'), scrub=document.getElementById('scrub'),
      timeEl=document.getElementById('time'), playBtn=document.getElementById('play');
function fit(){
  const box=document.getElementById('frame').getBoundingClientRect();
  const s=Math.min(box.width/W, box.height/H, 1);
  stage.style.width=(W*s)+'px'; stage.style.height=(H*s)+'px';
}
function render(tt){
  t=tt; scrub.value=tt; timeEl.textContent=tt.toFixed(2)+' / '+DUR.toFixed(2)+'s';
  const w=stage.contentWindow; if(w&&w.__render) w.__render(tt);
}
function tick(ts){ if(!playing) return; if(!last) last=ts; const dt=(ts-last)/1000; last=ts;
  let nt=t+dt; if(nt>=DUR){ nt=DUR; pause(); } render(nt); if(playing) raf=requestAnimationFrame(tick); }
function play(){ if(t>=DUR) t=0; playing=true; last=0; playBtn.textContent='⏸ pause'; raf=requestAnimationFrame(tick); }
function pause(){ playing=false; playBtn.textContent='▶ play'; cancelAnimationFrame(raf); }
playBtn.onclick=()=>playing?pause():play();
scrub.oninput=()=>{ pause(); render(parseFloat(scrub.value)); };
document.body.onkeydown=(e)=>{ if(e.code==='Space'){e.preventDefault(); playing?pause():play();} };
addEventListener('resize',fit);
stage.onload=()=>render(t);
fit(); stage.srcdoc=ENGINE;
</script></body></html>`
}

async function fontData(name: string): Promise<string> {
  const buf = await readFile(join(ENGINE_DIR, "fonts", name))
  return buf.toString("base64")
}
