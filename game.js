const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const speedEl = document.getElementById("speed");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startBtn = document.getElementById("start-btn");
const leftBtn = document.getElementById("left-btn");
const rightBtn = document.getElementById("right-btn");

const W = canvas.width;
const H = canvas.height;
const ROAD_LEFT = 62;
const ROAD_WIDTH = W - ROAD_LEFT * 2;
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
const PLAYER_W = 44;
const PLAYER_H = 78;

const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem("car-racer-best")) || 0,
  speed: 4.2,
  enemyTimer: 0,
  laneScroll: 0,
  player: {
    lane: 1,
    x: 0,
    y: H - PLAYER_H - 24,
  },
  enemies: [],
  keys: { left: false, right: false },
};

bestEl.textContent = state.best;
resetPlayer();
drawFrame();

function laneCenter(lane) {
  return ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2;
}

function resetPlayer() {
  state.player.lane = 1;
  state.player.x = laneCenter(state.player.lane) - PLAYER_W / 2;
}

function startGame() {
  state.running = true;
  state.score = 0;
  state.speed = 4.2;
  state.enemyTimer = 0;
  state.laneScroll = 0;
  state.enemies = [];
  resetPlayer();
  overlay.hidden = true;
}

function endGame() {
  state.running = false;
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem("car-racer-best", String(state.best));
  bestEl.textContent = state.best;
  overlayTitle.textContent = "Crash!";
  overlayText.innerHTML =
    "You hit traffic.<br />Use Arrow Keys or A/D to steer, then try again.";
  startBtn.textContent = "Restart";
  overlay.hidden = false;
}

function spawnEnemy() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const width = 42;
  const height = 76;
  const x = laneCenter(lane) - width / 2;
  state.enemies.push({
    lane,
    x,
    y: -height - 10,
    w: width,
    h: height,
    color: randomColor(),
  });
}

function randomColor() {
  const palette = ["#ef4444", "#22c55e", "#a855f7", "#0ea5e9", "#f97316"];
  return palette[Math.floor(Math.random() * palette.length)];
}

function update() {
  if (!state.running) return;

  if (state.keys.left && state.player.lane > 0) {
    state.player.lane -= 1;
    state.keys.left = false;
  } else if (state.keys.right && state.player.lane < LANE_COUNT - 1) {
    state.player.lane += 1;
    state.keys.right = false;
  }

  const targetX = laneCenter(state.player.lane) - PLAYER_W / 2;
  state.player.x += (targetX - state.player.x) * 0.28;

  state.score += 0.06 * state.speed;
  state.speed = Math.min(12, 4.2 + state.score / 160);
  state.enemyTimer += 1;
  state.laneScroll = (state.laneScroll + state.speed) % 80;

  const spawnRate = Math.max(14, 42 - state.speed * 2);
  if (state.enemyTimer >= spawnRate) {
    state.enemyTimer = 0;
    spawnEnemy();
  }

  for (const enemy of state.enemies) {
    enemy.y += state.speed + 1.8;
  }

  state.enemies = state.enemies.filter((enemy) => enemy.y < H + enemy.h);

  for (const enemy of state.enemies) {
    if (isColliding(state.player, enemy)) {
      endGame();
      break;
    }
  }
}

function isColliding(a, b) {
  return a.x < b.x + b.w && a.x + PLAYER_W > b.x && a.y < b.y + b.h && a.y + PLAYER_H > b.y;
}

function drawRoad() {
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, ROAD_LEFT, H);
  ctx.fillRect(ROAD_LEFT + ROAD_WIDTH, 0, ROAD_LEFT, H);

  ctx.fillStyle = "#1f2937";
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(ROAD_LEFT - 3, 0, 6, H);
  ctx.fillRect(ROAD_LEFT + ROAD_WIDTH - 3, 0, 6, H);

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 4;
  ctx.setLineDash([28, 24]);
  for (let i = 1; i < LANE_COUNT; i += 1) {
    const x = ROAD_LEFT + i * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(x, -80 + state.laneScroll);
    ctx.lineTo(x, H + 80);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCar(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = "#111827";
  ctx.fillRect(x + 6, y + 8, w - 12, h - 18);

  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(x + 10, y + 12, w - 20, 18);
  ctx.fillRect(x + 10, y + h - 28, w - 20, 14);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x - 3, y + 12, 6, 14);
  ctx.fillRect(x + w - 3, y + 12, 6, 14);
  ctx.fillRect(x - 3, y + h - 24, 6, 14);
  ctx.fillRect(x + w - 3, y + h - 24, 6, 14);
}

function drawFrame() {
  ctx.clearRect(0, 0, W, H);
  drawRoad();

  for (const enemy of state.enemies) {
    drawCar(enemy.x, enemy.y, enemy.w, enemy.h, enemy.color);
  }

  drawCar(state.player.x, state.player.y, PLAYER_W, PLAYER_H, "#f59e0b");

  scoreEl.textContent = Math.floor(state.score);
  speedEl.textContent = `${(state.speed / 4.2).toFixed(1)}x`;
}

function loop() {
  update();
  drawFrame();
  requestAnimationFrame(loop);
}

function onKeyDown(event) {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    state.keys.left = true;
  }
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    state.keys.right = true;
  }
}

document.addEventListener("keydown", onKeyDown);
startBtn.addEventListener("click", () => {
  startBtn.textContent = "Restart";
  overlayTitle.textContent = "Car Racer";
  overlayText.innerHTML = "Avoid traffic and keep your run alive.";
  startGame();
});

leftBtn.addEventListener("click", () => {
  state.keys.left = true;
});

rightBtn.addEventListener("click", () => {
  state.keys.right = true;
});

loop();
