import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Playfield } from "./Playfield";
import styles from "./shared.module.css";

const COLORS = ["#ef5350", "#42a5f5", "#66bb6a", "#ffa726", "#ab47bc", "#26c6da"];
const DARK_BG = { background: "linear-gradient(145deg, #12122a, #1e1040)" };

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

export function NutCraft({ onOutcome, reviveSignal }) {
  const [order, setOrder] = useState(() => shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]));
  const [next, setNext] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [time, setTime] = useState(40);
  const live = useRef(true);

  useEffect(() => {
    if (!reviveSignal) return;
    live.current = true;
    setLives((value) => Math.max(value, 1));
  }, [reviveSignal]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime((value) => {
        if (!live.current) return value;
        if (value <= 1) {
          live.current = false;
          setTimeout(() => onOutcome?.({ type: "over", score }), 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onOutcome, score]);

  const tap = (value) => {
    if (!live.current) return;
    if (value !== next) {
      const remain = lives - 1;
      setLives(remain);
      if (remain <= 0) {
        live.current = false;
        setTimeout(() => onOutcome?.({ type: "over", score }), 0);
      }
      return;
    }
    const gained = score + 20 + next * 4;
    setScore(gained);
    if (next === 9) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: "complete", score: gained + 40 }), 0);
      return;
    }
    setNext(next + 1);
  };

  return (
    <Playfield hud={[`⚡ ${score}`, `Next: ${next}`, `♥ ${lives}`, `⏱ ${time}s`]} hint="Tap nuts in order from 1 to 9.">
      <div className={styles.grid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {order.map((value) => (
          <button
            key={value}
            className={styles.cell}
            disabled={value < next}
            style={{
              background: value < next
                ? "rgba(255,255,255,0.04)"
                : value === next
                  ? "linear-gradient(135deg, #d4af37, #b8860b)"
                  : "linear-gradient(135deg, #2a2a4a, #1e1e3a)",
              color: value < next ? "#333" : value === next ? "#0d0d1a" : "#f0d060",
              fontSize: "1.1rem",
              boxShadow: value === next ? "0 0 16px rgba(212,175,55,0.5)" : undefined,
            }}
            onClick={() => tap(value)}
          >
            🔩 {value}
          </button>
        ))}
      </div>
    </Playfield>
  );
}

export function BowlExa({ onOutcome, reviveSignal }) {
  const [pins, setPins] = useState(Array(10).fill(true));
  const [score, setScore] = useState(0);
  const [throwsLeft, setThrowsLeft] = useState(6);
  const [power, setPower] = useState(8);
  const live = useRef(true);
  const dir = useRef(1);

  useEffect(() => {
    if (!reviveSignal) return;
    live.current = true;
    setThrowsLeft((value) => Math.max(value, 2));
  }, [reviveSignal]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPower((value) => {
        const next = value + dir.current * 4;
        if (next >= 100 || next <= 4) dir.current *= -1;
        return Math.min(100, Math.max(4, next));
      });
    }, 30);
    return () => window.clearInterval(timer);
  }, []);

  const bowl = () => {
    if (!live.current || throwsLeft <= 0) return;
    const accuracy = 1 - Math.abs(power - 72) / 100;
    const knock = Math.max(1, Math.round(accuracy * 7));
    const standing = pins.map((up, index) => (up && index < knock ? false : up));
    const gained = standing.filter((up, index) => pins[index] && !up).length * 12;
    const nextScore = score + gained;
    const remain = throwsLeft - 1;
    setPins(standing.every((up) => !up) ? Array(10).fill(true) : standing);
    setScore(nextScore);
    setThrowsLeft(remain);
    if (remain <= 0) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: nextScore >= 60 ? "complete" : "over", score: nextScore }), 0);
    }
  };

  return (
    <Playfield hud={[`⚡ ${score}`, `🎳 ${throwsLeft} throws`]} hint="Tap Bowl when the marker hits the sweet spot (green zone).">
      <div className={styles.pins}>
        {pins.map((up, index) => (
          <span key={index} className={`${styles.pin} ${up ? "" : styles.down}`} />
        ))}
      </div>
      <div className={styles.power}>
        <div className={styles.lane} style={{ marginLeft: `${power}%` }} />
      </div>
      <button className={styles.btn} style={{ width: "100%" }} onClick={bowl}>
        🎳 Bowl!
      </button>
    </Playfield>
  );
}

