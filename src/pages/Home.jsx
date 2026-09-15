import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import GamesCarousel from "../components/games/GamesCarousel";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { tokenIcon, coinIcon, vesIcon, gemIcon, spinIcon } from "../assets/icons";
import { motion } from "framer-motion";
import { ArrowRight, Gift, ShoppingCart, Landmark } from "lucide-react";
import styles from "./Home.module.css";

export default function Home() {
  const { wallet } = useWallet();

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className={styles.mainWrapper}>
        
        {/* Subtle Gaming Background Effects */}
        <div className={styles.ambientBackground}>
          <div className={styles.glowTop}></div>
          <div className={styles.glowBottom}></div>
        </div>

        {/* HERO SECTION */}
        <section className={styles.heroSection}>
          <div className="page-wrap">
            <motion.div 
              className={styles.heroContent}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
            >
              <h1 className={styles.heroTitle}>
                Elevate Your <br />
                <span className="text-gradient-purple">Gaming Experience.</span>
              </h1>
              <p className={styles.heroSubtitle}>
                Play premium titles, earn Game Coins, and effortlessly redeem them for real-world value on the ultimate rewards platform.
              </p>
              
              <div className={styles.heroActions}>
                <Link to="/#games" className={styles.primaryBtn}>
                  Explore Games <ArrowRight size={18} />
                </Link>
                <Link to="/rewards" className={styles.secondaryBtn}>
                  View Rewards
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* WALLET / ASSETS DASHBOARD */}
        <section className={styles.dashboardSection}>
          <div className="page-wrap">
            <motion.div 
              className={styles.dashboardGrid}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {/* Primary Assets */}
              <motion.div className={styles.assetCard} variants={fadeUp}>
                <div className={styles.assetHeader}>
                  <h3>Primary Balances</h3>
                  <div className={styles.assetIndicator}></div>
                </div>
                
                <div className={styles.primaryStats}>
                  <div className={styles.statGroup}>
                    <div className={styles.statIconWrap} style={{background: 'rgba(245, 197, 66, 0.1)'}}>
                      <img src={tokenIcon} alt="Tokens" />
                    </div>
                    <div className={styles.statData}>
                      <span className={styles.statLabel}>Tokens</span>
                      <strong className={styles.statValue}>{wallet.tokens}</strong>
                      <span className={styles.statSub}>Entry currency</span>
                    </div>
                  </div>
                  
                  <div className={styles.statDivider}></div>
                  
                  <div className={styles.statGroup}>
                    <div className={styles.statIconWrap} style={{background: 'rgba(139, 92, 246, 0.1)'}}>
                      <img src={coinIcon} alt="Game Coins" />
                    </div>
                    <div className={styles.statData}>
                      <span className={styles.statLabel}>Game Coins</span>
                      <strong className={styles.statValue}>{wallet.gameCoins}</strong>
                      <span className={styles.statSub}>Exchangeable value</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Secondary Assets */}
              <motion.div className={styles.assetCard} variants={fadeUp}>
                <div className={styles.assetHeader}>
                  <h3>Secondary Assets</h3>
                </div>
                
                <div className={styles.secondaryStats}>
                  {[
                    { id: "ve", name: "VEs", value: wallet.ves, icon: vesIcon, sub: "Cash out balance" },
                    { id: "gems", name: "Gems", value: wallet.gems, icon: gemIcon, sub: "Premium items" },
                    { id: "spins", name: "Spins", value: wallet.spins, icon: spinIcon, sub: "Bonus wheels" }
                  ].map((item) => (
                    <div key={item.id} className={styles.miniStat}>
                      <div className={styles.miniStatTop}>
                        <img src={item.icon} alt={item.name} className={styles.miniIcon} />
                        <span className={styles.miniLabel}>{item.name}</span>
                      </div>
                      <strong className={styles.miniValue}>{item.value}</strong>
                      <span className={styles.miniSub}>{item.sub}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* GAMES SHOWCASE */}
        <section id="games" className={styles.gamesSection}>
          <div className="page-wrap">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Featured Games</h2>
              <p className={styles.sectionDesc}>Play premium titles, earn Game Coins, and climb the leaderboard.</p>
            </div>
            
            <div className={styles.carouselWrap}>
              <GamesCarousel />
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS BENTO */}
        <section className={styles.actionsSection}>
          <div className="page-wrap">
            <div className={styles.bentoGrid}>
              
              <Link to="/rewards" className={`${styles.bentoCard} ${styles.bentoRewards}`}>
                <div className={styles.bentoIconBox}>
                  <Gift size={24} />
                </div>
                <div className={styles.bentoContent}>
                  <h3>Reward Sessions</h3>
                  <p>Claim your daily boosts.</p>
                </div>
                <div className={styles.bentoAction}>
                  Open Rewards <ArrowRight size={16} />
                </div>
                <div className={styles.bentoGlow}></div>
              </Link>
              
              <Link to="/redeem" className={`${styles.bentoCard} ${styles.bentoRedeem}`}>
                <div className={styles.bentoIconBox}>
                  <ShoppingCart size={24} />
                </div>
                <div className={styles.bentoContent}>
                  <h3>Redeem Center</h3>
                  <p>Exchange Game Coins instantly.</p>
                </div>
                <div className={styles.bentoAction}>
                  Browse Rewards <ArrowRight size={16} />
                </div>
                <div className={styles.bentoGlow}></div>
              </Link>
              
              <Link to="/withdraw" className={`${styles.bentoCard} ${styles.bentoWithdraw}`}>
                <div className={styles.bentoIconBox}>
                  <Landmark size={24} />
                </div>
                <div className={styles.bentoContent}>
                  <h3>Withdraw VEs</h3>
                  <p>Cash out to bank or UPI.</p>
                </div>
                <div className={styles.bentoAction}>
                  Withdraw <ArrowRight size={16} />
                </div>
                <div className={styles.bentoGlow}></div>
              </Link>
              
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
