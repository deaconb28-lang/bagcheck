import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unsubscribe tokens.
 *
 * A link inside an email is opened by a mail client, not a signed-in browser,
 * so it cannot rely on a session — and a bare `?u=<userId>` would let anyone
 * who guessed an id switch off someone else's mail. So the id is signed, the
 * comparison is constant-time, and there is exactly one thing a valid token
 * authorises: turning notifications off. It grants no read of anything.
 *
 * Kept pure and separated from the routes so the signing can be tested with a
 * fixed secret rather than the deployment's.
 */

export function sign(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${userId}`).digest("base64url");
}

export function verify(userId: string, token: string, secret: string): boolean {
  const expected = Buffer.from(sign(userId, secret));
  const given = Buffer.from(token);
  // timingSafeEqual throws on a length mismatch, which is itself a leak-free
  // rejection — but branch on it explicitly rather than catching.
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

/** The secret the deployment signs with. Never sent anywhere. */
export function unsubscribeSecret(): string | null {
  return process.env.AUTH_SECRET || process.env.CRON_SECRET || null;
}

export function unsubscribeUrl(userId: string, base: string): string {
  const secret = unsubscribeSecret();
  if (!secret) return `${base}/profile`;
  return `${base}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId, secret)}`;
}
