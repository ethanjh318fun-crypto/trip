import React, { useEffect, useRef, useState } from "react";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };

const GRID_SIZE = 20;
const CELL_SIZE = 24;
const OBSTACLE_INTERVAL = 60; // seconds of play between new obstacles
const MAX_OBSTACLE_CELLS = 30;
const START_LIVES = 3;
const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

// Snake skins. "classic" is free; every other skin is exclusive and only
// unlocks by redeeming its code.
const SKINS: Record<string, { label: string; head: string; body: string; glow: string }> = {
  classic: { label: "Classic", head: "#4ade80", body: "#22c55e", glow: "rgba(74, 222, 128, 0.5)" },
  aurora: { label: "Aurora", head: "#a5f3fc", body: "#8b5cf6", glow: "rgba(125, 211, 252, 0.8)" },
  ember: { label: "Ember", head: "#fdba74", body: "#ef4444", glow: "rgba(249, 115, 22, 0.8)" },
  solar: { label: "Solar", head: "#fef08a", body: "#f59e0b", glow: "rgba(251, 191, 36, 0.8)" },
  frost: { label: "Frost", head: "#ffffff", body: "#7dd3fc", glow: "rgba(186, 230, 253, 0.85)" },
  rose: { label: "Rose", head: "#fbcfe8", body: "#ec4899", glow: "rgba(244, 114, 182, 0.8)" },
  void: { label: "Void", head: "#c4b5fd", body: "#6d28d9", glow: "rgba(124, 58, 237, 0.9)" },
  sunset: { label: "Sunset", head: "#fdba74", body: "#d946ef", glow: "rgba(232, 121, 249, 0.8)" },
};

type RedeemReward =
  | { type: "points"; amount: number }
  | { type: "skin"; skin: string }
  | { type: "allSkins" };

const REDEEM_CODES: Record<string, RedeemReward> = {
  // Points
  "100POINTS": { type: "points", amount: 100 },
  "300POINTS": { type: "points", amount: 300 },
  "620POINTS": { type: "points", amount: 620 },
  "LUCKY-777": { type: "points", amount: 777 },
  "1000POINTS": { type: "points", amount: 1000 },
  "BIG-BANK": { type: "points", amount: 1500 },
  "2500POINTS": { type: "points", amount: 2500 },
  "5000POINTS": { type: "points", amount: 5000 },
  // Exclusive skins
  "AURORA-SECRET": { type: "skin", skin: "aurora" },
  "EMBER-FLAME": { type: "skin", skin: "ember" },
  "SOLAR-FLARE": { type: "skin", skin: "solar" },
  "FROST-BITE": { type: "skin", skin: "frost" },
  "ROSE-GARDEN": { type: "skin", skin: "rose" },
  "VOID-WALKER": { type: "skin", skin: "void" },
  "SUNSET-GLOW": { type: "skin", skin: "sunset" },
  // Everything at once
  "ALL-SKINS": { type: "allSkins" },
};

const describeReward = (reward: RedeemReward) =>
  reward.type === "points"
    ? `+${reward.amount} points`
    : reward.type === "skin"
      ? `unlock the exclusive ${SKINS[reward.skin].label} skin`
      : "unlock every exclusive skin";

function getRandomFood(snake: Point[], blocked: Point[] = []): Point {
  const occupied = new Set([...snake, ...blocked].map((segment) => `${segment.x},${segment.y}`));
  const cells: Point[] = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        cells.push({ x, y });
      }
    }
  }

  return cells[Math.floor(Math.random() * cells.length)] ?? { x: 0, y: 0 };
}

