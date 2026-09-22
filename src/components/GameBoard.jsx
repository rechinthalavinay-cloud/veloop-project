import React, { useEffect, useRef, useState } from 'react';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { GameManager } from '../game/GameManager';
import { PuzzleLogic } from '../game/PuzzleLogic';
import { CollisionManager } from '../game/CollisionManager';
import { levels } from '../data/levels';
import { GameShell } from '../games/GameShell';
import '../games/NutCraft.css';

export function GameBoard({ onOutcome, reviveSignal }) {
  const [gameState, setGameState] = useState(null);
  const [plankPositions, setPlankPositions] = useState({});
  const [particles, setParticles] = useState([]);
  const [boardScale, setBoardScale] = useState(1);

  const physicsRef = useRef(null);
  const managerRef = useRef(null);
  const logicRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setBoardScale(window.innerWidth < 450 ? window.innerWidth / 450 : 1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Initialize singletons
    const manager = new GameManager((newState) => {
      setGameState({ ...newState });
    });
    managerRef.current = manager;

    const physics = new PhysicsWorld((fallenPlankId) => {
      manager.handlePlankFallen();
    });
    physicsRef.current = physics;

    logicRef.current = new PuzzleLogic(physics);
    new CollisionManager(physics); // Attaches events

    manager.initLevel(levels[0]);
    physics.initLevel(levels[0]);
    physics.start();

    // Render loop for syncing Matter.js to React state
    const syncLoop = () => {
      if (physicsRef.current) {
        setPlankPositions(physicsRef.current.getPlankPositions());
      }
      rafRef.current = requestAnimationFrame(syncLoop);
    };
    rafRef.current = requestAnimationFrame(syncLoop);

    return () => {
      physics.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleBoltClick = (boltId) => {
    if (!managerRef.current || !physicsRef.current || !logicRef.current) return;
    
    const currentLevel = levels[gameState.levelIdx];
    const isBlocked = logicRef.current.isBoltBlocked(boltId, currentLevel);
    
    const result = managerRef.current.handleBoltClick(boltId, isBlocked);
    
    if (result.success) {
      physicsRef.current.removeBolt(boltId);
      
      // Spawn particles
      const bolt = currentLevel.bolts.find(b => b.id === boltId);
      const newParts = Array.from({ length: 8 }).map((_, i) => ({
        id: Date.now() + i,
        x: bolt.x,
        y: bolt.y,
        tx: bolt.x + (Math.random() - 0.5) * 80,
        ty: bolt.y + (Math.random() - 0.5) * 80
      }));
      setParticles(p => [...p, ...newParts]);
      setTimeout(() => setParticles(p => p.filter(part => !newParts.find(n => n.id === part.id))), 500);
    } else if (result.reason === 'blocked') {
      // Shake animation can be triggered here via state or DOM ref
    }
  };

  const handleRestart = () => {
    if (onOutcome) {
      onOutcome({ type: 'game_over', score: gameState.score });
    } else {
      const lvl = levels[gameState.levelIdx];
      managerRef.current.initLevel(lvl);
      physicsRef.current.initLevel(lvl);
    }
  };

  const handleNextLevel = () => {
    const nextIdx = Math.min(gameState.levelIdx + 1, levels.length - 1);
    if (nextIdx === gameState.levelIdx && onOutcome) {
      // Game completely finished all levels!
      onOutcome({ type: 'complete', score: gameState.score });
      return;
    }
    managerRef.current.state.levelIdx = nextIdx;
    const lvl = levels[nextIdx];
    managerRef.current.initLevel(lvl);
    physicsRef.current.initLevel(lvl);
  };

  if (!gameState) return null;

  const currentLevel = levels[gameState.levelIdx];

  return (
    <GameShell 
      title="Nut Craft" 
      score={gameState.energy} 
      lives={gameState.lives} 
      time={gameState.timeLeft} 
      level={gameState.levelIdx + 1}
      phase={gameState.phase} 
      onPause={() => managerRef.current.state.phase = "paused"} 
      onResume={() => managerRef.current.state.phase = "playing"} 
      onRestart={handleRestart}
    >
      <div className="nutcraft-board" id="nc-board" style={{ transform: `scale(${boardScale})`, transformOrigin: 'top center' }}>
        
        {/* Render Planks */}
        {currentLevel.planks.map(plankData => {
          const pos = plankPositions[plankData.id];
          if (!pos) return null; // Fallen or not yet synced

          const connectedBolts = plankData.connections.map(bId => currentLevel.bolts.find(b => b.id === bId));
          const length = Math.hypot(connectedBolts[1].x - connectedBolts[0].x, connectedBolts[1].y - connectedBolts[0].y);

          return (
            <div 
              key={`plank-${plankData.id}`}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: length + 36,
                height: 36,
                transform: `translate(-50%, -50%) rotate(${pos.angle}rad)`,
                zIndex: plankData.z || 10,
                pointerEvents: 'none',
                willChange: 'transform, left, top'
              }}
            >
              <div className="plank" style={{ width: '100%', height: '100%', borderRadius: 18, position: 'relative' }}>
                <div className="plank-texture" />
                <div className="metal-bracket" style={{ position: 'absolute', left: 0, top: 0 }} />
                <div className="metal-bracket" style={{ position: 'absolute', right: 0, top: 0 }} />
              </div>
            </div>
          );
        })}

        {/* Render Bolts */}
        {currentLevel.bolts.map(bolt => {
          const isActive = gameState.activeBolts.includes(bolt.id);
          if (!isActive) return null;

          return (
            <div 
              key={`bolt-${bolt.id}`}
              className="screw-interactive"
              style={{ left: bolt.x, top: bolt.y, zIndex: 100 }}
              onClick={() => handleBoltClick(bolt.id)}
            >
              <div className="screw-visual" style={{ background: 'radial-gradient(circle at 30% 30%, #e0e5ec, #788591 60%, #4a5568)' }}>
                <div className="screw-cross" style={{ color: '#111', fontSize: '18px', fontWeight: 'bold' }}>X</div>
              </div>
            </div>
          );
        })}

        {/* Particles */}
        {particles.map(p => (
          <div key={p.id} className="particle" style={{ left: p.x, top: p.y, '--tx': `${p.tx - p.x}px`, '--ty': `${p.ty - p.y}px` }} />
        ))}
      </div>
    </GameShell>
  );
}
