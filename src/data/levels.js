export const levels = [
  {
    id: 1,
    timeLimit: 45,
    // Simple 3-plank structure
    // Plank 1 (horizontal top) blocking Plank 2 (vertical)
    bolts: [
      { id: 'b1', x: 120, y: 100 }, { id: 'b2', x: 280, y: 100 },
      { id: 'b3', x: 200, y: 140 }, { id: 'b4', x: 200, y: 300 },
      { id: 'b5', x: 120, y: 240 }, { id: 'b6', x: 280, y: 240 }
    ],
    holes: [
      { id: 'h1', x: 60, y: 60 }, { id: 'h2', x: 340, y: 60 },
      { id: 'h3', x: 60, y: 340 }, { id: 'h4', x: 340, y: 340 }
    ],
    planks: [
      // Top horizontal, covers the vertical one slightly if z-indexed higher
      { id: 'p1', type: 'bar', connections: ['b1', 'b2'], z: 30, material: 'steel' },
      // Vertical middle
      { id: 'p2', type: 'bar', connections: ['b3', 'b4'], z: 20, material: 'copper' },
      // Bottom horizontal
      { id: 'p3', type: 'bar', connections: ['b5', 'b6'], z: 10, material: 'acrylic-blue' }
    ]
  },
  {
    id: 2,
    timeLimit: 60,
    // Classic board structure: Top horizontal, two diagonals forming an 'X' or '\ /', lower horizontal
    bolts: [
      { id: 'b1', x: 100, y: 80 }, { id: 'b2', x: 300, y: 80 }, // Top horizontal
      { id: 'b3', x: 100, y: 160 }, { id: 'b4', x: 300, y: 320 }, // Diagonal 1
      { id: 'b5', x: 300, y: 160 }, { id: 'b6', x: 100, y: 320 }, // Diagonal 2
      { id: 'b7', x: 100, y: 400 }, { id: 'b8', x: 300, y: 400 }, // Bottom horizontal
      // Extra bolts to make it tricky
      { id: 'b9', x: 200, y: 240 }
    ],
    holes: [
      { id: 'h1', x: 50, y: 50 }, { id: 'h2', x: 200, y: 50 }, { id: 'h3', x: 350, y: 50 },
      { id: 'h4', x: 50, y: 240 }, { id: 'h5', x: 350, y: 240 },
      { id: 'h6', x: 50, y: 430 }, { id: 'h7', x: 200, y: 430 }, { id: 'h8', x: 350, y: 430 }
    ],
    planks: [
      { id: 'p1', type: 'bar', connections: ['b1', 'b2'], z: 40, material: 'acrylic-red' }, // Top horizontal blocks diagonals?
      { id: 'p2', type: 'bar', connections: ['b3', 'b4'], z: 20, material: 'steel' }, // Diagonal 1
      { id: 'p3', type: 'bar', connections: ['b5', 'b6'], z: 30, material: 'copper' }, // Diagonal 2
      { id: 'p4', type: 'bar', connections: ['b7', 'b8'], z: 10, material: 'acrylic-blue' }  // Bottom horizontal
    ]
  },
  {
    id: 3,
    timeLimit: 75,
    // Crossing structures
    bolts: [
      { id: 'b1', x: 80, y: 80 }, { id: 'b2', x: 320, y: 320 },
      { id: 'b3', x: 320, y: 80 }, { id: 'b4', x: 80, y: 320 },
      { id: 'b5', x: 200, y: 100 }, { id: 'b6', x: 200, y: 300 },
      { id: 'b7', x: 100, y: 200 }, { id: 'b8', x: 300, y: 200 }
    ],
    holes: [
      { id: 'h1', x: 200, y: 40 },  // Top
      { id: 'h2', x: 40, y: 200 },  // Left
      { id: 'h3', x: 360, y: 200 }, // Right
      { id: 'h4', x: 200, y: 360 }, // Bottom
      { id: 'h5', x: 60, y: 60 },   // Top-Left corner
      { id: 'h6', x: 340, y: 60 },  // Top-Right corner
      { id: 'h7', x: 60, y: 340 },  // Bottom-Left corner
      { id: 'h8', x: 340, y: 340 }  // Bottom-Right corner
    ],
    planks: [
      { id: 'p1', type: 'bar', connections: ['b1', 'b2'], z: 10, material: 'steel' },
      { id: 'p2', type: 'bar', connections: ['b3', 'b4'], z: 20, material: 'acrylic-purple' },
      { id: 'p3', type: 'bar', connections: ['b5', 'b6'], z: 30, material: 'copper' },
      { id: 'p4', type: 'bar', connections: ['b7', 'b8'], z: 40, material: 'wood' }
    ]
  },
  {
    id: 4,
    timeLimit: 90,
    // 9 planks chain reaction
    bolts: [
      { id: 'b1', x: 100, y: 100 }, { id: 'b2', x: 300, y: 100 },
      { id: 'b3', x: 100, y: 200 }, { id: 'b4', x: 300, y: 200 },
      { id: 'b5', x: 100, y: 300 }, { id: 'b6', x: 300, y: 300 },
      { id: 'b7', x: 200, y: 50 },  { id: 'b8', x: 200, y: 150 },
      { id: 'b9', x: 200, y: 250 }, { id: 'b10', x: 200, y: 350 }
    ],
    holes: [
      { id: 'h1', x: 50, y: 50 }, { id: 'h2', x: 350, y: 50 },
      { id: 'h3', x: 50, y: 150 }, { id: 'h4', x: 350, y: 150 },
      { id: 'h5', x: 50, y: 250 }, { id: 'h6', x: 350, y: 250 },
      { id: 'h7', x: 50, y: 350 }, { id: 'h8', x: 350, y: 350 }
    ],
    planks: [
      { id: 'p1', type: 'bar', connections: ['b1', 'b2'], z: 10, material: 'copper' },
      { id: 'p2', type: 'bar', connections: ['b3', 'b4'], z: 20, material: 'copper' },
      { id: 'p3', type: 'bar', connections: ['b5', 'b6'], z: 30, material: 'steel' },
      { id: 'p4', type: 'bar', connections: ['b7', 'b8'], z: 40, material: 'steel' },
      { id: 'p5', type: 'bar', connections: ['b8', 'b9'], z: 50, material: 'acrylic-red' },
      { id: 'p6', type: 'bar', connections: ['b9', 'b10'], z: 60, material: 'acrylic-purple' }
    ]
  },
  {
    id: 5,
    timeLimit: 120,
    // Complex
    bolts: [
      { id: 'b1', x: 200, y: 200 }, { id: 'b2', x: 200, y: 100 },
      { id: 'b3', x: 200, y: 300 }, { id: 'b4', x: 100, y: 200 },
      { id: 'b5', x: 300, y: 200 }, { id: 'b6', x: 100, y: 100 },
      { id: 'b7', x: 300, y: 100 }, { id: 'b8', x: 100, y: 300 },
      { id: 'b9', x: 300, y: 300 }
    ],
    holes: [
      { id: 'h1', x: 50, y: 50 }, { id: 'h2', x: 200, y: 50 }, { id: 'h3', x: 350, y: 50 },
      { id: 'h4', x: 50, y: 200 }, { id: 'h5', x: 350, y: 200 },
      { id: 'h6', x: 50, y: 350 }, { id: 'h7', x: 200, y: 350 }, { id: 'h8', x: 350, y: 350 }
    ],
    planks: [
      { id: 'p1', type: 'bar', connections: ['b2', 'b3'], z: 10, material: 'acrylic-blue' },
      { id: 'p2', type: 'bar', connections: ['b4', 'b5'], z: 20, material: 'acrylic-purple' },
      { id: 'p3', type: 'bar', connections: ['b6', 'b1'], z: 30, material: 'steel' },
      { id: 'p4', type: 'bar', connections: ['b7', 'b1'], z: 30, material: 'steel' },
      { id: 'p5', type: 'bar', connections: ['b8', 'b1'], z: 40, material: 'wood' },
      { id: 'p6', type: 'bar', connections: ['b9', 'b1'], z: 40, material: 'wood' }
    ]
  },
  {
    id: 6,
    timeLimit: 120,
    // The Web: A tight weave of intersecting planks
    bolts: [
      { id: 'b1', x: 100, y: 100 }, { id: 'b2', x: 300, y: 100 },
      { id: 'b3', x: 100, y: 300 }, { id: 'b4', x: 300, y: 300 },
      { id: 'b5', x: 200, y: 50 },  { id: 'b6', x: 200, y: 350 },
      { id: 'b7', x: 50, y: 200 },  { id: 'b8', x: 350, y: 200 }
    ],
    holes: [
      { id: 'h1', x: 50, y: 50 }, { id: 'h2', x: 350, y: 50 },
      { id: 'h3', x: 50, y: 350 }, { id: 'h4', x: 350, y: 350 }
    ],
    planks: [
      { id: 'p1', type: 'bar', connections: ['b1', 'b4'], z: 10, material: 'steel' },
      { id: 'p2', type: 'bar', connections: ['b2', 'b3'], z: 20, material: 'copper' },
      { id: 'p3', type: 'bar', connections: ['b5', 'b6'], z: 30, material: 'acrylic-purple' },
      { id: 'p4', type: 'bar', connections: ['b7', 'b8'], z: 40, material: 'acrylic-blue' }
    ]
  },
  {
    id: 7,
    timeLimit: 150,
    // The Pendulum Trap: Long swings and tight blocks
    bolts: [
      { id: 'b1', x: 200, y: 50 }, { id: 'b2', x: 200, y: 350 }, // Massive vertical
      { id: 'b3', x: 150, y: 200 }, { id: 'b4', x: 250, y: 200 }, // Central block
      { id: 'b5', x: 100, y: 150 }, { id: 'b6', x: 300, y: 150 }, // Upper supports
      { id: 'b7', x: 100, y: 250 }, { id: 'b8', x: 300, y: 250 }  // Lower supports
    ],
    holes: [
      { id: 'h1', x: 50, y: 100 }, { id: 'h2', x: 350, y: 100 },
      { id: 'h3', x: 50, y: 300 }, { id: 'h4', x: 350, y: 300 }
    ],
    planks: [
      { id: 'p1', type: 'bar', connections: ['b1', 'b2'], z: 10, material: 'steel' }, // Pendulum
      { id: 'p2', type: 'bar', connections: ['b3', 'b4'], z: 20, material: 'wood' },
      { id: 'p3', type: 'bar', connections: ['b5', 'b7'], z: 30, material: 'copper' },
      { id: 'p4', type: 'bar', connections: ['b6', 'b8'], z: 40, material: 'acrylic-red' }
    ]
  },
  {
    id: 8,
    timeLimit: 180,
    // Starburst: Dense center cluster
    bolts: [
      { id: 'b1', x: 200, y: 200 }, // The dreaded center bolt
      { id: 'b2', x: 100, y: 100 }, { id: 'b3', x: 300, y: 100 },
      { id: 'b4', x: 100, y: 300 }, { id: 'b5', x: 300, y: 300 },
      { id: 'b6', x: 200, y: 80 },  { id: 'b7', x: 200, y: 320 },
      { id: 'b8', x: 80, y: 200 },  { id: 'b9', x: 320, y: 200 }
    ],
    holes: [
      { id: 'h1', x: 50, y: 50 }, { id: 'h2', x: 350, y: 50 },
      { id: 'h3', x: 50, y: 350 }, { id: 'h4', x: 350, y: 350 }
    ],
    planks: [
      { id: 'p1', type: 'bar', connections: ['b2', 'b1'], z: 10, material: 'acrylic-blue' },
      { id: 'p2', type: 'bar', connections: ['b3', 'b1'], z: 20, material: 'copper' },
      { id: 'p3', type: 'bar', connections: ['b4', 'b1'], z: 30, material: 'steel' },
      { id: 'p4', type: 'bar', connections: ['b5', 'b1'], z: 40, material: 'acrylic-red' },
      { id: 'p5', type: 'bar', connections: ['b6', 'b1'], z: 50, material: 'wood' },
      { id: 'p6', type: 'bar', connections: ['b7', 'b1'], z: 60, material: 'acrylic-purple' },
      { id: 'p7', type: 'bar', connections: ['b8', 'b1'], z: 70, material: 'steel' },
      { id: 'p8', type: 'bar', connections: ['b9', 'b1'], z: 80, material: 'copper' }
    ]
  },
  {
    id: 9,
    timeLimit: 200,
    // The Cage: A square frame blocking an inner X
    bolts: [
      { id: 'b1', x: 100, y: 100 }, { id: 'b2', x: 300, y: 100 },
      { id: 'b3', x: 100, y: 300 }, { id: 'b4', x: 300, y: 300 },
      { id: 'b5', x: 150, y: 150 }, { id: 'b6', x: 250, y: 150 },
      { id: 'b7', x: 150, y: 250 }, { id: 'b8', x: 250, y: 250 }
    ],
    holes: [
      { id: 'h1', x: 50, y: 200 }, { id: 'h2', x: 350, y: 200 },
      { id: 'h3', x: 200, y: 50 }, { id: 'h4', x: 200, y: 350 }
    ],
    planks: [
      { id: 'p1', type: 'bar', connections: ['b5', 'b8'], z: 10, material: 'wood' },
      { id: 'p2', type: 'bar', connections: ['b6', 'b7'], z: 20, material: 'copper' },
      { id: 'p3', type: 'bar', connections: ['b1', 'b2'], z: 30, material: 'steel' }, // Top cage
      { id: 'p4', type: 'bar', connections: ['b2', 'b4'], z: 40, material: 'steel' }, // Right cage
      { id: 'p5', type: 'bar', connections: ['b4', 'b3'], z: 50, material: 'steel' }, // Bottom cage
      { id: 'p6', type: 'bar', connections: ['b3', 'b1'], z: 60, material: 'steel' }  // Left cage
    ]
  },
  {
    id: 10,
    timeLimit: 240,
    // Master Engineer: High density overlapping structure
    bolts: [
      { id: 'b1', x: 100, y: 100 }, { id: 'b2', x: 200, y: 100 }, { id: 'b3', x: 300, y: 100 },
      { id: 'b4', x: 100, y: 200 }, { id: 'b5', x: 200, y: 200 }, { id: 'b6', x: 300, y: 200 },
      { id: 'b7', x: 100, y: 300 }, { id: 'b8', x: 200, y: 300 }, { id: 'b9', x: 300, y: 300 }
    ],
    holes: [
      { id: 'h1', x: 50, y: 50 }, { id: 'h2', x: 350, y: 50 },
      { id: 'h3', x: 50, y: 350 }
      // Extremely limited holes
    ],
    planks: [
      { id: 'p1', type: 'bar', connections: ['b1', 'b3'], z: 10, material: 'acrylic-blue' },
      { id: 'p2', type: 'bar', connections: ['b4', 'b6'], z: 20, material: 'steel' },
      { id: 'p3', type: 'bar', connections: ['b7', 'b9'], z: 30, material: 'copper' },
      { id: 'p4', type: 'bar', connections: ['b1', 'b7'], z: 40, material: 'wood' },
      { id: 'p5', type: 'bar', connections: ['b2', 'b8'], z: 50, material: 'acrylic-red' },
      { id: 'p6', type: 'bar', connections: ['b3', 'b9'], z: 60, material: 'acrylic-purple' },
      { id: 'p7', type: 'bar', connections: ['b1', 'b5'], z: 70, material: 'steel' },
      { id: 'p8', type: 'bar', connections: ['b3', 'b5'], z: 80, material: 'copper' },
      { id: 'p9', type: 'bar', connections: ['b7', 'b5'], z: 90, material: 'wood' },
      { id: 'p10', type: 'bar', connections: ['b9', 'b5'], z: 100, material: 'acrylic-blue' }
    ]
  }
];