export default function App() {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>(() => getRandomFood(INITIAL_SNAKE));
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [speed, setSpeed] = useState(170);
  const [score, setScore] = useState(0);
  const [bank, setBank] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [obstacles, setObstacles] = useState<Point[]>([]);
  const [nextObstacleIn, setNextObstacleIn] = useState(OBSTACLE_INTERVAL);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showPad, setShowPad] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemLog, setRedeemLog] = useState<Array<{ code: string; result: string }>>([]);
  const [settingsTab, setSettingsTab] = useState<"controls" | "redeem" | "skins">("controls");
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMessage, setRedeemMessage] = useState("Enter a code to earn points or unlock an exclusive skin.");
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(["classic"]);
  const [selectedSkin, setSelectedSkin] = useState("classic");

  const directionRef = useRef<Direction>("RIGHT");
  const foodRef = useRef(food);
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE);
  const obstaclesRef = useRef<Point[]>([]);
  const livesRef = useRef(START_LIVES);
  const obstacleClockRef = useRef(0);
  const bankedRef = useRef(false);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood(getRandomFood(INITIAL_SNAKE));
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    setScore(0);
    setGameOver(false);
    setStarted(false);
    setSpeed(170);
    snakeRef.current = INITIAL_SNAKE;
    obstaclesRef.current = [];
    setObstacles([]);
    livesRef.current = START_LIVES;
    setLives(START_LIVES);
    obstacleClockRef.current = 0;
    setNextObstacleIn(OBSTACLE_INTERVAL);
    bankedRef.current = false;
  };

  const applySkin = (skin: string) => {
    if (!unlockedSkins.includes(skin)) return;
    setSelectedSkin(skin);
  };

  const handleRedeemCode = () => {
    const code = redeemInput.trim().toUpperCase();

    if (!code) {
      setRedeemMessage("Enter a redeem code first.");
      return;
    }

    const reward = REDEEM_CODES[code];

    if (!reward) {
      setRedeemMessage("Invalid code. Try one of the listed rewards.");
      return;
    }

    if (reward.type === "points") {
      setBank((prev) => prev + reward.amount);
      setRedeemMessage(`Redeemed! +${reward.amount} points added to your bank.`);
    } else if (reward.type === "skin") {
      const label = SKINS[reward.skin].label;
      if (unlockedSkins.includes(reward.skin)) {
        setRedeemMessage(`${label} skin is already unlocked.`);
      } else {
        setUnlockedSkins((prev) => [...prev, reward.skin]);
        setSelectedSkin(reward.skin);
        setRedeemMessage(`Exclusive ${label} skin unlocked and equipped!`);
      }
    } else {
      const all = Object.keys(SKINS);
      if (all.every((id) => unlockedSkins.includes(id))) {
        setRedeemMessage("Every skin is already unlocked.");
      } else {
        setUnlockedSkins(all);
        setRedeemMessage("All exclusive skins unlocked!");
      }
    }

    setRedeemLog((prev) => [{ code, result: describeReward(reward) }, ...prev]);
    setRedeemInput("");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const key = event.key.toLowerCase();

      if (key === "w" || key === "arrowup") {
        if (directionRef.current !== "DOWN") {
          directionRef.current = "UP";
          setDirection("UP");
        }
      }

      if (key === "s" || key === "arrowdown") {
        if (directionRef.current !== "UP") {
          directionRef.current = "DOWN";
          setDirection("DOWN");
        }
      }

      if (key === "a" || key === "arrowleft") {
        if (directionRef.current !== "RIGHT") {
          directionRef.current = "LEFT";
          setDirection("LEFT");
        }
      }

      if (key === "d" || key === "arrowright") {
        if (directionRef.current !== "LEFT") {
          directionRef.current = "RIGHT";
          setDirection("RIGHT");
        }
      }

      setStarted(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const popupOpen = settingsOpen || redeemOpen;

  useEffect(() => {
    if (!started || gameOver || popupOpen) return;

    const tick = setInterval(() => {
      const currentSnake = snakeRef.current;
      const head = currentSnake[0];
      const nextHead = { ...head };

      if (directionRef.current === "UP") nextHead.y -= 1;
      if (directionRef.current === "DOWN") nextHead.y += 1;
      if (directionRef.current === "LEFT") nextHead.x -= 1;
      if (directionRef.current === "RIGHT") nextHead.x += 1;

      const hitsWall =
        nextHead.x < 0 ||
        nextHead.y < 0 ||
        nextHead.x >= GRID_SIZE ||
        nextHead.y >= GRID_SIZE;

      const hitsSelf = currentSnake.some(
        (segment) => segment.x === nextHead.x && segment.y === nextHead.y
      );

      const hitsObstacle = obstaclesRef.current.some(
        (cell) => cell.x === nextHead.x && cell.y === nextHead.y
      );

      if (hitsWall || hitsSelf || hitsObstacle) {
        if (livesRef.current > 1) {
          // Lose a life, go back to the start and wait for the next key press
          livesRef.current -= 1;
          setLives(livesRef.current);
          snakeRef.current = INITIAL_SNAKE;
          setSnake(INITIAL_SNAKE);
          directionRef.current = "RIGHT";
          setDirection("RIGHT");
          setStarted(false);
        } else {
          livesRef.current = 0;
          setLives(0);
          setGameOver(true);
        }
        return;
      }

      const nextSnake = [nextHead, ...currentSnake];

      if (nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y) {
        const newFood = getRandomFood(nextSnake, obstaclesRef.current);
        setFood(newFood);
        setScore((prev) => prev + 10);
        setSpeed((prev) => Math.max(100, prev - 2));
        snakeRef.current = nextSnake;
        setSnake(nextSnake);
        return;
      }

      const movedSnake = nextSnake.slice(0, -1);
      snakeRef.current = movedSnake;
      setSnake(movedSnake);
    }, speed);

    return () => clearInterval(tick);
  }, [started, gameOver, popupOpen, speed]);

  // Obstacle clock: counts only while the game is actively running
  useEffect(() => {
    if (!started || gameOver || popupOpen) return;

    const clock = setInterval(() => {
      obstacleClockRef.current += 1;

      if (obstacleClockRef.current >= OBSTACLE_INTERVAL) {
        obstacleClockRef.current = 0;

        if (obstaclesRef.current.length < MAX_OBSTACLE_CELLS) {
          const player = snakeRef.current;
          const playerHead = player[0];
          const taken = (x: number, y: number) =>
            x < 0 ||
            y < 0 ||
            x >= GRID_SIZE ||
            y >= GRID_SIZE ||
            player.some((segment) => segment.x === x && segment.y === y) ||
            obstaclesRef.current.some((cell) => cell.x === x && cell.y === y) ||
            (foodRef.current.x === x && foodRef.current.y === y) ||
            Math.abs(x - playerHead.x) + Math.abs(y - playerHead.y) < 4;

          let pair: Point[] | null = null;
          for (let attempt = 0; attempt < 300 && !pair; attempt += 1) {
            const x = Math.floor(Math.random() * GRID_SIZE);
            const y = Math.floor(Math.random() * GRID_SIZE);
            const horizontal = Math.random() < 0.5;
            const candidate = [
              { x, y },
              { x: x + (horizontal ? 1 : 0), y: y + (horizontal ? 0 : 1) },
            ];
            if (!candidate.some((cell) => taken(cell.x, cell.y))) pair = candidate;
          }

          if (pair) {
            obstaclesRef.current = [...obstaclesRef.current, ...pair];
            setObstacles(obstaclesRef.current);
          }
        }
      }

      setNextObstacleIn(OBSTACLE_INTERVAL - obstacleClockRef.current);
    }, 1000);

    return () => clearInterval(clock);
  }, [started, gameOver, popupOpen]);

  // When a run ends, its score goes into the bank and may set a new high score
  useEffect(() => {
    if (!gameOver || bankedRef.current) return;
    bankedRef.current = true;
    setBank((prev) => prev + score);
    setHighScore((prev) => Math.max(prev, score));
  }, [gameOver, score]);

  const snakeColor = SKINS[selectedSkin] ?? SKINS.classic;

  const cells = [] as Array<{ x: number; y: number; isHead: boolean; isBody: boolean; isFood: boolean; isObstacle: boolean }>;
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const isHead = snake[0]?.x === x && snake[0]?.y === y;
      const isBody = snake.some((segment, index) => index > 0 && segment.x === x && segment.y === y);
      const isFood = food.x === x && food.y === y;
      const isObstacle = obstacles.some((cell) => cell.x === x && cell.y === y);
      cells.push({ x, y, isHead, isBody, isFood, isObstacle });
    }
  }


  const cardStyle: React.CSSProperties = { background: "#f4f4f5", borderRadius: 14, padding: "10px 14px" };
  const cardLabel: React.CSSProperties = { fontSize: 12, color: "#71717a" };
  const cardValue: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: "#18181b",
    marginTop: 2,
    fontVariantNumeric: "tabular-nums",
  };
  const stats: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Score", value: score },
    { label: "High score", value: Math.max(highScore, score) },
    {
      label: "Bank",
      value: (
        <>
          {bank} <span style={{ fontSize: 13, fontWeight: 600, color: "#71717a" }}>pts</span>
        </>
      ),
    },
    {
      label: "Lives",
      value: (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center", height: 29 }}>
          {[0, 1, 2].map((i) => (
            <i
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: i < lives ? "#a3e635" : "#71717a",
                opacity: i < lives ? 1 : 0.35,
              }}
            />
          ))}
        </span>
      ),
    },
    { label: "Next obstacle", value: started && !gameOver ? `${nextObstacleIn}s` : "--" },
  ];

  const steer = (next: Direction, opposite: Direction) => {
    setStarted(true);
    if (directionRef.current !== opposite) {
      directionRef.current = next;
      setDirection(next);
    }
  };

  const padButtons: Array<{ label: string; arrow: string; next: Direction; opposite: Direction; bg: string; color: string }> = [
    { label: "Move left", arrow: "←", next: "LEFT", opposite: "RIGHT", bg: "linear-gradient(135deg, #60a5fa, #3b82f6)", color: "#fff" },
    { label: "Move up", arrow: "↑", next: "UP", opposite: "DOWN", bg: "linear-gradient(135deg, #4ade80, #22c55e)", color: "#111827" },
    { label: "Move down", arrow: "↓", next: "DOWN", opposite: "UP", bg: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#111827" },
    { label: "Move right", arrow: "→", next: "RIGHT", opposite: "LEFT", bg: "linear-gradient(135deg, #f472b6, #ec4899)", color: "#fff" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, rgba(168, 85, 247, 0.2), rgba(2, 6, 23, 0.95) 30%, rgba(2, 6, 23, 1) 100%)",
        padding: 24,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 16,
          width: GRID_SIZE * CELL_SIZE + 10 + 8 + 36 + 6,
          maxWidth: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
            gap: 8,
          }}
        >
          {stats.map((stat) => (
            <div key={stat.label} style={cardStyle}>
              <div style={cardLabel}>{stat.label}</div>
              <div style={cardValue}>{stat.value}</div>
            </div>
          ))}
        </div>

      <div
        style={{
          background: "rgba(15, 23, 42, 0.82)",
          border: "3px solid rgba(148, 163, 184, 0.35)",
          borderRadius: 28,
          boxShadow: "0 0 0 2px rgba(255,255,255,0.06), 0 18px 60px rgba(0,0,0,0.45)",
          padding: 18,
          backdropFilter: "blur(8px)",
          display: "inline-block",
        }}
      >
        <div
          style={{
            width: GRID_SIZE * CELL_SIZE + 10,
            height: GRID_SIZE * CELL_SIZE + 10,
            background: "#0f172a",
            border: "4px solid #dc2626",
            boxShadow: "0 0 14px rgba(220, 38, 38, 0.5)",
            borderRadius: 10,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {cells.map((cell, index) => (
            <div
              key={`${cell.x}-${cell.y}-${index}`}
              style={{
                position: "absolute",
                left: cell.x * CELL_SIZE,
                top: cell.y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                background: (cell.x + cell.y) % 2 === 0 ? "rgba(15, 23, 42, 0.9)" : "rgba(15, 23, 42, 0.75)",
                border: "1px solid rgba(148, 163, 184, 0.05)",
                boxSizing: "border-box",
              }}
            >
              {cell.isObstacle && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, #9ca3af 0%, #4b5563 50%, #1f2937 100%)",
                    border: "2px solid #000",
                    boxSizing: "border-box",
                    boxShadow: "inset 0 0 6px rgba(220, 38, 38, 0.7)",
                  }}
                />
              )}

              {cell.isFood && (
                <div
                  style={{
                    position: "absolute",
                    inset: 5,
                    borderRadius: "50%",
                    background: "#f97316",
                    boxShadow: "0 0 10px rgba(249, 115, 22, 0.8)",
                  }}
                />
              )}

              {cell.isBody && (
                <div
                  style={{
                    position: "absolute",
                    inset: 2,
                    borderRadius: 6,
                    background: snakeColor.body,
                    boxShadow: `0 0 10px ${snakeColor.glow}`,
                  }}
                />
              )}

              {cell.isHead && (
                <div
                  style={{
                    position: "absolute",
                    inset: 2,
                    borderRadius: 6,
                    background: snakeColor.head,
                    boxShadow: `0 0 12px ${snakeColor.glow}`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#111827",
                      left: 6,
                      top: 6,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#111827",
                      right: 6,
                      top: 6,
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          {!started && !gameOver && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.72)",
                color: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              PRESS ANY ARROW KEY
            </div>
          )}

          {gameOver && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.8)",
                color: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                fontWeight: 700,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>Game Over</div>
              <div style={{ fontSize: 16 }}>Score: {score}</div>
              <button
                onClick={resetGame}
                style={{
                  marginTop: 14,
                  background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  borderRadius: 10,
                  padding: "10px 16px",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

        {showPad && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {padButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => steer(btn.next, btn.opposite)}
                aria-label={btn.label}
                style={{
                  width: 56,
                  height: 56,
                  border: "2px solid rgba(0,0,0,0.3)",
                  borderRadius: 12,
                  fontSize: 24,
                  background: btn.bg,
                  color: btn.color,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {btn.arrow}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          position: "fixed",
          top: 18,
          left: 18,
          right: 18,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          alignItems: "center",
          zIndex: 5,
          color: "#e2e8f0",
          fontWeight: 700,
          pointerEvents: "none",
        }}
      >
        <button
          onClick={() => {
            setRedeemMessage("Enter a code to earn points or unlock an exclusive skin.");
            setRedeemOpen(true);
          }}
          style={{
            pointerEvents: "auto",
            border: "none",
            borderRadius: 12,
            padding: "8px 12px",
            fontWeight: 700,
            background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Redeem
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            pointerEvents: "auto",
            border: "none",
            borderRadius: 12,
            padding: "8px 12px",
            fontWeight: 700,
            background: "rgba(148, 163, 184, 0.2)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Settings
        </button>
      </div>

      {redeemOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            padding: 20,
          }}
          onClick={() => setRedeemOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              maxHeight: "min(480px, calc(100vh - 40px))",
              overflowY: "auto",
              background: "rgba(15, 23, 42, 0.96)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
              color: "#f8fafc",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 24 }}>Redeem a code</h3>
              <button
                onClick={() => setRedeemOpen(false)}
                style={{
                  border: "none",
                  background: "rgba(148, 163, 184, 0.15)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                value={redeemInput}
                onChange={(event) => setRedeemInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleRedeemCode();
                }}
                placeholder="Type your code"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#f8fafc",
                  outline: "none",
                }}
              />
              <button
                onClick={handleRedeemCode}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 16px",
                  background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Redeem
              </button>
            </div>

            <div style={{ marginTop: 12, color: "#cbd5e1", minHeight: 44 }}>{redeemMessage}</div>

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(148, 163, 184, 0.25)" }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Codes used</div>
              {redeemLog.length === 0 ? (
                <div style={{ color: "#94a3b8" }}>No codes used yet.</div>
              ) : (
                redeemLog.map((entry, index) => (
                  <div
                    key={`${entry.code}-${redeemLog.length - index}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
                      color: "#cbd5e1",
                    }}
                  >
                    <strong style={{ color: "#f8fafc" }}>{entry.code}</strong>
                    <span style={{ textAlign: "right" }}>{entry.result}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            padding: 20,
          }}
          onClick={() => setSettingsOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              background: "rgba(15, 23, 42, 0.96)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
              color: "#f8fafc",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 28 }}>Settings</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  border: "none",
                  background: "rgba(148, 163, 184, 0.15)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div
              role="tablist"
              style={{
                display: "flex",
                gap: 4,
                marginBottom: 18,
                borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
              }}
            >
              {(
                [
                  { id: "controls", label: "Controls" },
                  { id: "redeem", label: "Redeem" },
                  { id: "skins", label: "Skins" },
                ] as const
              ).map((tab) => {
                const active = settingsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSettingsTab(tab.id)}
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      color: active ? "#f8fafc" : "#94a3b8",
                      fontWeight: 700,
                      fontSize: 15,
                      padding: "10px 8px",
                      cursor: "pointer",
                      borderBottom: active ? "3px solid #38bdf8" : "3px solid transparent",
                      marginBottom: -1,
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div style={{ minHeight: 300 }}>
              {settingsTab === "controls" && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span>Show on-screen arrows</span>
                <button
                  onClick={() => setShowPad((prev) => !prev)}
                  style={{
                    width: 52,
                    height: 28,
                    borderRadius: 999,
                    border: "none",
                    background: showPad ? "#22c55e" : "#475569",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: showPad ? 26 : 4,
                      top: 4,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>
            </div>
              )}

              {settingsTab === "redeem" && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={redeemInput}
                  onChange={(event) => setRedeemInput(event.target.value)}
                  placeholder="Enter code"
                  style={{
                    flex: 1,
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "#f8fafc",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleRedeemCode}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 16px",
                    background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Redeem
                </button>
              </div>

              <div style={{ marginTop: 12, color: "#cbd5e1", minHeight: 22 }}>{redeemMessage}</div>

              <div style={{ marginTop: 14, color: "#cbd5e1", lineHeight: 1.8 }}>
                <div>Codes:</div>
                {Object.entries(REDEEM_CODES).map(([code, reward]) => (
                  <div key={code}>
                    <strong>{code}</strong> = {describeReward(reward)}
                  </div>
                ))}
              </div>
            </div>
              )}

              {settingsTab === "skins" && (
            <div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {Object.entries(SKINS).map(([id, skin]) => {
                  const unlocked = unlockedSkins.includes(id);
                  const selected = selectedSkin === id;
                  return (
                    <button
                      key={id}
                      onClick={() => applySkin(id)}
                      disabled={!unlocked}
                      style={{
                        width: 128,
                        padding: 12,
                        borderRadius: 12,
                        border: selected ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(30, 41, 59, 0.7)",
                        color: "#f8fafc",
                        opacity: unlocked ? 1 : 0.55,
                        cursor: unlocked ? "pointer" : "not-allowed",
                      }}
                    >
                      <div
                        style={{
                          height: 10,
                          borderRadius: 999,
                          marginBottom: 8,
                          background: `linear-gradient(90deg, ${skin.head}, ${skin.body})`,
                          boxShadow: unlocked ? `0 0 10px ${skin.glow}` : "none",
                          filter: unlocked ? "none" : "grayscale(1)",
                        }}
                      />
                      <div style={{ fontWeight: 700 }}>{skin.label}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#cbd5e1" }}>
                        {unlocked ? (selected ? "Equipped" : "Unlocked") : "Locked"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
