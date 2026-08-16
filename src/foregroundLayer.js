const canvas = document.querySelector("#foreground");
const ctx = canvas?.getContext("2d");
const plate = new Image();

let ready = false;
let source = null;
let dpr = 1;
let viewport = { width: innerWidth, height: innerHeight };

function resize() {
  if (!canvas) return;
  dpr = Math.min(devicePixelRatio || 1, 2);
  viewport = { width: Math.max(1, innerWidth), height: Math.max(1, innerHeight) };
  canvas.width = Math.round(viewport.width * dpr);
  canvas.height = Math.round(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
}

function ensureSource(runtime) {
  const next = runtime?.level?.foreground;
  if (!next) {
    if (source !== null || !ready) {
      source = null;
      ready = true;
      window.__zelenaForeground = { ready: true, canvas, source: null };
    }
    return;
  }
  if (next === source) return;
  source = next;
  ready = false;
  plate.src = source;
}

function draw() {
  if (!canvas || !ctx) return;
  const runtime = window.__zelenaVlna;
  ensureSource(runtime);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  if (ready && source && runtime?.camera && runtime?.WORLD) {
    ctx.save();
    runtime.camera.applyWorldTransform(ctx, viewport);
    ctx.drawImage(plate, 0, 0, runtime.WORLD.width, runtime.WORLD.height);
    ctx.restore();
  }
  requestAnimationFrame(draw);
}

if (canvas && ctx) {
  addEventListener("resize", resize, { passive: true });
  resize();
  plate.onload = () => {
    ready = true;
    window.__zelenaForeground = { ready: true, canvas, source };
  };
  plate.onerror = () => {
    ready = false;
    window.__zelenaForeground = { ready: false, canvas, source };
  };
  window.__zelenaForeground = { ready: false, canvas, source: null };
  requestAnimationFrame(draw);
}
