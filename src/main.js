import { FollowCamera } from "./camera.js";
import { ACTOR_STATE, ActorAnimator } from "./animation.js";
import { ActorRenderer } from "./actorRenderer.js";
import { TractorPatrol } from "./tractor.js";
import { ForestPressure } from "./forestPressure.js";
import { PitInstability } from "./pitInstability.js";
import { CrowdRisk } from "./crowdRisk.js";
import { WORLD, resolveLevel, clampPlayer, availableAction, objectiveForStep } from "./world.js";

const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const level = resolveLevel(params.get("level") || "chlum");
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
const calmFill = $("#calmFill");
const meterLabel = $("#meterLabel");

$("#missionNumber").textContent = String(level.number);
$("#levelLabel").textContent = level.label;
$("#loadingLabel").textContent = level.label;
if (meterLabel) {
  meterLabel.textContent = level.id === "besednice" ? "STABILITA" : level.id === "slavie" ? "POZORNOST" : "KLID";
}
canvas.setAttribute("aria-label", `Herní plocha ${level.title}`);
document.title = `Lovec vltavínů — ${level.title}`;

const state = {
  player: { ...level.spawn, facingX: 0, facingY: 1, moving: false },
  step: 0,
  completed: false,
  paused: false,
  hazardCooldown: 0,
  forestPressure: 0,
  pitInstability: 0,
  crowdRisk: 0,
  inRiskZone: false,
  keys: new Set(),
  touchMove: { x: 0, y: 0 },
  action: null
};

const playerAnimator = new ActorAnimator();
const tractor = level.id === "chlum" ? new TractorPatrol({ minX: 280, maxX: 1540, y: 715, speed: 118 }) : null;
const forestPressure = level.pressure ? new ForestPressure(level.pressure) : null;
const pitInstability = level.instability ? new PitInstability(level.instability) : null;
const crowdRisk = level.crowdRisk ? new CrowdRisk(level.crowdRisk) : null;
const camera = new FollowCamera({ worldWidth: WORLD.width, worldHeight: WORLD.height, damping: 7.5, deadZone: 82 });
let dpr = 1;
let viewport = { width: innerWidth, height: innerHeight };
const actorRenderer = new ActorRenderer({ ctx, camera, viewport: () => viewport });
const plate = new Image();
let plateReady = false;
let actorAssetsReady = false;

function finishLoading() {
  if (plateReady && actorAssetsReady) loading.classList.add("hidden");
}
plate.onload = () => { plateReady = true; finishLoading(); };
plate.onerror = () => loading.classList.add("hidden");
plate.src = level.plate;
actorRenderer.load({
  hunter: "./assets/actors/hunter-v7.svg",
  vaclav: "./assets/actors/vaclav-v7.svg",
  forester: "./assets/actors/forester-v7.svg",
  pitkeeper: "./assets/actors/pitkeeper-v7.svg",
  organizer: "./assets/actors/organizer-v7.svg",
  tractor: "./assets/actors/tractor-v7.svg"
}).then(() => { actorAssetsReady = true; finishLoading(); }).catch(error => {
  console.warn(error);
  loading.classList.add("hidden");
});
setTimeout(() => loading.classList.add("hidden"), 2200);

function cameraViewForViewport({ width, height }) {
  const portrait = height > width * 1.15;
  const shortLandscape = width > height * 1.65 && height < 600;
  const minimumCover = Math.max(width / WORLD.width, height / WORLD.height);
  if (portrait && level.id === "besednice") {
    return { zoom: Math.max(.76, minimumCover), focusOffsetX: -120, focusOffsetY: -40 };
  }
  const base = portrait ? { zoom: .58, focusOffsetY: 250 } : shortLandscape ? { zoom: .52, focusOffsetY: 320 } : { zoom: .72, focusOffsetY: 230 };
  return { zoom: Math.max(base.zoom, minimumCover), focusOffsetX: 0, focusOffsetY: base.focusOffsetY };
}

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  viewport = { width: Math.max(1, innerWidth), height: Math.max(1, innerHeight) };
  canvas.width = Math.round(viewport.width * dpr);
  canvas.height = Math.round(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  camera.setView(cameraViewForViewport(viewport), viewport);
  if (camera.initialized) camera.snap(state.player, viewport);
}
addEventListener("resize", resize, { passive: true });
resize();

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 1700);
}

