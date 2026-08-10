import type { Metadata } from "next";
import Link from "next/link";
import { appLocked } from "@/lib/launch";
import { FirstWeek } from "./FirstWeek";
import { WaitlistForm } from "./WaitlistForm";
import { WrappedStack } from "./WrappedStack";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "bagcheck — turn your portfolio into a flex",
  description:
    "Connect your brokerage in two taps through SnapTrade. bagcheck reads the numbers and turns your year into a Wrapped worth posting — returns, top bags, best trades, and the ones that got away.",
};

/*
 * The landing, from the design handoff: white editorial field, lowercase
 * wordmark, Wrapped sold first and the score layer as the thing worth
 * waiting for. The social numbers below are the design's placeholders —
 * swap them for measured ones the day there are measured ones.
 */
const SOCIAL = { lovedBy: "320K", rating: "4.9", ahead: "4,281", investors: "12,408" };

/** The bag mark. Currentcolor body, amber clasp — the one logo everywhere. */
function BagMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="8" y="20" width="48" height="36" rx="11" fill="currentColor" />
      <path
        d="M21 27v-6a11 11 0 0 1 22 0v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="32" cy="38" r="6" fill="var(--mk-amber)" />
    </svg>
  );
}

export default function LandingPage() {
  // While the app is locked, every door leads to the waitlist: no Login
  // link, and the primary CTA scrolls to the tiers instead of /home.
  const locked = appLocked();
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <BagMark />
          <span className={styles.wordmark}>bagcheck</span>
        </Link>
        <nav className={styles.navLinks} aria-label="Sections">
          <a href="#wrapped">Wrapped</a>
          <a href="#score">The score</a>
          <a href="#pricing">Pricing</a>
          {!locked && <Link href="/home">Login</Link>}
        </nav>
        {locked ? (
          <a href="#pricing" className={styles.navCta}>
            Get early access
          </a>
        ) : (
          <Link href="/home" className={styles.navCta}>
            Get started now
          </Link>
        )}
      </header>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.ratingPill}>
            <span className={styles.avatars} aria-hidden="true">
              <i>JR</i>
              <i>MK</i>
              <i>AD</i>
            </span>
            Loved by {SOCIAL.lovedBy} investors with <span className={styles.star}>★</span>{" "}
            {SOCIAL.rating} rating
          </div>
          <h1 className={styles.h1}>
            <span className={styles.h1Strong}>Meet bagcheck</span>
            Turn your portfolio into a flex
          </h1>
          <p className={styles.lede}>
            Connect your brokerage in two taps through SnapTrade. bagcheck reads
            the numbers and turns your year into a Wrapped worth posting —
            returns, top bags, best trades, and the ones that got away.
          </p>
          <div className={styles.heroActions}>
            {locked ? (
              <a href="#pricing" className={styles.ctaDark}>
                Get early access <span aria-hidden="true">→</span>
              </a>
            ) : (
              <Link href="/home" className={styles.ctaDark}>
                Get started now <span aria-hidden="true">→</span>
              </Link>
            )}
            <a href="#score" className={styles.ctaGhost}>
              Join the waitlist
            </a>
          </div>
        </div>

        <div className={styles.heroArt} aria-hidden="true">
          {/* Portfolio phone */}
          <div className={styles.phone} data-phone="portfolio">
            <div className={styles.phoneTop}>
              <span>9:41</span>
              <span className={styles.phoneTitle}>Accounts</span>
              <span>•••</span>
            </div>
            <div className={styles.screenCard}>
              <div className={styles.screenHead}>
                <span className={styles.screenLabel}>Portfolio</span>
                <span className={styles.connected}>● Connected</span>
              </div>
              <div className={styles.bigMoney}>
                $148,392<span>.11</span>
              </div>
              <div className={styles.deltaLine}>▲ $12,204.86 +8.96% · 1Y</div>
              <svg className={styles.spark} viewBox="0 0 280 70" preserveAspectRatio="none">
                <path
                  d="M0 58 L20 52 L40 56 L60 44 L80 48 L100 38 L120 42 L140 30 L160 36 L180 24 L200 28 L220 18 L240 22 L260 12 L280 8"
                  fill="none"
                  stroke="var(--mk-green)"
                  strokeWidth="2.5"
                />
              </svg>
              {[
                ["NV", "NVDA", "61.4 shares", "$61,204", "+214.6%", "up"],
                ["AA", "AAPL", "88 shares", "$24,780", "+18.2%", "up"],
                ["₿", "BTC", "0.41 BTC", "$38,140", "+41.0%", "up"],
                ["TS", "TSLA", "42 shares", "$9,842", "−22.4%", "down"],
              ].map(([tile, sym, qty, val, ret, dir]) => (
                <div key={sym} className={styles.holding}>
                  <span className={styles.holdTile} data-sym={sym}>
                    {tile}
                  </span>
                  <span className={styles.holdName}>
                    <b>{sym}</b>
                    <i>{qty}</i>
                  </span>
                  <span className={styles.holdVal}>
                    <b>{val}</b>
                    <i data-dir={dir}>{ret}</i>
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.acctChips}>
              <span data-acct="rh">RH</span>
              <span data-acct="fid">FID</span>
              <span data-acct="sch">SCH</span>
              <span data-acct="add">+</span>
            </div>
            <div className={styles.phoneFoot}>🔒 Read-only, secured by SnapTrade</div>
            <div className={`${styles.bubble} ${styles.bestDayBubble}`}>
              <i>Best day</i>
              <b>+$8,412</b>
            </div>
          </div>

          {/* The equity line leaves the chart and heads for the Wrapped */}
          <svg className={styles.heroCurl} viewBox="0 0 128 64" fill="none">
            <path
              d="M3 40 C 22 24 38 14 54 20 C 68 26 68 42 56 43 C 45 44 44 30 57 26 C 78 19 102 26 122 38"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M112 30 L 123 38 L 110 44"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Wrapped phone */}
          <div className={styles.phone} data-phone="wrapped">
            <div className={styles.phoneTop} data-on-violet="">
              <span>9:41</span>
              <span className={styles.phoneTitle}>Your Wrapped</span>
              <span>•••</span>
            </div>
            <div className={styles.wrapHero}>
              <span className={styles.wrapEyebrow}>2026 WRAPPED · @jordan</span>
              <div className={styles.wrapReturn}>+38.4%</div>
              <div className={styles.wrapSub}>
                Return this year · Top 3% of bagcheck
              </div>
              <div className={styles.wrapChips}>
                <span className={styles.typeChip}>The Conviction Buyer</span>
                <span className={styles.tradesChip}>142 trades</span>
              </div>
            </div>
            <div className={styles.wrapTiles}>
              <div className={styles.wrapTile}>
                <i>TOP BAG</i>
                <b>NVDA</b>
                <em data-tone="green">41% of book</em>
              </div>
              <div className={styles.wrapTile}>
                <i>BEST TRADE</i>
                <b data-tone="green">+$18,402</b>
                <em>Mar 14 · NVDA</em>
              </div>
              <div className={styles.wrapTile}>
                <i>DIAMOND HANDS</i>
                <b>411 days</b>
                <em>Longest hold</em>
              </div>
              <div className={styles.wrapTile}>
                <i>ONE THAT GOT AWAY</i>
                <b>TSLA</b>
                <em data-tone="red">Sold 9 days early</em>
              </div>
            </div>
            <div className={styles.wrapActions}>
              <span>⟳ Remix</span>
              <span data-primary="">Share Wrapped</span>
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

      {/* ── The Wrapped stack ── */}
      <section id="wrapped" className={styles.section}>
        <span className={styles.eyebrow}>THE WRAPPED</span>
        <h2 className={styles.h2}>See your portfolio, beautifully.</h2>
        <p className={styles.hint}>Swipe the top card away</p>
        <WrappedStack
          faces={{
            return: (
              <div className={styles.face} data-face="return">
                <i>2026 WRAPPED · @jordan</i>
                <b>+38.4%</b>
                <span>Return this year</span>
                <em>Top 3% of bagcheck</em>
              </div>
            ),
            topbag: (
              <div className={styles.face} data-face="topbag">
                <i>TOP BAG</i>
                <b>NVDA</b>
                <span>41% of book</span>
                <div className={styles.alloc}>
                  {[
                    ["NVDA", 41],
                    ["BTC", 26],
                    ["AAPL", 17],
                    ["TSLA", 9],
                  ].map(([sym, pct]) => (
                    <div key={sym} className={styles.allocRow}>
                      <span>{sym}</span>
                      <div className={styles.allocTrack}>
                        <div style={{ width: `${pct}%` }} />
                      </div>
                      <span>{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
            trade: (
              <div className={styles.face} data-face="trade">
                <i>BEST TRADE</i>
                <b>+$18,402</b>
                <span>Mar 14 · NVDA · held 9 months</span>
              </div>
            ),
            hands: (
              <div className={styles.face} data-face="hands">
                <i>DIAMOND HANDS</i>
                <b>411</b>
                <span>Days on your longest hold</span>
              </div>
            ),
            type: (
              <div className={styles.face} data-face="type">
                <i>YOUR TYPE</i>
                <b className={styles.faceType}>
                  The
                  <br />
                  Conviction
                  <br />
                  Buyer
                </b>
                <div className={styles.traits}>
                  {[
                    ["Concentration", "High"],
                    ["Patience", "Elite"],
                    ["Panic selling", "Rare"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span>{k}</span>
                      <b>{v}</b>
                    </div>
                  ))}
                </div>
              </div>
            ),
          }}
        />
        <a href="#pricing" className={styles.ctaDark}>
          Share Wrapped
        </a>
      </section>

      {/* ── Coming soon: the score layer ── */}
      <section id="score" className={styles.soon}>
        <div className={styles.soonCopy}>
          <span className={styles.eyebrowRed}>COMING SOON</span>
          <h2 className={styles.h2}>Transform the way you trade.</h2>
          <p className={styles.lede}>
            Whoop for your portfolio. Strain, recovery and risk — read every
            morning, no spreadsheet required.
          </p>
          <WaitlistForm tier="waitlist" cta="Join the waitlist" />
          <p className={styles.fine}>Read-only, via SnapTrade. Cancel any time.</p>
        </div>
        <div className={styles.phone} data-phone="health" aria-hidden="true">
          <div className={styles.phoneTop}>
            <span>Tuesday, 9 Aug</span>
            <span className={styles.previewTag}>PREVIEW</span>
          </div>
          <div className={styles.healthRing}>
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--mk-night-line)" strokeWidth="9" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--mk-green-soft)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray="327"
                strokeDashoffset="95"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className={styles.healthNum}>
              <b>71</b>
              <i>HEALTH</i>
            </div>
          </div>
          <div className={styles.healthRows}>
            {[
              ["STRAIN", "14.2"],
              ["TODAY'S PERFORMANCE", "−4.8%"],
              ["YTD PERFORMANCE", "+75%"],
            ].map(([k, v]) => (
              <div key={k} className={styles.healthRow}>
                <span>{k}</span>
                <b data-neg={v.startsWith("−") || undefined}>{v}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The first week, day by day ── */}
      <FirstWeek investors={SOCIAL.investors} />

      {/* ── What the score reads: four behaviour insights ── */}
      <section className={styles.insights}>
        <div className={styles.insight}>
          <span className={styles.eyebrow}>45-DAY P&amp;L</span>
          <div className={styles.insightHead}>
            <b>+$41,208</b>
            <span className={styles.pos}>+38.4%</span>
          </div>
          <svg className={styles.pnlChart} viewBox="0 0 320 90" preserveAspectRatio="none">
            <path
              d="M0 74 L26 66 L52 70 L78 54 L104 60 L130 44 L156 50 L182 34 L208 40 L234 26 L260 32 L286 16 L320 10"
              fill="none"
              stroke="var(--mk-green)"
              strokeWidth="2.5"
            />
          </svg>
          <div className={styles.axis}>
            <span>Jun 8</span>
            <span>Jun 22</span>
            <span>Jul 6</span>
            <span>Jul 20</span>
            <span>Aug 3</span>
          </div>
          <p>45 trading days of P&amp;L, straight from your brokerage.</p>
        </div>

        <div className={styles.insight}>
          <span className={styles.eyebrow}>WEEKDAY PATTERN</span>
          <div className={styles.insightHead}>
            <b className={styles.neg}>−0.8%</b>
            <span>on Mondays</span>
          </div>
          <div className={styles.weekBars}>
            {[
              ["M", 34, "down"],
              ["T", 62, ""],
              ["W", 58, ""],
              ["T", 74, ""],
              ["F", 66, ""],
            ].map(([d, h, dir], i) => (
              <div key={`${d}${i}`} className={styles.weekBar}>
                <i style={{ height: `${h}%` }} data-dir={dir || undefined} />
                <span>{d}</span>
              </div>
            ))}
          </div>
          <p>Your Monday positions underperform the rest of your week by 1.1 points.</p>
        </div>

        <div className={styles.insight}>
          <span className={styles.eyebrow}>HOLDING BEHAVIOUR</span>
          <div className={styles.insightHead}>
            <b>Winners cut 3.2× faster</b>
          </div>
          <div className={styles.holdBars}>
            <div className={styles.holdBarRow}>
              <span>Winners</span>
              <div className={styles.holdTrack}>
                <i style={{ width: "31%" }} data-kind="win" />
              </div>
              <span>41 days</span>
            </div>
            <div className={styles.holdBarRow}>
              <span>Losers</span>
              <div className={styles.holdTrack}>
                <i style={{ width: "100%" }} data-kind="loss" />
              </div>
              <span>132 days</span>
            </div>
          </div>
          <p>You hold losers 132 days on average and winners just 41.</p>
        </div>

        <div className={styles.insight}>
          <span className={styles.eyebrow}>ENTRY TIMING</span>
          <div className={styles.insightHead}>
            <b>9:45 – 10:15</b>
          </div>
          <div className={styles.timeline}>
            <div className={styles.timelineBand} />
            <span>9:30</span>
            <span>12:00</span>
            <span>16:00</span>
          </div>
          <p>Two thirds of your profitable entries land in the first hour.</p>
        </div>
      </section>

      {/* ── The waitlist / pricing ── */}
      <section id="pricing" className={styles.pricing}>
        <span className={styles.eyebrow}>THE WAITLIST</span>
        <h2 className={styles.h2}>Get in early.</h2>
        <p className={styles.hint}>{SOCIAL.ahead} investors ahead of you</p>

        <div className={styles.tiers}>
          <div className={styles.tier}>
            <i>WAITLIST</i>
            <div className={styles.price}>Free</div>
            <ul>
              <li>Wrapped the day it ships</li>
              <li>Monthly score preview</li>
              <li>No card required</li>
            </ul>
            <WaitlistForm tier="waitlist" cta="Join the waitlist" />
          </div>

          <div className={styles.tier} data-popular="">
            <span className={styles.popular}>MOST POPULAR</span>
            <i>EARLY ACCESS</i>
            <div className={styles.price}>
              $5 <span>once</span>
            </div>
            <p className={styles.refund}>Refunded if we miss our launch window</p>
            <ul>
              <li>Skip the line — first 1,000 accounts</li>
              <li>50% off Premium for 12 months</li>
              <li>Founding badge on every Wrapped</li>
              <li>Input on what we build next</li>
            </ul>
            <WaitlistForm tier="early" cta="Get early access" />
          </div>

          <div className={styles.tier}>
            <i>PREMIUM</i>
            <div className={styles.price}>
              $9 <span>/mo with early access</span>
            </div>
            <p className={styles.refund}>$18/mo at launch</p>
            <ul>
              <li>Daily score, strain and recovery</li>
              <li>Full P&amp;L history and drawdowns</li>
              <li>Behaviour insights, weekly</li>
              <li>Unlimited Wrapped remixes</li>
            </ul>
            <WaitlistForm tier="premium" cta="Notify me at launch" />
          </div>
        </div>
      </section>

      <footer className={styles.foot}>
        <span className={styles.brand}>
          <BagMark size={20} />
          <span className={styles.wordmark}>bagcheck</span>
        </span>
        <nav className={styles.footLinks} aria-label="Footer">
          <Link href="/legal/icons">Icon credits</Link>
          {!locked && <Link href="/home">Login</Link>}
        </nav>
        <span className={styles.copyright}>© 2026 bagcheck</span>
      </footer>
    </main>
  );
}
