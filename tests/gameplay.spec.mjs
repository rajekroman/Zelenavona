import { test, expect } from "@playwright/test";

async function runtime(page) {
  return page.evaluate(() => ({
    ready: Boolean(window.__zelenaVlna),
    level: window.__zelenaVlna?.level?.id ?? null,
    step: window.__zelenaVlna?.state?.step ?? -1,
    completed: Boolean(window.__zelenaVlna?.state?.completed),
    forestPressure: window.__zelenaVlna?.state?.forestPressure ?? 0,
    player: window.__zelenaVlna?.state?.player ? { ...window.__zelenaVlna.state.player } : null
  }));
}

async function placeAt(page, target) {
  await page.evaluate(name => {
    const runtime = window.__zelenaVlna;
    const point = name === "npc" ? runtime.level.npc : runtime.level[name];
    runtime.state.player.x = point.x;
    runtime.state.player.y = point.y;
    runtime.state.player.moving = false;
    runtime.state.touchMove.x = 0;
    runtime.state.touchMove.y = 0;
    runtime.state.keys.clear();
    runtime.state.hazardCooldown = 999;
    runtime.camera.snap(runtime.state.player, { width: innerWidth, height: innerHeight });
  }, target);
  await page.waitForTimeout(80);
}

async function contextualAction(page, projectName) {
  if (projectName === "desktop") await page.keyboard.press("KeyE");
  else {
    const button = page.locator("#actionButton");
    await expect(button).toBeVisible();
    await button.click();
  }
}

async function assertTouchMovement(page, projectName) {
  if (projectName === "desktop") return;
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

for (const scenario of [
  {
    id: "chlum",
    url: "/?level=chlum",
    label: "CHLUM",
    objectives: ["Prohledej mokré brázdy", "Seber nalezený vltavín", "Chlum dokončen"]
  },
  {
    id: "nesmen",
    url: "/?level=nesmen",
    label: "NESMĚŇ",
    objectives: ["Najdi odkrytý profil", "Prohledej kořeny a štěrk", "Nesměň dokončena"]
  }
]) {
  test(`${scenario.label} quest completes through the shared contextual runtime`, async ({ page }, testInfo) => {
    await page.goto(scenario.url, { waitUntil: "domcontentloaded" });
    await expect.poll(async () => (await runtime(page)).ready).toBe(true);
    await expect.poll(async () => Boolean(await page.evaluate(() => window.__zelenaForeground?.ready))).toBe(true);
    await expect.poll(async () => (await runtime(page)).level).toBe(scenario.id);
    await expect(page.locator("#levelLabel")).toHaveText(scenario.label);
    await assertTouchMovement(page, testInfo.project.name);

    await placeAt(page, "npc");
    await contextualAction(page, testInfo.project.name);
    await expect(page.locator("#objective")).toHaveText(scenario.objectives[0]);

    await placeAt(page, "search");
    await contextualAction(page, testInfo.project.name);
    await expect(page.locator("#objective")).toHaveText(scenario.objectives[1]);

    await placeAt(page, "finding");
    await contextualAction(page, testInfo.project.name);
    await expect(page.locator("#objective")).toHaveText(scenario.objectives[2]);
    await expect.poll(async () => (await runtime(page)).step).toBe(3);
    await expect.poll(async () => (await runtime(page)).completed).toBe(true);
  });
}

test("NESMĚŇ risk zone drains KLID and eventually sends the hunter back to the forest edge", async ({ page }) => {
  await page.goto("/?level=nesmen", { waitUntil: "domcontentloaded" });
  await expect.poll(async () => (await runtime(page)).ready).toBe(true);
  await page.evaluate(() => {
    const runtime = window.__zelenaVlna;
    const zone = runtime.level.pressure.zone;
    runtime.state.step = 1;
    runtime.state.hazardCooldown = 0;
    runtime.state.player.x = zone.x + zone.width / 2;
    runtime.state.player.y = zone.y + zone.height / 2;
    runtime.forestPressure.reset();
  });

  await page.waitForTimeout(700);
  await expect.poll(async () => (await runtime(page)).forestPressure).toBeGreaterThan(10);
  const calmWidth = await page.locator("#calmFill").evaluate(node => parseFloat(getComputedStyle(node).width));
  const calmTrackWidth = await page.locator("#calmFill").evaluate(node => parseFloat(getComputedStyle(node.parentElement).width));
  expect(calmWidth).toBeLessThan(calmTrackWidth);

  await expect.poll(async () => {
    const current = await runtime(page);
    const spawn = await page.evaluate(() => window.__zelenaVlna.level.spawn);
    return Math.hypot(current.player.x - spawn.x, current.player.y - spawn.y);
  }, { timeout: 5000 }).toBeLessThan(5);
  await expect.poll(async () => (await runtime(page)).forestPressure).toBe(0);
});
