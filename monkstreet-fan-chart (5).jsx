import { useState, useRef, useEffect, useMemo, useCallback } from "react";

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Design tokens                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const BRAND = {
  bg:            "#0f1525",
  cardBg:        "#171e32",
  cardBgHover:   "#1c2440",
  cardBorder:    "rgba(255,255,255,0.06)",
  accent:        "#4b7bff",
  greenBright:   "#22c55e",
  green:         "#34d399",
  yellow:        "#fbbf24",
  orange:        "#f97316",
  red:           "#ef4444",
  textPrimary:   "#f0f2f8",
  textSecondary: "rgba(255,255,255,0.50)",
  textMuted:     "rgba(255,255,255,0.28)",
  fontMono:      "'JetBrains Mono', monospace",
  fontSans:      "'Inter', -apple-system, sans-serif",
};

const getScoreColor = (s) => {
  if (s >= 80) return BRAND.greenBright;
  if (s >= 60) return BRAND.green;
  if (s >= 40) return BRAND.yellow;
  if (s >= 20) return BRAND.orange;
  return BRAND.red;
};

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Keyframes                                                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  @keyframes lineDrawIn {
    from { stroke-dashoffset: var(--pathlen, 4000); }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes areaFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes coneFadeIn {
    from { opacity: 0; clip-path: inset(0 100% 0 0); }
    to   { opacity: 1; clip-path: inset(0 0% 0 0); }
  }
  @keyframes dotPop {
    0%   { transform: scale(0); opacity: 0; }
    70%  { transform: scale(1.4); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes stripIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dotRowIn {
    from { opacity: 0; transform: scaleX(0.75); }
    to   { opacity: 1; transform: scaleX(1); }
  }
  @keyframes popoverIn {
    from { opacity: 0; transform: translateY(4px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pinnedFade {
    0%   { opacity: 1; }
    60%  { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes skeletonPulse {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 0.65; }
  }
  .fan-period-btn:active { transform: scale(0.92); }
  .fan-meth-btn:hover { opacity: 1 !important; }
`;

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Data                                                                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function generateHistory(weeks, endPrice = 213.49, seed = 7) {
  const prices = [endPrice];
  let r = seed >>> 0;
  const rand  = () => { r = Math.imul(r ^ (r >>> 13), 0x9e3779b9 | 0); return (r >>> 0) / 0xffffffff; };
  const gauss = () => { const u = Math.max(1e-9, rand()), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  let momentum = 0;
  for (let i = 0; i < weeks; i++) {
    momentum = 0.25 * momentum + 0.75 * (gauss() * 0.035 + 0.0008);
    prices.unshift(prices[0] / (1 + momentum));
  }
  return prices;
}

// Production: fetched from MongoDB returns collection, pre-computed per bucket.
const BUCKET_EMPIRICAL = {
  "70-80": {
    1: { p10: -0.18, p25: -0.04, p40:  0.06, p50: 0.12, p60: 0.19, p75: 0.31, p90: 0.52 },
    3: { p10: -0.28, p25:  0.05, p40:  0.24, p50: 0.38, p60: 0.52, p75: 0.78, p90: 1.35 },
    5: { p10: -0.12, p25:  0.22, p40:  0.52, p50: 0.72, p60: 0.96, p75: 1.42, p90: 2.48 },
  },
};

const MOCK_COMPANY = {
  ticker: "AAPL", companyName: "Apple Inc.", name: "Apple Inc.", exchange: "NASDAQ",
  monkScore: 76, scoreBucket: "70-80",
  currentPrice: 213.49, changePct: 2.14, sampleCount: 1240,
};

const HIST_PERIODS = [
  { label: "1Y",  weeks: 52  },
  { label: "3Y",  weeks: 156 },
  { label: "5Y",  weeks: 260 },
  { label: "Max", weeks: 624 },
];

const FWD_HORIZONS = [1, 3, 5];   // only these three — our empirical anchor points
const FUT_YEARS    = 5;
const TODAY        = new Date("2026-02-20");

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  SVG layout constants                                                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const VW = 560, VH = 270;
const PAD = { t: 16, r: 22, b: 30, l: 50 };
const CW  = VW - PAD.l - PAD.r;
const CH  = VH - PAD.t - PAD.b;
const HIST_FRAC = 0.58;

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Math & formatting                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const f1       = (n) => n.toFixed(1);
const lerp     = (a, b, t) => a + (b - a) * t;
const priceY   = (p, lo, hi) => PAD.t + CH - ((p - lo) / (hi - lo)) * CH;
const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
const fmtUSD   = (n) => `$${n.toFixed(2)}`;
const fmtPct   = (n) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate     = (d) => `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
const fmtDateFull = (d) => `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

function weeksAgoDate(w) {
  const d = new Date(TODAY); d.setDate(d.getDate() - Math.round(w * 7)); return d;
}
function yearsFromNow(yr) {
  const d = new Date(TODAY);
  d.setFullYear(d.getFullYear() + Math.floor(yr));
  d.setMonth(d.getMonth() + Math.round((yr % 1) * 12));
  return d;
}

// What % of stocks had a POSITIVE return?
// Interpolates to find where return=0 sits in the distribution,
// then returns 100 minus that percentile.
function pctPositive(e) {
  const brackets = [
    [e.p10, 10], [e.p25, 25], [e.p40, 40],
    [e.p50, 50], [e.p60, 60], [e.p75, 75], [e.p90, 90],
  ];
  for (let i = 0; i < brackets.length - 1; i++) {
    const [ra, pa] = brackets[i];
    const [rb, pb] = brackets[i + 1];
    if (ra <= 0 && 0 <= rb) {
      return Math.round(100 - lerp(pa, pb, (0 - ra) / (rb - ra)));
    }
  }
  if (brackets[0][0] > 0)                       return 97;
  if (brackets[brackets.length - 1][0] < 0)     return 3;
  return e.p50 > 0 ? 70 : 30;
}

// Round to nearest integer out of 10, clamped 1–10
function inTen(pct) { return Math.max(1, Math.min(10, Math.round(pct / 10))); }

// ── BUG FIX: hoisted outside FanChartSVG so both onMouseMove AND
// inlineLabel useMemo can reference it without a ReferenceError ──────────────
// Snap zone: 0–40% of future width → 1Y, 40–80% → 3Y, 80–100% → 5Y
function getNearestAnchor(futFrac) {
  if (futFrac <= 0.40) return 1;
  if (futFrac <= 0.80) return 3;
  return 5;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  SVG path helpers                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function smoothLine(pts) {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M${f1(pts[0].x)},${f1(pts[0].y)} L${f1(pts[1].x)},${f1(pts[1].y)}`;
  let d = `M${f1(pts[0].x)},${f1(pts[0].y)}`;
  const t = 0.3;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i-1)], p1 = pts[i];
    const p2 = pts[i+1],              p3 = pts[Math.min(pts.length-1, i+2)];
    d += ` C${f1(p1.x+(p2.x-p0.x)*t)},${f1(p1.y+(p2.y-p0.y)*t)} ${f1(p2.x-(p3.x-p1.x)*t)},${f1(p2.y-(p3.y-p1.y)*t)} ${f1(p2.x)},${f1(p2.y)}`;
  }
  return d;
}

function bandPath(origin, nodes, hiKey, loKey) {
  return `M${f1(origin.x)},${f1(origin.y)} ${nodes.map(c=>`L${f1(c.x)},${f1(c[hiKey])}`).join(" ")} ${[...nodes].reverse().map(c=>`L${f1(c.x)},${f1(c[loKey])}`).join(" ")} Z`;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Shared UI atoms                                                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function SectionLabel({ children, style = {} }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 600, color: BRAND.textMuted, fontFamily: BRAND.fontMono, textTransform: "uppercase", letterSpacing: "0.08em", ...style }}>
      {children}
    </div>
  );
}

function PeriodToggle({ value, options, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.03)", borderRadius: 5, padding: 2 }}>
      {options.map(o => (
        <button key={o} className="fan-period-btn" onClick={() => onChange(o)} style={{
          fontSize: 9, fontWeight: value === o ? 600 : 400, fontFamily: BRAND.fontMono, letterSpacing: "0.04em",
          color:      value === o ? BRAND.textPrimary : BRAND.textMuted,
          background: value === o ? "rgba(255,255,255,0.08)" : "transparent",
          border: "none", borderRadius: 3, padding: "3px 8px", cursor: "pointer", transition: "all 0.15s ease",
        }}>{o}</button>
      ))}
    </div>
  );
}

