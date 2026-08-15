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

/**
 * The diagnostics gate, which is deliberately *not* the launch gate.
 *
 * `/debug` used to be gated on `appLocked()`, which meant the single act of
 * opening the product to the public — setting `APP_UNLOCKED=1` — also exposed
 * a page that names fourteen secrets, prints the raw ledger, and carries live
 * Sync and Score buttons. The two have opposite senses: the app opens at
 * launch, diagnostics close.
 *
 * So it has its own flag and it is off unless explicitly set. There is no
 * combination of launch settings that opens it by accident.
 */
export function debugEnabled(): boolean {
  return process.env.DEBUG_PAGE === "1";
}
