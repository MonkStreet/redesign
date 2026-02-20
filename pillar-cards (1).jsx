import { useState, useRef, useEffect, useCallback } from "react";

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Design tokens                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const BRAND = {
  bg: "#0f1525",
  cardBg: "#171e32",
  cardBgHover: "#1c2440",
  cardBorder: "rgba(255,255,255,0.06)",
  greenBright: "#22c55e",
  green: "#34d399",
  yellow: "#fbbf24",
  orange: "#f97316",
  red: "#ef4444",
  accent: "#4b7bff",
  textPrimary: "#f0f2f8",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.28)",
  fontMono: "'JetBrains Mono', monospace",
  fontSans: "'Inter', -apple-system, sans-serif",
};

const PILLAR_COLORS = {
  value: "#a5b4fc",
  growth: "#34d399",
  profitability: "#fcd34d",
  health: "#38bdf8",
  payout: "#f9a8d4",
};

const PILLAR_KEYS = ["value", "growth", "profitability", "health", "payout"];

const getScoreColor = (s) => {
  if (s >= 80) return BRAND.greenBright;
  if (s >= 60) return BRAND.green;
  if (s >= 40) return BRAND.yellow;
  if (s >= 20) return BRAND.orange;
  return BRAND.red;
};

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Mini snowflake (visual cue connecting pillar to radar chart)                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function MiniSnowflake({ activePillar, allScores, size = 22 }) {
  const cx = size / 2;
  const cy = size / 2 + 0.5; // nudge center down so top point has more room
  const r = (size / 2) - 1.5;
  // 5 vertices starting from top, clockwise
  const angles = PILLAR_KEYS.map((_, i) => (i * 2 * Math.PI) / 5 - Math.PI / 2);
  const activeIdx = PILLAR_KEYS.indexOf(activePillar);
  const activeColor = PILLAR_COLORS[activePillar];

  const pts = PILLAR_KEYS.map((key, i) => {
    const s = Math.max((allScores[key] || 50) / 100, 0.2);
    return { x: cx + Math.cos(angles[i]) * r * s, y: cy + Math.sin(angles[i]) * r * s };
  });

  const frame = angles.map(a => `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`).join(" ");
  const shape = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + "Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, display: "block" }}>
      {/* Outer pentagon frame */}
      <polygon points={frame} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
      {/* Data shape */}
      <path d={shape} fill={`${activeColor}20`} stroke={`${activeColor}55`} strokeWidth="0.8" />
      {/* Active vertex */}
      <circle cx={pts[activeIdx].x} cy={pts[activeIdx].y} r="2.5" fill={activeColor} opacity="0.9" />
    </svg>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Group classification + historical context                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const GROUPS = {
  strength: {
    label: "Strengths",
    sublabel: "These factors make AAPL more likely to beat the market",
    color: BRAND.greenBright,
    icon: "▲",
    empty: "No clear strengths identified",
    min: 75,
  },
  solid: {
    label: "Solid",
    sublabel: "These factors make AAPL likely to perform in line with the market",
    color: BRAND.yellow,
    icon: "●",
    empty: "No pillars in the neutral zone — AAPL is strongly polarized",
    min: 50,
  },
  watch: {
    label: "Watch",
    sublabel: "These factors make AAPL more likely to underperform the market",
    color: BRAND.orange,
    icon: "▼",
    empty: "No weak areas identified",
    min: 0,
  },
};

function classifyPillar(score) {
  if (score >= 75) return "strength";
  if (score >= 50) return "solid";
  return "watch";
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Mock data                                                                  ║
// ║  Each pillar has: score, one-liner, detail narrative, and factors             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const PILLARS = [
  {
    key: "profitability", label: "Profitability", score: 95,
    oneLiner: "25% net margins, 147% ROE — this is a money-printing machine.",
    detail: "One dollar in four is pure profit. Apple makes more than its entire equity base in a single year. This isn't just good — it's the kind of margin power that lets a company raise prices, absorb shocks, and still compound. Very few companies at this scale operate this efficiently.",
    statPct: "72%", statLabel: "of companies with this profitability score have historically beaten the market.",
    factors: [
      { sub: "Margins" },
      { name: "Net Margin", value: "25.3%", hist: "23.1%", score: 93 },
      { name: "Operating Margin", value: "30.1%", hist: "28.4%", score: 94 },
      { name: "Gross Margin", value: "45.6%", hist: "43.8%", score: 88 },
      { sub: "Returns" },
      { name: "ROE", value: "147%", hist: "135%", score: 99 },
      { name: "ROIC", value: "52.8%", hist: "44.2%", score: 96 },
      { name: "ROA", value: "28.4%", hist: "26.1%", score: 95 },
      { sub: "Efficiency" },
      { name: "Asset Turnover", value: "1.12", hist: "1.08", score: 78 },
      { name: "Cash Conversion", value: "106%", hist: "102%", score: 91 },
    ],
  },
  {
    key: "health", label: "Health", score: 83,
    oneLiner: "29× interest coverage, near-zero bankruptcy risk. A fortress.",
    detail: "Apple could pay its debt 29 times over with current earnings. Bankruptcy risk is essentially zero. Even in a recession, this balance sheet doesn't break. If the market crashes tomorrow, Apple has the cash to buy back stock, keep investing, and come out stronger.",
    statPct: "68%", statLabel: "of companies with this health score have historically beaten the market.",
    factors: [
      { sub: "Liquidity" },
      { name: "Current Ratio", value: "1.07", hist: "1.14", score: 64 },
      { name: "Quick Ratio", value: "0.94", hist: "1.02", score: 58 },
      { sub: "Leverage" },
      { name: "Interest Coverage", value: "29.4×", hist: "24.8×", score: 92 },
      { name: "Debt/EBITDA", value: "0.92", hist: "1.14", score: 88 },
      { name: "Debt/Equity", value: "1.87", hist: "1.52", score: 42 },
      { sub: "Risk Scores" },
      { name: "Altman Z-Score", value: "5.8", hist: "5.2", score: 88 },
      { name: "Piotroski F-Score", value: "7/9", hist: "7/9", score: 82 },
      { name: "Beneish M-Score", value: "-2.84", hist: "-2.91", score: 90 },
    ],
  },
  {
    key: "growth", label: "Growth", score: 78,
    oneLiner: "8% revenue growth is impressive for a $3T company. Services is the engine.",
    detail: "Most companies this size are slowing down. Apple isn't. At $3 trillion, it's still growing revenue faster than the economy. The iPhone cycle is maturing, but Services — higher margin, recurring, and accelerating — is quietly becoming the main story.",
    statPct: "64%", statLabel: "of companies with this growth score have historically beaten the market.",
    factors: [
      { sub: "Revenue" },
      { name: "Revenue Growth (1Y)", value: "6.1%", hist: "8.4%", score: 62 },
      { name: "Revenue Growth (3Y)", value: "8.2%", hist: "7.1%", score: 72 },
      { name: "Revenue Growth (5Y)", value: "9.4%", hist: "7.8%", score: 75 },
      { sub: "Earnings" },
      { name: "EPS Growth (3Y)", value: "12.4%", hist: "10.8%", score: 81 },
      { name: "EBITDA Growth (3Y)", value: "8.6%", hist: "7.4%", score: 73 },
      { sub: "Cash Flow" },
      { name: "FCF Growth (3Y)", value: "10.1%", hist: "8.6%", score: 76 },
      { name: "Asset Growth", value: "3.2%", hist: "4.8%", score: 58 },
    ],
  },
  {
    key: "payout", label: "Payout", score: 74,
    oneLiner: "15% payout ratio, 3.8% buyback yield. Cash returns like clockwork.",
    detail: "The dividend yield looks tiny. Ignore it — that's by design. Apple returns cash through buybacks, retiring roughly 4% of its shares every year. That means your slice of the company gets bigger without you doing anything. It's a stealth dividend that doesn't get taxed until you sell.",
    statPct: "62%", statLabel: "of companies with this payout score have historically beaten the market.",
    factors: [
      { sub: "Dividends" },
      { name: "Dividend Yield", value: "0.55%", hist: "0.68%", score: 28 },
      { name: "Div Growth (5Y)", value: "5.6%", hist: "6.2%", score: 72 },
      { name: "Div Growth (3Y)", value: "4.8%", hist: "5.1%", score: 65 },
      { sub: "Buybacks" },
      { name: "Buyback Yield", value: "3.8%", hist: "3.2%", score: 85 },
      { name: "Total Shareholder Yield", value: "4.3%", hist: "3.8%", score: 78 },
      { sub: "Safety" },
      { name: "Payout Ratio", value: "15.4%", hist: "16.8%", score: 91 },
      { name: "FCF Payout", value: "14.2%", hist: "15.6%", score: 92 },
      { name: "Div Safety Score", value: "96/100", hist: "94/100", score: 94 },
    ],
  },
  {
    key: "value", label: "Value", score: 35,
    oneLiner: "Expensive at 38× earnings — a steep premium even for this quality.",
    detail: "You're paying a premium for quality — and the market knows it. At these multiples, Apple needs to execute flawlessly just to justify the current price. If growth slows or margins dip even slightly, there's no cushion. The upside is already priced in.",
    statPct: "62%", statLabel: "of companies with this valuation score have historically underperformed the market.",
    factors: [
      { sub: "Multiples" },
      { name: "P/E Ratio", value: "38.4×", hist: "26.1×", score: 28 },
      { name: "EV/EBITDA", value: "28.3×", hist: "20.4×", score: 34 },
      { name: "P/FCF", value: "32.1×", hist: "24.6×", score: 38 },
      { name: "P/S Ratio", value: "9.2×", hist: "6.4×", score: 22 },
      { name: "P/B Ratio", value: "48.2×", hist: "34.7×", score: 18 },
      { sub: "Yields" },
      { name: "Earnings Yield", value: "2.6%", hist: "3.8%", score: 32 },
      { name: "FCF Yield", value: "3.1%", hist: "4.1%", score: 38 },
      { name: "Shareholder Yield", value: "4.3%", hist: "3.8%", score: 72 },
    ],
  },
];

// Profile-level prognosis lives on the snowflake card, not here

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Utilities                                                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function RichText({ text, style = {} }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span style={style}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <span key={i} style={{ color: BRAND.textPrimary, fontWeight: 600 }}>{p.slice(2, -2)}</span>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

// SmoothExpand with ResizeObserver
function SmoothExpand({ expanded, children }) {
  const ref = useRef(null);
  const [h, setH] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    if (!expanded) { setH(0); return; }
    setH(ref.current.scrollHeight);

    const ro = new ResizeObserver(() => {
      if (ref.current && expanded) setH(ref.current.scrollHeight);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [expanded]);

  return (
    <div style={{
      height: h, overflow: "hidden",
      transition: "height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
      opacity: expanded ? 1 : 0,
    }}>
      <div ref={ref}>{children}</div>
    </div>
  );
}

function ScoreBar({ score, width = 48 }) {
  const color = getScoreColor(score);
  return (
    <div style={{
      width, height: 4, borderRadius: 2,
      background: "rgba(255,255,255,0.06)", overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{
        width: `${score}%`, height: "100%", borderRadius: 2,
        background: color, opacity: 0.8, transition: "width 0.4s ease",
      }} />
    </div>
  );
}

// Academic backing is woven into the narrative text itself — no separate component needed

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Academic citation (shown in expanded detail)                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// Academic backing is woven into the narrative text itself — no separate component needed

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  PillarRow                                                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function PillarRow({ pillar, isOpen, onToggle, onKeyNav, allScores, onFactorClick }) {
  const [hovered, setHovered] = useState(false);
  const color = PILLAR_COLORS[pillar.key];
  const scoreColor = getScoreColor(pillar.score);
  const btnRef = useRef(null);

  // Expose focus for keyboard nav
  useEffect(() => {
    if (isOpen && btnRef.current) btnRef.current.focus();
  }, []);

  return (
    <div style={{
      background: isOpen ? `${color}08` : `${color}03`,
      borderRadius: 8,
      border: `1px solid ${isOpen ? color + "18" : color + "06"}`,
      transition: "all 0.2s ease",
      overflow: "hidden",
      margin: isOpen ? "5px 6px" : "3px 6px",
    }}>
      {/* Clickable row */}
      <button
        ref={btnRef}
        className="pillar-row-btn"
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); onKeyNav(1); }
          if (e.key === "ArrowUp") { e.preventDefault(); onKeyNav(-1); }
        }}
        aria-expanded={isOpen}
        aria-label={`${pillar.label}: ${pillar.score} out of 100. ${pillar.oneLiner}`}
        style={{
          display: "flex", flexDirection: "column", gap: 4,
          width: "100%", padding: "10px 14px 10px 12px",
          background: "none", border: "none", cursor: "pointer",
          textAlign: "left", outline: "none", borderRadius: 10,
        }}
        onFocus={(e) => e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${color}30`}
        onBlur={(e) => e.currentTarget.style.boxShadow = "none"}
      >
        {/* Top row: snowflake + score + name + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
          {/* Mini snowflake */}
          {allScores && <MiniSnowflake activePillar={pillar.key} allScores={allScores} size={22} />}

          {/* Score */}
          <span style={{
            fontSize: 18, fontWeight: 700, fontFamily: BRAND.fontMono,
            color: scoreColor, width: 32, textAlign: "center", lineHeight: 1,
            fontVariantNumeric: "tabular-nums", flexShrink: 0,
            marginLeft: 3,
          }}>{pillar.score}</span>

          {/* Pillar name */}
          <span style={{
            fontSize: 13.5, fontWeight: 700, color: BRAND.textPrimary,
            fontFamily: BRAND.fontSans, marginLeft: 6,
          }}>{pillar.label}</span>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Chevron — always pinned right */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.25s ease",
              flexShrink: 0, opacity: hovered || isOpen ? 0.6 : 0.3,
            }}>
            <path d="M4 5.5L7 8.5L10 5.5" stroke={BRAND.textPrimary} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* One-liner — hidden when expanded */}
        {!isOpen && (
          <span className="pillar-oneliner" style={{
            fontSize: 12, color: BRAND.textMuted,
            fontFamily: BRAND.fontSans, lineHeight: 1.4,
            letterSpacing: "0.01em",
            paddingLeft: 60,
          }}>{pillar.oneLiner}</span>
        )}
      </button>

      {/* Expanded detail */}
      <SmoothExpand expanded={isOpen}>
        <div style={{ padding: "4px 14px 16px 12px" }}>
          {/* Narrative + money stat */}
          <div style={{
            marginBottom: 12,
            background: "rgba(255,255,255,0.02)",
            borderRadius: 8, borderLeft: `3px solid ${color}40`,
            overflow: "hidden",
          }}>
            {/* Narrative */}
            <div style={{ padding: "10px 14px" }}>
              <RichText text={pillar.detail} style={{
                fontSize: 12.5, lineHeight: 1.65, color: BRAND.textSecondary,
                fontFamily: BRAND.fontSans,
              }} />
            </div>
            {/* Money stat */}
            {pillar.statPct && (
              <div style={{
                padding: "8px 14px 10px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                display: "flex", alignItems: "baseline", gap: 8,
              }}>
                <span style={{
                  fontSize: 15, fontWeight: 600, fontFamily: BRAND.fontMono,
                  color: BRAND.textPrimary,
                  lineHeight: 1, flexShrink: 0,
                }}>{pillar.statPct}</span>
                <span style={{
                  fontSize: 11, color: BRAND.textMuted,
                  fontFamily: BRAND.fontSans, lineHeight: 1.35,
                }}>{pillar.statLabel}</span>
              </div>
            )}
          </div>

          {/* Factor table */}
          <div style={{
            background: "rgba(255,255,255,0.015)",
            borderRadius: 8, padding: "2px 12px",
            border: `1px solid ${BRAND.cardBorder}`,
          }}>
            {/* Column header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 0 3px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{ width: 4 }} />
              <span style={{ flex: 1, fontSize: 9, color: BRAND.textMuted, fontFamily: BRAND.fontMono, textTransform: "uppercase", letterSpacing: "0.06em" }}>Factor</span>
              <span className="factor-header-hist" style={{ fontSize: 9, color: BRAND.textMuted, fontFamily: BRAND.fontMono, minWidth: 42, textAlign: "right" }}>3Y avg</span>
              <span style={{ fontSize: 9, color: BRAND.textMuted, fontFamily: BRAND.fontMono, minWidth: 52, textAlign: "right" }}>Now</span>
              <div style={{ width: 48 }} />
              <span style={{ fontSize: 9, color: BRAND.textMuted, fontFamily: BRAND.fontMono, minWidth: 20, textAlign: "right" }}></span>
            </div>
            {pillar.factors.map((f, i) => {
              // Subcategory label
              if (f.sub) {
                return (
                  <div key={i} style={{
                    padding: i === 0 ? "4px 0 2px" : "8px 0 2px",
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600, color: `${color}90`,
                      fontFamily: BRAND.fontMono, textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>{f.sub}</span>
                  </div>
                );
              }
              const fColor = getScoreColor(f.score);
              const indicator = f.score >= 70 ? BRAND.greenBright : f.score < 40 ? BRAND.red : BRAND.yellow;
              // Hide bottom border if next item is a subcategory label or this is the last item
              const isLastBeforeSub = pillar.factors[i + 1]?.sub || i === pillar.factors.length - 1;
              return (
                // Factor row — clickable. Opens FactorDetailModal with evolution chart,
                // peer comparison, and plain-English definition.
                // Props passed: { pillar, factor, company, peers }
                <div key={i}
                  className="factor-row"
                  onClick={() => onFactorClick?.({ pillar: pillar.key, factor: f })}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onFactorClick?.({ pillar: pillar.key, factor: f })}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "5px 4px 5px 0",
                    borderBottom: isLastBeforeSub ? "none" : "1px solid rgba(255,255,255,0.03)",
                    cursor: "pointer", borderRadius: 4,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{
                    width: 4, height: 4, borderRadius: 2,
                    background: indicator, opacity: 0.7, flexShrink: 0,
                  }} />
                  <span style={{
                    flex: 1, fontSize: 11.5, color: BRAND.textSecondary,
                    fontFamily: BRAND.fontSans,
                    textDecoration: "none",
                    textUnderlineOffset: 2,
                  }} className="factor-name">{f.name}</span>
                  <span className="factor-hist" style={{
                    fontSize: 10, fontFamily: BRAND.fontMono,
                    color: BRAND.textMuted, minWidth: 42, textAlign: "right",
                  }}>{f.hist || "—"}</span>
                  <span style={{
                    fontSize: 11.5, fontWeight: 500, fontFamily: BRAND.fontMono,
                    color: BRAND.textPrimary, minWidth: 52, textAlign: "right",
                  }}>{f.value}</span>
                  <ScoreBar score={f.score} />
                  <span style={{
                    fontSize: 10, fontWeight: 600, fontFamily: BRAND.fontMono,
                    color: fColor, minWidth: 20, textAlign: "right",
                  }}>{f.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </SmoothExpand>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Group header                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function GroupHeader({ group }) {
  const g = GROUPS[group];
  return (
    <div style={{ padding: "12px 14px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: g.color, lineHeight: 1 }}>{g.icon}</span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: g.color, fontFamily: BRAND.fontSans,
        }}>{g.label}</span>
        <span style={{
          fontSize: 11, color: BRAND.textMuted, fontFamily: BRAND.fontSans,
        }}>{g.sublabel}</span>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Loading skeleton                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function SkeletonPulse({ width, height, borderRadius = 4, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite",
      ...style,
    }} />
  );
}

function PillarSkeleton() {
  return (
    <div style={{ padding: "16px 14px" }}>
      {/* Group + rows */}
      {[0, 1, 2].map(g => (
        <div key={g}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6, marginTop: g > 0 ? 12 : 0, padding: "0 14px" }}>
            <SkeletonPulse width={70} height={12} />
            <SkeletonPulse width={140} height={12} />
          </div>
          {[0, 1].slice(0, g === 2 ? 1 : 2).map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
              <SkeletonPulse width={30} height={18} borderRadius={4} />
              <SkeletonPulse width={80} height={13} />
              <SkeletonPulse width="50%" height={12} style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Responsive CSS                                                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const RESPONSIVE_CSS = `
  .pillar-row-btn:active {
    opacity: 0.85;
    transform: scale(0.995);
  }
  .factor-row:hover .factor-name {
    text-decoration: underline;
    text-decoration-color: rgba(255,255,255,0.2);
    text-underline-offset: 2px;
  }
  @media (max-width: 540px) {
    .pillar-oneliner {
      padding-left: 25px !important;
      font-size: 11.5px !important;
    }
    .factor-hist {
      display: none !important;
    }
    .factor-header-hist {
      display: none !important;
    }
  }
`;

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Main component                                                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const KEYFRAMES = `
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes rowFadeIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
`;

export default function PillarBreakdown() {
  const [openPillar, setOpenPillar] = useState(null);
  const [loading, setLoading] = useState(true);
  const rowRefs = useRef([]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  // Sort and group
  const sorted = [...PILLARS].sort((a, b) => b.score - a.score);
  const grouped = { strength: [], solid: [], watch: [] };
  sorted.forEach(p => grouped[classifyPillar(p.score)].push(p));
  const groupOrder = ["strength", "solid", "watch"];

  // Collect all pillar scores for mini snowflake
  const allScores = {};
  PILLARS.forEach(p => { allScores[p.key] = p.score; });

  // Flat ordered list for keyboard navigation
  const flatOrder = groupOrder.flatMap(g => grouped[g]);

  const handleKeyNav = useCallback((currentKey, direction) => {
    const idx = flatOrder.findIndex(p => p.key === currentKey);
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < flatOrder.length) {
      const el = rowRefs.current[flatOrder[nextIdx].key];
      if (el) el.focus();
    }
  }, [flatOrder]);

  let animIdx = 0;

  return (
    <div style={{
      background: BRAND.bg, minHeight: "100vh",
      fontFamily: BRAND.fontSans, padding: "24px 20px",
      display: "flex", justifyContent: "center",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{KEYFRAMES}{RESPONSIVE_CSS}</style>

      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{
          background: BRAND.cardBg,
          border: `1px solid ${BRAND.cardBorder}`,
          borderRadius: 16, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 0 20px",
          }}>
            <span style={{
              color: BRAND.textMuted, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>Apple Inc. MonkScore™ Breakdown</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText("MonkScore™ Breakdown — Apple Inc. (AAPL) · monk.st");
              }}
              aria-label="Export card"
              style={{
                width: 28, height: 28, borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${BRAND.cardBorder}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s ease", flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = BRAND.cardBorder;
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1.5V8.5M6.5 8.5L4 6M6.5 8.5L9 6" stroke={BRAND.textMuted} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 9.5V10.5C2 11.05 2.45 11.5 3 11.5H10C10.55 11.5 11 11.05 11 10.5V9.5" stroke={BRAND.textMuted} strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {loading ? <PillarSkeleton /> : (
            <>
              {/* Pillar rows grouped */}
              <div style={{ padding: "4px 8px 12px" }}>
                {groupOrder.map(group => {
                  const items = grouped[group];
                  return (
                    <div key={group} style={{
                      background: `${GROUPS[group].color}04`,
                      borderRadius: 10, padding: "2px 0 6px",
                      marginBottom: 10,
                    }}>
                      <GroupHeader group={group} />
                      {items.length === 0 ? (
                        <div style={{
                          padding: "6px 14px 10px 33px",
                          fontSize: 11.5, color: BRAND.textMuted,
                          fontFamily: BRAND.fontSans, fontStyle: "italic",
                        }}>
                          {GROUPS[group].empty}
                        </div>
                      ) : items.map(pillar => {
                        const idx = animIdx++;
                        return (
                          <div key={pillar.key} style={{
                            animation: `rowFadeIn 0.3s ease ${idx * 0.06}s both`,
                          }}>
                            <PillarRow
                              pillar={pillar}
                              isOpen={openPillar === pillar.key}
                              onToggle={() => setOpenPillar(openPillar === pillar.key ? null : pillar.key)}
                              onKeyNav={(dir) => handleKeyNav(pillar.key, dir)}
                              allScores={allScores}
                              // Opens FactorDetailModal — see factor-detail-modal.jsx
                              // In production: onFactorClick={({ pillar, factor }) => setModalData({ pillar, factor })}
                              onFactorClick={({ pillar, factor }) => {
                                console.log("Factor clicked:", pillar, factor.name);
                                // TODO: setModalData({ pillar, factor }) → renders <FactorDetailModal />
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer */}
          {!loading && (
            <div style={{
              padding: "10px 20px 14px",
              borderTop: `1px solid ${BRAND.cardBorder}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 9, color: BRAND.textMuted, opacity: 0.5 }}>
                {PILLARS.reduce((a, p) => a + p.factors.filter(f => !f.sub).length, 0)} factors across 5 pillars → MonkScore™ <span style={{ color: BRAND.textSecondary, fontWeight: 600, fontFamily: BRAND.fontMono }}>82</span>
              </span>
              <span style={{ fontSize: 9, color: BRAND.textMuted, fontFamily: BRAND.fontSans, opacity: 0.5 }}>
                MonkStreet · monk.st
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