function MethodologyPopover({ company, onClose, triggerRef }) {
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false });
  const popRef = useRef(null);

  useEffect(() => {
    if (!triggerRef?.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    const pw = 290, ph = 180; // estimated popover size
    const vw = window.innerWidth, vh = window.innerHeight;
    const margin = 8;

    // Prefer opening upward
    const openUp = tr.top > ph + margin;
    let top = openUp ? tr.top - ph - 6 : tr.bottom + 6;
    // Clamp vertical
    top = Math.max(margin, Math.min(vh - ph - margin, top));

    // Align right edge to trigger right, then clamp
    let left = tr.right - pw;
    left = Math.max(margin, Math.min(vw - pw - margin, left));

    setPos({ top, left, ready: true });
  }, [triggerRef]);

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (popRef.current && !popRef.current.contains(e.target) && !triggerRef?.current?.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [onClose, triggerRef]);

  if (!pos.ready) return null;
  return (
    <div ref={popRef} onClick={e => e.stopPropagation()} style={{
      position: "fixed", top: pos.top, left: pos.left,
      width: 290, zIndex: 9999,
      background: BRAND.cardBgHover, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10,
      padding: "14px 16px", boxShadow: "0 16px 48px rgba(0,0,0,0.65)",
      animation: "popoverIn 0.18s ease both", fontFamily: BRAND.fontSans,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: BRAND.textMuted, fontFamily: BRAND.fontMono, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          How is this estimated?
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: BRAND.textMuted, fontSize: 14, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ fontSize: 11.5, color: BRAND.textSecondary, lineHeight: 1.65 }}>
        <p style={{ margin: "0 0 8px" }}>
          We tracked every company that held a <strong style={{ color: BRAND.textPrimary }}>MonkScore of {company.scoreBucket}</strong>, then measured their actual returns 1, 3, and 5 years later.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          The cone shows <strong style={{ color: BRAND.textPrimary }}>empirical percentile bands</strong> from <strong style={{ color: BRAND.textPrimary }}>{company.sampleCount.toLocaleString()} company-observations</strong>. The median (P50) is where half of those companies landed.
        </p>
        <p style={{ margin: 0, color: BRAND.textMuted, fontSize: 10.5 }}>
          Estimates exist only at 1Y, 3Y, and 5Y. Past distributions don't guarantee future results.
        </p>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Dot row  ● ● ● ● ● ● ● ○ ○ ○                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function DotRow({ n, color }) {
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 6, transformOrigin: "left center", animation: "dotRowIn 0.22s cubic-bezier(0.22,1,0.36,1) 0.08s both" }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: i < n ? color : "rgba(255,255,255,0.09)",
          boxShadow: i < n ? `0 0 4px ${color}55` : "none",
        }} />
      ))}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Probability distribution bar                                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function ProbBar({ e, cp, scoreColor, yr }) {
  const lo    = cp * (1 + e.p10), hi = cp * (1 + e.p90);
  const range = hi - lo || 1;
  const toX   = v => Math.max(0, Math.min(100, ((cp * (1 + v) - lo) / range) * 100));

  const iqrL = toX(e.p25), iqrR = toX(e.p75);
  const med  = toX(e.p50);
  const zero = toX(0);  // where breakeven sits on the track, 0–100%

  // Clamp so even if 0% return is outside P10–P90, the bar still renders cleanly
  const zeroVis = Math.max(2, Math.min(98, zero));
  const allGain = zero <= 2;   // entire visible range is profit
  const allLoss = zero >= 98;  // entire visible range is loss

  const greenRgb = hexToRgb(BRAND.green);
  const redRgb   = hexToRgb(BRAND.red);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Header label — mirrors history "IF BOUGHT THEN" */}
      {yr != null && (
        <div style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted, letterSpacing: "0.05em", marginBottom: 6 }}>
          IF BOUGHT TODAY AND HELD TO {fmtDate(yearsFromNow(yr)).toUpperCase()}
        </div>
      )}
      {/* 3 labels: P10 / P50 / P90 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        {[["P10", e.p10, "left"], ["P50", e.p50, "center"], ["P90", e.p90, "right"]].map(([lbl, v, align]) => (
          <div key={lbl} style={{ textAlign: align }}>
            <div style={{ fontSize: 11, fontFamily: BRAND.fontMono, fontWeight: lbl === "P50" ? 700 : 400, color: lbl === "P50" ? scoreColor : BRAND.textSecondary }}>
              {fmtUSD(cp * (1 + v))}
            </div>
            <div style={{ fontSize: 8.5, fontFamily: BRAND.fontMono, color: BRAND.textMuted, marginTop: 1 }}>
              {lbl} · {fmtPct(v * 100)}
            </div>
          </div>
        ))}
      </div>

      {/* Track — green right of breakeven, red left of it */}
      <div style={{ position: "relative", height: 16, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>

        {/* Loss zone: left of breakeven */}
        {!allGain && (
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: 0, width: `${zeroVis}%`,
            background: `rgba(${redRgb},0.18)`,
            borderRadius: allLoss ? 4 : "4px 0 0 4px",
          }} />
        )}

        {/* Gain zone: right of breakeven */}
        {!allLoss && (
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: `${zeroVis}%`, right: 0,
            background: `rgba(${greenRgb},0.18)`,
            borderRadius: allGain ? 4 : "0 4px 4px 0",
          }} />
        )}

        {/* IQR band — inherits the colour of its zone, brighter */}
        {/* Left (loss) part of IQR */}
        {!allGain && iqrL < zeroVis && (
          <div style={{
            position: "absolute", top: 2, bottom: 2,
            left: `${iqrL}%`,
            width: `${Math.min(zeroVis, iqrR) - iqrL}%`,
            background: `rgba(${redRgb},0.42)`,
            borderRadius: 2,
          }} />
        )}
        {/* Right (gain) part of IQR */}
        {!allLoss && iqrR > zeroVis && (
          <div style={{
            position: "absolute", top: 2, bottom: 2,
            left: `${Math.max(zeroVis, iqrL)}%`,
            width: `${iqrR - Math.max(zeroVis, iqrL)}%`,
            background: `rgba(${greenRgb},0.42)`,
            borderRadius: 2,
          }} />
        )}

        {/* Median tick — scoreColor */}
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          left: `calc(${med}% - 1px)`, width: 2,
          background: scoreColor, borderRadius: 1,
        }} />

        {/* Breakeven divider */}
        {!allGain && !allLoss && (
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: `${zeroVis}%`, width: 1.5,
            background: "rgba(255,255,255,0.55)", borderRadius: 1,
          }}>
            <div style={{
              position: "absolute", bottom: "calc(100% + 3px)", left: "50%",
              transform: "translateX(-50%)",
              fontSize: 7, fontFamily: BRAND.fontMono, color: "rgba(255,255,255,0.40)",
              whiteSpace: "nowrap",
            }}>0%</div>
          </div>
        )}
      </div>

      {/* Sub-label */}
      <div style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted, marginTop: 5, opacity: 0.7 }}>
        <span style={{ color: `rgba(${greenRgb},0.6)` }}>■</span> gain &nbsp;
        <span style={{ color: `rgba(${redRgb},0.6)` }}>■</span> loss · IQR = P25–P75 · tick = median
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Loading skeleton                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function Skel({ w, h, r = 4, style = {} }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "rgba(255,255,255,0.06)", animation: "skeletonPulse 1.5s ease-in-out infinite", flexShrink: 0, ...style }} />;
}

