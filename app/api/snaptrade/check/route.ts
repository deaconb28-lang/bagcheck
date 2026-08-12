import { NextResponse, type NextRequest } from "next/server";
import { getSnapTrade, isSnapTradeConfigured } from "@/lib/snaptrade/client";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * TEMPORARY — does the connection portal mint, and does it accept our
 * callback?
 *
 * The credentials live in the deployment and nowhere else, so the only place
 * this question can be answered is inside it. It registers a throwaway
 * SnapTrade identity, then asks for a portal URL twice — once with the real
 * `customRedirect` and once without — because that pair is what separates
 * "SnapTrade is unreachable" from "SnapTrade is fine but the redirect is not
 * whitelisted", which look identical from the outside.
 *
 * Delete this route and its token once the answer is known.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SNAPTRADE_CHECK_TOKEN;
  if (!secret) return new Response("Not found", { status: 404 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSnapTradeConfigured()) {
    return NextResponse.json({ error: "SnapTrade is not configured" }, { status: 503 });
  }

  const callback = new URL("/api/snaptrade/callback", req.url).toString();
  const snaptrade = getSnapTrade();
  const probeUser = "diagnostic-probe";
  const out: Record<string, unknown> = { callback };

  let userSecret: string | null = null;
  try {
    const res = await snaptrade.authentication.registerSnapTradeUser({ userId: probeUser });
    userSecret = res.data.userSecret ?? null;
    out.register = "ok";
  } catch (err) {
    // Already registered is a success for our purposes, but we cannot recover
    // the secret — so delete and re-register to get a usable one.
    out.register = describe(err);
    try {
      await snaptrade.authentication.deleteSnapTradeUser({ userId: probeUser });
      const res = await snaptrade.authentication.registerSnapTradeUser({ userId: probeUser });
      userSecret = res.data.userSecret ?? null;
      out.register = "ok after re-register";
    } catch (err2) {
      out.reregister = describe(err2);
    }
  }

  if (!userSecret) {
    return NextResponse.json({ ...out, verdict: "could not register a probe user" });
  }

  out.withRedirect = await attempt(() =>
    snaptrade.authentication.loginSnapTradeUser({
      userId: probeUser,
      userSecret,
      customRedirect: callback,
      connectionType: "read",
    }),
  );

  out.withoutRedirect = await attempt(() =>
    snaptrade.authentication.loginSnapTradeUser({
      userId: probeUser,
      userSecret,
      connectionType: "read",
    }),
  );

  // Tidy up: the probe identity is not a user and should not linger.
  try {
    await snaptrade.authentication.deleteSnapTradeUser({ userId: probeUser });
    out.cleanup = "ok";
  } catch (err) {
    out.cleanup = describe(err);
  }

  const withOk = (out.withRedirect as { ok?: boolean })?.ok;
  const withoutOk = (out.withoutRedirect as { ok?: boolean })?.ok;
  out.verdict =
    withOk && withoutOk
      ? "portal mints with our callback — the redirect is accepted"
      : !withOk && withoutOk
        ? "portal mints only without the callback — the redirect URI is not whitelisted"
        : "portal does not mint at all — credentials or connectivity";

  return NextResponse.json(out);
}

async function attempt(run: () => Promise<{ data: unknown }>): Promise<unknown> {
  try {
    const res = await run();
    const url = (res.data as { redirectURI?: string })?.redirectURI ?? null;
    return { ok: Boolean(url), host: url ? new URL(url).host : null };
  } catch (err) {
    return { ok: false, error: describe(err) };
  }
}

/** Whatever the SDK threw, as something readable — never the credentials. */
function describe(err: unknown): string {
  const anyErr = err as {
    status?: number;
    responseBody?: unknown;
    message?: string;
  };
  const body =
    typeof anyErr?.responseBody === "string"
      ? anyErr.responseBody
      : anyErr?.responseBody
        ? JSON.stringify(anyErr.responseBody)
        : null;
  return [anyErr?.status ? `HTTP ${anyErr.status}` : null, body, anyErr?.message]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 600);
}
