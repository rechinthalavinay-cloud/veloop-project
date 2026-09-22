import { useEffect, useRef, useState, useCallback } from "react";
import Matter from "matter-js";
import { GameShell } from "./GameShell";
import "./NutCraft.css";

const { Engine, World, Bodies, Constraint, Body, Vector } = Matter;

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
    // Level 1: 4 planks
    holes = [ 
      { id: 'h1', x: 80, y: 150 }, { id: 'h2', x: 220, y: 150 }, 
      { id: 'h3', x: 120, y: 230 }, { id: 'h4', x: 260, y: 230 },
      { id: 'h5', x: 160, y: 100 }, { id: 'h6', x: 160, y: 280 },
      { id: 'h7', x: 200, y: 80 }, { id: 'h8', x: 200, y: 200 },
      { id: 'e1', x: 100, y: 80 }, { id: 'e2', x: 260, y: 90 }
    ];
    planks = [ 
      { id: 'p1', h1: 'h1', h2: 'h2', z: 10 }, 
      { id: 'p2', h1: 'h3', h2: 'h4', z: 20 },
      { id: 'p3', h1: 'h5', h2: 'h6', z: 30 },
      { id: 'p4', h1: 'h7', h2: 'h8', z: 40 }
    ];
    screws = [ 
      { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' }, 
      { id: 's3', holeId: 'h3' }, { id: 's4', holeId: 'h4' },
      { id: 's5', holeId: 'h5' }, { id: 's6', holeId: 'h6' },
      { id: 's7', holeId: 'h7' }, { id: 's8', holeId: 'h8' }
    ];
    targetTime = 50;
  } else if (levelIdx === 1) {
    holes = [ 
      { id: 'h1', x: 100, y: 120 }, { id: 'h2', x: 240, y: 120 },
      { id: 'h3', x: 170, y: 180 }, { id: 'h4', x: 170, y: 320 },
      { id: 'h5', x: 100, y: 260 }, { id: 'h6', x: 240, y: 260 },
      { id: 'h7', x: 70, y: 190 }, { id: 'h8', x: 270, y: 190 },
      { id: 'e1', x: 170, y: 60 }, { id: 'e2', x: 280, y: 60 }
    ];
    planks = [ 
      { id: 'p1', h1: 'h1', h2: 'h2', z: 10 }, 
      { id: 'p2', h1: 'h3', h2: 'h4', z: 20 },
      { id: 'p3', h1: 'h5', h2: 'h6', z: 30 },
      { id: 'p4', h1: 'h7', h2: 'h8', z: 40 }
    ];
    screws = [ 
      { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' },
      { id: 's3', holeId: 'h3' }, { id: 's4', holeId: 'h4' },
      { id: 's5', holeId: 'h5' }, { id: 's6', holeId: 'h6' },
      { id: 's7', holeId: 'h7' }, { id: 's8', holeId: 'h8' }
    ];
    targetTime = 60;
  } else if (levelIdx === 2) {
    holes = [ 
      { id: 'h1', x: 80, y: 80 }, { id: 'h2', x: 260, y: 260 }, 
      { id: 'h3', x: 260, y: 80 }, { id: 'h4', x: 80, y: 260 }, 
      { id: 'h5', x: 170, y: 50 }, { id: 'h6', x: 170, y: 300 },  
      { id: 'h7', x: 50, y: 170 }, { id: 'h8', x: 290, y: 170 },  
      { id: 'h9', x: 110, y: 110 }, { id: 'h10', x: 230, y: 110 }, 
      { id: 'e1', x: 170, y: 170 }, { id: 'e2', x: 170, y: 350 }  
    ];
    planks = [ 
      { id: 'p1', h1: 'h1', h2: 'h2', z: 10 },
      { id: 'p2', h1: 'h3', h2: 'h4', z: 20 },
      { id: 'p3', h1: 'h5', h2: 'h6', z: 30 },
      { id: 'p4', h1: 'h7', h2: 'h8', z: 40 },
      { id: 'p5', h1: 'h9', h2: 'h10', z: 50 } 
    ];
    screws = [ 
      { id: 's1', holeId: 'h1' }, { id: 's2', holeId: 'h2' }, 
      { id: 's3', holeId: 'h3' }, { id: 's4', holeId: 'h4' },
      { id: 's5', holeId: 'h5' }, { id: 's6', holeId: 'h6' },
      { id: 's7', holeId: 'h7' }, { id: 's8', holeId: 'h8' },
      { id: 's9', holeId: 'h9' }, { id: 's10', holeId: 'h10' } 
    ];
    targetTime = 90;
  } else if (levelIdx === 3) {
    holes = [
      {id:'v1a',x:110,y:80}, {id:'v1b',x:110,y:300}, 
      {id:'v2a',x:230,y:80}, {id:'v2b',x:230,y:300}, 
      {id:'h1a',x:60,y:130}, {id:'h1b',x:280,y:130}, 
      {id:'h2a',x:60,y:250}, {id:'h2b',x:280,y:250}, 
      {id:'d1a',x:170,y:60}, {id:'d1b',x:170,y:320},
      {id:'d2a',x:170,y:190}, {id:'d2b',x:170,y:360},
      {id:'e1',x:60,y:190}, {id:'e2',x:280,y:190}, {id:'e3',x:110,y:190} 
    ];
    planks = [
      { id: 'p1', h1: 'v1a', h2: 'v1b', z: 10 },
      { id: 'p2', h1: 'v2a', h2: 'v2b', z: 20 },
      { id: 'p3', h1: 'h1a', h2: 'h1b', z: 30 },
      { id: 'p4', h1: 'h2a', h2: 'h2b', z: 40 },
      { id: 'p5', h1: 'd1a', h2: 'd1b', z: 50 },
      { id: 'p6', h1: 'd2a', h2: 'd2b', z: 60 }
    ];
    screws = [
      { id: 's1', holeId: 'v1a' }, { id: 's2', holeId: 'v1b' }, 
      { id: 's3', holeId: 'v2a' }, { id: 's4', holeId: 'v2b' },
      { id: 's5', holeId: 'h1a' }, { id: 's6', holeId: 'h1b' },
      { id: 's7', holeId: 'h2a' }, { id: 's8', holeId: 'h2b' },
      { id: 's9', holeId: 'd1a' }, { id: 's10', holeId: 'd1b' },
      { id: 's11', holeId: 'd2a' }, { id: 's12', holeId: 'd2b' }
    ];
    targetTime = 120;
  } else if (levelIdx === 4) { 
    holes = [
      {id:'a1',x:60,y:100}, {id:'a2',x:280,y:100},
      {id:'b1',x:60,y:200}, {id:'b2',x:280,y:200},
      {id:'c1',x:60,y:300}, {id:'c2',x:280,y:300},
      {id:'d1',x:120,y:60}, {id:'d2',x:120,y:340},
      {id:'e1',x:220,y:60}, {id:'e2',x:220,y:340},
      {id:'f1',x:170,y:60}, {id:'f2',x:170,y:340},
      {id:'g1',x:90,y:150}, {id:'g2',x:250,y:150},
      {id:'h1',x:90,y:250}, {id:'h2',x:250,y:250},
      {id:'x1',x:170,y:200}, {id:'x2',x:170,y:150}, {id:'x3',x:170,y:250}
    ];
    planks = [
      {id:'p1', h1:'a1', h2:'a2', z:10},
      {id:'p2', h1:'b1', h2:'b2', z:20},
      {id:'p3', h1:'c1', h2:'c2', z:30},
      {id:'p4', h1:'d1', h2:'d2', z:40}, 
      {id:'p5', h1:'e1', h2:'e2', z:50},   
      {id:'p6', h1:'f1', h2:'f2', z:60},   
      {id:'p7', h1:'g1', h2:'g2', z:70},
      {id:'p8', h1:'h1', h2:'h2', z:80},
    ];
    screws = [
      { id: 's1', holeId: 'a1' }, { id: 's2', holeId: 'a2' },
      { id: 's3', holeId: 'b1' }, { id: 's4', holeId: 'b2' },
      { id: 's5', holeId: 'c1' }, { id: 's6', holeId: 'c2' },
      { id: 's7', holeId: 'd1' }, { id: 's8', holeId: 'd2' },
      { id: 's9', holeId: 'e1' }, { id: 's10', holeId: 'e2' },
      { id: 's11', holeId: 'f1' }, { id: 's12', holeId: 'f2' },
      { id: 's13', holeId: 'g1' }, { id: 's14', holeId: 'g2' },
      { id: 's15', holeId: 'h1' }, { id: 's16', holeId: 'h2' }
    ];
    targetTime = 180;
  } else if (levelIdx === 5) {
    // Level 6: Zig Zag Pattern
    holes = [
      {id:'h1',x:50,y:50}, {id:'h2',x:150,y:150},
      {id:'h3',x:250,y:50}, {id:'h4',x:350,y:150},
      {id:'h5',x:50,y:250}, {id:'h6',x:150,y:350},
      {id:'h7',x:250,y:250}, {id:'h8',x:350,y:350},
      {id:'e1',x:100,y:100}, {id:'e2',x:300,y:100},
      {id:'e3',x:100,y:300}, {id:'e4',x:300,y:300}
    ];
    planks = [
      {id:'p1', h1:'h1', h2:'h2', z:10},
      {id:'p2', h1:'h2', h2:'h3', z:20},
      {id:'p3', h1:'h3', h2:'h4', z:30},
      {id:'p4', h1:'h5', h2:'h6', z:40},
      {id:'p5', h1:'h6', h2:'h7', z:50},
      {id:'p6', h1:'h7', h2:'h8', z:60}
    ];
    screws = [
      {id:'s1', holeId:'h1'}, {id:'s2', holeId:'h2'}, {id:'s3', holeId:'h3'}, {id:'s4', holeId:'h4'},
      {id:'s5', holeId:'h5'}, {id:'s6', holeId:'h6'}, {id:'s7', holeId:'h7'}, {id:'s8', holeId:'h8'}
    ];
    targetTime = 150;
  } else if (levelIdx === 6) {
    // Level 7: Starburst
    holes = [
      {id:'c',x:200,y:200},
      {id:'t',x:200,y:40}, {id:'b',x:200,y:360},
      {id:'l',x:40,y:200}, {id:'r',x:360,y:200},
      {id:'tl',x:80,y:80}, {id:'br',x:320,y:320},
      {id:'tr',x:320,y:80}, {id:'bl',x:80,y:320},
      {id:'e1',x:140,y:140}, {id:'e2',x:260,y:260},
      {id:'e3',x:260,y:140}, {id:'e4',x:140,y:260}
    ];
    planks = [
      {id:'p1', h1:'l', h2:'c', z:10}, {id:'p2', h1:'c', h2:'r', z:20},
      {id:'p3', h1:'t', h2:'c', z:30}, {id:'p4', h1:'c', h2:'b', z:40},
      {id:'p5', h1:'tl', h2:'c', z:50}, {id:'p6', h1:'c', h2:'br', z:60},
      {id:'p7', h1:'tr', h2:'c', z:70}, {id:'p8', h1:'c', h2:'bl', z:80}
    ];
    screws = [
      {id:'s1', holeId:'l'}, {id:'s2', holeId:'r'}, {id:'s3', holeId:'t'}, {id:'s4', holeId:'b'},
      {id:'s5', holeId:'tl'}, {id:'s6', holeId:'br'}, {id:'s7', holeId:'tr'}, {id:'s8', holeId:'bl'},
      {id:'s9', holeId:'c'}
    ];
    targetTime = 200;
  } else if (levelIdx === 7) {
    // Level 8: Double Box
    holes = [
      {id:'o1',x:60,y:60}, {id:'o2',x:340,y:60}, {id:'o3',x:340,y:340}, {id:'o4',x:60,y:340},
      {id:'i1',x:120,y:120}, {id:'i2',x:280,y:120}, {id:'i3',x:280,y:280}, {id:'i4',x:120,y:280},
      {id:'e1',x:200,y:60}, {id:'e2',x:200,y:340}, {id:'e3',x:60,y:200}, {id:'e4',x:340,y:200},
      {id:'e5',x:200,y:120}, {id:'e6',x:200,y:280}, {id:'e7',x:120,y:200}, {id:'e8',x:280,y:200}
    ];
    planks = [
      {id:'p1', h1:'o1', h2:'o2', z:10}, {id:'p2', h1:'o2', h2:'o3', z:20},
      {id:'p3', h1:'o3', h2:'o4', z:30}, {id:'p4', h1:'o4', h2:'o1', z:40},
      {id:'p5', h1:'i1', h2:'i2', z:50}, {id:'p6', h1:'i2', h2:'i3', z:60},
      {id:'p7', h1:'i3', h2:'i4', z:70}, {id:'p8', h1:'i4', h2:'i1', z:80},
      {id:'p9', h1:'o1', h2:'i1', z:90}, {id:'p10', h1:'o3', h2:'i3', z:100}
    ];
    screws = [
      {id:'s1', holeId:'o1'}, {id:'s2', holeId:'o2'}, {id:'s3', holeId:'o3'}, {id:'s4', holeId:'o4'},
      {id:'s5', holeId:'i1'}, {id:'s6', holeId:'i2'}, {id:'s7', holeId:'i3'}, {id:'s8', holeId:'i4'}
    ];
    targetTime = 220;
  } else if (levelIdx === 8) {
    // Level 9: X Marks the Spot
    holes = [
      {id:'tl',x:50,y:50}, {id:'br',x:350,y:350},
      {id:'tr',x:350,y:50}, {id:'bl',x:50,y:350},
      {id:'c1',x:170,y:170}, {id:'c2',x:230,y:230},
      {id:'c3',x:230,y:170}, {id:'c4',x:170,y:230},
      {id:'m1',x:200,y:100}, {id:'m2',x:200,y:300},
      {id:'m3',x:100,y:200}, {id:'m4',x:300,y:200},
      {id:'e1',x:200,y:50}, {id:'e2',x:200,y:350}
    ];
    planks = [
      {id:'p1', h1:'tl', h2:'c1', z:10}, {id:'p2', h1:'c2', h2:'br', z:20},
      {id:'p3', h1:'tr', h2:'c3', z:30}, {id:'p4', h1:'c4', h2:'bl', z:40},
      {id:'p5', h1:'c1', h2:'c2', z:50}, {id:'p6', h1:'c3', h2:'c4', z:60},
      {id:'p7', h1:'m1', h2:'m2', z:70}, {id:'p8', h1:'m3', h2:'m4', z:80}
    ];
    screws = [
      {id:'s1', holeId:'tl'}, {id:'s2', holeId:'br'}, {id:'s3', holeId:'tr'}, {id:'s4', holeId:'bl'},
      {id:'s5', holeId:'c1'}, {id:'s6', holeId:'c2'}, {id:'s7', holeId:'c3'}, {id:'s8', holeId:'c4'},
      {id:'s9', holeId:'m1'}, {id:'s10', holeId:'m2'}, {id:'s11', holeId:'m3'}, {id:'s12', holeId:'m4'}
    ];
    targetTime = 240;
  } else if (levelIdx >= 9) {
    // Level 10: The Ultimate Challenge
    holes = [
      {id:'a',x:100,y:80}, {id:'b',x:300,y:80},
      {id:'c',x:50,y:200}, {id:'d',x:200,y:200}, {id:'e',x:350,y:200},
      {id:'f',x:100,y:320}, {id:'g',x:300,y:320},
      {id:'h',x:200,y:140}, {id:'i',x:200,y:260},
      {id:'x1',x:150,y:100}, {id:'x2',x:250,y:100},
      {id:'x3',x:150,y:300}, {id:'x4',x:250,y:300},
      {id:'e1',x:150,y:200}, {id:'e2',x:250,y:200},
      {id:'e3',x:200,y:80}, {id:'e4',x:200,y:320}
    ];
    planks = [
      {id:'p1', h1:'a', h2:'b', z:10},
      {id:'p2', h1:'c', h2:'d', z:20}, {id:'p3', h1:'d', h2:'e', z:30},
      {id:'p4', h1:'f', h2:'g', z:40},
      {id:'p5', h1:'a', h2:'c', z:50}, {id:'p6', h1:'b', h2:'e', z:60},
      {id:'p7', h1:'c', h2:'f', z:70}, {id:'p8', h1:'e', h2:'g', z:80},
      {id:'p9', h1:'h', h2:'i', z:90}, {id:'p10', h1:'a', h2:'h', z:100},
      {id:'p11', h1:'b', h2:'h', z:110}, {id:'p12', h1:'f', h2:'i', z:120},
      {id:'p13', h1:'g', h2:'i', z:130}
    ];
    screws = [
      {id:'s1', holeId:'a'}, {id:'s2', holeId:'b'}, {id:'s3', holeId:'c'}, {id:'s4', holeId:'d'}, {id:'s5', holeId:'e'},
      {id:'s6', holeId:'f'}, {id:'s7', holeId:'g'}, {id:'s8', holeId:'h'}, {id:'s9', holeId:'i'}
    ];
    targetTime = 300;
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
  const [particles, setParticles] = useState([]);
  const [combo, setCombo] = useState({ count: 1, lastTime: 0 });
  const [boardScale, setBoardScale] = useState(1);
  
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [levelStars, setLevelStars] = useState([0,0,0,0,0,0,0,0,0,0]);

  const liveRef = useRef(true);
  const audioCtxRef = useRef(null);
  
  // Physics Engine Refs
  const engineRef = useRef(null);
  const plankBodiesRef = useRef({});
  const screwBodiesRef = useRef({});
  const constraintsRef = useRef({});
  const rafRef = useRef(null);
  const plankDOMRefs = useRef({}); 

  // --- Initialize Level & Scale ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 450) {
        setBoardScale(window.innerWidth / 450);
      } else {
        setBoardScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Physics World
  const initPhysics = useCallback((data, initialScrews) => {
    if (engineRef.current) {
        Engine.clear(engineRef.current);
    }
    const engine = Engine.create({
        gravity: { x: 0, y: 1 },
        positionIterations: 64,
        velocityIterations: 64
    });
    engineRef.current = engine;
    plankBodiesRef.current = {};
    constraintsRef.current = {};
    
    data.planks.forEach(plank => {
        const h1 = data.holes.find(h => h.id === plank.h1);
        const h2 = data.holes.find(h => h.id === plank.h2);
        
        const cx = (h1.x + h2.x) / 2;
        const cy = (h1.y + h2.y) / 2;
        const dx = h2.x - h1.x;
        const dy = h2.y - h1.y;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        const cat = 1 << Math.floor(plank.z / 10);
        const filter = { category: cat, mask: cat | 0x0001 }; // Collide with same layer and screws (0x0001)

        // Create a compound body with 2 physical holes at the ends
        const topBar = Bodies.rectangle(cx, cy - 12, length + 36, 6, { collisionFilter: filter });
        const bottomBar = Bodies.rectangle(cx, cy + 12, length + 36, 6, { collisionFilter: filter });
        const middleBar = Bodies.rectangle(cx, cy, Math.max(1, length - 24), 18, { collisionFilter: filter });
        const leftEnd = Bodies.rectangle(cx - length/2 - 15, cy, 6, 18, { collisionFilter: filter });
        const rightEnd = Bodies.rectangle(cx + length/2 + 15, cy, 6, 18, { collisionFilter: filter });

        const body = Body.create({
            parts: [topBar, bottomBar, middleBar, leftEnd, rightEnd],
            frictionAir: 0.005, 
            friction: 0.8,
            restitution: 0.1,
            density: 0.001, 
            collisionFilter: filter
        });
        
        // Rotate the compound body into place
        Matter.Body.setAngle(body, angle);
        
        plankBodiesRef.current[plank.id] = body;
        World.add(engine.world, body);
    });

    updateConstraints(initialScrews, data);
  }, []);

  const updateConstraints = useCallback((currentScrews, data, currentSelectedScrew = null) => {
      const engine = engineRef.current;
      if (!engine) return;

      Object.values(constraintsRef.current).forEach(c => World.remove(engine.world, c));
      constraintsRef.current = {};

      Object.values(screwBodiesRef.current || {}).forEach(b => World.remove(engine.world, b));
      screwBodiesRef.current = {};

      const constraintsPerBody = {};

      currentScrews.forEach(screw => {
          if (screw.id === currentSelectedScrew) return; // Do not build constraints or pegs for the currently unscrewed peg

          const hole = data.holes.find(h => h.id === screw.holeId);
          if (!hole) return;

          // Add screw as a physical static peg to block falling planks
          const screwBody = Bodies.circle(hole.x, hole.y, 10, {
              isStatic: true,
              collisionFilter: {
                  category: 0x0001,
                  mask: 0xFFFFFFFF // Block all layers
              }
          });
          World.add(engine.world, screwBody);
          screwBodiesRef.current[screw.id] = screwBody;

          data.planks.forEach(plank => {
              const body = plankBodiesRef.current[plank.id];
              if (!body) return;
              
              const h1_orig = data.holes.find(h => h.id === plank.h1);
              const h2_orig = data.holes.find(h => h.id === plank.h2);
              const dx = h2_orig.x - h1_orig.x;
              const dy = h2_orig.y - h1_orig.y;
              const length = Math.hypot(dx, dy);

              const localHoles = [
                  { x: -length / 2, y: 0, id: plank.h1 },
                  { x: length / 2, y: 0, id: plank.h2 }
              ];

              for (const localH of localHoles) {
                  const worldPoint = Vector.add(body.position, Vector.rotate(localH, body.angle));
                  const dist = Math.hypot(worldPoint.x - hole.x, worldPoint.y - hole.y);
                  
                  if (dist < 20) {
                      const constraint = Constraint.create({
                          bodyA: body,
                          pointA: { x: localH.x, y: localH.y },
                          pointB: { x: hole.x, y: hole.y },
                          stiffness: 1, 
                          length: 0
                      });
                      World.add(engine.world, constraint);
                      constraintsRef.current[`${plank.id}-${screw.id}-${localH.id}`] = constraint;
                      constraintsPerBody[plank.id] = (constraintsPerBody[plank.id] || 0) + 1;
                  }
              }
          });
      });

      // Completely lock bodies that have 2 or more constraints so they don't sag at all under gravity
      data.planks.forEach(plank => {
          const body = plankBodiesRef.current[plank.id];
          if (!body) return;
          const numConstraints = constraintsPerBody[plank.id] || 0;
          if (numConstraints >= 2) {
              Matter.Body.setStatic(body, true);
          } else {
              if (body.isStatic) {
                  Matter.Body.setStatic(body, false);
                  // Apply a microscopic nudge to break perfect vertical balance (inverted pendulum)
                  Matter.Body.applyForce(body, body.position, { 
                      x: (Math.random() - 0.5) * 0.005, 
                      y: 0 
                  });
              }
              Matter.Sleeping.set(body, false);
          }
      });
  }, []);

  const handlePlankFall = useCallback((plankId) => {
    setFallenPlanks(prev => {
      if (prev.includes(plankId)) return prev;
      playSound("drop", audioCtxRef);
      setScore(s => s + 10);
      return [...prev, plankId];
    });
  }, []);

  useEffect(() => {
      let lastTime = performance.now();

      const loop = (time) => {
          const delta = time - lastTime;
          lastTime = time;

          if (engineRef.current && phase === "playing") {
              Engine.update(engineRef.current, 1000 / 60);

              Object.keys(plankBodiesRef.current).forEach(id => {
                  const body = plankBodiesRef.current[id];
                  const node = plankDOMRefs.current[id];
                  
                  if (node) {
                      node.style.left = `${body.position.x}px`;
                      node.style.top = `${body.position.y}px`;
                      node.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
                  }

                  if (body.position.y > 600) {
                      handlePlankFall(id);
                      delete plankBodiesRef.current[id];
                      World.remove(engineRef.current.world, body);
                      if (node) node.style.display = 'none';
                  }
              });
          }
          rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafRef.current);
  }, [phase, handlePlankFall]); 

  useEffect(() => {
    initPhysics(levelData, levelData.screws);
  }, [levelData, initPhysics]);

  useEffect(() => {
    if (phase === "playing") updateConstraints(screws, levelData, selectedScrew);
  }, [screws, updateConstraints, levelData, phase, selectedScrew]);

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
        if (currentLevelIdx >= 9) {
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
    if (idx > 9) return;
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

  const handleNextLevel = () => { if (currentLevelIdx < 9) loadLevel(currentLevelIdx + 1); };
  const handleRetry = () => { loadLevel(currentLevelIdx); };
  const handlePlayAgain = () => { setTotalTimeLeft(0); loadLevel(0); };

  const isHoleBlockedByPhysics = (holeId) => {
      const hole = levelData.holes.find(h => h.id === holeId);
      if (!hole) return false;

      const bodies = Object.values(plankBodiesRef.current);
      const overlapping = Matter.Query.point(bodies, { x: hole.x, y: hole.y });
      
      for (const body of overlapping) {
          const plankId = Object.keys(plankBodiesRef.current).find(k => plankBodiesRef.current[k] === body);
          if (plankId) {
             const plank = levelData.planks.find(p => p.id === plankId);
             if (!plank) continue;

             const h1_orig = levelData.holes.find(h => h.id === plank.h1);
             const h2_orig = levelData.holes.find(h => h.id === plank.h2);
             const dx = h2_orig.x - h1_orig.x;
             const dy = h2_orig.y - h1_orig.y;
             const length = Math.hypot(dx, dy);

             const localHoles = [
                 { x: -length / 2, y: 0 },
                 { x: length / 2, y: 0 }
             ];

             let hasMatchingHole = false;
             for (const localH of localHoles) {
                 const worldPoint = Vector.add(body.position, Vector.rotate(localH, body.angle));
                 const dist = Math.hypot(worldPoint.x - hole.x, worldPoint.y - hole.y);
                 if (dist < 20) {
                     hasMatchingHole = true;
                     break;
                 }
             }

             if (!hasMatchingHole) {
                 return true; 
             }
          }
      }
      return false;
  };

  const handleScrewClick = (screwId) => {
    if (phase !== "playing") return;
    
    const screw = screws.find(s => s.id === screwId);
    if (!screw) return;

    const hole = levelData.holes.find(h => h.id === screw.holeId);
    const overlapping = Matter.Query.point(Object.values(plankBodiesRef.current), { x: hole.x, y: hole.y });
    let blocked = false;
    
    const nativeZ = Math.max(0, ...levelData.planks.filter(p => (p.h1 === hole.id || p.h2 === hole.id)).map(p => p.z));

    for (const body of overlapping) {
        const plankId = Object.keys(plankBodiesRef.current).find(k => plankBodiesRef.current[k] === body);
        const plank = levelData.planks.find(p => p.id === plankId);
        if (plank) {
            // Check if this plank has a hole overlapping the screw hole
             const h1_orig = levelData.holes.find(h => h.id === plank.h1);
             const h2_orig = levelData.holes.find(h => h.id === plank.h2);
             const dx = h2_orig.x - h1_orig.x;
             const dy = h2_orig.y - h1_orig.y;
             const length = Math.hypot(dx, dy);

             const localHoles = [
                 { x: -length / 2, y: 0 },
                 { x: length / 2, y: 0 }
             ];

             let hasMatchingHole = false;
             for (const localH of localHoles) {
                 const worldPoint = Vector.add(body.position, Vector.rotate(localH, body.angle));
                 const dist = Math.hypot(worldPoint.x - hole.x, worldPoint.y - hole.y);
                 if (dist < 20) {
                     hasMatchingHole = true;
                     break;
                 }
             }

             if (!hasMatchingHole && plank.z > nativeZ) {
                 blocked = true;
             }
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
       setLives(l => {
           const newLives = l - 1;
           if (newLives <= 0) setPhase("failed");
           return newLives;
       });
       return; 
    }

    playSound("place", audioCtxRef);
    
    const now = Date.now();
    let newCombo = 1;
    if (now - combo.lastTime < 3000) {
        newCombo = combo.count + 1;
    }
    setCombo({ count: newCombo, lastTime: now });
    setScore(s => s + (10 * newCombo));

    const holeObj = levelData.holes.find(h => h.id === holeId);
    if (holeObj) {
        const newParticles = Array.from({ length: 8 }).map((_, i) => ({
            id: Date.now() + i,
            x: holeObj.x,
            y: holeObj.y,
            tx: holeObj.x + (Math.random() - 0.5) * 80,
            ty: holeObj.y + (Math.random() - 0.5) * 80
        }));
        setParticles(p => [...p, ...newParticles]);
        setTimeout(() => {
            setParticles(p => p.filter(part => !newParticles.find(np => np.id === part.id)));
        }, 600);
    }

    const newScrews = screws.map(s => s.id === selectedScrew ? { ...s, holeId } : s);
    setScrews(newScrews);
    setSelectedScrew(null);
    updateConstraints(newScrews, levelData, null);
  };

  const calcStars = () => {
    if (time >= levelData.targetTime * 0.3) return 3;
    if (time >= levelData.targetTime * 0.1) return 2;
    return 1;
  };

  if (phase === "level_select") {
    return (
      <GameShell title="Nut Craft" score={score} lives={lives} phase="playing" onRestart={() => setPhase("playing")}>
        <div className="nc-modal">
          <h1 style={{fontSize: 28, marginBottom: 20}}>NUTCRAFT LEVELS</h1>
          <div style={{display:'flex', flexDirection:'column', gap: 12, width: '80%', maxHeight: '300px', overflowY: 'auto'}}>
            {[1,2,3,4,5,6,7,8,9,10].map((lvl, idx) => (
              <button key={lvl} className="nc-modal-btn" onClick={() => loadLevel(idx)}
                style={{display:'flex', justifyContent:'space-between', padding: '16px 24px', border: 'none'}}>
                <span>LEVEL {lvl}</span><span>{"⭐".repeat(levelStars[idx])}</span>
              </button>
            ))}
          </div>
          <button className="nc-modal-btn" onClick={() => loadLevel(0)} style={{marginTop: 32, width:'80%'}}>
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
      <div className="nutcraft-board" id="nc-board" style={{ transform: `scale(${boardScale})`, transformOrigin: 'top center' }}>
        {particles.map(p => (
          <div key={p.id} className="particle" style={{ left: p.x, top: p.y, '--tx': `${p.tx - p.x}px`, '--ty': `${p.ty - p.y}px` }} />
        ))}
        {phase === "level_complete" && (
          <div className="nc-modal">
            <h1>LEVEL COMPLETE!</h1><div className="nc-stars">{"⭐".repeat(calcStars())}</div>
            <div className="nc-modal-stats">Time Left: {time}s<br/>Planks Cleared: {levelData.planks.length}</div>
            <button className="nc-modal-btn" onClick={handleNextLevel}>NEXT LEVEL</button>
          </div>
        )}

        {phase === "game_complete" && (
          <div className="nc-modal">
            <h1 style={{fontSize: 28, textAlign: 'center'}}>NUTCRAFT COMPLETE!</h1>
            <p style={{color: '#ffca28', fontWeight: 'bold', letterSpacing: 1, marginBottom: 16}}>ALL 10 LEVELS COMPLETED</p>
            <div className="nc-stars" style={{marginBottom: 16}}>{"⭐".repeat(calcStars())}</div>
            <div className="nc-modal-stats" style={{fontSize: 16, marginBottom: 24}}>Total Score: {score + (totalTimeLeft * 2)}<br/>Best Time Combined: {totalTimeLeft}s</div>
            <div style={{display:'flex', gap: 12, flexDirection: 'column', width: '80%'}}>
              <button className="nc-modal-btn primary" onClick={handlePlayAgain} style={{padding: '12px 16px'}}>PLAY AGAIN</button>
              <button className="nc-modal-btn" onClick={() => setPhase("level_select")} style={{padding: '12px 16px'}}>LEVEL SELECT</button>
            </div>
          </div>
        )}
        
        {phase === "failed" && (
          <div className="nc-modal">
            <h1 style={{color: '#ff5252'}}>{lives <= 0 ? 'GAME OVER' : 'OUT OF TIME'}</h1>
            <p style={{color: '#ffca28', fontWeight: 'bold', letterSpacing: 1, marginBottom: 16}}>Score: {score}</p>
            <div style={{display:'flex', gap: 12, flexDirection: 'column', width: '80%'}}>
              <button className="nc-modal-btn primary" onClick={handleRetry} style={{padding: '12px 16px'}}>RETRY</button>
            </div>
          </div>
        )}

        {levelData.holes.map(hole => (
          <div key={`h-${hole.id}`} className="hole hole-interactive" style={{ left: hole.x, top: hole.y }} onClick={() => handleHoleClick(hole.id)} />
        ))}

        {levelData.planks.map(plank => {
          if (fallenPlanks.includes(plank.id)) return null;

          const h1 = levelData.holes.find(h => h.id === plank.h1);
          const h2 = levelData.holes.find(h => h.id === plank.h2);
          const length = Math.hypot(h2.x - h1.x, h2.y - h1.y);

          const cx = (h1.x + h2.x) / 2;
          const cy = (h1.y + h2.y) / 2;
          const angle = Math.atan2(h2.y - h1.y, h2.x - h1.x);

          return (
            <div 
              key={`plank-${plank.id}`} 
              ref={(el) => { if (el) plankDOMRefs.current[plank.id] = el; }}
              style={{
                position: 'absolute',
                left: cx,
                top: cy,
                transform: `translate(-50%, -50%) rotate(${angle}rad)`,
                width: length + 36,
                height: 36,
                zIndex: plank.z,
                pointerEvents: 'none',
                willChange: 'transform, left, top' 
              }}>
              <div className="plank" style={{ width: '100%', height: '100%', borderRadius: 18, position: 'relative' }}>
                <div className="plank-texture" />
                <div className="metal-bracket" style={{ position: 'absolute', top: 0, left: 0 }}/>
                <div className="metal-bracket" style={{ position: 'absolute', top: 0, right: 0 }}/>
              </div>
            </div>
          );
        })}

        {screws.map(screw => {
          const hole = levelData.holes.find(h => h.id === screw.holeId);
          const isSelected = selectedScrew === screw.id;
          
          const holdingPlanks = levelData.planks.filter(p => (p.h1 === hole.id || p.h2 === hole.id) && !fallenPlanks.includes(p.id));
          // Screws should always remain visible above fallen planks so the player can see them.
          const maxZ = holdingPlanks.length > 0 ? Math.max(...holdingPlanks.map(p => p.z)) : 100;
          const dynamicZ = isSelected ? 250 : maxZ + 6;

          return (
            <div
              key={screw.id}
              className={`screw-interactive ${isSelected ? 'selected' : ''}`}
              style={{ left: `${hole.x}px`, top: `${hole.y}px`, zIndex: isSelected ? 250 : maxZ + 6 }}
              onClick={() => handleScrewClick(screw.id)}
            >
              <div className="screw-visual" style={{ background: 'radial-gradient(circle at 30% 30%, #e0e5ec, #788591 60%, #4a5568)' }}>
                <div className="screw-cross" style={{ color: '#111', fontSize: '18px', fontWeight: 'bold' }}>X</div>
              </div>
            </div>
          );
        })}
        {screws.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,0,0,0.5)', zIndex: 9999, color: 'white', fontSize: '32px', fontWeight: 'bold', textAlign: 'center' }}>
            SCREWS ARRAY IS EMPTY!
          </div>
        )}
      </div>

      <style>{`
        #game-time { ${time <= 10 && phase === 'playing' ? 'color: #ff5252 !important; animation: pulseTimer 1s infinite;' : ''} }
      `}</style>
    </GameShell>
  );
}
