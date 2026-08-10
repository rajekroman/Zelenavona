import fs from "node:fs";
import { test, expect } from "@playwright/test";

async function runtime(page) {
  return page.evaluate(() => ({
    ready: Boolean(window.__zelenaVlna),
    foregroundReady: Boolean(window.__zelenaForeground?.ready),
    level: window.__zelenaVlna?.level?.id ?? null,
    player: window.__zelenaVlna?.state?.player ?? null,
    camera: window.__zelenaVlna?.camera ? {
      x: window.__zelenaVlna.camera.x,
      y: window.__zelenaVlna.camera.y,
      zoom: window.__zelenaVlna.camera.zoom
    } : null,
    world: window.__zelenaVlna?.WORLD ?? null
  }));
}

for (const scenario of [
  { id: "chlum", label: "CHLUM", objective: "Promluv s Václavem" },
  { id: "nesmen", label: "NESMĚŇ", objective: "Promluv s lesníkem" }
]) {
  test(`${scenario.label} V7 renders a stable visual baseline`, async ({ page }, testInfo) => {
    await page.goto(`/?level=${scenario.id}`, { waitUntil: "domcontentloaded" });
    await expect.poll(async () => (await runtime(page)).ready).toBe(true);
    await expect.poll(async () => (await runtime(page)).foregroundReady).toBe(true);
    await expect.poll(async () => (await runtime(page)).level).toBe(scenario.id);
    await expect(page.locator("#loading")).toHaveClass(/hidden/);
    await expect(page.locator("#levelLabel")).toHaveText(scenario.label);
    await expect(page.locator("#objective")).toHaveText(scenario.objective);
    await expect(page.locator("#game")).toBeVisible();
    await expect(page.locator("#foreground")).toBeVisible();

    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight
    }));
    expect(layout.width).toBe(layout.clientWidth);
    expect(layout.height).toBe(layout.clientHeight);

    const current = await runtime(page);
    expect(current.camera.zoom * current.world.width).toBeGreaterThanOrEqual(layout.clientWidth);
    expect(current.camera.zoom * current.world.height).toBeGreaterThanOrEqual(layout.clientHeight);

    const layerState = await page.evaluate(() => {
      const game = getComputedStyle(document.querySelector("#game"));
      const foreground = getComputedStyle(document.querySelector("#foreground"));
      const hud = getComputedStyle(document.querySelector("#hud"));
      return {
        gameZ: Number(game.zIndex),
        foregroundZ: Number(foreground.zIndex),
        hudZ: Number(hud.zIndex),
        foregroundPosition: foreground.position,
        foregroundPointerEvents: foreground.pointerEvents
      };
    });
    expect(layerState.foregroundPosition).toBe("absolute");
    expect(layerState.foregroundPointerEvents).toBe("none");
    expect(layerState.foregroundZ).toBeGreaterThan(layerState.gameZ);
    expect(layerState.foregroundZ).toBeLessThan(layerState.hudZ);

    if (testInfo.project.name === "desktop") {
      expect(await page.locator("#controls").evaluate(node => getComputedStyle(node).display)).toBe("none");
      const before = current;
      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(500);
      await page.keyboard.up("ArrowRight");
      const after = await runtime(page);
      expect(after.player.x).toBeGreaterThan(before.player.x);
      expect(after.camera.x).toBeGreaterThanOrEqual(before.camera.x);
    } else {
      const controls = await page.evaluate(() => {
        const root = document.querySelector("#controls");
        const move = document.querySelector("#moveZone");
        const action = document.querySelector("#actionButton");
        const rootRect = root.getBoundingClientRect();
        const moveRect = move.getBoundingClientRect();
        const actionRect = action.getBoundingClientRect();
        const hit = document.elementFromPoint(actionRect.left + actionRect.width / 2, actionRect.top + actionRect.height / 2);
        const style = getComputedStyle(root);
        return {
          display: style.display,
          position: style.position,
          viewportHeight: innerHeight,
          rootTop: rootRect.top,
          rootBottom: rootRect.bottom,
          moveWidth: moveRect.width,
          actionWidth: actionRect.width,
          actionHit: Boolean(hit?.closest("#actionButton"))
        };
      });
      expect(controls.display).toBe("flex");
      expect(controls.position).toBe("absolute");
      expect(controls.rootTop).toBeGreaterThan(controls.viewportHeight * .5);
      expect(controls.rootBottom).toBeLessThanOrEqual(controls.viewportHeight + 1);
      expect(controls.moveWidth).toBeGreaterThan(60);
      expect(controls.actionWidth).toBeGreaterThan(50);
      expect(controls.actionHit).toBe(true);
    }

    const evidenceDir = testInfo.outputPath("evidence");
    fs.mkdirSync(evidenceDir, { recursive: true });
    const evidencePath = `${evidenceDir}/${scenario.id}-${testInfo.project.name}.png`;
    await page.screenshot({ path: evidencePath, animations: "disabled", caret: "hide" });
    await testInfo.attach(`${scenario.id}-${testInfo.project.name}`, { path: evidencePath, contentType: "image/png" });
  });
}
