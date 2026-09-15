import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

const W = 360;
const H = 520;
const COLORS = {
  0: "#757575", // Neutral Grey
  1: "#1976d2", // Player Blue
  2: "#d32f2f"  // Enemy Red
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

  function init(keepScore = 0) {
    return {
      score: keepScore, level: levelRef.current, tick: 0,
      nodes: getLevelConfig(levelRef.current),
      troops: [],
      explosions: [], // for mid-path troop clashes
      slashTrail: [], // for cutting connections
      connections: [], // { fromId, toId, team }
      pointer: { active: false, slicing: false, x: 0, y: 0, startNodeId: null },
      winTimer: 0
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
      return s.nodes.find(n => Math.hypot(n.x - x, n.y - y) <= n.r + 10);
    };

    const toggleConnection = (fromNode, toNode) => {
      // Check if connection already exists
      const existingIdx = s.connections.findIndex(c => c.fromId === fromNode.id && c.toId === toNode.id);
      if (existingIdx !== -1) {
         // Sever connection
         s.connections.splice(existingIdx, 1);
      } else {
         // Establish connection
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
                     if (distSq < 400 && c.team === 1) { // 20px slice radius (only allow player to slice THEIR OWN lines!)
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
            // Dragged to a different node: Toggle specific connection
            const fromNode = s.nodes.find(n => n.id === s.pointer.startNodeId);
            if (fromNode) {
               toggleConnection(fromNode, targetNode);
            }
         } else {
            // Tap/released on the same node: Sever ALL outgoing connections from this node
            s.connections = s.connections.filter(c => c.fromId !== s.pointer.startNodeId);
         }
      }
      s.pointer.active = false;
    };

    canvas.addEventListener("pointerdown", handleDown);
    canvas.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    let frame;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (phaseRef.current !== "playing") return;
      s.tick++;

      // Node Generation Logic (every ~0.4s)
      if (s.tick % 25 === 0) {
         s.nodes.forEach(n => {
           if (n.team !== 0 && n.troops < n.max) {
             n.troops++;
           }
         });
      }

      // Connection Streaming Logic (spawn troops along connections)
      s.connections.forEach((c) => {
         const fromNode = s.nodes.find(n => n.id === c.fromId);
         const toNode = s.nodes.find(n => n.id === c.toId);
         
         // Clean up invalid connections (if tower was captured, or doesn't exist)
         if (!fromNode || !toNode || fromNode.team !== c.team) {
            c.invalid = true;
            return;
         }

         // Spawn rate based on troops! More troops = faster stream.
         // e.g., At 20 troops -> spawn every 7 ticks. At 10 troops -> spawn every 15 ticks.
         const rate = Math.max(3, Math.floor(150 / Math.max(1, fromNode.troops)));

         if (s.tick % rate === 0) {
            s.troops.push({
               x: fromNode.x,
               y: fromNode.y,
               team: c.team,
               targetId: c.toId,
               speed: 3.5 + Math.random() * 0.5
            });
         }
      });
      s.connections = s.connections.filter(c => !c.invalid);

      // Enemy AI
      if (s.tick % 60 === 0) {
         // Clean up AI connections to captured nodes
         s.connections.forEach(c => {
            if (c.team === 2) {
               const toNode = s.nodes.find(n => n.id === c.toId);
               if (toNode && toNode.team === 2) {
                  c.invalid = true; // Sever connection if target was already captured by Red
               }
            }
         });
         s.connections = s.connections.filter(c => !c.invalid);

         // Make new connections
         const redNodes = s.nodes.filter(n => n.team === 2);
         redNodes.forEach(attacker => {
            const myConns = s.connections.filter(c => c.fromId === attacker.id).length;
            // Only allow 1 or 2 connections per tower to prevent draining instantly
            if (myConns < 2 && attacker.troops > 15) {
               // Find closest target that isn't already red
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
                  // Only establish if connection doesn't exist
                  const exists = s.connections.some(c => c.fromId === attacker.id && c.toId === bestTarget.id);
                  if (!exists) toggleConnection(attacker, bestTarget);
               }
            }
         });
      }

      // Troop Logic
      for (let i = s.troops.length - 1; i >= 0; i--) {
         const t = s.troops[i];
         
         // Troop vs Troop clash collision
         let clashed = false;
         for (let j = 0; j < s.troops.length; j++) {
            if (i !== j) {
               const other = s.troops[j];
               if (t.team !== other.team && !t.dead && !other.dead) {
                  if (Math.hypot(t.x - other.x, t.y - other.y) < 6) { // Collision radius
                     t.dead = true;
                     other.dead = true;
                     clashed = true;
                     s.explosions.push({ x: (t.x + other.x)/2, y: (t.y + other.y)/2, life: 1.0 });
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
            // Hit tower!
            if (target.team === t.team) {
               if (target.troops < target.max) target.troops++;
            } else {
               target.troops--;
               if (target.troops < 0) {
                  // Capture!
                  target.team = t.team;
                  target.troops = 1;
                  s.score += 50;
                  // (Connections to this node remain active to reinforce it!)
               }
            }
            t.dead = true;
         } else {
            // Move strictly along path (removed random wobble for realism)
            t.x += (dx / dist) * t.speed;
            t.y += (dy / dist) * t.speed;
         }
      }
      
      // Cleanup dead troops
      s.troops = s.troops.filter(t => !t.dead);
      
      // Explosions Logic
      s.explosions.forEach(exp => {
         exp.life -= 0.1;
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


      // RENDER
      // Background (Bright grassy field)
      ctx.fillStyle = "#8bc34a"; // bright green grass
      ctx.fillRect(0, 0, W, H);
      
      // Draw sandy borders
      ctx.fillStyle = "#ebd1a1";
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 80);
      ctx.quadraticCurveTo(W/2, 40, 0, 100); ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(W, H - 100);
      ctx.quadraticCurveTo(W/2, H - 60, 0, H - 80); ctx.fill();

      // Trees and rocks
      ctx.fillStyle = "#2e7d32"; // tree
      ctx.beginPath(); ctx.arc(40, 40, 15, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(W-30, 50, 12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(60, H-40, 18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1b5e20";
      ctx.beginPath(); ctx.arc(45, 35, 10, 0, Math.PI*2); ctx.fill();
      
      ctx.fillStyle = "#8d6e63"; // crates/rocks
      ctx.fillRect(W-60, H-50, 20, 20);
      ctx.fillRect(W-40, H-60, 15, 15);
      ctx.fillRect(30, 80, 18, 18);

      // Draw Established Connections (Roads)
      s.connections.forEach(c => {
         const fromNode = s.nodes.find(n => n.id === c.fromId);
         const toNode = s.nodes.find(n => n.id === c.toId);
         if (fromNode && toNode) {
            // Draw path lines on the ground
            // Solid colored path
            ctx.strokeStyle = COLORS[c.team];
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();

            // White moving dashes (like chevrons/arrows)
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 16]);
            ctx.lineDashOffset = -s.tick * 1.5; // Animated
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();
            ctx.setLineDash([]);
         }
      });

      // Draw Current Drag Line (only if dragging from a node)
      if (s.pointer.active && !s.pointer.slicing) {
         const fromNode = s.nodes.find(n => n.id === s.pointer.startNodeId);
         if (fromNode) {
            ctx.strokeStyle = "rgba(25, 118, 210, 0.5)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(s.pointer.x, s.pointer.y);
            ctx.stroke();
            
            // Draw targeting reticle
            const target = getNodeAt(s.pointer.x, s.pointer.y);
            if (target && target.id !== fromNode.id) {
               ctx.strokeStyle = COLORS[target.team];
               ctx.beginPath();
               ctx.arc(target.x, target.y, target.r + 8, 0, Math.PI*2);
               ctx.stroke();
            }
         }
      }

      // Draw Troops (Little Soldiers)
      s.troops.forEach(t => {
         const target = s.nodes.find(n => n.id === t.targetId);
         let angle = 0;
         if (target) angle = Math.atan2(target.y - t.y, target.x - t.x);
         
         ctx.save();
         ctx.translate(t.x, t.y);
         ctx.rotate(angle);
         
         // Tiny body
         ctx.fillStyle = "#222";
         ctx.beginPath(); ctx.arc(-2, 0, 3, 0, Math.PI*2); ctx.fill();
         // Colored Helmet
         ctx.fillStyle = COLORS[t.team];
         ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
         ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
         // Tiny sword
         ctx.fillStyle = "#ddd";
         ctx.fillRect(0, 3, 6, 2);
         
         ctx.restore();
      });

      // Draw Explosions
      s.explosions.forEach(exp => {
         ctx.fillStyle = `rgba(255, 200, 50, ${exp.life})`;
         ctx.beginPath();
         ctx.arc(exp.x, exp.y, 10 * (1 - exp.life), 0, Math.PI*2);
         ctx.fill();
         ctx.strokeStyle = `rgba(255, 100, 0, ${exp.life})`;
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.arc(exp.x, exp.y, 15 * (1 - exp.life), 0, Math.PI*2);
         ctx.stroke();
      });

      // Draw Slash Trail (Fruit Ninja style)
      if (s.slashTrail && s.slashTrail.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.moveTo(s.slashTrail[0].x, s.slashTrail[0].y);
          s.slashTrail.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.stroke();
          
          s.slashTrail.forEach(pt => pt.age -= 0.1);
          s.slashTrail = s.slashTrail.filter(pt => pt.age > 0);
      }

      // Draw Nodes (Blocky Striped Towers)
      s.nodes.forEach(n => {
         // Drop Shadow
         ctx.fillStyle = "rgba(0,0,0,0.15)";
         ctx.beginPath(); 
         ctx.ellipse(n.x, n.y + n.r*0.3, n.r*1.5, n.r*0.75, 0, 0, Math.PI*2); 
         ctx.fill();
         
         // Helper for rounded blocks
         const drawBlock = (yOffset, w, h, color, shadeColor, isStriped) => {
             // Main body
             ctx.fillStyle = color;
             ctx.beginPath(); ctx.roundRect(n.x - w/2, n.y - yOffset, w, h, 6); ctx.fill();
             // Shadow side
             ctx.fillStyle = shadeColor;
             ctx.beginPath(); ctx.roundRect(n.x, n.y - yOffset, w/2, h, [0, 6, 6, 0]); ctx.fill();
             
             if (isStriped) {
                 ctx.fillStyle = "rgba(0,0,0,0.1)";
                 ctx.fillRect(n.x - w/2, n.y - yOffset + h*0.3, w, h*0.2);
                 ctx.fillRect(n.x - w/2, n.y - yOffset + h*0.7, w, h*0.2);
             }
         };

         // Base Colored Block with Door
         const shade = n.team === 0 ? "#555" : "rgba(0,0,0,0.2)";
         drawBlock(n.r*0.2, n.r*1.4, n.r*0.8, COLORS[n.team], shade, false);
         // Door
         ctx.fillStyle = "#333";
         ctx.beginPath(); ctx.roundRect(n.x - n.r*0.3, n.y + n.r*0.2, n.r*0.6, n.r*0.4, [4, 4, 0, 0]); ctx.fill();

         // Middle White Striped Block
         drawBlock(n.r*1.2, n.r*1.3, n.r, "#f5f5f5", "#d6d6d6", true);
         
         // Top Colored Block
         drawBlock(n.r*1.8, n.r*1.4, n.r*0.6, COLORS[n.team], shade, false);

         // Number badge on top
         ctx.fillStyle = "rgba(255,255,255,0.9)";
         ctx.beginPath(); ctx.roundRect(n.x - n.r*0.6, n.y - n.r*2.4, n.r*1.2, n.r*0.8, 8); ctx.fill();

         // Text (Troop Count)
         ctx.fillStyle = COLORS[n.team] === "#757575" ? "#333" : COLORS[n.team];
         ctx.font = "900 14px sans-serif";
         ctx.textAlign = "center";
         ctx.textBaseline = "middle";
         ctx.fillText(n.troops.toString(), n.x, n.y - n.r*2.0);
      });

    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
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
        background: "rgba(16, 16, 22, 0.4)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "28px",
        overflow: "hidden",
        border: "1px solid rgba(139, 92, 246, 0.3)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(139, 92, 246, 0.15)",
        padding: "6px"
      }}>
        <div style={{
          borderRadius: "22px",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          backgroundColor: "#8bc34a"
        }}>
          <canvas ref={canvasRef}
            style={{ 
              width: "100%", 
              aspectRatio: "360 / 520",
              display: "block", 
              touchAction: "none"
            }} />
        </div>
      </div>
      <p style={{ 
        color: "#a3a3a3", 
        fontSize: "0.85rem", 
        fontWeight: "500",
        textAlign: "center", 
        padding: "16px 0 8px", 
        margin: 0,
        textShadow: "0 2px 10px rgba(0,0,0,0.5)"
      }}>
        Drag to establish connections. Drag again to sever them.
      </p>
    </GameShell>
  );
}
