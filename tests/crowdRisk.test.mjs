import test from "node:test";
import assert from "node:assert/strict";
import { CrowdRisk } from "../src/crowdRisk.js";

test("crowd risk grows only inside the event crowd zone", () => {
  const risk = new CrowdRisk({ zone: { x: 100, y: 100, width: 200, height: 100 }, gainPerSecond: 40, recoverPerSecond: 20, threshold: 100 });
  let result = risk.update({ x: 150, y: 140 }, 1);
  assert.equal(result.inRisk, true);
  assert.equal(result.value, 40);
  assert.equal(result.robbed, false);
  result = risk.update({ x: 20, y: 20 }, 1);
  assert.equal(result.inRisk, false);
  assert.equal(result.value, 20);
});

test("crowd risk triggers robbery at threshold and reset clears it", () => {
  const risk = new CrowdRisk({ zone: { x: 0, y: 0, width: 100, height: 100 }, gainPerSecond: 50, recoverPerSecond: 20, threshold: 100 });
  risk.update({ x: 50, y: 50 }, 1);
  const result = risk.update({ x: 50, y: 50 }, 1);
  assert.equal(result.robbed, true);
  assert.equal(result.value, 100);
  risk.reset();
  assert.equal(risk.value, 0);
});
