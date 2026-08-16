/**
 * The launch gate — **open by default, since the product has launched.**
 *
 * It used to be the other way round: the doors were shut unless a deployment
 * set `APP_UNLOCKED=1`, which was right while the public build was a landing
 * page and a waitlist. It is wrong now, and it failed in exactly the way a
 * default-closed gate fails — every new deployment ships shut, and a shut door
 * here is not an error page but a silent 307 back to the marketing site. A
 * preview build on a second host did that for days: `/you` answered a redirect
 * with nothing said, which is indistinguishable from the app being broken.
 *
 * So the default is open and closing is the deliberate act. `APP_LOCKED=1`
 * shuts it, and `APP_UNLOCKED=0` still does too — deployments that carry the
 * old variable were setting it to `1` to *open*, so honouring an explicit `0`
 * is the only reading of it that cannot surprise anyone.
 *
 * Read server-side per request; neither name is `NEXT_PUBLIC` and neither
 * reaches the client.
 */
export function appLocked(): boolean {
  return process.env.APP_LOCKED === "1" || process.env.APP_UNLOCKED === "0";
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
