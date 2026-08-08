import { renderHtml, renderText } from "./render";
import type { EmailContent } from "./render";

/**
 * Resend, as a thin fetch client.
 *
 * No SDK, for the same reason Finnhub, logo.dev and The Noun Project have
 * none: one POST with a bearer token is not worth a dependency, and every
 * failure path here has to end in "the send did not happen" rather than in an
 * exception reaching a cron handler mid-loop.
 *
 * The key never leaves the server. There is no client-side send path and no
 * `NEXT_PUBLIC` variable involved.
 */

const ENDPOINT = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export interface SendResult {
  sent: boolean;
  id: string | null;
  error: string | null;
}

export async function sendEmail(
  to: string,
  content: EmailContent,
  unsubscribeUrl: string,
): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return { sent: false, id: null, error: "email is not configured" };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject: content.subject,
        html: renderHtml(content, unsubscribeUrl),
        text: renderText(content, unsubscribeUrl),
        /*
         * One-click unsubscribe, per RFC 8058. A daily email without it is
         * how a sender ends up in spam folders, and the product already
         * promises one notification a day rather than permission to nag.
         */
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, id: null, error: `resend ${res.status} ${body.slice(0, 200)}` };
    }
    const json = (await res.json()) as { id?: string };
    return { sent: true, id: json.id ?? null, error: null };
  } catch (err) {
    return { sent: false, id: null, error: err instanceof Error ? err.message : String(err) };
  }
}
