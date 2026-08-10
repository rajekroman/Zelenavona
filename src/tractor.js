export class TractorPatrol {
  constructor({ minX = 260, maxX = 1540, y = 710, speed = 115 } = {}) {
    this.minX = minX;
    this.maxX = maxX;
    this.x = minX;
    this.y = y;
    this.speed = speed;
    this.direction = 1;
  }

  update(dt) {
    this.x += this.direction * this.speed * Math.max(0, dt);
    if (this.x >= this.maxX) {
      this.x = this.maxX;
      this.direction = -1;
    } else if (this.x <= this.minX) {
      this.x = this.minX;
      this.direction = 1;
    }
    return this;
  }

  collides(player, radius = 54) {
    return Math.hypot(player.x - this.x, player.y - this.y) <= radius;
  }
}
