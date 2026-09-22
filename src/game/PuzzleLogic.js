import Matter from 'matter-js';

export class PuzzleLogic {
  constructor(physicsWorld) {
    this.physicsWorld = physicsWorld;
  }

  // Returns true if the bolt is covered by a plank that makes it inaccessible
  isBoltBlocked(boltId, levelData) {
    const bolt = levelData.bolts.find(b => b.id === boltId);
    if (!bolt) return false;

    const bodies = Object.values(this.physicsWorld.plankBodies);
    
    // Find bodies that overlap the bolt's center
    const overlapping = Matter.Query.point(bodies, { x: bolt.x, y: bolt.y });
    
    for (const body of overlapping) {
      const plankId = body.plugin.id;
      const plank = levelData.planks.find(p => p.id === plankId);
      
      if (plank) {
        // If the plank is connected to this bolt, it does not block it.
        // It is the plank being held by the bolt.
        if (plank.connections.includes(boltId)) {
          continue;
        }

        // If the plank is NOT connected to this bolt, but overlaps it, it blocks the bolt!
        // This forces the player to move the blocking plank first.
        return true;
      }
    }

    return false;
  }

  isHoleBlocked(holeId, levelData) {
    const hole = levelData.holes?.find(h => h.id === holeId);
    if (!hole) return false;

    const bodies = Object.values(this.physicsWorld.plankBodies);
    
    // Find bodies that overlap the hole's center
    const overlapping = Matter.Query.point(bodies, { x: hole.x, y: hole.y });
    
    // If any body overlaps the hole, it is blocked
    return overlapping.length > 0;
  }
}
