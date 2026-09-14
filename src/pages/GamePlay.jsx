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
  const { addGameCoins } = useWallet();
  const [phase, setPhase] = useState("loading");
  const [score, setScore] = useState(0);
  const [reward, setReward] = useState(0);
  const [reviveSignal, setReviveSignal] = useState(0);
  const [usedRevive, setUsedRevive] = useState(false);
  const awarded = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase("playing"), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const finish = useCallback(
    (finalScore) => {
      if (awarded.current) return;
      awarded.current = true;
      const coins = rewardFor(slug, finalScore);
      setReward(coins);
      addGameCoins(coins);
      setPhase("reward");
      window.setTimeout(() => navigate(`/games/${slug}`), 1600);
    },
    [addGameCoins, navigate, slug],
  );

  const onOutcome = useCallback(
    ({ type, score: nextScore }) => {
      setScore(nextScore);
      if (type === "complete") {
        finish(nextScore);
        return;
      }
      setPhase("over");
    },
    [finish],
  );

  if (!game || !Game) {
    return (
      <div className={styles.screen}>
        <p>Something went wrong. We couldn't start the game.</p>
        <button type="button" onClick={() => navigate("/")}>
          Back to Games
        </button>
        <button type="button" onClick={() => window.location.reload()}>
          Try Again
        </button>
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
        <div className={phase === "over" ? styles.dim : undefined}>
          <Game onOutcome={onOutcome} reviveSignal={reviveSignal} />
        </div>
      ) : null}

      {phase === "over" ? (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.sheet}>
            <p>GAME OVER</p>
            <h2>Score {score}</h2>
            <p>Continue playing?</p>
            <button
              type="button"
              disabled={usedRevive}
              onClick={() => {
                setUsedRevive(true);
                setReviveSignal((value) => value + 1);
                setPhase("playing");
              }}
            >
              Revive
            </button>
            <button type="button" className={styles.ghost} onClick={() => finish(score)}>
              No Thanks
            </button>
          </div>
        </div>
      ) : null}

      {phase === "reward" ? (
        <div className={styles.modal}>
          <div className={styles.sheet}>
            <img src={coinIcon} alt="" width={56} height={56} />
            <h2>+{reward} Game Coins</h2>
            <p>Balance updated. Returning home...</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
