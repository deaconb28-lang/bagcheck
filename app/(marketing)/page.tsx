import type { Metadata } from "next";
import Link from "next/link";
import { CAPABILITY_LABEL, FREE_ALWAYS, TIER_PRICE, TRIAL_DAYS } from "@/lib/tiers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { MarketingFooter, MarketingNav } from "./Chrome";
import { GoToApp, isSignedIn } from "./GoToApp";
import { FirstWeek } from "./FirstWeek";
import { PnlChart } from "./PnlChart";
import { WaitlistForm } from "./WaitlistForm";
import { WrappedDeck } from "./WrappedDeck";
import styles from "./landing.module.css";

/*
 * The one page whose title is not run through the root template — a landing
 * called "canopy · canopy" is what a template does when nobody checks.
 */
export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

/*
 * The landing: a white hero over a dark field that runs from the Wrapped deck
 * to the footer.
 *
 * The nav reads the launch lock and whether sign-in is configured, and a
 * statically prerendered page freezes both at build time — the same failure
 * that made every redirect stub answer with the locked landing until it was
 * marked dynamic. Flipping APP_LOCKED must take effect on the next request,
 * not on the next build.
 */
export const dynamic = "force-dynamic";

function Check({ tone }: { tone: "green" | "violet" | "white" }) {
  const stroke =
    tone === "green" ? "var(--mk-green-soft)" : tone === "violet" ? "var(--mk-violet-soft)" : "var(--mk-bg)";
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

function StatusIcons() {
  return (
    <span className={styles.statusIcons}>
      <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="4.5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="9" y="3" width="3" height="9" rx="1" />
        <rect x="13.5" y="0" width="3" height="12" rx="1" />
      </svg>
      <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
        <rect x="0.6" y="0.6" width="21" height="10.8" rx="3.2" stroke="currentColor" strokeOpacity="0.6" />
        <rect x="2.4" y="2.4" width="16" height="7.2" rx="2" fill="currentColor" />
      </svg>
    </span>
  );
}

function ShareIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

const HOLDINGS = [
  { tile: "NV", tone: "nvda", sym: "NVDA", qty: "61.4 shares", val: "$61,204", ret: "+214.6%", dir: "up" },
  { tile: "AA", tone: "aapl", sym: "AAPL", qty: "88 shares", val: "$24,780", ret: "+18.2%", dir: "up" },
  { tile: "₿", tone: "btc", sym: "BTC", qty: "0.41 BTC", val: "$38,140", ret: "+41.0%", dir: "up" },
  { tile: "TS", tone: "tsla", sym: "TSLA", qty: "42 shares", val: "$9,842", ret: "−22.4%", dir: "down" },
] as const;

const WRAP_TILES = [
  { label: "TOP BAG", value: "NVDA", tail: "41% of book", tone: "green" },
  { label: "BEST TRADE", value: "+$18,402", tail: "Mar 14 · NVDA", tone: "green" },
  { label: "DIAMOND HANDS", value: "411 days", tail: "Longest hold", tone: "mute" },
  { label: "ONE THAT GOT AWAY", value: "TSLA", tail: "Sold 9 days early", tone: "red" },
] as const;

export default async function LandingPage() {
  /* Whether to say "Get started free" or "Go to app" at the top of the page. */
  const signedIn = await isSignedIn();
  /*
   * Wrapped is open; the score is not. So the primary CTA hands off to the
   * connect flow and the waitlist keeps its own button for the second act —
   * two doors, each labelled with what is actually behind it.
   */
  return (
    <main className={styles.page}>
      <MarketingNav />

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          {/*
            * The stacked-circle pill, kept — but the circles are broker marks
            * rather than invented faces.
            *
            * It read "Loved by 320K investors · 4.9 rating" over three drawn
            * people, on the launch day of a product with no users. The
            * treatment was the good part; the content was a fabricated review
            * count, which is a bad idea on any landing and a liability on a
            * financial one.
            *
            * Broker coverage is what actually answers the first question a
            * visitor has, and the number is the one `/start` already states
            * rather than a new claim invented for the hero.
            */}
          <div className={styles.ratingPill}>
            <span className={styles.brokers} aria-hidden="true">
              <i data-broker="rh">RH</i>
              <i data-broker="fid">FID</i>
              <i data-broker="sch">SCH</i>
            </span>
            <span>Robinhood, Fidelity, Schwab and 20+ more</span>
          </div>
          <h1 className={styles.h1}>
            <span className={styles.h1Strong}>Meet canopy</span>
            <span>Turn your portfolio</span>
            <span>into a flex</span>
          </h1>
          <p className={styles.lede}>
            Connect your brokerage in two taps through SnapTrade. Canopy reads
            the numbers and turns your year into a Wrapped worth posting —
            returns, top holdings, best trades, and the ones that got away.
          </p>
          {/*
            * The hero's first action depends on whether the reader has an
            * account. "Get started free" is what you say to someone who has
            * not started; a returning reader who lands here has, and used to
            * have no way into the product from the page that sells it.
            */}
          <div className={styles.heroActions}>
            {signedIn ? (
              <Link href="/you" className={styles.ctaDark}>
                Go to app
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <Link href="/start" className={styles.ctaDark}>
                Get started free
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </Link>
            )}
            {signedIn ? null : <GoToApp />}
            <a href="#waitlist" className={styles.ctaGhost}>
              Join the waitlist
            </a>
          </div>
        </div>

        <div className={styles.heroArt} aria-hidden="true">
          {/* Portfolio phone — a dark handset holding a light account card */}
          <div className={styles.phoneShell} data-phone="portfolio">
            <div className={styles.phoneScreen}>
              <div className={styles.screenField} />
              <div className={styles.acctCard}>
                <div className={styles.acctHead}>
                  <span>Portfolio</span>
                  <span className={styles.connected}>
                    <i />
                    Connected
                  </span>
                </div>
                <div className={styles.bigMoney}>
                  $148,392<span>.11</span>
                </div>
                <div className={styles.deltaLine}>
                  <b>▲ $12,204.86</b>
                  <span>+8.96%</span>
                  <i>1Y</i>
                </div>
                <svg className={styles.spark} viewBox="0 0 280 96" preserveAspectRatio="none">
                  <path
                    d="M0 74 L18 68 L34 78 L52 60 L70 66 L88 48 L104 56 L122 40 L140 52 L158 34 L176 42 L194 26 L212 33 L230 18 L248 24 L266 10 L280 14 L280 96 L0 96 Z"
                    fill="color-mix(in srgb, var(--mk-green) 10%, transparent)"
                  />
                  <path
                    d="M0 74 L18 68 L34 78 L52 60 L70 66 L88 48 L104 56 L122 40 L140 52 L158 34 L176 42 L194 26 L212 33 L230 18 L248 24 L266 10 L280 14"
                    fill="none"
                    stroke="var(--mk-green)"
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
                <div className={styles.holdings}>
                  {HOLDINGS.map((h) => (
                    <div key={h.sym} className={styles.holding}>
                      <span className={styles.holdTile} data-tone={h.tone}>
                        {h.tile}
                      </span>
                      <span className={styles.holdName}>
                        <b>{h.sym}</b>
                        <i>{h.qty}</i>
                      </span>
                      <span className={styles.holdVal}>
                        <b>{h.val}</b>
                        <i data-dir={h.dir}>{h.ret}</i>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.statusBar}>
                <span>9:41</span>
                <StatusIcons />
              </div>
              <div className={styles.screenNav}>
                <span className={styles.navBubble}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </span>
                <b>Accounts</b>
                <span className={styles.navBubble} data-dots="">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className={styles.screenFoot}>
                <div className={styles.acctChips}>
                  <span data-acct="rh">RH</span>
                  <span data-acct="fid">FID</span>
                  <span data-acct="sch">SCH</span>
                  <span data-acct="add">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </div>
                <div className={styles.secured}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="10" width="16" height="11" rx="3" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  Read-only, secured by SnapTrade
                </div>
              </div>
            </div>
          </div>

          {/* The equity line leaves the chart and points at the Wrapped */}
          <svg className={styles.heroCurl} viewBox="0 0 150 120" fill="none">
            <path
              d="M4 22c34-22 66 6 52 30-9 15-30 6-22-10 10-19 48-24 88-6"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M112 26l14 10-17 8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Wrapped phone */}
          <div className={styles.phoneShell} data-phone="wrapped">
            <div className={styles.phoneScreen} data-violet="">
              <div className={styles.wrapTop}>
                <div className={styles.statusBar} data-inline="">
                  <span>9:41</span>
                  <StatusIcons />
                </div>
                <div className={styles.screenNav} data-inline="">
                  <span className={styles.navBubble}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 5l-7 7 7 7" />
                    </svg>
                  </span>
                  <b>Your Wrapped</b>
                  <span className={styles.navBubble} data-dots="">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
              <div className={styles.wrapBody}>
                <div className={styles.wrapCard}>
                  <span className={styles.wrapBlob} />
                  <div className={styles.wrapCardInner}>
                    <div className={styles.wrapCardHead}>
                      <span>2026 WRAPPED</span>
                      <span>@jordan</span>
                    </div>
                    <div className={styles.wrapReturn}>+38.4%</div>
                    <div className={styles.wrapSub}>Return this year · Top 3% of canopy</div>
                    <div className={styles.wrapChips}>
                      <span className={styles.typeChip}>The Conviction Buyer</span>
                      <span className={styles.tradesChip}>142 trades</span>
                    </div>
                  </div>
                </div>
                <div className={styles.wrapTiles}>
                  {WRAP_TILES.map((t) => (
                    <div key={t.label} className={styles.wrapTile}>
                      <i>{t.label}</i>
                      <b>{t.value}</b>
                      <em data-tone={t.tone}>{t.tail}</em>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.wrapActions}>
                <span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
                    <path d="M20 4v7h-7" />
                  </svg>
                  Remix
                </span>
                <span data-primary="">
                  <ShareIcon size={15} />
                  Share Wrapped
                </span>
              </div>
              <span className={styles.phoneHandle} />
            </div>

            <div className={`${styles.bubble} ${styles.bestDayBubble}`}>
              <i>Best day</i>
              <b>+$8,412</b>
            </div>
            <div className={`${styles.bubble} ${styles.winRateBubble}`}>
              <i>Win rate</i>
              <b>64%</b>
            </div>
            <div className={`${styles.bubble} ${styles.topBagBubble}`}>
              <i>Top bag</i>
              <b>NVDA 41%</b>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Wrapped deck ── */}
      <section id="deck" className={styles.deckSection}>
        <WrappedDeck
          faces={[
            <div key="return" className={styles.card} data-card="return">
              <div className={styles.cardHead}>
                <span>2026 WRAPPED</span>
                <span>@jordan</span>
              </div>
              <div>
                <div className={styles.cardHuge}>+38.4%</div>
                <div className={styles.cardTail}>Return this year</div>
              </div>
              <span className={styles.cardPill}>
                <i />
                Top 3% of canopy
              </span>
            </div>,

            <div key="topbag" className={styles.card} data-card="topbag">
              <span className={styles.cardEyebrow}>TOP BAG</span>
              <div className={styles.cardRing}>
                <svg width="210" height="210" viewBox="0 0 210 210">
                  <circle cx="105" cy="105" r="85" fill="none" stroke="color-mix(in srgb, var(--mk-bg) 8%, transparent)" strokeWidth="22" />
                  <circle
                    cx="105"
                    cy="105"
                    r="85"
                    fill="none"
                    stroke="var(--mk-green-soft)"
                    strokeWidth="22"
                    strokeLinecap="round"
                    strokeDasharray="534"
                    strokeDashoffset="315"
                    transform="rotate(-90 105 105)"
                  />
                </svg>
                <div className={styles.cardRingNum}>
                  <b>NVDA</b>
                  <i>41% of book</i>
                </div>
              </div>
              <div className={styles.cardBars}>
                {[
                  ["AAPL", 41, "17%", "violet"],
                  ["BTC", 62, "26%", "amber"],
                  ["TSLA", 24, "9%", "red"],
                ].map(([sym, w, pct, tone]) => (
                  <div key={sym as string}>
                    <span>{sym}</span>
                    <span className={styles.cardTrack}>
                      <i data-tone={tone as string} style={{ width: `${w}%` }} />
                    </span>
                    <span>{pct}</span>
                  </div>
                ))}
              </div>
            </div>,

            <div key="trade" className={styles.card} data-card="trade">
              <span className={styles.cardEyebrow}>BEST TRADE</span>
              <div className={styles.cardLine}>
                <svg viewBox="0 0 270 190" preserveAspectRatio="none">
                  <path
                    d="M0 168 L26 150 L52 162 L78 128 L104 138 L130 96 L156 108 L182 62 L208 74 L234 30 L270 8"
                    fill="none"
                    stroke="var(--mk-bg)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={styles.cardDot} />
              </div>
              <div>
                <div className={styles.cardBig}>+$18,402</div>
                <div className={styles.cardTail}>Mar 14 · NVDA · held 9 months</div>
              </div>
            </div>,

            <div key="hands" className={styles.card} data-card="hands">
              <span className={styles.cardEyebrow}>DIAMOND HANDS</span>
              <div className={styles.cardWave}>
                {[34, 58, 45, 100, 71, 52].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} data-peak={h === 100 || undefined} />
                ))}
              </div>
              <div>
                <div className={styles.cardHuge}>411</div>
                <div className={styles.cardTail}>Days on your longest hold</div>
              </div>
            </div>,

            <div key="type" className={styles.card} data-card="type">
              <span className={styles.cardEyebrow}>YOUR TYPE</span>
              <div>
                <div className={styles.cardName}>
                  The
                  <br />
                  Conviction
                  <br />
                  Buyer
                </div>
                <div className={styles.cardTraits}>
                  {[
                    ["Concentration", "High", 84, "violet"],
                    ["Patience", "Elite", 92, "amber"],
                    ["Panic selling", "Rare", 22, "green"],
                  ].map(([k, v, w, tone]) => (
                    <div key={k as string}>
                      <div className={styles.cardTraitHead}>
                        <span>{k}</span>
                        <span>{v}</span>
                      </div>
                      <span className={styles.cardTraitTrack}>
                        <i data-tone={tone as string} style={{ width: `${w}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <span className={styles.cardShare}>
                <ShareIcon />
                Share Wrapped
              </span>
            </div>,
          ]}
        />
      </section>

      {/* ── Coming soon: the score, and what it reads ── */}
      <section id="soon" className={styles.soon}>
        <div className={styles.soonGlowVioleta} aria-hidden="true" />
        <div className={styles.soonGlowAmber} aria-hidden="true" />

        <div className={styles.soonTop}>
          <div className={styles.soonCopy}>
            <span className={styles.soonTag}>
              <i />
              COMING SOON
            </span>
            <h2 className={styles.h2}>
              Transform the way
              <br />
              you trade.
            </h2>
            <p className={styles.lede}>
              Whoop for your portfolio. Strain, recovery and risk — read every
              morning, no spreadsheet required.
            </p>
            <WaitlistForm tier="waitlist" cta="Join the waitlist" />
            <p className={styles.fine}>Read-only, via SnapTrade. Cancel any time.</p>
          </div>

          <div className={styles.healthCard} aria-hidden="true">
            <div className={styles.healthHead}>
              <span>Tuesday, 9 Aug</span>
              <b>PREVIEW</b>
            </div>
            <div className={styles.healthTop}>
              <div className={styles.healthRing}>
                <svg width="150" height="150" viewBox="0 0 150 150">
                  <circle cx="75" cy="75" r="65" fill="none" stroke="color-mix(in srgb, var(--mk-bg) 8%, transparent)" strokeWidth="10" />
                  <circle cx="75" cy="75" r="53" fill="none" stroke="color-mix(in srgb, var(--mk-bg) 8%, transparent)" strokeWidth="10" />
                  <circle
                    cx="75"
                    cy="75"
                    r="65"
                    fill="none"
                    stroke="var(--mk-violet-soft)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="409"
                    strokeDashoffset="123"
                    transform="rotate(-90 75 75)"
                  />
                  <circle
                    cx="75"
                    cy="75"
                    r="53"
                    fill="none"
                    stroke="var(--mk-amber)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="333"
                    strokeDashoffset="183"
                    transform="rotate(-90 75 75)"
                  />
                </svg>
                <div className={styles.healthNum}>
                  <b>71</b>
                  <i>HEALTH</i>
                </div>
              </div>
              <div className={styles.healthStats}>
                <div>
                  <span>STRAIN</span>
                  <b>14.2</b>
                </div>
                <div>
                  <span>TODAY&rsquo;S PERFORMANCE</span>
                  <b data-tone="red">−4.8%</b>
                </div>
                <div>
                  <span>YTD PERFORMANCE</span>
                  <b data-tone="green">+75%</b>
                </div>
              </div>
            </div>
            <div className={styles.healthDays}>
              <span className={styles.healthDaysLabel}>LAST 14 DAYS</span>
              <div className={styles.healthBars}>
                {[38, 52, 31, 64, 44, 72, 57, 83, 49, 68, 41, 76, 59, 100].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} data-today={h === 100 || undefined} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.insights}>
          <PnlChart />

          <div className={styles.insightRow}>
            <div className={styles.insight}>
              <span className={styles.insightEyebrow}>WEEKDAY PATTERN</span>
              <div className={styles.weekWrap}>
                <span className={styles.weekFlag}>−0.8%</span>
                <span className={styles.weekAxis} />
                {[
                  ["M", 0, 44, "red"],
                  ["T", 26, 0, ""],
                  ["W", 15, 0, ""],
                  ["T", 40, 0, ""],
                  ["F", 22, 0, ""],
                ].map(([d, up, down, tone], i) => (
                  <div key={`${d}${i}`} className={styles.weekCol}>
                    <span className={styles.weekUp}>
                      <i style={{ height: `${up}px` }} data-tone={(tone as string) || undefined} />
                    </span>
                    <span className={styles.weekDown}>
                      <i style={{ height: `${down}px` }} data-tone={(tone as string) || undefined} />
                    </span>
                    <b data-tone={(tone as string) || undefined}>{d}</b>
                  </div>
                ))}
              </div>
              <div className={styles.insightHead}>−0.8% on Mondays</div>
              <p>Your Monday positions underperform the rest of your week by 1.1 points.</p>
            </div>

            <div className={styles.insight}>
              <span className={styles.insightEyebrow}>HOLDING BEHAVIOUR</span>
              <div className={styles.holdRows}>
                <div>
                  <div className={styles.holdRowHead}>
                    <span>Winners</span>
                    <span>41 days</span>
                  </div>
                  <span className={styles.holdTrack}>
                    <i style={{ width: "31%" }} data-tone="green" />
                  </span>
                </div>
                <div>
                  <div className={styles.holdRowHead}>
                    <span>Losers</span>
                    <span>132 days</span>
                  </div>
                  <span className={styles.holdTrack}>
                    <i style={{ width: "100%" }} data-tone="red" />
                  </span>
                </div>
              </div>
              <div className={styles.insightHead}>Winners cut 3.2× faster</div>
              <p>You hold losers 132 days on average and winners just 41.</p>
            </div>

            <div className={styles.insight}>
              <span className={styles.insightEyebrow}>ENTRY TIMING</span>
              <div className={styles.timeWrap}>
                <div className={styles.timeBar}>
                  <span className={styles.timeBand} />
                  <span className={styles.timeAxis} />
                </div>
                <div className={styles.timeTicks}>
                  <span>9:30</span>
                  <span>12:00</span>
                  <span>16:00</span>
                </div>
              </div>
              <div className={styles.insightHead}>9:45 – 10:15</div>
              <p>Two thirds of your profitable entries land in the first hour.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The first week, day by day ── */}
      <FirstWeek />

      {/*
       * ── The plans ──
       *
       * This was three waitlist tiers with prices nobody could pay: $5 once
       * "refunded if we miss our launch window", $9/mo "with early access",
       * $18/mo "at launch". Checkout is live now and charges $9, so those
       * three cards were selling a different product from the one behind the
       * button. Two real plans and the score's waitlist, which is the only
       * thing here that is genuinely still coming.
       */}
      <section id="waitlist" className={styles.waitlist}>
        <div className={styles.waitGlow} aria-hidden="true" />
        <div className={styles.waitInner}>
          <div className={styles.waitHead}>
            <div>
              {/* Not the pricing page's own headline — a reader who clicks
                  through should not meet the same sentence twice. */}
              <span className={styles.eyebrow}>THE PLANS</span>
              <h2 className={styles.h2}>Two plans. One of them is free.</h2>
            </div>
            <p className={styles.waitCount}>Every card you earn is yours on either one</p>
          </div>

          <div className={styles.tiers}>
            <div className={styles.tier}>
              <span className={styles.tierLabel}>FREE</span>
              <div className={styles.tierPrice}>
                <b>$0</b>
                <span>forever</span>
              </div>
              <p className={styles.tierNote} data-mute="">
                No card to start
              </p>
              <ul className={styles.tierList}>
                {FREE_ALWAYS.map((f) => (
                  <li key={f}>
                    <Check tone="green" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/start" className={styles.tierCta}>
                Get started free
              </Link>
            </div>

            <div className={styles.tier} data-popular="">
              <span className={styles.popular}>
                <i />
                {TRIAL_DAYS} DAYS FREE
              </span>
              <span className={styles.tierLabel}>PRO</span>
              <div className={styles.tierPrice}>
                <b>${TIER_PRICE.pro.monthly}</b>
                <span>/mo</span>
              </div>
              <p className={styles.tierNote}>Everything free has, plus the formats</p>
              <ul className={styles.tierList}>
                {Object.values(CAPABILITY_LABEL).map((f) => (
                  <li key={f}>
                    <Check tone="white" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className={styles.tierCta} data-solid="">
                What Pro adds
              </Link>
            </div>

            <div className={styles.tier}>
              <span className={styles.tierLabel}>THE SCORE</span>
              <div className={styles.tierPrice}>
                <b>Soon</b>
              </div>
              <p className={styles.tierNote} data-mute="">
                Wrapped is live today; the score is the second act
              </p>
              <ul className={styles.tierList}>
                {[
                  "A daily read on how you are handling the account",
                  "Four components, each one measured",
                  "An email the day it opens",
                ].map((f) => (
                  <li key={f}>
                    <Check tone="violet" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <WaitlistForm tier="waitlist" cta="Join the waitlist" />
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
