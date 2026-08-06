import { Snaptrade, SnaptradeAuth } from "snaptrade-typescript-sdk";

type SnapTradeClient = InstanceType<typeof Snaptrade<ReturnType<typeof SnaptradeAuth.commercialApiKey>>>;

let cached: SnapTradeClient | null = null;

export function isSnapTradeConfigured(): boolean {
  return Boolean(process.env.SNAPTRADE_CLIENT_ID && process.env.SNAPTRADE_CONSUMER_KEY);
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
        clientId: process.env.SNAPTRADE_CLIENT_ID!,
        consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
      }),
    });
  }
  return cached;
}
