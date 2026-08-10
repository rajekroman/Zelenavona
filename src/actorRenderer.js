const loadImage = source => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error(`Actor asset failed to load: ${source}`));
  image.src = source;
});

export class ActorRenderer {
  constructor({ ctx, camera, viewport }) {
    this.ctx = ctx;
    this.camera = camera;
    this.viewport = viewport;
    this.assets = new Map();
    this.ready = false;
  }

  async load(entries) {
    const loaded = await Promise.all(Object.entries(entries).map(async ([id, source]) => [id, await loadImage(source)]));
    this.assets = new Map(loaded);
    this.ready = true;
    return this;
  }

  screenScale(scale = 1) {
    return scale * Math.min(1.05, this.camera.zoom / .72);
  }

  drawShadow(x, y, scale = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(10,12,9,.3)";
    ctx.beginPath();
    ctx.ellipse(x, y + 3 * scale, 31 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  draw(id, point, { scale = 1, facingX = 0, pose = null } = {}) {
    const image = this.assets.get(id);
    if (!image) return false;
    const viewport = this.viewport();
    const screen = this.camera.worldToScreen(point, viewport);
    const renderScale = this.screenScale(scale);
    const bob = (pose?.bob ?? 0) * renderScale;
    const lean = (pose?.lean ?? 0) * .18 * (Math.sign(facingX) || 1);
    const reach = (pose?.reach ?? 0) * .12;
    const width = 78 * renderScale;
    const height = 113 * renderScale;
    const flip = facingX < -0.08 ? -1 : 1;

    this.drawShadow(screen.x, screen.y + 7 * renderScale, renderScale);
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(screen.x, screen.y - bob + reach);
    ctx.rotate(lean);
    ctx.scale(flip, 1);
    ctx.drawImage(image, -width / 2, -height, width, height);
    ctx.restore();
    return true;
  }
}
