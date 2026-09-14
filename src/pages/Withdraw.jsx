import { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useWallet } from "../context/WalletContext";
import { vesIcon } from "../assets/icons";
import styles from "./Hub.module.css";

export default function Withdraw() {
  const { wallet, withdrawVes } = useWallet();
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState("UPI");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const result = withdrawVes({
      amount: Number(amount),
      method,
      destination,
    });
    if (result.ok) {
      setMessage("Withdrawal submitted. Status: Processing.");
      setDestination("");
      return;
    }
    if (result.reason === "minimum") {
      setMessage("Minimum withdrawal is 50 VEs.");
      return;
    }
    setMessage("Not enough VEs for this withdrawal.");
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className={styles.page}>
        <div className="page-wrap">
          <p className={styles.kicker}>VE payout</p>
          <h1>Withdraw VEs</h1>
          <p className={styles.lead}>
            Redeem Game Coins into VEs first. Withdrawals use dummy local data and a 50 VE minimum.
          </p>
          <div className={styles.balance}>
            <img src={vesIcon} alt="" width={28} height={28} />
            <strong>{wallet.ves}</strong>
            <span>VEs available</span>
          </div>

          <form className={styles.card} onSubmit={submit}>
            <label>
              Amount (VE)
              <input
                type="number"
                min="50"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label>
              Method
              <select value={method} onChange={(event) => setMethod(event.target.value)}>
                <option>UPI</option>
                <option>Bank</option>
              </select>
            </label>
            <label>
              Destination
              <input
                required
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder={method === "UPI" ? "yourname@upi" : "Account number"}
              />
            </label>
            <button type="submit">Request withdrawal</button>
            {message ? <p>{message}</p> : null}
          </form>

          <section className={styles.history}>
            <h2>Recent withdrawals</h2>
            {wallet.withdrawals.length === 0 ? (
              <p>No withdrawals yet.</p>
            ) : (
              <ul>
                {wallet.withdrawals.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.amount} VE · {item.method} · {item.status}
                    </span>
                    <small>{new Date(item.at).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
