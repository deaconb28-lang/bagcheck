/**
 * The email shell — pure, and the only place email markup exists.
 *
 * Email clients have no stylesheet, no custom properties and, in several of
 * them, no `<style>` block that survives. So this file repeats the palette as
 * literal values and inlines every rule, for the same reason
 * `app/og/[slug]/render.tsx` does: a message that leaves the app carries none
 * of the app with it.
 *
 * ── It is a light room ────────────────────────────────────────────────────
 *
 * This was the app's black field with a plate on it. An inbox is a light
 * room, and a black message sitting in a white thread reads as an advert
 * rather than as mail — so the message is white with near-black ink, spoken
 * in the `--mk-*` values the landing page already uses. The black comes back
 * at the two ends: a band carrying the wordmark, and a foot carrying the
 * mark. Keep the literals below in step with those tokens.
 *
 * ── No webfont ────────────────────────────────────────────────────────────
 *
 * The hero is set in Arial Black rather than the product's Anton. Gmail
 * strips `@font-face`, so a webfont would give two different emails — one
 * for Apple Mail and a heavier, wider one for everybody else. A face that is
 * already on every machine is one design in every client, which is worth
 * more here than the exact letterform.
 */

const PAPER = "#ffffff";
const INK = "#0b0b0c";
const INK2 = "#4b4b52";
const INK3 = "#6b7280";
const LINE = "#e6e6ea";
/** The green that clears 4.5:1 on white — `--mk-green-ink`, not `--moss`. */
const GREEN = "#0c6f37";
const RED = "#b3132f";
/** The product's own written voice. */
const VIOLET = "#7c3aed";
const FIELD = "#0b0b12";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const HEAVY = "'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export interface EmailBlock {
  /** Mono label above the figure. */
  eyebrow: string;
  /** The figure itself. */
  value: string;
  /**
   * One line under it, carrying a specific comparison.
   *
   * Optional now: in the row at the foot of the letter a figure stands on its
   * label alone, and a sentence under each of three would be a paragraph
   * pretending to be a table.
   */
  tail?: string;
  /**
   * What kind of measurement the figure is, which is what decides its colour.
   * Absent means `count`, so a block that does not think about it is set in
   * ink rather than accidentally claiming to be money.
   */
  tone?: "score" | "count" | "moss" | "loss";
}

export interface EmailContent {
  subject: string;
  /** Mono line at the head, naming which of the two messages this is. */
  eyebrow?: string;
  /**
   * The figure, if this message leads with one.
   *
   * A letter reads slower than a poster, and the numeral is what buys the
   * speed back: it lands first, and the sentence under it explains it.
   */
  hero?: { value: string; delta?: string; deltaUp?: boolean; tail?: string };
  /** The one sentence set large. A statement, never a question. */
  headline?: string;
  /** The one sentence at the top. Never a question, never a prompt to act. */
  lede: string;
  /**
   * Body copy, one string per paragraph. A newline inside a single string
   * renders as a space, which is why paragraphs are a list rather than text.
   */
  paragraphs?: string[];
  blocks: EmailBlock[];
  /** Mono line at the foot — where the numbers came from. */
  provenance: string;
  /** The single link. There is never a second one competing with it. */
  cta: { label: string; href: string };
}

