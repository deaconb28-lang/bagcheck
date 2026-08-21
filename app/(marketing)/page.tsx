import type { Metadata } from "next";
import Link from "next/link";
import { CAPABILITY_LABEL, PLAN_INCLUDES, TIER_PRICE, TRIAL_DAYS, priceLine } from "@/lib/tiers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { MarketingFooter, MarketingNav } from "./Chrome";
import { GoToApp, isSignedIn } from "./GoToApp";
import { StartFree } from "./StartFree";
import { FirstWeek } from "./FirstWeek";
import { PnlChart } from "./PnlChart";
import { WrappedDeck } from "./WrappedDeck";
import styles from "./landing.module.css";

/*
 * The one page whose title is not run through the root template — a landing
 * called "supercruise · supercruise" is what a template does when nobody checks.
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

function ShareIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export default async function LandingPage() {
  /* Whether to say "Get started free" or "Go to app" at the top of the page. */
  const signedIn = await isSignedIn();
  /*
   * Two doors and no form. The primary hands off to the connect flow; the
   * ghost goes to the price, which is the other thing a stranger wants to
   * know. There is no third: a waitlist for a feature with no date collects
   * addresses against a promise this repository cannot keep.
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
            <span className={styles.h1Strong}>Meet supercruise</span>
            <span>A fitness tracker</span>
            <span>for your portfolio</span>
          </h1>
          <p className={styles.lede}>
            Two taps through SnapTrade and we read every fill you have ever
            made. Then we hand the year back as something worth posting.
          </p>
          {/*
            * The hero's first action depends on whether the reader has an
            * account. "Get started free" is what you say to someone who has
            * not started; a returning reader who lands here has, and used to
            * have no way into the product from the page that sells it.
            *
            * For the reader with no account it is now the sign-in itself
            * rather than a link to a screen holding one — see StartFree.
            */}
          <div className={styles.heroActions}>
            {signedIn ? (
              <Link href="/app" className={styles.ctaDark}>
                Go to app
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              /* One tap to Google, landing on the connect step. */
              <StartFree />
            )}
            {signedIn ? null : <GoToApp />}
            <Link href="/pricing" className={styles.ctaGhost}>
              See the plan
            </Link>
          </div>
        </div>

        <div className={styles.heroArt} aria-hidden="true">
          {/* Portfolio phone — a dark handset holding a light account card */}
          {/*
            * ── The handsets are photographs of the product ──
            *
            * They were drawn in JSX, which meant they were an illustration of
            * the dashboard kept in step with it by hand — and nobody does
            * that. The app led with the score for months while the phone here
            * still showed an account balance and a holdings list, so the page
            * was advertising a screen the product had stopped being.
            *
            * `npm run marketing:shots` captures them from the real app against
            * the same seeded example ledger `/wrapped?demo=1` serves, so
            * nothing here is a real person's positions on a public page.
            * Committed rather than fetched: a landing page must not depend on
            * a screenshot service to render.
            */}
          <div className={styles.phoneShell} data-phone="portfolio">
            <div className={styles.phoneScreen}>
              <img
                className={styles.phoneShot}
                src="/marketing/app-dash.png"
                alt=""
                width={390}
                height={844}
              />
            </div>
          </div>

          {/*
            * The equity line leaves the chart and flies at the Wrapped.
            *
            * Same path it always took; what changed is what is on the end of
            * it. An arrowhead is a diagram's punctuation — the mark's own dart
            * says the same "this way" and says whose product it is at the same
            * time, which is one element doing two jobs rather than two doing
            * one each. The trail tapers behind it: full weight where the line
            * leaves the chart, hairline where it started.
            */}
          <svg className={styles.heroCurl} viewBox="0 0 150 120" fill="none">
            <defs>
              <linearGradient id="contrail" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                <stop offset="55%" stopColor="currentColor" stopOpacity="0.8" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              d="M4 22c34-22 66 6 52 30-9 15-30 6-22-10 10-19 48-24 88-6"
              stroke="url(#contrail)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* The dart, nose along the path's own heading where it ends. */}
            <path
              d="M136 20.5 L112 35 L121.2 38 L122 47.6 Z"
              fill="currentColor"
              transform="rotate(20 124 34)"
            />
          </svg>

          {/* Wrapped phone */}
          <div className={styles.phoneShell} data-phone="wrapped">
            <div className={styles.phoneScreen} data-violet="">
              <img
                className={styles.phoneShot}
                src="/marketing/app-wrapped.png"
                alt=""
                width={390}
                height={844}
              />
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
      <section id="deck" className={styles.deckSection} data-expand>
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
              {/*
                * A percentile needs a population this product does not have,
                * and every surface inside the app refuses to print one — a
                * landing advertising the one figure the product will not
                * compute is selling something that never arrives. What the
                * card actually says is how the figure was arrived at.
                */}
              <span className={styles.cardPill}>
                <i />
                Deposits taken out
              </span>
            </div>,

            <div key="topbag" className={styles.card} data-card="topbag">
              <span className={styles.cardEyebrow}>TOP BAG</span>
              <div className={styles.cardRing}>
                <svg width="210" height="210" viewBox="0 0 210 210">
                  <circle cx="105" cy="105" r="85" fill="none" stroke="color-mix(in srgb, currentColor 12%, transparent)" strokeWidth="22" />
                  <circle
                    cx="105"
                    cy="105"
                    r="85"
                    fill="none"
                    stroke="currentColor"
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
                    stroke="currentColor"
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
      <section id="soon" className={styles.soon} data-expand>
        <div className={styles.soonGlowVioleta} aria-hidden="true" />
        <div className={styles.soonGlowAmber} aria-hidden="true" />

        <div className={styles.soonTop}>
          <div className={styles.soonCopy}>
            <span className={styles.soonTag}>
              <i />
              COMING SOON
            </span>
            {/*
              * It said "Transform the way you trade" over "Whoop for your
              * portfolio", which is two problems in four lines: this product
              * never tells anybody to trade, and naming a competitor is not a
              * description of what the thing does. What the score is, is a
              * number for how the week actually went.
              */}
            <h2 className={styles.h2}>
              Every night,
              <br />
              a number for it.
            </h2>
            <p className={styles.lede}>
              Four things a ledger can actually see: your rules, your rhythm,
              your patience, your exposure. No spreadsheet, no journalling.
            </p>
            <div className={styles.soonActions}>
              <Link href="/start" className={styles.ctaDark}>
                Start free
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
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
                {/*
                  * "Strain 14.2" was borrowed vocabulary from a fitness band
                  * and names nothing this product computes. The score has four
                  * components and they have names; the preview says one of
                  * them.
                  */}
                <div>
                  <span>PATIENCE</span>
                  <b>81</b>
                </div>
                <div>
                  <span>TODAY</span>
                  <b data-tone="red">−4.8%</b>
                </div>
                <div>
                  <span>YEAR TO DATE</span>
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
       * ── The plan ──
       *
       * Three waitlist tiers nobody could buy, then two plans of which one was
       * free, then one plan beside a waitlist card for the score. The waitlist
       * is gone entirely — a form collecting addresses for a thing with no date
       * is a promise the repository cannot keep — so what is left is one price,
       * and one card is a portrait shape holding a landscape amount of
       * information. It lies down: the price and the door on the left, what you
       * get in two columns beside it.
       */}
      <section id="plans" className={styles.plans} data-expand>
        <div className={styles.waitGlow} aria-hidden="true" />
        <div className={styles.waitInner}>
          <div className={styles.planHead}>
            <span className={styles.eyebrow}>THE PLAN</span>
            <h2 className={styles.h2}>One plan. First month on us.</h2>
          </div>

          <div className={styles.planCard}>
            <div className={styles.planSide}>
              <span className={styles.popular}>
                <i />
                {TRIAL_DAYS} DAYS FREE
              </span>
              <div className={styles.planFigure}>
                <b>${TIER_PRICE.pro.monthly}</b>
                <span>/mo</span>
              </div>
              <p className={styles.planNote}>
                {TRIAL_DAYS} days free, no card. Then {priceLine()}.
              </p>
              <Link href="/pricing" className={styles.planCta}>
                See the plan
              </Link>
              <p className={styles.planFine}>
                Every card you earn is yours to keep, plan or no plan.
              </p>
            </div>

            <ul className={styles.planList}>
              {PLAN_INCLUDES.map((f: string) => (
                <li key={f}>
                  <Check tone="green" />
                  <span>{f}</span>
                </li>
              ))}
              {Object.values(CAPABILITY_LABEL).map((f) => (
                <li key={f}>
                  <Check tone="white" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
