import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  BRAND,
  PILLAR_KEYS,
  PILLAR_COLORS,
  PILLAR_LABELS,
  getScoreColor,
  SCORE_BANDS,
  cardStyle,
  SkeletonPulse,
} from "./design-tokens.jsx";

// ======================================================================
//   Mock historical data
//   API: GET /api/companies/:ticker/monkscore/history?range=5y
// ======================================================================

const MOCK_HISTORY = {
  AAPL: [
    { date: "2021-01-27", monkScore: 68, pillars: { value: 55, growth: 65, profitability: 85, health: 72, payout: 62 } },
    { date: "2021-04-28", monkScore: 69, pillars: { value: 54, growth: 66, profitability: 86, health: 73, payout: 63 } },
    { date: "2021-07-27", monkScore: 71, pillars: { value: 56, growth: 68, profitability: 87, health: 74, payout: 64 } },
    { date: "2021-10-28", monkScore: 72, pillars: { value: 57, growth: 69, profitability: 87, health: 75, payout: 65 } },
    { date: "2022-01-27", monkScore: 70, pillars: { value: 54, growth: 67, profitability: 88, health: 74, payout: 64 } },
    { date: "2022-04-28", monkScore: 69, pillars: { value: 52, growth: 66, profitability: 87, health: 73, payout: 65 } },
    { date: "2022-07-28", monkScore: 68, pillars: { value: 50, growth: 65, profitability: 87, health: 72, payout: 66 } },
    { date: "2022-10-27", monkScore: 70, pillars: { value: 53, growth: 67, profitability: 88, health: 74, payout: 66 } },
    { date: "2023-02-02", monkScore: 71, pillars: { value: 55, growth: 68, profitability: 88, health: 75, payout: 67 } },
    { date: "2023-05-04", monkScore: 72, pillars: { value: 56, growth: 69, profitability: 89, health: 76, payout: 67 } },
    { date: "2023-08-03", monkScore: 73, pillars: { value: 56, growth: 70, profitability: 89, health: 76, payout: 68 } },
    { date: "2023-11-02", monkScore: 74, pillars: { value: 57, growth: 71, profitability: 90, health: 77, payout: 69 } },
    { date: "2024-01-26", monkScore: 74, pillars: { value: 58, growth: 72, profitability: 90, health: 78, payout: 70 } },
    { date: "2024-04-25", monkScore: 76, pillars: { value: 60, growth: 74, profitability: 91, health: 80, payout: 71 } },
    { date: "2024-07-25", monkScore: 77, pillars: { value: 59, growth: 75, profitability: 92, health: 81, payout: 72 } },
    { date: "2024-10-31", monkScore: 79, pillars: { value: 61, growth: 76, profitability: 93, health: 82, payout: 73 } },
    { date: "2025-01-30", monkScore: 78, pillars: { value: 58, growth: 77, profitability: 94, health: 80, payout: 72 } },
    { date: "2025-04-24", monkScore: 80, pillars: { value: 60, growth: 78, profitability: 94, health: 82, payout: 73 } },
    { date: "2025-07-31", monkScore: 79, pillars: { value: 59, growth: 77, profitability: 95, health: 81, payout: 73 } },
    { date: "2025-10-30", monkScore: 82, pillars: { value: 62, growth: 78, profitability: 95, health: 83, payout: 74 }, event: "Record services revenue" },
  ],
  NVDA: [
    { date: "2021-02-24", monkScore: 52, pillars: { value: 38, growth: 48, profitability: 65, health: 70, payout: 40 } },
    { date: "2021-05-26", monkScore: 54, pillars: { value: 36, growth: 52, profitability: 66, health: 71, payout: 41 } },
    { date: "2021-08-18", monkScore: 55, pillars: { value: 34, growth: 54, profitability: 68, health: 72, payout: 42 } },
    { date: "2021-11-17", monkScore: 53, pillars: { value: 30, growth: 52, profitability: 67, health: 71, payout: 42 } },
    { date: "2022-02-16", monkScore: 50, pillars: { value: 28, growth: 48, profitability: 64, health: 70, payout: 42 } },
    { date: "2022-05-25", monkScore: 46, pillars: { value: 32, growth: 42, profitability: 60, health: 68, payout: 40 }, event: "Crypto mining crash" },
    { date: "2022-08-24", monkScore: 44, pillars: { value: 36, growth: 38, profitability: 56, health: 66, payout: 38 } },
    { date: "2022-11-16", monkScore: 48, pillars: { value: 40, growth: 44, profitability: 58, health: 68, payout: 39 } },
    { date: "2023-02-22", monkScore: 55, pillars: { value: 42, growth: 52, profitability: 66, health: 72, payout: 42 }, event: "ChatGPT drives GPU demand" },
    { date: "2023-05-24", monkScore: 62, pillars: { value: 38, growth: 64, profitability: 72, health: 76, payout: 44 }, event: "Revenue guidance +50%" },
    { date: "2023-08-23", monkScore: 66, pillars: { value: 35, growth: 72, profitability: 76, health: 78, payout: 46 } },
    { date: "2023-11-21", monkScore: 70, pillars: { value: 34, growth: 78, profitability: 80, health: 80, payout: 47 } },
    { date: "2024-02-21", monkScore: 72, pillars: { value: 52, growth: 78, profitability: 82, health: 78, payout: 48 } },
    { date: "2024-05-22", monkScore: 76, pillars: { value: 48, growth: 84, profitability: 86, health: 80, payout: 50 }, event: "Data center revenue triples" },
    { date: "2024-08-28", monkScore: 80, pillars: { value: 44, growth: 90, profitability: 90, health: 84, payout: 52 } },
    { date: "2024-11-20", monkScore: 83, pillars: { value: 42, growth: 92, profitability: 92, health: 86, payout: 52 }, event: "Blackwell architecture launch" },
    { date: "2025-02-26", monkScore: 86, pillars: { value: 40, growth: 94, profitability: 94, health: 88, payout: 53 } },
    { date: "2025-05-28", monkScore: 88, pillars: { value: 39, growth: 96, profitability: 95, health: 90, payout: 54 } },
    { date: "2025-08-27", monkScore: 90, pillars: { value: 38, growth: 98, profitability: 96, health: 91, payout: 55 }, event: "$100B quarterly revenue" },
    { date: "2025-11-19", monkScore: 91, pillars: { value: 38, growth: 99, profitability: 97, health: 92, payout: 55 } },
  ],
  TSLA: [
    { date: "2021-01-27", monkScore: 42, pillars: { value: 4, growth: 68, profitability: 38, health: 72, payout: 10 } },
    { date: "2021-04-26", monkScore: 48, pillars: { value: 5, growth: 72, profitability: 45, health: 76, payout: 11 } },
    { date: "2021-07-26", monkScore: 52, pillars: { value: 5, growth: 76, profitability: 52, health: 78, payout: 12 } },
    { date: "2021-10-20", monkScore: 56, pillars: { value: 4, growth: 80, profitability: 58, health: 80, payout: 12 } },
    { date: "2022-01-26", monkScore: 60, pillars: { value: 6, growth: 82, profitability: 62, health: 82, payout: 13 }, event: "Record deliveries" },
    { date: "2022-04-20", monkScore: 62, pillars: { value: 6, growth: 84, profitability: 65, health: 83, payout: 13 } },
    { date: "2022-07-20", monkScore: 64, pillars: { value: 7, growth: 85, profitability: 68, health: 84, payout: 14 } },
    { date: "2022-10-19", monkScore: 62, pillars: { value: 8, growth: 82, profitability: 68, health: 84, payout: 14 } },
    { date: "2023-01-25", monkScore: 60, pillars: { value: 10, growth: 80, profitability: 66, health: 83, payout: 14 }, event: "Price cuts begin" },
    { date: "2023-04-19", monkScore: 58, pillars: { value: 9, growth: 78, profitability: 64, health: 82, payout: 15 } },
    { date: "2023-07-19", monkScore: 59, pillars: { value: 8, growth: 79, profitability: 65, health: 83, payout: 15 } },
    { date: "2023-10-18", monkScore: 57, pillars: { value: 9, growth: 76, profitability: 62, health: 82, payout: 15 } },
    { date: "2024-01-24", monkScore: 58, pillars: { value: 8, growth: 78, profitability: 65, health: 84, payout: 15 } },
    { date: "2024-04-23", monkScore: 56, pillars: { value: 10, growth: 75, profitability: 62, health: 83, payout: 16 }, event: "Margin compression" },
    { date: "2024-07-23", monkScore: 54, pillars: { value: 11, growth: 72, profitability: 60, health: 82, payout: 17 } },
    { date: "2024-10-23", monkScore: 55, pillars: { value: 12, growth: 74, profitability: 61, health: 83, payout: 17 } },
    { date: "2025-01-29", monkScore: 53, pillars: { value: 11, growth: 72, profitability: 59, health: 82, payout: 18 } },
    { date: "2025-04-22", monkScore: 52, pillars: { value: 12, growth: 71, profitability: 58, health: 82, payout: 18 } },
    { date: "2025-07-22", monkScore: 50, pillars: { value: 11, growth: 70, profitability: 57, health: 81, payout: 18 }, event: "EV competition intensifies" },
    { date: "2025-10-22", monkScore: 51, pillars: { value: 12, growth: 71, profitability: 58, health: 82, payout: 18 } },
  ],
};

