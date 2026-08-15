import part00 from "../assets/chlum/chlum-v7-plate-prod-base64/part-00.js";
import part01 from "../assets/chlum/chlum-v7-plate-prod-base64/part-01.js";
import part02 from "../assets/chlum/chlum-v7-plate-prod-base64/part-02.js";
import part03 from "../assets/chlum/chlum-v7-plate-prod-base64/part-03.js";
import part04 from "../assets/chlum/chlum-v7-plate-prod-base64/part-04.js";
import part05 from "../assets/chlum/chlum-v7-plate-prod-base64/part-05.js";
import part06 from "../assets/chlum/chlum-v7-plate-prod-base64/part-06.js";
import part07 from "../assets/chlum/chlum-v7-plate-prod-base64/part-07.js";
import part08 from "../assets/chlum/chlum-v7-plate-prod-base64/part-08.js";
import part09 from "../assets/chlum/chlum-v7-plate-prod-base64/part-09.js";
import part10 from "../assets/chlum/chlum-v7-plate-prod-base64/part-10.js";
import part11 from "../assets/chlum/chlum-v7-plate-prod-base64/part-11.js";
import part12 from "../assets/chlum/chlum-v7-plate-prod-base64/part-12.js";
import part13 from "../assets/chlum/chlum-v7-plate-prod-base64/part-13.js";
import part14 from "../assets/chlum/chlum-v7-plate-prod-base64/part-14.js";
import part15 from "../assets/chlum/chlum-v7-plate-prod-base64/part-15.js";

const MAX_CHUNK_LENGTH = 32_768;
export const CHLUM_PLATE_CHUNKS = Object.freeze([part00, part01, part02, part03, part04, part05, part06, part07, part08, part09, part10, part11, part12, part13, part14, part15]);

export function assembleChlumPlateBase64(chunks = CHLUM_PLATE_CHUNKS) {
  if (!Array.isArray(chunks) || chunks.length < 2) {
    throw new TypeError("Chlum raster requires multiple Base64 chunks.");
  }
  if (chunks.some(chunk => typeof chunk !== "string" || chunk.length === 0 || chunk.length > MAX_CHUNK_LENGTH || /[^A-Za-z0-9+/=]/.test(chunk))) {
    throw new TypeError("Chlum raster contains an invalid Base64 chunk.");
  }

  const base64 = chunks.join("");
  if (base64.length % 4 !== 0 || !base64.startsWith("/9j/") || !base64.endsWith("/9k=")) {
    throw new Error("Chlum raster is not a complete JPEG payload.");
  }
  return base64;
}

export function assembleChlumPlateDataUrl(chunks = CHLUM_PLATE_CHUNKS) {
  return `data:image/jpeg;base64,${assembleChlumPlateBase64(chunks)}`;
}

export const CHLUM_PLATE = assembleChlumPlateDataUrl();
