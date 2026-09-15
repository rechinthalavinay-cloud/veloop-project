import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useWallet } from "../../context/WalletContext";
import { ArrowRight, Sparkles, Coins } from "lucide-react";
import PlayNowButton from "./PlayNowButton";
import TokenCost from "./TokenCost";
import styles from "./GameCard.module.css";

export default function GameCard({ game }) {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const enough = wallet.tokens >= game.cost;

  const openGame = () => {
    setLoading(true);
    window.setTimeout(() => {
      navigate(`/games/${game.slug}`);
    }, 350);
  };

  return (
    <article className={styles.card}>
      <div className={styles.artBox}>
        <img
          src={game.image}
          alt={game.name}
          loading="lazy"
          className={styles.artImage}
          style={{ objectPosition: game.objectPosition || "center" }}
        />
        <div className={styles.categoryBadge}>
          <Sparkles size={12} /> {game.category || "Arcade"}
        </div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.info}>
          <h3 className={styles.title}>{game.name}</h3>
          <p className={styles.tagline}>{game.tagline || game.description}</p>
        </div>
        
        <div className={styles.rewardRow}>
          <div className={styles.rewardBox}>
            <span className={styles.rewardLabel}>Reward</span>
            <div className={styles.rewardValue}>
              <Coins size={14} className={styles.coinIcon} /> {game.rewardHint || "Game Coins"}
            </div>
          </div>
          <div className={styles.costBox}>
            <span className={styles.rewardLabel}>Entry</span>
            <TokenCost cost={game.cost} />
          </div>
        </div>

        <div className={styles.actionArea}>
          {enough ? (
            <PlayNowButton loading={loading} onClick={openGame} />
          ) : (
            <button className={styles.needTokensBtn} type="button" onClick={() => navigate("/rewards")}>
              Need {game.cost} Tokens
            </button>
          )}
        </div>
      </div>
      <div className={styles.hoverGlow}></div>
    </article>
  );
}
