import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { rewardSessions } from "../data/gamesData";
import { useWallet } from "../context/WalletContext";
import { tokenIcon } from "../assets/icons";
import styles from "./Hub.module.css";

export default function Rewards() {
  const { wallet, claimSession } = useWallet();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="app-shell">
      <Navbar />
      <main className={styles.page}>
        <div className="page-wrap">
          <p className={styles.kicker}>Daily sessions</p>
          <h1>Earn More Tokens</h1>
          <p className={styles.lead}>
            Claim dummy session rewards to keep playing. Each game still costs 20 Tokens to enter.
          </p>
          <div className={styles.balance}>
            <img src={tokenIcon} alt="" width={28} height={28} />
            <strong>{wallet.tokens}</strong>
            <span>Tokens</span>
          </div>
          <div className="row g-3 mt-1">
            {rewardSessions.map((session) => {
              const claimed = wallet.claimedSessions[session.id] === today;
              return (
                <div className="col-md-4" key={session.id}>
                  <article className={styles.card}>
                    <h2>{session.title}</h2>
                    <p>{session.window}</p>
                    <p>{session.description}</p>
                    <button
                      type="button"
                      disabled={claimed}
                      onClick={() => claimSession(session)}
                    >
                      {claimed ? "Claimed today" : "Claim session"}
                    </button>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
