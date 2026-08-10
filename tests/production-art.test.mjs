import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { LEVELS } from "../src/levels.js";

test("Chlum uses the production raster terrain plate without changing other level assets", () => {
  assert.equal(LEVELS.chlum.plate, "./assets/chlum/chlum-v7-plate-prod.jpg");
  assert.equal(LEVELS.nesmen.plate, "./assets/nesmen/nesmen-v7-plate.svg");
  assert.equal(LEVELS.besednice.plate, "./assets/besednice/besednice-v7-plate.svg");
  assert.equal(LEVELS.slavie.plate, "./assets/slavie/slavie-v7-plate.svg");
});

test("Chlum production raster is stored directly in the repository", () => {
  const path = new URL("../assets/chlum/chlum-v7-plate-prod.jpg", import.meta.url);
  const data = fs.readFileSync(path);
  assert.ok(data.length > 40000, "production raster should contain real image data");
  assert.equal(data[0], 0xff);
  assert.equal(data[1], 0xd8);
  assert.equal(data[data.length - 2], 0xff);
  assert.equal(data[data.length - 1], 0xd9);
});
