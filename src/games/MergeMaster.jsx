import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

function empty() { return Array(16).fill(0); }
function spawnTile(cells) {
  const holes = cells.map((v, i) => v === 0 ? i : null).filter(v => v !== null);
  if (!holes.length) return cells;
  const next = [...cells];
  next[holes[Math.floor(Math.random() * holes.length)]] = Math.random() < 0.8 ? 2 : 4;
  return next;
}
function rotate90(grid) {
  return [0,1,2,3].map(r => [0,1,2,3].map(c => grid[3-c][r]));
}
function slideLeft(grid) {
  let gained = 0;
  const next = grid.map(row => {
    const f = row.filter(Boolean);
    const merged = [];
    for (let i = 0; i < f.length; i++) {
      if (f[i] === f[i+1]) { merged.push(f[i]*2); gained += f[i]*2; i++; }
      else merged.push(f[i]);
    }
    return [...merged, 0, 0, 0, 0].slice(0, 4);
  });
  return { next, gained };
}

const TILE_COLORS = {
  0:"rgba(255,255,255,0.03)", 2:"#1e3a5f", 4:"#1a4a2e", 8:"#4a2a0a",
  16:"#5a1a0a", 32:"#6a0a2a", 64:"#4a0a5a", 128:"#b8860b", 256:"#d4af37", 512:"#ffd700",
};

export function MergeMaster({ onOutcome, reviveSignal }) {
  const [board, setBoard] = useState(() => spawnTile(spawnTile(empty())));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState("playing");
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const phaseRef = useRef("playing");
  const touchStart = useRef(null);

  useEffect(() => {
    if (!reviveSignal) return;
    setBoard(b => spawnTile(b));
    phaseRef.current = "playing"; setPhase("playing");
  }, [reviveSignal]);

  const slide = (dir) => {
    if (phaseRef.current !== "playing") return;
    setBoard(prev => {
      const rows = [0,1,2,3].map(r => [0,1,2,3].map(c => prev[r*4+c]));
      const rotMap = { left:0, up:3, right:2, down:1 };
      let grid = rows;
      for (let i = 0; i < rotMap[dir]; i++) grid = rotate90(grid);
      const { next, gained } = slideLeft(grid);
      let g = next;
      const back = (4 - rotMap[dir]) % 4;
      for (let i = 0; i < back; i++) g = rotate90(g);
      const flat = g.flat();
      if (flat.join() === prev.join()) return prev;
      const nextBoard = spawnTile(flat);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      const target = 128 * levelRef.current;
      if (nextBoard.some(v => v >= target)) {
        levelRef.current++;
        setLevel(levelRef.current);
        if (levelRef.current > 4) {
          phaseRef.current = "complete"; setPhase("complete");
          setTimeout(() => onOutcome?.({ type: "complete", score: scoreRef.current }), 0);
        }
      } else if (nextBoard.every(Boolean) && gained === 0) {
        phaseRef.current = "over"; setPhase("over");
        setTimeout(() => onOutcome?.({ type: "over", score: scoreRef.current }), 0);
      }
      return nextBoard;
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowLeft:"left", ArrowRight:"right", ArrowUp:"up", ArrowDown:"down" };
      if (map[e.key]) { e.preventDefault(); slide(map[e.key]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) slide(dx > 0 ? "right" : "left");
    else slide(dy > 0 ? "down" : "up");
    touchStart.current = null;
  };

  const restart = () => {
    scoreRef.current = 0; levelRef.current = 1;
    setBoard(spawnTile(spawnTile(empty())));
    setScore(0); setLevel(1);
    phaseRef.current = "playing"; setPhase("playing");
  };
  const togglePause = () => {
    const next = phaseRef.current === "paused" ? "playing" : "paused";
    phaseRef.current = next; setPhase(next);
  };

  return (
    <GameShell title="Merge Master" score={score} level={level}
      phase={phase} onPause={togglePause} onResume={togglePause} onRestart={restart}>
      <div style={{ padding: 12 }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
          {board.map((v, i) => (
            <div key={i} style={{
              aspectRatio: "1", borderRadius: 10, display: "grid", placeItems: "center",
              background: TILE_COLORS[v] || "#d4af37",
              color: v >= 128 ? "#0d0d1a" : "#f0d060",
              fontWeight: 900, fontSize: v >= 64 ? "1rem" : "0.9rem",
              boxShadow: v ? `0 3px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)` : "none",
              transition: "background 0.15s",
            }}>{v || ""}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <button onClick={() => slide("left")} style={btnStyle}>←</button>
          <button onClick={() => slide("up")} style={btnStyle}>↑</button>
          <button onClick={() => slide("right")} style={btnStyle}>→</button>
        </div>
        <button onClick={() => slide("down")} style={{ ...btnStyle, width: "100%", marginTop: 6 }}>↓</button>
        <p style={{ color: "rgba(200,180,140,0.6)", fontSize: "0.75rem", textAlign: "center", marginTop: 8 }}>
          Arrow keys / swipe / buttons · Reach {128 * level}!
        </p>
      </div>
    </GameShell>
  );
}

const btnStyle = {
  border: 0, borderRadius: 12, padding: "12px 8px", fontWeight: 900, fontSize: "1rem",
  background: "linear-gradient(135deg,#d4af37,#b8860b)", color: "#0d0d1a", cursor: "pointer",
  boxShadow: "0 4px 14px rgba(212,175,55,0.35)",
};
