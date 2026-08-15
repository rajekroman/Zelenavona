const loadImage = source => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error(`Visual asset failed to load: ${source}`));
  image.src = source;
});

export class ActorRenderer {
  constructor({ ctx, camera, viewport }) {
    this.ctx = ctx;
    this.camera = camera;
    this.viewport = viewport;
    this.assets = new Map();
    this.ready = false;
    this.animationFrame = {
      character: { state: "idle", legSwing: 0, breathe: 0, crouch: 0 },
      tractor: { wheelPhase: 0, enginePhase: 0 }
    };
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

  drawShadow(x, y, scale = 1, rx = 31, ry = 10) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(10,12,9,.3)";
    ctx.beginPath();
    ctx.ellipse(x, y + 3 * scale, rx * scale, ry * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawArticulatedCharacter(image, width, height, pose, lean) {
    const ctx = this.ctx;
    const sourceWidth = image.naturalWidth || image.width || 1;
    const sourceHeight = image.naturalHeight || image.height || 1;
    const legTopRatio = .54;
    const bodyBottomRatio = .66;
    const hipY = -height + height * .59;
    const legTopY = -height + height * legTopRatio;
    const halfSourceWidth = sourceWidth / 2;
    const halfWidth = width / 2;
    const legHeight = height * (1 - legTopRatio);
    const swing = pose?.legSwing ?? 0;

    const drawLeg = (right, angle) => {
      const sourceX = right ? halfSourceWidth : 0;
      const destinationX = right ? 0 : -halfWidth;
      const pivotX = right ? width * .12 : -width * .12;
      ctx.save();
      ctx.translate(pivotX, hipY);
      ctx.rotate(angle);
      ctx.drawImage(
        image,
        sourceX, sourceHeight * legTopRatio, halfSourceWidth, sourceHeight * (1 - legTopRatio),
        destinationX - pivotX, legTopY - hipY, halfWidth, legHeight
      );
      ctx.restore();
    };

    drawLeg(false, swing);
    drawLeg(true, -swing);

    const breathe = pose?.breathe ?? 0;
    const bodyPivotY = -height + height * .62;
    ctx.save();
    ctx.translate(0, bodyPivotY);
    ctx.rotate(lean + (pose?.bodySway ?? 0));
    ctx.scale(1 - breathe * .2, 1 + breathe);
    ctx.drawImage(
      image,
      0, 0, sourceWidth, sourceHeight * bodyBottomRatio,
      -width / 2, -height - bodyPivotY, width, height * bodyBottomRatio
    );
    ctx.restore();
  }

  drawTractorExhaust(width, height, anchorY, enginePhase) {
    const ctx = this.ctx;
    const pulse = (Math.sin(enginePhase) + 1) / 2;
    const top = -height * anchorY;
    ctx.save();
    ctx.fillStyle = `rgba(188,195,185,${.11 + pulse * .1})`;
    ctx.beginPath();
    ctx.arc(-width / 2 + width * .7, top + height * .075 - pulse * height * .045, height * (.025 + pulse * .012), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawAnimatedWheel(x, y, radius, phase) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(phase);
    ctx.strokeStyle = "rgba(221,203,151,.5)";
    ctx.lineWidth = Math.max(.8, radius * .08);
    ctx.lineCap = "round";
    for (let index = 0; index < 6; index += 1) {
      ctx.save();
      ctx.rotate(index * Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, -radius * .94);
      ctx.lineTo(0, -radius * .72);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  drawTractorWheels(width, height, anchorY, wheelPhase) {
    const top = -height * anchorY;
    this.drawAnimatedWheel(-width / 2 + width * .255, top + height * .635, height * .215, wheelPhase);
    this.drawAnimatedWheel(-width / 2 + width * .67, top + height * .805, height * .13, wheelPhase * 1.65);
    this.drawAnimatedWheel(-width / 2 + width * .89, top + height * .64, height * .105, wheelPhase * 1.9);
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
    const crouch = (pose?.crouch ?? 0) * 113 * renderScale;
    const width = 78 * renderScale;
    const height = 113 * renderScale;
    const flip = facingX < -0.08 ? -1 : 1;

    this.drawShadow(screen.x, screen.y + 7 * renderScale, renderScale);
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(screen.x, screen.y - bob + reach + crouch);
    ctx.scale(flip, 1);
    if (pose) {
      this.drawArticulatedCharacter(image, width, height, pose, lean);
      Object.assign(this.animationFrame.character, {
        state: pose.state,
        legSwing: pose.legSwing,
        breathe: pose.breathe,
        crouch: pose.crouch
      });
    } else {
      ctx.drawImage(image, -width / 2, -height, width, height);
    }
    ctx.restore();
    return true;
  }

  drawSprite(id, point, { width = 120, height = 80, scale = 1, flipX = false, anchorY = 0.82, shadow = true, animation = null } = {}) {
    const image = this.assets.get(id);
    if (!image) return false;
    const viewport = this.viewport();
    const screen = this.camera.worldToScreen(point, viewport);
    const renderScale = this.screenScale(scale);
    const drawWidth = width * renderScale;
    const drawHeight = height * renderScale;
    const enginePhase = animation?.enginePhase ?? 0;
    const bounce = animation ? Math.sin(enginePhase * 2) * .65 * renderScale : 0;
    if (shadow) this.drawShadow(screen.x, screen.y + 5 * renderScale, renderScale, width * .28, height * .08);
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(screen.x, screen.y - bounce);
    ctx.scale(flipX ? -1 : 1, 1);
    if (id === "tractor" && animation) this.drawTractorExhaust(drawWidth, drawHeight, anchorY, enginePhase);
    ctx.drawImage(image, -drawWidth / 2, -drawHeight * anchorY, drawWidth, drawHeight);
    if (id === "tractor" && animation) {
      this.drawTractorWheels(drawWidth, drawHeight, anchorY, animation.wheelPhase ?? 0);
      Object.assign(this.animationFrame.tractor, {
        wheelPhase: animation.wheelPhase ?? 0,
        enginePhase
      });
    }
    ctx.restore();
    return true;
  }
}
