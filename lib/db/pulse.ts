import { ensureIndexes, getCollections } from "./collections";
import type { PulseDoc } from "./types";

/** One question a day, four taps. Rotates so it never reads as a form. */
const QUESTIONS = [
  {
    id: "market-feel",
    question: "How does the market feel to you today?",
    options: ["Calm", "Uneasy", "Tempting", "Hard to read"],
  },
  {
    id: "own-plan",
    question: "How close are you to your own plan right now?",
    options: ["On it", "Drifting", "Off it", "Not sure"],
  },
  {
    id: "conviction",
    question: "How settled are you on what you hold?",
    options: ["Settled", "Reconsidering", "Restless", "Mixed"],
  },
] as const;

export type PulseQuestion = (typeof QUESTIONS)[number];

/** Deterministic per day, so a reload never swaps the question mid-answer. */
export function questionFor(date: string): PulseQuestion {
  const seed = [...date].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return QUESTIONS[seed % QUESTIONS.length];
}

export function isValidAnswer(date: string, answer: string): boolean {
  return questionFor(date).options.some((option) => option === answer);
}

export async function getPulse(userId: string, date: string): Promise<PulseDoc | null> {
  const { pulses } = await getCollections();
  return pulses.findOne({ userId, date });
}

export async function savePulse(
  userId: string,
  date: string,
  answer: string,
): Promise<void> {
  await ensureIndexes();
  const { pulses } = await getCollections();
  await pulses.updateOne(
    { userId, date },
    {
      $set: {
        userId,
        date,
        questionId: questionFor(date).id,
        answer,
        answeredAt: new Date(),
      },
    },
    { upsert: true },
  );
}
