import test from "node:test";
import assert from "node:assert/strict";
import { CHLUM, NESMEN, WORLD, availableAction, clampPlayer, objectiveForStep } from "../src/world.js";

for (const level of [CHLUM, NESMEN]) {
  test(`${level.title} player stays inside authored playable bounds`, () => {
    const player = { x: -500, y: 9000 };
    clampPlayer(player, level);
    assert.equal(player.x, 70);
    assert.equal(player.y, WORLD.height - 70);
  });

  test(`${level.title} progression exposes exactly one contextual action`, () => {
    const state = { step: 0, player: { ...level.npc } };
    assert.deepEqual(availableAction(state, level), { kind: "talk", label: "MLUVIT" });
    state.step = 1;
    state.player = { ...level.search };
    assert.equal(availableAction(state, level)?.kind, "search");
    state.step = 2;
    state.player = { ...level.finding };
    assert.deepEqual(availableAction(state, level), { kind: "collect", label: "SEBRAT" });
    state.player = { x: 70, y: 70 };
    assert.equal(availableAction(state, level), null);
  });
}

test("Chlum objective labels remain unchanged", () => {
  assert.equal(objectiveForStep(0, CHLUM), "Promluv s Václavem");
  assert.equal(objectiveForStep(1, CHLUM), "Prohledej mokré brázdy");
  assert.equal(objectiveForStep(2, CHLUM), "Seber nalezený vltavín");
  assert.equal(objectiveForStep(3, CHLUM), "Chlum dokončen");
});

test("Nesmen has its own forest-specific objective sequence", () => {
  assert.equal(objectiveForStep(0, NESMEN), "Promluv s lesníkem");
  assert.equal(objectiveForStep(1, NESMEN), "Najdi odkrytý profil");
  assert.equal(objectiveForStep(2, NESMEN), "Prohledej kořeny a štěrk");
  assert.equal(objectiveForStep(3, NESMEN), "Nesměň dokončena");
});