export function BlockCrush({ onOutcome, reviveSignal }) {
  const makeBoard = () =>
    Array.from({ length: 36 }, () => COLORS[Math.floor(Math.random() * 4)]);
  const [board, setBoard] = useState(makeBoard);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(40);
  const [lives, setLives] = useState(3);
  const live = useRef(true);

  useEffect(() => {
    if (!reviveSignal) return;
    live.current = true;
    setLives((value) => Math.max(value, 1));
    setTime((value) => Math.max(value, 12));
  }, [reviveSignal]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime((value) => {
        if (!live.current) return value;
        if (value <= 1) {
          live.current = false;
          setTimeout(() => onOutcome?.({ type: "over", score }), 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onOutcome, score]);

  const crush = (index) => {
    if (!live.current) return;
    const color = board[index];
    const seen = new Set();
    const stack = [index];
    while (stack.length) {
      const current = stack.pop();
      if (seen.has(current) || board[current] !== color) continue;
      seen.add(current);
      const x = current % 6;
      const y = Math.floor(current / 6);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 6 && ny >= 0 && ny < 6) stack.push(ny * 6 + nx);
      });
    }
    if (seen.size < 2) {
      const remain = lives - 1;
      setLives(remain);
      if (remain <= 0) {
        live.current = false;
        setTimeout(() => onOutcome?.({ type: "over", score }), 0);
      }
      return;
    }
    const next = [...board];
    seen.forEach((i) => {
      next[i] = "";
    });
    for (let col = 0; col < 6; col += 1) {
      const column = [];
      for (let row = 5; row >= 0; row -= 1) {
        const value = next[row * 6 + col];
        if (value) column.push(value);
      }
      for (let row = 5; row >= 0; row -= 1) {
        next[row * 6 + col] = column[5 - row] || COLORS[Math.floor(Math.random() * 4)];
      }
    }
    const gained = score + seen.size * 8;
    setBoard(next);
    setScore(gained);
    if (gained >= 280) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: "complete", score: gained }), 0);
    }
  };

  return (
    <Playfield hud={[`⚡ ${score}`, `♥ ${lives}`, `⏱ ${time}s`]} hint="Tap groups of 2+ matching blocks to crush them.">
      <div className={styles.grid} style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
        {board.map((color, index) => (
          <button
            key={`${color}-${index}`}
            className={styles.cell}
            style={{ background: color, boxShadow: `0 3px 8px ${color}66, inset 0 1px 0 rgba(255,255,255,0.25)` }}
            onClick={() => crush(index)}
          />
        ))}
      </div>
    </Playfield>
  );
}

