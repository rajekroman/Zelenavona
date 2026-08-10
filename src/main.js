import { FollowCamera } from "./camera.js";
import { ACTOR_STATE, ActorAnimator } from "./animation.js";
import { CHLUM_PLATE } from "./plateData.js";
import { TractorPatrol } from "./tractor.js";
import { WORLD, CHLUM, clampPlayer, availableAction, objectiveForStep } from "./world.js";

const $ = selector => document.querySelector(selector);
const canvas = $("#game");
const ctx = canvas.getContext("2d", { alpha: false });
const objective = $("#objective");
const prompt = $("#prompt");
const promptText = $("#promptText");
const actionButton = $("#actionButton");
const actionLabel = $("#actionLabel");
const moveZone = $("#moveZone");
const stick = $("#stick");
const toast = $("#toast");
const loading = $("#loading");

const state = {
  player: { ...CHLUM.spawn, facingX: 0, facingY: 1, moving: false },
  step: 0,
  completed: false,
  paused: false,
  tractorCooldown: 0,
  keys: new Set(),
  touchMove: { x: 0, y: 0 },
  action: null
};

const playerAnimator = new ActorAnimator();
const tractor = new TractorPatrol({ minX: 280, maxX: 1540, y: 715, speed: 118 });
const camera = new FollowCamera({ worldWidth: WORLD.width, worldHeight: WORLD.height, damping: 7.5, deadZone: 82 });
const plate = new Image();
let plateReady = false;
plate.onload = () => { plateReady = true; loading.classList.add("hidden"); };
plate.onerror = () => loading.classList.add("hidden");
plate.src = CHLUM_PLATE;
setTimeout(() => loading.classList.add("hidden"), 1800);

let dpr = 1;
let viewport = { width: innerWidth, height: innerHeight };
function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  viewport = { width: Math.max(1, innerWidth), height: Math.max(1, innerHeight) };
  canvas.width = Math.round(viewport.width * dpr);
  canvas.height = Math.round(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  camera.clamp(viewport);
}
addEventListener("resize", resize, { passive: true });
resize();

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 1600);
}

