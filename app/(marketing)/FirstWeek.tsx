"use client";

import { useEffect, useState } from "react";
import styles from "./landing.module.css";

/*
 * The first-week walkthrough, from the demo handoff: a dark band with one
 * phone and four step rows, the selection auto-advancing. The static state
 * is step one selected with a full progress bar — the finished design if JS
 * never runs. Autoplay never starts under reduced motion, and any manual
 * interaction pauses it; the pill resumes it.
 */

const HOLD_MS = 5000;

const STEPS = [
  {
    day: "MON",
    title: "Connect",
    body: "Link every brokerage through SnapTrade. No statements to upload, no passwords shared.",
    meta: "2 taps · read-only",
  },
  {
    day: "MON",
    title: "Get your Wrapped",
    body: "Your year, scored and ranked. Five cards, ready to post.",
    meta: "about 30 seconds",
  },
  {
    day: "TUE",
    title: "Wake up to a briefing",
    body: "Overnight moves, exposure, and the habit costing you the most.",
    meta: "every trading day, 8:00",
  },
  {
    day: "FRI",
    title: "See where you stand",
    body: "Return, patience, risk and diversification, ranked against investors trading like you.",
    meta: "", // filled from the investors prop
  },
] as const;

function ConnectScreen() {
  const rows = [
    { chip: "RO", tone: "rh", name: "Robinhood", sub: "Brokerage · syncing", state: "busy" },
    { chip: "FI", tone: "fid", name: "Fidelity", sub: "Connected · 4 accounts", state: "done" },
    { chip: "SC", tone: "sch", name: "Schwab", sub: "Connected · 1 account", state: "done" },
    { chip: "CO", tone: "cb", name: "Coinbase", sub: "Crypto", state: "add" },
  ] as const;
  return (
    <>
      <div className={styles.fwPhoneTitle}>Add account</div>
      <p className={styles.fwPhoneSub}>Read-only. We never see your login.</p>
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
            {r.state === "done" && <span className={styles.fwCheck}>✓</span>}
            {r.state === "add" && <span className={styles.fwAdd}>Add</span>}
          </div>
        ))}
      </div>
      <div className={styles.fwPhoneFoot}>🔒 Secured by SnapTrade</div>
    </>
  );
}

function WrappedScreen() {
  return (
    <>
      <div className={styles.fwPhoneEyebrow}>BUILDING YOUR WRAPPED</div>
      <div className={styles.fwMiniCard}>
        <span>2026 WRAPPED</span>
        <b>+38.4%</b>
        <i>Top 3% of bagcheck</i>
      </div>
      <div className={styles.fwChecklist}>
        <div>
          <span className={styles.fwCheck}>✓</span> Return calculated
        </div>
        <div>
          <span className={styles.fwCheck}>✓</span> Top bags ranked
        </div>
        <div>
          <span className={styles.fwSpinner} /> Scoring your trades
        </div>
      </div>
      <div className={styles.fwSharePill}>Share Wrapped</div>
    </>
  );
}

function BriefingScreen() {
  return (
    <>
      <div className={styles.fwPhoneTitle}>Good morning, Jordan</div>
      <p className={styles.fwPhoneSub}>Tuesday, 11 Aug · markets open in 42m</p>
      <div className={styles.fwVitals}>
        <div className={styles.fwRing}>
          <svg viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--mk-night-line)" strokeWidth="7" />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="var(--mk-violet-soft)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray="251"
              strokeDashoffset="73"
              transform="rotate(-90 48 48)"
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
            <b data-pos>+$1,204</b>
          </div>
        </div>
      </div>
      <div className={styles.fwHeadsUp}>
        <span>HEADS UP</span>
        <p>Your Monday entries run 0.8% behind the rest of your week.</p>
      </div>
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
    </>
  );
}

