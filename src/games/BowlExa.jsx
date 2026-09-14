import { useEffect, useRef, useState, useCallback } from "react";
import { GameShell } from "./GameShell";

// Physics and 3D projection constants
const PIN_RADIUS = 0.07;
const BALL_RADIUS = 0.12;
const GRAVITY = 0; // Top-down 2D physics

export function BowlExa({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [hud, setHud] = useState({ score: 0, throws: 6, phase: "playing" });

  const initPins = () => {
    return [
      { id: 0, x: 0, y: 0.85, vx: 0, vy: 0, up: true, r: PIN_RADIUS },
      { id: 1, x: -0.15, y: 0.89, vx: 0, vy: 0, up: true, r: PIN_RADIUS },
      { id: 2, x: 0.15, y: 0.89, vx: 0, vy: 0, up: true, r: PIN_RADIUS },
      { id: 3, x: -0.3, y: 0.93, vx: 0, vy: 0, up: true, r: PIN_RADIUS },
      { id: 4, x: 0, y: 0.93, vx: 0, vy: 0, up: true, r: PIN_RADIUS },
      { id: 5, x: 0.3, y: 0.93, vx: 0, vy: 0, up: true, r: PIN_RADIUS },
      { id: 6, x: -0.45, y: 0.97, vx: 0, vy: 0, up: true, r: PIN_RADIUS },
      { id: 7, x: -0.15, y: 0.97, vx: 0, vy: 0, up: true, r: PIN_RADIUS },
      { id: 8, x: 0.15, y: 0.97, vx: 0, vy: 0, up: true, r: PIN_RADIUS },
      { id: 9, x: 0.45, y: 0.97, vx: 0, vy: 0, up: true, r: PIN_RADIUS },
    ];
  };

  const initState = () => ({
    pins: initPins(),
    ball: { x: 0, y: 0, vx: 0, vy: 0, active: false, spin: 0 },
    obstacle: { x: 0, y: 0.5, w: 0.25, h: 0.05, vx: 0.015 },
    score: 0,
    throws: 6,
    state: "idle", // idle, rolling, resetting
    drag: null, // { startX, startY, time }
  });

  useEffect(() => {
    if (!reviveSignal) return;
    if (stateRef.current) stateRef.current.throws = Math.max(stateRef.current.throws, 2);
    stateRef.current.state = "idle";
    setHud(h => ({ ...h, throws: stateRef.current.throws, phase: "playing" }));
  }, [reviveSignal]);

  const finishThrow = useCallback((knockedCount) => {
    const s = stateRef.current;
    if (!s) return;
    
    const gained = knockedCount * 15 + (knockedCount === 10 ? 50 : 0);
    s.score += gained;
    s.throws--;
    
    // Check if we need to reset all pins (e.g. Strike or spare mechanics)
    // For this arcade version, we reset all pins if all are down, or keep standing if not.
    const allDown = s.pins.every(p => !p.up);
    if (allDown) {
      s.pins = initPins();
    }
    
    // Speed up obstacle slightly on every throw
    s.obstacle.vx *= 1.1;
    
    s.ball = { x: 0, y: 0, vx: 0, vy: 0, active: false, spin: 0 };
    s.state = "idle";
    
    setHud({ score: s.score, throws: s.throws, phase: "playing" });
    
    if (s.throws <= 0) {
      const isWin = s.score >= 80;
      setHud(h => ({ ...h, phase: isWin ? "complete" : "over" }));
      setTimeout(() => onOutcome?.({ type: isWin ? "complete" : "over", score: s.score }), 0);
    }
  }, [onOutcome]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 360, H = 520;
    
    const s = stateRef.current || initState();
    stateRef.current = s;
    setHud({ score: s.score, throws: s.throws, phase: "playing" });

    // Perspective projection
    const project = (x, y, radius) => {
      const scale = 1 - 0.45 * y; // scale shrinks to 0.55 at y=1 (much larger than 0.35)
      const screenY = H - 80 - (320 * y); // Shorter pitch vertically
      const screenX = W / 2 + (x * 150 * scale);
      return { x: screenX, y: screenY, r: radius * 200 * scale, scale };
    };

    const handleKey = (e) => {
      if (s.state !== "idle" || s.throws <= 0) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        s.ball.x = Math.max(-0.8, s.ball.x - 0.05);
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        s.ball.x = Math.min(0.8, s.ball.x + 0.05);
      } else if (e.code === "Space") {
        e.preventDefault();
        s.ball.vy = 0.035; // standard throw speed
        s.ball.vx = 0; // straight
        s.ball.spin = 0;
        s.ball.active = true;
        s.state = "rolling";
      }
    };

    const handlePtrDown = (e) => {
      if (s.state !== "idle" || s.throws <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const x = pt.clientX - rect.left;
      const y = pt.clientY - rect.top;
      
      const bp = project(s.ball.x, s.ball.y, BALL_RADIUS);
      if (Math.hypot(x - bp.x, y - bp.y) < bp.r + 40) {
        s.drag = { startX: x, startY: y, startBallX: s.ball.x, time: performance.now(), path: [] };
      }
    };

    const handlePtrMove = (e) => {
      if (!s.drag) return;
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const cx = pt.clientX - rect.left;
      const cy = pt.clientY - rect.top;
      s.drag.path.push({ x: cx, y: cy });
      
      if (s.state === "idle") {
        const dx = cx - s.drag.startX;
        const laneWorldDx = dx / 150; 
        s.ball.x = Math.max(-0.8, Math.min(0.8, s.drag.startBallX + laneWorldDx));
      }
    };

    const handlePtrUp = (e) => {
      if (!s.drag) return;
      const dt = performance.now() - s.drag.time;
      if (dt > 20 && s.drag.path.length > 2) {
        const p1 = { x: s.drag.startX, y: s.drag.startY };
        const p2 = s.drag.path[s.drag.path.length - 1];
        const dy = p1.y - p2.y; // pixels dragged up
        const dx = p2.x - p1.x; // pixels dragged right
        
        if (dy > 30) {
          s.ball.vy = Math.min(0.04, dy / dt * 0.02); // velocity down lane
          s.ball.vx = (dx / dy) * s.ball.vy * 0.5; // lateral velocity
          
          // Calculate spin based on curve of swipe
          const midPoint = s.drag.path[Math.floor(s.drag.path.length / 2)];
          const expectedMidX = (p1.x + p2.x) / 2;
          const curve = midPoint.x - expectedMidX;
          s.ball.spin = curve * 0.0005;

          s.ball.active = true;
          s.state = "rolling";
        }
      }
      s.drag = null;
    };

    canvas.addEventListener("pointerdown", handlePtrDown);
    window.addEventListener("pointermove", handlePtrMove);
    window.addEventListener("pointerup", handlePtrUp);
    window.addEventListener("keydown", handleKey);
    canvas.addEventListener("touchstart", (e) => { if(s.state==="idle") e.preventDefault(); }, {passive:false});

    let frame;
    let lastKnockedCount = 0;
    let resetTimer = 0;

    const resolveCollision = (a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < a.r + b.r) {
        // Simple elastic collision
        const overlap = (a.r + b.r) - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        
        // Separate
        const massRatioA = b.mass || 1;
        const massRatioB = a.mass || 1;
        const totalMass = massRatioA + massRatioB;
        
        a.x -= nx * overlap * (massRatioA / totalMass);
        a.y -= ny * overlap * (massRatioA / totalMass);
        b.x += nx * overlap * (massRatioB / totalMass);
        b.y += ny * overlap * (massRatioB / totalMass);

        // Velocity exchange
        const kx = (a.vx - b.vx);
        const ky = (a.vy - b.vy);
        const p = 2 * (nx * kx + ny * ky) / totalMass;
        
        a.vx -= p * massRatioA * nx * 0.8;
        a.vy -= p * massRatioA * ny * 0.8;
        b.vx += p * massRatioB * nx * 0.8;
        b.vy += p * massRatioB * ny * 0.8;
        
        if (b.mass === 1) { // if b is a pin
          b.up = false; // it's knocked over
        }
        if (a.mass === 1) { // if a is a pin
          a.up = false; 
        }
      }
    };

    const loop = () => {
      frame = requestAnimationFrame(loop);
      
      // Obstacle movement
      s.obstacle.x += s.obstacle.vx;
      if (s.obstacle.x > 0.5) { s.obstacle.x = 0.5; s.obstacle.vx *= -1; }
      if (s.obstacle.x < -0.5) { s.obstacle.x = -0.5; s.obstacle.vx *= -1; }
      
      // Physics Update
      if (s.state === "rolling") {
        s.ball.x += s.ball.vx;
        s.ball.y += s.ball.vy;
        s.ball.vx += s.ball.spin; // Hook effect
        
        // Friction
        s.ball.vx *= 0.99;
        s.ball.vy *= 0.995;

        // Check gutter
        if (s.ball.x < -1.1 || s.ball.x > 1.1) {
          s.ball.vx *= 0.9;
        }

        // Ball vs Obstacle
        if (s.ball.y + BALL_RADIUS > s.obstacle.y - s.obstacle.h/2 && 
            s.ball.y - BALL_RADIUS < s.obstacle.y + s.obstacle.h/2 &&
            s.ball.x + BALL_RADIUS > s.obstacle.x - s.obstacle.w/2 &&
            s.ball.x - BALL_RADIUS < s.obstacle.x + s.obstacle.w/2) {
            
            s.ball.vy *= -0.3; // Bounce backward
            s.ball.vx += (s.ball.x > s.obstacle.x ? 0.015 : -0.015);
        }

        s.ball.mass = 10; // ball is heavier than pins
        s.ball.r = BALL_RADIUS;
        
        for (const p of s.pins) {
          if (p.up || Math.hypot(p.vx, p.vy) > 0.001) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.mass = 1;
            resolveCollision(s.ball, p);
          }
        }

        // Pin to pin collisions
        for (let i = 0; i < s.pins.length; i++) {
          for (let j = i + 1; j < s.pins.length; j++) {
            if (s.pins[i].y > 0.5 && s.pins[j].y > 0.5) {
              resolveCollision(s.pins[i], s.pins[j]);
            }
          }
        }

        // End of roll condition
        if (s.ball.y > 1.2 || (s.ball.vy < 0.001 && s.ball.y > 0)) {
          resetTimer++;
          if (resetTimer > 90) { // wait ~1.5s
            s.state = "resetting";
            const knocked = s.pins.filter(p => !p.up).length;
            const newKnocked = knocked - lastKnockedCount;
            lastKnockedCount = knocked;
            resetTimer = 0;
            finishThrow(newKnocked);
          }
        }
      } else {
        lastKnockedCount = s.pins.filter(p => !p.up).length;
      }

      // Render
      ctx.fillStyle = "#0a0a14"; // background
      ctx.fillRect(0, 0, W, H);

      // Draw Lane
      ctx.fillStyle = "#8d6e63"; // wooden floor
      ctx.beginPath();
      const tl = project(-1, 1, 0);
      const tr = project(1, 1, 0);
      const bl = project(-1, 0, 0);
      const br = project(1, 0, 0);
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.fill();

      // Gutters
      ctx.fillStyle = "#263238";
      ctx.beginPath(); ctx.moveTo(tl.x-10*tl.scale, tl.y); ctx.lineTo(tl.x, tl.y); ctx.lineTo(bl.x, bl.y); ctx.lineTo(bl.x-100, bl.y); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tr.x+10*tr.scale, tr.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.lineTo(br.x+100, br.y); ctx.fill();

      // Sort objects by depth (y) to render back-to-front
      const objects = [
        ...s.pins.map(p => ({ ...p, type: 'pin' })),
        { ...s.ball, type: 'ball' },
        { ...s.obstacle, type: 'obstacle' }
      ].sort((a, b) => b.y - a.y);

      for (const obj of objects) {
        if (obj.type === 'pin') {
          const p = project(obj.x, obj.y, obj.r);
          if (obj.up) {
            // Shadow
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r*0.2, p.r*1.2, p.r*0.5, 0, 0, Math.PI*2); ctx.fill();
            
            // Body
            ctx.fillStyle = "#f5f5f5";
            ctx.beginPath();
            ctx.moveTo(p.x - p.r, p.y);
            ctx.bezierCurveTo(p.x - p.r, p.y - p.r*2.5, p.x - p.r*0.4, p.y - p.r*3, p.x, p.y - p.r*3.5);
            ctx.bezierCurveTo(p.x + p.r*0.4, p.y - p.r*3, p.x + p.r, p.y - p.r*2.5, p.x + p.r, p.y);
            ctx.bezierCurveTo(p.x + p.r, p.y + p.r*0.5, p.x - p.r, p.y + p.r*0.5, p.x - p.r, p.y);
            ctx.fill();
            
            // Red stripe
            ctx.strokeStyle = "#e53935";
            ctx.lineWidth = p.r * 0.3;
            ctx.beginPath(); ctx.moveTo(p.x - p.r*0.4, p.y - p.r*2); ctx.lineTo(p.x + p.r*0.4, p.y - p.r*2); ctx.stroke();
          } else {
            // Knocked over pin (simple circle representation)
            ctx.fillStyle = "rgba(200,200,200,0.3)";
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r*0.3, obj.vx*10, 0, Math.PI*2); ctx.fill();
          }
        } else if (obj.type === 'ball') {
          if (obj.y > 1.2 && !obj.active) continue; // Don't draw if it fell in pit
          const p = project(obj.x, obj.y, BALL_RADIUS);
          
          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r*0.8, p.r*1.1, p.r*0.4, 0, 0, Math.PI*2); ctx.fill();
          
          // Ball
          const grad = ctx.createRadialGradient(p.x - p.r*0.3, p.y - p.r*0.3, p.r*0.1, p.x, p.y, p.r);
          grad.addColorStop(0, "#ffb74d");
          grad.addColorStop(1, "#c9782a");
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
          
          // Holes
          ctx.fillStyle = "#3e2723";
          ctx.beginPath(); ctx.arc(p.x + p.r*0.3, p.y - p.r*0.2, p.r*0.15, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(p.x + p.r*0.5, p.y + p.r*0.1, p.r*0.15, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(p.x + p.r*0.1, p.y + p.r*0.2, p.r*0.15, 0, Math.PI*2); ctx.fill();
        } else if (obj.type === 'obstacle') {
          const obP = project(obj.x, obj.y, 0);
          const obLeft = project(obj.x - obj.w/2, obj.y, 0).x;
          const obRight = project(obj.x + obj.w/2, obj.y, 0).x;
          
          ctx.fillStyle = "rgba(0,0,0,0.5)"; // Shadow
          ctx.fillRect(obLeft, obP.y, obRight - obLeft, 10 * obP.scale);
          
          ctx.fillStyle = "#d32f2f"; // Dark red border
          ctx.fillRect(obLeft, obP.y - 25 * obP.scale, obRight - obLeft, 35 * obP.scale);
          ctx.fillStyle = "#f44336"; // Bright red face
          ctx.fillRect(obLeft + 2, obP.y - 25 * obP.scale + 2, obRight - obLeft - 4, 35 * obP.scale - 4);
          
          ctx.fillStyle = "#212121"; // Stripes
          for (let xx = obLeft + 5; xx < obRight - 10; xx += 20 * obP.scale) {
             ctx.fillRect(xx, obP.y - 25 * obP.scale + 2, 10 * obP.scale, 35 * obP.scale - 4);
          }
        }
      }

      // HUD overlay during drag
      if (s.drag && s.state === "idle") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(s.drag.startX, s.drag.startY);
        const lastPt = s.drag.path[s.drag.path.length-1];
        if (lastPt) ctx.lineTo(lastPt.x, lastPt.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", handlePtrDown);
      window.removeEventListener("pointermove", handlePtrMove);
      window.removeEventListener("pointerup", handlePtrUp);
      window.removeEventListener("keydown", handleKey);
    };
  }, [finishThrow]);

  const restart = () => {
    stateRef.current = null; // force re-init
    setHud({ score: 0, throws: 6, phase: "playing" });
  };

  return (
    <GameShell title="BowlExa" score={hud.score} level={1}
      extraHud={<span style={{ color: "#64b5f6" }}>🎳 {hud.throws} throws</span>}
      phase={hud.phase} onPause={()=>{}} onResume={()=>{}} onRestart={restart}>
      <canvas ref={canvasRef} width={360} height={520}
        style={{ width: "100%", height: "auto", display: "block", touchAction: "none", borderRadius: 12 }} />
      {hud.phase === "playing" && stateRef.current?.state === "idle" && (
        <p style={{ position: "absolute", bottom: 20, width: "100%", textAlign: "center", color: "#fff", pointerEvents: "none", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
          Avoid the moving barrier!<br/>Swipe up or press Space to bowl.
        </p>
      )}
    </GameShell>
  );
}
