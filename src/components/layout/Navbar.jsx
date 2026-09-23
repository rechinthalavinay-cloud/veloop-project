import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, User, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useWallet } from "../../context/WalletContext";
import { useAuth } from "../../context/AuthContext";
import { tokenIcon, coinIcon, gemIcon, spinIcon } from "../../assets/icons";
import styles from "./Navbar.module.css";

const links = [
  { to: "/", label: "Home" },
  { to: "/#games", label: "Games" },
  { to: "/rewards", label: "Rewards" },
  { to: "/redeem", label: "Redeem" },
  { to: "/withdraw", label: "Withdraw" },
];

export default function Navbar() {
  const { wallet } = useWallet();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const handleCheat = () => {
    let w = JSON.parse(localStorage.getItem('veloop-wallet-v1'));
    if (w) {
      w.tokens += 500;
      localStorage.setItem('veloop-wallet-v1', JSON.stringify(w));
      window.location.reload();
    }
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.navContainer}>
        {/* Brand */}
        <Link to="/" className={styles.brand} onClick={() => setOpen(false)}>
          VELOOP<span>Rewards</span>
        </Link>

        {/* Mobile Menu Toggle */}
        <button
          className={styles.menuToggle}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Navigation & Controls Wrapper */}
        <div className={`${styles.navWrapper} ${open ? styles.mobileOpen : ""}`}>
          <nav className={styles.navLinks}>
            {links.map((link) => {
              const isActive = location.pathname === link.to || (link.to === "/#games" && location.hash === "#games");
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`${styles.navLink} ${isActive ? styles.activeLink : ""}`}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className={styles.controls}>
            <button 
              type="button"
              className={styles.cheatBtn}
              onClick={handleCheat}
              title="Add 500 Tokens"
            >
              <Plus size={14} /> 500 T
            </button>

            <div className={styles.balanceGroup}>
              <div className={styles.balanceItem} title="Tokens">
                <img src={tokenIcon} alt="Tokens" />
                <span>{wallet.tokens}</span>
              </div>
              <div className={styles.balanceItem} title="Game Coins">
                <img src={coinIcon} alt="Coins" />
                <span>{wallet.gameCoins}</span>
              </div>
              <div className={styles.balanceItem} title="Gems">
                <img src={gemIcon} alt="Gems" />
                <span>{wallet.gems}</span>
              </div>
              <div className={styles.balanceItem} title="Spins">
                <img src={spinIcon} alt="Spins" />
                <span>{wallet.spins}</span>
              </div>
            </div>

            {user ? (
              <button type="button" className={styles.profileBtn} onClick={() => { logout(); setOpen(false); }} title="Sign Out">
                <User size={16} />
                <span className={styles.profileName}>{user.name.split(" ")[0]}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
