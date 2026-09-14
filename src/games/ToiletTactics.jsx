import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

export function ToiletTactics({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const phaseRef = useRef("playing");
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1 });
  const [phase, setPhase] = useState("playing");

  function initState() {
    return {
      score: 0, lives: 3, level: 1, tick: 0,
      foes: [], particles: [], 
      toiletWaterOffset: 0
    };
  }

  useEffect(() => {
    if (!reviveSignal) return;
    if (stateRef.current) stateRef.current.lives = Math.max(stateRef.current.lives, 1);
    phaseRef.current = "playing";
    setPhase("playing");
    setHud(h => ({ ...h, lives: stateRef.current?.lives ?? 1 }));
  }, [reviveSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 360, H = 520;
    
    // Set internal resolution
    canvas.width = W;
    canvas.height = H;
    
    const s = initState();
    stateRef.current = s;

    const onPtr = (e) => {
      if (phaseRef.current !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const x = (pt.clientX - rect.left) * scaleX;
      const y = (pt.clientY - rect.top) * scaleY;
      
      let hit = false;
      s.foes = s.foes.filter(f => {
        if (hit) return true;
        const dist = Math.hypot(f.x - x, f.y - y);
        if (dist < f.r + 50) { // massive hitbox for smooth tapping
          hit = true;
          // Spawn green toxic splash particles
          for (let i = 0; i < 15; i++) {
             s.particles.push({
               x: f.x, y: f.y,
               vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
               life: 1.0, color: Math.random() > 0.5 ? "#76ff03" : "#1de9b6" // toxic green/cyan
             });
          }
          return false; // remove foe
        }
        return true;
      });

      if (hit) {
        s.score += 15 + s.level * 3;
        const target = 150 + s.level * 100;
        if (s.score >= target) {
          s.level++;
          if (s.level > 5) {
            phaseRef.current = "complete"; setPhase("complete");
            setTimeout(() => onOutcome?.({ type: "complete", score: s.score }), 0);
          }
        }
        setHud({ score: s.score, lives: s.lives, level: s.level });
      }
    };
    canvas.addEventListener("pointerdown", onPtr);

    let frame;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (phaseRef.current !== "playing") return;
      s.tick++;
      
      // Background (Dark bathroom tile style)
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#1c1c1c";
      for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
      for (let i = 0; i < H; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

      // Spawn foes (Bacteria)
      const spawnRate = Math.max(35, 70 - s.level * 6);
      if (s.tick % spawnRate === 0) {
        s.foes.push({
           x: 30 + Math.random() * (W - 60), 
           y: -30, 
           r: 16 + Math.random() * 8,
           speed: 1.2 + s.level * 0.3 + Math.random() * 1.2,
           phaseOff: Math.random() * Math.PI * 2,
           wobble: Math.random() * 2 + 1
        });
      }

      // Update Foes
      const nextFoes = [];
      let leaked = 0;
      for (const f of s.foes) {
        f.y += f.speed;
        f.x += Math.sin(s.tick * 0.05 + f.phaseOff) * f.wobble;
        
        if (f.y > H - 80) { // Hit toilet
          leaked++;
          // Splash water particles
          for(let i=0; i<10; i++) {
             s.particles.push({
               x: f.x, y: H - 80,
               vx: (Math.random()-0.5)*4, vy: -Math.random()*6 - 2,
               life: 1.0, color: "#29b6f6" // water splash
             });
          }
        } else {
          nextFoes.push(f);
        }
      }
      s.foes = nextFoes;

      if (leaked > 0) {
         s.lives -= leaked;
         s.lives = Math.max(0, s.lives);
         setHud({ score: s.score, lives: s.lives, level: s.level });
         if (s.lives <= 0) {
            phaseRef.current = "over"; setPhase("over");
            setTimeout(() => onOutcome?.({ type: "over", score: s.score }), 0);
         }
      }

      // Draw Toilet (Bottom Center)
      ctx.save();
      ctx.translate(W/2, H - 30);
      
      // Porcelain base shadow
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 15;
      
      // Porcelain base
      const bowlGrad = ctx.createLinearGradient(0, -60, 0, 30);
      bowlGrad.addColorStop(0, "#f5f5f5");
      bowlGrad.addColorStop(1, "#9e9e9e");
      ctx.fillStyle = bowlGrad;
      ctx.beginPath();
      ctx.ellipse(0, -10, 80, 50, 0, 0, Math.PI*2);
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // Toilet Rim
      const rimGrad = ctx.createRadialGradient(0, -20, 60, 0, -20, 85);
      rimGrad.addColorStop(0, "#ffffff");
      rimGrad.addColorStop(1, "#e0e0e0");
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.ellipse(0, -20, 85, 40, 0, 0, Math.PI*2);
      ctx.fill();
      
      // Toilet Bowl Hole / Deep shadow inside
      ctx.fillStyle = "#212121"; 
      ctx.beginPath();
      ctx.ellipse(0, -18, 65, 30, 0, 0, Math.PI*2);
      ctx.fill();

      // Animated Water inside bowl
      s.toiletWaterOffset += 0.05;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, -18, 65, 30, 0, 0, Math.PI*2);
      ctx.clip(); // clip water strictly to inner bowl
      
      const waterGrad = ctx.createLinearGradient(0, -40, 0, 0);
      waterGrad.addColorStop(0, "#03a9f4");
      waterGrad.addColorStop(1, "#01579b");
      ctx.fillStyle = waterGrad;
      
      ctx.beginPath();
      ctx.moveTo(-65, -18);
      for(let x = -65; x <= 65; x += 5) {
         ctx.lineTo(x, -18 + Math.sin(x*0.05 + s.toiletWaterOffset) * 4);
      }
      ctx.lineTo(65, 12);
      ctx.lineTo(-65, 12);
      ctx.fill();
      ctx.restore(); // unclip

      // Inner Rim highlight for realism
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, -20, 75, 33, 0, 0, Math.PI*2);
      ctx.stroke();

      ctx.restore(); // restore toilet transform

      // Draw Particles (Both toxic splashes and water splashes)
      s.particles = s.particles.filter(p => p.life > 0);
      s.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.3; // Gravity for particles
        p.life -= 0.03;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, 2 + Math.max(0, p.life * 4), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw Foes (Toxic Bacteria)
      s.foes.forEach(f => {
         ctx.save();
         ctx.translate(f.x, f.y);
         ctx.rotate(s.tick * 0.02 + f.phaseOff);
         
         // Outer glowing aura
         const aura = ctx.createRadialGradient(0,0, f.r*0.5, 0,0, f.r*1.5);
         aura.addColorStop(0, "rgba(118, 255, 3, 0.6)");
         aura.addColorStop(1, "rgba(118, 255, 3, 0)");
         ctx.fillStyle = aura;
         ctx.beginPath(); ctx.arc(0,0, f.r*1.5, 0, Math.PI*2); ctx.fill();

         // Organic wobbly cell body
         ctx.fillStyle = "#00e676"; // green base
         ctx.beginPath();
         for(let i = 0; i <= Math.PI*2 + 0.1; i += Math.PI/4) {
            const rad = f.r + Math.sin(s.tick * 0.1 + i*2) * 3;
            if (i === 0) ctx.moveTo(Math.cos(i)*rad, Math.sin(i)*rad);
            else ctx.lineTo(Math.cos(i)*rad, Math.sin(i)*rad);
         }
         ctx.closePath();
         ctx.fill();
         ctx.strokeStyle = "#1b5e20";
         ctx.lineWidth = 2;
         ctx.stroke();

         // Nucleus/Eyes
         ctx.fillStyle = "#b71c1c";
         ctx.beginPath(); ctx.arc(-f.r*0.3, -f.r*0.2, f.r*0.25, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(f.r*0.3, -f.r*0.1, f.r*0.2, 0, Math.PI*2); ctx.fill();

         ctx.restore();
      });

    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", onPtr);
    };
  }, [onOutcome]);

  const restart = () => {
    stateRef.current = initState();
    phaseRef.current = "playing";
    setPhase("playing");
    setHud({ score: 0, lives: 3, level: 1 });
  };

  const togglePause = () => {
    const next = phaseRef.current === "paused" ? "playing" : "paused";
    phaseRef.current = next; setPhase(next);
  };

  return (
    <GameShell title="Toilet Tactics" score={hud.score} lives={hud.lives} level={hud.level}
      phase={phase} onPause={togglePause} onResume={togglePause} onRestart={restart}>
      <div style={{
        margin: "0 auto",
        width: "100%",
        maxWidth: "min(420px, calc(80vh * 360 / 520))",
        backgroundColor: "#050505",
        borderRadius: "16px",
        overflow: "hidden",
        border: "2px solid #333",
        boxShadow: "0 8px 32px rgba(0,255,100,0.1)"
      }}>
        <canvas ref={canvasRef}
          style={{ 
            width: "100%", 
            aspectRatio: "360 / 520",
            display: "block", 
            touchAction: "none"
          }} />
      </div>
      <p style={{ color: "rgba(200,180,140,0.6)", fontSize: "0.75rem", textAlign: "center", padding: "8px 0" }}>
        Tap the toxic bacteria to sanitize them!
      </p>
    </GameShell>
  );
}
