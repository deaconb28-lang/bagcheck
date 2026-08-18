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

  /*
   * The message is logged, not printed.
   *
   * `error.message` on a server component is whatever threw — a Mongo
   * connection string in a driver error, a stack frame naming a file, a
   * provider's raw response. Next already replaces it with a generic string
   * in production builds, which means the only reader who ever saw the real
   * one was a developer, and the only reader who could ever see a secret one
   * was a stranger. The digest below is the thread back to the server log,
   * and that is the right amount to hand out.
   */
  return (
    <main className={styles.page}>
      <Eyebrow>Steadyhands</Eyebrow>
      <h1 className={`disp ${styles.title}`}>This screen could not load</h1>
      <p className={styles.body}>
        Something failed before the page finished. Nothing was written, and
        your ledger is untouched.
      </p>
      <div className={styles.actions}>
        <Button onClick={reset}>Try again</Button>
        <Button href="/you" ghost>
          Go to the dashboard
        </Button>
      </div>
      {error.digest ? <p className={styles.digest}>Reference: {error.digest}</p> : null}
    </main>
  );
}
