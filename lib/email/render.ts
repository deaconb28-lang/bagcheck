/**
 * The email shell — pure, and the only place email markup exists.
 *
 * Email clients have no stylesheet, no custom properties and, in several of
 * them, no `<style>` block that survives. So this file repeats the palette as
 * literal values and inlines every rule, for the same reason
 * `app/og/[slug]/render.tsx` does: a message that leaves the app carries none
 * of the app with it. Keep the values in step with the `--share-*` tokens.
 *
 * Everything renders on the ink field in both modes, like a share card, and
 * every message ships a plain-text half — a brief that only exists as HTML is
 * unreadable in half the places people read mail.
 */

const BG = "#17140F";
const S1 = "#211D17";
const INK = "#FDFCFA";
const DIM = "rgba(253,252,250,.52)";
const LINE = "rgba(253,252,250,.09)";
const MOSS = "#4FB287";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export interface EmailBlock {
  /** Mono label above the figure. */
  eyebrow: string;
  /** The figure itself, in the serif. */
  value: string;
  /** One line under it, carrying a specific comparison. */
  tail: string;
}

export interface EmailContent {
  subject: string;
  /** The one sentence at the top. Never a question, never a prompt to act. */
  lede: string;
  blocks: EmailBlock[];
  /** Mono line at the foot — where the numbers came from. */
  provenance: string;
  /** The single link. There is never a second one competing with it. */
  cta: { label: string; href: string };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderHtml(content: EmailContent, unsubscribeUrl: string): string {
  const blocks = content.blocks
    .map(
      (b) => `
      <tr><td style="padding:0 0 26px">
        <div style="font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${DIM};padding-bottom:6px">${esc(b.eyebrow)}</div>
        <div style="font-family:${SERIF};font-size:44px;line-height:1;font-weight:700;color:${MOSS};padding-bottom:8px">${esc(b.value)}</div>
        <div style="font-family:${SANS};font-size:14px;line-height:1.6;color:${DIM}">${esc(b.tail)}</div>
      </td></tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;padding:0;background:${BG}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${S1};border-radius:26px">
      <tr><td style="padding:32px 30px 0">
        <div style="font-family:${MONO};font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${DIM}">Supercruise</div>
      </td></tr>
      <tr><td style="padding:18px 30px 26px">
        <div style="font-family:${SANS};font-size:16px;line-height:1.65;color:${INK}">${esc(content.lede)}</div>
      </td></tr>
      <tr><td style="padding:0 30px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${blocks}</table>
      </td></tr>
      <tr><td style="padding:0 30px 26px">
        <a href="${esc(content.cta.href)}" style="display:inline-block;font-family:${SANS};font-size:14px;font-weight:600;color:${BG};background:${INK};text-decoration:none;padding:12px 20px;border-radius:14px">${esc(content.cta.label)}</a>
      </td></tr>
      <tr><td style="padding:20px 30px 28px;border-top:1px solid ${LINE}">
        <div style="font-family:${MONO};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${DIM};padding-bottom:10px">${esc(content.provenance)}</div>
        <a href="${esc(unsubscribeUrl)}" style="font-family:${MONO};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${DIM}">Stop these emails</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function renderText(content: EmailContent, unsubscribeUrl: string): string {
  const blocks = content.blocks
    .map((b) => `${b.eyebrow.toUpperCase()}\n${b.value}\n${b.tail}`)
    .join("\n\n");
  return [
    content.lede,
    "",
    blocks,
    "",
    `${content.cta.label}: ${content.cta.href}`,
    "",
    content.provenance,
    `Stop these emails: ${unsubscribeUrl}`,
  ].join("\n");
}
