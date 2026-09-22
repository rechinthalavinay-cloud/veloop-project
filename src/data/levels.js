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
    planks: [
      // Top horizontal, covers the vertical one slightly if z-indexed higher
      { id: 'p1', type: 'bar', connections: ['b1', 'b2'], z: 30 },
      // Vertical middle
      { id: 'p2', type: 'bar', connections: ['b3', 'b4'], z: 20 },
      // Bottom horizontal
      { id: 'p3', type: 'bar', connections: ['b5', 'b6'], z: 10 }
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
    planks: [
      { id: 'p1', type: 'bar', connections: ['b1', 'b2'], z: 40 }, // Top horizontal blocks diagonals?
      { id: 'p2', type: 'bar', connections: ['b3', 'b4'], z: 20 }, // Diagonal 1
      { id: 'p3', type: 'bar', connections: ['b5', 'b6'], z: 30 }, // Diagonal 2
      { id: 'p4', type: 'bar', connections: ['b7', 'b8'], z: 10 }  // Bottom horizontal
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
    planks: [
      { id: 'p1', type: 'bar', connections: ['b1', 'b2'], z: 10 },
      { id: 'p2', type: 'bar', connections: ['b3', 'b4'], z: 20 },
      { id: 'p3', type: 'bar', connections: ['b5', 'b6'], z: 30 },
      { id: 'p4', type: 'bar', connections: ['b7', 'b8'], z: 40 }
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
    planks: [
      { id: 'p1', type: 'bar', connections: ['b1', 'b2'], z: 10 },
      { id: 'p2', type: 'bar', connections: ['b3', 'b4'], z: 20 },
      { id: 'p3', type: 'bar', connections: ['b5', 'b6'], z: 30 },
      { id: 'p4', type: 'bar', connections: ['b7', 'b8'], z: 40 },
      { id: 'p5', type: 'bar', connections: ['b8', 'b9'], z: 50 },
      { id: 'p6', type: 'bar', connections: ['b9', 'b10'], z: 60 }
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
    planks: [
      { id: 'p1', type: 'bar', connections: ['b2', 'b3'], z: 10 },
      { id: 'p2', type: 'bar', connections: ['b4', 'b5'], z: 20 },
      { id: 'p3', type: 'bar', connections: ['b6', 'b1'], z: 30 },
      { id: 'p4', type: 'bar', connections: ['b7', 'b1'], z: 30 },
      { id: 'p5', type: 'bar', connections: ['b8', 'b1'], z: 40 },
      { id: 'p6', type: 'bar', connections: ['b9', 'b1'], z: 40 }
    ]
  }
];
