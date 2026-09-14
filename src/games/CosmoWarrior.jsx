import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

export function CosmoWarrior({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1 });
  const [phase, setPhase] = useState("playing");
  const phaseRef = useRef("playing");

  function initState(keepStars) {
    return {
      score: 0, lives: 3, level: 1,
      x: 180, vx: 0, shake: 0, 
      shots: [], alienShots: [], 
      aliens: [], alienDir: 1,
      particles: [], debris: [], trail: [], tick: 0, cooldown: 0, keys: {},
      stars: keepStars || Array.from({ length: 80 }, () => ({
        x: Math.random() * 360, y: Math.random() * 520,
        r: Math.random() * 1.5 + 0.3, speed: Math.random() * 0.4 + 0.1,
      })),
      planets: [
        { x: 300, y: 450, r: 40, type: 'purple', rot: 0 },
        { x: 50, y: 150, r: 25, type: 'red', rot: 0.5 },
      ]
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
    const s = initState();
    stateRef.current = s;

    const onKey = (e) => {
      s.keys[e.code] = e.type === "keydown";
      if (e.code === "Space" && e.type === "keydown") {
        e.preventDefault();
        if (s.cooldown <= 0) { 
          s.shots.push({ x: s.x - 8, y: H - 60 }); 
          s.shots.push({ x: s.x + 8, y: H - 60 }); 
          s.cooldown = 8; 
        }
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    const onPtr = (e) => {
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      s.x = Math.max(10, Math.min(W - 10, ((pt.clientX - rect.left) / rect.width) * W));
      if ((e.type === "pointerdown") && s.cooldown <= 0) {
        s.shots.push({ x: s.x - 8, y: H - 60 }); 
        s.shots.push({ x: s.x + 8, y: H - 60 }); 
        s.cooldown = 8;
      }
    };
    canvas.addEventListener("pointerdown", onPtr);
    canvas.addEventListener("pointermove", onPtr);
    canvas.addEventListener("touchmove", onPtr, { passive: true });

    let frame;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (phaseRef.current === "paused" || phaseRef.current !== "playing") return;
      s.tick++;
      if (s.cooldown > 0) s.cooldown--;
      const prevX = s.x;
      if (s.keys["ArrowLeft"] || s.keys["KeyA"]) s.x = Math.max(10, s.x - 5);
      if (s.keys["ArrowRight"] || s.keys["KeyD"]) s.x = Math.min(W - 10, s.x + 5);
      s.vx = (s.x - prevX);

      // Spawn Alien Grid
      if (s.aliens.length === 0) {
        const rows = Math.min(6, 3 + Math.floor(s.level / 2));
        const cols = 6;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            s.aliens.push({
              id: `${r}-${c}`,
              x: 60 + c * 48,
              y: -100 - r * 40,
              targetY: 40 + r * 40,
              type: r === 0 ? 'boss' : (r % 2 === 0 ? 'shooter' : 'drone'),
              hp: r === 0 ? 3 + s.level : 1,
              r: r === 0 ? 20 : 14,
              wobblePhase: Math.random() * Math.PI * 2
            });
          }
        }
      }

      // Update Aliens
      let gridHitWall = false;
      for (const a of s.aliens) {
        if (a.y < a.targetY) {
          a.y += 2; // entry descend
        } else {
          a.x += s.alienDir * (0.5 + s.level * 0.15);
          a.y = a.targetY + Math.sin(s.tick * 0.05 + a.wobblePhase) * 5; // wobble
          if (a.x < 20 || a.x > W - 20) gridHitWall = true;

          // Alien Shooting
          if (a.type !== 'drone' && Math.random() < 0.002 + (s.level * 0.001)) {
            s.alienShots.push({ x: a.x, y: a.y + a.r, vx: 0, vy: 3 + s.level * 0.5 });
            if (a.type === 'boss') {
               // Boss shoots spread
               s.alienShots.push({ x: a.x, y: a.y + a.r, vx: -1.5, vy: 3 + s.level * 0.5 });
               s.alienShots.push({ x: a.x, y: a.y + a.r, vx: 1.5, vy: 3 + s.level * 0.5 });
            }
          }
        }
      }
      if (gridHitWall) {
        s.alienDir *= -1;
        s.aliens.forEach(a => a.targetY += 15);
      }

      // Update Projectiles
      s.shots = s.shots.map(sh => ({ ...sh, y: sh.y - 14 })).filter(sh => sh.y > 0);
      s.alienShots = s.alienShots.map(sh => ({ ...sh, x: sh.x + (sh.vx||0), y: sh.y + sh.vy })).filter(sh => sh.y < H + 20);

      // Collision: Player Shots -> Aliens
      const nextAliens = [];
      for (const a of s.aliens) {
        let hit = false;
        s.shots = s.shots.filter(sh => {
          if (hit) return true;
          if (Math.hypot(sh.x - a.x, sh.y - a.y) < a.r + 6) {
            hit = true;
            return false; // remove shot
          }
          return true;
        });

        if (hit) {
          a.hp--;
          s.shake = 4;
          // Spawn sparks
          for (let i = 0; i < 5; i++) {
            s.particles.push({
              x: a.x, y: a.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
              life: 1.0, color: "#ffffff"
            });
          }
          if (a.hp <= 0) {
            // Explode
            s.shake = a.type === 'boss' ? 12 : 6;
            for (let i = 0; i < 15 + a.r; i++) {
              s.particles.push({
                x: a.x, y: a.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                life: 1.0, color: a.type === 'boss' ? "#9c27b0" : (a.type === 'shooter' ? "#e91e63" : "#4caf50")
              });
            }
            s.score += a.type === 'boss' ? 50 : 10;
            const target = s.level * 500; // Increase level threshold
            if (s.score >= target) {
              s.level++;
              if (s.level > 5) {
                phaseRef.current = "complete"; setPhase("complete");
                setTimeout(() => onOutcome?.({ type: "complete", score: s.score }), 0); return;
              }
            }
            setHud({ score: s.score, lives: s.lives, level: s.level });
            continue; // Alien dies
          }
        }
        
        // Alien hits player body
        if (a.y > H - 70 && a.y < H - 20 && Math.abs(a.x - s.x) < a.r + 20) {
           s.shake = 15;
           s.lives--;
           setHud({ score: s.score, lives: s.lives, level: s.level });
           if (s.lives <= 0) {
             phaseRef.current = "over"; setPhase("over");
             setTimeout(() => onOutcome?.({ type: "over", score: s.score }), 0); return;
           }
           continue;
        }

        nextAliens.push(a);
      }
      s.aliens = nextAliens;

      // Collision: Alien Shots -> Player
      let playerHit = false;
      s.alienShots = s.alienShots.filter(sh => {
        if (playerHit) return true;
        if (Math.abs(sh.x - s.x) < 15 && sh.y > H - 55 && sh.y < H - 25) {
          playerHit = true;
          return false;
        }
        return true;
      });

      if (playerHit) {
        s.shake = 15;
        s.lives--;
        setHud({ score: s.score, lives: s.lives, level: s.level });
        if (s.lives <= 0) {
          phaseRef.current = "over"; setPhase("over");
          setTimeout(() => onOutcome?.({ type: "over", score: s.score }), 0); return;
        }
      }

      // Render Phase
      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
        s.shake *= 0.9;
        if (s.shake < 0.5) s.shake = 0;
      }

      // Space Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#050014");
      bgGrad.addColorStop(1, "#1a0b2e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
      
      // Nebulae
      const n1 = ctx.createRadialGradient(W*0.2, H*0.3, 0, W*0.2, H*0.3, W*0.8);
      n1.addColorStop(0, "rgba(124, 77, 255, 0.15)"); n1.addColorStop(1, "rgba(124, 77, 255, 0)");
      ctx.fillStyle = n1; ctx.fillRect(0, 0, W, H);

      // Planets
      s.planets.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const pGrad = ctx.createRadialGradient(-p.r*0.3, -p.r*0.3, 0, 0, 0, p.r);
        if (p.type === 'purple') {
          pGrad.addColorStop(0, "#ab47bc"); pGrad.addColorStop(1, "#311b92");
        } else {
          pGrad.addColorStop(0, "#ef5350"); pGrad.addColorStop(1, "#b71c1c");
        }
        ctx.fillStyle = pGrad;
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI*2); ctx.fill();
        
        // Planet Rings
        if (p.type === 'purple') {
           ctx.strokeStyle = "rgba(255,255,255,0.2)";
           ctx.lineWidth = 4;
           ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.8, p.r * 0.4, Math.PI/6, 0, Math.PI*2); ctx.stroke();
        }
        ctx.restore();
      });

      // Stars
      s.stars.forEach(st => {
        st.y += st.speed; if (st.y > H) st.y = 0;
        const alpha = 0.2 + st.r * 0.3;
        if (st.r > 1) {
          ctx.fillStyle = `rgba(100, 200, 255, ${alpha * 0.5})`;
          ctx.beginPath(); ctx.arc(st.x, st.y, st.r * 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
      });

      // Player Trail
      s.trail.push({ x: s.x - 6, y: H - 40, life: 1.0 });
      s.trail.push({ x: s.x + 6, y: H - 40, life: 1.0 });
      if (s.trail.length > 40) s.trail.splice(0, 2);
      s.trail.forEach(t => {
        t.life -= 0.08;
        if (t.life > 0) {
          ctx.globalAlpha = Math.max(0, t.life);
          ctx.fillStyle = "#00e5ff";
          ctx.beginPath(); ctx.arc(t.x, t.y, 1 + t.life * 2, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Particles
      s.particles = s.particles.filter(p => p.life > 0);
      s.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.95; p.vy *= 0.95;
        p.life -= 0.03;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, 1 + Math.max(0, p.life * 4), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Projectiles (Screen blending)
      ctx.globalCompositeOperation = "screen";
      
      // Player Shots (Realistic Missiles)
      s.shots.forEach(sh => {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        
        // Rocket exhaust flame
        ctx.fillStyle = s.tick % 4 < 2 ? "#ff9800" : "#ffeb3b";
        ctx.beginPath(); ctx.moveTo(-2, 12); ctx.lineTo(2, 12); ctx.lineTo(0, 20 + Math.random() * 6); ctx.fill();
        
        // Rocket fins (Red)
        ctx.fillStyle = "#d32f2f";
        ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-4, 12); ctx.lineTo(-2, 12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(4, 12); ctx.lineTo(2, 12); ctx.fill();

        // Rocket body (Metallic gradient)
        const rGrad = ctx.createLinearGradient(-2, 0, 2, 0);
        rGrad.addColorStop(0, "#757575");
        rGrad.addColorStop(0.5, "#ffffff");
        rGrad.addColorStop(1, "#424242");
        ctx.fillStyle = rGrad;
        ctx.beginPath(); ctx.moveTo(-2, 12); ctx.lineTo(-2, 2); ctx.lineTo(0, -2); ctx.lineTo(2, 2); ctx.lineTo(2, 12); ctx.fill();

        // Nose cone (Red)
        ctx.fillStyle = "#d32f2f";
        ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(0, -2); ctx.lineTo(2, 2); ctx.fill();
        ctx.restore();
      });

      // Alien Shots (Glowing Plasma Orbs)
      s.alienShots.forEach(sh => {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        
        // Pulsing outer aura
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
        glow.addColorStop(0, "rgba(255, 23, 68, 1)");
        glow.addColorStop(1, "rgba(255, 23, 68, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, 8 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
        
        // Superheated core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        
        ctx.restore();
      });
      ctx.globalCompositeOperation = "source-over";

      // Draw Aliens
      s.aliens.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        
        if (a.type === 'boss') {
          // Boss Ship (Purple/Gold)
          ctx.fillStyle = "#4a148c";
          ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(25,10); ctx.lineTo(10,20); ctx.lineTo(-10,20); ctx.lineTo(-25,10); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#ffb300"; // gold trim
          ctx.beginPath(); ctx.moveTo(0,-15); ctx.lineTo(15,5); ctx.lineTo(0,10); ctx.lineTo(-15,5); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#00e5ff"; // core
          ctx.beginPath(); ctx.arc(0, 5, 6, 0, Math.PI*2); ctx.fill();
        } else if (a.type === 'shooter') {
          // Shooter Ship (Red/Orange)
          ctx.fillStyle = "#c62828";
          ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(15,0); ctx.lineTo(15,10); ctx.lineTo(0,5); ctx.lineTo(-15,10); ctx.lineTo(-15,0); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#ff9800";
          ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        } else {
          // Drone (Green/Cyan)
          ctx.fillStyle = "#2e7d32";
          ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI, 0); ctx.lineTo(10, 10); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#69f0ae";
          ctx.beginPath(); ctx.arc(0, 2, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
      });

      // Player Spaceship
      ctx.save();
      ctx.translate(s.x, H - 55);
      ctx.rotate(s.vx * 0.05);

      // Player Spaceship (Realistic NASA-style Rocket)
      ctx.translate(0, 5); // Shift down slightly because rocket is taller
      // Cylindrical shading gradient for realistic 3D look
      const cylGrad = ctx.createLinearGradient(-6, 0, 6, 0);
      cylGrad.addColorStop(0, "#9e9e9e");
      cylGrad.addColorStop(0.3, "#ffffff");
      cylGrad.addColorStop(0.8, "#e0e0e0");
      cylGrad.addColorStop(1, "#757575");

      const boosterGrad = ctx.createLinearGradient(-4, 0, 4, 0);
      boosterGrad.addColorStop(0, "#9e9e9e");
      boosterGrad.addColorStop(0.3, "#ffffff");
      boosterGrad.addColorStop(0.8, "#e0e0e0");
      boosterGrad.addColorStop(1, "#757575");

      // Shadow underneath the entire rocket
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 8;

      // Engine Flames (Orange/Yellow)
      ctx.fillStyle = s.tick % 4 < 2 ? "#ff9800" : "#ffeb3b";
      ctx.beginPath(); ctx.moveTo(-3, 22); ctx.lineTo(3, 22); ctx.lineTo(0, 35 + Math.random()*10); ctx.fill(); // Center
      ctx.beginPath(); ctx.moveTo(-13, 18); ctx.lineTo(-9, 18); ctx.lineTo(-11, 28 + Math.random()*8); ctx.fill(); // Left
      ctx.beginPath(); ctx.moveTo(9, 18); ctx.lineTo(13, 18); ctx.lineTo(11, 28 + Math.random()*8); ctx.fill(); // Right

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // Engine Nozzles (Dark Grey)
      ctx.fillStyle = "#424242";
      ctx.beginPath(); ctx.moveTo(-3, 16); ctx.lineTo(3, 16); ctx.lineTo(4, 22); ctx.lineTo(-4, 22); ctx.fill(); // Center
      ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(-10, 12); ctx.lineTo(-9, 18); ctx.lineTo(-13, 18); ctx.fill(); // Left
      ctx.beginPath(); ctx.moveTo(10, 12); ctx.lineTo(12, 12); ctx.lineTo(13, 18); ctx.lineTo(9, 18); ctx.fill(); // Right

      // Connecting Struts
      ctx.fillStyle = "#757575";
      ctx.fillRect(-10, 2, 6, 2);
      ctx.fillRect(4, 2, 6, 2);
      ctx.fillRect(-10, 8, 6, 2);
      ctx.fillRect(4, 8, 6, 2);

      // Side Boosters
      ctx.fillStyle = boosterGrad;
      ctx.fillRect(-14, -6, 6, 18); // Left body
      ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-8, -6); ctx.lineTo(-11, -16); ctx.fill(); // Left cone
      ctx.fillRect(8, -6, 6, 18); // Right body
      ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(14, -6); ctx.lineTo(11, -16); ctx.fill(); // Right cone

      // Central Core Body
      ctx.fillStyle = cylGrad;
      ctx.fillRect(-5, -20, 10, 36);

      // Central Core Ribbed Texture (Middle Stage detail)
      ctx.fillStyle = "#b0bec5";
      for(let i=0; i<4; i++) {
         ctx.fillRect(-5, -5 + i*2, 10, 1);
      }

      // Command Module / Capsule (Dark Grey)
      const capGrad = ctx.createLinearGradient(-5, 0, 5, 0);
      capGrad.addColorStop(0, "#424242"); capGrad.addColorStop(0.5, "#9e9e9e"); capGrad.addColorStop(1, "#212121");
      ctx.fillStyle = capGrad;
      ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(5, -20); ctx.lineTo(2, -32); ctx.lineTo(-2, -32); ctx.fill();
      
      // Nose cone tip (White)
      ctx.fillStyle = "#e0e0e0";
      ctx.beginPath(); ctx.moveTo(-2, -32); ctx.lineTo(2, -32); ctx.lineTo(0, -36); ctx.fill();

      // (Old ship features removed)

      // Muzzle Flash
      if (s.cooldown > 4) {
        ctx.fillStyle = `rgba(0, 229, 255, ${(s.cooldown - 4) / 4})`;
        ctx.beginPath(); ctx.arc(-8, -32, 12 + Math.random() * 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -32, 12 + Math.random() * 8, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore(); // Restore Ship
      ctx.restore(); // Restore Screen Shake
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [onOutcome]);

  const restart = () => {
    const stars = stateRef.current?.stars;
    const s = initState(stars);
    stateRef.current = s;
    phaseRef.current = "playing";
    setPhase("playing");
    setHud({ score: 0, lives: 3, level: 1 });
  };

  const togglePause = () => {
    const next = phaseRef.current === "paused" ? "playing" : "paused";
    phaseRef.current = next; setPhase(next);
  };

  return (
    <GameShell title="Cosmo Warrior" score={hud.score} lives={hud.lives} level={hud.level}
      phase={phase} onPause={togglePause} onResume={togglePause} onRestart={restart}>
      
      {/* Neon glowing border to match arcade screenshot */}
      <div style={{
        border: "3px solid #00e5ff",
        boxShadow: "0 0 15px #00e5ff, inset 0 0 15px #00e5ff",
        borderRadius: "16px",
        padding: "4px",
        margin: "0 auto",
        width: "100%",
        maxWidth: "min(420px, calc(80vh * 360 / 520))",
        backgroundColor: "#050014"
      }}>
        <canvas ref={canvasRef} width={360} height={520}
          style={{ 
            width: "100%", 
            aspectRatio: "360 / 520",
            display: "block", 
            touchAction: "none",
            borderRadius: "12px"
          }} />
      </div>
      
      <p style={{ color: "rgba(200,180,140,0.6)", fontSize: "0.75rem", textAlign: "center", padding: "8px 0" }}>
        Move: Arrow keys / drag · Shoot: Space / tap
      </p>
    </GameShell>
  );
}
