import Link from "next/link";

import styles from "./AccountHeader.module.css";

export default function AccountHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link
          href="/"
          aria-label="Página inicial da Laico"
          className={styles.logoLink}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo3.png"
            alt="Laico"
            className={styles.logo}
          />
        </Link>
      </div>
    </header>
  );
}