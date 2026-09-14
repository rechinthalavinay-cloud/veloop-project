import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

const DICT = [
  ["CAT", "DOG", "BIRD", "FISH", "BEAR"],
  ["RED", "BLUE", "GREEN", "PINK", "CYAN"],
  ["MARS", "VENUS", "EARTH", "MOON", "STAR"],
  ["APPLE", "PEACH", "GRAPE", "MELON", "KIWI"],
  ["GOLD", "SILVER", "COPPER", "IRON", "ZINC"],
  ["PIZZA", "BURGER", "PASTA", "TACO", "SOUP"],
];

const COLORS = [
  "rgba(255, 99, 132, 0.6)",
  "rgba(54, 162, 235, 0.6)",
  "rgba(255, 206, 86, 0.6)",
  "rgba(75, 192, 192, 0.6)",
  "rgba(153, 102, 255, 0.6)",
  "rgba(255, 159, 64, 0.6)"
];

function generateGrid(words, level) {
  // Make the grid smaller for early levels (easier)
  const size = level === 0 ? 7 : (level === 1 ? 8 : 10);
  const grid = Array(size).fill(null).map(() => Array(size).fill(''));
  
  // Restrict words to only Left-to-Right and Top-to-Bottom for level 1
  let dirs = [[1, 0], [0, 1]];
  if (level > 0) {
    dirs = [[1, 0], [0, 1], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]];
  }

  const validWords = [];
  for (const w of words) {
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);

      let canPlace = true;
      for (let i = 0; i < w.length; i++) {
        const nr = r + dir[1] * i;
        const nc = c + dir[0] * i;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) { canPlace = false; break; }
        if (grid[nr][nc] !== '' && grid[nr][nc] !== w[i]) { canPlace = false; break; }
      }

      if (canPlace) {
        for (let i = 0; i < w.length; i++) {
          grid[r + dir[1] * i][c + dir[0] * i] = w[i];
        }
        placed = true;
        validWords.push(w);
      }
    }
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
    }
  }
  return { grid, size, validWords };
}

