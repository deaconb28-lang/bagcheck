"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/primitives";
import styles from "./PulseSurvey.module.css";

type PulseSurveyProps = {
  date: string;
  question: string;
  options: readonly string[];
};

/** One question, one tap. Leaves the screen once answered and does not return. */
export function PulseSurvey({ date, question, options }: PulseSurveyProps) {
  const [answered, setAnswered] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  if (answered) return null;

  async function answer(option: string) {
    if (pending) return;
    setPending(option);
    try {
      const res = await fetch("/api/pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, answer: option }),
      });
      // A failed write should not trap the question on screen forever.
      setAnswered(res.ok);
    } catch {
      setAnswered(true);
    } finally {
      setPending(null);
    }
  }

  return (
    <section className={styles.pulse}>
      <Eyebrow>Pulse</Eyebrow>
      <p className={styles.question}>{question}</p>
      <div className={styles.options}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.option}
            disabled={pending !== null}
            data-pending={pending === option || undefined}
            onClick={() => answer(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}
