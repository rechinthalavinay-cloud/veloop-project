import Matter from 'matter-js';

export function createBoltConstraints(boltData, connectedPlanks, plankBodies) {
  const constraints = [];

  // A bolt acts as a pivot connecting a plank to the background
  connectedPlanks.forEach(plank => {
    const body = plankBodies[plank.id];
    if (!body) return;

    // Find the local offset of this bolt relative to the plank's center
    // We can do this by rotating the world offset backward by the body's angle
    const worldOffsetX = boltData.x - body.position.x;
    const worldOffsetY = boltData.y - body.position.y;
    
    // Rotate vector back by -body.angle
    const cos = Math.cos(-body.angle);
    const sin = Math.sin(-body.angle);
    const localX = worldOffsetX * cos - worldOffsetY * sin;
    const localY = worldOffsetX * sin + worldOffsetY * cos;

    const constraint = Matter.Constraint.create({
      bodyA: body,
      pointA: { x: localX, y: localY },
      pointB: { x: boltData.x, y: boltData.y },
      stiffness: 1,
      length: 0,
      render: { visible: false }
    });

    constraints.push(constraint);
  });

  return constraints;
}
