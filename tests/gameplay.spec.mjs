import { test, expect } from "@playwright/test";

async function runtime(page) {
  return page.evaluate(() => ({
    ready: Boolean(window.__zelenaVlna),
    level: window.__zelenaVlna?.level?.id ?? null,
    step: window.__zelenaVlna?.state?.step ?? -1,
    completed: Boolean(window.__zelenaVlna?.state?.completed),
    forestPressure: window.__zelenaVlna?.state?.forestPressure ?? 0,
    pitInstability: window.__zelenaVlna?.state?.pitInstability ?? 0,
    crowdRisk: window.__zelenaVlna?.state?.crowdRisk ?? 0,
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
  },
  {
    id: "besednice",
    url: "/?level=besednice",
    label: "BESEDNICE",
    objectives: ["Najdi čerstvý jílový řez", "Prohledej štěrkovou kapsu", "Besednice dokončena"]
  },
  {
    id: "slavie",
    url: "/?level=slavie",
    label: "SLÁVIE",
    objectives: ["Najdi stánek s vltavíny", "Prověř pravost kamene", "Slávie dokončena"]
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
  await expect(page.locator("#meterLabel")).toHaveText("KLID");
  await page.evaluate(() => {
    const runtime = window.__zelenaVlna;
    const zone = runtime.level.pressure.zone;
    runtime.state.step = 1;
    runtime.state.hazardCooldown = 0;
    runtime.state.player.x = zone.x + zone.width / 2;
    runtime.state.player.y = zone.y + zone.height / 2;
    runtime.forestPressure.reset();
  });

  await expect.poll(async () => (await runtime(page)).forestPressure, { timeout: 3000 }).toBeGreaterThan(10);
  await expect.poll(async () => page.locator("#calmFill").evaluate(node => {
    const width = parseFloat(getComputedStyle(node).width);
    const trackWidth = parseFloat(getComputedStyle(node.parentElement).width);
    return trackWidth > 0 ? width / trackWidth : 1;
  }), { timeout: 3000 }).toBeLessThan(.95);

  await expect.poll(async () => {
    const current = await runtime(page);
    const spawn = await page.evaluate(() => window.__zelenaVlna.level.spawn);
    return Math.hypot(current.player.x - spawn.x, current.player.y - spawn.y);
  }, { timeout: 5000 }).toBeLessThan(5);
  await expect.poll(async () => (await runtime(page)).forestPressure).toBe(0);
});

test("BESEDNICE unstable clay edge drains STABILITA and collapses back to safe ground", async ({ page }) => {
  await page.goto("/?level=besednice", { waitUntil: "domcontentloaded" });
  await expect.poll(async () => (await runtime(page)).ready).toBe(true);
  await expect(page.locator("#meterLabel")).toHaveText("STABILITA");
  await page.evaluate(() => {
    const runtime = window.__zelenaVlna;
    const zone = runtime.level.instability.zone;
    runtime.state.step = 1;
    runtime.state.hazardCooldown = 0;
    runtime.state.player.x = zone.x + zone.width / 2;
    runtime.state.player.y = zone.y + zone.height / 2;
    runtime.pitInstability.reset();
  });

  await expect.poll(async () => (await runtime(page)).pitInstability, { timeout: 3000 }).toBeGreaterThan(10);
  await expect.poll(async () => page.locator("#calmFill").evaluate(node => {
    const width = parseFloat(getComputedStyle(node).width);
    const trackWidth = parseFloat(getComputedStyle(node.parentElement).width);
    return trackWidth > 0 ? width / trackWidth : 1;
  }), { timeout: 3000 }).toBeLessThan(.95);

  await expect.poll(async () => {
    const current = await runtime(page);
    const spawn = await page.evaluate(() => window.__zelenaVlna.level.spawn);
    return Math.hypot(current.player.x - spawn.x, current.player.y - spawn.y);
  }, { timeout: 6000 }).toBeLessThan(5);
  await expect.poll(async () => (await runtime(page)).pitInstability).toBe(0);
});

test("SLÁVIE crowd zone drains POZORNOST and pickpocket risk sends the hunter to the event edge", async ({ page }) => {
  await page.goto("/?level=slavie", { waitUntil: "domcontentloaded" });
  await expect.poll(async () => (await runtime(page)).ready).toBe(true);
  await expect(page.locator("#meterLabel")).toHaveText("POZORNOST");
  await page.evaluate(() => {
    const runtime = window.__zelenaVlna;
    const zone = runtime.level.crowdRisk.zone;
    runtime.state.step = 1;
    runtime.state.hazardCooldown = 0;
    runtime.state.player.x = zone.x + zone.width / 2;
    runtime.state.player.y = zone.y + zone.height / 2;
    runtime.crowdRisk.reset();
  });

  await expect.poll(async () => (await runtime(page)).crowdRisk, { timeout: 3000 }).toBeGreaterThan(10);
  await expect.poll(async () => page.locator("#calmFill").evaluate(node => {
    const width = parseFloat(getComputedStyle(node).width);
    const trackWidth = parseFloat(getComputedStyle(node.parentElement).width);
    return trackWidth > 0 ? width / trackWidth : 1;
  }), { timeout: 3000 }).toBeLessThan(.95);

  await expect.poll(async () => {
    const current = await runtime(page);
    const spawn = await page.evaluate(() => window.__zelenaVlna.level.spawn);
    return Math.hypot(current.player.x - spawn.x, current.player.y - spawn.y);
  }, { timeout: 6000 }).toBeLessThan(5);
  await expect.poll(async () => (await runtime(page)).crowdRisk).toBe(0);
});
