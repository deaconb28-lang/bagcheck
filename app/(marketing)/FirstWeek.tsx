"use client";

import { useEffect, useState } from "react";
import styles from "./landing.module.css";

/*
 * The first week, day by day: four steps on the right, one phone on the left
 * showing the screen each step describes. The selection advances every five
 * seconds; clicking a step takes it there and restarts the clock from that
 * step. Autoplay never starts under reduced motion, and the static state is
 * step one selected — the finished design when JS never runs.
 */

const HOLD_MS = 5000;

const STEPS = [
  {
    day: "MON",
    title: "Connect",
    body: "Two taps through SnapTrade. Read-only for good, and nothing to upload.",
  },
  {
    day: "MON",
    title: "Get your Wrapped",
    body: "Your year, built in about thirty seconds. Cards you would actually post.",
  },
  {
    day: "TUE",
    title: "Wake up to a briefing",
    body: "One read each morning: what moved, what you are holding, what it cost.",
  },
  {
    day: "FRI",
    title: "Meet yourself",
    body: "Rules, rhythm, patience, exposure. Measured against your own record and nobody else's.",
  },
] as const;

function Check({ stroke = "var(--mk-green-soft)", size = 18 }: { stroke?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

function ConnectScreen() {
  const rows = [
    { chip: "RO", tone: "rh", name: "Robinhood", sub: "Brokerage · syncing", state: "busy" },
    { chip: "FI", tone: "fid", name: "Fidelity", sub: "Connected · 4 accounts", state: "done" },
    { chip: "SC", tone: "sch", name: "Schwab", sub: "Connected · 1 account", state: "done" },
    { chip: "CO", tone: "cb", name: "Coinbase", sub: "Crypto", state: "add" },
  ] as const;
  return (
    <div className={styles.fwScreen}>
      <div className={styles.fwTitle}>Add account</div>
      <p className={styles.fwSub}>Read-only. We never see your login.</p>
      <div className={styles.fwBrokers}>
        {rows.map((r) => (
          <div key={r.name} className={styles.fwBroker}>
            <span className={styles.fwBrokerChip} data-tone={r.tone}>
              {r.chip}
            </span>
            <span className={styles.fwBrokerName}>
              <b>{r.name}</b>
              <i>{r.sub}</i>
            </span>
            {r.state === "busy" && <span className={styles.fwSpinner} />}
            {r.state === "done" && <Check />}
            {r.state === "add" && <span className={styles.fwAdd}>Add</span>}
          </div>
        ))}
      </div>
      <div className={styles.fwSpacer} />
      <div className={styles.fwSecured}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="10" width="16" height="11" rx="3" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        Secured by SnapTrade
      </div>
    </div>
  );
}

function WrappedScreen() {
  return (
    <div className={styles.fwScreen} data-pad="tight">
      <div className={styles.fwEyebrow}>BUILDING YOUR WRAPPED</div>
      <div className={styles.fwMiniCard}>
        <span className={styles.fwMiniBlob} />
        <div>
          <div className={styles.fwMiniEyebrow}>2026 WRAPPED</div>
          <div className={styles.fwMiniReturn}>+38.4%</div>
          <div className={styles.fwMiniSub}>Ahead of your own best</div>
        </div>
      </div>
      <div className={styles.fwChecklist}>
        <div>
          <Check /> Return calculated
        </div>
        <div>
          <Check /> Top holdings ranked
        </div>
        <div>
          <span className={styles.fwSpinner} /> Scoring your trades
        </div>
      </div>
      <div className={styles.fwSpacer} />
      <div className={styles.fwShare}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4" />
          <path d="M7 9l5-5 5 5" />
          <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        </svg>
        Share Wrapped
      </div>
    </div>
  );
}

function BriefingScreen() {
  return (
    <div className={styles.fwScreen}>
      <div className={styles.fwTitle} data-big="">
        Good morning, Jordan
      </div>
      <p className={styles.fwSub}>Monday, 10 Aug · markets open in 42m</p>
      <div className={styles.fwVitals}>
        <div className={styles.fwRing}>
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx="52" cy="52" r="45" fill="none" stroke="color-mix(in srgb, var(--mk-bg) 8%, transparent)" strokeWidth="9" />
            <circle
              cx="52"
              cy="52"
              r="45"
              fill="none"
              stroke="var(--mk-violet-soft)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset="82"
            />
          </svg>
          <div className={styles.fwRingNum}>
            <b>71</b>
            <i>RECOVERY</i>
          </div>
        </div>
        <div className={styles.fwVitalStats}>
          <div>
            <span>STRAIN</span>
            <b>14.2</b>
          </div>
          <div>
            <span>OVERNIGHT</span>
            <b data-pos="">+$1,204</b>
          </div>
        </div>
      </div>
      <div className={styles.fwHeadsUp}>
        <span>HEADS UP</span>
        <p>Your Monday entries run 0.8% behind the rest of your week.</p>
      </div>
      <div className={styles.fwSpacer} />
      <div className={styles.fwFootChips}>
        <div>
          <span>CASH</span>
          <b>$8,410</b>
        </div>
        <div>
          <span>EXPOSURE</span>
          <b>94%</b>
        </div>
      </div>
    </div>
  );
}

/*
 * The comparison is against the reader's own record, and it says so.
 *
 * This screen used to rank somebody in the top 3% of "investors trading like
 * you" — a cohort this repository has no population for and no mechanism to
 * build. Every surface inside the app refuses to print a peer percentile and
 * draws a locked slot instead; a landing advertising the one figure the
 * product will not compute is selling something that never arrives.
 *
 * `selfPercentile` is real and shipped: where today sits among the reader's
 * own scored nights. So the four rows are the score's own four components,
 * measured the way the app measures them.
 */
function StandingScreen() {
  const ranks = [
    { label: "Rules", value: "Better than 97%", tone: "green", width: 97 },
    { label: "Rhythm", value: "Better than 92%", tone: "violet", width: 92 },
    { label: "Patience", value: "Better than 59%", tone: "amber", width: 59 },
    { label: "Exposure", value: "Better than 22%", tone: "red", width: 22 },
  ] as const;
  return (
    <div className={styles.fwScreen}>
      <div className={styles.fwTitle}>You vs you</div>
      <p className={styles.fwSub}>Against your own record</p>
      <div className={styles.fwCurve}>
        <svg viewBox="0 0 260 118" preserveAspectRatio="none">
          <defs>
            <linearGradient id="fwPeak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--mk-violet-soft)" stopOpacity="0.42" />
              <stop offset="100%" stopColor="var(--mk-violet-soft)" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <path
            d="M0 108 C40 106 62 96 84 72 C104 50 116 20 130 20 C144 20 156 50 176 72 C198 96 220 106 260 108 L260 118 L0 118 Z"
            fill="url(#fwPeak)"
          />
          <path
            d="M0 108 C40 106 62 96 84 72 C104 50 116 20 130 20 C144 20 156 50 176 72 C198 96 220 106 260 108"
            fill="none"
            stroke="color-mix(in srgb, var(--mk-violet-soft) 85%, transparent)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line x1="222" y1="26" x2="222" y2="118" stroke="var(--mk-amber)" strokeWidth="2.4" strokeDasharray="4 5" />
          <circle cx="222" cy="105" r="5.5" fill="var(--mk-amber)" />
        </svg>
        <div className={styles.fwYou}>
          <i>YOU</i>
          <b>97th</b>
        </div>
      </div>
      <div className={styles.fwRanks}>
        {ranks.map((r) => (
          <div key={r.label}>
            <div className={styles.fwRankHead}>
              <span>{r.label}</span>
              <b>{r.value}</b>
            </div>
            <div className={styles.fwRankTrack}>
              <i data-tone={r.tone} style={{ width: `${r.width}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.fwSpacer} />
      <p className={styles.fwFine}>Every scored night you have on file.</p>
    </div>
  );
}

export function FirstWeek() {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAuto(true);
  }, []);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), HOLD_MS);
    return () => clearInterval(t);
  }, [auto, step]);

  const screens = [
    <ConnectScreen key="connect" />,
    <WrappedScreen key="wrapped" />,
    <BriefingScreen key="briefing" />,
    <StandingScreen key="standing" />,
  ];

  return (
    <section id="demo" className={styles.fw}>
      <div className={styles.fwGlow} aria-hidden="true" />
      <div className={styles.fwInner}>
        <span className={styles.eyebrow}>THE FIRST WEEK</span>
        <h2 className={styles.h2}>
          Connect Monday.
          <br />
          Know yourself by Friday.
        </h2>

        <div className={styles.fwBody}>
          <div className={styles.fwPhoneWrap} aria-hidden="true">
            <div className={styles.fwPhone}>
              <div className={styles.fwStatus}>
                <span>9:41</span>
                <span className={styles.fwBars}>
                  <svg width="15" height="11" viewBox="0 0 17 12" fill="currentColor">
                    <rect x="0" y="8" width="3" height="4" rx="1" />
                    <rect x="4.5" y="5.5" width="3" height="6.5" rx="1" />
                    <rect x="9" y="3" width="3" height="9" rx="1" />
                    <rect x="13.5" y="0" width="3" height="12" rx="1" />
                  </svg>
                  <svg width="23" height="11" viewBox="0 0 26 12" fill="none">
                    <rect x="0.6" y="0.6" width="21" height="10.8" rx="3.2" stroke="currentColor" strokeOpacity="0.6" />
                    <rect x="2.4" y="2.4" width="16" height="7.2" rx="2" fill="currentColor" />
                  </svg>
                </span>
              </div>
              {screens[step]}
              <span className={styles.fwHandle} />
            </div>
          </div>

          <div className={styles.fwSteps}>
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                className={styles.fwStep}
                data-active={i === step || undefined}
                aria-pressed={i === step}
                onClick={() => setStep(i)}
              >
                <span className={styles.fwStepHead}>
                  <i>{s.day}</i>
                  <b>{s.title}</b>
                </span>
                {/*
                  * Only the step you are on says anything.
                  *
                  * Four steps each showing a two-line paragraph is four
                  * paragraphs of body copy in a section whose whole argument
                  * is "one thing a day" — the list stopped reading as a
                  * sequence and started reading as a wall. The titles are the
                  * sequence; the body belongs to the screen beside it.
                  *
                  * `grid-template-rows: 0fr → 1fr` opens it with no measured
                  * height and no JS, and the static state is step one open,
                  * which is what a reader with no scripts gets.
                  */}
                <span className={styles.fwStepBody}>
                  <p>{s.body}</p>
                </span>
                {i === step && (
                  <span className={styles.fwTrack}>
                    <i key={`${step}-${auto}`} data-playing={auto || undefined} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
