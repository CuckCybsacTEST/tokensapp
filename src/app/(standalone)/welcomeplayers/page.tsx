import { Metadata } from "next";
import WelcomePlayersClient from "./WelcomePlayersClient";
import styles from "./welcomeplayers.module.css";

export const metadata: Metadata = {
  title: "Welcome Players",
  description: "Ruleta pública táctil para premios aleatorios en formato vertical 9:16.",
};

export default function WelcomePlayersPage() {
  return (
    <main
      className={styles.scene}
    >
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
        <div className={styles.grid} />
        <div className={styles.vignette} />
      </div>

      <div className="relative z-[2] flex h-full w-full">
        <WelcomePlayersClient />
      </div>
    </main>
  );
}
