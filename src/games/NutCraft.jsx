import { useEffect, useRef, useState, useCallback } from "react";
import Matter from "matter-js";
import { GameShell } from "./GameShell";
import "./NutCraft.css";

const { Engine, World, Bodies, Constraint, Composite, Body } = Matter;

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
      { id: 's10', holeId: 'e1' }, { id: 's11', holeId: 'e2' }, { id: 's12', holeId: 'h4' }
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
  
  const [screws, setScrews] = useState(levelData.screws);
  const [fallenPlanks, setFallenPlanks] = useState([]);
  const [selectedScrew, setSelectedScrew] = useState(null);
  const [plankStates, setPlankStates] = useState({}); // Syncs from Matter.js
  
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [levelStars, setLevelStars] = useState([0,0,0,0,0]);

  const liveRef = useRef(true);
  const audioCtxRef = useRef(null);
  
  // Physics Engine Refs
  const engineRef = useRef(null);
  const plankBodiesRef = useRef({});
  const constraintsRef = useRef({});
  const rafRef = useRef(null);

  // Initialize Physics World
  const initPhysics = useCallback((data, initialScrews) => {
    if (engineRef.current) {
        Engine.clear(engineRef.current);
    }
    const engine = Engine.create({
        gravity: { x: 0, y: 1.5 }
    });
    engineRef.current = engine;
    plankBodiesRef.current = {};
    constraintsRef.current = {};
    
    const collisionGroups = Body.nextGroup(true); // they should collide

    data.planks.forEach(plank => {
        const h1 = data.holes.find(h => h.id === plank.h1);
        const h2 = data.holes.find(h => h.id === plank.h2);
        
        const cx = (h1.x + h2.x) / 2;
        const cy = (h1.y + h2.y) / 2;
        const dx = h2.x - h1.x;
        const dy = h2.y - h1.y;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        const body = Bodies.rectangle(cx, cy, length + 36, 30, {
            angle: angle,
            frictionAir: 0.05,
            friction: 0.5,
            restitution: 0.2, // slight bounce
            density: 0.05,
            collisionFilter: { group: 1 } // All planks collide with each other
        });
        
        plankBodiesRef.current[plank.id] = body;
        World.add(engine.world, body);
    });

    updateConstraints(initialScrews, data);
  }, []);

  const updateConstraints = useCallback((currentScrews, data) => {
      const engine = engineRef.current;
      if (!engine) return;

      // Remove all existing constraints
      Object.values(constraintsRef.current).forEach(c => World.remove(engine.world, c));
      constraintsRef.current = {};

      currentScrews.forEach(screw => {
          const hole = data.holes.find(h => h.id === screw.holeId);
          data.planks.forEach(plank => {
              if (fallenPlanks.includes(plank.id)) return;
              
              const h1 = data.holes.find(h => h.id === plank.h1);
              const h2 = data.holes.find(h => h.id === plank.h2);
              
              // If the screw is in one of the plank's original anchor holes
              if (plank.h1 === hole.id || plank.h2 === hole.id) {
                  const body = plankBodiesRef.current[plank.id];
                  if (!body) return;
                  
                  // Calculate local anchor point
                  // Original cx, cy
                  const cx = (h1.x + h2.x) / 2;
                  const cy = (h1.y + h2.y) / 2;
                  const angle = Math.atan2(h2.y - h1.y, h2.x - h1.x);
                  
                  // Vector from center to hole
                  const vx = hole.x - cx;
                  const vy = hole.y - cy;
                  
                  // Rotate vector by -angle to get local coordinates
                  const localX = vx * Math.cos(-angle) - vy * Math.sin(-angle);
                  const localY = vx * Math.sin(-angle) + vy * Math.cos(-angle);

                  const constraint = Constraint.create({
                      bodyA: body,
                      pointA: { x: localX, y: localY },
                      pointB: { x: hole.x, y: hole.y },
                      stiffness: 1,
                      length: 0
                  });
                  World.add(engine.world, constraint);
                  constraintsRef.current[`${plank.id}-${screw.id}`] = constraint;
              }
          });
      });
  }, [fallenPlanks]);

  // Game Loop
  useEffect(() => {
      if (phase !== "playing") return;
      let lastTime = performance.now();

      const loop = (time) => {
          const delta = time - lastTime;
          lastTime = time;

          if (engineRef.current && phase === "playing") {
              Engine.update(engineRef.current, 1000 / 60);

              const states = {};
              Object.keys(plankBodiesRef.current).forEach(id => {
                  if (!fallenPlanks.includes(id)) {
                      const body = plankBodiesRef.current[id];
                      states[id] = {
                          x: body.position.x,
                          y: body.position.y,
                          angle: body.angle
                      };

                      // Check if it fell off screen
                      if (body.position.y > 600) {
                          handlePlankFall(id);
                      }
                  }
              });
              setPlankStates(states);
          }
          rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafRef.current);
  }, [phase, fallenPlanks]);

  useEffect(() => {
    initPhysics(levelData, levelData.screws);
  }, [levelData, initPhysics]);

  useEffect(() => {
    if (phase === "playing") updateConstraints(screws, levelData);
  }, [screws, updateConstraints, levelData, phase]);

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
    initPhysics(nextData, nextData.screws);
  };

  const handleNextLevel = () => { if (currentLevelIdx < 4) loadLevel(currentLevelIdx + 1); };
  const handleRetry = () => { loadLevel(currentLevelIdx); };
  const handlePlayAgain = () => { setTotalTimeLeft(0); loadLevel(0); };

  const isHoleBlockedByPhysics = (holeId) => {
      const hole = levelData.holes.find(h => h.id === holeId);
      if (!hole) return false;

      // Check Matter.js bodies directly for overlap
      // We can use Matter.Query.point to see if any plank overlaps the hole center
      const bodies = Object.values(plankBodiesRef.current);
      const overlapping = Matter.Query.point(bodies, { x: hole.x, y: hole.y });
      
      // If a body overlaps, is it a plank that is actually supposed to be mounted there?
      // Wait, in real physics, if a plank is swinging and overlaps a hole, it blocks it.
      // If it overlaps, check if it's the highest Z plank?
      // Matter.Query.point returns all bodies overlapping.
      
      for (const body of overlapping) {
          const plankId = Object.keys(plankBodiesRef.current).find(k => plankBodiesRef.current[k] === body);
          if (plankId) {
             const plank = levelData.planks.find(p => p.id === plankId);
             if (fallenPlanks.includes(plankId)) continue;
             
             // If this plank is currently mounted to this hole (it has a screw here), it doesn't "block" it from selection
             // Actually, if we are clicking an EMPTY hole, and a plank covers it, it's blocked.
             if (plank.h1 === hole.id || plank.h2 === hole.id) {
                 // It's its native hole. If it has a screw, it's not empty anyway. 
                 // If it's empty, and the plank still covers it, you CAN place a screw there to re-mount it!
                 // Wait! In the real game, if a plank is swinging over its original hole, you can screw it back in.
                 continue; 
             } else {
                 return true; // Another plank swung over this hole!
             }
          }
      }
      return false;
  };

  const handleScrewClick = (screwId) => {
    if (phase !== "playing") return;
    
    const screw = screws.find(s => s.id === screwId);
    if (!screw) return;

    // To check if a screw is blocked, we check if a plank with a higher Z-index covers it
    const hole = levelData.holes.find(h => h.id === screw.holeId);
    const overlapping = Matter.Query.point(Object.values(plankBodiesRef.current), { x: hole.x, y: hole.y });
    let blocked = false;
    
    // Find native plank Z
    const nativeZ = Math.max(0, ...levelData.planks.filter(p => (p.h1 === hole.id || p.h2 === hole.id)).map(p => p.z));

    for (const body of overlapping) {
        const plankId = Object.keys(plankBodiesRef.current).find(k => plankBodiesRef.current[k] === body);
        const plank = levelData.planks.find(p => p.id === plankId);
        if (plank && plank.h1 !== hole.id && plank.h2 !== hole.id) {
            // A foreign plank overlaps this screw
            if (plank.z > nativeZ) blocked = true;
        }
    }

    if (blocked) {
       playSound("error", audioCtxRef);
       return; 
    }

    if (selectedScrew === screwId) {
        setSelectedScrew(null);
    } else {
        playSound("unscrew", audioCtxRef);
        setSelectedScrew(screwId);
    }
  };

  const handleHoleClick = (holeId) => {
    if (phase !== "playing" || !selectedScrew) return;
    
    if (screws.some(s => s.holeId === holeId)) {
       const otherScrew = screws.find(s => s.holeId === holeId);
       playSound("unscrew", audioCtxRef);
       setSelectedScrew(otherScrew.id);
       return;
    }

    if (isHoleBlockedByPhysics(holeId)) {
       playSound("error", audioCtxRef);
       return; 
    }

    playSound("place", audioCtxRef);
    setScrews(prev => prev.map(s => s.id === selectedScrew ? { ...s, holeId } : s));
    setSelectedScrew(null);
  };

  const handlePlankFall = useCallback((plankId) => {
    setFallenPlanks(prev => {
      if (prev.includes(plankId)) return prev;
      playSound("drop", audioCtxRef);
      setScore(s => s + 10);
      return [...prev, plankId];
    });
  }, []);

  const calcStars = () => {
    if (time >= levelData.targetTime * 0.3) return 3;
    if (time >= levelData.targetTime * 0.1) return 2;
    return 1;
  };

  if (phase === "level_select") {
    // ... [Same level select code]
    return (
      <GameShell title="Nut Craft" score={score} lives={lives} phase="playing" onRestart={() => setPhase("playing")}>
        <div className="nc-modal" style={{background: 'rgba(20, 15, 10, 1)'}}>
          <h1 style={{fontSize: 28, marginBottom: 20}}>NUTCRAFT LEVELS</h1>
          <div style={{display:'flex', flexDirection:'column', gap: 12, width: '80%'}}>
            {[1,2,3,4,5].map((lvl, idx) => (
              <button key={lvl} className="nc-modal-btn" onClick={() => loadLevel(idx)}
                style={{display:'flex', justifyContent:'space-between', padding: '16px 24px', background: '#3e2723', border: '1px solid #5d4037'}}>
                <span>LEVEL {lvl}</span><span>{"⭐".repeat(levelStars[idx])}</span>
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
      title="Nut Craft" score={score} lives={lives} time={time} level={currentLevelIdx + 1}
      phase={phase === "level_complete" || phase === "failed" || phase === "game_complete" ? "playing" : phase} 
      onPause={() => setPhase(p => p === "paused" ? "playing" : "paused")} 
      onResume={() => setPhase("playing")} 
      onRestart={handleRetry}
    >
      <div className="nutcraft-board" id="nc-board">
        {phase === "level_complete" && (
          <div className="nc-modal">
            <h1>LEVEL COMPLETE!</h1><div className="nc-stars">{"⭐".repeat(calcStars())}</div>
            <div className="nc-modal-stats">Time Left: {time}s<br/>Planks Cleared: {levelData.planks.length}</div>
            <button className="nc-modal-btn" onClick={handleNextLevel}>NEXT LEVEL</button>
          </div>
        )}

        {phase === "game_complete" && (
          <div className="nc-modal" style={{background: 'rgba(20, 15, 10, 0.95)'}}>
            <h1 style={{fontSize: 28, textAlign: 'center'}}>NUTCRAFT COMPLETE!</h1>
            <p style={{color: '#ffca28', fontWeight: 'bold', letterSpacing: 1, marginBottom: 16}}>ALL 5 LEVELS COMPLETED</p>
            <div className="nc-stars" style={{marginBottom: 16}}>{"⭐".repeat(calcStars())}</div>
            <div className="nc-modal-stats" style={{fontSize: 16, marginBottom: 24}}>Total Score: {score + (totalTimeLeft * 2)}<br/>Best Time Combined: {totalTimeLeft}s</div>
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

        {levelData.holes.map(hole => (
          <div key={`h-${hole.id}`} className="hole hole-interactive" style={{ left: hole.x, top: hole.y }} onClick={() => handleHoleClick(hole.id)} />
        ))}

        {levelData.planks.map(plank => {
          if (fallenPlanks.includes(plank.id)) return null;
          const state = plankStates[plank.id];
          if (!state) return null; // wait for first physics tick

          const h1 = levelData.holes.find(h => h.id === plank.h1);
          const h2 = levelData.holes.find(h => h.id === plank.h2);
          const length = Math.hypot(h2.x - h1.x, h2.y - h1.y);

          // The DOM element's anchor is its center, because we translate(-50%, -50%)
          return (
            <div key={`plank-${plank.id}`} style={{
              position: 'absolute',
              left: state.x,
              top: state.y,
              transform: `translate(-50%, -50%) rotate(${state.angle}rad)`,
              width: length + 36,
              height: 36,
              zIndex: plank.z,
              pointerEvents: 'none'
            }}>
              <div className="plank" style={{ width: '100%', height: '100%', borderRadius: 18, position: 'relative' }}>
                <div className="plank-texture" />
                <div className="blue-bracket" style={{ position: 'absolute', top: 0, left: 0 }}/>
                <div className="blue-bracket" style={{ position: 'absolute', top: 0, right: 0 }}/>
              </div>
            </div>
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
              <div className="screw-visual"><div className="screw-cross" /></div>
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
