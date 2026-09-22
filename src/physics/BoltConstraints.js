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
    
    // Because body was created with fromVertices, its initial angle is 0.
    // So its local coordinate space exactly matches world space initially!
    // The offset to the bolt is simply the world distance from its center.
    const localX = boltData.x - body.position.x;
    const localY = boltData.y - body.position.y;

    const constraint = Matter.Constraint.create({
      bodyA: body,
      pointA: { x: localX, y: localY },
      pointB: { x: boltData.x, y: boltData.y },
      stiffness: 0.9,     // Soften slightly so heavy planks sag realistically
      length: 0,
      render: { visible: false }
    });

    constraints.push(constraint);
  });

  return constraints;
}
