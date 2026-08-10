"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import styles from "./ContactPage.module.css";

export default function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyEmail}
      className={styles.copyButton}
      aria-live="polite"
    >
      {copied ? <Check size={17} /> : <Copy size={17} />}
      {copied ? "E-mail copiado" : "Copiar e-mail"}
    </button>
  );
}
