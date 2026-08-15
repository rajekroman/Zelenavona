import test from "node:test";
import assert from "node:assert/strict";
import { TractorPatrol } from "../src/tractor.js";

test("tractor patrol reverses at authored bounds", () => {
  const tractor = new TractorPatrol({ minX: 0, maxX: 100, speed: 50 });
  tractor.update(3);
  assert.equal(tractor.x, 100);
  assert.equal(tractor.direction, -1);
  tractor.update(3);
  assert.equal(tractor.x, 0);
  assert.equal(tractor.direction, 1);
});

test("tractor collision uses a compact actor radius", () => {
  const tractor = new TractorPatrol({ minX: 100, maxX: 200, y: 400 });
  tractor.x = 150;
  assert.equal(tractor.collides({ x: 180, y: 410 }, 40), true);
  assert.equal(tractor.collides({ x: 230, y: 410 }, 40), false);
});

test("tractor movement advances wheel rotation and engine animation", () => {
  const tractor = new TractorPatrol({ minX: 0, maxX: 500, speed: 64 });
  tractor.update(.5);
  assert.equal(tractor.x, 32);
  assert.equal(tractor.wheelPhase, 1);
  assert.ok(tractor.enginePhase > 0);

  tractor.direction = -1;
  const previousPhase = tractor.wheelPhase;
  tractor.update(.25);
  assert.ok(tractor.wheelPhase < previousPhase, "wheel rotation must reverse with travel direction");
});
