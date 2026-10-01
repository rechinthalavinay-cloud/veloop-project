import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, User, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useWallet } from "../../context/WalletContext";
import { useAuth } from "../../context/AuthContext";
import { tokenIcon, coinIcon, gemIcon, spinIcon, vesIcon } from "../../assets/icons";
import styles from "./Navbar.module.css";

const links = [
  { to: "/", label: "Home" },
  { to: "/#games", label: "Games" },
  { to: "/spin", label: "Spin" },
  { to: "/rewards", label: "Rewards" },
  { to: "/redeem", label: "Redeem" },
  { to: "/withdraw", label: "Withdraw" },
  { to: "/refer", label: "Refer & Earn" },
];

export default function Navbar() {
  const { wallet } = useWallet();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();

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
            <div className={styles.balanceGroup}>
              <div className={styles.balanceItem} title="Tokens">
                <img src={tokenIcon} alt="Tokens" />
                <span>{wallet.tokens}</span>
              </div>
              <div className={styles.balanceItem} title="Game Coins">
                <img src={coinIcon} alt="Coins" />
                <span>{wallet.gameCoins}</span>
              </div>
              <div className={styles.balanceItem} title="VEs">
                <img src={vesIcon} alt="VEs" />
                <span>{wallet.ves}</span>
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
              <div className={styles.profileWrapper}>
                <button 
                  type="button" 
                  className={styles.profileBtn} 
                  onClick={() => setShowProfileMenu(!showProfileMenu)} 
                  title="Profile Menu"
                >
                  <User size={16} />
                </button>

                {showProfileMenu && (
                  <div className={styles.profileDropdown}>
                    <div className={styles.profileHeader}>
                      <User size={20} className={styles.profileAvatar} />
                      <div className={styles.profileInfo}>
                        <span className={styles.profileName}>{user.name}</span>
                        <span className={styles.profileEmail}>{user.email}</span>
                      </div>
                    </div>
                    <div className={styles.dropdownDivider}></div>
                    <button 
                      className={styles.dropdownItem} 
                      onClick={() => { 
                        logout(); 
                        setOpen(false); 
                        setShowProfileMenu(false); 
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
