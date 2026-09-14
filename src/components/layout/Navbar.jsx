import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useWallet } from "../../context/WalletContext";
import { useAuth } from "../../context/AuthContext";
import { tokenIcon, coinIcon, vesIcon } from "../../assets/icons";
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

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo} onClick={() => setOpen(false)}>
          VELOOP<span>Rewards</span>
        </Link>

        <nav className={`${styles.links} ${open ? styles.open : ""}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={styles.link}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.wallet}>
          <button 
            type="button"
            onClick={() => { let w = JSON.parse(localStorage.getItem('veloop-wallet-v1')); w.tokens += 500; localStorage.setItem('veloop-wallet-v1', JSON.stringify(w)); window.location.reload(); }} 
            style={{ background: 'rgba(239, 83, 80, 0.8)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginRight: '8px' }}
            title="Cheat: Give 500 Tokens"
          >
            +500 T
          </button>
          <span className={styles.chip} title="Tokens">
            <img src={tokenIcon} alt="" width={20} height={20} />
            {wallet.tokens}
          </span>
          <span className={styles.chip} title="Game Coins">
            <img src={coinIcon} alt="" width={20} height={20} />
            {wallet.gameCoins}
          </span>
          <span className={styles.chip} title="VEs">
            <img src={vesIcon} alt="" width={20} height={20} />
            {wallet.ves}
          </span>
          {user ? (
            <button type="button" className={styles.out} onClick={logout}>
              {user.name.split(" ")[0]} · Out
            </button>
          ) : null}
        </div>

        <button
          className={styles.menu}
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}
