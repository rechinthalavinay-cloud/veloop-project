import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import GamesCarousel from "../components/games/GamesCarousel";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { tokenIcon, coinIcon, vesIcon, svesIcon, gemIcon, spinIcon } from "../assets/icons";
import { motion } from "framer-motion";
import styles from "./Home.module.css";

export default function Home() {
  const { wallet } = useWallet();

  return (
    <div className="app-shell">
      <Navbar />
      <main>
        <section className={styles.hero}>
          <div className="page-wrap">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className={styles.kicker}>VELOOP Games</p>
              <h1>
                Explore Games
                <br />
                <span>& Earn Rewards</span>
              </h1>
              <p className={styles.lead}>
                A premium rewards hub: enter any of the 13 titles with 20 Tokens, play, earn centralized Game Coins, then redeem into VE, SVE, Gems, Tokens or Spins.
              </p>
            </motion.div>
            <div className={styles.balances}>
              <article>
                <img src={tokenIcon} alt="" width={20} height={20} />
                <strong>{wallet.tokens}</strong>
                <span>Tokens</span>
              </article>
              <article>
                <img src={coinIcon} alt="" width={20} height={20} />
                <strong>{wallet.gameCoins}</strong>
                <span>Game Coins</span>
              </article>
              <article>
                <img src={vesIcon} alt="" />
                <strong>{wallet.ves}</strong>
                <span>VEs</span>
              </article>
              <article>
                <img src={svesIcon} alt="" />
                <strong>{wallet.sves}</strong>
                <span>SVEs</span>
              </article>
              <article>
                <img src={gemIcon} alt="" />
                <strong>{wallet.gems}</strong>
                <span>Gems</span>
              </article>
              <article>
                <img src={spinIcon} alt="" />
                <strong>{wallet.spins}</strong>
                <span>Spins</span>
              </article>
            </div>
          </div>
        </section>

        <section id="games" className={styles.games}>
          <div className="page-wrap">
            <div className={styles.heading}>
              <div>
                <p className={styles.kicker}>Games</p>
                <h2>Play Now</h2>
              </div>
              <p>Artwork stays in the banner. The 20 Token Play Now bar is coded and interactive.</p>
            </div>
            <GamesCarousel />
          </div>
        </section>

        <section className={styles.ctaRow}>
          <div className="page-wrap">
            <div className="row g-3">
              <div className="col-md-4">
                <Link to="/rewards" className={styles.panel}>
                  <h3>Reward Sessions</h3>
                  <p>Claim morning, afternoon, and evening token boosts.</p>
                </Link>
              </div>
              <div className="col-md-4">
                <Link to="/redeem" className={styles.panel}>
                  <h3>Redeem Center</h3>
                  <p>Convert Game Coins into VE, SVE, Gems, Tokens, or Spins.</p>
                </Link>
              </div>
              <div className="col-md-4">
                <Link to="/withdraw" className={styles.panel}>
                  <h3>Withdraw VEs</h3>
                  <p>Move VEs to UPI or bank once you have a 50 VE minimum.</p>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
