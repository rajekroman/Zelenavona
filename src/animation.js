const TAU = Math.PI * 2;

const DIRECTION_VECTOR = Object.freeze({
  east: Object.freeze({ x: 1, y: 0 }),
  "south-east": Object.freeze({ x: Math.SQRT1_2, y: Math.SQRT1_2 }),
  south: Object.freeze({ x: 0, y: 1 }),
  "south-west": Object.freeze({ x: -Math.SQRT1_2, y: Math.SQRT1_2 }),
  west: Object.freeze({ x: -1, y: 0 }),
  "north-west": Object.freeze({ x: -Math.SQRT1_2, y: -Math.SQRT1_2 }),
  north: Object.freeze({ x: 0, y: -1 }),
  "north-east": Object.freeze({ x: Math.SQRT1_2, y: -Math.SQRT1_2 })
});

export const ACTOR_STATE = Object.freeze({
  IDLE: "idle",
  WALK: "walk",
  SEARCH: "search",
  PICKUP: "pickup"
});

export function direction8(x, y, fallback = "south") {
  const length = Math.hypot(x, y);
  if (length < 0.001) return fallback;
  let angle = Math.atan2(y, x);
  if (angle < 0) angle += TAU;
  const octant = Math.round(angle / (TAU / 8)) % 8;
  return ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"][octant];
}

export class ActorAnimator {
  constructor() {
    this.state = ACTOR_STATE.IDLE;
    this.direction = "south";
    this.time = 0;
    this.oneShotRemaining = 0;
  }

  setMovement(x, y) {
    const moving = Math.hypot(x, y) > 0.05;
    if (moving) {
      this.direction = direction8(x, y, this.direction);
      if (this.oneShotRemaining <= 0) this.state = ACTOR_STATE.WALK;
    } else if (this.oneShotRemaining <= 0) {
      this.state = ACTOR_STATE.IDLE;
    }
  }

  play(state, duration = 0.65) {
    if (state !== ACTOR_STATE.SEARCH && state !== ACTOR_STATE.PICKUP) return false;
    this.state = state;
    this.time = 0;
    this.oneShotRemaining = Math.max(0.1, duration);
    return true;
  }

  update(dt) {
    const step = Math.max(0, dt);
    this.time += step;
    if (this.oneShotRemaining > 0) {
      this.oneShotRemaining = Math.max(0, this.oneShotRemaining - step);
      if (this.oneShotRemaining === 0) this.state = ACTOR_STATE.IDLE;
    }
    return this.pose();
  }

  pose() {
    const walkPhase = this.state === ACTOR_STATE.WALK ? Math.sin(this.time * 11) : 0;
    const gait = DIRECTION_VECTOR[this.direction] ?? DIRECTION_VECTOR.south;
    const searchPhase = this.state === ACTOR_STATE.SEARCH ? Math.sin(Math.min(1, this.time / .65) * Math.PI) : 0;
    const pickupPhase = this.state === ACTOR_STATE.PICKUP ? Math.sin(Math.min(1, this.time / .65) * Math.PI) : 0;
    return Object.freeze({
      state: this.state,
      direction: this.direction,
      gaitX: gait.x,
      gaitY: gait.y,
      stepPhase: walkPhase,
      bob: Math.abs(walkPhase) * 2.3,
      stride: walkPhase * 6,
      legSwing: gait.x === 0 ? 0 : walkPhase * .18 * Math.abs(gait.x),
      legDepth: gait.y === 0 ? 0 : walkPhase * gait.y,
      bodySway: gait.x === 0 ? 0 : walkPhase * -.028 * Math.abs(gait.x),
      breathe: Math.sin(this.time * 2.4) * .012,
      lean: searchPhase * 0.18 + pickupPhase * 0.28,
      reach: searchPhase * 8 + pickupPhase * 14,
      crouch: searchPhase * .045 + pickupPhase * .085
    });
  }
}