// ======================================================================
//   Chart math utilities
// ======================================================================

const CHART_PADDING = { top: 20, right: 24, bottom: 28, left: 32 };

function chartLayout(width, height) {
  return {
    plotW: width - CHART_PADDING.left - CHART_PADDING.right,
    plotH: height - CHART_PADDING.top - CHART_PADDING.bottom,
    plotX: CHART_PADDING.left,
    plotY: CHART_PADDING.top,
  };
}

function scaleX(index, total, plotX, plotW) {
  if (total <= 1) return plotX + plotW / 2;
  return plotX + (index / (total - 1)) * plotW;
}

function scaleY(value, min, max, plotY, plotH) {
  return plotY + plotH - ((value - min) / (max - min)) * plotH;
}

function smoothLine(points) {
  if (points.length < 2) return "";
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const t = 0.3;
    d += ` C${p1.x + (p2.x - p0.x) * t},${p1.y + (p2.y - p0.y) * t} ${p2.x - (p3.x - p1.x) * t},${p2.y - (p3.y - p1.y) * t} ${p2.x},${p2.y}`;
  }
  return d;
}

function smoothArea(points, baseY) {
  const line = smoothLine(points);
  if (!line) return "";
  return `${line} L${points[points.length - 1].x},${baseY} L${points[0].x},${baseY} Z`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ======================================================================
//   Loading states
// ======================================================================

// Tier 1: Full skeleton (1.2s initial load)
function EvolutionSkeleton() {
  return (
    <div style={{ padding: "20px 24px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SkeletonPulse width={160} height={12} />
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <SkeletonPulse width={28} height={20} borderRadius={4} />
          <SkeletonPulse width={28} height={20} borderRadius={4} />
          <SkeletonPulse width={36} height={20} borderRadius={4} />
          <SkeletonPulse width={26} height={26} borderRadius={13} style={{ marginLeft: 6 }} />
        </div>
      </div>

      <div style={{ position: "relative", height: 250, overflow: "hidden", margin: "0 -24px", marginBottom: 12 }}>
        <svg viewBox="0 0 520 250" style={{ width: "100%", height: "100%" }}>
          {[0, 20, 40, 60, 80, 100].map(v => (
            <line key={v} x1={32} y1={20 + (202 * (100 - v)) / 100} x2={496} y2={20 + (202 * (100 - v)) / 100}
              stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          ))}
          <path d="M32,170 C100,165 150,140 200,150 C250,160 300,120 350,110 C400,100 450,80 496,70"
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5"
            strokeDasharray="800" style={{ animation: "skeletonLine 2s ease infinite" }} />
          {[32, 120, 200, 290, 380, 496].map((x, i) => (
            <circle key={i} cx={x} cy={170 - i * 16} r={3} fill="rgba(255,255,255,0.06)">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </svg>
      </div>

      <div style={{ display: "flex", gap: 3 }}>
        {PILLAR_KEYS.map(key => (
          <div key={key} style={{ flex: 1 }}>
            <SkeletonPulse width="100%" height={4} borderRadius={2} style={{ marginBottom: 4 }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <SkeletonPulse width={42} height={8} borderRadius={2} />
              <SkeletonPulse width={16} height={8} borderRadius={2} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <SkeletonPulse width={100} height={9} borderRadius={2} />
        <SkeletonPulse width={120} height={9} borderRadius={2} />
      </div>
    </div>
  );
}

// Tier 2: Range change overlay (350ms)
function RangeLoadingOverlay() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 15,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(23,30,50,0.6)", backdropFilter: "blur(2px)",
      borderRadius: 8,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        color: BRAND.accent, fontSize: 11, fontFamily: BRAND.fontMono, fontWeight: 600,
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill="none" stroke={BRAND.accent} strokeWidth="1.5" opacity="0.2" />
          <circle cx="8" cy="8" r="6" fill="none" stroke={BRAND.accent} strokeWidth="1.5"
            strokeDasharray="28" strokeDashoffset="20"
            style={{ transformOrigin: "center", animation: "spin 0.8s linear infinite" }} />
        </svg>
        Updating…
      </div>
    </div>
  );
}

// ======================================================================
//   Empty state
// ======================================================================

function EmptyState() {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginBottom: 12, opacity: 0.3 }}>
        <rect x="4" y="28" width="6" height="8" rx="1" fill={BRAND.textMuted} />
        <rect x="14" y="20" width="6" height="16" rx="1" fill={BRAND.textMuted} />
        <rect x="24" y="24" width="6" height="12" rx="1" fill={BRAND.textMuted} />
        <line x1="2" y1="38" x2="38" y2="38" stroke={BRAND.textMuted} strokeWidth="1" />
      </svg>
      <div style={{ color: BRAND.textSecondary, fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
        Not enough history
      </div>
      <div style={{ color: BRAND.textMuted, fontSize: 11 }}>
        At least 2 quarterly filings are needed to show the evolution chart.
      </div>
    </div>
  );
}

// ======================================================================
//   useTimeRange hook
// ======================================================================

function useTimeRange(fullData) {
  const [range, setRange] = useState("MAX");
  const [rangeLoading, setRangeLoading] = useState(false);

  const filteredData = useMemo(() => {
    if (range === "MAX" || !fullData.length) return fullData;
    const now = new Date(fullData[fullData.length - 1].date);
    const months = range === "3Y" ? 36 : 60;
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    return fullData.filter(d => new Date(d.date) >= cutoff);
  }, [fullData, range]);

  const changeRange = useCallback((newRange) => {
    if (newRange === range) return;
    setRangeLoading(true);
    // Simulate API delay -- replace with real fetch
    setTimeout(() => {
      setRange(newRange);
      setRangeLoading(false);
    }, 350);
  }, [range]);

  return { range, setRange: changeRange, data: filteredData, rangeLoading };
}

// ======================================================================
//   useChartInteraction hook (mouse + touch)
// ======================================================================

function useChartInteraction(chartAreaRef, dataLength) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [pinned, setPinned] = useState(false);

  const resolveIdx = useCallback((clientX) => {
    if (!chartAreaRef.current || dataLength < 2) return null;
    const rect = chartAreaRef.current.getBoundingClientRect();
    // Account for chart padding within the SVG
    const padLeft = CHART_PADDING.left / 520 * rect.width;
    const padRight = CHART_PADDING.right / 520 * rect.width;
    const plotLeft = rect.left + padLeft;
    const plotWidth = rect.width - padLeft - padRight;
    const relX = Math.max(0, Math.min(1, (clientX - plotLeft) / plotWidth));
    return Math.round(relX * (dataLength - 1));
  }, [dataLength]);

  const handleMouseMove = useCallback((e) => {
    if (pinned) return;
    const idx = resolveIdx(e.clientX);
    if (idx !== null) setHoverIdx(idx);
  }, [resolveIdx, pinned]);

  const handleMouseLeave = useCallback(() => {
    if (!pinned) setHoverIdx(null);
  }, [pinned]);

  const handleClick = useCallback((e) => {
    const idx = resolveIdx(e.clientX);
    if (idx === null) return;
    if (pinned && idx === hoverIdx) {
      setPinned(false);
      setHoverIdx(null);
    } else {
      setHoverIdx(idx);
      setPinned(true);
    }
  }, [resolveIdx, pinned, hoverIdx]);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const idx = resolveIdx(touch.clientX);
    if (idx !== null) {
      setHoverIdx(idx);
      setPinned(true);
    }
  }, [resolveIdx]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const idx = resolveIdx(touch.clientX);
    if (idx !== null) setHoverIdx(idx);
  }, [resolveIdx]);

  const dismissPinned = useCallback(() => {
    if (pinned) { setPinned(false); setHoverIdx(null); }
  }, [pinned]);

  return {
    hoverIdx, pinned,
    chartHandlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: () => {},
    },
    dismissPinned,
  };
}

// ======================================================================
//   EvolutionChart SVG
// ======================================================================

function EvolutionChart({ data, activePillar, hoverIdx, animProgress }) {
  const svgW = 520;
  const svgH = 250;
  const { plotW, plotH, plotX, plotY } = chartLayout(svgW, svgH);
  const n = data.length;
  if (n < 2) return null;

  const yMin = 0;
  const yMax = 100;
  const baseY = plotY + plotH;

  const mainPoints = data.map((d, i) => ({
    x: scaleX(i, n, plotX, plotW),
    y: scaleY(d.monkScore, yMin, yMax, plotY, plotH),
  }));

  const pillarPoints = {};
  PILLAR_KEYS.forEach(key => {
    pillarPoints[key] = data.map((d, i) => ({
      x: scaleX(i, n, plotX, plotW),
      y: scaleY(d.pillars[key], yMin, yMax, plotY, plotH),
    }));
  });

  const gridLines = [0, 20, 40, 60, 80, 100];

  const gradientStops = data.map((d, i) => ({
    offset: `${(i / (n - 1)) * 100}%`,
    color: getScoreColor(d.monkScore),
  }));

  const prog = animProgress ?? 1;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: "100%", height: "auto", overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id="evo_scoreGrad" x1="0" y1="0" x2="1" y2="0">
          {gradientStops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)}
        </linearGradient>
        <linearGradient id="evo_areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="url(#evo_scoreGrad)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="url(#evo_scoreGrad)" stopOpacity="0.01" />
        </linearGradient>
        {PILLAR_KEYS.map(key => (
          <linearGradient key={key} id={`evo_p_${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PILLAR_COLORS[key]} stopOpacity="0.15" />
            <stop offset="100%" stopColor={PILLAR_COLORS[key]} stopOpacity="0.01" />
          </linearGradient>
        ))}
        <clipPath id="evo_clip">
          <rect x={plotX} y={plotY} width={plotW} height={plotH} />
        </clipPath>
      </defs>

      {/* Score band shading */}
      <g clipPath="url(#evo_clip)">
        {SCORE_BANDS.map(band => {
          const y1 = scaleY(band.max, yMin, yMax, plotY, plotH);
          const y2 = scaleY(band.min, yMin, yMax, plotY, plotH);
          return <rect key={band.min} x={plotX} y={y1} width={plotW} height={y2 - y1}
            fill={band.color} opacity="0.025" />;
        })}
      </g>

      {/* Grid lines + labels */}
      {gridLines.map(v => {
        const y = scaleY(v, yMin, yMax, plotY, plotH);
        return (
          <g key={v}>
            <line x1={plotX} y1={y} x2={plotX + plotW} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <text x={plotX - 6} y={y + 3} textAnchor="end"
              fill={BRAND.textMuted} fontSize="8" fontFamily={BRAND.fontMono}>{v}</text>
          </g>
        );
      })}

      {/* Peer average line at 50 */}
      <line x1={plotX} y1={scaleY(50, yMin, yMax, plotY, plotH)}
        x2={plotX + plotW} y2={scaleY(50, yMin, yMax, plotY, plotH)}
        stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" strokeDasharray="3,4" />
      <text x={plotX + plotW + 4} y={scaleY(50, yMin, yMax, plotY, plotH) + 3}
        fill={BRAND.textMuted} fontSize="7" fontFamily={BRAND.fontMono}>Avg</text>

      {/* X-axis labels */}
      {data.map((d, i) => {
        const maxLabels = 8;
        const step = Math.max(1, Math.floor(n / maxLabels));
        if (i !== 0 && i !== n - 1 && i % step !== 0) return null;
        return (
          <text key={i} x={scaleX(i, n, plotX, plotW)} y={baseY + 14} textAnchor="middle"
            fill={BRAND.textMuted} fontSize="7.5" fontFamily={BRAND.fontMono}>{formatDate(d.date)}</text>
        );
      })}

      {/* Chart content with entry animation */}
      <g clipPath="url(#evo_clip)" style={{ opacity: prog, transition: "opacity 0.4s ease" }}>
        {activePillar ? (
          <>
            {PILLAR_KEYS.filter(k => k !== activePillar).map(key => (
              <path key={key} d={smoothLine(pillarPoints[key])}
                fill="none" stroke={PILLAR_COLORS[key]} strokeWidth="1" opacity="0.12" />
            ))}
            <path d={smoothArea(pillarPoints[activePillar], baseY)} fill={`url(#evo_p_${activePillar})`} />
            <path d={smoothLine(pillarPoints[activePillar])}
              fill="none" stroke={PILLAR_COLORS[activePillar]} strokeWidth="2" opacity="0.9" />
            {pillarPoints[activePillar].map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y}
                r={hoverIdx === i ? 4.5 : i === n - 1 ? 3.5 : 2.5}
                fill={PILLAR_COLORS[activePillar]}
                opacity={hoverIdx === i ? 1 : 0.75}
                style={{ transition: "r 0.15s ease" }} />
            ))}
            {n >= 2 && (() => {
              const d = data[n - 1].pillars[activePillar] - data[n - 2].pillars[activePillar];
              if (d === 0) return null;
              const lp = pillarPoints[activePillar][n - 1];
              return <text x={lp.x + 8} y={lp.y + 3.5} fill={d > 0 ? BRAND.greenBright : BRAND.red}
                fontSize="9" fontWeight="600" fontFamily={BRAND.fontMono} textAnchor="start"
              >{d > 0 ? "\u25B2" : "\u25BC"}{Math.abs(d)}pts</text>;
            })()}
          </>
        ) : (
          <>
            <path d={smoothArea(mainPoints, baseY)} fill="url(#evo_areaGrad)" />
            <path d={smoothLine(mainPoints)} fill="none" stroke="url(#evo_scoreGrad)" strokeWidth="2.5" />
            {mainPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y}
                r={hoverIdx === i ? 5 : i === n - 1 ? 4 : 3}
                fill={getScoreColor(data[i].monkScore)}
                stroke={hoverIdx === i || i === n - 1 ? getScoreColor(data[i].monkScore) : "none"}
                strokeWidth="2" strokeOpacity="0.3"
                style={{ transition: "r 0.15s ease" }} />
            ))}
            {n >= 2 && (() => {
              const d = data[n - 1].monkScore - data[n - 2].monkScore;
              if (d === 0) return null;
              const lp = mainPoints[n - 1];
              return <text x={lp.x + 8} y={lp.y + 3.5} fill={d > 0 ? BRAND.greenBright : BRAND.red}
                fontSize="9" fontWeight="600" fontFamily={BRAND.fontMono} textAnchor="start"
              >{d > 0 ? "\u25B2" : "\u25BC"}{Math.abs(d)}pts</text>;
            })()}
          </>
        )}

        {/* Event markers */}
        {data.map((d, i) => {
          if (!d.event) return null;
          const x = scaleX(i, n, plotX, plotW);
          const yPt = activePillar
            ? scaleY(d.pillars[activePillar], yMin, yMax, plotY, plotH)
            : scaleY(d.monkScore, yMin, yMax, plotY, plotH);
          return (
            <g key={`ev_${i}`}>
              <line x1={x} y1={yPt - 8} x2={x} y2={plotY + 2}
                stroke={BRAND.accent} strokeWidth="0.6" strokeDasharray="2,2" opacity="0.4" />
              <rect x={x - 4.5} y={plotY - 1} width={9} height={9} rx={2}
                fill={BRAND.accent} opacity="0.3"
                transform={`rotate(45,${x},${plotY + 3.5})`} />
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hoverIdx !== null && (
          <line x1={scaleX(hoverIdx, n, plotX, plotW)} y1={plotY}
            x2={scaleX(hoverIdx, n, plotX, plotW)} y2={baseY}
            stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        )}
      </g>
    </svg>
  );
}

// ======================================================================
//   Event badge (floats above chart on event markers)
// ======================================================================

function EventBadge({ event, dataIdx, dataLength }) {
  if (!event) return null;
  const pct = dataLength > 1 ? (dataIdx / (dataLength - 1)) * 100 : 50;
  const flipRight = pct < 30;
  return (
    <div style={{
      position: "absolute", top: 4,
      left: flipRight ? `${pct + 2}%` : undefined,
      right: !flipRight ? `${100 - pct + 2}%` : undefined,
      background: `${BRAND.accent}18`, border: `1px solid ${BRAND.accent}30`,
      borderRadius: 6, padding: "4px 10px",
      fontSize: 9, color: BRAND.accent, fontStyle: "italic",
      fontFamily: BRAND.fontSans, whiteSpace: "nowrap",
      animation: "evolFadeIn 0.15s ease",
      pointerEvents: "none", zIndex: 18,
    }}>
      {"\u25C6"} {event}
    </div>
  );
}

// ======================================================================
//   PillarRibbons
// ======================================================================

function PillarRibbons({ data, activePillar, setActivePillar, hoverIdx }) {
  const snap = data[hoverIdx !== null ? hoverIdx : data.length - 1];
  const [hoveredKey, setHoveredKey] = useState(null);
  if (!snap) return null;

  return (
    <div style={{ marginTop: 8, padding: "0 2px" }}>
      <div style={{
        fontSize: 7.5, color: BRAND.textMuted, marginBottom: 5,
        fontFamily: BRAND.fontMono, opacity: 0.6, textAlign: "center",
      }}>
        {activePillar
          ? `Showing ${PILLAR_LABELS[activePillar]} \u00B7 click to reset`
          : "Click a pillar to isolate it on the chart"}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {PILLAR_KEYS.map(key => {
          const score = snap.pillars[key];
          const isActive = activePillar === key;
          const isHovered = hoveredKey === key;
          return (
            <div key={key}
              onClick={() => setActivePillar(isActive ? null : key)}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                flex: 1, cursor: "pointer",
                opacity: activePillar && !isActive ? 0.35 : 1,
                transition: "all 0.2s ease",
                padding: "4px 3px 3px", borderRadius: 4,
                background: isActive ? `${PILLAR_COLORS[key]}10`
                  : isHovered ? "rgba(255,255,255,0.03)" : "transparent",
                border: isActive ? `1px solid ${PILLAR_COLORS[key]}30` : "1px solid transparent",
              }}
            >
              <div style={{
                height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)",
                overflow: "hidden", marginBottom: 4,
              }}>
                <div style={{
                  width: `${score}%`, height: "100%", borderRadius: 2,
                  background: PILLAR_COLORS[key],
                  opacity: isActive ? 1 : isHovered ? 0.85 : 0.65,
                  transition: "width 0.4s ease, opacity 0.2s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{
                  fontSize: 7.5,
                  color: isActive ? PILLAR_COLORS[key] : isHovered ? BRAND.textSecondary : BRAND.textMuted,
                  fontFamily: BRAND.fontMono, fontWeight: isActive || isHovered ? 600 : 400,
                }}>{PILLAR_LABELS[key]}</span>
                <span style={{
                  fontSize: 8,
                  color: isActive ? BRAND.textPrimary : BRAND.textSecondary,
                  fontFamily: BRAND.fontMono, fontWeight: 600,
                }}>{score}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ======================================================================
//   CrosshairTooltip
// ======================================================================

function CrosshairTooltip({ data, hoverIdx, activePillar }) {
  if (hoverIdx === null || !data[hoverIdx]) return null;

  const snap = data[hoverIdx];
  const prevSnap = hoverIdx > 0 ? data[hoverIdx - 1] : null;
  const scoreColor = activePillar ? PILLAR_COLORS[activePillar] : getScoreColor(snap.monkScore);
  const displayScore = activePillar ? snap.pillars[activePillar] : snap.monkScore;
  const displayDelta = activePillar && prevSnap
    ? snap.pillars[activePillar] - prevSnap.pillars[activePillar]
    : prevSnap ? snap.monkScore - prevSnap.monkScore : 0;

  // Position tooltip near the crosshair, flipping left/right
  const n = data.length;
  const xPct = n > 1 ? hoverIdx / (n - 1) : 0.5;
  // Account for chart padding within SVG
  const padLeftPct = (CHART_PADDING.left / 520) * 100;
  const padRightPct = (CHART_PADDING.right / 520) * 100;
  const plotPct = 100 - padLeftPct - padRightPct;
  const crosshairPct = padLeftPct + xPct * plotPct;
  const showOnRight = crosshairPct < 50;
  const gap = 3; // percentage gap from crosshair

  return (
    <div style={{
      position: "absolute", top: 24,
      ...(showOnRight
        ? { left: `${crosshairPct + gap}%` }
        : { right: `${100 - crosshairPct + gap}%` }),
      background: "rgba(15,21,37,0.95)", border: `1px solid ${BRAND.cardBorder}`,
      borderRadius: 10, padding: "10px 14px",
      backdropFilter: "blur(12px)",
      zIndex: 20, minWidth: 140, maxWidth: 180,
      animation: "evolFadeIn 0.15s ease",
      pointerEvents: "none",
    }}>
      <div style={{ fontSize: 9, color: BRAND.textMuted, marginBottom: 6, fontFamily: BRAND.fontMono }}>
        {formatDateFull(snap.date)}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: scoreColor, fontFamily: BRAND.fontMono, lineHeight: 1 }}>
          {displayScore}
        </span>
        {activePillar && (
          <span style={{ fontSize: 9, color: PILLAR_COLORS[activePillar], opacity: 0.7 }}>
            {PILLAR_LABELS[activePillar]}
          </span>
        )}
        {displayDelta !== 0 && (
          <span style={{
            fontSize: 9, fontWeight: 600, fontFamily: BRAND.fontMono,
            color: displayDelta > 0 ? BRAND.greenBright : BRAND.red,
          }}>
            {displayDelta > 0 ? "\u25B2" : "\u25BC"} {Math.abs(displayDelta)}
          </span>
        )}
      </div>

      <div style={{ fontSize: 8, color: BRAND.textMuted, marginBottom: 6, fontFamily: BRAND.fontMono }}>
        {displayScore > 55 ? `${displayScore - 50}pts above` : displayScore < 45 ? `${50 - displayScore}pts below` : "At"} peer avg
      </div>

      {!activePillar && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {PILLAR_KEYS.map(key => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 7, color: BRAND.textMuted, width: 54, fontFamily: BRAND.fontMono }}>
                {PILLAR_LABELS[key]}
              </span>
              <div style={{ flex: 1, height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{
                  width: `${snap.pillars[key]}%`, height: "100%", borderRadius: 1.5,
                  background: PILLAR_COLORS[key], opacity: 0.8,
                }} />
              </div>
              <span style={{ fontSize: 7.5, color: BRAND.textSecondary, fontFamily: BRAND.fontMono, width: 18, textAlign: "right" }}>
                {snap.pillars[key]}
              </span>
            </div>
          ))}
        </div>
      )}

      {snap.event && (
        <div style={{
          marginTop: 6, paddingTop: 6, borderTop: `1px solid ${BRAND.cardBorder}`,
          fontSize: 8.5, color: BRAND.accent, fontStyle: "italic",
        }}>
          {"\u25C6"} {snap.event}
        </div>
      )}
    </div>
  );
}

