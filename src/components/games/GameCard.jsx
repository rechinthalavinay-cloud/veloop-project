import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useWallet } from "../../context/WalletContext";
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
      <div className={styles.art}>
        <img
          src={game.image}
          alt={`${game.name} artwork`}
          loading="lazy"
          style={{ objectPosition: game.objectPosition }}
        />
        {game.badge ? <span className={styles.badge}>{game.badge}</span> : null}
      </div>
      <div className={styles.action}>
        <TokenCost cost={game.cost} />
        {enough ? (
          <PlayNowButton loading={loading} onClick={openGame} />
        ) : (
          <button className={styles.need} type="button" onClick={() => navigate("/rewards")}>
            Need 20 Tokens
          </button>
        )}
      </div>
    </article>
  );
}
