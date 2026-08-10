import { LEVELS, WORLD, resolveLevel } from "./levels.js";

export { WORLD, LEVELS, resolveLevel };
export const CHLUM = LEVELS.chlum;
export const NESMEN = LEVELS.nesmen;
export const BESEDNICE = LEVELS.besednice;

export function clampPlayer(player, level = CHLUM) {
  const margin = 70;
  player.x = Math.max(margin, Math.min(WORLD.width - margin, player.x));
  player.y = Math.max(level.minY ?? margin, Math.min(WORLD.height - margin, player.y));
  return player;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function targetPoint(level, target) {
  if (target === "npc") return level.npc;
  return level[target] ?? null;
}

export function availableAction(state, level = CHLUM) {
  const rule = level.actions.find(action => action.step === state.step);
  if (!rule) return null;
  const target = targetPoint(level, rule.target);
  if (!target || distance(state.player, target) >= rule.radius) return null;
  return { kind: rule.kind, label: rule.label };
}

export function objectiveForStep(step, level = CHLUM) {
  return level.objectives[Math.min(step, level.objectives.length - 1)] ?? level.objectives.at(-1);
}
