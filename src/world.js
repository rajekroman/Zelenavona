export const WORLD = Object.freeze({ width: 1920, height: 1440 });

export const CHLUM = Object.freeze({
  spawn: { x: 820, y: 1050 },
  vaclav: { x: 1070, y: 930 },
  search: { x: 1330, y: 765 },
  finding: { x: 1420, y: 725 },
  speed: 230
});

export function clampPlayer(player) {
  const margin = 70;
  player.x = Math.max(margin, Math.min(WORLD.width - margin, player.x));
  player.y = Math.max(430, Math.min(WORLD.height - margin, player.y));
  return player;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function availableAction(state) {
  if (state.step === 0 && distance(state.player, CHLUM.vaclav) < 100) return { kind: "talk", label: "MLUVIT" };
  if (state.step === 1 && distance(state.player, CHLUM.search) < 135) return { kind: "search", label: "HLEDAT" };
  if (state.step === 2 && distance(state.player, CHLUM.finding) < 95) return { kind: "collect", label: "SEBRAT" };
  return null;
}

export function objectiveForStep(step) {
  if (step === 0) return "Promluv s Václavem";
  if (step === 1) return "Prohledej mokré brázdy";
  if (step === 2) return "Seber nalezený vltavín";
  return "Chlum dokončen";
}
