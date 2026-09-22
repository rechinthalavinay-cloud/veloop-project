import Matter from 'matter-js';

export class CollisionManager {
  constructor(physicsWorld) {
    this.physicsWorld = physicsWorld;
    this.init();
  }

  init() {
    Matter.Events.on(this.physicsWorld.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        
        // A simple impact threshold calculation
        // Matter.js velocity is accessible via pair.bodyA.velocity
        // For a more accurate impact, we can check relative velocity
        const relVelX = pair.bodyA.velocity.x - pair.bodyB.velocity.x;
        const relVelY = pair.bodyA.velocity.y - pair.bodyB.velocity.y;
        const impact = Math.hypot(relVelX, relVelY);

        if (impact > 2) {
          // Disabling audio for now until we hook up a sound system,
          // but this is where we'd trigger a wood-clack sound effect.
          // console.log("Heavy collision!", impact);
        }
      }
    });
  }
}
