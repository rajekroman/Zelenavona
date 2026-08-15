import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { LEVELS } from "../src/levels.js";
import { CHLUM_PLATE, CHLUM_PLATE_CHUNKS, assembleChlumPlateDataUrl } from "../src/plateData.js";

test("Chlum uses the in-repo production raster without changing other level assets", () => {
  assert.equal(LEVELS.chlum.plate, CHLUM_PLATE);
  assert.match(LEVELS.chlum.plate, /^data:image\/jpeg;base64,/);
  assert.equal(LEVELS.nesmen.plate, "./assets/nesmen/nesmen-v7-plate.svg");
  assert.equal(LEVELS.besednice.plate, "./assets/besednice/besednice-v7-plate.svg");
  assert.equal(LEVELS.slavie.plate, "./assets/slavie/slavie-v7-plate.svg");
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
  assert.ok(data.length > 300_000, "production raster should contain substantial image data");
  assert.ok(data.length < 600_000, "production raster should stay within the expected compact budget");
  assert.equal(data.toString("base64"), base64, "the entire Base64 payload should decode without truncation");
  assert.deepEqual([...data.subarray(0, 2)], [0xff, 0xd8], "JPEG must start with SOI");
  assert.deepEqual([...data.subarray(-2)], [0xff, 0xd9], "JPEG must end with EOI");
});
