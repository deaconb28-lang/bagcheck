import { getCollections } from "./collections";
import { sendEmail } from "@/lib/email/send";
import type { EmailContent } from "@/lib/email/render";

/**
 * The one place a message leaves the product.
 *
 * `claimToday` writes the log row *before* the send, and the unique index on
 * {userId, date} is what makes "one notification a day" true rather than
 * intended. A duplicate-key error is the normal, expected outcome of a second
 * attempt — a cron that retries, two crons that overlap, a manual run — and
 * it is treated as "already handled", not as a failure.
 *
 * Claiming first means a send that fails costs the day's slot. That is the
 * right way round: someone who gets nothing has lost a brief, while someone
 * who gets two has been sent mail the product promised not to send.
 */

export type NotificationKind = "brief" | "recap";

export interface NotifyResult {
  sent: boolean;
  /** Why nothing went out, when nothing did. Null on a successful send. */
  skipped: string | null;
}

async function claimToday(
  userId: string,
  date: string,
  kind: NotificationKind,
): Promise<boolean> {
  const { emailLog } = await getCollections();
  try {
    await emailLog.insertOne({ userId, date, kind, providerId: null, sentAt: new Date() });
    return true;
  } catch (err) {
    // 11000 is the unique index doing its job: today is already spoken for.
    if (typeof err === "object" && err && (err as { code?: number }).code === 11000) {
      return false;
    }
    throw err;
  }
}

export async function notify(
  userId: string,
  to: string,
  date: string,
  kind: NotificationKind,
  content: EmailContent,
  unsubscribeUrl: string,
): Promise<NotifyResult> {
  if (!(await claimToday(userId, date, kind))) {
    return { sent: false, skipped: "already notified today" };
  }

  const result = await sendEmail(to, content, unsubscribeUrl);
  if (!result.sent) {
    return { sent: false, skipped: result.error };
  }

  const { emailLog } = await getCollections();
  await emailLog.updateOne({ userId, date }, { $set: { providerId: result.id } });
  return { sent: true, skipped: null };
}

/** Whether a user has opted in to a given kind. Off unless they said yes. */
export async function wantsEmail(userId: string, kind: NotificationKind): Promise<boolean> {
  const { prefs } = await getCollections();
  const doc = await prefs.findOne({ userId });
  return Boolean(kind === "brief" ? doc?.emailDaily : doc?.emailWeekly);
}
