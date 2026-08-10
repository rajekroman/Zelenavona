import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { LEVELS } from "../src/levels.js";

test("Chlum uses the production terrain plate without changing other level assets", () => {
  assert.equal(LEVELS.chlum.plate, "./assets/chlum/chlum-v7-plate-prod.svg");
  assert.equal(LEVELS.nesmen.plate, "./assets/nesmen/nesmen-v7-plate.svg");
  assert.equal(LEVELS.besednice.plate, "./assets/besednice/besednice-v7-plate.svg");
  assert.equal(LEVELS.slavie.plate, "./assets/slavie/slavie-v7-plate.svg");
});

test("Chlum production terrain plate is authored at the full world size and contains no baked HUD labels", () => {
  const svg = fs.readFileSync(new URL("../assets/chlum/chlum-v7-plate-prod.svg", import.meta.url), "utf8");
  assert.match(svg, /width="1920" height="1440"/);
  assert.match(svg, /viewBox="0 0 1920 1440"/);
  assert.match(svg, /id="mudNoise"/);
  assert.match(svg, /id="water"/);
  assert.doesNotMatch(svg, /HUD|JOYSTICK|AKCE|POZORNOST|STABILITA|KLID/i);
});
