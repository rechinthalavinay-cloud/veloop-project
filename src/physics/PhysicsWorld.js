import Matter from 'matter-js';
import { createPlankBody } from './PlankPhysics';
import { createBoltConstraints } from './BoltConstraints';

export class PhysicsWorld {
  constructor(onPlankFallen) {
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.runner = Matter.Runner.create();
    
    // Add default gravity
    this.engine.world.gravity.y = 1;
    this.engine.world.gravity.x = 0;

    this.plankBodies = {};
    this.boltConstraints = {};
    
    this.onPlankFallen = onPlankFallen;
    this.rafId = null;
    this.lastTime = 0;
  }

  initLevel(levelData) {
    Matter.World.clear(this.world);
    Matter.Engine.clear(this.engine);
    this.plankBodies = {};
    this.boltConstraints = {};

    // Create planks
    levelData.planks.forEach(plankData => {
      const body = createPlankBody(plankData, levelData.bolts);
      if (body) {
        this.plankBodies[plankData.id] = body;
        Matter.World.add(this.world, body);
      }
    });

    // Create bolts
    levelData.bolts.forEach(bolt => {
      // Find which planks are connected to this bolt
      const connectedPlanks = levelData.planks.filter(p => p.connections.includes(bolt.id));
      const constraints = createBoltConstraints(bolt, connectedPlanks, this.plankBodies);
      this.boltConstraints[bolt.id] = constraints;
      constraints.forEach(c => Matter.World.add(this.world, c));
    });
  }

  start() {
    Matter.Runner.run(this.runner, this.engine);
    this.loop();
  }

  stop() {
    Matter.Runner.stop(this.runner);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  loop = (time) => {
    this.checkFallenPlanks();
    this.rafId = requestAnimationFrame(this.loop);
  }

  checkFallenPlanks() {
    Object.keys(this.plankBodies).forEach(id => {
      const body = this.plankBodies[id];
      if (body && body.position.y > 800) { // Off screen
        this.onPlankFallen(id);
        Matter.World.remove(this.world, body);
        delete this.plankBodies[id];
      }
    });
  }

  removeBolt(boltId) {
    const constraints = this.boltConstraints[boltId];
    if (constraints) {
      constraints.forEach(c => {
          Matter.World.remove(this.world, c);
          // Apply a tiny nudge to bodies that lost a constraint so they don't perfectly balance
          Matter.Body.applyForce(c.bodyA, c.bodyA.position, { 
             x: (Math.random() - 0.5) * 0.005, 
             y: 0 
          });
      });
      delete this.boltConstraints[boltId];
      return true;
    }
    return false;
  }

  getPlankPositions() {
    const positions = {};
    Object.keys(this.plankBodies).forEach(id => {
      const body = this.plankBodies[id];
      positions[id] = {
        x: body.position.x,
        y: body.position.y,
        angle: body.angle
      };
    });
    return positions;
  }
}