// ======================================================================
//   Small components
// ======================================================================

function RangeToggle({ range, setRange, disabled }) {
  const ranges = ["3Y", "5Y", "MAX"];
  return (
    <div style={{
      display: "flex", gap: 2,
      background: "rgba(255,255,255,0.03)", borderRadius: 4, padding: 2,
      opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto",
    }}>
      {ranges.map(r => (
        <button key={r} onClick={() => setRange(r)} style={{
          background: range === r ? "rgba(255,255,255,0.08)" : "transparent",
          border: "none", color: range === r ? BRAND.textPrimary : BRAND.textMuted,
          fontSize: 9, fontFamily: BRAND.fontMono, fontWeight: 600,
          padding: "3px 8px", borderRadius: 3, cursor: "pointer",
          transition: "all 0.2s ease",
        }}>{r}</button>
      ))}
    </div>
  );
}

function ExportButton({ onClick }) {
  return (
    <div onClick={onClick}
      style={{
        width: 26, height: 26, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", background: "rgba(255,255,255,0.08)",
        transition: "background 0.2s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
      title="Export as PNG"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke={BRAND.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </div>
  );
}

// ======================================================================
//   Main component
// ======================================================================

export default function MonkScoreEvolution() {
  const ticker = "NVDA";
  const fullData = MOCK_HISTORY[ticker] || [];

  const [loading, setLoading] = useState(true);
  const [activePillar, setActivePillar] = useState(null);
  const [animProgress, setAnimProgress] = useState(0);
  const cardRef = useRef(null);
  const chartAreaRef = useRef(null);

  const { range, setRange, data, rangeLoading } = useTimeRange(fullData);
  const { hoverIdx, pinned, chartHandlers, dismissPinned } = useChartInteraction(chartAreaRef, data.length);

  // Simulate initial API load
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  // Entry animation on load and range change
  useEffect(() => {
    if (loading || rangeLoading) return;
    setAnimProgress(0);
    const start = performance.now();
    const duration = 600;
    const animate = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setAnimProgress(1 - Math.pow(1 - p, 3)); // ease-out cubic
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [loading, range, rangeLoading]);

  const exportPNG = async () => {
    if (!cardRef.current) return;
    try {
      const mod = await import("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.js");
      const html2canvas = mod.default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: BRAND.cardBg, scale: 2, useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `MonkScore-Evolution-${ticker}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) { console.error("Export failed:", e); }
  };

  const hoveredEvent = hoverIdx !== null ? data[hoverIdx]?.event : null;

  return (
    <div ref={cardRef} onClick={dismissPinned} style={{ ...cardStyle, position: "relative" }}>
      {loading ? <EvolutionSkeleton /> : fullData.length < 2 ? <EmptyState /> : (
        <div onClick={(e) => e.stopPropagation()} style={{ padding: "20px 24px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{
              color: BRAND.textMuted, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>MonkScore{"\u2122"} Evolution</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RangeToggle range={range} setRange={setRange} disabled={rangeLoading} />
              <ExportButton onClick={exportPNG} />
            </div>
          </div>

          {/* Chart area */}
          <div ref={chartAreaRef} {...chartHandlers}
            style={{
              position: "relative",
              cursor: pinned ? "pointer" : "crosshair",
              margin: "0 -24px", touchAction: "none",
            }}
          >
            {rangeLoading && <RangeLoadingOverlay />}

            <EvolutionChart data={data} activePillar={activePillar}
              hoverIdx={hoverIdx} animProgress={animProgress} />

            {hoveredEvent && (
              <EventBadge event={hoveredEvent} dataIdx={hoverIdx} dataLength={data.length} />
            )}

            <CrosshairTooltip data={data} hoverIdx={hoverIdx} activePillar={activePillar} />
          </div>

          {/* Pillar ribbons */}
          <PillarRibbons data={data} activePillar={activePillar}
            setActivePillar={setActivePillar} hoverIdx={hoverIdx} />

          {/* Footer */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 10, padding: "0 2px",
          }}>
            <span style={{ color: BRAND.textMuted, fontSize: 9, opacity: 0.6 }}>
              Latest: {formatDateFull(fullData[fullData.length - 1].date)}
            </span>
            <span style={{ color: BRAND.textMuted, fontSize: 9, fontFamily: BRAND.fontSans, opacity: 0.6 }}>
              MonkStreet {"\u00B7"} www.monk.st
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
