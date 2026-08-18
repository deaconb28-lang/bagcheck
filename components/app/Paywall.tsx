import { EmptyState } from "./EmptyState";
import { PageGrid } from "./PageGrid";
import { TRIAL_DAYS, priceLine } from "@/lib/tiers";
import type { TrialState } from "@/lib/tiers";

/**
 * The screen a lapsed account meets.
 *
 * Bagcheck is a subscription: the free month buys the whole product, and when
 * it runs out this stands where the screen would be. That is a real departure
 * — monetization used to be "present, never blocking", with a locked tile
 * sitting in the slot its unlocked twin would occupy — and the two rules that
 * survive the change are the ones that were about honesty rather than about
 * placement:
 *
 *   · **No invented figure.** There is no blurred dashboard behind this and no
 *     plausible number under a filter. A number a reader cannot check is the
 *     one thing this product must never print, and a paywall is not a licence
 *     to start.
 *   · **No urgency.** It states a date and a price. No countdown, no discount,
 *     no "you are missing out" — the same rule the trial line has always kept.
 *
 * Two doors stay open on purpose and are named here rather than left to be
 * discovered: `/profile`, which is where a plan is bought and cancelled and
 * where export and erasure live, and any card already minted, which stays at
 * its own URL forever. Locking someone out of their own data would be
 * indefensible whatever they have or have not paid.
 */
export function Paywall({ trial }: { trial: TrialState }) {
  return (
    <PageGrid>
      <EmptyState
        eyebrow="bagcheck"
        icon="waiting"
        title={trial.expired ? "Your free month has ended" : "Bagcheck needs a plan"}
        body={
          trial.endsOn
            ? `The ${TRIAL_DAYS} days that started when you connected ran out on ${trial.endsOn}. Reading your ledger here needs a plan — ${priceLine()}, cancel whenever. Everything you minted stays yours at the URL it was minted at, and your data stays exportable from your profile either way.`
            : `Reading your ledger here needs a plan — ${priceLine()}, cancel whenever. Everything you minted stays yours at the URL it was minted at, and your data stays exportable from your profile either way.`
        }
        actions={[
          { label: "See the plan", href: "/pricing" },
          { label: "Profile and billing", href: "/profile", ghost: true },
        ]}
      />
    </PageGrid>
  );
}
