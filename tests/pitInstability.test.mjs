import test from "node:test";
import assert from "node:assert/strict";
import { PitInstability } from "../src/pitInstability.js";

test("pit instability grows only inside the unstable clay zone", () => {
  const hazard = new PitInstability({
    zone: { x: 100, y: 100, width: 200, height: 120 },
    gainPerSecond: 40,
    recoverPerSecond: 20,
    threshold: 100
  });

  let result = hazard.update({ x: 150, y: 140 }, 1);
  assert.equal(result.inRisk, true);
  assert.equal(result.value, 40);
  assert.equal(result.collapsed, false);

  result = hazard.update({ x: 20, y: 20 }, 1);
  assert.equal(result.inRisk, false);
  assert.equal(result.value, 20);
});

test("pit instability collapses at threshold and reset clears it", () => {
  const hazard = new PitInstability({
    zone: { x: 0, y: 0, width: 100, height: 100 },
    gainPerSecond: 50,
    recoverPerSecond: 20,
    threshold: 100
  });

  hazard.update({ x: 50, y: 50 }, 1);
  const result = hazard.update({ x: 50, y: 50 }, 1);
  assert.equal(result.collapsed, true);
  assert.equal(result.value, 100);

  hazard.reset();
  assert.equal(hazard.value, 0);
});
