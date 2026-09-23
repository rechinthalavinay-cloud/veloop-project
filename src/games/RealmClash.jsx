import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

const W = 360;
const H = 520;
const COLORS = {
  0: "#707085", // Neutral (Dim Grey/Blue)
  1: "#00f2fe", // Player (Neon Cyan)
  2: "#ff0055"  // Enemy (Neon Pink/Red)
};

export function RealmClash({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const phaseRef = useRef("playing");
  const levelRef = useRef(1);
  const [hud, setHud] = useState({ score: 0, level: 1 });
  const [phase, setPhase] = useState("playing");

  const getLevelConfig = (level) => {
    let nodes = [];
    if (level === 1) {
      nodes = [
        { id: 0, x: 180, y: 440, team: 1, troops: 20, max: 30, r: 30 },
        { id: 1, x: 180, y: 80, team: 2, troops: 10, max: 30, r: 30 },
      ];
    } else if (level === 2) {
      nodes = [
        { id: 0, x: 180, y: 440, team: 1, troops: 15, max: 30, r: 25 },
        { id: 1, x: 180, y: 260, team: 0, troops: 10, max: 20, r: 25 },
        { id: 2, x: 180, y: 80, team: 2, troops: 15, max: 30, r: 25 },
      ];
    } else if (level === 3) {
      nodes = [
        { id: 0, x: 180, y: 440, team: 1, troops: 20, max: 35, r: 25 },
        { id: 1, x: 80, y: 260, team: 0, troops: 10, max: 20, r: 20 },
        { id: 2, x: 280, y: 260, team: 0, troops: 10, max: 20, r: 20 },
        { id: 3, x: 180, y: 80, team: 2, troops: 20, max: 35, r: 30 },
      ];
    } else if (level === 4) {
      nodes = [
        { id: 0, x: 100, y: 420, team: 1, troops: 20, max: 35, r: 25 },
        { id: 1, x: 260, y: 420, team: 1, troops: 10, max: 20, r: 20 },
        { id: 2, x: 180, y: 260, team: 0, troops: 20, max: 40, r: 30 },
        { id: 3, x: 100, y: 100, team: 2, troops: 10, max: 20, r: 20 },
        { id: 4, x: 260, y: 100, team: 2, troops: 20, max: 35, r: 25 },
      ];
    } else {
      nodes = [
        { id: 0, x: 180, y: 440, team: 1, troops: 25, max: 40, r: 30 },
        { id: 1, x: 80, y: 320, team: 0, troops: 10, max: 20, r: 20 },
        { id: 2, x: 280, y: 320, team: 0, troops: 10, max: 20, r: 20 },
        { id: 3, x: 180, y: 260, team: 0, troops: 15, max: 30, r: 25 },
        { id: 4, x: 80, y: 180, team: 2, troops: 15, max: 30, r: 25 },
        { id: 5, x: 280, y: 180, team: 2, troops: 15, max: 30, r: 25 },
        { id: 6, x: 180, y: 80, team: 2, troops: 25, max: 40, r: 30 },
      ];
    }
    return nodes;
  };

  // Pre-generate background stars
  const createStars = () => {
    let stars = [];
    for(let i = 0; i < 80; i++) {
       stars.push({
         x: Math.random() * W,
         y: Math.random() * H,
         s: Math.random() * 1.5 + 0.5,
         speed: Math.random() * 0.3 + 0.05,
         layer: Math.floor(Math.random() * 3) // For parallax
       });
    }
    return stars;
  };

  function init(keepScore = 0) {
    return {
      score: keepScore, level: levelRef.current, tick: 0,
      nodes: getLevelConfig(levelRef.current),
      troops: [],
      explosions: [], // Particles
      slashTrail: [], // For cutting connections
      connections: [], // { fromId, toId, team }
      pointer: { active: false, slicing: false, x: 0, y: 0, startNodeId: null },
      winTimer: 0,
      stars: createStars(),
      screenShake: 0
    };
  }

  useEffect(() => {
    if (!reviveSignal) return;
    stateRef.current = init(stateRef.current?.score || 0);
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
    setHud({ score: s.score, level: s.level });

    const getNodeAt = (x, y) => {
      // Larger hit radius for easier touch
      return s.nodes.find(n => Math.hypot(n.x - x, n.y - y) <= n.r + 25);
    };

    const toggleConnection = (fromNode, toNode) => {
      const existingIdx = s.connections.findIndex(c => c.fromId === fromNode.id && c.toId === toNode.id);
      if (existingIdx !== -1) {
         s.connections.splice(existingIdx, 1);
      } else {
         s.connections.push({ fromId: fromNode.id, toId: toNode.id, team: fromNode.team });
      }
    };

    const handleDown = (e) => {
      if (phaseRef.current !== "playing") return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const x = (pt.clientX - rect.left) * (W / rect.width);
      const y = (pt.clientY - rect.top) * (H / rect.height);
      
      const node = getNodeAt(x, y);
      if (node && node.team === 1) { 
         s.pointer = { active: true, slicing: false, x, y, startNodeId: node.id };
      } else {
         s.pointer = { active: true, slicing: true, x, y, startNodeId: null };
         s.slashTrail = [{x, y, age: 1}];
      }
    };

    const handleMove = (e) => {
      if (phaseRef.current !== "playing" || !s.pointer.active) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const nx = (pt.clientX - rect.left) * (W / rect.width);
      const ny = (pt.clientY - rect.top) * (H / rect.height);
      
      if (s.pointer.slicing) {
         s.connections.forEach(c => {
             const fromN = s.nodes.find(n => n.id === c.fromId);
             const toN = s.nodes.find(n => n.id === c.toId);
             if (fromN && toN) {
                 const l2 = (fromN.x - toN.x)**2 + (fromN.y - toN.y)**2;
                 if (l2 !== 0) {
                     let t = ((nx - fromN.x) * (toN.x - fromN.x) + (ny - fromN.y) * (toN.y - fromN.y)) / l2;
                     t = Math.max(0, Math.min(1, t));
                     const projX = fromN.x + t * (toN.x - fromN.x);
                     const projY = fromN.y + t * (toN.y - fromN.y);
                     const distSq = (nx - projX)**2 + (ny - projY)**2;
                     if (distSq < 1500 && c.team === 1) { // Slice radius
                         c.invalid = true;
                     }
                 }
             }
         });
         s.connections = s.connections.filter(c => !c.invalid);
         s.slashTrail.push({x: nx, y: ny, age: 1});
      }
      
      s.pointer.x = nx;
      s.pointer.y = ny;
    };

    const handleUp = () => {
      if (phaseRef.current !== "playing" || !s.pointer.active) return;
      
      if (s.pointer.slicing) {
         s.pointer.active = false;
         s.pointer.slicing = false;
         return;
      }
      
      const targetNode = getNodeAt(s.pointer.x, s.pointer.y);
      if (targetNode) {
         if (targetNode.id !== s.pointer.startNodeId) {
            const fromNode = s.nodes.find(n => n.id === s.pointer.startNodeId);
            if (fromNode) {
               toggleConnection(fromNode, targetNode);
            }
         } else {
            // Tap to sever all out connections
            s.connections = s.connections.filter(c => c.fromId !== s.pointer.startNodeId);
         }
      }
      s.pointer.active = false;
    };

    canvas.addEventListener("pointerdown", handleDown);
    canvas.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    
    canvas.addEventListener("touchstart", handleDown, {passive: false});
    canvas.addEventListener("touchmove", handleMove, {passive: false});

    const addExplosion = (x, y, color) => {
        for(let i=0; i<12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 2;
            s.explosions.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color,
                size: Math.random() * 3 + 2
            });
        }
        s.screenShake = Math.max(s.screenShake, 3);
    };
    
    const addShockwave = (x, y, color) => {
        s.explosions.push({
            x, y,
            vx: 0, vy: 0,
            life: 1.0,
            color,
            isShockwave: true
        });
        s.screenShake = Math.max(s.screenShake, 8);
    };

    let frame;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (phaseRef.current !== "playing") return;
      s.tick++;

      // Background stars parallax
      s.stars.forEach(star => {
          star.y += star.speed * (star.layer + 1);
          if (star.y > H) {
              star.y = 0;
              star.x = Math.random() * W;
          }
      });

      // Node Generation Logic
      if (s.tick % 30 === 0) {
         s.nodes.forEach(n => {
           if (n.team !== 0 && n.troops < n.max) {
             n.troops++;
           }
         });
      }

      // Connection Streaming
      s.connections.forEach((c) => {
         const fromNode = s.nodes.find(n => n.id === c.fromId);
         const toNode = s.nodes.find(n => n.id === c.toId);
         
         if (!fromNode || !toNode || fromNode.team !== c.team) {
            c.invalid = true;
            return;
         }

         const rate = Math.max(5, Math.floor(120 / Math.max(1, fromNode.troops)));

         if (s.tick % rate === 0) {
            // Track history for trails
            s.troops.push({
               x: fromNode.x,
               y: fromNode.y,
               history: [],
               team: c.team,
               targetId: c.toId,
               speed: 4.5 + Math.random() * 0.5
            });
         }
      });
      s.connections = s.connections.filter(c => !c.invalid);

      // Enemy AI
      if (s.tick % 45 === 0) {
         s.connections.forEach(c => {
            if (c.team === 2) {
               const toNode = s.nodes.find(n => n.id === c.toId);
               if (toNode && toNode.team === 2) {
                  c.invalid = true;
               }
            }
         });
         s.connections = s.connections.filter(c => !c.invalid);

         const redNodes = s.nodes.filter(n => n.team === 2);
         redNodes.forEach(attacker => {
            const myConns = s.connections.filter(c => c.fromId === attacker.id).length;
            if (myConns < 2 && attacker.troops > 12) {
               let bestTarget = null;
               let minDist = Infinity;
               s.nodes.forEach(n => {
                  if (n.id !== attacker.id && n.team !== 2) {
                     const dist = Math.hypot(n.x - attacker.x, n.y - attacker.y);
                     if (dist < minDist) {
                        minDist = dist;
                        bestTarget = n;
                     }
                  }
               });
               
               if (bestTarget) {
                  const exists = s.connections.some(c => c.fromId === attacker.id && c.toId === bestTarget.id);
                  if (!exists) toggleConnection(attacker, bestTarget);
               }
            }
         });
      }

      // Troop Logic
      for (let i = s.troops.length - 1; i >= 0; i--) {
         const t = s.troops[i];
         
         let clashed = false;
         for (let j = 0; j < s.troops.length; j++) {
            if (i !== j) {
               const other = s.troops[j];
               if (t.team !== other.team && !t.dead && !other.dead) {
                  if (Math.hypot(t.x - other.x, t.y - other.y) < 10) { 
                     t.dead = true;
                     other.dead = true;
                     clashed = true;
                     addExplosion((t.x + other.x)/2, (t.y + other.y)/2, "#fff");
                     break;
                  }
               }
            }
         }
         
         if (clashed) continue;

         const target = s.nodes.find(n => n.id === t.targetId);
         if (!target) {
           t.dead = true;
           continue;
         }

         const dx = target.x - t.x;
         const dy = target.y - t.y;
         const dist = Math.hypot(dx, dy);

         if (dist < target.r) {
            if (target.team === t.team) {
               if (target.troops < target.max) target.troops++;
            } else {
               target.troops--;
               if (target.troops < 0) {
                  target.team = t.team;
                  target.troops = 1;
                  s.score += 50;
                  addShockwave(target.x, target.y, COLORS[t.team]);
               }
            }
            t.dead = true;
         } else {
            t.history.unshift({x: t.x, y: t.y});
            if (t.history.length > 5) t.history.pop();
            t.x += (dx / dist) * t.speed;
            t.y += (dy / dist) * t.speed;
         }
      }
      
      s.troops = s.troops.filter(t => !t.dead);
      
      // Explosions Logic
      s.explosions.forEach(exp => {
         exp.x += exp.vx;
         exp.y += exp.vy;
         exp.vx *= 0.92; // Friction
         exp.vy *= 0.92;
         exp.life -= (exp.isShockwave ? 0.02 : 0.03); // Fade speed
      });
      s.explosions = s.explosions.filter(exp => exp.life > 0);

      // Win/Loss Condition
      const playerNodes = s.nodes.filter(n => n.team === 1);
      const enemyNodes = s.nodes.filter(n => n.team === 2);
      const playerTroops = s.troops.filter(t => t.team === 1).length;
      const enemyTroops = s.troops.filter(t => t.team === 2).length;

      if (enemyNodes.length === 0 && enemyTroops === 0) {
         s.winTimer++;
         if (s.winTimer > 60) {
            levelRef.current++;
            s.level = levelRef.current;
            s.score += 200;
            if (s.level > 5) {
               phaseRef.current = "complete"; setPhase("complete");
               setTimeout(() => onOutcome?.({ type: "complete", score: s.score + 500 }), 0);
            } else {
               stateRef.current = init(s.score);
               setHud({ score: stateRef.current.score, level: stateRef.current.level });
            }
         }
      } else if (playerNodes.length === 0 && playerTroops === 0) {
         s.winTimer++;
         if (s.winTimer > 60) {
            phaseRef.current = "over"; setPhase("over");
            setTimeout(() => onOutcome?.({ type: "over", score: s.score }), 0);
         }
      } else {
         s.winTimer = 0;
      }

      // ──────────────────────────────────────────────────────────
      // RENDER
      // ──────────────────────────────────────────────────────────
      
      ctx.save();
      // Screen Shake
      if (s.screenShake > 0) {
         ctx.translate((Math.random() - 0.5) * s.screenShake, (Math.random() - 0.5) * s.screenShake);
         s.screenShake *= 0.9;
         if (s.screenShake < 0.5) s.screenShake = 0;
      }
      
      // Background (Deep space void)
      ctx.fillStyle = "#050508"; 
      ctx.fillRect(0, 0, W, H);
      
      // Nebulas
      ctx.globalCompositeOperation = "screen";
      const grd1 = ctx.createRadialGradient(W*0.3, H*0.3, 0, W*0.3, H*0.3, W*0.6);
      grd1.addColorStop(0, "rgba(0, 242, 254, 0.08)");
      grd1.addColorStop(1, "transparent");
      ctx.fillStyle = grd1;
      ctx.fillRect(0, 0, W, H);
      
      const grd2 = ctx.createRadialGradient(W*0.7, H*0.7, 0, W*0.7, H*0.7, W*0.6);
      grd2.addColorStop(0, "rgba(255, 0, 85, 0.06)");
      grd2.addColorStop(1, "transparent");
      ctx.fillStyle = grd2;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";

      // Subtle Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let x = 0; x < W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for(let y = 0; y < H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();

      // Draw Stars
      s.stars.forEach(star => {
         ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.layer * 0.2})`;
         ctx.beginPath(); ctx.arc(star.x, star.y, star.s, 0, Math.PI*2); ctx.fill();
      });
      
      // Draw Connections (Neon Lasers)
      ctx.globalCompositeOperation = "screen";
      s.connections.forEach(c => {
         const fromNode = s.nodes.find(n => n.id === c.fromId);
         const toNode = s.nodes.find(n => n.id === c.toId);
         if (fromNode && toNode) {
            const teamColor = COLORS[c.team];
            
            // Core beam
            ctx.strokeStyle = teamColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();

            // Glow 1
            ctx.strokeStyle = teamColor;
            ctx.lineWidth = 8;
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            
            // Glow 2
            ctx.lineWidth = 16;
            ctx.globalAlpha = 0.15;
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Flow pulses
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 24]);
            ctx.lineDashOffset = -s.tick * 3.0; 
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();
            ctx.setLineDash([]);
         }
      });
      ctx.globalCompositeOperation = "source-over";

      // Draw Drag Line
      if (s.pointer.active && !s.pointer.slicing) {
         const fromNode = s.nodes.find(n => n.id === s.pointer.startNodeId);
         if (fromNode) {
            ctx.strokeStyle = "rgba(0, 242, 254, 0.7)"; 
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(s.pointer.x, s.pointer.y);
            ctx.stroke();
            
            // Target reticle
            const target = getNodeAt(s.pointer.x, s.pointer.y);
            if (target && target.id !== fromNode.id) {
               ctx.strokeStyle = COLORS[target.team];
               ctx.beginPath();
               ctx.arc(target.x, target.y, target.r + 12, 0, Math.PI*2);
               ctx.stroke();
            }
         }
      }

      // Draw Troops (Glowing Spaceships/Arrows with trails)
      s.troops.forEach(t => {
         const target = s.nodes.find(n => n.id === t.targetId);
         let angle = 0;
         if (target) angle = Math.atan2(target.y - t.y, target.x - t.x);
         const tColor = COLORS[t.team];
         
         // Trail
         if (t.history.length > 0) {
             ctx.beginPath();
             ctx.moveTo(t.x, t.y);
             t.history.forEach(pt => ctx.lineTo(pt.x, pt.y));
             ctx.strokeStyle = tColor;
             ctx.lineWidth = 3;
             ctx.globalAlpha = 0.4;
             ctx.stroke();
             ctx.globalAlpha = 1.0;
         }
         
         ctx.save();
         ctx.translate(t.x, t.y);
         ctx.rotate(angle);
         
         ctx.globalCompositeOperation = "screen";
         
         // Glow
         ctx.fillStyle = tColor;
         ctx.shadowColor = tColor;
         ctx.shadowBlur = 10;
         ctx.globalAlpha = 0.6;
         ctx.beginPath(); ctx.arc(-2, 0, 8, 0, Math.PI*2); ctx.fill();
         ctx.globalAlpha = 1.0;
         ctx.shadowBlur = 0;
         
         // Arrow shape
         ctx.fillStyle = "#fff";
         ctx.beginPath();
         ctx.moveTo(8, 0);
         ctx.lineTo(-6, -5);
         ctx.lineTo(-4, 0);
         ctx.lineTo(-6, 5);
         ctx.closePath();
         ctx.fill();
         
         // Color accent
         ctx.fillStyle = tColor;
         ctx.beginPath();
         ctx.moveTo(4, 0);
         ctx.lineTo(-5, -2);
         ctx.lineTo(-3, 0);
         ctx.lineTo(-5, 2);
         ctx.closePath();
         ctx.fill();

         ctx.restore();
      });

      // Draw Explosions / Shockwaves
      ctx.globalCompositeOperation = "screen";
      s.explosions.forEach(exp => {
         if (exp.isShockwave) {
             ctx.strokeStyle = exp.color;
             ctx.lineWidth = 6 * exp.life;
             ctx.shadowColor = exp.color;
             ctx.shadowBlur = 15;
             ctx.beginPath();
             ctx.arc(exp.x, exp.y, 60 * (1 - exp.life), 0, Math.PI*2);
             ctx.stroke();
             ctx.shadowBlur = 0;
         } else {
             // Hot core fading to color
             ctx.fillStyle = exp.life > 0.6 ? "#fff" : exp.color;
             ctx.globalAlpha = exp.life;
             ctx.shadowColor = exp.color;
             ctx.shadowBlur = 8;
             ctx.beginPath();
             ctx.arc(exp.x, exp.y, exp.size * exp.life, 0, Math.PI*2);
             ctx.fill();
             ctx.globalAlpha = 1.0;
             ctx.shadowBlur = 0;
         }
      });
      ctx.globalCompositeOperation = "source-over";

      // Draw Slash Trail
      if (s.slashTrail && s.slashTrail.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.moveTo(s.slashTrail[0].x, s.slashTrail[0].y);
          s.slashTrail.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.stroke();
          
          ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
          ctx.lineWidth = 12;
          ctx.shadowColor = "#00f2fe";
          ctx.shadowBlur = 15;
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          s.slashTrail.forEach(pt => pt.age -= 0.15);
          s.slashTrail = s.slashTrail.filter(pt => pt.age > 0);
      }

      // Draw Nodes (Glowing Cyber Cores)
      s.nodes.forEach(n => {
         const tColor = COLORS[n.team];
         
         ctx.save();
         ctx.translate(n.x, n.y);
         
         // Outer pulse glow
         const pulse = Math.sin(s.tick * 0.1) * 3;
         ctx.fillStyle = tColor;
         ctx.globalAlpha = 0.15;
         ctx.beginPath(); ctx.arc(0, 0, n.r + 8 + pulse, 0, Math.PI*2); ctx.fill();
         ctx.globalAlpha = 1.0;
         
         // Rotating outer ring
         ctx.rotate(s.tick * 0.03 * (n.team === 1 ? 1 : -1));
         ctx.strokeStyle = tColor;
         ctx.lineWidth = 3;
         ctx.shadowColor = tColor;
         ctx.shadowBlur = 10;
         ctx.beginPath(); ctx.arc(0, 0, n.r, 0, Math.PI * 1.6); ctx.stroke();
         ctx.shadowBlur = 0;
         
         ctx.rotate(-s.tick * 0.03 * (n.team === 1 ? 1 : -1)); // reset rot
         
         // Inner Core Background
         ctx.fillStyle = "#0c0c14"; 
         ctx.beginPath(); ctx.arc(0, 0, n.r - 4, 0, Math.PI*2); ctx.fill();
         
         // Fill level indicator (Smooth clipping)
         const fillRatio = Math.max(0.05, n.troops / n.max);
         ctx.save();
         ctx.beginPath(); ctx.arc(0, 0, n.r - 4, 0, Math.PI*2); ctx.clip();
         
         ctx.fillStyle = tColor;
         ctx.globalAlpha = 0.2;
         ctx.fillRect(-n.r, -n.r, n.r*2, n.r*2); // dim background fill
         
         ctx.globalAlpha = 0.6;
         // Draw wave for fill level
         const waveH = n.r * 2 * fillRatio;
         const waveY = (n.r - 4) - waveH;
         ctx.beginPath();
         ctx.moveTo(-n.r, waveY);
         for (let wx = -n.r; wx < n.r; wx += 5) {
             ctx.lineTo(wx, waveY + Math.sin(wx * 0.1 + s.tick * 0.1) * 3);
         }
         ctx.lineTo(n.r, n.r);
         ctx.lineTo(-n.r, n.r);
         ctx.fill();
         
         ctx.restore(); // end clip

         // Core border
         ctx.strokeStyle = "rgba(255,255,255,0.1)";
         ctx.lineWidth = 1;
         ctx.beginPath(); ctx.arc(0, 0, n.r - 4, 0, Math.PI*2); ctx.stroke();

         // Text (Troop Count)
         ctx.fillStyle = "#ffffff";
         ctx.font = "800 18px 'Plus Jakarta Sans', sans-serif";
         ctx.textAlign = "center";
         ctx.textBaseline = "middle";
         ctx.shadowColor = tColor;
         ctx.shadowBlur = 12;
         ctx.fillText(n.troops.toString(), 0, 0);
         ctx.shadowBlur = 0; // reset
         
         ctx.restore();
      });

      ctx.restore(); // End global save for screen shake
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      canvas.removeEventListener("touchstart", handleDown);
      canvas.removeEventListener("touchmove", handleMove);
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
    <GameShell title="Realm Clash" score={hud.score} level={hud.level}
      phase={phase} onPause={togglePause} onResume={togglePause} onRestart={restart}>
      <div style={{
        position: "relative",
        margin: "0 auto",
        width: "100%",
        maxWidth: "min(420px, calc(80vh * 360 / 520))",
        background: "rgba(15, 15, 25, 0.7)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: "32px",
        overflow: "hidden",
        border: "1px solid rgba(0, 242, 254, 0.15)",
        boxShadow: "0 24px 80px rgba(0, 0, 0, 0.8), 0 0 50px rgba(0, 242, 254, 0.1) inset",
        padding: "10px"
      }}>
        <div style={{
          borderRadius: "24px",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "#050508",
          boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.5)"
        }}>
          <canvas ref={canvasRef}
            style={{ 
              width: "100%", 
              aspectRatio: "360 / 520",
              display: "block", 
              touchAction: "none",
              filter: "contrast(1.1) brightness(1.1)"
            }} />
        </div>
      </div>
      <p style={{ 
        color: "rgba(255,255,255,0.7)", 
        fontSize: "0.9rem", 
        fontWeight: "600",
        textAlign: "center", 
        padding: "20px 0 10px", 
        margin: 0,
        textShadow: "0 2px 4px rgba(0,0,0,0.5)"
      }}>
        Drag to link cores. Swipe to sever links.
      </p>
    </GameShell>
  );
}
