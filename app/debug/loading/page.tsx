import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { debugEnabled } from "@/lib/launch";
import AppLoading from "../../(app)/loading";
import FlexLoading from "../../(flex)/loading";

export const metadata: Metadata = { title: "Loading states" };
export const dynamic = "force-dynamic";

/**
 * Both waiting states, side by side, so they can actually be looked at.
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
 * The two are stacked rather than tabbed because the point of looking at them
 * together is that they should feel like one product — the same black ground,
 * the same ink, one saying it is reading a ledger and the other a year — and a
 * tab hides the comparison that makes that judgeable.
 */
export default function LoadingPreview() {
  if (!debugEnabled()) notFound();

  return (
    <>
      <section aria-label="App waiting state">
        <AppLoading />
      </section>
      <section aria-label="Wrapped waiting state">
        <FlexLoading />
      </section>
    </>
  );
}
