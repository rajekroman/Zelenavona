import fs from "node:fs";
import { test, expect } from "@playwright/test";

async function runtime(page) {
  return page.evaluate(() => ({
    ready: Boolean(window.__zelenaVlna),
    player: window.__zelenaVlna?.state?.player ?? null,
    camera: window.__zelenaVlna?.camera ? { x: window.__zelenaVlna.camera.x, y: window.__zelenaVlna.camera.y } : null
  }));
}

test("Chlum V7 renders a stable visual baseline", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(async () => (await runtime(page)).ready).toBe(true);
  await expect(page.locator("#loading")).toHaveClass(/hidden/);
  await expect(page.locator("#objective")).toHaveText("Promluv s Václavem");
  await expect(page.locator("#game")).toBeVisible();

  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight
  }));
  expect(layout.width).toBe(layout.clientWidth);
  expect(layout.height).toBe(layout.clientHeight);

  if (testInfo.project.name === "desktop") {
    const before = await runtime(page);
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(500);
    await page.keyboard.up("ArrowRight");
    const after = await runtime(page);
    expect(after.player.x).toBeGreaterThan(before.player.x);
    expect(after.camera.x).toBeGreaterThanOrEqual(before.camera.x);
  } else {
    await expect(page.locator("#moveZone")).toBeVisible();
    await expect(page.locator("#actionButton")).toBeVisible();
  }

  const evidenceDir = testInfo.outputPath("evidence");
  fs.mkdirSync(evidenceDir, { recursive: true });
  const evidencePath = `${evidenceDir}/chlum-${testInfo.project.name}.png`;
  await page.screenshot({ path: evidencePath, animations: "disabled", caret: "hide" });
  await testInfo.attach(`chlum-${testInfo.project.name}`, { path: evidencePath, contentType: "image/png" });
});
