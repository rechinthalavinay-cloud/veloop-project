import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Link, useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { coinIcon, tokensIcon } from "../assets/icons";
import { games } from "../data/gamesData";
import { motion } from "framer-motion";
import { ArrowRight, Gift, Gamepad2, Coins } from "lucide-react";
import styles from "./Home.module.css";

export default function Home() {
  const { wallet } = useWallet();
  const navigate = useNavigate();

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  return (
    <div className={styles.mainWrapper}>
      <Navbar />
      
      {/* Subtle Gaming Background Effects */}
      <div className={styles.ambientBackground}>
        <div className={styles.glowTop}></div>
        <div className={styles.glowBottom}></div>
      </div>

      <main>
        {/* HERO SECTION */}
        <section className={styles.heroSection}>
          <motion.div 
            className={styles.heroContent}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <span className={styles.heroPreTitle}>PLAY • EARN • REDEEM</span>
            <h1 className={styles.heroTitle}>
              Games
            </h1>
            <p className={styles.heroSubtitle}>
              Explore exciting games, complete challenges, and earn amazing rewards.
            </p>
          </motion.div>
        </section>

        {/* WALLET HEADER STREAMLINED */}
        <div className={styles.walletHeader}>
          <div className={styles.walletPill}>
            <img src={coinIcon} alt="Game Coins" />
            <div className={styles.walletInfo}>
              <span className={styles.walletVal}>{wallet.gameCoins}</span>
              <span className={styles.walletLabel}>Game Coins</span>
            </div>
          </div>
          <div className={styles.walletPill}>
            <img src={tokensIcon} alt="Tokens" />
            <div className={styles.walletInfo}>
              <span className={styles.walletVal}>{wallet.tokens}</span>
              <span className={styles.walletLabel}>Tokens</span>
            </div>
          </div>
        </div>

        {/* GAMES GRID SHOWCASE */}
        <section id="games" className={styles.gamesSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleBox}>
              <div className={styles.sectionIcon}>
                <Gamepad2 size={24} />
              </div>
              <div>
                <h2>Games for You</h2>
                <p>13 amazing games. Play, earn and redeem!</p>
              </div>
            </div>
            <div className={styles.gamesCount}>
              13 GAMES
            </div>
          </div>
          
          <motion.div 
            className={styles.gamesGrid}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {games.map((game, index) => {
              const isPlayable = game.playable;
              
              return (
                <motion.div key={game.id} variants={fadeUp}>
                  <Link 
                    to={isPlayable ? `/games/${game.slug}` : "#"} 
                    className={styles.gameCard}
                    onClick={(e) => { if (!isPlayable) e.preventDefault(); }}
                  >
                    <div className={styles.cardImageWrap}>
                      <img src={game.image} alt={game.name} className={styles.cardImage} />
                      <div className={`${styles.badgeTop} ${isPlayable ? styles.badgePlayable : styles.badgeComingSoon}`}>
                        {isPlayable ? 'Playable' : 'Coming Soon'}
                      </div>
                    </div>
                    
                    <div className={styles.cardContent}>
                      <span className={styles.cardCategory}>{game.category} GAME</span>
                      <h3 className={styles.cardTitle}>{game.name}</h3>
                      
                      <div className={styles.cardFooter}>
                        <div className={styles.tokenCost}>
                          <img src={tokensIcon} alt="Tokens" />
                          <span>{game.cost} Tokens</span>
                        </div>
                        
                        <div className={`${styles.playBtn} ${!isPlayable ? styles.comingSoonBtn : ''}`}>
                          {isPlayable ? (
                            <>Play Now <ArrowRight size={16} /></>
                          ) : (
                            'Coming Soon 🕒'
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* INFO FOOTER BARS */}
        <div className={styles.infoFooter}>
          <div className={styles.infoGrid}>
            <div className={styles.infoCol}>
              <div className={styles.infoIcon}><Gamepad2 size={24} /></div>
              <div className={styles.infoText}>
                <h4>Exciting Games</h4>
                <p>for Every Skill</p>
              </div>
            </div>
            
            <div className={styles.infoCol}>
              <div className={styles.infoIcon}><Coins size={24} /></div>
              <div className={styles.infoText}>
                <h4>Earn Game Coins</h4>
                <p>as You Play</p>
              </div>
            </div>
            
            <div className={styles.infoCol} style={{justifyContent: 'space-between', width: '100%'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                <div className={styles.infoIcon}><Gift size={24} /></div>
                <div className={styles.infoText}>
                  <h4>Redeem Real</h4>
                  <p>Rewards</p>
                </div>
              </div>
              <div className={styles.playMoreText}>
                Play More <span>Earn More!</span>
              </div>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
