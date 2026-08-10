export class FollowCamera {
  constructor({ worldWidth, worldHeight, damping = 8, deadZone = 70, zoom = 1, focusOffsetX = 0, focusOffsetY = 0 } = {}) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.damping = damping;
    this.deadZone = deadZone;
    this.zoom = zoom;
    this.focusOffsetX = focusOffsetX;
    this.focusOffsetY = focusOffsetY;
    this.x = worldWidth / 2;
    this.y = worldHeight / 2;
    this.initialized = false;
  }

  setView({ zoom = this.zoom, focusOffsetX = this.focusOffsetX, focusOffsetY = this.focusOffsetY } = {}, viewport = null) {
    this.zoom = Math.max(0.2, Number(zoom) || 1);
    this.focusOffsetX = Number(focusOffsetX) || 0;
    this.focusOffsetY = Number(focusOffsetY) || 0;
    if (viewport) this.clamp(viewport);
    return this;
  }

  focusPoint(target) {
    return {
      x: target.x - this.focusOffsetX,
      y: target.y - this.focusOffsetY
    };
  }

  snap(target, viewport) {
    const focus = this.focusPoint(target);
    this.x = focus.x;
    this.y = focus.y;
    this.initialized = true;
    this.clamp(viewport);
  }

  update(target, viewport, dt) {
    if (!this.initialized) return this.snap(target, viewport);
    const focus = this.focusPoint(target);
    const dx = focus.x - this.x;
    const dy = focus.y - this.y;
    let desiredX = this.x;
    let desiredY = this.y;
    if (Math.abs(dx) > this.deadZone) desiredX = focus.x - Math.sign(dx) * this.deadZone;
    if (Math.abs(dy) > this.deadZone) desiredY = focus.y - Math.sign(dy) * this.deadZone;
    const t = 1 - Math.exp(-this.damping * Math.max(0, dt));
    this.x += (desiredX - this.x) * t;
    this.y += (desiredY - this.y) * t;
    this.clamp(viewport);
  }

  clamp(viewport) {
    const coverZoom = Math.max(
      viewport.width / this.worldWidth,
      viewport.height / this.worldHeight
    ) * 1.08;
    this.zoom = Math.max(this.zoom, coverZoom);

    const halfW = viewport.width / (2 * this.zoom);
    const halfH = viewport.height / (2 * this.zoom);
    const minX = Math.min(halfW, this.worldWidth / 2);
    const maxX = Math.max(this.worldWidth - halfW, this.worldWidth / 2);
    const minY = Math.min(halfH, this.worldHeight / 2);
    const maxY = Math.max(this.worldHeight - halfH, this.worldHeight / 2);
    this.x = Math.min(maxX, Math.max(minX, this.x));
    this.y = Math.min(maxY, Math.max(minY, this.y));
  }

  worldToScreen(point, viewport) {
    return {
      x: (point.x - this.x) * this.zoom + viewport.width / 2,
      y: (point.y - this.y) * this.zoom + viewport.height / 2
    };
  }

  applyWorldTransform(ctx, viewport) {
    ctx.translate(viewport.width / 2, viewport.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
}
