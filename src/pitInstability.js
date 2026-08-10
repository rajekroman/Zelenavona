function insideZone(point, zone) {
  return point.x >= zone.x && point.x <= zone.x + zone.width && point.y >= zone.y && point.y <= zone.y + zone.height;
}

export class PitInstability {
  constructor({ zone, gainPerSecond = 30, recoverPerSecond = 24, threshold = 100 } = {}) {
    this.zone = zone;
    this.gainPerSecond = gainPerSecond;
    this.recoverPerSecond = recoverPerSecond;
    this.threshold = threshold;
    this.value = 0;
  }

  reset() {
    this.value = 0;
  }

  update(player, dt) {
    const inRisk = insideZone(player, this.zone);
    if (inRisk) this.value = Math.min(this.threshold, this.value + this.gainPerSecond * dt);
    else this.value = Math.max(0, this.value - this.recoverPerSecond * dt);

    return {
      value: this.value,
      inRisk,
      collapsed: inRisk && this.value >= this.threshold
    };
  }
}
