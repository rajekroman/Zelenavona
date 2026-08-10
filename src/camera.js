export class FollowCamera {
  constructor({ worldWidth, worldHeight, damping = 8, deadZone = 70 } = {}) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.damping = damping;
    this.deadZone = deadZone;
    this.x = worldWidth / 2;
    this.y = worldHeight / 2;
    this.initialized = false;
  }

  snap(target, viewport) {
    this.x = target.x;
    this.y = target.y;
    this.initialized = true;
    this.clamp(viewport);
  }

  update(target, viewport, dt) {
    if (!this.initialized) return this.snap(target, viewport);
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    let desiredX = this.x;
    let desiredY = this.y;
    if (Math.abs(dx) > this.deadZone) desiredX = target.x - Math.sign(dx) * this.deadZone;
    if (Math.abs(dy) > this.deadZone) desiredY = target.y - Math.sign(dy) * this.deadZone;
    const t = 1 - Math.exp(-this.damping * Math.max(0, dt));
    this.x += (desiredX - this.x) * t;
    this.y += (desiredY - this.y) * t;
    this.clamp(viewport);
  }

  clamp(viewport) {
    const halfW = viewport.width / 2;
    const halfH = viewport.height / 2;
    const minX = Math.min(halfW, this.worldWidth / 2);
    const maxX = Math.max(this.worldWidth - halfW, this.worldWidth / 2);
    const minY = Math.min(halfH, this.worldHeight / 2);
    const maxY = Math.max(this.worldHeight - halfH, this.worldHeight / 2);
    this.x = Math.min(maxX, Math.max(minX, this.x));
    this.y = Math.min(maxY, Math.max(minY, this.y));
  }

  worldToScreen(point, viewport) {
    return {
      x: point.x - this.x + viewport.width / 2,
      y: point.y - this.y + viewport.height / 2
    };
  }
}
