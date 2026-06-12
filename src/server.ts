import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { readFile } from "node:fs/promises"
import { resolve, dirname, join, basename } from "node:path"
import { fileURLToPath } from "node:url"
import { compile } from "./compiler.js"
import { loadScene } from "./load.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENGINE_DIR = resolve(__dirname, "engine")

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".css": "text/css",
}

/**
 * Preview/review server. Serves the engine plus a scrub UI so a coding assistant
 * (or a human) can watch the scene, drag the timeline, and re-load on edit BEFORE
 * committing to a render. This is the review surface in the HeyGen-style loop:
 * intent → scene → preview & iterate → render.
 */
export async function serve(scenePath: string, port = 5180): Promise<string> {
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`)
    try {
      if (url.pathname === "/" || url.pathname === "/index.html") {
        res.writeHead(200, { "content-type": "text/html" })
        res.end(REVIEW_HTML)
        return
      }
      if (url.pathname === "/scene.json") {
        // recompile on every request so editing the scene file + reload = live
        const scene = await loadScene(scenePath)
        const compiled = compile(scene)
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" })
        res.end(JSON.stringify(compiled))
        return
      }
      if (url.pathname === "/engine.html") {
        const html = await readFile(join(ENGINE_DIR, "engine.html"), "utf8")
        res.writeHead(200, { "content-type": "text/html" })
        res.end(html)
        return
      }
      if (url.pathname.startsWith("/fonts/")) {
        // basename() strips any path so "../../etc/passwd" can't escape the fonts dir
        const name = basename(url.pathname.replace("/fonts/", ""))
        if (!name.endsWith(".woff2")) {
          res.writeHead(404)
          res.end("not found")
          return
        }
        const buf = await readFile(join(ENGINE_DIR, "fonts", name))
        res.writeHead(200, { "content-type": "font/woff2", "cache-control": "max-age=3600" })
        res.end(buf)
        return
      }
      res.writeHead(404)
      res.end("not found")
    } catch (e) {
      res.writeHead(500, { "content-type": "text/plain" })
      res.end(String(e))
    }
  }

  const server = createServer(handler)
  // bind to loopback only — this is a local review surface, never exposed
  await new Promise<void>((r) => server.listen(port, "127.0.0.1", r))
  return `http://localhost:${port}/`
}

// The review surface: engine in an iframe-free embed + a scrubber + play/pause.
// Intentionally minimal chrome — the point is to watch the scene, not the tool.
const REVIEW_HTML = `<!doctype html><html><head><meta charset="utf-8">
<title>termscene · review</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0c0b09;color:#cfcbc2;font:14px/1.5 ui-sans-serif,system-ui,sans-serif;
    display:flex;flex-direction:column;height:100vh;align-items:center;padding:24px;gap:18px}
  #frame{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center}
  iframe{border:0;background:#000;box-shadow:0 24px 70px -24px rgba(0,0,0,.7);max-width:100%;max-height:100%}
  .controls{width:min(900px,100%);display:flex;align-items:center;gap:14px}
  button{background:#211f1a;color:#cfcbc2;border:1px solid #34302a;border-radius:8px;
    padding:8px 16px;font:inherit;cursor:pointer}
  button:hover{border-color:#4a443c}
  input[type=range]{flex:1;accent-color:#d97757}
  .t{font-variant-numeric:tabular-nums;color:#8a8273;min-width:96px;text-align:right}
  .hint{color:#5d5a52;font-size:12px}
</style></head><body>
<div id="frame"><iframe id="stage"></iframe></div>
<div class="controls">
  <button id="play">▶ play</button>
  <input id="scrub" type="range" min="0" max="1" step="0.001" value="0">
  <span class="t" id="time">0.00 / 0.00s</span>
  <button id="reload" title="recompile the scene file">↻ reload</button>
</div>
<div class="hint">edit the scene file → click ↻ reload · drag to scrub · space to play/pause</div>
<script>
let scene=null, dur=0, playing=false, t=0, raf=null, last=0;
const stage=document.getElementById('stage'), scrub=document.getElementById('scrub'),
      timeEl=document.getElementById('time'), playBtn=document.getElementById('play');

async function loadScene(){
  const r=await fetch('/scene.json',{cache:'no-store'}); scene=await r.json();
  dur=scene.duration||4;
  const m=scene.meta;
  // size the iframe to the scene aspect, fit to viewport
  const box=document.getElementById('frame').getBoundingClientRect();
  const s=Math.min(box.width/m.width,(box.height)/m.height,1);
  stage.width=m.width; stage.height=m.height;
  stage.style.width=(m.width*s)+'px'; stage.style.height=(m.height*s)+'px';
  stage.srcdoc=await buildDoc(scene);
  scrub.max=dur; render(Math.min(t,dur));
}
async function buildDoc(sc){
  let html=await (await fetch('/engine.html')).text();
  html=html.replace('</head>','<base href="/"><scr'+'ipt>window.SCENE='+JSON.stringify(sc)+';</scr'+'ipt></head>');
  return html;
}
function render(tt){
  t=tt; scrub.value=tt;
  timeEl.textContent=tt.toFixed(2)+' / '+dur.toFixed(2)+'s';
  const w=stage.contentWindow;
  if(w&&w.__render) w.__render(tt);
}
function tick(ts){
  if(!playing) return;
  if(!last) last=ts; const dt=(ts-last)/1000; last=ts;
  let nt=t+dt; if(nt>=dur){ nt=dur; pause(); }
  render(nt); if(playing) raf=requestAnimationFrame(tick);
}
function play(){ if(t>=dur) t=0; playing=true; last=0; playBtn.textContent='⏸ pause'; raf=requestAnimationFrame(tick); }
function pause(){ playing=false; playBtn.textContent='▶ play'; cancelAnimationFrame(raf); }
playBtn.onclick=()=>playing?pause():play();
scrub.oninput=()=>{ pause(); render(parseFloat(scrub.value)); };
document.getElementById('reload').onclick=loadScene;
document.body.onkeydown=(e)=>{ if(e.code==='Space'){e.preventDefault(); playing?pause():play();} };
stage.onload=()=>render(t);
loadScene();
</script></body></html>`
