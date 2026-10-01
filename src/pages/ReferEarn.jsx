import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import styles from "./ReferEarn.module.css";
import { Copy, Share2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useWallet } from "../context/WalletContext";

export default function ReferEarn() {
  const { wallet } = useWallet();
  const [copied, setCopied] = useState(false);
  
  const referralCode = "VELOOP2026";
  const referralLink = `https://veloop.gg/ref/${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.pageWrapper}>
      <Navbar />
      
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1>Refer & Earn</h1>
          <p>Invite friends and earn bonus Game Coins and Tokens instantly.</p>
        </div>

        <div className={styles.contentGrid}>
          {/* Main Referral Card */}
          <div className={styles.referCard}>
            <div className={styles.cardGlow}></div>
            <h2>Your Referral Link</h2>
            <p className={styles.referDesc}>
              Share this link with your friends. Once they sign up and play their first game, you both get <strong>500 Tokens</strong> and <strong>50 Game Coins</strong>!
            </p>

            <div className={styles.linkBox}>
              <span className={styles.linkText}>{referralLink}</span>
              <button 
                className={`${styles.copyBtn} ${copied ? styles.copied : ""}`}
                onClick={copyToClipboard}
              >
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <button className={styles.shareBtn}>
              <Share2 size={20} />
              Share on Social Media
            </button>
          </div>

          {/* Stats Column */}
          <div className={styles.statsColumn}>
            <div className={styles.statBox}>
              <h3>Total Referrals</h3>
              <div className={styles.statValue}>{wallet.referrals || 0}</div>
              <div className={styles.statSub}>Friends joined</div>
            </div>
            
            <div className={styles.statBox}>
              <h3>Total Earned</h3>
              <div className={styles.statValue}>{(wallet.referralTokens || 0).toLocaleString()}</div>
              <div className={styles.statSub}>Tokens earned</div>
            </div>
            
            <div className={styles.statBox}>
              <h3>Pending Bonus</h3>
              <div className={styles.statValue}>{(wallet.pendingTokens || 0).toLocaleString()}</div>
              <div className={styles.statSub}>Tokens awaiting verification</div>
            </div>
          </div>
        </div>

        <div className={styles.howItWorks}>
          <h2>How it Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepIcon}>1</div>
              <h3>Share Link</h3>
              <p>Send your unique link to your friends via text, email, or social media.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepIcon}>2</div>
              <h3>Friend Signs Up</h3>
              <p>Your friend creates a VELOOP account and logs in.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepIcon}>3</div>
              <h3>Get Rewarded</h3>
              <p>When they play their first game, you both receive your bonuses automatically!</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
