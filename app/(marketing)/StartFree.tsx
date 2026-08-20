import Link from "next/link";
import { isAuthConfigured } from "@/auth";
import { GoogleSignIn } from "@/components/app/GoogleSignIn";
import styles from "./landing.module.css";

/**
 * The hero's first action, for a reader with no account.
 *
 * It used to be a link to `/start`, where the only thing a signed-out visitor
 * could do was press a second button that posted to Google and came back to
 * the same screen. That is a whole page in the funnel whose entire content is
 * "are you sure you want to press the button you just pressed" — three taps
 * and two full round trips to reach the one action that matters, and the step
 * counter on it said "Step 1 of 2" the whole way through.
 *
 * So the sign-in happens here and `/app` is what you come back to, which
 * sends a new account straight on to `/start`: the connect screen, in its
 * signed-in state, with every reassurance about read-only access still on it.
 * Nothing is skipped — the reassurance simply sits on the screen where the
 * action it reassures about actually happens, rather than on one in front of
 * it. Returning through `/app` rather than pinning `/start` means somebody who
 * already linked an account is not walked through connecting again.
 *
 * The Google mark is **not** on this one. It reads correctly on a button whose
 * label says "Continue with Google" and wrongly on the hero's primary action,
 * where it is a second brand's four-colour logo sitting inside the strongest
 * object on the page. The reassurance it was carrying — that this posts to
 * Google — is the job of the label on the *sign-in* buttons, which keep it.
 */
export function StartFree({ label = "Get started free" }: { label?: string }) {
  /*
   * No auth configured is the local and CI case: `DEV_USER_ID` stands in for
   * a session, so there is nothing to sign in to and the link is direct.
   */
  if (!isAuthConfigured()) {
    return (
      <Link href="/start" className={styles.ctaDark}>
        {label}
        <Arrow />
      </Link>
    );
  }

  return (
    <GoogleSignIn redirectTo="/app" className={styles.ctaDark} mark={false}>
      {label}
    </GoogleSignIn>
  );
}

function Arrow() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  );
}