function withWorldTransform(callback) {
  ctx.save();
  camera.applyWorldTransform(ctx, viewport);
  callback();
  ctx.restore();
}

function drawFallbackPlate() {
  const fallback = level.id === "nesmen" ? "#334633" : level.id === "besednice" ? "#866b4b" : level.id === "slavie" ? "#78846a" : "#392d22";
  ctx.fillStyle = fallback;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function drawWorldBackground() {
  withWorldTransform(() => plateReady ? ctx.drawImage(plate, 0, 0, WORLD.width, WORLD.height) : drawFallbackPlate());
}

function drawNpc() {
  const p = camera.worldToScreen(level.npc, viewport);
  actorRenderer.draw(level.npc.id, level.npc, { scale: 1.04 });
  if (state.step === 0) {
    const s = Math.min(1.05, camera.zoom / .72);
    ctx.save();
    ctx.strokeStyle = "#b8f6bd";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 10 * s, 43 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

let playerPose = playerAnimator.pose();
function drawPlayer() {
  actorRenderer.draw("hunter", state.player, { scale: 1.08, facingX: state.player.facingX, pose: playerPose });
}

function drawHazard() {
  if (tractor) {
    actorRenderer.drawSprite("tractor", tractor, { width: 154, height: 98, flipX: tractor.direction < 0, anchorY: .78, shadow: true });
  }
  if (forestPressure && state.inRiskZone) {
    const alpha = Math.min(.22, .05 + state.forestPressure / 650);
    ctx.save();
    const gradient = ctx.createRadialGradient(viewport.width / 2, viewport.height / 2, viewport.height * .15, viewport.width / 2, viewport.height / 2, viewport.height * .72);
    gradient.addColorStop(0, "rgba(12,24,13,0)");
    gradient.addColorStop(1, `rgba(8,18,10,${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    ctx.restore();
  }
  if (pitInstability && state.inRiskZone) {
    const alpha = Math.min(.2, .04 + state.pitInstability / 700);
    ctx.save();
    const gradient = ctx.createLinearGradient(0, viewport.height * .45, 0, viewport.height);
    gradient.addColorStop(0, "rgba(92,62,36,0)");
    gradient.addColorStop(1, `rgba(73,43,24,${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    ctx.restore();
  }
  if (crowdRisk && state.inRiskZone) {
    const alpha = Math.min(.18, .035 + state.crowdRisk / 760);
    ctx.save();
    ctx.fillStyle = `rgba(70,38,38,${alpha})`;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    ctx.restore();
  }
}

function drawSearchAndFinding(time) {
  if (state.step === 1) {
    const p = camera.worldToScreen(level.search, viewport);
    const s = Math.min(1, camera.zoom / .72);
    ctx.save();
    ctx.strokeStyle = `rgba(205,239,205,${.3 + .2 * Math.sin(time * 3)})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 78 * s, 32 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (state.step === 2) {
    const p = camera.worldToScreen(level.finding, viewport);
    const pulse = (1 + Math.sin(time * 5) * .15) * Math.min(1, camera.zoom / .72);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pulse, pulse);
    ctx.rotate(.6);
    ctx.fillStyle = "#55b876";
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(10, -2); ctx.lineTo(6, 13); ctx.lineTo(-9, 8); ctx.lineTo(-12, -5); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(215,255,222,.82)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function hazardMeterValue() {
  if (pitInstability) return state.pitInstability;
  if (crowdRisk) return state.crowdRisk;
  return state.forestPressure;
}

function updateHud() {
  objective.textContent = objectiveForStep(state.step, level);
  state.action = availableAction(state, level);
  const active = Boolean(state.action);
  prompt.classList.toggle("hidden", !active);
  actionButton.classList.toggle("ready", active);
  actionButton.setAttribute("aria-disabled", String(!active));
  const label = state.action?.label ?? "AKCE";
  promptText.textContent = label;
  actionLabel.textContent = label;
  if (calmFill) calmFill.style.width = `${Math.max(0, 100 - hazardMeterValue())}%`;
}

function performAction() {
  const action = availableAction(state, level);
  if (!action || state.paused) return;
  if (action.kind === "talk") {
    state.step = 1;
    const messages = {
      chlum: "Václav: Po dešti se podívej do čerstvých brázd.",
      nesmen: "Lesník: Hledej tam, kde voda odkryla štěrkový profil.",
      besednice: "Správce: Čerstvý jílový řez je vpravo pod stěnou. Drž se dál od měkkého okraje.",
      slavie: "Pořadatel: Vltavíny najdeš u stolů na druhé straně plochy. V davu si hlídej věci."
    };
    showToast(messages[level.id] ?? "Prozkoumej označené místo.");
  } else if (action.kind === "search") {
    playerAnimator.play(ACTOR_STATE.SEARCH, .7);
    state.step = 2;
    const messages = {
      chlum: "Něco zeleného se zalesklo v blátě.",
      nesmen: "Pod kořeny se leskne čerstvě odkrytý štěrk.",
      besednice: "V jílu se otevřela štěrková kapsa s tmavšími valouny.",
      slavie: "Na stole leží několik zelených kamenů — jeden stojí za bližší kontrolu."
    };
    showToast(messages[level.id] ?? "Něco se zalesklo v odkryvu.");
  } else if (action.kind === "collect") {
    playerAnimator.play(ACTOR_STATE.PICKUP, .7);
    state.step = 3;
    state.completed = true;
    showToast(level.id === "slavie" ? "Pravý vltavín potvrzen — Slávie dokončena." : `Vltavín nalezen — ${level.title} dokončena.`);
  }
  updateHud();
}

actionButton.addEventListener("pointerdown", event => { event.preventDefault(); performAction(); });
addEventListener("keydown", event => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) { state.keys.add(event.code); event.preventDefault(); }
  if (event.code === "KeyE" || event.code === "Space") { performAction(); event.preventDefault(); }
});
addEventListener("keyup", event => state.keys.delete(event.code));
addEventListener("blur", () => state.keys.clear());
$("#pauseButton").addEventListener("click", () => { state.paused = !state.paused; showToast(state.paused ? "Pauza" : "Pokračujeme"); });

let joystickPointer = null;
function setJoystick(clientX, clientY) {
  const rect = moveZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const max = rect.width * .34;
  let dx = clientX - cx, dy = clientY - cy;
  const length = Math.hypot(dx, dy) || 1;
  if (length > max) { dx = dx / length * max; dy = dy / length * max; }
  state.touchMove.x = dx / max; state.touchMove.y = dy / max;
  stick.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
}
moveZone.addEventListener("pointerdown", event => { joystickPointer = event.pointerId; moveZone.setPointerCapture(event.pointerId); setJoystick(event.clientX, event.clientY); });
moveZone.addEventListener("pointermove", event => { if (event.pointerId === joystickPointer) setJoystick(event.clientX, event.clientY); });
function resetJoystick(event) {
  if (joystickPointer === null || (event && event.pointerId !== joystickPointer)) return;
  joystickPointer = null; state.touchMove.x = 0; state.touchMove.y = 0; stick.style.transform = "translate(-50%,-50%)";
}
moveZone.addEventListener("pointerup", resetJoystick);
moveZone.addEventListener("pointercancel", resetJoystick);

function movementVector() {
  let x = state.touchMove.x, y = state.touchMove.y;
  if (state.keys.has("ArrowLeft") || state.keys.has("KeyA")) x -= 1;
  if (state.keys.has("ArrowRight") || state.keys.has("KeyD")) x += 1;
  if (state.keys.has("ArrowUp") || state.keys.has("KeyW")) y -= 1;
  if (state.keys.has("ArrowDown") || state.keys.has("KeyS")) y += 1;
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  return { x, y };
}

function resetPlayerFromHazard(message) {
  Object.assign(state.player, level.spawn);
  state.touchMove.x = 0;
  state.touchMove.y = 0;
  state.keys.clear();
  state.hazardCooldown = 1.5;
  forestPressure?.reset();
  pitInstability?.reset();
  crowdRisk?.reset();
  state.forestPressure = 0;
  state.pitInstability = 0;
  state.crowdRisk = 0;
  state.inRiskZone = false;
  camera.snap(state.player, viewport);
  showToast(message);
}

function updateHazard(simDt, realDt = simDt) {
  const hazardDt = Math.min(.25, Math.max(0, realDt));
  state.hazardCooldown = Math.max(0, state.hazardCooldown - hazardDt);

  if (tractor) {
    tractor.update(simDt);
    if (state.hazardCooldown <= 0 && tractor.collides(state.player, 58)) {
      resetPlayerFromHazard("Pozor na traktor — vrať se k okraji pole.");
    }
    return;
  }

  if (forestPressure) {
    const result = forestPressure.update(state.player, level.npc, hazardDt);
    state.forestPressure = result.value;
    state.inRiskZone = result.inRisk;
    if (state.hazardCooldown <= 0 && result.caught && state.step > 0 && !state.completed) {
      resetPlayerFromHazard("Lesník tě zahlédl — vrať se k okraji lesa a počkej, až se situace uklidní.");
    }
    return;
  }

  if (pitInstability) {
    const result = pitInstability.update(state.player, hazardDt);
    state.pitInstability = result.value;
    state.inRiskZone = result.inRisk;
    if (state.hazardCooldown <= 0 && result.collapsed && state.step > 0 && !state.completed) {
      resetPlayerFromHazard("Jílový okraj se sesunul — vrať se na pevné dno pískovny.");
    }
    return;
  }

  if (crowdRisk) {
    const result = crowdRisk.update(state.player, hazardDt);
    state.crowdRisk = result.value;
    state.inRiskZone = result.inRisk;
    if (state.hazardCooldown <= 0 && result.robbed && state.step > 0 && !state.completed) {
      resetPlayerFromHazard("Byl jsi okraden — vrať se k okraji akce a dávej pozor v davu.");
    }
  }
}

let last = performance.now();
function frame(now) {
  const elapsed = Math.max(0, (now - last) / 1000);
  const dt = Math.min(.05, elapsed);
  last = now;
  if (!state.paused) {
    const move = movementVector();
    state.player.moving = Math.hypot(move.x, move.y) > .05;
    playerAnimator.setMovement(move.x, move.y);
    if (state.player.moving) {
      state.player.facingX = move.x; state.player.facingY = move.y;
      state.player.x += move.x * level.speed * dt; state.player.y += move.y * level.speed * dt;
      clampPlayer(state.player, level);
    }
    playerPose = playerAnimator.update(dt);
    updateHazard(dt, elapsed);
    camera.update(state.player, viewport, dt);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  drawWorldBackground(); drawSearchAndFinding(now / 1000); drawHazard(); drawNpc(); drawPlayer(); updateHud();
  requestAnimationFrame(frame);
}

camera.setView(cameraViewForViewport(viewport), viewport);
camera.snap(state.player, viewport);
updateHud();
requestAnimationFrame(frame);
window.__zelenaVlna = { state, level, camera, animator: playerAnimator, actorRenderer, tractor, forestPressure, pitInstability, crowdRisk, WORLD };
