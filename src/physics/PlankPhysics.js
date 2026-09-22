import Matter from 'matter-js';

export function createPlankBody(plankData, boltsData) {
  // Find coordinates of the connected bolts to determine plank geometry
  const connectedBolts = plankData.connections.map(boltId => 
    boltsData.find(b => b.id === boltId)
  ).filter(Boolean);

  if (connectedBolts.length < 2) return null;

  // Assuming linear planks for simplicity in this version
  const b1 = connectedBolts[0];
  const b2 = connectedBolts[connectedBolts.length - 1];

  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const length = Math.hypot(dx, dy);
  
  // Center of the plank
  const cx = (b1.x + b2.x) / 2;
  const cy = (b1.y + b2.y) / 2;
  const angle = Math.atan2(dy, dx);

  const width = 36;
  const padding = 36; // Extension past the bolts

  const totalLength = length + padding;
  const hw = totalLength / 2;
  const hh = width / 2;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Define vertices of the rotated rectangle explicitly
  // This creates a polygon with angle=0 in Matter.js, which prevents
  // a known solver instability with highly elongated constrained bodies.
  const verts = [
    {x: cx + -hw*cos - -hh*sin, y: cy + -hw*sin + -hh*cos},
    {x: cx + hw*cos - -hh*sin, y: cy + hw*sin + -hh*cos},
    {x: cx + hw*cos - hh*sin, y: cy + hw*sin + hh*cos},
    {x: cx + -hw*cos - hh*sin, y: cy + -hw*sin + hh*cos}
  ];

  // Z-index determines collision filtering
  const cat = 1 << Math.floor((plankData.z || 10) / 10);
  
  const body = Matter.Bodies.fromVertices(cx, cy, [verts], {
    density: 0.05,       // Heavier planks
    friction: 0.8,       // More friction against each other
    frictionAir: 0.02,   // Air resistance prevents infinite wild spinning
    restitution: 0.1,    // Low bounce for a solid, heavy thud
    collisionFilter: {
      category: cat,
      mask: cat | 0x0001 // Collide with own layer and static walls (if any)
    }
  });

  // Store metadata
  if (body) {
    body.plugin = {
      id: plankData.id,
      z: plankData.z,
      initialAngle: angle
    };
  }

  return body;
}
