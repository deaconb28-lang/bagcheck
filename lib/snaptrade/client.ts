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
