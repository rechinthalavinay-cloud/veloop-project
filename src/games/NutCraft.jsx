import { useEffect, useRef, useState, useCallback } from "react";
import { GameShell } from "./GameShell";
import "./NutCraft.css";

const COLORS = ["blue", "green", "brown", "red", "purple", "orange", "teal", "pink"];

// Audio Synthesizer
const playSound = (type, ctxRef) => {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
  const actx = ctxRef.current;
  if (actx.state === "suspended") actx.resume();

  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.connect(gain);
  gain.connect(actx.destination);

  if (type === "unscrew") {
    // Metallic twisting sound
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, actx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, actx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.15);
    osc.start();
    osc.stop(actx.currentTime + 0.15);
  } else if (type === "screw") {
    // Metallic lock sound
    osc.type = "square";
    osc.frequency.setValueAtTime(800, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, actx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
    osc.start();
    osc.stop(actx.currentTime + 0.1);
  } else if (type === "drop") {
    // Wooden thud
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, actx.currentTime + 0.3);
    osc.start();
    osc.stop(actx.currentTime + 0.3);
  }
};

function generateLevelData(levelIdx) {
  const numPlanks = Math.min(2 + Math.floor(levelIdx * 1.5), 10);
  const holes = [];
  const screws = [];
  const planks = [];
  
  const randPt = () => ({
    x: 40 + Math.floor(Math.random() * 260),
    y: 60 + Math.floor(Math.random() * 280)
  });

  const tooClose = (pt, minDist = 50) => {
    return holes.some(h => Math.hypot(h.x - pt.x, h.y - pt.y) < minDist);
  };

  const poolSize = numPlanks * 2;
  for (let i = 0; i < poolSize; i++) {
    let p, attempts = 0;
    do { p = randPt(); attempts++; } while (tooClose(p) && attempts < 100);
    if (attempts < 100) {
      holes.push({ id: `h${i}`, x: p.x, y: p.y });
    }
  }

  for (let i = 0; i < numPlanks; i++) {
    let h1, h2, attempts = 0;
    do {
      h1 = holes[Math.floor(Math.random() * holes.length)];
      h2 = holes[Math.floor(Math.random() * holes.length)];
      attempts++;
    } while (
      (h1.id === h2.id || 
       Math.hypot(h1.x - h2.x, h1.y - h2.y) < 60 ||
       planks.some(p => (p.h1 === h1.id && p.h2 === h2.id) || (p.h1 === h2.id && p.h2 === h1.id))
      ) && attempts < 100
    );
    
    if (attempts < 100) {
      planks.push({
        id: `p${i}`,
        color: COLORS[i % COLORS.length],
        h1: h1.id,
        h2: h2.id,
        z: (i + 1) * 10
      });
    }
  }

  const usedIds = new Set();
  planks.forEach(p => { usedIds.add(p.h1); usedIds.add(p.h2); });
  const activeHoles = holes.filter(h => usedIds.has(h.id));
  
  const shuffledActive = [...activeHoles].sort(() => Math.random() - 0.5);
  const emptyActiveCount = Math.min(2, Math.floor(activeHoles.length / 3));
  const screwHoles = shuffledActive.slice(emptyActiveCount);
  
  screwHoles.forEach((h, i) => {
    screws.push({ id: `s${i}`, holeId: h.id });
  });

  const finalHoles = [...activeHoles];
  for (let i = 0; i < 4; i++) {
    let p, attempts = 0;
    do { p = randPt(); attempts++; } while (tooClose(p) && attempts < 100);
    if (attempts < 100) {
      const hObj = { id: `e${i}`, x: p.x, y: p.y };
      finalHoles.push(hObj);
      holes.push(hObj);
    }
  }

  planks.forEach(p => {
    const hasS1 = screws.some(s => s.holeId === p.h1);
    const hasS2 = screws.some(s => s.holeId === p.h2);
    if (!hasS1 && !hasS2) {
      screws.push({ id: `s_rescue_${p.id}`, holeId: p.h1 });
    }
  });

  return { holes: finalHoles, screws, planks };
}

