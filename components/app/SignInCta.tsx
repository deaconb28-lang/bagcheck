import { isAuthConfigured, signIn } from "@/auth";
import { Button } from "@/components/primitives";

/**
 * Sign-in entry point for app screens reached while signed out.
 *
 * `redirectTo` defaults to `/app`, which resolves to the dashboard for an
 * account with a brokerage and to the connect screen for one without. It was
 * hard-coded to `/wrapped`, so someone who asked for their dashboard and
 * signed in from the empty state on it landed on the year instead — a sign-in
 * must not lose the destination the reader was asking for, and it must not
 * skip the step that makes the destination worth arriving at.
 */
export function SignInCta({ redirectTo = "/app" }: { redirectTo?: string }) {
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