const FIGURE: Record<NonNullable<EmailBlock["tone"]>, string> = {
  score: INK,
  count: INK,
  moss: GREEN,
  loss: RED,
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The dart, drawn from `SupercruiseMark`'s own geometry, in currentColor. */
const MARK = `<svg width="46" height="46" viewBox="0 0 34 34" fill="none">
<circle cx="17" cy="17" r="13" pathLength="100" stroke="currentColor" stroke-width="2" stroke-dasharray="37 13 37 13" stroke-dashoffset="6" stroke-linecap="butt"/>
<path d="M28 5.6 L9.6 16.8 L16.7 19.2 L17.3 26.4 Z" fill="currentColor"/>
<path d="M13.4 22.8 L7.2 29" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
<path d="M8.4 18.8 L3 24.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".7"/></svg>`;

/*
 * The phone. A `<style>` block is stripped by a few clients, which is why
 * every rule here only ever makes something *smaller* — the inlined values
 * are the design, and a client that drops this shows the desktop sizes on a
 * fluid table rather than a broken layout.
 */
const RESPONSIVE = `
<style>
@media only screen and (max-width:600px){
  .pad{padding-left:22px!important;padding-right:22px!important}
  .hero{font-size:96px!important}
  .head{font-size:26px!important}
  .body{font-size:16px!important}
  .fact{display:block!important;width:100%!important;padding:0 0 18px!important}
}
</style>`;

export function renderHtml(content: EmailContent, unsubscribeUrl: string): string {
  const facts = content.blocks
    .map(
      (b) => `<td class="fact" valign="top" style="padding:0 26px 0 0;white-space:nowrap">
        <div style="font-family:${MONO};font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:${INK3};padding-bottom:6px">${esc(b.eyebrow)}</div>
        <div style="font-family:${SANS};font-size:19px;font-weight:700;letter-spacing:-.02em;color:${FIGURE[b.tone ?? "count"]}">${esc(b.value)}</div>
        ${b.tail ? `<div style="font-family:${SANS};font-size:13px;line-height:1.5;color:${INK3};padding-top:5px;white-space:normal">${esc(b.tail)}</div>` : ""}
      </td>`,
    )
    .join("");

  const hero = content.hero
    ? `<tr><td class="pad" style="padding:0 34px">
        <div class="hero" style="font-family:${HEAVY};font-size:118px;line-height:.98;letter-spacing:-.045em;color:${INK}">${esc(content.hero.value)}</div>
        ${
          content.hero.delta
            ? `<div style="padding:12px 0 26px">
          <span style="font-family:${MONO};font-size:12px;letter-spacing:.06em;color:${content.hero.deltaUp === false ? RED : GREEN}">${esc(content.hero.delta)}</span>
          ${content.hero.tail ? `<span style="font-family:${SANS};font-size:13px;color:${INK3}">&nbsp;${esc(content.hero.tail)}</span>` : ""}
        </div>`
            : `<div style="height:26px"></div>`
        }
      </td></tr>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
${RESPONSIVE}</head>
<body style="margin:0;padding:0;background:${LINE}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${LINE}">
  <tr><td align="center" style="padding:0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${PAPER}">

      <tr><td class="pad" style="background:${INK};padding:15px 34px">
        <table role="presentation" width="100%"><tr>
          <td style="font-family:${MONO};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${PAPER}">SUPERCRUISE</td>
          <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.55)">${esc(content.provenance)}</td>
        </tr></table>
      </td></tr>

      ${
        content.eyebrow
          ? `<tr><td class="pad" style="padding:36px 34px 14px">
        <div style="font-family:${MONO};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${VIOLET}">${esc(content.eyebrow)}</div>
      </td></tr>`
          : `<tr><td style="height:36px"></td></tr>`
      }

      ${hero}

      ${
        content.headline
          ? `<tr><td class="pad" style="padding:0 34px">
        <div class="head" style="font-family:${SANS};font-size:30px;font-weight:700;line-height:1.24;letter-spacing:-.025em;color:${INK}">${esc(content.headline)}</div>
      </td></tr>`
          : ""
      }

      <tr><td class="pad" style="padding:${content.headline ? "20px" : "0"} 34px 0">
        <div class="body" style="font-family:${SANS};font-size:17px;line-height:1.62;color:${VIOLET}">${esc(content.lede)}</div>
      </td></tr>

      ${(content.paragraphs ?? [])
        .map(
          (para) => `<tr><td class="pad" style="padding:16px 34px 0">
        <div class="body" style="font-family:${SANS};font-size:17px;line-height:1.62;color:${INK2}">${esc(para)}</div>
      </td></tr>`,
        )
        .join("")}

      ${
        content.blocks.length
          ? `<tr><td class="pad" style="padding:30px 34px 0">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>${facts}</tr></table>
      </td></tr>`
          : ""
      }

      <tr><td class="pad" style="padding:32px 34px 40px">
        <a href="${esc(content.cta.href)}" style="display:inline-block;font-family:${SANS};font-size:15px;font-weight:700;color:${INK};border:1.5px solid ${INK};text-decoration:none;padding:16px 34px;border-radius:999px">${esc(content.cta.label)}</a>
      </td></tr>

      <tr><td class="pad" style="background:${FIELD};padding:34px 34px 32px">
        <div style="color:rgba(255,255,255,.26)">${MARK}</div>
        <div style="font-family:${SANS};font-size:14px;font-weight:700;color:${PAPER};padding:16px 0 8px">Supercruise</div>
        <div style="font-family:${MONO};font-size:10px;line-height:1.9;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.48)">
          Read from your brokerage · nothing is ever traded<br>
          Two a week: Monday morning and Friday evening<br>
          <a href="${esc(unsubscribeUrl)}" style="color:rgba(255,255,255,.48)">Stop these emails</a>
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

export function renderText(content: EmailContent, unsubscribeUrl: string): string {
  const facts = content.blocks
    .map((b) => `${b.eyebrow.toUpperCase()}: ${b.value}${b.tail ? ` — ${b.tail}` : ""}`)
    .join("\n");
  return [
    ...(content.hero
      ? [`${content.hero.value}${content.hero.delta ? ` (${content.hero.delta}${content.hero.tail ? ` ${content.hero.tail}` : ""})` : ""}`, ""]
      : []),
    ...(content.headline ? [content.headline, ""] : []),
    content.lede,
    ...(content.paragraphs?.length ? ["", content.paragraphs.join("\n\n")] : []),
    "",
    facts,
    "",
    `${content.cta.label}: ${content.cta.href}`,
    "",
    content.provenance,
    `Stop these emails: ${unsubscribeUrl}`,
  ].join("\n");
}
