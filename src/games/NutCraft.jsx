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
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, actx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, actx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.3);
    osc.start();
    osc.stop(actx.currentTime + 0.3);
  } else if (type === "error") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
    osc.start();
    osc.stop(actx.currentTime + 0.1);
  } else if (type === "drop") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.5, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, actx.currentTime + 0.4);
    osc.start();
    osc.stop(actx.currentTime + 0.4);
  } else if (type === "success") {
    osc.type = "square";
    osc.frequency.setValueAtTime(600, actx.currentTime);
    osc.frequency.setValueAtTime(800, actx.currentTime + 0.1);
    osc.frequency.setValueAtTime(1200, actx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.4);
    osc.start();
    osc.stop(actx.currentTime + 0.4);
  }
};

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1)**2 + (y2 - y1)**2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Generate Hardcoded Levels 1-5, then Procedural
function generateLevelData(levelIdx) {
  const W = 340;
  const H = 400;
  let holes = [];
  let planks = [];
  let screws = [];
  let targetMoves = 10;
  let targetTime = 60;

  if (levelIdx === 0) {
    // Level 1: Simple Horizontal
    holes = [ { id: 'h1', x: 100, y: 200 }, { id: 'h2', x: 240, y: 200 } ];
    planks = [ { id: 'p1', h1: 'h1', h2: 'h2', color: 'brown', z: 10 } ];
    screws = [ { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' } ];
    targetMoves = 2; targetTime = 30;
  } else if (levelIdx === 1) {
    // Level 2: Two independent planks
    holes = [ { id: 'h1', x: 80, y: 150 }, { id: 'h2', x: 260, y: 150 },
              { id: 'h3', x: 80, y: 250 }, { id: 'h4', x: 260, y: 250 } ];
    planks = [ { id: 'p1', h1: 'h1', h2: 'h2', color: 'blue', z: 10 },
               { id: 'p2', h1: 'h3', h2: 'h4', color: 'green', z: 10 } ];
    screws = [ { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' },
               { id: 's3', holeId: 'h3' }, { id: 's4', holeId: 'h4' } ];
    targetMoves = 4; targetTime = 40;
  } else if (levelIdx === 2) {
    // Level 3: Simple Overlap (Vertical blocks horizontal)
    holes = [ { id: 'h1', x: 100, y: 200 }, { id: 'h2', x: 240, y: 200 },
              { id: 'h3', x: 170, y: 100 }, { id: 'h4', x: 170, y: 300 } ];
    planks = [ { id: 'p1', h1: 'h1', h2: 'h2', color: 'brown', z: 10 },
               { id: 'p2', h1: 'h3', h2: 'h4', color: 'purple', z: 20 } ]; // Vertical on top
    // Vertical covers horizontal, so h3/h4 screws must be removed first to drop vertical.
    // Wait, the vertical plank goes from (170,100) to (170,300), crossing (170,200).
    // Let's add a screw for horizontal at (170,200) so it's directly under the vertical plank!
    holes = [ { id: 'h1', x: 100, y: 200 }, { id: 'h2', x: 170, y: 200 }, { id: 'h3', x: 240, y: 200 }, // horizontal uses 100 and 170
              { id: 'h4', x: 170, y: 100 }, { id: 'h5', x: 170, y: 300 } ];
    planks = [ { id: 'p1', h1: 'h1', h2: 'h2', color: 'brown', z: 10 },
               { id: 'p2', h1: 'h4', h2: 'h5', color: 'purple', z: 20 } ];
    screws = [ { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' }, // s2 is under p2
               { id: 's4', holeId: 'h4' }, { id: 's5', holeId: 'h5' } ];
    targetMoves = 4; targetTime = 40;
  } else if (levelIdx === 3) {
    // Level 4: Crossing Planks (Hashtag shape)
    holes = [
      {id:'h1',x:100,y:100}, {id:'h2',x:240,y:100},
      {id:'h3',x:100,y:240}, {id:'h4',x:240,y:240},
      {id:'v1',x:130,y:70}, {id:'v2',x:130,y:270},
      {id:'v3',x:210,y:70}, {id:'v4',x:210,y:270},
    ];
    planks = [
      { id: 'p1', h1: 'h1', h2: 'h2', color: 'red', z: 10 },
      { id: 'p2', h1: 'h3', h2: 'h4', color: 'red', z: 10 },
      { id: 'p3', h1: 'v1', h2: 'v2', color: 'blue', z: 20 },
      { id: 'p4', h1: 'v3', h2: 'v4', color: 'green', z: 30 },
    ];
    screws = holes.map((h,i) => ({ id: `s${i}`, holeId: h.id }));
    targetMoves = 8; targetTime = 50;
  } else if (levelIdx === 4) {
    // Level 5: Triangle Stack
    holes = [
      {id:'h1', x: 170, y: 100},
      {id:'h2', x: 100, y: 240},
      {id:'h3', x: 240, y: 240},
      // blockers
      {id:'b1', x: 170, y: 80}, {id:'b2', x: 170, y: 260},
      {id:'c1', x: 60, y: 200}, {id:'c2', x: 280, y: 200}
    ];
    planks = [
      {id:'p1', h1:'h1', h2:'h2', color: 'teal', z:10},
      {id:'p2', h1:'h2', h2:'h3', color: 'teal', z:10},
      {id:'p3', h1:'h3', h2:'h1', color: 'teal', z:10},
      {id:'p4', h1:'b1', h2:'b2', color: 'orange', z:20}, // vertical cutting through middle
      {id:'p5', h1:'c1', h2:'c2', color: 'pink', z:30},   // horizontal cutting across
    ];
    screws = [
      {id:'s1', holeId:'h1'}, {id:'s2', holeId:'h2'}, {id:'s3', holeId:'h3'},
      {id:'s4', holeId:'b1'}, {id:'s5', holeId:'b2'},
      {id:'s6', holeId:'c1'}, {id:'s7', holeId:'c2'},
    ];
    targetMoves = 7; targetTime = 60;
  } else {
    // Procedural for 6+
    const numPlanks = Math.min(4 + Math.floor((levelIdx-4)*0.5), 10);
    const randPt = () => ({ x: 60 + Math.floor(Math.random()*220), y: 80 + Math.floor(Math.random()*240) });
    
    // Generate valid non-overlapping anchor holes for each plank
    for(let i=0; i<numPlanks; i++) {
       let h1, h2, attempts = 0;
       do {
         h1 = randPt(); h2 = randPt(); attempts++;
       } while(Math.hypot(h1.x - h2.x, h1.y - h2.y) < 70 && attempts < 100);
       h1.id = `h_${i}_1`; h2.id = `h_${i}_2`;
       holes.push(h1, h2);
       planks.push({ id: `p${i}`, h1: h1.id, h2: h2.id, color: COLORS[i%COLORS.length], z: (i+1)*10 });
       screws.push({ id: `s_${i}_1`, holeId: h1.id }, { id: `s_${i}_2`, holeId: h2.id });
    }
    targetMoves = screws.length; 
    targetTime = 40 + screws.length * 5;
  }

  return { holes, screws, planks, targetMoves, targetTime };
}

export function NutCraft({ onOutcome, reviveSignal }) {
  const [phase, setPhase] = useState("playing"); 
  const [score, setScore] = useState(0);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [levelData, setLevelData] = useState(() => generateLevelData(0));
  
  const [time, setTime] = useState(levelData.targetTime);
  const [movesLeft, setMovesLeft] = useState(levelData.targetMoves);
  const [lives, setLives] = useState(3);
  
  // Game State
  const [screws, setScrews] = useState(levelData.screws);
  const [fallenPlanks, setFallenPlanks] = useState([]);
  
  // Visual Effects
  const [animatingScrews, setAnimatingScrews] = useState([]); // {id, timeAdded}
  const [particles, setParticles] = useState([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hintNut, setHintNut] = useState(null);

  const liveRef = useRef(true);
  const audioCtxRef = useRef(null);
  
  // Blocking Check Logic
  const isScrewBlocked = useCallback((screwHoleId) => {
     const hole = levelData.holes.find(h => h.id === screwHoleId);
     if (!hole) return false;
     
     // Find the screw object to see its Z depth? Actually, screws belong to planks.
     // In this new logic, a screw just sits in a hole. What is its Z depth?
     // It is blocked if ANY plank (that hasn't fallen) with a Z > the plank holding this screw is on top.
     // Wait, a hole can be shared by multiple planks in some designs. 
     // Let's just say a screw is blocked if its hole is physically underneath the body of ANY active plank that DOES NOT USE that hole.
     
     for (const plank of levelData.planks) {
        if (fallenPlanks.includes(plank.id)) continue;
        if (plank.h1 === hole.id || plank.h2 === hole.id) continue; // Uses the hole, so it holds the plank, doesn't block it.
        
        const ph1 = levelData.holes.find(h => h.id === plank.h1);
        const ph2 = levelData.holes.find(h => h.id === plank.h2);
        
        const dist = pointToSegmentDist(hole.x, hole.y, ph1.x, ph1.y, ph2.x, ph2.y);
        if (dist < 18) { // Radius of plank
           // Is it physically on top?
           // Planks have z index. The screw sits on the planks that use it.
           // Find max Z of planks using this screw.
           const screwZ = Math.max(0, ...levelData.planks.filter(p => p.h1 === hole.id || p.h2 === hole.id).map(p => p.z));
           if (plank.z > screwZ) return true; // Covered!
        }
     }
     return false;
  }, [levelData, fallenPlanks]);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    liveRef.current = true;
    const id = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          liveRef.current = false;
          setPhase("failed");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Check Win / Fail
  useEffect(() => {
    if (phase === "playing") {
      if (fallenPlanks.length === levelData.planks.length && levelData.planks.length > 0) {
        setPhase("level_complete");
        playSound("success", audioCtxRef);
      } else if (movesLeft <= 0 && animatingScrews.length === 0) {
        // Only fail if moves run out and we aren't waiting for a plank to fall
        // Wait, planks fall immediately. If moves run out, check if planks are still falling.
        // We'll give it a tiny delay to be safe.
        const t = setTimeout(() => {
           if (fallenPlanks.length < levelData.planks.length) setPhase("failed");
        }, 1000);
        return () => clearTimeout(t);
      }
    }
  }, [fallenPlanks, phase, movesLeft, levelData.planks.length, animatingScrews.length]);

  const handleNextLevel = () => {
    const nextIdx = currentLevelIdx + 1;
    setCurrentLevelIdx(nextIdx);
    const nextData = generateLevelData(nextIdx);
    setLevelData(nextData);
    setScrews(nextData.screws);
    setFallenPlanks([]);
    setTime(nextData.targetTime);
    setMovesLeft(nextData.targetMoves);
    setAnimatingScrews([]);
    setHintNut(null);
    setPhase("playing");
  };

  const handleRetry = () => {
    setLevelData(generateLevelData(currentLevelIdx)); // Refresh just in case
    setScrews(levelData.screws);
    setFallenPlanks([]);
    setTime(levelData.targetTime);
    setMovesLeft(levelData.targetMoves);
    setAnimatingScrews([]);
    setHintNut(null);
    setPhase("playing");
  };

  const handleHint = () => {
    // Find a screw that is NOT blocked and belongs to an un-fallen plank
    const validScrews = screws.filter(s => {
       if (animatingScrews.some(a => a.id === s.id)) return false;
       if (isScrewBlocked(s.holeId)) return false;
       return true;
    });
    if (validScrews.length > 0) {
      setHintNut(validScrews[0].id);
      setTimeout(() => setHintNut(null), 2000);
    }
  };

  const handleScrewClick = (screwId) => {
    if (phase !== "playing") return;
    setHasInteracted(true);
    
    const screw = screws.find(s => s.id === screwId);
    if (!screw || animatingScrews.some(s => s.id === screwId)) return;

    if (isScrewBlocked(screw.holeId)) {
       playSound("error", audioCtxRef);
       return; // Blocked!
    }

    // Success - Unscrew
    playSound("unscrew", audioCtxRef);
    setAnimatingScrews(prev => [...prev, { id: screwId, timeAdded: Date.now() }]);
    setMovesLeft(m => Math.max(0, m - 1));
    
    // Remove the screw physically after animation (400ms)
    setTimeout(() => {
       setScrews(prev => prev.filter(s => s.id !== screwId));
       setAnimatingScrews(prev => prev.filter(s => s.id !== screwId));
    }, 400);
  };

  const spawnParticles = (x, y) => {
    const newParts = [];
    for(let i=0; i<8; i++) {
      newParts.push({
        id: Math.random().toString(),
        x, y,
        vx: (Math.random()-0.5)*10,
        vy: (Math.random()-0.5)*10 - 4,
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
      setScore(s => s + 10);
      return [...prev, plankId];
    });
  };

  // Calc Stars
  const calcStars = () => {
    if (movesLeft >= levelData.targetMoves * 0.2 && time >= levelData.targetTime * 0.3) return 3;
    if (movesLeft >= 0 && time >= levelData.targetTime * 0.1) return 2;
    return 1;
  };

  return (
    <GameShell 
      title="Nut Craft" 
      score={score} 
      lives={lives} 
      time={time} 
      level={currentLevelIdx + 1}
      phase={phase === "level_complete" || phase === "failed" ? "playing" : phase} 
      extraHud={<span className="hudMoves">Moves: {movesLeft}</span>}
      onPause={() => setPhase(p => p === "paused" ? "playing" : "paused")} 
      onResume={() => setPhase("playing")} 
      onRestart={handleRetry}
    >
      <div className="nutcraft-board">

        {/* Tutorial Overlay */}
        {!hasInteracted && currentLevelIdx === 0 && (
          <div className="tutorial-overlay">
            <h2>UNSCREW THE NUTS</h2>
            <p>Remove all nuts to drop the planks</p>
            <p style={{color:'#fff', marginTop:16, fontSize:13, opacity:0.8}}>TAP → UNSCREW → DROP</p>
          </div>
        )}

        {/* Level Complete Modal */}
        {phase === "level_complete" && (
          <div className="nc-modal">
            <h1>LEVEL COMPLETE!</h1>
            <div className="nc-stars">
               {"⭐".repeat(calcStars())}
            </div>
            <div className="nc-modal-stats">
              Time Left: {time}s<br/>
              Moves Left: {movesLeft}<br/>
              Planks Cleared: {levelData.planks.length}
            </div>
            <button className="nc-modal-btn" onClick={handleNextLevel}>
              NEXT LEVEL
            </button>
          </div>
        )}
        
        {/* Failed Modal */}
        {phase === "failed" && (
          <div className="nc-modal">
            <h1 style={{color: '#ff5252'}}>PUZZLE FAILED</h1>
            <div className="nc-modal-stats">
              {movesLeft <= 0 ? "Out of Moves" : "Out of Time"}<br/>
              Planks Remaining: {levelData.planks.length - fallenPlanks.length}
            </div>
            <div style={{display:'flex', gap: 12}}>
              <button className="nc-modal-btn" style={{background:'#f57c00'}} onClick={handleRetry}>
                RETRY
              </button>
              <button className="nc-modal-btn" style={{background:'#1976d2'}} onClick={handleHint}>
                HINT
              </button>
            </div>
          </div>
        )}

        {/* Render Holes */}
        {levelData.holes.map(hole => (
          <div key={`h-${hole.id}`} className="hole" style={{ left: hole.x, top: hole.y }} />
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
          const isAnimating = animatingScrews.some(s => s.id === screw.id);
          const isHinted = hintNut === screw.id;

          return (
            <div
              key={screw.id}
              className={`screw-interactive ${isAnimating ? 'unscrewing' : ''} ${isHinted ? 'hinted' : ''}`}
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

      <style>{`
        #game-time { 
          ${time <= 10 && phase === 'playing' ? 'color: #ff5252 !important; animation: pulseTimer 1s infinite;' : ''}
        }
        .hudMoves { margin-left: auto; color: #fbc02d; font-weight: 900; }
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
    if (Math.abs(targetAngle - baseAngle) > 180) {
       targetAngle = targetAngle > baseAngle ? targetAngle - 360 : targetAngle + 360;
    }
  }

  // Shake effect before falling
  let shakeTransform = "";
  if (shaking) {
    shakeTransform = `translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*6}px) `;
  }

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
