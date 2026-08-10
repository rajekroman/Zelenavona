import { test, expect } from "@playwright/test";

async function runtime(page) {
  return page.evaluate(() => ({
    ready: Boolean(window.__zelenaVlna),
    step: window.__zelenaVlna?.state?.step ?? -1,
    completed: Boolean(window.__zelenaVlna?.state?.completed),
    player: window.__zelenaVlna?.state?.player ? { ...window.__zelenaVlna.state.player } : null
  }));
}

async function placeAt(page, target) {
  await page.evaluate(name => {
    const runtime = window.__zelenaVlna;
    const point = runtime.CHLUM[name];
    runtime.state.player.x = point.x;
    runtime.state.player.y = point.y;
    runtime.state.player.moving = false;
    runtime.state.touchMove.x = 0;
    runtime.state.touchMove.y = 0;
    runtime.state.keys.clear();
    runtime.state.tractorCooldown = 999;
    runtime.camera.snap(runtime.state.player, { width: innerWidth, height: innerHeight });
  }, target);
  await page.waitForTimeout(80);
}

async function contextualAction(page, projectName) {
  if (projectName === "desktop") {
    await page.keyboard.press("KeyE");
  } else {
    const button = page.locator("#actionButton");
    await expect(button).toBeVisible();
    await button.click();
  }
}

test("Chlum quest completes through the real contextual action path", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(async () => (await runtime(page)).ready).toBe(true);
  await expect.poll(async () => Boolean(await page.evaluate(() => window.__zelenaForeground?.ready))).toBe(true);

  if (testInfo.project.name !== "desktop") {
    const before = await runtime(page);
    const zone = page.locator("#moveZone");
    await expect(zone).toBeVisible();
    const box = await zone.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box.x + box.width * .78, box.y + box.height * .5);
    await page.mouse.down();
    await page.waitForTimeout(360);
    await page.mouse.up();
    const after = await runtime(page);
    expect(after.player.x).toBeGreaterThan(before.player.x + 20);
  }

  await placeAt(page, "vaclav");
  await contextualAction(page, testInfo.project.name);
  await expect(page.locator("#objective")).toHaveText("Prohledej mokré brázdy");
  await expect.poll(async () => (await runtime(page)).step).toBe(1);

  await placeAt(page, "search");
  await contextualAction(page, testInfo.project.name);
  await expect(page.locator("#objective")).toHaveText("Seber nalezený vltavín");
  await expect.poll(async () => (await runtime(page)).step).toBe(2);

  await placeAt(page, "finding");
  await contextualAction(page, testInfo.project.name);
  await expect(page.locator("#objective")).toHaveText("Chlum dokončen");
  await expect.poll(async () => (await runtime(page)).step).toBe(3);
  await expect.poll(async () => (await runtime(page)).completed).toBe(true);
});
