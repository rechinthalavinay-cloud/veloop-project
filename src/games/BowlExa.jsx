import { useEffect, useRef, useState, useCallback } from "react";
import { GameShell } from "./GameShell";

// --- Audio Synthesizer ---
const playSound = (type, ctxRef) => {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
  const actx = ctxRef.current;
  if (actx.state === "suspended") actx.resume();

  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.connect(gain);
  gain.connect(actx.destination);

  if (type === "hit") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
    osc.start();
    osc.stop(actx.currentTime + 0.1);
  } else if (type === "roll") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(60, actx.currentTime);
    gain.gain.setValueAtTime(0, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, actx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.5);
    osc.start();
    osc.stop(actx.currentTime + 0.5);
  } else if (type === "strike") {
    osc.type = "square";
    osc.frequency.setValueAtTime(400, actx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, actx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(800, actx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.6);
    osc.start();
    osc.stop(actx.currentTime + 0.6);
  }
};

// Physics and Projection
const PIN_RADIUS = 0.055;
const BALL_RADIUS = 0.11;
const STATE_VERSION = 3;

export function BowlExa({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [hud, setHud] = useState({ score: 0, throws: 3, phase: "playing" });

  const initPins = () => {
    // Tighter realistic 6-pin triangle
    return [
      { id: 0, x: 0, y: 0.8, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 1, rotX: 0, rotY: 0 },
      { id: 1, x: -0.12, y: 0.9, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 1, rotX: 0, rotY: 0 },
      { id: 2, x: 0.12, y: 0.9, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 1, rotX: 0, rotY: 0 },
      { id: 3, x: -0.24, y: 1.0, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 1, rotX: 0, rotY: 0 },
      { id: 4, x: 0, y: 1.0, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 1, rotX: 0, rotY: 0 },
      { id: 5, x: 0.24, y: 1.0, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 1, rotX: 0, rotY: 0 },
    ];
  };

  const initState = () => ({
    version: STATE_VERSION,
    pins: initPins(),
    ball: { x: 0, y: 0, vx: 0, vy: 0, active: false, spin: 0, mass: 12, rotX: 0, rotY: 0, r: BALL_RADIUS },
    score: 0,
    throws: 3,
    state: "idle", // idle, aiming, rolling, resetting
    drag: null,
    particles: [],
    messages: [], 
    rollSoundTimer: 0,
    cameraShake: 0
  });

  useEffect(() => {
    if (!reviveSignal) return;
    if (stateRef.current) stateRef.current.throws = Math.max(stateRef.current.throws, 1);
    stateRef.current.state = "idle";
    setHud(h => ({ ...h, throws: stateRef.current.throws, phase: "playing" }));
  }, [reviveSignal]);

  const updateHud = (s) => {
    const scoreEl = document.getElementById('game-score');
    if (scoreEl) scoreEl.innerText = `⚡ ${s.score}`;
    const throwsEl = document.getElementById('be-throws');
    if (throwsEl) throwsEl.innerText = `🎳 ${s.throws} left`;
  };

  const finishThrow = useCallback((knockedCount) => {
    const s = stateRef.current;
    if (!s) return;
    
    let gained = knockedCount * 10;
    if (knockedCount === 6) {
      gained += 40; 
      playSound("strike", audioCtxRef);
      s.messages.push({ text: "STRIKE!", life: 100, scale: 2, color: "#ffeb3b" });
    } else if (knockedCount > 0) {
      s.messages.push({ text: `+${gained}`, life: 80, scale: 1.5, color: "#00e5ff" });
    }

    s.score += gained;
    s.throws--;
    
    const allDown = s.pins.every(p => !p.up);
    if (allDown) s.pins = initPins();
    
    s.ball = { x: 0, y: 0, vx: 0, vy: 0, active: false, spin: 0, mass: 12, rotX: 0, rotY: 0, r: BALL_RADIUS };
    s.state = "idle";
    
    updateHud(s);
    
    if (s.throws <= 0) {
      const isWin = s.score > 0;
      setHud({ score: s.score, throws: s.throws, phase: isWin ? "complete" : "over" });
      setTimeout(() => onOutcome?.({ type: isWin ? "complete" : "over", score: s.score }), 0);
    }
  }, [onOutcome]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 360, H = 520;
    
    if (!stateRef.current || stateRef.current.version !== STATE_VERSION) {
      stateRef.current = initState();
    }
    const s = stateRef.current;
    setHud({ score: s.score, throws: s.throws, phase: "playing" });

    // Perspective projection
    const project = (x, y, radius, heightOffset = 0) => {
      // y goes from -0.2 (player) to 1.5 (pit)
      const scale = 1.2 / (1.5 + y);
      const screenY = H - 50 - (y * 380 * scale) - (heightOffset * 300 * scale);
      const screenX = W / 2 + (x * 200 * scale);
      return { x: screenX, y: screenY, r: (radius || 0.05) * 300 * scale, scale };
    };

    const handlePtrDown = (e) => {
      if (s.state !== "idle" || s.throws <= 0) return;
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      
      // Fix: Scale the DOM coordinates to the canvas internal resolution
      const x = (pt.clientX - rect.left) * (W / rect.width);
      const y = (pt.clientY - rect.top) * (H / rect.height);
      
      const bp = project(s.ball.x, s.ball.y, s.ball.r || BALL_RADIUS);
      if (Math.hypot(x - bp.x, y - bp.y) < bp.r + 60) {
        s.state = "aiming";
        s.drag = { startX: x, startY: y, currentX: x, currentY: y };
      }
    };

    const handlePtrMove = (e) => {
      if (s.state !== "aiming" || !s.drag) return;
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      s.drag.currentX = (pt.clientX - rect.left) * (W / rect.width);
      s.drag.currentY = (pt.clientY - rect.top) * (H / rect.height);
    };

    const handlePtrUp = (e) => {
      if (s.state !== "aiming" || !s.drag) return;
      
      // Fix: SWIPE FORWARD (drag UP) instead of slingshot
      const dy = s.drag.startY - s.drag.currentY; // positive means swipe up
      const dx = s.drag.currentX - s.drag.startX; // positive means swipe right
      
      if (dy > 30) { 
        const power = Math.min(1.2, dy / 150); 
        s.ball.vy = 0.02 + (power * 0.05); // Forward speed
        s.ball.vx = (dx / 200) * 0.02; // Lateral aim
        s.ball.spin = (dx / dy) * 0.0015; // Spin/curve
        s.ball.active = true;
        s.state = "rolling";
      } else {
        s.state = "idle";
      }
      s.drag = null;
    };

    canvas.addEventListener("pointerdown", handlePtrDown);
    window.addEventListener("pointermove", handlePtrMove);
    window.addEventListener("pointerup", handlePtrUp);
    canvas.addEventListener("touchstart", handlePtrDown, {passive: false});
    window.addEventListener("touchmove", handlePtrMove, {passive: false});

    let frame;
    let lastKnockedCount = 0;
    let resetTimer = 0;

    const resolveCollision = (a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < a.r + b.r) {
        const overlap = (a.r + b.r) - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        
        const massRatioA = b.mass || 1;
        const massRatioB = a.mass || 1;
        const totalMass = massRatioA + massRatioB;
        
        a.x -= nx * overlap * (massRatioA / totalMass);
        a.y -= ny * overlap * (massRatioA / totalMass);
        b.x += nx * overlap * (massRatioB / totalMass);
        b.y += ny * overlap * (massRatioB / totalMass);

        const kx = (a.vx - b.vx);
        const ky = (a.vy - b.vy);
        const p = 1.6 * (nx * kx + ny * ky) / totalMass; 
        
        a.vx -= p * massRatioA * nx;
        a.vy -= p * massRatioA * ny;
        b.vx += p * massRatioB * nx;
        b.vy += p * massRatioB * ny;
        
        if (b.mass === 1 && b.up) { 
          b.up = false; 
          b.vy += 0.05; // Knock back
          b.rotX = Math.random() - 0.5; // Wobble when fallen
          b.rotY = Math.random() - 0.5;
          s.cameraShake = Math.max(s.cameraShake, 6);
          playSound("hit", audioCtxRef);
          for(let i=0; i<6; i++) {
            s.particles.push({
              x: b.x, y: b.y,
              vx: (Math.random()-0.5)*0.04, vy: (Math.random()-0.5)*0.04,
              life: 1.0, size: 2.5
            });
          }
        }
        if (a.mass === 1 && a.up) {
          a.up = false;
          a.rotX = Math.random() - 0.5;
          a.rotY = Math.random() - 0.5;
        }
      }
    };

    const loop = () => {
      frame = requestAnimationFrame(loop);
      
      // Physics
      if (s.state === "rolling") {
        s.ball.x += s.ball.vx;
        s.ball.y += s.ball.vy;
        s.ball.vx += s.ball.spin; 
        
        s.ball.rotX -= s.ball.vy * 10;
        s.ball.rotY += s.ball.vx * 10;
        
        s.rollSoundTimer++;
        if (s.rollSoundTimer > 12 && s.ball.y < 1.3) {
          playSound("roll", audioCtxRef);
          s.rollSoundTimer = 0;
        }

        s.ball.vx *= 0.99;
        s.ball.vy *= 0.995;

        // Gutters
        if (s.ball.x < -0.7) { s.ball.x = -0.7; s.ball.vx *= -0.4; }
        if (s.ball.x > 0.7) { s.ball.x = 0.7; s.ball.vx *= -0.4; }
        
        for (const p of s.pins) {
          if (p.up || Math.hypot(p.vx, p.vy) > 0.001) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.92;
            p.vy *= 0.92;
            
            if (p.x < -0.8 || p.x > 0.8 || p.y > 1.4) {
               p.vx = 0; p.vy = 0; p.up = false;
            }
            resolveCollision(s.ball, p);
          }
        }

        for (let i = 0; i < s.pins.length; i++) {
          for (let j = i + 1; j < s.pins.length; j++) {
            if (!s.pins[i].up || !s.pins[j].up || s.pins[i].y > 0.6) {
              resolveCollision(s.pins[i], s.pins[j]);
            }
          }
        }

        if (s.ball.y > 1.4 || (s.ball.vy < 0.001 && s.ball.y > 0.2)) {
          resetTimer++;
          if (resetTimer > 60) {
            s.state = "resetting";
            const knocked = s.pins.filter(p => !p.up).length;
            const newKnocked = knocked - lastKnockedCount;
            lastKnockedCount = knocked;
            resetTimer = 0;
            finishThrow(newKnocked);
          }
        }
      } else if (s.state === "idle") {
        lastKnockedCount = s.pins.filter(p => !p.up).length;
      }

      s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.04; });
      s.particles = s.particles.filter(p => p.life > 0);
      s.messages.forEach(m => m.life--);
      s.messages = s.messages.filter(m => m.life > 0);

      // --- RENDER ---
      ctx.save();
      if (s.cameraShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.cameraShake, (Math.random() - 0.5) * s.cameraShake);
        s.cameraShake *= 0.8;
        if (s.cameraShake < 0.5) s.cameraShake = 0;
      }

      // Background Arcade Environment (Deeper, darker cyber theme)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#02000d");
      bgGrad.addColorStop(0.3, "#10002b");
      bgGrad.addColorStop(1, "#000000");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
      
      const horizonY = project(0, 1.4, 0).y;
      
      // Neon Horizon Glow
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, horizonY); ctx.lineTo(W, horizonY); ctx.stroke();
      ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 15; ctx.stroke(); ctx.shadowBlur = 0;

      // Realistic Glossy Wood/Cyber Lane
      const laneGrad = ctx.createLinearGradient(0, H, 0, horizonY);
      laneGrad.addColorStop(0, "#311059"); 
      laneGrad.addColorStop(0.6, "#15002b");
      laneGrad.addColorStop(1, "#0a001a");
      ctx.fillStyle = laneGrad;
      ctx.beginPath();
      const tl = project(-0.7, 1.4, 0);
      const tr = project(0.7, 1.4, 0);
      const bl = project(-0.7, -0.1, 0);
      const br = project(0.7, -0.1, 0);
      ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
      ctx.fill();

      // Lane Edge Lasers
      ctx.strokeStyle = "#e91e63"; 
      ctx.lineWidth = 3;
      ctx.shadowColor = "#e91e63";
      ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(bl.x, bl.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      ctx.shadowBlur = 0;

      const drawObject = (obj, isReflect) => {
        if (obj.type === 'pin') {
          if (!obj.up && !isReflect) return; 
          if (!obj.up && isReflect) return; // Don't draw reflections for fallen pins
          
          const p = project(obj.x, obj.y, obj.r || PIN_RADIUS);
          if (p.y < horizonY) return;
          
          ctx.save();
          if (isReflect) {
            ctx.globalAlpha = 0.25;
            ctx.translate(p.x, p.y + p.r*3.5);
            ctx.scale(1, -1);
            ctx.translate(-p.x, -p.y);
          }
          
          if (!isReflect) {
            // Shadow
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r*0.2, p.r*1.1, p.r*0.4, 0, 0, Math.PI*2); ctx.fill();
          }

          // Detailed Realistic Pin Shape
          const pinGrad = ctx.createLinearGradient(p.x - p.r*0.8, 0, p.x + p.r*0.8, 0);
          pinGrad.addColorStop(0, "#9ea7aa");
          pinGrad.addColorStop(0.3, "#ffffff");
          pinGrad.addColorStop(0.8, "#e0e4e6");
          pinGrad.addColorStop(1, "#78909c");
          
          ctx.fillStyle = pinGrad;
          ctx.beginPath();
          ctx.moveTo(p.x - p.r * 0.5, p.y); // Base
          ctx.bezierCurveTo(p.x - p.r * 0.8, p.y - p.r * 0.5, p.x - p.r * 0.9, p.y - p.r * 1.5, p.x - p.r * 0.5, p.y - p.r * 2.2); // Belly to neck
          ctx.bezierCurveTo(p.x - p.r * 0.3, p.y - p.r * 2.6, p.x - p.r * 0.3, p.y - p.r * 3.2, p.x, p.y - p.r * 3.6); // Neck to head
          ctx.bezierCurveTo(p.x + p.r * 0.3, p.y - p.r * 3.2, p.x + p.r * 0.3, p.y - p.r * 2.6, p.x + p.r * 0.5, p.y - p.r * 2.2); // Head to neck
          ctx.bezierCurveTo(p.x + p.r * 0.9, p.y - p.r * 1.5, p.x + p.r * 0.8, p.y - p.r * 0.5, p.x + p.r * 0.5, p.y); // Belly to base
          ctx.fill();
          
          // Realistic Red Stripes
          ctx.strokeStyle = "#d32f2f";
          ctx.lineWidth = p.r * 0.3;
          ctx.beginPath(); ctx.moveTo(p.x - p.r*0.4, p.y - p.r*2.1); ctx.lineTo(p.x + p.r*0.4, p.y - p.r*2.1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p.x - p.r*0.35, p.y - p.r*1.5); ctx.lineTo(p.x + p.r*0.35, p.y - p.r*1.5); ctx.stroke();

          ctx.restore();
        } else if (obj.type === 'ball') {
          const p = project(obj.x, obj.y, obj.r || BALL_RADIUS);
          if (p.y < horizonY) return;

          ctx.save();
          if (isReflect) {
            ctx.globalAlpha = 0.2;
            ctx.translate(p.x, p.y + p.r*1.5);
            ctx.scale(1, -1);
            ctx.translate(-p.x, -p.y);
          }

          if (!isReflect) {
             ctx.fillStyle = "rgba(0,0,0,0.8)";
             ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r*0.8, p.r*1.1, p.r*0.4, 0, 0, Math.PI*2); ctx.fill();
          }

          const bGrad = ctx.createRadialGradient(p.x - p.r*0.3, p.y - p.r*0.3, p.r*0.1, p.x, p.y, p.r);
          bGrad.addColorStop(0, "#e040fb"); // Brighter highlight
          bGrad.addColorStop(0.3, "#aa00ff");
          bGrad.addColorStop(1, "#311b92"); // Deep core
          ctx.fillStyle = bGrad;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
          
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.beginPath(); ctx.arc(p.x - p.r*0.4, p.y - p.r*0.4, p.r*0.15, 0, Math.PI*2); ctx.fill();

          if (!isReflect) {
            ctx.save();
            ctx.translate(p.x, p.y);
            const hx = Math.sin(obj.rotY || 0) * p.r * 0.5;
            const hy = Math.sin(obj.rotX || 0) * p.r * 0.5;
            if (Math.cos(obj.rotY || 0) > 0 && Math.cos(obj.rotX || 0) > 0) {
               ctx.fillStyle = "#120024";
               ctx.beginPath(); ctx.arc(hx, hy - p.r*0.2, p.r*0.12, 0, Math.PI*2); ctx.fill();
               ctx.beginPath(); ctx.arc(hx - p.r*0.2, hy + p.r*0.1, p.r*0.12, 0, Math.PI*2); ctx.fill();
               ctx.beginPath(); ctx.arc(hx + p.r*0.2, hy + p.r*0.1, p.r*0.12, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
          }
          ctx.restore();
        }
      };

      const objects = [
        ...s.pins.map(p => ({ ...p, type: 'pin' })),
        { ...s.ball, type: 'ball' }
      ].sort((a, b) => b.y - a.y); 

      objects.forEach(o => drawObject(o, true));
      objects.forEach(o => drawObject(o, false));

      // Draw fallen pins flat
      s.pins.forEach(obj => {
         if (!obj.up) {
            const p = project(obj.x, obj.y, obj.r || PIN_RADIUS);
            ctx.save();
            ctx.translate(p.x, p.y);
            // Draw a simplified knocked-over cylinder shape
            ctx.fillStyle = "rgba(120, 144, 156, 0.9)"; // Solid grey body
            ctx.rotate(obj.rotX * 2);
            ctx.beginPath(); ctx.ellipse(0, 0, p.r*1.4, p.r*0.5, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "rgba(229, 57, 53, 0.8)"; // Red stripe
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-p.r*0.5, -p.r*0.3); ctx.lineTo(-p.r*0.5, p.r*0.3); ctx.stroke();
            ctx.restore();
         }
      });

      s.particles.forEach(p => {
         const pp = project(p.x, p.y, 0);
         ctx.fillStyle = "#ffeb3b";
         ctx.globalAlpha = p.life;
         ctx.beginPath(); ctx.arc(pp.x, pp.y, p.size * pp.scale * 10, 0, Math.PI*2); ctx.fill();
         ctx.globalAlpha = 1;
      });

      // Aiming UI: Swipe FORWARD prediction
      if (s.state === "aiming" && s.drag) {
         const dy = Math.max(0, s.drag.startY - s.drag.currentY); // Swipe UP is positive power
         const dx = s.drag.currentX - s.drag.startX;
         
         if (dy > 10) {
            const power = Math.min(1.2, dy / 150);
            const initVx = (dx / 200) * 0.02;
            const initVy = 0.02 + (power * 0.05);
            const spin = (dx / dy) * 0.0015;
            
            ctx.strokeStyle = `rgba(0, 229, 255, ${Math.min(1, power)})`;
            ctx.lineWidth = 3 + power * 2;
            ctx.setLineDash([15, 10]);
            ctx.lineDashOffset = -s.tick * 2;
            ctx.beginPath();
            
            let px = s.ball.x;
            let py = s.ball.y;
            let pvx = initVx;
            const pp = project(px, py, 0);
            ctx.moveTo(pp.x, pp.y);
            
            for(let i=0; i<30; i++) {
               px += pvx;
               py += initVy;
               pvx += spin;
               pvx *= 0.99;
               if (px < -0.7 || px > 0.7) pvx *= -0.5;
               const nextP = project(px, py, 0);
               ctx.lineTo(nextP.x, nextP.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = `rgba(0, 229, 255, ${Math.min(1, power)})`;
            const arrowP = project(px, py, 0);
            ctx.beginPath(); ctx.moveTo(arrowP.x, arrowP.y - 5); ctx.lineTo(arrowP.x - 8, arrowP.y + 10); ctx.lineTo(arrowP.x + 8, arrowP.y + 10); ctx.fill();
         }
      }

      s.messages.forEach(m => {
         ctx.save();
         ctx.globalAlpha = Math.min(1, m.life / 20);
         ctx.fillStyle = m.color;
         ctx.font = `900 ${m.scale * 24}px sans-serif`;
         ctx.textAlign = "center";
         ctx.shadowColor = m.color;
         ctx.shadowBlur = 15;
         ctx.fillText(m.text, W/2, H/2 - (100 - m.life));
         ctx.restore();
      });

      ctx.restore(); 
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", handlePtrDown);
      window.removeEventListener("pointermove", handlePtrMove);
      window.removeEventListener("pointerup", handlePtrUp);
      canvas.removeEventListener("touchstart", handlePtrDown);
      window.removeEventListener("touchmove", handlePtrMove);
    };
  }, [finishThrow]);

  const restart = () => {
    stateRef.current = null; 
    setHud({ score: 0, throws: 3, phase: "playing" });
  };

  return (
    <GameShell title="Veloop Bowling" score={hud.score} level={1}
      extraHud={<span id="be-throws" style={{ color: "#64b5f6" }}>🎳 {hud.throws} left</span>}
      phase={hud.phase} onPause={()=>{}} onResume={()=>{}} onRestart={restart}>
      <div style={{
        border: "2px solid #00e5ff",
        boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)",
        borderRadius: "16px",
        padding: "4px",
        margin: "0 auto",
        width: "100%",
        maxWidth: "min(420px, calc(80vh * 360 / 520))",
        backgroundColor: "#050014"
      }}>
        <canvas ref={canvasRef} width={360} height={520}
          style={{ width: "100%", height: "auto", display: "block", touchAction: "none", borderRadius: 12 }} />
      </div>
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", textAlign: "center", padding: "12px 0 0" }}>
        Swipe FORWARD to aim and set power.
      </p>
    </GameShell>
  );
}
