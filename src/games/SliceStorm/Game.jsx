import { useEffect, useRef, useState } from "react";
import styles from "./Game.module.css";

const FRUITS = ["🍉", "🍓", "🍊", "🍍", "🥝", "🍎", "🍇", "🍑"];
const WIDTH = 390;
const HEIGHT = 620;

const makeFruit = (id) => ({
  id,
  kind: Math.random() < 0.1 ? "bomb" : "fruit",
  emoji: FRUITS[Math.floor(Math.random() * FRUITS.length)],
  x: 50 + Math.random() * (WIDTH - 100),
  y: HEIGHT + 20,
  vx: -2 + Math.random() * 4,
  vy: -14 - Math.random() * 5,
  sliced: false,
  scale: 0.8 + Math.random() * 0.5,
  rot: Math.random() * Math.PI * 2,
  rotSpeed: (-0.06 + Math.random() * 0.12),
});

export default function SliceStorm({ onOutcome, reviveSignal }) {
  const canvasRef = useRef(null);
  const itemsRef = useRef([]);
  const trailRef = useRef([]);
  const particlesRef = useRef([]);
  const splintersRef = useRef([]);
  const textsRef = useRef([]);
  const shakeRef = useRef(0);
  const flashRef = useRef(0);
  const idRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const playingRef = useRef(true);
  const [hud, setHud] = useState({ score: 0, lives: 3, combo: 0 });

  useEffect(() => {
    if (!reviveSignal) return;
    livesRef.current = Math.max(1, livesRef.current);
    playingRef.current = true;
    setHud((c) => ({ ...c, lives: livesRef.current }));
  }, [reviveSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let spawn = 0;
    let frame;

    const spawnParticles = (x, y, color) => {
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color,
          size: 3 + Math.random() * 4,
        });
      }
    };

    const sliceAt = (x, y) => {
      let hit = 0;
      itemsRef.current.forEach((item) => {
        const dx = item.x - x;
        const dy = item.y - y;
        if (!item.sliced && dx * dx + dy * dy < 1800) {
          item.sliced = true;
          if (item.kind === "bomb") {
            spawnParticles(item.x, item.y, "#ff4444");
            shakeRef.current = 25;
            flashRef.current = 1;
            playingRef.current = false;
            setTimeout(() => onOutcome?.({ type: "over", score: scoreRef.current }), 500);
          } else {
            spawnParticles(item.x, item.y, "#00e5ff");
            hit += 1;
            
            // Create Splinters (Left and Right halves)
            splintersRef.current.push({
              emoji: item.emoji, x: item.x, y: item.y,
              vx: item.vx - 3, vy: item.vy - 1,
              rot: item.rot, rotSpeed: -0.15, scale: item.scale, isLeft: true
            });
            splintersRef.current.push({
              emoji: item.emoji, x: item.x, y: item.y,
              vx: item.vx + 3, vy: item.vy - 1,
              rot: item.rot, rotSpeed: 0.15, scale: item.scale, isLeft: false
            });
          }
        }
      });
      if (hit) {
        comboRef.current += hit;
        const points = hit * 10 + Math.max(0, comboRef.current - 1) * 5;
        scoreRef.current += points;
        setHud({ score: scoreRef.current, lives: livesRef.current, combo: comboRef.current });
        
        textsRef.current.push({
          text: comboRef.current > 1 ? `Combo x${comboRef.current}!` : `+${points}`,
          x, y, life: 1, vy: -2, color: comboRef.current > 1 ? "#ffb300" : "#00e5ff"
        });
      }
    };

    const pointer = (event) => {
      if (!playingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const point = event.touches ? event.touches[0] : event;
      const x = ((point.clientX - rect.left) / rect.width) * WIDTH;
      const y = ((point.clientY - rect.top) / rect.height) * HEIGHT;
      trailRef.current.push({ x, y, life: 10 });
      sliceAt(x, y);
    };

    const pointerMove = (e) => { if (e.buttons || e.pressure > 0) pointer(e); };

    canvas.addEventListener("pointerdown", pointer);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("touchmove", pointer, { passive: true });

    const loop = () => {
      ctx.save();
      
      if (shakeRef.current > 0) {
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
        shakeRef.current *= 0.9;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
      }

      ctx.clearRect(-20, -20, WIDTH + 40, HEIGHT + 40);

      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 68, 68, ${flashRef.current})`;
        ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);
        flashRef.current -= 0.05;
      }

      spawn += 1;
      const difficultyFactor = Math.floor(scoreRef.current / 150);
      const spawnThreshold = Math.max(16, 38 - difficultyFactor * 2);
      
      if (playingRef.current && spawn % spawnThreshold === 0) {
        const fruit = makeFruit(idRef.current++);
        // Make them jump higher as it gets harder
        fruit.vy -= difficultyFactor * 0.4;
        itemsRef.current.push(fruit);
      }

      // Update & draw fruits
      itemsRef.current.forEach((item) => {
        if (item.sliced && item.kind === "fruit") return; // Sliced fruits are drawn as splinters
        
        item.vy += 0.24;
        item.x += item.vx;
        item.y += item.vy;
        item.rot += item.rotSpeed;

        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rot);
        ctx.scale(item.scale, item.scale);
        ctx.font = "44px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(item.kind === "bomb" ? "💣" : item.emoji, 0, 0);
        ctx.restore();
      });

      // Remove off-screen fruits
      const remaining = [];
      itemsRef.current.forEach((item) => {
        if (item.y > HEIGHT + 60) {
          if (!item.sliced && item.kind === "fruit" && playingRef.current) {
            livesRef.current -= 1;
            comboRef.current = 0;
            setHud({ score: scoreRef.current, lives: livesRef.current, combo: 0 });
            
            // Flash screen red for missed fruit
            flashRef.current = 0.3;
            
            if (livesRef.current <= 0) {
              playingRef.current = false;
              setTimeout(() => onOutcome?.({ type: "over", score: scoreRef.current }), 500);
            }
          }
        } else if (!item.sliced || item.kind === "bomb") {
          remaining.push(item);
        }
      });
      itemsRef.current = remaining;

      // Splinters (sliced fruit halves)
      splintersRef.current = splintersRef.current.filter((s) => s.y < HEIGHT + 60);
      splintersRef.current.forEach((s) => {
        s.vy += 0.28;
        s.x += s.vx;
        s.y += s.vy;
        s.rot += s.rotSpeed;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.scale(s.scale, s.scale);
        ctx.beginPath();
        if (s.isLeft) {
          ctx.rect(-50, -50, 50, 100);
        } else {
          ctx.rect(0, -50, 50, 100);
        }
        ctx.clip();
        ctx.font = "44px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.emoji, 0, 0);
        ctx.restore();
      });

      // Floating Texts
      textsRef.current = textsRef.current.filter((t) => t.life > 0);
      textsRef.current.forEach((t) => {
        t.y += t.vy;
        t.life -= 0.02;
        ctx.save();
        ctx.globalAlpha = t.life;
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      });

      // Particles
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.06;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const radius = Math.max(0, p.size * p.life);
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Slice trail (Neon Blue)
      trailRef.current = trailRef.current.map((d) => ({ ...d, life: d.life - 1 })).filter((d) => d.life > 0);
      if (trailRef.current.length > 1) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 1; i < trailRef.current.length; i++) {
          const t = trailRef.current[i].life / 10;
          ctx.strokeStyle = `rgba(0, 229, 255, ${t * 0.9})`;
          ctx.lineWidth = t * 6;
          ctx.beginPath();
          ctx.moveTo(trailRef.current[i - 1].x, trailRef.current[i - 1].y);
          ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore(); // Restore global shake transform
      
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", pointer);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("touchmove", pointer);
    };
  }, [onOutcome]);

  return (
    <div className={styles.wrap}>
      <div className={styles.hud}>
        <span>⚡ {hud.score}</span>
        <span>🔥 x{hud.combo}</span>
        <span>{"♥".repeat(Math.max(hud.lives, 0)).padEnd(3, "♡")}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className={styles.canvas}
        aria-label="Slice Storm play area"
      />
      <p className={styles.hint}>Swipe across fruit to slice · Avoid 💣 bombs</p>
    </div>
  );
}
