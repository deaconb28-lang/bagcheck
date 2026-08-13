import { isAuthConfigured, signIn } from "@/auth";

/**
 * The one way into the product.
 *
 * A server action rather than a link to `/api/auth/signin`, because that
 * route renders Auth.js's own provider-picker page — an unstyled screen in
 * the middle of a designed flow, listing one provider. Posting the action
 * goes straight to Google and comes back where the caller asked.
 *
 * It renders nothing when the deployment has no OAuth credentials. A button
 * that cannot finish is worse than no button, and every caller already has a
 * sensible fallback to show in its place.
 */
export function GoogleSignIn({
  redirectTo = "/home",
  className,
  children = "Continue with Google",
}: {
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  if (!isAuthConfigured()) return null;

  async function action() {
    "use server";
    await signIn("google", { redirectTo });
  }

  return (
    <form action={action}>
      <button type="submit" className={className}>
        <GoogleMark />
        {children}
      </button>
    </form>
  );
}

/** Google's mark, drawn inline: it must be on the first paint of the button. */
function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2A19.9 19.9 0 0 0 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}
