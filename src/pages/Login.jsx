import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { coinIcon, tokensIcon, vesIcon } from "../assets/icons";
import { games } from "../data/gamesData";
import { motion } from "framer-motion";
import styles from "./Login.module.css";

export default function Login() {
  const { user, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [currentImage, setCurrentImage] = useState(0);

  // Cycle through top games for the cinematic showcase
  const showcaseGames = games.slice(0, 3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % showcaseGames.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [showcaseGames.length]);

  if (user) return <Navigate to="/" replace />;

  const submit = (event) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Enter your name.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    login({ name, email });
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className={styles.page}>
      {/* LEFT SIDE: Cinematic Showcase */}
      <div className={styles.showcaseSide}>
        <div className={styles.showcaseGlow}></div>
        <motion.div 
          className={styles.showcaseContent}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <h1 className={styles.showcaseTitle}>
            Play Premium.<br />
            <span>Earn Real Rewards.</span>
          </h1>
          <p className={styles.showcaseSubtitle}>
            Join the ultimate web3 gaming platform. Compete in high-quality games, climb the leaderboards, and exchange your Game Coins for real value.
          </p>
        </motion.div>
        
        <div className={styles.floatingGames}>
          {showcaseGames.map((game, index) => (
            <motion.div
              key={game.id}
              className={styles.floatCard}
              initial={{ opacity: 0, x: 50 }}
              animate={{ 
                opacity: index === currentImage ? 1 : 0.3,
                x: index === currentImage ? 0 : 40,
                y: index === currentImage ? 0 : 20 * (index + 1),
                zIndex: index === currentImage ? 10 : 1
              }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <img src={game.image} alt={game.name} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: Login Panel */}
      <div className={styles.loginSide}>
        <motion.div 
          className={styles.loginBox}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <div className={styles.brandHeader}>
            <img src={vesIcon} alt="VELOOP" />
            <h2>Welcome to VELOOP</h2>
            <p>Enter your details to start playing.</p>
          </div>
          
          <form onSubmit={submit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            
            <div className={styles.inputGroup}>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            
            <div className={styles.inputGroup}>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            
            {error && <div className={styles.error}>{error}</div>}
            
            <button type="submit" className={styles.submitBtn}>
              Enter Platform
            </button>
            <p className={styles.demoText}>Demo mode – any password (4+ chars) works locally.</p>
          </form>

          <div className={styles.assetIcons}>
            <img src={tokensIcon} alt="Tokens" />
            <img src={coinIcon} alt="Game Coins" />
            <img src={vesIcon} alt="VEs" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
