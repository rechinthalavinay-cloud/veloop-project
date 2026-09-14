import styles from "./CarouselDots.module.css";

export default function CarouselDots({ total, active, onSelect }) {
  return (
    <div className={styles.row} role="tablist" aria-label="Game carousel">
      {Array.from({ length: total }, (_, index) => (
        <button
          key={index}
          type="button"
          role="tab"
          className={index === active ? styles.active : styles.dot}
          aria-selected={index === active}
          aria-label={`Show game ${index + 1}`}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
}
