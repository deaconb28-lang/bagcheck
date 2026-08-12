import { isAuthConfigured, signIn } from "@/auth";
import { Button } from "@/components/primitives";

async function signInAction() {
  "use server";
  await signIn("google", { redirectTo: "/wrapped" });
}

/** Sign-in entry point for app screens reached while signed out. */
export function SignInCta() {
  if (!isAuthConfigured()) return null;
  return (
    <form action={signInAction}>
      <Button type="submit">Sign in with Google</Button>
    </form>
  );
}