export function CosmoWarrior({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const [hud, setHud] = useState({ score: 0, lives: 3 });
  const state = useRef({ score: 0, lives: 3, x: 180, shots: [], rocks: [], playing: true });

  useEffect(() => {
    if (!reviveSignal) return;
    state.current.playing = true;
    state.current.lives = Math.max(state.current.lives, 1);
    setHud({ score: state.current.score, lives: state.current.lives });
  }, [reviveSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frame;
    let tick = 0;
    const pointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      const point = event.touches ? event.touches[0] : event;
      state.current.x = ((point.clientX - rect.left) / rect.width) * 360;
      state.current.shots.push({ x: state.current.x, y: 470 });
    };
    canvas.addEventListener("pointerdown", pointer);
    canvas.addEventListener("pointermove", pointer);

    const loop = () => {
      // Deep space background
      const bg = ctx.createLinearGradient(0, 0, 0, 520);
      bg.addColorStop(0, "#050510");
      bg.addColorStop(1, "#0d0520");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 360, 520);

      // Stars
      if (tick === 1) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for (let s = 0; s < 60; s++) {
          ctx.fillRect(Math.random() * 360, Math.random() * 520, 1, 1);
        }
      }

      tick += 1;
      if (state.current.playing && tick % 38 === 0) {
        state.current.rocks.push({ x: 20 + Math.random() * 320, y: -20, s: 16 + Math.random() * 18 });
      }
      state.current.shots = state.current.shots
        .map((shot) => ({ ...shot, y: shot.y - 12 }))
        .filter((shot) => shot.y > 0);

      // Draw shots with glow
      state.current.shots.forEach((shot) => {
        ctx.shadowColor = "#42a5f5";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#90caf9";
        ctx.fillRect(shot.x - 2, shot.y, 4, 14);
        ctx.shadowBlur = 0;
      });

      // Draw ship with glow
      ctx.shadowColor = "#5c6bc0";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#7986cb";
      ctx.beginPath();
      ctx.moveTo(state.current.x, 488);
      ctx.lineTo(state.current.x - 18, 506);
      ctx.lineTo(state.current.x + 18, 506);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      const nextRocks = [];
      state.current.rocks.forEach((rock) => {
        rock.y += 3.2;
        let hit = false;
        state.current.shots.forEach((shot) => {
          if (Math.hypot(shot.x - rock.x, shot.y - rock.y) < rock.s) hit = true;
        });
        if (hit) {
          state.current.score += 12;
          setHud({ score: state.current.score, lives: state.current.lives });
          if (state.current.score >= 240) {
            state.current.playing = false;
            setTimeout(() => onOutcome?.({ type: "complete", score: state.current.score }), 0);
          }
          return;
        }
        if (rock.y > 500 && Math.abs(rock.x - state.current.x) < 28) {
          state.current.lives -= 1;
          setHud({ score: state.current.score, lives: state.current.lives });
          if (state.current.lives <= 0) {
            state.current.playing = false;
            setTimeout(() => onOutcome?.({ type: "over", score: state.current.score }), 0);
          }
          return;
        }
        if (rock.y < 540) nextRocks.push(rock);
        // Asteroid with glow
        ctx.shadowColor = "#90a4ae";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#607d8b";
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      state.current.rocks = nextRocks;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      canvas.replaceWith(canvas.cloneNode(true));
    };
  }, [onOutcome]);

  return (
    <Playfield hud={[`⚡ ${hud.score}`, `♥ ${hud.lives}`]} hint="Move to aim · Tap to fire · Destroy 20 asteroids">
      <canvas ref={canvasRef} className={styles.canvas} width={360} height={520} />
    </Playfield>
  );
}

export function ToiletTactics({ onOutcome, reviveSignal }) {
  const [foes, setFoes] = useState([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const live = useRef(true);
  const id = useRef(0);

  useEffect(() => {
    if (!reviveSignal) return;
    live.current = true;
    setLives((value) => Math.max(value, 1));
  }, [reviveSignal]);

  useEffect(() => {
    const spawn = window.setInterval(() => {
      if (!live.current) return;
      setFoes((current) => [
        ...current,
        { id: id.current++, x: Math.random() * 80 + 8, y: 0 },
      ]);
    }, 700);
    const move = window.setInterval(() => {
      setFoes((current) => {
        const next = current.map((foe) => ({ ...foe, y: foe.y + 6 }));
        const leaked = next.filter((foe) => foe.y >= 86);
        if (leaked.length && live.current) {
          const remain = lives - leaked.length;
          setLives(Math.max(remain, 0));
          if (remain <= 0) {
            live.current = false;
            setTimeout(() => onOutcome?.({ type: "over", score }), 0);
          }
        }
        return next.filter((foe) => foe.y < 86);
      });
    }, 180);
    return () => {
      window.clearInterval(spawn);
      window.clearInterval(move);
    };
  }, [lives, onOutcome, score]);

  const flush = (target) => {
    if (!live.current) return;
    const gained = score + 15;
    setScore(gained);
    setFoes((current) => current.filter((foe) => foe.id !== target));
    if (gained >= 180) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: "complete", score: gained }), 0);
    }
  };

  return (
    <Playfield hud={[`⚡ ${score}`, `♥ ${lives}`]} hint="Tap invaders before they reach the bowl!">
      <div style={{ position: "relative", height: 360, background: "linear-gradient(180deg, #0d0d1a 0%, #1a0d2e 100%)", borderRadius: 18, overflow: "hidden" }}>
        <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", fontSize: 52, filter: "drop-shadow(0 0 12px rgba(212,175,55,0.4))" }}>🚽</div>
        {foes.map((foe) => (
          <button
            key={foe.id}
            onClick={() => flush(foe.id)}
            style={{
              position: "absolute",
              left: `${foe.x}%`,
              top: `${foe.y}%`,
              border: 0,
              background: "transparent",
              fontSize: 32,
              cursor: "pointer",
              filter: "drop-shadow(0 0 6px rgba(255,100,100,0.5))",
              transition: "top 0.18s linear",
            }}
          >
            👾
          </button>
        ))}
      </div>
    </Playfield>
  );
}

