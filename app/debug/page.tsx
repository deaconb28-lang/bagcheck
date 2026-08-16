import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth, isAuthConfigured, isDevIdentity, signIn, signOut } from "@/auth";
import { debugEnabled } from "@/lib/launch";
import { getCollections, isDbConfigured } from "@/lib/db";
import type {
  ConnectionDoc,
  PositionSnapshotDoc,
  ScoreDoc,
  TransactionDoc,
} from "@/lib/db";
import { isSnapTradeConfigured } from "@/lib/snaptrade";
import { Button, Eyebrow } from "@/components/primitives";
import { ModeScope } from "@/components/app/ModeScope";
import { ScoreButton } from "./ScoreButton";
import { SyncButton } from "./SyncButton";
import styles from "./debug.module.css";

export const metadata: Metadata = { title: "Debug" };
export const dynamic = "force-dynamic";

const ENV_KEYS = [
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "MONGODB_URI",
  "SNAPTRADE_CLIENT_ID",
  "SNAPTRADE_CONSUMER_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "LOGO_DEV_TOKEN",
  "FINNHUB_API_KEY",
  "NOUN_PROJECT_KEY",
  "NOUN_PROJECT_SECRET",
  "STRIPE_SECRET_KEY",
  "DEV_USER_ID",
] as const;

interface LedgerData {
  connection: ConnectionDoc | null;
  transactions: TransactionDoc[];
  transactionCount: number;
  snapshots: PositionSnapshotDoc[];
  scores: ScoreDoc[];
}

async function loadLedger(userId: string): Promise<LedgerData> {
  const { connections, transactions, positionSnapshots, scores } = await getCollections();
  const [connection, txns, transactionCount, snapshots, scoreDocs] = await Promise.all([
    connections.findOne({ userId }),
    transactions.find({ userId }).sort({ date: -1 }).limit(50).toArray(),
    transactions.countDocuments({ userId }),
    positionSnapshots.find({ userId }).sort({ date: -1 }).limit(5).toArray(),
    scores.find({ userId }).sort({ date: -1 }).limit(7).toArray(),
  ]);
  return {
    connection,
    transactions: txns,
    transactionCount,
    snapshots,
    scores: scoreDocs,
  };
}

async function signInAction() {
  "use server";
  await signIn("google", { redirectTo: "/debug" });
}

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/debug" });
}

