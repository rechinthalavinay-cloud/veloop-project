import { useEffect, useRef, useState, useCallback } from "react";
import { GameShell } from "./GameShell";
import "./NutCraft.css";

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
    osc.frequency.linearRampToValueAtTime(600, actx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.2);
    osc.start();
    osc.stop(actx.currentTime + 0.2);
  } else if (type === "place") {
    osc.type = "square";
    osc.frequency.setValueAtTime(200, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.4, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
    osc.start();
    osc.stop(actx.currentTime + 0.1);
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
  } else if (type === "complete") {
    osc.type = "square";
    osc.frequency.setValueAtTime(400, actx.currentTime);
    osc.frequency.setValueAtTime(600, actx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, actx.currentTime + 0.2);
    osc.frequency.setValueAtTime(1200, actx.currentTime + 0.3);
    osc.frequency.setValueAtTime(1600, actx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 1.0);
    osc.start();
    osc.stop(actx.currentTime + 1.0);
  }
};

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1)**2 + (y2 - y1)**2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function generateLevelData(levelIdx) {
  let holes = [];
  let planks = [];
  let screws = [];
  let targetTime = 60;

  if (levelIdx === 0) {
    holes = [ 
      { id: 'h1', x: 100, y: 150 }, { id: 'h2', x: 240, y: 150 }, 
      { id: 'h3', x: 100, y: 250 }, { id: 'h4', x: 240, y: 250 },
      { id: 'e1', x: 170, y: 80 }, { id: 'e2', x: 170, y: 320 }
    ];
    planks = [ { id: 'p1', h1: 'h1', h2: 'h2', z: 10 }, { id: 'p2', h1: 'h3', h2: 'h4', z: 10 } ];
    screws = [ { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' }, { id: 's3', holeId: 'h3' }, { id: 's4', holeId: 'h4' } ];
    targetTime = 40;
  } else if (levelIdx === 1) {
    holes = [ 
      { id: 'h1', x: 80, y: 100 }, { id: 'h2', x: 200, y: 100 },
      { id: 'h3', x: 140, y: 150 }, { id: 'h4', x: 260, y: 150 },
      { id: 'h5', x: 80, y: 200 }, { id: 'h6', x: 200, y: 200 },
      { id: 'e1', x: 170, y: 50 }, { id: 'e2', x: 170, y: 250 }
    ];
    planks = [ 
      { id: 'p1', h1: 'h1', h2: 'h2', z: 10 }, 
      { id: 'p3', h1: 'h5', h2: 'h6', z: 10 },
      { id: 'p2', h1: 'h3', h2: 'h4', z: 20 }
    ];
    screws = [ { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' },
               { id: 's3', holeId: 'h3' }, { id: 's4', holeId: 'h4' },
               { id: 's5', holeId: 'h5' }, { id: 's6', holeId: 'h6' } ];
    targetTime = 50;
  } else if (levelIdx === 2) {
    holes = [ 
      { id: 'h1', x: 120, y: 200 }, { id: 'h2', x: 260, y: 200 },
      { id: 'h3', x: 170, y: 80 }, { id: 'h4', x: 170, y: 320 },
      { id: 'h5', x: 80, y: 80 }, { id: 'h6', x: 260, y: 320 },
      { id: 'h7', x: 120, y: 100 }, { id: 'h8', x: 120, y: 280 },
      { id: 'e1', x: 60, y: 200 }, { id: 'e2', x: 220, y: 80 }, { id: 'e3', x: 220, y: 280 }
    ];
    planks = [ 
      { id: 'p1', h1: 'h1', h2: 'h2', z: 10 },
      { id: 'p2', h1: 'h3', h2: 'h4', z: 20 },
      { id: 'p3', h1: 'h5', h2: 'h6', z: 30 },
      { id: 'p4', h1: 'h7', h2: 'h8', z: 40 } 
    ];
    screws = [ { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' }, 
               { id: 's3', holeId: 'h3' }, { id: 's4', holeId: 'h4' },
               { id: 's5', holeId: 'h5' }, { id: 's6', holeId: 'h6' },
               { id: 's7', holeId: 'h7' }, { id: 's8', holeId: 'h8' } ];
    targetTime = 60;
  } else if (levelIdx === 3) {
    holes = [
      {id:'h1',x:100,y:100}, {id:'h2',x:240,y:100},
      {id:'h3',x:100,y:240}, {id:'h4',x:240,y:240},
      {id:'v1',x:130,y:70}, {id:'v2',x:130,y:270},
      {id:'v3',x:210,y:70}, {id:'v4',x:210,y:270},
      {id:'c1',x:170,y:140}, {id:'c2',x:170,y:300},
      {id:'e1',x:60,y:170}, {id:'e2',x:280,y:170}, {id:'e3',x:170,y:200}
    ];
    planks = [
      { id: 'p1', h1: 'h1', h2: 'h2', z: 10 },
      { id: 'p2', h1: 'h3', h2: 'h4', z: 10 },
      { id: 'p3', h1: 'v1', h2: 'v2', z: 20 },
      { id: 'p4', h1: 'v3', h2: 'v4', z: 20 },
      { id: 'p5', h1: 'c1', h2: 'c2', z: 30 }
    ];
    screws = [
      { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' }, 
      { id: 's3', holeId: 'h3' }, { id: 's4', holeId: 'h4' },
      { id: 's5', holeId: 'v1' }, { id: 's6', holeId: 'v2' },
      { id: 's7', holeId: 'v3' }, { id: 's8', holeId: 'v4' },
      { id: 's9', holeId: 'c1' }, { id: 's10', holeId: 'c2' }
    ];
    targetTime = 70;
  } else if (levelIdx >= 4) { 
    holes = [
      {id:'h1', x: 170, y: 100}, {id:'h2', x: 100, y: 240}, 
      {id:'h3', x: 240, y: 240}, {id:'h4', x: 170, y: 240},
      {id:'b1', x: 170, y: 60}, {id:'b2', x: 170, y: 180},
      {id:'c1', x: 60, y: 200}, {id:'c2', x: 280, y: 200},
      {id:'d1', x: 100, y: 100}, {id:'d2', x: 100, y: 300},
      {id:'e1', x: 240, y: 100}, {id:'e2', x: 240, y: 300},
      {id:'f1', x: 170, y: 320}, {id:'f2', x: 60, y: 100}, {id:'f3', x: 280, y: 100}, {id:'f4', x: 170, y: 380}
    ];
    planks = [
      {id:'p1', h1:'h1', h2:'h2', z:10},
      {id:'p2', h1:'h2', h2:'h3', z:10},
      {id:'p3', h1:'h3', h2:'h1', z:10},
      {id:'p4', h1:'b1', h2:'b2', z:20}, 
      {id:'p5', h1:'c1', h2:'c2', z:30},   
      {id:'p6', h1:'d1', h2:'d2', z:40},   
    ];
    screws = [
      { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' }, { id: 's3', holeId: 'h3' },
      { id: 's4', holeId: 'b1' }, { id: 's5', holeId: 'b2' },
      { id: 's6', holeId: 'c1' }, { id: 's7', holeId: 'c2' },
      { id: 's8', holeId: 'd1' }, { id: 's9', holeId: 'd2' },
      { id: 's10', holeId: 'e1' }, { id: 's11', holeId: 'e2' }, { id: 's12', holeId: 'h4' } // extra blocker
    ];
    targetTime = 90;
  }

  return { holes, screws, planks, targetTime };
}

export function NutCraft({ onOutcome, reviveSignal }) {
  const [phase, setPhase] = useState("playing"); 
  const [score, setScore] = useState(0);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [levelData, setLevelData] = useState(() => generateLevelData(0));
  
  const [time, setTime] = useState(levelData.targetTime);
  const [lives, setLives] = useState(3);
  
  // Game State
  const [screws, setScrews] = useState(levelData.screws);
  const [fallenPlanks, setFallenPlanks] = useState([]);
  const [selectedScrew, setSelectedScrew] = useState(null);
  
  // Stats for final screen
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [levelStars, setLevelStars] = useState([0,0,0,0,0]);

  const liveRef = useRef(true);
  const audioCtxRef = useRef(null);
  
  const isHoleBlocked = useCallback((holeId) => {
     const hole = levelData.holes.find(h => h.id === holeId);
     if (!hole) return false;
     
     for (const plank of levelData.planks) {
        if (fallenPlanks.includes(plank.id)) continue; 
        
        const p1 = levelData.holes.find(h => h.id === plank.h1);
        const p2 = levelData.holes.find(h => h.id === plank.h2);
        
        const hasS1 = screws.some(s => s.holeId === plank.h1);
        const hasS2 = screws.some(s => s.holeId === plank.h2);
        
        let px1, py1, px2, py2;
        
        if (hasS1 && hasS2) {
            px1 = p1.x; py1 = p1.y;
            px2 = p2.x; py2 = p2.y;
            if (hole.id === plank.h1 || hole.id === plank.h2) continue;
        } else if (hasS1 && !hasS2) {
            const dx = p2.x - p1.x; const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            px1 = p1.x; py1 = p1.y;
            px2 = p1.x; py2 = p1.y + len;
            if (hole.id === plank.h1) continue;
        } else if (!hasS1 && hasS2) {
            const dx = p2.x - p1.x; const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            px1 = p2.x; py1 = p2.y;
            px2 = p2.x; py2 = p2.y + len;
            if (hole.id === plank.h2) continue;
        } else {
            continue; 
        }
        
        const dist = pointToSegmentDist(hole.x, hole.y, px1, py1, px2, py2);
        if (dist < 20) { 
           const screwZ = Math.max(0, ...levelData.planks.filter(p => (p.h1 === hole.id || p.h2 === hole.id) && !fallenPlanks.includes(p.id)).map(p => p.z));
           if (plank.z > screwZ) return true;
        }
     }
     return false;
  }, [levelData, fallenPlanks, screws]);

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

  useEffect(() => {
    if (phase === "playing") {
      if (fallenPlanks.length === levelData.planks.length && levelData.planks.length > 0) {
        if (currentLevelIdx >= 4) {
          setPhase("game_complete");
          playSound("complete", audioCtxRef);
        } else {
          setPhase("level_complete");
          playSound("success", audioCtxRef);
        }
        const stars = calcStars();
        setLevelStars(prev => {
          const newStars = [...prev];
          if (stars > newStars[currentLevelIdx]) newStars[currentLevelIdx] = stars;
          return newStars;
        });
        setTotalTimeLeft(prev => prev + time);
      }
    }
  }, [fallenPlanks, phase, levelData.planks.length, currentLevelIdx, time]);

  const loadLevel = (idx) => {
    if (idx > 4) return;
    setCurrentLevelIdx(idx);
    const nextData = generateLevelData(idx);
    setLevelData(nextData);
    setScrews(nextData.screws);
    setFallenPlanks([]);
    setTime(nextData.targetTime);
    setSelectedScrew(null);
    setPhase("playing");
  };

  const handleNextLevel = () => { if (currentLevelIdx < 4) loadLevel(currentLevelIdx + 1); };
  const handleRetry = () => { loadLevel(currentLevelIdx); };
  const handlePlayAgain = () => { setTotalTimeLeft(0); loadLevel(0); };

  const handleScrewClick = (screwId) => {
    if (phase !== "playing") return;
    
    const screw = screws.find(s => s.id === screwId);
    if (!screw) return;

    if (isHoleBlocked(screw.holeId)) {
       playSound("error", audioCtxRef);
       return; 
    }

    if (selectedScrew === screwId) {
        setSelectedScrew(null); // deselect
    } else {
        playSound("unscrew", audioCtxRef);
        setSelectedScrew(screwId);
    }
  };

  const handleHoleClick = (holeId) => {
    if (phase !== "playing" || !selectedScrew) return;
    
    // Check if hole has a screw already
    if (screws.some(s => s.holeId === holeId)) {
       // if they clicked another valid screw, change selection
       const otherScrew = screws.find(s => s.holeId === holeId);
       if (!isHoleBlocked(holeId)) {
           playSound("unscrew", audioCtxRef);
           setSelectedScrew(otherScrew.id);
       } else {
           playSound("error", audioCtxRef);
       }
       return;
    }

    if (isHoleBlocked(holeId)) {
       playSound("error", audioCtxRef);
       return; 
    }

    // Move the screw
    playSound("place", audioCtxRef);
    setScrews(prev => prev.map(s => s.id === selectedScrew ? { ...s, holeId } : s));
    setSelectedScrew(null);
  };

  const handlePlankFall = (plankId) => {
    setFallenPlanks(prev => {
      if (prev.includes(plankId)) return prev;
      playSound("drop", audioCtxRef);
      setScore(s => s + 10);
      return [...prev, plankId];
    });
  };

  const calcStars = () => {
    if (time >= levelData.targetTime * 0.3) return 3;
    if (time >= levelData.targetTime * 0.1) return 2;
    return 1;
  };

  if (phase === "level_select") {
    return (
      <GameShell 
        title="Nut Craft" score={score} lives={lives} phase="playing" onRestart={() => setPhase("playing")}
      >
        <div className="nc-modal" style={{background: 'rgba(20, 15, 10, 1)'}}>
          <h1 style={{fontSize: 28, marginBottom: 20}}>NUTCRAFT LEVELS</h1>
          <div style={{display:'flex', flexDirection:'column', gap: 12, width: '80%'}}>
            {[1,2,3,4,5].map((lvl, idx) => (
              <button key={lvl} className="nc-modal-btn" onClick={() => loadLevel(idx)}
                style={{display:'flex', justifyContent:'space-between', padding: '16px 24px', background: '#3e2723', border: '1px solid #5d4037'}}>
                <span>LEVEL {lvl}</span>
                <span>{"⭐".repeat(levelStars[idx])}</span>
              </button>
            ))}
          </div>
          <button className="nc-modal-btn" onClick={() => loadLevel(0)} style={{marginTop: 32, width:'80%', background: '#ff9800', border: '1px solid #e65100'}}>
            BACK
          </button>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell 
      title="Nut Craft" 
      score={score} 
      lives={lives} 
      time={time} 
      level={currentLevelIdx + 1}
      phase={phase === "level_complete" || phase === "failed" || phase === "game_complete" ? "playing" : phase} 
      onPause={() => setPhase(p => p === "paused" ? "playing" : "paused")} 
      onResume={() => setPhase("playing")} 
      onRestart={handleRetry}
    >
      <div className="nutcraft-board" id="nc-board">

        {phase === "level_complete" && (
          <div className="nc-modal">
            <h1>LEVEL COMPLETE!</h1>
            <div className="nc-stars">{"⭐".repeat(calcStars())}</div>
            <div className="nc-modal-stats">Time Left: {time}s<br/>Planks Cleared: {levelData.planks.length}</div>
            <button className="nc-modal-btn" onClick={handleNextLevel}>NEXT LEVEL</button>
          </div>
        )}

        {phase === "game_complete" && (
          <div className="nc-modal" style={{background: 'rgba(20, 15, 10, 0.95)'}}>
            <h1 style={{fontSize: 28, textAlign: 'center'}}>NUTCRAFT COMPLETE!</h1>
            <p style={{color: '#ffca28', fontWeight: 'bold', letterSpacing: 1, marginBottom: 16}}>ALL 5 LEVELS COMPLETED</p>
            <div className="nc-stars" style={{marginBottom: 16}}>{"⭐".repeat(calcStars())}</div>
            <div className="nc-modal-stats" style={{fontSize: 16, marginBottom: 24}}>
              Total Score: {score + (totalTimeLeft * 2)}<br/>Best Time Combined: {totalTimeLeft}s
            </div>
            <div style={{display:'flex', gap: 12, flexDirection: 'column', width: '80%'}}>
              <button className="nc-modal-btn" onClick={handlePlayAgain} style={{padding: '12px 16px', background: '#4caf50'}}>PLAY AGAIN</button>
              <button className="nc-modal-btn" onClick={() => setPhase("level_select")} style={{padding: '12px 16px', background: '#1976d2', border: '1px solid #1565c0'}}>LEVEL SELECT</button>
            </div>
          </div>
        )}
        
        {phase === "failed" && (
          <div className="nc-modal">
            <h1 style={{color: '#ff5252'}}>OUT OF TIME</h1>
            <div className="nc-modal-stats">Planks Remaining: {levelData.planks.length - fallenPlanks.length}</div>
            <div style={{display:'flex', gap: 12}}>
              <button className="nc-modal-btn" style={{background:'#f57c00'}} onClick={handleRetry}>RETRY</button>
            </div>
          </div>
        )}

        {/* Empty holes remain permanently, and act as click targets */}
        {levelData.holes.map(hole => (
          <div 
            key={`h-${hole.id}`} 
            className="hole hole-interactive" 
            style={{ left: hole.x, top: hole.y }} 
            onClick={() => handleHoleClick(hole.id)}
          />
        ))}

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
      </div>

      <style>{`
        #game-time { ${time <= 10 && phase === 'playing' ? 'color: #ff5252 !important; animation: pulseTimer 1s infinite;' : ''} }
      `}</style>
    </GameShell>
  );
}

function Plank({ plank, holes, screws, fallen, onFall }) {
  const p1 = holes.find(h => h.id === plank.h1);
  const p2 = holes.find(h => h.id === plank.h2);
  
  const hasS1 = screws.some(s => s.holeId === plank.h1);
  const hasS2 = screws.some(s => s.holeId === plank.h2);

  const isFallen = fallen.includes(plank.id);

  // If both screws are gone, it falls completely.
  const fullyDetached = !hasS1 && !hasS2;
  const isStable = hasS1 && hasS2; 

  // Determine anchor hole (if 1 screw is attached, it hangs from there)
  // If fully detached, we remember the last anchor (whichever left last) 
  // For simplicity, if fully detached we just use p1 as anchor for the drop animation
  const anchorHole = hasS1 ? p1 : (hasS2 ? p2 : p1);
  const isH1 = anchorHole === p1;

  useEffect(() => {
    if (fullyDetached && !isFallen) {
      // Small delay before dropping to allow swing to finish if it was swinging
      setTimeout(() => {
        onFall(plank.id);
      }, 100);
    }
  }, [fullyDetached, isFallen, plank.id, onFall]);

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.hypot(dx, dy);
  const baseAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  let targetAngle = baseAngle;
  if (!isStable && !fullyDetached) {
    // Hangs straight down
    targetAngle = isH1 ? 90 : -90;
    // ensure shortest rotation
    if (Math.abs(targetAngle - baseAngle) > 180) {
       targetAngle = targetAngle > baseAngle ? targetAngle - 360 : targetAngle + 360;
    }
  }

  let wrapperTransform = isFallen ? `translateY(600px) ` : ``;
  wrapperTransform += `rotate(${targetAngle}deg)`;
  if (isFallen) {
    wrapperTransform += ` rotate(${isH1 ? 60 : -60}deg)`;
  }

  return (
    <div className={`plank-wrapper ${isFallen ? 'fallen' : ''}`} style={{
      position: 'absolute',
      left: anchorHole.x, 
      top: anchorHole.y,
      transform: wrapperTransform,
      transition: isStable ? 'none' : 'transform 0.6s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.5s ease-in',
      zIndex: plank.z,
    }}>
      <div className="plank" style={{
        position: 'absolute',
        top: -18,
        left: isH1 ? -18 : -length - 18,
        width: length + 36,
        height: 36,
        borderRadius: 18,
      }}>
        <div className="plank-texture" />
      </div>
      
      <div className="blue-bracket" style={{
        position: 'absolute',
        top: -18,
        left: -18,
      }}/>
      <div className="blue-bracket" style={{
        position: 'absolute',
        top: -18,
        left: isH1 ? length - 18 : -length - 18,
      }}/>
    </div>
  );
}