const WORDS = ["GOLD", "PLAY", "SPIN", "GEM"];

export function WordHunt({ onOutcome, reviveSignal }) {
  const letters = useMemo(
    () => ["G", "O", "L", "D", "P", "L", "A", "Y", "S", "P", "I", "N", "G", "E", "M", "S"],
    [],
  );
  const [picked, setPicked] = useState([]);
  const [found, setFound] = useState([]);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(45);
  const live = useRef(true);

  useEffect(() => {
    if (!reviveSignal) return;
    live.current = true;
    setTime((value) => Math.max(value, 15));
  }, [reviveSignal]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime((value) => {
        if (!live.current) return value;
        if (value <= 1) {
          live.current = false;
          setTimeout(() => onOutcome?.({ type: "over", score }), 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onOutcome, score]);

  const tap = (index) => {
    if (!live.current) return;
    const next = [...picked, letters[index]];
    const word = next.join("");
    const match = WORDS.find((item) => item.startsWith(word) && !found.includes(item));
    if (!match) {
      setPicked([]);
      return;
    }
    if (WORDS.includes(word) && !found.includes(word)) {
      const nextFound = [...found, word];
      const gained = score + 40;
      setFound(nextFound);
      setScore(gained);
      setPicked([]);
      if (nextFound.length === WORDS.length) {
        live.current = false;
        setTimeout(() => onOutcome?.({ type: "complete", score: gained + 30 }), 0);
      }
      return;
    }
    setPicked(next);
  };

  return (
    <Playfield hud={[`⚡ ${score}`, `⏱ ${time}s`]} hint="Tap letters in order to spell GOLD · PLAY · SPIN · GEM">
      <div className={styles.wordList}>
        {WORDS.map((word) => (
          <span key={word} className={found.includes(word) ? styles.found : undefined}>
            {found.includes(word) ? "✓ " : ""}{word}
          </span>
        ))}
      </div>
      <div className={styles.grid} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {letters.map((letter, index) => (
          <button
            key={`${letter}-${index}`}
            className={styles.cell}
            style={{ background: "linear-gradient(135deg, #2a2a4a, #1e1e3a)", color: "#f0d060", fontSize: "1.1rem" }}
            onClick={() => tap(index)}
          >
            {letter}
          </button>
        ))}
      </div>
      <p style={{ color: "#f0d060", fontWeight: 900, textAlign: "center", margin: "8px 0 0", letterSpacing: "0.1em" }}>
        {picked.join("") || "—"}
      </p>
    </Playfield>
  );
}

export function BubbleBlast({ onOutcome, reviveSignal }) {
  const make = () => Array.from({ length: 36 }, () => COLORS[Math.floor(Math.random() * 4)]);
  const [board, setBoard] = useState(make);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const live = useRef(true);

  useEffect(() => {
    if (!reviveSignal) return;
    live.current = true;
    setLives((value) => Math.max(value, 1));
  }, [reviveSignal]);

  const pop = (index) => {
    if (!live.current) return;
    const color = board[index];
    const seen = new Set();
    const stack = [index];
    while (stack.length) {
      const current = stack.pop();
      if (seen.has(current) || board[current] !== color) continue;
      seen.add(current);
      const x = current % 6;
      const y = Math.floor(current / 6);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 6 && ny >= 0 && ny < 6) stack.push(ny * 6 + nx);
      });
    }
    if (seen.size < 3) {
      const remain = lives - 1;
      setLives(remain);
      if (remain <= 0) {
        live.current = false;
        setTimeout(() => onOutcome?.({ type: "over", score }), 0);
      }
      return;
    }
    const next = board.map((item, i) => (seen.has(i) ? COLORS[Math.floor(Math.random() * 4)] : item));
    const gained = score + seen.size * 10;
    setBoard(next);
    setScore(gained);
    if (gained >= 220) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: "complete", score: gained }), 0);
    }
  };

  return (
    <Playfield hud={[`⚡ ${score}`, `♥ ${lives}`]} hint="Pop clusters of 3+ matching bubbles.">
      <div className={styles.grid} style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
        {board.map((color, index) => (
          <button
            key={`${color}-${index}`}
            className={styles.cell}
            style={{
              background: color,
              borderRadius: "50%",
              boxShadow: `0 3px 10px ${color}88, inset 0 2px 0 rgba(255,255,255,0.3)`,
            }}
            onClick={() => pop(index)}
          />
        ))}
      </div>
    </Playfield>
  );
}

