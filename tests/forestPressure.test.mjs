import test from "node:test";
import assert from "node:assert/strict";
import { ForestPressure } from "../src/forestPressure.js";

test("forest pressure rises only inside the configured risk zone and recovers outside", () => {
  const pressure = new ForestPressure({ zone: { x: 100, y: 100, width: 200, height: 200 }, gainPerSecond: 40, recoverPerSecond: 20 });
  let result = pressure.update({ x: 150, y: 150 }, { x: 900, y: 900 }, 1);
  assert.equal(result.inRisk, true);
  assert.equal(result.value, 40);
  result = pressure.update({ x: 20, y: 20 }, { x: 900, y: 900 }, 1);
  assert.equal(result.inRisk, false);
  assert.equal(result.value, 20);
});

test("forest pressure catches at threshold or when the watcher is too close", () => {
  const pressure = new ForestPressure({ zone: { x: 0, y: 0, width: 500, height: 500 }, gainPerSecond: 60, threshold: 100, catchRadius: 80 });
  assert.equal(pressure.update({ x: 100, y: 100 }, { x: 400, y: 400 }, 1).caught, false);
  assert.equal(pressure.update({ x: 100, y: 100 }, { x: 400, y: 400 }, 1).caught, true);
  pressure.reset();
  assert.equal(pressure.update({ x: 100, y: 100 }, { x: 140, y: 130 }, .1).caught, true);
});
