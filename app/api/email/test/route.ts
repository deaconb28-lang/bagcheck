import { NextResponse, type NextRequest } from "next/server";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import type { EmailContent } from "@/lib/email/render";

export const runtime = "nodejs";

/**
 * Proves the deployment can actually send, without waiting for a Monday.
 *
 * Email is the one integration whose failure is invisible from inside the
 * product: a wrong key, an unverified domain or a from-address on the wrong
 * subdomain all look identical to "nobody has opted in yet". Rotating the key
 * and finding out six days later is the bad version of that, so this is the
 * check.
 *
 *   curl -X POST https://…/api/email/test \
 *     -H "Authorization: Bearer $EMAIL_TEST_TOKEN"
 *
 * **It takes no recipient, and that is the whole security model.** The
 * addresses are `EMAIL_TEST_TO` — one, or several separated by commas — read
 * from the deployment, so the route cannot be pointed at a stranger. An ops
 * endpoint that accepted an address in its body would be an open mail relay
 * wearing a bearer token, and the from-address is a domain people are meant
 * to trust.
 *
 * A request *may* carry a `subject`, a `lede` and up to a handful of
 * `paragraphs`, because the other thing this route is good for is the note a
 * founder sends once. That widens what can be said, never who it reaches: the
 * worst a leaked token buys is arbitrary prose in the inboxes that already
 * configured themselves as the target.
 *
 * Without either variable the route does not exist: an admin action with no
 * secret configured is an open one, and a send target nobody chose is worse
 * than no route at all.
 *
 * **It carries no figures.** Everything this product prints comes off a
 * brokerage, and a delivery test has no brokerage behind it — so rather than
 * invent a score to decorate the check, the message says what it is. That
 * also makes it useful: what needs proving is the key, the domain, the
 * from-address and the template, none of which need a number.
 */
/** Prose from a request is capped: a body is a note, never a payload. */
const MAX_PARAGRAPHS = 8;
const MAX_CHARS = 1200;

export async function POST(req: NextRequest) {
  const secret = process.env.EMAIL_TEST_TOKEN;
  const to = process.env.EMAIL_TEST_TO;
  if (!secret || !to) return new Response("Not found", { status: 404 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "RESEND_API_KEY and EMAIL_FROM must both be set" },
      { status: 503 },
    );
  }

  const base = process.env.APP_URL || req.nextUrl.origin;

  const body = (await req.json().catch(() => ({}))) as {
    subject?: unknown;
    lede?: unknown;
    paragraphs?: unknown;
  };
  const str = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, MAX_CHARS) : fallback;
  const paragraphs = Array.isArray(body.paragraphs)
    ? body.paragraphs
        .filter((p): p is string => typeof p === "string" && Boolean(p.trim()))
        .slice(0, MAX_PARAGRAPHS)
        .map((p) => p.trim().slice(0, MAX_CHARS))
    : [];

  const content: EmailContent = {
    subject: str(body.subject, "Supercruise — delivery check"),
    lede: str(
      body.lede,
      "This is the configuration check, sent by hand. If it reached you, the key, the domain and the from-address are all good.",
    ),
    paragraphs,
    blocks: [
      {
        eyebrow: "What arrives from here",
        value: "Two a week",
        tail:
          "Monday morning, where you stand going in. Friday evening, the week once the market has closed it. Nothing else, and never a price.",
      },
    ],
    provenance: `Sent by hand · ${new Date().toISOString().slice(0, 10)} · no ledger was read`,
    cta: { label: "Open Supercruise", href: `${base}/you` },
  };

  /*
   * One send per address rather than one send with several in `To:`. Each
   * reader gets their own copy, nobody sees anyone else's address, and one
   * rejected recipient does not take the others down with it.
   */
  const addresses = to
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const results = [];
  for (const address of addresses) {
    results.push({ to: address, ...(await sendEmail(address, content, `${base}/profile`)) });
  }

  return NextResponse.json(
    { from: process.env.EMAIL_FROM, results },
    { status: results.every((r) => r.sent) ? 200 : 502 },
  );
}
