import { isAuthConfigured, signIn } from "@/auth";
import { Button } from "@/components/primitives";

/**
 * Sign-in entry point for app screens reached while signed out.
 *
 * `redirectTo` defaults to the dashboard, not to `/wrapped`. It used to be
 * hard-coded to the year, so someone who asked for their dashboard, signed in
 * from the empty state on it, and landed on Wrapped had been quietly sent
 * somewhere else — the one thing a sign-in must not do is lose the
 * destination the reader was already asking for.
 */
export function SignInCta({ redirectTo = "/you" }: { redirectTo?: string }) {
  if (!isAuthConfigured()) return null;

  async function action() {
    "use server";
    await signIn("google", { redirectTo });
  }

  return (
    <form action={action}>
      <Button type="submit">Continue with Google</Button>
    </form>
  );
}
