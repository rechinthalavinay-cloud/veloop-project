import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.logo}>
        VELOOP<span>Rewards</span>
      </div>
      <p>Play games, earn Game Coins, redeem rewards, and withdraw VEs.</p>
      <div className={styles.links}>
        <Link to="/">Games</Link>
        <Link to="/rewards">Rewards</Link>
        <Link to="/redeem">Redeem</Link>
        <Link to="/withdraw">Withdraw</Link>
      </div>
      <small>© 2026 VELOOP Rewards. Frontend prototype for demonstration.</small>
    </footer>
  );
}