export function WordHunt({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const phaseRef = useRef("playing");
  const levelRef = useRef(0);
  const [hud, setHud] = useState({ score: 0, time: 60, level: 1 });
  const [phase, setPhase] = useState("playing");

  function init(keepScore = 0) {
    // Shuffle and pick 5 random words from the current level's dictionary
    const pool = [...DICT[levelRef.current % DICT.length]].sort(() => Math.random() - 0.5).slice(0, 5);
    const { grid, size, validWords } = generateGrid(pool, levelRef.current);
    return {
      score: keepScore, time: 90, level: levelRef.current + 1,
      grid, size, words: validWords, found: [],
      dragStart: null, dragCurrent: null, dragWord: ""
    };
  }

  useEffect(() => {
    if (!reviveSignal) return;
    if (stateRef.current) stateRef.current.time = Math.max(stateRef.current.time, 20);
    phaseRef.current = "playing";
    setPhase("playing");
  }, [reviveSignal]);

  // Timer loop
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (!s || phaseRef.current !== "playing") return;
      s.time--;
      if (s.time <= 0) {
        s.time = 0;
        phaseRef.current = "over"; setPhase("over");
        setTimeout(() => onOutcome?.({ type: "over", score: s.score }), 0);
      }
      setHud({ score: s.score, time: s.time, level: s.level });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, onOutcome]);

  // Render & Input loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 360, H = 360;
    canvas.width = W;
    canvas.height = H;

    if (!stateRef.current) stateRef.current = init();
    const s = stateRef.current;
    setHud({ score: s.score, time: s.time, level: s.level });

    const getCell = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      const cellSize = W / s.size;
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      if (r >= 0 && r < s.size && c >= 0 && c < s.size) return { r, c };
      return null;
    };

    const getLine = (start, end) => {
      const dr = end.r - start.r;
      const dc = end.c - start.c;
      // Must be straight line or exact diagonal
      if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
      
      const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
      const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
      const len = Math.max(Math.abs(dr), Math.abs(dc));
      
      const cells = [];
      for (let i = 0; i <= len; i++) {
        cells.push({ r: start.r + stepR * i, c: start.c + stepC * i });
      }
      return cells;
    };

    const onDown = (e) => {
      if (phaseRef.current !== "playing") return;
      e.preventDefault();
      const pt = e.touches ? e.touches[0] : e;
      const cell = getCell(pt.clientX, pt.clientY);
      if (cell) {
        s.dragStart = cell;
        s.dragCurrent = cell;
      }
    };

    const onMove = (e) => {
      if (phaseRef.current !== "playing" || !s.dragStart) return;
      e.preventDefault();
      const pt = e.touches ? e.touches[0] : e;
      const cell = getCell(pt.clientX, pt.clientY);
      if (cell) s.dragCurrent = cell;
    };

    const onUp = (e) => {
      if (phaseRef.current !== "playing" || !s.dragStart) return;
      e.preventDefault();
      if (s.dragStart && s.dragCurrent) {
        const line = getLine(s.dragStart, s.dragCurrent);
        if (line) {
          const word = line.map(c => s.grid[c.r][c.c]).join("");
          const revWord = word.split("").reverse().join("");
          
          if ((s.words.includes(word) || s.words.includes(revWord))) {
            const actualWord = s.words.includes(word) ? word : revWord;
            if (!s.found.find(f => f.word === actualWord)) {
              // Found a new word!
              s.found.push({
                word: actualWord,
                cells: line,
                color: COLORS[s.found.length % COLORS.length]
              });
              s.score += 50 + s.level * 10;
              setHud({ score: s.score, time: s.time, level: s.level });

              // Check Win
              if (s.found.length === s.words.length) {
                levelRef.current++;
                if (levelRef.current >= DICT.length * 2) { // Completed all levels twice
                  phaseRef.current = "complete"; setPhase("complete");
                  setTimeout(() => onOutcome?.({ type: "complete", score: s.score + 100 }), 0);
                } else {
                  // Next Level
                  stateRef.current = init(s.score + 50);
                  setHud({ score: stateRef.current.score, time: stateRef.current.time, level: stateRef.current.level });
                }
              }
            }
          }
        }
      }
      s.dragStart = null;
      s.dragCurrent = null;
      s.dragWord = "";
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    let frame;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      const cellSize = W / s.size;
      const radius = cellSize * 0.4;

      // Draw found pills
      ctx.lineCap = "round";
      ctx.lineWidth = radius * 2;
      s.found.forEach(f => {
        const start = f.cells[0];
        const end = f.cells[f.cells.length - 1];
        ctx.strokeStyle = f.color;
        ctx.beginPath();
        ctx.moveTo(start.c * cellSize + cellSize / 2, start.r * cellSize + cellSize / 2);
        ctx.lineTo(end.c * cellSize + cellSize / 2, end.r * cellSize + cellSize / 2);
        ctx.stroke();
      });

      // Draw current drag pill
      if (s.dragStart && s.dragCurrent) {
        const line = getLine(s.dragStart, s.dragCurrent);
        if (line) {
          const end = line[line.length - 1];
          ctx.strokeStyle = "rgba(100, 100, 100, 0.3)"; // grey transparent for active drag
          ctx.beginPath();
          ctx.moveTo(s.dragStart.c * cellSize + cellSize / 2, s.dragStart.r * cellSize + cellSize / 2);
          ctx.lineTo(end.c * cellSize + cellSize / 2, end.r * cellSize + cellSize / 2);
          ctx.stroke();
        }
      }

      // Draw letters
      ctx.fillStyle = "#000000";
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let r = 0; r < s.size; r++) {
        for (let c = 0; c < s.size; c++) {
          ctx.fillText(s.grid[r][c], c * cellSize + cellSize / 2, r * cellSize + cellSize / 2 + 2);
        }
      }
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [phase, onOutcome]);

  const restart = () => {
    levelRef.current = 0;
    stateRef.current = init();
    phaseRef.current = "playing";
    setPhase("playing");
  };

  const togglePause = () => {
    const next = phaseRef.current === "paused" ? "playing" : "paused";
    phaseRef.current = next; setPhase(next);
  };

  const s = stateRef.current;

  return (
    <GameShell title="Word Search" score={hud.score} time={hud.time} level={hud.level}
      phase={phase} onPause={togglePause} onResume={togglePause} onRestart={restart}>
      <div style={{ padding: 12, backgroundColor: "#f8f9fa", borderRadius: 16 }}>
        
        {/* Word List */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 12 }}>
          {s?.words.map(w => {
            const isFound = s.found.find(f => f.word === w);
            return (
              <span key={w} style={{
                background: isFound ? isFound.color : "#e9ecef",
                borderRadius: 999, padding: "4px 12px", fontSize: "0.85rem", fontWeight: 800,
                color: isFound ? "#ffffff" : "#495057",
                textDecoration: isFound ? "line-through" : "none",
                letterSpacing: "0.05em",
                transition: "all 0.2s"
              }}>{w}</span>
            );
          })}
        </div>
        
        {/* Canvas Game Area */}
        <div style={{
          margin: "0 auto",
          width: "100%",
          maxWidth: "360px",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <canvas ref={canvasRef}
            style={{ 
              width: "100%", 
              aspectRatio: "1",
              display: "block", 
              touchAction: "none",
              cursor: "crosshair"
            }} />
        </div>
        
        <p style={{ color: "#6c757d", fontSize: "0.8rem", textAlign: "center", padding: "12px 0 0", margin: 0, fontWeight: 600 }}>
          Drag your finger to highlight words!
        </p>
      </div>
    </GameShell>
  );
}
