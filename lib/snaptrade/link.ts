import { getCollections } from "@/lib/db/collections";
import { getSnapTrade, isSnapTradeConfigured } from "./client";

/**
 * Whether this person actually has a brokerage linked — asked of the only
 * party that knows for certain.
 *
 * `linkedBrokerage()` answers from our own `connections.accounts`, and that
 * array is written by a **sync**, not by connecting. Between finishing the
 * broker's portal and the first sync landing, a linked account looks exactly
 * like an abandoned one, and every screen that asks the question tells the
 * reader to go and connect the brokerage they just connected. If the first
 * sync fails, or they sign in on another device before it runs, that state is
 * not a gap of seconds — it is where they live.
 *
 * The existing note on `linkedBrokerage` is still right about why the document
 * cannot be trusted on its own: `ensureRegistered` writes one the moment
 * somebody *opens* the portal, so its existence only means they started. The
 * mistake was treating "started" and "finished" as the same unknown. They are
 * distinguishable — SnapTrade knows which — so this asks.
 *
 * Three states, and only the ambiguous one costs a call:
 *
 *   no document          → never opened the portal. Not linked.
 *   accounts on file     → synced at least once. Linked.
 *   document, no accounts→ started, never synced. **Ask SnapTrade.**
 *
 * A confirmed link is written back into the document, so the question is
 * asked once per account rather than on every navigation, and the ordinary
 * path stays a single indexed read.
 */
export interface BrokerageLink {
  accounts: number;
  institutions: string[];
  lastSyncAt: Date | null;
  /** True when the answer came from SnapTrade rather than from our own store. */
  confirmed: boolean;
}

export async function brokerageLink(userId: string): Promise<BrokerageLink | null> {
  const { connections } = await getCollections();
  const doc = await connections.findOne({ userId });

  /* Never opened the portal. Nothing to confirm and nobody to ask. */
  if (!doc) return null;

  if (doc.accounts?.length) {
    const institutions = [
      ...new Set(doc.accounts.map((a) => a.institution).filter((x): x is string => Boolean(x))),
    ];
    return {
      accounts: doc.accounts.length,
      institutions,
      lastSyncAt: doc.lastSyncAt ?? null,
      confirmed: false,
    };
  }

  /*
   * The ambiguous state. With no SnapTrade credentials on the deployment there
   * is nobody to ask, so the honest answer is the one we can defend: the
   * portal was opened and we cannot say it finished.
   */
  if (!isSnapTradeConfigured()) return null;

  try {
    const res = await getSnapTrade().accountInformation.listUserAccounts({
      userId: doc.snaptradeUserId,
      userSecret: doc.snaptradeUserSecret,
    });
    const accounts = res.data ?? [];
    if (!accounts.length) return null;

    const institutions = [
      ...new Set(
        accounts
          .map((a) => a.institution_name)
          .filter((x): x is string => Boolean(x)),
      ),
    ];

    /*
     * Write what SnapTrade said back, so the next navigation takes the fast
     * path. Only the identifying fields — the sync owns the rest and will
     * overwrite this with the full picture the first time it runs.
     */
    await connections.updateOne(
      { userId },
      {
        $set: {
          accounts: accounts.map((account) => ({
            id: String(account.id ?? ""),
            institution: account.institution_name ?? null,
            name: account.name ?? null,
            number: account.number ?? null,
          })),
        },
      },
    );

    return {
      accounts: accounts.length,
      institutions,
      lastSyncAt: doc.lastSyncAt ?? null,
      confirmed: true,
    };
  } catch (err) {
    /*
     * Unreachable, rate-limited, credentials rotated. We know the portal was
     * opened and cannot verify more than that, so this falls back to the
     * answer the store alone supports rather than guessing in either
     * direction — a screen must not claim a link it cannot stand behind.
     */
    console.error("[snaptrade] link confirmation failed", err);
    return null;
  }
}
