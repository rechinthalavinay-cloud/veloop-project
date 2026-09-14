import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getGameBySlug } from "../data/gamesData";
import { useWallet } from "../context/WalletContext";
import PlayNowButton from "../components/games/PlayNowButton";
import TokenCost from "../components/games/TokenCost";
import GameNavigation from "../components/games/GameNavigation";
import { coinIcon } from "../assets/icons";
import styles from "./GameHome.module.css";

export default function GameHome() {
  const { slug } = useParams();
  const game = getGameBySlug(slug);
  const navigate = useNavigate();
  const { wallet, spendTokens, markGuideSeen } = useWallet();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  if (!game) {
    return (
      <div className={styles.light}>
        <p>We couldn't find that game.</p>
        <button type="button" onClick={() => navigate("/")}>
          Back to Games
        </button>
      </div>
    );
  }

  const start = () => {
    setError("");
    if (wallet.tokens < game.cost) {
      setError(`Not Enough Tokens. You need ${game.cost}. Your Balance: ${wallet.tokens}.`);
      return;
    }
    setLoading(true);
    const paid = spendTokens(game.cost);
    if (!paid) {
      setLoading(false);
      setError("Not Enough Tokens.");
      return;
    }
    const firstTime = !wallet.seenGuides[game.slug];
    window.setTimeout(() => {
      if (firstTime) {
        markGuideSeen(game.slug);
        setShowGuide(true);
        setLoading(false);
        return;
      }
      navigate(`/games/${game.slug}/play`);
    }, 400);
  };

  return (
    <div className={styles.light} data-game={game.slug}>
      <header className={styles.top}>
        <button type="button" onClick={() => navigate("/")} className={styles.back}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className={styles.coins}>
          <img src={coinIcon} alt="" width={22} height={22} />
          <strong>{wallet.gameCoins}</strong>
          <span>Game Coins</span>
        </div>
      </header>

      <main className={styles.main}>
        <img className={styles.heroArt} src={game.image} alt="" />
        <p className={styles.category}>{game.category}</p>
        <h1>{game.name}</h1>
        <p className={styles.tagline}>{game.tagline}</p>
        <p>{game.description}</p>
        <div className={styles.entry}>
          <span>Entry Fee</span>
          <TokenCost cost={game.cost} />
        </div>
        <PlayNowButton loading={loading} onClick={start} />
        {error ? (
          <div className={styles.error} role="alert">
            <p>{error}</p>
            {wallet.tokens < game.cost ? (
              <button type="button" onClick={() => navigate("/rewards")}>
                Earn More Tokens
              </button>
            ) : null}
          </div>
        ) : null}

        <section className={styles.guide}>
          <h2>How to Play</h2>
          <ol>
            {game.guide.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <h2>Rewards</h2>
          <p>{game.rewardHint} are added to your centralized Game Coin balance after you finish.</p>
        </section>
      </main>

      {showGuide ? (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.sheet}>
            <h2>How to Play</h2>
            <img src={game.image} alt="" />
            <ol>
              {game.guide.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button type="button" onClick={() => navigate(`/games/${game.slug}/play`)}>
              Got it
            </button>
          </div>
        </div>
      ) : null}

      <GameNavigation gameSlug={game.slug} />
    </div>
  );
}