export function NutCraft({ onOutcome, reviveSignal }) {
  const [phase, setPhase] = useState("playing"); // playing, level_complete, over, complete
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(45);
  const [lives, setLives] = useState(3);
  
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [levelData, setLevelData] = useState(() => generateLevelData(0));
  
  const [screws, setScrews] = useState(levelData.screws);
  const [fallenPlanks, setFallenPlanks] = useState([]);
  
  const [selectedScrew, setSelectedScrew] = useState(null);
  const [particles, setParticles] = useState([]);
  const [hasInteracted, setHasInteracted] = useState(false);

  const liveRef = useRef(true);
  const boardRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    liveRef.current = true;
    const id = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          liveRef.current = false;
          setPhase("over");
          setLives(l => l - 1);
          setTimeout(() => onOutcome?.({ type: "over", score: score }), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, onOutcome, score]);

  useEffect(() => {
    if (!reviveSignal) return;
    liveRef.current = true;
    setTime(t => Math.max(t, 45));
    setLives(l => Math.max(l, 1));
    setPhase("playing");
  }, [reviveSignal]);

  // Check Win Condition
  useEffect(() => {
    if (phase === "playing" && fallenPlanks.length === levelData.planks.length && levelData.planks.length > 0) {
      if (currentLevelIdx < 4) {
        setPhase("level_complete");
        setScore(s => s + 50 + time * 5);
      } else {
        setPhase("complete");
        const finalScore = score + 100 + time * 10;
        setScore(finalScore);
        setTimeout(() => onOutcome?.({ type: "complete", score: finalScore }), 1000);
      }
    }
  }, [fallenPlanks, phase, score, time, onOutcome, currentLevelIdx, levelData.planks.length]);

  const handleNextLevel = () => {
    const nextIdx = currentLevelIdx + 1;
    setTime(t => t + 20);
    setCurrentLevelIdx(nextIdx);
    const nextData = generateLevelData(nextIdx);
    setLevelData(nextData);
    setScrews(nextData.screws);
    setFallenPlanks([]);
    setSelectedScrew(null);
    setPhase("playing");
  };

  const handleScrewClick = (screwId) => {
    if (phase !== "playing") return;
    setHasInteracted(true);
    if (selectedScrew === screwId) {
      setSelectedScrew(null);
      playSound("screw", audioCtxRef);
    } else {
      setSelectedScrew(screwId);
      playSound("unscrew", audioCtxRef);
    }
  };

  const handleHoleClick = (holeId) => {
    if (phase !== "playing" || !selectedScrew) return;
    const isOccupied = screws.some(s => s.holeId === holeId);
    if (isOccupied) return;

    // Move screw
    setScrews(screws.map(s => s.id === selectedScrew ? { ...s, holeId } : s));
    setSelectedScrew(null);
    playSound("screw", audioCtxRef);
  };

  const spawnParticles = (x, y) => {
    const newParts = [];
    for(let i=0; i<6; i++) {
      newParts.push({
        id: Math.random().toString(),
        x, y,
        vx: (Math.random()-0.5)*8,
        vy: (Math.random()-0.5)*8 - 4,
        life: 1.0
      });
    }
    setParticles(p => [...p, ...newParts]);
  };

  useEffect(() => {
    if (particles.length === 0) return;
    let frame;
    const update = () => {
      setParticles(prev => prev.map(p => ({
        ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.4, life: p.life - 0.04
      })).filter(p => p.life > 0));
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [particles.length]);

  const handlePlankFall = (plankId, anchorX, anchorY) => {
    setFallenPlanks(prev => {
      if (prev.includes(plankId)) return prev;
      playSound("drop", audioCtxRef);
      spawnParticles(anchorX, anchorY);
      return [...prev, plankId];
    });
  };

  const restart = () => {
    setPhase("playing");
    setScore(0);
    setTime(45);
    setLives(3);
    setCurrentLevelIdx(0);
    const freshData = generateLevelData(0);
    setLevelData(freshData);
    setScrews(freshData.screws);
    setFallenPlanks([]);
    setSelectedScrew(null);
    setHasInteracted(false);
  };

  const togglePause = () => {
    if (phase === "level_complete") return;
    setPhase(p => p === "paused" ? "playing" : "paused");
  };

  return (
    <GameShell 
      title="Nut Craft" 
      score={score} 
      lives={lives} 
      time={time} 
      level={currentLevelIdx + 1}
      phase={phase === "level_complete" ? "playing" : phase} 
      onPause={togglePause} 
      onResume={togglePause} 
      onRestart={restart}
    >
      <div className="nutcraft-board" ref={boardRef}>

        {/* Tutorial Overlay */}
        {!hasInteracted && currentLevelIdx === 0 && (
          <div className="tutorial-overlay">
            <h2>UNSCREW THE NUTS</h2>
            <p>Move nuts to empty holes to drop the planks!</p>
          </div>
        )}

        {/* Level Complete Modal */}
        {phase === "level_complete" && (
          <div className="nc-modal">
            <h1>LEVEL COMPLETE!</h1>
            <div className="nc-modal-stats">
              ⭐⭐⭐<br/>
              Time Left: {time}s<br/>
              Planks Cleared: {levelData.planks.length}
            </div>
            <button className="nc-modal-btn" onClick={handleNextLevel}>
              NEXT LEVEL
            </button>
          </div>
        )}

        {/* Render Holes */}
        {levelData.holes.map(hole => (
          <div key={`h-${hole.id}`} className="hole" style={{ left: hole.x, top: hole.y }} />
        ))}
        {levelData.holes.map(hole => (
          <div 
            key={`hi-${hole.id}`} 
            className="hole-interactive" 
            style={{ left: hole.x, top: hole.y }}
            onClick={() => handleHoleClick(hole.id)}
          />
        ))}

        {/* Render Planks */}
        {levelData.planks.map(plank => {
          return (
            <Plank 
              key={`level-${currentLevelIdx}-${plank.id}`} 
              plank={plank} 
              holes={levelData.holes} 
              screws={screws} 
              fallen={fallenPlanks} 
              onFall={handlePlankFall}
            />
          );
        })}

        {/* Render Screws */}
        {screws.map(screw => {
          const hole = levelData.holes.find(h => h.id === screw.holeId);
          const isSelected = selectedScrew === screw.id;

          return (
            <div
              key={screw.id}
              className={`screw-interactive ${isSelected ? 'selected' : ''}`}
              style={{ left: hole.x, top: hole.y }}
              onClick={() => handleScrewClick(screw.id)}
            >
              <div className="screw-visual">
                <div className="screw-cross" />
              </div>
            </div>
          );
        })}

        {/* Render Particles */}
        {particles.map(p => (
          <div key={p.id} className="splinter" style={{ left: p.x, top: p.y, transform: `rotate(${p.vx * 15}deg)`, opacity: p.life }} />
        ))}

      </div>

      {/* Override GameShell HUD visually here since we use GameShell */}
      <style>{`
        #game-time { 
          ${time <= 10 && phase === 'playing' ? 'color: #ff5252 !important; animation: pulseTimer 1s infinite;' : ''}
        }
      `}</style>
    </GameShell>
  );
}

function Plank({ plank, holes, screws, fallen, onFall }) {
  const p1 = holes.find(h => h.id === plank.h1);
  const p2 = holes.find(h => h.id === plank.h2);
  
  const hasS1_current = screws.some(s => s.holeId === plank.h1);
  const hasS2_current = screws.some(s => s.holeId === plank.h2);

  const detached1 = useRef(false);
  const detached2 = useRef(false);
  const [shaking, setShaking] = useState(false);

  if (!hasS1_current) detached1.current = true;
  if (!hasS2_current) detached2.current = true;

  const hasS1 = hasS1_current && !detached1.current;
  const hasS2 = hasS2_current && !detached2.current;

  const isFallen = fallen.includes(plank.id);

  // We need to keep the last anchor to fall from
  const anchorRef = useRef(plank.h1);
  if (hasS1 && !hasS2) anchorRef.current = plank.h1;
  if (!hasS1 && hasS2) anchorRef.current = plank.h2;
  if (hasS1 && hasS2) anchorRef.current = plank.h1;

  const isH1 = anchorRef.current === plank.h1;
  const anchorHole = isH1 ? p1 : p2;

  useEffect(() => {
    if (!hasS1 && !hasS2 && !isFallen && !shaking) {
      setShaking(true);
      // Pre-fall shake delay
      setTimeout(() => {
        onFall(plank.id, anchorHole.x, anchorHole.y);
        setShaking(false);
      }, 150);
    }
  }, [hasS1, hasS2, isFallen, shaking, plank.id, onFall, anchorHole.x, anchorHole.y]);

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.hypot(dx, dy);
  const baseAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  let targetAngle;
  if (hasS1 && hasS2) {
    targetAngle = baseAngle;
  } else {
    // Swinging naturally down
    targetAngle = isH1 ? 90 : -90;
    // Keep angle positive/negative aligned for smooth shortest-path rotation
    if (Math.abs(targetAngle - baseAngle) > 180) {
       targetAngle = targetAngle > baseAngle ? targetAngle - 360 : targetAngle + 360;
    }
  }

  // Shake effect before falling
  let shakeTransform = "";
  if (shaking) {
    shakeTransform = `translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*6}px) `;
  }

  // Realistic Physics Drop Animation
  let wrapperTransform = isFallen ? `translateY(600px) ` : shakeTransform;
  wrapperTransform += `rotate(${targetAngle}deg)`;
  if (isFallen) {
    wrapperTransform += ` rotate(${isH1 ? 60 : -60}deg)`;
  }

  return (
    <div className={`plank-wrapper ${isFallen ? 'fallen' : (shaking ? 'falling' : '')}`} style={{
      position: 'absolute',
      left: anchorHole.x, 
      top: anchorHole.y,
      transform: wrapperTransform,
      transition: hasS1 && hasS2 && !shaking ? 'none' : 'transform 0.6s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.5s ease-in',
      zIndex: plank.z,
    }}>
      <div className={`plank ${plank.color}`} style={{
        position: 'absolute',
        top: -18,
        left: isH1 ? -18 : -length - 18,
        width: length + 36,
        height: 36,
        borderRadius: 18,
      }}>
        <div className="plank-texture" />
      </div>
    </div>
  );
}
