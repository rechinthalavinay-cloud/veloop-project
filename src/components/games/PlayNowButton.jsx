import { ArrowRight, LoaderCircle } from "lucide-react";
import styles from "./PlayNowButton.module.css";

export default function PlayNowButton({
  label = "Play Now",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
}) {
  return (
    <button
      type={type}
      className={styles.button}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={label}
    >
      <span className={styles.shimmer} aria-hidden="true" />
      <span className={styles.label}>
        {loading ? <LoaderCircle className={styles.spin} size={16} /> : null}
        {loading ? "Starting..." : label}
        {!loading ? <ArrowRight size={16} /> : null}
      </span>
    </button>
  );
}
