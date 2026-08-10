export class ForestPressure {
  constructor({ zone, max = 100, gainPerSecond = 32, recoverPerSecond = 24, catchRadius = 82, threshold = 100 } = {}) {
    this.zone = zone;
    this.max = max;
    this.gainPerSecond = gainPerSecond;
    this.recoverPerSecond = recoverPerSecond;
    this.catchRadius = catchRadius;
    this.threshold = threshold;
    this.value = 0;
  }

  insideZone(point) {
    if (!this.zone) return false;
    return point.x >= this.zone.x && point.x <= this.zone.x + this.zone.width && point.y >= this.zone.y && point.y <= this.zone.y + this.zone.height;
  }

  distanceTo(point, target) {
    return Math.hypot(point.x - target.x, point.y - target.y);
  }

  update(player, watcher, dt) {
    const inRisk = this.insideZone(player);
    const nearWatcher = watcher && this.distanceTo(player, watcher) < this.catchRadius;
    const delta = Math.max(0, dt);

    if (inRisk) this.value = Math.min(this.max, this.value + this.gainPerSecond * delta);
    else this.value = Math.max(0, this.value - this.recoverPerSecond * delta);

    return {
      inRisk,
      nearWatcher,
      caught: Boolean(nearWatcher || this.value >= this.threshold),
      value: this.value
    };
  }

  reset(value = 0) {
    this.value = Math.max(0, Math.min(this.max, value));
  }
}
