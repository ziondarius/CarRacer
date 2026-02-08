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
};

const CFG = {
  accel: 24,
  brake: 28,
  drag: 8,
  turnRate: 2.6,
  steerReturn: 4.8,
  maxForward: 40,
  maxReverse: -18,
  cameraHeight: 5.8,
  cameraBack: 11.5,
  cameraPitch: 0.34,
  cameraNear: 0.1,
  cameraFocal: 700,
  gridStep: 10,
  gridRadius: 520,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

  const step = CFG.gridStep;
  const radius = CFG.gridRadius;
  const centerX = Math.round(state.carX / step) * step;
  const centerZ = Math.round(state.carZ / step) * step;
  const minX = centerX - radius;
  const maxX = centerX + radius;
  const minZ = centerZ - radius;
  const maxZ = centerZ + radius;

  for (let x = minX; x <= maxX; x += step) {
    const p1 = project(x, 0.01, minZ, cam);
    const p2 = project(x, 0.01, maxZ, cam);
    if (!p1 || !p2) continue;
    const major = Math.abs((Math.round(x) / step) % 5) === 0;
    ctx.strokeStyle = major ? "rgba(49, 102, 44, 0.55)" : "rgba(56, 116, 52, 0.3)";
    ctx.lineWidth = major ? 1.35 : 0.9;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  for (let z = minZ; z <= maxZ; z += step) {
    const p1 = project(minX, 0.01, z, cam);
    const p2 = project(maxX, 0.01, z, cam);
    if (!p1 || !p2) continue;
    const major = Math.abs((Math.round(z) / step) % 5) === 0;
    ctx.strokeStyle = major ? "rgba(49, 102, 44, 0.55)" : "rgba(56, 116, 52, 0.3)";
    ctx.lineWidth = major ? 1.35 : 0.9;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
}

function carVerts() {
  const body = [
    [-1.25, 0.28, -2.6],
    [1.25, 0.28, -2.6],
    [1.25, 0.28, 2.55],
    [-1.25, 0.28, 2.55],
    [-1.2, 1.2, -2.45],
    [1.2, 1.2, -2.45],
    [1.2, 1.2, 2.35],
    [-1.2, 1.2, 2.35],
  ];
  const cabin = [
    [-0.85, 1.15, -0.95],
    [0.85, 1.15, -0.95],
    [0.85, 1.15, 1.35],
    [-0.85, 1.15, 1.35],
    [-0.72, 1.92, -0.55],
    [0.72, 1.92, -0.55],
    [0.72, 1.92, 1.12],
    [-0.72, 1.92, 1.12],
  ];
  const hood = [
    [-0.98, 1.2, 1.2],
    [0.98, 1.2, 1.2],
    [0.98, 1.2, 2.35],
    [-0.98, 1.2, 2.35],
    [-0.82, 1.42, 1.25],
    [0.82, 1.42, 1.25],
    [0.82, 1.32, 2.3],
    [-0.82, 1.32, 2.3],
  ];
  const wheels = [
    [-1.32, 0.23, -1.78],
    [1.32, 0.23, -1.78],
    [-1.32, 0.23, 1.78],
    [1.32, 0.23, 1.78],
  ];
  return { body, cabin, hood, wheels };
}

function transformPoint(localX, localY, localZ) {
  const s = Math.sin(state.heading);
  const c = Math.cos(state.heading);
  const wx = state.carX + localX * c - localZ * s;
  const wz = state.carZ + localX * s + localZ * c;
  return { x: wx, y: localY, z: wz };
}

function drawCar(cam) {
  const drawables = [];
  const toScreen = (points) =>
    points.map((p) => {
      const c = worldToCamera(p.x, p.y, p.z, cam);
      if (c.z < CFG.cameraNear) return null;
      return {
        x: canvas.width * 0.5 + (c.x * CFG.cameraFocal) / c.z,
        y: canvas.height * 0.5 - (c.y * CFG.cameraFocal) / c.z,
        z: c.z,
      };
    });

  const addPolyBox = (verts, palette, stroke) => {
    const worldVerts = verts.map((p) => transformPoint(p[0], p[1], p[2]));
    const projected = toScreen(worldVerts);
    const faces = [
      { idx: [0, 1, 2, 3], fill: palette.bottom },
      { idx: [4, 5, 6, 7], fill: palette.top },
      { idx: [0, 1, 5, 4], fill: palette.back },
      { idx: [1, 2, 6, 5], fill: palette.right },
      { idx: [2, 3, 7, 6], fill: palette.front },
      { idx: [3, 0, 4, 7], fill: palette.left },
    ];
    faces.forEach((f) => {
      const points = f.idx.map((i) => projected[i]);
      if (points.some((p) => !p)) return;
      const depth = points.reduce((sum, p) => sum + p.z, 0) / points.length;
      drawables.push({ points, fill: f.fill, stroke, depth });
    });
  ];

  const { body, cabin, hood, wheels } = carVerts();
  addPolyBox(
    body,
    {
      bottom: "#7c2d12",
      top: "#fb923c",
      back: "#b45309",
      right: "#f97316",
      front: "#fdba74",
      left: "#f97316",
    },
    "#7c2d12"
  );
  addPolyBox(
    hood,
    {
      bottom: "#9a3412",
      top: "#fdba74",
      back: "#c2410c",
      right: "#fb923c",
      front: "#ffedd5",
      left: "#fb923c",
    },
    "#9a3412"
  );
  addPolyBox(
    cabin,
    {
      bottom: "#64748b",
      top: "#f8fafc",
      back: "#94a3b8",
      right: "#cbd5e1",
      front: "#e2e8f0",
      left: "#cbd5e1",
    },
    "#64748b"
  );

  const wheelBox = (cx, cy, cz) => [
    [cx - 0.23, cy - 0.18, cz - 0.45],
    [cx + 0.23, cy - 0.18, cz - 0.45],
    [cx + 0.23, cy - 0.18, cz + 0.45],
    [cx - 0.23, cy - 0.18, cz + 0.45],
    [cx - 0.23, cy + 0.18, cz - 0.45],
    [cx + 0.23, cy + 0.18, cz - 0.45],
    [cx + 0.23, cy + 0.18, cz + 0.45],
    [cx - 0.23, cy + 0.18, cz + 0.45],
  ];

  wheels.forEach(([x, y, z]) =>
    addPolyBox(
      wheelBox(x, y, z),
      {
        bottom: "#111827",
        top: "#1f2937",
        back: "#111827",
        right: "#0f172a",
        front: "#1f2937",
        left: "#0f172a",
      },
      "#020617"
    )
  );

  drawables
    .sort((a, b) => b.depth - a.depth)
    .forEach((f) => {
      drawPoly(f.points, f.fill, f.stroke);
    })
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

  state.heading += state.steer * (state.speed / CFG.maxForward) * 1.9 * dt;
  state.carX += Math.sin(state.heading) * state.speed * dt;
  state.carZ += Math.cos(state.heading) * state.speed * dt;
}

function buildCamera() {
  const yaw = state.heading;
  return {
    x: state.carX - Math.sin(yaw) * CFG.cameraBack,
    y: CFG.cameraHeight,
    z: state.carZ - Math.cos(yaw) * CFG.cameraBack,
    yaw,
    pitch: CFG.cameraPitch,
  };
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  update(dt);

  const cam = buildCamera();
  drawGround(cam);
  drawCar(cam);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
