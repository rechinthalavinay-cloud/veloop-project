import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

export function Wormzy({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const phaseRef = useRef("playing");
  const levelRef = useRef(1);
  const [hud, setHud] = useState({ score: 0, level: 1 });
  const [phase, setPhase] = useState("playing");

  function initState(keepScore = 0) {
    const W = 360;
    const H = 480;
    return {
      score: keepScore, level: levelRef.current, tick: 0,
      head: { x: W / 2, y: H / 2, angle: -Math.PI / 2 },
      targetAngle: -Math.PI / 2,
      path: [], 
      length: 4, // Start small, must grow by eating
      speed: 3 + levelRef.current * 0.4,
      food: { x: Math.random() * (W - 40) + 20, y: Math.random() * (H - 40) + 20, color: "#64b5f6" },
      particles: [],
      pointer: { x: W / 2, y: H / 4, active: false }
    };
  }

  useEffect(() => {
    if (!reviveSignal) return;
    const s = stateRef.current;
    if (s) {
       // Just bump head away from wall if needed to give a chance
       const W = 360, H = 480;
       if (s.head.x < 20) s.head.x = 20;
       if (s.head.x > W-20) s.head.x = W-20;
       if (s.head.y < 20) s.head.y = 20;
       if (s.head.y > H-20) s.head.y = H-20;
       s.path = []; // clear path to avoid instant self collision on revive
    }
    phaseRef.current = "playing";
    setPhase("playing");
  }, [reviveSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 360, H = 480;
    canvas.width = W;
    canvas.height = H;

    if (!stateRef.current) stateRef.current = initState();
    const s = stateRef.current;
    setHud({ score: s.score, level: s.level });

    const updatePointer = (e) => {
      if (phaseRef.current !== "playing") return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      s.pointer.x = (pt.clientX - rect.left) * scaleX;
      s.pointer.y = (pt.clientY - rect.top) * scaleY;
      s.pointer.active = true;
    };

    const stopPointer = () => { s.pointer.active = false; };

    canvas.addEventListener("pointermove", updatePointer);
    canvas.addEventListener("pointerdown", updatePointer);
    window.addEventListener("pointerup", stopPointer);

    const onKey = (e) => {
      if (phaseRef.current !== "playing") return;
      const map = {
        ArrowUp: -Math.PI / 2, KeyW: -Math.PI / 2,
        ArrowDown: Math.PI / 2, KeyS: Math.PI / 2,
        ArrowLeft: Math.PI, KeyA: Math.PI,
        ArrowRight: 0, KeyD: 0
      };
      if (map[e.code] !== undefined) {
        e.preventDefault();
        s.targetAngle = map[e.code];
        s.pointer.active = false; // Disable pointer tracking so keyboard takes over
      }
    };
    window.addEventListener("keydown", onKey);

    const gameOver = () => {
      phaseRef.current = "over"; setPhase("over");
      setTimeout(() => onOutcome?.({ type: "over", score: s.score }), 0);
    };

    let frame;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (phaseRef.current !== "playing") return;
      s.tick++;

      // Update Target Angle
      if (s.pointer.active) {
        const dx = s.pointer.x - s.head.x;
        const dy = s.pointer.y - s.head.y;
        if (Math.hypot(dx, dy) > 10) {
          s.targetAngle = Math.atan2(dy, dx);
        }
      }

      // Smooth Rotation
      let diff = s.targetAngle - s.head.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      const turnSpeed = 0.15;
      if (Math.abs(diff) < turnSpeed) {
        s.head.angle = s.targetAngle;
      } else {
        s.head.angle += Math.sign(diff) * turnSpeed;
      }

      // Move Head
      s.head.x += Math.cos(s.head.angle) * s.speed;
      s.head.y += Math.sin(s.head.angle) * s.speed;

      // Update Path history for body segments to follow
      s.path.push({ x: s.head.x, y: s.head.y });
      const segmentSpacing = 5;
      const numSegments = Math.floor(s.length);
      const maxPathLen = (numSegments + 2) * segmentSpacing;
      if (s.path.length > maxPathLen) {
        s.path.shift();
      }

      // Check Food Collision
      const headRadius = 14;
      const distToFood = Math.hypot(s.head.x - s.food.x, s.head.y - s.food.y);
      if (distToFood < headRadius + 10) { // 10 is food radius
        s.score += 15 + s.level * 5;
        s.length += 3; // grow body
        
        // Burst particles
        for(let i=0; i<12; i++) {
          s.particles.push({
            x: s.food.x, y: s.food.y, color: s.food.color,
            vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 1.0
          });
        }
        
        // New Food
        const colors = ["#64b5f6", "#f48fb1", "#81c784", "#ffb74d", "#ba68c8"];
        s.food = {
           x: Math.random() * (W - 40) + 20,
           y: Math.random() * (H - 40) + 20,
           color: colors[Math.floor(Math.random()*colors.length)]
        };

        // Level Up
        if (s.score >= s.level * 250) {
           levelRef.current++;
           if (levelRef.current > 5) {
             phaseRef.current = "complete"; setPhase("complete");
             setTimeout(() => onOutcome?.({ type: "complete", score: s.score + 500 }), 0);
             return;
           } else {
             s.level = levelRef.current;
             s.speed = 3 + s.level * 0.4;
           }
        }
        setHud({ score: s.score, level: s.level });
      }

      // Check Wall Collision
      if (s.head.x < headRadius || s.head.x > W - headRadius || 
          s.head.y < headRadius || s.head.y > H - headRadius) {
        gameOver();
        return;
      }

      // Check Self Collision
      // Start checking a few segments behind the head so it doesn't instantly bite itself
      for (let i = 8; i < numSegments; i++) {
        const pathIndex = s.path.length - 1 - (i * segmentSpacing);
        if (pathIndex >= 0 && pathIndex < s.path.length) {
          const pt = s.path[pathIndex];
          // Tapered collision radius
          const sizeRatio = 1 - (i / numSegments);
          const radius = 4 + (10 * sizeRatio);
          if (Math.hypot(s.head.x - pt.x, s.head.y - pt.y) < (headRadius + radius) * 0.6) {
            gameOver();
            return;
          }
        }
      }

      // RENDER
      // Background
      const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W);
      bgGrad.addColorStop(0, "#1c2331");
      bgGrad.addColorStop(1, "#0a0a0f");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Draw Grid lines for depth
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
      for (let i = 0; i <= H; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

      // Draw Food
      ctx.save();
      ctx.translate(s.food.x, s.food.y);
      ctx.shadowColor = s.food.color;
      ctx.shadowBlur = 15;
      
      const fGrad = ctx.createRadialGradient(0,0,0, 0,0,10);
      fGrad.addColorStop(0, "#ffffff");
      fGrad.addColorStop(0.3, s.food.color);
      fGrad.addColorStop(1, "transparent");
      
      ctx.fillStyle = fGrad;
      const pulse = 1 + Math.sin(s.tick * 0.1) * 0.15;
      ctx.scale(pulse, pulse);
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
      ctx.restore();

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

      // Draw Worm Body
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 3;
      
      // Iterate backwards so tail is drawn under head
      for (let i = numSegments; i >= 0; i--) {
        const pathIndex = s.path.length - 1 - (i * segmentSpacing);
        if (pathIndex >= 0 && pathIndex < s.path.length) {
          const pt = s.path[pathIndex];
          const sizeRatio = 1 - (i / numSegments); // 1 at head, 0 at tail
          const radius = 4 + (10 * sizeRatio);
          
          const grad = ctx.createRadialGradient(pt.x - radius*0.3, pt.y - radius*0.3, 0, pt.x, pt.y, radius);
          grad.addColorStop(0, "#a5d6a7"); 
          grad.addColorStop(0.5, "#4caf50");
          grad.addColorStop(1, "#1b5e20"); 
          
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, radius, 0, Math.PI*2); ctx.fill();
        }
      }
      ctx.shadowColor = "transparent";

      // Draw Head Details (Eyes)
      ctx.save();
      ctx.translate(s.head.x, s.head.y);
      ctx.rotate(s.head.angle);
      
      // Eyes
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(6, -6, 4.5, 0, Math.PI*2); ctx.fill(); // Left
      ctx.beginPath(); ctx.arc(6, 6, 4.5, 0, Math.PI*2); ctx.fill();  // Right
      
      ctx.fillStyle = "#000000";
      ctx.beginPath(); ctx.arc(7, -6, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(7, 6, 2.5, 0, Math.PI*2); ctx.fill();
      
      ctx.restore();
    };

    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", updatePointer);
      canvas.removeEventListener("pointerdown", updatePointer);
      window.removeEventListener("pointerup", stopPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, onOutcome]);

  const restart = () => {
    levelRef.current = 1;
    stateRef.current = initState();
    phaseRef.current = "playing";
    setPhase("playing");
    setHud({ score: 0, level: 1 });
  };

  const togglePause = () => {
    const next = phaseRef.current === "paused" ? "playing" : "paused";
    phaseRef.current = next; setPhase(next);
  };

  return (
    <GameShell title="Wormzy" score={hud.score} level={hud.level}
      phase={phase} onPause={togglePause} onResume={togglePause} onRestart={restart}>
      <div style={{
        margin: "0 auto",
        width: "100%",
        maxWidth: "min(420px, calc(80vh * 360 / 480))",
        backgroundColor: "#050014",
        borderRadius: "16px",
        overflow: "hidden",
        border: "2px solid #222",
        boxShadow: "0 8px 32px rgba(76,175,80,0.15)"
      }}>
        <canvas ref={canvasRef}
          style={{ 
            width: "100%", 
            aspectRatio: "360 / 480",
            display: "block", 
            touchAction: "none"
          }} />
      </div>
      <p style={{ color: "rgba(200,180,140,0.6)", fontSize: "0.75rem", textAlign: "center", padding: "8px 0", margin: 0 }}>
        Drag to slither in any direction!
      </p>
    </GameShell>
  );
}
