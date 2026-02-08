const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");
const speedEl = document.getElementById("speed");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startBtn = document.getElementById("start-btn");
const configTabBtn = document.getElementById("config-tab");
const configPanel = document.getElementById("config-panel");
const livesInput = document.getElementById("lives-input");
const livesValue = document.getElementById("lives-value");
const speedInput = document.getElementById("speed-input");
const speedValue = document.getElementById("speed-value");
const leftBtn = document.getElementById("left-btn");
const rightBtn = document.getElementById("right-btn");
const upBtn = document.getElementById("up-btn");
const downBtn = document.getElementById("down-btn");

const W = canvas.width;
const H = canvas.height;
const ROAD_LEFT = 62;
const ROAD_WIDTH = W - ROAD_LEFT * 2;
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
const PLAYER_W = 44;
const PLAYER_H = 78;
const PLAYER_Y = H / 2 - PLAYER_H / 2;
const PLAYER_MIN_Y = 110;
const PLAYER_MAX_Y = H - PLAYER_H - 28;

const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem("car-racer-best")) || 0,
  speed: 4.2,
  settings: {
    lives: 3,
    baseSpeed: 4.2,
  },
  lives: 3,
  enemyTimer: 0,
  laneScroll: 0,
  invulnFrames: 0,
  player: {
    lane: 1,
    x: 0,
    y: PLAYER_Y,
  },
  enemies: [],
  keys: { left: false, right: false, up: false, down: false },
};

syncConfigInputs();
bestEl.textContent = state.best;
livesEl.textContent = state.lives;
resetPlayer();
drawFrame();

function laneCenter(lane) {
  return ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2;
}

function resetPlayer() {
  state.player.lane = 1;
  state.player.x = laneCenter(state.player.lane) - PLAYER_W / 2;
  state.player.y = PLAYER_Y;
}

function startGame() {
  state.running = true;
  state.score = 0;
  state.speed = state.settings.baseSpeed;
  state.lives = state.settings.lives;
  state.enemyTimer = 0;
  state.laneScroll = 0;
  state.invulnFrames = 0;
  state.enemies = [];
  resetPlayer();
  livesEl.textContent = state.lives;
  overlay.hidden = true;
  overlay.classList.add("hidden");
}

function endGame() {
  state.running = false;
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem("car-racer-best", String(state.best));
  bestEl.textContent = state.best;
  overlayTitle.textContent = "Crash!";
  overlayText.innerHTML =
    "Out of lives.<br />Use Arrow Keys / A-D and W-S, then try again.";
  startBtn.textContent = "Restart";
  overlay.hidden = false;
  overlay.classList.remove("hidden");
}

function syncConfigInputs() {
  livesInput.value = String(state.settings.lives);
  speedInput.value = String(state.settings.baseSpeed);
  livesValue.textContent = String(state.settings.lives);
  speedValue.textContent = state.settings.baseSpeed.toFixed(1);
}

function handleCollision(enemyIndex) {
  if (state.invulnFrames > 0) return;

  state.lives -= 1;
  livesEl.textContent = state.lives;
  state.enemies.splice(enemyIndex, 1);
  state.invulnFrames = 70;
  resetPlayer();

  if (state.lives <= 0) {
    endGame();
  }
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
  if (state.keys.up) {
    state.player.y -= 4.4;
  }
  if (state.keys.down) {
    state.player.y += 4.4;
  }
  state.player.y = Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y, state.player.y));

  state.score += 0.06 * state.speed;
  state.speed = Math.min(13, state.settings.baseSpeed + state.score / 180);
  state.enemyTimer += 1;
  state.laneScroll = (state.laneScroll + state.speed) % 80;
  if (state.invulnFrames > 0) {
    state.invulnFrames -= 1;
  }

  const spawnRate = Math.max(14, 42 - state.speed * 2);
  if (state.enemyTimer >= spawnRate) {
    state.enemyTimer = 0;
    spawnEnemy();
  }

  for (const enemy of state.enemies) {
    enemy.y += state.speed + 1.8;
  }

  state.enemies = state.enemies.filter((enemy) => enemy.y < H + enemy.h);

  for (let i = 0; i < state.enemies.length; i += 1) {
    if (isColliding(state.player, state.enemies[i])) {
      handleCollision(i);
      break;
    }
  }
}

function isColliding(a, b) {
  return a.x < b.x + b.w && a.x + PLAYER_W > b.x && a.y < b.y + b.h && a.y + PLAYER_H > b.y;
}

function drawRoad() {
  ctx.fillStyle = "#dbeafe";
  ctx.fillRect(0, 0, ROAD_LEFT, H);
  ctx.fillRect(ROAD_LEFT + ROAD_WIDTH, 0, ROAD_LEFT, H);

  ctx.fillStyle = "#9ca3af";
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(ROAD_LEFT - 3, 0, 6, H);
  ctx.fillRect(ROAD_LEFT + ROAD_WIDTH - 3, 0, 6, H);

  ctx.strokeStyle = "#f8fafc";
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

  if (state.invulnFrames === 0 || Math.floor(state.invulnFrames / 5) % 2 === 0) {
    drawCar(state.player.x, state.player.y, PLAYER_W, PLAYER_H, "#f59e0b");
  }

  scoreEl.textContent = Math.floor(state.score);
  speedEl.textContent = `${state.speed.toFixed(1)}`;
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
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
    state.keys.up = true;
  }
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
    state.keys.down = true;
  }
}

function onKeyUp(event) {
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
    state.keys.up = false;
  }
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
    state.keys.down = false;
  }
}

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);

configTabBtn.addEventListener("click", () => {
  const willOpen = configPanel.hidden;
  configPanel.hidden = !willOpen;
  configTabBtn.setAttribute("aria-expanded", String(willOpen));
});

livesInput.addEventListener("input", () => {
  state.settings.lives = Number(livesInput.value);
  livesValue.textContent = String(state.settings.lives);
  if (!state.running) {
    state.lives = state.settings.lives;
    livesEl.textContent = state.lives;
  }
});

speedInput.addEventListener("input", () => {
  state.settings.baseSpeed = Number(speedInput.value);
  speedValue.textContent = state.settings.baseSpeed.toFixed(1);
  if (state.running) {
    state.speed = Math.max(state.speed, state.settings.baseSpeed);
  } else {
    speedEl.textContent = state.settings.baseSpeed.toFixed(1);
  }
});

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

upBtn.addEventListener("pointerdown", () => {
  state.keys.up = true;
});
upBtn.addEventListener("pointerup", () => {
  state.keys.up = false;
});
upBtn.addEventListener("pointerleave", () => {
  state.keys.up = false;
});

downBtn.addEventListener("pointerdown", () => {
  state.keys.down = true;
});
downBtn.addEventListener("pointerup", () => {
  state.keys.down = false;
});
downBtn.addEventListener("pointerleave", () => {
  state.keys.down = false;
});

loop();
