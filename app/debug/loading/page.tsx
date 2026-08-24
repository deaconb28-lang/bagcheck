import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { debugEnabled } from "@/lib/launch";
import AppLoading from "../../(app)/loading";
import FlexLoading from "../../(flex)/loading";
import YouLoading from "../../(app)/you/loading";
import HoldingsLoading from "../../(app)/holdings/loading";
import TrophiesLoading from "../../(app)/trophies/loading";
import ProfileLoading from "../../(app)/profile/loading";
import StartLoading from "../../(flex)/start/loading";

export const metadata: Metadata = { title: "Loading states" };
export const dynamic = "force-dynamic";

/**
 * Every waiting state, stacked, so they can actually be looked at.
 *
 * A `loading.tsx` is transient by definition — Next swaps it out the moment
 * the segment resolves — so the screenshot sweep has never covered either of
 * them, and every visual pass on them so far has gone through a scratch route
 * created and deleted in the same sitting. That is how one of them came to be
 * shot as a 404 without anyone noticing: the folder was named `__load-app`,
 * and a leading underscore is the App Router's private-folder prefix.
 *
 * Behind `DEBUG_PAGE=1` and `notFound()` otherwise, which is the gate `/debug`
 * itself uses. Nothing ships: with the flag off this route does not exist.
 *
 * They are stacked rather than tabbed because the point of looking at them
 * together is that they should feel like one product — the same black ground,
 * the same ink, each naming the work it is waiting on — and a tab hides the
 * comparison that makes that judgeable. The two `(flex)` states are the
 * exception and are meant to look different: that group speaks the marketing
 * field, because a signed-out visitor reaches it.
 *
 * **None of them carries a numeral.** A waiting state cannot know a figure,
 * and a plausible one drawn here would be a number nobody can correct on the
 * screen whose whole claim is that its figures came off a brokerage. That is
 * why the frames never fill, the switches never rest at an end, and the
 * wheel's wedges carry no ticker.
 */
export default function LoadingPreview() {
  if (!debugEnabled()) notFound();

  /*
   * All seven, stacked. Five of them are route-level and override the group
   * file for one screen each, which means five drawings that no sweep would
   * otherwise reach — a `loading.tsx` is transient by definition and the only
   * way to look at one is to render it somewhere that is not transient.
   */
  const states = [
    { label: "App group — the default", node: <AppLoading /> },
    { label: "Dashboard — the wheel arriving", node: <YouLoading /> },
    { label: "Holdings — the table filling", node: <HoldingsLoading /> },
    { label: "Collection — the frames checked", node: <TrophiesLoading /> },
    { label: "Settings — the switches settling", node: <ProfileLoading /> },
    { label: "Wrapped group — the default", node: <FlexLoading /> },
    { label: "Setup — the connection forming", node: <StartLoading /> },
  ];

  return (
    <>
      {states.map((state) => (
        <section key={state.label} aria-label={state.label}>
          {state.node}
        </section>
      ))}
    </>
  );
}
