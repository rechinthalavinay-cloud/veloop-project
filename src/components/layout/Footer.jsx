import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="page-wrap">
        <div className={styles.footerGrid}>
          
          <div className={styles.brandCol}>
            <div className={styles.logo}>
              VELOOP<span>Rewards</span>
            </div>
            <p className={styles.description}>
              The ultimate gaming rewards platform. Play premium games, earn Game Coins, and easily redeem for real-world value.
            </p>
          </div>

          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Platform</h4>
            <div className={styles.linksList}>
              <Link to="/#games">Games</Link>
              <Link to="/rewards">Rewards</Link>
              <Link to="/redeem">Redeem</Link>
              <Link to="/withdraw">Withdraw</Link>
            </div>
          </div>

          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Support</h4>
            <div className={styles.linksList}>
              <Link to="#">Help Center</Link>
              <Link to="#">Contact Us</Link>
              <Link to="#">FAQ</Link>
            </div>
          </div>

          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Legal</h4>
            <div className={styles.linksList}>
              <Link to="#">Privacy Policy</Link>
              <Link to="#">Terms & Conditions</Link>
              <Link to="#">Cookie Policy</Link>
            </div>
          </div>

        </div>

        <div className={styles.footerBottom}>
          <div className={styles.copyright}>
            &copy; 2026 VELOOP Rewards. All rights reserved.
          </div>
          <div className={styles.prototype}>
            Frontend Prototype for Demonstration
          </div>
        </div>
      </div>
    </footer>
  );
}
