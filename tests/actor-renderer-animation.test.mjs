import test from "node:test";
import assert from "node:assert/strict";
import { ActorRenderer } from "../src/actorRenderer.js";

function recordingContext() {
  const calls = { drawImage: [], rotate: [], translate: [], scale: [], arc: [], lineTo: [] };
  return {
    calls,
    save() {},
    restore() {},
    beginPath() {},
    fill() {},
    stroke() {},
    translate(...args) { calls.translate.push(args); },
    scale(...args) { calls.scale.push(args); },
    moveTo(...args) { calls.lineTo.push(args); },
    lineTo(...args) { calls.lineTo.push(args); },
    ellipse() {},
    arc(...args) { calls.arc.push(args); },
    rotate(angle) { calls.rotate.push(angle); },
    drawImage(...args) { calls.drawImage.push(args); }
  };
}

function rendererWith(context) {
  return new ActorRenderer({
    ctx: context,
    camera: { zoom: .72, worldToScreen: point => point },
    viewport: () => ({ width: 1280, height: 720 })
  });
}

test("walking hunter is rendered as independently articulated body layers", () => {
  const context = recordingContext();
  const renderer = rendererWith(context);
  renderer.assets.set("hunter", { naturalWidth: 720, naturalHeight: 1040 });

  renderer.draw("hunter", { x: 300, y: 400 }, {
    facingX: 1,
    pose: {
      state: "walk",
      direction: "east",
      gaitX: 1,
      gaitY: 0,
      stepPhase: 1,
      bob: 1,
      legSwing: .2,
      legDepth: 0,
      bodySway: -.03,
      breathe: .01,
      lean: 0,
      reach: 0,
      crouch: 0
    }
  });

  assert.equal(context.calls.drawImage.length, 3, "two legs and the upper body must be drawn separately");
  assert.ok(context.calls.rotate.includes(.2));
  assert.ok(context.calls.rotate.includes(-.2));
  assert.equal(renderer.animationFrame.character.state, "walk");
  assert.equal(renderer.animationFrame.character.legSwing, .2);
});

test("north-south gait uses perspective depth without sideways leg rotation", () => {
  const context = recordingContext();
  const renderer = rendererWith(context);
  renderer.assets.set("hunter", { naturalWidth: 720, naturalHeight: 1040 });

  renderer.draw("hunter", { x: 300, y: 400 }, {
    facingX: 0,
    pose: {
      state: "walk",
      direction: "north",
      gaitX: 0,
      gaitY: -1,
      stepPhase: 1,
      bob: 1,
      legSwing: 0,
      legDepth: -1,
      bodySway: 0,
      breathe: 0,
      lean: 0,
      reach: 0,
      crouch: 0
    }
  });

  assert.equal(context.calls.rotate.filter(angle => Math.abs(angle) > 1e-9).length, 0);
  const legScales = context.calls.scale.slice(1, 3).map(([, y]) => y);
  assert.ok(legScales.some(value => value < 1));
  assert.ok(legScales.some(value => value > 1));
  assert.equal(renderer.animationFrame.character.direction, "north");
  assert.equal(renderer.animationFrame.character.legDepth, -1);
});

test("animated tractor consumes wheel and engine phases during rendering", () => {
  const context = recordingContext();
  const renderer = rendererWith(context);
  renderer.assets.set("tractor", { naturalWidth: 1200, naturalHeight: 760 });

  renderer.drawSprite("tractor", { x: 400, y: 320 }, {
    width: 154,
    height: 98,
    anchorY: .78,
    animation: { wheelPhase: 1.25, enginePhase: .8 }
  });

  assert.equal(context.calls.drawImage.length, 1);
  assert.ok(context.calls.rotate.includes(1.25), "rear wheel must consume the travel phase");
  assert.ok(context.calls.rotate.includes(1.25 * 1.65), "near front wheel must rotate at its smaller-radius rate");
  assert.ok(context.calls.lineTo.length >= 18, "three wheels must receive visible rotating tread marks");
  assert.equal(renderer.animationFrame.tractor.wheelPhase, 1.25);
  assert.equal(renderer.animationFrame.tractor.enginePhase, .8);
});