function ChartSkeleton() {
  // Use 5Y default split (histFrac ≈ 0.5) so skeleton matches the default view
  const hf   = 0.5;
  const nowX = PAD.l + CW * hf;
  const originY = PAD.t + CH * 0.48;  // where the cone originates
  const p90Y = PAD.t + CH * 0.12;     // top of cone at right edge
  const p10Y = PAD.t + CH * 0.82;     // bottom of cone at right edge
  const p75Y = PAD.t + CH * 0.26;
  const p25Y = PAD.t + CH * 0.66;
  const p50Y = PAD.t + CH * 0.46;
  const rx   = VW - PAD.r;

  return (
    <div>
      {/* Chart area */}
      <div style={{ margin: "0 -24px", position: "relative" }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {/* Y grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map(f => (
            <line key={f} x1={PAD.l} y1={PAD.t + CH * f} x2={rx} y2={PAD.t + CH * f}
              stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
          ))}
          {/* Y-axis tick stubs */}
          {[0.2, 0.4, 0.6, 0.8].map(f => (
            <rect key={f} x={PAD.l - 22} y={PAD.t + CH * f - 4} width={18} height={8} rx={2}
              fill="rgba(255,255,255,0.05)" style={{ animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
          ))}

          {/* Cone: P10–P90 outer band */}
          <path d={`M${nowX},${originY} L${rx},${p90Y} L${rx},${p10Y} Z`}
            fill="rgba(255,255,255,0.025)" style={{ animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
          {/* Cone: P25–P75 inner band */}
          <path d={`M${nowX},${originY} L${rx},${p75Y} L${rx},${p25Y} Z`}
            fill="rgba(255,255,255,0.045)" style={{ animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
          {/* Cone: P40–P60 core */}
          <path d={`M${nowX},${originY} L${rx},${(p75Y+p50Y)/2} L${rx},${(p25Y+p50Y)/2} Z`}
            fill="rgba(255,255,255,0.06)" style={{ animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
          {/* Cone median line */}
          <line x1={nowX} y1={originY} x2={rx} y2={p50Y}
            stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} strokeDasharray="3 2"
            style={{ animation: "skeletonPulse 1.5s ease-in-out infinite" }} />

          {/* Anchor dots at 1Y, 3Y, 5Y */}
          {[1/5, 3/5, 1].map((f, i) => {
            const dx = nowX + (rx - nowX) * f;
            const dy = originY + (p50Y - originY) * f;
            return <circle key={i} cx={dx} cy={dy} r={3.5} fill="rgba(255,255,255,0.08)"
              style={{ animation: "skeletonPulse 1.5s ease-in-out infinite" }} />;
          })}

          {/* History line — wiggly, spans left half */}
          <path d={`M${PAD.l},${PAD.t+CH*0.62}
            C${PAD.l+30},${PAD.t+CH*0.52} ${PAD.l+55},${PAD.t+CH*0.68} ${PAD.l+85},${PAD.t+CH*0.45}
            S${PAD.l+130},${PAD.t+CH*0.55} ${PAD.l+155},${PAD.t+CH*0.40}
            S${PAD.l+200},${PAD.t+CH*0.52} ${nowX},${originY}`}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2} strokeLinecap="round"
            style={{ animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
          {/* History area fill */}
          <path d={`M${PAD.l},${PAD.t+CH*0.62}
            C${PAD.l+30},${PAD.t+CH*0.52} ${PAD.l+55},${PAD.t+CH*0.68} ${PAD.l+85},${PAD.t+CH*0.45}
            S${PAD.l+130},${PAD.t+CH*0.55} ${PAD.l+155},${PAD.t+CH*0.40}
            S${PAD.l+200},${PAD.t+CH*0.52} ${nowX},${originY}
            L${nowX},${PAD.t+CH} L${PAD.l},${PAD.t+CH} Z`}
            fill="rgba(255,255,255,0.02)" style={{ animation: "skeletonPulse 1.5s ease-in-out infinite" }} />

          {/* TODAY divider */}
          <line x1={nowX} y1={PAD.t} x2={nowX} y2={PAD.t+CH}
            stroke="rgba(255,255,255,0.10)" strokeWidth={1} strokeDasharray="3 3" />

          {/* X-axis tick stubs */}
          {[0.25, 0.5, 0.75].map(f => (
            <rect key={f} x={PAD.l + CW*f - 10} y={PAD.t+CH+8} width={20} height={7} rx={2}
              fill="rgba(255,255,255,0.05)" style={{ animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
          ))}
        </svg>
      </div>

      {/* Strip skeleton — mirrors real idle layout */}
      <div style={{ height: 140, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", gap: 20, paddingTop: 14 }}>
        {/* Left col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 138 }}>
          <Skel w={130} h={7} />
          <Skel w={120} h={22} />
          <Skel w={90}  h={9} />
          <Skel w={110} h={9} style={{ marginTop: 4 }} />
        </div>
        <div style={{ width: 1, height: 80, background: "rgba(255,255,255,0.05)", marginTop: 2 }} />
        {/* Right col */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, paddingTop: 2 }}>
          <Skel w={100} h={7} />
          <Skel w="85%" h={11} />
          <Skel w="65%" h={11} />
          {/* Dot row stubs */}
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.06)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Info strip                                                                 ║
// ║                                                                             ║
// ║  ALL three states share the same fixed 88px height — no layout shift.      ║
// ║                                                                             ║
// ║  Both active states share identical left-column anatomy:                   ║
// ║    Row 1 — label (date or horizon)                                          ║
// ║    Row 2 — price (large)                                                    ║
// ║    Row 3 — return % (colored)                                               ║
// ║    Row 4 — $10k pill  ← always here, always the same                       ║
// ║                                                                             ║
// ║  Right column differs: history = "if bought" context, future = prob bar    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// $10k pill — identical component used in both active states
function TenKPill({ dollar, color }) {
  return (
    <div style={{
      marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5,
      background: `${color}12`, border: `1px solid ${color}28`,
      borderRadius: 4, padding: "3px 9px",
    }}>
      <span style={{ fontSize: 11, fontFamily: BRAND.fontMono, fontWeight: 700, color }}>
        {dollar >= 0 ? "+" : "–"}${Math.abs(dollar).toFixed(0)}
      </span>
      <span style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted }}>
        on $10k
      </span>
    </div>
  );
}

// Wrapper for activated (hover) states — left border + tint signals "live"
function ActiveStrip({ color, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 20,
      height: "100%",
      paddingTop: 12, paddingLeft: 12,
      marginLeft: -12,
      borderLeft: `2px solid ${color}`,
      background: `linear-gradient(90deg, ${color}09 0%, transparent 55%)`,
      borderRadius: "0 4px 4px 0",
      animation: "stripIn 0.15s ease both",
    }}>
      {children}
    </div>
  );
}

function VDivider({ h = 52 }) {
  return <div style={{ flexShrink: 0, width: 1, height: h, background: BRAND.cardBorder, marginTop: 2 }} />;
}

function InfoStrip({ tip, company, scoreColor, histWeeks, methRef, methOpen, setMethOpen }) {
  const empirical = BUCKET_EMPIRICAL[company.scoreBucket];
  const cp        = company.currentPrice;

  // ── IDLE ────────────────────────────────────────────────────────────────────
  if (!tip) {
    // Pick the forecast horizon that matches the visible history period
    const histYears  = Math.round(histWeeks / 52);
    const idleYr     = histYears >= 5 ? 5 : histYears >= 3 ? 3 : 1;
    const e          = empirical[idleYr];
    const med        = cp * (1 + e.p50);
    const pos        = pctPositive(e);
    const n          = inTen(pos);
    const tDate      = yearsFromNow(idleYr);
    const retCol = e.p50 >= 0 ? BRAND.green : BRAND.red;
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, height: "100%", paddingTop: 12 }}>
        <div style={{ minWidth: 138 }}>
          <div style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted, letterSpacing: "0.06em", marginBottom: 3 }}>
            {idleYr}Y MEDIAN FORECAST · {fmtDate(tDate).toUpperCase()}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 3 }}>
            <span style={{ fontSize: 17, fontWeight: 700, fontFamily: BRAND.fontMono, color: BRAND.textPrimary, letterSpacing: "-0.02em" }}>{fmtUSD(med)}</span>
            <span style={{ fontSize: 11, fontFamily: BRAND.fontMono, fontWeight: 600, color: retCol }}>{fmtPct(e.p50 * 100)}</span>
          </div>

          {/* Likely range — returns only, one line */}
          <div style={{ fontSize: 10, fontFamily: BRAND.fontMono, color: BRAND.textMuted, marginBottom: 5, marginTop: 1 }}>
            <span style={{ color: BRAND.textMuted, opacity: 0.7 }}>Likely range </span>
            <span style={{ color: BRAND.textSecondary, fontWeight: 600 }}>{fmtPct(e.p25 * 100)} to {fmtPct(e.p75 * 100)}</span>
          </div>

          {/* Methodology link — lives below the forecast it explains */}
          <div ref={methRef} style={{ position: "relative" }}>
            <button className="fan-meth-btn" onClick={() => setMethOpen(v => !v)} style={{
              display: "inline-flex", alignItems: "center",
              background: methOpen ? `${scoreColor}14` : "transparent",
              border: `1px solid ${methOpen ? scoreColor+"35" : "rgba(255,255,255,0.10)"}`,
              borderRadius: 4, padding: "2px 8px", cursor: "pointer",
              fontSize: 8.5, fontFamily: BRAND.fontMono, fontWeight: 500,
              color: methOpen ? scoreColor : BRAND.textMuted,
              letterSpacing: "0.04em", transition: "all 0.15s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; e.currentTarget.style.color = BRAND.textSecondary; }}
              onMouseLeave={e => { if (!methOpen) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = BRAND.textMuted; }}}
            >
              How is this estimated?
            </button>
            {methOpen && <MethodologyPopover company={company} onClose={() => setMethOpen(false)} triggerRef={methRef} />}
          </div>
        </div>
        <VDivider h={80} />
        <div style={{ paddingTop: 2 }}>
          <div style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted, letterSpacing: "0.06em", marginBottom: 5 }}>
            HISTORICAL WIN RATE
          </div>
          <div style={{ fontSize: 12.5, color: BRAND.textSecondary, lineHeight: 1.5 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: scoreColor }}>{n} in 10</span>{" "}companies with this{" "}
            <span style={{ color: scoreColor, fontWeight: 600 }}>MonkScore</span><span style={{ color: scoreColor, fontSize: 8, verticalAlign: "super" }}>™</span>
            <br />
            <span style={{ fontWeight: 600, color: BRAND.textPrimary }}>beat the market over {idleYr} year{idleYr > 1 ? "s" : ""}</span>
          </div>
          <DotRow n={n} color={scoreColor} />
        </div>
      </div>
    );
  }

  // ── HISTORY hover ────────────────────────────────────────────────────────────
  if (tip.type === "hist") {
    const { price, pct, weeksAgo } = tip;
    const date    = weeksAgoDate(weeksAgo);
    const gainPct = ((cp / price) - 1) * 100;
    const col     = gainPct >= 0 ? BRAND.green : BRAND.red;
    const dollar  = 10000 * (gainPct / 100);
    return (
      <ActiveStrip color={BRAND.accent}>
        {/* Left col — mirrors future structure exactly */}
        <div style={{ minWidth: 140, flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted, letterSpacing: "0.05em", marginBottom: 3 }}>
            {fmtDateFull(date).toUpperCase()}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: BRAND.fontMono, color: BRAND.textPrimary, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {fmtUSD(price)}
          </div>
          <div style={{ fontSize: 12, fontFamily: BRAND.fontMono, fontWeight: 700, color: col, marginTop: 3, lineHeight: 1.35 }}>
            {fmtPct(gainPct)} return
            <br />
            <span style={{ fontWeight: 400, color: BRAND.textMuted, fontSize: 10 }}>since {fmtDate(date)}</span>
          </div>
          <TenKPill dollar={dollar} color={col} />
        </div>

        <VDivider h={80} />

        {/* Right col — visual return track, mirrors ProbBar anatomy */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted, letterSpacing: "0.05em", marginBottom: 6 }}>
            IF BOUGHT {fmtDateFull(date).toUpperCase()} AND HELD TO TODAY
          </div>

          {/* Entry / Today price labels — mirrors P10/P50/P90 row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: BRAND.fontMono, fontWeight: 400, color: BRAND.textSecondary }}>{fmtUSD(price)}</div>
              <div style={{ fontSize: 8.5, fontFamily: BRAND.fontMono, color: BRAND.textMuted, marginTop: 1 }}>Entry</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontFamily: BRAND.fontMono, fontWeight: 700, color: col }}>{fmtPct(gainPct)}</div>
              <div style={{ fontSize: 8.5, fontFamily: BRAND.fontMono, color: BRAND.textMuted, marginTop: 1 }}>return</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontFamily: BRAND.fontMono, fontWeight: 700, color: BRAND.textPrimary }}>{fmtUSD(cp)}</div>
              <div style={{ fontSize: 8.5, fontFamily: BRAND.fontMono, color: BRAND.textMuted, marginTop: 1 }}>Today</div>
            </div>
          </div>

          {/* Return track — fixed scale: –80% to +200%, breakeven at 28.6% */}
          {(() => {
            const minRet = -80, maxRet = 200;           // fixed scale bounds
            const range  = maxRet - minRet;             // 280
            const toX    = r => Math.max(1, Math.min(99, ((r - minRet) / range) * 100));
            const beX    = toX(0);                      // breakeven, fixed ~28.6%
            const endX   = toX(gainPct);                // today's return
            const fillL  = Math.min(beX, endX);
            const fillW  = Math.max(Math.abs(endX - beX), 2);
            return (
              <div style={{ position: "relative", height: 16, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                {/* Return fill */}
                <div style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `${fillL}%`, width: `${fillW}%`,
                  background: gainPct >= 0 ? `rgba(${hexToRgb(BRAND.green)},0.35)` : `rgba(${hexToRgb(BRAND.red)},0.35)`,
                }} />
                {/* Breakeven tick */}
                <div style={{ position: "absolute", top: 2, bottom: 2, left: `${beX}%`, width: 1.5, background: "rgba(255,255,255,0.22)", borderRadius: 1 }} />
                {/* Today dot */}
                <div style={{
                  position: "absolute", top: "50%", transform: "translate(-50%,-50%)",
                  left: `${endX}%`, width: 6, height: 6, borderRadius: "50%", background: col,
                }} />
              </div>
            );
          })()}

          <div style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted, marginTop: 4, opacity: 0.7 }}>
            {fmtPct(Math.abs(pct))} vs current price · {Math.round(weeksAgo / 52 * 10) / 10}Y held
          </div>
        </div>
      </ActiveStrip>
    );
  }

  // ── FUTURE hover ─────────────────────────────────────────────────────────────
  if (tip.type === "future") {
    const { yr } = tip;

    // TODAY anchor — the cone's starting point
    if (yr === 0) {
      const horizons = [1, 3, 5];
      return (
        <ActiveStrip color={scoreColor}>
          {/* Left col — today's price as anchor */}
          <div style={{ minWidth: 110, flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted, letterSpacing: "0.06em", marginBottom: 3 }}>
              TODAY
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: BRAND.fontMono, color: BRAND.textPrimary, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {fmtUSD(cp)}
            </div>
            <div style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted, marginTop: 4 }}>
              Forecast origin
            </div>
          </div>

          <VDivider h={72} />

          {/* Right — 3-column forward snapshot */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 0 }}>
            {horizons.map((h, i) => {
              const e    = empirical[h];
              const medP = cp * (1 + e.p50);
              const col  = e.p50 >= 0 ? BRAND.green : BRAND.red;
              return (
                <div key={h} style={{
                  flex: 1, paddingLeft: i === 0 ? 0 : 12,
                  borderLeft: i === 0 ? "none" : `1px solid ${BRAND.cardBorder}`,
                  marginLeft: i === 0 ? 0 : 12,
                }}>
                  <div style={{ fontSize: 8.5, fontFamily: BRAND.fontMono, color: BRAND.textMuted, letterSpacing: "0.06em", marginBottom: 3 }}>
                    +{h}Y
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: BRAND.fontMono, color: BRAND.textPrimary, letterSpacing: "-0.01em", lineHeight: 1 }}>
                    {fmtUSD(medP)}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, fontFamily: BRAND.fontMono, color: col, marginTop: 3 }}>
                    {fmtPct(e.p50 * 100)}
                  </div>
                </div>
              );
            })}
          </div>
        </ActiveStrip>
      );
    }

    const e      = empirical[yr];
    const medP   = cp * (1 + e.p50);
    const tDate  = yearsFromNow(yr);
    const col    = e.p50 >= 0 ? BRAND.green : BRAND.red;
    const dollar = 10000 * e.p50;
    return (
      <ActiveStrip color={scoreColor}>
        {/* Left col */}
        <div style={{ minWidth: 140, flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted, letterSpacing: "0.06em", marginBottom: 3 }}>
            MEDIAN FORECAST · +{yr}Y
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: BRAND.fontMono, color: BRAND.textPrimary, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {fmtUSD(medP)}
          </div>
          <div style={{ fontSize: 12, fontFamily: BRAND.fontMono, fontWeight: 700, color: col, marginTop: 3, lineHeight: 1.35 }}>
            {fmtPct(e.p50 * 100)} expected
            <br />
            <span style={{ fontWeight: 400, color: BRAND.textMuted, fontSize: 10 }}>by {fmtDate(tDate)}</span>
          </div>
          <TenKPill dollar={dollar} color={col} />
        </div>

        <VDivider h={72} />

        {/* Right col — probability distribution bar */}
        <ProbBar e={e} cp={cp} scoreColor={scoreColor} yr={yr} />
      </ActiveStrip>
    );
  }

  return null;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Chart SVG — clean, nothing overlapping the data                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function FanChartSVG({ histPrices, company, animKey, onTip, pinned, onPin }) {
  const histPathRef = useRef(null);
  const svgRef      = useRef(null);
  const [pathLen,   setPathLen]   = useState(4000);
  const [hoverSvgX, setHoverSvgX] = useState(null);
  const [hovDotPt,  setHovDotPt]  = useState(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (histPathRef.current) setPathLen(histPathRef.current.getTotalLength() || 4000);
    });
    return () => cancelAnimationFrame(id);
  }, [animKey, histPrices]);

  const scoreColor = getScoreColor(company.monkScore);
  const empirical  = BUCKET_EMPIRICAL[company.scoreBucket];
  const cp         = company.currentPrice;

  // Dynamic split: equal pixels-per-year on both sides of TODAY
  // histYears / (histYears + 5) → 1Y=0.17, 3Y=0.375, 5Y=0.5, Max=0.71
  const histYears      = histPrices.length / 52;
  const histFrac       = histYears / (histYears + 5);
  const nowX           = PAD.l + CW * histFrac;

  // Always show all 3 forward horizons — MonkStreet is a long-term tool
  const futYears       = 5;
  const activeHorizons = [0, 1, 3, 5];

  // Price extents — use the furthest active horizon for the cone extremes
  const futExtremes = [cp * (1 + empirical[futYears].p10), cp * (1 + empirical[futYears].p90)];
  const rawMin = Math.min(...histPrices, ...futExtremes);
  const rawMax = Math.max(...histPrices, ...futExtremes);
  const padR   = (rawMax - rawMin) * 0.11;
  const minP   = rawMin - padR, maxP = rawMax + padR;
  const yOf    = (p) => priceY(p, minP, maxP);
  const nowY   = yOf(cp);

  // Downsample history to max 200 pts for perf
  const displayPrices = useMemo(() => {
    if (histPrices.length <= 200) return histPrices;
    const step = Math.ceil(histPrices.length / 200);
    return histPrices.filter((_, i) => i % step === 0 || i === histPrices.length - 1);
  }, [histPrices]);

  const histPoints = useMemo(() =>
    displayPrices.map((p, i) => ({
      x: PAD.l + (i / (displayPrices.length - 1)) * CW * histFrac,
      y: yOf(p),
    })),
  [displayPrices, minP, maxP]);

  const histLinePath = useMemo(() => smoothLine(histPoints), [histPoints]);
  const histAreaPath = useMemo(() =>
    histLinePath ? `${histLinePath} L${f1(nowX)},${f1(PAD.t+CH)} L${f1(PAD.l)},${f1(PAD.t+CH)} Z` : "",
  [histLinePath, nowX]);

  // Cone nodes — scale future to match history period
  const futX = yr => nowX + (yr / futYears) * CW * (1 - histFrac);

  // Snap hover to nearest active anchor, zones divided evenly
  const getAnchor = (ff) => {
    const idx = Math.min(activeHorizons.length - 1, Math.floor(ff * activeHorizons.length));
    return activeHorizons[idx];
  };

  const coneNodes = useMemo(() => activeHorizons.filter(yr => yr > 0).map(yr => {
    const e = empirical[yr];
    return {
      yr, x: futX(yr),
      p10: yOf(cp*(1+e.p10)), p25: yOf(cp*(1+e.p25)), p40: yOf(cp*(1+e.p40)),
      p50: yOf(cp*(1+e.p50)), p60: yOf(cp*(1+e.p60)), p75: yOf(cp*(1+e.p75)),
      p90: yOf(cp*(1+e.p90)),
    };
  }), [nowX, nowY, minP, maxP, futYears]);

  const origin = { x: nowX, y: nowY };
  const bandP10_90 = useMemo(() => bandPath(origin, coneNodes, "p90", "p10"), [nowX, nowY, minP, maxP]);
  const bandP25_75 = useMemo(() => bandPath(origin, coneNodes, "p75", "p25"), [nowX, nowY, minP, maxP]);
  const bandP40_60 = useMemo(() => bandPath(origin, coneNodes, "p60", "p40"), [nowX, nowY, minP, maxP]);
  const edgeP10 = `M${f1(nowX)},${f1(nowY)} ` + coneNodes.map(c=>`L${f1(c.x)},${f1(c.p10)}`).join(" ");
  const edgeP90 = `M${f1(nowX)},${f1(nowY)} ` + coneNodes.map(c=>`L${f1(c.x)},${f1(c.p90)}`).join(" ");
  const medPath = `M${f1(nowX)},${f1(nowY)} ` + coneNodes.map(c=>`L${f1(c.x)},${f1(c.p50)}`).join(" ");

  // Y ticks
  const yTicks = useMemo(() => {
    const range = maxP - minP;
    // Nice step: round to nearest 1/2/5/10 multiple, then thin to ≤6 ticks
    const niceStep = (rawStep) => {
      const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const norm = rawStep / mag;
      const nice = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
      return nice * mag;
    };
    let step = niceStep(range / 5);
    let ticks = [];
    for (let v = Math.ceil(minP / step) * step; v <= maxP; v += step) ticks.push(v);
    // If ticks are too dense (> 7), double the step and recompute
    while (ticks.length > 7) {
      step = niceStep(step * 2);
      ticks = [];
      for (let v = Math.ceil(minP / step) * step; v <= maxP; v += step) ticks.push(v);
    }
    return ticks;
  }, [minP, maxP]);

  // Smart X labels for history side
  const xHistLabels = useMemo(() => {
    const years = histPrices.length / 52;
    const marks = [];
    if (years <= 1.5) {
      [3,6,9].forEach(m => { const f = 1 - m/(years*12); if (f > 0.04 && f < 0.96) marks.push({ frac: f, label: `–${m}M` }); });
    } else if (years <= 4) {
      for (let y = 1; y < years; y++) marks.push({ frac: 1 - y/years, label: `–${y}Y` });
    } else {
      const s = Math.max(1, Math.round(years / 4));
      for (let y = s; y < years; y += s) marks.push({ frac: 1 - y/years, label: `–${y}Y` });
    }
    return marks;
  }, [histPrices.length]);

  // ── Shared pointer logic (used by both mouse and touch) ──────────────────────
  const handlePointer = useCallback((clientX) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = (clientX - rect.left) * (VW / rect.width);
    const frac  = (svgX - PAD.l) / CW;
    setHoverSvgX(svgX);

    if (frac < 0 || frac > 1) { setHoverSvgX(null); onTip(null); setHovDotPt(null); return; }

    if (frac <= histFrac) {
      const idx    = Math.round((frac / histFrac) * (displayPrices.length - 1));
      const si     = Math.max(0, Math.min(displayPrices.length - 1, idx));
      const price  = displayPrices[si];
      const pt     = histPoints[si];
      const weeksAgo = (1 - si / (displayPrices.length - 1)) * histPrices.length;
      setHovDotPt(pt);
      onTip({ type: "hist", price, pct: ((price / cp) - 1) * 100, weeksAgo, currentPrice: cp });
    } else {
      const ff = Math.min((frac - histFrac) / (1 - histFrac), 1);
      setHovDotPt(null);
      onTip({ type: "future", yr: getAnchor(ff) });
    }
  }, [displayPrices, histPoints, histPrices.length, cp, onTip]);

  // Mouse handlers
  const onMouseMove = useCallback((e) => {
    if (pinned) return;
    handlePointer(e.clientX);
  }, [pinned, handlePointer]);

  const onMouseLeave = useCallback(() => {
    if (pinned) return;
    setHoverSvgX(null); setHovDotPt(null); onTip(null);
  }, [pinned, onTip]);

  // Touch handlers — prevent page scroll while scrubbing chart
  const onTouchMove = useCallback((e) => {
    if (pinned) return;
    e.preventDefault();
    handlePointer(e.touches[0].clientX);
  }, [pinned, handlePointer]);

  const onTouchEnd = useCallback((e) => {
    if (pinned) return;
    // Brief delay so the strip is visible before clearing on lift
    setTimeout(() => { setHoverSvgX(null); setHovDotPt(null); onTip(null); }, 800);
  }, [pinned, onTip]);

  // Click / tap: pin or release
  const onClick = useCallback(() => {
    if (pinned) {
      onPin(false);
    } else if (hoverSvgX !== null) {
      onPin(true);
    }
  }, [pinned, hoverSvgX, onPin]);

  // Inline price pills — for future zone returns P10/P50/P90 stacked at cone y positions
  const inlineLabels = useMemo(() => {
    if (hoverSvgX === null) return [];
    const frac = (hoverSvgX - PAD.l) / CW;
    if (frac < 0 || frac > 1) return [];

    if (frac <= histFrac) {
      const si    = Math.max(0, Math.min(displayPrices.length - 1, Math.round((frac / histFrac) * (displayPrices.length - 1))));
      const price = displayPrices[si];
      return [{ x: hoverSvgX, y: null, text: fmtUSD(price), color: BRAND.accent, key: "hist" }];
    } else {
      const ff  = Math.min((frac - histFrac) / (1 - histFrac), 1);
      const yr  = getAnchor(ff);
      if (yr === 0) return [{ x: nowX, y: null, text: fmtUSD(cp), color: scoreColor, key: "today" }];
      const e    = empirical[yr];
      const node = coneNodes.find(c => c.yr === yr);
      if (!node) return [];
      const nx = node.x;
      return [
        { x: nx, y: node.p90, text: fmtUSD(cp*(1+e.p90)), color: scoreColor, key: "p90", label: "P90", opacity: 0.55 },
        { x: nx, y: node.p50, text: fmtUSD(cp*(1+e.p50)), color: scoreColor, key: "p50", label: "P50", opacity: 1 },
        { x: nx, y: node.p10, text: fmtUSD(cp*(1+e.p10)), color: scoreColor, key: "p10", label: "P10", opacity: 0.55 },
      ];
    }
  }, [hoverSvgX, displayPrices, cp, empirical, scoreColor, coneNodes, nowX]);

  return (
    <svg key={animKey} ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: "100%", height: "auto", display: "block", overflow: "visible", cursor: pinned ? "pointer" : "crosshair", touchAction: "none" }}
      onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} onClick={onClick}
      onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    >
      <defs>
        <linearGradient id="fcHistFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={BRAND.accent} stopOpacity="0.12" />
          <stop offset="100%" stopColor={BRAND.accent} stopOpacity="0.00" />
        </linearGradient>
        <clipPath id="fcH"><rect x={PAD.l} y={PAD.t-2} width={CW*histFrac+2} height={CH+4} /></clipPath>
        <clipPath id="fcF"><rect x={nowX-1} y={PAD.t-6} width={CW*(1-histFrac)+PAD.r+1} height={CH+12} /></clipPath>
        <filter id="fcGl" x="-25%" y="-70%" width="150%" height="240%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="fcGs" x="-60%" y="-150%" width="220%" height="400%">
          <feGaussianBlur stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Y grid */}
      {yTicks.map(v => {
        const y = yOf(v);
        if (y < PAD.t - 2 || y > PAD.t + CH + 2) return null;
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={VW-PAD.r} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5}/>
            <text x={PAD.l-6} y={y+3.5} fill={BRAND.textMuted} fontSize={8.5} fontFamily={BRAND.fontMono} textAnchor="end">${v}</text>
          </g>
        );
      })}

      {/* NOW divider */}
      <line x1={nowX} y1={PAD.t} x2={nowX} y2={PAD.t+CH} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="3,4"/>
      <text x={nowX+5} y={PAD.t+9} fill={BRAND.textMuted} fontSize={7.5} fontFamily={BRAND.fontMono} fontWeight="600" letterSpacing="0.09em">TODAY</text>
      {/* TODAY tick on x-axis */}
      <line x1={nowX} y1={PAD.t+CH+1} x2={nowX} y2={PAD.t+CH+5} stroke={BRAND.textMuted} strokeWidth={0.7} opacity={0.35}/>
      <text x={nowX} y={PAD.t+CH+15} fill={BRAND.textMuted} fontSize={8} fontFamily={BRAND.fontMono} textAnchor="middle">Today</text>

      {/* Cone bands */}
      {[[bandP10_90,0.05],[bandP25_75,0.11],[bandP40_60,0.20]].map(([d,op],i) => (
        <path key={i} d={d} fill={scoreColor} fillOpacity={op} clipPath="url(#fcF)"
          style={{ animation: `coneFadeIn 0.55s cubic-bezier(0.22,1,0.36,1) ${0.10+i*0.08}s both` }}/>
      ))}
      {[edgeP10,edgeP90].map((d,i) => (
        <path key={i} d={d} fill="none" stroke={scoreColor} strokeOpacity={0.18} strokeWidth={0.8} clipPath="url(#fcF)"/>
      ))}
      <path d={medPath} fill="none" stroke={scoreColor} strokeWidth={2.2} filter="url(#fcGl)" clipPath="url(#fcF)"
        style={{ animation: "coneFadeIn 0.50s cubic-bezier(0.22,1,0.36,1) 0.08s both" }}/>

      {/* History area + line */}
      <path d={histAreaPath} fill="url(#fcHistFill)" clipPath="url(#fcH)"
        style={{ animation: "areaFadeIn 0.6s ease 0.05s both" }}/>
      <path ref={histPathRef} d={histLinePath} fill="none"
        stroke={BRAND.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        filter="url(#fcGl)" clipPath="url(#fcH)"
        style={{ strokeDasharray: pathLen, strokeDashoffset: pathLen, "--pathlen": pathLen, animation: "lineDrawIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.05s forwards" }}/>

      {/* X labels — history */}
      {xHistLabels.map(({ frac, label }) => (
        <text key={label}
          x={f1(PAD.l + frac * CW * histFrac)} y={PAD.t+CH+15}
          fill={BRAND.textMuted} fontSize={8} fontFamily={BRAND.fontMono} textAnchor="middle">{label}</text>
      ))}

      {/* X labels — future horizons */}
      {coneNodes.map(c => (
        <g key={c.yr}>
          <line x1={c.x} y1={PAD.t+CH+1} x2={c.x} y2={PAD.t+CH+5} stroke={BRAND.textMuted} strokeWidth={0.7} opacity={0.35}/>
          <text x={c.x} y={PAD.t+CH+15} fill={BRAND.textMuted} fontSize={8} fontFamily={BRAND.fontMono} textAnchor="middle">+{c.yr}Y</text>
          {c.yr === 5 && [["p90","P90",0.38],["p50","P50",0.68],["p10","P10",0.38]].map(([k,lbl,op]) => (
            <text key={k} x={c.x+6} y={c[k]+3.5} fill={scoreColor} fillOpacity={op} fontSize={7} fontFamily={BRAND.fontMono}>{lbl}</text>
          ))}
        </g>
      ))}

      {/* NOW dot */}
      <circle cx={nowX} cy={nowY} r={12} fill={scoreColor} fillOpacity={0.07} filter="url(#fcGs)"/>
      <circle cx={nowX} cy={nowY} r={4.5} fill={BRAND.cardBg} stroke={scoreColor} strokeWidth={2}/>
      <circle cx={nowX} cy={nowY} r={2} fill={scoreColor}
        style={{ transformOrigin: `${nowX}px ${nowY}px`, animation: "dotPop 0.4s ease 0.88s both" }}/>

      {/* Crosshair */}
      {hoverSvgX !== null && (
        <line x1={hoverSvgX} y1={PAD.t} x2={hoverSvgX} y2={PAD.t+CH}
          stroke="rgba(255,255,255,0.10)" strokeWidth={1} strokeDasharray="2,3"/>
      )}

      {/* History hover dot */}
      {hovDotPt && (
        <>
          <circle cx={hovDotPt.x} cy={hovDotPt.y} r={5.5} fill={BRAND.cardBg} stroke={BRAND.accent} strokeWidth={1.8}/>
          <circle cx={hovDotPt.x} cy={hovDotPt.y} r={2.2} fill={BRAND.accent}/>
        </>
      )}

      {/* Future anchor dot on median */}
      {hoverSvgX !== null && hoverSvgX > nowX && (() => {
        const ff  = Math.min((hoverSvgX - nowX) / (CW * (1 - histFrac)), 1);
        const yr  = getAnchor(ff);
        if (yr === 0) return (
          <>
            <circle cx={nowX} cy={nowY} r={5.5} fill={BRAND.cardBg} stroke={scoreColor} strokeWidth={1.8}/>
            <circle cx={nowX} cy={nowY} r={2.2} fill={scoreColor}/>
          </>
        );
        const node = coneNodes.find(c => c.yr === yr);
        if (!node) return null;
        return (
          <>
            <circle cx={node.x} cy={node.p50} r={5.5} fill={BRAND.cardBg} stroke={scoreColor} strokeWidth={1.8}/>
            <circle cx={node.x} cy={node.p50} r={2.2} fill={scoreColor}/>
          </>
        );
      })()}

      {/* Inline price pills — with collision resolution for stacked cone labels */}
      {(() => {
        const PH = 15, GAP = 2; // pill height, min gap
        // Separate cone labels (have .y) from single labels
        const cone   = inlineLabels.filter(l => l.y !== null);
        const single = inlineLabels.filter(l => l.y === null);
        // Compute raw y positions (top of each pill)
        const positions = cone.map(l => ({ ...l, by: l.y - PH/2 }));
        // Iterative push-apart (2 passes is enough for 3 items)
        for (let pass = 0; pass < 3; pass++) {
          for (let i = 1; i < positions.length; i++) {
            const prev = positions[i-1], cur = positions[i];
            const overlap = (prev.by + PH + GAP) - cur.by;
            if (overlap > 0) {
              prev.by -= overlap / 2;
              cur.by  += overlap / 2;
            }
          }
        }
        // Clamp within chart bounds
        positions.forEach(p => { p.by = Math.max(PAD.t, Math.min(PAD.t + CH - PH, p.by)); });
        const all = [...positions, ...single.map(l => ({ ...l, by: PAD.t + 3 }))];
        return all.map(lbl => {
          const tw = lbl.label ? 82 : 66;
          const lx = lbl.x;
          const tooRight = lx + tw/2 + 6 > VW - PAD.r;
          const tooLeft  = lx - tw/2 - 6 < PAD.l;
          const bx = tooRight ? lx - tw - 6 : tooLeft ? lx + 6 : lx - tw/2;
          return (
            <g key={lbl.key} opacity={lbl.opacity ?? 1}>
              <rect x={bx} y={lbl.by} width={tw} height={PH} rx={3}
                fill={BRAND.cardBg} stroke={`${lbl.color}38`} strokeWidth={0.8}/>
              <text x={bx + tw/2} y={lbl.by + 10.5}
                fill={lbl.color} fontSize={9} fontFamily={BRAND.fontMono}
                fontWeight={lbl.label === "P50" ? "700" : "500"} textAnchor="middle">
                {lbl.label ? `${lbl.label} ${lbl.text}` : lbl.text}
              </text>
            </g>
          );
        });
      })()}
    </svg>
  );
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Root component                                                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export default function PriceFanChart() {
  const company    = MOCK_COMPANY;
  const [period,   setPeriod]   = useState("5Y");
  const [animKey,  setAnimKey]  = useState(0);
  const [methOpen, setMethOpen] = useState(false);
  const [tip,      setTip]      = useState(null);
  const [pinned,   setPinned]   = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const methRef = useRef(null);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t); }, []);

  const histWeeks  = HIST_PERIODS.find(p => p.label === period).weeks;
  const histPrices = useMemo(() => generateHistory(histWeeks, company.currentPrice, 7), [histWeeks]);
  const scoreColor = getScoreColor(company.monkScore);
  // Change over the visible history period (start → today)
  const periodChangePct = useMemo(() => ((company.currentPrice / histPrices[0]) - 1) * 100, [histPrices]);

  const handlePeriod = (p) => { setPeriod(p); setAnimKey(k => k + 1); setTip(null); setPinned(false); };


  return (
    <div style={{ background: BRAND.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: BRAND.fontSans, padding: 20 }}>
      <style>{KEYFRAMES}</style>

      <div style={{ width: "100%", maxWidth: 590, background: BRAND.cardBg, border: `1px solid ${BRAND.cardBorder}`, borderRadius: 16, overflow: "visible" }}>
        <div style={{ padding: "20px 24px 16px" }}>

          {/* ── Header ── */}
          {/* Row 1: title left · spacer · period toggle · copy button right */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span style={{
              fontSize: 9, fontWeight: 600, fontFamily: BRAND.fontMono,
              color: BRAND.textMuted, letterSpacing: "0.10em", textTransform: "uppercase",
            }}>Price Forecast</span>
            <div style={{ flex: 1 }} />
            {/* Period toggle — left of copy button */}
            <PeriodToggle value={period} options={HIST_PERIODS.map(p => p.label)} onChange={handlePeriod} />
            {/* Copy button */}
            <button onClick={() => {
              const text = [
                `${company.companyName} (${company.ticker})`,
                `Price: $${company.currentPrice.toFixed(2)}  ${periodChangePct >= 0 ? "+" : ""}${periodChangePct.toFixed(2)}% (${period === "Max" ? "all time" : period})`,
                `MonkScore: ${company.monkScore} (Bucket ${company.scoreBucket})`,
                `MonkStreet · www.monk.st`,
              ].join("\n");
              navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }} style={{
              width: 26, height: 26, borderRadius: 13, marginLeft: 8,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${BRAND.cardBorder}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.15s ease",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            >
              {copied ? (
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5L6.5 12L13 4" stroke={BRAND.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="5" width="9" height="9" rx="1.5" stroke={BRAND.textMuted} strokeWidth="1.5"/>
                  <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke={BRAND.textMuted} strokeWidth="1.5"/>
                </svg>
              )}
            </button>
          </div>

          {/* Row 2: company name + exchange·ticker left · price + change right */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: BRAND.textPrimary, fontFamily: BRAND.fontSans, lineHeight: 1.1, marginBottom: 4 }}>
                {company.companyName}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, fontFamily: BRAND.fontMono, color: BRAND.textMuted, letterSpacing: "0.06em" }}>
                {company.exchange}:{company.ticker}
              </div>
            </div>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: BRAND.fontMono, color: BRAND.textPrimary, lineHeight: 1, letterSpacing: "-0.02em" }}>
                ${company.currentPrice.toFixed(2)}
              </div>
              <div style={{ marginTop: 5 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, fontFamily: BRAND.fontMono,
                  color: periodChangePct >= 0 ? BRAND.green : BRAND.red,
                  padding: "2px 7px", borderRadius: 4,
                  background: periodChangePct >= 0 ? `${BRAND.green}14` : `${BRAND.red}14`,
                  border: `1px solid ${periodChangePct >= 0 ? BRAND.green : BRAND.red}25`,
                }}>
                  {periodChangePct >= 0 ? "+" : ""}{periodChangePct.toFixed(2)}% ({period === "Max" ? "all time" : period})
                </span>
              </div>
            </div>
          </div>

          {/* ── Chart + strip (or skeleton) ── */}
          {loading ? <ChartSkeleton /> : (<>

          {/* ── Chart ── */}
          <div style={{ margin: "0 -24px" }}>
            {/* Chart wrapper */}
            <div style={{ position: "relative" }}>
            <FanChartSVG
              histPrices={histPrices} company={company} animKey={animKey}
              onTip={setTip} pinned={pinned} onPin={(shouldPin) => { setPinned(shouldPin); if (!shouldPin) setTip(null); }}
            />
            </div>{/* end inner chart wrapper */}
          </div>{/* end period+chart outer wrapper */}

          {/* ── Info strip — fixed height, never shifts layout ── */}
          <div style={{ position: "relative", height: 140, overflow: "visible", borderTop: `1px solid ${BRAND.cardBorder}` }}>
            <InfoStrip tip={tip} company={company} scoreColor={scoreColor} histWeeks={histWeeks}
              methRef={methRef} methOpen={methOpen} setMethOpen={setMethOpen} />
            {/* Pin indicator — fades out after 1.5s, top-left so it doesn't overlap content */}
            {pinned && (
              <div key={String(pinned)} style={{
                position: "absolute", top: 8, left: 0,
                display: "inline-flex", alignItems: "center", gap: 4,
                background: `${scoreColor}18`, border: `1px solid ${scoreColor}35`,
                borderRadius: 4, padding: "2px 7px",
                fontSize: 9, fontFamily: BRAND.fontMono, fontWeight: 600,
                color: scoreColor, letterSpacing: "0.04em",
                animation: "pinnedFade 1.5s ease forwards",
                pointerEvents: "none",
              }}>
                pinned · click chart to release
              </div>
            )}
          </div>

          </>)}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${BRAND.cardBorder}` }}>
            {/* Left — band legend */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              {[{ lbl: "P10–P90", op: 0.22 }, { lbl: "P25–P75", op: 0.46 }, { lbl: "P40–P60", op: 0.78 }].map(({ lbl, op }) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 14, height: 8, borderRadius: 2, background: `rgba(${hexToRgb(scoreColor)},${op*0.55})`, border: `1px solid rgba(${hexToRgb(scoreColor)},${op*0.40})` }}/>
                  <span style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted }}>{lbl}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 14, height: 2.5, borderRadius: 1, background: scoreColor }}/>
                <span style={{ fontSize: 9, fontFamily: BRAND.fontMono, color: BRAND.textMuted }}>Median</span>
              </div>
            </div>
            {/* Right — attribution */}
            <span style={{ fontSize: 8.5, fontFamily: BRAND.fontMono, color: BRAND.textMuted, opacity: 0.45, letterSpacing: "0.04em", flexShrink: 0 }}>
              MonkStreet · www.monk.st
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
