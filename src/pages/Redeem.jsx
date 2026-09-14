import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { redeemOffers } from "../data/gamesData";
import { useWallet } from "../context/WalletContext";
import { coinIcon, gemIcon } from "../assets/icons";
import styles from "./Hub.module.css";

export default function Redeem() {
  const { wallet, redeem } = useWallet();
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);

  const confirm = () => {
    if (!selected) return;
    const outcome = redeem(selected);
    setResult(outcome.ok ? { type: "ok", offer: selected } : { type: "insufficient", offer: selected });
    setSelected(null);
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className={styles.page}>
        <div className="page-wrap">
          <p className={styles.kicker}>Game Coin conversion</p>
          <h1>Redeem Game Coins</h1>
          <p className={styles.lead}>
            Convert your centralized Game Coins into VELOOP rewards. This is not a cash withdrawal.
          </p>

          <div className={styles.balance}>
            <img src={coinIcon} alt="" width={28} height={28} />
            <strong>{wallet.gameCoins}</strong>
            <span>Game Coins</span>
            <span style={{ margin: "0 10px" }}>|</span>
            <img src={gemIcon} alt="" width={28} height={28} />
            <strong>{wallet.gems}</strong>
            <span>Gems</span>
          </div>

          <div className="row g-3 mt-1">
            {redeemOffers.map((offer) => (
              <div className="col-md-6 col-lg-4" key={offer.id}>
                <article className={styles.card}>
                  <img src={offer.icon} alt="" className={styles.offerIcon} />
                  <h2>{offer.title}</h2>
                  <p>{offer.subtitle}</p>
                  <p className={styles.rate}>
                    {offer.cost} {offer.costLabel || "Coins"} → {offer.reward} {offer.rewardLabel}
                  </p>
                  <button type="button" onClick={() => setSelected(offer)}>
                    Redeem
                  </button>
                </article>
              </div>
            ))}
          </div>

          <section className={styles.history}>
            <h2>Recent Redemptions</h2>
            {wallet.redemptions.length === 0 ? (
              <p>No redemptions yet. Play games to earn Game Coins.</p>
            ) : (
              <ul>
                {wallet.redemptions.map((item) => (
                  <li key={item.id}>
                    <span>{item.label}</span>
                    <small>{new Date(item.at).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />

      {selected ? (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.sheet}>
            <h2>Redeem Game Coins?</h2>
            <p>
              Convert {selected.cost} {selected.costLabel || "Game Coins"} into {selected.reward} {selected.rewardLabel}.
            </p>
            <p>Remaining: {Math.max(0, (selected.costKey ? wallet[selected.costKey] : wallet.gameCoins) - selected.cost)} {selected.costLabel || "Game Coins"}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button type="button" onClick={confirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {result?.type === "ok" ? (
        <div className={styles.modal} role="alertdialog">
          <div className={styles.sheet}>
            <h2>Redemption Successful</h2>
            <p>
              You received {result.offer.reward} {result.offer.rewardLabel}.
            </p>
            <button type="button" onClick={() => setResult(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {result?.type === "insufficient" ? (
        <div className={styles.modal} role="alertdialog">
          <div className={styles.sheet}>
            <h2>Not Enough Game Coins</h2>
            <p>
              You have {result.offer.costKey ? wallet[result.offer.costKey] : wallet.gameCoins} {result.offer.costLabel || "Game Coins"}. Required: {result.offer.cost}.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={() => setResult(null)}>
                Close
              </button>
              <Link className={styles.linkBtn} to="/">
                Play Games
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
