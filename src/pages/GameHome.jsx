import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Play, Coins, Info, Sparkles, AlertCircle } from "lucide-react";
import { getGameBySlug } from "../data/gamesData";
import { useWallet } from "../context/WalletContext";
import PlayNowButton from "../components/games/PlayNowButton";
import TokenCost from "../components/games/TokenCost";
import GameNavigation from "../components/games/GameNavigation";
import { coinIcon } from "../assets/icons";
import styles from "./GameHome.module.css";
import { motion } from "framer-motion";

export default function GameHome() {
  const { slug } = useParams();
  const game = getGameBySlug(slug);
  const navigate = useNavigate();
  const { wallet, spendTokens, markGuideSeen } = useWallet();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!game) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ display: 'grid', placeItems: 'center', height: '100vh', textAlign: 'center' }}>
          <h2>Game Not Found</h2>
          <button type="button" onClick={() => navigate("/")} className={styles.playConfirmBtn} style={{maxWidth: '200px'}}>
            <ArrowLeft size={18} /> Back to Hub
          </button>
        </div>
      </div>
    );
  }

  const start = () => {
    setError("");
    if (wallet.tokens < game.cost) {
      setError(`Not Enough Tokens. You need ${game.cost}.`);
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
    }, 600);
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className={styles.pageContainer} data-game={game.slug}>
      {/* Dynamic Background Blur */}
      <div className={styles.pageBackground}>
        <img src={game.image} alt="" className={styles.bgImage} />
        <div className={styles.bgOverlay}></div>
      </div>

      <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ""}`}>
        <button type="button" onClick={() => navigate("/")} className={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>Hub</span>
        </button>
        <div className={styles.walletPill}>
          <img src={coinIcon} alt="" width={20} height={20} />
          <div className={styles.walletDetails}>
            <span className={styles.walletAmount}>{wallet.gameCoins}</span>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          
          {/* Left Column: Hero Art */}
          <motion.div className={styles.heroColumn} initial="hidden" animate="visible" variants={fadeUp}>
            <div className={styles.heroCardWrapper}>
              <img className={styles.heroArt} src={game.image} alt={game.name} />
            </div>
          </motion.div>

          {/* Right Column: Details & Actions */}
          <motion.div className={styles.infoColumn} initial="hidden" animate="visible" variants={fadeUp}>
            <div className={styles.badgeWrapper}>
              <span className={styles.categoryBadge}>
                <Sparkles size={14} /> {game.category}
              </span>
            </div>
            
            <h1 className={styles.title}>{game.name}</h1>
            <p className={styles.tagline}>{game.tagline}</p>
            <p className={styles.description}>{game.description}</p>
            
            <div className={styles.actionCard}>
              <div className={styles.costRow}>
                <span className={styles.costLabel}>Entry Fee</span>
                <TokenCost cost={game.cost} />
              </div>
              
              <PlayNowButton loading={loading} onClick={start} />
              
              {error && (
                <div className={styles.errorAlert} role="alert">
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                  {wallet.tokens < game.cost && (
                    <button type="button" className={styles.earnMoreBtn} onClick={() => navigate("/rewards")}>
                      Get Tokens
                    </button>
                  )}
                </div>
              )}
            </div>

            <section className={styles.infoSection}>
              <div className={styles.infoBlock}>
                <div className={styles.infoHeader}>
                  <Info size={18} />
                  <h3>How to Play</h3>
                </div>
                <ul className={styles.stepsList}>
                  {game.guide.map((step, index) => (
                    <li key={index}>
                      <span className={styles.stepNum}>{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.infoBlock}>
                <div className={styles.infoHeader}>
                  <Coins size={18} />
                  <h3>Rewards</h3>
                </div>
                <p className={styles.rewardText}>
                  {game.rewardHint} are added to your centralized Game Coin balance after you finish.
                </p>
              </div>
            </section>
          </motion.div>
        </div>
      </main>

      {/* First Time Guide Modal */}
      {showGuide && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <Sparkles className={styles.modalIcon} />
              <h2>Ready to Play?</h2>
            </div>
            <div className={styles.modalSteps}>
              {game.guide.map((step, index) => (
                <div key={index} className={styles.modalStep}>
                  <div className={styles.stepNum} style={{background: 'rgba(255,255,255,0.1)'}}>{index + 1}</div>
                  <p>{step}</p>
                </div>
              ))}
            </div>
            <button 
              type="button" 
              className={styles.playConfirmBtn}
              onClick={() => navigate(`/games/${game.slug}/play`)}
            >
              <Play size={18} fill="currentColor" /> Let's Go
            </button>
          </div>
        </div>
      )}

      <GameNavigation gameSlug={game.slug} />
    </div>
  );
}
