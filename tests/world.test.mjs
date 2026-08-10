import test from "node:test";
import assert from "node:assert/strict";
import { CHLUM, WORLD, availableAction, clampPlayer, objectiveForStep } from "../src/world.js";

test("Chlum player stays inside authored playable bounds", () => {
  const player = { x: -500, y: 9000 };
  clampPlayer(player);
  assert.equal(player.x, 70);
  assert.equal(player.y, WORLD.height - 70);
});

test("Chlum progression exposes exactly one contextual action", () => {
  const state = { step: 0, player: { ...CHLUM.vaclav } };
  assert.deepEqual(availableAction(state), { kind: "talk", label: "MLUVIT" });
  state.step = 1;
  state.player = { ...CHLUM.search };
  assert.deepEqual(availableAction(state), { kind: "search", label: "HLEDAT" });
  state.step = 2;
  state.player = { ...CHLUM.finding };
  assert.deepEqual(availableAction(state), { kind: "collect", label: "SEBRAT" });
});

test("objective labels follow the Chlum vertical slice", () => {
  assert.equal(objectiveForStep(0), "Promluv s Václavem");
  assert.equal(objectiveForStep(1), "Prohledej mokré brázdy");
  assert.equal(objectiveForStep(2), "Seber nalezený vltavín");
  assert.equal(objectiveForStep(3), "Chlum dokončen");
});