export default async function DebugPage() {
  /*
   * Its own flag, not the launch flag. Gating this on `appLocked()` meant the
   * act of opening the product to the public also opened a page naming
   * fourteen secrets, printing the raw ledger, and carrying live Sync and
   * Score buttons — the two gates have opposite senses. `notFound()` rather
   * than a redirect, so an unset deployment does not even admit it exists.
   */
  if (!debugEnabled()) notFound();

  let userId: string | null = null;
  let userEmail: string | null = null;
  let authError: string | null = null;
  const devIdentity = isDevIdentity();

  try {
    if (isAuthConfigured()) {
      const session = await auth();
      userId = session?.user?.id ?? null;
      userEmail = session?.user?.email ?? null;
    } else if (devIdentity) {
      userId = process.env.DEV_USER_ID ?? null;
    }
  } catch (err) {
    authError = err instanceof Error ? err.message : String(err);
  }

  let ledger: LedgerData | null = null;
  let dbError: string | null = null;
  if (userId && isDbConfigured()) {
    try {
      ledger = await loadLedger(userId);
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
    }
  }

  const canConnect = Boolean(userId) && isSnapTradeConfigured() && isDbConfigured();

  return (
    <main className={styles.page}>
      <ModeScope mode="light" />
      <header className={styles.head}>
        <Eyebrow>Bagcheck · debug · M1 ledger</Eyebrow>
        <h1 className={`disp ${styles.title}`}>Raw parsed history</h1>
        <Button href="/today" ghost>
          Back to the app
        </Button>
      </header>

      <section className={styles.section}>
        <Eyebrow>Environment</Eyebrow>
        <div className={styles.envList}>
          {ENV_KEYS.map((key) => {
            const present = Boolean(process.env[key]);
            return (
              <div key={key} className={styles.envRow}>
                <span className={present ? styles.ok : styles.missing}>
                  {present ? "SET" : "———"}
                </span>
                <span>{key}</span>
              </div>
            );
          })}
        </div>
        {!isAuthConfigured() && !devIdentity ? (
          <p className={styles.notice}>
            No identity available. Either set the three AUTH_* vars (Google
            sign-in), or set DEV_USER_ID to any string to exercise SnapTrade
            and MongoDB without auth while the domain is undecided.
          </p>
        ) : null}
      </section>

      <section className={styles.section}>
        <Eyebrow>Identity</Eyebrow>
        {authError ? <div className={styles.error}>{authError}</div> : null}
        {userId ? (
          <>
            {devIdentity ? (
              <p className={styles.notice}>
                Acting as DEV_USER_ID “{userId}” — Google sign-in is not
                configured, so this stand-in identity is active. On a public
                deployment this ledger is open to anyone with the URL; remove
                DEV_USER_ID once auth is live (the bypass also disables
                itself the moment the AUTH_* vars are set).
              </p>
            ) : null}
            <div className={styles.mono}>
              id: {userId}
              {userEmail ? (
                <>
                  <br />
                  email: {userEmail}
                </>
              ) : null}
              <br />
              source: {devIdentity ? "DEV_USER_ID (auth off)" : "Google session"}
            </div>
            <div className={styles.actions}>
              {canConnect ? (
                <Button href="/api/snaptrade/connect">Connect a brokerage</Button>
              ) : null}
              <SyncButton />
              <ScoreButton />
              {!devIdentity ? (
                <form action={signOutAction}>
                  <Button ghost type="submit">
                    Sign out
                  </Button>
                </form>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className={styles.notice}>No session.</p>
            {isAuthConfigured() ? (
              <form action={signInAction}>
                <Button type="submit">Sign in with Google</Button>
              </form>
            ) : null}
          </>
        )}
      </section>

      {userId && !isDbConfigured() ? (
        <section className={styles.section}>
          <Eyebrow>Ledger</Eyebrow>
          <p className={styles.notice}>MONGODB_URI is not set — nothing is stored yet.</p>
        </section>
      ) : null}

      {dbError ? (
        <section className={styles.section}>
          <Eyebrow>Ledger</Eyebrow>
          <div className={styles.error}>{dbError}</div>
        </section>
      ) : null}

      {ledger ? (
        <>
          <section className={styles.section}>
            <Eyebrow>Connection</Eyebrow>
            {ledger.connection ? (
              <div className={styles.mono}>
                snaptradeUserId: {ledger.connection.snaptradeUserId}
                <br />
                accounts: {ledger.connection.accounts.length}
                <br />
                lastSyncAt: {ledger.connection.lastSyncAt?.toISOString() ?? "never"}
              </div>
            ) : (
              <p className={styles.notice}>
                Not registered with SnapTrade yet — Connect a brokerage above
                starts the read-only portal flow.
              </p>
            )}
            {ledger.connection?.accounts.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>id</th>
                      <th>name</th>
                      <th>number</th>
                      <th>institution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.connection.accounts.map((account) => (
                      <tr key={account.id}>
                        <td>{account.id}</td>
                        <td>{account.name ?? "—"}</td>
                        <td>{account.number ?? "—"}</td>
                        <td>{account.institution ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className={styles.section}>
            <Eyebrow>Health score · latest {ledger.scores.length}</Eyebrow>
            {ledger.scores.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>date</th>
                      <th>score</th>
                      <th>baseline</th>
                      <th>adh</th>
                      <th>cons</th>
                      <th>pat</th>
                      <th>exp</th>
                      <th>contributors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.scores.map((doc) => (
                      <tr key={doc.date}>
                        <td>{doc.date}</td>
                        <td>{doc.score}</td>
                        <td>{doc.baseline}</td>
                        <td>{doc.components.adherence}</td>
                        <td>{doc.components.consistency}</td>
                        <td>{doc.components.patience}</td>
                        <td>{doc.components.exposure}</td>
                        <td>
                          {doc.contributors
                            .map((c) => `${c.name} ${c.value > 0 ? "+" : ""}${c.value}`)
                            .join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.notice}>
                No score yet — Recompute score builds one from the synced
                history.
              </p>
            )}
          </section>

          <section className={styles.section}>
            <Eyebrow>
              Position snapshots · latest {ledger.snapshots.length}
            </Eyebrow>
            {ledger.snapshots.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>date</th>
                      <th>account</th>
                      <th>positions</th>
                      <th>taken at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.snapshots.map((snapshot) => (
                      <tr key={`${snapshot.accountId}-${snapshot.date}`}>
                        <td>{snapshot.date}</td>
                        <td>{snapshot.accountId}</td>
                        <td>{snapshot.positions.length}</td>
                        <td>{snapshot.takenAt.toISOString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.notice}>No snapshots yet.</p>
            )}
          </section>

          <section className={styles.section}>
            <Eyebrow>
              Transactions · showing {ledger.transactions.length} of {ledger.transactionCount}
            </Eyebrow>
            {ledger.transactions.length ? (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>date</th>
                        <th>type</th>
                        <th>symbol</th>
                        <th>units</th>
                        <th>price</th>
                        <th>amount</th>
                        <th>ccy</th>
                        <th>description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.transactions.map((txn) => (
                        <tr key={txn.externalId}>
                          <td>{txn.date ?? "—"}</td>
                          <td>{txn.type ?? "—"}</td>
                          <td>{txn.symbol ?? "—"}</td>
                          <td>{txn.units ?? "—"}</td>
                          <td>{txn.price ?? "—"}</td>
                          <td>{txn.amount ?? "—"}</td>
                          <td>{txn.currency ?? "—"}</td>
                          <td>{txn.description ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <details className={styles.details}>
                  <summary>Raw JSON — latest transaction</summary>
                  <pre className={styles.raw}>
                    {JSON.stringify(ledger.transactions[0], null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              <p className={styles.notice}>No transactions yet — run a sync.</p>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
