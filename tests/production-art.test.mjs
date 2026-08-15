import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { LEVELS } from "../src/levels.js";
import { CHLUM_PLATE, CHLUM_PLATE_CHUNKS, assembleChlumPlateDataUrl } from "../src/plateData.js";

test("Chlum uses the in-repo production raster without changing other level assets", () => {
  assert.equal(LEVELS.chlum.plate, CHLUM_PLATE);
  assert.match(LEVELS.chlum.plate, /^data:image\/jpeg;base64,/);
  assert.equal(LEVELS.chlum.foreground, "./assets/chlum/chlum-v7-foreground-prod.png");
  assert.equal(LEVELS.nesmen.plate, "./assets/nesmen/nesmen-v7-plate.svg");
  assert.equal(LEVELS.nesmen.foreground, "./assets/nesmen/nesmen-v7-foreground.svg");
  assert.equal(LEVELS.besednice.plate, "./assets/besednice/besednice-v7-plate.svg");
  assert.equal(LEVELS.besednice.foreground, "./assets/besednice/besednice-v7-foreground.svg");
  assert.equal(LEVELS.slavie.plate, "./assets/slavie/slavie-v7-plate.svg");
  assert.equal(LEVELS.slavie.foreground, "./assets/slavie/slavie-v7-foreground.svg");
});

test("Chlum production chunks reconstruct one complete JPEG", () => {
  assert.ok(CHLUM_PLATE_CHUNKS.length > 1);
  assert.ok(CHLUM_PLATE_CHUNKS.every(chunk => chunk.length > 0 && chunk.length <= 32_768));

  const dataUrl = assembleChlumPlateDataUrl();
  const [mime, base64] = dataUrl.split(",");
  assert.equal(mime, "data:image/jpeg;base64");
  assert.equal(base64, CHLUM_PLATE_CHUNKS.join(""));
  assert.doesNotMatch(base64, /\s/);

  const data = Buffer.from(base64, "base64");
  assert.ok(data.length > 500_000, "full-resolution production raster should contain substantial image data");
  assert.ok(data.length < 600_000, "production raster should stay within the expected compact budget");
  assert.equal(data.toString("base64"), base64, "the entire Base64 payload should decode without truncation");
  assert.deepEqual([...data.subarray(0, 2)], [0xff, 0xd8], "JPEG must start with SOI");
  assert.deepEqual([...data.subarray(-2)], [0xff, 0xd9], "JPEG must end with EOI");
});

test("Chlum production overlays are complete transparent PNG assets", () => {
  const assets = [
    ["../assets/actors/hunter-v7-prod.png", 720, 1040, 250_000, 700_000],
    ["../assets/actors/vaclav-v7-prod.png", 720, 1040, 250_000, 700_000],
    ["../assets/actors/tractor-v7-prod.png", 1200, 760, 500_000, 1_200_000],
    ["../assets/chlum/chlum-v7-foreground-prod.png", 1920, 1440, 1_500_000, 3_500_000]
  ];

  for (const [relativeUrl, width, height, minimumBytes, maximumBytes] of assets) {
    const data = readFileSync(new URL(relativeUrl, import.meta.url));
    assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${relativeUrl} must be a PNG`);
    assert.equal(data.readUInt32BE(16), width, `${relativeUrl} width`);
    assert.equal(data.readUInt32BE(20), height, `${relativeUrl} height`);
    assert.equal(data[25], 6, `${relativeUrl} must use RGBA color type`);
    assert.ok(data.length > minimumBytes && data.length < maximumBytes, `${relativeUrl} must stay within its production budget`);
  }
});
