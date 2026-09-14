import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

const COLS = ["#ef5350", "#42a5f5", "#66bb6a", "#ffa726", "#ab47bc", "#ffca28"];

const R = 18;
const D = R * 2;
const ROW_H = R * Math.sqrt(3);
const W = 360;
const H = 520;

function getCellPos(r, c) {
  const x = (r % 2 === 0) ? (c * D + R) : (c * D + D);
  const y = r * ROW_H + R;
  return { x, y };
}

function getGridPos(x, y) {
  const r = Math.round((y - R) / ROW_H);
  let c;
  if (r % 2 === 0) {
    c = Math.round((x - R) / D);
  } else {
    c = Math.round((x - D) / D);
  }
  return { r, c };
}

function getNeighbors(r, c) {
  if (r % 2 === 0) {
    return [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]];
  } else {
    return [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]];
  }
}

function makeBoard(rows, numColors) {
  const grid = [];
  const cList = COLS.slice(0, numColors);
  for (let r = 0; r < 14; r++) {
    const row = [];
    const maxCols = r % 2 === 0 ? 10 : 9;
    for (let c = 0; c < maxCols; c++) {
      row.push(r < rows ? cList[Math.floor(Math.random() * cList.length)] : null);
    }
    grid.push(row);
  }
  return grid;
}

