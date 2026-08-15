import test from "node:test";
import assert from "node:assert/strict";
import { ACTOR_STATE, ActorAnimator, direction8 } from "../src/animation.js";

test("direction resolver covers cardinal and diagonal movement", () => {
  assert.equal(direction8(1, 0), "east");
  assert.equal(direction8(1, 1), "south-east");
  assert.equal(direction8(0, -1), "north");
  assert.equal(direction8(-1, -1), "north-west");
});

test("movement switches idle and walk without overriding action animation", () => {
  const animator = new ActorAnimator();
  animator.setMovement(1, 0);
  assert.equal(animator.state, ACTOR_STATE.WALK);
  animator.play(ACTOR_STATE.SEARCH, .4);
  animator.setMovement(0, 0);
  assert.equal(animator.state, ACTOR_STATE.SEARCH);
  animator.update(.5);
  assert.equal(animator.state, ACTOR_STATE.IDLE);
});

test("walk pose produces deterministic motion", () => {
  const animator = new ActorAnimator();
  animator.setMovement(0, 1);
  const pose = animator.update(.1);
  assert.equal(pose.state, ACTOR_STATE.WALK);
  assert.equal(pose.direction, "south");
  assert.ok(Math.abs(pose.stride) > 0);
  assert.ok(Math.abs(pose.legSwing) > 0);
  assert.ok(Math.abs(pose.bodySway) > 0);
});

test("idle and one-shot poses expose visible render motion", () => {
  const animator = new ActorAnimator();
  const idle = animator.update(.25);
  assert.notEqual(idle.breathe, 0);

  animator.play(ACTOR_STATE.PICKUP, .65);
  const pickup = animator.update(.325);
  assert.ok(pickup.crouch > .08);
  assert.ok(pickup.reach > 13);
});
