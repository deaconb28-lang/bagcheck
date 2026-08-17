import { Snaptrade, SnaptradeAuth } from "snaptrade-typescript-sdk";

type SnapTradeClient = InstanceType<typeof Snaptrade<ReturnType<typeof SnaptradeAuth.commercialApiKey>>>;

let cached: SnapTradeClient | null = null;

/**
 * Trimmed on read. A credential pasted into a dashboard commonly arrives with
 * a trailing space or newline, and SnapTrade rejects that with the same
 * "Invalid clientId" it uses for a genuinely wrong one — so the two are
 * indistinguishable from the error alone. Trimming removes the cheaper of the
 * two explanations for good.
 */
function credential(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function isSnapTradeConfigured(): boolean {
  return Boolean(credential("SNAPTRADE_CLIENT_ID") && credential("SNAPTRADE_CONSUMER_KEY"));
}

export function getSnapTrade(): SnapTradeClient {
  if (!isSnapTradeConfigured()) {
    throw new Error(
      "SnapTrade is not configured — set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY",
    );
  }
  if (!cached) {
    cached = new Snaptrade({
      auth: SnaptradeAuth.commercialApiKey({
        clientId: credential("SNAPTRADE_CLIENT_ID"),
        consumerKey: credential("SNAPTRADE_CONSUMER_KEY"),
      }),
    });
  }
  return cached;
}

/**
 * Which credential SnapTrade is rejecting.
 *
 * A sync fails with a bare 401 whether the consumer key is wrong or the
 * *user's* stored secret is, and the two need opposite fixes: rotate a
 * deployment variable, or have people re-link their brokerage. Production spent
 * an unknown stretch failing every sync with exactly that ambiguity, silently,
 * because the error was caught and logged where nobody reads.
 *
 * `listSnapTradeUsers` authenticates with the client credentials alone and
 * carries no user secret, so it separates the two layers cleanly. It returns
 * the registered user ids; only the count is reported, because those ids are
 * ours and a log is not the place for them.
 */
export async function credentialCheck(): Promise<{
  clientOk: boolean;
  users: number | null;
  detail: string;
}> {
  if (!isSnapTradeConfigured()) {
    return { clientOk: false, users: null, detail: "SnapTrade is not configured" };
  }
  try {
    const res = await getSnapTrade().authentication.listSnapTradeUsers();
    const users = Array.isArray(res.data) ? res.data.length : null;
    return {
      clientOk: true,
      users,
      detail: "client credentials accepted — a 401 on a sync is that user's stored secret",
    };
  } catch (err) {
    const status = (err as { status?: number; response?: { status?: number } })?.status
      ?? (err as { response?: { status?: number } })?.response?.status
      ?? null;
    return {
      clientOk: false,
      users: null,
      detail:
        status === 401
          ? "client credentials rejected — SNAPTRADE_CLIENT_ID or SNAPTRADE_CONSUMER_KEY is wrong or rotated"
          : `client credential check failed${status ? ` with ${status}` : ""}`,
    };
  }
}
