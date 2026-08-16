import type { Metadata } from "next";
import { Button, Eyebrow } from "@/components/primitives";
import styles from "@/app/status.module.css";

export const metadata: Metadata = { title: "Sign-in problem" };
export const dynamic = "force-dynamic";

/** What each Auth.js error code actually means for this deployment. */
const EXPLANATIONS: Record<string, { title: string; body: string; checks: string[] }> = {
  Configuration: {
    title: "Sign-in is misconfigured",
    body: "Auth.js could not complete the sign-in. This is a server-side setup problem, not something you did.",
    checks: [
      "AUTH_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET are all set on this deployment, and it was redeployed after they were added",
      "MONGODB_URI points at a reachable cluster — sign-in writes the user record, so an unreachable database fails here",
      "MongoDB Atlas Network Access allows connections from anywhere (0.0.0.0/0), since Vercel functions do not have fixed IPs",
      "The database user in the connection string still has its current password",
    ],
  },
  AccessDenied: {
    title: "That account was turned away",
    body: "Google completed sign-in but this app declined the account.",
    checks: [
      "While the Google consent screen is in Testing, only accounts listed as test users can sign in",
      "The account is not restricted by a Google Workspace policy",
    ],
  },
  Verification: {
    title: "That sign-in link expired",
    body: "The link was already used or has timed out. Starting again issues a fresh one.",
    checks: [],
  },
};

const FALLBACK = {
  title: "Sign-in did not complete",
  body: "The sign-in flow stopped before a session was created.",
  checks: [
    "The redirect URI registered with Google matches this deployment exactly, including https and no trailing slash",
    "This deployment's environment variables were set before the current build",
  ],
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const detail = (error && EXPLANATIONS[error]) || FALLBACK;

  return (
    <main className={styles.page}>
      <Eyebrow>Canopy · sign-in</Eyebrow>
      <h1 className={`disp ${styles.title}`}>{detail.title}</h1>
      <p className={styles.body}>{detail.body}</p>

      {detail.checks.length ? (
        <ul className={styles.body}>
          {detail.checks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      ) : null}

      <div className={styles.actions}>
        <Button href="/">Back to the landing page</Button>
      </div>

      {error ? <p className={styles.digest}>Error code: {error}</p> : null}
    </main>
  );
}
