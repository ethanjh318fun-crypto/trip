const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const modeLabel = document.getElementById('modeLabel');
const powerLabel = document.getElementById('powerLabel');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const challengeBtn = document.getElementById('challengeBtn');
const pauseOverlay = document.getElementById('pauseOverlay');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');

const gridSize = 20;
const tileSize = canvas.width / gridSize;
let lastMove = 0;

const defaultState = {
  snake: [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ],
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  food: { x: 15, y: 10 },
  obstacles: [],
  powerUps: [],
  aiSnake: null,
  score: 0,
  best: Number(localStorage.getItem('snake-best') || 0),
  speed: 135,
  running: false,
  paused: false,
  challengeMode: false,
  challengeTick: 0,
  aiSpawnTimer: 0,
  shield: 0,
  slowMo: 0,
  magnet: 0,
  doubleScore: 0,
  powerStatus: 'None'
};

let state = structuredClone(defaultState);

function resetSnake() {
  state.snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  state.dir = { x: 1, y: 0 };
  state.nextDir = { x: 1, y: 0 };
  state.food = randomFreeCell();
  state.obstacles = [];
  state.powerUps = [];
  state.aiSnake = null;
  state.score = 0;
  state.speed = 135;
  state.running = true;
  state.paused = false;
  state.challengeTick = 0;
  state.aiSpawnTimer = 0;
  state.shield = 0;
  state.slowMo = 0;
  state.magnet = 0;
  state.doubleScore = 0;
  state.powerStatus = 'None';
  powerLabel.textContent = 'None';
  lastMove = 0;
  hidePauseMenu();
}

function setMode(mode) {
  state.challengeMode = mode;
  modeLabel.textContent = mode ? 'Challenge' : 'Normal';
}

function saveBest() {
  localStorage.setItem('snake-best', String(state.best));
}

function randomFreeCell() {
  const occupied = new Set(
    state.snake.concat(state.obstacles, state.powerUps || []).map((cell) => `${cell.x},${cell.y}`)
  );

  const cells = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) cells.push({ x, y });
    }
  }

  if (!cells.length) return { x: 0, y: 0 };
  return cells[Math.floor(Math.random() * cells.length)];
}

function spawnFood() {
  state.food = randomFreeCell();
}

function spawnPowerUp() {
  const options = ['shield', 'magnet', 'slow', 'double'];
  const cell = randomFreeCell();
  if (!cell) return;
  const type = options[Math.floor(Math.random() * options.length)];
  state.powerUps.push({ ...cell, type });
}

function spawnObstacle() {
  const freeCell = randomFreeCell();
  if (!freeCell) return;
  state.obstacles.push(freeCell);
}

function spawnAiSnake() {
  const valid = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const body = state.snake.some((seg) => seg.x === x && seg.y === y);
      const blocked = state.obstacles.some((seg) => seg.x === x && seg.y === y);
      if (!body && !blocked) valid.push({ x, y });
    }
  }

  if (!valid.length) return;

  const start = valid[Math.floor(Math.random() * valid.length)];
  state.aiSnake = [
    { ...start },
    { x: start.x - 1, y: start.y },
    { x: start.x - 2, y: start.y }
  ];
}

function applyPowerUp(type) {
  if (type === 'shield') state.shield = 8;
  if (type === 'magnet') state.magnet = 8;
  if (type === 'slow') state.slowMo = 8;
  if (type === 'double') state.doubleScore = 8;

  state.powerStatus = type;
  powerLabel.textContent = type.charAt(0).toUpperCase() + type.slice(1);
}

function updatePowerTimers() {
  if (state.shield > 0) state.shield -= 1;
  if (state.magnet > 0) state.magnet -= 1;
  if (state.slowMo > 0) state.slowMo -= 1;
  if (state.doubleScore > 0) state.doubleScore -= 1;

  const active = [
    state.shield > 0 ? 'Shield' : null,
    state.magnet > 0 ? 'Magnet' : null,
    state.slowMo > 0 ? 'Slow-mo' : null,
    state.doubleScore > 0 ? 'Double score' : null
  ].filter(Boolean);

  state.powerStatus = active[0] || 'None';
  powerLabel.textContent = state.powerStatus;
}

