import styles from "./GameShell.module.css";

export function GameShell({
  title,
  score,
  lives,
  level,
  time,
  phase,
  onPause,
  onResume,
  onRestart,
  extraHud,
  children,
}) {
  const hearts = typeof lives === "number"
    ? "♥".repeat(Math.max(0, lives)).padEnd(3, "♡")
    : null;

  return (
    <div className={styles.shell}>
      {/* ── HUD bar ── */}
      <div className={styles.hud}>
        <span className={styles.hudScore} id="game-score">⚡ {score ?? 0}</span>
        {hearts && <span className={styles.hudLives} id="game-lives">{hearts}</span>}
        {level != null && <span className={styles.hudLevel} id="game-level">Lv {level}</span>}
        {time != null && <span className={styles.hudTime} id="game-time">⏱ {time}s</span>}
        {extraHud}
        <button
          className={styles.pauseBtn}
          onClick={phase === "paused" ? onResume : onPause}
          aria-label={phase === "paused" ? "Resume" : "Pause"}
        >
          {phase === "paused" ? "▶" : "⏸"}
        </button>
      </div>

      {/* ── Game area ── */}
      <div className={styles.area}>{children}</div>

      {/* ── Pause overlay ── */}
      {phase === "paused" && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <p className={styles.cardLabel}>PAUSED</p>
            <h2 className={styles.cardTitle}>Game Paused</h2>
            <button className={styles.primaryBtn} onClick={onResume}>▶ Resume</button>
            <button className={styles.ghostBtn} onClick={onRestart}>↺ Restart</button>
          </div>
        </div>
      )}

    </div>
  );
}