function StandingScreen({ investors }: { investors: string }) {
  const bars = [
    { label: "Return", value: "Top 3%", tone: "green", width: 94 },
    { label: "Patience", value: "Top 8%", tone: "violet", width: 86 },
    { label: "Risk taken", value: "Top 41%", tone: "amber", width: 52 },
    { label: "Diversification", value: "Bottom 22%", tone: "red", width: 20 },
  ] as const;
  return (
    <>
      <div className={styles.fwPhoneTitle}>You vs everyone</div>
      <p className={styles.fwPhoneSub}>{investors} investors, same 45 days</p>
      <div className={styles.fwCurve}>
        <span className={styles.fwYou}>
          <i>YOU</i>
          <b>97th</b>
        </span>
        <svg viewBox="0 0 280 110" preserveAspectRatio="none">
          <path
            d="M0 104 C70 100 92 18 140 18 C188 18 210 100 280 104 L280 110 L0 110 Z"
            fill="color-mix(in srgb, var(--mk-violet) 34%, transparent)"
          />
          <path
            d="M0 104 C70 100 92 18 140 18 C188 18 210 100 280 104"
            fill="none"
            stroke="var(--mk-violet-soft)"
            strokeWidth="2"
          />
          <line x1="216" y1="14" x2="216" y2="100" stroke="var(--mk-amber)" strokeWidth="2" strokeDasharray="2 5" />
          <circle cx="216" cy="86" r="4" fill="var(--mk-amber)" />
        </svg>
      </div>
      <div className={styles.fwRanks}>
        {bars.map((b) => (
          <div key={b.label} className={styles.fwRank}>
            <span>{b.label}</span>
            <b>{b.value}</b>
            <div className={styles.fwRankTrack}>
              <i data-tone={b.tone} style={{ width: `${b.width}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.fwPhoneFoot}>Peers matched by account size and holding period.</div>
    </>
  );
}

export function FirstWeek({ investors }: { investors: string }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), HOLD_MS);
    return () => clearInterval(t);
  }, [playing]);

  function select(i: number) {
    setStep(i);
    setPlaying(false);
  }

  const screens = [
    <ConnectScreen key="connect" />,
    <WrappedScreen key="wrapped" />,
    <BriefingScreen key="briefing" />,
    <StandingScreen key="standing" investors={investors} />,
  ];

  return (
    <section className={styles.fw} id="first-week">
      <div className={styles.fwInner}>
        <div className={styles.fwHead}>
          <div>
            <span className={styles.fwEyebrow}>THE FIRST WEEK</span>
            <h2 className={styles.fwH2}>
              Connect Monday.
              <br />
              Know yourself by Friday.
            </h2>
          </div>
          <div className={styles.fwControls}>
            <span className={styles.fwCount}>
              {step + 1} / {STEPS.length}
            </span>
            <button type="button" aria-label="Previous step" onClick={() => select((step + STEPS.length - 1) % STEPS.length)}>
              ‹
            </button>
            <button
              type="button"
              className={styles.fwPlay}
              data-on={playing || undefined}
              onClick={() => setPlaying((p) => !p)}
            >
              <i /> {playing ? "Auto-playing" : "Paused"}
            </button>
            <button type="button" aria-label="Next step" onClick={() => select((step + 1) % STEPS.length)}>
              ›
            </button>
          </div>
        </div>

        <div className={styles.fwBody}>
          <div className={styles.fwPhone} aria-hidden="true">
            <div className={styles.phoneTop}>
              <span>9:41</span>
              <span>●●●</span>
            </div>
            {screens[step]}
          </div>

          <div className={styles.fwSteps}>
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                className={styles.fwStep}
                data-active={i === step || undefined}
                aria-pressed={i === step}
                onClick={() => select(i)}
              >
                <span className={styles.fwDay}>{s.day}</span>
                <b>{s.title}</b>
                <span className={styles.fwMeta}>{i === 3 ? `${investors} investors` : s.meta}</span>
                <p>{s.body}</p>
                {i === step && (
                  <span className={styles.fwTrack}>
                    <i key={`${step}-${playing}`} data-playing={playing || undefined} />
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