export function MergeMaster({ onOutcome, reviveSignal }) {
  const empty = () => Array(16).fill(0);
  const spawn = (cells) => {
    const holes = cells.map((value, index) => (value === 0 ? index : null)).filter((v) => v !== null);
    if (!holes.length) return cells;
    const next = [...cells];
    next[holes[Math.floor(Math.random() * holes.length)]] = Math.random() < 0.8 ? 2 : 4;
    return next;
  };
  const [board, setBoard] = useState(() => spawn(spawn(empty())));
  const [score, setScore] = useState(0);
  const live = useRef(true);

  useEffect(() => {
    if (!reviveSignal) return;
    live.current = true;
    setBoard((current) => spawn(current));
  }, [reviveSignal]);

  const slide = (dir) => {
    if (!live.current) return;
    const rows = [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => board[r * 4 + c]));
    const rotate = (grid, times) => {
      let next = grid;
      for (let i = 0; i < times; i += 1) {
        next = [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => next[3 - c][r]));
      }
      return next;
    }
    const map = { left: 0, up: 3, right: 2, down: 1 };
    let grid = rotate(rows, map[dir]);
    let gained = 0;
    grid = grid.map((row) => {
      const filtered = row.filter(Boolean);
      const merged = [];
      for (let i = 0; i < filtered.length; i += 1) {
        if (filtered[i] === filtered[i + 1]) {
          merged.push(filtered[i] * 2);
          gained += filtered[i] * 2;
          i += 1;
        } else {
          merged.push(filtered[i]);
        }
      }
      return [...merged, 0, 0, 0, 0].slice(0, 4);
    });
    const backTimes = (4 - map[dir]) % 4;
    grid = rotate(grid, backTimes);
    const flat = grid.flat();
    if (flat.join() === board.join()) return;
    const nextBoard = spawn(flat);
    const nextScore = score + gained;
    setBoard(nextBoard);
    setScore(nextScore);
    if (nextBoard.some((value) => value >= 128) || nextScore >= 400) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: "complete", score: nextScore }), 0);
      return;
    }
    if (nextBoard.every(Boolean) && gained === 0) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: "over", score: nextScore }), 0);
    }
  };

  const tileColor = (v) => {
    const map = { 2: "#1e3a5f", 4: "#1a4a2e", 8: "#4a2a0a", 16: "#5a1a0a", 32: "#6a0a2a", 64: "#4a0a5a", 128: "#d4af37" };
    return map[v] || (v >= 128 ? "#d4af37" : "#1a1a2e");
  };

  return (
    <Playfield hud={[`⚡ ${score}`]} hint="Swipe or use buttons to merge tiles → reach 128!">
      <div className={styles.grid} style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {board.map((value, index) => (
          <div
            key={index}
            className={styles.cell}
            style={{
              background: value ? tileColor(value) : "rgba(255,255,255,0.04)",
              display: "grid",
              placeItems: "center",
              color: value >= 128 ? "#0d0d1a" : "#f0d060",
              fontWeight: 900,
              fontSize: value >= 64 ? "1.1rem" : "0.95rem",
              boxShadow: value ? `0 3px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)` : "none",
            }}
          >
            {value || ""}
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={() => slide("left")}>←</button>
        <button className={styles.btn} onClick={() => slide("up")}>↑</button>
        <button className={styles.btn} onClick={() => slide("down")}>↓</button>
      </div>
      <button className={styles.btn} style={{ width: "100%", marginTop: 8 }} onClick={() => slide("right")}>→</button>
    </Playfield>
  );
}

export function Wormzy({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const [hud, setHud] = useState({ score: 0, lives: 1 });
  const state = useRef({
    snake: [{ x: 8, y: 8 }],
    dir: { x: 1, y: 0 },
    gem: { x: 12, y: 6 },
    score: 0,
    playing: true,
  });

  useEffect(() => {
    if (!reviveSignal) return;
    state.current.playing = true;
    state.current.snake = [{ x: 8, y: 8 }];
    state.current.dir = { x: 1, y: 0 };
  }, [reviveSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const size = 18;
    const key = (event) => {
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (map[event.key]) state.current.dir = { x: map[event.key][0], y: map[event.key][1] };
    };
    window.addEventListener("keydown", key);
    const timer = window.setInterval(() => {
      if (!state.current.playing) return;
      const head = {
        x: state.current.snake[0].x + state.current.dir.x,
        y: state.current.snake[0].y + state.current.dir.y,
      };
      if (head.x < 0 || head.y < 0 || head.x > 19 || head.y > 19 || state.current.snake.some((p) => p.x === head.x && p.y === head.y)) {
        state.current.playing = false;
        setTimeout(() => onOutcome?.({ type: "over", score: state.current.score }), 0);
        return;
      }
      state.current.snake.unshift(head);
      if (head.x === state.current.gem.x && head.y === state.current.gem.y) {
        state.current.score += 20;
        state.current.gem = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
        setHud({ score: state.current.score, lives: 1 });
        if (state.current.score >= 160) {
          state.current.playing = false;
          setTimeout(() => onOutcome?.({ type: "complete", score: state.current.score }), 0);
        }
      } else {
        state.current.snake.pop();
      }
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, 360, 360);
      // Grid
      ctx.strokeStyle = "rgba(212,175,55,0.05)";
      ctx.lineWidth = 1;
      for (let g = 0; g <= 20; g++) {
        ctx.beginPath(); ctx.moveTo(g * size, 0); ctx.lineTo(g * size, 360); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, g * size); ctx.lineTo(360, g * size); ctx.stroke();
      }
      // Snake with glow
      state.current.snake.forEach((p, i) => {
        const alpha = i === 0 ? 1 : 0.7 + (0.3 * (state.current.snake.length - i) / state.current.snake.length);
        ctx.fillStyle = i === 0 ? "#a5d6a7" : "#66bb6a";
        ctx.shadowColor = "#66bb6a";
        ctx.shadowBlur = i === 0 ? 12 : 4;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x * size + 1, p.y * size + 1, size - 3, size - 3);
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      // Gem with glow
      ctx.shadowColor = "#ab47bc";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#ce93d8";
      ctx.beginPath();
      ctx.arc(state.current.gem.x * size + 9, state.current.gem.y * size + 9, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }, 140);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", key);
    };
  }, [onOutcome]);

  return (
    <Playfield hud={[`⚡ ${hud.score}`]} hint="Arrow keys or buttons · Collect 💜 gems · Avoid walls">
      <canvas ref={canvasRef} className={styles.canvas} width={360} height={360} />
      <div className={styles.actions}>
        <button className={styles.btn} onClick={() => (state.current.dir = { x: -1, y: 0 })}>←</button>
        <button className={styles.btn} onClick={() => (state.current.dir = { x: 0, y: -1 })}>↑</button>
        <button className={styles.btn} onClick={() => (state.current.dir = { x: 1, y: 0 })}>→</button>
      </div>
      <button className={styles.btn} style={{ width: "100%", marginTop: 8 }} onClick={() => (state.current.dir = { x: 0, y: 1 })}>↓</button>
    </Playfield>
  );
}

function solved(tubes) {
  return tubes.every((tube) => tube.length === 0 || (tube.length === 4 && tube.every((c) => c === tube[0])));
}

export function AquaFill({ onOutcome, reviveSignal }) {
  const startTubes = () => [
    ["#42a5f5", "#ef5350", "#42a5f5", "#66bb6a"],
    ["#ef5350", "#66bb6a", "#ef5350", "#42a5f5"],
    ["#66bb6a", "#42a5f5", "#66bb6a", "#ef5350"],
    [],
  ];
  const [tubes, setTubes] = useState(startTubes);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(18);
  const live = useRef(true);

  useEffect(() => {
    if (!reviveSignal) return;
    live.current = true;
    setMoves((value) => Math.max(value, 6));
  }, [reviveSignal]);

  const pick = (index) => {
    if (!live.current) return;
    if (selected === null) {
      if (tubes[index].length) setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    const from = [...tubes[selected]];
    const to = [...tubes[index]];
    const color = from[from.length - 1];
    if (!color || to.length >= 4 || (to.length && to[to.length - 1] !== color)) {
      setSelected(index);
      return;
    }
    while (from.length && from[from.length - 1] === color && to.length < 4) {
      to.push(from.pop());
    }
    const next = tubes.map((tube, i) => (i === selected ? from : i === index ? to : tube));
    const remain = moves - 1;
    const gained = score + 12;
    setTubes(next);
    setSelected(null);
    setMoves(remain);
    setScore(gained);
    if (solved(next)) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: "complete", score: gained + 80 }), 0);
      return;
    }
    if (remain <= 0) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: "over", score: gained }), 0);
    }
  };

  return (
    <Playfield hud={[`⚡ ${score}`, `🔄 ${moves} moves`]} hint="Tap a tube to pick · Tap another to pour same color">
      <div className={styles.tubes}>
        {tubes.map((tube, index) => (
          <button
            key={index}
            className={`${styles.tube} ${selected === index ? styles.selected : ""}`}
            onClick={() => pick(index)}
          >
            {tube.map((color, layer) => (
              <span key={layer} className={styles.layer} style={{ background: color, boxShadow: `inset 0 2px 4px rgba(255,255,255,0.2), 0 0 8px ${color}66` }} />
            ))}
          </button>
        ))}
      </div>
    </Playfield>
  );
}

