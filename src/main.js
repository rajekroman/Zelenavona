import { FollowCamera } from "./camera.js";
import { WORLD, CHLUM, clampPlayer, availableAction, objectiveForStep } from "./world.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
const objective = document.querySelector("#objective");
const prompt = document.querySelector("#prompt");
const promptText = document.querySelector("#promptText");
const actionButton = document.querySelector("#actionButton");
const actionLabel = document.querySelector("#actionLabel");
const moveZone = document.querySelector("#moveZone");
const stick = document.querySelector("#stick");
const toast = document.querySelector("#toast");
const loading = document.querySelector("#loading");

const state = {
  player: { ...CHLUM.spawn, facingX: 0, facingY: 1, moving: false },
  step: 0,
  completed: false,
  paused: false,
  keys: new Set(),
  touchMove: { x: 0, y: 0 },
  action: null,
  findingPulse: 0
};

const camera = new FollowCamera({ worldWidth: WORLD.width, worldHeight: WORLD.height, damping: 7.5, deadZone: 82 });
const plate = new Image();
let plateReady = false;
plate.onload = () => { plateReady = true; loading.classList.add("hidden"); };
plate.onerror = () => { loading.classList.add("hidden"); };
plate.src = "./assets/chlum/chlum-v7-plate.jpg";
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
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  const top = 0;
  const villageH = 420;
  const sky = ctx.createLinearGradient(0, top, 0, WORLD.height);
  sky.addColorStop(0, "#77808a");
  sky.addColorStop(.25, "#9da49d");
  sky.addColorStop(.30, "#5f7757");
  sky.addColorStop(.47, "#32482f");
  sky.addColorStop(.48, "#33281e");
  sky.addColorStop(1, "#211a14");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "#506545";
  for (let i = 0; i < 34; i++) {
    const x = i * 70 + (i % 3) * 18;
    const h = 55 + (i % 5) * 12;
    ctx.beginPath();
    ctx.arc(x, villageH - 10, h, Math.PI, 0);
    ctx.fill();
  }

  ctx.fillStyle = "#d5c8a3";
  for (let i = 0; i < 15; i++) {
    const x = 180 + i * 105;
    const y = 235 + (i % 3) * 35;
    ctx.fillRect(x, y, 44, 32);
    ctx.fillStyle = i % 2 ? "#985f3d" : "#7d4b34";
    ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+22,y-22);ctx.lineTo(x+48,y);ctx.closePath();ctx.fill();
    ctx.fillStyle = "#d5c8a3";
  }

  ctx.fillStyle = "#ddd0ad";
  ctx.fillRect(1420, 170, 54, 120);
  ctx.fillStyle = "#51463b";
  ctx.beginPath();ctx.moveTo(1410,170);ctx.lineTo(1447,120);ctx.lineTo(1484,170);ctx.closePath();ctx.fill();

  ctx.save();
  ctx.translate(0, 510);
  ctx.strokeStyle = "rgba(186,196,204,.34)";
  ctx.lineWidth = 12;
  for (let y = 0; y < 820; y += 36) {
    ctx.beginPath();
    ctx.moveTo(-100, y + (y % 72 ? 8 : 0));
    ctx.quadraticCurveTo(960, y - 60, 2020, y + 20);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(25,17,12,.78)";
  ctx.lineWidth = 18;
  for (let y = 12; y < 820; y += 36) {
    ctx.beginPath();ctx.moveTo(-100,y);ctx.quadraticCurveTo(960,y-55,2020,y+20);ctx.stroke();
  }
  ctx.restore();
}

function drawWorldBackground() {
  const left = camera.x - viewport.width / 2;
  const top = camera.y - viewport.height / 2;
  ctx.save();
  ctx.translate(-left, -top);
  if (plateReady) ctx.drawImage(plate, 0, 0, WORLD.width, WORLD.height);
  else drawFallbackPlate();
  drawStaticDepth();
  ctx.restore();
}

function drawStaticDepth() {
  ctx.fillStyle = "rgba(20,46,26,.88)";
  for (const b of [[100,980,210,160],[1600,1030,230,210],[70,1180,260,210],[1510,1220,360,250]]) {
    ctx.beginPath();ctx.ellipse(b[0]+b[2]/2,b[1]+b[3]/2,b[2]/2,b[3]/2,0,0,Math.PI*2);ctx.fill();
  }
  ctx.strokeStyle = "#a39269";ctx.lineWidth = 12;
  for (const [x,y,w] of [[130,1070,290],[1490,1040,300]]) {
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+30);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y+45);ctx.lineTo(x+w,y+75);ctx.stroke();
  }
}

