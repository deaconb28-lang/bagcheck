import { redirect } from "next/navigation";

/**
 * /ledger is not in v1. It was a settings screen for a public page that does
 * not exist — its toggles never persisted — and it read four thousand rows to
 * build a wave the derived document already held.
 *
 * Temporary rather than permanent: the raw record is a screen worth having,
 * and this URL should still be free when it comes back.
 */
/*
 * Per request, not at build time. Without this Next prerenders the stub, and
 * the (app) layout it renders inside evaluates `appLocked()` with whatever
 * the *build* environment had — so a locked build bakes `redirect("/")` into
 * the static output and every one of these URLs lands on the marketing page
 * forever, whatever the deployment is set to afterwards.
 */
export const dynamic = "force-dynamic";

export default function Page() {
  redirect("/you");
}
