export class GameManager {
  constructor(onStateChange) {
    this.onStateChange = onStateChange;
    this.state = {
      phase: 'playing', // 'playing', 'paused', 'level_complete', 'game_over'
      score: 0,
      energy: 0,
      lives: 3,
      levelIdx: 0,
      timeLeft: 0,
      activeBolts: [], // Bolts currently holding the structure
      planksRemaining: 0,
      selectedBoltId: null, // Currently selected bolt
      movedBolts: {} // Map of holeId -> boltId for bolts moved to empty holes
    };
  }

  initLevel(levelData) {
    // Dynamically create holes for original bolt positions if not already present
    levelData.bolts.forEach(b => {
      const holeId = `hole_bolt_${b.id}`;
      if (!levelData.holes.find(h => h.id === holeId)) {
        levelData.holes.push({ id: holeId, x: b.x, y: b.y });
      }
    });

    this.state = {
      ...this.state,
      phase: 'playing',
      timeLeft: levelData.timeLimit,
      activeBolts: [...levelData.bolts.map(b => b.id)],
      planksRemaining: levelData.planks.length,
      selectedBoltId: null,
      movedBolts: {}
    };
    this.notify();
  }

  handleBoltClick(boltId, isBlocked) {
    if (this.state.phase !== 'playing') return false;

    if (isBlocked) {
      // Shaking logic could go here
      return { success: false, reason: 'blocked' };
    }

    if (!this.state.activeBolts.includes(boltId)) {
      return { success: false, reason: 'already_moved' };
    }

    // Toggle selection
    if (this.state.selectedBoltId === boltId) {
      this.state.selectedBoltId = null;
    } else {
      this.state.selectedBoltId = boltId;
    }
    
    this.notify();
    return { success: true, action: 'selected' };
  }

  handleHoleClick(holeId, isBlocked) {
    if (this.state.phase !== 'playing') return { success: false };
    if (!this.state.selectedBoltId) return { success: false, reason: 'no_bolt_selected' };

    if (isBlocked) {
      this.state.lives = Math.max(0, this.state.lives - 1);
      if (this.state.lives === 0) {
        this.state.phase = 'game_over';
      }
      this.notify();
      return { success: false, reason: 'hole_blocked' };
    }

    if (this.state.movedBolts[holeId]) {
      return { success: false, reason: 'hole_occupied' };
    }

    if (holeId.startsWith('hole_bolt_')) {
      const originalBoltId = holeId.replace('hole_bolt_', '');
      if (this.state.activeBolts.includes(originalBoltId)) {
        return { success: false, reason: 'hole_occupied' };
      }
    }

    const boltId = this.state.selectedBoltId;
    
    // Move bolt
    this.state.activeBolts = this.state.activeBolts.filter(id => id !== boltId);
    this.state.movedBolts[holeId] = boltId;
    this.state.selectedBoltId = null;
    this.state.score += 10;
    this.state.energy += 10;
    
    this.notify();
    return { success: true, action: 'moved', boltId };
  }

  handlePlankFallen() {
    this.state.planksRemaining -= 1;
    this.state.score += 50;
    
    if (this.state.planksRemaining === 0) {
      this.state.phase = 'level_complete';
    }
    this.notify();
  }

  tick() {
    if (this.state.phase === 'playing' && this.state.timeLeft > 0) {
      this.state.timeLeft -= 1;
      
      const currentLevel = window.ncLevels ? window.ncLevels[this.state.levelIdx] : null;
      // We don't easily have access to levels array here without importing it.
      // But we can just use this.state.lives or time for game over.
      if (this.state.timeLeft === 0) {
        this.state.phase = 'game_over';
      }
      this.notify();
    }
  }

  getState() {
    return { ...this.state };
  }

  notify() {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }
}