function setDirection(next) {
  const isOpposite = next.x === -state.dir.x && next.y === -state.dir.y;
  if (!isOpposite) state.nextDir = next;
}

function moveSnake() {
  state.dir = state.nextDir;
  const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };

  if (
    head.x < 0 ||
    head.x >= gridSize ||
    head.y < 0 ||
    head.y >= gridSize ||
    state.snake.some((segment) => segment.x === head.x && segment.y === head.y)
  ) {
    if (state.shield > 0) {
      state.shield = 0;
      state.powerStatus = 'None';
      powerLabel.textContent = 'None';
      state.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      state.dir = { x: 1, y: 0 };
      state.nextDir = { x: 1, y: 0 };
      return;
    }

    endGame();
    return;
  }

  const hitObstacle = state.obstacles.some((cell) => cell.x === head.x && cell.y === head.y);
  if (hitObstacle) {
    if (state.shield > 0) {
      state.shield = 0;
      state.powerStatus = 'None';
      powerLabel.textContent = 'None';
      state.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      state.dir = { x: 1, y: 0 };
      state.nextDir = { x: 1, y: 0 };
      return;
    }

    endGame();
    return;
  }

  const newHead = { x: head.x, y: head.y };
  state.snake.unshift(newHead);

  const ateFood = head.x === state.food.x && head.y === state.food.y;
  if (ateFood) {
    const points = state.doubleScore > 0 ? 20 : 10;
    state.score += points;
    state.speed = Math.max(70, state.speed - 2);
    spawnFood();
    if (Math.random() < 0.35) spawnPowerUp();
  } else {
    state.snake.pop();
  }

  if (state.magnet > 0 && state.food) {
    const headPos = state.snake[0];
    if (Math.abs(headPos.x - state.food.x) + Math.abs(headPos.y - state.food.y) <= 4) {
      const dx = Math.sign(state.food.x - headPos.x);
      const dy = Math.sign(state.food.y - headPos.y);
      state.food.x = clamp(state.food.x + dx, 0, gridSize - 1);
      state.food.y = clamp(state.food.y + dy, 0, gridSize - 1);
    }
  }

  for (let i = 0; i < state.powerUps.length; i += 1) {
    const pickup = state.powerUps[i];
    if (pickup.x === head.x && pickup.y === head.y) {
      applyPowerUp(pickup.type);
      state.powerUps.splice(i, 1);
      break;
    }
  }

  if (state.score > state.best) {
    state.best = state.score;
    bestEl.textContent = String(state.best);
    saveBest();
  }

  scoreEl.textContent = String(state.score);
}

function endGame() {
  state.running = false;
  state.paused = false;
  hidePauseMenu();
  startBtn.textContent = 'Restart';
}

function showPauseMenu() {
  state.paused = true;
  pauseOverlay.classList.remove('hidden');
  pauseBtn.textContent = 'Resume';
}

function hidePauseMenu() {
  state.paused = false;
  pauseOverlay.classList.add('hidden');
  pauseBtn.textContent = 'Pause';
}

function togglePause() {
  if (!state.running) return;
  if (state.paused) {
    hidePauseMenu();
  } else {
    showPauseMenu();
  }
}

function updateChallenge() {
  if (!state.challengeMode || !state.running || state.paused) return;

  state.challengeTick += 1;
  state.aiSpawnTimer += 1;

  if (state.challengeTick >= 15 * 60) {
    state.challengeTick = 0;
    spawnObstacle();
  }

  if (state.aiSpawnTimer >= 45 * 60) {
    state.aiSpawnTimer = 0;
    spawnAiSnake();
  }
}

