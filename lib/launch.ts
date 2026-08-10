/**
 * The launch gate. While the app is being built, the public build carries
 * the marketing site and the waitlist only: every app route bounces back to
 * the landing, and the landing offers the waitlist instead of a login.
 * Flipping APP_UNLOCKED=1 in the deployment opens the doors without a code
 * change — the flag is read server-side per request and never ships to the
 * client.
 */
export function appLocked(): boolean {
  return process.env.APP_UNLOCKED !== "1";
}
