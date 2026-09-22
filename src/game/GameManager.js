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
      planksRemaining: 0
    };
  }

  initLevel(levelData) {
    this.state = {
      ...this.state,
      phase: 'playing',
      timeLeft: levelData.timeLimit,
      activeBolts: [...levelData.bolts.map(b => b.id)],
      planksRemaining: levelData.planks.length
    };
    this.notify();
  }

  handleBoltClick(boltId, isBlocked) {
    if (this.state.phase !== 'playing') return false;

    if (isBlocked) {
      this.state.lives = Math.max(0, this.state.lives - 1);
      if (this.state.lives === 0) {
        this.state.phase = 'game_over';
      }
      this.notify();
      return { success: false, reason: 'blocked' };
    }

    if (!this.state.activeBolts.includes(boltId)) {
      return { success: false, reason: 'already_removed' };
    }

    // Success
    this.state.activeBolts = this.state.activeBolts.filter(id => id !== boltId);
    this.state.score += 10;
    this.state.energy += 10;
    this.notify();
    
    return { success: true };
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
