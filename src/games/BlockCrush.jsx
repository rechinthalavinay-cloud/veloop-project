import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

const W = 360;
const H = 640; 
const BOARD_X = 55;
const BOARD_Y = 110;
const BOARD_W = 250;
const BOARD_H = 380;

const COLS = 5;
const ROW_H = 40;
const COL_W = BOARD_W / COLS;
const BALL_R = 4;
const BALL_SPEED = 6;

const ROW_COLORS = [
  "#ff0055", // Red
  "#aa00ff", // Purple
  "#0091ea", // Blue
  "#00c853", // Green
  "#ff9800", // Orange
  "#ffd600"  // Yellow
];

const getNeonColor = (r) => {
   return ROW_COLORS[r % ROW_COLORS.length];
};

export function BlockCrush({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const phaseRef = useRef("playing"); 
  const [hud, setHud] = useState({ score: 0, level: 1, lives: 3 });
  const [phase, setPhase] = useState("playing");

  const generateLevel = (s) => {
     s.blocks = [];
     for (let r = 0; r < 5; r++) {
         for (let c = 0; c < COLS; c++) {
             if (Math.random() < 0.8) {
                 const hp = s.level * 2 + Math.floor(Math.random() * 3);
                 s.blocks.push({ r, c, hp, maxHp: hp });
             }
         }
     }
     if (s.blocks.length === 0) s.blocks.push({ r: 0, c: 2, hp: 5, maxHp: 5 });
  };

  const init = (keepScore = 0, keepLevel = 1) => {
     const s = {
        score: keepScore,
        level: keepLevel,
        lives: 3,
        balls: [], 
        blocks: [], 
        particles: [],
        powerups: [],
        paddleX: BOARD_X + BOARD_W / 2,
        paddleW: 60,
        paddleH: 12,
        keys: { left: false, right: false },
        ballsToShoot: 1, 
        shootTimer: 0,
        activeBalls: 0,
     };
     generateLevel(s);
     return s;
  };

  useEffect(() => {
    if (!reviveSignal) return;
    stateRef.current = init(stateRef.current?.score || 0, stateRef.current?.level || 1);
    phaseRef.current = "playing"; setPhase("playing");
  }, [reviveSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = W;
    canvas.height = H;

    if (!stateRef.current) stateRef.current = init();
    const s = stateRef.current;

    const checkBlockCollision = (b, block) => {
        const bx = BOARD_X + block.c * COL_W;
        const by = BOARD_Y + block.r * ROW_H; 
        const pad = 2; 
        const left = bx + pad;
        const right = bx + COL_W - pad;
        const top = by + pad;
        const bottom = by + ROW_H - pad;

        const testX = Math.max(left, Math.min(b.x, right));
        const testY = Math.max(top, Math.min(b.y, bottom));
        const distX = b.x - testX;
        const distY = b.y - testY;
        const distance = Math.hypot(distX, distY);

        if (distance <= BALL_R) {
            if (Math.abs(distX) > Math.abs(distY)) {
                b.vx = -b.vx;
                b.x = b.x > testX ? right + BALL_R : left - BALL_R;
            } else {
                b.vy = -b.vy;
                b.y = b.y > testY ? bottom + BALL_R : top - BALL_R;
            }
            return true;
        }
        return false;
    };

    const checkPaddleCollision = (b) => {
        const px = s.paddleX - s.paddleW / 2;
        const py = BOARD_Y + BOARD_H - 30; // Paddle is 30px above bottom
        const pw = s.paddleW;
        const ph = s.paddleH;

        if (b.x + BALL_R >= px && b.x - BALL_R <= px + pw &&
            b.y + BALL_R >= py && b.y - BALL_R <= py + ph) {
            
            // Only bounce if falling down
            if (b.vy > 0) {
                b.vy = -Math.abs(b.vy);
                b.y = py - BALL_R;
                
                // Add english based on where it hit the paddle
                const hitDelta = b.x - s.paddleX;
                const normalizedHit = hitDelta / (pw / 2); // -1 to 1
                b.vx = normalizedHit * BALL_SPEED;
                
                // Normalize speed vector to maintain constant BALL_SPEED
                const speed = Math.hypot(b.vx, b.vy);
                b.vx = (b.vx / speed) * BALL_SPEED;
                b.vy = (b.vy / speed) * BALL_SPEED;
            }
            return true;
        }
        return false;
    };

    const handlePointerMove = (e) => {
      if (phaseRef.current !== "playing") return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      let x = (pt.clientX - rect.left) * (W / rect.width);
      
      if (x - s.paddleW/2 < BOARD_X) x = BOARD_X + s.paddleW/2;
      if (x + s.paddleW/2 > BOARD_X + BOARD_W) x = BOARD_X + BOARD_W - s.paddleW/2;
      s.paddleX = x;
    };

    const handleKeyDown = (e) => {
        if (e.key === "ArrowLeft") s.keys.left = true;
        if (e.key === "ArrowRight") s.keys.right = true;
    };
    const handleKeyUp = (e) => {
        if (e.key === "ArrowLeft") s.keys.left = false;
        if (e.key === "ArrowRight") s.keys.right = false;
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerMove); // click to snap paddle
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    let frame;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      
      if (phaseRef.current === "playing") {
         // Keyboard movement
         if (s.keys.left) s.paddleX -= 6;
         if (s.keys.right) s.paddleX += 6;
         // Clamp paddle
         if (s.paddleX - s.paddleW/2 < BOARD_X) s.paddleX = BOARD_X + s.paddleW/2;
         if (s.paddleX + s.paddleW/2 > BOARD_X + BOARD_W) s.paddleX = BOARD_X + BOARD_W - s.paddleW/2;

         // Stream Spawning
         if (s.ballsToShoot > 0) {
            s.shootTimer--;
            if (s.shootTimer <= 0) {
               // Add some slight randomness to launch angle
               const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
               s.balls.push({
                  x: s.paddleX,
                  y: BOARD_Y + BOARD_H - 35,
                  vx: Math.cos(angle) * BALL_SPEED,
                  vy: Math.sin(angle) * BALL_SPEED,
                  active: true
               });
               s.ballsToShoot--;
               s.activeBalls++;
               s.shootTimer = 8;
            }
         }
         
         for(let step = 0; step < 2; step++) {
             s.balls.forEach(b => {
                if (!b.active) return;

                b.x += b.vx / 2;
                b.y += b.vy / 2;

                // Walls (Left, Right, Top)
                if (b.x - BALL_R < BOARD_X) { b.x = BOARD_X + BALL_R; b.vx = -b.vx; }
                if (b.x + BALL_R > BOARD_X + BOARD_W) { b.x = BOARD_X + BOARD_W - BALL_R; b.vx = -b.vx; }
                if (b.y - BALL_R < BOARD_Y) { b.y = BOARD_Y + BALL_R; b.vy = -b.vy; }

                // Paddle Collision
                checkPaddleCollision(b);

                // Floor Death (Lost ball)
                if (b.y > BOARD_Y + BOARD_H) {
                   b.active = false;
                   s.activeBalls--;
                }

                // Blocks
                for (let i = s.blocks.length - 1; i >= 0; i--) {
                   const blk = s.blocks[i];
                   if (checkBlockCollision(b, blk)) {
                      blk.hp--;
                      s.score += 10;
                      setHud(h => ({ ...h, score: s.score }));
                      
                      // Sparks
                      for(let p=0; p<4; p++) {
                         s.particles.push({
                            x: b.x, y: b.y,
                            vx: (Math.random()-0.5)*5,
                            vy: (Math.random()-0.5)*5,
                            life: 1.0,
                            color: getNeonColor(blk.r)
                         });
                      }

                      if (blk.hp <= 0) {
                         s.blocks.splice(i, 1);
                         
                         // 20% chance to drop a powerup
                         if (Math.random() < 0.2) {
                             const type = Math.random() < 0.5 ? "multi" : "wide";
                             s.powerups.push({ x: BOARD_X + blk.c * COL_W + COL_W/2, y: BOARD_Y + blk.r * ROW_H + ROW_H/2, type, active: true });
                         }
                      }
                   }
                }
             });
         }

         // Powerups
         s.powerups.forEach(p => {
             if (!p.active) return;
             p.y += 2.5; 
             
             const px = s.paddleX - s.paddleW / 2;
             const py = BOARD_Y + BOARD_H - 30;
             
             // Caught by paddle
             if (p.y + 8 >= py && p.y - 8 <= py + s.paddleH && p.x >= px && p.x <= px + s.paddleW) {
                 p.active = false;
                 if (p.type === "multi") {
                     for(let k=0; k<2; k++) {
                         const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
                         s.balls.push({
                             x: s.paddleX, y: py - BALL_R,
                             vx: Math.cos(angle) * BALL_SPEED,
                             vy: Math.sin(angle) * BALL_SPEED,
                             active: true
                         });
                         s.activeBalls++;
                     }
                 } else if (p.type === "wide") {
                     s.paddleW = Math.min(120, s.paddleW + 30);
                 }
             } else if (p.y > BOARD_Y + BOARD_H) {
                 p.active = false;
             }
         });
         s.powerups = s.powerups.filter(p => p.active);

         // Win/Loss Checks
         if (s.blocks.length === 0) {
             s.level++;
             s.score += 500;
             setHud({ score: s.score, level: s.level, lives: s.lives });
             phaseRef.current = "won"; setPhase("won");
             setTimeout(() => onOutcome?.({ type: "won", score: s.score }), 0);
         } else if (s.ballsToShoot === 0 && s.activeBalls <= 0) {
             s.lives--;
             setHud(h => ({ ...h, lives: s.lives }));
             
             if (s.lives > 0) {
                 s.ballsToShoot = 1;
                 s.paddleW = 60; // reset paddle width on death
                 s.powerups = []; // clear falling powerups
             } else {
                 phaseRef.current = "lost"; setPhase("lost");
                 setTimeout(() => onOutcome?.({ type: "over", score: s.score }), 0);
             }
         }
      }

      // RENDER
      // Background (Realistic Nebula)
      const bgGrad = ctx.createRadialGradient(W/2, H/3, 50, W/2, H/2, H);
      bgGrad.addColorStop(0, "#1a0b2e");
      bgGrad.addColorStop(0.5, "#0b1021");
      bgGrad.addColorStop(1, "#020308");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
      
      // Realistic Stars
      ctx.fillStyle = "#ffffff";
      for(let i=0; i<40; i++) {
         const starSize = Math.random() * 1.5 + 0.5;
         ctx.globalAlpha = Math.random() * 0.8 + 0.2;
         ctx.beginPath(); ctx.arc((i*97)%W, (i*131)%H, starSize, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      
      // TITLE
      ctx.textAlign = "center";
      ctx.font = "900 36px 'Arial Black', sans-serif";
      ctx.fillStyle = "#ffb300"; ctx.fillText("BLOCK", W/2, 45);
      ctx.fillStyle = "#29b6f6"; ctx.fillText("CRUSH", W/2, 80);
      
      // Subtitle
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#ffffff"; ctx.fillText("BREAK BLOCKS.", W/2 - 30, 100);
      ctx.fillStyle = "#ffb300"; ctx.fillText("WIN BIG!", W/2 + 35, 100);



      // GAME BOARD
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 8); ctx.stroke();
      // Grid lines inside board
      ctx.strokeStyle = "rgba(0, 229, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let i=1; i<COLS; i++) {
         ctx.beginPath(); ctx.moveTo(BOARD_X + i*COL_W, BOARD_Y); ctx.lineTo(BOARD_X + i*COL_W, BOARD_Y+BOARD_H); ctx.stroke();
      }

      // Blocks
      s.blocks.forEach(blk => {
         const bx = BOARD_X + blk.c * COL_W;
         const by = BOARD_Y + blk.r * ROW_H;
         if (blk.isPlus) {
            const cx = bx + COL_W/2;
            const cy = by + ROW_H/2;
            
            // Glowing realistic orb
            const orbGrad = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, 10);
            orbGrad.addColorStop(0, "#ffffff");
            orbGrad.addColorStop(0.4, "#00e5ff");
            orbGrad.addColorStop(1, "rgba(0, 229, 255, 0)");
            
            ctx.fillStyle = orbGrad;
            ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = "#fff";
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "#000"; ctx.shadowBlur = 4;
            ctx.fillText("+1", cx, cy - 20);
            ctx.shadowBlur = 0;
         } else {
            const pad = 1;
            const color = getNeonColor(blk.r);
            
            // Realistic Glass/Crystal Block
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.roundRect(bx + pad, by + pad, COL_W - pad*2, ROW_H - pad*2, 6); ctx.fill();
            
            // Glossy 3D overlay
            const gloss = ctx.createLinearGradient(bx, by, bx, by + ROW_H);
            gloss.addColorStop(0, "rgba(255,255,255,0.8)");
            gloss.addColorStop(0.3, "rgba(255,255,255,0.2)");
            gloss.addColorStop(0.5, "rgba(0,0,0,0.1)");
            gloss.addColorStop(1, "rgba(0,0,0,0.6)");
            ctx.fillStyle = gloss;
            ctx.fill();

            // Inner border for realism
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Text with soft drop shadow
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 16px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 4;
            ctx.fillText(blk.hp.toString(), bx + COL_W/2, by + ROW_H/2);
            ctx.shadowBlur = 0;
         }
      });
      
      // Particles
      s.particles.forEach(p => {
         ctx.fillStyle = p.color;
         ctx.globalAlpha = p.life;
         ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill();
         p.x += p.vx;
         p.y += p.vy;
         p.life -= 0.05;
      });
      ctx.globalAlpha = 1.0;
      s.particles = s.particles.filter(p => p.life > 0);

      // Powerups
      s.powerups.forEach(p => {
          ctx.fillStyle = p.type === "multi" ? "#00b0ff" : "#00e676";
          ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI*2); ctx.fill();
          
          ctx.fillStyle = "#fff";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.type === "multi" ? "x3" : "< >", p.x, p.y);
      });

      // Realistic Metallic PADDLE
      const paddleGrad = ctx.createLinearGradient(0, BOARD_Y + BOARD_H - 30, 0, BOARD_Y + BOARD_H - 30 + s.paddleH);
      paddleGrad.addColorStop(0, "#d1d5db"); // silver top
      paddleGrad.addColorStop(0.3, "#ffffff"); // bright highlight
      paddleGrad.addColorStop(0.6, "#6b7280"); // grey
      paddleGrad.addColorStop(1, "#1f2937");   // dark grey bottom

      ctx.fillStyle = paddleGrad;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      ctx.beginPath(); 
      ctx.roundRect(s.paddleX - s.paddleW/2, BOARD_Y + BOARD_H - 30, s.paddleW, s.paddleH, 6); 
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Rubber bumpers on paddle edges
      ctx.fillStyle = "#111827";
      ctx.beginPath(); ctx.roundRect(s.paddleX - s.paddleW/2, BOARD_Y + BOARD_H - 30, 8, s.paddleH, 4); ctx.fill();
      ctx.beginPath(); ctx.roundRect(s.paddleX + s.paddleW/2 - 8, BOARD_Y + BOARD_H - 30, 8, s.paddleH, 4); ctx.fill();

      // Shiny Steel Balls
      s.balls.forEach(b => {
         if (b.active) {
            const ballGrad = ctx.createRadialGradient(b.x - BALL_R*0.3, b.y - BALL_R*0.3, 0, b.x, b.y, BALL_R);
            ballGrad.addColorStop(0, "#ffffff"); // shiny spot
            ballGrad.addColorStop(0.4, "#9ca3af"); // silver
            ballGrad.addColorStop(1, "#374151"); // dark edge
            
            ctx.fillStyle = ballGrad;
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(b.x, b.y, BALL_R, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
         }
      });

      // Bottom Text
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("AIM. CRUSH. REPEAT!", W/2, BOARD_Y + BOARD_H + 30);
      
    };

    frame = requestAnimationFrame(loop);
    return () => {
       cancelAnimationFrame(frame);
       canvas.removeEventListener("pointermove", handlePointerMove);
       canvas.removeEventListener("pointerdown", handlePointerMove);
       window.removeEventListener("keydown", handleKeyDown);
       window.removeEventListener("keyup", handleKeyUp);
    };
  }, [reviveSignal, onOutcome]);

  const restart = () => {
     if (stateRef.current) {
        stateRef.current = init(0, 1);
        phaseRef.current = "playing";
        setPhase("playing");
        setHud({ score: 0, level: 1, lives: 3 });
     }
  };
  const nextLevel = () => {
     if (stateRef.current) {
        // preserve lives between levels? Yes.
        const prevLives = stateRef.current.lives;
        stateRef.current = init(stateRef.current.score, stateRef.current.level);
        stateRef.current.lives = prevLives;
        phaseRef.current = "playing";
        setPhase("playing");
     }
  };

  return (
    <GameShell title="Block Crush" score={hud.score} time={0} level={hud.level} lives={hud.lives}
      phase={phase === "lost" ? "over" : "playing"} onRestart={restart}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", touchAction: "none", position: "relative" }}>
        
        {phase === "won" && (
           <div style={{ position: "absolute", top: BOARD_Y + 100, background: "rgba(0,0,0,0.8)", padding: "20px", borderRadius: "10px", color: "#fff", textAlign: "center", zIndex: 10, border: "2px solid #00e5ff", boxShadow: "0 0 20px #00e5ff" }}>
              <h2 style={{ color: "#00e5ff", margin: "0 0 10px 0", textTransform: "uppercase" }}>Level Cleared!</h2>
              <button onClick={nextLevel} style={{ padding: "10px 20px", background: "#ff0055", color: "#fff", border: "none", borderRadius: "5px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>Next Level</button>
           </div>
        )}

        <canvas ref={canvasRef} style={{ width: W, height: H, background: "#060814", borderRadius: 8 }} />
      </div>
    </GameShell>
  );
}