export function BubbleBlast({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const phaseRef = useRef("playing");
  const levelRef = useRef(1);
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1 });
  const [phase, setPhase] = useState("playing");

  function init(keepScore = 0, keepLives = 30) {
    const numColors = Math.min(3 + levelRef.current, 6);
    const grid = makeBoard(4 + levelRef.current, numColors);
    return {
      score: keepScore, lives: keepLives, level: levelRef.current,
      grid,
      particles: [],
      dropping: [],
      numColors,
      shooter: {
        x: W / 2, y: H - R, color: COLS[Math.floor(Math.random() * numColors)],
        nextColor: COLS[Math.floor(Math.random() * numColors)],
        angle: -Math.PI / 2,
        active: false,
        vx: 0, vy: 0
      },
      aiming: false,
      tick: 0
    };
  }

  useEffect(() => {
    if (!reviveSignal) return;
    if (stateRef.current) stateRef.current.lives = Math.max(stateRef.current.lives, 1);
    phaseRef.current = "playing";
    setPhase("playing");
  }, [reviveSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = W;
    canvas.height = H;

    if (!stateRef.current) stateRef.current = init();
    const s = stateRef.current;
    setHud({ score: s.score, lives: s.lives, level: s.level });

    const getAvailableColors = () => {
      const colors = new Set();
      s.grid.forEach(row => row.forEach(c => { if (c) colors.add(c); }));
      if (colors.size === 0) return [COLS[0]];
      return Array.from(colors);
    };

    const nextBubble = () => {
      s.shooter.active = false;
      s.shooter.x = W / 2;
      s.shooter.y = H - R;
      s.shooter.color = s.shooter.nextColor;
      const avail = getAvailableColors();
      s.shooter.nextColor = avail[Math.floor(Math.random() * avail.length)];
      if (!avail.includes(s.shooter.color)) s.shooter.color = avail[Math.floor(Math.random() * avail.length)];
    };

    const findCluster = (r, c, matchColor) => {
      const cluster = [];
      const visited = new Set();
      const stack = [[r, c]];
      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        const key = `${cr},${cc}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (cr >= 0 && cr < 14 && cc >= 0 && cc < s.grid[cr].length && s.grid[cr][cc] === matchColor) {
          cluster.push([cr, cc]);
          getNeighbors(cr, cc).forEach(([nr, nc]) => stack.push([nr, nc]));
        }
      }
      return cluster;
    };

    const findFloating = () => {
      const visited = new Set();
      const stack = [];
      // Start from top row
      for (let c = 0; c < s.grid[0].length; c++) {
        if (s.grid[0][c]) {
          stack.push([0, c]);
        }
      }
      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        const key = `${cr},${cc}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (cr >= 0 && cr < 14 && cc >= 0 && cc < s.grid[cr].length && s.grid[cr][cc]) {
          getNeighbors(cr, cc).forEach(([nr, nc]) => stack.push([nr, nc]));
        }
      }
      const floating = [];
      for (let r = 0; r < 14; r++) {
        for (let c = 0; c < s.grid[r].length; c++) {
          if (s.grid[r][c] && !visited.has(`${r},${c}`)) {
            floating.push({ r, c, color: s.grid[r][c] });
            s.grid[r][c] = null;
          }
        }
      }
      return floating;
    };

    const handleSnap = (r, c, color) => {
      if (r < 0) r = 0;
      if (r >= 14) r = 13;
      if (c < 0) c = 0;
      if (c >= s.grid[r].length) c = s.grid[r].length - 1;
      
      // If cell taken, find nearest empty neighbor
      if (s.grid[r][c] !== null) {
        const ns = getNeighbors(r, c).filter(([nr, nc]) => nr >= 0 && nr < 14 && nc >= 0 && nc < s.grid[nr].length && s.grid[nr][nc] === null);
        if (ns.length > 0) {
          r = ns[0][0]; c = ns[0][1];
        } else {
           // Game Over condition (board full at bottom)
           s.lives--;
           if (s.lives <= 0) {
              phaseRef.current = "over"; setPhase("over");
              setTimeout(() => onOutcome?.({ type: "over", score: s.score }), 0);
           }
           nextBubble();
           setHud({ score: s.score, lives: s.lives, level: s.level });
           return;
        }
      }
      s.grid[r][c] = color;
      
      const cluster = findCluster(r, c, color);
      if (cluster.length >= 3) {
        cluster.forEach(([cr, cc]) => {
          s.grid[cr][cc] = null;
          const pos = getCellPos(cr, cc);
          for (let i = 0; i < 8; i++) {
            s.particles.push({
              x: pos.x, y: pos.y, color,
              vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1.0
            });
          }
        });
        s.score += cluster.length * 10;
        
        // Give extra balls ONLY for HUGE combos (8 or more bubbles)
        if (cluster.length >= 8) {
          s.lives += Math.floor(cluster.length / 8); 
        }
        
        const floaters = findFloating();
        
        // Reward for massive drops (5 or more floaters)
        if (floaters.length >= 5) {
          s.lives += Math.floor(floaters.length / 5);
        }

        floaters.forEach(f => {
          const pos = getCellPos(f.r, f.c);
          s.dropping.push({ x: pos.x, y: pos.y, color: f.color, vx: (Math.random() - 0.5) * 4, vy: 0 });
          s.score += 20;
        });

        // Check win
        let isEmpty = true;
        s.grid.forEach(row => row.forEach(cell => { if (cell) isEmpty = false; }));
        if (isEmpty) {
          levelRef.current++;
          if (levelRef.current > 6) {
            phaseRef.current = "complete"; setPhase("complete");
            setTimeout(() => onOutcome?.({ type: "complete", score: s.score + 500 }), 0);
          } else {
            stateRef.current = init(s.score + 100, Math.max(30, s.lives + 10));
            setHud({ score: stateRef.current.score, lives: stateRef.current.lives, level: stateRef.current.level });
            return;
          }
        }
      } else {
        // No match made, check if out of balls
        if (s.lives <= 0) {
          phaseRef.current = "over"; setPhase("over");
          setTimeout(() => onOutcome?.({ type: "over", score: s.score }), 0);
        }
      }
      nextBubble();
      setHud({ score: s.score, lives: s.lives, level: s.level });
    };

    const updateAim = (e) => {
      if (phaseRef.current !== "playing" || s.shooter.active) return;
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const x = (pt.clientX - rect.left) * scaleX;
      const y = (pt.clientY - rect.top) * scaleY;
      
      const dx = x - s.shooter.x;
      const dy = y - s.shooter.y;
      let ang = Math.atan2(dy, dx);
      if (ang > -0.1) ang = -0.1;
      if (ang < -Math.PI + 0.1) ang = -Math.PI + 0.1;
      s.shooter.angle = ang;
      s.aiming = true;
    };

    const fire = (e) => {
      if (phaseRef.current !== "playing" || s.shooter.active || s.lives <= 0) return;
      s.aiming = false;
      s.shooter.active = true;
      s.lives--; // Deduct ball on fire
      setHud({ score: s.score, lives: s.lives, level: s.level });
      const speed = 14;
      s.shooter.vx = Math.cos(s.shooter.angle) * speed;
      s.shooter.vy = Math.sin(s.shooter.angle) * speed;
    };

    canvas.addEventListener("pointermove", updateAim);
    canvas.addEventListener("pointerdown", updateAim);
    window.addEventListener("pointerup", fire);

    const drawBubble = (x, y, color) => {
      ctx.save();
      ctx.translate(x, y);
      
      // Drop shadow for depth
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 3;
      
      // Base radial gradient with rim light
      const grad = ctx.createRadialGradient(-R*0.2, -R*0.2, 0, 0, 0, R);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.3, color);
      grad.addColorStop(0.85, "#111111");
      grad.addColorStop(1, color); // Rim light reflection
      
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, R - 1, 0, Math.PI * 2); ctx.fill();
      
      ctx.shadowColor = "transparent";
      
      // Inner ambient bottom reflection
      const bottomGrad = ctx.createLinearGradient(0, 0, 0, R);
      bottomGrad.addColorStop(0, "transparent");
      bottomGrad.addColorStop(1, "rgba(255,255,255,0.4)");
      ctx.fillStyle = bottomGrad;
      ctx.beginPath(); ctx.arc(0, 0, R - 1, 0, Math.PI * 2); ctx.fill();
      
      // Sharp Glossy specular highlight
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath(); ctx.ellipse(-R*0.35, -R*0.4, R*0.3, R*0.12, -Math.PI/5, 0, Math.PI*2); ctx.fill();
      
      // Tiny secondary highlight
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.arc(R*0.4, R*0.3, R*0.08, 0, Math.PI*2); ctx.fill();
      
      ctx.restore();
    };

    let frame;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (phaseRef.current !== "playing") return;
      s.tick++;

      // Space Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#080b26");
      bgGrad.addColorStop(1, "#1a0b2e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
      
      ctx.fillStyle = "#ffffff";
      for(let i=0; i<30; i++) {
        ctx.globalAlpha = 0.2 + Math.sin(s.tick*0.05 + i)*0.2;
        ctx.fillRect((i*47)%W, (i*83)%H, 2, 2);
      }
      ctx.globalAlpha = 1;

      // Update active shooter
      if (s.shooter.active) {
        s.shooter.x += s.shooter.vx;
        s.shooter.y += s.shooter.vy;

        if (s.shooter.x <= R) { s.shooter.x = R; s.shooter.vx *= -1; }
        if (s.shooter.x >= W - R) { s.shooter.x = W - R; s.shooter.vx *= -1; }
        if (s.shooter.y <= R) { s.shooter.y = R; s.shooter.vy = 0; }

        let collided = false;
        if (s.shooter.y <= R) {
          collided = true;
        } else {
          for (let r = 0; r < 14; r++) {
            for (let c = 0; c < s.grid[r].length; c++) {
              if (s.grid[r][c]) {
                const pos = getCellPos(r, c);
                const dist = Math.hypot(s.shooter.x - pos.x, s.shooter.y - pos.y);
                if (dist < D - 4) {
                  collided = true;
                  break;
                }
              }
            }
            if (collided) break;
          }
        }
        if (collided) {
           const gp = getGridPos(s.shooter.x, s.shooter.y);
           handleSnap(gp.r, gp.c, s.shooter.color);
        }
      }

      // Draw Grid
      for (let r = 0; r < 14; r++) {
        for (let c = 0; c < s.grid[r].length; c++) {
          if (s.grid[r][c]) {
            const pos = getCellPos(r, c);
            drawBubble(pos.x, pos.y, s.grid[r][c]);
          }
        }
      }

      // Draw Dropping
      s.dropping = s.dropping.filter(d => d.y < H + R);
      s.dropping.forEach(d => {
        d.x += d.vx; d.y += d.vy; d.vy += 0.5; // gravity
        drawBubble(d.x, d.y, d.color);
      });

      // Draw Particles
      s.particles = s.particles.filter(p => p.life > 0);
      s.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.05;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, 2 + p.life * 4, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw Trajectory
      if (s.aiming && !s.shooter.active && s.lives > 0) {
        ctx.fillStyle = s.shooter.color;
        ctx.globalAlpha = 0.6;
        let tx = s.shooter.x;
        let ty = s.shooter.y;
        let dx = Math.cos(s.shooter.angle) * 15;
        let dy = Math.sin(s.shooter.angle) * 15;
        
        for (let i = 0; i < 40; i++) {
          tx += dx; ty += dy;
          // Trajectory wall bouncing
          if (tx <= R) { tx = R; dx = -dx; }
          else if (tx >= W - R) { tx = W - R; dx = -dx; }
          if (ty <= R) break;
          
          // Check collision with existing bubbles
          let hitBubble = false;
          for (let r = 0; r < 14; r++) {
            for (let c = 0; c < s.grid[r].length; c++) {
              if (s.grid[r][c]) {
                const pos = getCellPos(r, c);
                // D is 36, so collision distance is slightly less
                if (Math.hypot(tx - pos.x, ty - pos.y) < 32) {
                  hitBubble = true;
                  break;
                }
              }
            }
            if (hitBubble) break;
          }
          if (hitBubble) break; // Stop drawing line if it hits a bubble
          
          ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Draw Shooter
      drawBubble(s.shooter.x, s.shooter.y, s.shooter.color);
      
      // Draw Next Bubble
      ctx.globalAlpha = 0.5;
      drawBubble(W / 2 + 60, H - R + 5, s.shooter.nextColor);
      ctx.globalAlpha = 1;

    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", updateAim);
      canvas.removeEventListener("pointerdown", updateAim);
      window.removeEventListener("pointerup", fire);
    };
  }, [phase, onOutcome]);

  const restart = () => {
    levelRef.current = 1;
    stateRef.current = init();
    phaseRef.current = "playing";
    setPhase("playing");
  };

  const togglePause = () => {
    const next = phaseRef.current === "paused" ? "playing" : "paused";
    phaseRef.current = next; setPhase(next);
  };

  return (
    <GameShell title="Bubble Blast" score={hud.score} lives={hud.lives} level={hud.level}
      phase={phase} onPause={togglePause} onResume={togglePause} onRestart={restart}>
      <div style={{
        margin: "0 auto",
        width: "100%",
        maxWidth: "min(420px, calc(80vh * 360 / 520))",
        backgroundColor: "#050014",
        borderRadius: "16px",
        overflow: "hidden",
        border: "2px solid #222",
        boxShadow: "0 8px 32px rgba(0,255,150,0.1)"
      }}>
        <canvas ref={canvasRef}
          style={{ 
            width: "100%", 
            aspectRatio: "360 / 520",
            display: "block", 
            touchAction: "none"
          }} />
      </div>
      <p style={{ color: "rgba(200,180,140,0.6)", fontSize: "0.75rem", textAlign: "center", padding: "8px 0", margin: 0 }}>
        Balls remaining: {hud.lives} | Pop bubbles to earn more!
      </p>
    </GameShell>
  );
}
