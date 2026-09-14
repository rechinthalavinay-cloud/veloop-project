import { useCallback, useEffect, useRef, useState } from "react";

export function useGameEngine({ onOutcome }) {
  const [phase, setPhase] = useState("playing"); // playing | paused | over | complete
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [time, setTime] = useState(0);
  const liveRef = useRef(true);
  const pausedRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  const addScore = useCallback((pts) => {
    scoreRef.current += pts;
    setScore(scoreRef.current);
  }, []);

  const loseLife = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    return livesRef.current;
  }, []);

  const endGame = useCallback((type) => {
    if (!liveRef.current) return;
    liveRef.current = false;
    setPhase(type === "complete" ? "complete" : "over");
    onOutcome?.({ type, score: scoreRef.current });
  }, [onOutcome]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setPhase("playing");
  }, []);

  const restart = useCallback(() => {
    liveRef.current = true;
    pausedRef.current = false;
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setLevel(1);
    setTime(0);
    setPhase("playing");
  }, []);

  return {
    phase, score, lives, level, time,
    liveRef, pausedRef, scoreRef, livesRef,
    addScore, loseLife, endGame, pause, resume, restart,
    setLevel, setTime,
    isPlaying: phase === "playing",
    isPaused: phase === "paused",
    isOver: phase === "over",
    isComplete: phase === "complete",
  };
}
