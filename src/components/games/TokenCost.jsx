import styles from "./TokenCost.module.css";
import { tokenIcon } from "../../assets/icons";

export default function TokenCost({ cost = 20 }) {
  return (
    <span className={styles.cost}>
      <img src={tokenIcon} alt="" width={20} height={20} />
      {cost} Tokens
    </span>
  );
}
