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
    osc.frequency.setValueAtTime(50, actx.currentTime);
    gain.gain.setValueAtTime(0, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, actx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.5);
    osc.start();
    osc.stop(actx.currentTime + 0.5);
  } else if (type === "strike") {
    osc.type = "square";
    osc.frequency.setValueAtTime(400, actx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, actx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(800, actx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.4, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.8);
    osc.start();
    osc.stop(actx.currentTime + 0.8);
  } else if (type === "gutter") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, actx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, actx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.5);
    osc.start();
    osc.stop(actx.currentTime + 0.5);
  }
};

// Physics and Projection
const PIN_RADIUS = 0.055;
const BALL_RADIUS = 0.11;
const STATE_VERSION = 4; // Bump version to clear cache

export function BowlExa({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [hud, setHud] = useState({ score: 0, throws: 3, phase: "playing" });

  const initPins = () => {
    // Heavy pins for realism, tight triangle
    return [
      { id: 0, x: 0, y: 0.8, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 2.5, rotX: 0, rotY: 0 },
      { id: 1, x: -0.12, y: 0.9, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 2.5, rotX: 0, rotY: 0 },
      { id: 2, x: 0.12, y: 0.9, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 2.5, rotX: 0, rotY: 0 },
      { id: 3, x: -0.24, y: 1.0, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 2.5, rotX: 0, rotY: 0 },
      { id: 4, x: 0, y: 1.0, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 2.5, rotX: 0, rotY: 0 },
      { id: 5, x: 0.24, y: 1.0, vx: 0, vy: 0, up: true, r: PIN_RADIUS, mass: 2.5, rotX: 0, rotY: 0 },
    ];
  };

  const initState = () => ({
    version: STATE_VERSION,
    pins: initPins(),
    ball: { x: 0, y: 0, vx: 0, vy: 0, active: false, spin: 0, mass: 14, rotX: 0, rotY: 0, r: BALL_RADIUS, inGutter: false },
    score: 0,
    throws: 3,
    state: "idle", 
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
    
    let gained = knockedCount * 15;
    if (knockedCount === 6) {
      gained += 50; // STRIKE bonus
      playSound("strike", audioCtxRef);
      s.messages.push({ text: "STRIKE!", life: 120, scale: 2.5, color: "#ffeb3b" });
    } else if (knockedCount > 0) {
      s.messages.push({ text: `+${gained}`, life: 80, scale: 1.5, color: "#00e5ff" });
    } else if (s.ball.inGutter) {
      s.messages.push({ text: "GUTTERBALL", life: 80, scale: 1.5, color: "#9e9e9e" });
    }

    s.score += gained;
    s.throws--;
    
    const allDown = s.pins.every(p => !p.up);
    if (allDown) s.pins = initPins();
    
    s.ball = { x: 0, y: 0, vx: 0, vy: 0, active: false, spin: 0, mass: 14, rotX: 0, rotY: 0, r: BALL_RADIUS, inGutter: false };
    s.state = "idle";
    
    updateHud(s);
    
    if (s.throws <= 0) {
      const isWin = s.score > 50; // Need a decent score to win
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

    const project = (x, y, radius, heightOffset = 0) => {
      const scale = 1.2 / (1.5 + y);
      const screenY = H - 30 - (y * 550 * scale) - (heightOffset * 300 * scale);
      const screenX = W / 2 + (x * 200 * scale);
      return { x: screenX, y: screenY, r: (radius || 0.05) * 300 * scale, scale };
    };

    const horizonY = project(0, 1.4, 0).y;

    // Cache Gradients for Performance (Fixes Lag)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#1c1917"); 
    bgGrad.addColorStop(1, "#0a0a0a");

    const laneGrad = ctx.createLinearGradient(0, H, 0, horizonY);
    laneGrad.addColorStop(0, "#e8a96d"); // brighter maple highlight
    laneGrad.addColorStop(0.5, "#a86b32");
    laneGrad.addColorStop(1, "#29180b");

    const pinGrad = ctx.createLinearGradient(-30, 0, 30, 0); 
    pinGrad.addColorStop(0, "#8a9499"); pinGrad.addColorStop(0.3, "#ffffff");
    pinGrad.addColorStop(0.8, "#dbe1e3"); pinGrad.addColorStop(1, "#5b6d75");

    const ballGrad = ctx.createRadialGradient(-10, -10, 3, 0, 0, 33);
    ballGrad.addColorStop(0, "#ef5350"); ballGrad.addColorStop(0.4, "#8e0000"); ballGrad.addColorStop(1, "#1a0000");

    const spotlightGrad = ctx.createRadialGradient(W/2, H/3, 50, W/2, H/3, 350);
    spotlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    spotlightGrad.addColorStop(1, "rgba(0, 0, 0, 0.45)");

    const handlePtrDown = (e) => {
      if (s.state !== "idle" || s.throws <= 0) return;
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
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
      
      const dy = s.drag.startY - s.drag.currentY; 
      const dx = s.drag.currentX - s.drag.startX; 
      
      if (dy > 30) { 
        // Realism: Power requires faster swipe, curve is more sensitive
        const power = Math.min(1.4, dy / 120); 
        s.ball.vy = 0.015 + (power * 0.05); 
        s.ball.vx = (dx / 250) * 0.025; 
        s.ball.spin = (dx / dy) * 0.002; 
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
        const p = 1.4 * (nx * kx + ny * ky) / totalMass; // Slightly lower restitution for realistic heavy thud
        
        a.vx -= p * massRatioA * nx;
        a.vy -= p * massRatioA * ny;
        b.vx += p * massRatioB * nx;
        b.vy += p * massRatioB * ny;
        
        if (b.mass !== a.mass) { // Ball hitting pin
          if (b.mass < a.mass && b.up) {
            b.up = false; b.vy += 0.08; b.rotX = Math.random() - 0.5; b.rotY = Math.random() - 0.5;
            s.cameraShake = Math.max(s.cameraShake, 8);
            playSound("hit", audioCtxRef);
            for(let i=0; i<8; i++) s.particles.push({ x: b.x, y: b.y, vx: (Math.random()-0.5)*0.06, vy: (Math.random()-0.5)*0.06, life: 1.0, size: 3 });
          } else if (a.mass < b.mass && a.up) {
            a.up = false; a.vy += 0.08; a.rotX = Math.random() - 0.5; a.rotY = Math.random() - 0.5;
            s.cameraShake = Math.max(s.cameraShake, 8);
            playSound("hit", audioCtxRef);
            for(let i=0; i<8; i++) s.particles.push({ x: a.x, y: a.y, vx: (Math.random()-0.5)*0.06, vy: (Math.random()-0.5)*0.06, life: 1.0, size: 3 });
          }
        } else if (a.up && b.up) {
           // Pin hitting pin - chain reaction
           a.up = false; b.up = false;
           playSound("hit", audioCtxRef);
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
        
        s.ball.rotX -= s.ball.vy * 8;
        s.ball.rotY += s.ball.vx * 8;
        
        if (!s.ball.inGutter) {
           s.rollSoundTimer++;
           if (s.rollSoundTimer > 10 && s.ball.y < 1.3) {
             playSound("roll", audioCtxRef);
             s.rollSoundTimer = 0;
           }
        }

        // Realistic friction (oil pattern: slick in middle, dry on edges)
        const oilGrip = Math.abs(s.ball.x) > 0.4 ? 0.98 : 0.995;
        s.ball.vx *= oilGrip;
        s.ball.vy *= 0.995;

        // Gutters - Punishing Realism
        if (!s.ball.inGutter && (s.ball.x < -0.7 || s.ball.x > 0.7)) {
           s.ball.inGutter = true;
           s.ball.x = s.ball.x < 0 ? -0.75 : 0.75;
           s.ball.vx = 0;
           s.ball.spin = 0;
           s.cameraShake = 4;
           playSound("gutter", audioCtxRef);
        }
        if (s.ball.inGutter) {
           s.ball.vy *= 0.98; // slow down in gutter
        }
        
        for (const p of s.pins) {
          if (p.up || Math.hypot(p.vx, p.vy) > 0.001) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.92;
            p.vy *= 0.92;
            
            // Pin falls into pit or gutter
            if (p.x < -0.8 || p.x > 0.8 || p.y > 1.4) {
               p.vx = 0; p.vy = 0; p.up = false;
            }
            if (!s.ball.inGutter) resolveCollision(s.ball, p);
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

      // Realistic Ambient Environment 
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#1c1917"); 
      bgGrad.addColorStop(1, "#0a0a0a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
      
      const horizonY = project(0, 1.4, 0).y;
      
      // Wood Paneling Back Wall
      ctx.fillStyle = "#292524";
      ctx.fillRect(0, horizonY - 120, W, 120);
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 2;
      for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, horizonY - 120); ctx.lineTo(i, horizonY); ctx.stroke(); }
      
      // Shadow / Pit
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, horizonY - 10, W, 20);

      // Realistic Glossy Wood Lane
      const laneGrad = ctx.createLinearGradient(0, H, 0, horizonY);
      laneGrad.addColorStop(0, "#d9975b"); // Light maple
      laneGrad.addColorStop(0.5, "#a86b32");
      laneGrad.addColorStop(1, "#362210");
      ctx.fillStyle = laneGrad;
      ctx.beginPath();
      const tl = project(-0.7, 1.4, 0);
      const tr = project(0.7, 1.4, 0);
      const bl = project(-0.7, -0.1, 0);
      const br = project(0.7, -0.1, 0);
      ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
      ctx.fill();

      // Atmospheric Spotlight Overlay
      const spotlightGrad = ctx.createRadialGradient(W/2, H/3, 50, W/2, H/3, 350);
      spotlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.12)");
      spotlightGrad.addColorStop(1, "rgba(0, 0, 0, 0.45)");
      ctx.fillStyle = spotlightGrad;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
      ctx.fill();

      // Wood plank lines for realism
      ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let w = -0.68; w <= 0.68; w += 0.04) {
         const t = project(w, 1.4, 0);
         const b = project(w, -0.1, 0);
         ctx.moveTo(t.x, t.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      
      // Lane arrows (Aiming markers)
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      for(let aw of [-0.3, 0, 0.3]) {
         const ap = project(aw, -0.05, 0);
         ctx.beginPath(); ctx.moveTo(ap.x, ap.y - 10); ctx.lineTo(ap.x - 5, ap.y + 5); ctx.lineTo(ap.x + 5, ap.y + 5); ctx.fill();
      }

      // Realistic Gutters (Dark grey/black plastic)
      ctx.strokeStyle = "#1a1a1a"; 
      ctx.lineWidth = 18; 
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(tl.x - 8, tl.y); ctx.lineTo(bl.x - 14, bl.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tr.x + 8, tr.y); ctx.lineTo(br.x + 14, br.y); ctx.stroke();

      const drawObject = (obj, isReflect) => {
        if (obj.type === 'pin') {
          if (!obj.up) return; 
          
          const p = project(obj.x, obj.y, obj.r || PIN_RADIUS);
          if (p.y < horizonY) return;
          
          ctx.save();
          if (isReflect) {
            ctx.globalAlpha = 0.2;
            ctx.translate(p.x, p.y + p.r*3.2);
            ctx.scale(1, -0.8);
            ctx.translate(-p.x, -p.y);
          }
          
          if (!isReflect) {
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
          ctx.moveTo(p.x - p.r * 0.5, p.y); 
          ctx.bezierCurveTo(p.x - p.r * 0.8, p.y - p.r * 0.5, p.x - p.r * 0.9, p.y - p.r * 1.5, p.x - p.r * 0.5, p.y - p.r * 2.2); 
          ctx.bezierCurveTo(p.x - p.r * 0.3, p.y - p.r * 2.6, p.x - p.r * 0.3, p.y - p.r * 3.2, p.x, p.y - p.r * 3.6); 
          ctx.bezierCurveTo(p.x + p.r * 0.3, p.y - p.r * 3.2, p.x + p.r * 0.3, p.y - p.r * 2.6, p.x + p.r * 0.5, p.y - p.r * 2.2); 
          ctx.bezierCurveTo(p.x + p.r * 0.9, p.y - p.r * 1.5, p.x + p.r * 0.8, p.y - p.r * 0.5, p.x + p.r * 0.5, p.y); 
          ctx.fill();
          
          ctx.strokeStyle = "#d32f2f";
          ctx.lineWidth = Math.max(1, p.r * 0.3);
          ctx.beginPath(); ctx.moveTo(p.x - p.r*0.4, p.y - p.r*2.1); ctx.lineTo(p.x + p.r*0.4, p.y - p.r*2.1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p.x - p.r*0.35, p.y - p.r*1.5); ctx.lineTo(p.x + p.r*0.35, p.y - p.r*1.5); ctx.stroke();

          ctx.restore();
        } else if (obj.type === 'ball') {
          // If ball in gutter, drop it down slightly
          const gutterDrop = obj.inGutter ? -0.05 : 0;
          const p = project(obj.x, obj.y, obj.r || BALL_RADIUS, gutterDrop);
          if (p.y < horizonY) return;

          ctx.save();
          if (isReflect) {
            if (obj.inGutter) { ctx.restore(); return; } // no reflection in gutter
            ctx.globalAlpha = 0.2;
            ctx.translate(p.x, p.y + p.r*1.5);
            ctx.scale(1, -1);
            ctx.translate(-p.x, -p.y);
          }

          if (!isReflect && !obj.inGutter) {
             ctx.fillStyle = "rgba(0,0,0,0.8)";
             ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r*0.8, p.r*1.1, p.r*0.4, 0, 0, Math.PI*2); ctx.fill();
          }

          // Realistic marbled bowling ball (Deep Crimson/Black)
          const bGrad = ctx.createRadialGradient(p.x - p.r*0.3, p.y - p.r*0.3, p.r*0.1, p.x, p.y, p.r);
          bGrad.addColorStop(0, "#e53935"); 
          bGrad.addColorStop(0.4, "#8e0000");
          bGrad.addColorStop(1, "#1a0000"); 
          ctx.fillStyle = bGrad;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
          
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.beginPath(); ctx.arc(p.x - p.r*0.4, p.y - p.r*0.4, p.r*0.15, 0, Math.PI*2); ctx.fill();

          if (!isReflect) {
            ctx.save();
            ctx.translate(p.x, p.y);
            // 3D rotation projection for holes
            const hx = Math.sin(obj.rotY || 0) * p.r * 0.6;
            const hy = Math.sin(obj.rotX || 0) * p.r * 0.6;
            
            // Only draw holes if they are facing the camera (Z > 0)
            const zFront = Math.cos(obj.rotX || 0) * Math.cos(obj.rotY || 0);
            if (zFront > 0) {
               ctx.fillStyle = "#090014";
               const hr = p.r * 0.12 * zFront; // Scale holes by depth
               ctx.beginPath(); ctx.arc(hx, hy - p.r*0.2, hr, 0, Math.PI*2); ctx.fill();
               ctx.beginPath(); ctx.arc(hx - p.r*0.2, hy + p.r*0.1, hr, 0, Math.PI*2); ctx.fill();
               ctx.beginPath(); ctx.arc(hx + p.r*0.2, hy + p.r*0.1, hr, 0, Math.PI*2); ctx.fill();
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

      // Draw fallen pins flat (rotated to floor perspective)
      s.pins.forEach(obj => {
         if (!obj.up) {
            const p = project(obj.x, obj.y, obj.r || PIN_RADIUS);
            ctx.save();
            ctx.translate(p.x, p.y);
            
            // Fast drop shadow for fallen pin
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.beginPath(); ctx.ellipse(p.r*0.2, p.r*0.4, p.r*1.5, p.r*0.6, obj.rotX * 2, 0, Math.PI*2); ctx.fill();
            
            // Draw fallen pin
            ctx.rotate(Math.PI / 2 + obj.rotX * 2);
            ctx.scale(1, 0.6); // squash for floor perspective
            
            const fallenGrad = ctx.createLinearGradient(-p.r*0.8, 0, p.r*0.8, 0);
            fallenGrad.addColorStop(0, "#9ea7aa"); fallenGrad.addColorStop(0.3, "#ffffff");
            fallenGrad.addColorStop(0.8, "#e0e4e6"); fallenGrad.addColorStop(1, "#78909c");
            
            ctx.fillStyle = fallenGrad;
            ctx.beginPath();
            ctx.moveTo(-p.r * 0.5, 0); 
            ctx.bezierCurveTo(-p.r * 0.8, -p.r * 0.5, -p.r * 0.9, -p.r * 1.5, -p.r * 0.5, -p.r * 2.2); 
            ctx.bezierCurveTo(-p.r * 0.3, -p.r * 2.6, -p.r * 0.3, -p.r * 3.2, 0, -p.r * 3.6); 
            ctx.bezierCurveTo(p.r * 0.3, -p.r * 3.2, p.r * 0.3, -p.r * 2.6, p.r * 0.5, -p.r * 2.2); 
            ctx.bezierCurveTo(p.r * 0.9, -p.r * 1.5, p.r * 0.8, -p.r * 0.5, p.r * 0.5, 0); 
            ctx.fill();
            
            ctx.strokeStyle = "#d32f2f";
            ctx.lineWidth = Math.max(1, p.r * 0.3);
            ctx.beginPath(); ctx.moveTo(-p.r*0.4, -p.r*2.1); ctx.lineTo(p.r*0.4, -p.r*2.1); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-p.r*0.35, -p.r*1.5); ctx.lineTo(p.r*0.35, -p.r*1.5); ctx.stroke();
            
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

      // Aiming UI
      if (s.state === "aiming" && s.drag) {
         const dy = Math.max(0, s.drag.startY - s.drag.currentY); 
         const dx = s.drag.currentX - s.drag.startX;
         
         if (dy > 10) {
            const power = Math.min(1.4, dy / 120);
            const initVx = (dx / 250) * 0.025;
            const initVy = 0.015 + (power * 0.05);
            const spin = (dx / dy) * 0.002;
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.6, power)})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.lineDashOffset = -(Date.now() % 1000) / 10;
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
               if (px < -0.7 || px > 0.7) pvx = 0; // gutters
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
         ctx.font = `900 ${m.scale * 24}px sans-serif`;
         ctx.textAlign = "center";
         
         // Manual high-performance drop shadow
         ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
         ctx.fillText(m.text, W/2 + 4, H/2 - (100 - m.life) + 4);
         
         // Actual text
         ctx.fillStyle = m.color;
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
        border: "4px solid #3e2723",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)",
        borderRadius: "8px",
        padding: "4px",
        margin: "0 auto",
        width: "100%",
        maxWidth: "min(420px, calc(80vh * 360 / 520))",
        backgroundColor: "#1c1917"
      }}>
        <canvas ref={canvasRef} width={360} height={520}
          style={{ width: "100%", height: "auto", display: "block", touchAction: "none", borderRadius: 12 }} />
      </div>
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", textAlign: "center", padding: "12px 0 0" }}>
        Swipe FORWARD. If you hit the gutters, you lose the ball!
      </p>
    </GameShell>
  );
}