function drawShadow(x, y, rx = 34, ry = 13, alpha = .3) {
  ctx.save();ctx.fillStyle=`rgba(0,0,0,${alpha})`;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawPerson(point, colors, scale = 1, facing = 0) {
  const p = camera.worldToScreen(point, viewport);
  drawShadow(p.x, p.y + 8, 28 * scale, 10 * scale, .34);
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(scale,scale);
  ctx.fillStyle = colors.legs;ctx.fillRect(-12,2,10,35);ctx.fillRect(3,2,10,35);
  ctx.fillStyle = colors.body;ctx.beginPath();ctx.roundRect(-20,-48,40,55,10);ctx.fill();
  ctx.fillStyle = colors.head;ctx.beginPath();ctx.arc(0,-61,13,0,Math.PI*2);ctx.fill();
  ctx.fillStyle = colors.hair;ctx.beginPath();ctx.arc(facing*3,-65,12,Math.PI,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawVaclav() {
  const p = camera.worldToScreen(CHLUM.vaclav, viewport);
  drawPerson(CHLUM.vaclav,{body:"#6c563d",legs:"#403a31",head:"#d6ad7d",hair:"#7c5b2e"},1.02,0);
  if (state.step === 0) {
    ctx.save();ctx.strokeStyle="#b2f4b8";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p.x,p.y+16,48,19,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
}

function drawPlayer() {
  const p = camera.worldToScreen(state.player, viewport);
  drawPerson(state.player,{body:"#315f37",legs:"#514a37",head:"#d6ae82",hair:"#25231e"},1.05,Math.sign(state.player.facingX));
}

function drawSearchAndFinding(time) {
  if (state.step === 1) {
    const p = camera.worldToScreen(CHLUM.search, viewport);
    ctx.save();ctx.strokeStyle=`rgba(198,236,199,${.35+.18*Math.sin(time*3)})`;ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.beginPath();ctx.ellipse(p.x,p.y,78,32,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if (state.step === 2) {
    const p = camera.worldToScreen(CHLUM.finding, viewport);
    const pulse=1+Math.sin(time*5)*.15;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(pulse,pulse);ctx.rotate(.6);ctx.fillStyle="#56ba77";ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(10,-2);ctx.lineTo(6,13);ctx.lineTo(-9,8);ctx.lineTo(-12,-5);ctx.closePath();ctx.fill();ctx.strokeStyle="rgba(207,255,217,.75)";ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
}

function drawForeground() {
  const left = camera.x - viewport.width / 2;
  const top = camera.y - viewport.height / 2;
  ctx.save();ctx.translate(-left,-top);ctx.fillStyle="rgba(18,55,28,.88)";
  for(const [x,y,r] of [[90,1320,100],[220,1370,150],[1660,1360,180],[1840,1300,140]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  ctx.restore();
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
    state.step = 2;
    showToast("Něco zeleného se zalesklo v blátě.");
  } else if (action.kind === "collect") {
    state.step = 3;
    state.completed = true;
    showToast("Vltavín nalezen — Chlum dokončen.");
  }
  updateHud();
}

actionButton.addEventListener("pointerdown", e => { e.preventDefault(); performAction(); });
addEventListener("keydown", e => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD"].includes(e.code)) { state.keys.add(e.code); e.preventDefault(); }
  if (e.code === "KeyE" || e.code === "Space") { performAction(); e.preventDefault(); }
});
addEventListener("keyup", e => state.keys.delete(e.code));
addEventListener("blur", () => state.keys.clear());

document.querySelector("#pauseButton").addEventListener("click", () => { state.paused = !state.paused; showToast(state.paused ? "Pauza" : "Pokračujeme"); });

let joystickPointer = null;
function setJoystick(clientX, clientY) {
  const r = moveZone.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  let dx = clientX-cx, dy = clientY-cy;
  const max = r.width*.34;
  const len = Math.hypot(dx,dy) || 1;
  if (len > max) { dx=dx/len*max; dy=dy/len*max; }
  state.touchMove.x = dx/max; state.touchMove.y = dy/max;
  stick.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
}
moveZone.addEventListener("pointerdown",e=>{joystickPointer=e.pointerId;moveZone.setPointerCapture(e.pointerId);setJoystick(e.clientX,e.clientY);});
moveZone.addEventListener("pointermove",e=>{if(e.pointerId===joystickPointer)setJoystick(e.clientX,e.clientY);});
function resetJoystick(e){if(joystickPointer!==null&&(!e||e.pointerId===joystickPointer)){joystickPointer=null;state.touchMove.x=0;state.touchMove.y=0;stick.style.transform="translate(-50%,-50%)";}}
moveZone.addEventListener("pointerup",resetJoystick);moveZone.addEventListener("pointercancel",resetJoystick);

function movementVector() {
  let x=state.touchMove.x,y=state.touchMove.y;
  if(state.keys.has("ArrowLeft")||state.keys.has("KeyA"))x-=1;
  if(state.keys.has("ArrowRight")||state.keys.has("KeyD"))x+=1;
  if(state.keys.has("ArrowUp")||state.keys.has("KeyW"))y-=1;
  if(state.keys.has("ArrowDown")||state.keys.has("KeyS"))y+=1;
  const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}return{x,y};
}

let last=performance.now();
function frame(now) {
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!state.paused){
    const move=movementVector();
    state.player.moving=Math.hypot(move.x,move.y)>.05;
    if(state.player.moving){state.player.facingX=move.x;state.player.facingY=move.y;state.player.x+=move.x*CHLUM.speed*dt;state.player.y+=move.y*CHLUM.speed*dt;clampPlayer(state.player);}
    camera.update(state.player,viewport,dt);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,viewport.width,viewport.height);
  drawWorldBackground();drawSearchAndFinding(now/1000);drawVaclav();drawPlayer();drawForeground();updateHud();
  requestAnimationFrame(frame);
}
camera.snap(state.player,viewport);updateHud();requestAnimationFrame(frame);

window.__zelenaVlna = { state, camera, WORLD, CHLUM };