export function RealmClash({ onOutcome, reviveSignal }) {
  const [you, setYou] = useState(100);
  const [foe, setFoe] = useState(100);
  const [score, setScore] = useState(0);
  const [cool, setCool] = useState(0);
  const live = useRef(true);

  useEffect(() => {
    if (!reviveSignal) return;
    live.current = true;
    setYou((value) => Math.max(value, 40));
  }, [reviveSignal]);

  const act = (kind) => {
    if (!live.current) return;
    const attack = kind === "attack" ? 18 + Math.floor(Math.random() * 10) : kind === "special" && cool === 0 ? 32 : 8;
    const guard = kind === "guard" ? 12 : 0;
    const incoming = Math.max(4, 16 + Math.floor(Math.random() * 12) - guard);
    const nextFoe = Math.max(0, foe - attack);
    const nextYou = Math.max(0, you - incoming);
    const gained = score + attack;
    setFoe(nextFoe);
    setYou(nextYou);
    setScore(gained);
    setCool(kind === "special" ? 2 : Math.max(0, cool - 1));
    if (nextFoe <= 0) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: "complete", score: gained + 50 }), 0);
      return;
    }
    if (nextYou <= 0) {
      live.current = false;
      setTimeout(() => onOutcome?.({ type: "over", score: gained }), 0);
    }
  };

  return (
    <Playfield hud={[`⚡ ${score}`]} hint="Attack · Guard to reduce damage · Special after cooldown">
      <div className={styles.clash}>
        <div>
          <p>🛡️ You — {you} HP</p>
          <div className={styles.bar}><div className={styles.fill} style={{ width: `${you}%` }} /></div>
        </div>
        <div style={{ fontSize: 48, filter: "drop-shadow(0 0 12px rgba(212,175,55,0.5))" }}>⚔️</div>
        <div>
          <p>👿 Realm Guard — {foe} HP</p>
          <div className={styles.bar}><div className={styles.fill} style={{ width: `${foe}%`, background: "linear-gradient(90deg, #7e57c2, #ab47bc)" }} /></div>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={() => act("attack")}>⚔️ Attack</button>
          <button className={styles.btn} onClick={() => act("guard")}>🛡️ Guard</button>
          <button className={styles.btn} disabled={cool > 0} onClick={() => act("special")}>
            {cool > 0 ? `⏳ ${cool}` : "⚡ Special"}
          </button>
        </div>
      </div>
    </Playfield>
  );
}
