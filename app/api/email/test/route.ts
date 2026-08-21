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
 * **It takes no recipient.** The address is `EMAIL_TEST_TO`, read from the
 * deployment, so the route cannot be pointed at a stranger — the worst a
 * leaked token buys is another copy of this message in the one inbox that
 * already configured it. An ops endpoint that accepted an address in its body
 * would be an open mail relay wearing a bearer token.
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
  const content: EmailContent = {
    subject: "Supercruise — delivery check",
    lede:
      "This is the configuration check, sent by hand. If it reached you, the key, the domain and the from-address are all good.",
    blocks: [
      {
        eyebrow: "What arrives from here",
        value: "Two a week",
        tail:
          "Monday morning, where you stand going in. Friday evening, the week once the market has closed it. Nothing else, and never a price.",
      },
    ],
    provenance: `Delivery check · ${new Date().toISOString().slice(0, 10)} · no ledger was read`,
    cta: { label: "Open Supercruise", href: `${base}/you` },
  };

  const result = await sendEmail(to, content, `${base}/profile`);
  return NextResponse.json(
    { to, from: process.env.EMAIL_FROM, ...result },
    { status: result.sent ? 200 : 502 },
  );
}
