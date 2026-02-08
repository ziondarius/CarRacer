const root = document.getElementById("scene-root");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
root.appendChild(canvas);

const state = {
  carX: 0,
  carZ: 0,
  heading: 0,
  speed: 0,
  steer: 0,
  keys: {
    forward: false,
    backward: false,
    left: false,
    right: false,
  },
  camera: null,
};

const CFG = {
  accel: 24,
  brake: 28,
  drag: 8,
  turnRate: 2.6,
  steerReturn: 4.8,
  maxForward: 40,
  maxReverse: -18,
  cameraHeight: 6,
  cameraBack: 13,
  cameraSide: 0.8,
  cameraNear: 0.1,
  cameraFocal: 700,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleDelta(from, to) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function lerpAngle(from, to, t) {
  return from + angleDelta(from, to) * t;
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function onKey(event, isDown) {
  const k = event.key.toLowerCase();
  if (k === "w" || k === "arrowup") state.keys.forward = isDown;
  if (k === "s" || k === "arrowdown") state.keys.backward = isDown;
  if (k === "a" || k === "arrowleft") state.keys.left = isDown;
  if (k === "d" || k === "arrowright") state.keys.right = isDown;
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (e) => onKey(e, true));
window.addEventListener("keyup", (e) => onKey(e, false));
resize();

function worldToCamera(wx, wy, wz, cam) {
  const dx = wx - cam.x;
  const dy = wy - cam.y;
  const dz = wz - cam.z;

  const sy = Math.sin(-cam.yaw);
  const cy = Math.cos(-cam.yaw);
  const x1 = dx * cy - dz * sy;
  const z1 = dx * sy + dz * cy;

  const sp = Math.sin(-cam.pitch);
  const cp = Math.cos(-cam.pitch);
  const y2 = dy * cp - z1 * sp;
  const z2 = dy * sp + z1 * cp;

  return { x: x1, y: y2, z: z2 };
}

function project(wx, wy, wz, cam) {
  const p = worldToCamera(wx, wy, wz, cam);
  if (p.z < CFG.cameraNear) return null;
  const sx = canvas.width * 0.5 + (p.x * CFG.cameraFocal) / p.z;
  const sy = canvas.height * 0.5 - (p.y * CFG.cameraFocal) / p.z;
  return { x: sx, y: sy, z: p.z };
}

function drawPoly(points, fill, stroke) {
  if (points.some((p) => !p)) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawGround(cam) {
  const horizon = project(0, 0, 2000, cam);
  const horizonY = horizon ? horizon.y : canvas.height * 0.32;

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#9ad8ff");
  sky.addColorStop(1, "#d9f2ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const ground = ctx.createLinearGradient(0, horizonY, 0, canvas.height);
  ground.addColorStop(0, "#8fd57b");
  ground.addColorStop(1, "#65ba58");
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizonY, canvas.width, canvas.height - horizonY);

  ctx.strokeStyle = "rgba(56, 116, 52, 0.35)";
  ctx.lineWidth = 1;

  for (let x = -120; x <= 120; x += 8) {
    const p1 = project(x, 0.01, -30, cam);
    const p2 = project(x, 0.01, 240, cam);
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  for (let z = -30; z <= 240; z += 8) {
    const p1 = project(-120, 0.01, z, cam);
    const p2 = project(120, 0.01, z, cam);
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
}

function carVerts() {
  const c = [
    [-1.2, 0.35, -2.2],
    [1.2, 0.35, -2.2],
    [1.2, 0.35, 2.2],
    [-1.2, 0.35, 2.2],
    [-1.2, 1.25, -2.2],
    [1.2, 1.25, -2.2],
    [1.2, 1.25, 2.2],
    [-1.2, 1.25, 2.2],
  ];
  const cab = [
    [-0.82, 1.25, -0.8],
    [0.82, 1.25, -0.8],
    [0.82, 1.25, 1.1],
    [-0.82, 1.25, 1.1],
    [-0.82, 1.95, -0.8],
    [0.82, 1.95, -0.8],
    [0.82, 1.95, 1.1],
    [-0.82, 1.95, 1.1],
  ];
  return { body: c, cabin: cab };
}

function transformPoint(localX, localY, localZ) {
  const s = Math.sin(state.heading);
  const c = Math.cos(state.heading);
  const wx = state.carX + localX * c - localZ * s;
  const wz = state.carZ + localX * s + localZ * c;
  return { x: wx, y: localY, z: wz };
}

function drawCar(cam) {
  const { body, cabin } = carVerts();
  const b = body.map((p) => transformPoint(p[0], p[1], p[2]));
  const cb = cabin.map((p) => transformPoint(p[0], p[1], p[2]));
  const pb = b.map((p) => {
    const c = worldToCamera(p.x, p.y, p.z, cam);
    if (c.z < CFG.cameraNear) return null;
    return {
      x: canvas.width * 0.5 + (c.x * CFG.cameraFocal) / c.z,
      y: canvas.height * 0.5 - (c.y * CFG.cameraFocal) / c.z,
      z: c.z,
    };
  });
  const pc = cb.map((p) => {
    const c = worldToCamera(p.x, p.y, p.z, cam);
    if (c.z < CFG.cameraNear) return null;
    return {
      x: canvas.width * 0.5 + (c.x * CFG.cameraFocal) / c.z,
      y: canvas.height * 0.5 - (c.y * CFG.cameraFocal) / c.z,
      z: c.z,
    };
  });

  const faces = [
    { idx: [0, 1, 2, 3], fill: "#f97316" },
    { idx: [4, 5, 6, 7], fill: "#fb923c" },
    { idx: [0, 1, 5, 4], fill: "#ea580c" },
    { idx: [1, 2, 6, 5], fill: "#f97316" },
    { idx: [2, 3, 7, 6], fill: "#fb923c" },
    { idx: [3, 0, 4, 7], fill: "#f97316" },
  ];

  const cabinFaces = [
    { idx: [0, 1, 2, 3], fill: "#e2e8f0" },
    { idx: [4, 5, 6, 7], fill: "#f8fafc" },
    { idx: [0, 1, 5, 4], fill: "#94a3b8" },
    { idx: [1, 2, 6, 5], fill: "#cbd5e1" },
    { idx: [2, 3, 7, 6], fill: "#e2e8f0" },
    { idx: [3, 0, 4, 7], fill: "#cbd5e1" },
  ];

  const allFaces = [
    ...faces.map((f) => ({ ...f, verts: pb, stroke: "#7c2d12" })),
    ...cabinFaces.map((f) => ({ ...f, verts: pc, stroke: "#64748b" })),
  ];

  allFaces
    .map((f) => {
      const points = f.idx.map((i) => f.verts[i]);
      if (points.some((p) => !p)) return null;
      const depth = points.reduce((sum, p) => sum + p.z, 0) / points.length;
      return { points, fill: f.fill, stroke: f.stroke, depth };
    })
    .filter(Boolean)
    .sort((a, b) => b.depth - a.depth)
    .forEach((f) => {
      drawPoly(f.points, f.fill, f.stroke);
    });
}

function update(dt) {
  if (state.keys.forward) {
    state.speed += CFG.accel * dt;
  } else if (state.keys.backward) {
    state.speed -= CFG.brake * dt;
  } else if (state.speed > 0) {
    state.speed = Math.max(0, state.speed - CFG.drag * dt);
  } else if (state.speed < 0) {
    state.speed = Math.min(0, state.speed + CFG.drag * dt);
  }
  state.speed = clamp(state.speed, CFG.maxReverse, CFG.maxForward);

  const steerInput = (state.keys.left ? 1 : 0) - (state.keys.right ? 1 : 0);
  if (steerInput !== 0) {
    state.steer = clamp(state.steer + steerInput * CFG.turnRate * dt, -0.7, 0.7);
  } else if (state.steer > 0) {
    state.steer = Math.max(0, state.steer - CFG.steerReturn * dt);
  } else if (state.steer < 0) {
    state.steer = Math.min(0, state.steer + CFG.steerReturn * dt);
  }

  state.heading += state.steer * (state.speed / CFG.maxForward) * 2.4 * dt;
  state.carX += Math.sin(state.heading) * state.speed * dt;
  state.carZ += Math.cos(state.heading) * state.speed * dt;
}

function buildCameraTarget() {
  const yaw = state.heading;
  const camX =
    state.carX - Math.sin(yaw) * CFG.cameraBack + Math.cos(yaw) * CFG.cameraSide;
  const camZ =
    state.carZ - Math.cos(yaw) * CFG.cameraBack - Math.sin(yaw) * CFG.cameraSide;
  const camY = CFG.cameraHeight;

  const lookAhead = 3.6 + Math.max(0, state.speed) * 0.06;
  const tx = state.carX + Math.sin(yaw) * lookAhead;
  const ty = 1.2;
  const tz = state.carZ + Math.cos(yaw) * lookAhead;

  const dx = tx - camX;
  const dy = ty - camY;
  const dz = tz - camZ;

  const camYaw = Math.atan2(dx, dz);
  const horizontal = Math.sqrt(dx * dx + dz * dz);
  const camPitch = -Math.atan2(dy, horizontal);

  return { x: camX, y: camY, z: camZ, yaw: camYaw, pitch: camPitch };
}

function updateCamera(target, dt) {
  if (!state.camera) {
    state.camera = { ...target };
    return state.camera;
  }

  const posT = 1 - Math.exp(-dt * 7.5);
  const rotT = 1 - Math.exp(-dt * 10);

  state.camera.x += (target.x - state.camera.x) * posT;
  state.camera.y += (target.y - state.camera.y) * posT;
  state.camera.z += (target.z - state.camera.z) * posT;
  state.camera.yaw = lerpAngle(state.camera.yaw, target.yaw, rotT);
  state.camera.pitch += (target.pitch - state.camera.pitch) * rotT;

  return state.camera;
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  update(dt);

  const cam = updateCamera(buildCameraTarget(), dt);
  drawGround(cam);
  drawCar(cam);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
