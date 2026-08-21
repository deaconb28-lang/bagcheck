import Link from "next/link";
import { getUserId, isAuthConfigured } from "@/auth";
import { appLocked } from "@/lib/launch";
import { GoogleSignIn } from "@/components/app/GoogleSignIn";
import styles from "./landing.module.css";

/**
 * The way in, stated once and the same everywhere.
 *
 * The marketing pages had a "Log in" link, which is a description of a
 * mechanism rather than of a destination: it tells a returning reader what
 * they are about to do to their credentials, not that the product is on the
 * other side. A signed-in reader who landed on the marketing page had no
 * obvious way back into the app at all — the primary action said "Get started
 * free", which is what you say to someone who has not started.
 *
 * So there is one button and it names the destination. Signed in, it is a
 * link. Signed out, it *is* the sign-in — one click posts to Google and comes
 * back at the app rather than at whichever screen the reader happened to be
 * on, which is what makes "go to app" true rather than "go to a login".
 *
 * Both point at `/app` rather than at `/you`, because "the app" is the
 * dashboard for somebody who has connected a brokerage and the connect screen
 * for somebody who has not — and only `/app` knows which, since a sign-in's
 * destination is chosen before there is a session to ask about.
 *
 * It renders nothing while the launch lock is on. A door that is shut is not
 * drawn: the app group answers `appLocked()` with a bare redirect to the
 * landing, so a button offering the app while it is closed sends the reader in
 * a circle with nothing said.
 */
export async function GoToApp({
  variant = "ghost",
  label = "Go to app",
}: {
  variant?: "primary" | "ghost";
  /** The hero says it with an arrow; the nav and the footer say it plainly. */
  label?: string;
}) {
  if (appLocked()) return null;

  const className = variant === "primary" ? styles.navCta : styles.navGhost;

  /*
   * No auth configured is the local and CI case: `DEV_USER_ID` stands in for a
   * session, so there is nothing to sign in to and the link is direct.
   */
  if (!isAuthConfigured()) {
    return (
      <Link href="/app" className={className}>
        {label}
      </Link>
    );
  }

  const userId = await getUserId();
  if (userId) {
    return (
      <Link href="/app" className={className}>
        {label}
      </Link>
    );
  }

  /*
   * `mark={false}`, for the reason `GoogleSignIn` states itself: the mark
   * belongs on a button whose label names Google. This one says "Go to app",
   * which names a destination — so a second brand's four-colour logo inside it
   * was the loudest thing on a page whose whole palette is rationed, and it
   * appeared twice, in the nav pill and again in the hero.
   */
  return (
    <GoogleSignIn redirectTo="/app" className={className} mark={false}>
      {label}
    </GoogleSignIn>
  );
}

/** Whether the reader already has a session, for callers that lay out around it. */
export async function isSignedIn(): Promise<boolean> {
  if (!isAuthConfigured()) return false;
  return Boolean(await getUserId());
}
