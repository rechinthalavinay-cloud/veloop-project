import { Link } from "react-router-dom";
import { Home, Gift } from "lucide-react";
import styles from "./GameNavigation.module.css";

export default function GameNavigation({ gameSlug }) {
  return (
    <nav className={styles.nav} aria-label="Game">
      <Link to={`/games/${gameSlug}`}>
        <Home size={18} />
        Home
      </Link>
      <Link to="/redeem">
        <Gift size={18} />
        Redeem
      </Link>
    </nav>
  );
}
