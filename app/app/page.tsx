import { redirect } from "next/navigation";
import { getUserId } from "@/auth";
import { isDbConfigured } from "@/lib/db";
import { brokerageLink } from "@/lib/snaptrade";
import { appLocked } from "@/lib/launch";

export const dynamic = "force-dynamic";

/**
 * The way in, and the only thing that decides where "in" is.
 *
 * Every affordance that meant "go to the app" pointed at `/you` — the nav, the
 * hero, the footer, and the `redirectTo` every sign-in carried. So a brand new
 * account signed in and landed on the dashboard having connected nothing, and
 * met an empty state where the product should have been. The connect step was
 * reachable but never *the next thing*, which is the one job onboarding has.
 *
 * The decision could not be made at any of those call sites, and that is the
 * whole reason this route exists: a sign-in's `redirectTo` is chosen *before*
 * there is a session, so at the moment the link is rendered nobody knows yet
 * whether this person has a brokerage. Deciding after the round trip is the
 * only place the answer exists.
 *
 * `brokerageLink` is the right question, and "is there a connection document"
 * is not: `ensureRegistered` writes one the moment somebody opens the portal,
 * so its existence only means they started. But `accounts` is not the answer
 * on its own either — that array is written by a *sync*, so between finishing
 * the portal and the first sync landing a linked account is indistinguishable
 * from an abandoned one, and this route sent those people back to connect the
 * brokerage they had just connected. `brokerageLink` asks SnapTrade in that
 * one ambiguous state and believes what it says.
 *
 * It renders nothing and always redirects, so it never appears in history as a
 * page a reader can go back to.
 */
export default async function AppEntry() {
  /* A shut door sends people to the marketing page, as everything else does. */
  if (appLocked()) redirect("/");

  const userId = await getUserId();
  if (!userId) redirect("/start");

  /*
   * With no store configured there is nothing to ask, and `/you` says so
   * itself — sending someone to `/start` here would tell them to connect a
   * brokerage this deployment could not record.
   */
  if (!isDbConfigured()) redirect("/you");

  redirect((await brokerageLink(userId)) ? "/you" : "/start");
}
