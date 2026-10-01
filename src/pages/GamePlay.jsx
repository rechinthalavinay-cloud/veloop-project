import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGameBySlug } from "../data/gamesData";
import { useWallet } from "../context/WalletContext";
import { GAME_COMPONENTS, rewardFor } from "../games/registry";
import { coinIcon } from "../assets/icons";
import styles from "./GamePlay.module.css";

export default function GamePlay() {
  const { slug } = useParams();
  const game = getGameBySlug(slug);
  const Game = GAME_COMPONENTS[slug];
  const navigate = useNavigate();
  const { addGameCoins, spendTokens } = useWallet();
  
  const [phase, setPhase] = useState("loading");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [reward, setReward] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [outcomeType, setOutcomeType] = useState("over"); // "over" or "complete"

  const awarded = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase("playing"), 700);
    return () => window.clearTimeout(timer);
  }, [restartKey]);

  useEffect(() => {
    // Load best score on mount
    const saved = localStorage.getItem(`veloop-best-${slug}`);
    if (saved) {
      setBestScore(parseInt(saved, 10));
    }
  }, [slug]);

  const finish = useCallback(
    (finalScore, type) => {
      if (awarded.current) return;
      awarded.current = true;
      
      const coins = rewardFor(slug, finalScore);
      setReward(coins);
      addGameCoins(coins);
      
      // Best Score Logic
      const saved = parseInt(localStorage.getItem(`veloop-best-${slug}`) || "0", 10);
      if (finalScore > saved) {
        localStorage.setItem(`veloop-best-${slug}`, finalScore);
        setBestScore(finalScore);
        setIsNewBest(true);
      } else {
        setBestScore(saved);
        setIsNewBest(false);
      }

      setOutcomeType(type);
      setPhase("over");
    },
    [addGameCoins, slug],
  );

  const onOutcome = useCallback(
    ({ type, score: nextScore }) => {
      setScore(nextScore);
      if (type === "complete" || type === "over") {
        finish(nextScore, type);
      }
    },
    [finish],
  );

  const handlePlayAgain = () => {
    if (spendTokens(game.cost)) {
      awarded.current = false;
      setScore(0);
      setIsNewBest(false);
      setReward(0);
      setPhase("loading");
      setRestartKey(k => k + 1);
    } else {
      alert("Not enough tokens to play again!");
      navigate("/rewards");
    }
  };

  if (!game || !Game) {
    return (
      <div className={styles.screen}>
        <div className={styles.modal}>
          <div className={styles.sheet}>
            <p>Something went wrong. We couldn't start the game.</p>
            <button type="button" onClick={() => navigate("/")}>
              Back to Games
            </button>
            <button type="button" className={styles.ghost} onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      {phase === "loading" ? (
        <div className={styles.loader}>
          <img src={coinIcon} alt="" width={48} height={48} />
          <strong>Loading Game...</strong>
          <p>Preparing your challenge...</p>
        </div>
      ) : null}

      {phase === "playing" || phase === "over" ? (
        <div className={phase === "over" ? styles.dim : undefined} style={{height: '100%'}}>
          <Game key={restartKey} onOutcome={onOutcome} />
        </div>
      ) : null}

      {phase === "over" ? (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.sheet}>
            <p className={styles.outcomeLabel}>{outcomeType === "complete" ? "LEVEL COMPLETE" : "GAME OVER"}</p>
            <h2 className={styles.scoreTitle}>Score {score}</h2>
            
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span>BEST SCORE</span>
                <strong className={isNewBest ? styles.highlight : ""}>
                  {bestScore} {isNewBest && "★"}
                </strong>
              </div>
              <div className={styles.statBox}>
                <span>REWARD</span>
                <strong className={styles.rewardText}>+{reward} Coins</strong>
              </div>
            </div>

            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handlePlayAgain}
            >
              Play Again (-{game.cost} T)
            </button>
            <button type="button" className={styles.ghost} onClick={() => navigate(`/games/${slug}`)}>
              Back to Game Info
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
