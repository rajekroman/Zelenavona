import test from "node:test";
import assert from "node:assert/strict";
import { FollowCamera } from "../src/camera.js";

test("camera snaps to player and remains inside world bounds", () => {
  const camera = new FollowCamera({ worldWidth: 1920, worldHeight: 1440 });
  camera.snap({ x: 10, y: 10 }, { width: 1280, height: 720 });
  assert.equal(camera.x, 640);
  assert.equal(camera.y, 360);
});

test("camera keeps small movement inside dead zone", () => {
  const camera = new FollowCamera({ worldWidth: 1920, worldHeight: 1440, deadZone: 80 });
  const viewport = { width: 900, height: 600 };
  camera.snap({ x: 900, y: 800 }, viewport);
  camera.update({ x: 940, y: 820 }, viewport, 1 / 60);
  assert.equal(camera.x, 900);
  assert.equal(camera.y, 800);
});

test("camera damps movement after leaving dead zone", () => {
  const camera = new FollowCamera({ worldWidth: 1920, worldHeight: 1440, damping: 8, deadZone: 50 });
  const viewport = { width: 900, height: 600 };
  camera.snap({ x: 900, y: 800 }, viewport);
  camera.update({ x: 1200, y: 800 }, viewport, 1 / 60);
  assert.ok(camera.x > 900);
  assert.ok(camera.x < 1150);
});

test("zoom expands the visible world while keeping screen projection stable", () => {
  const viewport = { width: 1280, height: 720 };
  const camera = new FollowCamera({ worldWidth: 1920, worldHeight: 1440, zoom: .72 });
  camera.snap({ x: 960, y: 800 }, viewport);
  const projected = camera.worldToScreen({ x: 960, y: 800 }, viewport);
  assert.equal(projected.x, 640);
  assert.equal(projected.y, 360);
  assert.ok(viewport.width / camera.zoom > viewport.width);
});

test("vertical focus offset deliberately composes the player below screen center", () => {
  const viewport = { width: 1280, height: 720 };
  const camera = new FollowCamera({ worldWidth: 1920, worldHeight: 1440, zoom: .72, focusOffsetY: 230 });
  const player = { x: 960, y: 1050 };
  camera.snap(player, viewport);
  const projected = camera.worldToScreen(player, viewport);
  assert.ok(projected.y > viewport.height * .65);
  assert.ok(projected.y < viewport.height * .85);
});

test("portrait camera always covers the authored world without black bars", () => {
  const viewport = { width: 390, height: 844 };
  const camera = new FollowCamera({ worldWidth: 1920, worldHeight: 1440, zoom: .58, focusOffsetY: 250 });
  camera.snap({ x: 620, y: 1040 }, viewport);
  assert.ok(camera.zoom * 1440 > viewport.height);
  assert.ok(camera.zoom * 1920 > viewport.width);
  const projected = camera.worldToScreen({ x: 620, y: 1040 }, viewport);
  assert.ok(projected.y > viewport.height * .62);
  assert.ok(projected.y < viewport.height * .82);
});