function moveAiSnake() {
  if (!state.aiSnake || !state.running || state.paused) return;

  const head = state.aiSnake[0];
  let bestDir = null;
  let bestScore = Infinity;

  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];

  for (const dir of directions) {
    const next = { x: head.x + dir.x, y: head.y + dir.y };
    if (next.x < 0 || next.y < 0 || next.x >= gridSize || next.y >= gridSize) continue;
    if (state.aiSnake.some((seg) => seg.x === next.x && seg.y === next.y)) continue;
    if (state.obstacles.some((seg) => seg.x === next.x && seg.y === next.y)) continue;

    const distance = Math.abs(next.x - state.snake[0].x) + Math.abs(next.y - state.snake[0].y);
    if (distance < bestScore) {
      bestScore = distance;
      bestDir = dir;
    }
  }

  if (!bestDir) return;

  const newHead = { x: head.x + bestDir.x, y: head.y + bestDir.y };
  state.aiSnake.unshift(newHead);
  state.aiSnake.pop();

  if (state.aiSnake[0].x === state.snake[0].x && state.aiSnake[0].y === state.snake[0].y) {
    if (state.shield > 0) {
      state.shield = 0;
      state.powerStatus = 'None';
      powerLabel.textContent = 'None';
      state.aiSnake = null;
    } else {
      endGame();
    }
  }
}

function drawSquare(x, y, color, size = tileSize) {
  ctx.fillStyle = color;
  ctx.fillRect(x * tileSize, y * tileSize, size, size);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const isDark = (x + y) % 2 === 0;
      ctx.fillStyle = isDark ? '#0b1722' : '#0f1d2a';
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  state.obstacles.forEach((cell) => {
    drawSquare(cell.x, cell.y, '#64748b');
  });

  state.powerUps.forEach((cell) => {
    const colors = {
      shield: '#60a5fa',
      magnet: '#a78bfa',
      slow: '#fbbf24',
      double: '#f472b6'
    };
    drawSquare(cell.x, cell.y, colors[cell.type], tileSize - 4);
  });

  if (state.food) {
    drawSquare(state.food.x, state.food.y, '#f97316', tileSize - 4);
  }

  if (state.slowMo > 0) {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.fillRect(12, 12, 170, 30);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 170, 30);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('SLOW-MO', 22, 33);
  }

  if (state.shield > 0 && state.snake[0]) {
    const head = state.snake[0];
    const cx = head.x * tileSize + tileSize / 2;
    const cy = head.y * tileSize + tileSize / 2;

    ctx.beginPath();
    ctx.arc(cx, cy, tileSize * 1.1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.95)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(96, 165, 250, 0.9)';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  state.snake.forEach((segment, index) => {
    drawSquare(segment.x, segment.y, index === 0 ? '#4ade80' : '#22c55e');
  });

  if (state.aiSnake) {
    state.aiSnake.forEach((segment, index) => {
      drawSquare(segment.x, segment.y, index === 0 ? '#f87171' : '#ef4444');
    });
  }

  if (state.running === false) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '18px Arial';
    ctx.fillText('Press Start to play again', canvas.width / 2, canvas.height / 2 + 22);
  }
}

function tick(ts) {
  const moveInterval = state.slowMo > 0 ? 220 : state.speed;

  if (state.running && !state.paused && ts - lastMove >= moveInterval) {
    updatePowerTimers();
    moveSnake();
    updateChallenge();
    moveAiSnake();
    lastMove = ts;
  }

  render();
  requestAnimationFrame(tick);
}

function startGame() {
  resetSnake();
  setMode(state.challengeMode);
  startBtn.textContent = 'Restart';
}

function bindControls() {
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const mapping = {
      arrowup: { x: 0, y: -1 },
      w: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 },
      s: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 },
      a: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 },
      d: { x: 1, y: 0 },
      escape: 'pause'
    };

    if (mapping[key] === 'pause') {
      event.preventDefault();
      togglePause();
      return;
    }

    if (mapping[key]) {
      event.preventDefault();
      setDirection(mapping[key]);
      if (!state.running && !state.paused) {
        startGame();
      }
    }
  });

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  resumeBtn.addEventListener('click', () => {
    hidePauseMenu();
  });
  restartBtn.addEventListener('click', startGame);
  challengeBtn.addEventListener('click', () => {
    setMode(!state.challengeMode);
    startGame();
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

bestEl.textContent = String(state.best);
modeLabel.textContent = state.challengeMode ? 'Challenge' : 'Normal';
powerLabel.textContent = 'None';
hidePauseMenu();
bindControls();
render();
requestAnimationFrame(tick);
