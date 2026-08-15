export class TractorPatrol {
  constructor({ minX = 260, maxX = 1540, y = 710, speed = 115 } = {}) {
    this.minX = minX;
    this.maxX = maxX;
    this.x = minX;
    this.y = y;
    this.speed = speed;
    this.direction = 1;
    this.wheelPhase = 0;
    this.enginePhase = 0;
  }

  update(dt) {
    const step = Math.max(0, dt);
    const previousX = this.x;
    this.x += this.direction * this.speed * step;
    if (this.x >= this.maxX) {
      this.x = this.maxX;
      this.direction = -1;
    } else if (this.x <= this.minX) {
      this.x = this.minX;
      this.direction = 1;
    }
    this.wheelPhase = (this.wheelPhase + (this.x - previousX) / 32) % (Math.PI * 2);
    this.enginePhase = (this.enginePhase + step * 8.5) % (Math.PI * 2);
    return this;
  }

  collides(player, radius = 54) {
    return Math.hypot(player.x - this.x, player.y - this.y) <= radius;
  }
}
