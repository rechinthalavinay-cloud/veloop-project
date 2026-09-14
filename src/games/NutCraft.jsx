import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";
import "./NutCraft.css";

const COLORS = ["blue", "green", "brown", "red", "purple", "orange", "teal", "pink"];

function generateLevelData(levelIdx) {
  const numPlanks = Math.min(2 + Math.floor(levelIdx * 1.5), 10);
  const holes = [];
  const screws = [];
  const planks = [];
  
  const randPt = () => ({
    x: 40 + Math.floor(Math.random() * 240),
    y: 60 + Math.floor(Math.random() * 200)
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
  const [phase, setPhase] = useState("playing");
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [levelData, setLevelData] = useState(() => generateLevelData(0));
  
  const [screws, setScrews] = useState(levelData.screws);
  const [fallenPlanks, setFallenPlanks] = useState([]);
  const [selectedScrew, setSelectedScrew] = useState(null);
  
  const liveRef = useRef(true);
  const scoreRef = useRef(score);
  scoreRef.current = score;

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    liveRef.current = true;
    const id = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          liveRef.current = false;
          setPhase("over");
          setTimeout(() => onOutcome?.({ type: "over", score: scoreRef.current }), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, onOutcome]);

  // Revive logic
  useEffect(() => {
    if (!reviveSignal) return;
    liveRef.current = true;
    setTime(t => Math.max(t, 30));
    setPhase("playing");
  }, [reviveSignal]);

  // Check Win Condition
  useEffect(() => {
    if (phase === "playing" && fallenPlanks.length === levelData.planks.length) {
      if (currentLevelIdx < 4) {
        // Next Level
        setScore(s => s + 50 + time * 5);
        const nextIdx = currentLevelIdx + 1;
        setTime(t => t + 10);
        setCurrentLevelIdx(nextIdx);
        const nextData = generateLevelData(nextIdx);
        setLevelData(nextData);
        setScrews(nextData.screws);
        setFallenPlanks([]);
        setSelectedScrew(null);
      } else {
        // Complete Game
        setPhase("complete");
        const finalScore = score + 100 + time * 10;
        setScore(finalScore);
        setTimeout(() => onOutcome?.({ type: "complete", score: finalScore }), 1000);
      }
    }
  }, [fallenPlanks, phase, score, time, onOutcome, currentLevelIdx, levelData.planks.length]);

  // Interaction Logic
  const handleScrewClick = (screwId) => {
    if (phase !== "playing") return;
    setSelectedScrew(screwId === selectedScrew ? null : screwId);
  };

  const handleHoleClick = (holeId) => {
    if (phase !== "playing" || !selectedScrew) return;
    
    // Check if hole is occupied
    const isOccupied = screws.some(s => s.holeId === holeId);
    if (isOccupied) return;

    // Move screw
    const newScrews = screws.map(s => s.id === selectedScrew ? { ...s, holeId } : s);
    setScrews(newScrews);
    setSelectedScrew(null);

    // Planks evaluate themselves now via onFall callback
  };

  const handlePlankFall = (plankId) => {
    setFallenPlanks(prev => {
      if (prev.includes(plankId)) return prev;
      return [...prev, plankId];
    });
  };

  const restart = () => {
    setPhase("playing");
    setScore(0);
    setTime(30);
    setCurrentLevelIdx(0);
    const freshData = generateLevelData(0);
    setLevelData(freshData);
    setScrews(freshData.screws);
    setFallenPlanks([]);
    setSelectedScrew(null);
  };

  const togglePause = () => {
    setPhase(p => p === "paused" ? "playing" : "paused");
  };

  return (
    <GameShell 
      title="Nut Craft" 
      score={score} 
      lives={1} 
      time={time} 
      level={currentLevelIdx + 1}
      phase={phase} 
      onPause={togglePause} 
      onResume={togglePause} 
      onRestart={restart}
    >
      <div className="nutcraft-board">
        <div className="nutcraft-header">
          Level {currentLevelIdx + 1}
        </div>

        {/* Render Holes */}
        {levelData.holes.map(hole => (
          <div 
            key={hole.id} 
            className="hole" 
            style={{ left: hole.x, top: hole.y }}
          />
        ))}

        {/* Render Interactive Hole Zones */}
        {levelData.holes.map(hole => (
          <div 
            key={`zone-${hole.id}`} 
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

          let className = "screw";
          if (isSelected) className += " selected";

          return (
            <div
              key={screw.id}
              className={className}
              style={{ left: hole.x, top: hole.y }}
              onClick={() => handleScrewClick(screw.id)}
            >
              <div className="screw-cross" />
            </div>
          );
        })}
      </div>
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

  if (!hasS1_current) detached1.current = true;
  if (!hasS2_current) detached2.current = true;

  const hasS1 = hasS1_current && !detached1.current;
  const hasS2 = hasS2_current && !detached2.current;

  const isFallen = fallen.includes(plank.id);

  useEffect(() => {
    if (!hasS1 && !hasS2 && !isFallen) {
      onFall(plank.id);
    }
  }, [hasS1, hasS2, isFallen, plank.id, onFall]);

  // We need to keep the last anchor to fall from
  const anchorRef = useRef(plank.h1);
  if (hasS1 && !hasS2) anchorRef.current = plank.h1;
  if (!hasS1 && hasS2) anchorRef.current = plank.h2;
  // If both have screws, anchor is h1.
  if (hasS1 && hasS2) anchorRef.current = plank.h1;

  const isH1 = anchorRef.current === plank.h1;
  const anchorHole = isH1 ? p1 : p2;
  
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.hypot(dx, dy);
  const baseAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  let targetAngle;
  if (hasS1 && hasS2) {
    targetAngle = baseAngle;
  } else {
    // Swinging!
    targetAngle = isH1 ? 90 : -90;
  }

  // If it's fallen, we add a translateY first so it falls globally down
  let wrapperTransform = isFallen ? `translateY(800px) ` : ``;
  wrapperTransform += `rotate(${targetAngle}deg)`;
  if (isFallen) {
    wrapperTransform += ` rotate(45deg)`;
  }

  return (
    <div className={`plank-wrapper ${isFallen ? 'fallen' : ''}`} style={{
      position: 'absolute',
      left: anchorHole.x, 
      top: anchorHole.y,
      transform: wrapperTransform,
      transition: hasS1 && hasS2 ? 'none' : 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s',
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
