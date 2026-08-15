/**
 * The address on the legal pages.
 *
 * A policy has to name somewhere a person can actually write to, and the
 * address changes when the domain does — so it is an environment read with a
 * default rather than a string buried in two documents that would then
 * disagree with each other.
 */
export function contactEmail(): string {
  return process.env.SUPPORT_EMAIL || "hellodeaconbrantley@gmail.com";
}

/** The date the current text was written. Bump it when the text changes. */
export const POLICY_UPDATED = "2026-08-15";