function drawFallbackPlate() {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  sky.addColorStop(0, "#7d8790");
  sky.addColorStop(.27, "#9ea59d");
  sky.addColorStop(.34, "#4c6547");
  sky.addColorStop(.49, "#2d452d");
  sky.addColorStop(.5, "#392d22");
  sky.addColorStop(1, "#211913");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "#536c4b";
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.arc(i * 72, 415 - (i % 4) * 9, 65 + (i % 3) * 13, Math.PI, 0);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(168,181,187,.36)";
  ctx.lineWidth = 11;
  for (let y = 540; y < 1400; y += 38) {
    ctx.beginPath(); ctx.moveTo(-80, y); ctx.quadraticCurveTo(960, y - 70, 2000, y + 15); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(28,19,13,.82)";
  ctx.lineWidth = 18;
  for (let y = 558; y < 1400; y += 38) {
    ctx.beginPath(); ctx.moveTo(-80, y); ctx.quadraticCurveTo(960, y - 70, 2000, y + 15); ctx.stroke();
  }
}

function withWorldTransform(callback) {
  const left = camera.x - viewport.width / 2;
  const top = camera.y - viewport.height / 2;
  ctx.save();
  ctx.translate(-left, -top);
  callback();
  ctx.restore();
}

function drawWorldBackground() {
  withWorldTransform(() => {
    if (plateReady) ctx.drawImage(plate, 0, 0, WORLD.width, WORLD.height);
    else drawFallbackPlate();
  });
}

function drawShadow(x, y, rx = 31, ry = 11, alpha = .34) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPerson(point, colors, { scale = 1, facing = 0, pose = null } = {}) {
  const p = camera.worldToScreen(point, viewport);
  const bob = pose?.bob ?? 0;
  const stride = pose?.stride ?? 0;
  const lean = pose?.lean ?? 0;
  const reach = pose?.reach ?? 0;
  drawShadow(p.x, p.y + 10, 28 * scale, 10 * scale);
  ctx.save();
  ctx.translate(p.x, p.y - bob);
  ctx.scale(scale, scale);
  ctx.rotate(lean * .18 * (facing || 1));
  ctx.strokeStyle = colors.legs;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 1); ctx.lineTo(-10 + stride * .35, 35);
  ctx.moveTo(8, 1); ctx.lineTo(10 - stride * .35, 35);
  ctx.stroke();
  ctx.fillStyle = colors.body;
  ctx.beginPath(); ctx.roundRect(-20, -48, 40, 54, 11); ctx.fill();
  ctx.strokeStyle = colors.body;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-16, -34); ctx.lineTo(-25 - reach * .35, -5 + reach);
  ctx.moveTo(16, -34); ctx.lineTo(24 + reach * .35, -5 + reach);
  ctx.stroke();
  ctx.fillStyle = colors.head;
  ctx.beginPath(); ctx.arc(0, -61, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = colors.hair;
  ctx.beginPath(); ctx.arc(facing * 3, -65, 12, Math.PI, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTractor() {
  const p = camera.worldToScreen(tractor, viewport);
  const flip = tractor.direction < 0 ? -1 : 1;
  drawShadow(p.x, p.y + 13, 57, 17, .38);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(flip, 1);
  ctx.fillStyle = "#315a35";
  ctx.beginPath(); ctx.roundRect(-44, -29, 72, 34, 6); ctx.fill();
  ctx.fillStyle = "#25482b";
  ctx.fillRect(4, -51, 31, 27);
  ctx.fillStyle = "#9fb3aa";
  ctx.fillRect(9, -47, 20, 14);
  ctx.fillStyle = "#172219";
  ctx.fillRect(23, -69, 5, 19);
  for (const [x, r] of [[-25, 19], [27, 24]]) {
    ctx.fillStyle = "#171714";
    ctx.beginPath(); ctx.arc(x, 8, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#9e8f63";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, 8, r * .55, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = "#7a3e2a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-48, 2); ctx.lineTo(-82, 18); ctx.lineTo(-103, 18);
  ctx.stroke();
  ctx.restore();
}

function drawVaclav() {
  const p = camera.worldToScreen(CHLUM.vaclav, viewport);
  drawPerson(CHLUM.vaclav, { body: "#69533b", legs: "#37342e", head: "#d2aa7d", hair: "#795827" }, { scale: 1.02 });
  if (state.step === 0) {
    ctx.save(); ctx.strokeStyle = "#b8f6bd"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 17, 48, 19, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

let playerPose = playerAnimator.pose();
function drawPlayer() {
  drawPerson(state.player, { body: "#315e37", legs: "#4b4636", head: "#d3ab82", hair: "#23221e" }, {
    scale: 1.05,
    facing: Math.sign(state.player.facingX),
    pose: playerPose
  });
}

function drawSearchAndFinding(time) {
  if (state.step === 1) {
    const p = camera.worldToScreen(CHLUM.search, viewport);
    ctx.save();
    ctx.strokeStyle = `rgba(205,239,205,${.3 + .2 * Math.sin(time * 3)})`;
    ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 78, 32, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (state.step === 2) {
    const p = camera.worldToScreen(CHLUM.finding, viewport);
    const pulse = 1 + Math.sin(time * 5) * .15;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pulse, pulse); ctx.rotate(.6);
    ctx.fillStyle = "#55b876";
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10, -2); ctx.lineTo(6, 13); ctx.lineTo(-9, 8); ctx.lineTo(-12, -5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(215,255,222,.82)"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
}

function drawForeground() {
  withWorldTransform(() => {
    ctx.fillStyle = "rgba(19,53,29,.82)";
    for (const [x, y, r] of [[80, 1340, 110], [230, 1390, 150], [1680, 1380, 180], [1860, 1320, 145]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function updateHud() {
  objective.textContent = objectiveForStep(state.step);
  state.action = availableAction(state);
  const active = Boolean(state.action);
  prompt.classList.toggle("hidden", !active);
  actionButton.classList.toggle("ready", active);
  actionButton.setAttribute("aria-disabled", String(!active));
  const label = state.action?.label ?? "AKCE";
  promptText.textContent = label;
  actionLabel.textContent = label;
}

function performAction() {
  const action = availableAction(state);
  if (!action || state.paused) return;
  if (action.kind === "talk") {
    state.step = 1;
    showToast("Václav: Po dešti se podívej do čerstvých brázd.");
  } else if (action.kind === "search") {
    playerAnimator.play(ACTOR_STATE.SEARCH, .7);
    state.step = 2;
    showToast("Něco zeleného se zalesklo v blátě.");
  } else if (action.kind === "collect") {
    playerAnimator.play(ACTOR_STATE.PICKUP, .7);
    state.step = 3;
    state.completed = true;
    showToast("Vltavín nalezen — Chlum dokončen.");
  }
  updateHud();
}

actionButton.addEventListener("pointerdown", event => { event.preventDefault(); performAction(); });
addEventListener("keydown", event => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
    state.keys.add(event.code); event.preventDefault();
  }
  if (event.code === "KeyE" || event.code === "Space") { performAction(); event.preventDefault(); }
});
addEventListener("keyup", event => state.keys.delete(event.code));
addEventListener("blur", () => state.keys.clear());
$("#pauseButton").addEventListener("click", () => {
  state.paused = !state.paused;
  showToast(state.paused ? "Pauza" : "Pokračujeme");
});

let joystickPointer = null;
function setJoystick(clientX, clientY) {
  const rect = moveZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const max = rect.width * .34;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const length = Math.hypot(dx, dy) || 1;
  if (length > max) { dx = dx / length * max; dy = dy / length * max; }
  state.touchMove.x = dx / max;
  state.touchMove.y = dy / max;
  stick.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
}
moveZone.addEventListener("pointerdown", event => {
  joystickPointer = event.pointerId;
  moveZone.setPointerCapture(event.pointerId);
  setJoystick(event.clientX, event.clientY);
});
moveZone.addEventListener("pointermove", event => {
  if (event.pointerId === joystickPointer) setJoystick(event.clientX, event.clientY);
});
function resetJoystick(event) {
  if (joystickPointer === null || (event && event.pointerId !== joystickPointer)) return;
  joystickPointer = null;
  state.touchMove.x = 0; state.touchMove.y = 0;
  stick.style.transform = "translate(-50%,-50%)";
}
moveZone.addEventListener("pointerup", resetJoystick);
moveZone.addEventListener("pointercancel", resetJoystick);

function movementVector() {
  let x = state.touchMove.x;
  let y = state.touchMove.y;
  if (state.keys.has("ArrowLeft") || state.keys.has("KeyA")) x -= 1;
  if (state.keys.has("ArrowRight") || state.keys.has("KeyD")) x += 1;
  if (state.keys.has("ArrowUp") || state.keys.has("KeyW")) y -= 1;
  if (state.keys.has("ArrowDown") || state.keys.has("KeyS")) y += 1;
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  return { x, y };
}

function updateTractor(dt) {
  tractor.update(dt);
  state.tractorCooldown = Math.max(0, state.tractorCooldown - dt);
  if (state.tractorCooldown > 0 || !tractor.collides(state.player, 58)) return;
  state.player.x = CHLUM.spawn.x;
  state.player.y = CHLUM.spawn.y;
  state.touchMove.x = 0;
  state.touchMove.y = 0;
  state.keys.clear();
  state.tractorCooldown = 1.5;
  camera.snap(state.player, viewport);
  showToast("Pozor na traktor — vrať se k okraji pole.");
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (!state.paused) {
    const move = movementVector();
    state.player.moving = Math.hypot(move.x, move.y) > .05;
    playerAnimator.setMovement(move.x, move.y);
    if (state.player.moving) {
      state.player.facingX = move.x;
      state.player.facingY = move.y;
      state.player.x += move.x * CHLUM.speed * dt;
      state.player.y += move.y * CHLUM.speed * dt;
      clampPlayer(state.player);
    }
    playerPose = playerAnimator.update(dt);
    updateTractor(dt);
    camera.update(state.player, viewport, dt);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  drawWorldBackground();
  drawSearchAndFinding(now / 1000);
  drawTractor();
  drawVaclav();
  drawPlayer();
  drawForeground();
  updateHud();
  requestAnimationFrame(frame);
}

camera.snap(state.player, viewport);
updateHud();
requestAnimationFrame(frame);
window.__zelenaVlna = { state, camera, animator: playerAnimator, tractor, WORLD, CHLUM };
