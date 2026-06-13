import styles from "./starfield.module.css";

/** Cielo estrellado sutil con twinkle. Se apaga solo en temas claros (opacidad = var(--stars)). */
export function Starfield() {
  return <div className={styles.field} aria-hidden />;
}
