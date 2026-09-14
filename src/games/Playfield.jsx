import styles from "./shared.module.css";

export function Playfield({ hud, hint, children }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.hud}>
        {hud.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className={styles.stage}>{children}</div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
