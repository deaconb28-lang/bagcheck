"use client";

import { useEffect } from "react";
import { Button, Eyebrow } from "@/components/primitives";
import styles from "./status.module.css";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <Eyebrow>Bagcheck</Eyebrow>
      <h1 className={`disp ${styles.title}`}>This screen could not load</h1>
      <p className={styles.body}>
        {error.message || "The request failed before the page finished."}
      </p>
      <div className={styles.actions}>
        <Button onClick={reset}>Try again</Button>
        <Button href="/home" ghost>
          Go to Home
        </Button>
      </div>
      {error.digest ? <p className={styles.digest}>Reference: {error.digest}</p> : null}
    </main>
  );
}
