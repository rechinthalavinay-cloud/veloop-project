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

  // Create a rectangle body
  // Z-index determines collision filtering
  const cat = 1 << Math.floor((plankData.z || 10) / 10);
  
  const body = Matter.Bodies.rectangle(cx, cy, totalLength, width, {
    chamfer: { radius: width / 2 }, // Rounded ends
    density: 0.005,
    friction: 0.1,
    restitution: 0.4,
    collisionFilter: {
      category: cat,
      mask: cat | 0x0001 // Collide with own layer and static walls (if any)
    }
  });

  // Set the initial angle
  Matter.Body.setAngle(body, angle);

  // Store metadata
  body.plugin = {
    id: plankData.id,
    z: plankData.z
  };

  return body;
}
