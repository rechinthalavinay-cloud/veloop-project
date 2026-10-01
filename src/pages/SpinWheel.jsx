import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import styles from "./SpinWheel.module.css";
import { useState, useRef } from "react";
import { useWallet } from "../context/WalletContext";
import { tokenIcon, coinIcon, gemIcon } from "../assets/icons";

const PRIZES = [
  { label: "10 Tokens", type: "tokens", amount: 10, color: "#f97316", icon: tokenIcon },
  { label: "5 Game Coins", type: "gameCoins", amount: 5, color: "#eab308", icon: coinIcon },
  { label: "Oops! Nothing", type: "none", amount: 0, color: "#3f3f46", icon: null },
  { label: "50 Tokens", type: "tokens", amount: 50, color: "#8b5cf6", icon: tokenIcon },
  { label: "1 Gem", type: "gems", amount: 1, color: "#ec4899", icon: gemIcon },
  { label: "20 Tokens", type: "tokens", amount: 20, color: "#3b82f6", icon: tokenIcon },
];

export default function SpinWheel() {
  const { wallet, consumeSpin } = useWallet();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);

  const spinWheel = () => {
    if (spinning) return;
    if (wallet.spins <= 0) {
      alert("You don't have any spins left!");
      return;
    }

    setSpinning(true);
    setResult(null);

    // Randomize prize
    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const prize = PRIZES[prizeIndex];

    // Calculate rotation
    // Each slice is 360 / 6 = 60 degrees.
    // The pointer is at the top (0 degrees).
    // We want the selected prize to land at the top.
    const sliceAngle = 360 / PRIZES.length;
    const targetAngle = prizeIndex * sliceAngle;
    
    // Pick a random spot inside the slice to land on (with 5 degrees padding from the edges so it never lands on a line)
    const minOffset = 5;
    const maxOffset = sliceAngle - 5;
    const randomOffset = minOffset + Math.random() * (maxOffset - minOffset);
    
    // The exact angle on the wheel that should end up at the top (0 degrees)
    const exactLandingAngle = targetAngle + randomOffset;
    
    // Spin 5 extra full rotations + align the exact landing angle to the top pointer
    const currentMod = rotation % 360;
    const newRotation = rotation + (360 * 5) + (360 - exactLandingAngle) - currentMod;

    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult(prize);
      if (prize.type !== "none") {
        consumeSpin(prize.type, prize.amount);
      } else {
        consumeSpin("tokens", 0); // just consume spin
      }
    }, 4000); // Wait for CSS animation
  };

  return (
    <div className={styles.pageWrapper}>
      <Navbar />
      
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1>Lucky Spin</h1>
          <p>Spin the wheel for a chance to win Tokens, Game Coins, and Gems!</p>
          <div className={styles.spinsBadge}>
            You have <strong>{wallet.spins}</strong> Spins left
          </div>
        </div>

        <div className={styles.wheelContainer}>
          <div className={styles.wheelWrapper}>
            {/* The Pointer */}
            <div className={styles.pointer}></div>
            
            {/* The Wheel */}
            <div 
              className={styles.wheel}
              style={{ 
                transform: `rotate(${rotation}deg)`,
                background: `conic-gradient(${PRIZES.map((p, i) => `${p.color} ${i * (360/PRIZES.length)}deg ${(i+1) * (360/PRIZES.length)}deg`).join(', ')})`
              }}
            >
              {PRIZES.map((prize, index) => {
                // The center of this slice is at (index * 60) + 30 degrees
                const sliceAngle = 360 / PRIZES.length;
                const centerAngle = index * sliceAngle + (sliceAngle / 2);
                return (
                  <div 
                    key={index} 
                    className={styles.prizeItem}
                    style={{ transform: `rotate(${centerAngle}deg)` }}
                  >
                    <div className={styles.prizeContent}>
                      {prize.icon && <img src={prize.icon} alt={prize.label} className={styles.sliceIcon} />}
                      <span>{prize.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Center Hub */}
            <div className={styles.centerHub}></div>
          </div>

          <button 
            className={`${styles.spinBtn} ${spinning || wallet.spins <= 0 ? styles.disabled : ""}`}
            onClick={spinWheel}
            disabled={spinning || wallet.spins <= 0}
          >
            {spinning ? "Spinning..." : "SPIN NOW"}
          </button>
          
          {/* Result Alert */}
          {result && (
            <div className={`${styles.resultBox} ${result.type !== 'none' ? styles.win : styles.lose}`}>
              {result.type !== "none" ? (
                <>
                  <h2>🎉 You Won! 🎉</h2>
                  <p>{result.label}</p>
                </>
              ) : (
                <>
                  <h2>Better luck next time!</h2>
                  <p>You didn't win anything this spin.</p>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
