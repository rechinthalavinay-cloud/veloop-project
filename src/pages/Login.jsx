import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { coinIcon, tokenIcon, vesIcon } from "../assets/icons";
import styles from "./Login.module.css";

export default function Login() {
  const { user, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <img src={vesIcon} alt="" width={56} height={56} />
          <h1>
            VELOOP<span>Rewards</span>
          </h1>
          <p>Sign in to play 13 games, earn Game Coins, and redeem rewards.</p>
        </div>
        <form onSubmit={submit} className={styles.form}>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••" />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit">Enter Games</button>
          <small>Demo login — any password of 4+ characters works locally.</small>
        </form>
        <div className={styles.icons}>
          <img src={tokenIcon} alt="Tokens" />
          <img src={coinIcon} alt="Game Coins" />
          <img src={vesIcon} alt="VEs" />
        </div>
      </div>
    </div>
  );
}
