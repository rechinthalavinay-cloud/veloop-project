import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

const W = 360;
const H = 520;
const R = 4; // Particle radius

function getClosestPointOnLine(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: ax, y: ay };
  const t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  const tClamped = Math.max(0, Math.min(1, t));
  return { x: ax + tClamped * dx, y: ay + tClamped * dy };
}

export function AquaFill({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const phaseRef = useRef("drawing"); // drawing -> pouring -> over
  const levelRef = useRef(1);
  const [hud, setHud] = useState({ score: 0, level: 1 });
  const [phase, setPhase] = useState("drawing");

  const getLevelParams = (level) => {
    let pipeX = 50, pipeY = 50, glassX = 150, glassY = 450;
    const obstacles = [];
    
    if (level === 1) {
      // Level 1: One big wall blocking the middle
      pipeX = 60;
      glassX = 230;
      obstacles.push([{ x: 40, y: 220 }, { x: 260, y: 220 }]);
    } 
    else if (level === 2) {
      // Level 2: Zig-zag
      pipeX = 300;
      glassX = 50;
      obstacles.push([{ x: 100, y: 150 }, { x: 340, y: 180 }]);
      obstacles.push([{ x: 20, y: 300 }, { x: 240, y: 320 }]);
    }
    else if (level === 3) {
      // Level 3: The Trap Cup
      pipeX = 180;
      glassX = 230;
      // Trap that catches water in the middle
      obstacles.push([{ x: 140, y: 200 }, { x: 170, y: 250 }]);
      obstacles.push([{ x: 170, y: 250 }, { x: 220, y: 250 }]);
      obstacles.push([{ x: 220, y: 250 }, { x: 250, y: 200 }]);
    }
    else if (level === 4) {
      // Level 4: Obstacle course maze
      pipeX = 60;
      glassX = 60;
      obstacles.push([{ x: 0, y: 120 }, { x: 150, y: 150 }]);
      obstacles.push([{ x: 200, y: 250 }, { x: 360, y: 280 }]);
      obstacles.push([{ x: 0, y: 360 }, { x: 180, y: 340 }]);
      // Hanging wall
      obstacles.push([{ x: 150, y: 150 }, { x: 150, y: 250 }]);
    }
    else if (level >= 5) {
      // Level 5: Double funnel of doom
      pipeX = 180;
      glassX = 180;
      // Funnel pointing away from center
      obstacles.push([{ x: 0, y: 150 }, { x: 170, y: 250 }]);
      obstacles.push([{ x: 360, y: 150 }, { x: 190, y: 250 }]);
      // Lower blocker
      obstacles.push([{ x: 130, y: 320 }, { x: 230, y: 320 }]);
      // Side blocks
      obstacles.push([{ x: 0, y: 350 }, { x: 100, y: 400 }]);
      obstacles.push([{ x: 360, y: 350 }, { x: 260, y: 400 }]);
    }

    return {
      pipe: { x: pipeX, y: pipeY },
      glass: { x: glassX, y: glassY, w: 70, h: 80 },
      obstacles
    };
  };

  function init(keepScore = 0) {
    const params = getLevelParams(levelRef.current);
    
    // Create glass physics lines (U shape)
    const g = params.glass;
    const glassLines = [
      [{ x: g.x - 15, y: g.y - g.h }, { x: g.x, y: g.y }], // left wall
      [{ x: g.x + g.w + 15, y: g.y - g.h }, { x: g.x + g.w, y: g.y }], // right wall
      [{ x: g.x, y: g.y }, { x: g.x + g.w, y: g.y }] // bottom
    ];

    return {
      score: keepScore, level: levelRef.current, tick: 0,
      lines: [], // user drawn lines
      currentLine: null,
      particles: [],
      particlesSpawned: 0,
      maxParticles: 100,
      settleTimer: 0,
      params,
      glassLines,
      isHappy: false
    };
  }

  useEffect(() => {
    if (!reviveSignal) return;
    stateRef.current = init(stateRef.current?.score || 0);
    phaseRef.current = "drawing"; setPhase("drawing");
  }, [reviveSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = W;
    canvas.height = H;

    if (!stateRef.current) stateRef.current = init();
    const s = stateRef.current;
    setHud({ score: s.score, level: s.level });

    const handlePointerDown = (e) => {
      if (phaseRef.current !== "drawing") return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const x = (pt.clientX - rect.left) * (W / rect.width);
      const y = (pt.clientY - rect.top) * (H / rect.height);
      s.currentLine = [{ x, y }];
    };

    const handlePointerMove = (e) => {
      if (phaseRef.current !== "drawing" || !s.currentLine) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const x = (pt.clientX - rect.left) * (W / rect.width);
      const y = (pt.clientY - rect.top) * (H / rect.height);
      const last = s.currentLine[s.currentLine.length - 1];
      if (Math.hypot(x - last.x, y - last.y) > 5) {
        s.currentLine.push({ x, y });
      }
    };

    const handlePointerUp = () => {
      if (phaseRef.current !== "drawing" || !s.currentLine) return;
      if (s.currentLine.length > 1) {
        s.lines.push(s.currentLine);
      }
      s.currentLine = null;
      // When user lifts finger after drawing at least one line, start pouring!
      if (s.lines.length > 0) {
        phaseRef.current = "pouring"; setPhase("pouring");
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    const checkCollision = (p, line) => {
      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i+1];
        const cp = getClosestPointOnLine(p.x, p.y, a.x, a.y, b.x, b.y);
        const dist = Math.hypot(p.x - cp.x, p.y - cp.y);
        if (dist < R) {
          // Resolve overlap
          const overlap = R - dist;
          let nx = p.x - cp.x;
          let ny = p.y - cp.y;
          const nlen = Math.hypot(nx, ny);
          if (nlen > 0) { nx /= nlen; ny /= nlen; }
          else { ny = -1; nx = 0; }
          
          p.x += nx * overlap;
          p.y += ny * overlap;

          // Reflect velocity (bounciness = 0.3)
          const dot = p.vx * nx + p.vy * ny;
          if (dot < 0) {
            p.vx = (p.vx - 1.3 * dot * nx) * 0.95; // 0.95 friction
            p.vy = (p.vy - 1.3 * dot * ny) * 0.95;
          }
        }
      }
    };

    let frame;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (phaseRef.current === "paused") return;
      s.tick++;

      // PHYSICS UPDATE
      if (phaseRef.current === "pouring") {
        // Spawn water
        if (s.particlesSpawned < s.maxParticles && s.tick % 2 === 0) {
          s.particles.push({
            x: s.params.pipe.x + (Math.random()-0.5)*10,
            y: s.params.pipe.y + 10,
            vx: (Math.random()-0.5),
            vy: 2
          });
          s.particlesSpawned++;
        }

        // Update particles with sub-stepping for robust collision
        let particlesInGlass = 0;
        const subSteps = 3;
        
        for (let step = 0; step < subSteps; step++) {
          s.particles.forEach(p => {
            if (step === 0) {
              p.vy += 0.4; // Gravity once per frame
              if (p.vy > 12) p.vy = 12; // Terminal velocity
            }
            p.x += p.vx / subSteps;
            p.y += p.vy / subSteps;
          });
          
          // Particle-Particle repulsion (Fluid simulation)
          for (let i = 0; i < s.particles.length; i++) {
            for (let j = i + 1; j < s.particles.length; j++) {
              const p1 = s.particles[i];
              const p2 = s.particles[j];
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const distSq = dx*dx + dy*dy;
              const minDist = R * 2.2; // Slightly larger than 2R to ensure they pile up
              if (distSq > 0 && distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                // Push apart
                const force = overlap * 0.5;
                p1.x -= nx * force;
                p1.y -= ny * force;
                p2.x += nx * force;
                p2.y += ny * force;
                
                // Viscosity (velocity averaging)
                const vdx = p2.vx - p1.vx;
                const vdy = p2.vy - p1.vy;
                p1.vx += vdx * 0.05;
                p1.vy += vdy * 0.05;
                p2.vx -= vdx * 0.05;
                p2.vy -= vdy * 0.05;
              }
            }
          }

          // Wall Collisions (Must be last so particles never stay out of bounds)
          s.particles.forEach(p => {
            // Collide with drawn lines
            s.lines.forEach(line => checkCollision(p, line));
            // Collide with obstacles
            s.params.obstacles.forEach(line => checkCollision(p, line));
            // Collide with glass
            s.glassLines.forEach(line => checkCollision(p, line));

            // Hard boundary constraint for the inside of the glass to guarantee no tunneling
            const g = s.params.glass;
            if (p.x > g.x - 10 && p.x < g.x + g.w + 10 && p.y > g.y - g.h) {
                // Bottom floor
                if (p.y > g.y - R) {
                   p.y = g.y - R;
                   p.vy *= -0.3; 
                }
                // Left wall
                if (p.x < g.x + R) {
                   p.x = g.x + R;
                   p.vx *= -0.3;
                }
                // Right wall
                if (p.x > g.x + g.w - R) {
                   p.x = g.x + g.w - R;
                   p.vx *= -0.3;
                }
            }
          });
        }

        s.particles.forEach(p => {
          // Check if inside glass bounds for win condition
          const g = s.params.glass;
          if (p.x > g.x - 5 && p.x < g.x + g.w + 5 && p.y > g.y - g.h && p.y < g.y + 5) {
             particlesInGlass++;
          }
        });

        // Remove off-screen particles
        s.particles = s.particles.filter(p => p.y < H + 50);

        s.isHappy = (particlesInGlass > 60);

        // Check level end
        if (s.particlesSpawned >= s.maxParticles) {
          s.settleTimer++;
          if (s.settleTimer > 180) { // 3 seconds after spawning finishes
             if (s.isHappy) {
                // Win
                levelRef.current++;
                s.level = levelRef.current;
                s.score += 100 * s.level;
                if (s.level > 5) {
                   phaseRef.current = "complete"; setPhase("complete");
                   setTimeout(() => onOutcome?.({ type: "complete", score: s.score + 500 }), 0);
                } else {
                   stateRef.current = init(s.score);
                   setHud({ score: stateRef.current.score, level: stateRef.current.level });
                   phaseRef.current = "drawing"; setPhase("drawing");
                }
             } else {
                // Lose
                phaseRef.current = "over"; setPhase("over");
                setTimeout(() => onOutcome?.({ type: "over", score: s.score }), 0);
             }
          }
        }
      }

      // RENDER
      ctx.fillStyle = "#090916";
      ctx.fillRect(0, 0, W, H);
      
      // Starry background
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 40; i++) {
        ctx.globalAlpha = 0.1 + Math.sin(s.tick*0.02 + i)*0.2;
        ctx.fillRect((i*97)%W, (i*61)%H, 2, 2);
      }
      ctx.globalAlpha = 1;

      // Draw Pipe
      ctx.fillStyle = "#ffb74d";
      ctx.fillRect(s.params.pipe.x - 15, s.params.pipe.y - 30, 30, 40);
      ctx.fillStyle = "#e65100";
      ctx.fillRect(s.params.pipe.x - 18, s.params.pipe.y + 10, 36, 10);
      
      // Draw Obstacles
      ctx.strokeStyle = "#26a69a";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      s.params.obstacles.forEach(line => {
        ctx.beginPath();
        line.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      });

      // Draw Glass
      const g = s.params.glass;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 6;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(g.x - 15, g.y - g.h);
      ctx.lineTo(g.x, g.y);
      ctx.lineTo(g.x + g.w, g.y);
      ctx.lineTo(g.x + g.w + 15, g.y - g.h);
      ctx.stroke();

      // Glass fill dotted line target
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(g.x - 10, g.y - g.h + 20);
      ctx.lineTo(g.x + g.w + 10, g.y - g.h + 20);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glass Face
      ctx.fillStyle = s.isHappy ? "#ffcc00" : "rgba(255,255,255,0.4)";
      const cx = g.x + g.w/2;
      const cy = g.y - g.h/2 + 10;
      
      if (s.isHappy) {
         // Happy Eyes
         ctx.beginPath(); ctx.arc(cx - 12, cy, 3, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(cx + 12, cy, 3, 0, Math.PI*2); ctx.fill();
         // Smile
         ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 3;
         ctx.beginPath(); ctx.arc(cx, cy + 5, 8, 0, Math.PI); ctx.stroke();
      } else {
         // Sad Eyes
         ctx.beginPath(); ctx.fillRect(cx - 15, cy, 8, 3);
         ctx.beginPath(); ctx.fillRect(cx + 7, cy, 8, 3);
         // Frown
         ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 3;
         ctx.beginPath(); ctx.arc(cx, cy + 12, 8, Math.PI, Math.PI*2); ctx.stroke();
      }

      // Draw Particles (Realistic Water)
      ctx.globalCompositeOperation = "lighter";
      s.particles.forEach(p => {
        const rad = R * 2.5; // Larger radius for blending
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        grad.addColorStop(0, "rgba(128, 216, 255, 0.9)");
        grad.addColorStop(0.4, "rgba(41, 182, 246, 0.6)");
        grad.addColorStop(1, "transparent");
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";

      // Draw Lines
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 5;
      
      const linesToDraw = s.currentLine ? [...s.lines, s.currentLine] : s.lines;
      linesToDraw.forEach(line => {
        if (line.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(line[0].x, line[0].y);
        for(let i=1; i<line.length; i++) ctx.lineTo(line[i].x, line[i].y);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      if (phaseRef.current === "drawing" && s.tick % 60 < 30) {
         ctx.fillStyle = "rgba(255,255,255,0.8)";
         ctx.font = "bold 16px sans-serif";
         ctx.textAlign = "center";
         ctx.fillText("Draw a line to guide the water!", W/2, 100);
      }

    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [phase, onOutcome]);

  const restart = () => {
    levelRef.current = 1;
    stateRef.current = init();
    phaseRef.current = "drawing";
    setPhase("drawing");
  };

  const togglePause = () => {
    const next = phaseRef.current === "paused" ? "drawing" : "paused";
    phaseRef.current = next; setPhase(next);
  };

  return (
    <GameShell title="Aqua Fill" score={hud.score} level={hud.level}
      phase={phase} onPause={togglePause} onResume={togglePause} onRestart={restart}>
      <div style={{
        margin: "0 auto",
        width: "100%",
        maxWidth: "min(420px, calc(80vh * 360 / 520))",
        backgroundColor: "#050014",
        borderRadius: "16px",
        overflow: "hidden",
        border: "2px solid #222",
        boxShadow: "0 8px 32px rgba(41,182,246,0.15)"
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
        Draw a line to guide the water. Release to pour!
      </p>
    </GameShell>
  );
}
