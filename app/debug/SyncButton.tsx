"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives";
import styles from "./debug.module.css";

export function SyncButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    if (running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/snaptrade/sync", { method: "POST" });
      const json = await res.json();
      setResult(JSON.stringify(json));
      router.refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={styles.syncWrap}>
      <Button ghost onClick={run}>
        {running ? "Syncing…" : "Sync now"}
      </Button>
      {result ? <code className={styles.syncResult}>{result}</code> : null}
    </div>
  );
}
